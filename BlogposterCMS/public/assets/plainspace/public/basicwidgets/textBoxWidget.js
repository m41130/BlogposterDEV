import { registerElement } from '../../../js/globalTextEditor.js';

export function render(el) {
  if (!el) return;
  const block = document.createElement('div');
  block.className = 'textbox-widget';
  block.textContent = 'Lorem ipsum dolor sit amet';
  el.innerHTML = '';
  el.appendChild(block);
  registerElement(block);
}
