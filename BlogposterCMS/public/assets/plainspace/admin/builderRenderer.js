// public/assets/plainspace/admin/builderRenderer.js
// Dynamically load the Quill helper. Using a fully qualified URL ensures
// the module can be resolved even when this file runs from a `blob:` URL
// (for example when evaluating user-provided code in the builder).
const quillModuleUrl = new URL('/assets/js/quillEditor.js', document.baseURI).href;

let initQuill;

export async function initBuilder(sidebarEl, contentEl, pageId = null) {
  if (!initQuill) {
    ({ initQuill } = await import(quillModuleUrl));
  }
  document.body.classList.add('builder-mode');
  // Temporary patch: larger default widget height
  const DEFAULT_ROWS = 20; // around 100px with 5px grid cells
  const ICON_MAP = {
    counter: 'activity',
    heroBanner: 'image',
    textBlock: 'align-left',
    imageWidget: 'image',
    headingWidget: 'type',
    buttonWidget: 'mouse-pointer',
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
    contentSummary: 'activity'
  };

  function getGlobalCssUrl() {
    return '/assets/css/site.css';
  }

  const codeMap = {};
  const genId = () => `w${Math.random().toString(36).slice(2,8)}`;

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

    const content = wrapper.querySelector('.grid-stack-item-content');
    content.innerHTML = '';
    const root = content.shadowRoot || content.attachShadow({ mode: 'open' });
    // Clean existing children to avoid duplicates on re-render
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }
    const globalCss = getGlobalCssUrl();

    const style = document.createElement('style');
    style.textContent = `@import url('${globalCss}');`;
    root.appendChild(style);

    const container = document.createElement('div');
    container.className = 'widget-container';
    // Prevent GridStack from initiating a drag when interacting
    // with form controls inside widgets. Attach the handler on both the
    // container and the grid item content to catch events before GridStack
    // can start a drag operation.
    const stop = ev => {
      const t = ev.target.closest('input, textarea, select, label, button');
      if (t) {
        ev.stopPropagation();
        ev.stopImmediatePropagation();
      }
    };
    container.addEventListener('pointerdown', stop, true);
    container.addEventListener('mousedown', stop, true);
    container.addEventListener('touchstart', stop, true);
    content.addEventListener('pointerdown', stop, true);
    content.addEventListener('mousedown', stop, true);
    content.addEventListener('touchstart', stop, true);
    root.appendChild(container);

    if (data) {
      if (data.css) {
        const customStyle = document.createElement('style');
        customStyle.textContent = data.css;
        root.appendChild(customStyle);
      }
      if (data.html) {
        container.innerHTML = data.html;
      }
      if (data.js) {
        try { executeJs(data.js, wrapper, root); } catch (e) { console.error('[Builder] custom js error', e); }
      }
      return;
    }
    import(widgetDef.codeUrl).then(m => m.render?.(container)).catch(err => console.error('[Builder] widget import error', err));
  }

  function attachEditButton(el, widgetDef) {
    const btn = document.createElement('button');
    btn.className = 'widget-edit';
    btn.innerHTML = window.featherIcon ? window.featherIcon('edit') : '<img src="/assets/icons/edit.svg" alt="edit" />';
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      let overlay = el.__codeEditor;
      let quill;
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'widget-code-editor';
        overlay.innerHTML = `
          <div class="editor-inner">
            <label>HTML</label>
            <div class="editor-html quill-editor"></div>
            <label>CSS</label>
            <textarea class="editor-css"></textarea>
            <label>JS</label>
            <textarea class="editor-js"></textarea>
            <div class="editor-actions">
              <button class="save-btn">Save</button>
              <button class="reset-btn">Reset to Default</button>
              <button class="cancel-btn">Cancel</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);

        const htmlEl = overlay.querySelector('.editor-html');
        quill = initQuill(htmlEl);
        overlay.__quill = quill;
        const cssEl = overlay.querySelector('.editor-css');
        const jsEl = overlay.querySelector('.editor-js');
        const updateRender = () => {
          const finalCss = wrapCss(cssEl.value, overlay.currentSelector);
          renderWidget(el, widgetDef, {
            html: quill.root.innerHTML,
            css: finalCss,
            js: jsEl.value
          });
        };

        quill.on('text-change', updateRender);
        cssEl.addEventListener('input', updateRender);
        jsEl.addEventListener('input', updateRender);

        overlay.updateRender = updateRender;
        el.__codeEditor = overlay;
      } else {
        quill = overlay.__quill;
      }
      const instId = el.dataset.instanceId;
      const codeData = codeMap[instId] ? { ...codeMap[instId] } : {};

      if (!codeData.sourceJs) {
        try {
          const resp = await fetch(widgetDef.codeUrl);
          codeData.sourceJs = await resp.text();
        } catch (err) {
          console.error('[Builder] fetch widget source error', err);
          codeData.sourceJs = '';
        }
      }
      quill.root.innerHTML = codeData.html || '';
      overlay.querySelector('.editor-css').value = codeData.css || '';
      overlay.querySelector('.editor-js').value = codeData.js || codeData.sourceJs || '';
      overlay.currentSelector = codeData.selector || '';

      function pickElement() {
        const root = el.querySelector('.grid-stack-item-content')?.shadowRoot;
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
          html: quill.root.innerHTML,
          css: wrapCss(overlay.querySelector('.editor-css').value, overlay.currentSelector),
          js: overlay.querySelector('.editor-js').value,
          selector: overlay.currentSelector
        };
        overlay.style.display = 'none';
        renderWidget(el, widgetDef);
        if (pageId) saveCurrentLayout();

      };
      overlay.querySelector('.reset-btn').onclick = () => {
        if (!confirm('Willst du wirklich alle Anpassungen zurücksetzen?')) return;
        const instId = el.dataset.instanceId;
        delete codeMap[instId];
        quill.root.innerHTML = '';
        overlay.querySelector('.editor-css').value = '';
        overlay.querySelector('.editor-js').value = codeData.sourceJs || '';
        overlay.currentSelector = '';
        overlay.updateRender && overlay.updateRender();
        if (pageId) saveCurrentLayout();
      };
      overlay.querySelector('.cancel-btn').onclick = () => {
        overlay.style.display = 'none';
      };
    });
    el.appendChild(btn);
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

  contentEl.innerHTML = `<div id="builderGrid" class="grid-stack builder-grid"></div>`;
  const gridEl = document.getElementById('builderGrid');
  // Enable floating mode for easier widget placement in the builder
  const grid = GridStack.init({ float: true, cellHeight: 5, columnWidth: 5, column: 64 }, gridEl);

  function getCurrentLayout() {
    const items = Array.from(gridEl.querySelectorAll('.grid-stack-item'));
    return items.map(el => ({
      id: el.dataset.instanceId,
      widgetId: el.dataset.widgetId,
      x: +el.getAttribute('gs-x'),
      y: +el.getAttribute('gs-y'),
      w: +el.getAttribute('gs-w'),
      h: +el.getAttribute('gs-h'),
      code: codeMap[el.dataset.instanceId] || null
    }));
  }

  async function saveCurrentLayout() {
    if (!pageId) return;
    const layout = getCurrentLayout();
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
    } catch (err) {
      console.error('[Builder] load layout or page error', err);
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
      if (pageId) saveCurrentLayout();
    });
    el.appendChild(btn);
  }


  initialLayout.forEach(item => {
    const widgetDef = allWidgets.find(w => w.id === item.widgetId);
    if (!widgetDef) return;
    const instId = item.id || genId();
    item.id = instId;
    if (item.code) codeMap[instId] = item.code;
    const wrapper = document.createElement('div');
    wrapper.classList.add('grid-stack-item');
    wrapper.dataset.widgetId = widgetDef.id;
    wrapper.dataset.instanceId = instId;
    wrapper.setAttribute('gs-x', item.x ?? 0);
    wrapper.setAttribute('gs-y', item.y ?? 0);
    // Larger defaults for builder widgets
    wrapper.setAttribute('gs-w', item.w ?? 8);
    wrapper.setAttribute('gs-h', item.h ?? DEFAULT_ROWS);
    wrapper.setAttribute('gs-min-w', 4);
    wrapper.setAttribute('gs-min-h', DEFAULT_ROWS);
    const content = document.createElement('div');
    content.className = 'grid-stack-item-content';
    content.innerHTML = `${getWidgetIcon(widgetDef)}<span>${widgetDef.metadata?.label || widgetDef.id}</span>`;
    wrapper.appendChild(content);
    attachRemoveButton(wrapper);
    attachEditButton(wrapper, widgetDef);
    gridEl.appendChild(wrapper);
    grid.makeWidget(wrapper);
    renderWidget(wrapper, widgetDef);
    if (pageId) saveCurrentLayout();

  });

  gridEl.addEventListener('dragover',  e => { e.preventDefault(); gridEl.classList.add('drag-over'); });
  gridEl.addEventListener('dragleave', () => gridEl.classList.remove('drag-over'));
  gridEl.addEventListener('drop', async e => {
    e.preventDefault(); gridEl.classList.remove('drag-over');
    const widgetId = e.dataTransfer.getData('text/plain');
    const widgetDef = allWidgets.find(w => w.id === widgetId);
    if (!widgetDef) return;

    const [x, y, w, h] = [
      Math.floor((e.offsetX / gridEl.offsetWidth) * 64) || 0,
      Math.floor((e.offsetY / gridEl.offsetHeight) * 6) || 0,
      8, DEFAULT_ROWS
    ];

    const instId = genId();

    const wrapper = document.createElement('div');
    wrapper.classList.add('grid-stack-item');
    wrapper.dataset.widgetId = widgetDef.id;
    wrapper.dataset.instanceId = instId;
    wrapper.setAttribute('gs-x', x);
    wrapper.setAttribute('gs-y', y);
    wrapper.setAttribute('gs-w', w);
    wrapper.setAttribute('gs-h', h);
    wrapper.setAttribute('gs-min-w', 4);
    wrapper.setAttribute('gs-min-h', DEFAULT_ROWS);

    const content = document.createElement('div');
    content.className = 'grid-stack-item-content';
    content.innerHTML = `${getWidgetIcon(widgetDef)}<span>${widgetDef.metadata?.label || widgetDef.id}</span>`;
    wrapper.appendChild(content);
    attachRemoveButton(wrapper);
    attachEditButton(wrapper, widgetDef);
    gridEl.appendChild(wrapper);
    grid.makeWidget(wrapper);

    renderWidget(wrapper, widgetDef);
    if (pageId) saveCurrentLayout();
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

  const appScope = document.querySelector('.app-scope');
  const mainContent = document.querySelector('.main-content');
  if (appScope && mainContent) {
    appScope.insertBefore(topBar, mainContent);
  } else {
    contentEl.prepend(topBar);
  }

  saveBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) { alert('Enter a name'); return; }
    const layout = getCurrentLayout();
    try {
      await meltdownEmit('saveLayoutTemplate', {
        moduleName: 'plainspace',
        name,
        lane: 'public',
        viewport: 'desktop',
        layout
      });

      const targetIds = pageId
        ? [pageId]
        : Array.from(pageSelect?.selectedOptions || []).map(o => parseInt(o.value, 10));
      for (const id of targetIds) {
        await meltdownEmit('saveLayoutForViewport', {
          jwt: window.ADMIN_TOKEN,
          moduleName: 'plainspace',
          moduleType: 'core',
          pageId: id,
          lane: 'public',
          viewport: 'desktop',
          layout
        });
      }

      alert('Layout template saved');
    } catch (err) {
      console.error('[Builder] saveLayoutTemplate error', err);
      alert('Save failed: ' + err.message);
    }
  });
}
