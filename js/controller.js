// ========================================
// 控制器设置模块
// ========================================

// 默认控制器映射
const defaultControllerMappings = {
  nes: {
    '上': 'ArrowUp', '下': 'ArrowDown', '左': 'ArrowLeft', '右': 'ArrowRight',
    'A': 'KeyX', 'B': 'KeyZ', '开始': 'Enter', '选择': 'ShiftLeft'
  },
  snes: {
    '上': 'ArrowUp', '下': 'ArrowDown', '左': 'ArrowLeft', '右': 'ArrowRight',
    'A': 'KeyX', 'B': 'KeyZ', 'X': 'KeyA', 'Y': 'KeyS',
    'L': 'KeyQ', 'R': 'KeyW', '开始': 'Enter', '选择': 'ShiftLeft'
  },
  gba: {
    '上': 'ArrowUp', '下': 'ArrowDown', '左': 'ArrowLeft', '右': 'ArrowRight',
    'A': 'KeyX', 'B': 'KeyZ', 'L': 'KeyQ', 'R': 'KeyW', '开始': 'Enter', '选择': 'ShiftLeft'
  },
  md: {
    '上': 'ArrowUp', '下': 'ArrowDown', '左': 'ArrowLeft', '右': 'ArrowRight',
    'A': 'KeyX', 'B': 'KeyZ', 'C': 'KeyC', 'X': 'KeyA', 'Y': 'KeyS', 'Z': 'KeyD', '开始': 'Enter'
  },
  arcade: {
    '上': 'ArrowUp', '下': 'ArrowDown', '左': 'ArrowLeft', '右': 'ArrowRight',
    'A': 'KeyX', 'B': 'KeyZ', 'C': 'KeyC', 'D': 'KeyV', '开始': 'Enter', '投币': 'Key1'
  },
  ps1: {
    '上': 'ArrowUp', '下': 'ArrowDown', '左': 'ArrowLeft', '右': 'ArrowRight',
    '□': 'KeyX', '○': 'KeyZ', '△': 'KeyC', '✕': 'KeyV',
    'L1': 'KeyQ', 'L2': 'KeyA', 'R1': 'KeyW', 'R2': 'KeyS',
    '开始': 'Enter', '选择': 'ShiftLeft'
  }
};

// 初始化控制器映射
function initControllerMapping() {
  const platformSelect = document.getElementById('platform-select');
  const controllerMappingDiv = document.getElementById('controller-mapping');
  
  // 加载保存的控制器映射
  const savedMapping = JSON.parse(localStorage.getItem('controllerMapping')) || {};
  
  // 显示选定平台的控制器映射
  function showMapping(platform) {
    controllerMappingDiv.innerHTML = '';
    
    const mapping = savedMapping[platform] || defaultControllerMappings[platform];
    if (!mapping) return;
    
    Object.entries(mapping).forEach(([action, key]) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between';
      
      row.innerHTML = `
        <span class="text-textSecondary">${action}</span>
        <div class="flex items-center">
          <span class="bg-gray-800 text-textSecondary py-1 px-3 rounded mr-2 controller-key" data-action="${action}">
            ${formatKeyName(key)}
          </span>
          <button class="bg-secondary hover:bg-purple-700 text-white w-8 h-8 rounded flex items-center justify-center change-key" data-action="${action}">
            <i class="fa fa-pencil"></i>
          </button>
        </div>
      `;
      
      controllerMappingDiv.appendChild(row);
    });
    
    // 添加修改按键事件
    document.querySelectorAll('.change-key').forEach(btn => {
      btn.addEventListener('click', function() {
        const action = this.dataset.action;
        const keyElement = document.querySelector(`.controller-key[data-action="${action}"]`);
        
        // 清除其他按键的等待状态
        document.querySelectorAll('.waiting').forEach(el => {
          el.classList.remove('waiting');
        });
        
        // 添加等待状态
        keyElement.classList.add('waiting');
        keyElement.textContent = '按任意键';
        
        // 监听按键
        const onKeyPress = function(e) {
          e.preventDefault();
          
          // 更新显示
          keyElement.textContent = formatKeyName(e.code);
          keyElement.classList.remove('waiting');
          
          // 更新映射
          if (!savedMapping[platform]) {
            savedMapping[platform] = {};
          }
          savedMapping[platform][action] = e.code;
          
          // 保存映射
          localStorage.setItem('controllerMapping', JSON.stringify(savedMapping));
          
          // 移除事件监听
          document.removeEventListener('keydown', onKeyPress);
        };
        
        document.addEventListener('keydown', onKeyPress);
      });
    });
  }
  
  // 初始显示NES控制器映射
  showMapping('nes');
  
  // 平台选择变化时更新映射
  platformSelect.addEventListener('change', function() {
    showMapping(this.value);
  });
  
  // 保存设置按钮
  document.getElementById('save-controls').addEventListener('click', function() {
    localStorage.setItem('controllerMapping', JSON.stringify(savedMapping));
    showToast('控制器设置已保存', 'success');
  });
  
  // 恢复默认按钮
  document.getElementById('reset-controls').addEventListener('click', function() {
    const platform = platformSelect.value;
    
    if (savedMapping[platform]) {
      delete savedMapping[platform];
      localStorage.setItem('controllerMapping', JSON.stringify(savedMapping));
      showMapping(platform);
      showToast('已恢复默认控制器设置', 'success');
    }
  });
}

// 显示控制器帮助
function showControllerHelp() {
  const modalContent = document.getElementById('controller-modal-content');
  const platformSelect = document.getElementById('platform-select');
  const platform = platformSelect.value;
  
  // 获取控制器映射
  const savedMapping = JSON.parse(localStorage.getItem('controllerMapping')) || {};
  const mapping = savedMapping[platform] || defaultControllerMappings[platform];
  
  if (!mapping) {
    showToast('该平台暂无按键说明', 'warning');
    return;
  }
  
  const gamesData = getGamesData();
  const platformName = gamesData.platforms.find(p => p.id === platform)?.name || platform;
  
  // 生成按键说明HTML
  let html = `
    <div class="mb-4">
      <h4 class="font-bold mb-1">${platformName} 控制器按键</h4>
      <p class="text-textSecondary text-sm mb-3">以下是默认按键映射，您可以在设置中自定义按键。</p>
    </div>
    
    <div class="grid grid-cols-2 gap-3">
  `;
  
  Object.entries(mapping).forEach(([action, key]) => {
    html += `
      <div class="flex items-center justify-between bg-gray-800 p-2 rounded">
        <span class="font-bold text-sm">${action}</span>
        <span class="bg-gray-700 text-white py-1 px-2 rounded text-sm">${formatKeyName(key)}</span>
      </div>
    `;
  });
  
  html += `
    </div>
    
    <div class="mt-4 p-3 bg-secondary bg-opacity-20 rounded-lg">
      <h4 class="font-bold mb-1 text-sm">提示</h4>
      <ul class="list-disc list-inside text-textSecondary text-sm space-y-1">
        <li>在游戏中按 F11 可以切换全屏模式</li>
        <li>部分游戏支持游戏手柄</li>
      </ul>
    </div>
  `;
  
  modalContent.innerHTML = html;
  document.getElementById('controller-modal').classList.remove('hidden');
}