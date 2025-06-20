//public/assets/js/register.js
// A tiny emitter: wraps /api/meltdown calls
async function meltdownEmit(eventName, payload = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (payload.jwt) {
    headers['X-Public-Token'] = payload.jwt;
  }

  const resp = await window.fetchWithTimeout('/api/meltdown', {
    method: 'POST',
    headers,
    body: JSON.stringify({ eventName, payload })
  });
  const json = await resp.json();
  if (!resp.ok || json.error) {
    throw new Error(json.error || resp.statusText);
  }
  return json.data;
}

// Redirect to login if FIRST_INSTALL_DONE is already true
(async () => {
  try {
    const pubTok = await meltdownEmit('issuePublicToken', {
      purpose: 'firstInstallCheck',
      moduleName: 'auth'
    });
    const val = await meltdownEmit('getPublicSetting', {
      jwt: pubTok,
      moduleName: 'settingsManager',
      moduleType: 'core',
      key: 'FIRST_INSTALL_DONE'
    });
    if (val === 'true') {
      window.location.href = '/login';
      return;
    }
  } catch (err) {
    console.error('[register] FIRST_INSTALL check failed', err);
  }
})();
  
  document
    .getElementById('registerForm')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const username = form.username.value.trim();
      const password = form.password.value;
      if (!username || !password) {
        return alert('Both username & password are required.');
      }
  
      try {
        // 1) get a fresh token for registration
        const pubJwt = await meltdownEmit('issuePublicToken', {
          purpose: 'registration',
          moduleName: 'auth'
        });

        // 2) create the admin user via the public registration event
        await meltdownEmit('publicRegister', {
          jwt: pubJwt,
          moduleName: 'userManagement',
          moduleType: 'core',
          username,
          password,
          role: 'admin'
        });
  
        alert('Registration successful! Please log in now.');
        window.location.href = '/login';
      } catch (err) {
        console.error(err);
        alert('Registration failed: ' + err.message);
      }
    });
  