// ========================================
// 街机模拟器模块 (Arcade Emulator) - 手动切换核心版
// 功能：
// 1. 支持全屏、关闭、重试
// 2. 手动切换核心（mame2003_plus ↔ fbneo）
// 3. 彻底清理资源，避免音频残留
// ========================================

// 街机模拟器配置
const arcadeConfig = {
  pathToData: 'https://cdn.emulatorjs.org/stable/data/',
  loaderUrl: 'https://cdn.emulatorjs.org/stable/data/loader.js',
  defaultVolume: 0.8,
  language: 'zh-CN',
  controlScheme: 'arcade',
  timeoutMs: 15000          // 启动超时（仅用于提示，不自动切换）
};

// 核心列表及当前索引
const ARCADE_CORES = ['mame2003_plus', 'fbneo'];
let currentCoreIndex = 0;          // 0: mame2003_plus, 1: fbneo
let currentArcadeGame = null;
let gameStarted = false;
let retryTimer = null;

// ========================================
// 启动街机游戏
// ========================================
function startArcadeGame(game) {
  console.log('🎮 启动街机游戏:', game.title, 'ROM:', game.romUrl);

  if (!game.romUrl || game.romUrl === '#') {
    showToast('该游戏暂无ROM文件', 'error');
    return;
  }

  // 重置状态
  currentCoreIndex = 0;
  gameStarted = false;
  if (retryTimer) clearTimeout(retryTimer);
  currentArcadeGame = game;

  // 关闭游戏详情模态框
  const gameModal = document.getElementById('game-modal');
  if (gameModal) {
    gameModal.classList.add('hidden');
  }

  // 显示街机游戏播放器
  showArcadePlayer(game);
}

// ========================================
// 显示街机游戏播放器界面
// ========================================
function showArcadePlayer(game) {
  // 移除已存在的播放器（防止重复）
  let existingModal = document.getElementById('game-player-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // 创建播放器容器
  const playerModal = document.createElement('div');
  playerModal.id = 'game-player-modal';
  playerModal.className = 'fixed inset-0 bg-black z-[60] flex items-center justify-center';
  playerModal.style.cssText = 'background-color: rgba(0,0,0,0.95);';

  // 构建播放器界面 - 标题栏增加切换核心按钮
  playerModal.innerHTML = `
    <div class="bg-background rounded-xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-gray-700" id="arcade-player-container">
      <!-- 标题栏 -->
      <div class="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900" id="arcade-header">
        <div class="flex items-center flex-1 min-w-0">
          <i class="fa fa-gamepad text-arcade mr-3 text-xl"></i>
          <h2 class="text-xl font-bold mr-4 truncate text-white" id="arcade-title">${game.title}</h2>
          <span class="text-xs bg-arcade px-2 py-1 rounded text-white font-bold">ARCADE</span>
        </div>
<span class="text-xs text-gray-400 ml-1 hidden sm:inline">游戏未启动时,点击切换核心启动      👉</span>
        <div class="flex items-center space-x-2 flex-shrink-0">
          <button id="arcade-switch-core" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded transition-colors" title="切换核心 (mame2003_plus ↔ fbneo)">
            <i class="fa fa-exchange"></i>
          </button>
          
          <button id="arcade-fullscreen" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded transition-colors" title="全屏">
            <i class="fa fa-expand"></i>
          </button>
          <button id="arcade-close" class="bg-nes hover:bg-red-700 text-white py-2 px-3 rounded transition-colors" title="关闭">
            <i class="fa fa-times"></i>
          </button>
        </div>
      </div>

      <!-- 游戏容器 -->
      <div class="flex-1 bg-black relative flex items-center justify-center" id="arcade-game-wrapper" style="min-height: 480px; overflow: hidden;">
        <!-- 加载提示 -->
        <div id="arcade-loading" class="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
          <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-arcade mb-4"></div>
          <p class="text-xl font-bold text-white">正在加载街机游戏...</p>
          <p class="text-textSecondary text-sm mt-2">${game.title}</p>
          <p class="text-textSecondary text-xs mt-1" id="arcade-loading-status">初始化模拟器...</p>
          <p class="text-gray-500 text-xs mt-4">首次加载可能需要较长时间</p>
        </div>

        <!-- 错误提示 -->
        <div id="arcade-error" class="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 hidden">
          <i class="fa fa-exclamation-triangle text-4xl text-nes mb-4"></i>
          <p class="text-xl font-bold text-nes">游戏加载失败</p>
          <p class="text-textSecondary mt-2 text-center px-4" id="arcade-error-message"></p>
          <div class="mt-4 flex space-x-3">
            <button id="arcade-retry" class="bg-secondary hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors">
              <i class="fa fa-refresh mr-2"></i>重试
            </button>
            <button id="arcade-close-error" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors">
              关闭
            </button>
          </div>
        </div>

        <!-- EmulatorJS 游戏容器 -->
        <div id="emulatorjs-container" class="w-full h-full flex items-center justify-center" style="min-height: 480px;"></div>
      </div>

      <!-- 控制提示 -->
      <div class="p-3 border-t border-gray-700 bg-gray-900" id="arcade-controls">
        <div class="flex flex-wrap justify-between items-center text-sm text-textSecondary">
          <div class="flex items-center space-x-4 flex-wrap gap-y-2">
            <span class="flex items-center"><i class="fa fa-keyboard-o mr-1 text-arcade"></i> 投币: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">V</kbd></span>
            <span class="flex items-center">开始: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Enter</kbd></span>
            <span class="flex items-center">方向: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">↑↓←→</kbd></span>
            <span class="flex items-center">按钮: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Z</kbd> <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">X</kbd> <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">A</kbd> <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">S</kbd></span>
          </div>
          <div class="text-xs text-gray-500 mt-2 sm:mt-0">
            <i class="fa fa-microchip mr-1"></i> EmulatorJS + <span id="arcade-core-name">${ARCADE_CORES[currentCoreIndex]}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(playerModal);

  // 绑定事件
  const closeBtn = document.getElementById('arcade-close');
  const closeErrorBtn = document.getElementById('arcade-close-error');
  const fullscreenBtn = document.getElementById('arcade-fullscreen');
  const retryBtn = document.getElementById('arcade-retry');
  const switchCoreBtn = document.getElementById('arcade-switch-core');

  if (closeBtn) {
    closeBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeArcadePlayer();
    };
  }

  if (closeErrorBtn) {
    closeErrorBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeArcadePlayer();
    };
  }

  if (fullscreenBtn) {
    fullscreenBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleArcadeFullscreen();
    };
  }

  if (retryBtn) {
    retryBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      retryArcadeGame();
    };
  }

  if (switchCoreBtn) {
    switchCoreBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      switchArcadeCore();
    };
  }

  // 点击背景关闭
  playerModal.onclick = function(e) {
    if (e.target === playerModal) {
      closeArcadePlayer();
    }
  };

  // ESC键关闭
  const escHandler = function(e) {
    if (e.key === 'Escape') {
      closeArcadePlayer();
    }
  };
  document.addEventListener('keydown', escHandler);
  window._arcadeEscHandler = escHandler;

  // 保存当前游戏并初始化模拟器
  currentArcadeGame = game;
  initEmulatorJS(game, ARCADE_CORES[currentCoreIndex]);
}

// ========================================
// 初始化 EmulatorJS（带核心参数）
// ========================================
function initEmulatorJS(game, core) {
  const container = document.getElementById('emulatorjs-container');
  const loadingDiv = document.getElementById('arcade-loading');
  const statusDiv = document.getElementById('arcade-loading-status');
  const coreNameSpan = document.getElementById('arcade-core-name');

  if (!container) {
    console.error('找不到游戏容器');
    return;
  }

  // 更新界面核心显示
  if (coreNameSpan) coreNameSpan.textContent = core;
  if (statusDiv) statusDiv.textContent = `使用核心: ${core}`;

  // 清空旧环境
  cleanupEmulatorJS();

  // 重置启动标志
  gameStarted = false;
  if (retryTimer) clearTimeout(retryTimer);

  // 设置 EmulatorJS 全局配置
  window.EJS_player = '#emulatorjs-container';
  window.EJS_core = core;
  window.EJS_gameUrl = game.romUrl;
  window.EJS_gameName = game.id;
  window.EJS_gameID = `arcade_${game.id}_${Date.now()}_${core}`;
  window.EJS_pathtodata = arcadeConfig.pathToData;
  window.EJS_startOnLoaded = true;
  window.EJS_language = arcadeConfig.language;
  window.EJS_volume = arcadeConfig.defaultVolume;
  window.EJS_controlScheme = arcadeConfig.controlScheme;

  // 调试信息
  console.log(`🎯 使用核心: ${core}`);
  console.log('  游戏URL:', window.EJS_gameUrl);
  console.log('  游戏名称:', window.EJS_gameName);

  // 游戏启动成功回调
  window.EJS_onGameStart = function() {
    if (gameStarted) return;
    gameStarted = true;
    if (retryTimer) clearTimeout(retryTimer);
    console.log(`✅ 街机游戏启动成功，核心: ${core}`);
    if (loadingDiv) loadingDiv.classList.add('hidden');
    showToast('游戏启动成功！投币后按 Enter 开始', 'success');
  };

  // 错误处理回调
  window.EJS_onError = function(error) {
    if (gameStarted) return;
    console.warn(`⚠️ 核心 ${core} 错误:`, error);
    let errorMsg = '模拟器加载失败';
    if (typeof error === 'string') errorMsg = error;
    else if (error && error.message) errorMsg = error.message;
    showArcadeError(errorMsg);
  };

  // 超时提示（不自动切换，仅提示）
  retryTimer = setTimeout(() => {
    if (!gameStarted) {
      console.warn(`⏱️ 核心 ${core} 启动超时（可能卡在主菜单）`);
      showArcadeError(`核心 ${core} 未能启动游戏，请尝试点击“切换核心”按钮。`);
    }
  }, arcadeConfig.timeoutMs);

  // 加载 EmulatorJS loader
  loadEmulatorJSLoader()
    .then(() => {
      if (statusDiv) statusDiv.textContent = `加载ROM (${core})...`;
      console.log(`✅ EmulatorJS loader 加载完成，核心: ${core}`);
    })
    .catch((error) => {
      console.error('❌ 加载模拟器失败:', error);
      showArcadeError('加载模拟器失败: ' + error.message);
    });
}

// ========================================
// 加载 EmulatorJS Loader
// ========================================
function loadEmulatorJSLoader() {
  return new Promise((resolve, reject) => {
    // 移除可能存在的旧脚本
    const existingScript = document.querySelector('script[src="' + arcadeConfig.loaderUrl + '"]');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.src = arcadeConfig.loaderUrl;
    script.async = true;

    const timeout = setTimeout(() => reject(new Error('加载超时')), 30000);

    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('无法加载模拟器核心'));
    };
    document.head.appendChild(script);
  });
}

// ========================================
// 手动切换核心
// ========================================
function switchArcadeCore() {
  if (!currentArcadeGame) return;

  // 切换到下一个核心
  currentCoreIndex = (currentCoreIndex + 1) % ARCADE_CORES.length;
  const newCore = ARCADE_CORES[currentCoreIndex];

  console.log(`🔄 手动切换核心: ${newCore}`);

  // 更新界面核心显示
  const coreNameSpan = document.getElementById('arcade-core-name');
  if (coreNameSpan) coreNameSpan.textContent = newCore;

  // 显示加载状态
  const loadingDiv = document.getElementById('arcade-loading');
  const statusDiv = document.getElementById('arcade-loading-status');
  if (loadingDiv) loadingDiv.classList.remove('hidden');
  if (statusDiv) statusDiv.textContent = `切换至核心: ${newCore}...`;

  // 隐藏错误提示
  const errorDiv = document.getElementById('arcade-error');
  if (errorDiv) errorDiv.classList.add('hidden');

  // 重新初始化模拟器
  initEmulatorJS(currentArcadeGame, newCore);
}

// ========================================
// 重试加载游戏
// ========================================
function retryArcadeGame() {
  if (currentArcadeGame) {
    const errorDiv = document.getElementById('arcade-error');
    const loadingDiv = document.getElementById('arcade-loading');

    if (errorDiv) errorDiv.classList.add('hidden');
    if (loadingDiv) loadingDiv.classList.remove('hidden');

    // 重置启动标志，但保持当前核心索引不变
    gameStarted = false;
    if (retryTimer) clearTimeout(retryTimer);

    // 使用当前核心重新初始化
    initEmulatorJS(currentArcadeGame, ARCADE_CORES[currentCoreIndex]);
  }
}

// ========================================
// 显示错误信息
// ========================================
function showArcadeError(message) {
  const loadingDiv = document.getElementById('arcade-loading');
  const errorDiv = document.getElementById('arcade-error');
  const errorMessage = document.getElementById('arcade-error-message');

  if (loadingDiv) loadingDiv.classList.add('hidden');
  if (errorDiv) errorDiv.classList.remove('hidden');
  if (errorMessage) errorMessage.textContent = message;
}

// ========================================
// 关闭街机播放器 - 彻底清理资源
// ========================================
function closeArcadePlayer() {
  console.log('🛑 关闭街机播放器，清理资源...');

  if (retryTimer) clearTimeout(retryTimer);

  // 移除 ESC 事件监听
  if (window._arcadeEscHandler) {
    document.removeEventListener('keydown', window._arcadeEscHandler);
    window._arcadeEscHandler = null;
  }

  // 退出全屏（如果在全屏状态）
  if (document.fullscreenElement || document.webkitFullscreenElement || 
      document.mozFullScreenElement || document.msFullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(e => console.log('退出全屏失败:', e));
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  // 清理 EmulatorJS 资源
  cleanupEmulatorJS();

  // 移除播放器DOM
  const playerModal = document.getElementById('game-player-modal');
  if (playerModal) {
    playerModal.remove();
  }

  currentArcadeGame = null;
  console.log('✅ 街机播放器已关闭');
}

// ========================================
// 彻底清理 EmulatorJS 资源 - 修复音频残留问题
// ========================================
function cleanupEmulatorJS() {
  console.log('🧹 清理 EmulatorJS 资源...');

  // 1. 停止模拟器音频
  if (window.EJS_emulator) {
    try {
      if (window.EJS_emulator.stop) window.EJS_emulator.stop();
      if (window.EJS_emulator.pause) window.EJS_emulator.pause();
      if (window.EJS_emulator.setVolume) window.EJS_emulator.setVolume(0);
    } catch (e) {
      console.log('停止模拟器时出错:', e);
    }
  }

  // 2. 清理 Web Audio 上下文
  if (window.EJS_audioContext) {
    try {
      window.EJS_audioContext.suspend();
      window.EJS_audioContext.close();
    } catch (e) {}
    window.EJS_audioContext = null;
  }

  // 3. 停止所有音频节点
  if (window.EJS_audioNode) {
    try { window.EJS_audioNode.disconnect(); } catch (e) {}
    window.EJS_audioNode = null;
  }

  // 4. 清空容器
  const container = document.getElementById('emulatorjs-container');
  if (container) {
    container.innerHTML = '';
  }

  // 5. 移除 EmulatorJS 创建的 iframe
  const ejsIframes = document.querySelectorAll('iframe[id*="ejs"], iframe[src*="emulatorjs"]');
  ejsIframes.forEach(iframe => iframe.remove());

  // 6. 清理全局变量
  const ejsVars = [
    'EJS_player', 'EJS_core', 'EJS_gameUrl', 'EJS_gameName', 'EJS_gameID',
    'EJS_pathtodata', 'EJS_startOnLoaded', 'EJS_language', 'EJS_volume',
    'EJS_controlScheme', 'EJS_onGameStart', 'EJS_onError',
    'EJS_emulator', 'EJS_audioContext', 'EJS_audioNode'
  ];
  ejsVars.forEach(varName => {
    try { delete window[varName]; } catch (e) {}
  });

  // 7. 移除 loader 脚本（下次重新加载）
  const loaderScript = document.querySelector('script[src="' + arcadeConfig.loaderUrl + '"]');
  if (loaderScript) loaderScript.remove();

  console.log('✅ EmulatorJS 资源已彻底清理');
}

// ========================================
// 全屏切换 - 修复版
// ========================================
function toggleArcadeFullscreen() {
  console.log('🔍 切换全屏模式');

  // 尝试多个可能的全屏目标元素
  const possibleTargets = [
    document.getElementById('arcade-game-wrapper'),
    document.getElementById('arcade-player-container'),
    document.getElementById('game-player-modal'),
    document.documentElement
  ];
  const target = possibleTargets.find(el => el !== null);

  if (!target) {
    console.error('找不到全屏目标元素');
    return;
  }

  if (!document.fullscreenElement && !document.webkitFullscreenElement && 
      !document.mozFullScreenElement && !document.msFullscreenElement) {
    // 进入全屏
    const requestMethod = target.requestFullscreen || target.webkitRequestFullscreen || 
                         target.mozRequestFullScreen || target.msRequestFullscreen;

    if (requestMethod) {
      requestMethod.call(target).then(() => {
        console.log('✅ 已进入全屏模式');
        const container = document.getElementById('arcade-player-container');
        if (container) {
          container.style.maxWidth = '100%';
          container.style.maxHeight = '100vh';
          container.style.width = '100%';
          container.style.height = '100vh';
          container.style.borderRadius = '0';
        }
        const wrapper = document.getElementById('arcade-game-wrapper');
        if (wrapper) wrapper.style.minHeight = '100vh';
        const controls = document.getElementById('arcade-controls');
        if (controls) controls.style.display = 'none';
        const header = document.getElementById('arcade-header');
        if (header) header.style.display = 'none';
      }).catch(err => {
        console.error('进入全屏失败:', err);
        showToast('无法进入全屏模式，请尝试按 F11', 'warning');
      });
    } else {
      showToast('您的浏览器不支持全屏API', 'warning');
    }
  } else {
    // 退出全屏
    const exitMethod = document.exitFullscreen || document.webkitExitFullscreen || 
                      document.mozCancelFullScreen || document.msExitFullscreen;

    if (exitMethod) {
      exitMethod.call(document).then(() => {
        console.log('✅ 已退出全屏模式');
        const container = document.getElementById('arcade-player-container');
        if (container) {
          container.style.maxWidth = '';
          container.style.maxHeight = '';
          container.style.width = '';
          container.style.height = '';
          container.style.borderRadius = '';
        }
        const wrapper = document.getElementById('arcade-game-wrapper');
        if (wrapper) wrapper.style.minHeight = '480px';
        const controls = document.getElementById('arcade-controls');
        if (controls) controls.style.display = '';
        const header = document.getElementById('arcade-header');
        if (header) header.style.display = '';
      }).catch(err => {
        console.error('退出全屏失败:', err);
      });
    }
  }
}

// 监听全屏变化事件
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

function handleFullscreenChange() {
  const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                         document.mozFullScreenElement || document.msFullscreenElement);

  console.log('全屏状态变化:', isFullscreen ? '全屏' : '窗口');

  if (!isFullscreen) {
    // 退出全屏时恢复样式
    const container = document.getElementById('arcade-player-container');
    if (container) {
      container.style.maxWidth = '';
      container.style.maxHeight = '';
      container.style.width = '';
      container.style.height = '';
      container.style.borderRadius = '';
    }
    const wrapper = document.getElementById('arcade-game-wrapper');
    if (wrapper) wrapper.style.minHeight = '480px';
    const controls = document.getElementById('arcade-controls');
    if (controls) controls.style.display = '';
    const header = document.getElementById('arcade-header');
    if (header) header.style.display = '';
  }
}

// ========================================
// 检查是否为街机游戏
// ========================================
function isArcadeGame(game) {
  return game && game.platform === 'arcade';
}