// ========================================
// 主入口文件 - C网站集成版
// ========================================

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM 加载完成，初始化应用...');
  
  // 注册数据加载完成后的渲染回调
  onDataLoaded(() => {
    console.log('数据加载完成，开始渲染...');
    initRender();
  });
  
  // 加载游戏数据（异步）
  loadGamesData();
  
  // 初始化其他功能（不依赖游戏数据）
  initSearch();
  initControllerMapping();
  initCacheManager();
  calculateStorageUsage();
  initMobileMenu();
  initModalEvents();
  initLoadMoreButton();
  
  // B网站认证模块初始化（在auth.js中自动执行）
  // initEventListeners 和 checkAuthStatus 已在 auth.js 中调用
});

// 初始化移动端菜单
function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobile-menu-button');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function() {
      const mobileMenu = document.getElementById('mobile-menu');
      mobileMenu.classList.toggle('hidden');
    });
  }
}

// 初始化模态框关闭事件
function initModalEvents() {
  // 关闭游戏详情模态框
  const closeGameModalBtn = document.getElementById('close-game-modal');
  if (closeGameModalBtn) {
    closeGameModalBtn.addEventListener('click', function() {
      document.getElementById('game-modal').classList.add('hidden');
    });
  }
  
  // 关闭控制器设置模态框
  const closeControllerModalBtn = document.getElementById('close-controller-modal');
  if (closeControllerModalBtn) {
    closeControllerModalBtn.addEventListener('click', function() {
      document.getElementById('controller-modal').classList.add('hidden');
    });
  }
  
  const cancelControllerBtn = document.getElementById('cancel-controller');
  if (cancelControllerBtn) {
    cancelControllerBtn.addEventListener('click', function() {
      document.getElementById('controller-modal').classList.add('hidden');
    });
  }
  
  const applyControllerBtn = document.getElementById('apply-controller');
  if (applyControllerBtn) {
    applyControllerBtn.addEventListener('click', function() {
      document.getElementById('controller-modal').classList.add('hidden');
    });
  }
}

// 初始化加载更多按钮
function initLoadMoreButton() {
  const loadMoreBtn = document.getElementById('load-more-games');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreGames);
  }
}