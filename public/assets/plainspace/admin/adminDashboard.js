// public/assets/plainSpace/admin/adminDashboard.js

(async () => {
  try {
    // If you still want a GridStack for some other admin UI logic,
    // initialize it here. Otherwise, remove these lines entirely.
    const grid = GridStack.init({ cellHeight: 5, columnWidth: 5, column: 64 }, '#adminGrid');

    // Right now, we're NOT fetching or rendering widgets,
    // leaving that to pageRenderer.js.

    console.log('[adminDashboard] Initialized without widget loading.');

    // If you want to handle drag-and-drop layout for something else,
    // you can do so here. For now, it's bare-bones.

  } catch (err) {
    console.error('[adminDashboard] Init error:', err);
  }
})();
