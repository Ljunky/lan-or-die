/* LAN OR DIE – Mission 3 phone: a real phone screen (status bar, wallpaper, clock, app icons) with an app store.
   Apps are data (data/m3-data.js → apps, phone). Three kinds:
     lines   – tap it, get a funny line (optionally with an effect: use, once, cooldownMin, gate). The original five apps.
     widget  – a small working app: torch, calc, compass, eight, fart, messages, weather, camera, hemnet.
     custom  – K.phoneApps[id](host) lets another module draw its own app (the Dex).
   An app with `store: { price }` is not on the phone until you download it in the Appbutiken (price in kr, 0 = free).
   window.M3_PHONE(K) → { open(), installed(), homeApps(), storeApps() }. open() resolves when the phone goes back in the pocket. */
window.M3_PHONE = function (K) {
'use strict';
const { D, rel } = K;
const R = D.raw, { pick, rand, fmt, clamp } = LOD;
const G = () => K.G, now = () => Date.now();
const CSS = `
#m3ui .ph{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;background:rgba(6,9,14,.78);pointer-events:auto;touch-action:manipulation}
#m3ui .ph[hidden]{display:none}
#m3ui .ph-body{position:relative;width:min(calc(100% - 20px),340px);height:min(calc(100% - 24px),640px);border-radius:34px;background:#0b0e14;border:6px solid #2a3142;box-shadow:0 0 0 2px #0b0e14,0 14px 44px rgba(0,0,0,.7);display:flex;flex-direction:column;overflow:hidden;color:#fff;font:600 15px/1.3 Barlow,system-ui,sans-serif;animation:m3pop .18s ease-out}
#m3ui .ph-bar{display:flex;justify-content:space-between;align-items:center;padding:8px 18px 4px;font:700 12px Barlow,sans-serif;flex:none;z-index:2}
#m3ui .ph-bar i{font-style:normal;opacity:.9}
#m3ui .ph-bar .notch{position:absolute;left:50%;top:6px;width:64px;height:14px;margin-left:-32px;border-radius:8px;background:#000}
#m3ui .ph-screen{flex:1;min-height:0;overflow-y:auto;position:relative;display:flex;flex-direction:column}
#m3ui .ph-home{background:linear-gradient(160deg,var(--w1,#1b2a4a),var(--w2,#4a1d5a))}
#m3ui .ph-clock{text-align:center;padding:14px 0 8px;flex:none}
#m3ui .ph-clock b{display:block;font:400 54px/1 Bungee,Impact,sans-serif;letter-spacing:.02em}
#m3ui .ph-clock span{font-size:13px;opacity:.85}
#m3ui .ph-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 6px;padding:10px 12px 12px}
#m3ui .ph-app{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:0;color:#fff;cursor:pointer;padding:0;font:600 11px Barlow,sans-serif;min-width:0}
#m3ui .ph-app u{text-decoration:none;display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:15px;font-size:28px;background:var(--c,#3a4660);box-shadow:inset 0 -3px 0 rgba(0,0,0,.25),0 3px 8px rgba(0,0,0,.35);position:relative}
#m3ui .ph-app:active u{transform:scale(.93)}
#m3ui .ph-app span{max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 3px #000}
#m3ui .ph-app em{position:absolute;right:-4px;top:-4px;min-width:18px;height:18px;border-radius:9px;background:#e3000f;font:700 11px/18px Barlow,sans-serif;font-style:normal;text-align:center}
#m3ui .ph-nav{flex:none;display:flex;justify-content:center;padding:6px 0 10px;background:transparent}
#m3ui .ph-nav button{width:120px;height:26px;border-radius:13px;border:0;background:rgba(255,255,255,.28);color:#fff;font:700 12px Barlow,sans-serif;cursor:pointer}
#m3ui .ph-app-view{background:#10141c;padding:0 0 12px}
#m3ui .ph-head{display:flex;align-items:center;gap:8px;padding:8px 14px;font:400 17px Bungee,Impact,sans-serif;position:sticky;top:0;background:#10141c;z-index:2}
#m3ui .ph-head b{font-size:24px;font-weight:400}
#m3ui .ph-pad{padding:6px 14px 10px}
#m3ui .ph-card{background:#1c2230;border-radius:14px;padding:12px 14px;margin:6px 0;white-space:pre-line}
#m3ui .ph-btn{display:block;width:100%;min-height:46px;border-radius:12px;border:0;background:#ffd23a;color:#1c1c2a;font:400 17px Bungee,Impact,sans-serif;cursor:pointer;margin-top:8px}
#m3ui .ph-btn.alt{background:#2c3550;color:#fff}
#m3ui .ph-btn[disabled]{opacity:.45}
#m3ui .ph-row{display:flex;align-items:center;gap:10px;background:#1c2230;border-radius:14px;padding:8px 10px;margin:6px 0}
#m3ui .ph-row u{text-decoration:none;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;font-size:24px;background:var(--c,#3a4660);flex:none}
#m3ui .ph-row div{flex:1;min-width:0}#m3ui .ph-row small{display:block;opacity:.7;font-size:12px}
#m3ui .ph-row button{border:0;border-radius:10px;background:#3ddc84;color:#0b0e14;font:700 13px Barlow,sans-serif;padding:7px 12px;cursor:pointer;min-width:70px}
#m3ui .ph-row button[disabled]{background:#3a4660;color:#9aa6c0}
#m3ui .ph-row img{width:40px;height:40px;image-rendering:auto}#m3ui .ph-row .noart{font:400 18px Bungee,Impact,sans-serif;font-style:normal;color:#10141c;width:30px;height:30px;border:3px solid;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e9eef5}
#m3ui .dexpic{font-size:60px}#m3ui .dexpic img{width:110px;height:110px;image-rendering:auto}#m3ui .dexpic .noart{font:400 42px Bungee,Impact,sans-serif;font-style:normal;color:#10141c;width:90px;height:90px;border:6px solid;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#e9eef5}
#m3ui .ph-bub{max-width:82%;padding:7px 11px;border-radius:16px;margin:5px 0;background:#2a3350}
#m3ui .ph-bub small{display:block;font:700 11px Barlow,sans-serif;opacity:.65}
#m3ui .ph-bub.me{margin-left:auto;background:#2f7d57}
#m3ui .ph-calc{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
#m3ui .ph-calc button{height:48px;border-radius:12px;border:0;background:#2c3550;color:#fff;font:700 20px Barlow,sans-serif;cursor:pointer}
#m3ui .ph-calc button.op{background:#f08a24}#m3ui .ph-calc button.eq{background:#3ddc84;color:#0b0e14}
#m3ui .ph-disp{background:#000;border-radius:12px;padding:10px 14px;text-align:right;font:700 30px Barlow,sans-serif;min-height:56px;overflow:hidden;margin-bottom:8px}
#m3ui .ph-torch{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;transition:background .2s;text-align:center;padding:14px}
#m3ui .ph-needle{position:relative;width:170px;height:170px;margin:10px auto;border-radius:50%;border:4px solid #3a4660;background:radial-gradient(#1c2230,#10141c)}
#m3ui .ph-needle i{position:absolute;left:50%;top:50%;width:6px;height:74px;margin-left:-3px;margin-top:-74px;border-radius:3px;background:linear-gradient(#e3000f 50%,#cbd3e6 50%);transform-origin:50% 100%}
#m3ui .ph-needle span{position:absolute;font:700 12px Barlow,sans-serif;opacity:.7}
#m3ui .ph-ball{width:150px;height:150px;border-radius:50%;margin:10px auto;background:radial-gradient(circle at 35% 30%,#555,#000 70%);display:flex;align-items:center;justify-content:center;text-align:center;padding:26px;font:700 13px/1.15 Barlow,sans-serif;color:#9ec0ff}
#m3ui .ph-ball.shake{animation:phshake .5s}
@keyframes phshake{20%{transform:translateX(-12px) rotate(-8deg)}40%{transform:translateX(12px) rotate(8deg)}60%{transform:translateX(-8px)}80%{transform:translateX(8px)}}
#m3ui .ph-cam{height:230px;border-radius:14px;background:#000;display:flex;align-items:center;justify-content:center;font-size:90px;position:relative;overflow:hidden}
#m3ui .ph-cam.flash::after{content:'';position:absolute;inset:0;background:#fff;animation:phflash .35s forwards}
@keyframes phflash{to{opacity:0}}
`;
let el = null, view = 'home', closeFn = null, tickT = null;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cfg = () => R.phone || {};
function ensure() {
  if (el) return el;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  el = document.createElement('div'); el.className = 'ph'; el.hidden = true;
  el.innerHTML = '<div class="ph-body"><div class="ph-bar"><i class="t"></i><span class="notch"></span><i class="b"></i></div><div class="ph-screen"></div><div class="ph-nav"><button>‹ Home</button></div></div>';
  el.querySelector('.ph-nav button').addEventListener('click', () => { LOD.tone(660, .04, 'square', .04); if (view !== 'home') go('home'); else close(); });
  el.addEventListener('click', e => { if (e.target === el) close(); });
  K.uiRoot.appendChild(el); return el;
}
const screen = () => el.querySelector('.ph-screen');
const clock = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
function bar() { el.querySelector('.t').textContent = clock(); el.querySelector('.b').textContent = '📶 ' + (cfg().battery != null ? cfg().battery : 4) + ' % 🔋'; }

/* ---------- which apps are on the phone ---------- */
const inst = () => { const g = G(); g.installed = g.installed || {}; return g.installed; };
const allApps = () => Object.keys(R.apps).filter(id => rel(R.apps[id]));
const homeApps = () => allApps().filter(id => !R.apps[id].store || inst()[id]);
const storeApps = () => allApps().filter(id => R.apps[id].store && (!R.apps[id].store.needs || inst()[R.apps[id].store.needs]));

function go(v, arg) { view = v; render(arg); }
function close() { clearInterval(tickT); tickT = null; if (el) el.hidden = true; const f = closeFn; closeFn = null; if (f) f(); }
const head = (app, title) => '<div class="ph-head"><b>' + (app ? app.icon : '📱') + '</b>' + esc(title || (app && app.name) || '') + '</div>';

function render(arg) {
  clearInterval(tickT); tickT = null; bar();
  const s = screen(), g = G();
  s.className = 'ph-screen';
  if (view === 'home') {
    s.classList.add('ph-home'); const w = cfg().wallpaper || ['#1b2a4a', '#4a1d5a']; s.style.setProperty('--w1', w[0]); s.style.setProperty('--w2', w[1]);
    const d = new Date(), days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    s.innerHTML = '<div class="ph-clock"><b>' + clock() + '</b><span>' + days[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '</span></div><div class="ph-grid">' +
      homeApps().map(id => { const a = R.apps[id], badge = a.widget === 'messages' ? '<em>' + unread() + '</em>' : ''; return '<button class="ph-app" data-a="' + id + '"><u style="--c:' + (a.color || '#3a4660') + '">' + a.icon + badge + '</u><span>' + esc(a.name) + '</span></button>'; }).join('') + '</div>';
    s.querySelectorAll('.ph-app').forEach(b => b.addEventListener('click', () => openApp(b.dataset.a)));
    tickT = setInterval(() => { if (view === 'home') { const c = s.querySelector('.ph-clock b'); if (c) c.textContent = clock(); } bar(); }, 5000);
    return;
  }
  s.classList.add('ph-app-view');
  const app = R.apps[arg];
  if (view === 'lines') return renderLines(s, app, arg);
  if (view === 'store') return renderStore(s, app);
  if (view === 'widget') return WIDGETS[app.widget](s, app, arg);
  if (view === 'custom') { s.innerHTML = head(app) + '<div class="ph-pad"></div>'; return K.phoneApps[arg](s.querySelector('.ph-pad'), { close, back: () => go('home'), app }); }
}
const unread = () => { const g = G(); return Math.max(1, ((g.steps || 0) | 0) % 4 + 1); };

/* ---------- opening an app ---------- */
function openApp(id) {
  const a = R.apps[id]; LOD.tone(1000, .04, 'square', .04); LOD.haptic('light');
  if (a.appstore) return go('store', id);
  if (a.widget) return go('widget', id);
  if (a.custom) return go('custom', id);
  return go('lines', id);
}

/* ---------- lines apps (Tibber, Swish, BankID, Strava, Klarna) ---------- */
function renderLines(s, app, id) {
  const g = G(), used = g.apps[id] || 0, last = g.flags['appAt:' + id] || 0;
  let line, wait = 0;
  if (app.cooldownMin && app.use && used && (!app.once || used < app.once) && now() - last < app.cooldownMin * 60000 / Math.max(1e-6, K.trapSpeed)) {
    wait = Math.ceil((app.cooldownMin * 60000 / Math.max(1e-6, K.trapSpeed) - (now() - last)) / 60000);
    line = app.name + ': "Your next payment plan opens in ' + wait + ' min. Breathe."';
  } else {
    g.apps[id] = used + 1; g.flags['appAt:' + id] = now();
    if (app.gate === 'door') { line = app.lines[used ? 1 : 0]; if (used) g.flags.bankid = 1; } else line = pick(app.lines);
    const vars = { price: rand(4, 99).toFixed(2), steps: fmt(Math.round(g.steps || 0)), name: pick(['Gunnel (wrong number)', 'Ica-Stig', 'your ex', 'Löken\'s mum', 'a stranger in Kiruna', 'Systembolaget']), kr: g.kr, debt: (g.debt || 0) + (app.use || []).filter(e => e.type === 'promiseDebt').reduce((a, e) => a + e.value, 0) };
    if (app.use && (!app.once || used < app.once)) K.applyAll(g.me, app.use, {});
    else if (app.use && app.once) line = 'Klarna: "You have reached your limit. And ours."';
    line = PX.data.fmt(line, vars);
  }
  LOD.tone(1320, .04, 'square', .04);
  s.innerHTML = head(app) + '<div class="ph-pad"><div class="ph-card">' + esc(line) + '</div><button class="ph-btn alt">OK</button></div>';
  s.querySelector('.ph-btn').addEventListener('click', () => go('home'));
}

/* ---------- the app store ---------- */
function renderStore(s, app) {
  const g = G(), list = storeApps();
  s.innerHTML = head(app, cfg().storeTitle || 'Appbutiken') + '<div class="ph-pad"><div class="ph-card">' + esc(cfg().storeLine || 'Download things you did not need. 100 % ad-free. 0 % useful.') + '<br><b>💰 ' + g.kr + ' kr</b></div>' +
    list.map(id => { const a = R.apps[id], on = !!inst()[id], price = a.store.price || 0, can = g.kr >= price;
      return '<div class="ph-row"><u style="--c:' + (a.color || '#3a4660') + '">' + a.icon + '</u><div>' + esc(a.name) + '<small>' + esc(a.store.blurb || '') + '</small></div><button data-a="' + id + '"' + (on || !can ? ' disabled' : '') + '>' + (on ? 'Installed' : price ? price + ' kr' : 'Free') + '</button></div>'; }).join('') + (list.length ? '' : '<div class="ph-card">Nothing new today. Come back tomorrow.</div>') + '</div>';
  s.querySelectorAll('.ph-row button').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.a, a = R.apps[id], price = a.store.price || 0; if (inst()[id] || g.kr < price) return;
    g.kr -= price; inst()[id] = 1; LOD.tone(880, .06, 'triangle', .05); LOD.tone(1320, .08, 'triangle', .05, 0, .07); LOD.toast(a.icon + ' ' + a.name + ' installed', 1.6);
    if (K.onInstall) K.onInstall(id); render('store');
  }));
}

/* ---------- widgets: small working apps that do nothing important ---------- */
const WIDGETS = {
  torch(s, app) {
    let on = false;
    s.innerHTML = '<div class="ph-torch"></div>'; const t = s.querySelector('.ph-torch');
    const draw = () => { t.style.background = on ? '#fff8d8' : '#10141c'; t.style.color = on ? '#1c1c2a' : '#fff'; t.innerHTML = '<div style="font-size:84px">' + (on ? '🔦' : '🔌') + '</div><div>' + esc(on ? pick(app.on) : pick(app.off)) + '</div><button class="ph-btn' + (on ? ' alt' : '') + '">' + (on ? 'OFF' : 'ON') + '</button>'; t.querySelector('button').addEventListener('click', () => { on = !on; LOD.tone(on ? 900 : 500, .05, 'square', .05); draw(); }); };
    draw();
  },
  calc(s, app) {
    let cur = '', acc = null, op = null, fresh = false;
    s.innerHTML = head(app) + '<div class="ph-pad"><div class="ph-disp">0</div><div class="ph-calc"></div><div class="ph-card" style="margin-top:10px;min-height:20px"></div></div>';
    const disp = s.querySelector('.ph-disp'), note = s.querySelector('.ph-card'), keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', 'C', '0', '=', '+'];
    const fn = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b };
    const show = v => { disp.textContent = String(v).slice(0, 12); };
    s.querySelector('.ph-calc').innerHTML = keys.map(k => '<button class="' + (fn[k] ? 'op' : k === '=' ? 'eq' : '') + '">' + k + '</button>').join('');
    s.querySelectorAll('.ph-calc button').forEach(b => b.addEventListener('click', () => {
      const k = b.textContent; LOD.tone(700 + Math.random() * 200, .03, 'square', .03);
      if (k === 'C') { cur = ''; acc = null; op = null; show(0); note.textContent = ''; return; }
      if (fn[k]) { if (cur !== '') { acc = acc == null || op == null ? +cur : fn[op](acc, +cur); } op = k; cur = ''; show(acc == null ? 0 : acc); return; }
      if (k === '=') { if (op != null && cur !== '') { const r = fn[op](acc, +cur); acc = null; op = null; cur = ''; fresh = true; const txt = isFinite(r) ? +r.toFixed(6) : 'Ask Löken'; show(txt); const hit = (app.easter || {})[String(txt)]; note.textContent = hit || ''; if (isFinite(r)) cur = String(txt); } return; }
      if (fresh) { cur = ''; fresh = false; } cur += k; show(cur);
    }));
  },
  compass(s, app) {
    const [gx, gy] = K.tc(...R.gyms.box.board);
    s.innerHTML = head(app) + '<div class="ph-pad"><div class="ph-needle"><i></i><span style="top:6px;left:50%;margin-left:-4px">N</span></div><div class="ph-card" style="text-align:center"></div></div>';
    const n = s.querySelector('.ph-needle i'), c = s.querySelector('.ph-card');
    const upd = () => { const g = G(), dx = gx - g.p.x, dy = gy - g.p.y, a = Math.atan2(dx, -dy) * 180 / Math.PI, d = Math.round(Math.hypot(dx, dy) / K.T); n.style.transform = 'rotate(' + a.toFixed(0) + 'deg)'; c.textContent = app.label + '\n' + d + ' tiles'; };
    upd(); tickT = setInterval(upd, 250);
  },
  eight(s, app) {
    s.innerHTML = head(app) + '<div class="ph-pad"><div class="ph-ball">Ask a yes/no question. Then tap.</div><button class="ph-btn">ASK</button></div>';
    const b = s.querySelector('.ph-ball');
    s.querySelector('.ph-btn').addEventListener('click', () => { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); LOD.noise(.2, .2, 0, 600, 'lowpass'); setTimeout(() => { b.textContent = pick(app.answers); LOD.tone(520, .1, 'triangle', .05); }, 450); });
  },
  fart(s, app) {
    let n = 0;
    s.innerHTML = head(app) + '<div class="ph-pad"><div class="ph-card" style="text-align:center">Prutts today: <b class="c">0</b></div>' + app.sounds.map((x, i) => '<button class="ph-btn' + (i % 2 ? ' alt' : '') + '" data-i="' + i + '">' + esc(x.label) + '</button>').join('') + '</div>';
    s.querySelectorAll('.ph-btn').forEach(b => b.addEventListener('click', () => { const x = app.sounds[+b.dataset.i]; LOD.noise(x.len || .3, .45, 0, x.f || 300, 'lowpass'); LOD.tone(x.f || 120, x.len || .3, 'sawtooth', .07, -(x.f || 120) * .5); LOD.haptic('heavy'); n++; s.querySelector('.c').textContent = n; if (n === 5 || n === 20) LOD.toast('💨 ' + (n === 5 ? 'Impressive.' : 'Löken would be proud.'), 1.8); }));
  },
  messages(s, app) {
    const g = G(); g.chatSeen = (g.chatSeen || 0) + 1; const names = app.from || ['Löken', 'Wizcudi', 'Jrohn', 'BigWman', 'Ljunky'];
    const lines = []; for (let i = 0; i < 5; i++) lines.push({ who: pick(names), text: pick(app.pool) });
    s.innerHTML = head(app, 'LAN SQUAD 🎮') + '<div class="ph-pad">' + lines.map(l => '<div class="ph-bub"><small>' + esc(l.who) + '</small>' + esc(l.text) + '</div>').join('') + '<div class="ph-bub me" style="display:none"></div>' +
      '<div class="rep">' + (app.replies || []).slice(0, 3).map((r, i) => '<button class="ph-btn alt" data-i="' + i + '">' + esc(r.label) + '</button>').join('') + '</div></div>';
    s.querySelectorAll('.rep button').forEach(b => b.addEventListener('click', () => { const r = app.replies[+b.dataset.i], me = s.querySelector('.ph-bub.me'); me.style.display = 'block'; me.textContent = r.label; s.querySelector('.rep').innerHTML = '<div class="ph-bub"><small>' + esc(pick(names.filter(n => n !== LOD.player))) + '</small>' + esc(r.answer) + '</div>'; LOD.tone(760, .05, 'triangle', .05); }));
  },
  weather(s, app) {
    const h = new Date().getHours(), night = h < 6 || h >= 20, temp = Math.round(rand(-4, 17)), icon = pick(app.icons);
    s.innerHTML = head(app, app.title || 'SMHI') + '<div class="ph-pad" style="text-align:center"><div style="font-size:80px">' + (night ? '🌙' : icon) + '</div><div style="font:400 44px Bungee,Impact,sans-serif">' + temp + '°</div><div class="ph-card">' + esc(pick(app.lines)) + '</div></div>';
  },
  camera(s, app) {
    const g = G(), face = (R.heroes && R.heroes[K.heroId()] ? '🙂' : '🙂');
    s.innerHTML = head(app) + '<div class="ph-pad"><div class="ph-cam">' + face + '</div><div class="ph-card" style="min-height:44px">' + esc(app.hint || 'Say cheese.') + '</div><button class="ph-btn">📸</button></div>';
    s.querySelector('.ph-btn').addEventListener('click', () => { const c = s.querySelector('.ph-cam'); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); g.selfies = (g.selfies || 0) + 1; LOD.noise(.08, .3, 0, 3000, 'bandpass'); s.querySelector('.ph-card').textContent = pick(app.captions) + ' (' + g.selfies + ' selfies)'; });
  },
  hemnet(s, app) {
    const g = G(), val = Math.round((38000 + g.kr * 2.2 + (g.party ? g.party.length : 0) * 9000) / 100) * 100;
    s.innerHTML = head(app) + '<div class="ph-pad"><div class="ph-card" style="text-align:center">Your van is worth<br><b style="font:400 30px Bungee,Impact,sans-serif">' + fmt(val) + ' kr</b></div><div class="ph-card">' + esc(pick(app.lines)) + '</div></div>';
  }
};

/* ---------- open / close ---------- */
function open(startApp) {
  ensure(); view = 'home'; render(); el.hidden = false; LOD.tone(1046, .06, 'triangle', .05); if (startApp && homeApps().includes(startApp)) openApp(startApp);
  return new Promise(res => { closeFn = res; });
}
return { open, close, go, installed: () => Object.keys(inst()), homeApps, storeApps, isOpen: () => !!el && !el.hidden };
};
