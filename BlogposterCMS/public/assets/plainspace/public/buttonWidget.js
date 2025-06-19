export function render(el) {
  const btn = document.createElement('button');
  btn.textContent = 'Button';
  el.innerHTML = '';
  el.appendChild(btn);
}
