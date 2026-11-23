// Save code (engine, opt-in for save missions): export from the pause menu, import on a new phone from the brief, checksum, wrong name / damaged / foreign codes, replace needs two taps.
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

const setName = (p, n, hero = 'bigwman') => E(p, ([n, h]) => { window.__lod.setName(n); window.__lod.LOD.store.set('lod.char', h); }, [n, hero]);
(async () => {
  const b = await chromium.launch();
  // ===== phone A: play a little, open the save code from the pause menu =====
  let A = await open(b, '?dev=day&date=2026-11-23'); await play(A);
  await E(A, () => { const m = window.__m3; m.G.kr = 777; m.G.flags.testflag = 1; m.G.party = [m.mk('badger', 33), m.mk('lynx', 12)]; m.G.items.fur = 4; });
  await E(A, () => document.getElementById('btn-pause').click()); await A.waitForTimeout(300);
  ok(await E(A, () => !document.getElementById('sc-open-pause').hidden), 'the pause menu of a save mission has a "Save code" button');
  await E(A, () => document.getElementById('sc-open-pause').click()); await A.waitForTimeout(600);
  const code = await E(A, () => document.getElementById('sc-text').value);
  ok(/^LOD1z?\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(code), 'the code is one line of text with a checksum (' + code.length + ' characters, ' + code.slice(0, 8) + '…)');
  ok(code.length < 12000, 'and it is not absurdly long');
  await E(A, () => { navigator.clipboard.writeText = async t => { window.__copied = t; }; document.getElementById('sc-copy').click(); }); await A.waitForTimeout(100);
  ok(await E(A, () => window.__copied === document.getElementById('sc-text').value && /Copied/.test(document.getElementById('sc-note').textContent)), 'Copy code puts the whole code on the clipboard');
  await E(A, () => document.getElementById('sc-close').click()); await A.waitForTimeout(200);
  ok(await E(A, () => !document.getElementById('scr-pause').hidden), 'Back returns to the pause menu');

  // ===== phone B: a new phone, same player name: import from the brief, then Continue =====
  const B = await open(b, '?dev=day&date=2026-11-23'); await setName(B, 'Ljunky');
  await B.evaluate(() => localStorage.removeItem('lod.save.m3.Ljunky'));
  await toBrief(B, 'bigwman');
  ok(await E(B, () => !!document.getElementById('brief-code') && document.getElementById('brief-go').textContent === 'Go'), 'a phone with no save still shows "Save code" on the brief (to import)');
  await B.click('#brief-code'); await B.waitForTimeout(300);
  ok(await E(B, () => /no saved game yet/.test(document.getElementById('sc-note').textContent)), 'it says there is nothing to export yet');
  // damaged, foreign and wrong-name codes are refused with a reason
  await B.fill('#sc-text', code.slice(0, code.length - 40)); await B.click('#sc-import'); await B.waitForTimeout(200);
  ok(await E(B, () => /damaged or cut off/.test(document.getElementById('sc-note').textContent)), 'a cut-off code is refused: "damaged or cut off"');
  await B.fill('#sc-text', 'hello'); await B.click('#sc-import'); await B.waitForTimeout(200);
  ok(await E(B, () => /not a save code/.test(document.getElementById('sc-note').textContent)), 'random text is refused: "not a save code"');
  await B.fill('#sc-text', code); await B.click('#sc-import');
  await B.waitForLoadState('load'); await B.waitForTimeout(1200);
  ok(await E(B, () => !!JSON.parse(localStorage.getItem('lod.save.m3.Ljunky')).data), 'Import writes the save on this phone and reloads');
  await setName(B, 'Ljunky');
  await toBrief(B, 'bigwman');
  ok(await E(B, () => document.getElementById('brief-go').textContent === 'Continue'), 'now the brief offers Continue');
  await B.click('#brief-go'); await B.waitForTimeout(900);
  const g = await E(B, () => { const G = window.__m3.G; return { kr: G.kr, party: G.party.map(c => c.sp + c.lv).join(), flag: G.flags.testflag, fur: G.items.fur, starter: G.starter }; });
  ok(g.kr === 777 && g.party === 'badger33,lynx12' && g.flag === 1 && g.fur === 4 && g.starter, 'Continue restores the imported game: money, party, flags, items (' + JSON.stringify(g) + ')');

  // ===== phone B again: a save exists, so replacing it needs a second tap =====
  await E(B, () => { window.__m3.G.kr = 5; }); await E(B, () => document.getElementById('btn-pause').click()); await B.waitForTimeout(300);
  await E(B, () => document.getElementById('sc-open-pause').click()); await B.waitForTimeout(500);
  await B.fill('#sc-text', code); await B.click('#sc-import'); await B.waitForTimeout(300);
  ok(await E(B, () => /REPLACES/.test(document.getElementById('sc-note').textContent) && /Tap again/.test(document.getElementById('sc-import').textContent)), 'with a save on the phone the first tap only warns; the second tap replaces it');
  const own = await E(B, () => document.getElementById('sc-text').dataset.mine);
  await B.click('#sc-import');
  await B.waitForLoadState('load'); await B.waitForTimeout(1200);
  ok(await E(B, () => JSON.parse(localStorage.getItem('lod.save.m3.Ljunky')).data.kr) === 777, 'the import replaced the paused game (and leaving did not overwrite it again)');
  await B.close();

  // ===== phone C: another player name must not take someone else's save =====
  const C = await open(b, '?dev=day&date=2026-11-23'); await setName(C, 'Löken'); await toBrief(C, 'loken');
  await C.click('#brief-code'); await C.waitForTimeout(300); await C.fill('#sc-text', code); await C.click('#sc-import'); await C.waitForTimeout(300);
  ok(await E(C, () => /is for Ljunky/.test(document.getElementById('sc-note').textContent)) && await E(C, () => localStorage.getItem('lod.save.m3.Löken') == null), 'a code for Ljunky is refused on Löken\'s phone, nothing is written');
  await C.close();

  // ===== Mission 1 has no save code button =====
  const M1 = await open(b, '?dev=day&date=2026-11-21'); await setName(M1, 'Ljunky');
  await E(M1, () => { const L = window.__lod; L.openMission(L.LOD.missions.find(m => m.id === 1)); });
  for (let i = 0; i < 40 && await E(M1, () => document.getElementById('scr-brief').hidden); i++) { await E(M1, () => { const c = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled); const x = c.find(x => x.matches('[data-a="select"]')) || c.find(x => x.matches('.cut [data-a="skip"]')); x && x.click(); }); await M1.waitForTimeout(250); }
  ok(await E(M1, () => !document.getElementById('scr-brief').hidden && !document.getElementById('brief-code')), 'Mission 1 (no save) shows no save code button');
  await M1.close();
  // ===== protected saves (15+ minutes): no New game, Reset keeps them; short saves can still be erased =====
  const P = await open(b, '?dev=day&date=2026-11-23'); await setName(P, 'Prot', 'wizcudi'); await P.evaluate(() => localStorage.removeItem('lod.save.m3.Prot'));
  await toBrief(P, 'wizcudi'); await P.click('#brief-go'); await P.waitForTimeout(700);
  await E(P, () => { window.__m3.G.kr = 4321; }); await E(P, () => document.getElementById('btn-pause').click()); await P.waitForTimeout(300);
  await E(P, () => { const k = 'lod.save.m3.Prot', sv = JSON.parse(localStorage.getItem(k)); sv.t = 5 * 60; localStorage.setItem(k, JSON.stringify(sv)); });
  await P.reload(); await P.waitForTimeout(700); await setName(P, 'Prot', 'wizcudi'); await toBrief(P, 'wizcudi');
  ok(await E(P, () => !!document.getElementById('brief-new')), 'a short save (5 min) still offers New game');
  await E(P, () => { const k = 'lod.save.m3.Prot', sv = JSON.parse(localStorage.getItem(k)); sv.t = 20 * 60; localStorage.setItem(k, JSON.stringify(sv)); });
  await P.reload(); await P.waitForTimeout(700); await setName(P, 'Prot', 'wizcudi'); await toBrief(P, 'wizcudi');
  const g1 = await E(P, () => ({ nb: !!document.getElementById('brief-new'), note: document.getElementById('brief-note').textContent, go: document.getElementById('brief-go').textContent }));
  ok(!g1.nb && /protected/.test(g1.note) && g1.go === 'Continue', 'a save of 20 minutes cannot be erased: no New game button, a note says why (' + g1.note.slice(-70) + ')');
  await E(P, () => { document.getElementById('brief-back').click(); }); await P.waitForTimeout(300);
  await E(P, () => { const b = document.getElementById('reset-data'); if (b) { b.click(); b.click(); } }); await P.waitForTimeout(400);
  ok(await E(P, () => !!localStorage.getItem('lod.save.m3.Prot')) && await E(P, () => JSON.parse(localStorage.getItem('lod.save.m3.Prot')).data.kr === 4321), 'Reset test data keeps a protected save');
  // ===== change hero, same save =====
  await setName(P, 'Prot', 'wizcudi'); await toBrief(P, 'wizcudi');
  ok(await E(P, () => /Change hero/.test(document.getElementById('brief-hero').textContent)), 'the brief of a saved game offers "Change hero (same save)"');
  await E(P, () => document.getElementById('brief-hero').click()); await P.waitForTimeout(500);
  ok(await E(P, () => !!document.querySelector('.cs-name') && /saved game stays/.test(document.body.innerText)), 'it opens the hero choice and says the save stays');
  for (let i = 0; i < 6; i++) { const cur = await E(P, () => document.querySelector('.cs-name').textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')); if (cur === 'jrohn') break; await E(P, () => document.querySelector('[data-a="next"]').click()); await P.waitForTimeout(150); }
  await E(P, () => document.querySelector('[data-a="select"]').click()); await P.waitForTimeout(1700);
  const g2 = await E(P, () => ({ brief: !document.getElementById('scr-brief').hidden, hero: window.__lod.LOD.getCharacter().id, btn: document.getElementById('brief-hero').textContent }));
  ok(g2.brief && g2.hero === 'jrohn' && /Jrohn/.test(g2.btn), 'picking Jrohn comes back to the brief as Jrohn (' + g2.btn + ')');
  await P.click('#brief-go'); await P.waitForTimeout(900);
  const g3 = await E(P, () => ({ kr: window.__m3.G.kr, mode: window.__m3.G.mode, hero: window.__lod.LOD.getCharacter().id }));
  ok(g3.kr === 4321 && g3.mode === 'play' && g3.hero === 'jrohn', 'Continue keeps the same save (4321 kr) now playing as Jrohn (' + JSON.stringify(g3) + ')');
  await P.close();

  // ===== a long code cut in two chat messages (4096 characters) that lost one character at the cut still imports =====
  const L1 = await open(b, '?dev=day&date=2026-11-23'); await setName(L1, 'Lang', 'jrohn'); await L1.evaluate(() => localStorage.removeItem('lod.save.m3.Lang'));
  await toBrief(L1, 'jrohn'); await L1.click('#brief-go'); await L1.waitForTimeout(600);
  await E(L1, () => { const f = window.__m3.G.flags; for (let i = 0; i < 500; i++) f['pad' + i] = Math.random().toString(36).slice(2, 14); });
  await E(L1, () => document.getElementById('btn-pause').click()); await L1.waitForTimeout(300);
  await L1.evaluate(() => document.getElementById('sv-code') ? 0 : 0);
  await E(L1, () => window.__lod.LOD.openSaveCode('scr-pause')); await L1.waitForTimeout(800);
  const long = await E(L1, () => document.getElementById('sc-text').value);
  ok(long.length > 4300, 'a long save makes a long code (' + long.length + ' characters)');
  const cut = long.slice(0, 4095) + long.slice(4096);
  const L2 = await open(b, '?dev=day&date=2026-11-23'); await setName(L2, 'Lang', 'jrohn'); await L2.evaluate(() => localStorage.removeItem('lod.save.m3.Lang'));
  await toBrief(L2, 'jrohn'); await L2.click('#brief-code'); await L2.waitForTimeout(300);
  await L2.fill('#sc-text', cut); await L2.click('#sc-import'); await L2.waitForLoadState('load'); await L2.waitForTimeout(1200);
  ok(await E(L2, () => !!JSON.parse(localStorage.getItem('lod.save.m3.Lang')).data), 'one lost character at the 4096 cut is put back and the save imports');
  await L2.close(); await L1.close();

  // ===== a phone that cannot keep a save says so (storage blocked or full) =====
  const W = await open(b, '?dev=day&date=2026-11-23'); await setName(W, 'Wiz', 'wizcudi'); await W.evaluate(() => localStorage.removeItem('lod.save.m3.Wiz'));
  await toBrief(W, 'wizcudi'); await W.click('#brief-go'); await W.waitForTimeout(700);
  await E(W, () => { window.__real = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); }; });
  await E(W, () => document.getElementById('btn-pause').click()); await W.waitForTimeout(300);
  ok(await E(W, () => !!window.__lod.LOD.G.toast && /not keeping your save/.test(window.__lod.LOD.G.toast.text)), 'storage blocked or full: a warning tells the player to copy the Save code instead of silently losing it');
  await E(W, () => { Storage.prototype.setItem = window.__real; });
  await W.close();
  ok(A.errs.length === 0, 'no page errors (save code)' + (A.errs.length ? ': ' + A.errs.join(' | ') : ''));
  await b.close();
})();
