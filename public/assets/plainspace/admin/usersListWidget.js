export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const meltdownEmit = window.meltdownEmit;

  try {
    const res = await meltdownEmit('getAllUsers', {
      jwt,
      moduleName: 'userManagement',
      moduleType: 'core'
    });
    const users = Array.isArray(res) ? res : (res?.data ?? []);

    const list = document.createElement('ul');
    list.className = 'users-list';

    if (!users.length) {
      const empty = document.createElement('li');
      empty.textContent = 'No users found.';
      list.appendChild(empty);
    } else {
      users.forEach(u => {
        const li = document.createElement('li');
        const name = u.display_name || u.username || u.email || `ID ${u.id}`;
        li.textContent = name;
        list.appendChild(li);
      });
    }

    el.innerHTML = '';
    el.appendChild(list);
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to load users: ${err.message}</div>`;
  }
}
