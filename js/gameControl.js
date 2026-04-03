// ========================================
// 游戏控制模块
// 依赖: state.js, utils.js
// ========================================

// 停止游戏
function stopGame() {
  console.log('🛑 停止游戏，彻底清理资源...');
  if (window.animationId) {
    cancelAnimationFrame(window.animationId);
    window.animationId = null;
  }
  if (window._nesKeydownHandler) {
    document.removeEventListener('keydown', window._nesKeydownHandler);
    window._nesKeydownHandler = null;
  }
  if (window._nesKeyupHandler) {
    document.removeEventListener('keyup', window._nesKeyupHandler);
    window._nesKeyupHandler = null;
  }
  if (window._menuKeyHandler) {
    document.removeEventListener('keydown', window._menuKeyHandler);
    window._menuKeyHandler = null;
  }
  if (window._platformKeyHandler) {
    document.removeEventListener('keydown', window._platformKeyHandler);
    document.removeEventListener('keyup', window._platformKeyHandler);
    window._platformKeyHandler = null;
  }

  if (window.audioContext) {
    try {
      window.audioContext.suspend();
      if (window._nesScriptNode) {
        try {
          window._nesScriptNode.disconnect();
          window._nesScriptNode.onaudioprocess = null;
        } catch(e) {}
        window._nesScriptNode = null;
      }
      if (window.audioContext.destination) {
        try { window.audioContext.destination.disconnect(); } catch(e) {}
      }
      window.audioContext.close().catch(() => {});
    } catch (e) {}
    window.audioContext = null;
  }

  if (window._nesAudioBufferL) window._nesAudioBufferL = [];
  if (window._nesAudioBufferR) window._nesAudioBufferR = [];

  window.isPaused = false;
  window.isMuted = false;
  window.gameSpeed = 1.0;
  window.currentVolume = 1.0;
  window.currentFilter = 'none';
  window.currentEmulator = null;
  window.currentCore = null;

  console.log('✅ 游戏资源已彻底清理');
}

// 重置游戏
function resetGame() {
  if (window.currentEmulator && window.currentEmulator.reset) {
    window.currentEmulator.reset();
    showToast('游戏已重置', 'info');
  }
}

// 存档
function saveGameState() {
  if (!window.currentEmulator) return;
  try {
    let saveData;
    if (window.currentCore === 'nes' && window.currentEmulator.toJSON) {
      saveData = window.currentEmulator.toJSON();
    } else {
      showToast('该平台暂不支持存档', 'warning');
      return;
    }
    const saveName = `save_${window.currentGame.id}_${Date.now()}`;
    localStorage.setItem(saveName, JSON.stringify(saveData));
    const saveList = JSON.parse(localStorage.getItem('saveList') || '[]');
    saveList.push({
      id: saveName,
      gameId: window.currentGame.id,
      gameTitle: window.currentGame.title,
      platform: window.currentGame.platform,
      date: new Date().toLocaleString()
    });
    localStorage.setItem('saveList', JSON.stringify(saveList));
    showToast('游戏已存档', 'success');
  } catch (error) {
    showToast('存档失败', 'error');
  }
}

// 读档
function loadGameState() {
  if (!window.currentEmulator) return;
  const saveList = JSON.parse(localStorage.getItem('saveList') || '[]');
  const gameSaves = saveList.filter(save => save.gameId === window.currentGame.id);
  if (gameSaves.length === 0) {
    showToast('没有找到存档', 'warning');
    return;
  }
  const saveHtml = gameSaves.map((save, index) => `
    <div class="bg-white/10 hover:bg-white/20 p-3 rounded mb-2 cursor-pointer transition-colors border border-white/10" onclick="applySave('${save.id}')">
      <div class="font-bold text-white">存档 ${index + 1}</div>
      <div class="text-gray-300 text-sm">${save.date}</div>
    </div>
  `).join('');
  const dialog = document.createElement('div');
  dialog.className = 'fixed inset-0 bg-black bg-opacity-80 z-[80] flex items-center justify-center';
  dialog.innerHTML = `
    <div class="bg-white/10 backdrop-blur-xl rounded-xl p-6 max-w-md w-full mx-4 border border-white/20 shadow-2xl">
      <h3 class="text-xl font-bold mb-4 text-white"><i class="fa fa-folder-open mr-2 text-blue-400"></i>选择存档</h3>
      <div class="max-h-60 overflow-y-auto mb-4">${saveHtml}</div>
      <button onclick="this.closest('.fixed').remove()" class="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded border border-white/10 transition-colors">取消</button>
    </div>
  `;
  document.body.appendChild(dialog);
}

// 应用存档
function applySave(saveId) {
  try {
    const saveData = localStorage.getItem(saveId);
    if (saveData && window.currentEmulator && window.currentEmulator.fromJSON) {
      window.currentEmulator.fromJSON(JSON.parse(saveData));
      showToast('存档已加载', 'success');
      document.querySelector('.fixed.z-\\[80\\]')?.remove();
      toggleMenu();
    }
  } catch (error) {
    showToast('读档失败', 'error');
  }
}

// 获取相关游戏
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
    <div class="related-game bg-gray-800 rounded-lg overflow-hidden cursor-pointer" data-game-id="${game.id}">
      <img src="${game.coverUrl}" alt="${game.title}" class="w-full h-24 object-cover" onerror="this.src='https://via.placeholder.com/300x150?text=No+Image'">
      <div class="p-2">
        <h4 class="font-bold text-sm truncate">${game.title}</h4>
        <p class="text-textSecondary text-xs">${game.platform}</p>
      </div>
    </div>
  `).join('');
}

// 切换收藏
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
  const gameCard = document.querySelector(`.game-card[data-game-id="${currentGame.id}"]`);
  if (gameCard) {
    const favoriteCountElement = gameCard.querySelector('.fa-heart')?.nextElementSibling;
    if (favoriteCountElement) favoriteCountElement.textContent = currentGame.favoriteCount;
  }
}