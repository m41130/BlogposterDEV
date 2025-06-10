document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.widget-container').forEach(el => {
    requestAnimationFrame(() => el.classList.add('loaded'));
  });
});
