// ========================================
// 游戏播放器 UI 模块
// 依赖: state.js, nesCore.js, gameControl.js, arcade-emulator.js, auth.js
// ========================================

// 初始化音频
function initAudio() {
  if (!window.audioContext) {
    window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (window.audioContext.state === 'suspended') {
    window.audioContext.resume();
  }
}

// 获取按键提示
function getControlHint(platform) {
  const hints = {
    'nes': 'Z=B X=A Enter=Start Shift=Select 方向键移动',
    'arcade': 'Z=攻击 X=跳跃 1=投币 Enter=开始',
    'snes': 'Z=B X=A A=X S=Y Enter=Start Shift=Select 方向键',
    'gba': 'Z=B X=A A=L S=R Enter=Start Shift=Select 方向键'
  };
  return hints[platform] || '键盘控制';
}

// 显示游戏播放器
function showGamePlayer(game, config) {
  let playerModal = document.getElementById('game-player-modal');
  if (playerModal) playerModal.remove();

  playerModal = document.createElement('div');
  playerModal.id = 'game-player-modal';
  playerModal.className = 'fixed inset-0 bg-black bg-opacity-95 z-[60] flex items-center justify-center';

  const controlHint = getControlHint(game.platform);

  playerModal.innerHTML = `
    <div class="bg-background rounded-xl max-w-5xl w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-gray-700" id="player-container">
      <div class="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900" id="player-header">
        <div class="flex items-center flex-1 min-w-0">
          <h2 class="text-xl font-bold mr-4 truncate">${game.title}</h2>
          <span class="text-xs bg-gray-800 px-2 py-1 rounded text-textSecondary">${config.name}</span>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
          <button id="player-menu" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded transition-colors" title="菜单"><i class="fa fa-bars"></i></button>
          <button id="player-fullscreen" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded transition-colors" title="全屏"><i class="fa fa-expand"></i></button>
          <button id="player-close" class="bg-nes hover:bg-red-700 text-white py-2 px-3 rounded transition-colors" title="关闭"><i class="fa fa-times"></i></button>
        </div>
      </div>

      <div class="flex-1 bg-black relative flex items-center justify-center" id="game-canvas-wrapper" style="min-height: 400px; overflow: hidden;">
        <canvas id="game-canvas" class="max-w-full max-h-full" style="image-rendering: pixelated;"></canvas>
        <div id="game-loading" class="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 z-10">
          <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-secondary mb-4"></div>
          <p class="text-xl font-bold">正在加载游戏...</p>
          <p class="text-textSecondary text-sm mt-2">平台: ${config.name}</p>
          <p class="text-textSecondary text-xs mt-1" id="loading-status">初始化中...</p>
        </div>
        <div id="pause-overlay" class="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center hidden z-10">
          <div class="text-center"><i class="fa fa-pause text-6xl text-white mb-4"></i><p class="text-2xl font-bold text-white">游戏暂停</p></div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-700 bg-gray-900 flex justify-between items-center flex-wrap gap-2" id="player-controls">
        <div class="flex space-x-2"><span class="text-textSecondary text-sm self-center">按 ESC 打开菜单</span></div>
        <div class="text-textSecondary text-sm">${controlHint}</div>
      </div>
    </div>

    <div id="game-menu-overlay" class="absolute inset-0 bg-black bg-opacity-60 z-[70] hidden flex items-center justify-center">
      <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-6 w-auto min-w-[300px] max-w-[90vw] mx-4 border border-white/20 shadow-2xl transform transition-all">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white"><i class="fa fa-gamepad mr-2 text-secondary"></i>游戏菜单</h3>
          <button id="close-menu" class="text-gray-400 hover:text-white transition-colors text-lg"><i class="fa fa-times"></i></button>
        </div>
        <div class="flex justify-center mb-4"><div id="menu-game-status" class="bg-black/30 rounded-full px-4 py-1 text-xs backdrop-blur-sm"><i class="fa fa-play-circle text-green-500 mr-2"></i><span class="text-white">运行中</span></div></div>
        <div class="grid grid-cols-2 gap-2 mb-4">
          <button id="menu-pause" class="bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-all flex flex-col items-center group backdrop-blur-sm border border-white/10"><i class="fa fa-pause text-xl mb-1 text-secondary group-hover:scale-110 transition-transform"></i><span class="text-xs">暂停/继续</span></button>
          <button id="menu-restart" class="bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-all flex flex-col items-center group backdrop-blur-sm border border-white/10"><i class="fa fa-refresh text-xl mb-1 text-nes group-hover:rotate-180 transition-transform duration-500"></i><span class="text-xs">重新开始</span></button>
          <button id="menu-mute" class="bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-all flex flex-col items-center group backdrop-blur-sm border border-white/10"><i id="mute-icon" class="fa fa-volume-up text-xl mb-1 text-gba group-hover:scale-110 transition-transform"></i><span id="mute-text" class="text-xs">静音</span></button>
          <button id="menu-speed" class="bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-all flex flex-col items-center group backdrop-blur-sm border border-white/10"><i class="fa fa-tachometer text-xl mb-1 text-md group-hover:scale-110 transition-transform"></i><span id="speed-text" class="text-xs">1.0x 速度</span></button>
        </div>
        <div class="bg-white/10 rounded-lg p-3 mb-3 backdrop-blur-sm border border-white/10">
          <div class="flex justify-between items-center mb-1"><span class="text-xs text-gray-300"><i class="fa fa-volume-down mr-1"></i>音量</span><span id="volume-value" class="text-xs text-secondary font-bold">100%</span></div>
          <input type="range" id="volume-slider" min="0" max="100" value="100" class="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-secondary">
        </div>
        <div class="bg-white/10 rounded-lg p-3 mb-3 backdrop-blur-sm border border-white/10">
          <div class="flex justify-between items-center mb-1"><span class="text-xs text-gray-300"><i class="fa fa-picture-o mr-1"></i>画面滤镜</span></div>
          <div class="flex space-x-1">
            <button id="filter-none" class="flex-1 bg-secondary text-white py-1.5 rounded text-xs transition-colors">无</button>
            <button id="filter-scanline" class="flex-1 bg-white/10 hover:bg-white/20 text-white py-1.5 rounded text-xs transition-colors">扫描线</button>
            <button id="filter-crt" class="flex-1 bg-white/10 hover:bg-white/20 text-white py-1.5 rounded text-xs transition-colors">CRT</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <button id="menu-save" class="bg-green-600/80 hover:bg-green-600 text-white py-2 rounded-lg transition-all flex items-center justify-center group backdrop-blur-sm border border-white/10"><i class="fa fa-save text-lg mr-1 group-hover:scale-110 transition-transform"></i><span class="text-xs font-bold">存档</span></button>
          <button id="menu-load" class="bg-blue-600/80 hover:bg-blue-600 text-white py-2 rounded-lg transition-all flex items-center justify-center group backdrop-blur-sm border border-white/10"><i class="fa fa-folder-open text-lg mr-1 group-hover:scale-110 transition-transform"></i><span class="text-xs font-bold">读档</span></button>
        </div>
        <div class="bg-white/5 rounded-lg p-2 text-xs text-gray-400 text-center backdrop-blur-sm border border-white/10"><i class="fa fa-info-circle mr-1"></i> ESC=菜单 P=暂停 R=重开 M=静音</div>
      </div>
    </div>
  `;

  document.body.appendChild(playerModal);
  playerModal.classList.remove('hidden');

  document.getElementById('player-close').onclick = function() {
    stopGame();
    setTimeout(() => playerModal.remove(), 50);
  };
  document.getElementById('player-fullscreen').onclick = toggleNESFullscreen;
  document.getElementById('player-menu').onclick = toggleMenu;
  document.getElementById('close-menu').onclick = toggleMenu;

  document.getElementById('menu-pause').onclick = function() {
    togglePause();
    updateMenuStatus();
  };
  document.getElementById('menu-restart').onclick = function() {
    if (confirm('确定要重新开始游戏吗？当前进度将丢失。')) {
      resetGame();
      toggleMenu();
    }
  };
  document.getElementById('menu-mute').onclick = function() {
    toggleMute();
    updateMenuStatus();
  };
  document.getElementById('menu-speed').onclick = function() {
    cycleGameSpeed();
    updateMenuStatus();
  };
  const volumeSlider = document.getElementById('volume-slider');
  volumeSlider.oninput = function(e) {
    setVolume(e.target.value / 100);
    document.getElementById('volume-value').textContent = e.target.value + '%';
  };
  document.getElementById('filter-none').onclick = function() {
    setFilter('none');
    updateFilterButtons();
  };
  document.getElementById('filter-scanline').onclick = function() {
    setFilter('scanline');
    updateFilterButtons();
  };
  document.getElementById('filter-crt').onclick = function() {
    setFilter('crt');
    updateFilterButtons();
  };
  document.getElementById('menu-save').onclick = saveGameState;
  document.getElementById('menu-load').onclick = loadGameState;

  setupMenuHotkeys();
  initEmulator(game, config);
}

// 全屏切换
function toggleNESFullscreen() {
  const playerModal = document.getElementById('game-player-modal');
  const container = document.getElementById('player-container');
  const wrapper = document.getElementById('game-canvas-wrapper');
  const header = document.getElementById('player-header');
  const controls = document.getElementById('player-controls');
  const canvas = document.getElementById('game-canvas');

  if (!document.fullscreenElement && !document.webkitFullscreenElement &&
      !document.mozFullScreenElement && !document.msFullscreenElement) {
    const target = playerModal || document.documentElement;
    if (target.requestFullscreen) {
      target.requestFullscreen().then(() => {
        if (container) {
          container.style.maxWidth = '100vw';
          container.style.maxHeight = '100vh';
          container.style.width = '100vw';
          container.style.height = '100vh';
          container.style.borderRadius = '0';
        }
        if (wrapper) wrapper.style.minHeight = 'calc(100vh - 80px)';
        if (header) header.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (canvas) {
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.objectFit = 'contain';
        }
      }).catch(err => showToast('全屏模式启动失败', 'error'));
    } else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
    else if (target.mozRequestFullScreen) target.mozRequestFullScreen();
    else if (target.msRequestFullscreen) target.msRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen().then(resetPlayerStyles);
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }
}

function resetPlayerStyles() {
  const container = document.getElementById('player-container');
  const wrapper = document.getElementById('game-canvas-wrapper');
  const header = document.getElementById('player-header');
  const controls = document.getElementById('player-controls');
  const canvas = document.getElementById('game-canvas');
  if (container) container.style.cssText = '';
  if (wrapper) wrapper.style.minHeight = '400px';
  if (header) header.style.display = '';
  if (controls) controls.style.display = '';
  if (canvas) canvas.style.cssText = '';
}

document.addEventListener('fullscreenchange', handleNESFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleNESFullscreenChange);
document.addEventListener('mozfullscreenchange', handleNESFullscreenChange);
document.addEventListener('MSFullscreenChange', handleNESFullscreenChange);

function handleNESFullscreenChange() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement &&
      !document.mozFullScreenElement && !document.msFullscreenElement) {
    resetPlayerStyles();
  }
}

// 游戏菜单相关
function toggleMenu() {
  const menuOverlay = document.getElementById('game-menu-overlay');
  if (!menuOverlay) return;
  if (menuOverlay.classList.contains('hidden')) {
    menuOverlay.classList.remove('hidden');
    if (!window.isPaused) pauseGame();
    updateMenuStatus();
  } else {
    menuOverlay.classList.add('hidden');
    if (window.isPaused) resumeGame();
  }
}

function updateMenuStatus() {
  const statusEl = document.getElementById('menu-game-status');
  const pauseIcon = document.querySelector('#menu-pause i');
  const muteIcon = document.getElementById('mute-icon');
  const muteText = document.getElementById('mute-text');
  const speedText = document.getElementById('speed-text');

  if (statusEl) {
    statusEl.innerHTML = window.isPaused
      ? '<i class="fa fa-pause-circle text-yellow-500 mr-2"></i><span class="text-white">已暂停</span>'
      : '<i class="fa fa-play-circle text-green-500 mr-2"></i><span class="text-white">运行中</span>';
  }
  if (pauseIcon) {
    pauseIcon.className = window.isPaused
      ? 'fa fa-play text-xl mb-1 text-green-500 group-hover:scale-110 transition-transform'
      : 'fa fa-pause text-xl mb-1 text-secondary group-hover:scale-110 transition-transform';
  }
  if (muteIcon) {
    muteIcon.className = window.isMuted
      ? 'fa fa-volume-off text-xl mb-1 text-red-500 group-hover:scale-110 transition-transform'
      : 'fa fa-volume-up text-xl mb-1 text-gba group-hover:scale-110 transition-transform';
  }
  if (muteText) muteText.textContent = window.isMuted ? '已静音' : '静音';
  if (speedText) speedText.textContent = window.gameSpeed.toFixed(1) + 'x 速度';
  updateFilterButtons();
}

function pauseGame() {
  if (!window.isPaused) {
    window.isPaused = true;
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.remove('hidden');
    if (window.audioContext && window.audioContext.state === 'running') window.audioContext.suspend();
  }
}

function resumeGame() {
  if (window.isPaused) {
    window.isPaused = false;
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    if (window.audioContext && window.audioContext.state === 'suspended') window.audioContext.resume();
  }
}

function togglePause() {
  if (window.isPaused) resumeGame();
  else pauseGame();
}

function toggleMute() {
  window.isMuted = !window.isMuted;
  setVolume(window.isMuted ? 0 : window.currentVolume);
}

function setVolume(vol) {
  window.currentVolume = vol;
  window.gameVolume = vol;
}

function cycleGameSpeed() {
  const speeds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5, 2.0];
  const currentIndex = speeds.indexOf(window.gameSpeed);
  window.gameSpeed = speeds[(currentIndex + 1) % speeds.length];
  window.gameSpeedMultiplier = window.gameSpeed;
}

function setFilter(filter) {
  window.currentFilter = filter;
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  if (filter === 'scanline') {
    canvas.style.cssText = `image-rendering: pixelated; background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2)); background-size: 100% 4px;`;
  } else if (filter === 'crt') {
    canvas.style.cssText = `image-rendering: pixelated; filter: contrast(1.1) saturate(1.2) brightness(1.1); box-shadow: inset 0 0 100px rgba(0,0,0,0.5);`;
  } else {
    canvas.style.cssText = 'image-rendering: pixelated;';
  }
}

function updateFilterButtons() {
  const filterNone = document.getElementById('filter-none');
  const filterScanline = document.getElementById('filter-scanline');
  const filterCrt = document.getElementById('filter-crt');
  if (filterNone) {
    filterNone.className = window.currentFilter === 'none'
      ? 'flex-1 bg-secondary text-white py-1.5 rounded text-xs transition-colors'
      : 'flex-1 bg-white/10 hover:bg-white/20 text-white py-1.5 rounded text-xs transition-colors';
  }
  if (filterScanline) {
    filterScanline.className = window.currentFilter === 'scanline'
      ? 'flex-1 bg-secondary text-white py-1.5 rounded text-xs transition-colors'
      : 'flex-1 bg-white/10 hover:bg-white/20 text-white py-1.5 rounded text-xs transition-colors';
  }
  if (filterCrt) {
    filterCrt.className = window.currentFilter === 'crt'
      ? 'flex-1 bg-secondary text-white py-1.5 rounded text-xs transition-colors'
      : 'flex-1 bg-white/10 hover:bg-white/20 text-white py-1.5 rounded text-xs transition-colors';
  }
}

function setupMenuHotkeys() {
  if (window._menuKeyHandler) document.removeEventListener('keydown', window._menuKeyHandler);
  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      toggleMenu();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      togglePause();
      updateMenuStatus();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (confirm('确定要重新开始游戏吗？')) resetGame();
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMute();
      updateMenuStatus();
    }
  };
  window._menuKeyHandler = keyHandler;
  document.addEventListener('keydown', keyHandler);
}

// ============================================
// startGame 函数（最终修正版）
// ============================================
function startGame(game) {
  closeGameModal();
  console.log('🎮 startGame 被调用, 游戏:', game.title, '平台:', game.platform);
  
  // 街机
  if (isArcadeGame(game)) {
    if (typeof startArcadeGame === 'function') {
      if (typeof handleGameLaunch === 'function') {
        handleGameLaunch(startArcadeGame, game);
      } else {
        startArcadeGame(game);
      }
    } else {
      showToast('街机模拟器模块未加载，请刷新页面重试', 'error');
    }
    return;
  }

  // SNES
  if (game.platform === 'snes') {
    if (typeof startSnesGame === 'function') {
      if (typeof handleGameLaunch === 'function') {
        handleGameLaunch(startSnesGame, game);
      } else {
        startSnesGame(game);
      }
    } else {
      showToast('SNES 模拟器模块未加载', 'error');
    }
    return;
  }

  // PS1
  if (game.platform === 'ps1') {
    if (typeof startPs1Game === 'function') {
      if (typeof handleGameLaunch === 'function') {
        handleGameLaunch(startPs1Game, game);
      } else {
        startPs1Game(game);
      }
    } else {
      showToast('PS1 模拟器模块未加载', 'error');
    }
    return;
  }

  // MD
  if (game.platform === 'md') {
    if (typeof startMdGame === 'function') {
      if (typeof handleGameLaunch === 'function') {
        handleGameLaunch(startMdGame, game);
      } else {
        startMdGame(game);
      }
    } else {
      showToast('MD 模拟器模块未加载', 'error');
    }
    return;
  }

  // GBA
  if (game.platform === 'gba') {
    if (typeof startGbaGame === 'function') {
      if (typeof handleGameLaunch === 'function') {
        handleGameLaunch(startGbaGame, game);
      } else {
        startGbaGame(game);
      }
    } else {
      showToast('GBA 模拟器模块未加载', 'error');
    }
    return;
  }

  // NES
  if (game.platform === 'nes') {
    if (typeof startNesGame === 'function') {
      if (typeof handleGameLaunch === 'function') {
        handleGameLaunch(startNesGame, game);
      } else {
        startNesGame(game);
      }
    } else {
      showToast('NES 模拟器模块未加载', 'error');
    }
    return;
  }

  // 其他平台（使用内置模拟器）
  const config = platformConfigs[game.platform];
  if (!config) {
    showToast(`暂不支持 ${game.platform} 平台的游戏`, 'warning');
    return;
  }
  if (!game.romUrl || game.romUrl === '#') {
    showToast('该游戏暂无ROM文件', 'error');
    return;
  }

  if (typeof handleGameLaunch === 'function') {
    handleGameLaunch((g) => {
      initAudio();
      showGamePlayer(g, config);
    }, game);
  } else {
    initAudio();
    showGamePlayer(game, config);
  }
}