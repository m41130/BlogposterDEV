// public/assets/plainspace/public/heroBannerWidget.js
import { registerElement } from '../../js/globalTextEditor.js';

export function render(el, ctx = {}) {
  const h = document.createElement('h2');
  h.textContent = ctx?.metadata?.label || '';
  el.innerHTML = '';
  el.appendChild(h);

  if (ctx.jwt) {
    const saveHandler = async (_el) => {
      const newText = _el.textContent.trim();
      try {
        await window.meltdownEmit('updateWidget', {
          jwt: ctx.jwt,
          moduleName: 'widgetManager',
          moduleType: 'core',
          widgetId: ctx.widgetId,
          widgetType: 'public',
          newLabel: newText
        });
      } catch (err) {
        console.error('[heroBannerWidget] save error', err);
      }
    };

    registerElement(h, saveHandler);
  }
}
