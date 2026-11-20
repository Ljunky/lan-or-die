// Fixes: early wife text, browser fullscreen on Play, Jrohn popup fits a short landscape screen.
const { chromium } = require('playwright');
const OUT = process.argv[2] || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true }); // screenshots go here
const realFlow = require('./flow.js');
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  // a phone held sideways with the browser bars showing: very little height
  const p = await b.newPage({ viewport: { width: 740, height: 300 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto((process.env.LOD_URL || 'http://127.0.0.1:8123/') + '?dev=all&date=2026-11-21'); await p.waitForTimeout(1000);
  await realFlow(p, 2); await p.waitForTimeout(400);
  const fs = await p.evaluate(() => !!document.fullscreenElement);
  ok(fs, 'Play button puts the page in fullscreen (browser, not Telegram)');
  const w = await p.evaluate(() => ({ t: window.__m2.G.wifeT, cfg: window.__m2.CFG.WIFE_FIRST }));
  ok(w.t >= 0 && w.t <= w.cfg[1], 'first wife text due in ' + w.t.toFixed(1) + ' s (window ' + w.cfg + ')');
  // Jrohn popup at 300 px height
  await p.evaluate(() => { const G = window.__m2.G; G.wifeT = 999; window.__m2.openJrohn(); });
  await p.waitForTimeout(400);
  const box = await p.evaluate(() => ['jr-yes', 'jr-no'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return { id, top: r.top, bottom: r.bottom, h: innerHeight }; }));
  ok(box.every(r => r.top >= 0 && r.bottom <= r.h), 'Yes and No both on screen at 300 px height ' + JSON.stringify(box.map(r => [r.id, Math.round(r.top), Math.round(r.bottom)])));
  await p.screenshot({ path: OUT + '/C_popup_300.png' });
  await p.click('#jr-no'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__m2.G.mode === 'play' && !window.__m2.G.spaceVis), 'No works: back to driving, no space');
  // finish -> menus: fullscreen is released
  await p.evaluate(() => window.__lod.finish(false, 'overload'));
  for (let i = 0; i < 12 && !(await p.evaluate(() => !document.getElementById('scr-result').hidden)); i++) { await p.mouse.click(300, 150); await p.waitForTimeout(600); }
  await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => !!document.fullscreenElement)), 'fullscreen released on the result screen');
  // Mission 1 (portrait) does not go fullscreen
  const q = await b.newPage({ viewport: { width: 390, height: 780 } });
  await q.goto((process.env.LOD_URL || 'http://127.0.0.1:8123/') + '?dev=all&date=2026-11-21'); await q.waitForTimeout(1000);
  await realFlow(q, 1); await q.waitForTimeout(300);
  ok(!(await q.evaluate(() => !!document.fullscreenElement)), 'Mission 1 stays as before (no fullscreen)');
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await b.close();
})();
