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

  const usedMap = {};
  pages.forEach(p => {
    const name = p.meta?.layoutTemplate;
    if (name) {
      if (!usedMap[name]) usedMap[name] = [];
      usedMap[name].push(p.title || 'Unnamed');
    }
  });

  let templates = templateNames.map(name => ({
    name,
    usedPages: usedMap[name] || []
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

  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'layout-actions-wrap';

  const addBtn = document.createElement('img');
  addBtn.src = '/assets/icons/plus.svg';
  addBtn.alt = 'Add layout';
  addBtn.title = 'Add new layout';
  addBtn.className = 'icon add-layout-btn';
  addBtn.addEventListener('click', async () => {
    const layoutName = prompt('New layout name:');
    if (!layoutName) return;
    try {
      await meltdownEmit('saveLayoutTemplate', {
        jwt,
        moduleName: 'plainspace',
        moduleType: 'core',
        name: layoutName.trim(),
        lane: 'public',
        viewport: 'desktop',
        layout: []
      });
      const res = await meltdownEmit('getLayoutTemplateNames', {
        jwt,
        moduleName: 'plainspace',
        moduleType: 'core',
        lane: 'public'
      });
      templateNames = Array.isArray(res?.templates) ? res.templates : [];
      templates = templateNames.map(n => ({
        name: n,
        usedPages: usedMap[n] || []
      }));
      renderList();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  actionsWrap.appendChild(addBtn);

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
  actionsWrap.appendChild(filterNav);

  card.appendChild(actionsWrap);

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
      arr = arr.filter(t => t.usedPages.length);
    } else if (currentFilter === 'unused') {
      arr = arr.filter(t => !t.usedPages.length);
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
      const usage = t.usedPages.length === 1
        ? `Used by ${t.usedPages[0]}`
        : t.usedPages.length > 1
          ? 'Multiple pages use it'
          : 'Not used';
      li.innerHTML = `
        <div class="layout-item">
          <div class="layout-preview"></div>
          <div class="layout-details">
            <div class="layout-name-row">
              <span class="layout-name">${t.name}</span>
              <span class="layout-actions">
                ${window.featherIcon('edit', 'edit-layout')}
                ${window.featherIcon('copy', 'duplicate-layout')}
                ${window.featherIcon('trash', 'delete-layout')}
              </span>
            </div>
            <div class="layout-usage">${usage}</div>
          </div>
        </div>`;
      list.appendChild(li);
    });
  }

  renderList();

  el.innerHTML = '';
  el.appendChild(card);
}
