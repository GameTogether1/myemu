// ========================================
// GBA 模拟器模块（使用 EmulatorJS）
// ========================================

let currentGbaGame = null;
let gbaPlayerModal = null;
let gbaRetryTimer = null;

const gbaConfig = {
  pathToData: 'https://cdn.emulatorjs.org/stable/data/',
  loaderUrl: 'https://cdn.emulatorjs.org/stable/data/loader.js',
  defaultVolume: 0.8,
  language: 'zh-CN'
};

function startGbaGame(game) {
  console.log('🎮 启动 GBA 游戏:', game.title, 'ROM:', game.romUrl);

  if (!game.romUrl || game.romUrl === '#') {
    showToast('该游戏暂无ROM文件', 'error');
    return;
  }

  if (gbaRetryTimer) clearTimeout(gbaRetryTimer);
  currentGbaGame = game;

  const gameModal = document.getElementById('game-modal');
  if (gameModal) gameModal.classList.add('hidden');

  showGbaPlayer(game);
}

function showGbaPlayer(game) {
  let existingModal = document.getElementById('game-player-modal');
  if (existingModal) existingModal.remove();

  gbaPlayerModal = document.createElement('div');
  gbaPlayerModal.id = 'game-player-modal';
  gbaPlayerModal.className = 'fixed inset-0 bg-black z-[60] flex items-center justify-center';
  gbaPlayerModal.style.cssText = 'background-color: rgba(0,0,0,0.95);';

  gbaPlayerModal.innerHTML = `
    <div class="bg-background rounded-xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-gray-700" id="gba-player-container">
      <div class="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900" id="gba-header">
        <div class="flex items-center flex-1 min-w-0">
          <i class="fa fa-gamepad text-gba mr-3 text-xl"></i>
          <h2 class="text-xl font-bold mr-4 truncate text-white">${game.title}</h2>
          <span class="text-xs bg-gba px-2 py-1 rounded text-white font-bold">GBA</span>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
          <button id="gba-fullscreen" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded transition-colors" title="全屏">
            <i class="fa fa-expand"></i>
          </button>
          <button id="gba-close" class="bg-nes hover:bg-red-700 text-white py-2 px-3 rounded transition-colors" title="关闭">
            <i class="fa fa-times"></i>
          </button>
        </div>
      </div>

      <div class="flex-1 bg-black relative flex items-center justify-center" id="gba-game-wrapper" style="min-height: 480px; overflow: hidden;">
        <div id="gba-loading" class="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
          <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-gba mb-4"></div>
          <p class="text-xl font-bold text-white">正在加载 GBA 游戏...</p>
          <p class="text-textSecondary text-sm mt-2">${game.title}</p>
          <p class="text-textSecondary text-xs mt-1" id="gba-loading-status">初始化模拟器...</p>
          <p class="text-gray-500 text-xs mt-4">首次加载可能需要较长时间</p>
        </div>

        <div id="gba-error" class="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 hidden">
          <i class="fa fa-exclamation-triangle text-4xl text-nes mb-4"></i>
          <p class="text-xl font-bold text-nes">游戏加载失败</p>
          <p class="text-textSecondary mt-2 text-center px-4" id="gba-error-message"></p>
          <div class="mt-4 flex space-x-3">
            <button id="gba-retry" class="bg-secondary hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors">
              <i class="fa fa-refresh mr-2"></i>重试
            </button>
            <button id="gba-close-error" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors">
              关闭
            </button>
          </div>
        </div>

        <div id="emulatorjs-gba-container" class="w-full h-full flex items-center justify-center" style="min-height: 480px;"></div>
      </div>

      <div class="p-3 border-t border-gray-700 bg-gray-900" id="gba-controls">
        <div class="flex flex-wrap justify-between items-center text-sm text-textSecondary">
          <div class="flex items-center space-x-4 flex-wrap gap-y-2">
            <span class="flex items-center"><i class="fa fa-keyboard-o mr-1 text-gba"></i> 开始: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Enter</kbd></span>
            <span class="flex items-center">方向: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">↑↓←→</kbd></span>
            <span class="flex items-center">A: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">X</kbd> B: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Z</kbd></span>
            <span class="flex items-center">L: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">A</kbd> R: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">S</kbd></span>
            <span class="flex items-center">选择: <kbd class="bg-gray-700 px-2 py-1 rounded mx-1">Shift</kbd></span>
          </div>
          <div class="text-xs text-gray-500 mt-2 sm:mt-0">
            <i class="fa fa-microchip mr-1"></i> EmulatorJS + GBA
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(gbaPlayerModal);
  gbaPlayerModal.classList.remove('hidden');

  document.getElementById('gba-close').onclick = closeGbaPlayer;
  document.getElementById('gba-close-error').onclick = closeGbaPlayer;
  document.getElementById('gba-fullscreen').onclick = toggleGbaFullscreen;
  document.getElementById('gba-retry').onclick = retryGbaGame;

  const escHandler = function(e) {
    if (e.key === 'Escape') closeGbaPlayer();
  };
  document.addEventListener('keydown', escHandler);
  window._gbaEscHandler = escHandler;

  initGbaEmulatorJS(game);
}

function initGbaEmulatorJS(game) {
  const container = document.getElementById('emulatorjs-gba-container');
  const loadingDiv = document.getElementById('gba-loading');
  const statusDiv = document.getElementById('gba-loading-status');

  if (!container) return;
  if (statusDiv) statusDiv.textContent = '启动模拟器...';

  cleanupGbaEmulator();

  window.EJS_player = '#emulatorjs-gba-container';
  window.EJS_core = 'mgba';          // GBA 核心
  window.EJS_gameUrl = game.romUrl;
  window.EJS_gameName = game.id;
  window.EJS_gameID = `gba_${game.id}_${Date.now()}`;
  window.EJS_pathtodata = gbaConfig.pathToData;
  window.EJS_startOnLoaded = true;
  window.EJS_language = gbaConfig.language;
  window.EJS_volume = gbaConfig.defaultVolume;

  window.EJS_onGameStart = function() {
    if (gbaRetryTimer) clearTimeout(gbaRetryTimer);
    console.log('✅ GBA 游戏启动成功');
    if (loadingDiv) loadingDiv.classList.add('hidden');
    showToast('游戏启动成功！按 Enter 开始', 'success');
  };

  window.EJS_onError = function(error) {
    console.warn('⚠️ GBA 错误:', error);
    let errorMsg = '模拟器加载失败';
    if (typeof error === 'string') errorMsg = error;
    else if (error && error.message) errorMsg = error.message;
    showGbaError(errorMsg);
  };

  gbaRetryTimer = setTimeout(() => {
    showGbaError('游戏加载超时，请刷新页面重试');
  }, 15000);

  loadGbaLoader()
    .then(() => {
      if (statusDiv) statusDiv.textContent = '加载 ROM...';
      console.log('✅ EmulatorJS loader 加载完成');
    })
    .catch((error) => {
      console.error('❌ 加载模拟器失败:', error);
      showGbaError('加载模拟器失败: ' + error.message);
    });
}

function loadGbaLoader() {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="' + gbaConfig.loaderUrl + '"]');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.src = gbaConfig.loaderUrl;
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

function showGbaError(message) {
  const loadingDiv = document.getElementById('gba-loading');
  const errorDiv = document.getElementById('gba-error');
  const errorMessage = document.getElementById('gba-error-message');
  if (loadingDiv) loadingDiv.classList.add('hidden');
  if (errorDiv) errorDiv.classList.remove('hidden');
  if (errorMessage) errorMessage.textContent = message;
}

function closeGbaPlayer() {
  console.log('🛑 关闭 GBA 播放器');
  if (gbaRetryTimer) clearTimeout(gbaRetryTimer);
  if (window._gbaEscHandler) {
    document.removeEventListener('keydown', window._gbaEscHandler);
    window._gbaEscHandler = null;
  }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  cleanupGbaEmulator();
  if (gbaPlayerModal) gbaPlayerModal.remove();
  currentGbaGame = null;
}

function cleanupGbaEmulator() {
  console.log('🧹 清理 GBA 模拟器资源...');
  if (window.EJS_emulator) {
    try {
      if (window.EJS_emulator.stop) window.EJS_emulator.stop();
      if (window.EJS_emulator.pause) window.EJS_emulator.pause();
    } catch(e) {}
  }
  if (window.EJS_audioContext) {
    try { window.EJS_audioContext.suspend(); window.EJS_audioContext.close(); } catch(e) {}
    window.EJS_audioContext = null;
  }
  const container = document.getElementById('emulatorjs-gba-container');
  if (container) container.innerHTML = '';
  const ejsIframes = document.querySelectorAll('iframe[id*="ejs"], iframe[src*="emulatorjs"]');
  ejsIframes.forEach(iframe => iframe.remove());
  const ejsVars = [
    'EJS_player', 'EJS_core', 'EJS_gameUrl', 'EJS_gameName', 'EJS_gameID',
    'EJS_pathtodata', 'EJS_startOnLoaded', 'EJS_language', 'EJS_volume',
    'EJS_onGameStart', 'EJS_onError', 'EJS_emulator', 'EJS_audioContext'
  ];
  ejsVars.forEach(varName => { try { delete window[varName]; } catch(e) {} });
  const loaderScript = document.querySelector('script[src="' + gbaConfig.loaderUrl + '"]');
  if (loaderScript) loaderScript.remove();
}

function retryGbaGame() {
  if (currentGbaGame) {
    const errorDiv = document.getElementById('gba-error');
    const loadingDiv = document.getElementById('gba-loading');
    if (errorDiv) errorDiv.classList.add('hidden');
    if (loadingDiv) loadingDiv.classList.remove('hidden');
    if (gbaRetryTimer) clearTimeout(gbaRetryTimer);
    initGbaEmulatorJS(currentGbaGame);
  }
}

function toggleGbaFullscreen() {
  const wrapper = document.getElementById('gba-game-wrapper');
  const container = document.getElementById('gba-player-container');
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
        const controls = document.getElementById('gba-controls');
        const header = document.getElementById('gba-header');
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
        const controls = document.getElementById('gba-controls');
        const header = document.getElementById('gba-header');
        if (controls) controls.style.display = '';
        if (header) header.style.display = '';
      });
    }
  }
}