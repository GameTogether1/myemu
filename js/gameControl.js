// ========================================
// 游戏辅助功能模块（相关游戏推荐与收藏）
// ========================================

function getRelatedGames(currentGame) {
  const gamesWithStats = getGamesWithStats();
  const relatedGames = gamesWithStats
    .filter(game => game.id !== currentGame.id && (game.platform === currentGame.platform || game.type === currentGame.type))
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);

  if (relatedGames.length === 0) {
    return '<p class="text-textSecondary col-span-full text-center">暂无相关游戏</p>';
  }

  return relatedGames.map(game => `
    <div class="related-game bg-gray-800/90 hover:bg-gray-700/90 rounded-lg overflow-hidden cursor-pointer border border-white/5 transition" data-game-id="${escapeHtml(game.id)}">
      <img src="${escapeHtml(game.coverUrl)}" alt="${escapeHtml(game.title)}" class="w-full h-24 object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/300x150?text=No+Image'">
      <div class="p-2">
        <h4 class="font-bold text-sm truncate">${escapeHtml(game.title)}</h4>
        <p class="text-textSecondary text-xs uppercase">${escapeHtml(game.platform)}</p>
      </div>
    </div>
  `).join('');
}

function toggleFavorite(currentGame) {
  const button = document.getElementById('add-to-favorites');
  if (!button) return;

  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  const index = favorites.indexOf(currentGame.id);

  if (index === -1) {
    favorites.push(currentGame.id);
    button.innerHTML = '<i class="fa fa-heart mr-2"></i> 取消收藏';
    button.classList.remove('bg-gray-700', 'hover:bg-gray-600');
    button.classList.add('bg-nes', 'hover:bg-red-700');
    currentGame.favoriteCount = (currentGame.favoriteCount || 0) + 1;
    showToast('已添加到收藏', 'success');
  } else {
    favorites.splice(index, 1);
    button.innerHTML = '<i class="fa fa-heart mr-2"></i> 收藏';
    button.classList.remove('bg-nes', 'hover:bg-red-700');
    button.classList.add('bg-gray-700', 'hover:bg-gray-600');
    currentGame.favoriteCount = Math.max(0, (currentGame.favoriteCount || 0) - 1);
    showToast('已取消收藏', 'info');
  }

  localStorage.setItem('favorites', JSON.stringify(favorites));
  if (window.activeGenreFilter === 'favorites' && typeof applyFiltersAndRender === 'function') {
    applyFiltersAndRender();
  }
  const gameCard = document.querySelector(`.game-card[data-game-id="${currentGame.id}"]`);
  if (gameCard) {
    const favoriteCountElement = gameCard.querySelector('.fa-heart')?.nextElementSibling;
    if (favoriteCountElement) favoriteCountElement.textContent = currentGame.favoriteCount;
  }
}
