// Mission 3, batch B: the bag as icon tiles, the team as picture cards, the phone (home screen, apps, Appbutiken), Faunalens + Faunadex.
const { chromium } = require('playwright');
const OUT = process.argv[2] || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const BASE = process.env.LOD_URL || 'http://127.0.0.1:8123/';
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
const E = (p, f, a) => p.evaluate(f, a);
const PORT = { width: 390, height: 780 };

async function open(b, q = '?dev=all&date=2026-11-25', o = {}) {
  const p = await b.newPage(Object.assign({ viewport: PORT, deviceScaleFactor: 2 }, o.page || {}));
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && p.errs.push(m.text()));
  if (o.route) await o.route(p);
  if (o.init) await p.addInitScript(o.init);
  await p.goto(BASE + q); await p.waitForTimeout(700);
  await E(p, () => { window.__lod.setName('Ljunky'); window.__lod.LOD.store.set('lod.char', 'bigwman'); });
  return p;
}
async function toBrief(p, hero = 'bigwman') {
  await E(p, () => { const L = window.__lod; L.openMission(L.LOD.missions.find(m => m.id === 3)); });
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(250);
    if (await E(p, () => !document.getElementById('scr-brief').hidden)) return true;
    await E(p, h => {
      const c = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled), cur = document.querySelector('.cs-name');
      if (h && cur && cur.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') !== h) { const n = c.find(x => x.matches('[data-a="next"]')); if (n) return n.click(); }
      const b = c.find(x => x.matches('[data-a="select"]')) || c.find(x => x.matches('.cut [data-a="skip"]')); if (b) b.click();
    }, hero);
  }
  return false;
}
async function play(p, hero = 'bigwman') { // fresh game, starter chosen, on the map
  await E(p, () => localStorage.removeItem('lod.save.m3.Ljunky'));
  await toBrief(p, hero); await p.click('#brief-go'); await p.waitForTimeout(400);
  await E(p, () => { window.__m3.speed = 25; });
  await pickStarter(p, 'Badger Cub'); await E(p, () => { window.__m3.skipReplies = true; });
  await E(p, () => { const m = window.__m3; m.G.party = ['badger', 'lynx', 'toad', 'hedgehog'].map(s => m.mk(s, 18)); m.G.kr = 5000; });
}
async function drive(p, prefer, max = 500) {
  for (let i = 0; i < max; i++) {
    const st = await E(p, pref => {
      const m = window.__m3, G = m.G;
      if (!G || G.mode !== 'play') return 'mode:' + (G && G.mode);
      if (G.scene === 'map' && !m.B) return 'done';
      const pd = m.pending; if (!pd) return 'wait';
      if (pd.say) { pd.res(); return 'say'; }
      const btns = [...document.querySelectorAll('#m3ui .m3grid button')].filter(b => !b.disabled);
      for (const r of pref) { const b = btns.find(x => new RegExp(r).test(x.textContent)); if (b) { b.click(); return 'click ' + r; } }
      const b = btns.find(x => !/Back|Leave|Not yet|Close|Pocket/.test(x.textContent)) || btns[0]; if (b) { b.click(); return 'click*'; }
      return 'none';
    }, prefer);
    if (st === 'done' || st.startsWith('mode:')) return st;
    await p.waitForTimeout(st === 'wait' ? 40 : 15);
  }
  return 'timeout';
}
// click through until a button matching re shows up (or the box closes); returns true if clicked
async function until(p, re, max = 200) {
  for (let i = 0; i < max; i++) {
    const r = await E(p, re => { const m = window.__m3, pd = m.pending; const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => !x.disabled && new RegExp(re).test(x.textContent)); if (b) { b.click(); return 'hit'; } if (pd && pd.say) { pd.res(); return 'say'; } return m.G.scene === 'map' && !m.B && !pd ? 'map' : 'wait'; }, re);
    if (r === 'hit') return true; if (r === 'map') return false; await p.waitForTimeout(30);
  }
  return false;
}
// talk to a person through the real dialogue system; clicks the reply matching `click` if a menu shows. Returns { texts, btns, res }
async function talkTo(p, id, click) {
  await E(p, id => { window.__t = { done: false }; window.__m3.PPL.talk(id, { name: id }).then(r => { window.__t.done = true; window.__t.res = { fight: r.fight, line: !!r.line }; }); }, id);
  const texts = []; let btns = null;
  for (let i = 0; i < 80; i++) {
    const r = await E(p, () => { const m = window.__m3, pd = m.pending, txt = document.querySelector('#m3ui .m3txt').textContent; if (window.__t.done) return { done: true, res: window.__t.res }; if (!pd) return { wait: true };
      if (pd.say) { pd.res(); return { text: txt }; } return { text: txt, btns: [...document.querySelectorAll('#m3ui .m3grid button')].map(b => b.textContent) }; });
    if (r.done) return { texts, btns, res: r.res };
    if (r.text) texts.push(r.text);
    if (r.btns) { btns = r.btns; const ok = await E(p, re => { const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => !x.disabled && new RegExp(re).test(x.textContent)) || document.querySelector('#m3ui .m3grid button'); b.click(); return true; }, click || '.'); }
    await p.waitForTimeout(40);
  }
  return { texts, btns, res: null };
}
// use a prop (puzzle piece, tee, fishing spot) through the real code; clicks the reply matching `click` if a menu shows
async function startProp(p, id) { await E(p, id => { window.__u = { done: false }; window.__m3.propUse(id).then(() => { window.__u.done = true; }); }, id); }
// click through everything a prop says until it is finished (a running mini-game is left alone); clicks the reply matching `click` if a menu shows
async function settle(p, click, max = 150) {
  for (let i = 0; i < max; i++) {
    const r = await E(p, () => { const m = window.__m3, pd = m.pending; if (window.__u.done) return { done: true }; if (m.MINI.active || !pd) return { wait: true }; if (pd.say) { pd.res(); return { say: true }; } return { btns: true }; });
    if (r.done) return true;
    if (r.btns) await E(p, re => { const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => !x.disabled && new RegExp(re).test(x.textContent)) || document.querySelector('#m3ui .m3grid button'); b.click(); }, click || '.');
    await p.waitForTimeout(40);
  }
  return false;
}
const useProp = async (p, id, click) => { await startProp(p, id); return settle(p, click); };
const btnText = p => E(p, () => [...document.querySelectorAll('#m3ui .m3grid button')].map(b => b.textContent).join(' | '));
const at = (p, x, y) => E(p, ([x, y]) => { const m = window.__m3, [px, py] = m.tc(x, y); m.G.p.x = px; m.G.p.y = py; window.__lod.LOD.cam.x = px; window.__lod.LOD.cam.y = py; }, [x, y]);

// the opening: blink, thoughts, then the stranger walks up and you pick a starter
async function pickStarter(p, name) {
  for (let i = 0; i < 300; i++) {
    const st = await p.evaluate(name => {
      const m = window.__m3, G = m.G, pd = m.pending;
      if (G.starter) return 'done';
      if (pd && pd.say) { pd.res(); return 'say'; }
      const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => new RegExp(name).test(x.textContent)); if (b) { b.click(); return 'pick'; }
      if (G.scene === 'map' && !m.stranger) m.summon();
      return 'wait';
    }, name);
    if (st === 'done') { await p.evaluate(() => { const pd = window.__m3.pending; if (pd && pd.say) pd.res(); }); await p.waitForTimeout(100); await p.evaluate(() => { const pd = window.__m3.pending; if (pd && pd.say) pd.res(); }); return true; }
    await p.waitForTimeout(40);
  }
  return false;
}

// run an async game function through the real UI. start = "name.path" in window.__m3 or a function source; click = regex (or list) for menus
async function flow(p, start, arg, click, max = 400) {
  await E(p, ([s, a]) => { window.__fl = { done: false, err: null }; const f = /^\w[\w.]*$/.test(s) ? s.split('.').reduce((o, k) => o[k], window.__m3) : (0, eval)('(' + s + ')'); Promise.resolve(f(...[].concat(a == null ? [] : a))).then(() => { window.__fl.done = true; }, e => { window.__fl.err = String(e && e.stack || e); window.__fl.done = true; }); }, [start, arg]);
  const texts = [];
  for (let i = 0; i < max; i++) {
    const r = await E(p, () => { if (window.__fl.done) return { done: true, err: window.__fl.err }; const m = window.__m3, pd = m.pending; if (!pd) return { wait: true }; const txt = document.querySelector('#m3ui .m3txt').textContent; if (pd.say) { pd.res(); return { text: txt }; } return { text: txt, btns: true }; });
    if (r.done) return { texts, err: r.err };
    if (r.text && !texts.includes(r.text)) texts.push(r.text);
    if (r.btns) await E(p, res => { const L = [...document.querySelectorAll('#m3ui .m3grid button')].filter(x => !x.disabled), used = window.__fl.used = window.__fl.used || []; let b = null; for (const re of res) { if (used.includes(re)) continue; b = L.find(x => new RegExp(re).test(x.textContent)); if (b) { used.push(re); break; } } b = b || L.find(x => /Back|Leave|Close/.test(x.textContent)) || L[0]; b && b.click(); }, [].concat(click || []));
    await p.waitForTimeout(25);
  }
  return { texts, err: 'timeout' };
}
const wait = (p, ms) => p.waitForTimeout(ms);
const mkParty = (p, list) => E(p, list => { const m = window.__m3; m.G.party = list.map(([s, lv]) => m.mk(s, lv)); m.G.box = []; for (const c of m.G.party) c.hp = m.maxHp(c); }, list);

const click = (p, sel, txt) => p.evaluate(([sel, txt]) => { const b = [...document.querySelectorAll(sel)].find(x => !x.disabled && (!txt || x.textContent.includes(txt))); if (b) b.click(); return !!b; }, [sel, txt]);
const clickRow = (p, txt) => p.evaluate(txt => { const b = [...document.querySelectorAll('.ph-row')].find(r => r.textContent.includes(txt)).querySelector('button'); if (!b.disabled) b.click(); return !b.disabled; }, txt);
const flush = async (p, n = 12) => { for (let i = 0; i < n; i++) { await p.waitForTimeout(60); await E(p, () => { const pd = window.__m3.pending; if (pd && pd.say) pd.res(); }); } };
async function wild(p) {
  await E(p, () => { const m = window.__m3; m.G.scene = 'map'; m.G.party = [m.mk('badger', 18)]; m.G.items.bag = 20; m.startWild(m.ZONES.find(z => z.id === 'parking')); });
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(80); const r = await E(p, () => { const m = window.__m3; if (m.pending && m.pending.say) { m.pending.res(); return 'say'; } return m.pending ? 'ask' : 'none'; }); if (r === 'ask') return; }
}
async function bagIt(p) {   // throw a bag that always works, click through until the offer or the end shows
  await E(p, () => { const m = window.__m3; m.curFoe().hp = 2; window.__real = Math.random; Math.random = () => .01; m.throwBag(false); });
  for (let i = 0; i < 300; i++) { await p.waitForTimeout(50); const r = await E(p, () => { const m = window.__m3, pd = m.pending; if (!pd) return 'none'; if (pd.say) { pd.res(); return 'say'; } return 'ask:' + [...document.querySelectorAll('#m3ui .m3grid button')].map(b => b.textContent).join('|'); }); if (r.startsWith('ask:')) { await E(p, () => { Math.random = window.__real; }); return r; } }
  await E(p, () => { Math.random = window.__real; }); return 'end';
}
(async () => {
  const b = await chromium.launch(); const p = await open(b); await play(p);
  let g;
  // ---- the bag as tiles, the team as cards
  await E(p, () => { const m = window.__m3; m.G.party = ['badger', 'lynx', 'toad'].map(s => m.mk(s, 18)); m.G.party[1].hp = 20; m.G.party[2].sk = Date.now() + 600000; m.G.kr = 300; m.bagMenu(); });
  await p.waitForTimeout(300);
  g = await E(p, () => { const gr = document.querySelector('#m3ui .m3grid'); return { tiles: gr.classList.contains('tiles'), em: gr.querySelectorAll('button .em').length, cols: getComputedStyle(gr).gridTemplateColumns.split(' ').length }; });
  ok(g.tiles && g.em >= 7 && g.cols === 3, 'the bag is a grid of icon tiles (' + JSON.stringify(g) + ')');
  await click(p, '#m3ui .m3grid button', 'Team'); await p.waitForTimeout(300);
  g = await E(p, () => { const c = [...document.querySelectorAll('#m3ui .m3grid button.card')]; return { n: c.length, pics: c.filter(x => x.querySelector('.pic img, .pic .noart')).length, lead: c.filter(x => x.classList.contains('lead')).length, hp: c.map(x => x.querySelector('.hp i').style.width), sk: /Sketchy/.test(c[2].textContent), chips: c[0].querySelectorAll('.chips u').length, txt: c[0].textContent }; });
  ok(g.n === 3 && g.pics === 3 && g.lead === 1 && /Badger/.test(g.txt) && g.chips >= 3 && g.sk, 'the team screen: a picture card per creature with name, level, type, HP bar, stats, the lead star, a sketchy note (' + JSON.stringify(g) + ')');
  ok(parseInt(g.hp[1]) < 40 && parseInt(g.hp[0]) === 100, 'the HP bars show the real HP (' + g.hp + ')');
  await p.screenshot({ path: OUT + '/batchb-team.png' });
  await click(p, '#m3ui .m3grid button', 'Lynx'); await p.waitForTimeout(200);
  ok(await E(p, () => window.__m3.G.party[0].sp.startsWith('lynx') || window.__m3.G.party[0].sp === 'lynx'), 'tapping a card makes that creature the lead');
  await E(p, () => { const pd = window.__m3.pending; if (pd) pd.res(null); }); await p.waitForTimeout(100);
  await E(p, () => { const pd = window.__m3.pending; if (pd) pd.res(null); }); await p.waitForTimeout(200);

  // ---- the phone
  await E(p, () => { window.__m3.G.kr = 300; window.__m3.bagMenu(); }); await p.waitForTimeout(250);
  await click(p, '#m3ui .m3grid button', 'Phone'); await p.waitForTimeout(300);
  g = await E(p, () => ({ open: window.__m3.PHONE.isOpen(), time: /\d\d:\d\d/.test(document.querySelector('.ph-clock b').textContent), apps: [...document.querySelectorAll('.ph-app')].map(x => x.textContent), bar: document.querySelector('.ph-bar').textContent }));
  ok(g.open && g.time && g.apps.length >= 8 && g.apps.some(a => /Tibber/.test(a)) && g.apps.some(a => /Appbutiken/.test(a)) && g.apps.some(a => /Flashlight/.test(a)) && /4 %/.test(g.bar), 'the phone: status bar, clock, a grid of app icons (' + g.apps.join(',') + ')');
  ok(!g.apps.some(a => /Calculator|Pruttis|Faunadex/.test(a)), 'store apps are not on the phone until downloaded');
  await p.screenshot({ path: OUT + '/batchb-phone.png' });
  await click(p, '.ph-app', 'Tibber'); await p.waitForTimeout(200);
  ok(/kr\/kWh|fridge|spike/.test(await E(p, () => document.querySelector('.ph-card').textContent)), 'an old line app still works inside the phone');
  await click(p, '.ph-nav button'); await p.waitForTimeout(100);
  await click(p, '.ph-app', 'Appbutiken'); await p.waitForTimeout(200);
  g = await E(p, () => [...document.querySelectorAll('.ph-row')].map(r => r.textContent));
  ok(g.some(t => /Calculator/.test(t)) && g.some(t => /Pruttis.*10 kr/.test(t)) && !g.some(t => /Faunadex/.test(t)), 'the Appbutiken lists apps with prices; the Faunadex is not there before the lens (' + g.length + ')');
  const kr0 = await E(p, () => window.__m3.G.kr);
  await clickRow(p, 'Pruttis'); await clickRow(p, 'Calculator'); await p.waitForTimeout(200);
  g = await E(p, () => ({ kr: window.__m3.G.kr, inst: Object.keys(window.__m3.G.installed) }));
  ok(g.kr === kr0 - 10 && g.inst.includes('fart') && g.inst.includes('calc'), 'downloading costs the price and installs (' + JSON.stringify(g) + ')');
  await E(p, () => { window.__m3.G.kr = 2; }); await p.waitForTimeout(50); await E(p, () => window.__m3.PHONE.go('store', 'store')); await p.waitForTimeout(150);
  ok(await E(p, () => [...document.querySelectorAll('.ph-row')].find(r => /Björn/.test(r.textContent)).querySelector('button').disabled), 'you cannot buy what you cannot afford');
  await E(p, () => window.__m3.PHONE.go('home')); await p.waitForTimeout(100);
  await click(p, '.ph-app', 'Calculator'); await p.waitForTimeout(150);
  for (const k of ['6', '×', '7', '=']) await click(p, '.ph-calc button', k);
  g = await E(p, () => ({ d: document.querySelector('.ph-disp').textContent, n: document.querySelector('.ph-card').textContent }));
  ok(g.d === '42' && /answer/i.test(g.n), 'the calculator works (6 × 7 = 42 and it knows) (' + JSON.stringify(g) + ')');
  await click(p, '.ph-nav button'); await click(p, '.ph-app', 'Flashlight'); await p.waitForTimeout(100); await click(p, '.ph-btn', 'ON'); await p.waitForTimeout(100);
  ok(/OFF/.test(await E(p, () => document.querySelector('.ph-torch').textContent)), 'the flashlight toggles');
  await click(p, '.ph-nav button'); await click(p, '.ph-app', 'Messages'); await p.waitForTimeout(100);
  ok(await E(p, () => document.querySelectorAll('.ph-bub').length >= 5), 'messages: the squad chat');
  await click(p, '.rep button', ''); await p.waitForTimeout(100);
  ok(await E(p, () => document.querySelector('.ph-bub.me').textContent.length > 0), 'you can reply (and get told off)');
  await click(p, '.ph-nav button'); await click(p, '.ph-app', 'Pruttis'); await p.waitForTimeout(100); await click(p, '.ph-btn', 'Classic');
  ok(await E(p, () => document.querySelector('.ph-card .c').textContent) === '1', 'Pruttis counts the prutts');
  await click(p, '.ph-nav button'); await click(p, '.ph-nav button'); await p.waitForTimeout(150);
  ok(await E(p, () => !window.__m3.PHONE.isOpen() && window.__m3.G.scene === 'talk'), 'Home on the home screen puts the phone back in the pocket (you are back in the bag)');
  await E(p, () => { const pd = window.__m3.pending; if (pd) pd.res(null); }); await p.waitForTimeout(200);
  g = await E(p, () => { const m = window.__m3; return m.saveState(m.G).installed; });
  ok(g && g.fart === 1 && g.calc === 1, 'installed apps are saved');

  // ---- Faunalens: asked once after the first catch
  await wild(p);
  ok(await E(p, () => !window.__m3.G.flags.lensAsked), 'no lens offer before a catch');
  let r = await bagIt(p);
  ok(/Scan it/.test(r) && /No thanks/.test(r), 'the first catch: the phone offers to scan the animal (' + r + ')');
  await click(p, '#m3ui .m3grid button', 'No thanks'); await flush(p, 10);
  g = await E(p, () => ({ asked: !!window.__m3.G.flags.lensAsked, lens: !!window.__m3.G.installed.lens }));
  ok(g.asked && !g.lens, 'declining: nothing installed, asked only once (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'caught'; }); await drive(p, ['Walk away', 'Run']);
  await wild(p); r = await bagIt(p);
  ok(!/Scan it/.test(r), 'the second catch does not ask again (' + r.slice(0, 40) + ')');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'caught'; }); await drive(p, ['Walk away', 'Run']);
  await E(p, () => { window.__m3.G.scene = 'map'; window.__m3.PHONE.open(); }); await p.waitForTimeout(200);
  await E(p, () => window.__m3.PHONE.go('store', 'store')); await p.waitForTimeout(150);
  g = await E(p, () => [...document.querySelectorAll('.ph-row')].map(r => r.textContent));
  ok(g.some(t => /Faunalens/.test(t)) && !g.some(t => /Faunadex/.test(t)), 'declined: Faunalens waits in the Appbutiken, no Faunadex yet');
  await clickRow(p, 'Faunalens'); await p.waitForTimeout(100);
  g = await E(p, () => [...document.querySelectorAll('.ph-row')].map(r => r.textContent));
  ok(g.some(t => /Faunadex/.test(t)), 'installing Faunalens unlocks the Faunadex in the store');
  await clickRow(p, 'Faunadex'); await E(p, () => window.__m3.PHONE.go('home')); await p.waitForTimeout(100);
  await click(p, '.ph-app', 'Faunadex'); await p.waitForTimeout(200);
  g = await E(p, () => ({ rows: document.querySelectorAll('.ph-row').length, head: document.querySelector('.ph-card').textContent, first: document.querySelector('.ph-row').textContent }));
  ok(g.rows >= 10 && /lines caught/.test(g.head) && !/\?\?\?/.test(g.first), 'the Faunadex app lists the lines, the ones you know come first (' + g.head + ' / ' + g.first + ')');
  await p.screenshot({ path: OUT + '/batchb-dex.png' });
  await click(p, '.ph-row', 'caught'); await p.waitForTimeout(150);
  ok(await E(p, () => /·/.test(document.querySelectorAll('.ph-card')[1].textContent)), 'a Faunadex page for a caught line');
  await E(p, () => window.__m3.PHONE.close()); await E(p, () => { window.__m3.G.scene = 'map'; window.__m3.hideBox && 0; });

  // ---- yes: the very first catch in a fresh game
  const q = await open(b); await play(q);
  await wild(q); r = await bagIt(q);
  await click(q, '#m3ui .m3grid button', 'Scan it'); await flush(q, 14);
  g = await E(q, () => ({ lens: !!window.__m3.G.installed.lens }));
  ok(g.lens, 'yes: the lens is installed straight away');
  await E(q, () => { const m = window.__m3; m.B.over = true; m.B.result = 'caught'; }); await drive(q, ['Walk away', 'Run']);
  await wild(q); await E(q, () => { window.__real2 = 1; }); r = await bagIt(q); await flush(q, 14);
  ok(await E(q, () => window.__m3.G.party.length >= 2), 'with the lens on, later catches go through with a one-line scan (no question)');
  g = await E(q, () => { const m = window.__m3; m.G.scene = 'map'; m.B = null; return { dexItem: m.G.installed.dex | 0 }; });
  ok(g.dexItem === 0, 'the Faunadex is not given for free; it is downloaded');

  ok(p.errs.length === 0 && q.errs.length === 0, 'no page errors (' + p.errs.concat(q.errs).join(' | ') + ')');
  await b.close();
  if (process.exitCode) console.log('SOME FAILED'); else console.log('PASS m3-batchb all');
})();
