// ========================================
// 搜索模块
// ========================================

let searchDebounceTimer = null;
let isSearchActive = false;  // 标记是否处于搜索状态

// 初始化搜索功能
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const searchButton = document.getElementById('search-button');
  const mobileSearchButton = document.getElementById('mobile-search-button');
  const clearSearchBtn = document.getElementById('clear-search');
  const mobileClearSearchBtn = document.getElementById('mobile-clear-search');

  // 更新清空按钮显示状态
  const updateClearButton = (input, btn) => {
    if (input && btn) {
      if (input.value.length > 0) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    }
  };

  // 搜索功能
  const performSearch = (query) => {
    console.log('搜索查询:', query);

    const gamesData = getGamesData();
    if (!gamesData) {
      showToast('游戏数据正在加载中...', 'warning');
      return;
    }

    // 更新清空按钮状态
    if (searchInput) updateClearButton(searchInput, clearSearchBtn);
    if (mobileSearchInput) updateClearButton(mobileSearchInput, mobileClearSearchBtn);

    // 修复：当搜索框清空时，恢复初始状态
    if (!query || query.length === 0) {
      console.log('搜索框已清空，恢复初始状态');
      if (isSearchActive) {
        resetToInitialState();
        isSearchActive = false;
      }
      return;
    }

    isSearchActive = true;

    const gamesWithStats = getGamesWithStats();
    const results = gamesWithStats.filter(game =>
      game.title.toLowerCase().includes(query.toLowerCase())
    );

    console.log('搜索结果数量:', results.length);

    // 滚动到游戏区域并显示结果
    document.getElementById('games').scrollIntoView({ behavior: 'smooth' });
    const gamesContainer = document.querySelector('#games .grid');

    if (results.length === 0) {
      gamesContainer.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-xl text-textSecondary">没有找到匹配的游戏</p></div>`;
    } else {
      renderGameCards(gamesContainer, results);
    }

    // 隐藏加载更多按钮（搜索模式下不需要分页）
    const loadMoreBtn = document.getElementById('load-more-games');
    if (loadMoreBtn) {
      loadMoreBtn.classList.add('hidden');
    }
  };

  // 修复：添加恢复初始状态的函数
  const resetToInitialState = () => {
    console.log('正在重置到初始状态...');

    const gamesContainer = document.querySelector('#games .grid');
    if (!gamesContainer) return;

    // 获取所有游戏数据
    const gamesWithStats = getGamesWithStats();
    if (!gamesWithStats || gamesWithStats.length === 0) {
      gamesContainer.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-xl text-textSecondary">暂无游戏数据</p></div>`;
      return;
    }

    // 按游玩次数排序并显示前8个（热门游戏）
    const sortedGames = [...gamesWithStats].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    const initialGames = sortedGames.slice(0, 8);

    // 清空容器并重新渲染
    gamesContainer.innerHTML = '';
    renderGameCards(gamesContainer, initialGames);

    // 重置分页状态（如果函数存在）
    if (typeof setCurrentPage === 'function') {
      setCurrentPage(1);
    } else {
      // 如果 setCurrentPage 不存在，手动重置全局变量
      window.currentPage = 1;
    }

    // 显示加载更多按钮
    const loadMoreBtn = document.getElementById('load-more-games');
    if (loadMoreBtn) {
      loadMoreBtn.classList.remove('hidden');
      loadMoreBtn.textContent = '加载更多游戏';
      loadMoreBtn.disabled = false;
      loadMoreBtn.style.display = 'inline-block';
    }

    // 重置类型筛选按钮状态（如果存在）
    document.querySelectorAll('.genre-btn').forEach(btn => {
      if (btn.dataset.genre === 'all') {
        btn.classList.remove('bg-gray-800', 'text-textSecondary');
        btn.classList.add('bg-secondary', 'text-white');
      } else {
        btn.classList.remove('bg-secondary', 'text-white');
        btn.classList.add('bg-gray-800', 'text-textSecondary');
      }
    });

    console.log('初始状态已恢复');
  };

  // 防抖搜索
  const debouncedSearch = (query) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    searchDebounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  // 清空搜索功能
  const clearSearch = () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    if (mobileSearchInput) {
      mobileSearchInput.value = '';
      mobileSearchInput.focus();
    }
    debouncedSearch('');
  };

  if (searchInput) {
    // 使用 input 事件实时监听输入变化（包括清空）
    searchInput.addEventListener('input', function() {
      updateClearButton(this, clearSearchBtn);
      debouncedSearch(this.value.trim());
    });

    // 搜索按钮点击事件
    searchButton.addEventListener('click', function() {
      performSearch(searchInput.value.trim());
    });

    // 清空按钮点击事件
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        clearSearch();
      });
    }

    // 监听浏览器原生清空按钮（某些浏览器支持）
    searchInput.addEventListener('search', function() {
      if (this.value === '') {
        debouncedSearch('');
      }
    });

    // 监听 ESC 键清空
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (this.value !== '') {
          this.value = '';
          updateClearButton(this, clearSearchBtn);
          debouncedSearch('');
        }
      }
    });
  }

  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', function() {
      updateClearButton(this, mobileClearSearchBtn);
      debouncedSearch(this.value.trim());
    });

    mobileSearchButton.addEventListener('click', function() {
      performSearch(mobileSearchInput.value.trim());
    });

    // 移动端清空按钮
    if (mobileClearSearchBtn) {
      mobileClearSearchBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        clearSearch();
      });
    }

    mobileSearchInput.addEventListener('search', function() {
      if (this.value === '') {
        debouncedSearch('');
      }
    });

    mobileSearchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (this.value !== '') {
          this.value = '';
          updateClearButton(this, mobileClearSearchBtn);
          debouncedSearch('');
        }
      }
    });
  }
}