// public/assets/admin/defaulwidgets/pageStats.js
export async function render(el) {
    try {
      const res = await meltdownEmit('getAllPages', {
        moduleName: 'pagesManager',
        moduleType: 'core'
      });
  
      const pages = res?.data ?? [];
  
      const published = pages.filter(p => p.status === 'published').length;
      const draft = pages.filter(p => p.status === 'draft').length;
      const total = pages.length;
  
      el.innerHTML = `
        <div class="page-stats-widget">
          <h3>Page Statistics</h3>
          <ul>
            <li>Total Pages: ${total}</li>
            <li>Published: ${published}</li>
            <li>Drafts: ${draft}</li>
          </ul>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="error">Error loading stats: ${err.message}</div>`;
    }
  }
  