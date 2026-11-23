// Mission 3 on a real Monday via ?dev=day&date=2026-11-23 (release days respected, nothing sent): the lock, what is released, and all five hero fights
// with teams that contain Tuesday / Wednesday creatures, Fältboken for lines met only in a team, no scoreboard posts.
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

(async () => {
  const b = await chromium.launch();
  // ===== the lock: a test day BEFORE the unlock date stays locked, nothing is released early =====
  let p = await open(b, '?dev=day&date=2026-11-22');
  ok(await E(p, () => { const L = window.__lod, M = L.LOD.missions.find(m => m.id === 3); return L.LOD.test && L.LOD.devDay && !L.LOD.dev && L.LOD.status(M) === 'locked'; }), '?dev=day respects the lock: the day before the unlock date Mission 3 is locked');
  await p.close();

  // ===== Monday, the way players get it =====
  const posts = [];
  p = await open(b, '?dev=day&date=2026-11-23', { route: async q => q.route(/script\.google\.com/, (route, req) => { if (req.method() === 'POST') posts.push(req.postData()); route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"rows":[]}' }); }) });
  await play(p);
  let g = await E(p, () => { const L = window.__lod, m = window.__m3, M = L.LOD.missions.find(q => q.id === 3), C = m.D.raw.creatures, rel = id => m.D.released(C[id]);
    return { status: L.LOD.status(M), counts: document.querySelector('.note') && document.querySelector('.note').textContent, devAll: m.D.opt.devAll, mon: [rel('badgerCub'), rel('rat'), rel('cokeroach')], later: [rel('laddybug'), rel('mantisShroom'), rel('moose'), rel('methmoth')], east: m.tile(60, 60), tore: m.D.released(m.D.raw.npcs.tore), molly: m.D.released(m.D.raw.items.molly), apps: [m.D.released(m.D.raw.apps.klarna), m.D.released(m.D.raw.apps.tibber)] }; });
  ok(g.status === 'live' && g.devAll === false, 'Monday test day: the mission is live and the data is NOT in devAll mode');
  ok(g.mon.every(Boolean) && g.later.every(x => !x), 'Monday releases only the Monday forms (Badger Cub, Rat, Cokeroach); Ladd-ybug, Mantis Shroom, Moose, Methmoth wait (' + g.mon + ' / ' + g.later + ')');
  ok(g.east === 'Q' && !g.tore && !g.molly && !g.apps[0] && g.apps[1], 'the east is closed, Tore, Molly and Klarna are not there yet, Tibber is');
  // the five hero teams contain Tue/Wed forms: every fight must still work
  const heroes = await E(p, () => Object.keys(window.__m3.D.raw.heroes));
  for (const h of heroes) {
    await E(p, h => { const m = window.__m3; m.G.party = ['badger', 'lynx', 'toad', 'hedgehog'].map(s => m.mk(s, 48)); for (const c of m.G.party) c.hp = m.maxHp(c); m.G.kr = 500; m.startBoss(h); }, h);
    await p.waitForTimeout(300);
    const team = await E(p, () => window.__m3.B.foes.map(f => window.__m3.SP[f.sp].name + ':' + window.__m3.D.released(window.__m3.D.raw.creatures[f.sp])));
    const r = await drive(p, ['Let it go', 'Pull up', '^⚔️ Fight', 'Claw|Body|Bite|Maul|Nip|Crush|Gore|Splash|Torrent|Shell|Roll'], 1500);
    const st = await E(p, h => ({ beat: window.__m3.G.beat.includes(h), seen: window.__m3.D.raw.heroes[h].team.every(sp => window.__m3.G.seen[sp]), scene: window.__m3.G.scene, B: !!window.__m3.B }), h);
    ok(r === 'done' && st.beat && st.seen && st.scene === 'map' && !st.B, h + "'s fight works with an unreleased drug-form team (" + team.join(', ') + '): won, all three seen');
  }
  ok(await E(p, () => window.__m3.G.beat.length === 5), 'all five heroes can be beaten on Monday');
  // Fältboken: a line met only in a boss team (Mantis, Wed) shows up before its release day, with its drug form
  g = await E(p, () => { const m = window.__m3; m.give('faltboken'); const page = m.bookPage('mantis'); return { page, listed: m.WILD_LINES().filter(l => m.LINES[l].some(k => m.D.released(m.D.raw.creatures[k]) || m.G.seen[k])).includes('mantis') }; });
  ok(g.listed && /Mantis Shroom/.test(g.page), 'Fältboken shows a line you only met in a hero team, before its release day (' + g.page.split('\n')[0] + ')');
  await E(p, () => { const m = window.__m3; m.G.party = [m.mk('badger', 30)]; m.G.party[0].hp = m.maxHp(m.G.party[0]); m.startWild(m.ZONES.find(z => z.id === 'parking')); });
  await p.waitForTimeout(300); const tbl = await E(p, () => { const m = window.__m3; return m.B && m.SP[m.B.foes[0].sp].release; });
  ok(tbl === 'mon', 'a wild encounter on Monday is a Monday creature (' + tbl + ')');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'run'; }); await drive(p, ['Walk away', 'Run']);
  await E(p, () => { window.__lod.G.saveT = 9.9; }); await p.waitForTimeout(500);
  ok(posts.length === 0, 'test day: nothing was sent to the scoreboard even with points earned (' + posts.length + ' posts, score ' + await E(p, () => window.__m3.G.score) + ')');
  ok(p.errs.length === 0, 'no page errors (Monday test day)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();
  await b.close();
})();
