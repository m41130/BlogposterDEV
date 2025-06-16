// public/assets/js/globalTextEditor.js
// Provides a Quill-powered toolbar for editing any text element in the builder.

const quillEditorUrl = new URL('/assets/js/quillEditor.js', document.baseURI).href;
const quillLibUrl = new URL('/assets/js/quill.js', document.baseURI).href;
const quillCssUrl = new URL('/assets/css/quill.snow.css', document.baseURI).href;

let toolbar = null;
let quill = null;
let editorEl = null;
let initPromise = null;
let activeEl = null;
let changeHandler = null;
let outsideHandler = null;
let editingPlain = false;
let autoHandler = null;

export function sanitizeHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script, style').forEach(el => el.remove());
  div.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    });
  });
  return div.innerHTML;
}

function ensureBlockHtml(html) {
  const trimmed = html.trim();
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    const lines = trimmed.split(/\r?\n/);
    return lines.map(l => `<p>${l || '<br>'}</p>`).join('');
  }
  return trimmed;
}

function isEditableElement(el) {
  if (!el || el.nodeType !== 1) return false;
  const ignore = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'SVG', 'VIDEO', 'AUDIO', 'CANVAS'];
  if (ignore.includes(el.tagName)) return false;
  if (!el.textContent.trim()) return false;
  if (el.closest('.text-block-editor-overlay')) return false;
  const tag = el.tagName.toLowerCase();
  const allowed = ['p', 'span', 'label', 'div', 'li', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (allowed.includes(tag)) return true;
  if (el.dataset.textEditable !== undefined) return true;
  return el.children.length === 0;
}

function findEditable(target) {
  let t = target;
  while (t && t !== document.body) {
    if (isEditableElement(t) && t.closest('.grid-stack-item')) {
      return t;
    }
    t = t.parentElement;
  }
  return null;
}

async function init() {
  if (initPromise) {
    await initPromise;
    return;
  }
  initPromise = (async () => {
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
    await import(quillEditorUrl);
    toolbar = document.createElement('div');
    toolbar.className = 'text-block-editor-toolbar floating';
    toolbar.style.display = 'none';
    document.body.appendChild(toolbar);
  })();
  await initPromise;
}



function close() {
  if (!activeEl || !quill) return;
  quill.off('text-change', changeHandler);
  let html = sanitizeHtml(quill.root.innerHTML.trim());
  if (editingPlain) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    html = tmp.textContent;
  }
  activeEl.innerHTML = html;
  toolbar.style.display = 'none';
  document.removeEventListener('pointerdown', outsideHandler, true);
  document.removeEventListener('mousedown', outsideHandler, true);
  const el = activeEl;
  const cb = activeEl.__onSave;
  activeEl = null;
  editingPlain = false;
  editorEl = null;
  quill = null;
  if (typeof cb === 'function') cb(el, html);
}

export async function editElement(el, onSave) {
  await init();
  if (activeEl === el) return;
  if (activeEl) close();
  activeEl = el;
  activeEl.__onSave = onSave;

  const rawHtml = el.innerHTML;
  editingPlain = !/<[a-z][\s\S]*>/i.test(rawHtml.trim());
  const htmlForEditor = editingPlain ? ensureBlockHtml(el.textContent) : rawHtml;

  editorEl = document.createElement('div');
  editorEl.className = 'text-block-editor';
  editorEl.innerHTML = htmlForEditor;
  el.innerHTML = '';
  el.appendChild(editorEl);

  const { initQuill } = await import(quillEditorUrl);
  quill = initQuill(editorEl, { placeholder: '', modules: { toolbar } });
  toolbar.style.display = 'block';
  quill.focus();

  changeHandler = () => {};
  quill.on('text-change', changeHandler);

  outsideHandler = ev => {
    if (!el.contains(ev.target) && !toolbar.contains(ev.target)) close();
  };
  document.addEventListener('pointerdown', outsideHandler, true);
  document.addEventListener('mousedown', outsideHandler, true);
}

export function registerElement(el, onSave) {
  el.addEventListener('click', ev => {
    ev.stopPropagation();
    editElement(el, onSave);
  });
}

export function enableAutoEdit() {
  if (autoHandler) return;
  autoHandler = ev => {
    if (!document.body.classList.contains('builder-mode')) return;
    if (toolbar && toolbar.contains(ev.target)) return;
    const el = findEditable(ev.target);
    if (!el) return;
    ev.stopPropagation();
    editElement(el, el.__onSave);
  };
  document.addEventListener('click', autoHandler, true);
}

if (document.body.classList.contains('builder-mode')) {
  init().catch(err => console.error('[globalTextEditor] init failed', err));
  enableAutoEdit();
}
