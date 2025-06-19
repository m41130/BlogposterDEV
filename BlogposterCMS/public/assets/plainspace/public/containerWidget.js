export function render(el) {
  const div = document.createElement('div');
  div.className = 'container-widget';
  el.innerHTML = '';
  el.appendChild(div);
}
