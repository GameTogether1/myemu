// ========================================
// UI 渲染模块
// 依赖: state.js, data.js
// ========================================

// 渲染平台卡片
function renderPlatforms() {
  const platformsContainer = document.getElementById('platforms-container');
  const gamesData = getGamesData();
  if (!platformsContainer || !gamesData || !gamesData.platforms) return;

  platformsContainer.innerHTML = '';
  const fragment = document.createDocumentFragment();

  gamesData.platforms.forEach(platform => {
    const platformCard = document.createElement('div');
    platformCard.className = 'platform-card platform-hover bg-gray-800 rounded-xl p-6 text-center cursor-pointer';
    platformCard.dataset.platform = platform.id;
    platformCard.innerHTML = `
      <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="background-color: ${platform.color}">
        <i class="fa fa-gamepad text-2xl text-white"></i>
      </div>
      <h3 class="font-bold text-lg mb-1">${platform.name}</h3>
      <p class="text-textSecondary text-sm">${platform.fullName}</p>
    `;
    platformCard.addEventListener('click', () => {
      document.getElementById('games').scrollIntoView({ behavior: 'smooth' });
      filterGamesByPlatform(platform.id);
    });
    fragment.appendChild(platformCard);
  });

  platformsContainer.appendChild(fragment);

  const footerPlatforms = document.getElementById('footer-platforms');
  if (footerPlatforms) {
    footerPlatforms.innerHTML = '';
    gamesData.platforms.forEach(platform => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#" class="hover:text-secondary transition-colors">${platform.name}</a>`;
      footerPlatforms.appendChild(li);
    });
  }
}

// 创建游戏卡片 HTML
function createGameCardHTML(game, platformData) {
  const platformName = platformData ? platformData.name : game.platform;
  const platformColors = {
    'nes': '#E63946',
    'arcade': '#FB8500',
    'snes': '#9D4EDD',
    'gba': '#43AA8B',
    'gbc': '#43AA8B',
    'md': '#48CAE4',
    '32x': '#FF006E',
    'ps1': '#6C757D',
    'pbp': '#6C757D'
  };
  const bgColor = platformColors[game.platform] || '#6C757D';

  return `
    <div class="relative">
      <img src="${game.coverUrl}" alt="${game.title}" class="w-full h-48 object-cover" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
      <div class="absolute top-2 right-2 text-white text-xs font-bold py-1 px-2 rounded" style="background-color: ${bgColor}">
        ${platformName}
      </div>
    </div>
    <div class="p-4">
      <h3 class="font-bold text-lg mb-1 truncate">${game.title}</h3>
      <div class="flex justify-between items-center text-sm text-textSecondary mb-2">
        <span>${game.year}</span>
        <span>${game.type}</span>
      </div>
      <div class="flex justify-between items-center text-sm">
        <div class="flex items-center text-textSecondary">
          <i class="fa fa-gamepad mr-1"></i>
          <span>${game.playCount || 0}</span>
        </div>
        <div class="flex items-center text-textSecondary">
          <i class="fa fa-heart mr-1"></i>
          <span>${game.favoriteCount || 0}</span>
        </div>
      </div>
    </div>
  `;
}

// 渲染游戏卡片列表
function renderGameCards(container, games, clearContainer = true) {
  if (clearContainer) container.innerHTML = '';
  if (!games || games.length === 0) {
    if (clearContainer) {
      container.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-xl text-textSecondary">暂无游戏数据</p></div>`;
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  const gamesData = getGamesData();

  games.forEach(game => {
    const platformData = gamesData?.platforms?.find(p => p.id === game.platform);
    const gameCard = document.createElement('div');
    gameCard.className = 'game-card bg-gray-900 rounded-xl overflow-hidden shadow-lg cursor-pointer';
    gameCard.dataset.gameId = game.id;
    gameCard.innerHTML = createGameCardHTML(game, platformData);
    gameCard.addEventListener('click', () => showGameDetails(game.id));
    fragment.appendChild(gameCard);
  });

  container.appendChild(fragment);
}

// 渲染热门游戏
function renderPopularGames() {
  const gamesContainer = document.querySelector('#games .grid');
  if (!gamesContainer) return;
  const gamesWithStats = getGamesWithStats();
  if (gamesWithStats.length === 0) {
    gamesContainer.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-xl text-textSecondary">暂无游戏数据</p></div>`;
    return;
  }
  const sortedGames = [...gamesWithStats].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  renderGameCards(gamesContainer, sortedGames.slice(0, getGamesPerPage()));
}

// 渲染功能特点
function renderFeatures() {
  const featuresContainer = document.getElementById('features-container');
  if (!featuresContainer) return;
  const features = [
    { icon: 'fa-gamepad', title: '多平台支持', description: '支持NES、SNES、GBA、MD、32X、PS1、PSP等经典游戏平台。' },
    { icon: 'fa-bolt', title: '即时游玩', description: '无需下载安装，直接在浏览器中运行游戏。' },
    { icon: 'fa-save', title: '存档功能', description: '支持游戏存档和读档，随时保存进度。' },
    { icon: 'fa-keyboard-o', title: '自定义按键', description: '可自定义键盘按键映射。' }
  ];
  featuresContainer.innerHTML = features.map(f => `
    <div class="bg-gray-900 rounded-xl p-6 shadow-lg">
      <div class="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
        <i class="fa ${f.icon} text-2xl text-white"></i>
      </div>
      <h3 class="text-xl font-bold mb-2">${f.title}</h3>
      <p class="text-textSecondary">${f.description}</p>
    </div>
  `).join('');
}

// 加载更多游戏
function loadMoreGames() {
  const gamesContainer = document.querySelector('#games .grid');
  if (!gamesContainer) return;
  const gamesWithStats = getGamesWithStats();
  const sortedGames = [...gamesWithStats].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  const currentPageNum = getCurrentPage();
  const startIndex = currentPageNum * getGamesPerPage();
  const gamesToShow = sortedGames.slice(startIndex, startIndex + getGamesPerPage());

  if (gamesToShow.length === 0) {
    const loadMoreBtn = document.getElementById('load-more-games');
    if (loadMoreBtn) {
      loadMoreBtn.textContent = '没有更多游戏了';
      loadMoreBtn.disabled = true;
    }
    return;
  }
  renderGameCards(gamesContainer, gamesToShow, false);
  setCurrentPage(currentPageNum + 1);
}

// 按平台过滤游戏
function filterGamesByPlatform(platform) {
  const gamesContainer = document.querySelector('#games .grid');
  if (!gamesContainer) return;
  const gamesWithStats = getGamesWithStats();
  renderGameCards(gamesContainer, gamesWithStats.filter(game => game.platform === platform));
  const loadMoreBtn = document.getElementById('load-more-games');
  if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
}

// 渲染游戏类型筛选器
function renderGenres() {
  const genresContainer = document.getElementById('genres-container');
  const gamesData = getGamesData();
  if (!genresContainer || !gamesData || !gamesData.genres) return;

  genresContainer.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const allButton = document.createElement('button');
  allButton.className = 'genre-btn bg-secondary text-white px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 active';
  allButton.dataset.genre = 'all';
  allButton.textContent = '全部';
  allButton.onclick = () => filterGamesByGenre('all');
  fragment.appendChild(allButton);

  gamesData.genres.forEach(genre => {
    const genreBtn = document.createElement('button');
    genreBtn.className = 'genre-btn bg-gray-800 text-textSecondary px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 hover:bg-gray-700';
    genreBtn.dataset.genre = genre.id;
    genreBtn.textContent = genre.name;
    genreBtn.title = genre.description;
    genreBtn.onclick = () => filterGamesByGenre(genre.id);
    fragment.appendChild(genreBtn);
  });
  genresContainer.appendChild(fragment);
}

// 按游戏类型筛选游戏
function filterGamesByGenre(genreId) {
  const gamesContainer = document.querySelector('#games .grid');
  if (!gamesContainer) return;

  document.querySelectorAll('.genre-btn').forEach(btn => {
    if (btn.dataset.genre === genreId) {
      btn.classList.remove('bg-gray-800', 'text-textSecondary');
      btn.classList.add('bg-secondary', 'text-white');
    } else {
      btn.classList.remove('bg-secondary', 'text-white');
      btn.classList.add('bg-gray-800', 'text-textSecondary');
    }
  });

  const gamesWithStats = getGamesWithStats();
  if (genreId === 'all') {
    renderGameCards(gamesContainer, gamesWithStats);
  } else {
    const gamesData = getGamesData();
    const genre = gamesData.genres.find(g => g.id === genreId);
    if (genre) {
      const filteredGames = gamesWithStats.filter(game => game.type === genre.name);
      renderGameCards(gamesContainer, filteredGames);
    }
  }

  const loadMoreBtn = document.getElementById('load-more-games');
  if (loadMoreBtn) {
    if (genreId === 'all') loadMoreBtn.classList.remove('hidden');
    else loadMoreBtn.classList.add('hidden');
  }
}