/* PX.sprites – generic pixel-sprite kit. Knows nothing about any game.
   - One fixed palette (24 colours, keyed by one character) so every sprite matches.
   - Sprite sources: char grids (frames of strings), PNG files (with transparency) or rect "paper-doll" layers.
   - Frames are rendered once to small canvases and cached; drawing is integer-scaled with smoothing off.
   - Procedural life: idle bob/breathe, blink, squash-stretch, white hit-flash.
   Usage:
     PX.sprites.define('frog', { png: 'assets/creatures/frog.png', eyes: [[18,14,3,3]] });
     PX.sprites.define('coin', { grid: [['..yy..', '.yYYy.', ...]], fps: 6 });
     PX.drawSprite(ctx, 'frog', 'idle', t, x, y, { scale: 3, flipX: false, flash: 0, squash: 0, alpha: 1, idle: true });
   Anchor: (x, y) = bottom centre of the sprite. */
(() => {
'use strict';
const PX = window.PX = window.PX || {};

const PALETTE = {
  '.': null,
  o: '#1F2A44', // navy outline (matches UI borders)
  c: '#FBF6E8', // cream panel
  w: '#FFFFFF', k: '#0E1220', d: '#4A5268', g: '#8A93A6', G: '#C9CED6',
  r: '#D8312F', R: '#8F1D22', p: '#FF6B9A', n: '#F39C34', y: '#FFD23A', Y: '#E8B820',
  e: '#3F9A3A', E: '#7ED35A', h: '#2B6A28', s: '#5FF0FF', B: '#9FD3EA', b: '#2F6FD0',
  v: '#9B6BD6', u: '#8A5522', U: '#C98A4A', f: '#EEBD96'
};
const KEYS = Object.keys(PALETTE).filter(k => PALETTE[k]);
const RGB = {}; for (const k of KEYS) { const h = PALETTE[k]; RGB[k] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

const defs = {}, cache = {}, missing = new Set();
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function gridToCanvas(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), cv = canvas(w, h), c = cv.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
    const ch = rows[y][x], col = (pal && pal[ch] !== undefined) ? pal[ch] : PALETTE[ch];
    if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
  }
  return cv;
}
/* rect layers: [[x, y, w, h, colourKeyOrHex], ...] with a colour map (paper doll) */
function rectsToCanvas(w, h, layers, colors) {
  const cv = canvas(w, h), c = cv.getContext('2d');
  for (const L of layers) for (const r of L || []) {
    const k = r[4], col = colors && colors[k] !== undefined ? colors[k] : (PALETTE[k] !== undefined ? PALETTE[k] : k);
    if (!col) continue; c.fillStyle = col; c.fillRect(r[0], r[1], r[2], r[3]);
  }
  return cv;
}
/* snap every pixel to the palette; optional 1-px navy outline around the silhouette */
function quantize(src, o = {}) {
  const w = src.width, h = src.height, c = src.getContext('2d'), im = c.getImageData(0, 0, w, h), d = im.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3]; if (a < (o.alphaCut || 110)) { d[i * 4 + 3] = 0; continue; }
    let best = 'k', bd = 1e9; const R = d[i * 4], Gg = d[i * 4 + 1], Bb = d[i * 4 + 2];
    for (const k of KEYS) { if (k === 'o' && !o.useOutlineColour) continue; const q = RGB[k], dr = R - q[0], dg = Gg - q[1], db = Bb - q[2], v = dr * dr * .3 + dg * dg * .59 + db * db * .11; if (v < bd) { bd = v; best = k; } }
    const q = RGB[best]; d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 255; solid[i] = 1;
  }
  if (o.outline !== false) {
    const q = RGB.o;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) { d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 255; }
    }
  }
  c.putImageData(im, 0, 0); return src;
}
function flashOf(cv) { // white silhouette
  const f = canvas(cv.width, cv.height), c = f.getContext('2d');
  c.drawImage(cv, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff'; c.fillRect(0, 0, f.width, f.height); return f;
}
function blinkOf(cv, eyes) { // close the eyes: copy the row above each eye rect over it
  const b = canvas(cv.width, cv.height), c = b.getContext('2d'); c.drawImage(cv, 0, 0);
  for (const [x, y, w, h] of eyes) for (let j = 0; j < h; j++) c.drawImage(cv, x, Math.max(0, y - 1), w, 1, x, y + j, w, 1);
  for (const [x, y, w, h] of eyes) { c.fillStyle = PALETTE.o; c.fillRect(x, y + h - 1, w, 1); }
  return b;
}

/* define(id, def)
   def.grid: [frame, ...] where frame = [row strings]  (or a single frame of strings)
   def.png: url (one frame) or def.sheet: { url, w, h } (frames left->right)
   def.rects: { w, h, frames: [[layers...], ...], colors }
   def.anims: { idle: [0], walk: [1, 2] }   def.fps (default 6)
   def.eyes: [[x, y, w, h]] for blink.   def.quantize: true snaps a PNG to the palette. */
function define(id, def) {
  defs[id] = def; delete cache[id]; missing.delete(id);
  if (def.png || def.sheet) loadImage(id, def);
  return id;
}
function loadImage(id, def) {
  const url = def.png || def.sheet.url, img = new Image();
  cache[id] = { loading: true, frames: [] };
  img.onload = () => {
    const fw = def.sheet ? def.sheet.w : img.width, fh = def.sheet ? def.sheet.h : img.height, n = Math.max(1, Math.floor(img.width / fw));
    const frames = [];
    for (let i = 0; i < n; i++) { const cv = canvas(fw, fh); cv.getContext('2d').drawImage(img, i * fw, 0, fw, fh, 0, 0, fw, fh); frames.push(def.quantize ? quantize(cv) : cv); }
    cache[id] = build(def, frames);
  };
  img.onerror = () => { missing.add(id); cache[id] = { failed: true, frames: [] }; if (def.onMissing) def.onMissing(id, url); };
  img.src = url;
}
function build(def, frames) {
  return { frames, flash: frames.map(flashOf), blink: def.eyes ? frames.map(f => blinkOf(f, def.eyes)) : null, w: frames[0].width, h: frames[0].height };
}
function entry(id) {
  if (cache[id]) return cache[id];
  const def = defs[id]; if (!def) return null;
  let frames = [];
  if (def.grid) { const g = typeof def.grid[0] === 'string' ? [def.grid] : def.grid; frames = g.map(f => gridToCanvas(f, def.palette)); }
  else if (def.rects) frames = def.rects.frames.map(L => rectsToCanvas(def.rects.w, def.rects.h, L, def.rects.colors));
  else if (def.canvas) frames = [].concat(def.canvas);
  if (!frames.length) return null;
  if (def.quantize) frames = frames.map(f => quantize(f));
  return (cache[id] = build(def, frames));
}
function ready(id) { const e = entry(id); return !!(e && e.frames && e.frames.length); }
function size(id) { const e = entry(id); return e && e.frames.length ? [e.w, e.h] : [0, 0]; }
function frameIndex(def, anim, t) {
  const a = (def.anims && def.anims[anim]) || (def.anims && def.anims.idle) || [0];
  return a[Math.floor(t * (def.fps || 6)) % a.length] || 0;
}

/* draw a sprite. o: scale (integer), flipX, flash (0..1, >0.5 = white), squash (-1..1: + = flat/wide, - = tall/thin),
   alpha, idle (bob + breathe + blink), seed (desync idle per sprite), rot (radians), anchor 'bottom'|'center' */
function draw(ctx, id, anim, t, x, y, o = {}) {
  const e = entry(id); if (!e || !e.frames.length) return false;
  const def = defs[id] || {}, sc = Math.max(1, Math.round(o.scale || 1));
  let fi = frameIndex(def, anim || 'idle', t || 0); if (fi >= e.frames.length) fi = 0;
  const seed = o.seed || 0;
  let img = e.frames[fi];
  if (o.flash > .5) img = e.flash[fi];
  else if (o.idle !== false && e.blink && ((t + seed * 1.7) % 3.6) < .13) img = e.blink[fi];
  let w = e.w * sc, h = e.h * sc, bob = 0, sx = 1, sy = 1;
  if (o.idle) { bob = Math.round(Math.sin((t + seed) * 2.6) * .6) * sc; const br = Math.sin((t + seed) * 2.6) * .025; sx = 1 - br; sy = 1 + br; }
  if (o.squash) { sx *= 1 + o.squash * .25; sy *= 1 - o.squash * .25; }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.translate(Math.round(x), Math.round(y) + (o.anchor === 'center' ? 0 : 0));
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.flipX ? -1 : 1) * sx, sy);
  const oy = o.anchor === 'center' ? -h / 2 : -h;
  ctx.drawImage(img, -Math.round(w / 2), oy + bob, w, h);
  ctx.restore();
  return true;
}

/* ---------- paper doll: body + hair + clothes + palette swap, built from rect layers ----------
   parts = { view: { partName: { styleName: [[x,y,w,h,key], ...] } } } supplied by the game (data).
   spec = { body: 'base', hair: 'short', top: 'tee', ... , colors: { skin, hair, top, legs, shoes, ... } }
   order = which part slots are drawn, back to front. Returns a sprite id per view+step, cached. */
function doll(parts, spec, o = {}) {
  const w = o.w || 16, h = o.h || 24, order = o.order || ['shadow', 'legs', 'body', 'top', 'arms', 'head', 'face', 'hair', 'prop'];
  const views = o.views || Object.keys(parts), [ox, oy] = o.offset || [0, 0], mid = o.mid != null ? o.mid : w / 2 - ox;
  const key = 'doll:' + JSON.stringify([spec, w, h, order, o.offset]);
  if (defs[key]) return key;
  const frames = [];
  for (const v of views) for (const step of [0, 1, 2]) {
    const layers = [];
    for (const slot of order) {
      const style = spec[slot]; if (style == null || style === false) continue; // a slot is drawn only when the spec names a style (true = 'base')
      const P = parts[v] && parts[v][slot]; if (!P) continue;
      let L = P[style === true ? 'base' : style] || (style === true ? null : P.base); if (!L) continue;
      if (slot === 'legs' && step) L = L.map(r => (step === 1 ? r[0] < mid : r[0] >= mid) && r[3] > 1 ? [r[0], r[1], r[2], r[3] - 1, r[4]] : r);
      layers.push(L.map(r => [r[0] + ox, r[1] + oy, r[2], r[3], r[4]]));
    }
    frames.push(rectsToCanvas(w, h, layers, spec.colors));
  }
  const anims = {}; views.forEach((v, i) => { anims[v] = [i * 3]; anims[v + 'Walk'] = [i * 3 + 1, i * 3, i * 3 + 2, i * 3]; });
  const out = frames.map(f => (o.outline === false ? f : outlineGrow(f)));
  define(key, { canvas: out, anims, fps: 8, eyes: o.eyes });
  return key;
}
function outlineGrow(cv) { // 1-px navy outline around a doll frame (keeps size)
  const w = cv.width, h = cv.height, c = cv.getContext('2d'), im = c.getImageData(0, 0, w, h), d = im.data, s = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) s[i] = d[i * 4 + 3] > 100 ? 1 : 0;
  const q = RGB.o;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (s[i]) continue; if ((x && s[i - 1]) || (x < w - 1 && s[i + 1]) || (y && s[i - w]) || (y < h - 1 && s[i + w])) { d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 255; } }
  c.putImageData(im, 0, 0); return cv;
}
/* an <img>-ready data URL of one frame (menus) */
function dataURL(id, scale = 1) { // never throws: a picture from another origin can be drawn but not read back
  const def = defs[id] || {};
  if (def.png) return def.png;                     // a PNG sprite: the file itself works as an <img> src
  const e = entry(id); if (!e || !e.frames.length) return '';
  try { const cv = canvas(e.w * scale, e.h * scale), c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(e.frames[0], 0, 0, cv.width, cv.height); return cv.toDataURL(); }
  catch (err) { return ''; }
}

PX.palette = PALETTE;
PX.sprites = { define, draw, ready, size, entry, doll, quantize, gridToCanvas, rectsToCanvas, dataURL, missing, defs, has: id => !!defs[id] };
PX.drawSprite = draw;
})();
