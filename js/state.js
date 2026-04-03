// ========================================
// 全局状态管理
// ========================================

// 模拟器相关状态
window.currentEmulator = null;
window.currentGame = null;
window.currentCore = null;
window.audioContext = null;
window.animationId = null;

// 游戏控制状态
window.isPaused = false;
window.isMuted = false;
window.gameSpeed = 1.0;
window.currentVolume = 1.0;
window.currentFilter = 'none';

// 其他全局变量
window._gamesWithStatsCache = null;
window._menuKeyHandler = null;
window._nesKeydownHandler = null;
window._nesKeyupHandler = null;
window._platformKeyHandler = null;
window._nesScriptNode = null;
window._nesAudioBufferL = null;
window._nesAudioBufferR = null;