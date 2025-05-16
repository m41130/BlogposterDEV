// public/assets/js/login.js

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const { username, password } = e.target;

  const resp = await fetch('/admin/api/login', {
    method: 'POST',
    credentials: 'include',    // ← explizit include verwenden!
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.value, password: password.value })
  });

  const json = await resp.json();
  if (!resp.ok || !json.success) {
    alert(json.error || 'Login failed');
    return;
  }

  // Cookie gesetzt. Jetzt weiterleiten:
  window.location.href = '/admin/home';
});
