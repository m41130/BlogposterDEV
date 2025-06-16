// public/assets/plainspace/public/textBlockWidget.js
// Text block widget using global text editor overlay.

import { registerElement, sanitizeHtml } from '../../js/globalTextEditor.js';

export async function render(el, ctx = {}) {
  const container = document.createElement('div');
  container.className = 'text-block-widget';
  container.dataset.tbw = ctx.id || '';
  container.style.width = '100%';
  container.style.height = '100%';

  const defaultText = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>';
  let initial = ctx?.metadata?.label;
  if (ctx.jwt && ctx.id) {
    try {
      const res = await window.meltdownEmit('getWidgetInstance', {
        jwt: ctx.jwt,
        moduleName: 'plainspace',
        moduleType: 'core',
        instanceId: ctx.id
      });
      if (res && res.content) initial = res.content;
    } catch (err) {
      console.error('[textBlockWidget] load instance error', err);
    }
  }
  const safeHtml = sanitizeHtml(!initial || initial === 'Text Block' ? defaultText : initial);
  container.innerHTML = safeHtml;

  registerElement(container, async (_el, html) => {
    if (ctx.jwt && ctx.id) {
      try {
        await window.meltdownEmit('saveWidgetInstance', {
          jwt: ctx.jwt,
          moduleName: 'plainspace',
          moduleType: 'core',
          instanceId: ctx.id,
          content: html
        });
      } catch (err) {
        console.error('[textBlockWidget] save error', err);
      }
    }
    if (ctx.id) {
      document.dispatchEvent(new CustomEvent('textBlockHtmlUpdate', {
        detail: { instanceId: ctx.id, html }
      }));
    }
  });

  el.innerHTML = '';
  el.appendChild(container);
}
