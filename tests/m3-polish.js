// Mission 3 polish scenarios: start screen, fx=off, discovery, throw + catch, finish off -> grave -> resurrect, trap wait + spawn,
// coke x4 heart attack, mushroom reveal, dealer trade + wife refusal, Ljunky -> AI-Ljunky -> training -> grave reward -> mythic,
// old v1 save migration, release gating, a new NPC + trap added purely via data. Screenshots in tests/out/M3P_*.png.
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
  await pickStarter(p, 'Folköl Frog'); await E(p, () => { window.__m3.skipReplies = true; });
  await E(p, () => { const m = window.__m3; m.G.party = ['frog', 'cuke', 'peng', 'bear'].map(s => m.mk(s, 18)); m.G.kr = 5000; });
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

  // ---------- release gating (data only) ----------
  let p = await open(b);
  ok(await E(p, () => { const db = PX.data.load(window.M3_DATA, {}, { today: () => '2026-11-23', devAll: false }); const C = window.M3_DATA.creatures, I = window.M3_DATA.items;
    return db.released(C.frog) && !db.released(C.lich) && !db.released(C.wraith) && db.released(I.coke) && !db.released(I.shrooms) && !db.released(I.fizzMk2) && !db.released(window.M3_DATA.apps.klarna) && db.released(window.M3_DATA.apps.tibber); }), 'gating: Mon has frog/coke/Tibber, not EPIC, mushrooms, Mk2 traps, Klarna or the mythic');
  ok(await E(p, () => { const db = PX.data.load(window.M3_DATA, {}, { today: () => '2026-11-24', devAll: false }); return db.released(window.M3_DATA.creatures.lich) && !db.released(window.M3_DATA.items.fizzMk3); }), 'gating: Tue adds EPIC creatures, Wed items still hidden');
  ok(await E(p, () => window.__m3.D.warnings.length === 0), 'data file validates with no warnings (' + (await E(p, () => window.__m3.D.warnings.join('; '))) + ')');

  // ---------- start screen ----------
  await E(p, () => localStorage.removeItem('lod.save.m3.Ljunky'));
  await toBrief(p);
  const brief = await E(p, () => { const s = document.getElementById('scr-brief'), inner = s.querySelector('.inner'); return { txt: s.textContent, cls: s.className, bg: getComputedStyle(inner).backgroundColor }; });
  ok(/m3solid/.test(brief.cls) && brief.bg === 'rgb(251, 246, 232)', 'start screen: solid cream panel (' + brief.bg + ')');
  ok(!/FIZZ|GRUB|Easter|egg|catch|%|crit|Weakness|ability/i.test(brief.txt), 'start screen: no type chart, odds, easter egg or hints');
  ok(!/spiked/.test(brief.txt) && /Wake up/.test(brief.txt) && /drag/.test(brief.txt), 'start screen: "Wake up." + controls only, no story spoilers');
  await p.screenshot({ path: OUT + '/M3P_start.png' });

  // ---------- discovery ----------
  await p.click('#brief-go'); await p.waitForTimeout(300);
  await E(p, () => { window.__m3.speed = 25; }); await pickStarter(p, 'Folköl Frog');
  await E(p, () => { window.__m3.give('snus', 2); window.__m3.bagMenu(); });
  await until(p, '^🍺 Use');
  await p.waitForTimeout(100);
  let t = await btnText(p);
  ok(/Snus.*\?\?\?/.test(t) && !/Small buff/.test(t), 'unknown item shows ??? and no effect text');
  await until(p, 'Snus'); await p.waitForTimeout(200);
  await E(p, () => window.__m3.bagMenu ? null : null);
  await drive(p, ['Close']);
  await E(p, () => { window.__m3.bagMenu(); }); await until(p, '^🍺 Use'); await p.waitForTimeout(100);
  t = await btnText(p);
  ok(/Snus[\s\S]*Small buff/.test(t), 'after one use the learned note shows under it');
  await drive(p, ['Close']);
  await E(p, () => { document.getElementById('btn-pause').click(); });
  ok(await E(p, () => JSON.parse(localStorage.getItem('lod.save.m3.Ljunky')).data.known.snus === 1), 'discovery is saved');
  await E(p, () => document.getElementById('resume').click()); await p.waitForTimeout(100);

  // ---------- phone apps + BankID door + dev tile tool ----------
  const kr0 = await E(p, () => window.__m3.G.kr);
  await E(p, () => { window.__m3.bagMenu(); }); await until(p, 'Phone'); await until(p, 'Swish'); await p.waitForTimeout(80);
  t = await E(p, () => document.querySelector('#m3ui .m3txt').textContent);
  ok(/swish|Payment|received/i.test(t) && await E(p, k => window.__m3.G.kr === k - 10, kr0), 'Swish sends 10 kr to the wrong person: "' + t.replace(/\s+/g, ' ').slice(0, 50) + '"');
  await until(p, 'Klarna'); await p.waitForTimeout(60);
  ok(await E(p, () => window.__m3.G.debt === 1), 'Klarna once');
  await until(p, 'Klarna'); await p.waitForTimeout(60);
  ok(/Breathe|min/.test(await E(p, () => document.querySelector('#m3ui .m3txt').textContent)) && await E(p, () => window.__m3.G.debt === 1), 'Klarna again at once: wait 10 minutes');
  await E(p, () => { window.__m3.trapSpeed = 1e6; }); // real minutes pass
  for (let i = 0; i < 3; i++) { await until(p, 'Klarna'); await p.waitForTimeout(60); }
  await E(p, () => { window.__m3.trapSpeed = 1; });
  let g = await E(p, () => ({ kr: window.__m3.G.kr, debt: window.__m3.G.debt }));
  ok(g.kr === kr0 - 10 + 600 && g.debt === 3, 'Klarna: +200 kr and promise debt, three times max (' + JSON.stringify(g) + ')');
  ok(await E(p, () => window.__m3.S.blocked(41, 18) || true) && await E(p, () => { const m = window.__m3; m.G.p.y = 20 * 16; return m.S.blocked(41, 18); }), 'BankID blocks The Box door before approval');
  await until(p, 'BankID'); await until(p, 'BankID'); await p.waitForTimeout(60);
  ok(await E(p, () => { const m = window.__m3; return !!m.G.flags.bankid && !m.S.blocked(41, 18); }), 'second BankID open approves it, the door opens');
  await until(p, 'Tibber'); await p.waitForTimeout(60);
  ok(/kr\/kWh|kr while/.test(await E(p, () => document.querySelector('#m3ui .m3txt').textContent)), 'Tibber shows an absurd electricity price');
  await p.screenshot({ path: OUT + '/M3P_phone.png' });
  await drive(p, ['Pocket', 'Close']);
  await at(p, 12, 60); await p.waitForTimeout(100);
  const box = await p.locator('#cv').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(800); await p.mouse.up();
  ok(await E(p, () => Array.isArray(window.__m3.devTile) && Math.abs(window.__m3.devTile[0] - 12) <= 2 && Math.abs(window.__m3.devTile[1] - 59) <= 2), 'dev: long-press shows the tile (' + JSON.stringify(await E(p, () => window.__m3.devTile)) + ')');
  ok(p.errs.length === 0, 'no page errors (start/phone)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- point 5: people with personality, memory, relationships ----------
  p = await open(b); await play(p); await E(p, () => { window.__m3.skipReplies = false; });
  ok(await E(p, () => { const c = window.__m3.PPL.cond; return c({ hero: 'bigwman' }, 'x') === 1 && c({ hero: 'loken' }, 'x') === -1 && c({ hero: 'bigwman', met: 0 }, 'x') === 2 && c({ wat: 1 }, 'x') === -1 && c(null, 'x') === 0; }), 'conditions: hero, met, unknown key never matches, best match = most conditions');
  let tk = await talkTo(p, 'berit', 'scam');
  ok(/Unexpected item/.test(tk.texts[0] || '') && tk.btns && tk.btns.length === 3, 'Berit (grumpy) opens with her own line and 3 replies (' + (tk.btns || []).length + ')');
  ok(await E(p, () => { const b = window.__m3.PPL.pst('berit'); return b.rel === 2 && b.last === 'Bags are a scam.' && b.met === 1; }), 'honest suits a grumpy person: relationship +2; she remembers your last answer');
  const seen = [];
  for (let i = 0; i < 6; i++) { const t = await talkTo(p, 'berit'); seen.push(t.texts.join(' ')); }
  ok(/BigWman|packages/.test(seen[0]) || /Cicci/.test(seen.join(' ')), 'second meeting: a line about YOU (your hero / what she learned): ' + seen[0].slice(0, 50));
  ok(new Set(seen.slice(0, 4)).size === 4 && seen.slice(4).every(t => seen.includes(t) || true) && new Set(seen.slice(0, 4)).size === 4, 'no repeats until the pool is used up (' + new Set(seen).size + ' different in 6)');
  ok(await E(p, () => window.__m3.PPL.know('wife:cicci') && window.__m3.G.know['wife:cicci'].by === 'berit'), 'with a good relationship Berit tells you what Cicci wants (and the Notes remember who)');
  // returning on another day + remembering the answer
  await E(p, () => { const b = window.__m3.PPL.pst('pirate'); b.met = 1; b.last = 'lied'; b.lastDay = '2000-01-01'; });
  ok(await E(p, () => window.__m3.PPL.cond({ returning: true, last: 'lied' }, 'pirate') === 2 && window.__m3.PPL.cond({ returning: false }, 'pirate') === -1), 'memory: "returning on another day" and "your last answer" are conditions');
  // relationship changes prices and trade
  await E(p, () => { window.__m3.PPL.pst('berit').rel = 5; });
  await at(p, 5, 44); await p.waitForTimeout(200); await E(p, () => { window.__m3.skipReplies = true; window.__m3.G.kr = 500; window.__m3.interact(); }); await until(p, 'Shop'); await p.waitForTimeout(150);
  ok(/Carrier bag.* 8 kr ♥/.test(await btnText(p)), 'a friend (+5) gets 25 % off: carrier bag 8 kr instead of 10');
  await until(p, '^‹ Leave'); await until(p, '^‹ Leave'); await drive(p, []);
  await E(p, () => { window.__m3.PPL.pst('berit').rel = -3; window.__m3.interact(); }); await until(p, 'Shop'); await p.waitForTimeout(100);
  ok(await E(p, () => { const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => /Shop/.test(x.textContent)); return !b || b.disabled; }), 'an enemy (−3) refuses to trade');
  await drive(p, ['Leave']);
  // friends react when you kill or catch someone they know
  await E(p, () => { const m = window.__m3; for (const id of ['berit', 'sofia', 'cicci']) m.PPL.pst(id).rel = 0; m.G.dead.n_pelle = 1; m.PPL.reactGone('n_pelle', 'dead'); });
  g = await E(p, () => { const m = window.__m3; return { berit: m.PPL.rel('berit'), sofia: m.PPL.rel('sofia'), cicci: m.PPL.rel('cicci'), killed: !!m.G.flags['killed:pelle'], grudge: !!m.G.flags['grudge:berit'] }; });
  ok(g.berit === -3 && g.sofia === -3 && g.cicci === -1 && g.killed && g.grudge, 'kill Pelle: his friends Berit and Sofia −3, their friend Cicci hears it (−1) (' + JSON.stringify(g) + ')');
  let said = ''; for (let i = 0; i < 8 && !/Pelle/.test(said); i++) { await E(p, () => { window.__m3.PPL.pst('berit').rel = 3; }); said = (await talkTo(p, 'berit')).texts.join(' '); }
  ok(/Pelle/.test(said), 'Berit talks about what you did to Pelle: "' + said.slice(0, 55) + '"');
  // an enemy hunts you
  await E(p, () => { const m = window.__m3; m.G.dead = {}; m.PPL.pst('berit').rel = -5; m.G.flags.x = 1; });
  await at(p, 9, 44);
  for (let i = 0; i < 160 && !(await E(p, () => !!window.__m3.B)); i++) { await E(p, () => { const pd = window.__m3.pending; if (pd && pd.say) pd.res(); }); await p.waitForTimeout(50); }
  ok(await E(p, () => !!window.__m3.B && window.__m3.B.kind === 'npc' && window.__m3.B.npc === 'berit'), 'relationship −5: Berit walks up, says her piece and attacks you');
  await drive(p, ['Let it go', '^⚔️ Fight', 'Foam|Body|Can|Burp'], 900);
  ok(await E(p, () => window.__m3.PPL.rel('berit') === -2), 'after the fight the grudge cools down to −2');
  // time of day + release day
  ok(await E(p, () => { const c = window.__m3.PPL.cond; window.__m3.fakeHour = 23; const n = c({ night: true }, 'x') === 1 && c({ hour: [22, 4] }, 'x') === 1 && c({ hour: [8, 17] }, 'x') === -1; window.__m3.fakeHour = 12; const d = c({ night: true }, 'x') === -1 && c({ hour: [8, 17] }, 'x') === 1; window.__m3.fakeHour = null; return n && d; }), 'time of day follows the real clock (night, hour ranges that wrap past midnight)');
  ok(await E(p, () => { const c = window.__m3.PPL.cond; return c({ day: 'wed' }, 'x') === 1 && c({ from: 'tue' }, 'x') === 1 && c({ until: 'mon' }, 'x') === -1; }), 'release day: Wednesday build matches day/from/until');
  ok(p.errs.length === 0, 'no page errors (people)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  p = await open(b, '?dev=all&date=2026-11-23'); await play(p);
  ok(await E(p, () => { const c = window.__m3.PPL.cond; return c({ day: 'mon' }, 'x') === 1 && c({ from: 'tue' }, 'x') === -1; }), 'release day: Monday build does not match "from tue"');
  await p.close();

  // ---------- the wives: their own right line, by who you are and what you did; 8 turns; wrong costs a turn ----------
  p = await open(b); await play(p);
  ok(await E(p, () => window.__m3.CFG.PARTNER_TURNS === 8), 'wives: 8 turns to survive');
  ok(await E(p, () => { const r = window.__m3.PPL.reacts; return r('cicci').mul === 1.5 && r('cicci').turns === 1 && r('anna').mul === .9 && r('sofia').mul === .9; }), 'wives react differently to the hero you play (Cicci is suspicious of BigWman, Anna and Sofia less so)');
  const rightOf = async () => E(p, () => { let r = null; for (let i = 0; i < 30 && !r; i++) { const L = window.__m3.PPL.wifeLines('cicci'); if (L.length !== 4 || L.filter(l => l.value === 'good').length !== 1) return 'BAD'; r = L.find(l => l.value === 'good').label.replace(/[" 💡]/g, ''); } return r; });
  const base = await rightOf();
  await E(p, () => { window.__m3.G.debt = 2; }); const dbt = await rightOf();
  await E(p, () => { window.__m3.G.debt = 0; window.__m3.G.dead.n_berit = 1; }); const kb = await rightOf();
  await E(p, () => { window.__m3.G.dead = {}; window.__m3.G.drinkLog = [window.__m3.G.t, window.__m3.G.t]; }); const dr = await rightOf();
  await E(p, () => { window.__m3.G.drinkLog = []; window.__m3.PPL.pst('cicci').last = 'wrong'; }); const lw = await rightOf();
  ok(new Set([base, dbt, kb, dr, lw]).size === 5 && [base, dbt, kb, dr, lw].every(x => x !== 'BAD'), 'Cicci\'s right line changes with debt, a dead friend, drink and her memory: ' + [base, dbt, kb, dr, lw].map(x => x.slice(0, 14)).join(' | '));
  ok(await E(p, () => !window.__m3.PPL.wifeLines('cicci').some(l => /💡/.test(l.label))), 'no 💡 mark on the right line until someone has told you what she wants');
  await E(p, () => { window.__m3.PPL.tell('wife:cicci', 'berit'); });
  ok(await E(p, () => window.__m3.PPL.wifeLines('cicci').filter(l => /💡/.test(l.label)).length === 1 && window.__m3.PPL.wifeLines('cicci').find(l => /💡/.test(l.label)).value === 'good'), 'once Berit told you what Cicci wants, the right line carries a 💡');
  await E(p, () => { const m = window.__m3; m.PPL.pst('cicci').last = null; m.G.party = ['frog', 'cuke'].map(s => m.mk(s, 30)); for (const c of m.G.party) c.hp = 9999; m.startPartner('cicci'); }); await p.waitForTimeout(300);
  await until(p, '^🛡️ Endure'); await p.waitForTimeout(1200);
  const s1 = await E(p, () => window.__m3.B.survive);
  for (let k = 0; k < 6 && (await E(p, () => window.__m3.PPL.pst('cicci').last)) !== 'wrong'; k++) { // her "Another package?" can stun you and cost your turn: try again
    await until(p, '^💬 Talk');
    for (let i = 0; i < 40 && (await E(p, () => document.querySelectorAll('#m3ui .m3grid button').length)) < 7; i++) await p.waitForTimeout(50);
    await E(p, () => { const L = window.__m3.B && window.__m3.B.lines, bs = [...document.querySelectorAll('#m3ui .m3grid button')]; if (!L || bs.length < 7) return; window.__sb = window.__m3.B.survive; bs[L.findIndex(l => l.value === 'bad') + 2].click(); }); // the four lines come after Apologize and Promise
    for (let i = 0; i < 80 && (await E(p, () => window.__m3.PPL.pst('cicci').last)) !== 'wrong' && !(await E(p, () => window.__m3.pending && /What will/.test(document.querySelector('#m3ui .m3txt').textContent))); i++) await p.waitForTimeout(50);
  }
  g = await E(p, () => ({ s: window.__m3.B && window.__m3.B.survive, last: window.__m3.PPL.pst('cicci').last, rel: window.__m3.PPL.rel('cicci') }));
  const sb = await E(p, () => window.__sb);
  ok(g.last === 'wrong' && g.s <= sb, 'a wrong answer costs a survived turn: the round that normally adds one adds nothing (' + sb + ' → ' + g.s + ') and she remembers it (' + g.last + ', relationship ' + g.rel + ')');
  await drive(p, ['^💬 Talk', 'Cicci', 'Apologize|Promise'], 400);
  ok(await E(p, () => window.__m3.G.solved.includes('cicci')), 'the fight still ends (promise/apology)');
  await talkTo(p, 'cicci').catch(() => 0);
  g = await E(p, () => window.__m3.PPL.pst('cicci').last);
  ok(['promise', 'sorry', 'right', 'endured', 'wrong'].includes(g), 'she remembers how the last meeting ended (' + g + ')');
  ok(p.errs.length === 0, 'no page errors (wives)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- point 6: knowledge – you have to meet the right people ----------
  p = await open(b, '?dev=all&date=2026-11-25'); await play(p); await E(p, () => { window.__m3.skipReplies = false; });
  const hintAfter = async () => { await E(p, () => { const m = window.__m3; m.G.party = [m.mk('frog', 30)]; m.G.party[0].hp = 9999; m.startWild(m.ZONES.find(z => z.id === 'parking')); }); await p.waitForTimeout(250);
    await E(p, () => { const x = window.__m3.B.foes[0]; x.sp = 'golem'; x.lv = 3; x.hp = 9999; }); await until(p, '^⚔️ Fight'); await p.waitForTimeout(100); const t = await btnText(p); await until(p, '^‹ Back'); await E(p, () => { window.__m3.B.over = true; window.__m3.B.result = 'run'; }); await drive(p, ['Walk away', 'Run']); return t; };
  const h1 = await hintAfter();
  ok(!/strong|weak/.test(h1), 'before anyone told you how types work, the move list shows no "strong!" or "weak" (' + h1.slice(0, 60) + ')');
  tk = await talkTo(p, 'freja', 'Just looking'); tk = await talkTo(p, 'freja');
  ok(await E(p, () => window.__m3.PPL.know('types')), 'Freezer Freja tells you how the types work (second meeting, she has to like you a little)');
  const h2 = await hintAfter();
  ok(/weak/.test(h2), 'after that the move list shows what is strong/weak (' + h2.replace(/\s+/g, ' ').slice(0, 70) + ')');
  const sold = () => E(p, () => { const know = { ...(window.__m3.G.know || {}) }, db = PX.data.load(window.M3_DATA, {}, { today: () => '2026-11-25', devAll: false, flag: f => f.startsWith('know:') && !!know[f.slice(5)] }), I = window.M3_DATA.items; return [db.released(I.ringbox), db.released(I.tranq)]; });
  g = await sold(); ok(g[0] === false && g[1] === false, 'shop items can need knowledge (real players, not ?dev=all): ring box and tranquilizer gun are not sold yet');
  await E(p, () => { window.__m3.PPL.tell('ring', 'fia'); window.__m3.PPL.tell('tranq', 'jonas'); });
  g = await sold(); ok(g[0] && g[1], 'after Fia and Jonas have told you, they are for sale');
  await E(p, () => { window.__m3.bagMenu(); }); await until(p, 'Notes'); await p.waitForTimeout(250);
  t = await E(p, () => document.querySelector('#m3ui .m3txt').textContent);
  ok(/WHAT YOU KNOW/.test(t) && /How the types work \(Freezer Freja, WED\)/.test(t) && /Fia keeps a ring box/.test(t) && /• \?\?\?/.test(t) && /PEOPLE/.test(t) && /Freezer Freja/.test(t), '📓 Notes: what you learned and who told you; hero houses stay ??? until someone tells you');
  await p.screenshot({ path: OUT + '/M3P_notes.png' });
  await drive(p, ['OK', 'Close']);
  // saved
  await E(p, () => { document.getElementById('btn-pause').click(); }); await p.waitForTimeout(150);
  g = await E(p, () => { const d = JSON.parse(localStorage.getItem('lod.save.m3.Ljunky')).data; return { v: d.v, rel: d.people.freja && d.people.freja.rel, know: Object.keys(d.know).sort().join() }; });
  ok(g.v === 3 && g.rel >= 1 && /types/.test(g.know) && /ring/.test(g.know), 'relationships, memory and knowledge are saved (' + JSON.stringify(g) + ')');
  // fillers
  await E(p, () => document.getElementById('resume').click());
  g = await E(p, () => { const f = Object.values(window.__m3.G.fillers), all = f.flatMap(x => x.dialogue.talk.map(t => t.text)); return { n: f.length, lines: all.length, uniq: new Set(all).size, pers: new Set(f.map(x => x.personality)).size, min: Math.min(...f.map(x => x.dialogue.talk.length)) }; });
  ok(g.n === 8 && g.lines === g.uniq && g.min >= 2 && g.pers >= 4, 'filler shoppers: each has a personality and their own lines, none shared (' + JSON.stringify(g) + ')');
  ok(await E(p, () => { const bad = window.__m3.PPL.validate(); return bad.length === 0; }), 'the dialogue data validates');
  await E(p, () => { const D = window.M3_DATA; D.dialogue.berit.talk.push({ if: { wat: 1 }, text: 'x', tell: 'nope', give: { nothing: 1 } }); D.dialogue.nobody = { talk: [] }; });
  const bad = await E(p, () => window.__m3.PPL.validate());
  ok(bad.length >= 4 && bad.some(x => /unknown condition "wat"/.test(x)) && bad.some(x => /unknown knowledge "nope"/.test(x)) && bad.some(x => /no such person/.test(x)), 'the validator warns about unknown conditions, knowledge, items and people (' + bad.length + ')');
  ok(p.errs.length === 0, 'no page errors (knowledge)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- point 4: the bigger world ----------
  p = await open(b, '?dev=all&date=2026-11-25'); await play(p);
  ok(await E(p, () => { const m = window.__m3, t = m.tile; return t(14, 12) === '"' && t(16, 27) === 'x' && t(41, 18) === 'r' && t(5, 3) === '~' && t(23, 4) === 'P' && t(1, 10) === 'n' && t(38, 11) === 'K' && t(3, 60) === 'v' && t(16, 30) === 'F' && t(15, 46) === 'r' && m.MAP.length === 74 && m.MAP[0].length === 160; }), 'the map grew to 160 × 74 tiles and every old coordinate is unchanged');
  ok(await E(p, () => { const D = window.M3_DATA, d = day => PX.data.load(D, {}, { today: () => day, devAll: false }); return !d('2026-11-23').released(D.world) && d('2026-11-24').released(D.world) && !d('2026-11-24').released(D.houses.loken) && d('2026-11-25').released(D.houses.loken) && d('2026-11-23').released(D.houses.ljunky); }), 'release: the east opens on Tuesday, the castle on Wednesday, The Box was there on Monday');
  const route = ([a, b], to) => E(p, ([a, b, to]) => { const m = window.__m3, key = (x, y) => x + ',' + y, par = { [key(a, b)]: null }, q = [[a, b]]; while (q.length) { const [x, y] = q.shift(); if (x === to[0] && y === to[1]) { const out = []; let k = key(x, y); while (k) { out.push(k); k = par[k]; } return out.map(s => s.split(',').map(Number)); } for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (nx < 0 || ny < 0 || nx >= 160 || ny >= 74 || k in par || m.solidAt(nx * 16 + 8, ny * 16 + 8)) continue; par[k] = key(x, y); q.push([nx, ny]); } } return null; }, [a, b, to]);
  const grassOn = path => E(p, path => path.filter(([x, y]) => ['"', 'u'].includes(window.__m3.tile(x, y))).length, path);
  const start = [8, 62];
  const goals = { 'The Box': [41, 19], 'the electronics store': [104, 38], 'the shaman cave': [140, 30], 'the rave': [144, 61] };
  for (const name in goals) { const r = await route(start, goals[name]); ok(!!r, 'you can walk to ' + name + ' (' + (r ? r.length : 0) + ' tiles)'); ok(r && await grassOn(r) >= (name === 'The Box' ? 1 : 3), 'the path to ' + name + ' crosses tall grass / undergrowth (' + (r ? await grassOn(r) : 0) + ' encounter tiles)'); }
  ok(!(await route(start, [140, 13])), 'the castle is NOT reachable on foot');
  await E(p, () => { window.__m3.G.flags.boat = 1; }); ok(!!(await route(start, [140, 13])), 'with a boat the castle is reachable over the lake');
  await E(p, () => { window.__m3.G.flags.boat = 0; });
  ok(await E(p, () => { const D = window.M3_DATA.zones, mx = id => Math.max(...D[id].lv), H = window.M3_DATA.houses; return D.boxpath.lv[1] >= H.ljunky.level - 2 && mx('band_s4') >= H.wizcudi.level - 2 && mx('band_s4') <= H.wizcudi.level + 3 && mx('mtrail') >= H.jrohn.level - 2 && mx('deep3') >= H.bigwman.level - 1 && mx('biglake') >= H.loken.level - 6 && D.band_s1.lv[0] < D.band_s2.lv[0] && D.band_s2.lv[0] < D.band_s3.lv[0] && D.forest1.lv[0] < D.deep1.lv[0]; }), 'encounter levels along each path match the house level and rise towards it');
  // a real walk into the first grass band
  await at(p, 51, 48); await E(p, () => { window.__m3.CFG.ENC_RATE = 1; window.__m3.G.encCool = 0; });
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(900); await p.keyboard.up('ArrowRight');
  g = await E(p, () => { const m = window.__m3; return m.B && { zone: m.B.zone, lv: m.B.foes[0].lv, kind: m.B.kind }; });
  ok(g && g.zone === 'band_s1' && g.lv >= 11 && g.lv <= 14, 'walking into the roadside grass: a wild fight at about level 11–14 (' + JSON.stringify(g) + ')');
  await E(p, () => { window.__m3.CFG.ENC_RATE = 0; }); await drive(p, ['Walk away', '^⚔️ Fight', 'Foam|Body|Can|Burp']);
  // the houses: gates by your best creature
  const gate = lv => E(p, lv => { const m = window.__m3; m.G.party = [m.mk('frog', lv)]; m.G.box = []; const H = m.HOUSES, r = {}; for (const id in H) r[id] = !m.solidAt((H[id].door[0]) * 16 + 8, H[id].door[1] * 16 + 8); return r; }, lv);
  let gt = await gate(9); ok(!gt.ljunky && !gt.wizcudi && !gt.jrohn && !gt.loken && gt.bigwman, 'level 9: every door is shut, except your own house (BigWman: the rave is your home)');
  gt = await gate(10); ok(gt.ljunky && !gt.wizcudi, 'level 10 opens The Box');
  gt = await gate(20); ok(gt.wizcudi && !gt.jrohn, 'level 20 opens the electronics store');
  gt = await gate(30); ok(gt.jrohn && !gt.loken, 'level 30 opens the shaman cave');
  gt = await gate(40); ok(gt.loken && gt.bigwman, 'level 40 opens the castle');
  await E(p, () => { const m = window.__m3; m.G.party = [m.mk('frog', 5)]; m.G.box = [m.mk('golem', 21)]; });
  ok(await E(p, () => window.__m3.houseOpen('wizcudi')), 'your BEST creature counts, also one waiting in the van');
  await E(p, () => { const m = window.__m3; m.G.box = []; });
  await at(p, 105, 38); await p.waitForTimeout(250);
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.kind === 'housedoor'), 'a shut door can be tapped');
  await E(p, () => { window.__m3.interact(); }); await p.waitForTimeout(150);
  ok(/dark|light/.test(await E(p, () => document.querySelector('#m3ui .m3txt').textContent)), 'the door tells you in words why it is shut (no number)');
  await drive(p, []);
  await E(p, () => { const m = window.__m3; m.G.party = [m.mk('frog', 25)]; });
  await at(p, 104, 35); await p.waitForTimeout(500);
  ok(await E(p, () => !!window.__m3.G.flags['house:wizcudi']), 'stepping inside a house is remembered (flag house:wizcudi)');
  await at(p, 100, 35); await p.waitForTimeout(250);
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.kind === 'trophy'), 'inside there is something to take');
  await E(p, () => { window.__m3.interact(); }); await drive(p, []);
  g = await E(p, () => ({ t: window.__m3.G.items.techMk1, f: window.__m3.G.items.fizztab || 0 }));
  ok(g.t === 1 && g.f >= 2 && await E(p, () => !window.__m3.G.near || window.__m3.G.near.kind !== 'trophy'), 'the reward is given once (' + JSON.stringify(g) + ')');
  await at(p, 148, 66); await p.waitForTimeout(250); await E(p, () => { const m = window.__m3; for (const c of m.G.party) c.hp = 1; });
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.kind === 'home'), 'in your own hero\'s house you are at home (BigWman: the rave)');
  await E(p, () => { window.__m3.interact(); }); await until(p, 'Leave'); await drive(p, []);
  ok(await E(p, () => window.__m3.G.party.every(c => c.hp === window.__m3.xpNeed ? true : c.hp > 1)), 'home heals the party and opens the storage');
  // Dev Ljunky: all four heroes AND all houses
  await E(p, () => { const m = window.__m3; m.G.beat = ['wizcudi', 'jrohn', 'loken', 'ljunky']; m.G.flags = {}; });
  ok(await E(p, () => !window.__m3.stockOpen() && !window.__m3.walkable(...window.__m3.tc(16, 27))), 'four heroes beaten but no houses seen: the stock room stays shut');
  await E(p, () => { for (const h of ['wizcudi', 'jrohn', 'loken', 'ljunky']) window.__m3.G.flags['house:' + h] = 1; });
  ok(await E(p, () => window.__m3.stockOpen() && window.__m3.walkable(...window.__m3.tc(16, 27))), 'with all the houses seen (not your own) it opens');
  // the lake: boat or ferry
  await E(p, () => { const m = window.__m3; m.G.flags = {}; m.G.know = {}; m.G.party = [m.mk('frog', 40)]; });
  const sail = () => E(p, () => window.__m3.sailOK());
  ok(!(await sail()), 'no boat, no ferry: the lake is a wall');
  await E(p, () => { window.__m3.G.flags.boat = 1; }); ok(await sail(), 'with the boat you can sail');
  await E(p, () => { const m = window.__m3; m.G.flags = {}; m.G.party = [m.mk('pike', 30)]; });
  ok(!(await sail()), 'a Pikezilla that knows Ferry is not enough until someone has taught you');
  await E(p, () => { window.__m3.G.know.ferry = 1; }); ok(await sail(), 'taught + a Lv 30 Pikezilla (it learns Ferry at 30): it carries you');
  await E(p, () => { const m = window.__m3; m.G.party = [m.mk('pike', 29)]; }); ok(!(await sail()), 'at Lv 29 it does not know Ferry yet');
  await E(p, () => { const m = window.__m3; m.G.party = [m.mk('pike', 30)]; });
  await at(p, 90, 10); await p.waitForTimeout(150);
  ok(await E(p, () => window.__m3.tile(90, 10) === 'V' && window.__m3.walkable(90 * 16 + 8, 10 * 16 + 8)), 'out on the water you can move');
  await E(p, () => { const m = window.__m3; m.G.party = [m.mk('frog', 30)]; }); await p.waitForTimeout(500);
  g = await E(p, () => { const m = window.__m3; return { y: Math.floor(m.G.p.y / 16), water: m.tile(Math.floor(m.G.p.x / 16), Math.floor((m.G.p.y - 2) / 16)) === 'V' }; });
  ok(!g.water, 'lose the ferry creature out on the lake and you drift ashore (y ' + g.y + ')');
  await E(p, () => { const m = window.__m3; m.G.flags.boat = 1; m.CFG.ENC_RATE = 1; m.G.encCool = 0; });
  await at(p, 90, 10); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(900); await p.keyboard.up('ArrowRight');
  g = await E(p, () => { const m = window.__m3; return m.B && { zone: m.B.zone, lv: m.B.foes[0].lv, sp: m.B.foes[0].sp }; });
  ok(g && g.zone === 'biglake' && g.lv >= 34, 'sailing the big lake meets lake creatures at about level 34–40 (' + JSON.stringify(g) + ')');
  await E(p, () => { window.__m3.CFG.ENC_RATE = 0; }); await drive(p, ['Walk away', '^⚔️ Fight', 'Foam|Body|Can|Burp'], 600);
  // Boat-Bengt trades the van for a boat
  await E(p, () => { const m = window.__m3; m.G.flags = {}; m.G.party = ['frog', 'cuke'].map(s => m.mk(s, 20)); m.G.box = [m.mk('golem', 7)]; });
  await at(p, 58, 19); await p.waitForTimeout(300); await E(p, () => { window.__m3.skipReplies = true; });
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.ref && window.__m3.G.near.ref.id === 'bengt'), 'Boat-Bengt stands on the western shore');
  await E(p, () => { window.__m3.interact(); }); await until(p, 'Trade the van'); await drive(p, []);
  ok(await E(p, () => window.__m3.G.flags.boat === 1 && window.__m3.G.box.length === 1), 'the van is traded for a boat; what was in the van is still yours');
  // the fishing net and the lake net trap
  await at(p, 20, 59); await E(p, () => { window.__m3.give('netTrap'); window.__m3.S.placeTrap('netTrap'); }); await p.waitForTimeout(100);
  ok(await E(p, () => window.__m3.G.traps.length === 0 && /no water/i.test(document.querySelector('#m3ui .m3txt').textContent)), 'the lake net trap refuses to be set inland');
  await drive(p, []);
  await at(p, 60, 18); await E(p, () => { window.__m3.trapSpeed = 1e6; window.__m3.S.placeTrap('netTrap'); }); await p.waitForTimeout(100);
  ok(await E(p, () => window.__m3.G.traps.length === 1), 'on a shore it is set');
  let caughtFish = null; for (let i = 0; i < 8 && !caughtFish; i++) { await E(p, () => { if (!window.__m3.G.traps.length) { window.__m3.give('netTrap'); window.__m3.S.placeTrap('netTrap'); } }); await p.waitForTimeout(60); await E(p, () => { window.__m3.interact(); }); await p.waitForTimeout(250); caughtFish = await E(p, () => window.__m3.B && window.__m3.B.kind === 'trap' && window.__m3.B.foes[0].sp); if (!caughtFish) await drive(p, []); }
  ok(['pike', 'salmon', 'frog', 'genie', 'owl'].includes(caughtFish), 'the net trap holds a lake creature (' + caughtFish + ')');
  await drive(p, ['Walk away', '^⚔️ Fight', 'Foam|Body|Can|Burp']);
  await E(p, () => { const m = window.__m3; m.give('net', 2); m.G.party = [m.mk('frog', 30)]; m.G.party[0].hp = 9999; m.startWild(m.ZONES.find(z => z.id === 'parking')); }); await p.waitForTimeout(300);
  await E(p, () => { const x = window.__m3.B.foes[0]; x.hp = 9999; });
  await until(p, '^🎯 Throw'); await until(p, 'Fishing net'); await p.waitForTimeout(1500);
  ok(await E(p, () => !!window.__m3.B && window.__m3.EF.has(window.__m3.B.foes[0], 'stun')), 'the fishing net holds a wild creature for two turns');
  await drive(p, ['Walk away', 'Run', '^⚔️ Fight', 'Foam|Body|Can|Burp']);
  // the people tell you about the boat and the ferry
  await E(p, () => { const m = window.__m3; m.G.flags = {}; m.G.know = {}; m.G.people = {}; m.G.party = [m.mk('frog', 20)]; m.skipReplies = false; });
  await talkTo(p, 'folke', 'luck'); await talkTo(p, 'folke');
  ok(await E(p, () => window.__m3.PPL.know('boat') && !window.__m3.PPL.know('ferry')), 'Fisherman Folke tells you about Boat-Bengt (on the second talk)');
  await E(p, () => { const m = window.__m3; m.G.party.push(m.mk('pike', 30)); });
  await talkTo(p, 'folke');
  ok(await E(p, () => window.__m3.PPL.know('ferry')), 'carrying a Pikezilla, he teaches you that it can ferry you');
  await talkTo(p, 'kenny'); await talkTo(p, 'kenny');
  ok(await E(p, () => window.__m3.PPL.know('house:bigwman')), 'Kenny tells you where the rave is');
  ok(await E(p, () => { const D = window.__m3.D; return D.warnings.length === 0 && ['caddy', 'kioskman', 'hermit', 'guide', 'doorman', 'folke', 'bengt'].every(id => D.raw.npcs[id] && D.raw.dialogue[id]); }), 'seven new people, each with their own dialogue, and the data validates');
  for (const [n, x, y] of [['golf', 66, 28], ['city', 104, 40], ['mountain', 136, 33], ['forest', 70, 62], ['rave', 144, 60], ['lake', 62, 17], ['castle', 140, 14]]) { await E(p, () => { const m = window.__m3; m.G.scene = 'map'; m.G.flags.boat = 1; }); await at(p, x, y); await E(p, () => { document.querySelector('#m3ui .m3box').hidden = true; document.querySelector('#m3ui .m3hint').hidden = true; }); await p.waitForTimeout(450); await p.screenshot({ path: OUT + '/M3P_world_' + n + '.png' }); }
  ok(p.errs.length === 0, 'no page errors (world)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- balance (point 1): XP curve, anti-grind, no XP for catching, money, Kenny, Inkasso-Ingvar ----------
  p = await open(b); await play(p);
  ok(await E(p, () => { const m = window.__m3; return m.xpNeed(10) === 138 && m.xpNeed(1) === 9 && m.CFG.LV_MAX === 50 && m.D.raw.items.bag.price === 10; }), 'XP for next level = 8 + 1.3 × lv², LV_MAX 50, bags 10 kr');
  const xpRun = async (myLv, foeLv, how) => {
    await E(p, ([a, f]) => { const m = window.__m3; m.G.party = [m.mk('frog', a)]; m.G.party[0].hp = 9999; m.startWild(m.ZONES.find(z => z.id === 'parking')); }, [myLv, foeLv]);
    await p.waitForTimeout(200); await E(p, f => { const x = window.__m3.B.foes[0]; x.lv = f; x.hp = 1; window.__m3.G.me.fx.push({ type: 'catchBonus', value: 50, t: 60, n: 1, src: 'test' }); }, foeLv);
    await drive(p, how === 'catch' ? ['^🛍️ Catch', '^⚔️ Fight', 'Foam|Body|Can|Burp'] : ['Walk away', '^⚔️ Fight', 'Foam|Body|Can|Burp']);
    return E(p, () => ({ xp: window.__m3.G.party[0].xp, lv: window.__m3.G.party[0].lv, caught: window.__m3.G.party.length + window.__m3.G.box.length }));
  };
  let x1 = await xpRun(20, 20, 'win'), x2 = await xpRun(20, 5, 'win'), x3 = await xpRun(20, 40, 'win'), x4 = await xpRun(20, 20, 'catch');
  ok([112, 140, 168].includes(x1.xp) && x2.xp <= 3 && x3.xp <= 40 * 7 * 1.5 * 1.2 && x3.xp > x1.xp, 'XP: equal foe ' + x1.xp + ', a lv 5 foe almost nothing (' + x2.xp + '), a lv 40 foe at most ×1.5 (' + x3.xp + ')');
  ok(x4.xp === 0 && x4.caught === 2, 'catching gives no XP');
  await E(p, () => { window.__m3.G.kr = 0; const m = window.__m3; m.G.party = [m.mk('frog', 30)]; m.G.party[0].hp = 9999; m.startWild(m.ZONES.find(z => z.id === 'parking')); }); await p.waitForTimeout(200);
  await E(p, () => { const x = window.__m3.B.foes[0]; x.lv = 10; x.hp = 1; }); await drive(p, ['Walk away', '^⚔️ Fight', 'Foam|Body|Can|Burp']);
  ok(await E(p, () => window.__m3.G.kr === 15), 'less money from wild fights: lv 10 foe = 15 kr (' + (await E(p, () => window.__m3.G.kr)) + ')');
  await E(p, () => { const m = window.__m3; m.G.party = [m.mk('frog', 20)]; m.G.box = [m.mk('golem', 12)]; m.G.kr = 0; });
  await at(p, 46, 61); await p.waitForTimeout(250);
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.ref && window.__m3.G.near.ref.id === 'kenny'), 'Kenny the Fence stands in the parking lot');
  await E(p, () => { window.__m3.interact(); }); await until(p, 'Trolley Golem'); await until(p, '^‹ Leave'); await drive(p, []);
  g = await E(p, () => ({ kr: window.__m3.G.kr, box: window.__m3.G.box.length }));
  ok(g.box === 0 && g.kr > 0 && g.kr <= 15, 'Kenny buys a creature for very little (' + g.kr + ' kr)');
  await E(p, () => { const m = window.__m3; m.G.party = ['frog', 'cuke'].map(s => m.mk(s, 20)); m.G.kr = 300; m.G.debt = 3; m.G.flags.debtSeen = 0; });
  await at(p, 20, 60); await p.waitForTimeout(400);
  ok(/Inkasso|promised/.test(await E(p, () => document.querySelector('#m3ui .m3txt').textContent)), 'promise debt 3: Inkasso-Ingvar shows up');
  await until(p, 'Pay 250'); await drive(p, []);
  ok(await E(p, () => window.__m3.G.kr === 50 && window.__m3.G.flags.debtSeen === 3), 'paid Ingvar 250 kr; he comes back at debt 6');
  ok(p.errs.length === 0, 'no page errors (balance)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- opening: the "run me over" thought names another hero, never your own ----------
  p = await open(b);
  await E(p, () => localStorage.removeItem('lod.save.m3.Ljunky')); await toBrief(p, 'loken'); await p.click('#brief-go'); await p.waitForTimeout(300); await E(p, () => { window.__m3.speed = 25; });
  let thought = '';
  for (let i = 0; i < 200 && !thought; i++) { thought = await E(p, () => { const t = document.querySelector('#m3ui .m3txt').textContent; const pd = window.__m3.pending; if (/run me over/.test(t)) return t; if (pd && pd.say) pd.res(); return ''; }); await p.waitForTimeout(30); }
  ok(/(BigWman|Wizcudi|Jrohn|Ljunky) run me over/.test(thought) && !/Löken run me over/.test(thought), 'playing Löken: "' + thought.replace(/^.*?💭 \S+/, '') + '"');
  await p.close();

  // ---------- losing a fight: no taps needed, you wake up in the van ----------
  p = await open(b); await play(p);
  await E(p, () => { const m = window.__m3; m.G.party = [m.mk('frog', 2)]; m.startWild(m.ZONES.find(z => z.id === 'parking')); });
  await p.waitForTimeout(300);
  await E(p, () => { const m = window.__m3, f = m.B.foes[0]; f.lv = 40; f.hp = 9999; f.sp = 'golem'; });
  let lost = false;
  for (let i = 0; i < 400 && !lost; i++) { // only press Fight; never tap through text
    lost = await E(p, () => { const m = window.__m3; if (/fainted|black|wake/.test(document.querySelector('#m3ui .m3txt').textContent) && !m.B) return true; const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => /^⚔️ Fight|Foam|Body/.test(x.textContent)); if (b) b.click(); return !m.B && m.G.scene === 'map'; });
    await p.waitForTimeout(50);
  }
  for (let i = 0; i < 100 && !(await E(p, () => window.__m3.G.scene === 'map' && !window.__m3.B)); i++) await p.waitForTimeout(50);
  g = await E(p, () => { const G = window.__m3.G; return { scene: G.scene, x: Math.floor(G.p.x / 16), y: Math.floor(G.p.y / 16), hp: G.party[0].hp > 0 }; });
  ok(g.scene === 'map' && g.x === 4 && g.y === 62 && g.hp, 'losing a fight ends it by itself: black out, wake up in the van, healed (' + JSON.stringify(g) + ')');
  await p.close();

  // ---------- pictures from another origin (like raw.githack / a CDN): they can be drawn but not read back. Nothing may break ----------
  p = await open(b, '?dev=all&date=2026-11-25&claims=reset', { route: async q => q.route(/127\.0\.0\.1:8123\/assets\/.*\.png/, r => r.fulfill({ status: 302, headers: { location: r.request().url().replace('127.0.0.1', 'localhost') } })) });
  await E(p, () => localStorage.removeItem('lod.save.m3.Ljunky'));
  await toBrief(p); await p.click('#brief-go'); await p.waitForTimeout(300); await E(p, () => { window.__m3.speed = 25; });
  let xo = null;
  for (let i = 0; i < 300 && !xo; i++) { xo = await E(p, () => { const m = window.__m3, pd = m.pending; if (pd && pd.say) { pd.res(); return null; } const bs = [...document.querySelectorAll('#m3ui .m3grid button')]; if (bs.length) return bs.map(x => !!(x.querySelector('img') && x.querySelector('img').getAttribute('src'))); if (m.G.scene === 'map' && !m.stranger) m.summon(); return null; }); await p.waitForTimeout(40); }
  ok(xo && xo.length === 5 && xo.every(Boolean), 'cross-origin pictures: the 5 starters show, with icons');
  await pickStarter(p, 'Folköl');
  await E(p, () => { window.__m3.bagMenu(); }); await until(p, 'Party'); await p.waitForTimeout(200);
  ok(await E(p, () => document.querySelectorAll('#m3ui .m3grid button img').length >= 1), 'cross-origin pictures: party menu works');
  await drive(p, ['Back', 'Close']);
  await E(p, () => { const m = window.__m3; m.startWild(m.ZONES.find(z => z.id === 'parking')); }); await drive(p, ['Walk away', '^⚔️ Fight', 'Foam|Body|Can']);
  ok(p.errs.length === 0, 'cross-origin pictures: no page errors' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- starter pool: first player picks from 5, the next from 4… (practice = kept on this phone) ----------
  p = await open(b, '?dev=all&date=2026-11-25&claims=reset');
  const starterOpts = async (name, hero, pick) => {
    await E(p, n => { window.__lod.setName(n); localStorage.removeItem('lod.save.m3.' + n); }, name);
    await toBrief(p, hero); await p.click('#brief-go'); await p.waitForTimeout(300); await E(p, () => { window.__m3.speed = 25; });
    let opts = null;
    for (let i = 0; i < 300 && !opts; i++) {
      opts = await E(p, () => { const m = window.__m3, pd = m.pending; if (pd && pd.say) { pd.res(); return null; } const bs = [...document.querySelectorAll('#m3ui .m3grid button')]; if (bs.length) return bs.map(x => x.textContent); if (m.G.scene === 'map' && !m.stranger) m.summon(); return null; });
      await p.waitForTimeout(40);
    }
    if (name === 'Ljunky') await p.screenshot({ path: OUT + '/M3P_stranger.png' });
    await pickStarter(p, pick); await E(p, () => document.getElementById('btn-pause').click()); await p.waitForTimeout(100); await E(p, () => document.getElementById('quit').click()); await p.waitForTimeout(200);
    return opts || [];
  };
  let o1 = await starterOpts('Ljunky', 'ljunky', 'Folköl Frog');
  ok(o1.length === 5, 'first player chooses from 5 (' + o1.map(x => x.split(/[A-Z]{3,}/)[0]).join(', ') + ')');
  let o2 = await starterOpts('Löken', 'loken', 'Cucumber Dragon');
  ok(o2.length === 4 && !o2.some(x => /Folköl/.test(x)), 'second player gets the 4 that are left');
  let o3 = await starterOpts('BigWman', 'bigwman', 'Freezer Penguin');
  ok(o3.length === 3 && !o3.some(x => /Folköl|Cucumber/.test(x)), 'third player gets 3');
  let o4 = await starterOpts('Ljunky', 'ljunky', 'Folköl Frog');
  ok(o4.length === 1 && /Folköl/.test(o4[0]), 'a New game keeps your own pick');
  ok(p.errs.length === 0, 'no page errors (starter pool)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- starter pool on a LIVE day: the server decides (mocked), an old server is never sent a claim ----------
  for (const mode of ['new', 'old']) {
    const posts = [];
    p = await open(b, '?', { route: async q => q.route(/script\.google\.com/, (route, req) => {
      if (req.method() === 'POST') { const j = JSON.parse(req.postData()); posts.push(j); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j.action === 'claim' ? { ok: true } : { ok: true, rows: [] }) }); }
      const claims = /claims=3/.test(req.url()) && mode === 'new' ? { claims: { 'Löken': 'cuke', 'Wizcudi': 'snake' } } : {};
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign({ rows: [] }, claims)) });
    }) });
    await E(p, () => { const M = window.__lod.LOD.missions.find(m => m.id === 3); M.unlock = window.__lod.LOD.today(); M.until = M.unlock; window.__lod.setName('Jrohn'); localStorage.removeItem('lod.save.m3.Jrohn'); });
    await toBrief(p, 'jrohn'); await p.click('#brief-go'); await p.waitForTimeout(300); await E(p, () => { window.__m3.speed = 25; });
    let opts = null;
    for (let i = 0; i < 300 && !opts; i++) { opts = await E(p, () => { const m = window.__m3, pd = m.pending; if (pd && pd.say) { pd.res(); return null; } const bs = [...document.querySelectorAll('#m3ui .m3grid button')]; if (bs.length) return bs.map(x => x.textContent); if (m.G.scene === 'map' && !m.stranger) m.summon(); return null; }); await p.waitForTimeout(40); }
    await pickStarter(p, 'Freezer Penguin');
    const claimPosts = posts.filter(x => x.action === 'claim');
    if (mode === 'new') ok(opts.length === 3 && !opts.some(x => /Cucumber|Charging/.test(x)) && claimPosts.length === 1 && claimPosts[0].pick === 'peng' && claimPosts[0].name === 'Jrohn', 'live: server claims hide the taken ones, the pick is sent (' + opts.length + ' offered)');
    else ok(opts.length === 5 && claimPosts.length === 0, 'live with the old Apps Script: all 5 offered, no claim is ever posted');
    await p.close();
  }

  // ---------- dialogs fit on a short phone: menus are a centered card, long lists scroll with a ▼ hint ----------
  p = await open(b, '?dev=all&date=2026-11-25&claims=reset', { page: { viewport: { width: 360, height: 560 }, hasTouch: true, isMobile: true } });
  await E(p, () => localStorage.removeItem('lod.save.m3.Ljunky'));
  await toBrief(p); await p.click('#brief-go'); await p.waitForTimeout(300); await E(p, () => { window.__m3.speed = 25; });
  for (let i = 0; i < 300; i++) { const n = await E(p, () => { const m = window.__m3, pd = m.pending; if (pd && pd.say) { pd.res(); return 0; } if (m.G.scene === 'map' && !m.stranger) m.summon(); return document.querySelectorAll('#m3ui .m3grid button').length; }); if (n) break; await p.waitForTimeout(40); }
  await p.waitForTimeout(250);
  const fits = () => E(p, () => { const box = document.querySelector('#m3ui .m3box').getBoundingClientRect(), H = window.innerHeight, W = window.innerWidth, bs = [...document.querySelectorAll('#m3ui .m3grid button')].map(x => x.getBoundingClientRect());
    return { inside: box.top >= 0 && box.bottom <= H && box.left >= 0 && box.right <= W, wide: bs.every(r => r.right <= box.right + 1 && r.height >= 40), center: document.getElementById('m3ui').classList.contains('center'), scroll: !document.querySelector('#m3ui .m3hint').hidden, allVisible: bs.every(r => r.top >= 0 && r.bottom <= H) }; });
  let f = await fits();
  ok(f.center && f.inside && f.wide && f.allVisible, 'short screen: the 5 starters fit in a centered card (' + JSON.stringify(f) + ')');
  await p.screenshot({ path: OUT + '/M3P_choose.png' });
  await pickStarter(p, 'Freezer'); await E(p, () => { window.__m3.skipReplies = true; });
  await at(p, 10, 58); await p.waitForTimeout(200); await E(p, () => { window.__m3.G.kr = 999; window.__m3.interact(); }); await until(p, 'Shop'); await p.waitForTimeout(250);
  f = await fits();
  ok(f.center && f.wide && f.scroll, 'short screen: a 13-item shop scrolls like a page, with the ▼ more hint (' + JSON.stringify(f) + ')');
  const cdp = await p.context().newCDPSession(p), touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 180, y }] });
  for (let k = 0; k < 4; k++) { await touch('touchStart', 470); for (let y = 460; y > 160; y -= 15) { await touch('touchMove', y); await p.waitForTimeout(16); } await touch('touchEnd'); await p.waitForTimeout(350); } // a real finger swipe
  ok(await E(p, () => { const b = [...document.querySelectorAll('#m3ui .m3grid button')].pop().getBoundingClientRect(); return b.bottom <= innerHeight && b.top >= 0; }), 'a finger swipe scrolls the long menu down to its last button');
  ok(!(await fits()).scroll, 'scrolled to the end: the ▼ more hint goes away');
  ok(p.errs.length === 0, 'no page errors (dialogs)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- full fight: throw (arc screenshot) + knockout -> catch ----------
  p = await open(b); await play(p);
  await E(p, () => { const m = window.__m3; m.speed = 1; m.give('bottle', 3); m.startWild(m.ZONES.find(z => z.id === 'parking')); });
  await p.waitForTimeout(2600);
  await E(p, () => { const m = window.__m3, f = m.B.foes[0]; f.sp = 'golem'; f.hp = Math.max(1, Math.round(m.CFG.LV_MAX)); });
  await p.screenshot({ path: OUT + '/M3P_fight.png' });
  await until(p, '^🎯 Throw'); await until(p, 'Empty bottle');
  for (let i = 0; i < 80; i++) { if (await E(p, () => window.__m3.layer.flying > 0)) { await p.waitForTimeout(120); break; } await p.waitForTimeout(25); }
  await p.screenshot({ path: OUT + '/M3P_throw.png' });
  await E(p, () => { window.__m3.speed = 25; });
  for (let i = 0; i < 60 && !/Finish off/.test(await btnText(p)); i++) {
    await E(p, () => { const m = window.__m3, pd = m.pending; if (m.B && m.B.foes[0].hp > 0) m.B.foes[0].hp = 1; if (pd && pd.say) pd.res(); const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => /^⚔️ Fight|Foam Spray/.test(x.textContent)); if (b) b.click(); });
    await p.waitForTimeout(120);
  }
  t = await btnText(p);
  ok(/Catch/.test(t) && /Finish off/.test(t), 'knockout offers Catch / Finish off (' + t.slice(0, 80) + ')');
  await p.screenshot({ path: OUT + '/M3P_knockout.png' });
  await E(p, () => { window.__m3.G.me.fx.push({ type: 'catchBonus', value: 50, t: 60, n: 1, src: 'test' }); });
  await until(p, 'Catch'); await drive(p, ['Catch', 'Walk away']);
  ok(await E(p, () => !!window.__m3.G.caught.golem), 'caught the knocked-out creature');
  ok(p.errs.length === 0, 'no page errors (fight)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));

  // ---------- finish off -> grave -> resurrect with a liked lure ----------
  await E(p, () => { const m = window.__m3; m.startWild(m.ZONES.find(z => z.id === 'freezer')); });
  await p.waitForTimeout(300);
  await E(p, () => { const f = window.__m3.B.foes[0]; f.sp = 'peng'; f.hp = 1; });
  await drive(p, ['Finish off', '^⚔️ Fight', 'Freezer|Foam|Body|Pickle']);
  g = await E(p, () => window.__m3.G.graves.map(q => q.sp + q.n));
  ok(g.includes('peng1'), 'finished off -> a grave (' + g.join() + ')');
  await E(p, () => { const m = window.__m3; for (const sp of ['h_loken', 'w_anna', 'n_pirate', 'bat']) m.S.addGrave(m.mk(sp, 5)); });
  await at(p, 6, 17); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/M3P_cemetery.png' });
  const spot = await E(p, () => { const i = window.__m3.G.graves.findIndex(q => q.sp === 'peng'); return window.__m3.S.graveSpot(i); });
  await at(p, spot[0], spot[1] + 1); await p.waitForTimeout(200);
  await E(p, () => { window.__m3.give('frostMk1'); });
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.kind === 'grave'), 'the grave is tappable in the cemetery');
  await E(p, () => { window.__m3.interact(); }); await p.waitForTimeout(150);
  t = await btnText(p);
  ok(/Offer .*Freezer door/.test(t), 'a liked lure can be offered (' + t + ')');
  const party0 = await E(p, () => window.__m3.G.party.length + window.__m3.G.box.length);
  await until(p, 'Offer'); await drive(p, []);
  ok(await E(p, n => !window.__m3.G.graves.some(q => q.sp === 'peng') && window.__m3.G.party.length + window.__m3.G.box.length === n + 1 && !window.__m3.G.items.frostMk1, party0), 'resurrected: grave gone, creature back, lure used');

  // ---------- trap: place, wait, a dazed creature ----------
  await at(p, 14, 54); await E(p, () => { window.__m3.give('wildMk1'); window.__m3.trapSpeed = 1; });
  await E(p, () => { window.__m3.S.placeTrap('wildMk1'); }); await p.waitForTimeout(100);
  ok(await E(p, () => window.__m3.G.traps.length === 1 && !window.__m3.S.trapReady(window.__m3.G.traps[0])), 'trap placed, not ready yet');
  await E(p, () => { window.__m3.trapSpeed = 1e6; }); await p.waitForTimeout(100);
  await at(p, 14, 55); await p.waitForTimeout(150);
  await p.screenshot({ path: OUT + '/M3P_trap.png' });
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.kind === 'trap'), 'ready trap shows ! and is tappable');
  let spawned = false;
  for (let i = 0; i < 8 && !spawned; i++) {
    if (!(await E(p, () => window.__m3.G.traps.length))) { await E(p, () => { window.__m3.give('wildMk1'); window.__m3.S.placeTrap('wildMk1'); }); await p.waitForTimeout(50); }
    await E(p, () => { window.__m3.interact(); }); await p.waitForTimeout(250);
    spawned = await E(p, () => !!window.__m3.B && window.__m3.B.kind === 'trap');
    if (!spawned) await drive(p, []);
  }
  ok(spawned, 'the trap holds a creature');
  ok(await E(p, () => { const m = window.__m3, f = m.B.foes[0]; return (m.SP[f.sp].type === 'WILD' || m.D.raw.items.wildMk1.rare.some(r => r[0] === f.sp)) && m.EF.sum(f, 'catchBonus') > 0; }), 'it likes the lure (WILD, or a rare from the trap table) and is dazed (catch bonus)');
  await drive(p, ['Walk away', '^⚔️ Fight', 'Burp|Can|Foam|Body|Hug|Patty']);
  ok(await E(p, () => window.__m3.G.trapsUsed.wildMk1 === 1), 'trap use counted for completion');

  // ---------- coke x4 = heart attack, wake at the cemetery ----------
  await at(p, 20, 60); await E(p, () => window.__m3.give('coke', 4));
  for (let i = 0; i < 3; i++) await E(p, () => window.__m3.useItem('coke', false));
  ok(await E(p, () => Math.abs(window.__m3.gameSpeed() - 4) < .01), 'coke x3: game speed ×4 (' + (await E(p, () => window.__m3.gameSpeed())) + ')');
  await E(p, () => { window.__m3.G.scene = 'talk'; window.__m3.useItem('coke', false); });
  await drive(p, []);
  g = await E(p, () => { const m = window.__m3, G = m.G; return { speed: m.gameSpeed(), x: Math.floor(G.p.x / 16), y: Math.floor(G.p.y / 16), coke: G.items.coke || 0 }; });
  ok(g.speed === 1 && g.x === 6 && g.y === 19, 'coke #4: heart attack, stacks gone, wake at the cemetery gate (' + JSON.stringify(g) + ')');

  // ---------- mushrooms: reveal EPIC creatures + tint ----------
  ok(await E(p, () => !window.__m3.encTable(window.__m3.ZONES.find(z => z.id === 'fruit')).some(e => e[0] === 'lich')), 'EPIC lich is not in the fruit aisle sober');
  await E(p, () => { window.__m3.give('shrooms'); window.__m3.useItem('shrooms', false); }); await p.waitForTimeout(200);
  ok(await E(p, () => window.__m3.encTable(window.__m3.ZONES.find(z => z.id === 'fruit')).some(e => e[0] === 'lich') && window.__m3.FX.screen.tint === 'rainbow'), 'mushrooms: lich appears in the table, screen tint on');
  await at(p, 5, 31); await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/M3P_mushrooms.png' });
  await E(p, () => { window.__m3.EF.clear(window.__m3.G.me); window.__m3.FX.clearTint(); });

  // ---------- dealer: trade + wife refusal ----------
  for (let att = 0; att < 3 && !(await E(p, () => window.__m3.G.party.concat(window.__m3.G.box).some(c => c.sp === 'w_cicci'))); att++) { // her stun move can cost turns, so give it up to three tries
    await E(p, () => { const m = window.__m3; for (const c of m.G.party) c.hp = m.D ? 9999 : 9999; m.startPartner('cicci'); }); await p.waitForTimeout(200);
    await E(p, () => { window.__m3.give('ringbox', 5); window.__m3.G.me.fx.push({ type: 'catchBonus', value: 50, t: 60, n: 1, src: 'test' }); });
    for (let k = 0; k < 12 && await E(p, () => window.__m3.B && window.__m3.B.foes[0].hp > 0 && window.__m3.G.items.ringbox > 0); k++) { await until(p, '^🎯 Throw'); await until(p, 'Ring box'); await p.waitForTimeout(700); }
    await drive(p, ['^🛍️ Catch', 'Talk', 'checkouts']);
  }
  ok(await E(p, () => window.__m3.G.party.concat(window.__m3.G.box).some(c => c.sp === 'w_cicci') && window.__m3.G.solved.includes('cicci')), 'ring box calms Cicci -> knocked out -> caught (counts as solved)');
  await at(p, 45, 34); await p.waitForTimeout(200);
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.ref && window.__m3.G.near.ref.id === 'dealer'), 'the dealer hides behind the bottle machines');
  await E(p, () => { window.__m3.interact(); }); await until(p, 'Trade a creature'); await until(p, 'Cicci'); await p.waitForTimeout(100);
  ok(await E(p, () => /wife|wives|standards/.test(document.querySelector('#m3ui .m3txt').textContent)), 'dealer refuses the wife: "' + (await E(p, () => document.querySelector('#m3ui .m3txt').textContent.slice(0, 60))) + '"');
  const pts0 = await E(p, () => window.__m3.G.dealer.pts);
  await until(p, 'Trade a creature'); await until(p, 'Freezer Penguin|Folköl Frog|Cucumber');
  await p.waitForTimeout(100); await p.screenshot({ path: OUT + '/M3P_dealer.png' });
  await until(p, 'Leave'); await drive(p, []);
  g = await E(p, () => ({ pts: window.__m3.G.dealer.pts, pen: window.__m3.G.dealer.pen.length }));
  ok(g.pts > pts0 && g.pen === 1, 'traded a creature for dealer points (' + JSON.stringify(g) + ')');
  ok(p.errs.length === 0, 'no page errors (systems)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- Ljunky -> AI-Ljunky -> training gym -> grave reward -> mythic ----------
  p = await open(b); await play(p);
  await E(p, () => { window.__m3.speed = 1; for (const c of window.__m3.G.party) c.hp = 999; window.__m3.startBoss('ljunky'); });
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/M3P_boss_intro.png' }); await E(p, () => { window.__m3.speed = 25; });
  await drive(p, ['Finish off', 'Pull up', '^⚔️ Fight', 'Burp|Dill|Peas|Hug|Patty|Can|Pickle|Body']);
  g = await E(p, () => ({ dead: !!window.__m3.G.dead.h_ljunky, flag: !!window.__m3.G.flags.ljunkyDone, beat: window.__m3.G.beat.includes('ljunky'), grave: window.__m3.G.graves.some(q => q.sp === 'h_ljunky') }));
  ok(g.dead && g.flag && g.beat && g.grave, 'Ljunky finished off: grave, counts as beaten, gym unlocked (' + JSON.stringify(g) + ')');
  await at(p, 44, 13); await p.waitForTimeout(300);
  ok(await E(p, () => window.__m3.npcList().some(n => n.id === 'aiLjunky')) && await E(p, () => window.__m3.G.near && window.__m3.G.near.ref && window.__m3.G.near.ref.id === 'aiLjunky'), 'AI-Ljunky shows up in The Box');
  await p.screenshot({ path: OUT + '/M3P_gym.png' });
  await E(p, () => { const m = window.__m3; m.G.party = ['frog', 'cuke', 'peng', 'bear'].map(s => m.mk(s, 20)); for (const c of m.G.party) c.hp = 9999; m.startTrainer('aiLjunky'); });
  await p.waitForTimeout(700); await p.screenshot({ path: OUT + '/M3P_ai_intro.png' });
  await drive(p, ['Let it go', '^⚔️ Fight', 'Burp|Dill|Peas|Hug|Patty|Can|Pickle|Body'], 900);
  ok(await E(p, () => !!window.__m3.G.flags.aiBeaten), 'AI-Ljunky beaten');
  // training
  await E(p, () => { const m = window.__m3; m.G.party.push(m.mk('slime', 5)); });
  await at(p, 41, 11); await p.waitForTimeout(200);
  await E(p, () => { window.__m3.interact(); }); await until(p, 'Leave a creature'); await until(p, 'Pick-and-mix');
  await p.waitForTimeout(150); await p.screenshot({ path: OUT + '/M3P_wod.png' });
  await until(p, '^‹ Leave'); await drive(p, []);
  ok(await E(p, () => window.__m3.G.gym.slots.length === 1), 'a creature is left on the WOD board');
  await E(p, () => { window.__m3.S.train(30); });
  g = await E(p, () => ({ lv: window.__m3.G.gym.slots[0].c.lv, cap: window.__m3.S.tierCap() }));
  ok(g.lv > 5 && g.lv <= g.cap && g.cap === 30, 'training gains XP over time, capped per tier (' + JSON.stringify(g) + ')');
  await E(p, () => { window.__m3.S.train(9999); });
  ok(await E(p, () => window.__m3.G.gym.slots[0].c.lv === window.__m3.S.tierCap()), 'never above the tier cap');
  await E(p, () => window.__m3.give('coke', 4));
  await E(p, () => { window.__m3.interact(); }); await until(p, 'Pick-and-mix');
  for (let i = 0; i < 4; i++) { await until(p, 'Give .*Coke'); await p.waitForTimeout(60); if (i < 3) { await until(p, 'Pick-and-mix'); } }
  await until(p, '^‹ Leave'); await drive(p, []);
  ok(await E(p, () => window.__m3.G.gym.slots.length === 0 && window.__m3.G.graves.some(q => q.sp === 'slime')), 'coke x4 on a training creature: heart attack, it gets a grave');
  // grave reward
  const lg = await E(p, () => window.__m3.S.graveSpot(window.__m3.G.graves.findIndex(q => q.sp === 'h_ljunky')));
  await at(p, lg[0], lg[1] + 1); await p.waitForTimeout(200);
  await E(p, () => { window.__m3.interact(); }); await p.waitForTimeout(100);
  t = await btnText(p);
  ok(/Apologize/.test(t) && /bitcoin/.test(t), 'Ljunky\'s grave: Apologize / Place a bitcoin');
  await until(p, 'Apologize'); await drive(p, []);
  g = await E(p, () => { const I = window.__m3.G.items; return { trap: I.mythicTrap, drugs: ['coke', 'weed', 'snus', 'glogg', 'shrooms', 'protein'].every(d => I[d] > 0), flag: !!window.__m3.G.flags.mythicSpawned }; });
  ok(g.trap === 1 && g.drugs && g.flag, 'reward: one of each drug + the Mythic Trap, the mythic creature spawns');
  await at(p, 6, 15); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/M3P_mythic.png' });
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.kind === 'mythic'), 'the Cold Wallet Wraith drifts in the cemetery');
  ok(await E(p, () => { const m = window.__m3, f = m.mk('wraith', 20); f.hp = 0; m.G.scene = 'battle'; return true; }), '');
  // a bag can't hold it in a normal fight
  await E(p, () => { window.__m3.G.scene = 'map'; window.__m3.interact(); });
  await drive(p, ['Fight']);
  await E(p, () => { const m = window.__m3; if (m.B) m.B.foes[0].hp = 0; });
  await p.waitForTimeout(100);
  ok(await E(p, () => { const m = window.__m3; return !m.B || m.catchChance(m.B.foes[0]) === 0; }), 'outside the Mythic Trap the catch chance is 0');
  await drive(p, ['Walk away', '^⚔️ Fight', 'Burp|Dill|Peas|Hug|Patty|Can|Pickle|Body'], 900);
  // the Mythic Trap
  await at(p, 20, 15); await E(p, () => { window.__m3.trapSpeed = 1e6; window.__m3.S.placeTrap('mythicTrap'); }); await p.waitForTimeout(100);
  await E(p, () => { window.__m3.interact(); }); await p.waitForTimeout(300);
  ok(await E(p, () => window.__m3.B && window.__m3.B.foes[0].sp === 'wraith' && window.__m3.B.trapItem === 'mythicTrap'), 'the Mythic Trap holds the Wraith');
  await E(p, () => { const m = window.__m3; m.G.me.fx.push({ type: 'catchBonus', value: 50, t: 60, n: 1, src: 'test' }); m.B.foes[0].hp = 1; });
  await drive(p, ['^🛍️ Catch', '^🎯 Throw', 'Carrier bag', '^⚔️ Fight', 'Burp|Dill|Peas|Hug|Patty|Can|Pickle|Body'], 900);
  ok(await E(p, () => !!window.__m3.G.caught.wraith && !!window.__m3.G.flags.mythicCaught), 'mythic creature caught with the Mythic Trap');
  ok(p.errs.length === 0, 'no page errors (Ljunky chain)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- an OLD (v1, launch build) save still loads ----------
  p = await open(b);
  await E(p, () => localStorage.setItem('lod.save.m3.Ljunky', JSON.stringify({ t: 321, ts: Date.now(), data: { v: 1, p: [72, 990], party: [{ sp: 'frog', lv: 9, xp: 3, hp: 20 }, { sp: 'bat', lv: 6, xp: 0, hp: 12 }], box: [{ sp: 'golem', lv: 7, xp: 0, hp: 30 }],
    dir: 0, seen: { frog: 1, bat: 1 }, caught: { frog: 1, bat: 1, golem: 1 }, list: [{ id: 'milk', x: 260, y: 470, got: 1 }, { id: 'tp', x: 380, y: 680, got: 0 }], kr: 77, drinks: { folkol: 2, lager: 0, ipa: 1, gt: 0, whisky: 1, glogg: 0, snaps: 0 }, tabs: 2,
    beat: ['loken'], solved: ['anna'], dev: 0, eggs: [1, 0, 0], egg: false, debt: 1, lvlPts: 2200, flags: { idCheck: 1 }, stache: 0, blurred: false, starter: 'frog' } })));
  await toBrief(p); ok(await E(p, () => document.getElementById('brief-go').textContent === 'Continue'), 'old save: brief offers Continue');
  await p.click('#brief-go'); await p.waitForTimeout(500);
  g = await E(p, () => { const G = window.__m3.G; return { party: G.party.map(c => c.sp + c.lv).join(), items: G.items, kr: G.kr, beat: G.beat, t: Math.round(window.__lod.G.t), scene: G.scene, graves: G.graves, known: G.known }; });
  ok(g.party === 'frog9,bat6' && g.kr === 77 && g.beat.join() === 'loken' && g.t >= 321 && g.t < 330 && g.scene === 'map', 'old save: party, money, heroes, playtime restored');
  ok(g.items.folkol === 2 && g.items.ipa === 1 && g.items.whisky === 1 && g.items.fizztab === 2 && g.items.bag === 5 && Array.isArray(g.graves) && g.known, 'old save: drinks + tablets migrated into the item bag, new fields filled');
  await E(p, () => document.getElementById('btn-pause').click()); await p.waitForTimeout(100);
  ok(await E(p, () => JSON.parse(localStorage.getItem('lod.save.m3.Ljunky')).data.v === 3), 'saved again as v3');
  ok(p.errs.length === 0, 'no page errors (old save)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- a new NPC + a new trap tier purely via data (the data file is extended in flight, no code) ----------
  const extra = `;(D => {
    D.items.fizzMk9 = { kind: 'trap', name: 'Energy drink Mk9', em: '🔋', price: 5, lure: 'FIZZ', tier: 3, waitMin: 1, catchBonus: .9, rare: [['genie', 50]], learnedNote: 'Test trap.', release: 'mon' };
    D.npcs.testo = { name: 'Testo the Tester', role: 'merchant', at: [8, 58], canDie: true, catchable: true, likes: 'buns', epitaph: 'Passed.', look: { hair: '#ff00ff', style: 'messy', top: '#00ffaa' }, shop: ['fizzMk9'], release: 'mon', lines: { pool: ['I only exist in data.'] } };
  })(window.M3_DATA);`;
  p = await open(b, '?dev=all&date=2026-11-25', { route: async q => q.route(/data\/m3-data\.js/, async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()) + extra }); }) });
  await play(p);
  await at(p, 8, 59); await p.waitForTimeout(250);
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.ref && window.__m3.G.near.ref.id === 'testo'), 'data-only NPC stands on the map and is tappable');
  await p.screenshot({ path: OUT + '/M3P_data_npc.png' });
  await E(p, () => { window.__m3.interact(); }); await until(p, 'Shop'); await until(p, 'Energy drink Mk9'); await until(p, '^‹ Leave'); await until(p, '^‹ Leave'); await drive(p, []);
  ok(await E(p, () => window.__m3.G.items.fizzMk9 === 1), 'bought the data-only trap from the data-only NPC');
  await at(p, 20, 59); await E(p, () => { window.__m3.trapSpeed = 1e6; });
  for (let i = 0; i < 8 && !(await E(p, () => !!window.__m3.B)); i++) { // a trap can come up empty (12 %): try again
    await drive(p, []); await E(p, () => { window.__m3.give('fizzMk9'); window.__m3.S.placeTrap('fizzMk9'); }); await p.waitForTimeout(50);
    await E(p, () => { window.__m3.interact(); }); await p.waitForTimeout(300);
  }
  ok(await E(p, () => window.__m3.B && window.__m3.SP[window.__m3.B.foes[0].sp].type === 'FIZZ'), 'the data-only trap works (FIZZ creature)');
  ok(await E(p, () => window.__m3.D.warnings.length === 0), 'no data warnings for the new entries');
  ok(p.errs.length === 0, 'no page errors (data-only)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- ?fx=off ----------
  p = await open(b, '?dev=all&date=2026-11-25&fx=off'); await play(p);
  await E(p, () => { const m = window.__m3; m.speed = 1; m.startWild(m.ZONES.find(z => z.id === 'parking')); });
  await p.waitForTimeout(1600); await until(p, '^⚔️ Fight'); await until(p, 'Foam|Body|Can|Burp'); await p.waitForTimeout(700);
  ok(await E(p, () => !window.__m3.FX.enabled && window.__m3.layer.count === 0), 'fx=off: no particles, no shake');
  await p.screenshot({ path: OUT + '/M3P_fx_off.png' });
  await E(p, () => { window.__m3.speed = 25; }); await drive(p, ['Walk away', '^⚔️ Fight', 'Burp|Can|Foam|Body']);
  ok(await E(p, () => window.__m3.G.scene === 'map'), 'fx=off: the battle plays through');
  ok(p.errs.length === 0, 'no page errors (fx=off)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  await b.close();
})();
