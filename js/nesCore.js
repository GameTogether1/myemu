// ========================================
// NES 模拟器核心模块
// 依赖: state.js, utils.js
// ========================================

// 加载脚本
async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('加载失败: ' + src));
    document.head.appendChild(script);
  });
}

// 获取 ROM 二进制数据
async function fetchROM(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return binary;
}

// 渲染 NES 画面
function renderFrame(canvas, frameBuffer, width, height) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  for (let i = 0; i < frameBuffer.length; i++) {
    const pixel = frameBuffer[i];
    data[i * 4] = pixel & 0xFF;
    data[i * 4 + 1] = (pixel >> 8) & 0xFF;
    data[i * 4 + 2] = (pixel >> 16) & 0xFF;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

// 设置 NES 键盘控制
function setupNESControls(nes) {
  if (window._nesKeydownHandler) {
    document.removeEventListener('keydown', window._nesKeydownHandler);
  }
  if (window._nesKeyupHandler) {
    document.removeEventListener('keyup', window._nesKeyupHandler);
  }

  const keydownHandler = (e) => {
    if (!window.currentEmulator || window.currentCore !== 'nes') return;
    const keyMap = {
      'KeyZ': jsnes.Controller.BUTTON_B,
      'KeyX': jsnes.Controller.BUTTON_A,
      'Enter': jsnes.Controller.BUTTON_START,
      'ShiftLeft': jsnes.Controller.BUTTON_SELECT,
      'ShiftRight': jsnes.Controller.BUTTON_SELECT,
      'ArrowUp': jsnes.Controller.BUTTON_UP,
      'ArrowDown': jsnes.Controller.BUTTON_DOWN,
      'ArrowLeft': jsnes.Controller.BUTTON_LEFT,
      'ArrowRight': jsnes.Controller.BUTTON_RIGHT
    };
    if (keyMap[e.code] !== undefined) {
      e.preventDefault();
      nes.buttonDown(1, keyMap[e.code]);
    }
  };

  const keyupHandler = (e) => {
    if (!window.currentEmulator || window.currentCore !== 'nes') return;
    const keyMap = {
      'KeyZ': jsnes.Controller.BUTTON_B,
      'KeyX': jsnes.Controller.BUTTON_A,
      'Enter': jsnes.Controller.BUTTON_START,
      'ShiftLeft': jsnes.Controller.BUTTON_SELECT,
      'ShiftRight': jsnes.Controller.BUTTON_SELECT,
      'ArrowUp': jsnes.Controller.BUTTON_UP,
      'ArrowDown': jsnes.Controller.BUTTON_DOWN,
      'ArrowLeft': jsnes.Controller.BUTTON_LEFT,
      'ArrowRight': jsnes.Controller.BUTTON_RIGHT
    };
    if (keyMap[e.code] !== undefined) {
      e.preventDefault();
      nes.buttonUp(1, keyMap[e.code]);
    }
  };

  window._nesKeydownHandler = keydownHandler;
  window._nesKeyupHandler = keyupHandler;
  document.addEventListener('keydown', keydownHandler);
  document.addEventListener('keyup', keyupHandler);
}

// 游戏循环
function startLoop(callback) {
  let lastTime = 0;
  const frameInterval = 1000 / 60;

  const loop = (currentTime) => {
    if (!window.currentEmulator) return;
    if (window.isPaused) {
      window.animationId = requestAnimationFrame(loop);
      return;
    }
    const deltaTime = currentTime - lastTime;
    const adjustedInterval = frameInterval / (window.gameSpeedMultiplier || 1.0);
    if (deltaTime >= adjustedInterval) {
      lastTime = currentTime - (deltaTime % adjustedInterval);
      callback();
    }
    window.animationId = requestAnimationFrame(loop);
  };

  window.animationId = requestAnimationFrame(loop);
}

// 初始化 NES 模拟器
async function initNES(game, canvas, statusDiv) {
  if (statusDiv) statusDiv.textContent = '加载模拟器核心...';
  if (typeof jsnes === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/jsnes@1.1.0/dist/jsnes.min.js');
  }
  if (statusDiv) statusDiv.textContent = '下载ROM...';
  const romData = await fetchROM(game.romUrl);
  if (statusDiv) statusDiv.textContent = '启动游戏...';

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();
  const bufferSize = 4096;
  let scriptNode = audioCtx.createScriptProcessor
    ? audioCtx.createScriptProcessor(bufferSize, 0, 2)
    : audioCtx.createJavaScriptNode(bufferSize, 0, 2);

  const audioBufferL = [];
  const audioBufferR = [];

  window._nesScriptNode = scriptNode;
  window._nesAudioBufferL = audioBufferL;
  window._nesAudioBufferR = audioBufferR;

  scriptNode.onaudioprocess = function(e) {
    const outputL = e.outputBuffer.getChannelData(0);
    const outputR = e.outputBuffer.getChannelData(1);
    const volume = window.gameVolume || 1.0;
    for (let i = 0; i < bufferSize; i++) {
      outputL[i] = (audioBufferL.shift() || 0) * volume;
      outputR[i] = (audioBufferR.shift() || 0) * volume;
    }
  };
  scriptNode.connect(audioCtx.destination);

  const nes = new jsnes.NES({
    onFrame: (frameBuffer) => renderFrame(canvas, frameBuffer, 256, 240),
    onAudioSample: (left, right) => {
      audioBufferL.push(left);
      audioBufferR.push(right);
      if (audioBufferL.length > 44100) {
        audioBufferL.splice(0, audioBufferL.length - 44100);
        audioBufferR.splice(0, audioBufferR.length - 44100);
      }
    }
  });

  nes.loadROM(romData);
  window.currentEmulator = nes;
  window.currentCore = 'nes';
  setupNESControls(nes);
  startLoop(() => nes.frame());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (audioCtx.state === 'running') audioCtx.suspend();
    } else {
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }
  });
}

// 统一模拟器初始化入口
async function initEmulator(game, config) {
  const canvas = document.getElementById('game-canvas');
  const loadingDiv = document.getElementById('game-loading');
  const statusDiv = document.getElementById('loading-status');

  try {
    canvas.width = config.width;
    canvas.height = config.height;

    if (config.core === 'jsnes') {
      await initNES(game, canvas, statusDiv);
    } else {
      throw new Error('不支持的模拟器核心: ' + config.core);
    }

    loadingDiv.classList.add('hidden');
    showToast('游戏启动成功！按任意键开始', 'success');
  } catch (error) {
    console.error('启动失败:', error);
    if (statusDiv) statusDiv.textContent = '错误: ' + error.message;
    if (loadingDiv) {
      loadingDiv.innerHTML = `
        <div class="text-center p-4">
          <i class="fa fa-exclamation-triangle text-4xl text-nes mb-4"></i>
          <p class="text-xl font-bold text-nes">游戏加载失败</p>
          <p class="text-textSecondary mt-2">${error.message}</p>
          <button onclick="document.getElementById('game-player-modal').remove()" class="mt-4 bg-secondary hover:bg-purple-700 text-white py-2 px-4 rounded">关闭</button>
        </div>
      `;
    }
  }
}