// ========================================
// MD 模拟器模块（Mega Drive / Genesis）
// 修复：按键映射、手柄键盘冲突
// 版本：3.1 - 移除调试输出
// ========================================

let currentMdGame = null;
let mdPlayerModal = null;
let mdRetryTimer = null;
let mdLoaderLoaded = false;
let mdScriptElement = null;

const mdConfig = {
  pathToData: 'https://cdn.emulatorjs.org/stable/data/',
  loaderUrl: 'https://cdn.emulatorjs.org/stable/data/loader.js',
  defaultVolume: 0.8,
  language: 'zh-CN'
};

let originalMenuKeyHandler = null;

// 过滤无害错误
(function filterInspectorErrors() {
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const firstArg = args[0];
    if (typeof firstArg === 'string' &&
        (firstArg.includes('handleResize') ||
         firstArg.includes('XMLHttpRequest') ||
         firstArg.includes('InvalidStateError') ||
         firstArg.includes('gamepad'))) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
})();

function startMdGame(game) {
  console.log('🎮 启动 MD 游戏:', game.title, 'ROM:', game.romUrl);
  if (!game.romUrl || game.romUrl === '#') {
    showToast('该游戏暂无ROM文件', 'error');
    return;
  }
  fetch(game.romUrl, { method: 'HEAD', cache: 'no-cache' })
    .then(res => {
      if (res.ok) {
        currentMdGame = game;
        const gameModal = document.getElementById('game-modal');
        if (gameModal) gameModal.classList.add('hidden');
        showMdPlayer(game);
      } else {
        showToast(`ROM 文件不存在 (${res.status})`, 'error');
      }
    })
    .catch(err => showToast('无法连接 ROM 服务器', 'error'));
}

function showMdPlayer(game) {
  let existing = document.getElementById('game-player-modal');
  if (existing) existing.remove();

  mdPlayerModal = document.createElement('div');
  mdPlayerModal.id = 'game-player-modal';
  mdPlayerModal.className = 'fixed inset-0 bg-black z-[60] flex items-center justify-center';
  mdPlayerModal.style.cssText = 'background-color: rgba(0,0,0,0.95);';

  mdPlayerModal.innerHTML = `
    <div class="bg-background rounded-xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-gray-700" id="md-player-container">
      <div class="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900" id="md-header">
        <div class="flex items-center flex-1 min-w-0">
          <i class="fa fa-gamepad text-md mr-3 text-xl"></i>
          <h2 class="text-xl font-bold mr-4 truncate text-white">${escapeHtml(game.title)}</h2>
          <span class="text-xs bg-md px-2 py-1 rounded text-white font-bold">MD</span>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
          <button id="md-fullscreen" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded transition-colors" title="全屏"><i class="fa fa-expand"></i></button>
          <button id="md-close" class="bg-nes hover:bg-red-700 text-white py-2 px-3 rounded transition-colors" title="关闭"><i class="fa fa-times"></i></button>
        </div>
      </div>
      <div class="flex-1 bg-black relative flex items-center justify-center" id="md-game-wrapper" style="min-height: 480px; overflow: hidden;">
        <div id="md-loading" class="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
          <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-md mb-4"></div>
          <p class="text-xl font-bold text-white">正在加载 MD 游戏...</p>
          <p class="text-textSecondary text-sm mt-2">${escapeHtml(game.title)}</p>
          <p class="text-textSecondary text-xs mt-1" id="md-loading-status">初始化模拟器...</p>
          <p class="text-gray-500 text-xs mt-4">首次加载可能需要较长时间</p>
        </div>
        <div id="md-error" class="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 hidden">
          <i class="fa fa-exclamation-triangle text-4xl text-nes mb-4"></i>
          <p class="text-xl font-bold text-nes">游戏加载失败</p>
          <p class="text-textSecondary mt-2 text-center px-4" id="md-error-message"></p>
          <div class="mt-4 flex space-x-3">
            <button id="md-retry" class="bg-secondary hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"><i class="fa fa-refresh mr-2"></i>重试</button>
            <button id="md-close-error" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors">关闭</button>
          </div>
        </div>
        <div id="emulatorjs-md-container" class="w-full h-full flex items-center justify-center" style="min-height: 480px;"></div>
      </div>
      <div class="p-3 border-t border-gray-700 bg-gray-900" id="md-controls">
        <div class="flex flex-wrap justify-between items-center text-sm text-textSecondary">
          <div class="flex items-center space-x-4 flex-wrap gap-y-2">
            <span class="flex items-center text-green-400 font-bold">
              <i class="fa fa-keyboard mr-1"></i> 键盘模式
            </span>
            <span class="flex items-center">方向: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">↑↓←→</kbd></span>
            <span class="flex items-center">B: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Z</kbd> A: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">X</kbd> C: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">C</kbd></span>
            <span class="flex items-center">开始: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Enter</kbd> 模式: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Shift</kbd></span>
          </div>
          <div class="text-xs text-gray-500 mt-2 sm:mt-0"><i class="fa fa-microchip mr-1"></i> EmulatorJS + Genesis Plus GX</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(mdPlayerModal);
  bindMdEvents();
  initMdEmulatorJS(game);
}

function bindMdEvents() {
  document.getElementById('md-close').onclick = closeMdPlayer;
  document.getElementById('md-close-error').onclick = closeMdPlayer;
  document.getElementById('md-fullscreen').onclick = toggleMdFullscreen;
  document.getElementById('md-retry').onclick = () => {
    if (currentMdGame) {
      const errorDiv = document.getElementById('md-error');
      const loadingDiv = document.getElementById('md-loading');
      if (errorDiv) errorDiv.classList.add('hidden');
      if (loadingDiv) loadingDiv.classList.remove('hidden');
      if (mdRetryTimer) clearTimeout(mdRetryTimer);
      initMdEmulatorJS(currentMdGame);
    }
  };

  const escHandler = (e) => {
    if (e.key === 'Escape') closeMdPlayer();
  };
  document.addEventListener('keydown', escHandler);
  window._mdEscHandler = escHandler;
}

function initMdEmulatorJS(game) {
  const container = document.getElementById('emulatorjs-md-container');
  const loadingDiv = document.getElementById('md-loading');
  const statusDiv = document.getElementById('md-loading-status');

  if (!container) {
    setTimeout(() => initMdEmulatorJS(game), 200);
    return;
  }

  if (statusDiv) statusDiv.textContent = '启动模拟器...';

  cleanupMdEmulator();

  if (window._menuKeyHandler) {
    originalMenuKeyHandler = window._menuKeyHandler;
    document.removeEventListener('keydown', originalMenuKeyHandler);
    window._menuKeyHandler = null;
  }

  // 禁用游戏手柄支持（防止冲突）
  window.EJS_gamepad = false;
  window.EJS_virtualGamepad = false;
  window.EJS_directKeyboardInput = true;
  window.EJS_defaultControls = false;
  
  // 基础配置
  window.EJS_player = '#emulatorjs-md-container';
  window.EJS_core = 'genesis_plus_gx';
  window.EJS_gameUrl = game.romUrl;
  window.EJS_gameName = game.id;
  window.EJS_gameID = `md_${game.id}_${Date.now()}`;
  window.EJS_pathtodata = mdConfig.pathToData;
  window.EJS_startOnLoaded = true;
  window.EJS_language = mdConfig.language;
  window.EJS_volume = mdConfig.defaultVolume;

  // 按钮映射表
  const buttonMap = {
    'ArrowUp': 4, 'ArrowDown': 5, 'ArrowLeft': 6, 'ArrowRight': 7,
    'KeyZ': 0, 'KeyX': 1, 'KeyC': 8,
    'Enter': 3, 'ShiftLeft': 2, 'ShiftRight': 2,
    'KeyW': 4, 'KeyS': 5, 'KeyA': 6, 'KeyD': 7,
    'KeyJ': 0, 'KeyK': 1, 'KeyL': 8, 'KeyN': 3, 'KeyM': 2
  };

  const buttonNames = {
    0: 'B', 1: 'A', 2: 'MODE', 3: 'START',
    4: 'UP', 5: 'DOWN', 6: 'LEFT', 7: 'RIGHT', 8: 'C'
  };

  window.EJS_onGameStart = () => {
    if (mdRetryTimer) clearTimeout(mdRetryTimer);
    if (loadingDiv) loadingDiv.classList.add('hidden');
    showToast('游戏启动成功！键盘控制已启用', 'success');

    setTimeout(() => {
      setupExclusiveKeyboardInput(buttonMap, buttonNames);
    }, 2000);

    if (originalMenuKeyHandler) {
      document.addEventListener('keydown', originalMenuKeyHandler);
      window._menuKeyHandler = originalMenuKeyHandler;
    }
  };

  window.EJS_onError = (error) => {
    let errorMsg = '模拟器加载失败';
    if (typeof error === 'string') errorMsg = error;
    else if (error && error.message) errorMsg = error.message;
    if (errorMsg.includes('404')) errorMsg = 'ROM 文件不存在，请检查路径';
    showMdError(errorMsg);
    if (originalMenuKeyHandler) {
      document.addEventListener('keydown', originalMenuKeyHandler);
      window._menuKeyHandler = originalMenuKeyHandler;
    }
  };

  mdRetryTimer = setTimeout(() => {
    showMdError('游戏加载超时，请检查网络或重试');
  }, 20000);

  loadMdLoader()
    .then(() => {
      if (statusDiv) statusDiv.textContent = '加载 ROM...';
    })
    .catch((err) => {
      showMdError('加载模拟器失败: ' + err.message);
    });
}

function setupExclusiveKeyboardInput(buttonMap, buttonNames) {
  const keyState = {};

  const sendInput = (buttonIndex, isPressed) => {
    if (!window.EJS_emulator || !window.EJS_emulator.gameManager) return false;
    try {
      window.EJS_emulator.gameManager.simulateInput(0, buttonIndex, isPressed ? 1 : 0);
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleKey = (e, isDown) => {
    const code = e.code;
    if (!(code in buttonMap)) return;
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      e.preventDefault();
    }
    
    const buttonIndex = buttonMap[code];
    const success = sendInput(buttonIndex, isDown);
    
    if (success) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    
    keyState[code] = isDown;
  };

  const keyDownHandler = (e) => handleKey(e, true);
  const keyUpHandler = (e) => handleKey(e, false);

  document.addEventListener('keydown', keyDownHandler, true);
  document.addEventListener('keyup', keyUpHandler, true);

  window._mdKeyDownHandler = keyDownHandler;
  window._mdKeyUpHandler = keyUpHandler;

  // 禁用游戏手柄 API
  if (navigator.getGamepads) {
    const originalGetGamepads = navigator.getGamepads;
    navigator.getGamepads = function() { return []; };
    window._mdOriginalGetGamepads = originalGetGamepads;
  }

  // 保持窗口焦点
  const focusInterval = setInterval(() => {
    window.focus();
    const canvas = document.querySelector('#emulatorjs-md-container canvas');
    if (canvas) canvas.focus();
  }, 500);
  window._mdFocusInterval = focusInterval;

  const container = document.getElementById('emulatorjs-md-container');
  if (container) {
    container.addEventListener('click', () => window.focus());
  }

  console.log('✅ 键盘控制已就绪：Z=B, X=A, C=C, Enter=开始, Shift=模式');
}

function loadMdLoader() {
  return new Promise((resolve, reject) => {
    if (mdLoaderLoaded) {
      resolve();
      return;
    }
    if (mdScriptElement) {
      mdScriptElement.remove();
      mdScriptElement = null;
    }
    const script = document.createElement('script');
    script.src = mdConfig.loaderUrl;
    script.async = true;
    const timeout = setTimeout(() => reject(new Error('加载超时')), 30000);
    script.onload = () => {
      clearTimeout(timeout);
      mdLoaderLoaded = true;
      mdScriptElement = script;
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('无法加载模拟器核心，请检查网络'));
    };
    document.head.appendChild(script);
  });
}

function showMdError(message) {
  const loadingDiv = document.getElementById('md-loading');
  const errorDiv = document.getElementById('md-error');
  const errorMessage = document.getElementById('md-error-message');
  if (loadingDiv) loadingDiv.classList.add('hidden');
  if (errorDiv) errorDiv.classList.remove('hidden');
  if (errorMessage) errorMessage.textContent = message;
  if (originalMenuKeyHandler) {
    document.addEventListener('keydown', originalMenuKeyHandler);
    window._menuKeyHandler = originalMenuKeyHandler;
  }
}

function closeMdPlayer() {
  if (mdRetryTimer) clearTimeout(mdRetryTimer);
  
  if (window._mdEscHandler) {
    document.removeEventListener('keydown', window._mdEscHandler);
    window._mdEscHandler = null;
  }
  if (window._mdKeyDownHandler) {
    document.removeEventListener('keydown', window._mdKeyDownHandler, true);
    window._mdKeyDownHandler = null;
  }
  if (window._mdKeyUpHandler) {
    document.removeEventListener('keyup', window._mdKeyUpHandler, true);
    window._mdKeyUpHandler = null;
  }
  if (window._mdFocusInterval) {
    clearInterval(window._mdFocusInterval);
    window._mdFocusInterval = null;
  }
  
  if (window._mdOriginalGetGamepads) {
    navigator.getGamepads = window._mdOriginalGetGamepads;
    window._mdOriginalGetGamepads = null;
  }
  
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  cleanupMdEmulator();
  if (mdPlayerModal) mdPlayerModal.remove();
  currentMdGame = null;
  
  if (originalMenuKeyHandler) {
    document.addEventListener('keydown', originalMenuKeyHandler);
    window._menuKeyHandler = originalMenuKeyHandler;
  }
}

function cleanupMdEmulator() {
  if (window.EJS_emulator) {
    try {
      if (window.EJS_emulator.stop) window.EJS_emulator.stop();
      if (window.EJS_emulator.pause) window.EJS_emulator.pause();
    } catch(e) {}
    window.EJS_emulator = null;
  }
  if (window.EJS_audioContext) {
    try { window.EJS_audioContext.suspend(); window.EJS_audioContext.close(); } catch(e) {}
    window.EJS_audioContext = null;
  }
  const container = document.getElementById('emulatorjs-md-container');
  if (container) container.innerHTML = '';
  document.querySelectorAll('iframe[id*="ejs"]').forEach(iframe => iframe.remove());
  
  const ejsVars = [
    'EJS_player', 'EJS_core', 'EJS_gameUrl', 'EJS_gameName', 'EJS_gameID',
    'EJS_pathtodata', 'EJS_startOnLoaded', 'EJS_language', 'EJS_volume',
    'EJS_onGameStart', 'EJS_onError', 'EJS_emulator', 'EJS_audioContext',
    'EJS_controls', 'EJS_defaultControls', 'EJS_keyboard', 
    'EJS_directKeyboardInput', 'EJS_Buttons', 'EJS_gamepad', 'EJS_virtualGamepad'
  ];
  ejsVars.forEach(v => { try { delete window[v]; } catch(e) {} });
  
  mdLoaderLoaded = false;
  if (mdScriptElement) {
    mdScriptElement.remove();
    mdScriptElement = null;
  }
}

function toggleMdFullscreen() {
  const wrapper = document.getElementById('md-game-wrapper');
  const container = document.getElementById('md-player-container');
  const target = wrapper || container || document.documentElement;
  
  if (!document.fullscreenElement) {
    if (target.requestFullscreen) {
      target.requestFullscreen().then(() => {
        if (container) {
          container.style.maxWidth = '100vw';
          container.style.maxHeight = '100vh';
          container.style.width = '100vw';
          container.style.height = '100vh';
          container.style.borderRadius = '0';
        }
        const controls = document.getElementById('md-controls');
        const header = document.getElementById('md-header');
        if (controls) controls.style.display = 'none';
        if (header) header.style.display = 'none';
      }).catch(() => showToast('全屏失败', 'warning'));
    } else {
      showToast('浏览器不支持全屏', 'warning');
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => {
        if (container) {
          container.style.maxWidth = '';
          container.style.maxHeight = '';
          container.style.width = '';
          container.style.height = '';
          container.style.borderRadius = '';
        }
        const controls = document.getElementById('md-controls');
        const header = document.getElementById('md-header');
        if (controls) controls.style.display = '';
        if (header) header.style.display = '';
      });
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
    return c;
  });
}