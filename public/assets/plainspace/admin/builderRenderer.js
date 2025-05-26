// public/assets/plainspace/admin/builderRenderer.js
export async function initBuilder(sidebarEl, contentEl, allWidgets, pageId = null) {
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

  function getWidgetIcon(w) {
    const iconName = w.metadata?.icon || ICON_MAP[w.id] || w.id;
    return window.featherIcon ? window.featherIcon(iconName) :
      `<img src="/assets/icons/${iconName}.svg" alt="${iconName}" />`;
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

  let initialLayout = [];
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
    } catch (err) {
      console.error('[Builder] load layout error', err);
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
    gridEl.appendChild(wrapper);
    grid.makeWidget(wrapper);
    import(widgetDef.codeUrl).then(m => m.render?.(content))
      .catch(err => console.error('[Builder] widget import error', err));
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
    gridEl.appendChild(wrapper);
    grid.makeWidget(wrapper);

    import(widgetDef.codeUrl).then(m => m.render?.(content))
      .catch(err => console.error('[Builder] widget import error', err));
  });

  const controls = document.createElement('div');
  controls.className = 'builder-controls-bar';
  controls.innerHTML = `
    <input id="layoutNameInput" placeholder="Layout name…" />
    <button id="saveLayoutBtn">💾 Save Layout</button>`;
  contentEl.prepend(controls);

  controls.querySelector('#saveLayoutBtn').addEventListener('click', async () => {
    const name = controls.querySelector('#layoutNameInput').value.trim();
    if (!name) { alert('Enter a name'); return; }
    const items = Array.from(gridEl.querySelectorAll('.grid-stack-item'));
    const layout = items.map(el => ({
      widgetId: el.dataset.widgetId,
      x: +el.getAttribute('gs-x'),
      y: +el.getAttribute('gs-y'),
      w: +el.getAttribute('gs-w'),
      h: +el.getAttribute('gs-h')
    }));
    try {
      await meltdownEmit('saveLayoutTemplate', {
        moduleName: 'plainspace',
        name,
        lane: 'public',
        viewport: 'desktop',
        layout
      });

      if (pageId) {
        await meltdownEmit('saveLayoutForViewport', {
          jwt: window.ADMIN_TOKEN,
          moduleName: 'plainspace',
          moduleType: 'core',
          pageId,
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
