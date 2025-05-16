//public/assets/js/register.js
// A tiny emitter: wraps /api/meltdown calls
async function meltdownEmit(eventName, payload) {
    const resp = await fetch('/api/meltdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, payload })
    });
    const json = await resp.json();
    if (!resp.ok || json.error) {
      throw new Error(json.error || resp.statusText);
    }
    return json.data;
  }
  
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
  
        // 2) create the admin user
        await meltdownEmit('createUser', {
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
  