export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const meltdownEmit = window.meltdownEmit;

  let users = [];
  let permissions = [];

  async function fetchUsers() {
    const res = await meltdownEmit('getAllUsers', {
      jwt,
      moduleName: 'userManagement',
      moduleType: 'core'
    });
    users = Array.isArray(res) ? res : (res?.data ?? []);
  }

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
    card.className = 'user-list-card';

    const titleBar = document.createElement('div');
    titleBar.className = 'user-title-bar';

    const title = document.createElement('div');
    title.className = 'user-title';
    title.textContent = 'User Management';

    const tabs = document.createElement('div');
    tabs.className = 'users-tabs';

    const usersBtn = document.createElement('button');
    usersBtn.className = 'users-tab active';
    usersBtn.textContent = 'Users';

    const permsBtn = document.createElement('button');
    permsBtn.className = 'users-tab';
    permsBtn.textContent = 'Permissions';

    tabs.appendChild(usersBtn);
    tabs.appendChild(permsBtn);

    const addUserBtn = document.createElement('img');
    addUserBtn.src = '/assets/icons/plus.svg';
    addUserBtn.alt = 'Add user';
    addUserBtn.title = 'Add new user';
    addUserBtn.className = 'icon add-user-btn';
    addUserBtn.addEventListener('click', async () => {
      const username = prompt('Username:');
      if (!username) return;
      const password = prompt('Password:');
      if (!password) return;
      const email = prompt('Email (optional):') || '';
      try {
        await meltdownEmit('createUser', {
          jwt,
          moduleName: 'userManagement',
          moduleType: 'core',
          username,
          password,
          email
        });
        await fetchUsers();
        renderUsers();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    const addPermBtn = document.createElement('img');
    addPermBtn.src = '/assets/icons/plus.svg';
    addPermBtn.alt = 'Add permission';
    addPermBtn.title = 'Add new permission';
    addPermBtn.className = 'icon add-permission-btn';
    addPermBtn.style.display = 'none';
    addPermBtn.addEventListener('click', () => {
      window.location.href = '/admin/settings/permissions';
    });

    titleBar.appendChild(title);
    titleBar.appendChild(tabs);
    titleBar.appendChild(addUserBtn);
    titleBar.appendChild(addPermBtn);
    card.appendChild(titleBar);

    const usersListEl = document.createElement('ul');
    usersListEl.className = 'users-list';
    card.appendChild(usersListEl);

    const permsListEl = document.createElement('ul');
    permsListEl.className = 'permissions-list';
    permsListEl.style.display = 'none';
    card.appendChild(permsListEl);

    usersBtn.addEventListener('click', () => {
      usersBtn.classList.add('active');
      permsBtn.classList.remove('active');
      usersListEl.style.display = '';
      permsListEl.style.display = 'none';
      addUserBtn.style.display = '';
      addPermBtn.style.display = 'none';
    });

    permsBtn.addEventListener('click', () => {
      permsBtn.classList.add('active');
      usersBtn.classList.remove('active');
      usersListEl.style.display = 'none';
      permsListEl.style.display = '';
      addUserBtn.style.display = 'none';
      addPermBtn.style.display = '';
    });

    return { card, usersListEl, permsListEl };
  }

  let userList;
  let permList;

  function renderUsers() {
    userList.innerHTML = '';
    if (!users.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'No users found.';
      userList.appendChild(empty);
    } else {
      users.forEach(u => {
        const li = document.createElement('li');
        const name = u.display_name || u.username || u.email || `ID ${u.id}`;
        const link = document.createElement('a');
        link.href = `/admin/settings/users/edit/${u.id}`;
        link.textContent = name;
        li.appendChild(link);
        userList.appendChild(li);
      });
    }
  }

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
    await Promise.all([fetchUsers(), fetchPermissions()]);
    const built = buildCard();
    const card = built.card;
    userList = built.usersListEl;
    permList = built.permsListEl;
    renderUsers();
    renderPermissions();
    el.innerHTML = '';
    el.appendChild(card);
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to load users: ${err.message}</div>`;
  }
}
