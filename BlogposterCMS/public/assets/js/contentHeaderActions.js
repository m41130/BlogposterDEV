export function initContentHeader() {
  const editToggle = document.getElementById('edit-toggle');
  const actionBtn  = document.getElementById('dynamic-action-btn');
  const actionCfg  = window.CONTENT_ACTION;

  if (actionBtn && actionCfg && actionCfg.icon) {
    actionBtn.src = actionCfg.icon;
    actionBtn.style.display = 'inline';
    const fn = typeof actionCfg.action === 'function'
      ? actionCfg.action
      : window[actionCfg.action];
    if (typeof fn === 'function') {
      actionBtn.addEventListener('click', fn);
    }
  }

  if (!editToggle) return;

  let editing = false;
  editToggle.addEventListener('click', () => {
    const grid = window.adminGrid;
    if (!grid || typeof grid.setStatic !== 'function') return;
    editing = !editing;
    grid.setStatic(!editing);
    editToggle.src = editing ? '/assets/icons/check.svg' : '/assets/icons/edit.svg';
    editToggle.classList.add('spin');
    setTimeout(() => editToggle.classList.remove('spin'), 300);
  });
}

document.addEventListener('DOMContentLoaded', initContentHeader);
document.addEventListener('content-header-loaded', initContentHeader);
