/**
 * Initial Loading Screen & Progress Bar Manager
 *
 * Provides instant feedback during first page load, module parsing & initial route rendering.
 */

let currentPercent = 15;

export function updateLoadingProgress(percent, statusMessage) {
  const fillEl = document.getElementById('loading-bar-fill');
  const percentEl = document.getElementById('loading-percentage');
  const statusEl = document.getElementById('loading-status');

  currentPercent = Math.max(currentPercent, Math.min(100, percent));

  if (fillEl) fillEl.style.width = `${currentPercent}%`;
  if (percentEl) percentEl.textContent = `${Math.round(currentPercent)}%`;
  if (statusEl && statusMessage) statusEl.textContent = statusMessage;
}

export function hideLoadingScreen() {
  updateLoadingProgress(100, '載入完成！正在進入 Carrot Games...');

  setTimeout(() => {
    const screen = document.getElementById('initial-loading-screen');
    if (screen) {
      screen.style.opacity = '0';
      screen.style.transform = 'scale(0.98)';
      screen.style.transition = 'opacity 0.4s ease, transform 0.4s ease, filter 0.4s ease';
      screen.style.filter = 'blur(6px)';
      screen.style.pointerEvents = 'none';
      setTimeout(() => {
        if (screen.parentNode) {
          screen.parentNode.removeChild(screen);
        }
      }, 400);
    }
  }, 300);
}
