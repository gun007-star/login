/* ==========================================================================
   SIBERTAK — Cyber Access Terminal
   script.js — latar animasi, jam HUD, efek ketik, validasi, login/registrasi
   Data akun disimulasikan di localStorage (frontend-only / demo).
   ========================================================================== */
'use strict';

/* ---------------- UTIL ---------------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Penyimpanan aman: fallback ke memori bila localStorage diblokir
   (mis. di preview sandbox / private mode), sehingga situs tidak error. */
function makeStore(storage) {
  const mem = {};
  const ok = !!storage;
  const rawGet = (k) => { try { return storage.getItem(k); } catch (e) { return null; } };
  const rawSet = (k, v) => { try { storage.setItem(k, v); return true; } catch (e) { return false; } };
  const rawDel = (k) => { try { storage.removeItem(k); } catch (e) { /* noop */ } };
  return {
    get(key, fallback) {
      if (ok) {
        const raw = rawGet(key);
        if (raw !== null) { try { return JSON.parse(raw); } catch (e) { /* korup */ } }
      }
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : fallback;
    },
    set(key, val) {
      if (!ok || !rawSet(key, JSON.stringify(val))) mem[key] = val;
    },
    remove(key) {
      if (ok) rawDel(key);
      delete mem[key];
    },
  };
}
function safeStorage(type) {
  try {
    const s = window[type];
    s.getItem('__probe');
    return s;
  } catch (e) { return null; }
}
const store        = makeStore(safeStorage('localStorage'));
const sessionStore = makeStore(safeStorage('sessionStorage'));

/* ---------------- TOAST ---------------- */
function toast(msg, type = 'info') {
  const stack = $('#toast-stack');
  if (!stack) return;
  const icons = { success: '✔', error: '✖', info: 'ⓘ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = icons[type] || 'ⓘ';
  const body = document.createElement('span');
  body.className = 'toast-msg';
  body.textContent = msg;
  el.append(icon, body);
  stack.appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  el.addEventListener('click', kill);
  setTimeout(kill, 4200);
}

/* ---------------- HASH KATA SANDI (SHA-256 + fallback demo) ---------------- */
async function hashPassword(pw) {
  try {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sibertak::' + pw));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { /* lanjut ke fallback */ }
  // Fallback non-kripto — hanya untuk lingkungan tanpa crypto.subtle
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  const s = 'sibertak::' + pw;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'fb' + (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/* ---------------- PENGGUNA & SESI ---------------- */
const getUsers = () => store.get('sibertak_users', []);
const saveUsers = (u) => store.set('sibertak_users', u);

async function seedDemoUser() {
  const users = getUsers();
  if (!users.some((u) => u.username === 'admin')) {
    users.push({
      username: 'admin',
      email: 'admin@sibertak.id',
      passHash: await hashPassword('sibertak123'),
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 217, // ~7 bulan lalu
    });
    saveUsers(users);
  }
}

function getSession() {
  return store.get('sibertak_session', null) || sessionStore.get('sibertak_session', null);
}
function createSession(user, remember) {
  const s = { username: user.username, loginAt: Date.now() };
  (remember ? store : sessionStore).set('sibertak_session', s);
}
function destroySession() {
  store.remove('sibertak_session');
  sessionStore.remove('sibertak_session');
}

/* ---------------- JAM HUD ---------------- */
const DAYS_ID = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
const MONTHS_ID = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
function tickClock() {
  const el = $('#hud-clock');
  if (!el) return;
  const n = new Date();
  const p = (x) => String(x).padStart(2, '0');
  el.textContent = `${DAYS_ID[n.getDay()]} ${p(n.getDate())} ${MONTHS_ID[n.getMonth()]} ${n.getFullYear()} // ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
}
setInterval(tickClock, 1000);
tickClock();

/* ---------------- LATAR: MATRIX RAIN + JARINGAN PARTIKEL ---------------- */
function initBackground() {
  const mCanvas = $('#matrix-canvas');
  const nCanvas = $('#net-canvas');
  if (!mCanvas || !nCanvas || REDUCED_MOTION) return;

  const mCtx = mCanvas.getContext('2d');
  const nCtx = nCanvas.getContext('2d');
  const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ABCDEF<>/#+=';
  const FONT = 16;
  let cols = [];
  let particles = [];
  let W = 0, H = 0;
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    [mCanvas, nCanvas].forEach((c) => { c.width = W; c.height = H; });
    // kolom matrix
    const count = Math.ceil(W / FONT);
    cols = Array.from({ length: count }, () => Math.floor(Math.random() * (H / FONT)));
    // partikel
    const target = Math.min(90, Math.floor((W * H) / 20000));
    particles = Array.from({ length: target }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: 1.2 + Math.random() * 1.6,
      magenta: Math.random() < 0.08,
    }));
    // frame pertama matrix: bersihkan
    mCtx.fillStyle = '#05080f';
    mCtx.fillRect(0, 0, W, H);
  }

  function drawMatrix() {
    mCtx.fillStyle = 'rgba(5, 8, 15, 0.09)';
    mCtx.fillRect(0, 0, W, H);
    mCtx.font = FONT + 'px "Share Tech Mono", monospace';
    for (let i = 0; i < cols.length; i++) {
      const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      const x = i * FONT;
      const y = cols[i] * FONT;
      mCtx.fillStyle = Math.random() < 0.03 ? '#bfffff' : '#00f0ff';
      mCtx.fillText(ch, x, y);
      if (y > H && Math.random() > 0.976) cols[i] = 0;
      else cols[i] += 1;
    }
  }

  function drawNet() {
    nCtx.clearRect(0, 0, W, H);
    const LINK = 130, MOUSE_LINK = 190;
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      nCtx.beginPath();
      nCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      nCtx.fillStyle = p.magenta ? 'rgba(255, 43, 214, 0.75)' : 'rgba(0, 240, 255, 0.7)';
      nCtx.fill();

      // garis ke tetangga
      for (const q of particles) {
        const dx = p.x - q.x, dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          const a = (1 - Math.sqrt(d2) / LINK) * 0.22;
          nCtx.strokeStyle = `rgba(0, 240, 255, ${a})`;
          nCtx.lineWidth = 1;
          nCtx.beginPath();
          nCtx.moveTo(p.x, p.y);
          nCtx.lineTo(q.x, q.y);
          nCtx.stroke();
        }
      }
      // garis ke kursor (interaktif)
      const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
      const md2 = mdx * mdx + mdy * mdy;
      if (md2 < MOUSE_LINK * MOUSE_LINK) {
        const a = (1 - Math.sqrt(md2) / MOUSE_LINK) * 0.45;
        nCtx.strokeStyle = `rgba(255, 43, 214, ${a})`;
        nCtx.lineWidth = 1;
        nCtx.beginPath();
        nCtx.moveTo(p.x, p.y);
        nCtx.lineTo(mouse.x, mouse.y);
        nCtx.stroke();
      }
    }
  }

  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseout', () => { mouse.x = -9999; mouse.y = -9999; });
  window.addEventListener('resize', resize);
  resize();

  let frame = 0;
  (function loop() {
    requestAnimationFrame(loop);
    frame++;
    drawNet();
    if (frame % 3 === 0) drawMatrix(); // matrix ~20fps agar hemat
  })();
}

/* ---------------- EFEK TILT KARTU ---------------- */
function initTilt() {
  const card = $('#auth-card');
  if (!card || REDUCED_MOTION || window.matchMedia('(hover: none)').matches) return;
  card.addEventListener('mousemove', (e) => {
    if (window.innerWidth < 960) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(1200px) rotateY(${(x * 5).toFixed(2)}deg) rotateX(${(-y * 5).toFixed(2)}deg)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
}

/* ---------------- TERMINAL KETIK ---------------- */
function initTerminal() {
  const body = $('#terminal-body');
  if (!body || REDUCED_MOTION) {
    if (body) body.textContent = '> sistem siap. menunggu autentikasi operatif_';
    return;
  }
  const lines = [
    ['> inisialisasi SIBERTAK v2.7.1 ........ ', '[OK]'],
    ['> memuat modul enkripsi AES-256 ........ ', '[OK]'],
    ['> verifikasi integritas jaringan ....... ', '[OK]'],
    ['> scanner ancaman: 0 penetrasi terdeteksi', ''],
    ['> menunggu autentikasi operatif', ''],
  ];
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.textContent = '█';

  (async function typeAll() {
    for (const [text, tag] of lines) {
      const line = document.createElement('div');
      line.className = 'tl';
      body.appendChild(line);
      for (let i = 0; i <= text.length; i++) {
        line.textContent = text.slice(0, i);
        line.appendChild(cursor);
        await delay(16);
      }
      if (tag) {
        const ok = document.createElement('span');
        ok.className = 'ok';
        ok.textContent = tag;
        line.appendChild(ok);
      }
      await delay(260);
    }
  })();
}

/* ---------------- HELPERS FORM ---------------- */
function setErr(input, msg) {
  const field = input.closest('.field');
  if (!field) return;
  field.classList.add('invalid');
  const m = $('.error-msg', field);
  if (m) m.textContent = msg;
}
function clearErr(input) {
  const field = input.closest('.field');
  if (!field) return;
  field.classList.remove('invalid');
  const m = $('.error-msg', field);
  if (m) m.textContent = '';
}
function clearAllErrors() {
  $$('.field.invalid').forEach((f) => f.classList.remove('invalid'));
}
function setLoading(btn, on, text) {
  if (!btn) return;
  btn.classList.toggle('loading', on);
  btn.disabled = on;
  const span = $('span', btn);
  if (span && text) span.textContent = text;
}

/* Overlay AKSES DIBERIKAN / DITOLAK */
function flashOverlay(text, danger, duration = 1200) {
  const ov = $('#result-overlay');
  const tx = $('#overlay-text');
  if (!ov || !tx) return Promise.resolve();
  tx.textContent = text;
  ov.classList.toggle('danger', !!danger);
  ov.classList.remove('hidden');
  requestAnimationFrame(() => ov.classList.add('show'));
  return new Promise((res) => setTimeout(() => {
    ov.classList.remove('show');
    setTimeout(() => { ov.classList.add('hidden'); res(); }, 280);
  }, duration));
}

/* Toggle lihat sandi + peringatan caps lock */
function initInputExtras() {
  $$('.toggle-pass').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = $('.input-wrap input', btn.closest('.input-wrap'));
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.classList.toggle('showing', show);
      btn.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      input.focus();
    });
  });
  $$('.input-pass').forEach((inp) => {
    const field = inp.closest('.field');
    const warn = field ? $('.caps-warning', field) : null;
    const check = (e) => {
      if (warn && e.getModifierState) warn.classList.toggle('hidden', !e.getModifierState('CapsLock'));
    };
    inp.addEventListener('keydown', check);
    inp.addEventListener('keyup', check);
    inp.addEventListener('blur', () => { if (warn) warn.classList.add('hidden'); });
  });
}

/* Meter kekuatan sandi */
function initStrength() {
  const pass = $('#reg-pass');
  const meter = $('#strength');
  const label = $('#strength-label');
  if (!pass || !meter || !label) return;
  const LEVELS = ['KEKUATAN: —', 'KEKUATAN: LEMAH', 'KEKUATAN: SEDANG', 'KEKUATAN: KUAT', 'KEKUATAN: SANGAT KUAT'];
  pass.addEventListener('input', () => {
    const v = pass.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (v.length >= 12) score++;
    if (/[a-zA-Z]/.test(v) && /\d/.test(v)) score++;
    if (/[^a-zA-Z0-9]/.test(v) || (/[a-z]/.test(v) && /[A-Z]/.test(v))) score++;
    if (!v) score = 0;
    meter.dataset.level = String(score);
    $$('.seg', meter).forEach((s, i) => s.classList.toggle('on', i < score));
    label.textContent = LEVELS[score];
  });
}

/* ---------------- HALAMAN AUTH (index.html) ---------------- */
function initAuthPage() {
  const loginForm = $('#login-form');
  const regForm = $('#register-form');
  if (!loginForm || !regForm) return;

  const tabs = $('#tabs');
  const loginBtn = $('#login-btn');
  const regBtn = $('#reg-btn');
  const card = $('#auth-card');

  function switchTab(name) {
    $$('.tab', tabs).forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    tabs.classList.toggle('register', name === 'register');
    $$('.auth-form').forEach((f) => f.classList.toggle('active', f.id === name + '-form'));
    clearAllErrors();
  }
  $$('.tab', tabs).forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  $$('[data-switch]').forEach((a) =>
    a.addEventListener('click', (e) => { e.preventDefault(); switchTab(a.dataset.switch); })
  );

  $('#forgot-link').addEventListener('click', (e) => {
    e.preventDefault();
    toast('Hubungi administrator SIBERTAK untuk melakukan reset kata sandi.', 'info');
  });

  /* ---- VALIDASI ---- */
  const rules = {
    username(v) {
      if (!v) return 'ID pengguna wajib diisi';
      if (v.length < 3 || v.length > 20) return 'Panjang 3–20 karakter';
      if (!/^[a-zA-Z0-9_.]+$/.test(v)) return 'Hanya huruf, angka, titik, dan underscore';
      return '';
    },
    email(v) {
      if (!v) return 'Email wajib diisi';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Format email tidak valid';
      return '';
    },
    password(v) {
      if (!v) return 'Kata sandi wajib diisi';
      if (v.length < 8) return 'Minimal 8 karakter';
      if (!/[a-zA-Z]/.test(v) || !/\d/.test(v)) return 'Harus kombinasi huruf dan angka';
      return '';
    },
    confirm(v, p) {
      if (!v) return 'Konfirmasi kata sandi wajib diisi';
      if (v !== p) return 'Konfirmasi tidak cocok';
      return '';
    },
  };

  /* ---- LOGIN ---- */
  let attempts = 0;
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idI = $('#login-id');
    const passI = $('#login-pass');
    const remember = $('#remember');
    clearAllErrors();

    let ok = true;
    if (!idI.value.trim()) { setErr(idI, 'ID pengguna wajib diisi'); ok = false; }
    if (!passI.value) { setErr(passI, 'Kata sandi wajib diisi'); ok = false; }
    if (!ok) return;

    setLoading(loginBtn, true, 'MEMVERIFIKASI');
    await delay(750);

    const id = idI.value.trim().toLowerCase();
    const user = getUsers().find(
      (u) => u.username.toLowerCase() === id || u.email === id
    );
    const hash = await hashPassword(passI.value);
    setLoading(loginBtn, false, 'MASUK');

    if (!user || user.passHash !== hash) {
      attempts++;
      passI.value = '';
      await flashOverlay('AKSES DITOLAK', true, 1000);
      toast('ID pengguna atau kata sandi salah. Coba lagi.', 'error');
      card.style.transform = '';
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 500);
      if (attempts >= 3) toast('Tips: gunakan akun demo admin / sibertak123', 'info');
      return;
    }

    createSession(user, remember.checked);
    await flashOverlay('AKSES DIBERIKAN', false, 1100);
    toast('Autentikasi berhasil. Mengalihkan ke dashboard…', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
  });

  /* ---- REGISTRASI ---- */
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uI = $('#reg-username');
    const eI = $('#reg-email');
    const pI = $('#reg-pass');
    const cI = $('#reg-confirm');
    const terms = $('#terms');
    clearAllErrors();

    let ok = true;
    const vu = rules.username(uI.value.trim());
    const ve = rules.email(eI.value.trim());
    const vp = rules.password(pI.value);
    const vc = rules.confirm(cI.value, pI.value);
    if (vu) { setErr(uI, vu); ok = false; }
    if (ve) { setErr(eI, ve); ok = false; }
    if (vp) { setErr(pI, vp); ok = false; }
    if (vc) { setErr(cI, vc); ok = false; }
    if (!terms.checked) {
      $('#terms-field').classList.add('invalid');
      toast('Centang persetujuan Syarat & Ketentuan untuk melanjutkan.', 'error');
      ok = false;
    }
    if (!ok) return;

    const users = getUsers();
    const uname = uI.value.trim();
    if (users.some((x) => x.username.toLowerCase() === uname.toLowerCase())) {
      setErr(uI, 'ID pengguna sudah dipakai'); return;
    }
    const email = eI.value.trim().toLowerCase();
    if (users.some((x) => x.email === email)) {
      setErr(eI, 'Email sudah terdaftar'); return;
    }

    setLoading(regBtn, true, 'MEMPROSES');
    await delay(850);
    users.push({
      username: uname,
      email,
      passHash: await hashPassword(pI.value),
      createdAt: Date.now(),
    });
    saveUsers(users);
    setLoading(regBtn, false, 'BUAT AKUN');

    toast('Akun berhasil dibuat! Silakan masuk.', 'success');
    regForm.reset();
    initStrengthReset();
    switchTab('login');
    $('#login-id').value = uname;
    $('#login-pass').focus();

    function initStrengthReset() {
      const meter = $('#strength');
      if (meter) { meter.dataset.level = '0'; $$('.seg', meter).forEach((s) => s.classList.remove('on')); }
      const label = $('#strength-label');
      if (label) label.textContent = 'KEKUATAN: —';
    }
  });

  seedDemoUser();
}

/* ---------------- HALAMAN DASHBOARD (dashboard.html) ---------------- */
function initDashboard() {
  const nameEl = $('#dash-username');
  if (!nameEl) return;

  const session = getSession();
  if (!session) {
    flashOverlay('SESI TIDAK DITEMUKAN // MENGALIHKAN', true, 1500).then(() => {
      window.location.href = 'index.html';
    });
    return;
  }

  const user = getUsers().find((u) => u.username.toLowerCase() === session.username.toLowerCase());

  nameEl.textContent = session.username;
  $('#dash-initial').textContent = session.username.charAt(0).toUpperCase();
  $('#dash-since').textContent = user
    ? new Date(user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : '—';
  const t = new Date(session.loginAt);
  const p = (x) => String(x).padStart(2, '0');
  $('#dash-login').textContent = `${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())} WIB`;

  /* Log aktivitas */
  const log = $('#log-list');
  const entries = [
    [session.loginAt, 'LOGIN', `Operatif ${session.username} terautentikasi dari terminal KRW-01`],
    [session.loginAt - 1000 * 60 * 7, 'OK', 'Pemindaian menyeluruh: tidak ada ancaman terdeteksi'],
    [session.loginAt - 1000 * 60 * 26, 'OK', 'Backup terenkripsi node selesai'],
    [session.loginAt - 1000 * 60 * 58, 'INFO', 'Pembaruan definisi ancaman v.4121 diterapkan'],
    [session.loginAt - 1000 * 60 * 112, 'OK', 'Rotasi kunci sesi berhasil'],
  ];
  entries.forEach(([ts, tag, msg]) => {
    const li = document.createElement('li');
    const time = document.createElement('span');
    time.className = 'log-time';
    const d = new Date(ts);
    time.textContent = `${p(d.getHours())}:${p(d.getMinutes())}`;
    const tg = document.createElement('span');
    tg.className = tag === 'OK' ? 'log-tag-ok' : 'log-tag-info';
    tg.textContent = `[${tag}]`;
    const m = document.createElement('span');
    m.className = 'log-msg';
    m.textContent = msg;
    li.append(time, tg, m);
    log.appendChild(li);
  });

  /* Telemetri palsu yang bergerak */
  function setStat(key, val) {
    const fill = $(`#${key}-fill`);
    const out = $(`#${key}-val`);
    if (!fill) return;
    fill.style.width = val + '%';
    fill.classList.toggle('hot', val > 82);
    if (out) out.textContent = val + '%';
  }
  function scramble() {
    setStat('cpu', 18 + Math.floor(Math.random() * 72));
    setStat('ram', 30 + Math.floor(Math.random() * 60));
    setStat('net', 10 + Math.floor(Math.random() * 85));
  }
  scramble();
  setInterval(scramble, 2400);

  /* Logout */
  $('#logout-btn').addEventListener('click', async () => {
    destroySession();
    await flashOverlay('SESI DIAKHIRI', true, 900);
    window.location.href = 'index.html';
  });
}

/* ---------------- BOOT ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  initBackground();
  initTilt();
  initTerminal();
  initInputExtras();
  initStrength();
  initAuthPage();
  initDashboard();
});
