document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('loginMsg');
  msg.textContent = '';
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  try {
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('password').value })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return location.reload();
    msg.textContent = data.error || 'Could not sign in.';
  } catch {
    msg.textContent = 'Network error. Try again.';
  }
  btn.disabled = false;
});
