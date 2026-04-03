// ========================================
// 渲染模块入口（精简版）
// ========================================

// 平台配置（NES 和街机及其他平台的核心标识）
const platformConfigs = {
  'nes': {
    name: 'NES',
    core: 'jsnes',
    width: 256,
    height: 240,
    libUrl: 'https://cdn.jsdelivr.net/npm/jsnes@1.1.0/dist/jsnes.min.js'
  },
  'snes': {
    name: 'SNES',
    core: 'snes',
    width: 256,
    height: 224
  },
  'gba': {
    name: 'GBA',
    core: 'gba',
    width: 240,
    height: 160
  },
  'gbc': {
    name: 'GBC',
    core: 'gbc',
    width: 160,
    height: 144
  },
  'md': {
    name: 'Mega Drive',
    core: 'md',
    width: 320,
    height: 224
  },
  '32x': {
    name: '32X',
    core: '32x',
    width: 320,
    height: 224
  },
  'ps1': {
    name: 'PlayStation',
    core: 'ps1',
    width: 320,
    height: 240
  },
  'pbp': {
    name: 'PSP',
    core: 'pbp',
    width: 480,
    height: 272
  }
};

// 初始化渲染（由 main.js 调用）
function initRender() {
  renderPlatforms();
  renderGenres();
  renderPopularGames();
  renderFeatures();
  initModalEventDelegation();
}