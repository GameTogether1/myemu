// ========================================
// 工具函数模块
// ========================================

// 显示加载动画
function showLoading(text = '加载中...') {
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  
  if (loadingText) {
    loadingText.textContent = text;
  }
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }
}

// 隐藏加载动画
function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
}

// 显示提示消息
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  if (!toast || !toastMessage) return;
  
  // 设置消息
  toastMessage.textContent = message;
  
  // 设置颜色
  toast.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50';
  
  switch (type) {
    case 'success':
      toast.classList.add('bg-green-600', 'text-white');
      break;
    case 'error':
      toast.classList.add('bg-red-600', 'text-white');
      break;
    case 'warning':
      toast.classList.add('bg-yellow-600', 'text-white');
      break;
    default:
      toast.classList.add('bg-gray-800', 'text-white');
  }
  
  // 显示
  toast.classList.remove('translate-y-20', 'opacity-0');
  
  // 3秒后隐藏
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

// 格式化按键名称
function formatKeyName(keyCode) {
  const keyMap = {
    'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
    'Enter': 'Enter', 'ShiftLeft': 'Shift', 'ShiftRight': 'Shift',
    'ControlLeft': 'Ctrl', 'ControlRight': 'Ctrl',
    'AltLeft': 'Alt', 'AltRight': 'Alt',
    'Space': 'Space', 'Escape': 'Esc'
  };
  
  if (keyMap[keyCode]) {
    return keyMap[keyCode];
  }
  
  if (keyCode.startsWith('Key')) {
    return keyCode.substring(3);
  }
  
  if (keyCode.startsWith('Digit')) {
    return keyCode.substring(5);
  }
  
  return keyCode;
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}