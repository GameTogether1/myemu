// ========================================
// 统一模拟器引擎模块 (EmulatorJS)
// 合并原 6 个平台独立文件：NES / SNES / GBA / MD / PS1 / Arcade
// 保留各平台专属适配：街机双核心切换、MD 独占键盘与焦点修复、完整资源清理
// ========================================

const EJS_COMMON = {
  pathToData: 'https://cdn.emulatorjs.org/stable/data/',
  loaderUrl: 'https://cdn.emulatorjs.org/stable/data/loader.js',
  language: 'zh-CN',
  defaultVolume: 0.8,
  timeoutMs: 20000
};

const PLATFORM_EMULATOR_CONFIG = {
  nes: {
    label: 'NES',
    titleText: '红白机 (NES)',
    badgeClass: 'bg-nes',
    borderClass: 'border-nes',
    iconClass: 'text-nes',
    cores: ['nestopia'],
    hint: 'Z=B  X=A  Enter=开始  Shift=选择  方向键移动'
  },
  snes: {
    label: 'SNES',
    titleText: '超级任天堂 (SNES)',
    badgeClass: 'bg-snes',
    borderClass: 'border-snes',
    iconClass: 'text-snes',
    cores: ['snes'],
    hint: 'Z=B  X=A  A=Y  S=X  Q=L  W=R  Enter=开始  Shift=选择'
  },
  gba: {
    label: 'GBA',
    titleText: 'Game Boy Advance (GBA)',
    badgeClass: 'bg-gba',
    borderClass: 'border-gba',
    iconClass: 'text-gba',
    cores: ['mgba'],
    hint: 'Z=B  X=A  A=L  S=R  Enter=开始  Shift=选择  方向键移动'
  },
  md: {
    label: 'MD',
    titleText: '世嘉 Mega Drive (MD)',
    badgeClass: 'bg-md',
    borderClass: 'border-md',
    iconClass: 'text-md',
    cores: ['genesis_plus_gx'],
    exclusiveKeyboard: true,
    hint: 'Z/J=B  X/K=A  C/L=C  Enter/N=开始  Shift/M=模式  方向键/WASD移动'
  },
  ps1: {
    label: 'PS1',
    titleText: 'PlayStation (PS1)',
    badgeClass: 'bg-ps1',
    borderClass: 'border-ps1',
    iconClass: 'text-ps1',
    cores: ['psx'],
    hint: '方向键移动  Z/X/A/S=功能键  Enter=开始  Shift=选择（3D游戏加载较慢请耐心等待）'
  },
  arcade: {
    label: 'ARCADE',
    titleText: '经典街机 (Arcade)',
    badgeClass: 'bg-arcade',
    borderClass: 'border-arcade',
    iconClass: 'text-arcade',
    cores: ['mame2003_plus', 'fbneo'],
    controlScheme: 'arcade',
    switchableCore: true,
    hint: 'Z=攻击  X=跳跃  C/V=特殊  Shift/5=投币  Enter/1=开始  方向键移动'
  }
};

// 运行时状态
const emuRuntime = {
  game: null,
  platform: null,
  coreIndex: 0,
  retryTimer: null,
  scriptEl: null,
  escHandler: null,
  mdKeyDown: null,
  mdKeyUp: null,
  mdFocusInterval: null,
  origGetGamepads: null
};

// MD 独占键盘映射（防止 EmulatorJS 手柄轮询冲突）
const MD_BUTTON_MAP = {
  ArrowUp: 4, ArrowDown: 5, ArrowLeft: 6, ArrowRight: 7,
  KeyW: 4, KeyS: 5, KeyA: 6, KeyD: 7,
  KeyZ: 0, KeyX: 1, KeyC: 8,
  KeyJ: 0, KeyK: 1, KeyL: 8,
  Enter: 3, KeyN: 3,
  ShiftLeft: 2, ShiftRight: 2, KeyM: 2
};

// ========== 对外入口：统一启动游戏 ==========
function startGame(game) {
  if (!game) return;
  if (typeof closeGameModal === 'function') closeGameModal();

  const platformKey = PLATFORM_EMULATOR_CONFIG[game.platform] ? game.platform : null;
  if (!platformKey) {
    showToast(`暂不支持 ${game.platform || '未知'} 平台的游戏`, 'warning');
    return;
  }
  if (!game.romUrl || game.romUrl === '#') {
    showToast('该游戏暂无ROM文件', 'error');
    return;
  }

  const launch = (g) => openUnifiedPlayer(g, platformKey);
  if (typeof handleGameLaunch === 'function') {
    handleGameLaunch(launch, game);
  } else {
    launch(game);
  }
}

// ========== 创建统一播放器弹窗 ==========
function openUnifiedPlayer(game, platformKey) {
  cleanupUnifiedEmulator();

  const cfg = PLATFORM_EMULATOR_CONFIG[platformKey];
  emuRuntime.game = game;
  emuRuntime.platform = platformKey;
  emuRuntime.coreIndex = 0;

  const existing = document.getElementById('game-player-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'game-player-modal';
  modal.className = 'fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-2 md:p-4';

  const switchCoreHtml = cfg.switchableCore
    ? `<span class="text-xs text-gray-400 mr-2 hidden md:inline">未启动可切换核心 👉</span>
       <button id="emu-switch-core" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg transition-colors text-sm" title="切换核心 (${cfg.cores.join(' ↔ ')})">
         <i class="fa fa-exchange"></i>
       </button>`
    : '';

  modal.innerHTML = `
    <div id="emu-player-container" class="bg-background rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-white/15">
      <div class="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-gray-900/95 gap-3">
        <div class="flex items-center min-w-0 flex-1 gap-2.5">
          <i class="fa fa-gamepad ${cfg.iconClass} text-xl shrink-0"></i>
          <h2 class="text-lg md:text-xl font-bold truncate text-white">${escapeHtml(game.title)}</h2>
          <span id="emu-core-badge" class="text-xs ${cfg.badgeClass} px-2 py-0.5 rounded font-bold text-white shrink-0">${cfg.label}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${switchCoreHtml}
          <button id="emu-fullscreen" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg transition-colors text-sm" title="全屏">
            <i class="fa fa-expand"></i>
          </button>
          <button id="emu-close" class="bg-nes hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-colors text-sm" title="关闭">
            <i class="fa fa-times"></i>
          </button>
        </div>
      </div>

      <div id="emu-stage-wrapper" class="flex-1 bg-black relative flex items-center justify-center overflow-hidden" style="min-height: 460px;">
        <div id="emu-loading" class="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 px-4 text-center">
          <div class="inline-block animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 ${cfg.borderClass} mb-4"></div>
          <p class="text-lg font-bold text-white">正在加载 ${cfg.titleText}...</p>
          <p class="text-gray-300 text-sm mt-1">${escapeHtml(game.title)}</p>
          <p id="emu-loading-status" class="text-gray-400 text-xs mt-2">初始化模拟器核心...</p>
        </div>

        <div id="emu-error" class="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 hidden px-4 text-center">
          <i class="fa fa-exclamation-triangle text-4xl text-nes mb-3"></i>
          <p class="text-lg font-bold text-nes">游戏加载失败</p>
          <p id="emu-error-message" class="text-gray-300 text-sm mt-2 max-w-md"></p>
          <div class="mt-5 flex gap-3">
            <button id="emu-retry" class="bg-secondary hover:bg-purple-700 text-white py-2 px-5 rounded-lg text-sm font-medium transition">
              <i class="fa fa-refresh mr-1.5"></i>重试
            </button>
            <button id="emu-close-error" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-5 rounded-lg text-sm transition">
              关闭
            </button>
          </div>
        </div>

        <div id="emulatorjs-stage" class="w-full h-full"></div>
      </div>

      <div class="px-4 py-2.5 border-t border-white/10 bg-gray-900/95 flex flex-wrap justify-between items-center gap-2 text-xs text-gray-400">
        <span><i class="fa fa-keyboard-o mr-1.5 text-neon-blue"></i>${cfg.hint}</span>
        <span>按 ESC 退出游戏</span>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('emu-close')?.addEventListener('click', closeUnifiedPlayer);
  document.getElementById('emu-close-error')?.addEventListener('click', closeUnifiedPlayer);
  document.getElementById('emu-fullscreen')?.addEventListener('click', toggleUnifiedFullscreen);
  document.getElementById('emu-retry')?.addEventListener('click', retryUnifiedGame);
  document.getElementById('emu-switch-core')?.addEventListener('click', switchUnifiedCore);

  emuRuntime.escHandler = (e) => {
    if (e.key === 'Escape' && !document.fullscreenElement) {
      closeUnifiedPlayer();
    }
  };
  document.addEventListener('keydown', emuRuntime.escHandler);

  bootEmulatorCore();
}

// ========== 启动指定核心 ==========
function bootEmulatorCore() {
  const game = emuRuntime.game;
  const cfg = PLATFORM_EMULATOR_CONFIG[emuRuntime.platform];
  if (!game || !cfg) return;

  const core = cfg.cores[emuRuntime.coreIndex] || cfg.cores[0];
  const loadingDiv = document.getElementById('emu-loading');
  const errorDiv = document.getElementById('emu-error');
  const statusDiv = document.getElementById('emu-loading-status');
  const stage = document.getElementById('emulatorjs-stage');

  if (loadingDiv) loadingDiv.classList.remove('hidden');
  if (errorDiv) errorDiv.classList.add('hidden');
  if (statusDiv) statusDiv.textContent = `正在加载核心 (${core})...`;
  if (stage) stage.innerHTML = '';

  // 设置 EmulatorJS 全局参数
  window.EJS_player = '#emulatorjs-stage';
  window.EJS_core = core;
  window.EJS_gameUrl = game.romUrl;
  window.EJS_gameName = game.id;
  window.EJS_gameID = `${emuRuntime.platform}_${game.id}_${Date.now()}`;
  window.EJS_pathtodata = EJS_COMMON.pathToData;
  window.EJS_startOnLoaded = true;
  window.EJS_language = EJS_COMMON.language;
  window.EJS_volume = EJS_COMMON.defaultVolume;

  if (cfg.controlScheme) {
    window.EJS_controlScheme = cfg.controlScheme;
  } else {
    delete window.EJS_controlScheme;
  }

  if (cfg.exclusiveKeyboard) {
    window.EJS_gamepad = false;
    window.EJS_virtualGamepad = false;
    window.EJS_directKeyboardInput = true;
    window.EJS_defaultControls = false;
  } else {
    delete window.EJS_gamepad;
    delete window.EJS_virtualGamepad;
    delete window.EJS_directKeyboardInput;
    delete window.EJS_defaultControls;
  }

  window.EJS_onGameStart = () => {
    if (emuRuntime.retryTimer) {
      clearTimeout(emuRuntime.retryTimer);
      emuRuntime.retryTimer = null;
    }
    if (loadingDiv) loadingDiv.classList.add('hidden');
    if (cfg.exclusiveKeyboard) {
      setTimeout(setupMdExclusiveKeyboard, 1800);
    }
    showToast('游戏启动成功！', 'success');
  };

  window.EJS_onError = (error) => {
    let msg = '模拟器加载失败';
    if (typeof error === 'string') msg = error;
    else if (error && error.message) msg = error.message;
    if (msg.includes('404')) msg = 'ROM 文件不存在或路径无效';
    showUnifiedError(msg);
  };

  if (emuRuntime.retryTimer) clearTimeout(emuRuntime.retryTimer);
  emuRuntime.retryTimer = setTimeout(() => {
    const tip = cfg.switchableCore
      ? '游戏加载超时，可点击右上角切换核心按钮重试'
      : '游戏加载超时，请检查网络或点击重试';
    showUnifiedError(tip);
  }, EJS_COMMON.timeoutMs);

  loadEjsLoaderScript()
    .then(() => {
      if (statusDiv) statusDiv.textContent = '正在下载 ROM 数据...';
    })
    .catch((err) => {
      showUnifiedError('加载模拟器引擎失败：' + err.message);
    });
}

function loadEjsLoaderScript() {
  return new Promise((resolve, reject) => {
    if (emuRuntime.scriptEl) {
      emuRuntime.scriptEl.remove();
      emuRuntime.scriptEl = null;
    }
    const script = document.createElement('script');
    script.src = `${EJS_COMMON.loaderUrl}?t=${Date.now()}`;
    script.async = true;
    const timeout = setTimeout(() => reject(new Error('加载引擎超时')), 25000);
    script.onload = () => {
      clearTimeout(timeout);
      emuRuntime.scriptEl = script;
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('无法连接到模拟器 CDN，请检查网络'));
    };
    document.head.appendChild(script);
  });
}

// ========== MD 专属键盘输入修复 ==========
function setupMdExclusiveKeyboard() {
  cleanupMdKeyboard();

  const sendInput = (btnIdx, pressed) => {
    if (!window.EJS_emulator?.gameManager) return false;
    try {
      window.EJS_emulator.gameManager.simulateInput(0, btnIdx, pressed ? 1 : 0);
      return true;
    } catch {
      return false;
    }
  };

  const handleKey = (e, isDown) => {
    if (!(e.code in MD_BUTTON_MAP)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (sendInput(MD_BUTTON_MAP[e.code], isDown)) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  };

  emuRuntime.mdKeyDown = (e) => handleKey(e, true);
  emuRuntime.mdKeyUp = (e) => handleKey(e, false);
  document.addEventListener('keydown', emuRuntime.mdKeyDown, true);
  document.addEventListener('keyup', emuRuntime.mdKeyUp, true);

  if (navigator.getGamepads && !emuRuntime.origGetGamepads) {
    emuRuntime.origGetGamepads = navigator.getGamepads;
    navigator.getGamepads = () => [];
  }

  emuRuntime.mdFocusInterval = setInterval(() => {
    const canvas = document.querySelector('#emulatorjs-stage canvas');
    if (canvas) canvas.focus();
  }, 600);
}

function cleanupMdKeyboard() {
  if (emuRuntime.mdKeyDown) {
    document.removeEventListener('keydown', emuRuntime.mdKeyDown, true);
    emuRuntime.mdKeyDown = null;
  }
  if (emuRuntime.mdKeyUp) {
    document.removeEventListener('keyup', emuRuntime.mdKeyUp, true);
    emuRuntime.mdKeyUp = null;
  }
  if (emuRuntime.mdFocusInterval) {
    clearInterval(emuRuntime.mdFocusInterval);
    emuRuntime.mdFocusInterval = null;
  }
  if (emuRuntime.origGetGamepads) {
    navigator.getGamepads = emuRuntime.origGetGamepads;
    emuRuntime.origGetGamepads = null;
  }
}

// ========== 切换核心 / 重试 / 全屏 / 关闭与彻底清理 ==========
function switchUnifiedCore() {
  const cfg = PLATFORM_EMULATOR_CONFIG[emuRuntime.platform];
  if (!cfg || !cfg.switchableCore || cfg.cores.length < 2) return;

  emuRuntime.coreIndex = (emuRuntime.coreIndex + 1) % cfg.cores.length;
  const nextCore = cfg.cores[emuRuntime.coreIndex];
  showToast(`已切换至 ${nextCore} 核心，正在重新启动...`, 'info');
  teardownEjsInstance();
  bootEmulatorCore();
}

function retryUnifiedGame() {
  teardownEjsInstance();
  bootEmulatorCore();
}

function showUnifiedError(message) {
  const loadingDiv = document.getElementById('emu-loading');
  const errorDiv = document.getElementById('emu-error');
  const errorMsg = document.getElementById('emu-error-message');
  if (loadingDiv) loadingDiv.classList.add('hidden');
  if (errorDiv) errorDiv.classList.remove('hidden');
  if (errorMsg) errorMsg.textContent = message;
}

function toggleUnifiedFullscreen() {
  const container = document.getElementById('emu-player-container');
  if (!container) return;
  if (!document.fullscreenElement) {
    container.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function teardownEjsInstance() {
  if (emuRuntime.retryTimer) {
    clearTimeout(emuRuntime.retryTimer);
    emuRuntime.retryTimer = null;
  }
  cleanupMdKeyboard();

  try {
    if (window.EJS_emulator) {
      window.EJS_emulator.setVolume?.(0);
      window.EJS_emulator.pause?.();
      window.EJS_emulator.exit?.();
      window.EJS_emulator = null;
    }
    if (window.EJS_audioContext) {
      window.EJS_audioContext.close?.().catch(() => {});
      window.EJS_audioContext = null;
    }
  } catch {}

  if (emuRuntime.scriptEl) {
    emuRuntime.scriptEl.remove();
    emuRuntime.scriptEl = null;
  }

  const stage = document.getElementById('emulatorjs-stage');
  if (stage) stage.innerHTML = '';
}

function cleanupUnifiedEmulator() {
  teardownEjsInstance();
  if (emuRuntime.escHandler) {
    document.removeEventListener('keydown', emuRuntime.escHandler);
    emuRuntime.escHandler = null;
  }
}

function closeUnifiedPlayer() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
  cleanupUnifiedEmulator();
  document.getElementById('game-player-modal')?.remove();
  emuRuntime.game = null;
  emuRuntime.platform = null;
}
