export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const meltdownEmit = window.meltdownEmit;

  let users = [];

  async function fetchUsers() {
    const res = await meltdownEmit('getAllUsers', {
      jwt,
      moduleName: 'userManagement',
      moduleType: 'core'
    });
    users = Array.isArray(res) ? res : (res?.data ?? []);
  }

  function buildCard() {
    const card = document.createElement('div');
    card.className = 'user-list-card';

    const titleBar = document.createElement('div');
    titleBar.className = 'user-title-bar';

    const title = document.createElement('div');
    title.className = 'user-title';
    title.textContent = 'Users';

    const addBtn = document.createElement('img');
    addBtn.src = '/assets/icons/plus.svg';
    addBtn.alt = 'Add user';
    addBtn.title = 'Add new user';
    addBtn.className = 'icon add-user-btn';
    addBtn.addEventListener('click', async () => {
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

    titleBar.appendChild(title);
    titleBar.appendChild(addBtn);
    card.appendChild(titleBar);

    const listEl = document.createElement('ul');
    listEl.className = 'users-list';
    card.appendChild(listEl);

    return { card, listEl };
  }

  let list;

  function renderUsers() {
    list.innerHTML = '';
    if (!users.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'No users found.';
      list.appendChild(empty);
    } else {
      users.forEach(u => {
        const li = document.createElement('li');
        const name = u.display_name || u.username || u.email || `ID ${u.id}`;
        const link = document.createElement('a');
        link.href = `/admin/settings/users/edit/${u.id}`;
        link.textContent = name;
        li.appendChild(link);
        list.appendChild(li);
      });
    }
  }

  try {
    await fetchUsers();
    const built = buildCard();
    const card = built.card;
    list = built.listEl;
    renderUsers();
    el.innerHTML = '';
    el.appendChild(card);
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to load users: ${err.message}</div>`;
  }
}
