// public/assets/plainspace/admin/builderRenderer.js
import { init as initCanvasGrid } from '../../js/canvasGrid.js';

export async function initBuilder(sidebarEl, contentEl, pageId = null) {
  document.body.classList.add('builder-mode');
  // Builder widgets load the active theme inside their shadow roots.
  // Inject the theme scoped to the builder grid so the preview matches
  // the active theme without altering the surrounding UI.
  const DEFAULT_PORTS = [
    { id: 'desktop', label: 'Desktop', class: 'preview-desktop' },
    { id: 'tablet', label: 'Tablet', class: 'preview-tablet' },
    { id: 'mobile', label: 'Mobile', class: 'preview-mobile' }
  ];

  const displayPorts = (Array.isArray(window.DISPLAY_PORTS) ? window.DISPLAY_PORTS : [])
    .filter(p => p && p.id && p.label)
    .map(p => ({
      id: String(p.id),
      label: String(p.label),
      class: `preview-${String(p.id).replace(/[^a-z0-9_-]/gi, '')}`
    }));
  if (!displayPorts.length) displayPorts.push(...DEFAULT_PORTS);

  // Temporary patch: larger default widget height
  const DEFAULT_ROWS = 20; // around 100px with 5px grid cells
  const ICON_MAP = {
    systemInfo: 'info',
    activityLog: 'list',
    pageInfoEditor: 'file-text',
    pageSettingsEditor: 'settings',
    seoImageEditor: 'image',
    mediaExplorer: 'folder',
    pageList: 'list',
    pageStats: 'bar-chart-2',
    pageInfoWidget: 'file-text',
    pageSettingsWidget: 'settings',
    seoImageWidget: 'image',
    savePageWidget: 'save',
    contentSummary: 'activity',
    htmlBlock: 'code'
  };

  let previewHeader;
  let viewportSelect;
  const layoutLayers = [
    { name: 'Global', layout: [] },
    { name: 'Layer 1', layout: [] },
    { name: 'Layer 2', layout: [] }
  ];
  let activeLayer = 0;
  let globalLayoutName = null;
  let layoutBar;

  function showPreviewHeader() {
    if (previewHeader) return;
    previewHeader = document.createElement('div');
    previewHeader.id = 'previewHeader';
    previewHeader.className = 'preview-header';
    viewportSelect = document.createElement('select');
    displayPorts.forEach(p => {
      const o = document.createElement('option');
      o.value = p.class;
      o.textContent = p.label;
      viewportSelect.appendChild(o);
    });
    viewportSelect.addEventListener('change', () => {
      document.body.classList.remove('preview-mobile', 'preview-tablet', 'preview-desktop');
      const cls = viewportSelect.value;
      if (cls) document.body.classList.add(cls);
    });
    previewHeader.appendChild(viewportSelect);
    document.body.prepend(previewHeader);
    viewportSelect.dispatchEvent(new Event('change'));
  }

  function hidePreviewHeader() {
    if (previewHeader) {
      previewHeader.remove();
      previewHeader = null;
      viewportSelect = null;
    }
    document.body.classList.remove('preview-mobile', 'preview-tablet', 'preview-desktop');
  }

  function scopeThemeCss(css, rootPrefix, contentPrefix) {
    return css.replace(/(^|\})([^@{}]+)\{/g, (m, brace, selectors) => {
      selectors = selectors.trim();
      if (!selectors || selectors.startsWith('@')) return m;
      const scoped = selectors.split(',').map(s => {
        s = s.trim();
        if ([':root', 'html', 'body'].includes(s)) return rootPrefix;
        return `${contentPrefix} ${s}`;
      }).join(', ');
      return `${brace}${scoped}{`;
    });
  }

  async function applyBuilderTheme() {
    const theme = window.ACTIVE_THEME || 'default';
    try {
      const res = await fetch(`/themes/${theme}/theme.css`);
      if (!res.ok) throw new Error('theme css fetch failed');
      const css = await res.text();
      const scoped = scopeThemeCss(css, '#builderGrid', '#builderGrid .builder-themed');
      const style = document.createElement('style');
      style.dataset.builderTheme = theme;
      style.textContent = scoped;
      document.head.appendChild(style);
    } catch (err) {
      console.error('[Builder] failed to apply theme', err);
    }
  }

  function getCssUrls() {
    const theme = window.ACTIVE_THEME || 'default';
    return [
      '/assets/css/site.css',
      `/themes/${theme}/theme.css`
    ];
  }

  const codeMap = {};
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 20;
  let autosaveEnabled = true;
  let autosaveInterval = null;
  let saveTimer = null;
  let lastSavedLayoutStr = '';
  let pendingSave = false;
  let proMode = true;
  const userObservers = new Map();
  let gridEl;
  function handleHtmlUpdate(e) {
    const { instanceId, html } = e.detail || {};
    if (!instanceId || typeof html !== 'string') return;
    codeMap[instanceId] = codeMap[instanceId] || {};
    codeMap[instanceId].html = html;

    const wrapper = gridEl?.querySelector(`.canvas-item[data-instance-id="${instanceId}"]`);
    if (wrapper && wrapper.__codeEditor && wrapper.__codeEditor.style.display !== 'none') {
      const htmlField = wrapper.__codeEditor.querySelector('.editor-html');
      if (htmlField) htmlField.value = html;
    }
  }
  document.addEventListener('widgetHtmlUpdate', handleHtmlUpdate);
  let activeWidgetEl = null;
  const actionBar = document.createElement('div');
  actionBar.className = 'widget-action-bar';
  actionBar.innerHTML = `
    <button class="action-lock"></button>
    <button class="action-duplicate"></button>
    <button class="action-delete"></button>
    <button class="action-menu"></button>
 
  `;
  actionBar.style.display = 'none';
  document.body.appendChild(actionBar);

  const lockBtn = actionBar.querySelector('.action-lock');
  const dupBtn = actionBar.querySelector('.action-duplicate');
  const menuBtn = actionBar.querySelector(".action-menu");
  const delBtn = actionBar.querySelector('.action-delete');

  const setLockIcon = locked => {
    const icon = locked ? 'unlock' : 'lock';
    lockBtn.innerHTML = window.featherIcon
      ? window.featherIcon(icon)
      : `<img src="/assets/icons/${icon}.svg" alt="${icon}" />`;
  };
  dupBtn.innerHTML = window.featherIcon
    ? window.featherIcon('copy')
    : '<img src="/assets/icons/copy.svg" alt="copy" />';
  menuBtn.innerHTML = window.featherIcon
    ? window.featherIcon('more-vertical')
    : '<img src="/assets/icons/more-vertical.svg" alt="menu" />';
  delBtn.innerHTML = window.featherIcon
    ? window.featherIcon('trash')
    : '<img src="/assets/icons/trash.svg" alt="delete" />';

  function startUserMode(widget) {
    const root = widget.querySelector('.canvas-item-content')?.shadowRoot;
    const container = root?.querySelector('.widget-container');
    if (!container) return;
    container.setAttribute('contenteditable', 'true');
    let obs = userObservers.get(widget);
    if (obs) obs.disconnect();
    obs = new MutationObserver(() => {
      const htmlField = widget.__codeEditor?.querySelector('.editor-html');
      if (htmlField) htmlField.value = container.innerHTML;
    });
    obs.observe(container, { childList: true, subtree: true, characterData: true });
    container.addEventListener('input', () => {
      const htmlField = widget.__codeEditor?.querySelector('.editor-html');
      if (htmlField) htmlField.value = container.innerHTML;
    });
    userObservers.set(widget, obs);
  }

  function stopUserMode(widget) {
    const root = widget.querySelector('.canvas-item-content')?.shadowRoot;
    const container = root?.querySelector('.widget-container');
    container?.removeAttribute('contenteditable');
    const obs = userObservers.get(widget);
    if (obs) obs.disconnect();
    userObservers.delete(widget);
  }

  function applyProMode() {
    document.body.classList.toggle('pro-mode', proMode);
    document.querySelectorAll('.widget-edit').forEach(btn => {
      btn.style.display = proMode ? '' : 'none';
    });
    document.querySelectorAll('.canvas-item').forEach(w => {
      if (proMode) {
        stopUserMode(w);
      } else {
        startUserMode(w);
      }
    });
    if (!proMode) {
      document.querySelectorAll('.widget-code-editor').forEach(ed => {
        ed.style.display = 'none';
      });
    }
  }

  function scheduleAutosave() {
    if (!autosaveEnabled || !pageId) return;
    pendingSave = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveCurrentLayout({ autosave: true });
    }, 1000);
  }

  function selectWidget(el) {
    if (!el) return;
    if (activeWidgetEl) activeWidgetEl.classList.remove('selected');
    activeWidgetEl = el;
    activeWidgetEl.classList.add('selected');
    grid.select(el);
    const locked = el.getAttribute('gs-locked') === 'true';
    setLockIcon(locked);
    actionBar.style.display = 'flex';
    actionBar.style.visibility = 'hidden';
    const rect = el.getBoundingClientRect();
    actionBar.style.top = `${rect.top - 28 + window.scrollY}px`;
    actionBar.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
    actionBar.style.visibility = '';
  }

  lockBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!activeWidgetEl) return;
    const locked = activeWidgetEl.getAttribute('gs-locked') === 'true';
    activeWidgetEl.setAttribute('gs-locked', (!locked).toString());
    grid.update(activeWidgetEl, { locked: !locked, noMove: !locked, noResize: !locked });
    setLockIcon(!locked);
    if (pageId) scheduleAutosave();
  });

  dupBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!activeWidgetEl) return;
    const clone = activeWidgetEl.cloneNode(true);
    clone.dataset.instanceId = genId();
    clone.dataset.global = activeWidgetEl.dataset.global || 'false';
    clone.dataset.layer = activeWidgetEl.dataset.layer || String(activeLayer);
    gridEl.appendChild(clone);
    grid.makeWidget(clone);
    const widgetDef = allWidgets.find(w => w.id === clone.dataset.widgetId);
    attachRemoveButton(clone);
    const cEditBtn = attachEditButton(clone, widgetDef);
    attachOptionsMenu(clone, widgetDef, cEditBtn);
    attachLockOnClick(clone);
    renderWidget(clone, widgetDef);
    if (pageId) scheduleAutosave();
  });
  menuBtn.addEventListener("click", e => {
    e.stopPropagation();
    if (!activeWidgetEl || !activeWidgetEl.__optionsMenu) return;
    const menu = activeWidgetEl.__optionsMenu;
    if (menu.style.display === "block" && menu.currentTrigger === menuBtn) {
      menu.hide();
      return;
    }
    menu.show(menuBtn);
  });

  delBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!activeWidgetEl) return;
    const target = activeWidgetEl;
    target.classList.remove('selected');
    grid.removeWidget(target);
    actionBar.style.display = 'none';
    activeWidgetEl = null;
    grid.clearSelection();
    if (pageId) scheduleAutosave();
  });
  const genId = () => `w${Math.random().toString(36).slice(2,8)}`;

  function autoLockWidget(widget, locked) {
    if (!widget) return;
    grid.update(widget, { locked, noMove: locked, noResize: locked });
    if (locked) {
      widget.dataset.tempLock = 'true';
    } else {
      widget.removeAttribute('data-temp-lock');
    }
  }

  function extractCssProps(el) {
    if (!el) return '';
    const style = getComputedStyle(el);
    const props = [
      'color', 'background', 'background-color', 'font-size', 'font-weight',
      'padding', 'margin', 'border', 'border-radius', 'display'
    ];
    return props.map(p => `${p}: ${style.getPropertyValue(p)};`).join('\n');
  }

  function makeSelector(el) {
    if (!el) return '';
    if (el.id) return `#${el.id}`;
    const cls = [...el.classList].join('.');
    const tag = el.tagName.toLowerCase();
    return cls ? `${tag}.${cls}` : tag;
  }

  function wrapCss(css, selector) {
    const trimmed = css.trim();
    if (!trimmed) return '';
    if (!selector || /\{[^}]*\}/.test(trimmed)) return trimmed;
    return `${selector} {\n${trimmed}\n}`;
  }

  function executeJs(code, wrapper, root) {
    if (!code) return;
    const nonce = window.NONCE;
    if (!nonce) {
      console.error('[Builder] missing nonce');
      return;
    }
    code = code.trim();
    // If the code looks like an ES module, execute it via dynamic import
    if (/^import\s|^export\s/m.test(code)) {
      const blob = new Blob([code], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      import(url).then(m => {
        if (typeof m.render === 'function') {
          try { m.render.call(wrapper, root); } catch (err) {
            console.error('[Builder] module render error', err);
          }
        }
        URL.revokeObjectURL(url);
      }).catch(err => {
        console.error('[Builder] module import error', err);
        URL.revokeObjectURL(url);
      });
      return;
    }
    window.__builderRoot = root;
    window.__builderWrapper = wrapper;
    const script = document.createElement('script');
    script.setAttribute('nonce', nonce);
    script.textContent = `(function(root){\n${code}\n}).call(window.__builderWrapper, window.__builderRoot);`;
    document.body.appendChild(script);
    script.remove();
    delete window.__builderRoot;
    delete window.__builderWrapper;
  }

  function getWidgetIcon(w) {
    const iconName = w.metadata?.icon || ICON_MAP[w.id] || w.id;
    return window.featherIcon ? window.featherIcon(iconName) :
      `<img src="/assets/icons/${iconName}.svg" alt="${iconName}" />`;
  }

  function renderWidget(wrapper, widgetDef, customData = null) {
    const instanceId = wrapper.dataset.instanceId;
    const data = customData || codeMap[instanceId] || null;

    const content = wrapper.querySelector('.canvas-item-content');
    content.innerHTML = '';
    const root = content.shadowRoot || content.attachShadow({ mode: 'open' });
    // Clean existing children to avoid duplicates on re-render
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }
    const cssUrls = getCssUrls();
    const style = document.createElement('style');
    style.textContent = `@import url('${cssUrls[0]}');`;
    root.appendChild(style);

    const container = document.createElement('div');
    container.className = 'widget-container';
    container.style.width = '100%';
    container.style.height = '100%';
    // Prevent drag actions when interacting with form controls inside widgets.
    // Attach the handler on both the container and the grid item content so
    // events are intercepted before the grid logic runs.
    const stop = ev => {
      const t = ev.target.closest('input, textarea, select, label, button');
      if (t) {
        ev.stopPropagation();
        ev.stopImmediatePropagation();
      }
    };
    container.addEventListener('pointerdown', stop, true);
    container.addEventListener('mousedown', stop, true);
    container.addEventListener(
      'touchstart',
      stop,
      { capture: true, passive: true }
    );
    content.addEventListener('pointerdown', stop, true);
    content.addEventListener('mousedown', stop, true);
    content.addEventListener(
      'touchstart',
      stop,
      { capture: true, passive: true }
    );
    root.appendChild(container);

    if (data) {
      if (data.css) {
        const customStyle = document.createElement('style');
        customStyle.textContent = data.css;
        root.appendChild(customStyle);
      }
      const themeStyle = document.createElement('style');
      themeStyle.textContent = `@import url('${cssUrls[1]}');`;
      root.appendChild(themeStyle);
      if (data.html) {
        container.innerHTML = data.html;
      }
      if (data.js) {
        try { executeJs(data.js, wrapper, root); } catch (e) { console.error('[Builder] custom js error', e); }
      }
      return;
    }
    const ctx = {
      id: instanceId,
      widgetId: widgetDef.id,
      metadata: widgetDef.metadata
    };
    if (window.ADMIN_TOKEN) {
      ctx.jwt = window.ADMIN_TOKEN;
    }
    const codeUrl = new URL(widgetDef.codeUrl, document.baseURI).href;
    import(codeUrl)
      .then(m => m.render?.(container, ctx))
      .catch(err => console.error('[Builder] widget import error', err));

    const themeStyle = document.createElement('style');
    themeStyle.textContent = `@import url('${cssUrls[1]}');`;
    root.appendChild(themeStyle);
  }

  function attachEditButton(el, widgetDef) {
    const btn = document.createElement('button');
    btn.className = 'widget-edit';
    // Use a gear icon to enter pro mode
    btn.innerHTML = window.featherIcon ? window.featherIcon('settings') : '<img src="/assets/icons/settings.svg" alt="pro" />';
    btn.style.display = proMode ? '' : 'none';
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      stopUserMode(el);
      let overlay = el.__codeEditor;
      let htmlEl, cssEl, jsEl;
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'widget-code-editor';
        overlay.dataset.instanceId = el.dataset.instanceId;
        overlay.innerHTML = `
          <div class="editor-inner">
            <label>HTML</label>
            <textarea class="editor-html"></textarea>
            <label>CSS</label>
            <textarea class="editor-css"></textarea>
            <label>JS</label>
            <textarea class="editor-js"></textarea>
            <div class="editor-actions">
              <button class="media-btn">Insert Image</button>
              <button class="save-btn">Save</button>
              <button class="reset-btn">Reset to Default</button>
              <button class="cancel-btn">Cancel</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);

        htmlEl = overlay.querySelector('.editor-html');
        cssEl = overlay.querySelector('.editor-css');
        jsEl = overlay.querySelector('.editor-js');
        const mediaBtn = overlay.querySelector('.media-btn');
        const updateRender = () => {
          const finalCss = wrapCss(cssEl.value, overlay.currentSelector);
          renderWidget(el, widgetDef, {
            html: htmlEl.value,
            css: finalCss,
            js: jsEl.value
          });
        };

        htmlEl.addEventListener('input', updateRender);
        cssEl.addEventListener('input', updateRender);
        jsEl.addEventListener('input', updateRender);

        mediaBtn.addEventListener('click', async () => {
          try {
            const { shareURL } = await window.meltdownEmit('openMediaExplorer', { jwt: window.ADMIN_TOKEN });
            if (shareURL) {
              const ta = htmlEl;
              const start = ta.selectionStart || 0;
              const end = ta.selectionEnd || 0;
              const safeUrl = shareURL.replace(/"/g, '&quot;');
              const imgTag = `<img src="${safeUrl}" alt="" />`;
              ta.value = ta.value.slice(0, start) + imgTag + ta.value.slice(end);
              ta.focus();
              ta.setSelectionRange(start + imgTag.length, start + imgTag.length);
              updateRender();
            }
          } catch (err) {
            console.error('[Builder] openMediaExplorer error', err);
          }
        });

        overlay.updateRender = updateRender;
        el.__codeEditor = overlay;
      } else {
        overlay.dataset.instanceId = el.dataset.instanceId;
        htmlEl = overlay.querySelector('.editor-html');
        cssEl = overlay.querySelector('.editor-css');
        jsEl = overlay.querySelector('.editor-js');
        const mediaBtn = overlay.querySelector('.media-btn');
        overlay.updateRender = () => {
          const finalCss = wrapCss(cssEl.value, overlay.currentSelector);
          renderWidget(el, widgetDef, {
            html: htmlEl.value,
            css: finalCss,
            js: jsEl.value
          });
        };
        mediaBtn.onclick = async () => {
          try {
            const { shareURL } = await window.meltdownEmit('openMediaExplorer', { jwt: window.ADMIN_TOKEN });
            if (shareURL) {
              const ta = htmlEl;
              const start = ta.selectionStart || 0;
              const end = ta.selectionEnd || 0;
              const safeUrl = shareURL.replace(/"/g, '&quot;');
              const imgTag = `<img src="${safeUrl}" alt="" />`;
              ta.value = ta.value.slice(0, start) + imgTag + ta.value.slice(end);
              ta.focus();
              ta.setSelectionRange(start + imgTag.length, start + imgTag.length);
              overlay.updateRender && overlay.updateRender();
            }
          } catch (err) {
            console.error('[Builder] openMediaExplorer error', err);
          }
        };
      }
      const instId = el.dataset.instanceId;
      const codeData = codeMap[instId] ? { ...codeMap[instId] } : {};

      if (!codeData.sourceJs) {
        try {
          const resp = await fetch(new URL(widgetDef.codeUrl, document.baseURI).href);
          codeData.sourceJs = await resp.text();
        } catch (err) {
          console.error('[Builder] fetch widget source error', err);
          codeData.sourceJs = '';
        }
      }
      if (codeData.html) {
        htmlEl.value = codeData.html;
      } else {
        const root = el.querySelector('.canvas-item-content')?.shadowRoot;
        const container = root?.querySelector('.widget-container');
        htmlEl.value = container ? container.innerHTML.trim() : '';
      }
      overlay.querySelector('.editor-css').value = codeData.css || '';
      jsEl.value = codeData.js || '';
      overlay.defaultJs = codeData.sourceJs || '';
      overlay.currentSelector = codeData.selector || '';

      function pickElement() {
        const root = el.querySelector('.canvas-item-content')?.shadowRoot;
        if (!root) return;
        const handler = ev => {
          ev.preventDefault();
          ev.stopPropagation();
          overlay.currentSelector = makeSelector(ev.target);
          overlay.querySelector('.editor-css').value = extractCssProps(ev.target);
          overlay.updateRender && overlay.updateRender();
          root.removeEventListener('click', handler, true);
        };
        root.addEventListener('click', handler, true);
      }

      pickElement();

      const rect = el.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      overlay.classList.remove('left', 'right');
      overlay.style.display = 'block';
      overlay.style.visibility = 'hidden';
      overlay.style.top = `${rect.top}px`;
      if (spaceRight >= 300 || spaceRight >= spaceLeft) {
        overlay.classList.add('right');
        overlay.style.left = `${rect.right + 8}px`;
      } else {
        overlay.classList.add('left');
        const left = rect.left - overlay.offsetWidth - 8;
        overlay.style.left = `${Math.max(0, left)}px`;
      }
      overlay.style.visibility = '';

      overlay.updateRender && overlay.updateRender();
      overlay.querySelector('.save-btn').onclick = () => {
        const instId = el.dataset.instanceId;
        codeMap[instId] = {
          html: htmlEl.value,
          css: wrapCss(cssEl.value, overlay.currentSelector),
          js: jsEl.value,
          selector: overlay.currentSelector
        };
        overlay.style.display = 'none';
        renderWidget(el, widgetDef);
        if (pageId) scheduleAutosave();
        if (!proMode) startUserMode(el);

      };
      overlay.querySelector('.reset-btn').onclick = () => {
        if (!confirm('Willst du wirklich alle Anpassungen zurücksetzen?')) return;
        const instId = el.dataset.instanceId;
        delete codeMap[instId];
        htmlEl.value = '';
        overlay.querySelector('.editor-css').value = '';
        overlay.querySelector('.editor-js').value = overlay.defaultJs || '';
        overlay.currentSelector = '';
        overlay.updateRender && overlay.updateRender();
        if (pageId) scheduleAutosave();
      };
      overlay.querySelector('.cancel-btn').onclick = () => {
        overlay.style.display = 'none';
        if (!proMode) startUserMode(el);
      };
    });
    el.appendChild(btn);
    return btn;
  }

  let allWidgets = [];
  try {
    const widgetRes = await meltdownEmit('widget.registry.request.v1', {
      lane: 'public',
      moduleName: 'plainspace',
      moduleType: 'core'
    });
    allWidgets = Array.isArray(widgetRes?.widgets) ? widgetRes.widgets : [];
  } catch (err) {
    console.error('[Builder] failed to load widgets', err);
  }

  sidebarEl.querySelector('.drag-icons').innerHTML = allWidgets.map(w => `
    <div class="sidebar-item drag-widget-icon" draggable="true" data-widget-id="${w.id}">
      ${getWidgetIcon(w)}
      <span class="label">${w.metadata.label}</span>
    </div>
  `).join('');

  sidebarEl.querySelectorAll('.drag-widget-icon').forEach(icon => {
    icon.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', icon.dataset.widgetId);
    });
  });

  contentEl.innerHTML = `<div id="builderGrid" class="canvas-grid builder-grid"></div>`;
  gridEl = document.getElementById('builderGrid');
  await applyBuilderTheme();
  // Allow overlapping widgets for layered layouts
  const grid = initCanvasGrid({ cellHeight: 5, columnWidth: 5, pushOnOverlap: false }, gridEl);
  grid.on("dragstart", () => {
    actionBar.style.display = "none";
  });
  grid.on("resizestart", () => {
    actionBar.style.display = "none";
  });
  grid.on("dragstop", () => {
    if (activeWidgetEl) selectWidget(activeWidgetEl);
  });
  grid.on("resizestop", () => {
    if (activeWidgetEl) selectWidget(activeWidgetEl);
  });

  document.addEventListener('textEditStart', e => {
    const widget = e.detail?.widget;
    if (!widget) return;
    if (widget.getAttribute('gs-locked') === 'true') return;
    selectWidget(widget);
    autoLockWidget(widget, true);
  });

  document.addEventListener('textEditStop', e => {
    const widget = e.detail?.widget;
    if (!widget || widget.dataset.tempLock !== 'true') return;
    autoLockWidget(widget, false);
    selectWidget(widget);
  });

  document.addEventListener('focusin', e => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (!['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
    const widget = el.closest('.canvas-item');
    if (!widget || widget.getAttribute('gs-locked') === 'true') return;
    selectWidget(widget);
    autoLockWidget(widget, true);
  });

  document.addEventListener('focusout', e => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (!['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
    const widget = el.closest('.canvas-item');
    if (!widget || widget.dataset.tempLock !== 'true') return;
    const to = e.relatedTarget;
    if (to && widget.contains(to)) return;
    autoLockWidget(widget, false);
    selectWidget(widget);
  });

  document.addEventListener('click', e => {
    if (!activeWidgetEl) return;
    if (e.target.closest('.canvas-item') === activeWidgetEl ||
        e.target.closest('.widget-action-bar')) {
      return;
    }
    actionBar.style.display = 'none';
    activeWidgetEl.classList.remove('selected');
    activeWidgetEl = null;
    grid.clearSelection();
  });

  function getCurrentLayout() {
    const items = Array.from(gridEl.querySelectorAll('.canvas-item'));
    return items.map(el => ({
      id: el.dataset.instanceId,
      widgetId: el.dataset.widgetId,
      global: el.dataset.global === 'true',
      layer: +el.dataset.layer || 0,
      x: +el.dataset.x || 0,
      y: +el.dataset.y || 0,
      w: +el.getAttribute('gs-w'),
      h: +el.getAttribute('gs-h'),
      code: codeMap[el.dataset.instanceId] || null
    }));
  }

  function getCurrentLayoutForLayer(idx) {
    const items = Array.from(gridEl.querySelectorAll(`.canvas-item[data-layer="${idx}"]`));
    return items.map(el => ({
      id: el.dataset.instanceId,
      widgetId: el.dataset.widgetId,
      global: el.dataset.global === 'true',
      x: +el.dataset.x || 0,
      y: +el.dataset.y || 0,
      w: +el.getAttribute('gs-w'),
      h: +el.getAttribute('gs-h'),
      layer: +el.dataset.layer || 0,
      code: codeMap[el.dataset.instanceId] || null
    }));
  }

  function getItemData(el) {
    return {
      widgetId: el.dataset.widgetId,
      w: +el.getAttribute('gs-w'),
      h: +el.getAttribute('gs-h'),
      layer: +el.dataset.layer || 0,
      code: codeMap[el.dataset.instanceId] || null
    };
  }

  function pushState(layout = getCurrentLayout()) {
    undoStack.push(JSON.stringify(layout));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
  }

  function applyLayout(layout, { append = false, layerIndex = activeLayer } = {}) {
    if (!append) {
      gridEl.innerHTML = '';
      Object.keys(codeMap).forEach(k => delete codeMap[k]);
    }
    layout.forEach(item => {
      const widgetDef = allWidgets.find(w => w.id === item.widgetId);
      if (!widgetDef) return;
      const instId = item.id || genId();
      item.id = instId;
      const isGlobal = item.global === true;
      if (item.code) codeMap[instId] = item.code;
      const wrapper = document.createElement('div');
      wrapper.classList.add('canvas-item');
      wrapper.dataset.widgetId = widgetDef.id;
      wrapper.dataset.instanceId = instId;
      wrapper.dataset.global = isGlobal ? 'true' : 'false';
      wrapper.dataset.layer = String(layerIndex);
      wrapper.dataset.x = item.x ?? 0;
      wrapper.dataset.y = item.y ?? 0;
      wrapper.dataset.layer = item.layer ?? 0;
      wrapper.style.zIndex = (item.layer ?? 0).toString();
      wrapper.setAttribute('gs-w', item.w ?? 8);
      wrapper.setAttribute('gs-h', item.h ?? DEFAULT_ROWS);
      wrapper.setAttribute('gs-min-w', 4);
      wrapper.setAttribute('gs-min-h', DEFAULT_ROWS);
      const content = document.createElement('div');
      content.className = 'canvas-item-content builder-themed';
      content.innerHTML = `${getWidgetIcon(widgetDef)}<span>${widgetDef.metadata?.label || widgetDef.id}</span>`;
      wrapper.appendChild(content);
      attachRemoveButton(wrapper);
      const editBtn = attachEditButton(wrapper, widgetDef);
      attachOptionsMenu(wrapper, widgetDef, editBtn);
      attachLockOnClick(wrapper);
      gridEl.appendChild(wrapper);
      grid.makeWidget(wrapper);
      renderWidget(wrapper, widgetDef);
      if (!proMode) startUserMode(wrapper);
    });
    applyProMode();
  }

  function undo() {
    if (undoStack.length < 2) return;
    const current = undoStack.pop();
    redoStack.push(current);
    const prev = JSON.parse(undoStack[undoStack.length - 1]);
    applyLayout(prev);
    if (pageId && autosaveEnabled) scheduleAutosave();
  }

  function redo() {
    if (!redoStack.length) return;
    const next = redoStack.pop();
    undoStack.push(next);
    const layout = JSON.parse(next);
    applyLayout(layout);
    if (pageId && autosaveEnabled) scheduleAutosave();
  }

  function startAutosave() {
    if (autosaveInterval) clearInterval(autosaveInterval);
    if (autosaveEnabled && pageId) {
      autosaveInterval = setInterval(() => {
        if (pendingSave) saveCurrentLayout({ autosave: true });
      }, 30000);
    }
  }

  async function saveCurrentLayout({ autosave = false } = {}) {
    if (!pageId) return;
    const layout = getCurrentLayout();
    const layoutStr = JSON.stringify(layout);
    if (autosave && layoutStr === lastSavedLayoutStr) { pendingSave = false; return; }
    if (!autosave) pushState(layout);
    try {
      await meltdownEmit('saveLayoutForViewport', {
        jwt: window.ADMIN_TOKEN,
        moduleName: 'plainspace',
        moduleType: 'core',
        pageId,
        lane: 'public',
        viewport: 'desktop',
        layout
      });
      lastSavedLayoutStr = layoutStr;
      pendingSave = false;
    } catch (err) {
      console.error('[Builder] saveLayoutForViewport error', err);
    }
  }

  let initialLayout = [];
  let pageData = null;
  if (pageId) {
    try {
      const layoutRes = await meltdownEmit('getLayoutForViewport', {
        jwt: window.ADMIN_TOKEN,
        moduleName: 'plainspace',
        moduleType: 'core',
        pageId,
        lane: 'public',
        viewport: 'desktop'
      });
      initialLayout = Array.isArray(layoutRes?.layout) ? layoutRes.layout : [];

      const pageRes = await meltdownEmit('getPageById', {
        jwt: window.ADMIN_TOKEN,
        moduleName: 'pagesManager',
        moduleType: 'core',
        pageId
      });
      pageData = pageRes?.data ?? pageRes ?? null;

      try {
        const globalRes = await meltdownEmit('getGlobalLayoutTemplate', {
          jwt: window.ADMIN_TOKEN
        });
        layoutLayers[0].layout = Array.isArray(globalRes?.layout) ? globalRes.layout : [];
        globalLayoutName = globalRes?.name || null;
      } catch (err) {
        console.warn('[Builder] failed to load global layout', err);
      }
    } catch (err) {
      console.error('[Builder] load layout or page error', err);
    }
  }
  else {
    try {
      const globalRes = await meltdownEmit('getGlobalLayoutTemplate', {
        jwt: window.ADMIN_TOKEN
      });
      layoutLayers[0].layout = Array.isArray(globalRes?.layout) ? globalRes.layout : [];
      globalLayoutName = globalRes?.name || null;
    } catch (err) {
      console.warn('[Builder] failed to load global layout', err);
    }
  }

  function attachRemoveButton(el) {
    const btn = document.createElement('button');
    btn.className = 'widget-remove';
    btn.innerHTML = window.featherIcon ? window.featherIcon('x') :
      '<img src="/assets/icons/x.svg" alt="remove" />';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      grid.removeWidget(el);
      if (pageId) scheduleAutosave();
    });
    el.appendChild(btn);
    return btn;
  }

  function attachOptionsMenu(el, widgetDef, editBtn) {
    const menuBtn = document.createElement('button');
    menuBtn.className = 'widget-menu';
    menuBtn.innerHTML = window.featherIcon ? window.featherIcon('more-vertical') :
      '<img src="/assets/icons/more-vertical.svg" alt="menu" />';

    const menu = document.createElement('div');
    menu.className = 'widget-options-menu';
    menu.innerHTML = `
      <button class="menu-edit"><img src="/assets/icons/edit.svg" class="icon" alt="edit" /> Edit Code</button>
      <button class="menu-copy"><img src="/assets/icons/copy.svg" class="icon" alt="duplicate" /> Duplicate</button>
      <button class="menu-template"><img src="/assets/icons/package.svg" class="icon" alt="template" /> Save as Template</button>
      <button class="menu-lock"><img src="/assets/icons/lock.svg" class="icon" alt="lock" /> Lock Position</button>
      <button class="menu-snap"><img src="/assets/icons/grid.svg" class="icon" alt="snap" /> Snap to Grid</button>
      <button class="menu-global"><img src="/assets/icons/globe.svg" class="icon" alt="global" /> Set as Global Widget</button>
      <button class="menu-layer-up"><img src="/assets/icons/arrow-up.svg" class="icon" alt="layer up" /> Layer Up</button>
      <button class="menu-layer-down"><img src="/assets/icons/arrow-down.svg" class="icon" alt="layer down" /> Layer Down</button>
    `;
    menu.style.display = 'none';
    document.body.appendChild(menu);

    function hideMenu() {
      menu.style.display = "none";
      document.removeEventListener("click", outsideHandler);
    }

    function showMenu(triggerEl = menuBtn) {
      updateGlobalBtn();
      menu.style.display = "block";
      menu.style.visibility = "hidden";
      const rect = triggerEl.getBoundingClientRect();
      menu.style.top = `${rect.top}px`;
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      if (spaceRight >= menu.offsetWidth || spaceRight >= spaceLeft) {
        menu.style.left = `${rect.right + 4}px`;
      } else {
        const left = rect.left - menu.offsetWidth - 4;
        menu.style.left = `${Math.max(0, left)}px`;
      }
      menu.style.visibility = "";
      menu.currentTrigger = triggerEl;
      document.addEventListener("click", outsideHandler);
    }

    function outsideHandler(ev) {
      if (!menu.contains(ev.target) && ev.target !== menu.currentTrigger) hideMenu();
    }

    menu.show = showMenu;
    menu.hide = hideMenu;

    menuBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (menu.style.display === "block" && menu.currentTrigger === menuBtn) {
        hideMenu();
        return;
      }
      showMenu(menuBtn);
    });

    menu.querySelector('.menu-edit').onclick = () => { editBtn.click(); menu.style.display = 'none'; };
    menu.querySelector('.menu-copy').onclick = () => {
      const clone = el.cloneNode(true);
      clone.dataset.instanceId = genId();
      clone.dataset.global = el.dataset.global || 'false';
      clone.dataset.layer = el.dataset.layer || String(activeLayer);
      gridEl.appendChild(clone);
      grid.makeWidget(clone);
      attachRemoveButton(clone);
      const cEditBtn = attachEditButton(clone, widgetDef);
      attachOptionsMenu(clone, widgetDef, cEditBtn);
      renderWidget(clone, widgetDef);
      menu.style.display = 'none';
    };
    menu.querySelector('.menu-template').onclick = () => {
      const defaultName = widgetDef.metadata?.label || widgetDef.id;
      const name = prompt('Template name:', defaultName);
      if (!name) { menu.style.display = 'none'; return; }
      let templates = [];
      try { templates = JSON.parse(localStorage.getItem('widgetTemplates') || '[]'); } catch {}
      const data = getItemData(el);
      const idx = templates.findIndex(t => t.name === name);
      if (idx !== -1) {
        if (!confirm('Template exists. Override?')) { menu.style.display = 'none'; return; }
        templates[idx].data = data;
        templates[idx].widgetId = widgetDef.id;
        templates[idx].label = widgetDef.metadata?.label || widgetDef.id;
      } else {
        templates.push({ name, widgetId: widgetDef.id, label: widgetDef.metadata?.label || widgetDef.id, data });
      }
      localStorage.setItem('widgetTemplates', JSON.stringify(templates));
      window.dispatchEvent(new Event('widgetTemplatesUpdated'));
      menu.style.display = 'none';
    };
    menu.querySelector('.menu-lock').onclick = () => {
      const locked = el.getAttribute('gs-locked') === 'true';
      el.setAttribute('gs-locked', (!locked).toString());
      grid.update(el, { locked: !locked, noMove: !locked, noResize: !locked });
      menu.style.display = 'none';
    };
    menu.querySelector('.menu-snap').onclick = () => {
      grid.update(el, {
        x: Math.round(+el.dataset.x || 0),
        y: Math.round(+el.dataset.y || 0),
        w: Math.round(+el.getAttribute('gs-w')),
        h: Math.round(+el.getAttribute('gs-h'))
      });
      if (pageId) scheduleAutosave();
      menu.style.display = 'none';
    };
    const globalBtn = menu.querySelector('.menu-global');
    function updateGlobalBtn() {
      const isGlobal = el.dataset.global === 'true';
      globalBtn.innerHTML = `<img src="/assets/icons/globe.svg" class="icon" alt="global" /> ${isGlobal ? 'Unset Global' : 'Set as Global Widget'}`;
    }
    globalBtn.onclick = () => {
      const isGlobal = el.dataset.global === 'true';
      if (isGlobal) {
        el.dataset.global = 'false';
        el.dataset.instanceId = genId();
      } else {
        el.dataset.global = 'true';
        el.dataset.instanceId = `global-${widgetDef.id}`;
      }
      updateGlobalBtn();
      menu.style.display = 'none';
      if (pageId) scheduleAutosave();
    };

    menu.querySelector('.menu-layer-up').onclick = () => {
      const layer = (+el.dataset.layer || 0) + 1;
      el.dataset.layer = layer;
      el.style.zIndex = layer.toString();
      menu.style.display = 'none';
      if (pageId) scheduleAutosave();
    };

    menu.querySelector('.menu-layer-down').onclick = () => {
      let layer = (+el.dataset.layer || 0) - 1;
      if (layer < 0) layer = 0;
      el.dataset.layer = layer;
      el.style.zIndex = layer.toString();
      menu.style.display = 'none';
      if (pageId) scheduleAutosave();
    };

    el.appendChild(menuBtn);
    el.__optionsMenu = menu;
  }

  function attachLockOnClick(el) {
    el.addEventListener('click', e => {
      if (!e.target.closest('.canvas-item-content')) return;
      if (e.target.closest('.widget-action-bar')) return;
      e.stopPropagation();
      selectWidget(el);
    });

    // Widgets used to lock when any form input gained focus. This caused
    // unexpected locks during normal interactions. Auto-locking now only
    // occurs after clicking inside a text field via the global editor.
  }


  layoutLayers[0].layout = initialLayout;
  applyCompositeLayout(0);
  pushState(initialLayout);

  gridEl.addEventListener('dragover',  e => { e.preventDefault(); gridEl.classList.add('drag-over'); });
  gridEl.addEventListener('dragleave', () => gridEl.classList.remove('drag-over'));
  gridEl.addEventListener('drop', async e => {
    e.preventDefault();
    gridEl.classList.remove('drag-over');
    const widgetId = e.dataTransfer.getData('text/plain');
    const widgetDef = allWidgets.find(w => w.id === widgetId);
    if (!widgetDef) return;

    const rect = gridEl.getBoundingClientRect();
    let relX = 0, relY = 0;
    if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      relX = e.clientX - rect.left;
      relY = e.clientY - rect.top;
    } else if (e.touches && e.touches[0]) {
      relX = e.touches[0].clientX - rect.left;
      relY = e.touches[0].clientY - rect.top;
    } else {
      relX = (e.offsetX || 0) - rect.left;
      relY = (e.offsetY || 0) - rect.top;
    }
    const [x, y, w, h] = [
      Math.floor((relX / rect.width) * 64) || 0,
      Math.floor((relY / rect.height) * 6) || 0,
      8,
      DEFAULT_ROWS
    ];

    const instId = genId();

    const wrapper = document.createElement('div');
    wrapper.classList.add('canvas-item');
    wrapper.dataset.widgetId = widgetDef.id;
    wrapper.dataset.instanceId = instId;
    wrapper.dataset.global = 'false';
    wrapper.dataset.layer = String(activeLayer);
    wrapper.dataset.x = x;
    wrapper.dataset.y = y;
    wrapper.style.zIndex = '0';
    wrapper.setAttribute('gs-w', w);
    wrapper.setAttribute('gs-h', h);
    wrapper.setAttribute('gs-min-w', 4);
    wrapper.setAttribute('gs-min-h', DEFAULT_ROWS);

    const content = document.createElement('div');
    content.className = 'canvas-item-content builder-themed';
    content.innerHTML = `${getWidgetIcon(widgetDef)}<span>${widgetDef.metadata?.label || widgetDef.id}</span>`;
    wrapper.appendChild(content);
    attachRemoveButton(wrapper);
    const editBtn2 = attachEditButton(wrapper, widgetDef);
    attachOptionsMenu(wrapper, widgetDef, editBtn2);
    attachLockOnClick(wrapper);
    gridEl.appendChild(wrapper);
    grid.makeWidget(wrapper);

    renderWidget(wrapper, widgetDef);
    if (pageId) scheduleAutosave();
  });

  const topBar = document.createElement('header');
  topBar.id = 'builder-header';
  topBar.className = 'builder-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'builder-back-btn';
  backBtn.innerHTML = window.featherIcon ? window.featherIcon('arrow-left') :
    '<img src="/assets/icons/arrow-left.svg" alt="Back" />';
  backBtn.addEventListener('click', () => history.back());
  topBar.appendChild(backBtn);

  let pageSelect = null;
  const layoutName = pageData?.meta?.layoutTemplate || 'default';

  const infoWrap = document.createElement('div');
  infoWrap.className = 'layout-info';

  const nameInput = document.createElement('input');
  nameInput.id = 'layoutNameInput';
  nameInput.className = 'layout-name-input';
  nameInput.placeholder = 'Layout name…';
  nameInput.value = layoutName;
  infoWrap.appendChild(nameInput);

  const globalToggle = document.createElement('input');
  globalToggle.type = 'checkbox';
  globalToggle.id = 'layoutIsGlobal';
  globalToggle.className = 'global-layout-toggle';
  if (layoutName === globalLayoutName) globalToggle.checked = true;
  infoWrap.appendChild(globalToggle);
  const globalLabel = document.createElement('label');
  globalLabel.textContent = 'Global';
  globalLabel.setAttribute('for', 'layoutIsGlobal');
  infoWrap.appendChild(globalLabel);

  const editFor = document.createElement('span');
  editFor.textContent = 'editing for';
  infoWrap.appendChild(editFor);

  if (pageData?.title) {
    const pageLink = document.createElement('a');
    pageLink.className = 'page-link';
    pageLink.href = `/admin/pages/edit/${pageId}`;
    pageLink.textContent = pageData.title;
    infoWrap.appendChild(pageLink);
  } else {
    const none = document.createElement('span');
    none.textContent = 'not attached to a page';
    infoWrap.appendChild(none);

    pageSelect = document.createElement('select');
    pageSelect.className = 'page-select';
    pageSelect.multiple = true;
    try {
      const { pages = [] } = await meltdownEmit('getPagesByLane', {
        jwt: window.ADMIN_TOKEN,
        moduleName: 'pagesManager',
        moduleType: 'core',
        lane: 'public'
      });
      (Array.isArray(pages) ? pages : []).forEach(p => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.title;
        pageSelect.appendChild(o);
      });
    } catch (err) {
      console.warn('[Builder] failed to load pages', err);
    }
    infoWrap.appendChild(pageSelect);
  }

  topBar.appendChild(infoWrap);

  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveLayoutBtn';
  saveBtn.className = 'builder-save-btn';
  saveBtn.innerHTML = window.featherIcon ? window.featherIcon('save') :
    '<img src="/assets/icons/save.svg" alt="Save" />';
  topBar.appendChild(saveBtn);

  const previewBtn = document.createElement('button');
  previewBtn.id = 'previewLayoutBtn';
  previewBtn.className = 'builder-preview-btn';
  previewBtn.innerHTML = window.featherIcon ? window.featherIcon('eye') :
    '<img src="/assets/icons/eye.svg" alt="Preview" />';
  topBar.appendChild(previewBtn);

  const headerMenuBtn = document.createElement('button');
  headerMenuBtn.className = 'builder-menu-btn';
  headerMenuBtn.innerHTML = window.featherIcon
    ? window.featherIcon('more-vertical')
    : '<img src="/assets/icons/more-vertical.svg" alt="menu" />';
  topBar.appendChild(headerMenuBtn);

  const headerMenu = document.createElement('div');
  headerMenu.className = 'builder-options-menu';
  headerMenu.innerHTML = `
    <button class="menu-undo"><img src="/assets/icons/rotate-ccw.svg" class="icon" alt="undo" /> Undo</button>
    <button class="menu-redo"><img src="/assets/icons/rotate-cw.svg" class="icon" alt="redo" /> Redo</button>
    <label class="menu-autosave"><input type="checkbox" class="autosave-toggle" checked /> Autosave</label>
    <label class="menu-pro"><input type="checkbox" class="pro-toggle" checked /> Pro Mode</label>
  `;
  headerMenu.style.display = 'none';
  document.body.appendChild(headerMenu);

  function hideHeaderMenu() {
    headerMenu.style.display = 'none';
    document.removeEventListener('click', outsideHeaderHandler);
  }

  function outsideHeaderHandler(e) {
    if (!headerMenu.contains(e.target) && e.target !== headerMenuBtn) hideHeaderMenu();
  }

  headerMenuBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (headerMenu.style.display === 'block') { hideHeaderMenu(); return; }
    headerMenu.style.display = 'block';
    headerMenu.style.visibility = 'hidden';
    const rect = headerMenuBtn.getBoundingClientRect();
    headerMenu.style.top = `${rect.bottom + 4}px`;
    headerMenu.style.left = `${rect.right - headerMenu.offsetWidth}px`;
    headerMenu.style.visibility = '';
    document.addEventListener('click', outsideHeaderHandler);
  });

  headerMenu.querySelector('.menu-undo').addEventListener('click', () => { hideHeaderMenu(); undo(); });
  headerMenu.querySelector('.menu-redo').addEventListener('click', () => { hideHeaderMenu(); redo(); });
  const autosaveToggle = headerMenu.querySelector('.autosave-toggle');
  autosaveToggle.checked = autosaveEnabled;
  autosaveToggle.addEventListener('change', () => {
    autosaveEnabled = autosaveToggle.checked;
    startAutosave();
  });
  const proToggle = headerMenu.querySelector('.pro-toggle');
  proToggle.checked = proMode;
  proToggle.addEventListener('change', () => {
    proMode = proToggle.checked;
    applyProMode();
  });

  const appScope = document.querySelector('.app-scope');
  const mainContent = document.querySelector('.main-content');
  if (appScope) {
    appScope.prepend(topBar);
  } else if (contentEl) {
    contentEl.prepend(topBar);
  }

  startAutosave();
  applyProMode();
  buildLayoutBar();

  saveBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) { alert('Enter a name'); return; }
    const layout = getCurrentLayout();
    try {
      await meltdownEmit('saveLayoutTemplate', {
        jwt: window.ADMIN_TOKEN,
        moduleName: 'plainspace',
        name,
        lane: 'public',
        viewport: 'desktop',
        layout,
        isGlobal: globalToggle.checked
      });

      const targetIds = pageId
        ? [pageId]
        // Keep IDs as strings so MongoDB ObjectIds are preserved. Postgres
        // automatically casts numeric strings to integers.
        : Array.from(pageSelect?.selectedOptions || []).map(o => o.value);

      const events = targetIds.map(id => ({
        eventName: 'saveLayoutForViewport',
        payload: {
          jwt: window.ADMIN_TOKEN,
          moduleName: 'plainspace',
          moduleType: 'core',
          pageId: id,
          lane: 'public',
          viewport: 'desktop',
          layout
        }
      }));

      await meltdownEmitBatch(events);

      if (globalToggle.checked) {
        await meltdownEmit('setGlobalLayoutTemplate', { jwt: window.ADMIN_TOKEN, name });
      }

      alert('Layout template saved');
    } catch (err) {
      console.error('[Builder] saveLayoutTemplate error', err);
      alert('Save failed: ' + err.message);
    }
  });

  previewBtn.addEventListener('click', () => {
    const active = document.body.classList.toggle('preview-mode');
    if (window.featherIcon) {
      previewBtn.innerHTML = window.featherIcon(active ? 'eye-off' : 'eye');
    } else {
      const icon = active ? 'eye-off' : 'eye';
      previewBtn.innerHTML = `<img src="/assets/icons/${icon}.svg" alt="Preview" />`;
    }
    if (active) {
      showPreviewHeader();
    } else {
      hidePreviewHeader();
    }
  });

  let versionEl = document.getElementById('builderVersion');
  if (!versionEl) {
    versionEl = document.createElement('div');
    versionEl.id = 'builderVersion';
    versionEl.className = 'builder-version';
    document.body.appendChild(versionEl);
  }

  const builderVersion = window.PLAINSPACE_VERSION;

  if (builderVersion) {
    versionEl.textContent = `${builderVersion} builder still in alpha expect breaking changes`;
  } else {
    versionEl.textContent = 'builder still in alpha expect breaking changes';
  }

  function saveActiveLayer() {
    layoutLayers[activeLayer].layout = getCurrentLayoutForLayer(activeLayer);
  }

  function updateLayoutBar() {
    if (!layoutBar) return;
    layoutBar.querySelectorAll('button').forEach((btn, idx) => {
      btn.classList.toggle('active', idx === activeLayer);
    });
  }

  function applyCompositeLayout(idx) {
    gridEl.innerHTML = '';
    Object.keys(codeMap).forEach(k => delete codeMap[k]);
    applyLayout(layoutLayers[0].layout, { append: false, layerIndex: 0 });
    if (idx !== 0) {
      applyLayout(layoutLayers[idx].layout, { append: true, layerIndex: idx });
    }
  }

  function switchLayer(idx) {
    if (idx === activeLayer) return;
    saveActiveLayer();
    activeLayer = idx;
    applyCompositeLayout(idx);
    updateLayoutBar();
  }

  function buildLayoutBar() {
    layoutBar = document.createElement('div');
    layoutBar.className = 'layout-bar';
    layoutLayers.forEach((layer, idx) => {
      const btn = document.createElement('button');
      btn.textContent = idx === 0 ? 'Global' : `Layer ${idx}`;
      if (idx === activeLayer) btn.classList.add('active');
      btn.addEventListener('click', () => switchLayer(idx));
      layoutBar.appendChild(btn);
    });
    document.body.appendChild(layoutBar);
  }

}
