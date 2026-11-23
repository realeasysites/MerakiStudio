(() => {
  const state = { type: 'bookings', status: 'all', artist: 'all', q: '', rows: [] };
  const list = document.getElementById('list');
  const artistSel = document.getElementById('artistFilter');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const when = (s) => {
    const d = new Date(s.replace(' ', 'T') + 'Z');
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  async function api(path, opts = {}) {
    const res = await fetch('/admin/api' + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (res.status === 401) { location.reload(); throw new Error('signed out'); }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
    return res.json();
  }

  async function loadSummary() {
    const s = await api('/summary');
    for (const t of ['bookings', 'applications']) {
      const b = document.getElementById('badge-' + t);
      b.textContent = s[t].new ? s[t].new + ' new' : '';
    }
  }

  async function load() {
    state.rows = await api('/' + state.type);
    if (state.type === 'bookings') {
      const artists = [...new Set(state.rows.map((r) => r.artist).filter(Boolean))].sort();
      artistSel.innerHTML = '<option value="all">All artists</option>' + artists.map((a) => `<option ${a === state.artist ? 'selected' : ''}>${esc(a)}</option>`).join('');
      artistSel.hidden = false;
    } else {
      artistSel.hidden = true;
    }
    render();
    loadSummary();
  }

  function matches(r) {
    if (state.status !== 'all' && r.status !== state.status) return false;
    if (state.type === 'bookings' && state.artist !== 'all' && r.artist !== state.artist) return false;
    if (state.q) {
      const hay = Object.values(r).join(' ').toLowerCase();
      if (!hay.includes(state.q.toLowerCase())) return false;
    }
    return true;
  }

  function field(label, val, href) {
    if (!val) return '';
    const v = href ? `<a href="${href}">${esc(val)}</a>` : esc(val);
    return `<div class="f"><span>${label}</span><p>${v}</p></div>`;
  }

  function card(r) {
    const tel = r.phone ? 'tel:' + r.phone.replace(/[^\d+]/g, '') : '';
    const body = state.type === 'bookings'
      ? field('Artist', r.artist) + field('Services', r.services) + field('Client', r.client_type) +
        field('Preferred days', r.preferred_days) + field('Preferred time', r.preferred_time) +
        field('Best way to reach', r.contact_pref) + field('Heard about us', r.source) + field('Notes', r.notes)
      : field('Specialty', r.specialty) + field('Experience', r.years) + field('Licensed', r.licensed) +
        field('Instagram', r.instagram) + field('Message', r.message);
    return `
      <article class="card status-${esc(r.status)}" data-id="${r.id}">
        <header>
          <div>
            <h3>${esc(r.name)}</h3>
            <p class="meta">${when(r.created_at)}</p>
          </div>
          <select class="status" aria-label="Status">
            ${['new', 'contacted', 'booked', 'closed'].map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
          </select>
        </header>
        <div class="contact">
          ${r.phone ? `<a class="pill" href="${tel}">Call ${esc(r.phone)}</a><a class="pill" href="sms:${r.phone.replace(/[^\d+]/g, '')}">Text</a>` : ''}
          ${r.email ? `<a class="pill" href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ''}
        </div>
        <div class="fields">${body}</div>
        <label class="note-label">Private note
          <textarea class="note" rows="2" placeholder="e.g. Passed to Brooke, booked for 12/4">${esc(r.admin_note || '')}</textarea>
        </label>
        <footer>
          <span class="saved" aria-live="polite"></span>
          <button class="danger delete">Delete</button>
        </footer>
      </article>`;
  }

  function render() {
    const rows = state.rows.filter(matches);
    if (!rows.length) {
      list.innerHTML = `<div class="empty"><p>${state.rows.length ? 'Nothing matches these filters.' : 'No requests yet. New ones from the website will show up here.'}</p></div>`;
      return;
    }
    list.innerHTML = rows.map(card).join('');
  }

  list.addEventListener('change', async (e) => {
    const cardEl = e.target.closest('.card');
    if (!cardEl || !e.target.classList.contains('status')) return;
    const id = cardEl.dataset.id;
    await api(`/${state.type}/${id}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
    const row = state.rows.find((r) => String(r.id) === id);
    if (row) row.status = e.target.value;
    cardEl.className = 'card status-' + e.target.value;
    loadSummary();
  });

  let noteTimer;
  list.addEventListener('input', (e) => {
    if (!e.target.classList.contains('note')) return;
    const cardEl = e.target.closest('.card');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(async () => {
      await api(`/${state.type}/${cardEl.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ admin_note: e.target.value }) });
      const row = state.rows.find((r) => String(r.id) === cardEl.dataset.id);
      if (row) row.admin_note = e.target.value;
      const s = cardEl.querySelector('.saved');
      s.textContent = 'Note saved';
      setTimeout(() => (s.textContent = ''), 1500);
    }, 600);
  });

  list.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('delete')) return;
    const cardEl = e.target.closest('.card');
    const name = cardEl.querySelector('h3').textContent;
    if (!confirm(`Delete the request from ${name}? This can't be undone.`)) return;
    await api(`/${state.type}/${cardEl.dataset.id}`, { method: 'DELETE' });
    state.rows = state.rows.filter((r) => String(r.id) !== cardEl.dataset.id);
    render();
    loadSummary();
  });

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
    state.type = t.dataset.type;
    state.artist = 'all';
    load();
  }));

  document.getElementById('statusFilters').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    document.querySelectorAll('#statusFilters .chip').forEach((x) => x.classList.toggle('active', x === b));
    state.status = b.dataset.status;
    render();
  });

  artistSel.addEventListener('change', () => { state.artist = artistSel.value; render(); });
  document.getElementById('search').addEventListener('input', (e) => { state.q = e.target.value.trim(); render(); });

  document.getElementById('logout').addEventListener('click', async () => {
    await fetch('/admin/logout', { method: 'POST' });
    location.reload();
  });

  load();
})();
