import { fetchPartial } from '/assets/plainspace/admin/fetchPartial.js';

(async () => {
  try {
    // 1) Determine slug & lane
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const slug = pathParts[pathParts.length - 1] || 'dashboard';
    const lane = window.location.pathname.startsWith('/admin') ? 'admin' : 'public';
    console.debug('[pageRenderer] Path parts:', pathParts, 'Slug:', slug, 'Lane:', lane);

    // 2) Get page data
    console.debug('[pageRenderer] Fetching page data for slug:', slug, 'lane:', lane);
    const pageRes = await meltdownEmit('getPageBySlug', {
      moduleName: 'pagesManager',
      moduleType: 'core',
      slug,
      lane
    });
    console.debug('[pageRenderer] Page response:', pageRes);

    const page = pageRes?.data ?? pageRes ?? null;
    if (!page) {
      console.error('[pageRenderer] Page not found for slug:', slug, 'lane:', lane, 'Response:', pageRes);
      alert('Page not found');
      return;
    }

    const config = page.meta || {};
    console.debug('[pageRenderer] Page config:', config);

    // Basic DOM references for layout
    const topHeaderEl = document.getElementById('top-header');
    const mainHeaderEl = document.getElementById('main-header');
    const sidebarEl = document.getElementById('sidebar');
    const contentEl = document.getElementById('content');
    console.debug('[pageRenderer] DOM refs:', { topHeaderEl, mainHeaderEl, sidebarEl, contentEl });
    if (!topHeaderEl || !mainHeaderEl || !sidebarEl || !contentEl) {
      console.error('[pageRenderer] Missing containers in admin.html.', { topHeaderEl, mainHeaderEl, sidebarEl, contentEl });
      return;
    }

    // 3) Load partials for headers
    try {
      console.debug('[pageRenderer] Fetching top-header partial');
      const topHeaderHTML = await fetchPartial('top-header', 'headers');
      topHeaderEl.innerHTML = topHeaderHTML;
      console.debug('[pageRenderer] Top-header loaded');

      console.debug('[pageRenderer] Fetching main-header partial');
      const mainHeaderHTML = await fetchPartial('main-header', 'headers');
      mainHeaderEl.innerHTML = mainHeaderHTML;
      console.debug('[pageRenderer] Main-header loaded');
    } catch (err) {
      console.error('[pageRenderer] Header partial error →', err);
      topHeaderEl.innerHTML = '';
      mainHeaderEl.innerHTML = '';
    }

    // 4) Load sidebar partial
    const sidebarPartial = (config.layout?.inheritsLayout === false)
      ? 'empty-sidebar'
      : (config.layout?.sidebar ?? 'default-sidebar');
    console.debug('[pageRenderer] Sidebar partial to load:', sidebarPartial);

    if (sidebarPartial !== 'empty-sidebar') {
      try {
        console.debug('[pageRenderer] Fetching sidebar partial:', sidebarPartial);
        const sidebarHTML = await fetchPartial(sidebarPartial, 'sidebars');
        sidebarEl.innerHTML = sidebarHTML;
        console.debug('[pageRenderer] Sidebar loaded');
      } catch (err) {
        console.error('[pageRenderer] Sidebar error →', err);
        sidebarEl.innerHTML = '';
      }
    } else {
      sidebarEl.innerHTML = '';
      console.debug('[pageRenderer] Sidebar set to empty');
    }

    // 5) Fetch the full widget registry
    let widgetRes;
    try {
      console.debug('[pageRenderer] Requesting widget registry');
      widgetRes = await meltdownEmit('widget.registry.request.v1', {
        lane,
        moduleName: 'plainspace',
        moduleType: 'core'
      });
      console.debug('[pageRenderer] Widget registry response:', widgetRes);
    } catch (err) {
      console.error('[pageRenderer] API error on widgets request:', err);
      widgetRes = { widgets: [] };
    }
    const allWidgets = Array.isArray(widgetRes?.widgets) ? widgetRes.widgets : [];
    console.debug('[pageRenderer] All widgets:', allWidgets);

    // 6) Figure out which widgets this page wants
    //    from page.meta.widgets (public or admin)
    const wantedIDs = config.widgets || [];
    console.debug('[pageRenderer] Wanted widget IDs:', wantedIDs);
    const matchedWidgets = allWidgets.filter(w => wantedIDs.includes(w.id));
    console.debug('[pageRenderer] Matched widgets:', matchedWidgets);

    // 7) If NOT admin, simply render them directly in #content
    if (lane !== 'admin') {
      console.debug('[pageRenderer] Not admin lane, rendering widgets directly');
      if (!matchedWidgets.length) {
        contentEl.innerHTML = '<p class="empty-state">No widgets configured.</p>';
        console.debug('[pageRenderer] No widgets configured for this page.');
        return;
      }
      for (const widgetDef of matchedWidgets) {
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'widget';
        contentEl.appendChild(widgetContainer);
        console.debug('[pageRenderer] Rendering widget:', widgetDef);

        try {
          const mod = await import(widgetDef.codeUrl);
          console.debug('[pageRenderer] Widget module loaded:', widgetDef.codeUrl, mod);
          mod.render?.(widgetContainer);
          console.debug('[pageRenderer] Widget rendered:', widgetDef.id);
        } catch (err) {
          console.error(`[pageRenderer] Widget "${widgetDef.id}" error:`, err);
        }
      }
      return;
    }

    // 8) If admin, use GridStack
    //    We also fetch the layout from meltdown (plainSpace)
    //    Then place each matched widget in the grid.
    const pageId   = page.id;
    const viewport = 'desktop';  // you can dynamically pick this if needed
    console.debug('[pageRenderer] Admin mode: pageId:', pageId, 'viewport:', viewport);

    let layoutRes;
    try {
      console.debug('[pageRenderer] Fetching layout for viewport');
      layoutRes = await meltdownEmit('getLayoutForViewport', {
        moduleName: 'plainspace',
        moduleType: 'core',
        pageId,
        lane,
        viewport
      });
      console.debug('[pageRenderer] Layout response:', layoutRes);
    } catch (err) {
      console.error('[pageRenderer] getLayoutForViewport error:', err);
      layoutRes = { layout: [] };
    }
    const layout = Array.isArray(layoutRes?.layout) ? layoutRes.layout
    : Array.isArray(layoutRes?.data?.layout) ? layoutRes.data.layout
    : Array.isArray(layoutRes?.rows) ? layoutRes.rows
    : [];
    console.debug('[pageRenderer] Final layout array:', layout);
  
    // clear #content in case there is leftover "No widgets" etc.
    contentEl.innerHTML = `
      <div id="adminGrid" class="grid-stack"></div>
    `;
    const gridEl = contentEl.querySelector('#adminGrid');
    if (!gridEl) {
      console.error('[pageRenderer] #adminGrid not found in admin mode.');
      return;
    }
    console.debug('[pageRenderer] #adminGrid element:', gridEl);

    // 9) Initialize GridStack
    console.debug('[pageRenderer] Initializing GridStack');
    const grid = GridStack.init({}, gridEl);
    console.debug('[pageRenderer] GridStack initialized:', grid);

    // 10) For each widget that the page wants, see if there's a saved layout
    //     defaulting to x=0,y=0,w=4,h=2
    matchedWidgets.forEach(def => {
      const meta = layout.find(i => i.widgetId === def.id || i.widgetid === def.id) || {};
      const x = meta.x ?? 0;
      const y = meta.y ?? 0;
      const w = meta.w ?? 4;
      const h = meta.h ?? 2;
      console.debug('[pageRenderer] Widget layout meta:', { id: def.id, meta, x, y, w, h });

      const wrapper = document.createElement('div');
      wrapper.classList.add('grid-stack-item');
      wrapper.setAttribute('gs-x', x);
      wrapper.setAttribute('gs-y', y);
      wrapper.setAttribute('gs-w', w);
      wrapper.setAttribute('gs-h', h);
      wrapper.dataset.widgetId = def.id;

      const content = document.createElement('div');
      content.className = 'grid-stack-item-content';
      content.textContent = def.metadata?.label || def.id;
      wrapper.appendChild(content);

      gridEl.appendChild(wrapper);  
      console.debug('[pageRenderer] Widget wrapper added to grid:', wrapper);

      grid.makeWidget(wrapper);
      console.debug('[pageRenderer] Widget made into GridStack widget:', wrapper);

      // dynamically import the widget code and render it
      import(def.codeUrl)
        .then(mod => {
          console.debug('[pageRenderer|admin] Widget module loaded:', def.codeUrl, mod);
          mod.render?.(content);
          console.debug('[pageRenderer|admin] Widget rendered:', def.id);
        })
        .catch(err => console.error('[pageRenderer|admin] Widget error:', err));
    });

    // 11) Listen for layout changes => meltdown => saveLayoutForViewport
    grid.on('change', async (_evt, items) => {
      const newLayout = items.map(i => ({
        widgetId: i.el.dataset.widgetId,
        x: i.x,
        y: i.y,
        w: i.w,
        h: i.h
      }));
      console.debug('[pageRenderer|admin] GridStack layout changed:', newLayout);
      try {
        await meltdownEmit('saveLayoutForViewport', {
          moduleName: 'plainspace',
          moduleType: 'core',
          pageId,
          lane,
          viewport,
          layout: newLayout
        });
        console.log('[pageRenderer|admin] Layout saved:', newLayout);
      } catch (err) {
        console.error('[pageRenderer|admin] Layout save error:', err);
      }
    });

    console.log('[pageRenderer] Admin GridStack setup complete.');

  } catch (err) {
    console.error('[pageRenderer] Unexpected error:', err);
  }
})();
