(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Header + mobile menu ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = $('.menu-btn');
  const mm = $('#mobileMenu');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mm.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $$('a', mm).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mm.hidden) setMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 }) : null;
  $$('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

  /* ---------- Request bag (services picked) ---------- */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('meraki_bag') || '[]'); } catch { return []; } },
    set(v) { try { localStorage.setItem('meraki_bag', JSON.stringify(v)); } catch { /* private mode */ } }
  };
  let bag = store.get();
  const bagEl = $('#bag');
  const picked = $('#pickedList');

  function renderBag() {
    $$('.add').forEach((b) => {
      const on = bag.includes(b.dataset.svc);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $$('.qchip').forEach((b) => {
      const on = bag.includes(b.dataset.svc);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const custom = bag.filter((s) => !$$('.qchip').some((q) => q.dataset.svc === s));
    picked.innerHTML = custom.map((s) => `<button type="button" data-svc="${s.replace(/"/g, '&quot;')}" aria-label="Remove ${s.replace(/"/g, '&quot;')}">${s}</button>`).join('');
    $$('[data-bag-count]').forEach((c) => { c.textContent = bag.length; c.hidden = bag.length === 0; });
    bagEl.hidden = bag.length === 0 || nearBooking;
    store.set(bag);
  }
  function toggle(svc) {
    bag = bag.includes(svc) ? bag.filter((s) => s !== svc) : [...bag, svc];
    renderBag();
    bagEl.classList.remove('bump'); void bagEl.offsetWidth; bagEl.classList.add('bump');
  }
  $$('.add').forEach((b) => b.addEventListener('click', () => toggle(b.dataset.svc)));
  $$('.qchip').forEach((b) => b.addEventListener('click', () => toggle(b.dataset.svc)));
  picked.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) toggle(b.dataset.svc); });

  let nearBooking = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { nearBooking = en.isIntersecting; renderBag(); }, { threshold: 0.05 }).observe($('#book'));
  }
  renderBag();

  /* ---------- Service menu tabs ---------- */
  const tabs = $$('.mtab');
  const menuPhoto = $('#menuPhoto');
  function showTab(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      panel.classList.toggle('active', on);
      if (on && menuPhoto && panel.dataset.photo) {
        menuPhoto.style.opacity = 0;
        setTimeout(() => { menuPhoto.src = panel.dataset.photo; menuPhoto.style.opacity = 1; }, 200);
      }
    });
    if (window.innerWidth < 760) tab.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showTab(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); const n = tabs[(i + 1) % tabs.length]; n.focus(); showTab(n); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); const n = tabs[(i - 1 + tabs.length) % tabs.length]; n.focus(); showTab(n); }
    });
  });

  /* ---------- Artists ---------- */
  $$('.artist-filters .chip').forEach((chip) => chip.addEventListener('click', () => {
    $$('.artist-filters .chip').forEach((c) => c.classList.toggle('active', c === chip));
    const f = chip.dataset.filter;
    $$('.artist').forEach((a) => a.classList.toggle('dim', f !== 'all' && !a.dataset.tags.split(' ').includes(f)));
  }));
  $$('.artist').forEach((a) => {
    const bio = $('.bio', a);
    const more = $('.more', a);
    const flip = () => {
      bio.hidden = !bio.hidden;
      more.textContent = bio.hidden ? 'Her story' : 'Close';
    };
    more.addEventListener('click', flip);
    $('.artist-photo', a).addEventListener('click', flip);
  });
  const artistSelect = $('#artistSelect');
  $$('.pick').forEach((p) => p.addEventListener('click', () => {
    artistSelect.value = p.dataset.pick;
    artistSelect.classList.remove('flash'); void artistSelect.offsetWidth; artistSelect.classList.add('flash');
  }));

  /* ---------- The Edit gallery + lightbox ---------- */
  const SETS = {
    meraki: { n: 21, dir: 'edit', prefix: 'edit', alt: 'Hair color by a Meraki Studio artist' },
    radiance: { n: 14, dir: 'radiance', prefix: 'radiance', alt: 'Lash, brow or skin result from Meraki Studio' }
  };
  const gallery = $('#gallery');
  const moreBtn = $('#moreBtn');
  let current = 'meraki';
  let shown = 0;
  const PAGE = window.innerWidth < 760 ? 8 : 12;

  const pad = (n) => String(n).padStart(2, '0');
  const srcFor = (set, i, sm) => `/img/${SETS[set].dir}/${SETS[set].prefix}-${pad(i)}${sm ? '-sm' : ''}.jpg`;

  function addItems(count) {
    const set = SETS[current];
    const end = Math.min(set.n, shown + count);
    const frag = document.createDocumentFragment();
    for (let i = shown + 1; i <= end; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.index = i;
      b.setAttribute('aria-label', `Open photo ${i} of ${set.n}`);
      const img = new Image();
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = set.alt;
      img.src = srcFor(current, i, true);
      img.onload = () => img.classList.add('loaded');
      b.appendChild(img);
      frag.appendChild(b);
    }
    gallery.appendChild(frag);
    shown = end;
    moreBtn.hidden = shown >= set.n;
  }
  function showSet(name) {
    current = name; shown = 0; gallery.innerHTML = ''; addItems(PAGE);
  }
  $$('.etab').forEach((t) => t.addEventListener('click', () => {
    $$('.etab').forEach((x) => { x.classList.toggle('active', x === t); x.setAttribute('aria-selected', String(x === t)); });
    showSet(t.dataset.set);
  }));
  moreBtn.addEventListener('click', () => addItems(PAGE));
  showSet('meraki');

  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  let lbIndex = 1;
  let lastFocus = null;
  const lbShow = (i) => {
    const n = SETS[current].n;
    lbIndex = ((i - 1 + n) % n) + 1;
    lbImg.src = srcFor(current, lbIndex, false);
    lbImg.alt = SETS[current].alt;
  };
  gallery.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    lastFocus = b;
    lbShow(Number(b.dataset.index));
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.lb-close', lb).focus();
  });
  const lbClose = () => { lb.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
  $('.lb-close', lb).addEventListener('click', lbClose);
  $('.lb-prev', lb).addEventListener('click', () => lbShow(lbIndex - 1));
  $('.lb-next', lb).addEventListener('click', () => lbShow(lbIndex + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) lbClose(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
    if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
  });
  let tx = 0;
  lb.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
  });

  /* ---------- Forms ---------- */
  async function post(url, data) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Something went wrong. Please call or message us.');
    return body;
  }

  const bookForm = $('#bookForm');
  const bookMsg = $('#bookMsg');
  bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    bookMsg.className = 'form-msg';
    bookMsg.textContent = '';
    const fd = new FormData(bookForm);
    const data = Object.fromEntries(fd.entries());
    data.preferred_days = fd.getAll('days').join(', ');
    delete data.days;
    data.services = bag.join(', ');
    if (!data.name.trim()) return fail(bookMsg, 'Please add your name.', bookForm.name);
    if (!data.phone.trim() && !data.email.trim()) return fail(bookMsg, 'Add a phone number or email so your artist can reach you.', bookForm.phone);
    if (!data.services) return fail(bookMsg, 'Pick at least one service you’re interested in.');
    const btn = $('button[type="submit"]', bookForm);
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await post('/api/booking', data);
      bag = []; renderBag();
      const first = data.name.trim().split(' ')[0];
      bookForm.innerHTML = `<div class="success"><p class="word">thank you, ${escapeHtml(first)}</p><p>Your request is in! ${data.artist && data.artist !== 'Match me' ? escapeHtml(data.artist.split(' ')[0]) : 'Your artist'} will reach out soon to confirm a time. Can’t wait to see you in the chair.</p><p><a href="https://www.instagram.com/merakistudiome/" target="_blank" rel="noopener">Follow @merakistudiome</a> while you wait.</p></div>`;
      bookForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      fail(bookMsg, err.message);
      btn.disabled = false; btn.textContent = 'Send my request';
    }
  });

  function fail(el, msg, focusEl) {
    el.className = 'form-msg err';
    el.textContent = msg;
    if (focusEl) focusEl.focus();
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  const joinToggle = $('#joinToggle');
  const joinForm = $('#joinForm');
  joinToggle.addEventListener('click', () => {
    joinForm.hidden = false;
    joinToggle.hidden = true;
    joinToggle.setAttribute('aria-expanded', 'true');
    joinForm.name.focus();
  });
  const joinMsg = $('#joinMsg');
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(joinForm).entries());
    if (!data.name.trim()) return fail(joinMsg, 'Please add your name.', joinForm.name);
    if (!data.phone.trim() && !data.email.trim()) return fail(joinMsg, 'Add a phone number or email.', joinForm.phone);
    const btn = $('button[type="submit"]', joinForm);
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await post('/api/apply', data);
      joinForm.innerHTML = '<div class="success"><p class="word">so glad you reached out</p><p>We’ll be in touch soon.</p></div>';
    } catch (err) {
      fail(joinMsg, err.message);
      btn.disabled = false; btn.textContent = 'Send';
    }
  });

  /* ---------- Facebook live feed (lazy) ---------- */
  const fb = $('#fbFrame');
  function loadFb() {
    const w = Math.max(280, Math.min(500, Math.floor(fb.clientWidth)));
    const h = 560;
    const src = 'https://www.facebook.com/plugins/page.php?href=' + encodeURIComponent(fb.dataset.href) +
      `&tabs=timeline&width=${w}&height=${h}&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`;
    fb.innerHTML = `<iframe title="Meraki Studio on Facebook" src="${src}" width="${w}" height="${h}" scrolling="no" allowfullscreen loading="lazy" allow="encrypted-media; clipboard-write; picture-in-picture; web-share"></iframe>`;
  }
  if ('IntersectionObserver' in window) {
    const fio = new IntersectionObserver(([en]) => { if (en.isIntersecting) { loadFb(); fio.disconnect(); } }, { rootMargin: '400px' });
    fio.observe(fb);
  } else { loadFb(); }

  $('#yr').textContent = new Date().getFullYear();
})();
