// ========================================
// 工具函数模块（唯一 Toast 与通用工具来源）
// ========================================

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function showLoading(text = '加载中...') {
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  if (loadingText) loadingText.textContent = text;
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay')?.classList.add('hidden');
}

// 统一全局 Toast（使用 #toast-container）
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'border-green-500/50 bg-dark-light/95 text-green-400',
    error: 'border-red-500/50 bg-dark-light/95 text-red-400',
    warning: 'border-yellow-500/50 bg-dark-light/95 text-yellow-400',
    info: 'border-blue-500/50 bg-dark-light/95 text-blue-400'
  };
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[type] || colors.info} backdrop-blur-md transform translate-x-full transition-all duration-300 shadow-lg`;
  toast.innerHTML = `<i class="fa ${icons[type] || icons.info} text-lg"></i><span class="text-sm font-medium">${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.remove('translate-x-full'));
  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatKeyName(keyCode) {
  const keyMap = {
    'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
    'Enter': 'Enter', 'ShiftLeft': 'Shift', 'ShiftRight': 'Shift',
    'ControlLeft': 'Ctrl', 'ControlRight': 'Ctrl',
    'AltLeft': 'Alt', 'AltRight': 'Alt',
    'Space': 'Space', 'Escape': 'Esc'
  };
  if (keyMap[keyCode]) return keyMap[keyCode];
  if (keyCode.startsWith('Key')) return keyCode.substring(3);
  if (keyCode.startsWith('Digit')) return keyCode.substring(5);
  return keyCode;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
