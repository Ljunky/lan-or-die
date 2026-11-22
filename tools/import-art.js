#!/usr/bin/env node
/* Import creature art: any image -> background removed, cropped, 96 x 96 (or --size 48), navy outline, palette-snapped only for pixel art -> assets/creatures/<id>.png
   The game picks the file up by itself (no `art:` line needed). The picture is processed in a headless Chrome with the same palette code the game uses.

   node tools/import-art.js <image> [id] [options]     one picture; the id defaults to the file name (badgerCub.jpg -> badgerCub)
   node tools/import-art.js <folder> [options]         every png/jpg/webp/gif in the folder, ids from the file names
   options:  --tol 42         how far from the background colour a pixel may be and still count as background (higher = removes more)
             --bg #ffffff     the background colour, if it is not the one along the edge
             --no-bg          do not remove a background (the picture already has transparency)
             --snap           snap to the game palette (24 colours). Default: only when the picture already looks like pixel art (small, few colours)
             --no-snap        always keep the original colours (still cropped, scaled and outlined). The default for photos and AI pictures
             --no-outline     no navy outline
             --flip           mirror the picture (the game never flips a creature: it is drawn as you drew it)
             --force          allow an id that is not in data/m3-data.js
             --size 96        the PNG is size x size (default 96; 48 also works; the game shows both at the same on-screen size)
             --out <folder>   write somewhere else (default assets/creatures)
   No Node + Playwright? Open tools/import-art.html in a browser instead: the same thing, with a preview, no install. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const args = process.argv.slice(2), flag = n => args.includes(n), val = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const valued = ['--tol', '--bg', '--out', '--size'], pos = args.filter((a, i) => !a.startsWith('--') && !valued.includes(args[i - 1]));
if (!pos.length || flag('--help')) { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n/, '').replace(/^\/\* ?/, '')); process.exit(pos.length ? 0 : 1); }
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not installed (npm i -D playwright && npx playwright install chromium). Or open tools/import-art.html in a browser: same result, no install.'); process.exit(1); }

const win = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'data/m3-data.js'), 'utf8'), { window: win });
const known = new Set(Object.keys(win.M3_DATA.creatures));
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const src = pos[0], jobs = [];
if (fs.statSync(src).isDirectory()) for (const f of fs.readdirSync(src).sort()) { const e = path.extname(f).toLowerCase(); if (MIME[e]) jobs.push({ file: path.join(src, f), id: path.basename(f, e) }); }
else jobs.push({ file: src, id: pos[1] || path.basename(src, path.extname(src)) });
const outDir = path.resolve(val('--out') || path.join(root, 'assets/creatures')); fs.mkdirSync(outDir, { recursive: true });
const opts = { tol: val('--tol') != null ? +val('--tol') : 42, bg: val('--bg') || undefined, noBg: flag('--no-bg'), snap: flag('--snap') ? true : flag('--no-snap') ? false : 'auto', outline: !flag('--no-outline'), flip: flag('--flip'), size: val('--size') ? +val('--size') : 96 };

(async () => {
  const b = await chromium.launch(), page = await b.newPage();
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ content: fs.readFileSync(path.join(root, 'engine/sprites.js'), 'utf8') });
  await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'art-core.js'), 'utf8') });
  let done = 0, bad = 0;
  for (const j of jobs) {
    if (!known.has(j.id) && !flag('--force')) { console.log('skip  ' + path.basename(j.file) + ': "' + j.id + '" is not a creature id in data/m3-data.js (see DATA.md, or use --force)'); bad++; continue; }
    const url = 'data:' + (MIME[path.extname(j.file).toLowerCase()] || 'image/png') + ';base64,' + fs.readFileSync(j.file).toString('base64');
    const r = await page.evaluate(async ([url, opts]) => {
      const img = new Image(); img.src = url; try { await img.decode(); } catch (e) { return { err: 'cannot read the image' }; }
      try { const cv = ArtCore.process(img, opts), d = cv.getContext('2d').getImageData(0, 0, opts.size, opts.size).data, cols = new Set(); let px = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { px++; cols.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); }
        return { png: cv.toDataURL('image/png'), info: cv.__info, px, cols: cols.size }; } catch (e) { return { err: e.message }; }
    }, [url, opts]);
    if (r.err) { console.log('FAIL  ' + path.basename(j.file) + ': ' + r.err); bad++; continue; }
    fs.writeFileSync(path.join(outDir, j.id + '.png'), Buffer.from(r.png.split(',')[1], 'base64')); done++;
    console.log('ok    ' + j.id + '.png  ← ' + path.basename(j.file) + '  (' + r.info + '; ' + r.px + ' pixels, ' + r.cols + ' colours)');
  }
  await b.close();
  console.log(done + ' written to ' + path.relative(process.cwd(), outDir) + (bad ? ', ' + bad + ' skipped/failed' : '') + (done ? '. Reload the game: no `art:` line needed.' : ''));
  process.exit(bad && !done ? 1 : 0);
})();
