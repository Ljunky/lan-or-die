const { chromium } = require('playwright');
const OUT = process.argv[2] || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true }); // screenshots go here
const realFlow = require('./flow.js');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  await p.goto((process.env.LOD_URL || 'http://127.0.0.1:8123/') + '?dev=all&date=2026-11-21'); await p.waitForTimeout(1000);
  await realFlow(p, 2); await p.waitForTimeout(3000);
  for (const [at, d, name] of [[230, 30, 'jrohn30'], [230, 45, 'jrohn45'], [520, 30, 'wizcudi'], [1060, 30, 'bigwman'], [1440, 30, 'loken']]) {
    await p.evaluate(([at, d]) => { const m = window.__m2, G = m.G; G.objs = G.objs.filter(o => o.static); G.zT = G.bT = G.mT = 999; G.pos = ((at - d) * m.SEG - m.PZ); G.speed = 0; G.px = 0; G.wifeT = 999; }, [at, d]);
    await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/B_board_' + name + '.png' });
  }
  await b.close();
})();
