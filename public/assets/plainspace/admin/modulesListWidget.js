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

    const list = document.createElement('ul');
    list.className = 'modules-list';

    if (!modules.length) {
      const empty = document.createElement('li');
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

    el.innerHTML = '';
    el.appendChild(list);
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to load modules: ${err.message}</div>`;
  }
}
