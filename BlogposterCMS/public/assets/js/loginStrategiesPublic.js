// public/assets/js/loginStrategiesPublic.js

(async () => {
  const container = document.getElementById('publicLoginStrategies');
  if (!container) return;

  try {
    const loginJwt = await window.meltdownEmit('issuePublicToken', {
      purpose: 'login',
      moduleName: 'auth'
    });

    let strategies = await window.meltdownEmit('listActiveLoginStrategies', {
      jwt: loginJwt,
      moduleName: 'auth',
      moduleType: 'core'
    });
    strategies = Array.isArray(strategies) ? strategies : (strategies?.data ?? []);
    strategies = strategies.filter(s =>
      s.name !== 'adminLocal' && (s.scope === 'public' || s.scope === 'global')
    );

    if (!strategies.length) {
      container.style.display = 'none';
      return;
    }

    const label = document.createElement('div');
    label.className = 'strategy-label';
    label.textContent = 'Other login options:';
    container.appendChild(label);

    strategies.forEach(strat => {
      const btn = document.createElement('button');
      btn.className = 'oauth-button';
      btn.textContent = strat.name;
      btn.addEventListener('click', () => {
        alert(`${strat.name} login is not implemented in this demo.`);
      });
      container.appendChild(btn);
    });
  } catch (err) {
    console.error('[publicLoginStrategies] failed', err);
  }
})();
