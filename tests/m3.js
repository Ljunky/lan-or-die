// Mission 3 browser test: no timer, tutorial + starter, walking + collision, encounters, fight, catch, shops, bosses,
// partners, stock room + Dev Ljunky, save/continue/new game, autosubmit, score = goals counted once.
const { chromium } = require('playwright');
const OUT = process.argv[2] || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const BASE = process.env.LOD_URL || 'http://127.0.0.1:8123/';
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
const PORT = { width: 390, height: 780 };
const E = (p, f, a) => p.evaluate(f, a);

async function open(b, q = '?dev=all&date=2026-11-23', name = 'Ljunky', hero = 'ljunky') {
  const p = await b.newPage({ viewport: PORT });
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && p.errs.push(m.text()));
  await p.goto(BASE + q); await p.waitForTimeout(800);
  await E(p, ([n, h]) => { window.__lod.setName(n); window.__lod.LOD.store.set('lod.char', h); }, [name, hero]);
  return p;
}
async function toBrief(p, hero) { // fighter select -> intro -> brief, by clicking
  await E(p, () => { const L = window.__lod; L.openMission(L.LOD.missions.find(m => m.id === 3)); });
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(300);
    if (await E(p, () => !document.getElementById('scr-brief').hidden)) return true;
    await E(p, h => {
      const c = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled);
      const cur = document.querySelector('.cs-name');
      if (h && cur && cur.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') !== h) { const n = c.find(x => x.matches('[data-a="next"]')); if (n) return n.click(); }
      const b = c.find(x => x.matches('[data-a="select"]')) || c.find(x => x.matches('.cut [data-a="skip"]')); if (b) b.click();
    }, hero);
  }
  return false;
}
// answer every text box / menu until the battle or dialog is over. prefer = list of regexes, first match wins
async function drive(p, prefer, until = 'map', max = 400) {
  for (let i = 0; i < max; i++) {
    const st = await E(p, ([pref, until]) => {
      const m = window.__m3, G = m.G;
      if (!G || G.mode !== 'play') return 'mode:' + (G && G.mode);
      if (until === 'map' && G.scene === 'map' && !m.B) return 'done';
      const pd = m.pending; if (!pd) return 'wait';
      if (pd.say) { pd.res(); return 'say'; }
      const btns = [...document.querySelectorAll('#m3ui .m3grid button')].filter(b => !b.disabled);
      for (const r of pref) { const b = btns.find(x => new RegExp(r).test(x.textContent)); if (b) { b.click(); return 'click ' + r; } }
      const b = btns.find(x => !/Back|Leave|Not yet|Close/.test(x.textContent)) || btns[0]; if (b) { b.click(); return 'click*'; }
      return 'none';
    }, [prefer, until]);
    if (st === 'done' || st.startsWith('mode:')) return st;
    await p.waitForTimeout(st === 'wait' ? 60 : 25);
  }
  return 'timeout';
}
const strong = lv => E(p0, lv => { const m = window.__m3, G = m.G; G.party = ['badger', 'lynx', 'toad', 'hedgehog'].map(s => m.mk(s, lv)); }, lv);
let p0;

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

  // ---------- brief, no timer, tutorial ----------
  const p = p0 = await open(b);
  await E(p, () => localStorage.removeItem('lod.save.m3.Ljunky'));
  ok(await toBrief(p, 'ljunky'), 'menus reach the brief');
  ok(await E(p, () => document.getElementById('brief-go').textContent === 'Go' && !document.getElementById('brief-new')), 'no save yet: brief says Go, no New game button');
  ok(await E(p, () => !/FANG|Easter|crit|%/.test(document.getElementById('scr-brief').textContent) && document.getElementById('scr-brief').classList.contains('m3solid')), 'brief: solid start screen, no type chart, odds, abilities or easter-egg text');
  await p.click('#brief-go'); await p.waitForTimeout(600);
  await E(p, () => { window.__m3.speed = 20; });
  ok(await E(p, () => window.__m3.G.scene === 'talk' && window.__m3.wakeT > 0 && !document.getElementById('scr-brief').textContent.includes('spiked')), 'new game opens with the wake-up (eyes blinking), no story text on the brief');
  await p.screenshot({ path: OUT + '/M3_wake.png' });
  ok(await pickStarter(p, 'Badger Cub'), 'the stranger walks up and you choose a starter');
  let g = await E(p, () => { const G = window.__m3.G; return { party: G.party.map(c => c.sp + c.lv), caught: Object.keys(G.caught), score: G.score }; });
  ok(g.party.join() === 'badgerCub5' && g.caught.join() === 'badgerCub', 'starter chosen: ' + g.party.join());
  ok(g.score === 0, 'score = goals only: a starter is not a species, levels give nothing (' + g.score + ')');
  ok(await E(p, () => document.querySelector('#btn-fire').hidden && !document.querySelector('#m3ui .m3bag').hidden), 'no fire button, bag button shown');
  await p.screenshot({ path: OUT + '/M3_map.png' });

  await E(p, () => { window.__lod.G.t = 400; }); await p.waitForTimeout(300);
  ok(await E(p, () => window.__lod.G.mode === 'play' && !window.__lod.G.finalMin), 'noTimer: no OVERLOAD after 3:00 (clock ' + await E(p, () => Math.round(window.__lod.G.t)) + ' s)');

  // ---------- walking + collision ----------
  const walk = async (key, ms) => { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); };
  const y0 = await E(p, () => window.__m3.G.p.y);
  await walk('ArrowDown', 500);
  ok(await E(p, () => window.__m3.G.p.y) > y0 + 10, 'walking moves the hero');
  await E(p, () => { const m = window.__m3, [x, y] = m.tc(10, 9); m.G.p.x = x; m.G.p.y = y; });
  await walk('ArrowUp', 900);
  ok(await E(p, () => window.__m3.G.p.y > 8 * 16), 'the lake blocks you (y ' + Math.round(await E(p, () => window.__m3.G.p.y)) + ')');
  ok(await E(p, () => !window.__m3.walkable(...window.__m3.tc(16, 27))), 'stock room door is locked at the start');

  // ---------- encounter in tall grass ----------
  await E(p, () => { const m = window.__m3, [x, y] = m.tc(14, 12); m.G.p.x = x; m.G.p.y = y; m.CFG.ENC_RATE = 1; m.G.encCool = 0; });
  await walk('ArrowRight', 700);
  ok(await E(p, () => window.__m3.G.scene === 'battle' && window.__m3.B.kind === 'wild'), 'walking in tall grass starts a wild battle');
  await E(p, () => { window.__m3.CFG.ENC_RATE = 0; });
  await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/M3_battle.png' });
  await strong(14);
  const xp0 = await E(p, () => window.__m3.G.party[0].xp + window.__m3.G.party[0].lv * 1000);
  ok(await drive(p, ['Pull up', 'Walk away', 'Fight', 'Claw|Bite|Maul|Body']) === 'done', 'fight until the battle ends');
  ok(await E(p, () => window.__m3.G.party[0].xp + window.__m3.G.party[0].lv * 1000) > xp0, 'the winner gained XP');

  // ---------- catching ----------
  let caught = false;
  for (let i = 0; i < 6 && !caught; i++) {
    await E(p, () => { const m = window.__m3; m.G.kr = 500; m.startWild(m.ZONES.find(z => z.id === 'charger')); });
    await p.waitForTimeout(200);
    await E(p, () => { const m = window.__m3; const f = m.B.foes[0]; f.hp = 1; m.B.lure = 50; f.sp = 'cockroach'; });
    await drive(p, ['^🎯 Throw', '[Cc]arrier bag', 'Catch', 'Fight', 'Body|Claw|Bite']);
    caught = await E(p, () => !!window.__m3.G.caught.cockroach);
  }
  ok(caught, 'a weakened, lured creature goes in the bag');
  g = await E(p, () => ({ kr: window.__m3.G.kr, n: Object.keys(window.__m3.G.caught).length, inParty: window.__m3.G.party.length + window.__m3.G.box.length }));
  ok(g.n === 2 && (await E(p, () => Object.keys(window.__m3.G.lines).join())) === 'cockroach', 'the species counts once, by line (' + g.n + ' forms seen)');

  // ---------- Systembolaget: buy a drink by tapping the cashier ----------
  await E(p, () => { const m = window.__m3, [x, y] = m.tc(42, 31); m.G.p.x = x; m.G.p.y = y; m.G.kr = 100; });
  await p.waitForTimeout(200);
  ok(await E(p, () => window.__m3.G.near && window.__m3.G.near.ref && window.__m3.G.near.ref.id === 'system'), 'the cashier is tappable from the counter');
  await E(p, () => { window.__m3.interact(); });
  for (let i = 0; i < 6; i++) { await E(p, () => { const pd = window.__m3.pending; if (pd && pd.say) pd.res(); const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => /Shop/.test(x.textContent)); b && b.click(); }); await p.waitForTimeout(80); }
  await E(p, () => { const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => /Whisky/.test(x.textContent)); b && b.click(); });
  await p.waitForTimeout(100);
  await p.screenshot({ path: OUT + '/M3_systembolaget.png' });
  await drive(p, ['Leave']);
  ok(await E(p, () => window.__m3.G.items.whisky === 1 && window.__m3.G.kr === 50), 'bought a whisky for 50 kr');

  // ---------- partner: the right words solve it ----------
  await E(p, () => window.__m3.startPartner('cicci')); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/M3_partner.png' });
  await drive(p, ['Talk', 'checkouts, signing']);
  ok(await E(p, () => window.__m3.G.solved.includes('cicci')), 'Cicci solved with the right line');
  // partner: survive the turns
  await E(p, () => window.__m3.startPartner('anna'));
  await drive(p, ['Endure', 'Gin']);
  ok(await E(p, () => window.__m3.G.solved.includes('anna') && window.__m3.G.mirrorT > 0), 'Anna solved by surviving; Psychic mirrors the controls after');

  // ---------- the four hero bosses ----------
  for (const id of ['bigwman', 'wizcudi', 'jrohn', 'loken']) {
    await strong(20); await E(p, () => { for (const c of window.__m3.G.party) c.hp = 999; });
    await E(p, id => window.__m3.startBoss(id), id); await p.waitForTimeout(200);
    if (id === 'bigwman') { await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/M3_boss.png' }); }
    await drive(p, ['Pull up', 'Let it go', 'Fight', 'Claw|Body|Bite|Maul|Nip']);
    ok(await E(p, id => window.__m3.G.beat.includes(id), id), 'beat ' + id);
  }
  ok(await E(p, () => !window.__m3.walkable(...window.__m3.tc(16, 27))), 'beating the 4 heroes is not enough: the stock room stays shut until you have seen the heroes\' houses');
  await E(p, () => { for (const h of ['bigwman', 'wizcudi', 'jrohn', 'loken']) window.__m3.G.flags['house:' + h] = 1; });
  ok(await E(p, () => window.__m3.walkable(...window.__m3.tc(16, 27))), 'stock room opens after 4 heroes AND their houses');
  g = await E(p, () => window.__m3.goals());
  ok(g.heroes === 4 && g.rows.find(r => /Heroes/.test(r[0]))[1] === 120000, 'heroes count 4 × 30 000');
  ok(await E(p, () => window.__m3.G.score === window.__m3.goals().total), 'G.score always equals the goals total');

  // ---------- save + continue ----------
  await p.click('#btn-pause'); await p.waitForTimeout(200);
  const sv = await E(p, () => JSON.parse(localStorage.getItem('lod.save.m3.Ljunky') || 'null'));
  ok(sv && sv.data && sv.data.beat.length === 4 && sv.t > 0, 'pause saves the game (' + (sv && sv.data.beat.length) + ' heroes, ' + Math.round(sv && sv.t) + ' s)');
  await p.click('#quit'); await p.waitForTimeout(300);
  ok(await toBrief(p, 'ljunky'), 'back to the brief');
  ok(await E(p, () => document.getElementById('brief-go').textContent === 'Continue' && !!document.getElementById('brief-new')), 'brief offers Continue + New game');
  await p.click('#brief-go'); await p.waitForTimeout(500);
  g = await E(p, () => { const G = window.__m3.G; return { beat: G.beat.length, solved: G.solved.length, party: G.party.length, t: window.__lod.G.t, scene: G.scene }; });
  ok(g.beat === 4 && g.solved === 2 && g.party === 4 && g.t >= 400 && g.scene === 'map', 'Continue restores heroes, partners, party and playtime');

  // ---------- Dev Ljunky -> finish -> result ----------
  await strong(50); await E(p, () => { window.__m3.speed = 20; for (const c of window.__m3.G.party) c.hp = 9999; });
  await E(p, () => { window.__m3.startDev(); }); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/M3_dev.png' });
  const r = await drive(p, ['Fight', 'Claw|Body|Bite|Maul|Nip'], 'map', 800);
  ok(await E(p, () => !!window.__m3.G.dev), 'Dev Ljunky beaten (' + r + ')');
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(250); if (await E(p, () => !document.getElementById('scr-result').hidden)) break; await E(p, () => { const b = document.querySelector('.cut [data-a="skip"]'); if (b) b.click(); const t = document.querySelector('.tbc'); if (t) t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }); }
  await p.waitForTimeout(400);
  ok(await E(p, () => !document.getElementById('scr-result').hidden && /Dev Ljunky/.test(document.getElementById('result').textContent)), 'result screen after the final boss');
  await p.screenshot({ path: OUT + '/M3_result.png' });
  ok(await E(p, () => (JSON.parse(localStorage.getItem('lod.save.m3.Ljunky')) || {}).data.dev === 1), 'the save keeps going after the final boss');

  // ---------- New game needs two taps and wipes the save ----------
  await E(p, () => window.__lod.LOD.ui.$('#res-home').click()); await p.waitForTimeout(300);
  await toBrief(p, 'ljunky');
  await p.click('#brief-new'); await p.waitForTimeout(100);
  ok(await E(p, () => window.__lod.G.mode !== 'play' && /Tap again/.test(document.getElementById('brief-new').textContent)), 'New game asks for a second tap');
  await p.click('#brief-new'); await p.waitForTimeout(500);
  ok(await E(p, () => window.__m3.G.beat.length === 0 && window.__m3.G.party.length === 0 && window.__lod.G.t < 5), 'New game starts fresh');
  ok(p.errs.length === 0, 'no page errors' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close();

  // ---------- autosubmit: live day, best score sent when it rises ----------
  const q = await open(b, '?dev=all', 'BigWman', 'bigwman');
  const posts = [];
  await q.route(/script\.google\.com/, (route, req) => { if (req.method() === 'POST') posts.push(JSON.parse(req.postData())); route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"rows":[]}' }); });
  await E(q, () => { localStorage.removeItem('lod.save.m3.BigWman'); localStorage.removeItem('lod.best.m3.BigWman'); const M = window.__lod.LOD.missions.find(m => m.id === 3); M.unlock = window.__lod.LOD.today(); M.until = M.unlock; });
  await toBrief(q, 'bigwman');
  await q.click('#brief-go'); await q.waitForTimeout(500);
  await E(q, () => { window.__m3.speed = 20; });
  await pickStarter(q, 'Hoglet');
  await E(q, () => { window.__m3.G.lines.rat = 1; });   // a starter is not a species: catch one real line for the first 2000
  await E(q, () => { window.__lod.G.saveT = 9.9; }); await q.waitForTimeout(400);
  ok(posts.length === 1 && posts[0].mission === 3 && posts[0].score === 2000 && posts[0].name === 'BigWman', 'autosave sends the new best (' + JSON.stringify(posts[0] || {}) + ')');
  await E(q, () => { window.__lod.G.saveT = 9.9; }); await q.waitForTimeout(400);
  ok(posts.length === 1, 'same score is not sent again');
  await E(q, () => { window.__m3.G.solved.push('cicci'); });
  await q.click('#btn-pause'); await q.waitForTimeout(300);
  ok(posts.length === 2 && posts[1].score === 6000, 'leaving (pause) sends a higher score right away (' + (posts[1] || {}).score + ')');
  ok(await E(q, () => !document.getElementById('scr-pause').hidden), 'pause screen is shown');
  ok(q.errs.length === 0, 'no page errors (autosubmit)' + (q.errs.length ? ': ' + q.errs.join(' | ') : ''));
  await b.close();
})();
