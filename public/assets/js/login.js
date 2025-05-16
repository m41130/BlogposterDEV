document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const { username, password } = e.target;

  const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]').content;

  const resp = await fetch('/admin/api/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': CSRF_TOKEN
    },
    body: JSON.stringify({
      username: username.value,
      password: password.value
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(errText || 'Login failed');
  }

  window.location.href = '/admin';
});
