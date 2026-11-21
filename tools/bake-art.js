// Dev tool: bake tools/art-src.js into palette-snapped 48x48 PNGs in assets/creatures/.
// Usage from the repo root: node tools/bake-art.js [id ...]   (no ids = all)
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const root = path.join(__dirname, '..'), only = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.setContent('<html><body></body></html>');
  await p.addScriptTag({ content: fs.readFileSync(path.join(root, 'engine/sprites.js'), 'utf8') });
  await p.addScriptTag({ content: fs.readFileSync(path.join(root, 'tools/art-src.js'), 'utf8') });
  const out = await p.evaluate(only => {
    const res = {};
    for (const id of Object.keys(window.ART.ART)) {
      if (only.length && !only.includes(id)) continue;
      const cv = document.createElement('canvas'); cv.width = cv.height = 48;
      const c = cv.getContext('2d'); c.translate(24, 25); c.scale(.88, .88); window.ART.ART[id](c);
      window.PX.sprites.quantize(cv); res[id] = cv.toDataURL('image/png');
    }
    return res;
  }, only);
  for (const id in out) { fs.writeFileSync(path.join(root, 'assets/creatures', id + '.png'), Buffer.from(out[id].split(',')[1], 'base64')); }
  console.log('baked', Object.keys(out).length, 'creatures:', Object.keys(out).join(' '));
  await b.close();
})();
