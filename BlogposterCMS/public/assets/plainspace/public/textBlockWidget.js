import { initQuill } from '../../js/quillEditor.js';

export function render(el, ctx = {}) {
  const container = document.createElement('div');
  container.className = 'text-block-widget';
  container.innerHTML = ctx?.metadata?.label || '<p>Sample text block</p>';

  if (ctx.jwt) {
    const quill = initQuill(container);
    if (quill) {
      quill.on('text-change', async () => {
        const html = quill.root.innerHTML.trim();
        try {
          await window.meltdownEmit('updateWidget', {
            jwt: ctx.jwt,
            moduleName: 'widgetManager',
            moduleType: 'core',
            widgetId: ctx.id,
            widgetType: 'public',
            newLabel: html
          });
        } catch (err) {
          console.error('[textBlockWidget] save error', err);
        }
      });
    }
  }

  el.innerHTML = '';
  el.appendChild(container);
}
