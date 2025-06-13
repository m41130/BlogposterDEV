(async () => {
  try {
    const pubTok = await fetch('/api/meltdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'issuePublicToken',
        payload: { purpose: 'firstInstallCheck', moduleName: 'auth' }
      })
    }).then(r => r.json()).then(j => j.data);
    const val = await fetch('/api/meltdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Public-Token': pubTok },
      body: JSON.stringify({
        eventName: 'getPublicSetting',
        payload: { jwt: pubTok, moduleName: 'settingsManager', moduleType: 'core', key: 'FIRST_INSTALL_DONE' }
      })
    }).then(r => r.json()).then(j => j.data);
    if (val === 'true') {
      window.location.href = '/login';
      return;
    }
  } catch (err) {
    console.error('[install] FIRST_INSTALL check failed', err);
  }
})();

document.getElementById('installForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.name.value.trim(),
    username: form.username.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value,
    favoriteColor: form.favoriteColor.value
  };
  if (!data.name || !data.username || !data.email || !data.password) {
    alert('All fields are required.');
    return;
  }
  try {
    const resp = await fetch('/install', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
      },
      body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error(await resp.text());
    alert('Installation complete! Please log in.');
    window.location.href = '/login';
  } catch (err) {
    console.error(err);
    alert('Installation failed: ' + err.message);
  }
});
