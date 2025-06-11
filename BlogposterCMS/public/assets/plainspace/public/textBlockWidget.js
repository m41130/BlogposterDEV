// The editor may run from a `blob:` URL when edited live. To remain
// sandboxed we load Quill and its styles dynamically using absolute URLs
// so the import succeeds in that case.
const quillEditorUrl = new URL('/assets/js/quillEditor.js', document.baseURI).href;
const quillLibUrl = new URL('/assets/js/quill.js', document.baseURI).href;
const quillCssUrl = new URL('/assets/css/quill.snow.css', document.baseURI).href;

let globalWrapper = null;
let globalQuill = null;
let globalInit = null;
let activeContainer = null;
let saveTimer = null;
let textChangeHandler = null;
let lastSavedContent = null;
let activeCtx = null;

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

async function getGlobalQuill() {
  if (globalInit) {
    await globalInit;
    return globalQuill;
  }
  globalInit = (async () => {
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
    const { initQuill } = await import(quillEditorUrl);
    globalWrapper = document.createElement('div');
    globalWrapper.className = 'text-block-editor-overlay';
    globalWrapper.style.position = 'absolute';
    globalWrapper.style.zIndex = '1000';
    globalWrapper.style.display = 'none';
    document.body.appendChild(globalWrapper);
    globalQuill = initQuill(globalWrapper, { placeholder: '' });
  })();
  await globalInit;
  return globalQuill;
}

function outsideHandler(ev) {
  if (!globalWrapper.contains(ev.target)) {
    disableEdit();
  }
}

function disableEdit() {
  if (!activeContainer || !globalQuill) return;
  const html = sanitizeHtml(globalQuill.root.innerHTML.trim());
  globalQuill.off('text-change', textChangeHandler);
  if (globalQuill.theme && globalQuill.theme.tooltip) {
    const tip = globalQuill.theme.tooltip.root;
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
  }
  activeContainer.innerHTML = html;
  if (activeCtx && activeCtx.id) {
    document.dispatchEvent(new CustomEvent('textBlockHtmlUpdate', {
      detail: { instanceId: activeCtx.id, html }
    }));
  }
  activeContainer = null;
  activeCtx = null;
  globalWrapper.style.display = 'none';
  document.removeEventListener('mousedown', outsideHandler, true);
  document.removeEventListener('pointerdown', outsideHandler, true);
  lastSavedContent = html;
}

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
  lastSavedContent = safeHtml;

  async function enableEdit() {
    if (!ctx.jwt || activeContainer === container) return;
    await getGlobalQuill();

    activeContainer && disableEdit();
    activeContainer = container;
    activeCtx = ctx;

    globalWrapper.style.display = 'block';
    const rect = container.getBoundingClientRect();
    globalWrapper.style.left = `${rect.left + window.scrollX}px`;
    globalWrapper.style.top = `${rect.top + window.scrollY}px`;
    globalWrapper.style.width = `${rect.width}px`;
    globalWrapper.style.height = `${rect.height}px`;

    globalQuill.root.innerHTML = container.innerHTML;

    textChangeHandler = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        const html = sanitizeHtml(globalQuill.root.innerHTML.trim());
        if (html === lastSavedContent) return;
        try {
          await window.meltdownEmit('saveWidgetInstance', {
            jwt: ctx.jwt,
            moduleName: 'plainspace',
            moduleType: 'core',
            instanceId: ctx.id,
            content: html
          });
          lastSavedContent = html;
        } catch (err) {
          console.error('[textBlockWidget] save error', err);
        }
      }, 1500);
    };
    globalQuill.on('text-change', textChangeHandler);

    document.addEventListener('pointerdown', outsideHandler, true);
    document.addEventListener('mousedown', outsideHandler, true);
    globalQuill.focus();
  }

  container.addEventListener('click', enableEdit);

  el.innerHTML = '';
  el.appendChild(container);
}
