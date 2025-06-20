// public/assets/js/globalTextEditor.js
// Lightweight global text editor for builder mode.
import { createColorPicker } from './colorPicker.js';
import { isValidTag } from './allowedTags.js';

let toolbar = null;
let activeEl = null;
let outsideHandler = null;
let leaveHandler = null;
let initPromise = null;
let autoHandler = null;
let editingPlain = false;
let currentColor = '#000000';

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
  if (isValidTag(tag)) return true;
  if (el.dataset.textEditable !== undefined) return true;
  return el.children.length === 0;
}

function withinGridItem(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node.classList && node.classList.contains('canvas-item')) return true;
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
      '<div class="font-family-control">' +
        '<div class="ff-dropdown">' +
          '<button type="button" class="ff-btn"><span class="ff-label">Font</span></button>' +
          '<div class="ff-options"></div>' +
        '</div>' +
      '</div>',
      '<button type="button" class="tb-btn" data-cmd="bold">' + window.featherIcon('bold') + '</button>',
      '<button type="button" class="tb-btn" data-cmd="italic">' + window.featherIcon('italic') + '</button>',
      '<button type="button" class="tb-btn" data-cmd="underline">' + window.featherIcon('underline') + '</button>',
      '<select class="heading-select" style="display:none">' +
        ['h1','h2','h3','h4','h5','h6'].map(h => `<option value="${h}">${h.toUpperCase()}</option>`).join('') +
      '</select>',
      '<div class="font-size-control">' +
        '<button type="button" class="tb-btn fs-dec">-</button>' +
        '<div class="fs-dropdown">' +
          '<button type="button" class="fs-btn"><span>' +
            '<input type="number" class="fs-input" value="16" min="8" />' +
          '</span></button>' +
          '<div class="fs-options">' +
            [12,14,16,18,24,36].map(s => `<span data-size="${s}">${s}</span>`).join('') +
          '</div>' +
        '</div>' +
        '<button type="button" class="tb-btn fs-inc">+</button>' +
      '</div>'
    ].join('');
    toolbar.addEventListener('click', ev => {
      const btn = ev.target.closest('button[data-cmd]');
      if (!btn) return;
      ev.preventDefault();
      const cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      editingPlain = false;
      activeEl?.focus();
    });
    document.body.appendChild(toolbar);

    const colorWrapper = document.createElement('div');
    colorWrapper.className = 'text-color-picker';
    const colorBtn = document.createElement('button');
    colorBtn.type = 'button';
    colorBtn.className = 'color-picker-toggle tb-btn';
    const colorIcon = document.createElement('span');
    colorIcon.className = 'color-icon';
    colorIcon.textContent = 'A';
    colorIcon.style.textDecorationColor = currentColor;
    colorBtn.appendChild(colorIcon);
    const themeColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-color')
      .trim();
    const picker = createColorPicker({
      presetColors: [
        '#FF0000', '#FF4040', '#FFC0CB', '#FF00FF', '#800080', '#8A2BE2',
        '#00CED1', '#00FFFF', '#40E0D0', '#ADD8E6', '#4169E1', '#0047AB',
        '#008000', '#7CFC00', '#BFFF00', '#FFFF00', '#FFDAB9', '#FFA500',
        '#000000', '#A9A9A9', '#808080'
      ],
      themeColors: themeColor ? [themeColor] : [],
      initialColor: currentColor,
      onSelect: c => {
        applyColor(c);
        colorIcon.style.textDecorationColor = c;
        picker.el.classList.add('hidden');
      }
    });
    picker.el.classList.add('hidden');
    colorBtn.addEventListener('click', () => {
      picker.el.classList.toggle('hidden');
    });
    document.addEventListener('click', ev => {
      if (!colorWrapper.contains(ev.target)) picker.el.classList.add('hidden');
    });
    colorWrapper.appendChild(colorBtn);
    colorWrapper.appendChild(picker.el);
    toolbar.appendChild(colorWrapper);

    const ffControl = toolbar.querySelector('.font-family-control');
    const ffDropdown = toolbar.querySelector('.ff-dropdown');
    const ffOptions = toolbar.querySelector('.ff-options');
    const ffBtn = toolbar.querySelector('.ff-btn');
    const ffLabel = toolbar.querySelector('.ff-label');
    const fsInput = toolbar.querySelector('.fs-input');
    const fsDropdown = toolbar.querySelector('.fs-dropdown');
    const fsOptions = toolbar.querySelector('.fs-options');
    const fsBtn = toolbar.querySelector('.fs-btn');

    const populateFonts = () => {
      const fonts = Array.isArray(window.AVAILABLE_FONTS) ? window.AVAILABLE_FONTS : [];
      ffOptions.innerHTML = fonts
        .map(f => `<span data-font="${f}" style="font-family:'${f}'">${f}</span>`)
        .join('');
      if (fonts.length) ffLabel.textContent = fonts[0];
    };
    populateFonts();
    document.addEventListener('fontsUpdated', populateFonts);

    const applyFont = font => {
      if (!font) return;
      ffLabel.textContent = font;
      if (!activeEl) return;
      const sel = window.getSelection();
      if (
        sel &&
        !sel.isCollapsed &&
        activeEl.contains(sel.anchorNode) &&
        activeEl.contains(sel.focusNode)
      ) {
        try {
          const range = sel.getRangeAt(0).cloneRange();
          const span = document.createElement('span');
          span.style.fontFamily = `'${font}'`;
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          sel.addRange(newRange);
          editingPlain = false;
        } catch (err) {
          activeEl.style.fontFamily = `'${font}'`;
        }
      } else {
        activeEl.querySelectorAll('*').forEach(el => {
          el.style.fontFamily = `'${font}'`;
        });
        activeEl.childNodes.forEach(node => {
          if (node.nodeType === 3 && node.textContent.trim()) {
            const span = document.createElement('span');
            span.style.fontFamily = `'${font}'`;
            span.textContent = node.textContent;
            node.parentNode.replaceChild(span, node);
          }
        });
      }
      editingPlain = false;
      activeEl.focus();
    };
    const applySize = size => {
      const val = parseInt(size, 10);
      if (!val) return;
      fsInput.value = val;
      if (!activeEl) return;

      const sel = window.getSelection();
      if (
        sel &&
        !sel.isCollapsed &&
        activeEl.contains(sel.anchorNode) &&
        activeEl.contains(sel.focusNode)
      ) {
        try {
          const range = sel.getRangeAt(0).cloneRange();
          const span = document.createElement('span');
          span.style.fontSize = val + 'px';
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          sel.addRange(newRange);
          editingPlain = false;
        } catch (err) {
          activeEl.style.fontSize = val + 'px';
        }
      } else {
        activeEl.querySelectorAll('*').forEach(el => {
          el.style.fontSize = val + 'px';
        });
        activeEl.childNodes.forEach(node => {
          if (node.nodeType === 3 && node.textContent.trim()) {
            const span = document.createElement('span');
            span.style.fontSize = val + 'px';
            span.textContent = node.textContent;
            node.parentNode.replaceChild(span, node);
          }
        });
      }
      editingPlain = false;
      activeEl.focus();
    };

    const sanitizeColor = c => {
      c = String(c || '').trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c;
      const tmp = document.createElement('div');
      tmp.style.color = c;
      return tmp.style.color ? c : '#000000';
    };

    const applyColor = color => {
      const val = sanitizeColor(color);
      currentColor = val;
      if (!activeEl) return;
      const sel = window.getSelection();
      if (
        sel &&
        !sel.isCollapsed &&
        activeEl.contains(sel.anchorNode) &&
        activeEl.contains(sel.focusNode)
      ) {
        try {
          const range = sel.getRangeAt(0).cloneRange();
          const span = document.createElement('span');
          span.style.color = val;
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          sel.addRange(newRange);
          editingPlain = false;
        } catch (err) {
          activeEl.style.color = val;
        }
      } else {
        activeEl.querySelectorAll('*').forEach(el => {
          el.style.color = val;
        });
        activeEl.childNodes.forEach(node => {
          if (node.nodeType === 3 && node.textContent.trim()) {
            const span = document.createElement('span');
            span.style.color = val;
            span.textContent = node.textContent;
            node.parentNode.replaceChild(span, node);
          }
        });
      }
      editingPlain = false;
      activeEl.focus();
    };
    toolbar.querySelector('.fs-inc').addEventListener('click', () => {
      applySize((parseInt(fsInput.value, 10) || 16) + 1);
    });
    toolbar.querySelector('.fs-dec').addEventListener('click', () => {
      applySize((parseInt(fsInput.value, 10) || 16) - 1);
    });
    const filterOptions = val => {
      fsOptions.querySelectorAll('span[data-size]').forEach(span => {
        span.style.display = !val || span.textContent.startsWith(val) ? 'block' : 'none';
      });
    };

    fsBtn.addEventListener('click', () => {
      fsDropdown.classList.toggle('open');
      fsInput.focus();
    });

    ffBtn.addEventListener('click', () => {
      ffControl.classList.toggle('open');
    });

    document.addEventListener('click', ev => {
      if (!ffControl.contains(ev.target)) ffControl.classList.remove('open');
    });

    ffOptions.addEventListener('click', ev => {
      const opt = ev.target.closest('span[data-font]');
      if (!opt) return;
      applyFont(opt.dataset.font);
      ffControl.classList.remove('open');
    });

    ['pointerdown', 'click'].forEach(evt => {
      fsInput.addEventListener(evt, ev => ev.stopPropagation());
    });

    fsInput.addEventListener('focus', () => {
      fsDropdown.classList.add('open');
      filterOptions(fsInput.value);
    });
    fsInput.addEventListener('input', () => {
      fsDropdown.classList.add('open');
      filterOptions(fsInput.value);
    });
    fsInput.addEventListener('change', () => applySize(fsInput.value));
    fsInput.addEventListener('blur', () => {
      setTimeout(() => fsDropdown.classList.remove('open'), 150);
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

function findWidget(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node.classList && node.classList.contains('canvas-item')) return node;
    node = node.parentElement || (node.getRootNode && node.getRootNode().host);
  }
  return null;
}

function close() {
  if (!activeEl) return;
  const widget = findWidget(activeEl);
  if (widget) {
    document.dispatchEvent(new CustomEvent('textEditStop', { detail: { widget } }));
  }
  activeEl.removeAttribute('contenteditable');
  let html = editingPlain ? activeEl.textContent : activeEl.innerHTML;
  html = sanitizeHtml(html.trim());
  if (editingPlain) {
    activeEl.textContent = html;
  } else {
    activeEl.innerHTML = html;
  }
  toolbar.style.display = 'none';
  const headingSelect = toolbar.querySelector('.heading-select');
  if (headingSelect) {
    headingSelect.style.display = 'none';
    headingSelect.onchange = null;
  }
  document.removeEventListener('pointerdown', outsideHandler, true);
  document.removeEventListener('mousedown', outsideHandler, true);
  if (leaveHandler) {
    const widget = findWidget(activeEl);
    widget?.removeEventListener('mouseleave', leaveHandler, true);
    toolbar?.removeEventListener('mouseleave', leaveHandler, true);
    leaveHandler = null;
  }
  const el = activeEl;
  const cb = activeEl.__onSave;
  if (widget && widget.dataset.instanceId) {
    document.dispatchEvent(
      new CustomEvent('widgetHtmlUpdate', {
        detail: { instanceId: widget.dataset.instanceId, html }
      })
    );
  }
  activeEl = null;
  editingPlain = false;
  if (typeof cb === 'function') cb(el, html);
}

export async function editElement(el, onSave) {
  await init();
  if (activeEl === el) return;
  if (activeEl) close();
  activeEl = el;
  const startWidget = findWidget(el);
  // Immediately lock the widget so it cannot be moved while editing.
  activeEl.__onSave = onSave;

  editingPlain = !/<[a-z][\s\S]*>/i.test(el.innerHTML.trim());
  el.setAttribute('contenteditable', 'true');
  el.focus();
  toolbar.style.display = 'flex';

  if (startWidget) {
    document.dispatchEvent(new CustomEvent('textEditStart', { detail: { widget: startWidget } }));
  }

  const headingSelect = toolbar.querySelector('.heading-select');
  if (headingSelect) {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      headingSelect.style.display = '';
      headingSelect.value = tag;
      headingSelect.onchange = () => {
        const newTag = headingSelect.value.toLowerCase();
        if (!isValidTag(newTag)) {
          console.error(`[TextEditor] Invalid tag "${newTag}"`);
          return;
        }
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

  if (startWidget) {
    leaveHandler = ev => {
      const to = ev.relatedTarget;
      if (!startWidget.contains(to) && !toolbar.contains(to) && startWidget.dataset.tempLock === 'true') {
        document.dispatchEvent(new CustomEvent('textEditStop', { detail: { widget: startWidget } }));
      }
    };
    startWidget.addEventListener('mouseleave', leaveHandler, true);
    toolbar.addEventListener('mouseleave', leaveHandler, true);
  }
}

export function registerElement(el, onSave) {
  el.__onSave = onSave;
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
