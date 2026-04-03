// ========================================
// 缓存管理模块
// ========================================

// 计算存储空间使用情况
function calculateStorageUsage() {
  let totalSize = 0;
  
  // 计算localStorage使用量
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalSize += localStorage[key].length * 2; // UTF-16编码
    }
  }
  
  // 转换为MB
  const usedMB = (totalSize / (1024 * 1024)).toFixed(1);
  const total = 5; // 假设5MB限制
  const percentage = Math.min((usedMB / total) * 100, 100);
  
  const storageUsedEl = document.getElementById('storage-used');
  const storageBarEl = document.getElementById('storage-bar');
  
  if (storageUsedEl) {
    storageUsedEl.textContent = `${usedMB} MB / ${total} MB`;
  }
  if (storageBarEl) {
    storageBarEl.style.width = `${percentage}%`;
  }
}

// 清除缓存
function clearCache() {
  const clearSaves = document.getElementById('clear-saves').checked;
  const clearCache = document.getElementById('clear-cache').checked;
  
  if (!clearSaves && !clearCache) {
    showToast('请至少选择一项要清除的内容', 'warning');
    return;
  }
  
  if (confirm('确定要清除选中的内容吗？此操作不可恢复。')) {
    if (clearSaves) {
      localStorage.removeItem('gameSaves');
    }
    
    if (clearCache) {
      // 清除其他缓存数据
      const keysToKeep = ['controllerMapping', 'favorites'];
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      clearGamesStatsCache();
    }
    
    showToast('已成功清除选中的内容', 'success');
    calculateStorageUsage();
  }
}

// 初始化缓存管理事件
function initCacheManager() {
  const clearCacheBtn = document.getElementById('clear-all-cache');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', clearCache);
  }
}