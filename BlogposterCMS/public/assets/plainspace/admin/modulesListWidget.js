export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const meltdownEmit = window.meltdownEmit;

  try {
    const [installedRes, systemRes] = await Promise.all([
      meltdownEmit('getModuleRegistry', {
        jwt,
        moduleName: 'moduleLoader',
        moduleType: 'core'
      }),
      meltdownEmit('listSystemModules', {
        jwt,
        moduleName: 'moduleLoader',
        moduleType: 'core'
      })
    ]);

    const installed = Array.isArray(installedRes) ? installedRes : (installedRes?.data ?? []);
    const system = Array.isArray(systemRes) ? systemRes : (systemRes?.data ?? []);

    const card = document.createElement('div');
    card.className = 'modules-list-card page-list-card';

    const titleBar = document.createElement('div');
    titleBar.className = 'modules-title-bar page-title-bar';

    const title = document.createElement('div');
    title.className = 'modules-title page-title';
    title.textContent = 'Modules';

    titleBar.appendChild(title);

    const tabs = document.createElement('div');
    tabs.className = 'modules-tabs';

    const installedBtn = document.createElement('button');
    installedBtn.className = 'modules-tab active';
    installedBtn.textContent = 'Installed';

    const systemBtn = document.createElement('button');
    systemBtn.className = 'modules-tab';
    systemBtn.textContent = 'System';

    tabs.appendChild(installedBtn);
    tabs.appendChild(systemBtn);
    titleBar.appendChild(tabs);
    card.appendChild(titleBar);

    const installedList = document.createElement('ul');
    installedList.className = 'modules-list page-list';

    if (!installed.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No modules found.';
      installedList.appendChild(empty);
    } else {
      installed.forEach(m => {
        const li = document.createElement('li');
        const info = m.module_info || {};
        const desc = info.description ? ` - ${info.description}` : '';
        const status = m.is_active ? '' : ' (inactive)';
        li.textContent = `${m.module_name}${desc}${status}`;
        installedList.appendChild(li);
      });
    }

    const systemList = document.createElement('ul');
    systemList.className = 'modules-list page-list';
    systemList.style.display = 'none';

    if (!system.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No modules found.';
      systemList.appendChild(empty);
    } else {
      system.forEach(m => {
        const li = document.createElement('li');
        const info = m.moduleInfo || {};
        const desc = info.description ? ` - ${info.description}` : '';
        li.textContent = `${m.module_name}${desc}`;
        systemList.appendChild(li);
      });
    }

    card.appendChild(installedList);
    card.appendChild(systemList);

    installedBtn.addEventListener('click', () => {
      installedBtn.classList.add('active');
      systemBtn.classList.remove('active');
      installedList.style.display = '';
      systemList.style.display = 'none';
    });

    systemBtn.addEventListener('click', () => {
      systemBtn.classList.add('active');
      installedBtn.classList.remove('active');
      installedList.style.display = 'none';
      systemList.style.display = '';
    });

    el.innerHTML = '';
    el.appendChild(card);
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to load modules: ${err.message}</div>`;
  }
}
