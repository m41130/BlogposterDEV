// public/assets/js/pageRenderer.js

import { fetchPartial } from '/assets/plainspace/admin/fetchPartial.js';
import { initBuilder } from '/assets/plainspace/admin/builderRenderer.js';

// Default rows for admin widgets (~50px with 5px grid cells)
// Temporary patch: double the default height for larger widgets
const DEFAULT_ADMIN_ROWS = 20;

function getGlobalCssUrl(lane) {
  if (lane === 'admin') return '/assets/css/site.css';
  const theme = window.ACTIVE_THEME || 'default';
  return `/themes/${theme}/theme.css`;
}

function ensureGlobalStyle(lane) {
  const url = getGlobalCssUrl(lane);
  if (document.querySelector(`link[data-global-style="${lane}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.dataset.globalStyle = lane;
  document.head.appendChild(link);
}

function executeJs(code, wrapper, root) {
  if (!code) return;
  const nonce = window.NONCE;
  if (!nonce) {
    console.error('[Renderer] missing nonce');
    return;
  }
  code = code.trim();
  // If the code contains ES module syntax, run it via dynamic import
  if (/^import\s|^export\s/m.test(code)) {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    import(url).then(m => {
      if (typeof m.render === 'function') {
        try { m.render.call(wrapper, root); } catch (err) {
          console.error('[Renderer] module render error', err);
        }
      }
      URL.revokeObjectURL(url);
    }).catch(err => {
      console.error('[Renderer] module import error', err);
      URL.revokeObjectURL(url);
    });
    return;
  }
  window.__rendererRoot = root;
  window.__rendererWrapper = wrapper;
  const script = document.createElement('script');
  script.setAttribute('nonce', nonce);
  script.textContent = `(function(root){\n${code}\n}).call(window.__rendererWrapper, window.__rendererRoot);`;
  document.body.appendChild(script);
  script.remove();
  delete window.__rendererRoot;
  delete window.__rendererWrapper;
}

function renderWidget(wrapper, def, code = null, lane = 'public') {
  const root = wrapper.attachShadow({ mode: 'open' });
  const globalCss = getGlobalCssUrl(lane);

  const style = document.createElement('style');
  style.textContent = `@import url('${globalCss}');`;
  root.appendChild(style);

  const container = document.createElement('div');
  container.className = 'widget-container';
  // Prevent GridStack from starting a drag when interacting with
  // form controls inside widgets on admin pages. Attach the handler
  // on both the container and the grid item content element so events
  // are intercepted before GridStack can act on them.
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
  wrapper.addEventListener('pointerdown', stop, true);
  wrapper.addEventListener('mousedown', stop, true);
  wrapper.addEventListener('touchstart', stop, true);
  root.appendChild(container);

  if (code) {
    if (code.css) {
      const customStyle = document.createElement('style');
      customStyle.textContent = code.css;
      root.appendChild(customStyle);
    }
    if (code.html) {
      container.innerHTML = code.html;
    }
    if (code.js) {
      try { executeJs(code.js, wrapper, root); } catch (e) { console.error('[Renderer] custom js error', e); }

    }
    return;
  }
  import(def.codeUrl)
    .then(m => m.render?.(container))
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

  // Ensure global content header inside the content section
  const contentEl = document.getElementById('content');
  if (contentEl && !document.getElementById('content-header')) {
    const header = document.createElement('div');
    header.id = 'content-header';
    contentEl.prepend(header);
  }
}

(async () => {
  try {
    // 1. ROUTE BASICS
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const lane = window.location.pathname.startsWith('/admin') ? 'admin' : 'public';
    ensureGlobalStyle(lane);
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

    if (slug === 'builder') {
      topHeaderEl?.remove();
      mainHeaderEl?.remove();
      document.getElementById('content-header')?.remove();
    }

    if (!contentEl) return;

    // 4. LOAD HEADER PARTIALS
    if (slug !== 'builder') {
      if (topHeaderEl) {
        topHeaderEl.innerHTML = await fetchPartial(
          config.layout?.header || 'top-header',
          'headers'
        );
        document.dispatchEvent(new CustomEvent('top-header-loaded'));
      }
      if (mainHeaderEl) {
        if (config.layout?.inheritsLayout === false && !config.layout?.topHeader) {
          mainHeaderEl.innerHTML = '';
        } else {
          mainHeaderEl.innerHTML = await fetchPartial(config.layout?.mainHeader || 'main-header', 'headers');
        }
      }
      const contentHeaderEl = document.getElementById('content-header');
      if (contentHeaderEl) {
        contentHeaderEl.innerHTML = await fetchPartial(
          config.layout?.contentHeader || 'content-header',
          'headers'
        );
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
    let widgetLane = lane === 'admin' ? (config.widgetLane || 'admin') : 'public';
    // Prevent misconfigured pages from requesting admin widgets on the public lane
    if (lane !== 'admin' && widgetLane === 'admin') {
      console.warn('[Renderer] widgetLane="admin" on public page => forcing "public"');
      widgetLane = 'public';
    }

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

      // Temporary patch: start widgets larger by default
      const items = layout.length ? layout : (config.widgets || []).map((id, idx) => ({ id: `w${idx}`, widgetId: id, x:0,y:idx*2,w:8,h:4, code:null }));

      if (!items.length) {
        contentEl.innerHTML = '<p class="empty-state">No widgets configured.</p>';
        return;
      }

      contentEl.innerHTML = '<div id="publicGrid" class="grid-stack"></div>';
      const gridEl = document.getElementById('publicGrid');
      // Static mode: public pages should not be directly editable
      const grid = GridStack.init({ staticGrid: true, float: true, cellHeight: 5, columnWidth: 5, column: 64 }, gridEl);

      items.forEach(item => {
        const def = allWidgets.find(w => w.id === item.widgetId);
        if (!def) return;
        if (DEBUG) console.debug('[Renderer] render widget', def.id, item.id);

        // Expanded default size for public widgets
        const [x, y, w, h] = [item.x ?? 0, item.y ?? 0, item.w ?? 8, item.h ?? 4];

        const wrapper = document.createElement('div');
        wrapper.classList.add('grid-stack-item');
        wrapper.setAttribute('gs-x', x);
        wrapper.setAttribute('gs-y', y);
        wrapper.setAttribute('gs-w', w);
        wrapper.setAttribute('gs-h', h);
        wrapper.setAttribute('gs-min-w', 4);
        wrapper.setAttribute('gs-min-h', 4);
        wrapper.dataset.widgetId = def.id;
        wrapper.dataset.instanceId = item.id;

        const content = document.createElement('div');
        content.className = 'grid-stack-item-content';
        wrapper.appendChild(content);

        gridEl.appendChild(wrapper);
        grid.makeWidget(wrapper);

        renderWidget(content, def, item.code || null, lane);

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

    let layout = Array.isArray(layoutRes?.layout) ? layoutRes.layout : [];

    contentEl.innerHTML = '<div id="adminGrid" class="grid-stack"></div>';
    const gridEl = document.getElementById('adminGrid');
    const grid = GridStack.init({ cellHeight: 5, columnWidth: 5, column: 64 }, gridEl);
    // Temporary patch: allow moving admin widgets again until drag bug is resolved
    grid.setStatic(false);
    window.adminGrid = grid;

    const matchedWidgets = allWidgets.filter(w => (config.widgets || []).includes(w.id));

    matchedWidgets.forEach(def => {
      if (DEBUG) console.debug('[Renderer] admin render widget', def.id);
      const meta = layout.find(l => l.widgetId === def.id) || {};
      // Larger defaults for admin widgets
      const [x, y, w, h] = [meta.x ?? 0, meta.y ?? 0, meta.w ?? 8, meta.h ?? DEFAULT_ADMIN_ROWS];

      const wrapper = document.createElement('div');
      wrapper.classList.add('grid-stack-item');
      wrapper.setAttribute('gs-x', x);
      wrapper.setAttribute('gs-y', y);
      wrapper.setAttribute('gs-w', w);
      wrapper.setAttribute('gs-h', h);
      wrapper.setAttribute('gs-min-w', 4);
      wrapper.setAttribute('gs-min-h', DEFAULT_ADMIN_ROWS);
      wrapper.dataset.widgetId = def.id;
      wrapper.dataset.instanceId = meta.id || `w${Math.random().toString(36).slice(2,8)}`;

      const content = document.createElement('div');
      content.className = 'grid-stack-item-content';
      wrapper.appendChild(content);

      gridEl.appendChild(wrapper);
      grid.makeWidget(wrapper);

      renderWidget(content, def, meta.code || null, lane);

    });

    grid.on('change', async (_, items) => {
      const newLayout = items.map(i => ({
        id: i.el.dataset.instanceId,
        widgetId: i.el.dataset.widgetId,
        x: i.x, y: i.y, w: i.w, h: i.h,
        code: layout.find(l => l.id === i.el.dataset.instanceId)?.code || null
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
