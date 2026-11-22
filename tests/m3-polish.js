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
  await pickStarter(p, 'Folköl Frog');
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
  await pickStarter(p, 'Freezer');
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
  await E(p, () => { window.__m3.startPartner('cicci'); }); await p.waitForTimeout(200);
  await E(p, () => { window.__m3.give('ringbox', 2); window.__m3.G.me.fx.push({ type: 'catchBonus', value: 50, t: 60, n: 1, src: 'test' }); });
  for (let k = 0; k < 8 && await E(p, () => window.__m3.B && window.__m3.B.foes[0].hp > 0 && window.__m3.G.items.ringbox > 0); k++) { await until(p, '^🎯 Throw'); await until(p, 'Ring box'); await p.waitForTimeout(400); }
  await drive(p, ['^🛍️ Catch', 'Talk', 'checkouts']);
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
  ok(await E(p, () => JSON.parse(localStorage.getItem('lod.save.m3.Ljunky')).data.v === 2), 'saved again as v2');
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
