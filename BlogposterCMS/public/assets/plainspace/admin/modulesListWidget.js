export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const meltdownEmit = window.meltdownEmit;

  try {
    const res = await meltdownEmit('getModuleRegistry', {
      jwt,
      moduleName: 'moduleLoader',
      moduleType: 'core'
    });
    const modules = Array.isArray(res) ? res : (res?.data ?? []);

    const card = document.createElement('div');
    card.className = 'modules-list-card page-list-card';

    const titleBar = document.createElement('div');
    titleBar.className = 'modules-title-bar page-title-bar';

    const title = document.createElement('div');
    title.className = 'modules-title page-title';
    title.textContent = 'Modules';

    titleBar.appendChild(title);
    card.appendChild(titleBar);

    const list = document.createElement('ul');
    list.className = 'modules-list page-list';

    if (!modules.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No modules found.';
      list.appendChild(empty);
    } else {
      modules.forEach(m => {
        const li = document.createElement('li');
        const info = m.module_info || {};
        const desc = info.description ? ` - ${info.description}` : '';
        const status = m.is_active ? '' : ' (inactive)';
        li.textContent = `${m.module_name}${desc}${status}`;
        list.appendChild(li);
      });
    }

    card.appendChild(list);

    el.innerHTML = '';
    el.appendChild(card);
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to load modules: ${err.message}</div>`;
  }
}
