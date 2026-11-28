// ========================================
// 主入口文件
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  onDataLoaded(() => {
    initRender();
  });

  loadGamesData();
  initSearch();
  initMobileMenu();
  initHelpModal();
  initLoadMoreButton();
});

function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobile-menu-button');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      document.getElementById('mobile-menu')?.classList.toggle('hidden');
    });
  }
}

function initHelpModal() {
  const modal = document.getElementById('help-modal');
  if (!modal) return;

  const openHelp = () => {
    modal.classList.remove('hidden');
    document.getElementById('mobile-menu')?.classList.add('hidden');
  };
  const closeHelp = () => modal.classList.add('hidden');

  document.getElementById('open-help-btn')?.addEventListener('click', openHelp);
  document.getElementById('mobile-open-help-btn')?.addEventListener('click', openHelp);
  document.getElementById('close-help-modal')?.addEventListener('click', closeHelp);
  document.getElementById('help-backdrop')?.addEventListener('click', closeHelp);

  document.getElementById('clear-emu-cache-btn')?.addEventListener('click', clearEmulatorIndexedDB);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeHelp();
    }
  });
}

// 安全清理 EmulatorJS 的 IndexedDB 缓存（绝不误删 Supabase 登录态与收藏）
async function clearEmulatorIndexedDB() {
  if (!confirm('确定要清理模拟器本地缓存吗？（不会退出账号登录，也不会清除收藏）')) return;

  try {
    let deletedCount = 0;
    if (window.indexedDB && typeof window.indexedDB.databases === 'function') {
      const dbs = await window.indexedDB.databases();
      await Promise.all(
        dbs
          .filter(db => db.name && /ejs|emulator|retroarch|rom/i.test(db.name))
          .map(db => new Promise((resolve) => {
            const req = window.indexedDB.deleteDatabase(db.name);
            req.onsuccess = () => { deletedCount++; resolve(); };
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          }))
      );
    }
    if (typeof clearGamesStatsCache === 'function') clearGamesStatsCache();
    showToast(deletedCount > 0 ? `已清理 ${deletedCount} 个模拟器缓存库` : '当前没有需要清理的模拟器缓存', 'success');
  } catch (err) {
    console.error('清理缓存失败:', err);
    showToast('清理缓存失败，请稍后重试', 'error');
  }
}

function initLoadMoreButton() {
  document.getElementById('load-more-games')?.addEventListener('click', loadMoreGames);
}
