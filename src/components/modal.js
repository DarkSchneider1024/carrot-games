/**
 * Modal component
 */

let activeModal = null;

/**
 * Show a modal dialog
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.content - HTML content
 * @param {Array<{text: string, class?: string, onClick: Function}>} options.actions
 * @returns {Function} close function
 */
export function showModal({ title, content, actions = [] }) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';

  const actionsHTML = actions.map((a, i) =>
    `<button class="btn ${a.class || 'btn-secondary'}" data-action="${i}">${a.text}</button>`
  ).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 class="modal-title">${title}</h3>
      <div class="modal-body">${content}</div>
      <div class="modal-actions">${actionsHTML}</div>
    </div>
  `;

  // Handle action clicks
  overlay.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.action);
      if (actions[idx]?.onClick) actions[idx].onClick();
    });
  });

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Escape to close
  const onEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', onEsc);
    }
  };
  document.addEventListener('keydown', onEsc);

  document.body.appendChild(overlay);
  activeModal = overlay;

  return closeModal;
}

/**
 * Close the active modal
 */
export function closeModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}
