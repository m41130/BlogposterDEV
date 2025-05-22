// public/assets/js/pageRenderer.js

import { fetchPartial } from '/assets/plainspace/admin/fetchPartial.js';
import { initBuilder } from '/assets/plainspace/admin/builderRenderer.js';

(async () => {
  try {
    // 1. ROUTE BASICS
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let slug = window.PAGE_SLUG || pathParts[pathParts.length - 1] || 'dashboard';
    const lane = window.location.pathname.startsWith('/admin') ? 'admin' : 'public';

    // 2. FETCH PAGE META
    const pageRes = await meltdownEmit('getPageBySlug', {
      moduleName: 'pagesManager',
      moduleType: 'core',
      slug,
      lane
    });

    const page = pageRes?.data ?? pageRes ?? null;
    if (!page) {
      alert('Page not found');
      return;
    }

    const config = page.meta || {};

    // 3. DOM REFERENCES
    const topHeaderEl = document.getElementById('top-header');
    const mainHeaderEl = document.getElementById('main-header');
    const sidebarEl = document.getElementById('sidebar');
    const contentEl = document.getElementById('content');

    if (!topHeaderEl || !mainHeaderEl || !sidebarEl || !contentEl) return;

    // 4. LOAD HEADER PARTIALS
    topHeaderEl.innerHTML = await fetchPartial(config.layout?.header || 'top-header', 'headers');
    if (config.layout?.inheritsLayout === false && !config.layout?.topHeader) {
      mainHeaderEl.innerHTML = '';
    } else {
      mainHeaderEl.innerHTML = await fetchPartial(config.layout?.mainHeader || 'main-header', 'headers');
    }

    // 5. HANDLE BUILDER PAGE SEPARATELY
    if (slug === 'builder') {
      const builderSidebar = config.layout?.sidebar || 'sidebar-builder';
      sidebarEl.innerHTML = await fetchPartial(builderSidebar, 'sidebars');

      const widgetRes = await meltdownEmit('widget.registry.request.v1', {
        lane: 'public', // explicitly use public widgets for builder
        moduleName: 'plainspace',
        moduleType: 'core'
      });

      const allWidgets = Array.isArray(widgetRes?.widgets) ? widgetRes.widgets : [];

      const urlParams = new URLSearchParams(window.location.search);
      const pageIdParam = parseInt(urlParams.get('pageId'), 10) || null;

      await initBuilder(sidebarEl, contentEl, allWidgets, pageIdParam);

      return;
    }

    // 6. LOAD SIDEBAR PARTIAL FOR NON-BUILDER
    const sidebarPartial = (config.layout?.inheritsLayout === false)
      ? 'empty-sidebar'
      : (config.layout?.sidebar || 'default-sidebar');

    if (sidebarPartial !== 'empty-sidebar') {
      sidebarEl.innerHTML = await fetchPartial(sidebarPartial, 'sidebars');
    } else {
      sidebarEl.innerHTML = '';
    }

    // 7. FETCH WIDGET REGISTRY
    const widgetLane = lane === 'admin' ? (config.widgetLane || 'admin') : 'public';

    const widgetRes = await meltdownEmit('widget.registry.request.v1', {
      lane: widgetLane,
      moduleName: 'plainspace',
      moduleType: 'core'
    });

    const allWidgets = Array.isArray(widgetRes?.widgets) ? widgetRes.widgets : [];

    // 8. PUBLIC PAGE: DIRECTLY RENDER WIDGETS
    if (lane !== 'admin') {
      const matchedWidgets = allWidgets.filter(w => (config.widgets || []).includes(w.id));
      if (!matchedWidgets.length) {
        contentEl.innerHTML = '<p class="empty-state">No widgets configured.</p>';
        return;
      }
      for (const widgetDef of matchedWidgets) {
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'widget';
        contentEl.appendChild(widgetContainer);

        try {
          const mod = await import(widgetDef.codeUrl);
          mod.render?.(widgetContainer);
        } catch (err) {
          console.error(`[Public] Widget ${widgetDef.id} import error:`, err);
        }
      }
      return;
    }

    // 9. ADMIN PAGE: INIT GRIDSTACK
    const layoutRes = await meltdownEmit('getLayoutForViewport', {
      jwt: window.ADMIN_TOKEN,
      moduleName: 'plainspace',
      moduleType: 'core',
      pageId: page.id,
      lane,
      viewport: 'desktop'
    });

    const layout = Array.isArray(layoutRes?.layout) ? layoutRes.layout : [];

    contentEl.innerHTML = '<div id="adminGrid" class="grid-stack"></div>';
    const gridEl = document.getElementById('adminGrid');
    const grid = GridStack.init({}, gridEl);

    const matchedWidgets = allWidgets.filter(w => (config.widgets || []).includes(w.id));

    matchedWidgets.forEach(def => {
      const meta = layout.find(l => l.widgetId === def.id) || {};
      const [x, y, w, h] = [meta.x ?? 0, meta.y ?? 0, meta.w ?? 4, meta.h ?? 2];

      const wrapper = document.createElement('div');
      wrapper.classList.add('grid-stack-item');
      wrapper.setAttribute('gs-x', x);
      wrapper.setAttribute('gs-y', y);
      wrapper.setAttribute('gs-w', w);
      wrapper.setAttribute('gs-h', h);
      wrapper.dataset.widgetId = def.id;

      const content = document.createElement('div');
      content.className = 'grid-stack-item-content';
      wrapper.appendChild(content);

      gridEl.appendChild(wrapper);
      grid.makeWidget(wrapper);

      import(def.codeUrl)
        .then(m => m.render?.(content))
        .catch(err => console.error(`[Admin] Widget ${def.id} import error:`, err));
    });

    grid.on('change', async (_, items) => {
      const newLayout = items.map(i => ({
        widgetId: i.el.dataset.widgetId,
        x: i.x, y: i.y, w: i.w, h: i.h
      }));

      try {
        await meltdownEmit('saveLayoutForViewport', {
          moduleName: 'plainspace',
          moduleType: 'core',
          pageId: page.id,
          lane, viewport: 'desktop',
          layout: newLayout
        });
      } catch (e) {
        console.error('[Admin] Layout save error:', e);
      }
    });

  } catch (err) {
    console.error('[Renderer] Fatal error:', err);
    alert('Renderer error: ' + err.message);
  }
})();
