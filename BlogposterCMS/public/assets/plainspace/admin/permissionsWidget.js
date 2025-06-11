export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const meltdownEmit = window.meltdownEmit;

  let permissions = [];

  async function fetchPermissions() {
    const res = await meltdownEmit('getAllPermissions', {
      jwt,
      moduleName: 'userManagement',
      moduleType: 'core'
    });
    permissions = Array.isArray(res) ? res : (res?.data ?? []);
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

    titleBar.appendChild(title);
    titleBar.appendChild(addPermBtn);
    card.appendChild(titleBar);

    const permListEl = document.createElement('ul');
    permListEl.className = 'permissions-list';
    card.appendChild(permListEl);

    return { card, permListEl };
  }

  let permList;

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

  try {
    await fetchPermissions();
    const built = buildCard();
    permList = built.permListEl;
    renderPermissions();
    el.innerHTML = '';
    el.appendChild(built.card);
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to load permissions: ${err.message}</div>`;
  }
}
