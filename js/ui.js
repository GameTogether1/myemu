// ========================================
// UI 渲染与筛选分页模块
// 支持平台 + 类型组合筛选与流畅分页加载
// ========================================

const PLATFORM_COLORS = {
  nes: '#E63946',
  arcade: '#FB8500',
  snes: '#9D4EDD',
  gba: '#43AA8B',
  gbc: '#43AA8B',
  md: '#48CAE4',
  '32x': '#FF006E',
  ps1: '#6C757D',
  pbp: '#6C757D'
};

const GAMES_BATCH_SIZE = 24;
let currentFilteredGames = [];
let renderedCount = 0;

// 渲染平台选择卡片（带各平台数量与激活高亮）
function renderPlatforms() {
  const container = document.getElementById('platforms-container');
  const gamesData = getGamesData();
  if (!container || !gamesData?.platforms) return;

  const allGames = getGamesWithStats();
  const countByPlatform = {};
  allGames.forEach(g => {
    countByPlatform[g.platform] = (countByPlatform[g.platform] || 0) + 1;
  });

  // 更新 Hero 统计
  const statsEl = document.getElementById('hero-stats-text');
  if (statsEl) {
    statsEl.textContent = `${gamesData.platforms.length} 大经典平台 · 共收录 ${allGames.length} 款游戏 · 浏览器即点即玩`;
  }

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();

  // "全部平台" 快捷卡片
  const allCard = document.createElement('button');
  allCard.type = 'button';
  allCard.dataset.platform = 'all';
  allCard.className = 'platform-card glass-effect rounded-xl p-4 text-center cursor-pointer transition-all';
  allCard.innerHTML = `
    <div class="w-12 h-12 mx-auto mb-2.5 rounded-xl bg-gradient-to-br from-secondary to-neon-blue flex items-center justify-center shadow-lg">
      <i class="fa fa-th-large text-xl text-white"></i>
    </div>
    <h3 class="font-bold text-sm text-white">全部平台</h3>
    <p class="text-gray-400 text-xs mt-0.5">${allGames.length} 款</p>
  `;
  allCard.addEventListener('click', () => filterGamesByPlatform('all'));
  fragment.appendChild(allCard);

  gamesData.platforms.forEach(platform => {
    const count = countByPlatform[platform.id] || 0;
    const card = document.createElement('button');
    card.type = 'button';
    card.dataset.platform = platform.id;
    card.className = 'platform-card glass-effect rounded-xl p-4 text-center cursor-pointer transition-all';
    card.innerHTML = `
      <div class="w-12 h-12 mx-auto mb-2.5 rounded-xl flex items-center justify-center shadow-lg" style="background-color: ${platform.color}">
        <i class="fa fa-gamepad text-xl text-white"></i>
      </div>
      <h3 class="font-bold text-sm text-white">${escapeHtml(platform.name)}</h3>
      <p class="text-gray-400 text-xs mt-0.5">${count} 款</p>
    `;
    card.addEventListener('click', () => filterGamesByPlatform(platform.id));
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
  syncPlatformHighlight();
}

function syncPlatformHighlight() {
  document.querySelectorAll('#platforms-container .platform-card').forEach(card => {
    const active = card.dataset.platform === window.activePlatformFilter;
    card.classList.toggle('ring-2', active);
    card.classList.toggle('ring-neon-blue', active);
    card.classList.toggle('bg-white/10', active);
  });
}

// 创建游戏卡片 HTML
function createGameCardHTML(game, platformData) {
  const platformName = platformData ? platformData.name : game.platform;
  const bgColor = PLATFORM_COLORS[game.platform] || '#6C757D';

  return `
    <div class="relative overflow-hidden bg-gray-950">
      <img src="${escapeHtml(game.coverUrl)}" alt="${escapeHtml(game.title)}" class="w-full h-44 object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
      <span class="absolute top-2.5 right-2.5 text-white text-[11px] font-bold py-0.5 px-2 rounded-md shadow" style="background-color: ${bgColor}">
        ${escapeHtml(platformName)}
      </span>
    </div>
    <div class="p-4">
      <h3 class="font-bold text-base mb-1.5 truncate text-white" title="${escapeHtml(game.title)}">${escapeHtml(game.title)}</h3>
      <div class="flex justify-between items-center text-xs text-gray-400 mb-2.5">
        <span>${escapeHtml(game.year || '')}</span>
        <span class="px-2 py-0.5 rounded bg-white/5 text-gray-300">${escapeHtml(game.type || '')}</span>
      </div>
      <div class="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-white/5">
        <span class="flex items-center gap-1"><i class="fa fa-gamepad text-neon-blue"></i><span>${game.playCount || 0}</span></span>
        <span class="flex items-center gap-1"><i class="fa fa-heart text-pink-400"></i><span>${game.favoriteCount || 0}</span></span>
      </div>
    </div>
  `;
}

// 渲染游戏卡片列表
function renderGameCards(container, games, clearContainer = true) {
  if (clearContainer) container.innerHTML = '';
  if (!games || games.length === 0) {
    if (clearContainer) {
      container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400">暂无符合条件的游戏</div>`;
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  const gamesData = getGamesData();

  games.forEach(game => {
    const platformData = gamesData?.platforms?.find(p => p.id === game.platform);
    const gameCard = document.createElement('div');
    gameCard.className = 'game-card glass-effect rounded-xl overflow-hidden shadow-lg cursor-pointer';
    gameCard.dataset.gameId = game.id;
    gameCard.innerHTML = createGameCardHTML(game, platformData);
    gameCard.addEventListener('click', () => showGameDetails(game.id));
    fragment.appendChild(gameCard);
  });

  container.appendChild(fragment);
}

// 统一按当前平台 + 类型筛选并分页渲染
function applyFiltersAndRender() {
  const gamesContainer = document.getElementById('games-container');
  if (!gamesContainer) return;

  const gamesData = getGamesData();
  let list = [...getGamesWithStats()].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));

  if (window.activePlatformFilter && window.activePlatformFilter !== 'all') {
    list = list.filter(g => g.platform === window.activePlatformFilter);
  }

  if (window.activeGenreFilter === 'favorites') {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    list = list.filter(g => favorites.includes(g.id));
  } else if (window.activeGenreFilter && window.activeGenreFilter !== 'all') {
    const genreObj = gamesData?.genres?.find(g => g.id === window.activeGenreFilter);
    if (genreObj) {
      list = list.filter(g => g.type === genreObj.name);
    }
  }

  currentFilteredGames = list;
  renderedCount = 0;
  gamesContainer.innerHTML = '';

  const countLabel = document.getElementById('games-count-label');
  if (countLabel) countLabel.textContent = `共 ${list.length} 款`;

  if (list.length === 0) {
    renderGameCards(gamesContainer, [], true);
    updateLoadMoreButton();
    return;
  }

  loadMoreGames();
}

function updateLoadMoreButton() {
  const btn = document.getElementById('load-more-games');
  if (!btn) return;
  const remaining = currentFilteredGames.length - renderedCount;
  if (remaining > 0) {
    btn.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = `加载更多游戏（剩余 ${remaining} 款）`;
  } else {
    btn.classList.add('hidden');
  }
}

function renderPopularGames() {
  window.activePlatformFilter = 'all';
  window.activeGenreFilter = 'all';
  syncPlatformHighlight();
  applyFiltersAndRender();
}

function loadMoreGames() {
  const gamesContainer = document.getElementById('games-container');
  if (!gamesContainer) return;

  const nextBatch = currentFilteredGames.slice(renderedCount, renderedCount + GAMES_BATCH_SIZE);
  if (nextBatch.length > 0) {
    renderGameCards(gamesContainer, nextBatch, false);
    renderedCount += nextBatch.length;
  }
  updateLoadMoreButton();
}

function filterGamesByPlatform(platform) {
  window.activePlatformFilter = platform;
  syncPlatformHighlight();
  applyFiltersAndRender();
  document.getElementById('games')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderGenres() {
  const genresContainer = document.getElementById('genres-container');
  const gamesData = getGamesData();
  if (!genresContainer || !gamesData?.genres) return;

  genresContainer.innerHTML = '';
  const fragment = document.createDocumentFragment();

  const makeBtn = (id, name, desc, active) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = active
      ? 'genre-btn bg-secondary text-white px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all'
      : 'genre-btn bg-gray-800/80 text-gray-300 px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all hover:bg-gray-700 hover:text-white border border-white/5';
    btn.dataset.genre = id;
    btn.textContent = name;
    if (desc) btn.title = desc;
    btn.addEventListener('click', () => filterGamesByGenre(id));
    return btn;
  };

  fragment.appendChild(makeBtn('all', '全部类型', '', true));
  fragment.appendChild(makeBtn('favorites', '❤️ 我的收藏', '查看已收藏的游戏', false));
  gamesData.genres.forEach(genre => {
    fragment.appendChild(makeBtn(genre.id, genre.name, genre.description, false));
  });
  genresContainer.appendChild(fragment);
}

function filterGamesByGenre(genreId) {
  window.activeGenreFilter = genreId;
  document.querySelectorAll('.genre-btn').forEach(btn => {
    const active = btn.dataset.genre === genreId;
    btn.className = active
      ? 'genre-btn bg-secondary text-white px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all'
      : 'genre-btn bg-gray-800/80 text-gray-300 px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all hover:bg-gray-700 hover:text-white border border-white/5';
  });
  applyFiltersAndRender();
}
