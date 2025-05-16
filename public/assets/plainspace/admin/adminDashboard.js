// public/assets/plainSpace/admin/adminDashboard.js

(async () => {
  try {
    // Keine JWTs senden, Cookie genügt!
    const { widgets = [] } = await window.meltdownEmit('widget.registry.request.v1', {
      moduleName: 'plainspace',
      moduleType: 'core',
      lane: 'admin'
    });

    const pageId = window.PAGE_ID || 1;
    const lane = 'admin';
    const viewport = 'desktop';

    const { layout = [] } = await window.meltdownEmit('getLayoutForViewport', {
      moduleName: 'plainspace',
      moduleType: 'core',
      pageId,
      lane,
      viewport
    });

    const grid = GridStack.init({}, '#adminGrid');

    widgets.forEach(def => {
      const meta = layout.find(i => i.widgetid === def.id) || {};
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
      content.textContent = def.metadata.label || def.id;
      wrapper.appendChild(content);

      grid.makeWidget(wrapper);

      import(def.codeUrl).then(mod => mod.render?.(content)).catch(err =>
        console.error('[adminDashboard] Widget error:', err)
      );
    });

    grid.on('change', async (_evt, items) => {
      const newLayout = items.map(i => ({
        widgetId: i.el.dataset.widgetId,
        x: i.x,
        y: i.y,
        w: i.w,
        h: i.h
      }));

      try {
        await window.meltdownEmit('saveLayoutForViewport', {
          moduleName: 'plainspace',
          pageId,
          lane,
          viewport,
          layout: newLayout
          // Kein JWT senden!
        });
        console.log('[adminDashboard] Layout saved');
      } catch (err) {
        console.error('[adminDashboard] Layout save error:', err);
      }
    });

  } catch (err) {
    console.error('[adminDashboard] Init error:', err);
  }
})();
