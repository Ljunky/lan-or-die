// Mission 3: the creature roster (M3_CREATURES.md) - lines and forms, evolutions, drug forms by feeding, bad trips (sketchy), trip traits in battle,
// bag sizes, trap ladders with the nothing/lower/own/higher roll, materials, Trapper Tore, Fältboken, drug sources, old-save migration.
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
  const b = await chromium.launch();
  let p = await open(b); await play(p);
  let g;

  // ================= the data =================
  g = await E(p, () => {
    const D = window.M3_DATA, C = D.creatures, m = window.__m3, forms = Object.keys(C), drug = forms.filter(id => C[id].stage === 'drug');
    const starterLines = new Set(forms.filter(id => C[id].starter).map(id => C[id].line));
    const badEvolve = forms.filter(id => C[id].evolve && (!C[C[id].evolve.to] || C[C[id].evolve.to].line !== C[id].line || C[C[id].evolve.to].stage !== C[id].stage + 1 || (C[C[id].evolve.to].evolve && C[C[id].evolve.to].evolve.lv <= C[id].evolve.lv))).length;
    const badDrug = drug.filter(id => { const t = C[C[id].feedFrom]; return !t || !t.feed || !Object.values(t.feed).includes(id) || !D.trips[C[id].trip] || t.feedLv == null || (t.evolve && t.feedLv >= t.evolve.lv); }).length;
    return { n: forms.length, drug: drug.length, starterForms: forms.filter(id => starterLines.has(C[id].line)).length, starterLines: starterLines.size, wildLines: m.WILD_LINES().length, badEvolve, badDrug,
      oldTypes: JSON.stringify([D.types, D.moves, D.creatures, D.items, D.zones, D.trips]).search(/FIZZ|GRUB|FROST|RUSTLE|TECH|"WILD"/), noArt: forms.filter(id => !C[id].art).length, warnings: m.D.warnings.length };
  });
  ok(g.n === 97 && g.drug === 25, 'the roster: 96 forms + the Wraith (' + g.n + '), 25 drug forms (24 + the joke Snapskräfta): ' + g.drug);
  ok(g.starterLines === 5 && g.starterForms === 23 && g.wildLines === 21, 'five starter lines (23 forms), 21 wild lines (' + g.starterLines + '/' + g.starterForms + '/' + g.wildLines + ')');
  ok(g.badEvolve === 0 && g.badDrug === 0, 'every evolve and every drug recipe points at a real form of the same line (' + g.badEvolve + '/' + g.badDrug + ')');
  ok(g.oldTypes === -1, 'no FIZZ / GRUB / WILD / TECH / FROST / RUSTLE left in types, moves, creatures, items or zones');
  ok(g.noArt >= 96 && g.warnings === 0, 'no art yet: the PNGs are still to be drawn and that is not a warning (' + g.warnings + ' warnings)');
  g = await E(p, () => { const m = window.__m3, e = m.eff; return [e('FANG', 'WING'), e('WING', 'ROOT'), e('ROOT', 'WATER'), e('WATER', 'STONE'), e('STONE', 'SHELL'), e('SHELL', 'FANG'), e('WING', 'FANG'), e('FANG', 'SHELL'), e('FANG', 'FANG'), e('MIND', 'FANG'), e('FANG', 'MIND')]; });
  ok(g.slice(0, 6).every(x => x === 1.5) && g[6] === .67 && g[7] === .67 && g[8] === 1 && g[9] === 1 && g[10] === 1, 'type chart: FANG › WING › ROOT › WATER › STONE › SHELL › FANG, MIND neutral (' + g.join(' ') + ')');
  g = await E(p, () => { const m = window.__m3; return [m.formFor('rat', 5), m.formFor('rat', 12), m.formFor('rat', 30), m.formFor('badger', 15), m.formFor('badger', 16), m.formFor('badger', 32), m.formFor('cokeroach', 20), m.formFor('pike', 25), m.formFor('ladybug', 11), m.formFor('ladybug', 12)]; });
  ok(g.join() === 'mouse,rat,ratKing,badgerCub,badger,honeyBadger,cokeroach,pike,larva,ladybug', 'a zone names a LINE, the level picks the form (' + g.join() + ')');
  g = await E(p, () => { const m = window.__m3; return { sizes: [m.bagSize(m.SP.mouse), m.bagSize(m.SP.boarlet), m.bagSize(m.SP.wildBoar), m.bagSize(m.SP.tortoise), m.bagSize(m.SP.hatchling), m.bagSize(m.SP.moose), m.bagSize(m.SP.moose, 'trap'), m.bagSize(m.SP.pikeFry), m.bagSize(m.SP.pike)] }; });
  ok(g.sizes.join() === 'true,true,false,false,true,false,true,true,false', 'bag sizes: S always, M only as a youngling, L / XL never, anything from a trap (' + g.sizes.join() + ')');
  g = await E(p, () => { const m = window.__m3, bad = []; for (const z of m.ZONES) for (const [ref] of (z.enc || [])) { const r = m.repOf(ref); if (!r) bad.push(z.id + ':' + ref); else if (r.starter) bad.push('starter in ' + z.id + ':' + ref); } return bad; });
  ok(g.length === 0, 'zones only name real lines or forms, and never a starter (' + g.join() + ')');
  g = await E(p, () => { const m = window.__m3, out = []; for (const id of Object.keys(m.D.raw.heroes)) out.push(id + ':' + m.bossTeam(id).map(f => f.sp).join('/')); m.CFG.BOSS_AT_GATE = true; const gate = m.bossTeam('wizcudi').map(f => f.lv).join('/'); m.CFG.BOSS_AT_GATE = false; return { out, gate }; });
  ok(g.out.join(' ') === 'bigwman:trancequirrel/blowboar/psilocybear wizcudi:methmoth/speedbeetle/mantisShroom jrohn:acidadder/shroomboar/shroomoose loken:snortoise/mollipike/ketamoose ljunky:cokeroach/laddybug/ketacrow', 'the five hero teams are drug forms, never the starter lines (' + g.out.join(' ') + ')');
  ok(g.gate === '18/20/22', 'BOSS_AT_GATE: team levels are the house gate −2 / ±0 / +2 (' + g.gate + ')');
  g = await E(p, () => { const m = window.__m3; m.fakeHour = 20; const a = m.PPL.isNight(); m.fakeHour = 19; const b = m.PPL.isNight(); m.fakeHour = 5; const c = m.PPL.isNight(); m.fakeHour = 6; const d = m.PPL.isNight(); m.fakeHour = null; return [a, b, c, d]; });
  ok(g.join() === 'true,false,true,false', 'night is the real clock 20:00-06:00 (' + g.join() + ')');

  // ================= evolution =================
  g = await E(p, async () => { const m = window.__m3, c = m.mk('badgerCub', 15); m.G.party = [c]; c.nick = 'Basse'; const hp0 = m.maxHp(c); await m.addXp(c, m.xpNeed(15), null); const a = [c.sp, c.lv, c.nick, c.hp > 0]; c.lv = 31; await m.addXp(c, m.xpNeed(31), null); return { a, b: c.sp, c2: c.lv, hpUp: m.maxHp(c) > hp0, caught: !!m.G.caught.badger && !!m.G.caught.honeyBadger }; });
  ok(g.a.join() === 'badger,16,Basse,true' && g.b === 'honeyBadger' && g.c2 === 32 && g.hpUp && g.caught, 'evolution at the set levels: Badger Cub → Badger (16) → Honey Badger (32), name and nickname stay (' + JSON.stringify(g) + ')');
  g = await E(p, async () => { const m = window.__m3, c = m.mk('mouse', 5), pts = m.goals().total; c.lv = 40; await m.evolveCheck(c, null); return { sp: c.sp, pts, after: m.goals().total }; });
  ok(g.sp === 'ratKing' && g.pts === g.after, 'a creature far above its evolve level jumps through the stages; evolving gives no points (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3, c = m.mk('badgerCub', 15); c.xp = m.xpNeed(15) - 1; m.G.party = [c]; });
  await mkParty(p, [['badgerCub', 15]]);
  const evo = await flow(p, '() => { const m = window.__m3; m.G.party[0].xp = m.xpNeed(15) - 1; return m.addXp(m.G.party[0], 5, true); }', []);
  ok(!evo.err && evo.texts.some(t => /is evolving/.test(t)) && evo.texts.some(t => /evolved into Badger/.test(t)), 'in play the evolution is announced: "What? … is evolving!" then "evolved into Badger!"');

  // ================= feeding =================
  await mkParty(p, [['badger', 24], ['lynx', 30]]);
  await E(p, () => { const m = window.__m3; m.G.items = { xanax: 1, coke: 1, molly: 2 }; m.G.know = {}; });
  let r = await flow(p, 'feedFlow', ['xanax'], ['Badger Lv 24']);
  g = await E(p, () => ({ sp: window.__m3.G.party[0].sp, know: !!window.__m3.G.know['recipe:xanadger'], items: window.__m3.G.items.xanax | 0 }));
  ok(!r.err && g.sp === 'xanadger' && g.know && g.items === 0 && r.texts.some(t => /Benzo Calm/.test(t) && /DEF ×1.4/.test(t) && /doze/.test(t)), 'Bag → Use → Xanax → a Badger at Lv 24 becomes Xanadger, the recipe is learned, the trip trait is explained (' + g.sp + ')');
  await mkParty(p, [['badger', 20], ['lynx', 30]]);
  r = await flow(p, 'feedFlow', ['molly'], ['Badger Lv 20']);
  g = await E(p, () => ({ sp: window.__m3.G.party[0].sp, molly: window.__m3.G.items.molly }));
  ok(g.sp === 'badger' && g.molly === 1 && r.texts.some(t => /Nothing else happens\. Yet\./.test(t)), 'too young: "very relaxed. Nothing else happens. Yet." and the drug is used up');
  r = await flow(p, 'feedFlow', ['coke'], ['Badger Lv 20']);
  ok(!r.texts.some(t => /Yet/.test(t)) && r.texts.some(t => /Nothing else happens/.test(t)), 'a drug that has no recipe for it: nothing happens, no "Yet"');
  await E(p, () => { window.__m3.G.items.molly = 1; window.__realRandom = Math.random; Math.random = () => 0; });
  await flow(p, 'feedFlow', ['molly'], ['Lynx Lv 30']);
  await E(p, () => { Math.random = window.__realRandom; });
  g = await E(p, () => { const m = window.__m3, c = m.G.party[1]; return { sp: c.sp, sk: c.sk - Date.now(), sketchy: m.sketchy(c), fit: m.fit(c) }; });
  ok(g.sp === 'mollynx' && g.sketchy && !g.fit && g.sk > 29.9 * 60000 && g.sk <= 30 * 60000, 'a bad trip: it still evolves (MolLynx) but is sketchy for 30 real minutes (' + Math.round(g.sk / 60000) + ' min)');
  r = await flow(p, 'bagMenu', [], ['^🐸 Team', 'Lynx|MolLynx', 'Back|Close']);
  ok(r.texts.some(t => /Tap one to make it lead/.test(t)), 'the party menu opens in the bag');
  g = await E(p, () => { const m = window.__m3; return m.G.party.map(c => c.sp + ':' + m.fit(c)).sort().join(); });
  ok(g === 'badger:true,mollynx:false', 'only the healthy one is fit to fight (' + g + ')');
  await E(p, () => { const m = window.__m3; m.G.party.sort((a, b) => (m.fit(b) ? 1 : 0) - (m.fit(a) ? 1 : 0)); m.G.party.reverse(); m.startWild(m.ZONES.find(z => z.id === 'parking')); }); await wait(p, 500);
  g = await E(p, () => { const m = window.__m3; return m.B && { me: m.B.me, sp: m.G.party[m.B.me].sp }; });
  ok(g && g.sp === 'badger', 'a battle starts with the first creature that is fit: the sketchy MolLynx stays out (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'run'; }); await drive(p, ['Walk away', 'Run']);
  g = await E(p, () => { const m = window.__m3, c = m.G.party.find(c => c.sp === 'mollynx') || m.mk('mollynx', 30); c.hp = m.maxHp(c); c.sk = Date.now() + 1.5e6; m.G.party = [c]; m.startWild(m.ZONES.find(z => z.id === 'parking')); return !!m.B; });
  ok(g === false, 'with only sketchy creatures there is no fight to start (the encounter just does not happen)');
  g = await E(p, () => { const m = window.__m3; const c = m.G.party[0]; const saved = m.saveState(m.G); const sk = saved.party[0].sk; c.sk = Date.now() - 5; return { saved: sk > Date.now(), fitNow: m.fit(c) }; });
  ok(g.saved && g.fitNow, 'the timer is a real timestamp: it is saved, and a creature is fit again once it has passed');

  // ================= bag sizes: what a carrier bag can hold =================
  await mkParty(p, [['badger', 40]]);
  await E(p, () => { const m = window.__m3; m.G.kr = 500; m.startWild(m.ZONES.find(z => z.id === 'deep2')); }); await wait(p, 300);
  await E(p, () => { const m = window.__m3, f = m.B.foes[0]; f.sp = 'moose'; f.lv = 33; f.hp = 1; m.B.lure = 50; });
  g = await E(p, () => { const m = window.__m3; return { p: m.catchChance(m.B.foes[0]), trap: (m.B.kind = 'trap', m.catchChance(m.B.foes[0])), }; });
  await E(p, () => { window.__m3.B.kind = 'wild'; });
  ok(g.p === 0 && g.trap > 0, 'an adult Moose (XL) cannot be bagged in the wild (0 %) but can once it is in a trap (' + Math.round(g.trap * 100) + ' %)');
  r = await flow(p, '() => { const m = window.__m3; return m.knockout(m.B.foes[0], null); }', [], ['Finish off']);
  g = await E(p, () => ({ antler: window.__m3.G.items.antler | 0 }));
  ok(!r.err && g.antler === 3, 'Finish off drops materials: a Moose gives 3 antlers (' + g.antler + ')');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'run'; }); await drive(p, ['Walk away', 'Run']);

  await p.close();

  // ================= traps: ladders, habitats, sizes, the roll =================
  p = await open(b); await play(p);
  g = await E(p, () => {
    const m = window.__m3, S = m.S, N = 4000, real = Math.random;
    const roll = (item, hab, extra) => { const o = { nothing: 0, junk: 0, lower: 0, own: 0, higher: 0 }, T0 = m.D.raw.items[item].tier; for (let i = 0; i < N; i++) { const r = S.trapCatch(Object.assign({ item, zone: 'parking', hab, at: 0, bait: null, drug: null }, extra)); if (r.nothing) o.nothing++; else if (r.junk) o.junk++; else if (r.higher) o.higher++; else if ([].concat(m.SP[r.sp].tier).includes(T0)) o.own++; else o.lower++; } for (const k in o) o[k] = Math.round(o[k] / N * 100) / 100; return o; };
    m.fakeHour = 12;
    const out = { base: roll('mouseTrap', 'lot'), bait: roll('mouseTrap', 'lot', { bait: 'cheese' }), wrong: roll('mouseTrap', 'lot', { bait: 'honey' }), drug: roll('mouseTrap', 'lot', { drug: 'coke' }), top: roll('moosePen', 'deepforest', { bait: 'salt' }) };
    m.fakeHour = null; return out;
  });
  const near = (v, t, d = .05) => Math.abs(v - t) <= d;
  ok(near(g.base.nothing, .25) && near(g.base.junk, .25) && near(g.base.own, .40) && near(g.base.higher, .10), 'a tier-1 trap: 25 % nothing, 25 % junk (the "lower" result), 40 % its own tier, 10 % too big (' + JSON.stringify(g.base) + ')');
  ok(near(g.bait.nothing, .15) && near(g.bait.own, .50), 'matching bait: −10 % nothing, +10 % own tier (' + JSON.stringify(g.bait) + ')');
  ok(near(g.wrong.nothing, .25) && near(g.wrong.own, .40), 'the wrong bait does nothing (' + JSON.stringify(g.wrong) + ')');
  ok(near(g.drug.nothing, .35) && near(g.drug.own, .30), 'a drug in the bait: "nothing" goes up 10 % (' + JSON.stringify(g.drug) + ')');
  ok(g.top.own <= .64 && g.top.own >= .56 && near(g.top.lower, .25), 'upgrade steps and bait never push "own tier" over 60 % (' + JSON.stringify(g.top) + ')');
  g = await E(p, () => {
    const m = window.__m3, S = m.S, I = m.D.raw.items, c = (item, hab, tier, reveal, night, ig) => S.candidates(I[item], hab, tier, !!reveal, !!night, ig);
    const starters = [], pitF = c('pitTrap', 'forest', 4);  for (const item of Object.keys(I)) if (I[item].ladder) for (const hab of ['maxi', 'lot', 'lawn', 'golf', 'city', 'forest', 'deepforest', 'mountain', 'castle', 'oldlake', 'biglake']) for (let t = 1; t <= 5; t++) for (const id of c(item, hab, t, true, true, true)) if (m.SP[id].starter) starters.push(id);
    return { day: c('liveBox', 'forest', 2, false, false), night: c('liveBox', 'forest', 2, false, true), pit: c('pitTrap', 'deepforest', 4), small: c('liveBox', 'deepforest', 4), pitF, pen: c('moosePen', 'deepforest', 5), pitFive: c('pitTrap', 'deepforest', 5, false, false), pitFiveBig: c('pitTrap', 'deepforest', 5, false, false, true),
      cageDay: c('crayCage', 'biglake', 3, false, false), cageNight: c('crayCage', 'biglake', 3, false, true), trawl: c('trawl', 'biglake', 5, false, true), trawlTrip: c('trawl', 'biglake', 5, true, true), starters, mist: c('mistNet', 'lot', 2, false, false) };
  });
  ok(g.day.includes('squirrelKit') && !g.day.includes('foxKit') && g.night.includes('foxKit') && !g.night.includes('squirrelKit'), 'day and night: squirrels by day, foxes at night (' + g.day.join() + ' / ' + g.night.join() + ')');
  ok(g.pit.includes('mooseCalf') && g.pitF.includes('wildBoar') && !g.small.includes('mooseCalf') && !g.pitFive.includes('moose') && g.pitFiveBig.includes('moose') && g.pen.includes('moose') && g.pen.includes('brownBear'), 'sizes: a pit trap holds L (boar, moose calf), only the moose pen holds XL, a bigger one still shows up as "too big" (' + g.pit.join() + ' / ' + g.pitF.join() + ')');
  ok(!g.cageDay.includes('crayfish') && g.cageNight.includes('crayfish') && g.cageNight.includes('signalCrayfish'), 'the crayfish cage only works at night (' + g.cageNight.join() + ')');
  ok(!g.trawl.includes('trippo') && g.trawlTrip.includes('trippo') && g.trawlTrip.includes('pikezilla'), 'Trippopotamus only comes to the trawl while you are tripping (' + g.trawlTrip.join() + ')');
  ok(g.starters.length === 0, 'starters never show up in any trap');
  ok(g.mist.includes('crowling') && !g.mist.includes('mouse'), 'air traps catch birds (mist net: crowlings), not mice');
  // placing
  r = await E(p, () => { const m = window.__m3; for (const id of ['longline', 'trawl', 'lightTrap', 'mouseTrap', 'jamJar', 'rodTrap']) m.give(id); m.give('cheese'); m.give('coke'); m.give('honey'); m.fakeHour = 12; return true; });
  await at(p, 20, 59);
  r = await flow(p, 'S.placeTrap', ['longline']); ok(r.texts.some(t => /deep water/.test(t)) && await E(p, () => window.__m3.G.traps.length === 0), 'a deep longline refuses a shore or dry land: pier end or boat only');
  r = await flow(p, 'S.placeTrap', ['lightTrap']); ok(r.texts.some(t => /after dark/.test(t)), 'a light trap only works after dark');
  r = await flow(p, 'S.placeTrap', ['trawl']); ok(r.texts.some(t => /boat/.test(t)), 'a trawl needs a boat');
  await at(p, 23, 3);
  r = await flow(p, 'S.placeTrap', ['longline']);
  ok(await E(p, () => window.__m3.G.traps.length === 1 && window.__m3.G.traps[0].hab === 'oldlake'), 'at the end of the pier a deep longline can be set (old lake)');
  await E(p, () => { const m = window.__m3; m.G.traps = []; });
  await at(p, 14, 54);
  r = await flow(p, 'S.placeTrap', ['mouseTrap'], ['Cheese', 'Coke']);
  g = await E(p, () => { const m = window.__m3, t = m.G.traps[0]; return t && { bait: t.bait, drug: t.drug, hab: t.hab, cheese: m.G.items.cheese | 0, coke: m.G.items.coke | 0 }; });
  ok(g && g.bait === 'cheese' && g.drug === 'coke' && g.hab === 'lot' && g.cheese === 0 && g.coke === 0, 'placing: pick the bait, then a drug for it; both are used up (' + JSON.stringify(g) + ')');
  // checking: nothing / own / wreck
  await E(p, () => { const m = window.__m3; m.trapSpeed = 1e6; m.G.traps[0].at = 0; window.__real = Math.random; Math.random = () => .1; });
  r = await flow(p, 'S.interact', [{ kind: 'trap', ref: await E(p, () => window.__m3.G.traps[0]) }]);
  await E(p, () => { Math.random = window.__real; });
  g = await E(p, () => ({ traps: window.__m3.G.traps.length, back: window.__m3.G.items.mouseTrap | 0, b: !!window.__m3.B }));
  ok(r.texts.some(t => /Something laughed|Empty|Nothing|bait is gone|nobody is home|dignity|insult/i.test(t)) && g.traps === 0 && g.back === 1 && !g.b, 'checking an empty trap: a funny line, the trap comes back to your bag (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3; m.G.traps = [{ item: 'mouseTrap', tx: 5, ty: 5, x: m.G.p.x, y: m.G.p.y, zone: 'parking', hab: 'lot', at: 0, bait: null, drug: null }]; m.G.items.mouseTrap = 0; Math.random = () => .5; });
  await flow(p, 'S.interact', [{ kind: 'trap', ref: await E(p, () => window.__m3.G.traps[0]) }]); await wait(p, 300);
  await E(p, () => { Math.random = window.__real; });
  g = await E(p, () => { const m = window.__m3; return { kind: m.B && m.B.kind, catchBonus: m.B && m.EF.sum(m.B.foes[0], 'catchBonus'), tier: m.B && m.SP[m.B.foes[0].sp].tier, back: m.G.items.mouseTrap | 0 }; });
  ok(g.kind === 'trap' && near(g.catchBonus, .3, .01) && g.tier === 1 && g.back === 1, 'a normal catch: a dazed creature of the trap\'s tier, and the trap is back in the bag (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'run'; }); await drive(p, ['Walk away', 'Run']);
  await E(p, () => { const m = window.__m3; m.G.traps = [{ item: 'mouseTrap', tx: 5, ty: 5, x: m.G.p.x, y: m.G.p.y, zone: 'parking', hab: 'lot', at: 0, bait: null, drug: null }]; m.G.items.mouseTrap = 0; Math.random = () => .995; });
  await flow(p, 'S.interact', [{ kind: 'trap', ref: await E(p, () => window.__m3.G.traps[0]) }]); await wait(p, 300);
  await E(p, () => { Math.random = window.__real; });
  g = await E(p, () => { const m = window.__m3; return { kind: m.B && m.B.kind, cb: m.B && m.EF.sum(m.B.foes[0], 'catchBonus'), tier: m.B && m.SP[m.B.foes[0].sp].tier, wreck: m.G.wrecks.mouseTrap, back: m.G.items.mouseTrap | 0 }; });
  ok(g.kind === 'trap' && g.wreck === 1 && g.back === 0 && g.cb < .1 && g.tier === 2, 'too big: the trap is wrecked (not returned), the creature of the next tier is dazed but hard to catch (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'run'; }); await drive(p, ['Walk away', 'Run']);

  // ================= Trapper Tore =================
  g = await E(p, () => { const D = window.M3_DATA, load = know => PX.data.load(D, {}, { today: () => '2026-11-25', devAll: false, flag: f => f.startsWith('know:') && !!know[f.slice(5)] }); return [load({}).released(D.npcs.tore), load({ tore: 1 }).released(D.npcs.tore)]; });
  ok(g.join() === 'false,true', 'Trapper Tore is not on the map until somebody has told you about him (knowledge layer)');
  await E(p, () => { window.__m3.G.know.tore = 1; window.__m3.PPL.pst('tore').met = 0; });
  await at(p, 50, 59); await wait(p, 300);
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.ref && window.__m3.G.near.ref.id === 'tore' && window.__m3.walkable(...window.__m3.tc(50, 59))), 'once you know about him, Trapper Tore stands in his clearing at the forest edge and can be tapped');
  await p.screenshot({ path: OUT + '/M3C_tore.png' });
  await E(p, () => { const m = window.__m3; m.G.know.tore = 1; m.G.items = { mouseTrap: 1, fur: 3 }; m.G.kr = 100; m.G.wrecks = {}; });
  r = await flow(p, '() => window.__m3.S.trapper({ id: "tore", d: window.__m3.D.raw.npcs.tore })', [], ['Upgrade a trap', 'Mouse trap', 'Leave']);
  g = await E(p, () => ({ box: window.__m3.G.items.liveBox | 0, old: window.__m3.G.items.mouseTrap | 0, fur: window.__m3.G.items.fur | 0, kr: window.__m3.G.kr }));
  ok(!r.err && g.box === 1 && g.old === 0 && g.fur === 0 && g.kr === 40, 'Tore upgrades a Mouse trap to a Live box for 60 kr + 3 fur (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3; m.G.wrecks = { mouseTrap: 1 }; m.G.kr = 100; });
  r = await flow(p, '() => window.__m3.S.trapper({ id: "tore", d: window.__m3.D.raw.npcs.tore })', [], ['Repair a wreck', 'Mouse trap', 'Leave']);
  g = await E(p, () => ({ box: window.__m3.G.items.mouseTrap | 0, wr: window.__m3.G.wrecks.mouseTrap, kr: window.__m3.G.kr }));
  ok(!r.err && g.box === 1 && g.wr === 0 && g.kr === 85, 'a wrecked trap is repaired for half price (15 kr) (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3; m.G.items = { mouseTrap: 1 }; m.G.kr = 500; });
  r = await flow(p, '() => window.__m3.S.trapper({ id: "tore", d: window.__m3.D.raw.npcs.tore })', [], ['Upgrade a trap', 'Mouse trap', 'Leave']);
  g = await E(p, () => ({ box: window.__m3.G.items.liveBox | 0, old: window.__m3.G.items.mouseTrap | 0 }));
  ok(g.box === 0 && g.old === 1, 'without the materials an upgrade cannot be bought, however much money you have');
  ok(await E(p, () => { const I = window.__m3.D.raw.items; let t = 'mouseTrap', n = 1; while (I[t].upgradesTo) { t = I[t].upgradesTo; n++; } return n === 5 && t === 'moosePen' && I.rodTrap.upgradesTo === 'netTrap' && I.netTrap.upgradesTo === 'crayCage' && I.crayCage.upgradesTo === 'longline' && I.longline.upgradesTo === 'trawl' && I.jamJar.upgradesTo === 'mistNet' && I.mistNet.upgradesTo === 'lightTrap' && I.netTrap.upgradeCost.scale === 3; }), 'the ladders: ground 5 tiers (mouse trap → moose pen), water 5 (rod → trawl), air 3 (jam jar → light trap)');

  // ================= Fältboken =================
  await E(p, () => { const m = window.__m3; m.G.items = {}; m.G.seen = {}; m.G.caught = {}; m.G.lines = {}; m.G.know = {}; m.G.party = [m.mk('badgerCub', 5)]; m.G.box = []; });
  r = await flow(p, 'fieldBook', []);
  ok(r.texts.some(t => /You have no field guide/.test(t) && /Badger Cub/.test(t)), 'without Fältboken you only see the creatures you own (no creature list)');
  await E(p, () => { const m = window.__m3; m.give('faltboken'); m.G.seen.badgerCub = 1; });
  g = await E(p, () => window.__m3.bookPage('badger'));
  ok(/Badger Cub/.test(g) && /■■■■■■ \?\?\? \+ \?\?\?/.test(g) && !/Xanadger/.test(g) && !/Size/.test(g) && !/✏️/.test(g), 'a seen line shows its name and a black silhouette for each drug form, nothing more');
  await E(p, () => { const m = window.__m3; m.G.caught.badgerCub = 1; m.G.know['recipe:xanadger'] = 1; });
  g = await E(p, () => window.__m3.bookPage('badger'));
  ok(/Size/.test(g) && /Bait: Honey/.test(g) && /Xanadger: Feed a Badger \(Lv 24\+\) Xanax/.test(g) && /✏️/.test(g) && (g.match(/■■■■■■/g) || []).length === 3, 'a caught line adds size, bait and margin notes; a known recipe shows as handwriting (' + g.split('\n').length + ' lines)');
  r = await flow(p, 'fieldBook', [], ['Badger', 'Close']);
  ok(r.texts.some(t => /lines caught/.test(t)), 'with the book the list of lines appears');
  await E(p, () => { const m = window.__m3; m.G.items = {}; m.G.dealer.pts = 10; });
  await at(p, 45, 34); await wait(p, 200);
  await E(p, () => { window.__m3.interact(); }); await until(p, 'Fältboken'); await wait(p, 150);
  g = await E(p, () => ({ book: window.__m3.G.items.faltboken | 0, pts: window.__m3.G.dealer.pts }));
  ok(g.book === 1 && g.pts === 6, 'the dealer sells Fältboken for 4 creature points (' + JSON.stringify(g) + ')');
  await until(p, '^‹ Leave'); await drive(p, []);
  await E(p, () => { window.__m3.G.items = {}; window.__m3.G.flags = {}; });
  await at(p, 121, 59);
  await p.screenshot({ path: OUT + '/M3C_camper.png' });
  await useProp(p, 'camper');
  g = await E(p, () => ({ book: window.__m3.G.items.faltboken | 0, meth: window.__m3.G.items.meth | 0 }));
  ok(g.book === 1 && g.meth === 0, 'the camper van in the deep forest: a free Fältboken the first time');
  await useProp(p, 'camper');
  g = await E(p, () => ({ book: window.__m3.G.items.faltboken | 0, meth: window.__m3.G.items.meth | 0, know: !!window.__m3.G.know['recipe:methmoth'] }));
  ok(g.book === 1 && g.meth === 1 && g.know, 'the second time: something under the bunk (very rare meth) and the Methmoth recipe');
  await useProp(p, 'camper');
  ok(await E(p, () => window.__m3.G.items.meth === 1), 'and then it is empty');

  // ================= where the drugs come from =================
  g = await E(p, () => { const D = window.M3_DATA, load = flags => PX.data.load(D, {}, { today: () => '2026-11-25', devAll: false, flag: f => !!flags[f] }), I = D.items; return { rx0: load({}).released(I.xanax), rx1: load({ xanaxRx: 1 }).released(I.xanax), shop: D.npcs.apotek.shop.includes('xanax'), door: D.npcs.doorman.role + ':' + D.npcs.doorman.shop.join() }; });
  ok(!g.rx0 && g.rx1 && g.shop, 'Xanax is on the Apotek shelf only with the prescription');
  ok(g.door === 'merchant:molly,speed,keta', 'Molly, Speed and Ketamine: the rave doorman');
  await E(p, () => { const m = window.__m3; m.G.flags = {}; m.G.know = {}; m.G.items = {}; m.G.quests = {}; m.G.people = {}; m.PPL.pst('apotek').met = 2; m.G.party = [m.mk('badger', 20), m.mk('signalCrayfish', 36)]; m.skipReplies = false; });
  await talkTo(p, 'apotek');
  g = await E(p, () => ({ q: { ...window.__m3.PPL.qs('xanax_rx') }, rx: !!window.__m3.G.flags.xanaxRx, rec: !!window.__m3.G.know['recipe:xanadger'] }));
  ok(g.q.done && g.rx && g.rec, 'the prescription quest: show the pharmacist a Signal Crayfish → Xanax unlocked, and you learn what it does to a badger (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3; m.G.flags = {}; m.G.items = {}; m.PPL.pst('hasse').met = 1; m.PPL.pst('hasse').rel = 2; });
  await talkTo(p, 'hasse');
  g = await E(p, () => ({ lsd: window.__m3.G.items.lsd | 0, rec: !!window.__m3.G.know['recipe:laddybug'] }));
  ok(g.lsd === 1 && g.rec, 'Hallucinating Hasse gives you LSD once he trusts you (relationship 2) and tells you the Ladd-ybug recipe');
  await E(p, () => { const m = window.__m3; m.G.flags = {}; m.G.items = {}; m.fakeHour = 23; });
  await at(p, 92, 43); await wait(p, 300);
  g = await E(p, () => window.__m3.propVisible('alley'));
  await useProp(p, 'alley');
  const day = await E(p, () => { const m = window.__m3; m.fakeHour = 12; return m.propVisible('alley'); });
  ok(g === true && day === false && await E(p, () => window.__m3.G.items.coke === 1), 'a city alley (night only) holds one bag of coke');
  await E(p, () => { window.__m3.fakeHour = null; });
  ok(await E(p, () => { const I = window.__m3.D.raw.items; return ['xanax', 'molly', 'keta', 'lsd', 'speed', 'meth', 'dmt', 'coke', 'weed', 'shrooms', 'snaps'].every(d => I[d].feed && I[d].use) && Object.keys(window.__m3.D.raw.trips).every(t => I[t] && I[t].feed); }), 'every trip has a feedable drug item that can also be taken yourself');

  // ================= trip traits and signature moves in real battles =================
  const toMenu = async (maxT = 200) => { for (let i = 0; i < maxT; i++) { const s = await E(p, () => { const m = window.__m3; if (!m.B) return 'over'; const pd = m.pending; if (pd && pd.say) { pd.res(); return 'say'; } return [...document.querySelectorAll('#m3ui .m3grid button')].some(x => !x.disabled && /^⚔️ Fight/.test(x.textContent)) ? 'menu' : 'wait'; }); if (s === 'menu' || s === 'over') return s; await wait(p, 30); } return 'timeout'; };
  const turn = async (moveRe, max = 700) => {
    let phase = 'start';
    for (let i = 0; i < max; i++) {
      const st = await E(p, ([re, phase]) => {
        const m = window.__m3; if (!m.B) return 's:over'; const pd = m.pending; if (!pd) return 's:wait'; if (pd.say) { pd.res(); return 's:say'; }
        const btns = [...document.querySelectorAll('#m3ui .m3grid button')].filter(b => !b.disabled), find = r => btns.find(x => new RegExp(r).test(x.textContent));
        const fight = find('^⚔️ Fight'); if (fight) { if (phase === 'start') { fight.click(); return 's:fight'; } return 's:menu'; }
        const mv = find(re); if (mv && phase === 'choose') { mv.click(); return 's:moved'; }
        const pull = find('Pull up'); if (pull) { pull.click(); return 's:other'; }
        return 's:other';
      }, [moveRe, phase]);
      if (st === 's:fight') phase = 'choose'; else if (st === 's:moved') phase = 'after'; else if (st === 's:menu' && phase === 'after') return 'menu'; else if (st === 's:over') return 'over';
      await wait(p, st === 's:wait' ? 30 : 12);
    }
    return 'timeout';
  };
  const arena = async (mine, foe, tweak) => {
    await E(p, async ([mine, foe, tweak]) => { const m = window.__m3; m.CFG.ENC_RATE = 0; m.G.party = mine.map(([s, lv, hpf]) => { const c = m.mk(s, lv); c.hpMul = 20; c.hp = Math.round(m.maxHp(c) * (hpf || 1)); return c; }); m.startWild(m.ZONES.find(z => z.id === 'parking')); }, [mine, foe, tweak]);
    await wait(p, 350);
    await E(p, ([foe, tweak]) => { const m = window.__m3, f = m.B.foes[0]; f.sp = foe[0]; f.lv = foe[1]; f.hpMul = foe[2] || 20; f.hp = m.maxHp(f); if (tweak === 'stun') f.stun = 99; }, [foe, tweak]);
    return toMenu();
  };
  const leave = async () => { await E(p, () => { const m = window.__m3; if (m.B) { m.B.over = true; m.B.result = 'run'; } }); await drive(p, ['Walk away', 'Run']); await wait(p, 150); };
  const st = () => E(p, () => { const m = window.__m3, me = m.active(), f = m.curFoe(); return { hp: me.hp, max: m.maxHp(me), stun: me.stun, why: me.stunWhy, cute: me.cute, pend: me.pend, stg: { ...me.stg }, t: me.t, fhp: f.hp, fmax: m.maxHp(f), fstg: { ...f.stg }, fstun: f.stun, fpoison: f.poison, fconf: m.EF.has(f, 'confuse'), mconf: m.EF.has(me, 'confuse'), party: m.G.party.map(c => ({ hp: c.hp, max: m.maxHp(c), stg: { ...c.stg } })) }; });
  const any = '(Power|Status)';
  await E(p, () => { const T = window.__m3.D.raw.trips; window.__skipP = {}; for (const k in T) { window.__skipP[k] = T[k].skipP; T[k].skipP = 0; } });   // the skip chances are tested on their own below: no coin flips in the move checks

  await arena([['xanadger', 30, .5]], ['hedgehog', 30], 'stun'); await p.screenshot({ path: OUT + '/M3C_battle_placeholder.png' }); let a = await st(); await turn('Benzo Nap'); let z = await st();
  ok(z.hp > a.hp + .3 * a.max && z.stun === 1 && /asleep/.test(z.why || ''), 'Benzo Nap (Xanadger): heals 40 % and sleeps a turn (' + a.hp + ' → ' + z.hp + ', stun ' + z.stun + ')'); await leave();
  await arena([['ecstadger', 30], ['badger', 30, .3]], ['hedgehog', 30]); a = await st(); await turn('Group Hug'); z = await st();
  ok(z.party[1].hp > a.party[1].hp && z.fstg.atk === -1, 'Group Hug (Ecstadger): heals the whole party, the foe loses ATK'); await leave();
  await arena([['mollynx', 30]], ['hedgehog', 30]); a = await st(); await turn('Big Eyes'); z = await st();
  ok(z.cute === 1 && z.hp === a.hp, 'Big Eyes (MolLynx): the foe cannot attack it ("too cute"): no damage, cute 2 → 1 (' + a.hp + ' → ' + z.hp + ')'); await leave();
  await arena([['dmtoad', 30]], ['hedgehog', 30]); await turn('Breakthrough'); z = await st();
  ok(z.fstun >= 2, 'Breakthrough (DMToad): the foe meets the machine elves and loses 3 turns (stun ' + z.fstun + ')'); await leave();
  await arena([['stonedeer', 30, .5]], ['hedgehog', 30]); a = await st(); await turn('Chill Out'); z = await st();
  ok(z.stg.atk === -1 && z.fstg.atk === -1 && z.hp > a.hp, 'Chill Out (Stonedeer): both sides lose ATK, it heals'); await leave();
  await arena([['trancequirrel', 30], ['badger', 30]], ['hedgehog', 30]); await turn('Drop the Bass'); z = await st();
  ok(z.party[1].stg.spd >= 1 && z.stg.spd >= 1, 'Drop the Bass (Trancequirrel): the whole team speeds up'); await leave();
  await arena([['snapskrafta', 30]], ['hedgehog', 30]); await turn('Helan Går'); z = await st();
  ok(z.stg.atk === 1, 'Helan Går (Snapskräfta): sings, ATK +1'); await leave();
  await arena([['mollipike', 34, .5]], ['hedgehog', 30], 'stun'); a = await st(); await turn('Love Bite'); z = await st();
  ok(z.hp > a.hp && z.fhp < a.fhp, 'Love Bite (Mollipike): hurts the foe and heals itself (' + a.hp + ' → ' + z.hp + ')'); await leave();
  await arena([['acidadder', 30]], ['hedgehog', 30]); await turn('Melt'); z = await st();
  ok(z.fstg.def === -2 && z.fpoison === 3, 'Melt (Acidadder): DEF −2 and poison (' + z.fpoison + ' turns left)'); await leave();
  await arena([['shroomoose', 34]], ['hedgehog', 30]); await turn('Antler Bloom'); z = await st();
  ok(z.fconf, 'Antler Bloom (Shroomoose): the foe is confused'); await leave();
  await arena([['methmoth', 30]], ['hedgehog', 30]); await turn('Lamp Frenzy'); z = await st();
  ok(z.stg.atk === 3 && z.stg.def === -1, 'Lamp Frenzy + the meth trip: ATK +2 from the move, +1 every turn, DEF −1 every turn (' + JSON.stringify(z.stg) + ')'); await leave();
  await arena([['ketamoose', 34, .5]], ['hedgehog', 30], 'stun'); a = await st(); await turn('Moose in the Void'); z = await st();
  ok(z.hp > a.hp + .4 * a.max && z.stun === 1, 'Moose in the Void (Ketamoose): heals 50 %, skips a turn'); await leave();
  await arena([['ketadger', 30]], ['hedgehog', 30]); a = await st(); await turn('K-Hole'); z = await st();
  ok(z.fhp < a.fhp && z.pend === 0, 'K-Hole (Ketadger): hides one turn, then a huge hit lands (foe ' + a.fhp + ' → ' + z.fhp + ')'); await leave();
  await arena([['ladger', 30]], ['hedgehog', 30]); await turn('Kaleidoscope Claw'); z = await st();
  ok(typeof z.t === 'string' && z.fhp < z.fmax, 'Kaleidoscope Claw (Ladger): its type changes to the one that hits hardest (' + z.t + ')'); await leave();
  await arena([['trippo', 40]], ['hedgehog', 30]); await turn('Bad Trip'); z = await st();
  ok(z.fconf || z.mconf, 'Bad Trip (Trippopotamus): everyone is confused, itself too'); await leave();
  for (const [form, lv, re, name] of [['sporecupine', 30, 'Spore Quills', 'Spore Quills'], ['speedbeetle', 30, 'Tweak', 'Tweak'], ['psilocybear', 34, 'Third Eye Maul', 'Third Eye Maul'], ['blowboar', 30, 'Nose Charge', 'Nose Charge'], ['shroomboar', 30, 'Truffle Rage', 'Truffle Rage'], ['mantisShroom', 30, 'Sporepunch', 'Sporepunch'], ['xanaxfox', 30, 'Unbothered', 'Unbothered'], ['honeyBadger', 32, "Doesn't Care", "Doesn't Care"], ['cokeroach', 30, 'Rail', 'Rail'], ['ketacrow', 30, 'Dissociate', 'Dissociate'], ['laddybug', 30, 'Seven Spots', 'Seven Spots of Truth'], ['snortoise', 30, 'Line Dash', 'Line Dash']]) {
    await arena([[form, lv]], ['hedgehog', 30]); a = await st(); const res = await turn(re); z = await st();
    ok((res === 'menu' || res === 'over') && (z.fhp < a.fhp || z.hp !== a.hp || z.stg.def === 2), name + ' (' + form + ') works in a real battle (foe ' + a.fhp + ' → ' + z.fhp + ')'); await leave();
  }
  // passive traits, one round with the foe asleep
  const idle = async (form, hpf, extra) => { await arena([[form, 30, hpf], ...(extra || [])], ['hedgehog', 30], 'stun'); const a0 = await st(); await turn(any); return [a0, await st()]; };
  [a, z] = await idle('cokeroach', 1); ok(z.hp === a.hp - Math.max(1, Math.round(a.max * .05)), 'Rail (coke): loses 5 % HP every turn (' + a.hp + ' → ' + z.hp + ')'); await leave();
  [a, z] = await idle('stonedeer', .5); ok(z.hp > a.hp, 'Chill (weed): heals every turn (' + a.hp + ' → ' + z.hp + ')'); await leave();
  [a, z] = await idle('ecstadger', 1, [['badger', 30, .4]]); ok(z.party[1].hp > a.party[1].hp, 'Love Everyone (molly): heals the party 5 % every turn'); await leave();
  g = await E(p, () => { const m = window.__m3, c = n => m.mk(n, 30), ratio = (n, k, base) => Math.round(m.eStat(c(n), k, 'foe') / (m.baseStat(c(n), { atk: 1, def: 2, spd: 3 }[k])) * 100) / 100, plain = n => m.baseStat(c(n), 2);
    return { xanaxDef: ratio('xanadger', 'def'), weedSpd: ratio('stonedeer', 'spd'), shroomSpd: ratio('sporecupine', 'spd'), plain: ratio('badger', 'def'),
      immune: [['ketadger', 'drops'], ['ketadger', 'status'], ['honeyBadger', 'drops'], ['xanadger', 'confuse'], ['xanadger', 'drops'], ['badger', 'confuse']].map(([n, k]) => m.immune(c(n), k)).join(), first: ['cokeroach', 'snortoise', 'blowboar', 'badger'].map(n => !!(m.tripOf(c(n)) && m.tripOf(c(n)).first)).join() }; });
  ok(g.xanaxDef === 1.4 && g.weedSpd === .7 && g.shroomSpd === .85 && g.plain === 1, 'trip stat multipliers: Xanax DEF ×1.4, weed SPD ×0.7, shrooms SPD ×0.85 (' + JSON.stringify(g) + ')');
  ok(g.immune === 'true,true,true,true,false,false' && g.first === 'true,true,true,false', 'immunities (ketamine: drops + status, Honey Badger: drops, Xanax: confusion) and "always first" (coke) (' + g.immune + ' / ' + g.first + ')');
  await E(p, () => { const T = window.__m3.D.raw.trips; for (const k in window.__skipP) T[k].skipP = window.__skipP[k]; });
  // these two talk through say(): do them on the map, not inside a running battle loop
  await E(p, () => { window.__real = Math.random; Math.random = () => 0; return true; });
  r = await flow(p, '() => window.__m3.tripSkip(window.__m3.mk("xanadger", 30))', []); await E(p, () => { Math.random = window.__real; });
  ok(r.texts.some(t => /dozes off/.test(t)), 'Benzo Calm: it sometimes dozes off and loses the turn');
  r = await flow(p, '() => { const m = window.__m3, c = m.mk("honeyBadger", 32); m.resetStg(c); window.__hb = c; return m.stage(c, "atk", -1); }', []);
  ok(await E(p, () => window.__hb.stg.atk === 0) && r.texts.some(t => /does not care/.test(t)), 'Honey Badger ignores stat drops ("Doesn\'t Care")');
  r = await flow(p, '() => { const m = window.__m3, c = m.mk("badger", 32); m.resetStg(c); window.__bd = c; return m.stage(c, "atk", -1); }', []);
  ok(await E(p, () => window.__bd.stg.atk === -1), 'an ordinary Badger does lose ATK when it is lowered');
  await E(p, () => { const m = window.__m3; m.G.party = [m.mk('laddybug', 20)]; });
  g = await E(p, () => window.__m3.encTable(window.__m3.ZONES.find(z => z.id === 'biglake')).some(e => e[0] === 'trippo'));
  ok(g, 'Seven Spots of Truth: a Ladd-ybug in the party reveals Trippopotamus on the lake');

  await p.close();

  // ================= old saves: v4 → v5 =================
  p = await open(b, '?dev=all&date=2026-11-25');
  await E(p, () => localStorage.setItem('lod.save.m3.Ljunky', JSON.stringify({ t: 500, ts: Date.now(), data: { v: 4, p: [72, 990], party: [{ sp: 'frog', lv: 9, xp: 3, hp: 20 }, { sp: 'bear', lv: 40, xp: 0, hp: 200 }], box: [{ sp: 'wraith', lv: 7, xp: 0, hp: 10 }, { sp: 'cat', lv: 20, xp: 0, hp: 50 }],
    seen: { frog: 1, golem: 1, rat: 1 }, caught: { frog: 1, bear: 1, rat: 1 }, items: { wildMk1: 2, bag: 3 }, traps: [{ item: 'wildMk1', tx: 5, ty: 5, x: 80, y: 80, zone: 'parking', at: 1 }, { item: 'saleSign', tx: 6, ty: 6, x: 90, y: 90, zone: 'parking', at: 1 }],
    graves: [{ sp: 'peng', kind: 'creature', name: 'Freezer Penguin', n: 1, lv: 5, date: 'x', epitaph: 'x' }, { sp: 'rat', kind: 'creature', name: 'Rat', n: 1, lv: 5, date: 'x', epitaph: 'x' }], flags: {}, beat: [], solved: [], starter: 'frog' } })));
  await toBrief(p, 'bigwman'); await p.click('#brief-go'); await wait(p, 700);
  g = await E(p, () => { const m = window.__m3, G = m.G; return { party: G.party.map(c => c.sp + c.lv), box: G.box.map(c => c.sp + c.lv), traps: G.traps.map(t => t.item).join(), mouse: G.items.mouseTrap | 0, bag: G.items.bag | 0, graves: G.graves.map(q => q.sp).join(), lines: Object.keys(G.lines).sort().join(), caught: Object.keys(G.caught).sort().join(), seen: Object.keys(G.seen).sort().join() }; });
  ok(g.party.join() === 'toadlet9,brownBear40', 'an old save: frog → Toadlet, bear → the Brown Bear that fits its level (' + g.party.join() + ')');
  ok(g.box.join() === 'wraith7,lynx20', 'old creatures keep their level, the Wraith stays (' + g.box.join() + ')');
  ok(g.traps === 'saleSign' && g.mouse === 3 && g.bag === 3, 'old lure traps (placed and in the bag) come back as mouse traps; wife traps stay (' + g.traps + ', ' + g.mouse + ' mouse traps)');
  ok(g.graves === 'rat' && g.caught === 'rat' && g.seen === 'rat', 'graves and seen / caught entries of creatures that no longer exist are dropped (' + g.graves + ' | ' + g.caught + ' | ' + g.seen + ')');
  ok(g.lines === 'rat', 'species points are rebuilt from the lines you caught (' + g.lines + ')');
  await E(p, () => { document.getElementById('btn-pause').click(); }); await wait(p, 400);
  ok(await E(p, () => JSON.parse(localStorage.getItem('lod.save.m3.Ljunky')).data.v) === 5, 'and it is saved again as v5');
  ok(p.errs.length === 0, 'no page errors (creatures)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  await b.close();
})();
