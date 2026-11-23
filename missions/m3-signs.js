/* LAN OR DIE – Mission 3 shop and house signs: cartoon sign boards with chains and a lit glow at night, striped scalloped awnings over shop doors,
   hanging name planks with pennants for the hero houses (locked / open). Everything comes from data/m3-data.js → signs, signStyle.
   window.M3_SIGNS(K) → { draw(ctx, t, x0, y0, x1, y1) }. Called once per frame in map (world) coordinates, after the map layer. */
window.M3_SIGNS = function (K) {
'use strict';
const { D, T, HERO, rel } = K;
const R = D.raw, ST = () => R.signStyle || {};
const doorCache = new Map();
const lit = () => !!(K.PPL && K.PPL.isNight && K.PPL.isNight());
function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; };

/* door tiles ('r') close to a sign: the awning goes over them */
function doorsFor(s) {
  const key = s.text + s.at; if (doorCache.has(key)) return doorCache.get(key);
  const out = [], cx = Math.round(s.at[0] - .5), cy = Math.round(s.at[1]);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (K.tile(cx + dx, cy + dy) === 'r') out.push([cx + dx, cy + dy]);
  let res = null;
  if (out.length) { const y = out[0][1], row = out.filter(d => d[1] === y), xs = row.map(d => d[0]); res = { x0: Math.min(...xs), x1: Math.max(...xs) + 1, y }; }
  doorCache.set(key, res); return res;
}

function awning(c, d, cols, t) {
  const x0 = d.x0 * T - 5, w = (d.x1 - d.x0) * T + 10, y = d.y * T - 1, h = 7, sw = 5, n = Math.ceil(w / sw);
  c.save();
  c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(x0 + 1, y + h + 1, w, 3);                                 // shadow on the wall
  for (let i = 0; i < n; i++) {
    const x = x0 + i * sw, col = cols[i % cols.length];
    c.fillStyle = col; c.fillRect(x, y, sw, h);
    c.beginPath(); c.arc(x + sw / 2, y + h, sw / 2, 0, Math.PI); c.fill();                               // scallop
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x, y, sw, 1);
  }
  c.strokeStyle = '#1F2A44'; c.lineWidth = 1; c.strokeRect(x0 + .5, y + .5, w - 1, h - 1);
  c.restore();
}

function board(c, s, t, night) {
  const [sx, sy] = s.at, st = ST(), x = sx * T, y = sy * T - 3 - (s.up || 0), fg = s.fg || '#fff', bg = s.bg || '#333';
  c.font = '400 7px Bungee, Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const ico = s.icon ? 9 : 0, tw = c.measureText(s.text).width, w = Math.round(tw + 10 + ico), h = 12, bx = Math.round(x - w / 2), by = y - 6;
  if (night && s.glow !== false) {                                                                       // a soft lit halo
    const flick = s.flicker ? .75 + .25 * Math.sin(t * 9 + sx) * Math.sin(t * 3.1) : 1, g = c.createRadialGradient(x, y, 2, x, y, w * .9 + 14);
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (st.glow != null ? st.glow : .5) * flick;
    g.addColorStop(0, s.glowCol || fg); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - w, y - 30, w * 2, 60); c.restore();
  }
  c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, bx + 1, by + 2, w, h, 3); c.fill();                              // drop shadow
  c.strokeStyle = '#6b6b78'; c.lineWidth = 1;                                                           // two little chains up to the wall
  c.beginPath(); c.moveTo(bx + 4, by); c.lineTo(bx + 4, by - 3); c.moveTo(bx + w - 4, by); c.lineTo(bx + w - 4, by - 3); c.stroke();
  c.fillStyle = '#1F2A44'; rr(c, bx - 1, by - 1, w + 2, h + 2, 3.5); c.fill();                           // dark outline
  c.fillStyle = bg; rr(c, bx, by, w, h, 3); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(bx + 2, by + 1, w - 4, 2);                           // shine
  c.strokeStyle = fg; c.globalAlpha = .55; c.lineWidth = .8; rr(c, bx + 1.5, by + 1.5, w - 3, h - 3, 2); c.stroke(); c.globalAlpha = 1;
  if (s.icon) { c.font = '8px sans-serif'; c.fillText(s.icon, bx + 7, y + .5); c.font = '400 7px Bungee, Impact, sans-serif'; }
  const tx = x + ico / 2;
  c.lineJoin = 'round'; c.lineWidth = 2; c.strokeStyle = shade(bg.length === 7 ? bg : '#333333', .45); c.strokeText(s.text, tx, y + .6); c.fillStyle = night ? '#fff' : fg; c.fillText(s.text, tx, y + .6);
}

/* a hero house: a hanging name plank, two pennants, and whether the door is open to you */
function house(c, id, h, t, night) {
  const hero = HERO[id]; if (!hero) return;
  const open = K.houseOpen(id), cx = (h.door[0] + (h.doorW || 2) / 2) * T, top = h.door[1] * T - 12, col = hero.col || '#ffd23a', st = ST();
  const name = (h.sign || h.name).toUpperCase(), sub = open ? (K.heroId() === h.hero ? 'HOME' : 'OPEN') : '🔒 LV ' + h.level;
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const sx of [-1, 1]) {                                                                           // pennants waving beside the door
    const px = cx + sx * ((h.doorW || 2) * T / 2 + 5), w = Math.sin(t * 3 + sx) * 1.4;
    c.fillStyle = '#6d4a26'; c.fillRect(px - .5, top - 4, 1.4, 20);
    c.fillStyle = col; c.beginPath(); c.moveTo(px + .9, top - 3); c.lineTo(px + sx * 9 + w, top + 1); c.lineTo(px + .9, top + 5); c.closePath(); c.fill();
    c.strokeStyle = '#1F2A44'; c.lineWidth = .7; c.stroke();
  }
  c.font = '400 6px Bungee, Impact, sans-serif';
  const w = Math.max(c.measureText(name).width, c.measureText(sub).width) + 10, bx = Math.round(cx - w / 2);
  if (night) { const g = c.createRadialGradient(cx, top + 4, 2, cx, top + 4, w); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .35; c.fillStyle = g; c.fillRect(cx - w, top - 14, w * 2, 36); c.restore(); }
  c.strokeStyle = '#6d4a26'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx + 3, top - 4); c.lineTo(bx + 3, top); c.moveTo(bx + w - 3, top - 4); c.lineTo(bx + w - 3, top); c.stroke();
  c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, bx + 1, top + 1, w, 15, 2); c.fill();
  c.fillStyle = '#1F2A44'; rr(c, bx - 1, top - 1, w + 2, 17, 3); c.fill();
  c.fillStyle = '#8a6236'; rr(c, bx, top, w, 15, 2); c.fill();
  c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 3; i < 15; i += 4) c.fillRect(bx + 1, top + i, w - 2, 1);   // wood grain
  c.lineJoin = 'round'; c.fillStyle = col; c.strokeStyle = '#1F2A44'; c.lineWidth = 1.6; c.strokeText(name, cx, top + 4.5); c.fillText(name, cx, top + 4.5);
  c.font = '400 5px Bungee, Impact, sans-serif'; c.fillStyle = open ? '#9cf0b4' : '#ffb0a8'; c.strokeText(sub, cx, top + 11.2); c.fillText(sub, cx, top + 11.2);
  c.restore();
}

function draw(ctx, t, x0, y0, x1, y1) {
  const night = lit();
  for (const s of (R.signs || [])) {
    if (s.release && !rel(s)) continue;
    const y = s.at[1] * T;
    if (y < y0 - 30 || y > y1 + 30 || s.at[0] * T < x0 - 80 || s.at[0] * T > x1 + 80) continue;
    let up = 0;
    if (s.awning !== false) { const d = doorsFor(s); if (d) { awning(ctx, d, s.awning && s.awning.length ? s.awning : [s.bg || '#c33', '#fbf6e8'], t); up = 7; } }
    board(ctx, Object.assign({}, s, { up }), t, night);
  }
  for (const id in (R.houses || {})) { const h = R.houses[id]; if (!rel(h)) continue; const y = h.door[1] * T; if (y < y0 - 40 || y > y1 + 40 || h.door[0] * T < x0 - 80 || h.door[0] * T > x1 + 80) continue; house(ctx, id, h, t, night); }
}
return { draw, doorsFor };
};
