export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const meltdownEmit = window.meltdownEmit;

  let permissions = [];
  let roles = [];

  async function fetchPermissions() {
    const res = await meltdownEmit('getAllPermissions', {
      jwt,
      moduleName: 'userManagement',
      moduleType: 'core'
    });
    permissions = Array.isArray(res) ? res : (res?.data ?? []);
  }

  async function fetchRoles() {
    const res = await meltdownEmit('getAllRoles', {
      jwt,
      moduleName: 'userManagement',
      moduleType: 'core'
    });
    roles = Array.isArray(res) ? res : (res?.data ?? []);
  }

  function buildCard() {
    const card = document.createElement('div');
    card.className = 'permissions-card';

    const titleBar = document.createElement('div');
    titleBar.className = 'permissions-title-bar';

    const title = document.createElement('div');
    title.className = 'permissions-title';
    title.textContent = 'Permissions';

    const addPermBtn = document.createElement('img');
    addPermBtn.src = '/assets/icons/plus.svg';
    addPermBtn.alt = 'Add permission';
    addPermBtn.title = 'Add new permission';
    addPermBtn.className = 'icon add-permission-btn';

    const addGroupBtn = document.createElement('img');
    addGroupBtn.src = '/assets/icons/plus.svg';
    addGroupBtn.alt = 'Add group';
    addGroupBtn.title = 'Add permission group';
    addGroupBtn.className = 'icon add-group-btn';

    addPermBtn.addEventListener('click', async () => {
      const key = prompt('Permission key:');
      if (!key) return;
      const desc = prompt('Description (optional):') || '';
      try {
        await meltdownEmit('createPermission', {
          jwt,
          moduleName: 'userManagement',
          moduleType: 'core',
          permissionKey: key,
          description: desc
        });
        await fetchPermissions();
        renderPermissions();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    addGroupBtn.addEventListener('click', async () => {
      const name = prompt('Group name:');
      if (!name) return;
      const permStr = prompt('Permissions JSON:', '{}') || '{}';
      let perms;
      try {
        perms = JSON.parse(permStr);
      } catch (e) {
        alert('Invalid JSON');
        return;
      }
      try {
        await meltdownEmit('createRole', {
          jwt,
          moduleName: 'userManagement',
          moduleType: 'core',
          roleName: name,
          permissions: perms
        });
        await fetchRoles();
        renderRoles();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    titleBar.appendChild(title);
    titleBar.appendChild(addGroupBtn);
    titleBar.appendChild(addPermBtn);
    card.appendChild(titleBar);

    const groupLabel = document.createElement('div');
    groupLabel.className = 'permissions-sub-title';
    groupLabel.textContent = 'Permission Groups';
    card.appendChild(groupLabel);

    const roleListEl = document.createElement('ul');
    roleListEl.className = 'roles-list';
    card.appendChild(roleListEl);

    const permLabel = document.createElement('div');
    permLabel.className = 'permissions-sub-title';
    permLabel.textContent = 'Single Permissions';
    card.appendChild(permLabel);

    const permListEl = document.createElement('ul');
    permListEl.className = 'permissions-list';
    card.appendChild(permListEl);

    return { card, permListEl, roleListEl };
  }

  let permList;
  let roleList;

  function renderPermissions() {
    permList.innerHTML = '';
    if (!permissions.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'No permissions found.';
      permList.appendChild(empty);
    } else {
      permissions.forEach(p => {
        const li = document.createElement('li');
        li.textContent = p.permission_key + (p.description ? ` - ${p.description}` : '');
        permList.appendChild(li);
      });
    }
  }

  function renderRoles() {
    roleList.innerHTML = '';
    if (!roles.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'No permission groups found.';
      roleList.appendChild(empty);
    } else {
      roles.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r.role_name + (r.description ? ` - ${r.description}` : '');
        roleList.appendChild(li);
      });
    }
  }

  try {
    await fetchPermissions();
    await fetchRoles();
    const built = buildCard();
    permList = built.permListEl;
    roleList = built.roleListEl;
    renderRoles();
    renderPermissions();
    el.innerHTML = '';
    el.appendChild(built.card);
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to load permissions: ${err.message}</div>`;
  }
}
