/* Creature art importer, the part that runs in a browser (used by tools/import-art.js and tools/import-art.html).
   ArtCore.process(img, opts) -> a 48 x 48 canvas: background removed, cropped, scaled to fit, snapped to the PX palette, 1-px navy outline.
   Needs engine/sprites.js first (PX.sprites.quantize does the palette snap and the outline, the same code the game uses).
   opts: { size: 48, margin: 1 (px kept free for the outline), tol: 42 (how different from the background a pixel must be to stay),
           bg: '#rrggbb' (default: the most common colour along the image border), noBg: keep the image as it is (it already has transparency),
           snap: true (palette), outline: true, flip: false, feather: true (soft edges are cut hard before the snap) } */
(() => {
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hex = h => { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const dist = (d, i, c) => { const dr = d[i] - c[0], dg = d[i + 1] - c[1], db = d[i + 2] - c[2]; return Math.sqrt(dr * dr * .3 + dg * dg * .59 + db * db * .11) * 2.2; };

/* remove the background: flood fill from every border pixel through pixels close to the background colour */
function removeBackground(cv, o) {
  const w = cv.width, h = cv.height, c = cv.getContext('2d'), im = c.getImageData(0, 0, w, h), d = im.data;
  let transparentBorder = 0; for (let x = 0; x < w; x++) { if (d[x * 4 + 3] < 30) transparentBorder++; if (d[((h - 1) * w + x) * 4 + 3] < 30) transparentBorder++; }
  if (o.noBg || transparentBorder > w * .5) return { cv, info: 'kept the existing transparency' };        // already a cut-out
  let bg = o.bg ? hex(o.bg) : null;
  if (!bg) { // the most common colour along the border (quantised to 16 levels)
    const count = {}, add = i => { const k = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4); (count[k] = count[k] || { n: 0, r: 0, g: 0, b: 0 }); const q = count[k]; q.n++; q.r += d[i]; q.g += d[i + 1]; q.b += d[i + 2]; };
    for (let x = 0; x < w; x++) { add(x * 4); add(((h - 1) * w + x) * 4); } for (let y = 0; y < h; y++) { add(y * w * 4); add((y * w + w - 1) * 4); }
    const best = Object.values(count).sort((a, b) => b.n - a.n)[0]; bg = [best.r / best.n, best.g / best.n, best.b / best.n];
  }
  const seen = new Uint8Array(w * h), stack = [], tol = o.tol;
  const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const k = y * w + x; if (seen[k]) return; if (dist(d, k * 4, bg) > tol) return; seen[k] = 1; stack.push(k); };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); } for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) { const k = stack.pop(), x = k % w, y = (k / w) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  let cut = 0; for (let k = 0; k < w * h; k++) if (seen[k]) { d[k * 4 + 3] = 0; cut++; }
  c.putImageData(im, 0, 0);
  return { cv, info: 'background ' + bg.map(Math.round).join(',') + ' removed (' + Math.round(cut / (w * h) * 100) + ' % of the picture)' };
}
function bounds(cv, alphaMin = 40) {
  const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] >= alphaMin) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function addOutline(cv) { // the navy outline only, colours untouched (--no-snap)
  const w = cv.width, h = cv.height, c = cv.getContext('2d'), im = c.getImageData(0, 0, w, h), d = im.data, solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (solid[i]) continue; if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) { d[i * 4] = 0x1F; d[i * 4 + 1] = 0x2A; d[i * 4 + 2] = 0x44; d[i * 4 + 3] = 255; } }
  c.putImageData(im, 0, 0);
}
function process(img, opts = {}) {
  const o = Object.assign({ size: 48, margin: 1, tol: 42, snap: true, outline: true, flip: false, feather: true }, opts), N = o.size;
  // 1. the picture at its own size (very large photos are first brought down to ~1000 px: speed)
  const k0 = Math.min(1, 1000 / Math.max(img.width, img.height)), src = canvas(Math.max(1, Math.round(img.width * k0)), Math.max(1, Math.round(img.height * k0)));
  const sc = src.getContext('2d'); sc.imageSmoothingQuality = 'high'; sc.drawImage(img, 0, 0, src.width, src.height);
  const rb = removeBackground(src, o), box = bounds(src);
  if (!box) throw new Error('nothing is left after removing the background: try a lower --tol, or --bg #rrggbb');
  // 2. crop, scale to fit (keeping the proportions), bottom-centre in the square
  const room = N - 2 * o.margin, k = Math.min(room / box.w, room / box.h), tw = Math.max(1, Math.round(box.w * k)), th = Math.max(1, Math.round(box.h * k));
  const out = canvas(N, N), oc = out.getContext('2d'); oc.imageSmoothingEnabled = true; oc.imageSmoothingQuality = 'high';
  oc.save(); if (o.flip) { oc.translate(N, 0); oc.scale(-1, 1); }
  // halve the size in steps first: one big jump aliases badly
  let cur = canvas(box.w, box.h); cur.getContext('2d').drawImage(src, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  while (cur.width > tw * 2 || cur.height > th * 2) { const nx = canvas(Math.max(tw, Math.ceil(cur.width / 2)), Math.max(th, Math.ceil(cur.height / 2))), nc = nx.getContext('2d'); nc.imageSmoothingQuality = 'high'; nc.drawImage(cur, 0, 0, nx.width, nx.height); cur = nx; }
  oc.drawImage(cur, 0, 0, cur.width, cur.height, Math.round((N - tw) / 2), N - o.margin - th, tw, th); oc.restore();
  // 3. soft edges become hard ones (pixel art has no half-transparent pixels)
  if (o.feather) { const im = oc.getImageData(0, 0, N, N), d = im.data; for (let i = 0; i < N * N; i++) d[i * 4 + 3] = d[i * 4 + 3] >= 110 ? 255 : 0; oc.putImageData(im, 0, 0); }
  // 4. the palette and the navy outline, exactly as the game's own sprites get them
  if (o.snap && window.PX && PX.sprites) PX.sprites.quantize(out, { outline: o.outline });
  else if (o.outline) addOutline(out);
  out.__info = rb.info + '; cropped ' + box.w + '×' + box.h + ' → ' + tw + '×' + th;
  return out;
}
window.ArtCore = { process, removeBackground, bounds };
})();
