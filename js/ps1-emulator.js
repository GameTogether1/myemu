// ========================================
// PS1 模拟器模块（PlayStation / PBP）
// 使用 EmulatorJS PSX 核心，支持 .pbp / .bin/.cue
// 基于 kimi 的成功示例封装，集成现有项目风格
// ========================================

let currentPs1Game = null;
let ps1PlayerModal = null;
let ps1RetryTimer = null;
let ps1LoaderLoaded = false;
let ps1ScriptElement = null;

const ps1Config = {
  pathToData: 'https://cdn.emulatorjs.org/stable/data/',
  loaderUrl: 'https://cdn.emulatorjs.org/stable/data/loader.js',
  defaultVolume: 0.8,
  language: 'zh-CN'
};

// ========================================
// 启动 PS1 游戏
// ========================================
function startPs1Game(game) {
  console.log('🎮 启动 PS1 游戏:', game.title, 'ROM:', game.romUrl);

  if (!game.romUrl || game.romUrl === '#') {
    showToast('该游戏暂无ROM文件', 'error');
    return;
  }

  if (ps1RetryTimer) clearTimeout(ps1RetryTimer);
  currentPs1Game = game;

  // 关闭游戏详情模态框
  const gameModal = document.getElementById('game-modal');
  if (gameModal) gameModal.classList.add('hidden');

  showPs1Player(game);
}

// ========================================
// 显示 PS1 播放器界面
// ========================================
function showPs1Player(game) {
  // 移除已存在的播放器
  let existingModal = document.getElementById('game-player-modal');
  if (existingModal) existingModal.remove();

  ps1PlayerModal = document.createElement('div');
  ps1PlayerModal.id = 'game-player-modal';
  ps1PlayerModal.className = 'fixed inset-0 bg-black z-[60] flex items-center justify-center';
  ps1PlayerModal.style.cssText = 'background-color: rgba(0,0,0,0.95);';

  ps1PlayerModal.innerHTML = `
    <div class="bg-background rounded-xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-gray-700" id="ps1-player-container">
      <div class="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900" id="ps1-header">
        <div class="flex items-center flex-1 min-w-0">
          <i class="fa fa-gamepad text-ps1 mr-3 text-xl"></i>
          <h2 class="text-xl font-bold mr-4 truncate text-white">${escapeHtml(game.title)}</h2>
          <span class="text-xs bg-ps1 px-2 py-1 rounded text-white font-bold">PS1</span>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
          <button id="ps1-fullscreen" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded transition-colors" title="全屏">
            <i class="fa fa-expand"></i>
          </button>
          <button id="ps1-close" class="bg-nes hover:bg-red-700 text-white py-2 px-3 rounded transition-colors" title="关闭">
            <i class="fa fa-times"></i>
          </button>
        </div>
      </div>

      <div class="flex-1 bg-black relative flex items-center justify-center" id="ps1-game-wrapper" style="min-height: 480px; overflow: hidden;">
        <div id="ps1-loading" class="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
          <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-ps1 mb-4"></div>
          <p class="text-xl font-bold text-white">正在加载 PS1 游戏...</p>
          <p class="text-textSecondary text-sm mt-2">${escapeHtml(game.title)}</p>
          <p class="text-textSecondary text-xs mt-1" id="ps1-loading-status">初始化模拟器...</p>
          <p class="text-gray-500 text-xs mt-4">首次加载可能需要较长时间，请确保 BIOS 文件已配置（如有需要）</p>
        </div>

        <div id="ps1-error" class="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 hidden">
          <i class="fa fa-exclamation-triangle text-4xl text-nes mb-4"></i>
          <p class="text-xl font-bold text-nes">游戏加载失败</p>
          <p class="text-textSecondary mt-2 text-center px-4" id="ps1-error-message"></p>
          <div class="mt-4 flex space-x-3">
            <button id="ps1-retry" class="bg-secondary hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors">
              <i class="fa fa-refresh mr-2"></i>重试
            </button>
            <button id="ps1-close-error" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors">
              关闭
            </button>
          </div>
        </div>

        <div id="emulatorjs-ps1-container" class="w-full h-full flex items-center justify-center" style="min-height: 480px;"></div>
      </div>

      <div class="p-3 border-t border-gray-700 bg-gray-900" id="ps1-controls">
        <div class="flex flex-wrap justify-between items-center text-sm text-textSecondary">
          <div class="flex items-center space-x-4 flex-wrap gap-y-2">
            <span class="flex items-center"><i class="fa fa-keyboard-o mr-1 text-ps1"></i> 开始: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Enter</kbd></span>
            <span class="flex items-center">方向: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">↑↓←→</kbd></span>
            <span class="flex items-center">△: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">A</kbd> ○: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">X</kbd></span>
            <span class="flex items-center">✕: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Z</kbd> □: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">S</kbd></span>
            <span class="flex items-center">L1/R1: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Q</kbd> <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">W</kbd></span>
          </div>
          <div class="text-xs text-gray-500 mt-2 sm:mt-0">
            <i class="fa fa-microchip mr-1"></i> EmulatorJS + PSX (需要 BIOS)
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(ps1PlayerModal);
  bindPs1Events();
  initPs1EmulatorJS(game);
}

function bindPs1Events() {
  document.getElementById('ps1-close').onclick = closePs1Player;
  document.getElementById('ps1-close-error').onclick = closePs1Player;
  document.getElementById('ps1-fullscreen').onclick = togglePs1Fullscreen;
  document.getElementById('ps1-retry').onclick = () => {
    if (currentPs1Game) {
      const errorDiv = document.getElementById('ps1-error');
      const loadingDiv = document.getElementById('ps1-loading');
      if (errorDiv) errorDiv.classList.add('hidden');
      if (loadingDiv) loadingDiv.classList.remove('hidden');
      if (ps1RetryTimer) clearTimeout(ps1RetryTimer);
      initPs1EmulatorJS(currentPs1Game);
    }
  };

  const escHandler = (e) => {
    if (e.key === 'Escape') closePs1Player();
  };
  document.addEventListener('keydown', escHandler);
  window._ps1EscHandler = escHandler;
}

// ========================================
// 初始化 EmulatorJS（PS1 核心）
// ========================================
function initPs1EmulatorJS(game) {
  const container = document.getElementById('emulatorjs-ps1-container');
  const loadingDiv = document.getElementById('ps1-loading');
  const statusDiv = document.getElementById('ps1-loading-status');

  if (!container) {
    setTimeout(() => initPs1EmulatorJS(game), 200);
    return;
  }

  if (statusDiv) statusDiv.textContent = '启动模拟器...';

  cleanupPs1Emulator();

  // 设置全局变量（与 kimi 示例一致，但增加更多可选参数）
  window.EJS_player = '#emulatorjs-ps1-container';
  window.EJS_core = 'psx';                     // PS1 核心
  window.EJS_gameUrl = game.romUrl;
  window.EJS_gameName = game.id;
  window.EJS_gameID = `ps1_${game.id}_${Date.now()}`;
  window.EJS_pathtodata = ps1Config.pathToData;
  window.EJS_startOnLoaded = true;
  window.EJS_language = ps1Config.language;
  window.EJS_volume = ps1Config.defaultVolume;

  // 如果需要 BIOS 文件，可以在这里设置（例如从配置中读取）
  // window.EJS_biosUrl = 'https://your-server.com/bios/scph1001.bin';

  // 成功回调
  window.EJS_onGameStart = () => {
    if (ps1RetryTimer) clearTimeout(ps1RetryTimer);
    console.log('✅ PS1 游戏启动成功');
    if (loadingDiv) loadingDiv.classList.add('hidden');
    showToast('游戏启动成功！按 Enter 开始', 'success');
  };

  // 错误回调
  window.EJS_onError = (error) => {
    console.warn('⚠️ PS1 错误:', error);
    let errorMsg = '模拟器加载失败';
    if (typeof error === 'string') errorMsg = error;
    else if (error && error.message) errorMsg = error.message;
    if (errorMsg.includes('404')) errorMsg = 'ROM 文件不存在，请检查路径';
    if (errorMsg.includes('BIOS') || errorMsg.includes('bios')) errorMsg = '缺少 PS1 BIOS 文件，游戏可能无法运行';
    showPs1Error(errorMsg);
  };

  // 超时保护
  ps1RetryTimer = setTimeout(() => {
    showPs1Error('游戏加载超时，请检查网络或重试');
  }, 20000);

  // 加载 loader（确保只加载一次）
  loadPs1Loader()
    .then(() => {
      if (statusDiv) statusDiv.textContent = '加载 ROM...';
      console.log('✅ EmulatorJS loader 加载完成');
    })
    .catch((err) => {
      console.error('❌ 加载模拟器失败:', err);
      showPs1Error('加载模拟器失败: ' + err.message);
    });
}

function loadPs1Loader() {
  return new Promise((resolve, reject) => {
    if (ps1LoaderLoaded) {
      resolve();
      return;
    }

    if (ps1ScriptElement) {
      ps1ScriptElement.remove();
      ps1ScriptElement = null;
    }

    const script = document.createElement('script');
    script.src = ps1Config.loaderUrl;
    script.async = true;

    const timeout = setTimeout(() => reject(new Error('加载超时')), 30000);

    script.onload = () => {
      clearTimeout(timeout);
      ps1LoaderLoaded = true;
      ps1ScriptElement = script;
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('无法加载模拟器核心，请检查网络'));
    };
    document.head.appendChild(script);
  });
}

function showPs1Error(message) {
  const loadingDiv = document.getElementById('ps1-loading');
  const errorDiv = document.getElementById('ps1-error');
  const errorMessage = document.getElementById('ps1-error-message');
  if (loadingDiv) loadingDiv.classList.add('hidden');
  if (errorDiv) errorDiv.classList.remove('hidden');
  if (errorMessage) errorMessage.textContent = message;
}

function closePs1Player() {
  console.log('🛑 关闭 PS1 播放器');
  if (ps1RetryTimer) clearTimeout(ps1RetryTimer);
  if (window._ps1EscHandler) {
    document.removeEventListener('keydown', window._ps1EscHandler);
    window._ps1EscHandler = null;
  }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  cleanupPs1Emulator();
  if (ps1PlayerModal) ps1PlayerModal.remove();
  currentPs1Game = null;
}

function cleanupPs1Emulator() {
  console.log('🧹 清理 PS1 模拟器资源...');
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
  const container = document.getElementById('emulatorjs-ps1-container');
  if (container) container.innerHTML = '';
  document.querySelectorAll('iframe[id*="ejs"]').forEach(iframe => iframe.remove());
  const ejsVars = [
    'EJS_player', 'EJS_core', 'EJS_gameUrl', 'EJS_gameName', 'EJS_gameID',
    'EJS_pathtodata', 'EJS_startOnLoaded', 'EJS_language', 'EJS_volume',
    'EJS_onGameStart', 'EJS_onError', 'EJS_emulator', 'EJS_audioContext'
  ];
  ejsVars.forEach(v => { try { delete window[v]; } catch(e) {} });
  ps1LoaderLoaded = false;
  if (ps1ScriptElement) {
    ps1ScriptElement.remove();
    ps1ScriptElement = null;
  }
}

function togglePs1Fullscreen() {
  const wrapper = document.getElementById('ps1-game-wrapper');
  const container = document.getElementById('ps1-player-container');
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
        const controls = document.getElementById('ps1-controls');
        const header = document.getElementById('ps1-header');
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
        const controls = document.getElementById('ps1-controls');
        const header = document.getElementById('ps1-header');
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