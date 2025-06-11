// public/assets/plainspace/admin/widgetListWidget.js
export async function render(el) {
  const meltdownEmit = window.meltdownEmit;
  const jwt = window.ADMIN_TOKEN;

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

  function getIcon(id, meta) {
    const name = meta?.icon || ICON_MAP[id] || id;
    return window.featherIcon ? window.featherIcon(name) :
      `<img src="/assets/icons/${name}.svg" alt="${name}" />`;
  }

  let widgets = [];
  try {
    const res = await meltdownEmit('widget.registry.request.v1', {
      lane: 'public',
      moduleName: 'plainspace',
      moduleType: 'core',
      jwt
    });
    widgets = Array.isArray(res?.widgets) ? res.widgets : [];
  } catch (err) {
    console.error('[widgetList] registry error', err);
  }

  const globalIds = new Set();
  try {
    const res = await meltdownEmit('getPagesByLane', {
      jwt,
      moduleName: 'pagesManager',
      moduleType: 'core',
      lane: 'public'
    });
    const pages = Array.isArray(res?.pages) ? res.pages : res || [];
    for (const p of pages) {
      const lay = await meltdownEmit('getLayoutForViewport', {
        jwt,
        moduleName: 'plainspace',
        moduleType: 'core',
        pageId: p.id,
        lane: 'public',
        viewport: 'desktop'
      });
      const items = Array.isArray(lay?.layout) ? lay.layout : [];
      items.forEach(i => { if (i.global) globalIds.add(i.widgetId); });
    }
  } catch (err) {
    console.error('[widgetList] global fetch error', err);
  }

  function buildList(list, ids) {
    if (!ids.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No widgets found.';
      list.appendChild(empty);
      return;
    }
    ids.forEach(id => {
      const def = widgets.find(w => w.id === id) || { id, metadata:{label:id} };
      const li = document.createElement('li');
      li.innerHTML = `${getIcon(def.id, def.metadata)}<span class="widget-name">${def.metadata.label}</span>`;
      list.appendChild(li);
    });
  }

  const card = document.createElement('div');
  card.className = 'widget-list-card page-list-card';

  const titleBar = document.createElement('div');
  titleBar.className = 'widget-title-bar page-title-bar';
  const title = document.createElement('div');
  title.className = 'widget-title page-title';
  title.textContent = 'Widgets';
  const tabs = document.createElement('div');
  tabs.className = 'widget-tabs';
  const allBtn = document.createElement('button');
  allBtn.className = 'widget-tab active';
  allBtn.textContent = 'All';
  const globalBtn = document.createElement('button');
  globalBtn.className = 'widget-tab';
  globalBtn.textContent = 'Global';
  tabs.appendChild(allBtn);
  tabs.appendChild(globalBtn);
  titleBar.appendChild(title);
  titleBar.appendChild(tabs);
  card.appendChild(titleBar);

  const allList = document.createElement('ul');
  allList.className = 'widget-list page-list';
  buildList(allList, widgets.map(w => w.id));
  const globalList = document.createElement('ul');
  globalList.className = 'widget-list page-list';
  globalList.style.display = 'none';
  const globalArray = Array.from(globalIds);
  if (globalArray.length) {
    globalArray.forEach(id => {
      const def = widgets.find(w => w.id === id) || { id, metadata:{label:id} };
      const li = document.createElement('li');
      li.classList.add('global-widget');
      li.innerHTML = `${getIcon(def.id, def.metadata)}<span class="widget-name">${def.metadata.label}</span>`;
      globalList.appendChild(li);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No global widgets.';
    globalList.appendChild(empty);
  }

  card.appendChild(allList);
  card.appendChild(globalList);

  allBtn.addEventListener('click', () => {
    allBtn.classList.add('active');
    globalBtn.classList.remove('active');
    allList.style.display = '';
    globalList.style.display = 'none';
  });
  globalBtn.addEventListener('click', () => {
    globalBtn.classList.add('active');
    allBtn.classList.remove('active');
    allList.style.display = 'none';
    globalList.style.display = '';
  });

  el.innerHTML = '';
  el.appendChild(card);
}
