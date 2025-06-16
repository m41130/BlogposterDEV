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

function withinGridItem(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node.classList && node.classList.contains('grid-stack-item')) return true;
    node = node.parentElement || (node.getRootNode && node.getRootNode().host);
  }
  return false;
}

function findEditable(target) {
  let t = target;
  while (t && t !== document.body) {
    if (isEditableElement(t) && withinGridItem(t)) {
      return t;
    }
    t = t.parentElement || (t.getRootNode && t.getRootNode().host);
  }
  return null;
}

function findEditableFromEvent(ev) {
  if (typeof ev.composedPath === 'function') {
    const path = ev.composedPath();
    for (const node of path) {
      if (node instanceof Element && isEditableElement(node) && withinGridItem(node)) {
        return node;
      }
    }
  }
  return findEditable(ev.target);
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
      '<button type="button" class="tb-btn" data-cmd="underline">' + window.featherIcon('underline') + '</button>',
      '<select class="heading-select" style="display:none">' +
        ['h1','h2','h3','h4','h5','h6'].map(h => `<option value="${h}">${h.toUpperCase()}</option>`).join('') +
      '</select>',
      '<div class="font-size-control">' +
        '<button type="button" class="tb-btn fs-dec">-</button>' +
        '<input type="number" class="fs-input" value="16" min="8" />' +
        '<button type="button" class="tb-btn fs-inc">+</button>' +
        '<div class="fs-dropdown"><span class="fs-current">16</span><div class="fs-options">' +
          [12,14,16,18,24,36].map(s => `<span data-size="${s}">${s}</span>`).join('') +
        '</div></div>' +
      '</div>'
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

    const fsInput = toolbar.querySelector('.fs-input');
    const fsCurrent = toolbar.querySelector('.fs-current');
    const fsDropdown = toolbar.querySelector('.fs-dropdown');
    const fsOptions = toolbar.querySelector('.fs-options');
    const applySize = size => {
      const val = parseInt(size, 10);
      if (!val) return;
      fsInput.value = val;
      fsCurrent.textContent = val;
      if (activeEl) activeEl.style.fontSize = val + 'px';
    };
    toolbar.querySelector('.fs-inc').addEventListener('click', () => {
      applySize((parseInt(fsInput.value, 10) || 16) + 1);
    });
    toolbar.querySelector('.fs-dec').addEventListener('click', () => {
      applySize((parseInt(fsInput.value, 10) || 16) - 1);
    });
    fsInput.addEventListener('change', () => applySize(fsInput.value));
    fsCurrent.addEventListener('click', () => {
      fsDropdown.classList.toggle('open');
    });
    fsOptions.addEventListener('click', ev => {
      const opt = ev.target.closest('span[data-size]');
      if (!opt) return;
      applySize(opt.dataset.size);
      fsDropdown.classList.remove('open');
    });
  })();
  await initPromise;
}

function close() {
  if (!activeEl) return;
  const widget = activeEl.closest('.grid-stack-item');
  if (widget) {
    document.dispatchEvent(new CustomEvent('textEditStop', { detail: { widget } }));
  }
  activeEl.removeAttribute('contenteditable');
  let html = editingPlain ? activeEl.textContent : activeEl.innerHTML;
  html = sanitizeHtml(html.trim());
  toolbar.style.display = 'none';
  const headingSelect = toolbar.querySelector('.heading-select');
  if (headingSelect) {
    headingSelect.style.display = 'none';
    headingSelect.onchange = null;
  }
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
  const startWidget = el.closest('.grid-stack-item');
  if (startWidget) {
    document.dispatchEvent(new CustomEvent('textEditStart', { detail: { widget: startWidget } }));
  }
  activeEl.__onSave = onSave;

  editingPlain = !/<[a-z][\s\S]*>/i.test(el.innerHTML.trim());
  el.setAttribute('contenteditable', 'true');
  el.focus();
  toolbar.style.display = 'block';

  const headingSelect = toolbar.querySelector('.heading-select');
  if (headingSelect) {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      headingSelect.style.display = '';
      headingSelect.value = tag;
      headingSelect.onchange = () => {
        const newTag = headingSelect.value.toLowerCase();
        if (newTag !== el.tagName.toLowerCase()) {
          const newEl = document.createElement(newTag);
          newEl.innerHTML = el.innerHTML;
          el.replaceWith(newEl);
          newEl.dispatchEvent(new CustomEvent('headingLevelChange', { detail: { level: newTag } }));
          registerElement(newEl, onSave);
          activeEl = newEl;
          el = newEl;
          newEl.setAttribute('contenteditable', 'true');
          newEl.focus();
        }
      };
    } else {
      headingSelect.style.display = 'none';
      headingSelect.onchange = null;
    }
  }

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
    const el = findEditableFromEvent(ev);
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
