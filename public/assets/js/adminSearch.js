(document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('admin-search-input');
  const results = document.getElementById('admin-search-results');
  const container = document.querySelector('.search-container');
  if (!input || !results || !container) return;

  let timer;
  let disabled = false;

  async function performSearch() {
    const q = input.value.trim();
    if (!q) {
      results.innerHTML = '';
      results.parentElement.classList.remove('active');
      return;
    }
    try {
      const res = await window.meltdownEmit('searchPages', {
        jwt: window.ADMIN_TOKEN,
        moduleName: 'pagesManager',
        moduleType: 'core',
        query: q,
        lane: 'all',
        limit: 10
      });
      const pages = Array.isArray(res) ? res : (res.pages || res.rows || []);
      if (pages.length) {
        results.innerHTML = pages.map(p => `<li data-id="${p.id}" data-slug="${p.slug}" data-lane="${p.lane}">${p.title || p.slug}</li>`).join('');
      } else {
        results.innerHTML = '<li class="no-results">No results</li>';
      }
      results.parentElement.classList.add('active');
    } catch (err) {
      if (err && /permission/i.test(err.message)) {
        input.disabled = true;
        input.placeholder = 'Search unavailable';
        disabled = true;
      }
      console.error('searchPages failed', err);
    }
  }

  input.addEventListener('input', () => {
    if (disabled) return;
    clearTimeout(timer);
    container.classList.add('open');
    timer = setTimeout(performSearch, 300);
  });

  results.addEventListener('click', e => {
    if (e.target.tagName === 'LI') {
      const id = e.target.dataset.id;
      window.location.href = `/admin/pages/edit/${id}`;
      results.parentElement.classList.remove('active');
      container.classList.remove('open');
    }
  });

  document.addEventListener('click', e => {
    if (!results.contains(e.target) && e.target !== input) {
      results.parentElement.classList.remove('active');
      container.classList.remove('open');
    }
  });
}));

