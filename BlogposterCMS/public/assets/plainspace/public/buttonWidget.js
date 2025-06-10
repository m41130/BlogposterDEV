export function render(el, ctx = {}) {
  const btn = document.createElement('button');
  // Start with no label to preserve user edits
  btn.textContent = ctx?.metadata?.label || '';
  btn.addEventListener('click', () => alert('Button clicked!'));
  el.appendChild(btn);
}
