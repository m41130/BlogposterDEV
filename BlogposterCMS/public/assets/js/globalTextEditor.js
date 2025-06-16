// public/assets/js/globalTextEditor.js
// Lightweight global text editor for builder mode.

let toolbar = null;
let activeEl = null;
let outsideHandler = null;
let initPromise = null;
let autoHandler = null;
let editingPlain = false;

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

function isEditableElement(el) {
  if (!el || el.nodeType !== 1) return false;
  const ignore = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'SVG', 'VIDEO', 'AUDIO', 'CANVAS'];
  if (ignore.includes(el.tagName)) return false;
  if (!el.textContent.trim()) return false;
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
    toolbar = document.createElement('div');
    toolbar.className = 'text-block-editor-toolbar floating';
    toolbar.style.display = 'none';
    toolbar.innerHTML = [
      '<button type="button" class="tb-btn" data-cmd="bold">' + window.featherIcon('bold') + '</button>',
      '<button type="button" class="tb-btn" data-cmd="italic">' + window.featherIcon('italic') + '</button>',
      '<button type="button" class="tb-btn" data-cmd="underline">' + window.featherIcon('underline') + '</button>'
    ].join('');
    toolbar.addEventListener('click', ev => {
      const btn = ev.target.closest('button[data-cmd]');
      if (!btn) return;
      ev.preventDefault();
      const cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      activeEl?.focus();
    });
    document.body.appendChild(toolbar);
  })();
  await initPromise;
}

function close() {
  if (!activeEl) return;
  activeEl.removeAttribute('contenteditable');
  let html = editingPlain ? activeEl.textContent : activeEl.innerHTML;
  html = sanitizeHtml(html.trim());
  toolbar.style.display = 'none';
  document.removeEventListener('pointerdown', outsideHandler, true);
  document.removeEventListener('mousedown', outsideHandler, true);
  const el = activeEl;
  const cb = activeEl.__onSave;
  activeEl = null;
  editingPlain = false;
  if (typeof cb === 'function') cb(el, html);
}

export async function editElement(el, onSave) {
  await init();
  if (activeEl === el) return;
  if (activeEl) close();
  activeEl = el;
  activeEl.__onSave = onSave;

  editingPlain = !/<[a-z][\s\S]*>/i.test(el.innerHTML.trim());
  el.setAttribute('contenteditable', 'true');
  el.focus();
  toolbar.style.display = 'block';

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
