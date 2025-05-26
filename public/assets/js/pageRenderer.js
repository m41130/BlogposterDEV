// public/assets/js/pageRenderer.js

import { fetchPartial } from '/assets/plainspace/admin/fetchPartial.js';
import { initBuilder } from '/assets/plainspace/admin/builderRenderer.js';

function renderWidget(wrapper, def, code = null) {
  const root = wrapper.attachShadow({ mode: 'open' });
  if (code) {
    root.innerHTML = `<style>${code.css || ''}</style>${code.html || ''}`;
    if (code.js) {
      try { new Function('root', code.js).call(wrapper, root); } catch (e) { console.error('[Renderer] custom js error', e); }

    }
    return;
  }
  import(def.codeUrl)
    .then(m => m.render?.(root))
    .catch(err => console.error(`[Widget ${def.id}] import error:`, err));
}

function ensureLayout(layout = {}, lane = 'public') {
  let scope = document.querySelector('.app-scope');
  if (!scope) {
    scope = document.createElement('div');
    scope.className = 'app-scope';
    document.body.prepend(scope);
  }

  if (lane !== 'admin') {
    if (!document.getElementById('content')) {
      const content = document.createElement('section');
      content.id = 'content';
      scope.appendChild(content);
    }
    return;
  }

  const inherit = layout.inheritsLayout !== false;

  if (inherit || layout.header) {
    if (!document.getElementById('top-header')) {
      const topHeader = document.createElement('header');
      topHeader.id = 'top-header';
      scope.appendChild(topHeader);
    }
  }

  if (inherit) {
    if (!document.getElementById('main-header')) {
      const mainHeader = document.createElement('header');
      mainHeader.id = 'main-header';
      scope.appendChild(mainHeader);
    }
  }

  let mainContent = document.querySelector('.main-content');
  if (!mainContent) {
    mainContent = document.createElement('div');
    mainContent.className = 'main-content';
    scope.appendChild(mainContent);
  }

  if (inherit || layout.sidebar) {
    if (!document.getElementById('sidebar')) {
      const sidebar = document.createElement('aside');
      sidebar.id = 'sidebar';
      mainContent.appendChild(sidebar);
    }
  }

  if (!document.getElementById('content')) {
    const content = document.createElement('section');
    content.id = 'content';
    mainContent.appendChild(content);
  }
}

(async () => {
  try {
    // 1. ROUTE BASICS
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const lane = window.location.pathname.startsWith('/admin') ? 'admin' : 'public';
    let slug;
    if (window.PAGE_SLUG) {
      slug = window.PAGE_SLUG;
    } else {
      const parts = lane === 'admin' ? pathParts.slice(1) : pathParts;
      slug = parts.join('-') || 'dashboard';
    }
    const DEBUG = window.DEBUG_RENDERER;
    if (DEBUG) console.debug('[Renderer] boot', { slug, lane });

    // 2. FETCH PAGE META
    const pageRes = await meltdownEmit('getPageBySlug', {
      moduleName: 'pagesManager',
      moduleType: 'core',
      slug,
      lane
    });
    if (DEBUG) console.debug('[Renderer] pageRes', pageRes);

    const page = pageRes?.data ?? pageRes ?? null;
    if (!page) {
      alert('Page not found');
      return;
    }

    const config = page.meta || {};

    ensureLayout(config.layout || {}, lane);

    // 3. DOM REFERENCES
    const topHeaderEl = document.getElementById('top-header');
    const mainHeaderEl = document.getElementById('main-header');
    const sidebarEl = document.getElementById('sidebar');
    const contentEl = document.getElementById('content');

    if (!contentEl) return;

    // 4. LOAD HEADER PARTIALS
    if (topHeaderEl) {
      topHeaderEl.innerHTML = await fetchPartial(config.layout?.header || 'top-header', 'headers');
    }
    if (mainHeaderEl) {
      if (config.layout?.inheritsLayout === false && !config.layout?.topHeader) {
        mainHeaderEl.innerHTML = '';
      } else {
        mainHeaderEl.innerHTML = await fetchPartial(config.layout?.mainHeader || 'main-header', 'headers');
      }
    }

    // 5. HANDLE BUILDER PAGE SEPARATELY
    if (slug === 'builder') {
      const builderSidebar = config.layout?.sidebar || 'sidebar-builder';
      if (sidebarEl) {
        sidebarEl.innerHTML = await fetchPartial(builderSidebar, 'sidebars');
      }

      const urlParams = new URLSearchParams(window.location.search);
      const pageIdParam = parseInt(urlParams.get('pageId'), 10) || null;

      await initBuilder(sidebarEl, contentEl, pageIdParam);

      return;
    }

    // 6. LOAD SIDEBAR PARTIAL FOR NON-BUILDER
    const sidebarPartial = (config.layout?.inheritsLayout === false)
      ? 'empty-sidebar'
      : (config.layout?.sidebar || 'default-sidebar');

    if (sidebarEl) {
      if (sidebarPartial !== 'empty-sidebar') {
        sidebarEl.innerHTML = await fetchPartial(sidebarPartial, 'sidebars');
      } else {
        sidebarEl.innerHTML = '';
      }
    }

    // 7. FETCH WIDGET REGISTRY
    const widgetLane = lane === 'admin' ? (config.widgetLane || 'admin') : 'public';

    const widgetRes = await meltdownEmit('widget.registry.request.v1', {
      lane: widgetLane,
      moduleName: 'plainspace',
      moduleType: 'core'
    });
    if (DEBUG) console.debug('[Renderer] widgetRes', widgetRes);

    const allWidgets = Array.isArray(widgetRes?.widgets) ? widgetRes.widgets : [];

    // 8. PUBLIC PAGE: render widgets using stored layout in static grid
    if (lane !== 'admin') {
      const layoutRes = await meltdownEmit('getLayoutForViewport', {
        moduleName: 'plainspace',
        moduleType: 'core',
        pageId: page.id,
        lane,
        viewport: 'desktop'
      });
      if (DEBUG) console.debug('[Renderer] layoutRes', layoutRes);

      const layout = Array.isArray(layoutRes?.layout) ? layoutRes.layout : [];

      const widgetIds = layout.map(l => l.widgetId);
      const sourceIds = widgetIds.length ? widgetIds : (config.widgets || []);
      const matchedWidgets = allWidgets.filter(w => sourceIds.includes(w.id));
      if (!matchedWidgets.length) {
        contentEl.innerHTML = '<p class="empty-state">No widgets configured.</p>';
        return;
      }

      contentEl.innerHTML = '<div id="publicGrid" class="grid-stack"></div>';
      const gridEl = document.getElementById('publicGrid');
      const grid = GridStack.init({ staticGrid: true, float: true, cellHeight: 5, columnWidth: 5, column: 64 }, gridEl);

      matchedWidgets.forEach(def => {
        if (DEBUG) console.debug('[Renderer] render widget', def.id);

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

        renderWidget(content, def, meta.code || null);

      });
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
    if (DEBUG) console.debug('[Renderer] admin layoutRes', layoutRes);

    const layout = Array.isArray(layoutRes?.layout) ? layoutRes.layout : [];

    contentEl.innerHTML = '<div id="adminGrid" class="grid-stack"></div>';
    const gridEl = document.getElementById('adminGrid');
    const grid = GridStack.init({ cellHeight: 5, columnWidth: 5, column: 64 }, gridEl);

    const matchedWidgets = allWidgets.filter(w => (config.widgets || []).includes(w.id));

    matchedWidgets.forEach(def => {
      if (DEBUG) console.debug('[Renderer] admin render widget', def.id);
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

      renderWidget(content, def, meta.code || null);

    });

    grid.on('change', async (_, items) => {
      const newLayout = items.map(i => ({
        widgetId: i.el.dataset.widgetId,
        x: i.x, y: i.y, w: i.w, h: i.h,
        code: layout.find(l => l.widgetId === i.el.dataset.widgetId)?.code || null
      }));

      try {
        await meltdownEmit('saveLayoutForViewport', {
          moduleName: 'plainspace',
          moduleType: 'core',
          pageId: page.id,
          lane, viewport: 'desktop',
          layout: newLayout
        });
        layout = newLayout;
      } catch (e) {
        console.error('[Admin] Layout save error:', e);
      }
    });

  } catch (err) {
    console.error('[Renderer] Fatal error:', err);
    alert('Renderer error: ' + err.message);
  }
})();
