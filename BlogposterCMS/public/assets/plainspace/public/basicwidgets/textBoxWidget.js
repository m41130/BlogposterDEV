export function render(el) {
  if (!el) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'textbox-widget';
  input.placeholder = 'Lorem ipsum';
  el.innerHTML = '';
  el.appendChild(input);
}
