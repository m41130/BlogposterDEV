export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const meltdownEmit = window.meltdownEmit;

  try {
    const res = await meltdownEmit('listLoginStrategies', {
      jwt,
      moduleName: 'auth',
      moduleType: 'core'
    });
    let strategies = Array.isArray(res) ? res : (res?.data ?? []);
    strategies = strategies.filter(s => s.name !== 'adminLocal');

    const list = document.createElement('ul');
    list.className = 'login-strategies-list';

    if (!strategies.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No strategies found.';
      list.appendChild(empty);
    } else {
      strategies.forEach(s => {
        const li = document.createElement('li');

        const nameRow = document.createElement('div');
        nameRow.className = 'login-strategy-name-row';

        const nameEl = document.createElement('span');
        nameEl.className = 'login-strategy-name';
        nameEl.textContent = s.name;

        const scopeEl = document.createElement('span');
        scopeEl.className = 'login-strategy-scope';
        scopeEl.textContent = `(${s.scope || 'admin'})`;

        const actions = document.createElement('span');
        actions.className = 'login-strategy-actions';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'login-strategy-toggle-btn';
        toggleBtn.textContent = s.isEnabled ? 'Deactivate' : 'Activate';
        toggleBtn.addEventListener('click', async () => {
          try {
            await meltdownEmit('setLoginStrategyEnabled', {
              jwt,
              moduleName: 'auth',
              moduleType: 'core',
              strategyName: s.name,
              enabled: !s.isEnabled
            });
            s.isEnabled = !s.isEnabled;
            toggleBtn.textContent = s.isEnabled ? 'Deactivate' : 'Activate';
          } catch (err) {
            alert('Error: ' + err.message);
          }
        });

        actions.appendChild(toggleBtn);
        nameRow.appendChild(nameEl);
        nameRow.appendChild(scopeEl);
        nameRow.appendChild(actions);

        const desc = document.createElement('div');
        desc.className = 'login-strategy-desc';
        desc.textContent = s.description || '';

        li.appendChild(nameRow);
        li.appendChild(desc);
        list.appendChild(li);
      });
    }

    el.innerHTML = '';
    el.appendChild(list);
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to load strategies: ${err.message}</div>`;
  }
}
