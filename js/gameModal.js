// ========================================
// 游戏详情模态框模块（简化版 - 每日游戏限制）
// ========================================

function initModalEventDelegation() {
  document.addEventListener('click', function(e) {
    const closeBtn = e.target.closest('#close-game-modal');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      closeGameModal();
      return;
    }
    const gameModal = document.getElementById('game-modal');
    if (gameModal && e.target === gameModal) closeGameModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const gameModal = document.getElementById('game-modal');
      if (gameModal && !gameModal.classList.contains('hidden')) closeGameModal();
    }
  });
}

function closeGameModal() {
  const gameModal = document.getElementById('game-modal');
  if (gameModal) gameModal.classList.add('hidden');
}

function showGameDetails(gameId) {
  // 权限检查：非会员每日只能查看一个游戏（同步调用，使用页面加载时查询的状态）
  if (typeof window.canViewGameDetail === 'function') {
    const permission = window.canViewGameDetail(gameId);
    if (!permission.allowed) {
      if (permission.requireLogin) {
        if (typeof window.openAuthModal === 'function') {
          window.openAuthModal();
        } else {
          alert('请先登录');
        }
      } else if (permission.requireMember) {
        if (typeof window.openMemberRequiredModal === 'function') {
          // 使用指定的提示消息
          window.openMemberRequiredModal('非会员每日只可使用一个游戏资源,开通会员享受全站终身无限畅享');
        } else {
          alert('非会员每日只可使用一个游戏资源,开通会员享受全站终身无限畅享');
        }
      } else {
        alert(permission.message);
      }
      return;
    }
  }

  const gamesData = getGamesData();
  if (!gamesData || !gamesData.games) return;

  const rawGame = gamesData.games.find(g => g.id === gameId);
  if (!rawGame) return;

  const gameStats = getGamesWithStats().find(g => g.id === gameId);
  window.currentGame = gameStats || rawGame;

  const platform = gamesData.platforms?.find(p => p.id === window.currentGame.platform);
  const platformColors = {
    'nes': '#E63946', 'arcade': '#FB8500', 'snes': '#9D4EDD', 'gba': '#43AA8B',
    'gbc': '#43AA8B', 'md': '#48CAE4', '32x': '#FF006E', 'ps1': '#6C757D', 'pbp': '#6C757D'
  };
  const bgColor = platformColors[window.currentGame.platform] || '#6C757D';
  const modalContent = document.getElementById('game-modal-content');
  if (!modalContent) return;

  const detailImage = window.currentGame.detailUrl || window.currentGame.coverUrl;

  modalContent.innerHTML = `
    <div class="flex flex-col md:flex-row">
      <div class="md:w-1/3 mb-6 md:mb-0 md:mr-6">
        <img src="${detailImage}" alt="${window.currentGame.title}" class="w-full rounded-lg shadow-lg" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
      </div>
      <div class="md:w-2/3">
        <div class="flex items-center mb-2">
          <h2 class="text-2xl font-bold mr-3">${window.currentGame.title}</h2>
          <span class="text-white text-xs font-bold py-1 px-2 rounded" style="background-color: ${bgColor}">${platform ? platform.name : window.currentGame.platform}</span>
        </div>
        <div class="flex flex-wrap gap-2 mb-4">
          <span class="bg-gray-800 text-textSecondary text-xs py-1 px-2 rounded">${window.currentGame.year}</span>
          <span class="bg-gray-800 text-textSecondary text-xs py-1 px-2 rounded">${window.currentGame.type}</span>
          <span class="bg-gray-800 text-textSecondary text-xs py-1 px-2 rounded flex items-center"><i class="fa fa-gamepad mr-1"></i> ${window.currentGame.playCount || 0}</span>
          <span class="bg-gray-800 text-textSecondary text-xs py-1 px-2 rounded flex items-center"><i class="fa fa-heart mr-1"></i> ${window.currentGame.favoriteCount || 0}</span>
        </div>
        <p class="text-textSecondary mb-6">${window.currentGame.description}</p>
        <div class="flex flex-wrap gap-3">
          <button id="play-game-btn" class="bg-secondary hover:bg-purple-700 text-white font-bold py-2 px-6 rounded transition-colors flex items-center"><i class="fa fa-play mr-2"></i> 开始游戏</button>
          <button id="add-to-favorites" class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center"><i class="fa fa-heart mr-2"></i> 收藏</button>
        </div>
      </div>
    </div>
    <div class="mt-8">
      <h3 class="text-xl font-bold mb-4">相关游戏</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">${getRelatedGames(window.currentGame)}</div>
    </div>
  `;

  const gameModal = document.getElementById('game-modal');
  if (gameModal) gameModal.classList.remove('hidden');

  setTimeout(() => {
    const playBtn = document.getElementById('play-game-btn');
    const favBtn = document.getElementById('add-to-favorites');
    if (playBtn) playBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); startGame(window.currentGame); };
    if (favBtn) favBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(window.currentGame); };
    document.querySelectorAll('#game-modal .related-game').forEach(card => {
      card.onclick = () => showGameDetails(card.dataset.gameId);
    });
  }, 0);
}