import { registerElement } from '../../../js/globalTextEditor.js';

export function render(el) {
  if (!el) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'textbox-widget';

  const p = document.createElement('p');
  const span = document.createElement('span');
  span.textContent = 'Lorem ipsum dolor sit amet';
  p.appendChild(span);
  wrapper.appendChild(p);

  el.innerHTML = '';
  el.appendChild(wrapper);

  registerElement(span);
}
