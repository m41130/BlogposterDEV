// The editor may run from a `blob:` URL when edited live. To remain
// sandboxed we load Quill and its styles dynamically using absolute URLs
// so the import succeeds in that case.
const quillEditorUrl = new URL('/assets/js/quillEditor.js', document.baseURI).href;
const quillLibUrl = new URL('/assets/js/quill.js', document.baseURI).href;
const quillCssUrl = new URL('/assets/css/quill.snow.css', document.baseURI).href;

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
  const defaultText = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>';
  const initial = ctx?.metadata?.label;
  const safeHtml = sanitizeHtml(!initial || initial === 'Text Block' ? defaultText : initial);
  container.innerHTML = safeHtml;

  async function enableEdit() {
    if (!ctx.jwt || quillInstance) {
      return;
    }
    if (!initQuill) {
      try {
        if (!window.Quill) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = quillLibUrl;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        if (!document.querySelector(`link[href="${quillCssUrl}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = quillCssUrl;
          document.head.appendChild(link);
        }
        const root = el.getRootNode();
        if (root instanceof ShadowRoot && !root.querySelector(`link[href="${quillCssUrl}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = quillCssUrl;
          root.appendChild(link);
        }
        ({ initQuill } = await import(quillEditorUrl));
      } catch (err) {
        console.error('[textBlockWidget] editor load failed', err);
        return;
      }
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
