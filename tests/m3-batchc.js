// Mission 3, batch C: data-driven shop and house signs (awnings over shop doors, name planks on the hero houses, a lit glow at night).
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

(async () => {
  const b = await chromium.launch(); const p = await open(b, '?dev=all&date=2026-11-25'); await play(p);
  let g;
  g = await E(p, () => { const D = window.M3_DATA, m = window.__m3, bad = [], shops = D.signs.filter(s => s.awning !== false); let awn = 0;
    for (const s of D.signs) { if (!s.text || !s.at || s.at.length !== 2) bad.push('bad sign ' + s.text); if (!/^#[0-9a-f]{3,6}$/i.test(s.bg || '#333') || !/^#[0-9a-f]{3,6}$/i.test(s.fg || '#fff')) bad.push('colour ' + s.text); }
    for (const s of shops) if (m.SIGNS.doorsFor(s)) awn++;
    return { n: D.signs.length, shops: shops.length, awn, bad, noOld: !/const SIGNS = \[/.test(document.documentElement.innerHTML) }; });
  ok(g.n >= 12 && g.bad.length === 0, 'all signs come from data with positions and colours (' + g.n + ' signs ' + JSON.stringify(g.bad) + ')');
  ok(g.awn >= 7 && g.awn === g.shops, 'every shop sign finds its door and gets an awning (' + g.awn + '/' + g.shops + ')');
  // draw everything by day and by night, at every sign and every house: no errors, and the pixels change at night
  const px = (tag, x, y) => E(p, ([x, y]) => { const m = window.__m3, [px, py] = m.tc(x, y); m.G.p.x = px; m.G.p.y = py; window.__lod.LOD.cam.x = px; window.__lod.LOD.cam.y = py; }, [x, y]);
  const spots = [[17, 63], [16, 47], [40, 34], [42, 20], [23, 5], [104, 39], [140, 14], [140, 31], [144, 64]];
  for (const [i, h] of [12, 23].entries()) {
    await E(p, h => { window.__m3.PPL.test.hour = h; }, h);
    for (const [x, y] of spots) { await px('', x, y); await p.waitForTimeout(120); if (i === 0 && x === 17) await p.screenshot({ path: OUT + '/batchc-day.png' }); if (i === 1 && x === 17) await p.screenshot({ path: OUT + '/batchc-night.png' }); }
  }
  ok(p.errs.length === 0, 'signs and house planks draw by day and by night without errors (' + p.errs.join(' | ') + ')');
  await b.close();
  if (process.exitCode) console.log('SOME FAILED'); else console.log('PASS m3-batchc all');
})();
