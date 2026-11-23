// Mission 3, batch A: starter kit and the 3-use shoebox trap, hidden stashes, auto-fight, the drawn carrier bag, speech bubble, "Team" wording.
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

const toMenu = async p => { for (let i = 0; i < 80; i++) { await p.waitForTimeout(80); const r = await E(p, () => { const m = window.__m3, pd = m.pending; if (!pd) return 'none'; if (pd.say) { pd.res(); return 'say'; } return 'ask'; }); if (r === 'ask') return true; } return false; };
const clickBtn = (p, re) => E(p, re => { const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => !x.disabled && new RegExp(re).test(x.textContent)); if (b) b.click(); return !!b; }, re);

(async () => {
  const b = await chromium.launch();
  let p = await open(b);
  await E(p, () => localStorage.removeItem('lod.save.m3.Ljunky'));
  await toBrief(p); await p.click('#brief-go'); await p.waitForTimeout(400);
  await E(p, () => { window.__m3.speed = 25; });
  await pickStarter(p, 'Badger Cub'); await E(p, () => { window.__m3.skipReplies = true; });
  let g;

  // ---- starter kit
  g = await E(p, () => { const m = window.__m3; return { items: Object.assign({}, m.G.items), known: !!m.G.known.shoebox && !!m.G.known.worms }; });
  ok(g.items.bag === 8 && g.items.folkol === 3 && g.items.fizztab === 2 && g.items.shoebox === 1 && g.items.worms === 2 && g.known, 'a kinder start: 8 bags, 3 Folköl, 2 fizz tablets, a shoebox trap, bait, and the shoebox and bait are known (' + JSON.stringify(g.items) + ')');

  // ---- shoebox trap: three catches, then it falls apart
  await E(p, () => { const m = window.__m3; m.G.party = ['badger'].map(s => m.mk(s, 18)); m.G.items.worms = 0; m.trapSpeed = 1e6; window.__real = Math.random; });
  const left = [];
  for (let i = 0; i < 3; i++) {
    await flow(p, 'S.placeTrap', ['shoebox'], ['No bait']);
    await E(p, () => { const m = window.__m3; if (m.G.traps[0]) m.G.traps[0].at = 0; Math.random = () => .1; });
    await flow(p, 'S.interact', [{ kind: 'trap', ref: await E(p, () => window.__m3.G.traps[0]) }]);
    await E(p, () => { Math.random = window.__real; });
    left.push(await E(p, () => ({ box: window.__m3.G.items.shoebox | 0, traps: window.__m3.G.traps.length, wear: (window.__m3.G.wear || {}).shoebox | 0 })));
  }
  ok(left[0].box === 1 && left[1].box === 1 && left[2].box === 0 && left.every(x => x.traps === 0), 'the shoebox comes back twice and is gone after the 3rd use (' + JSON.stringify(left) + ')');
  ok(left[0].wear === 1 && left[1].wear === 2 && left[2].wear === 0, 'wear is counted and saved (' + JSON.stringify(left.map(x => x.wear)) + ')');
  g = await E(p, () => { const m = window.__m3, o = m.saveState(m.G); return { w: o.wear, st: o.stashes }; });
  ok(g.w && g.st, 'wear and stashes are in the save');

  // ---- hidden stashes
  g = await E(p, () => {
    const D = window.M3_DATA, m = window.__m3, st = Object.keys(D.props).filter(k => D.props[k].stash), items = [], bad = [], seen = [];
    for (const k of st) {
      const pr = D.props[k], line = (D.dialogue[k].talk || []).find(l => !l.if), it = line && line.give ? Object.keys(line.give)[0] : null; if (it) items.push(it);
      const [px, py] = m.tc(...pr.at); if (!m.walkable(px, py + 4)) bad.push(k + ' not walkable');
      for (const o of Object.keys(D.props)) if (o !== k && Math.abs(D.props[o].at[0] - pr.at[0]) + Math.abs(D.props[o].at[1] - pr.at[1]) < 2) bad.push(k + ' too close to ' + o);
      if (!line || (!line.give && !line.kr)) bad.push(k + ' gives nothing'); if (!D.dialogue[k].repeat) bad.push(k + ' no repeat');
      if (it && D.items[it].release && D.items[it].release !== pr.release && D.items[it].release !== 'mon') { if (['mon', 'tue', 'wed'].indexOf(pr.release) < ['mon', 'tue', 'wed'].indexOf(D.items[it].release)) bad.push(k + ' released before its item'); }
    }
    return { n: st.length, items, dup: items.length - new Set(items).size, bad, lot: st.filter(k => D.props[k].at[1] >= 46 && D.props[k].at[0] < 48).length, drugs: items.filter(i => D.items[i].kind === 'drug').length };
  });
  ok(g.n >= 8 && g.dup === 0 && g.bad.length === 0 && g.lot >= 5 && g.drugs >= 5, 'stashes: ' + g.n + ' of them, ' + g.lot + ' in the parking lot, ' + g.drugs + ' drugs, max one of each, all on walkable ground and released with their item ' + JSON.stringify(g.bad));
  await E(p, () => { const m = window.__m3; m.G.items.weed = 0; m.G.kr = 100; });
  await useProp(p, 'stash_weed'); await useProp(p, 'stash_weed');
  g = await E(p, () => { const m = window.__m3; return { weed: m.G.items.weed | 0, flag: !!m.G.flags['got:stash_weed'], vis: m.propVisible('stash_weed') }; });
  ok(g.weed === 1 && g.flag && !g.vis, 'search the stone: 1 weed, only once, and the stone stops being a stash (' + JSON.stringify(g) + ')');
  await useProp(p, 'stash_coins1');
  ok(await E(p, () => window.__m3.G.kr) === 130, 'a coin stash gives kr');
  await E(p, () => { window.__m3.G.items.speed = 0; }); await useProp(p, 'stash_speed');
  ok(await E(p, () => window.__m3.G.items.speed | 0) === 1, 'the speed stash under the tyre');

  // ---- speech bubble over what you can search
  await at(p, 5, 57); await p.waitForTimeout(500);
  g = await E(p, () => { const m = window.__m3; return { near: !!m.G.near, kind: m.G.near && m.G.near.kind, nt: m.G.nearT > 0 }; });
  ok(g.near && g.kind === 'prop' && g.nt, 'standing next to a stash: it is the thing to talk to, and the bubble pops (' + JSON.stringify(g) + ')');
  await p.screenshot({ path: OUT + '/batcha-bubble.png' });

  // ---- day gating: on Monday only the Monday stashes exist
  const q = await open(b, '?dev=day&date=2026-11-23');
  await play(q);
  g = await E(q, () => { const m = window.__m3; return { weed: m.propVisible('stash_weed'), speed: m.propVisible('stash_speed'), dmt: m.propVisible('stash_dmt') }; });
  ok(g.weed && !g.speed && !g.dmt, 'Monday: the weed stash is there, the Tuesday and Wednesday ones are not (' + JSON.stringify(g) + ')');
  await q.close();

  // ---- "Team", not "Party"
  await E(p, () => { const m = window.__m3; m.G.party = [m.mk('badger', 18)]; m.G.scene = 'map'; m.startWild(m.ZONES.find(z => z.id === 'parking')); });
  await toMenu(p);
  g = await E(p, () => [...document.querySelectorAll('#m3ui .m3grid button')].map(x => x.textContent).join('|'));
  ok(/Team/.test(g) && !/Party/i.test(g), 'the battle menu says Team (' + g + ')');

  // ---- auto-fight
  await clickBtn(p, 'Fight'); await p.waitForTimeout(150);
  g = await E(p, () => [...document.querySelectorAll('#m3ui .m3grid button')].map(x => x.textContent).join('|'));
  ok(/Auto-fight/.test(g), 'the move list offers Auto-fight (' + g + ')');
  await E(p, () => { const m = window.__m3; m.curFoe().hp = 150; });
  await E(p, () => { window.__m3.speed = 1; }); await clickBtn(p, 'Auto-fight');
  let stops = 0, manual = 0, end = false;
  for (let i = 0; i < 400 && !end; i++) {
    const s = await E(p, () => { const m = window.__m3, pd = m.pending; if (!m.B) return 'end'; if (!pd) return 'wait'; if (pd.say) { pd.res(); return 'say'; } const t = document.querySelector('#m3ui .m3txt').textContent, bt = [...document.querySelectorAll('#m3ui .m3grid button')].map(x => x.textContent).join('|'); if (/Stop auto/.test(bt)) return 'stop'; if (/Choose a move/.test(t)) return 'manual'; if (/Walk away/.test(bt)) { [...document.querySelectorAll('#m3ui .m3grid button')].find(x => /Walk away/.test(x.textContent)).click(); return 'ko'; } return 'other:' + t; });
    if (s === 'stop') stops++; if (s === 'manual') manual++; if (s === 'end') end = true;
    await p.waitForTimeout(40);
  }
  await E(p, () => { window.__m3.speed = 25; });
  ok(end && stops >= 1 && manual === 0, 'auto-fight plays the turns by itself: the Stop button showed ' + stops + ' times, no move menu came up (' + manual + ')');
  await E(p, () => { const m = window.__m3; m.G.scene = 'map'; m.G.party = [m.mk('badger', 18)]; m.startWild(m.ZONES.find(z => z.id === 'parking')); window.__a1 = !!m.B.auto; m.active().hp = 3; });
  ok(await E(p, () => window.__a1), 'the next wild fight starts on auto too (grinding)');
  await toMenu(p); await p.waitForTimeout(100);
  g = await E(p, () => ({ auto: !!window.__m3.B.auto, txt: document.querySelector('#m3ui .m3txt').textContent }));
  ok(!g.auto && /What will/.test(g.txt), 'a hurt creature stops auto-fight and gives the menu back (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'run'; }); await drive(p, ['Walk away', 'Run']);

  // ---- the bag
  await E(p, () => { const m = window.__m3; m.G.scene = 'map'; m.G.party = [m.mk('badger', 18)]; m.G.items.bag = 10; });
  const bag = async rnd => {
    await E(p, () => { const m = window.__m3; m.startWild(m.ZONES.find(z => z.id === 'parking')); });
    await toMenu(p);
    await E(p, r => { const m = window.__m3; m.curFoe().hp = 2; window.__real = Math.random; Math.random = () => r; window.__d = null; m.throwBag(false).then(x => { window.__d = x; }); }, rnd);
    let seen = new Set();
    for (let i = 0; i < 300; i++) {
      const r = await E(p, () => { const m = window.__m3; if (m.pending && m.pending.say) m.pending.res(); return { d: window.__d, bag: !!(m.B && m.B.bag), foeK: m.B && m.B.bag ? Math.round(m.B.bag.foeK * 10) / 10 : null, tied: !!(m.B && m.B.bag && m.B.bag.tied), rip: !!(m.B && m.B.bag && m.B.bag.rip) }; });
      if (r.bag) seen.add('bag'); if (r.tied) seen.add('tied'); if (r.rip) seen.add('rip'); if (r.foeK === 0) seen.add('sucked');
      if (r.d !== null) { await E(p, () => { Math.random = window.__real; }); return { res: r.d, seen: [...seen] }; }
      await p.waitForTimeout(40);
    }
    await E(p, () => { Math.random = window.__real; }); return { res: 'timeout', seen: [...seen] };
  };
  g = await bag(0.01);
  ok(g.res === true && g.seen.includes('sucked') && g.seen.includes('tied'), 'a catch: the foe is sucked into the bag, it ties shut, you get the creature (' + JSON.stringify(g) + ')');
  ok(await E(p, () => window.__m3.G.party.length) === 2 && await E(p, () => !window.__m3.B.bag), 'the caught creature joined your team and the bag is gone from the screen');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'caught'; }); await drive(p, ['Walk away', 'Run']);
  await E(p, () => { const m = window.__m3; m.G.scene = 'map'; });
  g = await bag(0.99);
  ok(g.res === false && g.seen.includes('sucked') && g.seen.includes('rip'), 'an escape: the bag rips and the foe pops back out (' + JSON.stringify(g) + ')');
  ok(await E(p, () => { const m = window.__m3; return !m.B.bag && m.curFoe().hp > 0; }), 'after the escape the foe is back and the bag is gone');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'run'; }); await drive(p, ['Walk away', 'Run']);

  ok(p.errs.length === 0, 'no page errors (' + p.errs.join(' | ') + ')');
  await b.close();
  if (process.exitCode) console.log('SOME FAILED'); else console.log('PASS m3-batcha all');
})();
