// The editor may run from a `blob:` URL when edited live. Load Quill
// dynamically using an absolute URL so the import succeeds in that case.
const quillUrl = new URL('/assets/js/quillEditor.js', document.baseURI).href;

function sanitizeHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  // Remove script and style tags entirely
  div.querySelectorAll('script, style').forEach(el => el.remove());
  // Strip inline event handlers like onclick
  div.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      if (/^on/i.test(attr.name)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return div.innerHTML;
}

export async function render(el, ctx = {}) {
  let initQuill = null;
  let quillInstance = null;
  const container = document.createElement('div');
  container.className = 'text-block-widget';
  container.style.width = '100%';
  container.style.height = '100%';
  container.innerHTML = ctx?.metadata?.label || '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>';

  async function enableEdit() {
    if (!ctx.jwt || quillInstance) {
      return;
    }
    if (!initQuill) {
      ({ initQuill } = await import(quillUrl));
    }
    quillInstance = initQuill(container);
    if (!quillInstance) {
      return;
    }
    quillInstance.on('text-change', async () => {
      const html = sanitizeHtml(quillInstance.root.innerHTML.trim());
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
    quillInstance.focus();
  }

  container.addEventListener('click', enableEdit);

  el.innerHTML = '';
  el.appendChild(container);
}
