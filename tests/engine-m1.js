// Round A browser test: Mission 1 still plays, pause button, HUD, M2 rotate overlay.
const { chromium } = require('playwright');
const OUT = process.argv[2] || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true }); // screenshots go here
const URL = (process.env.LOD_URL || 'http://127.0.0.1:8123/') + '?dev=all&date=2026-11-21';
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };

async function open(b, vp) {
  const p = await b.newPage({ viewport: vp });
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && p.errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(1200);
  return p;
}
const realFlow = require('./flow.js');
async function play(p, id) { ok(await realFlow(p, id), 'M' + id + ' reached play through the real menus'); await p.waitForTimeout(800); }
const mode = p => p.evaluate(() => window.__lod.G.mode);
const vis = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; }, sel);

(async () => {
  const b = await chromium.launch();

  // ---- Mission 1 (portrait, no overlay) ----
  const p = await open(b, { width: 390, height: 780 });
  await play(p, 1);
  ok(await mode(p) === 'play', 'M1 starts in play mode');
  ok(!(await vis(p, '#rotate-warning')), 'M1: no rotate overlay in portrait');
  ok(!(await p.$('#btn-mute')), 'in-game mute button removed');
  const pb = await p.$eval('#btn-pause', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, hidden: e.hidden }; });
  ok(!pb.hidden && pb.x < 30 && pb.y < 30, 'pause button top-left ' + JSON.stringify(pb));
  // drive around with keys for a few seconds
  for (const k of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) { await p.keyboard.down(k); await p.waitForTimeout(700); await p.keyboard.up(k); }
  const t1 = await p.evaluate(() => window.__lod.G.t);
  ok(t1 > 2, 'M1 clock runs (' + t1.toFixed(1) + ' s)');
  await p.screenshot({ path: OUT + '/A_m1_hud.png' });
  await p.click('#btn-pause'); await p.waitForTimeout(300);
  ok(await mode(p) === 'pause' && await vis(p, '#scr-pause'), 'M1 pause button pauses');
  const tp = await p.evaluate(() => window.__lod.G.t); await p.waitForTimeout(600);
  ok(await p.evaluate(() => window.__lod.G.t) === tp, 'clock frozen while paused');
  await p.click('#resume'); await p.waitForTimeout(300);
  ok(await mode(p) === 'play', 'M1 resumes');
  await p.evaluate(() => window.__lod.finish(true, 'done'));
  await p.waitForTimeout(2500);
  for (let i = 0; i < 10 && !(await vis(p, '#scr-result')); i++) { await p.mouse.click(195, 400); await p.waitForTimeout(700); } // tap through outro
  ok(await vis(p, '#scr-result'), 'M1 result screen shows');
  ok(!(await vis(p, '#btn-pause')), 'pause hidden on result');
  await p.screenshot({ path: OUT + '/A_m1_result.png' });
  ok(p.errs.length === 0, 'M1 no console errors ' + JSON.stringify(p.errs));

  // ---- Mission 2 rotate overlay ----
  const q = await open(b, { width: 390, height: 780 });
  await play(q, 2);
  await q.waitForTimeout(300);
  ok(await vis(q, '#rotate-warning'), 'M2 portrait: overlay shown');
  ok(await mode(q) === 'pause', 'M2 portrait: game paused');
  const tq = await q.evaluate(() => window.__lod.G.t);
  await q.screenshot({ path: OUT + '/A_m2_portrait.png' });
  await q.evaluate(() => document.fullscreenElement && document.exitFullscreen()); await q.waitForTimeout(200); await q.setViewportSize({ width: 844, height: 390 }); await q.waitForTimeout(500);
  ok(!(await vis(q, '#rotate-warning')), 'M2 landscape: overlay hidden');
  ok(await mode(q) === 'play', 'M2 landscape: game resumes');
  ok(await q.evaluate(() => window.__lod.G.t) > tq, 'M2 clock runs again');
  await q.waitForTimeout(1500);
  await q.screenshot({ path: OUT + '/A_m2_landscape.png' });
  // a pause you made yourself survives a rotate round-trip
  await q.click('#btn-pause'); await q.waitForTimeout(200);
  await q.evaluate(() => document.fullscreenElement && document.exitFullscreen()); await q.waitForTimeout(200); await q.setViewportSize({ width: 390, height: 780 }); await q.waitForTimeout(300);
  ok(await vis(q, '#rotate-warning'), 'overlay shows over the pause screen');
  await q.evaluate(() => document.fullscreenElement && document.exitFullscreen()); await q.waitForTimeout(200); await q.setViewportSize({ width: 844, height: 390 }); await q.waitForTimeout(300);
  ok(await mode(q) === 'pause' && await vis(q, '#scr-pause'), 'own pause kept after turning back');
  ok(q.errs.length === 0, 'M2 no console errors ' + JSON.stringify(q.errs));
  await b.close();
})();
