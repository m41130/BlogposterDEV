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
        const name = info.moduleName || m.module_name;
        const version = info.version ? `v${info.version}` : '';
        const developer = info.developer || 'Unknown Developer';
        const desc = info.description || '';

        const details = document.createElement('div');
        details.className = 'module-details';

        const nameRow = document.createElement('div');
        nameRow.className = 'module-name-row';

        const nameEl = document.createElement('span');
        nameEl.className = 'module-name';
        nameEl.textContent = name;

        const actions = document.createElement('span');
        actions.className = 'module-actions';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'module-toggle-btn';
        toggleBtn.textContent = m.is_active ? 'Deactivate' : 'Activate';
        toggleBtn.addEventListener('click', async () => {
          try {
            await meltdownEmit(m.is_active ? 'deactivateModuleInRegistry' : 'activateModuleInRegistry', {
              jwt,
              moduleName: 'moduleLoader',
              moduleType: 'core',
              targetModuleName: m.module_name
            });
            m.is_active = !m.is_active;
            toggleBtn.textContent = m.is_active ? 'Deactivate' : 'Activate';
          } catch (err) {
            alert('Error: ' + err.message);
          }
        });

        actions.appendChild(toggleBtn);
        nameRow.appendChild(nameEl);
        nameRow.appendChild(actions);

        const meta = document.createElement('div');
        meta.className = 'module-meta';
        const pieces = [];
        if (version) pieces.push(version);
        if (developer) pieces.push(developer);
        if (desc) pieces.push(desc);
        meta.textContent = pieces.join(' \u2022 ');

        details.appendChild(nameRow);
        details.appendChild(meta);
        li.appendChild(details);

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
        const name = info.moduleName || m.module_name;
        const version = info.version ? `v${info.version}` : '';
        const developer = info.developer || 'Unknown Developer';
        const desc = info.description || '';

        const details = document.createElement('div');
        details.className = 'module-details';

        const nameRow = document.createElement('div');
        nameRow.className = 'module-name-row';

        const nameEl = document.createElement('span');
        nameEl.className = 'module-name';
        nameEl.textContent = name;

        nameRow.appendChild(nameEl);

        const meta = document.createElement('div');
        meta.className = 'module-meta';
        const pieces = [];
        if (version) pieces.push(version);
        if (developer) pieces.push(developer);
        if (desc) pieces.push(desc);
        meta.textContent = pieces.join(' \u2022 ');

        details.appendChild(nameRow);
        details.appendChild(meta);
        li.appendChild(details);

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
