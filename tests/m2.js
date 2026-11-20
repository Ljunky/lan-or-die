// Round B browser test: camera zoom, friends (stop zone, run over, drive past), blood, wife, billboards, Jrohn's space trip.
const { chromium } = require('playwright');
const OUT = process.argv[2] || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true }); // screenshots go here
const realFlow = require('./flow.js');
const URL = (process.env.LOD_URL || 'http://127.0.0.1:8123/') + '?dev=all&date=2026-11-21';
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
const LAND = { width: 844, height: 390 }, PORT = { width: 390, height: 780 };

async function start(b, name, vp, opts = {}) {
  const p = await b.newPage({ viewport: vp });
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && p.errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(1000);
  await p.evaluate(n => window.__lod.setName(n), name);
  if (opts.portrait) await p.evaluate(() => { window.__lod.LOD.missions.find(m => m.id === 2).landscape = false; }); // only to take the portrait screenshot
  await realFlow(p, 2);
  await p.waitForTimeout(600);
  await p.evaluate(() => { const G = window.__m2.G; G.wifeT = 999; G.goldT = 999; G.weakT = 999; G.hinted = true; }); // quiet test runs
  return p;
}
// put house i `d` segments ahead of the player, at speed `sp` (0..1 of max), steering x = px
const goto = (p, i, d, sp, px) => p.evaluate(([i, d, sp, px]) => {
  const m = window.__m2, G = m.G, h = G.houses[i];
  G.pos = (((h.n - d) * m.SEG - m.PZ) % (m.N * m.SEG) + m.N * m.SEG) % (m.N * m.SEG);
  G.speed = m.CFG.MAX_SPEED * sp; G.px = px; G.objs = G.objs.filter(o => o.static); G.inv = 0;
}, [i, d, sp, px]);
const G = (p, f, a) => p.evaluate(f, a);

(async () => {
  const b = await chromium.launch();

  // ---------- 7. zoom: landscape + portrait screenshots, car at the bottom ----------
  const L = await start(b, 'Ljunky', LAND);
  ok(await G(L, () => window.__m2.CFG.CAM_HEIGHT === 1300), 'CFG.CAM_HEIGHT is 1300');
  await goto(L, 0, 13, .6, 0);
  await L.evaluate(() => { const m = window.__m2; m.spawnCar(); m.spawnZombies(4); });
  await L.waitForTimeout(400);
  const car = await G(L, () => ({ ...window.__m2.G.car, H: window.__lod.LOD.view.H, W: window.__lod.LOD.view.W }));
  ok(car.y > car.H * .85 && car.y <= car.H, 'landscape: car at the bottom (y ' + Math.round(car.y) + ' of ' + car.H + ')');
  ok(Math.abs(car.w / (560 / 1300 * car.W / 2) - 1) < .01, 'landscape: car width ' + Math.round(car.w) + ' px (was ' + Math.round(560 / 1000 * car.W / 2) + ' at 1000 = ' + Math.round((1 - 1000 / 1300) * 100) + ' % smaller)');
  await L.screenshot({ path: OUT + '/B_landscape.png' });
  const P = await start(b, 'Ljunky', PORT, { portrait: true });
  await goto(P, 0, 13, .6, 0); await P.evaluate(() => { window.__m2.spawnZombies(4); }); await P.waitForTimeout(400);
  const pc = await G(P, () => ({ ...window.__m2.G.car, H: window.__lod.LOD.view.H }));
  ok(pc.y > pc.H * .85 && pc.y <= pc.H, 'portrait: car at the bottom (y ' + Math.round(pc.y) + ' of ' + pc.H + ')');
  await P.screenshot({ path: OUT + '/B_portrait.png' });
  await P.close();

  // ---------- stop zone lines up with the visible friend ----------
  await goto(L, 0, 12, .2, 0); await L.waitForTimeout(150);
  await L.evaluate(() => { window.__m2.G.speed = 0; });
  await L.waitForTimeout(100);
  const st = await G(L, () => ({ near: !!window.__m2.nearHouse(), cls: document.getElementById('btn-stop').className }));
  ok(st.near && /ready/.test(st.cls), 'stop button lights up with the friend in view (' + st.cls + ')');
  await L.screenshot({ path: OUT + '/B_stop_zone.png' });
  // pick up friend 0 properly
  await L.evaluate(() => window.__m2.tryStop()); await L.waitForTimeout(1800);
  ok(await G(L, () => window.__m2.G.houses[0].picked), 'friend 0 picked up through the stop button');
  await L.evaluate(() => { if (window.__m2.G.mode === 'pause') document.getElementById('jr-no').click(); });

  // ---------- 4. drive past a house: -2 000 ----------
  await L.evaluate(() => { window.__m2.G.score = 10000; window.__m2.G.missed = 0; });
  await goto(L, 1, 6, .7, 0); await L.waitForTimeout(700);
  const pen = await G(L, () => ({ s: window.__m2.G.score, m: window.__m2.G.missed }));
  ok(pen.m === 1 && pen.s < 9000 && pen.s > 7900, 'drove past house 1: penalty applied (score ' + Math.round(pen.s) + ', missed ' + pen.m + ')');
  await L.evaluate(() => { window.__m2.G.score = 500; });
  await goto(L, 2, 6, .7, 0); await L.waitForTimeout(700);
  ok(await G(L, () => window.__m2.G.score >= 0 && window.__m2.G.missed === 2), 'penalty never takes the score below 0');

  // ---------- 5. blood splats + flyer starts at the car ----------
  await goto(L, 3, 60, .7, 0);
  await L.evaluate(() => { const m = window.__m2, G = m.G; G.zT = 999; for (let i = 0; i < 9; i++) m.spawnZombies(1); G.objs.filter(o => o.kind === 'zombie').forEach((o, i) => { o.z = ((G.pos + m.PZ) + (2 + i * .7) * m.SEG) % (m.N * m.SEG); o.pz = o.z; o.x = G.px; o.vx = 0; o.type = 'n'; }); });
  await L.waitForTimeout(250);
  await L.screenshot({ path: OUT + '/B_blood.png' });
  const bl = await G(L, () => ({ n: window.__m2.G.splats.length, k: window.__m2.G.stats.kills, max: window.__m2.CFG.SPLATS_MAX }));
  ok(bl.k >= 3 && bl.n > 0 && bl.n <= bl.max, 'zombie hits: ' + bl.k + ' kills, ' + bl.n + ' splats (max ' + bl.max + ')');
  const cent = await G(L, () => window.__m2.G.splats.every(s => Math.hypot(s.fx - .5, s.fy - .5) > .25));
  ok(cent, 'no splat in the middle of the screen');
  await L.evaluate(() => { const G = window.__m2.G; G.objs = G.objs.filter(o => o.static); G.zT = 999; });
  for (let i = 0; i < 16 && await G(L, () => window.__m2.G.splats.length > 0); i++) await L.waitForTimeout(500); // headless runs at a low frame rate
  ok(await G(L, () => window.__m2.G.splats.length === 0), 'splats fade out');

  // ---------- 1. wife text ----------
  await L.evaluate(() => { const G = window.__m2.G; G.wifeT = 0; });
  await L.waitForTimeout(400);
  const wf = await G(L, () => window.__m2.G.wifeMsg);
  ok(!!wf, 'wife text shows: "' + wf + '"');
  await L.screenshot({ path: OUT + '/B_wife.png' });

  // ---------- 2. billboards ----------
  await L.evaluate(() => { const m = window.__m2, G = m.G; G.wife = 0; G.pos = ((440 - 9) * m.SEG - m.PZ); G.speed = 0; G.px = .4; G.objs = G.objs.filter(o => o.static); });
  await L.waitForTimeout(300); await L.screenshot({ path: OUT + '/B_billboard_loken.png' });
  await L.evaluate(() => { const m = window.__m2, G = m.G; G.pos = ((230 - 9) * m.SEG - m.PZ); G.px = -.4; });
  await L.waitForTimeout(300); await L.screenshot({ path: OUT + '/B_billboard_jrohn.png' });

  // ---------- 6. Jrohn's offer -> space ----------
  const ji = await G(L, () => window.__m2.G.houses.findIndex(h => h.name === 'Jrohn'));
  ok(ji >= 0, 'Jrohn is one of the friends (house ' + ji + ')');
  await L.evaluate(i => { const G = window.__m2.G; G.houses[i].picked = false; G.houses[i].dead = false; window.__m2.CFG.SPACE_TIME = 6; }, ji);
  await goto(L, ji, 10, 0, 0); await L.waitForTimeout(200);
  await L.evaluate(() => window.__m2.tryStop()); await L.waitForTimeout(2200);
  const pop = await G(L, () => ({ mode: window.__m2.G.mode, shown: !document.getElementById('m2-jrohn').hidden }));
  ok(pop.mode === 'pause' && pop.shown, 'Jrohn asks "wanna try something?" and driving pauses');
  const tp = await G(L, () => window.__m2.G.t); await L.waitForTimeout(500);
  ok(await G(L, () => window.__m2.G.t) === tp, 'clock frozen during the question');
  await L.screenshot({ path: OUT + '/B_jrohn_popup.png' });
  await L.click('#jr-yes'); await L.waitForTimeout(1300);
  await L.evaluate(() => { const m = window.__m2; m.spawnZombies(5); m.spawnCar(); m.spawnCar(); m.G.speed = m.CFG.MAX_SPEED * .8; m.G.px = .5; });
  await L.waitForTimeout(1500);
  ok(await G(L, () => window.__m2.G.spaceVis && window.__m2.G.mode === 'play'), 'Yes = space mode');
  await L.screenshot({ path: OUT + '/B_space.png' });
  // big asteroid (car) costs a life, small one (zombie) gives points
  const before = await G(L, () => ({ l: window.__m2.G.lives, k: window.__m2.G.stats.kills }));
  await L.evaluate(() => { const m = window.__m2, G = m.G; G.inv = 0;
    m.spawnCar(); const c = G.objs.filter(o => o.kind === 'car' || o.kind === 'truck').pop(); c.z = (G.pos + m.PZ + m.SEG * 1.5) % (m.N * m.SEG); c.pz = c.z; c.x = G.px; c.speed = 0;
    m.spawnZombies(1); const z = G.objs.filter(o => o.kind === 'zombie').pop(); z.z = (G.pos + m.PZ + m.SEG * 4) % (m.N * m.SEG); z.pz = z.z; z.x = G.px; z.vx = 0; z.type = 'n'; });
  await L.waitForTimeout(700);
  const after = await G(L, () => ({ l: window.__m2.G.lives, k: window.__m2.G.stats.kills, sp: window.__m2.G.splats.length }));
  ok(after.l === before.l - 1, 'space: big asteroid costs 1 life (' + before.l + ' -> ' + after.l + ')');
  ok(after.k > before.k && after.sp === 0, 'space: small asteroid = points, no blood');
  await L.waitForTimeout(4500);
  ok(await G(L, () => !window.__m2.G.spaceVis && window.__m2.G.space === 0), 'fades back to the Swedish road after SPACE_TIME');
  await L.screenshot({ path: OUT + '/B_back_on_earth.png' });

  // ---------- 3. run over a friend -> no win, no score ----------
  const ri = await G(L, () => window.__m2.G.houses.findIndex(h => !h.picked && !h.dead));
  const side = await G(L, i => window.__m2.G.houses[i].side, ri);
  await goto(L, ri, 1.5, .8, side * .98); await L.waitForTimeout(500);
  const rv = await G(L, i => ({ dead: window.__m2.G.houses[i].dead, list: window.__m2.G.dead }), ri);
  ok(rv.dead, 'ran over ' + rv.list.join(', '));
  await L.screenshot({ path: OUT + '/B_run_over.png' });
  await L.evaluate(() => { const G = window.__m2.G; G.houses.forEach(h => { if (!h.dead) h.picked = true; }); G.picked = G.houses.filter(h => h.picked).length; window.__m2.crossFinish(); });
  await L.waitForTimeout(300);
  ok(await G(L, () => window.__m2.G.mode === 'play'), 'crossing the finish does not win');
  await L.evaluate(() => window.__lod.finish(false, 'overload'));
  for (let i = 0; i < 12 && !(await G(L, () => !document.getElementById('scr-result').hidden)); i++) { await L.mouse.click(400, 200); await L.waitForTimeout(600); }
  const rs = await G(L, () => ({ head: document.querySelector('#scr-result h2, #scr-result .head, #scr-result')?.innerText.slice(0, 200), prac: JSON.parse(localStorage.getItem('lod.scores') || '[]').pop() }));
  ok(rs.prac && rs.prac.practice === true, 'result kept off the board (saved as practice)');
  await L.screenshot({ path: OUT + '/B_result_dead.png' });
  ok(L.errs.length === 0, 'no console errors ' + JSON.stringify(L.errs));

  // ---------- 6b. playing AS Jrohn ----------
  const J = await start(b, 'Jrohn', LAND);
  ok(await G(J, () => window.__m2.G.driver === 'Jrohn'), 'driver is Jrohn');
  await J.evaluate(() => { window.__m2.CFG.SPACE_TIME = 3; window.__m2.CFG.SPACE_AGAIN = [2, 2]; });
  await goto(J, 0, 10, 0, 0); await J.waitForTimeout(200);
  await J.evaluate(() => window.__m2.tryStop()); await J.waitForTimeout(2200);
  ok(await G(J, () => document.getElementById('m2-jrohn').hidden && window.__m2.G.spaceVis), 'as Jrohn: no popup, space starts');
  await J.screenshot({ path: OUT + '/B_jrohn_weird.png' });
  for (let i = 0; i < 20 && await G(J, () => window.__m2.G.spaceVis); i++) await J.waitForTimeout(500);
  ok(await G(J, () => !window.__m2.G.spaceVis && window.__m2.G.spaceNext > 0), 'as Jrohn: back on the road, next trip scheduled');
  for (let i = 0; i < 20 && !(await G(J, () => window.__m2.G.spaceVis)); i++) await J.waitForTimeout(500);
  ok(await G(J, () => window.__m2.G.spaceVis || window.__m2.G.space > 0), 'as Jrohn: space comes back');
  ok(J.errs.length === 0, 'no console errors (Jrohn) ' + JSON.stringify(J.errs));
  await b.close();
})();
