// The editor may run from a `blob:` URL when edited live. Load Quill
// dynamically using an absolute URL so the import succeeds in that case.
const quillUrl = new URL('/assets/js/quillEditor.js', document.baseURI).href;

function sanitizeHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script').forEach(el => el.remove());
  return div.innerHTML;
}

export async function render(el, ctx = {}) {
  const { initQuill } = await import(quillUrl);
  const container = document.createElement('div');
  container.className = 'text-block-widget';
  container.style.width = '100%';
  container.style.height = '100%';
  container.innerHTML = ctx?.metadata?.label || '<p>Sample text block</p>';

  if (ctx.jwt) {
    const quill = initQuill(container);
    if (quill) {
      quill.on('text-change', async () => {
        const html = sanitizeHtml(quill.root.innerHTML.trim());
        try {
          await window.meltdownEmit('updateWidget', {
            jwt: ctx.jwt,
            moduleName: 'widgetManager',
            moduleType: 'core',
            widgetId: ctx.widgetId,
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
