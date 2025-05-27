export function initContentHeader() {
  const editToggle = document.getElementById('edit-toggle');
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
