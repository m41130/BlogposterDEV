export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const meltdownEmit = window.meltdownEmit;

  let templateNames = [];
  let pages = [];

  try {
    const res = await meltdownEmit('getLayoutTemplateNames', {
      jwt,
      moduleName: 'plainspace',
      moduleType: 'core',
      lane: 'public'
    });
    templateNames = Array.isArray(res?.templates) ? res.templates : [];
  } catch (err) {
    console.warn('[LayoutsWidget] failed to load template names', err);
  }

  try {
    const res = await meltdownEmit('getPagesByLane', {
      jwt,
      moduleName: 'pagesManager',
      moduleType: 'core',
      lane: 'public'
    });
    pages = Array.isArray(res) ? res : (res?.pages ?? res ?? []);
  } catch (err) {
    console.warn('[LayoutsWidget] failed to load pages', err);
  }

  const usedSet = new Set();
  pages.forEach(p => {
    const name = p.meta?.layoutTemplate;
    if (name) usedSet.add(name);
  });

  const templates = templateNames.map(name => ({
    name,
    used: usedSet.has(name)
  }));

  let currentFilter = 'all';
  let currentSort = 'name';

  const card = document.createElement('div');
  card.className = 'layout-list-card';

  const titleBar = document.createElement('div');
  titleBar.className = 'layout-title-bar';
  const title = document.createElement('div');
  title.className = 'layout-title';
  title.textContent = 'Layouts';
  titleBar.appendChild(title);

  const sortSelect = document.createElement('select');
  sortSelect.className = 'layout-sort';
  sortSelect.innerHTML = '<option value="name">A-Z</option><option value="date">Date</option>';
  sortSelect.onchange = () => {
    currentSort = sortSelect.value;
    renderList();
  };
  titleBar.appendChild(sortSelect);

  card.appendChild(titleBar);

  const filterNav = document.createElement('nav');
  filterNav.className = 'layout-filters';
  ['all','used','unused'].forEach((f, idx) => {
    const span = document.createElement('span');
    span.textContent = f === 'used' ? 'In use' : f === 'unused' ? 'Unused' : 'All';
    span.className = 'filter' + (idx === 0 ? ' active' : '');
    span.onclick = () => {
      filterNav.querySelectorAll('.filter').forEach(el => el.classList.remove('active'));
      span.classList.add('active');
      currentFilter = f;
      renderList();
    };
    filterNav.appendChild(span);
  });
  card.appendChild(filterNav);

  const list = document.createElement('ul');
  list.className = 'layout-list';
  card.appendChild(list);

  function renderList() {
    list.innerHTML = '';
    let arr = templates.slice();
    if (currentSort === 'name') {
      arr.sort((a,b) => a.name.localeCompare(b.name));
    }
    if (currentFilter === 'used') {
      arr = arr.filter(t => t.used);
    } else if (currentFilter === 'unused') {
      arr = arr.filter(t => !t.used);
    }
    if (!arr.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No layouts found.';
      list.appendChild(empty);
      return;
    }
    arr.forEach(t => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="layout-item">
          <div class="layout-preview"></div>
          <div class="layout-name">${t.name}</div>
          <button class="button use-layout-btn">Use</button>
        </div>`;
      list.appendChild(li);
    });
  }

  renderList();

  el.innerHTML = '';
  el.appendChild(card);
}
