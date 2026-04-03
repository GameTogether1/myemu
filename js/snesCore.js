// ========================================
// SNES 模拟器核心模块（动态创建模块脚本）
// 核心文件位置：js/core/snes9x_libretro.js 和 .wasm
// ========================================

let snesCoreLoaded = false;
let snesCorePromise = null;
let Snes9xClass = null;

function loadSnesCore() {
  if (snesCoreLoaded) return Promise.resolve();
  if (snesCorePromise) return snesCorePromise;

  snesCorePromise = new Promise((resolve, reject) => {
    // 创建一个模块脚本元素
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import * as module from '/js/core/snes9x_libretro.js';
      // 将模块导出挂载到 window 上
      window.__snesModule = module;
      // 尝试找到模拟器类
      const possibleNames = ['Snes9x', 'Snes9xModule', 'Libretro', 'default'];
      for (const name of possibleNames) {
        if (module[name] && typeof module[name] === 'function') {
          window.__Snes9xClass = module[name];
          break;
        }
      }
      if (!window.__Snes9xClass && typeof module.default === 'function') {
        window.__Snes9xClass = module.default;
      }
      // 触发加载完成事件
      window.dispatchEvent(new Event('snescoreloaded'));
    `;
    script.onerror = () => reject(new Error('加载核心模块脚本失败'));
    document.head.appendChild(script);

    // 等待全局事件触发
    const onLoaded = () => {
      if (window.__Snes9xClass) {
        Snes9xClass = window.__Snes9xClass;
        snesCoreLoaded = true;
        resolve();
      } else {
        reject(new Error('未找到模拟器类'));
      }
      window.removeEventListener('snescoreloaded', onLoaded);
    };
    window.addEventListener('snescoreloaded', onLoaded);

    // 超时处理
    setTimeout(() => {
      if (!snesCoreLoaded) {
        reject(new Error('SNES 核心加载超时，未找到模拟器类'));
        window.removeEventListener('snescoreloaded', onLoaded);
      }
    }, 10000);
  });
  return snesCorePromise;
}

async function initSNES(game, config, canvas, statusDiv) {
  await loadSnesCore();

  if (statusDiv) statusDiv.textContent = '创建 SNES 模拟器实例...';
  const snes = new Snes9xClass();
  snes.setCanvas(canvas);

  if (statusDiv) statusDiv.textContent = '下载 ROM...';
  const romResponse = await fetch(game.romUrl);
  if (!romResponse.ok) throw new Error(`HTTP ${romResponse.status}`);
  const romArray = new Uint8Array(await romResponse.arrayBuffer());
  snes.loadROM(romArray);

  if (statusDiv) statusDiv.textContent = '启动游戏...';
  function frame() {
    if (!snes) return;
    if (!window.isPaused) {
      try { snes.frame(); } catch (e) { console.warn(e); }
    }
    requestAnimationFrame(frame);
  }
  frame();

  snes.reset = () => snes.reset();
  snes.stop = () => { snes = null; };
  snes.pause = () => { window.isPaused = true; };
  snes.resume = () => { window.isPaused = false; };
  snes.saveState = () => snes.saveState();
  snes.loadState = (state) => snes.loadState(state);

  const keyMap = {
    'KeyX': 'a', 'KeyZ': 'b', 'KeyA': 'y', 'KeyS': 'x',
    'Enter': 'start', 'ShiftLeft': 'select',
    'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right'
  };
  const buttonState = {
    a: false, b: false, x: false, y: false,
    start: false, select: false,
    up: false, down: false, left: false, right: false
  };
  const handleKey = (e, pressed) => {
    const btn = keyMap[e.code];
    if (btn && snes.setButton) {
      e.preventDefault();
      if (buttonState[btn] !== pressed) {
        buttonState[btn] = pressed;
        snes.setButton(btn, pressed);
      }
    }
  };
  window.addEventListener('keydown', (e) => handleKey(e, true));
  window.addEventListener('keyup', (e) => handleKey(e, false));

  return snes;
}