/**
 * Toast notification system
 */

import { SVG_ICONS } from './icons.js';

const TOAST_DURATION = 3500;
const ICONS = {
  success: SVG_ICONS.check,
  error: SVG_ICONS.alert,
  warning: SVG_ICONS.alert,
  info: SVG_ICONS.cpu,
};

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} [duration=3500]
 */
export function showToast(message, type = 'info', duration = TOAST_DURATION) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${ICONS[type] || SVG_ICONS.cpu}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}
