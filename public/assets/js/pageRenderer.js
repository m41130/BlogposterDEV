// public/assets/js/pageRenderer.js

import { fetchPartial } from '/assets/plainspace/admin/fetchPartial.js';

(async () => {
  try {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const slug = pathParts[pathParts.length - 1] || 'dashboard';
    const lane = window.location.pathname.startsWith('/admin') ? 'admin' : 'public';

    // JWT aus JS entfernen (Cookie automatisch via credentials!)
    // KEIN JWT im payload senden!
    const res = await meltdownEmit('getPageBySlug', {
      moduleName: 'pagesManager',
      moduleType: 'core',
      slug,
      lane
    });

    const page = res?.data ?? res ?? null;
    if (!page) {
      alert('Page not found');
      return;
    }

    const config = page.meta || {};
    const headerPartials = ['top-header', 'main-header'];

    const topHeaderEl = document.getElementById('top-header');
    const mainHeaderEl = document.getElementById('main-header');
    const sidebarEl = document.getElementById('sidebar');
    const contentEl = document.getElementById('content');

    if (!topHeaderEl || !mainHeaderEl || !sidebarEl || !contentEl) {
      console.error('[pageRenderer] Missing containers.');
      return;
    }

    // Lade Header-Partials
    try {
      const topHeaderHTML = await fetchPartial('top-header', 'headers');
      topHeaderEl.innerHTML = topHeaderHTML;

      const mainHeaderHTML = await fetchPartial('main-header', 'headers');
      mainHeaderEl.innerHTML = mainHeaderHTML;
    } catch (err) {
      console.error('[pageRenderer] Header partial error →', err);
      topHeaderEl.innerHTML = '';
      mainHeaderEl.innerHTML = '';
    }

    const sidebarPartial = (config.layout?.inheritsLayout === false)
      ? 'empty-sidebar'
      : (config.layout?.sidebar ?? 'default-sidebar');

    if (sidebarPartial !== 'empty-sidebar') {
      try {
        const sidebarHTML = await fetchPartial(sidebarPartial, 'sidebars');
        sidebarEl.innerHTML = sidebarHTML;
      } catch (err) {
        console.error('[pageRenderer] Sidebar error →', err);
        sidebarEl.innerHTML = '';
      }
    } else {
      sidebarEl.innerHTML = '';
    }

    // Widgets laden, KEIN JWT nötig, Cookie genügt
    const widgetRes = await meltdownEmit('widget.registry.request.v1', {
      lane,
      moduleName: 'plainspace',
      moduleType: 'core'
    });

    const allWidgets = widgetRes?.data ?? widgetRes ?? [];
    const wantedIDs = config.widgets || [];
    const matchedWidgets = allWidgets.filter(w => wantedIDs.includes(w.id));

    if (!matchedWidgets.length) {
      contentEl.innerHTML = '<p class="empty-state">No widgets configured.</p>';
    }

    for (const widgetDef of matchedWidgets) {
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'widget';
      contentEl.appendChild(widgetContainer);

      try {
        const mod = await import(widgetDef.codeUrl);
        mod.render?.(widgetContainer);
      } catch (err) {
        console.error(`[pageRenderer] Widget "${widgetDef.id}" error:`, err);
      }
    }

  } catch (err) {
    console.error('[pageRenderer] Unexpected error:', err);
  }
})();
