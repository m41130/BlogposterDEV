export function render(el) {
  const div = document.createElement('div');
  div.className = 'shape-widget';
  el.innerHTML = '';
  el.appendChild(div);
}
