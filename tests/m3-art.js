// Creature art: tools/import-art.js (any image -> 48x48, background removed, palette, navy outline) and the game finding assets/creatures/<id>.png without an art: line.
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

const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
(async () => {
  const b = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'art-')), outDir = path.join(tmp, 'out'); fs.mkdirSync(path.join(tmp, 'in'));
  // a test picture: light-blue background, a red body with two dark eyes, a lighter halo of anti-aliasing from the drawing
  const pg = await b.newPage();
  await pg.addScriptTag({ path: path.join(__dirname, '..', 'engine', 'sprites.js') });
  const png = await pg.evaluate(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 220; const x = c.getContext('2d'); x.fillStyle = '#9fd0ff'; x.fillRect(0, 0, 320, 220);
    x.fillStyle = '#d8312f'; x.beginPath(); x.ellipse(160, 120, 100, 70, 0, 0, 7); x.fill(); x.fillStyle = '#ffd23a'; x.beginPath(); x.ellipse(160, 150, 50, 25, 0, 0, 7); x.fill(); x.fillStyle = '#111'; x.fillRect(120, 90, 18, 18); x.fillRect(180, 90, 18, 18); return c.toDataURL('image/png'); });
  fs.writeFileSync(path.join(tmp, 'in', 'badgerCub.png'), Buffer.from(png.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(tmp, 'in', 'nope.png'), Buffer.from(png.split(',')[1], 'base64'));
  const run = (...a) => spawnSync('node', [path.join(__dirname, '..', 'tools', 'import-art.js'), ...a], { encoding: 'utf8' });
  let r = run(path.join(tmp, 'in', 'badgerCub.png'), '--out', outDir, '--snap', '--size', '48');
  ok(r.status === 0 && /ok\s+badgerCub\.png/.test(r.stdout) && fs.existsSync(path.join(outDir, 'badgerCub.png')), 'import-art.js --size 48: a picture becomes <id>.png (' + (r.stdout || r.stderr).split('\n')[0].slice(0, 130) + ')');
  const back = await pg.evaluate(async url => { const img = new Image(); img.src = url; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data;
    const pal = new Set(Object.values(PX.palette).filter(Boolean).map(h => parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16))); let opaque = 0, offPal = 0, navy = 0, semi = 0, bottom = 0, top = 0, minx = 99, maxx = 0;
    for (let i = 0; i < c.width * c.height; i++) { const a = d[i * 4 + 3], X = i % c.width, Y = (i / c.width) | 0; if (a === 0) continue; if (a !== 255) semi++; opaque++; const k = d[i * 4] + ',' + d[i * 4 + 1] + ',' + d[i * 4 + 2]; if (!pal.has(k)) offPal++; if (k === '31,42,68') navy++; if (Y === c.height - 1) bottom++; if (Y === 0) top++; minx = Math.min(minx, X); maxx = Math.max(maxx, X); }
    return { w: c.width, h: c.height, corner: d[3], opaque, offPal, navy, semi, bottom, top, minx, maxx }; }, 'data:image/png;base64,' + fs.readFileSync(path.join(outDir, 'badgerCub.png')).toString('base64'));
  ok(back.w === 48 && back.h === 48, 'the result is 48 × 48 (' + back.w + '×' + back.h + ')');
  ok(back.corner === 0 && back.opaque > 400 && back.opaque < 2000, 'the light-blue background is gone, the creature is left (' + back.opaque + ' opaque pixels, corner alpha ' + back.corner + ')');
  ok(back.offPal === 0 && back.semi === 0, 'every pixel is a palette colour and fully opaque or fully transparent');
  ok(back.navy > 60, 'there is a navy outline (' + back.navy + ' navy pixels)');
  ok(back.bottom > 0 && back.top === 0 && back.minx >= 0 && back.maxx <= 47 && Math.abs((back.minx + back.maxx) / 2 - 23.5) <= 2, 'cropped, scaled to fit, bottom-centred in the square');
  r = run(path.join(tmp, 'in', 'badgerCub.png'), '--out', path.join(tmp, 'big'));
  const big = await pg.evaluate(async url => { const img = new Image(); img.src = url; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let navy = 0, bottom = 0, top = 0, left = 0, right = 0; const W = c.width;
    for (let i = 0; i < W * W; i++) { if (!d[i * 4 + 3]) continue; const X = i % W, Y = (i / W) | 0; if (d[i * 4] === 31 && d[i * 4 + 1] === 42 && d[i * 4 + 2] === 68) navy++; if (Y === W - 1) bottom++; if (Y === 0) top++; if (X === 0) left++; if (X === W - 1) right++; } return { w: img.width, h: img.height, navy, bottom, top, left, right }; }, 'data:image/png;base64,' + fs.readFileSync(path.join(tmp, 'big', 'badgerCub.png')).toString('base64'));
  ok(big.w === 96 && big.h === 96 && big.navy > 300 && big.bottom > 0 && big.top === 0, 'the default size is 96 × 96 with a 2-pixel outline, bottom-centred in the square (' + JSON.stringify(big) + ')');
  r = run(path.join(tmp, 'in', 'badgerCub.png'), '--out', path.join(tmp, 'auto'));
  const auto = await pg.evaluate(async url => { const img = new Image(); img.src = url; await img.decode(); const c = document.createElement('canvas'); c.width = 48; c.height = 48; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, 48, 48).data, cols = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3]) cols.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); return cols.size; }, 'data:image/png;base64,' + fs.readFileSync(path.join(tmp, 'auto', 'badgerCub.png')).toString('base64'));
  ok(/original colours kept/.test(r.stdout) && auto > 12, 'by default a large smooth picture keeps its own colours, no palette snap (' + auto + ' colours)');
  const tiny = await pg.evaluate(() => { const c = document.createElement('canvas'); c.width = 24; c.height = 24; const x = c.getContext('2d'); x.fillStyle = '#d8312f'; x.fillRect(4, 4, 16, 16); x.fillStyle = '#ffd23a'; x.fillRect(8, 8, 6, 6); return c.toDataURL('image/png'); });
  fs.writeFileSync(path.join(tmp, 'in', 'rat.png'), Buffer.from(tiny.split(',')[1], 'base64'));
  r = run(path.join(tmp, 'in', 'rat.png'), '--out', path.join(tmp, 'auto'));
  ok(/palette snapped/.test(r.stdout), 'a small picture with few colours is treated as pixel art and snapped to the palette');
  r = run(path.join(tmp, 'in', 'nope.png'), '--out', outDir);
  ok(r.status !== 0 && /not a creature id/.test(r.stdout) && !fs.existsSync(path.join(outDir, 'nope.png')), 'an id that is not in data/m3-data.js is refused (use --force)');
  r = run(path.join(tmp, 'in'), '--out', outDir, '--no-outline', '--no-snap');
  ok(/2 written/.test(r.stdout) && /skipped/.test(r.stdout), 'a folder imports every file named after a creature and skips the rest');

  // ===== the game picks the file up by itself: no art: line =====
  const art = fs.readFileSync(path.join(outDir, 'badgerCub.png'));
  const p = await open(b, '?dev=all&date=2026-11-23', { route: async q => q.route(/assets\/creatures\/badgerCub\.png/, route => route.fulfill({ status: 200, contentType: 'image/png', body: art })) });
  await toBrief(p, 'bigwman'); await p.waitForTimeout(1200);
  const g = await E(p, () => { const m = window.__m3, C = m.D.raw.creatures; return { has: !!window.M3_DATA.creatures.badgerCub.art, art: C.badgerCub.art, ready: PX.sprites.ready('cr:badgerCub'), ratReady: PX.sprites.ready('cr:rat'), ratArt: C.rat.art || null, warn: m.D.warnings.length, wraith: PX.sprites.ready('cr:wraith') }; });
  ok(g.art === 'assets/creatures/badgerCub.png', 'assets/creatures/badgerCub.png is found without an art: line (' + g.art + ')');
  ok(g.ready && !g.ratReady && g.ratArt === null, 'it is loaded as a sprite; creatures without a file keep the placeholder');
  ok(g.warn === 0, 'a missing file is not a warning (' + g.warn + ' warnings)');
  ok(g.wraith, 'an explicit art: line still works (the Wraith)');
  // a 96 px file is shown at the size a 48 px file would have, smoothed
  const art96 = fs.readFileSync(path.join(tmp, 'big', 'badgerCub.png'));
  const q = await open(b, '?dev=all&date=2026-11-23', { route: async z => z.route(/assets\/creatures\/badgerCub\.png/, route => route.fulfill({ status: 200, contentType: 'image/png', body: art96 })) });
  await play(q); await q.waitForTimeout(800);
  await E(q, () => { window.__calls = []; const o = PX.drawSprite; PX.drawSprite = function (ctx, id, anim, t, x, y, opt) { if (id === 'cr:badgerCub') window.__calls.push({ scale: opt.scale, exact: opt.exact, smooth: opt.smooth }); return o.apply(this, arguments); }; });
  await E(q, () => { const m = window.__m3; m.G.party = [m.mk('badgerCub', 5)]; m.startWild(m.ZONES.find(z => z.id === 'parking')); });
  await q.waitForTimeout(900);
  const cl = await E(q, () => ({ size: PX.sprites.size('cr:badgerCub'), calls: window.__calls.slice(-3), sc: window.__m3.spots.sc }));
  ok(cl.size.join() === '96,96' && cl.calls.length > 0 && cl.calls.every(c => c.exact && c.smooth && Math.abs(c.scale - cl.sc / 2) < .01), 'a 96 px creature is drawn at half scale, smoothed: the same on-screen size as 48 px art (' + JSON.stringify(cl) + ')');
  await E(q, () => { const m = window.__m3; m.B.over = true; m.B.result = 'run'; });
  ok(q.errs.length === 0, 'no page errors (96 px art)' + (q.errs.length ? ': ' + q.errs.join(' | ') : ''));
  await q.close();
  ok(p.errs.length === 0, 'no page errors (art)' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await p.close(); await pg.close(); await b.close();
  fs.rmSync(tmp, { recursive: true, force: true });
})();
