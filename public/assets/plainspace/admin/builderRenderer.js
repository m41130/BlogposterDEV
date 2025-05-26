// public/assets/plainspace/admin/builderRenderer.js
export async function initBuilder(sidebarEl, contentEl, pageId = null) {
  document.body.classList.add('builder-mode');
  const DEFAULT_ROWS = 10; // around 50px with 5px grid cells
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

  const codeMap = {};

  function getWidgetIcon(w) {
    const iconName = w.metadata?.icon || ICON_MAP[w.id] || w.id;
    return window.featherIcon ? window.featherIcon(iconName) :
      `<img src="/assets/icons/${iconName}.svg" alt="${iconName}" />`;
  }

  function renderWidget(wrapper, widgetDef) {
    const data = codeMap[widgetDef.id] || null;

    const content = wrapper.querySelector('.grid-stack-item-content');
    content.innerHTML = '';
    const root = content.shadowRoot || content.attachShadow({ mode: 'open' });
    root.innerHTML = '';
    if (data) {
      root.innerHTML = `<style>${data.css || ''}</style>${data.html || ''}`;
      if (data.js) {
        try { new Function('root', data.js).call(wrapper, root); } catch (e) { console.error('[Builder] custom js error', e); }
      }
      return;
    }
    import(widgetDef.codeUrl).then(m => m.render?.(root)).catch(err => console.error('[Builder] widget import error', err));
  }

  function attachEditButton(el, widgetDef) {
    const btn = document.createElement('button');
    btn.className = 'widget-edit';
    btn.innerHTML = window.featherIcon ? window.featherIcon('edit') : '<img src="/assets/icons/edit.svg" alt="edit" />';
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      let overlay = el.querySelector('.widget-code-editor');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'widget-code-editor';
        overlay.innerHTML = `
          <div class="editor-inner">
            <label>HTML</label>
            <textarea class="editor-html"></textarea>
            <label>CSS</label>
            <textarea class="editor-css"></textarea>
            <label>JS</label>
            <textarea class="editor-js"></textarea>
            <div class="editor-actions">
              <button class="save-btn">Save</button>
              <button class="cancel-btn">Cancel</button>
            </div>
          </div>`;
        el.appendChild(overlay);
      }
      const codeData = codeMap[widgetDef.id] ? { ...codeMap[widgetDef.id] } : {};

      if (!codeData.sourceJs) {
        try {
          const resp = await fetch(widgetDef.codeUrl);
          codeData.sourceJs = await resp.text();
        } catch (err) {
          console.error('[Builder] fetch widget source error', err);
          codeData.sourceJs = '';
        }
      }
      overlay.querySelector('.editor-html').value = codeData.html || '';
      overlay.querySelector('.editor-css').value = codeData.css || '';
      overlay.querySelector('.editor-js').value = codeData.js || codeData.sourceJs || '';
      overlay.style.display = 'block';
      overlay.querySelector('.save-btn').onclick = () => {
        codeMap[widgetDef.id] = {
          html: overlay.querySelector('.editor-html').value,
          css: overlay.querySelector('.editor-css').value,
          js: overlay.querySelector('.editor-js').value
        };
        overlay.style.display = 'none';
        renderWidget(el, widgetDef);
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
      widgetId: el.dataset.widgetId,
      x: +el.getAttribute('gs-x'),
      y: +el.getAttribute('gs-y'),
      w: +el.getAttribute('gs-w'),
      h: +el.getAttribute('gs-h'),
      code: codeMap[el.dataset.widgetId] || null
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
    });
    el.appendChild(btn);
  }


  initialLayout.forEach(item => {
    const widgetDef = allWidgets.find(w => w.id === item.widgetId);
    if (!widgetDef) return;
    if (item.code) codeMap[widgetDef.id] = item.code;
    const wrapper = document.createElement('div');
    wrapper.classList.add('grid-stack-item');
    wrapper.dataset.widgetId = widgetDef.id;
    wrapper.setAttribute('gs-x', item.x ?? 0);
    wrapper.setAttribute('gs-y', item.y ?? 0);
    wrapper.setAttribute('gs-w', item.w ?? 4);
    wrapper.setAttribute('gs-h', item.h ?? DEFAULT_ROWS);
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
      4, DEFAULT_ROWS
    ];

    const wrapper = document.createElement('div');
    wrapper.classList.add('grid-stack-item');
    wrapper.dataset.widgetId = widgetDef.id;
    wrapper.setAttribute('gs-x', x);
    wrapper.setAttribute('gs-y', y);
    wrapper.setAttribute('gs-w', w);
    wrapper.setAttribute('gs-h', h);

    const content = document.createElement('div');
    content.className = 'grid-stack-item-content';
    content.innerHTML = `${getWidgetIcon(widgetDef)}<span>${widgetDef.metadata?.label || widgetDef.id}</span>`;
    wrapper.appendChild(content);
    attachRemoveButton(wrapper);
    attachEditButton(wrapper, widgetDef);
    gridEl.appendChild(wrapper);
    grid.makeWidget(wrapper);

    renderWidget(wrapper, widgetDef);
  });

  const topBar = document.createElement('div');
  topBar.className = 'builder-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'builder-back-btn';
  backBtn.innerHTML = window.featherIcon ? window.featherIcon('arrow-left') :
    '<img src="/assets/icons/arrow-left.svg" alt="Back" />';
  backBtn.addEventListener('click', () => history.back());
  topBar.appendChild(backBtn);

  let nameInput = null;
  let pageSelect = null;
  let layoutName = pageData?.meta?.layoutTemplate || '';

  const infoWrap = document.createElement('div');
  infoWrap.className = 'layout-info';

  if (layoutName) {
    const nameSpan = document.createElement('span');
    nameSpan.className = 'layout-name';
    nameSpan.textContent = layoutName;
    nameSpan.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); nameSpan.blur(); }
    });
    nameSpan.addEventListener('blur', () => {
      layoutName = nameSpan.textContent.trim();
      nameSpan.contentEditable = 'false';
    });
    const editIcon = document.createElement('span');
    editIcon.className = 'edit-name-icon';
    editIcon.innerHTML = window.featherIcon ? window.featherIcon('edit') :
      '<img src="/assets/icons/edit-2.svg" alt="Edit" />';
    editIcon.addEventListener('click', () => {
      nameSpan.contentEditable = 'true';
      nameSpan.focus();
    });
    const nameWrap = document.createElement('span');
    nameWrap.appendChild(nameSpan);
    nameWrap.appendChild(editIcon);
    infoWrap.appendChild(nameWrap);
  } else {
    nameInput = document.createElement('input');
    nameInput.id = 'layoutNameInput';
    nameInput.className = 'layout-name-input';
    nameInput.placeholder = 'Layout name…';
    infoWrap.appendChild(nameInput);
  }

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

  contentEl.prepend(topBar);

  saveBtn.addEventListener('click', async () => {
    const name = nameInput ? nameInput.value.trim() : (layoutName || '').trim();
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
