// ========================================
// 数据管理模块
// ========================================

let gamesData = null;
let currentPage = 1;
const gamesPerPage = 8;
let dataLoadedCallbacks = [];

// 加载游戏数据 - 禁用缓存版本
function loadGamesData() {
  showLoading('加载游戏数据...');
  
  console.log('强制从网络加载 games.json...');
  
  // 添加时间戳防止浏览器缓存
  const url = 'data/games.json?v=' + Date.now();
  
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log('从网络加载游戏数据:', data);
      
      // 检查数据有效性
      if (!data || !data.games || !Array.isArray(data.games)) {
        throw new Error('游戏数据格式无效');
      }
      
      // 打印每个游戏的ROM链接，便于调试
      data.games.forEach(game => {
        console.log(`游戏: ${game.title}, ID: ${game.id}, 平台: ${game.platform}, ROM: ${game.romUrl}`);
      });
      
      gamesData = data;
      
      // 清除旧缓存（如果有的话）
      localStorage.removeItem('gamesDataCache');
      localStorage.removeItem('gamesDataCacheTime');
      
      hideLoading();
      executeDataLoadedCallbacks();
    })
    .catch(error => {
      console.error('加载游戏数据失败:', error);
      hideLoading();
      showToast('加载游戏数据失败: ' + error.message, 'error');
    });
}

// 执行数据加载完成后的回调
function executeDataLoadedCallbacks() {
  dataLoadedCallbacks.forEach(callback => {
    try {
      callback();
    } catch (e) {
      console.error('执行回调失败:', e);
    }
  });
  dataLoadedCallbacks = [];
}

// 注册数据加载完成回调
function onDataLoaded(callback) {
  if (gamesData) {
    // 数据已加载，直接执行
    callback();
  } else {
    // 数据未加载，加入等待队列
    dataLoadedCallbacks.push(callback);
  }
}

// 获取带统计信息的游戏列表
function getGamesWithStats() {
  if (!gamesData || !gamesData.games) {
    console.log('gamesData 未就绪:', gamesData);
    return [];
  }
  
  if (!window._gamesWithStatsCache) {
    window._gamesWithStatsCache = new Map();
  }
  
  const cacheKey = gamesData.games.length;
  if (window._gamesWithStatsCache.has(cacheKey)) {
    return window._gamesWithStatsCache.get(cacheKey);
  }
  
  const result = gamesData.games.map(game => ({
    ...game,
    playCount: game.playCount || Math.floor(Math.random() * 9000) + 1000,
    favoriteCount: game.favoriteCount || Math.floor(Math.random() * 9000) + 1000
  }));
  
  window._gamesWithStatsCache.set(cacheKey, result);
  return result;
}

// 清空游戏统计缓存
function clearGamesStatsCache() {
  window._gamesWithStatsCache = null;
}

// 获取游戏数据
function getGamesData() {
  return gamesData;
}

// 获取当前页码
function getCurrentPage() {
  return currentPage;
}

// 设置当前页码
function setCurrentPage(page) {
  currentPage = page;
}

// 获取每页游戏数
function getGamesPerPage() {
  return gamesPerPage;
}