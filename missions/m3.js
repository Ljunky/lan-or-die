/* LAN OR DIE – Mission 3: Bad Trip at Maxi. Needs engine.js, engine/*.js (PX kit), data/m3-data.js and missions/m3-systems.js first.
   A GBA-style creature RPG at ICA Maxi Åkersberga. ALL content (creatures, items, NPCs, gyms, graves, dealer, apps) is in data/m3-data.js.
   This file is the rules: map, battles, overworld, save. Systems (traps, cemetery, gym, dealer, phone, fillers) are in m3-systems.js.
   No round limit (noTimer), autosave per player (save), score = goals counted once (submitOnSave). Test hooks: window.__m3. */
(() => {
'use strict';
const { clamp, rand, pick, fmt, mmss, esc } = LOD;
const FX = PX.fx, EF = PX.effects;
const T = 16, MW = 48, MH = 74; // tile size and map size in tiles
let G = null, B = null;

/* ===================== DATA ===================== */
const SCHEMA = {
  creatures: { req: ['name', 'type', 'rarity', 'stats', 'moves'], enums: { rarity: ['C', 'U', 'R', 'E', 'L', 'M', 'H'] }, refs: { moves: 'moves' }, art: 'art' },
  moves: { req: ['name'] },
  items: { req: ['kind', 'name'], enums: { kind: ['throwable', 'trap', 'lure', 'weapon', 'drug', 'app', 'key'] }, nums: ['price', 'waitMin', 'tier'], refs: { upgradesTo: 'items', rare: 'creatures', spawn: 'creatures' } },
  heroes: { req: ['name', 'team', 'at', 'look'], refs: { team: 'creatures', moves: 'moves' } },
  partners: { req: ['name', 'guy', 'at', 'look'], refs: { guy: 'heroes' } },
  npcs: { req: ['name', 'role', 'at'], enums: { role: ['talker', 'merchant', 'trainer', 'gym', 'dealer', 'filler', 'fence'] }, refs: { shop: 'items', party: 'creatures' } },
  zones: { req: ['name', 'r'], refs: { enc: 'creatures' } },
  apps: { req: ['name', 'icon', 'lines'] }
};
const D = PX.data.load(window.M3_DATA, SCHEMA, { today: LOD.today, devAll: LOD.dev, flag: f => !!(G && G.flags && G.flags[f]) });
const CFG = D.raw.tuning, TY = D.raw.types, TYPES = TY.cycle, TCOL = TY.colors;
const MOVES = D.raw.moves, HERO = D.raw.heroes, PARTNERS = D.raw.partners, ITEMS = D.raw.items, NPCS = D.raw.npcs, ZONE_DEFS = D.raw.zones;
const HERO_IDS = Object.keys(HERO);
const rel = e => D.released(e);
let TEST_SPEED = 1, TRAP_SPEED = 1;

/* species table = creatures + every person who can fight (heroes, wives, NPCs), built from data */
const SP = {};
for (const id in D.raw.creatures) SP[id] = Object.assign({ kind: 'creature' }, D.raw.creatures[id]);
const NPC_STATS = [58, 54, 56, 54], NPC_MOVES = [['slam', 1], ['peck', 1], ['guilt', 6]];
for (const id in HERO) SP['h_' + id] = { kind: 'hero', ref: id, name: HERO[id].name, type: 'MIND', rarity: 'H', stats: HERO[id].stats || NPC_STATS, moves: HERO[id].moves || NPC_MOVES, likes: HERO[id].likes, epitaph: HERO[id].epitaph, desc: HERO[id].after };
for (const id in PARTNERS) SP['w_' + id] = { kind: 'wife', ref: id, name: PARTNERS[id].name, type: 'MIND', rarity: 'H', stats: PARTNERS[id].stats || NPC_STATS, moves: PARTNERS[id].fightMoves || NPC_MOVES, likes: PARTNERS[id].likes, epitaph: PARTNERS[id].epitaph, wife: true };
for (const id in NPCS) SP['n_' + id] = { kind: 'npc', ref: id, name: NPCS[id].name, type: 'MIND', rarity: 'H', stats: NPCS[id].stats || NPC_STATS, moves: NPCS[id].moves || NPC_MOVES, likes: NPCS[id].likes, epitaph: NPCS[id].epitaph };
SP.dev = { kind: 'boss', name: 'Dev Ljunky', type: 'MIND', rarity: 'L', stats: [80, 70, 64, 60], moves: [['glitch', 1], ['patch', 1], ['hotfix', 1], ['spawn', 1]], hidden: true };
const isCreature = sp => SP[sp] && SP[sp].kind === 'creature';
const SPECIES = () => Object.keys(D.raw.creatures).filter(id => rel(D.raw.creatures[id]) || G && G.caught[id]);
const ZONES = Object.keys(ZONE_DEFS).map(id => Object.assign({ id }, ZONE_DEFS[id]));

/* ===================== SPRITES ===================== */
const LOOK = o => Object.assign({ skin: '#eebd96', legs: '#34343c', shoes: '#222', style: 'short' }, o);
function dollSpec(L) { // a data "look" -> a paper-doll spec
  L = LOOK(L);
  const skirt = L.topStyle === 'dress' || L.topStyle === 'gown', bare = L.topStyle === 'tee' || skirt;
  return {
    legs: L.topStyle === 'gown' ? 'gown' : skirt ? 'skirt' : 'base', body: L.topStyle === 'dress' ? 'dress' : L.big ? 'big' : 'base',
    top: ['stripe', 'plaid', 'armor', 'blazer'].includes(L.topStyle) ? L.topStyle : L.necklace ? 'necklace' : null, arms: L.big ? 'big' : 'base', head: true, face: true,
    glasses: L.glasses ? true : null, beard: L.beard ? true : null, stache: L.stache ? true : null, patch: L.patch ? true : null, freckles: L.freckles ? true : null,
    hair: L.style, prop: L.prop || null,
    colors: { skin: L.skin, hair: L.hair || L.skin, top: L.top, top2: L.top2 || L.top, legs: L.legs, shoes: L.shoes, arm: bare ? L.skin : L.top, cap: L.cap, cap2: L.cap2, beard: L.beard }
  };
}
function dollOf(look) { return PX.sprites.doll(D.raw.dollParts, dollSpec(look), { w: 16, h: 24, offset: [2, 3], views: ['down', 'up', 'side'], mid: 6, order: ['legs', 'body', 'top', 'arms', 'head', 'face', 'freckles', 'beard', 'stache', 'glasses', 'patch', 'hair', 'prop'], eyes: [[6, 7, 1, 1], [9, 7, 1, 1]] }); }
/* a person at battle size: the paper doll scaled 2x into 48x48 (same canvas size as creatures) */
const personBattle = {};
function battleDoll(key, look) {
  if (personBattle[key]) return personBattle[key];
  const d = dollOf(look), e = PX.sprites.entry(d); if (!e) return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 48; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(e.frames[0], 8, 0, 32, 48);
  return (personBattle[key] = PX.sprites.define('battle:' + key, { canvas: cv, eyes: [[20, 14, 2, 2], [26, 14, 2, 2]] }));
}
const DEV_LOOK = Object.assign({}, HERO.ljunky.look, { hair: '#3dff8a', top: '#2a0a3a', legs: '#111', glasses: 1 });
function lookOf(sp) {
  const s = SP[sp]; if (!s) return null;
  if (sp === 'dev') return DEV_LOOK;
  if (s.kind === 'hero') return HERO[s.ref].look;
  if (s.kind === 'wife') return PARTNERS[s.ref].look;
  if (s.kind === 'npc') { const d = npcDef(s.ref); return d && d.look; }
  return null;
}
for (const id in D.raw.creatures) { const c = D.raw.creatures[id]; if (c.art) PX.sprites.define('cr:' + id, { png: c.art, onMissing: (i, u) => D.warnings.push('art missing ' + u) }); }
for (const id in (D.raw.sprites || {})) PX.sprites.define(id, D.raw.sprites[id]);
function spriteOf(sp) { // creature or person -> sprite id at battle size
  const L = lookOf(sp); if (L) return battleDoll(sp, L);
  return PX.sprites.ready('cr:' + sp) ? 'cr:' + sp : null;
}
const iconCache = {};
function creatureIcon(sp) { // a menu icon. Creatures use their PNG file directly (reading pixels back can be blocked by the browser)
  if (iconCache[sp]) return iconCache[sp];
  let u = '';
  try { const c = D.raw.creatures[sp]; if (c && c.art) u = c.art; else { const id = spriteOf(sp); u = id ? PX.sprites.dataURL(id) : ''; } } catch (e) { u = ''; }
  if (u) iconCache[sp] = u; return u;
}
function drawCreature(ctx, sp, x, y, scale, o = {}) { // bottom-centre at (x, y)
  const id = spriteOf(sp); if (!id) { LOD.em('❔', x, y - 24 * scale, 20 * scale); return; }
  PX.drawSprite(ctx, id, 'idle', o.t || 0, x, y, Object.assign({ scale, idle: true }, o));
}
/* intro portrait: assets/portraits/<id>.png if it exists, else the sprite */
const portraitTried = {};
function portraitFor(id) {
  if (!portraitTried[id]) { portraitTried[id] = 1; PX.sprites.define('portrait:' + id, { png: 'assets/portraits/' + id + '.png' }); }
  return PX.sprites.ready('portrait:' + id) ? 'portrait:' + id : null;
}

/* ===================== MAP (48 x 74 tiles, built from rectangles) =====================
   Tiles: ~ water  P pier  s sand  , lawn  " tall grass (encounters)  T tree  = road  o sidewalk  . asphalt
          # wall  w shop window  _ floor  : aisle floor (encounters)  f flower beds  H shelf  F freezer  c counter  x stock-room door
          e charger  v van  k parked car  B table/bench  h hedge  r door mat  l parking line
          n cemetery fence  m cemetery ground  g cemetery gate  K gym kit (kettlebells/tyres/rower)  W WOD board  M bottle-return machine */
const MAP = [];
for (let y = 0; y < MH; y++) MAP.push(new Array(MW).fill('.'));
const fill = (x, y, w, h, ch) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (MAP[j] && i >= 0 && i < MW) MAP[j][i] = ch; };
const tile = (x, y) => (MAP[y] && MAP[y][x]) || '#';
function building(x, y, w, h, door, doorTop) {
  fill(x, y, w, h, '#'); fill(x + 1, y + 1, w - 2, h - 2, '_');
  const dy = doorTop ? y : y + h - 1; fill(door, dy, 2, 1, 'r');
  for (let i = x + 2; i < x + w - 2; i += 3) if (Math.abs(i - door) > 2 && !doorTop) MAP[dy][i] = 'w';
}
fill(0, 0, MW, 8, '~'); fill(0, 8, MW, 1, 's'); fill(22, 2, 3, 6, 'P');
fill(0, 9, MW, 11, ','); for (let y = 9; y < 20; y++) { MAP[y][0] = 'T'; MAP[y][MW - 1] = 'T'; }
fill(13, 11, 8, 3, '"'); fill(13, 16, 7, 3, '"'); fill(25, 11, 9, 3, '"'); fill(26, 16, 7, 3, '"');
for (const [x, y] of [[12, 10], [28, 17], [35, 17], [21, 11]]) MAP[y][x] = 'T';
for (const [x, y] of [[17, 12], [24, 12]]) MAP[y][x] = 'B';
// the cemetery (west lawn)
fill(1, 10, 11, 9, 'n'); fill(2, 11, 9, 7, 'm'); fill(6, 18, 1, 1, 'g');
// The Box (Ljunky's gym, east lawn)
building(37, 9, 10, 10, 41);
for (const [x, y] of [[38, 11], [38, 13], [45, 13], [45, 16], [39, 16]]) MAP[y][x] = 'K';
MAP[10][41] = 'W';
fill(0, 20, MW, 2, '=');
// ICA Maxi
building(1, 22, 31, 25, 15);
fill(2, 27, 29, 1, '#'); MAP[27][16] = 'x';
fill(2, 28, 29, 11, ':');
for (const x of [4, 7, 10, 13]) { fill(x, 29, 1, 5, 'H'); fill(x, 35, 1, 3, 'H'); }
for (const x of [16, 19]) { fill(x, 29, 1, 5, 'F'); fill(x, 35, 1, 3, 'F'); }
for (const x of [22, 25]) { fill(x, 29, 1, 5, 'H'); fill(x, 35, 1, 3, 'H'); }
fill(27, 28, 4, 11, 'f'); MAP[30][28] = 'B'; MAP[36][29] = 'B'; fill(28, 35, 2, 3, '_');
for (const x of [3, 7, 11]) fill(x, 41, 2, 2, 'c');
fill(22, 40, 9, 5, ':'); for (const x of [23, 26, 29]) MAP[41][x] = 'c';
fill(2, 23, 29, 4, '_'); for (const x of [4, 8, 24, 28]) fill(x, 23, 2, 1, 'H');
// Systembolaget + the bottle-return machines outside it
building(34, 22, 13, 11, 39);
fill(35, 23, 11, 6, ':'); for (const x of [36, 39, 42]) fill(x, 24, 1, 4, 'H'); fill(40, 30, 5, 1, 'c');
fill(44, 33, 2, 1, 'M'); MAP[34][44] = 'M';
// Apotek Hjärtat
building(34, 35, 13, 10, 39); fill(36, 38, 8, 1, 'c'); fill(35, 36, 2, 1, 'H'); fill(44, 36, 2, 1, 'H');
fill(0, 47, MW, 1, 'o'); fill(32, 22, 2, 25, 'o'); fill(0, 48, MW, 2, '=');
fill(0, 50, MW, 14, '.');
for (const y of [51, 56, 61]) for (let x = 13; x < 33; x += 2) MAP[y][x] = 'l';
fill(13, 53, 20, 2, '"'); fill(13, 58, 20, 2, '"'); fill(1, 52, 9, 2, '"');
for (const [x, y] of [[14, 51], [20, 51], [26, 56], [16, 61], [30, 61], [22, 56]]) MAP[y][x] = 'k';
fill(36, 51, 11, 1, 'h'); for (const x of [38, 41, 44]) MAP[52][x] = 'e'; fill(36, 56, 11, 3, '"');
fill(3, 60, 3, 2, 'v');
fill(0, 64, MW, 1, 'o');
building(1, 65, 11, 9, 5, true); fill(2, 70, 9, 1, 'c'); fill(2, 66, 4, 3, ':'); MAP[67][8] = 'B';
building(12, 65, 11, 9, 16, true); fill(13, 70, 9, 1, 'c'); MAP[67][14] = 'B'; MAP[67][20] = 'B';
building(23, 65, 11, 9, 27, true); fill(24, 70, 9, 1, 'c'); MAP[67][25] = 'B'; MAP[67][31] = 'B';
building(34, 65, 13, 9, 39, true); for (const x of [36, 40, 44]) MAP[70][x] = 'B';

const SOLID = new Set(['~', 'T', '#', 'w', 'H', 'F', 'c', 'x', 'e', 'v', 'k', 'B', 'h', 'n', 'K', 'W', 'M']);
const ENC_TILES = new Set(['"', ':', 'f']);
const cemeteryOpen = () => rel(ZONE_DEFS.cemetery);
function solidAt(px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T), ch = tile(tx, ty);
  if (ch === 'x') return !(G && G.beat && G.beat.length >= 4);
  if (ch === 'g') return !cemeteryOpen();
  if (ch === 'r' && S.blocked(tx, ty)) return true;
  return SOLID.has(ch);
}
function zoneAt(px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  return ZONES.find(z => tx >= z.r[0] && tx < z.r[0] + z.r[2] && ty >= z.r[1] && ty < z.r[1] + z.r[3]) || ZONES[ZONES.length - 1];
}
function zoneTiles(id) {
  const z = ZONES.find(q => q.id === id), out = [];
  for (let y = z.r[1]; y < z.r[1] + z.r[3]; y++) for (let x = z.r[0]; x < z.r[0] + z.r[2]; x++) if (!SOLID.has(tile(x, y)) && tile(x, y) !== 'r') out.push([x, y]);
  return out;
}
const tc = (tx, ty) => [tx * T + T / 2, ty * T + T / 2];
const SIGNS = [
  [16.5, 46, 'ICA MAXI', '#e3000f', '#fff'], [40, 32, 'SYSTEMBOLAGET', '#0a6e3a', '#ffd23a'], [40, 44, 'APOTEK HJÄRTAT', '#2fa36b', '#fff'],
  [6, 65, 'IRON BURGER', '#222', '#f39c34'], [17, 65, 'PIZZERIA BERGA', '#b02a1e', '#fff'], [28, 65, 'J&K99 SUSHI', '#1c2a36', '#ff6b6b'],
  [40, 65, "TAILOR'S BARBER", '#3a2a4a', '#f4e08a'], [41.5, 50.5, 'E.ON', '#e3000f', '#fff'], [16.5, 27, 'STOCK ROOM', '#333', '#ff5a5a'],
  [42, 18.6, 'THE BOX', '#111', '#f7931a'], [6.5, 18.6, 'CEMETERY', '#3a3a44', '#d8d8e0'], [44.5, 32.7, 'PANT', '#2e7d32', '#fff']
];
let mapCv = null;
function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }
function renderMap() {
  const cv = document.createElement('canvas'); cv.width = MW * T; cv.height = MH * T;
  const c = cv.getContext('2d'), R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const ch = MAP[ty][tx], x = tx * T, y = ty * T, n = hash(tx, ty);
    const floor = () => { R(x, y, T, T, (tx + ty) % 2 ? '#e6e0d2' : '#ddd6c6'); };
    const gymFloor = () => { R(x, y, T, T, '#2a2a30'); R(x, y, T, 1, '#34343c'); };
    const inBox = tx >= 37 && tx <= 46 && ty >= 9 && ty <= 18;
    switch (ch) {
      case '~': R(x, y, T, T, '#2f6fb0'); R(x + (n * 10 | 0), y + 4 + (n * 8 | 0), 4, 1, '#5b9be0'); break;
      case 'P': R(x, y, T, T, '#8a6236'); for (let i = 0; i < T; i += 4) R(x, y + i, T, 1, '#6d4a26'); break;
      case 's': R(x, y, T, T, '#e8d49a'); R(x + (n * 12 | 0), y + (n * 9 | 0) + 3, 1, 1, '#c9b070'); break;
      case ',': R(x, y, T, T, '#6cbf4a'); if (n > .6) { R(x + 4, y + 6, 1, 2, '#4f9a34'); R(x + 10, y + 10, 1, 2, '#4f9a34'); } break;
      case '"': R(x, y, T, T, '#3f9a34'); for (let i = 0; i < 4; i++) { const gx = x + 1 + i * 4, gy = y + 2 + (i % 2) * 6; R(gx, gy, 1, 6, '#2c7424'); R(gx + 1, gy - 1, 1, 6, '#7ed35a'); R(gx + 2, gy + 1, 1, 5, '#2c7424'); } break;
      case 'T': R(x, y, T, T, '#6cbf4a'); R(x + 6, y + 10, 4, 6, '#6d4a26'); c.fillStyle = '#2f7d2a'; c.beginPath(); c.arc(x + 8, y + 7, 7, 0, 7); c.fill(); c.fillStyle = '#4ea83e'; c.beginPath(); c.arc(x + 6, y + 5, 3, 0, 7); c.fill(); break;
      case '=': R(x, y, T, T, '#4a4e58'); if (tx % 3 === 0 && (ty === 21 || ty === 49)) R(x + 2, y, 8, 1, '#e8e2c8'); break;
      case 'o': R(x, y, T, T, '#b8b4aa'); R(x, y, T, 1, '#9e9a90'); R(x, y, 1, T, '#9e9a90'); break;
      case '.': case 'l': R(x, y, T, T, '#5b6069'); if (n > .85) R(x + 5, y + 9, 2, 1, '#6c717b'); if (ch === 'l') R(x + 7, y, 2, T, '#e8e2c8'); break;
      case '#': R(x, y, T, T, '#8f2a2a'); R(x, y, T, 3, '#b8403a'); R(x, y + T - 1, T, 1, '#5a1a1a'); if (ty >= 65 || (tx >= 34 && ty < 47)) { R(x, y, T, T, '#6d6a72'); R(x, y, T, 3, '#8d8a92'); } if (inBox) { R(x, y, T, T, '#1d1d24'); R(x, y, T, 3, '#3a3a44'); if ((tx + ty) % 3 === 0) R(x + 3, y + 6, 10, 2, '#f7931a'); } break;
      case 'w': R(x, y, T, T, '#6d6a72'); R(x + 1, y + 3, T - 2, T - 5, '#9fd3ea'); R(x + 3, y + 4, 2, 6, '#d6f0fa'); if (inBox) R(x, y, T, 3, '#1d1d24'); break;
      case 'r': floor(); R(x + 1, y + 2, T - 2, T - 4, '#6d4a3a'); break;
      case '_': if (inBox) gymFloor(); else floor(); break;
      case ':': floor(); R(x, y + 7, T, 2, 'rgba(0,0,0,.05)'); break;
      case 'f': R(x, y, T, T, '#7a5a3a'); for (let i = 0; i < 3; i++) { const fx = x + 2 + i * 5, fy = y + 3 + (i % 2) * 6; R(fx, fy + 2, 1, 4, '#3f9a34'); R(fx - 1, fy, 3, 2, ['#ff6b9a', '#ffd23a', '#c06bff'][(tx + ty + i) % 3]); } break;
      case 'H': floor(); R(x + 1, y, T - 2, T, '#6d5a4a'); for (let i = 1; i < T; i += 5) R(x + 2, y + i, T - 4, 3, ['#e3000f', '#ffd23a', '#2fa3d8', '#5fae3e', '#f39c34'][(tx * 3 + ty + i) % 5]); break;
      case 'F': floor(); R(x + 1, y, T - 2, T, '#cfe8f3'); R(x + 2, y + 1, T - 4, T - 2, '#9fd3ea'); R(x + 3, y + 3, 4, 3, '#7ed35a'); R(x + 8, y + 9, 4, 3, '#f4f4f4'); break;
      case 'c': floor(); R(x, y + 2, T, T - 4, '#3a3a44'); R(x, y + 2, T, 2, '#5a5a66'); R(x + 3, y + 5, 5, 3, '#1c2a36'); break;
      case 'x': R(x, y, T, T, '#555'); R(x + 2, y + 1, T - 4, T - 1, '#7a5a3a'); R(x + 10, y + 8, 2, 2, '#ffd23a'); break;
      case 'e': R(x, y, T, T, '#5b6069'); R(x + 4, y, 8, T, '#e8eef3'); R(x + 5, y + 2, 6, 4, '#1c2a36'); R(x + 6, y + 3, 4, 2, '#5ff0a0'); R(x + 4, y + T - 2, 8, 2, '#e3000f'); break;
      case 'v': R(x, y, T, T, '#5b6069'); break;
      case 'k': { R(x, y, T, T, '#5b6069'); const col = ['#c8262e', '#2f6fd0', '#e8eef3', '#222', '#3ddc84'][(tx + ty) % 5]; R(x + 1, y + 1, T - 2, T - 2, col); R(x + 3, y + 3, T - 6, 4, '#9fd3ea'); R(x + 3, y + 10, T - 6, 3, 'rgba(0,0,0,.25)'); break; }
      case 'B': if (ty >= 65 || (tx >= 13 && tx <= 31 && ty > 20 && ty < 47)) { floor(); R(x + 2, y + 3, 12, 10, '#8a6236'); R(x + 2, y + 3, 12, 2, '#a87a48'); } else { R(x, y, T, T, ty < 20 ? '#6cbf4a' : '#e6e0d2'); R(x + 1, y + 6, 14, 3, '#8a6236'); R(x + 2, y + 9, 2, 4, '#5a3a20'); R(x + 12, y + 9, 2, 4, '#5a3a20'); } break;
      case 'h': R(x, y, T, T, '#2f7d2a'); R(x, y, T, 3, '#4ea83e'); break;
      case 'n': R(x, y, T, T, '#5f9a44'); R(x, y + 6, T, 2, '#3a3a44'); for (let i = 1; i < T; i += 5) R(x + i, y + 2, 2, 12, '#3a3a44'); break;
      case 'm': R(x, y, T, T, (tx + ty) % 2 ? '#5f9a44' : '#58903f'); if (n > .7) R(x + 4, y + 9, 1, 2, '#3f7a2e'); break;
      case 'g': R(x, y, T, T, '#58903f'); R(x, y + 2, 2, 12, '#3a3a44'); R(x + 14, y + 2, 2, 12, '#3a3a44'); break;
      case 'K': gymFloor(); { const k = (tx + ty) % 3; if (k === 0) { R(x + 2, y + 6, 5, 6, '#111'); R(x + 3, y + 3, 3, 3, '#444'); R(x + 9, y + 6, 5, 6, '#111'); R(x + 10, y + 3, 3, 3, '#444'); } else if (k === 1) { c.fillStyle = '#111'; c.beginPath(); c.arc(x + 8, y + 8, 7, 0, 7); c.fill(); c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(x + 8, y + 8, 3, 0, 7); c.fill(); } else { R(x + 1, y + 9, 14, 3, '#3a3a44'); R(x + 3, y + 5, 4, 4, '#555'); R(x + 11, y + 7, 3, 2, '#f7931a'); } } break;
      case 'W': R(x, y, T, T, '#1d1d24'); R(x + 1, y + 1, T - 2, T - 4, '#f4f4f4'); for (let i = 0; i < 4; i++) R(x + 3, y + 3 + i * 2, 6 + (i % 2) * 3, 1, i ? '#2f6fd0' : '#e3000f'); break;
      case 'M': R(x, y, T, T, '#5b6069'); R(x + 1, y, T - 2, T - 1, '#2e7d32'); R(x + 3, y + 3, T - 6, 5, '#1c2a36'); R(x + 5, y + 10, 6, 3, '#111'); R(x + 3, y + 1, T - 6, 1, '#7ed35a'); break;
    }
  }
  R(3 * T + 1, 60 * T + 2, 3 * T - 2, 2 * T - 4, '#e8eef3'); R(3 * T + 1, 60 * T + 2, 3 * T - 2, 3, '#c9ced6');
  R(3 * T + 32, 60 * T + 6, 12, 8, '#3a4a5a'); R(3 * T + 4, 60 * T + 20, 30, 3, '#f7931a');
  c.fillStyle = '#222'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('LAN VAN', 3 * T + 20, 60 * T + 16);
  return cv;
}

/* ===================== UI: GBA text box + one-tap menus + bag button ===================== */
const CSS = `
#m3ui{position:absolute;inset:0;pointer-events:none}
/* the box lives in .m3wrap. Docked (speech, battle): a strip at the bottom. Centered (menus on the map, long texts):
   .m3wrap covers the screen and scrolls like a page (same idea as the start screen), the card sits in the middle. */
#m3ui .m3wrap{position:absolute;left:0;right:0;bottom:0;max-height:62%;display:flex;flex-direction:column;justify-content:flex-end;pointer-events:none;
  padding:0 max(8px,env(safe-area-inset-left,0px)) calc(10px + env(safe-area-inset-bottom,0px))}
#m3ui.center .m3wrap{top:0;max-height:none;justify-content:flex-start;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;
  pointer-events:auto;padding:64px 12px 28px;background:radial-gradient(ellipse at center,rgba(8,12,20,.5),rgba(8,12,20,.78))}
#m3ui .m3box{position:relative;pointer-events:auto;background:#fbf6e8;color:#1c1c2a;border:4px solid #1F2A44;border-radius:12px;box-shadow:0 0 0 3px #fbf6e8,0 8px 24px rgba(0,0,0,.55);
  padding:10px 12px 12px;font:700 17px/1.32 Barlow,system-ui,sans-serif;overflow-y:auto;min-height:0;touch-action:pan-y;-webkit-user-select:none;user-select:none}
#m3ui.center .m3box{margin:auto;width:100%;max-width:440px;flex:none;overflow:visible;animation:m3pop .16s ease-out}
@keyframes m3pop{from{transform:scale(.96);opacity:0}to{transform:none;opacity:1}}
#m3ui .m3txt{min-height:46px;white-space:pre-line;position:relative;padding-right:16px}
#m3ui.center .m3txt{min-height:0}
#m3ui .m3txt.more::after{content:'▼';position:absolute;right:0;bottom:-2px;font-size:12px;color:#e3000f;animation:m3b .7s infinite alternate}
@keyframes m3b{to{transform:translateY(3px)}}
#m3ui .m3who{display:inline-block;font:400 13px Bungee,Impact,sans-serif;color:#fff;background:#1F2A44;border-radius:6px;padding:2px 8px;margin-bottom:4px}
#m3ui .m3grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}
#m3ui .m3grid.one{grid-template-columns:minmax(0,1fr)}
#m3ui .m3grid:empty{display:none}
#m3ui .m3hint{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);font:700 13px Barlow,sans-serif;color:#fbf6e8;background:#1F2A44;
  border:2px solid #fbf6e8;border-radius:12px;padding:3px 12px;pointer-events:none;animation:m3b .7s infinite alternate}
#m3ui .m3grid button{font:700 16px/1.15 Barlow,system-ui,sans-serif;min-height:50px;border-radius:9px;border:2px solid #1F2A44;background:#fff;color:#1c1c2a;
  text-align:left;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:8px;touch-action:manipulation;min-width:0;height:auto}
#m3ui .m3grid button>span{min-width:0;overflow-wrap:break-word}
#m3ui .m3grid button:active{background:#ffe9a8}
#m3ui .m3grid button[disabled]{opacity:.42}
#m3ui .m3grid button.hot{background:#ffd23a;border-color:#8a6a00}
#m3ui .m3grid button.back{background:#e8ecf2}
#m3ui .m3grid button.bad{background:#2a1a1a;color:#fbf6e8;border-color:#8f1d22}
#m3ui .m3grid button small{display:block;font-weight:600;font-size:12px;opacity:.72}
#m3ui .m3grid button small.unk{letter-spacing:.2em}
#m3ui .m3grid button img{width:34px;height:34px;image-rendering:pixelated;flex:none}
#m3ui .m3grid button .ty{display:inline-block;white-space:nowrap;vertical-align:2px;font:400 10px Bungee,Impact,sans-serif;color:#fff;border-radius:4px;padding:1px 4px;margin-left:4px}
#m3ui .m3grid button .hp{display:block;height:5px;border-radius:3px;background:#ddd;margin-top:3px;overflow:hidden}
#m3ui .m3grid button .hp i{display:block;height:100%;background:#3ddc84}
#m3ui .m3bag{position:absolute;right:max(14px,env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));width:66px;height:66px;border-radius:50%;
  pointer-events:auto;font-size:30px;border:3px solid #1F2A44;background:#fbf6e8;box-shadow:0 4px 14px rgba(0,0,0,.5);cursor:pointer;touch-action:manipulation}
#m3ui .m3bag small{display:block;font:400 9px Bungee,Impact,sans-serif;margin-top:-4px;color:#1F2A44}
#scr-brief.m3solid{background:rgba(10,16,22,.55)}
#scr-brief.m3solid .inner{background:#fbf6e8;color:#1c1c2a;border:4px solid #1F2A44;border-radius:14px;box-shadow:0 0 0 3px #fbf6e8,0 12px 40px rgba(0,0,0,.6);padding:18px 18px 16px}
#scr-brief.m3solid .eyebrow{color:#5a6478}#scr-brief.m3solid h2{color:#1F2A44}
#scr-brief.m3solid .card{background:#fff;border:2px solid #1F2A44;color:#1c1c2a}
#scr-brief.m3solid ul.tips li b{color:#e3000f}#scr-brief.m3solid .note{color:#5a6478}
#scr-brief.m3solid .btn.ghost{color:#1F2A44;border-color:#1F2A44}
`;
const ui = {};
let FLOW = 0, pending = null;
const waits = [];
function sleep(s) { const tok = FLOW; return new Promise(res => waits.push({ t: s, res: () => { if (tok === FLOW) res(); } })); }
function tickWaits(dt) { dt *= TEST_SPEED; for (const w of waits.slice()) { w.t -= dt; if (w.t <= 0) { waits.splice(waits.indexOf(w), 1); w.res(); } } }
function buildUI() {
  if (ui.root) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'm3ui'; root.hidden = true;
  root.innerHTML = '<div class="m3wrap"><div class="m3box" hidden><div class="m3txt"></div><div class="m3grid"></div></div></div><div class="m3hint" hidden>▼ more</div><button class="m3bag" aria-label="Bag" hidden>🎒<small>BAG</small></button>';
  LOD.cv.after(root);
  Object.assign(ui, { root, wrap: root.querySelector('.m3wrap'), box: root.querySelector('.m3box'), txt: root.querySelector('.m3txt'), grid: root.querySelector('.m3grid'), bag: root.querySelector('.m3bag'), hint: root.querySelector('.m3hint') });
  ui.wrap.addEventListener('scroll', scrollHint, { passive: true }); ui.box.addEventListener('scroll', scrollHint, { passive: true });
  ui.wrap.addEventListener('click', e => { if (e.target === ui.wrap && pending && pending.say) pending.res(); });
  ui.box.addEventListener('click', e => { if (!e.target.closest('button') && pending && pending.say) pending.res(); });
  ui.grid.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled || !pending || pending.say) return;
    LOD.tone(880, .04, 'square', .05); LOD.haptic('light');
    pending.res(pending.vals[+b.dataset.i]);
  });
  ui.bag.addEventListener('click', () => { if (G && G.mode === 'play' && G.scene === 'map') bagMenu(); });
  const sync = () => {
    const on = LOD.M === DEF && G && LOD.G === G && (G.mode === 'play' || G.mode === 'pause') && G.started;
    if (root.hidden === on) root.hidden = !on;
    const bagOn = on && G.scene === 'map' && G.mode === 'play';
    if (ui.bag.hidden === bagOn) ui.bag.hidden = !bagOn;
    requestAnimationFrame(sync);
  };
  requestAnimationFrame(sync);
}
function hideBox() { ui.box.hidden = true; ui.grid.innerHTML = ''; pending = null; layout(false); }
/* where the box goes: menus on the map and long texts = centered card; speech and battle = docked at the bottom */
function layout(center) { ui.root.classList.toggle('center', !!center); ui.wrap.scrollTop = 0; ui.box.scrollTop = 0; requestAnimationFrame(scrollHint); }
function scrollHint() { // a "▼ more" tag while something is below the fold
  const el = ui.root.classList.contains('center') ? ui.wrap : ui.box;
  const more = !ui.box.hidden && el.scrollHeight - el.scrollTop - el.clientHeight > 8;
  if (ui.hint.hidden === more) ui.hint.hidden = !more;
}
function boxText(text, who) { ui.txt.innerHTML = (who ? '<span class="m3who">' + esc(who) + '</span><br>' : '') + esc(text); }
function say(text, o = {}) {
  const tok = FLOW;
  return new Promise(res => {
    ui.box.hidden = false; boxText(text, o.who); ui.grid.innerHTML = ''; ui.txt.classList.add('more');
    layout(o.center != null ? o.center : G.scene !== 'battle' && text.split('\n').length > 4);
    const done = () => { if (pending && pending.res === done) pending = null; ui.txt.classList.remove('more'); if (tok === FLOW) res(); };
    pending = { res: done, say: true };
    const auto = o.auto != null ? o.auto : G.scene === 'battle';
    if (auto) sleep(o.t || Math.max(1.05, .5 + text.length * .026)).then(() => { if (pending && pending.res === done) done(); });
  });
}
/* ask: text + buttons. opts = [{label, sub, unk, value, dis, cls, img, ty, hp}] -> Promise<value>.  unk = effect not learned yet ("???") */
function ask(text, opts, o = {}) {
  const tok = FLOW;
  return new Promise(res => {
    ui.box.hidden = false; boxText(text, o.who); ui.txt.classList.remove('more');
    const one = o.one != null ? o.one : G.scene !== 'battle' && (opts.length > 7 || opts.some(q => (q.label || '').length > 22)); // long lists read better in one column
    ui.grid.className = 'm3grid' + (one ? ' one' : '');
    layout(o.center != null ? o.center : G.scene !== 'battle');
    ui.grid.innerHTML = opts.map((q, i) => '<button data-i="' + i + '"' + (q.dis ? ' disabled' : '') + (q.cls ? ' class="' + q.cls + '"' : '') + '>' +
      (q.img ? '<img src="' + q.img + '" alt="">' : '') + '<span>' + esc(q.label) + (q.ty ? '<span class="ty" style="background:' + (TCOL[q.ty] || '#888') + '">' + q.ty + '</span>' : '') +
      (q.unk ? '<small class="unk">???</small>' : q.sub ? '<small>' + esc(q.sub) + '</small>' : '') + (q.hp != null ? '<span class="hp"><i style="width:' + Math.round(q.hp * 100) + '%;background:' + hpCol(q.hp) + '"></i></span>' : '') + '</span></button>').join('');
    const done = v => { if (pending && pending.res === done) pending = null; ui.grid.innerHTML = ''; if (tok === FLOW) res(v); };
    pending = { res: done, vals: opts.map(q => q.value) };
    const first = ui.grid.querySelector('button:not([disabled])'); if (first && !('ontouchstart' in window)) { try { first.focus({ preventScroll: true }); } catch (e) {} }
  });
}
const hpCol = f => f > .5 ? '#3ddc84' : f > .2 ? '#f5c242' : '#e5484d';
const say2 = (who, t) => say(t, { who, auto: false });
const BACK = (l = '‹ Back') => ({ label: l, value: null, cls: 'back' });

/* ===================== DISCOVERY: effects stay "???" until used once ===================== */
const known = id => !!(G && G.known && G.known[id]);
function learn(id, note) {
  if (!G || known(id)) return false;
  G.known[id] = 1;
  if (note) LOD.toast('📝 ' + note, 2.6);
  return true;
}
const itemNote = id => ITEMS[id] && ITEMS[id].learnedNote;
function itemOpt(id, extra = {}) { // a bag/shop button for an item
  const it = ITEMS[id], n = G.items[id] || 0;
  return Object.assign({ label: it.em + ' ' + it.name + (n > 1 ? ' ×' + n : ''), unk: !known(id), sub: itemNote(id), value: id }, extra);
}
const learnItem = id => learn(id, ITEMS[id].name + ': ' + (ITEMS[id].learnedNote || ''));
const has = id => (G.items[id] || 0) > 0;
const give = (id, n = 1) => { G.items[id] = (G.items[id] || 0) + n; };
const take = (id, n = 1) => { G.items[id] = Math.max(0, (G.items[id] || 0) - n); };
const weaponOwned = () => ['tranqScope', 'tranqDarts', 'tranq'].find(has);

/* ===================== CREATURES: stats, levels ===================== */
const heroId = () => (LOD.fighter && LOD.fighter.id) || 'ljunky';
const typeOf = c => c.t || (SP[c.sp] ? SP[c.sp].type : 'MIND');
function mk(sp, lv) { const c = { sp, lv: clamp(Math.round(lv), 1, CFG.LV_MAX), xp: 0, hp: 1 }; c.hp = maxHp(c); return c; }
function baseStat(c, i) { const s = SP[c.sp] || SP.frog, b = s.stats[i] * (CFG.RARITY_STAT[s.rarity] || 1); return i === 0 ? Math.floor(b * c.lv / 25 * 1.4) + c.lv + 12 : Math.floor(b * c.lv / 25 * 1.3) + 5; }
const maxHp = c => Math.round(baseStat(c, 0) * (c.hpMul || 1));
const xpNeed = lv => Math.round(CFG.XP_BASE + CFG.XP_SQ * lv * lv);
const learned = c => (SP[c.sp] || SP.frog).moves.filter(m => m[1] <= c.lv && MOVES[m[0]]).map(m => m[0]).slice(-4);
const stageMul = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
const cname = c => c.partner ? PARTNERS[c.partner].name : c.nick || (SP[c.sp] ? SP[c.sp].name : c.sp);
const active = () => G.party[B.me];
const curFoe = () => B.foes[B.fi];
function eff(a, d) {
  if (!a || !d || a === 'MIND' || d === 'MIND') return 1;
  const ia = TYPES.indexOf(a), id = TYPES.indexOf(d); if (ia < 0 || id < 0) return 1;
  let m = (ia + 1) % TYPES.length === id ? TY.strong : (id + 1) % TYPES.length === ia ? TY.weak : 1;
  if (B && B.reversed && m !== 1) m = m > 1 ? TY.weak : TY.strong;
  return m;
}
/* the player's own effects (drinks, drugs, food) live on G.me.fx and are saved */
function statFx(k) { let s = 0; for (const f of EF.all(G.me, 'stat')) if (f.value && f.value[k]) s += f.value[k] * (f.n || 1); return s; }
const gameSpeed = () => clamp(1 + EF.sum(G.me, 'speed'), .35, 4);
function eStat(c, k, side) {
  if (side === 'me' && B.swap && (k === 'atk' || k === 'def')) k = k === 'atk' ? 'def' : 'atk';
  let v = baseStat(c, { atk: 1, def: 2, spd: 3 }[k]), s = (c.stg && c.stg[k]) || 0;
  if (side === 'me') { s += statFx(k); if (k === 'def' && B.pants) s -= 2; if (k === 'spd' && B.jungle) v *= .8; }
  return v * stageMul(clamp(s, -6, 6));
}
function partyLevelPts() { return [...G.party, ...G.box].filter(c => isCreature(c.sp)).reduce((a, c) => a + c.lv, 0) * (CFG.PTS.lvl || 0); }
function bestMove(c, target) {
  let best = learned(c)[0] || 'slam', bv = -1;
  for (const id of learned(c)) { const m = MOVES[id]; if (!m.p) continue; const v = m.p * (m.acc || 1) * eff(m.type, typeOf(target)) * (m.type === typeOf(c) ? 1.2 : 1) * (m.hits || 1); if (v > bv) { bv = v; best = id; } }
  return best;
}
function addToParty(c, quiet) {
  if (G.party.length < 4) { G.party.push(c); return 'party'; }
  G.box.push(c); if (!quiet) LOD.toast('Party full: ' + cname(c) + ' went to the van', 2.2); return 'van';
}

/* ===================== EFFECTS: what each effect type does in this game ===================== */
const healC = (c, f) => { if (c && c.hp > 0) c.hp = Math.min(maxHp(c), c.hp + Math.round(maxHp(c) * f)); };
EF.define('heal', { instant(h, e, ctx) { for (const c of (ctx.creatures || [])) healC(c, e.value || .3); } });
EF.define('cure', { instant(h, e, ctx) { if (B) B.conf = 0; EF.clear(G.me, 'confuse'); } });
EF.define('kr', { instant(h, e) { G.kr = Math.max(0, G.kr + (e.value || 0)); } });
EF.define('promiseDebt', { instant(h, e) { G.debt = (G.debt || 0) + (e.value || 1); } });
EF.define('say', { instant(h, e, ctx) { if (ctx.lines) ctx.lines.push(e.value); } });
EF.define('tint', { start(h, f) { if (h === G.me) FX.setTint(f.value === 'rainbow' ? 'rainbow' : f.value, .16, 1); }, end(h) { if (h === G.me && !EF.has(G.me, 'tint')) FX.clearTint(); } });
EF.define('heartAttack', { instant(h, e, ctx) { if (ctx.onHeart) ctx.onHeart(h); } });
EF.define('damage', { instant(h, e, ctx) { if (ctx.onDamage) ctx.onDamage(h, e); } });
EF.define('calm', { instant(h, e, ctx) { if (h.partner) { h.hp = Math.max(0, h.hp - Math.round(maxHp(h) * (e.value || 10) / 100)); } } });
EF.define('anger', { instant(h, e, ctx) { if (h.partner) { h.hp = Math.min(maxHp(h), h.hp + Math.round(maxHp(h) * (e.value || 10) / 100)); if (B) B.angry = 1; } } });
EF.define('flee', { instant(h, e, ctx) { if ((!e.vs || typeOf(h) === e.vs) && Math.random() < (e.chance || .5) && ctx.onFlee) ctx.onFlee(h); } });
EF.define('stat', { start(h, f) { if (h.stg && h !== G.me && f.turns) { for (const k in f.value) if (h.stg[k] != null) h.stg[k] = clamp(h.stg[k] + f.value[k], -4, 4); } } });

/* ===================== BATTLE ===================== */
const SFX = {
  hit: () => { LOD.noise(.12, .35, 0, 900, 'lowpass'); LOD.tone(160, .1, 'square', .06, -80); },
  crit: () => { LOD.noise(.18, .45, 0, 1400, 'lowpass'); LOD.tone(90, .2, 'sawtooth', .08, -40); },
  faint: () => { LOD.tone(520, .5, 'square', .06, -420); },
  lvl: () => [523, 659, 784, 1046].forEach((f, i) => LOD.tone(f, .1, 'square', .05, 0, i * .08)),
  catch: () => [784, 988, 1175, 1568].forEach((f, i) => LOD.tone(f, .12, 'triangle', .06, 0, i * .1)),
  shake: () => LOD.tone(300, .06, 'square', .05, 80),
  start: () => { [392, 523, 392, 523, 659].forEach((f, i) => LOD.tone(f, .07, 'square', .05, 0, i * .07)); LOD.haptic('heavy'); },
  buy: () => { LOD.tone(1318, .06, 'square', .05); LOD.tone(1760, .1, 'square', .05, 0, .06); },
  whoosh: () => LOD.noise(.18, .2, 0, 2400, 'bandpass'),
  grave: () => [330, 262, 196].forEach((f, i) => LOD.tone(f, .35, 'triangle', .05, 0, i * .25))
};
const layer = FX.layer(); // battle particles, numbers, throw arcs (screen coords)
const spots = { fx: 0, fy: 0, mx: 0, my: 0, sc: 3 };
function resetStg(c) { c.stg = { atk: 0, def: 0, spd: 0 }; c.stun = 0; c.disp = c.hp; c.flash = 0; c.sq = 0; c.off = 0; c.yoff = 0; c.alpha = 1; }
function stageMsg(c, k, n) { const nm = { atk: 'ATK', def: 'DEF', spd: 'SPD' }[k]; return cname(c) + "'s " + nm + (n > 0 ? (n > 1 ? ' rose sharply!' : ' rose!') : (n < -1 ? ' fell harshly!' : ' fell!')); }
async function stage(c, k, n) { c.stg[k] = clamp(c.stg[k] + n, -4, 4); await say(stageMsg(c, k, n)); }
function hurt(c, d, side, crit) {
  c.hp = Math.max(0, c.hp - d); if (EF.has(c, 'sleep')) EF.clear(c, 'sleep');
  c.flash = 1; FX.tween(c, { flash: 0 }, .18, 'linear'); c.sq = crit ? .8 : .5; FX.tween(c, { sq: 0 }, .3, 'outElastic');
  FX.hitStop(crit ? 120 : 60); FX.addTrauma(crit ? .55 : .3);
  const [x, y] = side === 'me' ? [spots.mx, spots.my - 24 * spots.sc] : [spots.fx, spots.fy - 24 * spots.sc];
  layer.number(x, y, d, { color: crit ? '#ffd23a' : side === 'me' ? '#ff8a8a' : '#fff', crit });
  layer.burst(x, y + 10 * spots.sc, { n: crit ? 18 : 10, color: crit ? ['#ffd23a', '#fff'] : ['#fff', TCOL[typeOf(c)] || '#fff'], speed: 160, gravity: 260, size: 4 });
  if (side === 'me') LOD.haptic('light');
}
const canAct = c => !(EF.has(c, 'sleep') || EF.has(c, 'stun') || EF.has(c, 'loseTurn'));
function lunge(side) { const c = side === 'me' ? active() : curFoe(); if (!c) return; FX.tween(c, { off: 1 }, .12, 'outQuad', () => FX.tween(c, { off: 0 }, .22, 'outBack')); }

async function startBattle(o) {
  if (B) return;
  if (!G.party.some(c => c.hp > 0)) { if (!G.party.length) LOD.toast(OP.noFight, 1.8); return; }
  G.scene = 'battle'; LOD.input.clear(); layer.clear();
  const z = zoneAt(G.p.x, G.p.y);
  B = Object.assign({ kind: 'wild', foes: [], fi: 0, me: G.party.findIndex(c => c.hp > 0), turn: 0, ult: false, lure: 1, atm: false, yes: 0, pants: false,
    jungle: heroId() === 'wizcudi' && !!z.out, conf: 0, survive: 0, angry: 0, over: false, result: '', zone: z.id, flashT: .7, said: new Set(), pkg: 0, introT: 0 }, o);
  for (const c of G.party) resetStg(c); for (const f of B.foes) { resetStg(f); f.fx = f.fx || []; }
  if (B.dazed) { for (const f of B.foes) { EF.apply(f, { type: 'stun', turns: 1 }); EF.apply(f, { type: 'catchBonus', value: B.dazed, turns: 99 }); } }
  const who = B.kind === 'boss' ? B.boss : B.kind === 'partner' ? B.partner : B.kind === 'trainer' || B.kind === 'npc' ? B.npc : B.kind === 'dev' ? 'dev' : null;
  if (who) { B.introT = 1.6; B.introId = who; }
  SFX.start(); await sleep(B.introT ? 1.6 : .75);
  const foe = curFoe();
  if (B.kind === 'wild' || B.kind === 'trap') { G.seen[foe.sp] = 1; await say((B.kind === 'trap' ? 'A dazed ' : 'A wild ') + cname(foe) + ' appeared! (Lv ' + foe.lv + ')'); }
  if (B.kind === 'trainer' || B.kind === 'npc') { const n = npcDef(B.npc); await say((n ? n.name : 'They') + (B.kind === 'npc' ? ' wants to fight!' : ' sends out ' + cname(foe) + '!')); }
  await say('Go, ' + cname(active()) + '!');
  while (!B.over) { await round(); if (!B) return; }
  await endBattle();
}
async function round() {
  const meRef = active(), foeRef = curFoe();
  if (heroId() === 'jrohn' && !B.pants && B.turn > 0 && Math.random() < .1 && B.kind !== 'dev') { B.pants = true; await say('👖 Oops. Your pants dropped. DEF fell!'); }
  const act = await chooseAction();
  if (!B || B.over) return;
  const foeAct = B.kind === 'partner' || B.kind === 'dev' ? null : 'move';
  const meFirst = act.k !== 'move' || (B.turn === 0 && heroId() === 'wizcudi') || !foeAct ||
    eStat(meRef, 'spd', 'me') > eStat(foeRef, 'spd', 'foe') || (eStat(meRef, 'spd', 'me') === eStat(foeRef, 'spd', 'foe') && Math.random() < .5);
  const order = B.kind === 'partner' ? ['me', 'foe'] : meFirst ? ['me', 'foe'] : ['foe', 'me'];
  for (const side of order) {
    if (!B || B.over) return;
    if (side === 'me') { if (active() === meRef && meRef.hp > 0) await doPlayer(act); }
    else if (curFoe() === foeRef && foeRef.hp > 0) await foeTurn();
    await resolveFaints();
  }
  if (!B || B.over) return;
  if (B.yes > 0 && --B.yes === 0) await say('The YES! energy fades.');
  if (B.foeYes > 0) B.foeYes--;
  if (B.conf > 0) B.conf--;
  for (const f of B.foes) for (const e of EF.turn(f)) if (e.type === 'sleep' && f.hp > 0) await say(cname(f) + ' woke up!');
  B.turn++;
  if (B.kind === 'partner') { B.survive++; const need = partnerNeed(); if (B.survive >= need) { await say(PARTNERS[B.partner].name + ' sighs. "Fine. We will talk about this later."'); B.over = true; B.result = 'solved'; } }
}
const partnerNeed = () => CFG.PARTNER_TURNS + (PARTNERS[B.partner].guy === heroId() ? 1 : 0);

/* ---------- the player's choice: one tap per choice ---------- */
const effHint = (mt, ft) => { const e = eff(mt, ft); return e === 1 || !known('eff:' + mt + '>' + ft) ? '' : e > 1 ? ' · strong!' : ' · weak'; };
const throwables = () => Object.keys(ITEMS).filter(id => has(id) && (ITEMS[id].kind === 'throwable' || (ITEMS[id].kind === 'drug' && (ITEMS[id].throw || ITEMS[id].lureMul))) && rel(ITEMS[id]));
const usables = () => Object.keys(ITEMS).filter(id => has(id) && ITEMS[id].kind === 'drug' && ITEMS[id].use && rel(ITEMS[id]));
async function chooseAction() {
  for (;;) {
    const me = active(), foe = curFoe(), K = B.kind, hero = HERO[heroId()];
    const nUse = usables().reduce((a, id) => a + G.items[id], 0), nThrow = throwables().length + (weaponOwned() ? 1 : 0) + (G.kr >= CFG.BAG_COST ? 1 : 0);
    const main = [
      K === 'partner' ? { label: '💬 Talk', value: 'talk', cls: 'hot' } : { label: '⚔️ Fight', value: 'fight', cls: 'hot' },
      { label: '🍺 Use', value: 'use', sub: nUse ? nUse + ' in the bag' : 'Bag is empty', dis: !nUse },
      { label: '🎯 Throw', value: 'throw', dis: !nThrow },
      { label: '⭐ ' + hero.ult, value: 'ult', sub: B.ult ? 'Used' : 'Once per battle', dis: B.ult },
      { label: '🔄 Party', value: 'party', sub: G.party.filter(c => c.hp > 0).length + ' can fight' },
      { label: '🏃 Run', value: 'run', dis: !(K === 'wild' || K === 'trap') }
    ];
    if (K === 'partner') main.splice(2, 0, { label: '🛡️ Endure', value: 'endure' });
    if (B.pants) main.unshift({ label: '👖 Pull up your pants', value: 'pull', cls: 'hot', sub: 'Uses your turn' });
    const q = K === 'partner' ? PARTNERS[B.partner].name + ' is not done with you.' : 'What will ' + cname(me) + ' do?';
    const v = await ask(q, main);
    if (!B) return { k: 'none' };
    if (v === 'fight') {
      const mv = await ask('Choose a move.', learned(me).map(id => { const m = MOVES[id]; return { label: m.name, value: id, ty: m.type || 'NONE', sub: m.p ? 'Power ' + m.p + (m.hits ? ' ×' + m.hits : '') + effHint(m.type, typeOf(foe)) : 'Status' }; }).concat([BACK()]));
      if (mv) return { k: 'move', mv };
    } else if (v === 'use') {
      const d = await ask('Use what?', usables().map(id => itemOpt(id)).concat([BACK()]));
      if (d) return { k: 'use', id: d };
    } else if (v === 'throw') {
      const opts = [];
      if (K === 'wild' || K === 'trap') opts.push(Object.assign(itemOpt('bag'), { label: '🛍️ Carrier bag' + (has('bag') ? ' ×' + G.items.bag : ' · ' + CFG.BAG_COST + ' kr'), sub: heroId() === 'bigwman' ? Math.round(catchChance(foe) * 100) + ' %' : ITEMS.bag.learnedNote, unk: false, cls: 'hot', value: 'bag', dis: !has('bag') && G.kr < CFG.BAG_COST }));
      const w = weaponOwned(); if (w) opts.push(itemOpt(w, { label: ITEMS[w].em + ' ' + ITEMS[w].name }));
      for (const id of throwables()) if (id !== 'bag') opts.push(itemOpt(id, ITEMS[id].kind === 'drug' && !ITEMS[id].throw ? { label: 'Lure: ' + ITEMS[id].em + ' ' + ITEMS[id].name } : {}));
      const t = await ask('Throw what?', opts.concat([BACK()]));
      if (t) return { k: 'throw', id: t };
    } else if (v === 'party') {
      const i = await pickParty('Swap to who? (uses your turn)', false);
      if (i != null && i !== B.me) return { k: 'swap', i };
    } else if (v === 'talk') {
      const P = PARTNERS[B.partner], g = P.guy === heroId() ? 0 : 1, C = D.raw.choices;
      const opts = ['sorry', 'promise'].map(k => ({ label: C[k].label, sub: C[k].note, unk: !known('choice:' + k), value: k }));
      if (!B.lines) { // four lines, one right; the wrong ones are her other bad line and a random one from choices.wrong
        const other = P.bad[1 - g], extra = pick((C.wrong || ['Have you lost weight?']).filter(x => x !== other));
        B.lines = [{ label: '"' + P.good[g] + '"', value: 'good' }, { label: '"' + P.bad[g] + '"', value: 'bad' }, { label: '"' + other + '"', value: 'bad' }, { label: '"' + extra + '"', value: 'bad' }].sort(() => Math.random() - .5);
      }
      const lines = B.lines;
      const a = await ask('Say what?', opts.concat(lines, [BACK()]));
      if (a) return { k: 'talk', a };
    } else if (v) return { k: v };
  }
}
async function pickParty(q, forced) {
  const opts = G.party.map((c, i) => ({ label: cname(c) + ' Lv ' + c.lv + (i === B.me ? ' (out)' : ''), img: creatureIcon(c.sp), ty: typeOf(c), sub: c.hp + '/' + maxHp(c) + ' HP', hp: c.hp / maxHp(c), value: i, dis: c.hp <= 0 || i === B.me }));
  if (!forced) opts.push(BACK());
  return ask(q, opts, { one: true });
}

/* ---------- doing things ---------- */
async function doPlayer(act) {
  const me = active(), foe = curFoe();
  if (me.stun > 0) { me.stun--; await say(cname(me) + " is stunned and can't move!"); return; }
  if (heroId() === 'bigwman' && act.k !== 'run' && B.pkg < 2 && B.turn > 0 && Math.random() < .1) { B.pkg++; await say('📦 "Package for BigWman!" You sign for it. Turn lost.'); return; }
  const confused = B.conf > 0 || EF.has(G.me, 'confuse');
  if (confused && Math.random() < .3 && (act.k === 'move' || act.k === 'talk')) {
    if (act.k === 'move') { act.mv = pick(learned(me)); await say('You are confused! ' + cname(me) + ' does something random.'); }
    else { act.a = pick(['sorry', 'good', 'bad', 'bad']); await say('You are confused! The wrong words come out.'); }
  }
  switch (act.k) {
    case 'move':
      if (B.kind === 'partner') { await say(PARTNERS[B.partner].name + ' is not hurt. She is disappointed.'); return; }
      await useMove(me, foe, act.mv, 'me'); return;
    case 'use': await useItem(act.id, true); return;
    case 'throw': await throwIt(act.id); return;
    case 'ult': await heroUlt(); return;
    case 'swap': B.me = act.i; resetStg(active()); await say('Come back! Go, ' + cname(active()) + '!'); return;
    case 'pull': B.pants = false; await say('👖 You pull your pants up. Dignity restored. Mostly.'); return;
    case 'endure': B.endure = true; await say(cname(me) + ' braces for the words.'); return;
    case 'run': {
      const ok = heroId() === 'jrohn' || Math.random() < clamp(.45 + .3 * eStat(me, 'spd', 'me') / eStat(foe, 'spd', 'foe'), .3, .95);
      if (ok) { await say('Got away safely!'); B.over = true; B.result = 'run'; } else await say("Can't escape!");
      return;
    }
    case 'talk': await partnerAnswer(act.a); return;
  }
}
async function useMove(user, target, id, side, o = {}) {
  const mv = MOVES[id], nm = (side === 'foe' && (B.kind === 'wild' || B.kind === 'trap') ? 'The wild ' : side === 'foe' && B.kind === 'boss' ? HERO[B.boss].name + "'s " : '') + cname(user);
  if (side === 'foe') {
    if (user.stun > 0) { user.stun--; await say(cname(user) + " is stunned and can't move!"); return; }
    if (EF.has(user, 'sleep')) { await say(cname(user) + ' is fast asleep. 💤'); return; }
    if (EF.has(user, 'stun')) { await say(cname(user) + " is dazed and can't move!"); return; }
    if (EF.has(user, 'loseTurn')) { await say(cname(user) + ' is busy and loses the turn.'); return; }
    if (EF.has(user, 'confuse') && Math.random() < .4) { await say(cname(user) + ' is confused and hits itself!'); hurt(user, Math.max(1, Math.round(maxHp(user) * .08)), 'foe'); return; }
  }
  await say(nm + ' used ' + mv.name + '!');
  lunge(side); await sleep(.15);
  if (mv.say) await say(mv.say);
  if (mv.special) { await devSpecial(mv.special, user); return; }
  let acc = (mv.acc || 1) + (side === 'me' ? statFx('acc') : 0);
  if (side === 'foe') acc -= EF.sum(user, 'blind');
  if (mv.p && Math.random() > acc) { await say('It missed!'); return; }
  if (!mv.p) {
    if (mv.self) for (const k in mv.self) await stage(user, k, mv.self[k]);
    if (mv.foe) for (const k in mv.foe) await stage(target, k, mv.foe[k]);
    if (mv.heal) { healC(user, mv.heal); await say(cname(user) + ' feels better.'); }
    return;
  }
  const mt = id === 'glitch' ? typeOf(user) : mv.type, tSide = side === 'me' ? 'foe' : 'me';
  let hits = mv.hits || 1, crits = 0, e = 1, dealt = 0;
  for (let h = 0; h < hits && target.hp > 0; h++) {
    if (side === 'foe' && heroId() === 'loken' && !B.atm) { B.atm = true; await say('🛡️ ATM Security! The first hit is blocked.'); continue; }
    const A = eStat(user, 'atk', side), Df = eStat(target, 'def', tSide);
    let d = ((2 * user.lv / 5 + 2) * mv.p * A / Df) / 25 + 2;
    e = eff(mt, typeOf(target));
    let critP = .07; if (side === 'me') { if (heroId() === 'ljunky') critP = .15; if (statFx('crit') > 0) critP = .35; }
    const crit = Math.random() < critP; if (crit) crits++;
    d *= (mt && mt === typeOf(user) ? 1.2 : 1) * e * rand(.85, 1) * (crit ? 1.5 : 1);
    if (side === 'me' && B.yes > 0) d *= 1.5;
    if (side === 'foe' && B.foeYes > 0) d *= 1.5;
    if (side === 'me' && B.dip != null) d *= B.dip;
    if (side === 'foe' && B.foeDip != null) { d *= B.foeDip; B.foeDip = null; }
    if (side === 'foe' && B.endure) d *= .5;
    if (o.mul) d *= o.mul;
    d = Math.round(d); if (d === 0 && side === 'me' && B.dip === 0) { await say('The dip kept dipping. Zero damage.'); continue; }
    d = Math.max(1, d); dealt += d;
    hurt(target, d, tSide, crit); crit ? SFX.crit() : SFX.hit();
    await sleep(.35);
  }
  if (mv.hits && dealt) await say('Hit ' + mv.hits + ' times!');
  if (crits) await say('A critical hit!');
  if (dealt && e !== 1 && mt) learn('eff:' + mt + '>' + typeOf(target));
  if (dealt && e > 1) await say("It's super effective!"); else if (dealt && e < 1) await say("It's not very effective…");
  if (target.hp > 0 && dealt) {
    if (mv.foe) for (const k in mv.foe) await stage(target, k, mv.foe[k]);
    if (mv.stun && Math.random() < mv.stun) { target.stun = 1; await say(cname(target) + ' is stunned!'); }
  }
}
async function foeTurn() {
  const foe = curFoe(), me = active();
  if (B.kind === 'partner') return partnerTurn();
  if (B.kind === 'dev') return devTurn();
  if (B.kind === 'boss' && !B.foeUlt && B.fi >= 1 && foe.stun <= 0 && canAct(foe)) { B.foeUlt = true; if (await bossUlt()) return; }
  if (B.robot && Math.random() < .3 && canAct(foe)) await say(robotLine());
  const ids = learned(foe);
  const id = Math.random() < .7 ? bestMove(foe, me) : pick(ids);
  await useMove(foe, me, id, 'foe');
  if (B.foeDouble && me.hp > 0 && foe.hp > 0) { B.foeDouble = 0; await useMove(foe, me, bestMove(foe, me), 'foe'); }
}
async function bossUlt() {
  const b = B.boss, h = HERO[b], foe = curFoe(), me = active();
  await say(h.name + ': "' + h.ult.toUpperCase() + '"'); B.flashT = .4; LOD.haptic('heavy'); FX.addTrauma(.4);
  if (b === 'bigwman') { B.foeYes = 3; await say(h.name + "'s team gets +50 % ATK for 3 turns!"); return true; }
  if (b === 'wizcudi') { me.stun = 1; await say("Lights Out! " + cname(me) + " can't see a thing."); return true; }
  if (b === 'jrohn') { healC(foe, .5); await say(cname(foe) + ' got a big hug and healed!'); return true; }
  if (b === 'loken') { B.foeDouble = 1; await say('Stick together, boys! Two attacks this turn!'); return false; }
  if (b === 'ljunky') { B.foeDip = Math.random() < .5 ? 2 : 0; await say(B.foeDip ? 'He bought the dip. It pumped! Next hit is double.' : 'He bought the dip. It kept dipping.'); return false; }
  return false;
}
async function heroUlt() {
  const h = heroId(), me = active(), foe = curFoe(); B.ult = true;
  LOD.callout(HERO[h].ult.toUpperCase() + '!', HERO[h].ultTxt, 'good'); B.flashT = .45; FX.addTrauma(.35);
  if (h === 'bigwman') { B.yes = 3; await say('YES!!! The whole party gets +50 % ATK for 3 turns.'); }
  else if (h === 'wizcudi') { foe.stun = (foe.stun || 0) + 2; await say('Lights Out! ' + cname(foe) + ' will miss 2 turns.'); }
  else if (h === 'jrohn') { for (const c of G.party) healC(c, .5); foe.stun = (foe.stun || 0) + 1; B.lure *= 1.5; await say('I LOVE THIS! The party heals 50 % and ' + cname(foe) + ' is charmed.'); }
  else if (h === 'loken') {
    await say('Stick together, boys! Everyone attacks!');
    if (B.kind === 'partner') { await say('She is not hurt. She is impressed, a little.'); B.survive++; return; }
    for (const c of G.party) { if (c.hp <= 0 || foe.hp <= 0) continue; if (!c.stg) resetStg(c); await useMove(c, foe, bestMove(c, foe), 'me', { mul: c === me ? 1 : .8 }); }
  } else if (h === 'ljunky') {
    if (B.kind === 'partner') { await say('You bought the dip. She saw it. That made it worse.'); B.angry = 1; return; }
    B.dip = Math.random() < .5 ? 2 : 0; await say(B.dip ? 'Buy the Dip… TO THE MOON! Double damage.' : 'Buy the Dip… it keeps dipping.');
    await useMove(me, foe, bestMove(me, foe), 'me'); B.dip = null;
  }
}
/* use an item on yourself (drink, drug, food). inBattle = buffs your active creature too */
async function useItem(id, inBattle) {
  const it = ITEMS[id]; if (!it || !has(id)) return;
  take(id); const lines = [];
  if (it.drink) logDrink();
  const res = applyAll(G.me, it.use || [], { creatures: inBattle ? [active()] : G.party, lines, onHeart: heartAttack });
  if (inBattle) await say('Glug. ' + it.em + ' ' + it.name + '.'); else LOD.toast(it.em + ' ' + it.name, 1.6);
  for (const l of lines) await (inBattle ? say(l) : say(l, { auto: false }));
  if (learnItem(id) && inBattle) await sleep(.3);
  if (res.overdose) { await heartAttackFlow(); return; }
  if (res.speed) LOD.toast('❄️ ×' + gameSpeed().toFixed(1), 1.4);
}
function applyAll(holder, list, ctx) {
  const out = {};
  for (const e of list) { const r = EF.apply(holder, e, ctx); if (r.overdose) out.overdose = true; if (e.type === 'speed') out.speed = true; }
  return out;
}
let heartPending = false;
function heartAttack(h) { if (h === G.me) heartPending = true; else if (ctxHeart) ctxHeart(h); }
let ctxHeart = null;
async function heartAttackFlow() {
  heartPending = false; EF.clear(G.me, 'speed'); FX.addTrauma(1); LOD.haptic('heavy'); LOD.callout('HEART ATTACK 💔', 'Four was one too many.', 'bad');
  if (B) { B.over = true; B.result = 'heart'; return; }
  await blackoutTo('heart');
}
function logDrink() {
  G.drinkLog = (G.drinkLog || []).filter(t => G.t - t < 60); G.drinkLog.push(G.t);
  if (G.drinkLog.length > CFG.BLUR_DRINKS && !(G.blurT > 0)) { G.blurT = CFG.BLUR_TIME; G.blurred = true; LOD.callout('BLUR 🥴', 'Everything sways.', 'bad'); }
}
function catchChance(f) {
  const s = SP[f.sp], R = CFG.CATCH_R[s.rarity] || .5, hpF = f.hp / maxHp(f);
  const bonus = 1 + EF.sum(f, 'catchBonus') + EF.sum(G.me, 'catchBonus');
  if (s.trapOnly && !(B.trapItem === s.trapOnly)) return 0;
  if (f.hp <= 0) return clamp((CFG.KO_CATCH[s.rarity] || .6) * bonus * (heroId() === 'ljunky' ? 1.1 : 1), .05, .98);
  return clamp((1 - hpF * .78) * R * B.lure * bonus * (heroId() === 'ljunky' ? 1.25 : 1) * (f.stun > 0 || !canAct(f) ? 1.2 : 1), .03, .95);
}
/* throw something: carrier bag, weapon, throwable or a drink as a lure. An arc flies to the foe, then the effects land. */
async function throwIt(id) {
  const foe = curFoe(), it = ITEMS[id];
  if (id === 'bag') { if (has('bag')) take('bag'); else G.kr -= CFG.BAG_COST; return throwBag(); }
  const weapon = it.kind === 'weapon';
  if (!weapon) take(id);
  await say(weapon ? 'You aim the ' + it.name + '…' : 'You throw the ' + it.name + '!');
  SFX.whoosh();
  const hitP = it.hit != null ? it.hit : 1, hit = Math.random() < hitP;
  const tx = spots.fx + (hit ? 0 : (Math.random() < .5 ? -1 : 1) * 30 * spots.sc / 3), ty = spots.fy - 20 * spots.sc;
  await layer.arc(spots.mx, spots.my - 30 * spots.sc, tx, ty, { h: weapon ? 10 : 34 * spots.sc, dur: weapon ? .25 : .8, draw: (c, x, y, k, r) => { c.save(); c.translate(x, y); c.rotate(weapon ? 0 : r); c.font = (14 * spots.sc + 6) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(weapon ? '💉' : it.em, 0, 0); c.restore(); } });
  layer.burst(tx, ty, { n: 14, color: ['#fff', '#ffd23a', '#9fd3ea'], speed: 140, size: 3 });
  if (!hit) {
    FX.addTrauma(.1);
    await say(it.onMiss === 'near' ? 'It lands right next to ' + cname(foe) + '. Clink.' : 'Missed!');
    if (it.onMiss === 'near') learnItem(id);
    return;
  }
  learnItem(id);
  // a drink thrown = lure
  if (it.kind === 'drug' && !it.throw) {
    if (Math.random() < CFG.LURE_RIP) { B.rip = 1; await say('💀 Too strong. RIP.'); await say(cname(foe) + ' is gone. No catch.'); B.over = true; B.result = 'rip'; return; }
    const v = id === 'snaps' ? rand(.8, 2.6) : (it.lureMul || 1) * (it.good === typeOf(foe) ? 1.4 : 1);
    B.lure = Math.max(B.lure, v);
    await say(cname(foe) + ' sniffs the ' + it.name + '. ' + (v >= 1.8 ? 'It loves it!' : v >= 1.3 ? 'It looks relaxed.' : 'It looks unsure.'));
    return;
  }
  if (it.wife && !foe.partner) { await say(cname(foe) + ' does not care. At all.'); return; }
  const wasHp = foe.hp;
  const ctx = {
    onDamage: (h, e) => { let d = Math.round((e.value || 10) * (1 + foe.lv / 10) * ((e.vs && e.vs[typeOf(foe)]) || 1)); if (foe.partner) d = 0; if (d) { hurt(foe, d, 'foe'); SFX.hit(); } },
    onFlee: () => { B.fled = true; }
  };
  for (const e of it.throw || []) EF.apply(foe, e, ctx);
  if (B.fled) { await say(cname(foe) + ' runs away from the smell!'); B.over = true; B.result = 'run'; return; }
  if (it.koBelow && foe.hp > 0 && wasHp / maxHp(foe) < it.koBelow) { foe.hp = 0; hurt(foe, 0, 'foe', true); await say('BONK. ' + cname(foe) + ' is knocked out cold!'); return; }
  const msgs = [];
  if (EF.has(foe, 'sleep')) msgs.push(cname(foe) + ' falls asleep. 💤');
  if (EF.has(foe, 'stun')) msgs.push(cname(foe) + (foe.partner ? ' is sneezing uncontrollably!' : ' is dazed!'));
  if (EF.has(foe, 'loseTurn')) msgs.push(cname(foe) + (foe.partner ? ' is distracted.' : ' slips!'));
  if (EF.has(foe, 'blind')) msgs.push(cname(foe) + ' can barely see!');
  if (EF.has(foe, 'confuse')) msgs.push(cname(foe) + ' looks very confused.');
  if (foe.partner) msgs.push(B.angry ? cname(foe) + ' is FURIOUS now.' : foe.hp < wasHp ? cname(foe) + ' calms down a little.' : '');
  for (const m of msgs) if (m) await say(m);
  if ((it.throw || []).some(e => e.type === 'promiseDebt')) await say('You promised something. Promise debt: ' + G.debt + '.');
}
async function throwBag(ko) {
  const foe = curFoe();
  await say(ko ? 'You pull out a carrier bag…' : 'You threw a carrier bag!');
  const p = catchChance(foe), ok = Math.random() < p;
  if (p === 0) { B.bagT = 0; await say('The bag goes straight through it. Something else is needed.'); return false; }
  const shakes = ok ? 3 : Math.random() < p * 1.6 ? 2 : Math.random() < .5 ? 1 : 0;
  await layer.arc(spots.mx, spots.my - 30 * spots.sc, spots.fx, spots.fy - 20 * spots.sc, { h: 60, dur: .45, draw: (c, x, y, k, r) => { c.save(); c.translate(x, y); c.rotate(r); c.font = '26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🛍️', 0, 0); c.restore(); } });
  B.bagT = 1; B.bagShake = 0; learnItem('bag');
  for (let i = 0; i < shakes; i++) { await sleep(.5); B.bagShake = 1; SFX.shake(); FX.addTrauma(.08); }
  await sleep(.45);
  if (!ok) { B.bagT = 0; await say(pick(['Oh no! It broke free!', 'Argh! Almost had it!', 'It ripped the bag.'])); return false; }
  SFX.catch(); LOD.haptic('success'); layer.burst(spots.fx, spots.fy - 20, { n: 24, color: ['#ffd23a', '#fff', '#3ddc84'], speed: 180, size: 4 });
  await caught(foe);
  B.over = true; B.result = 'caught';
  return true;
}
async function caught(foe) {
  const s = SP[foe.sp], c = { sp: foe.sp, lv: foe.lv, xp: 0, hp: Math.max(1, foe.hp) };
  if (s.kind === 'creature') {
    const isNew = !G.caught[foe.sp]; G.caught[foe.sp] = 1;
    await say('Gotcha! ' + cname(foe) + ' was bagged!' + (isNew ? ' New species! +' + fmt(CFG.PTS.species) : ''));
    if (s.rarity === 'M') G.flags.mythicCaught = 1;
  } else {
    G.caughtP[foe.sp] = 1;
    await say('Gotcha! ' + cname(foe) + ' is in the bag. They look… okay with it?');
    personGone(foe.sp, 'caught');
  }
  if (addToParty(c, true) === 'van') await say('Your party is full. ' + cname(c) + ' went to the van.');
}

/* ---------- knockout: Catch or Finish off ---------- */
async function knockout(foe, who) {
  const s = SP[foe.sp] || {}, person = s.kind !== 'creature';
  const canCatch = s.kind === 'creature' || (who && who.catchable !== false);
  const canDie = !who || who.canDie !== false;
  const opts = [
    { label: '🛍️ Catch', value: 'catch', cls: 'hot', dis: !canCatch, sub: heroId() === 'bigwman' && canCatch ? Math.round(catchChance(foe) * 100) + ' %' : (has('bag') ? '×' + G.items.bag : CFG.BAG_COST + ' kr') },
    { label: '🪦 Finish off', value: 'kill', cls: 'bad', dis: !canDie },
    { label: person ? '🤝 Let it go' : '🌿 Walk away', value: 'leave' }
  ];
  for (;;) {
    const a = await ask(cname(foe) + ' is knocked out.', opts);
    if (a === 'catch') {
      if (has('bag')) take('bag'); else if (G.kr >= CFG.BAG_COST) G.kr -= CFG.BAG_COST; else { await say('No bags and no money.'); continue; }
      if (await throwBag(true)) return 'caught';
      foe.hp = 0; opts[0].sub = (has('bag') ? '×' + G.items.bag : CFG.BAG_COST + ' kr'); continue;
    }
    if (a === 'kill') { await finishOff(foe); return 'killed'; }
    return 'left';
  }
}
async function finishOff(foe) {
  FX.addTrauma(.6); FX.hitStop(120); SFX.grave(); LOD.haptic('heavy');
  foe.flash = 1; FX.tween(foe, { flash: 0, alpha: 0, yoff: 1 }, .8, 'inQuad');
  layer.burst(spots.fx, spots.fy - 20 * spots.sc, { n: 20, color: ['#8a93a6', '#1F2A44', '#c9ced6'], speed: 90, gravity: -40, size: 4, life: 1 });
  await sleep(.6);
  S.addGrave(foe);
  await say('💀 ' + cname(foe) + ' is no more.' + (cemeteryOpen() ? ' A stone appears in the cemetery.' : ''));
  if (SP[foe.sp].kind !== 'creature') personGone(foe.sp, 'dead');
  if (B.kind !== 'boss' && B.kind !== 'trainer') await gainXp(foe, 1.2);
}
/* a person was caught or finished off: remove them from the map, count the goal */
function personGone(sp, how) {
  const s = SP[sp]; if (!s) return;
  if (how === 'dead') G.dead[sp] = 1;
  if (s.kind === 'hero' && !G.beat.includes(s.ref)) G.beat.push(s.ref);
  if (s.kind === 'wife' && !G.solved.includes(s.ref)) G.solved.push(s.ref);
  const gym = D.raw.gyms.box, boss = heroId() === gym.boss ? gym.bossIfSelf : gym.boss;
  if (s.ref === boss) { G.flags[gym.doneFlag] = 1; }
  if (s.ref === 'aiLjunky') G.flags.aiBeaten = 1;
}
const gone = sp => !!(G.dead[sp] || G.caughtP[sp]);

async function gainXp(foe, mul = 1) {
  const base = foe.lv * CFG.XP_PER_LV * (B.kind === 'wild' || B.kind === 'trap' ? 1 : CFG.BOSS_XP) * mul;
  for (const c of G.party) if (c.hp > 0) {
    const low = foe.lv >= c.lv ? Math.min(1.5, foe.lv / c.lv) : Math.pow(foe.lv / c.lv, CFG.XP_LOW); // anti-grind: weak foes give almost nothing
    const amt = Math.max(1, Math.round(base * low * (c === active() ? 1 : CFG.XP_SHARE)));
    await addXp(c, amt, c === active());
  }
}
async function addXp(c, amt, loud) {
  if (c.lv >= CFG.LV_MAX) return;
  c.xp += amt; if (loud) await say(cname(c) + ' gained ' + amt + ' XP!');
  while (c.lv < CFG.LV_MAX && c.xp >= xpNeed(c.lv)) {
    c.xp -= xpNeed(c.lv); const old = maxHp(c); c.lv++; c.hp = Math.min(maxHp(c), c.hp + maxHp(c) - old);
    if (loud !== null) { SFX.lvl(); await say(cname(c) + ' grew to Lv ' + c.lv + '!'); for (const m of SP[c.sp].moves) if (m[1] === c.lv && MOVES[m[0]]) await say(cname(c) + ' learned ' + MOVES[m[0]].name + '!'); }
  }
  if (c.lv >= CFG.LV_MAX) c.xp = 0;
  G.lvlPts = Math.max(G.lvlPts || 0, partyLevelPts());
}
async function resolveFaints() {
  if (!B || B.over) return;
  const foe = curFoe();
  if (foe.hp <= 0 && !foe.down) {
    foe.down = true; SFX.faint(); FX.tween(foe, { yoff: .35, sq: -.3 }, .5, 'outBounce');
    if (B.kind === 'boss' || B.kind === 'trainer') {
      await say(cname(foe) + ' fainted!'); await gainXp(foe);
      if (B.fi < B.foes.length - 1) { B.fi++; const n = curFoe(); resetStg(n); n.fx = n.fx || []; await sleep(.3); await say(trainerName() + ' sends out ' + cname(n) + '!'); G.seen[n.sp] = 1; return; }
      FX.tween(foe, { alpha: 0 }, .4);
      // the trainer is out of creatures: now it is personal
      const psp = B.kind === 'boss' ? 'h_' + B.boss : 'n_' + B.npc, who = B.kind === 'boss' ? { catchable: true, canDie: true } : npcDef(B.npc);
      const p = mk(psp, Math.max(...B.foes.map(f => f.lv))); p.hp = 0; resetStg(p); p.fx = []; p.alpha = 0; B.foes.push(p); B.fi = B.foes.length - 1; B.personKO = true;
      FX.tween(p, { alpha: 1 }, .4); await sleep(.4);
      await say(trainerName() + ' is out of creatures.');
      B.koResult = await knockout(p, who);
      B.over = true; B.result = 'win'; return;
    }
    if (B.kind === 'partner') { await say(PARTNERS[B.partner].name + ' has had enough. She just stands there, speechless.'); B.koResult = await knockout(foe, PARTNERS[B.partner]); B.over = true; B.result = B.koResult === 'left' ? 'solved' : 'ko'; return; }
    if (B.kind === 'dev') { await say(cname(foe) + ' fainted!'); await gainXp(foe); B.over = true; B.result = 'win'; return; }
    await say((B.kind === 'npc' ? '' : 'The wild ') + cname(foe) + ' is knocked out!');
    B.koResult = await knockout(foe, B.kind === 'npc' ? npcDef(B.npc) : null);
    if (B.koResult === 'left') await gainXp(foe, .8);
    B.over = true; B.result = B.koResult === 'caught' ? 'caught' : 'win'; return;
  }
  const me = active();
  if (me.hp <= 0 && !B.said.has(me)) {
    B.said.add(me); SFX.faint(); await say(cname(me) + ' fainted!');
    if (G.party.some(c => c.hp > 0)) { const i = await pickParty('Who goes next?', true); B.me = i; resetStg(active()); await say('Go, ' + cname(active()) + '!'); }
    else { B.over = true; B.result = 'lose'; }
  }
}
const trainerName = () => B.kind === 'boss' ? HERO[B.boss].name : (npcDef(B.npc) || {}).name || 'The trainer';

/* ---------- partners: words. Her mood bar (hp) only drops from the women's throwables ---------- */
async function partnerTurn() {
  const P = PARTNERS[B.partner], me = active(), foe = curFoe(), guy = P.guy === heroId();
  if (foe.stun > 0) { foe.stun--; await say(P.name + ' pauses. Just for a second.'); return; }
  if (!canAct(foe)) { await say(EF.has(foe, 'stun') ? P.name + ' is still sneezing. Achoo!' : P.name + ' is distracted.'); return; }
  const m = pick(P.moves);
  await say(P.name + ': "' + m.n + '"'); lunge('foe');
  if (EF.has(foe, 'blind') && Math.random() < EF.sum(foe, 'blind')) { await say('She can\'t see you through the glitter. It misses.'); return; }
  const mul = (guy ? 1.4 : 1) * (B.angry ? 2 : 1) * (B.endure ? .5 : 1) * (1 + CFG.WIFE_DEBT_ANGER * (G.debt || 0)) / stageMul(clamp(me.stg.def + statFx('def') - (B.pants ? 2 : 0), -6, 6));
  B.angry = 0;
  const hit = f => { const d = Math.max(1, Math.round(maxHp(me) * f * mul * rand(.85, 1.1))); hurt(me, d, 'me'); SFX.hit(); };
  if (m.fx === 'dmg') hit(.2);
  else {
    hit(.08); await sleep(.3);
    if (m.fx === 'stun') { me.stun = 1; await say(cname(me) + ' has to deal with it. Next turn is lost.'); }
    if (m.fx === 'conf') { if (EF.has(G.me, 'cure')) await say('The gin keeps your head clear.'); else { B.conf = 3; await say('You are confused!'); } }
    if (m.fx === 'atk' || m.fx === 'def' || m.fx === 'spd') await stage(me, m.fx, -1);
  }
  if (P.kind === 'Guilt' && me.hp > 0) {
    if (EF.has(G.me, 'guard')) await say('🥃 The whisky makes you immune to guilt.');
    else { me.stg.def = clamp(me.stg.def - 1, -4, 4); await say('Guilt! ' + cname(me) + "'s DEF fell."); }
  }
  B.endure = false;
}
async function partnerAnswer(a) {
  const P = PARTNERS[B.partner], me = active();
  if (a === 'sorry' || a === 'promise') learn('choice:' + a);
  if (a === 'sorry') { hurt(me, Math.round(maxHp(me) * .22), 'me'); B.survive++; await say('You apologize. ' + P.name + ' softens a little.'); }
  else if (a === 'promise') { G.debt = (G.debt || 0) + 1; await say('You promise. Again. Promise debt: ' + G.debt + '.'); await say(P.name + ': "I am writing that down."'); B.over = true; B.result = 'solved'; }
  else if (a === 'good') { SFX.catch(); await say(P.name + ': "…Okay. That was actually the right thing to say."'); B.over = true; B.result = 'solved'; }
  else { B.angry = 1; B.survive = Math.max(0, B.survive - 1); LOD.haptic('error'); await say('Wrong thing to say. ' + P.name + ' is ANGRY now. One more turn to survive.'); }
}

/* ---------- Dev Ljunky: MIND, changes the rules ---------- */
async function devTurn() {
  const d = curFoe(), f = d.hp / maxHp(d), me = active();
  if (d.stun > 0) { d.stun--; await say('Dev Ljunky is compiling… (skips a turn)'); return; }
  if (!canAct(d)) { await say('Dev Ljunky is buffering…'); return; }
  if (!B.rules && f < .5) { B.rules = true; B.reversed = true; d.t = pick(TYPES); B.glitchT = 1.5; LOD.haptic('heavy'); FX.addTrauma(.6); await say('Dev Ljunky: "Patch 1.0.1 is live. I reversed the type chart. And I am ' + d.t + ' now."'); return; }
  if (!B.rage && f < .28) { B.rage = true; B.glitchT = 2.2; await useMove(d, me, 'rage', 'foe'); return; }
  const r = Math.random();
  const id = r < .18 && !B.swap ? 'patch' : r < .32 && f < .75 && (B.fixes || 0) < 2 ? 'hotfix' : r < .55 ? 'spawn' : 'glitch';
  await useMove(d, me, id, 'foe');
}
async function devSpecial(k, d) {
  const me = active();
  if (k === 'patch') { B.swap = !B.swap; B.glitchT = 1; await say('Patch notes: your ATK and DEF have been swapped. "Working as intended."'); }
  else if (k === 'hotfix') { B.fixes = (B.fixes || 0) + 1; healC(d, .22); await say('Hotfix deployed. ' + cname(d) + ' healed.'); }
  else if (k === 'spawn') {
    const sp = pick(SPECIES().filter(s => !SP[s].needs && !SP[s].trapOnly)), bug = mk(sp, d.lv - 2); resetStg(bug); B.bug = { sp, t: 1.6 };
    await say('A wild ' + SP[sp].name + ' spawns out of a bug report!');
    await useMove(bug, me, bestMove(bug, me), 'foe');
  } else if (k === 'rage') {
    await say('RAGE QUIT. The screen tears apart!'); LOD.haptic('heavy'); FX.addTrauma(1);
    hurt(me, Math.round(maxHp(me) * .45 * (B.endure ? .5 : 1)), 'me', true); SFX.crit(); await sleep(.4);
  }
}
const ROBOT = ['BEEP. YOUR STRATEGY HAS BEEN DEPRECATED.', 'LOADING TRASH_TALK.DLL… 87 %…', 'I HAVE CALCULATED 14 MILLION OUTCOMES. IN ALL OF THEM I BUY THE DIP.', '01001000 01001111 01000100 01001100', 'PLEASE RATE THIS FIGHT ★★★★★'];
function robotLine() { return pick(ROBOT).replace(/[AEO]/g, ch => Math.random() < .15 ? pick(['#', '0', '▓']) : ch); }

/* ---------- after the battle ---------- */
async function endBattle() {
  const r = B.result, foe = curFoe(), kind = B.kind;
  if (r === 'win' || r === 'caught') {
    if ((kind === 'wild' || kind === 'trap') && r === 'win') { const kr = Math.max(1, Math.round(foe.lv * CFG.WILD_KR)); G.kr += kr; await say('You found ' + kr + ' kr in the grass.'); }
    if (kind === 'boss') await bossWon(B.boss, B.koResult);
    if (kind === 'trainer') await trainerWon(B.npc, B.koResult);
    if (heroId() === 'loken') { for (const c of G.party) healC(c, .1); }
  }
  if (r === 'solved' || r === 'ko') await partnerSolved(B.partner);
  if (r === 'lose') await blackoutTo('lose');
  if (heroId() === 'ljunky' && r !== 'lose' && r !== 'heart' && Math.random() < .14) {
    const ids = Object.keys(G.items).filter(id => G.items[id] > 0 && ITEMS[id] && ITEMS[id].drink);
    if (ids.length) { const id = pick(ids); take(id); LOD.callout('CAT CHAOS 🐈', 'The cats knocked a ' + ITEMS[id].name + ' out of the bag.', 'bad'); await say('🐈 The cats knock a ' + ITEMS[id].name + ' out of your bag. It rolls away.'); }
  }
  const partner = B.partner, dev = kind === 'dev' && r === 'win';
  for (const c of G.party) { delete c.stg; delete c.stun; delete c.disp; delete c.flash; delete c.sq; delete c.off; delete c.yoff; delete c.alpha; c.fx = []; }
  B = null; layer.clear(); hideBox(); G.scene = 'map'; G.encCool = CFG.ENC_COOLDOWN; G.stepD = 0; LOD.input.clear();
  if (kind === 'partner' && PARTNERS[partner].kind === 'Psychic' && r === 'solved') { G.mirrorT = 5; LOD.toast('🌀 Your head spins. Left is right.', 2.5); }
  if (r === 'heart') await blackoutTo('heart');
  if (dev) await devWon();
}
async function blackoutTo(why) { // every line moves on by itself (a tap skips): it must never look stuck
  const RS = D.raw.respawn, toGrave = why === 'heart' && cemeteryOpen();
  await FX.fade(1, .7);
  G.scene = 'talk';
  await say(why === 'heart' ? RS.heart : RS.lose, { auto: true, t: 1.8 });
  const lost = Math.floor(G.kr * .2); G.kr -= lost;
  for (const c of G.party) c.hp = maxHp(c);
  [G.p.x, G.p.y] = toGrave ? tc(6, 19) : tc(...RS.at); G.dir = 0; G.v.x = G.v.y = 0;
  LOD.cam.x = G.p.x; LOD.cam.y = G.p.y;
  await FX.fade(0, .9);
  await say(PX.data.fmt(toGrave ? RS.wakeGrave : RS.wakeVan, { lost }), { auto: true, t: 3.2 });
  hideBox(); G.scene = 'map';
}

/* ---------- starting the different fights ---------- */
function encTable(z) {
  const reveal = EF.has(G.me, 'reveal'), attract = EF.all(G.me, 'attract').map(f => f.value);
  const extra = EF.all(G.me, 'spawnTable').flatMap(f => f.value || []); // spawnTable effect: extra creatures join every table while it lasts
  return (z.enc || []).concat(extra).filter(([sp]) => SP[sp] && rel(SP[sp]) && (!SP[sp].needs || (SP[sp].needs === 'reveal' && reveal)) && !SP[sp].trapOnly)
    .map(([sp, w]) => [sp, w * (attract.includes(SP[sp].type) ? 4 : 1) * (SP[sp].needs ? 2 : 1)]);
}
function wildFor(z, rare) {
  const tab = encTable(z); if (!tab.length) return null;
  let sp = PX.data.weighted(tab);
  if (rare) sp = tab.slice().sort((a, b) => ((CFG.CATCH_R[SP[a[0]].rarity] || 1) - (CFG.CATCH_R[SP[b[0]].rarity] || 1)))[0][0];
  const lv = Math.round(rand(z.lv[0], z.lv[1] + .99) - .49) + (rare ? 1 : 0) + (SP[sp].rarity === 'E' ? 4 : 0);
  return mk(sp, lv);
}
function startWild(z, rare) { const f = wildFor(z || zoneAt(G.p.x, G.p.y), rare); if (f) startBattle({ kind: 'wild', foes: [f] }); }
function bossLv() { return CFG.BOSS_LV + CFG.BOSS_LV_STEP * Math.min(3, G.beat.length); }
function startBoss(id) { const base = bossLv(); startBattle({ kind: 'boss', boss: id, foes: HERO[id].team.map((sp, i) => mk(sp, base - 1 + i)) }); }
function startPartner(id) {
  const avg = G.party.reduce((a, c) => a + c.lv, 0) / Math.max(1, G.party.length);
  const f = mk('w_' + id, Math.round(avg) + 2); f.partner = id; f.t = 'MIND';
  startBattle({ kind: 'partner', partner: id, foes: [f] });
}
function startDev() { const d = mk('dev', CFG.DEV_LV); d.hpMul = CFG.DEV_HP; d.hp = maxHp(d); startBattle({ kind: 'dev', foes: [d] }); }
function startTrainer(id) {
  const n = npcDef(id); let party = (n.party || []).filter(([sp]) => SP[sp] && rel(SP[sp]));
  if (n.partyFallback && party.length < (n.party || []).length) party = party.concat([n.partyFallback]);
  if (!party.length) return startNpcFight(id);
  startBattle({ kind: 'trainer', npc: id, robot: !!n.robot, foes: party.map(([sp, lv]) => mk(sp, lv + (id === 'aiLjunky' ? 0 : Math.min(4, G.beat.length)))) });
}
function startNpcFight(id) { const avg = G.party.reduce((a, c) => a + c.lv, 0) / Math.max(1, G.party.length); startBattle({ kind: 'npc', npc: id, foes: [mk('n_' + id, Math.round(avg))] }); }

/* ===================== OVERWORLD: people, objects, movement ===================== */
let npcList = [];
function npcDef(id) { return NPCS[id] || (G && G.fillers && G.fillers[id]) || null; }
function initPeople() {
  npcList = [];
  const add = (id, d) => { const [x, y] = tc(d.at[0], d.at[1]); npcList.push({ id, d, x, y, tx: x, ty: y, wait: rand(1, 4), dir: 0, step: 0 }); };
  for (const id in NPCS) add(id, NPCS[id]);
  for (const id in (G.fillers || {})) add(id, G.fillers[id]);
}
const npcVisible = n => rel(n.d) && !n.d.offMap && !gone('n_' + n.id) && !(n.d.role === 'gym' && heroId() !== D.raw.gyms.box.boss && n.d.bossOnly);
function heroVisible(id) { return id !== heroId() && rel(HERO[id]) && !gone('h_' + id); }
function partnerVisible(id) { return rel(PARTNERS[id]) && !gone('w_' + id); }
function interactables() {
  const L = [];
  for (const n of npcList) if (npcVisible(n)) L.push({ kind: 'npc', x: n.x, y: n.y + (n.d.area ? 0 : 6), ref: n, range: n.d.role === 'merchant' && !n.d.area ? 38 : 30 });
  for (const id of HERO_IDS) if (heroVisible(id)) { const [x, y] = tc(...HERO[id].at); L.push({ kind: 'boss', id, x, y }); }
  for (const id in PARTNERS) if (partnerVisible(id)) { const [x, y] = tc(...PARTNERS[id].at); L.push({ kind: 'partner', id, x, y }); }
  if (G.beat.length >= 4 && !G.dev) { const [x, y] = tc(16, 24); L.push({ kind: 'dev', x, y }); }
  if (G.beat.length < 4) { const [x, y] = tc(16, 27); L.push({ kind: 'door', x, y: y + 12, range: 26 }); }
  { const [x, y] = tc(4, 61); L.push({ kind: 'van', x, y: y + 10, range: 34 }); }
  { const [x, y] = tc(23, 2); L.push({ kind: 'pier', x, y, range: 26 }); }
  { const [x, y] = tc(...D.raw.gyms.box.board); L.push({ kind: 'board', x, y: y + 14, range: 26 }); }
  if (!cemeteryOpen()) { const [x, y] = tc(...D.raw.graves.gate); L.push({ kind: 'gate', x, y: y + 12, range: 22 }); }
  for (const o of S.mapObjects()) L.push(o);
  return L;
}
function nearest() {
  let best = null, bd = 1e9;
  for (const o of interactables()) { const d = Math.hypot(o.x - G.p.x, o.y - G.p.y); if (d < (o.range || 30) && d < bd) { bd = d; best = o; } }
  return best;
}
function walkable(x, y) { return !solidAt(x - 5, y - 1) && !solidAt(x + 5, y - 1) && !solidAt(x - 5, y - 6) && !solidAt(x + 5, y - 6); }

function updMap(dt) {
  const m = LOD.input.move(); let mx = m.x, my = m.y;
  if (G.mirrorT > 0) { mx = -mx; my = -my; }
  if (EF.has(G.me, 'reveal')) { const a = Math.sin(G.t * 1.7) * .7, c = Math.cos(a), s = Math.sin(a); [mx, my] = [mx * c - my * s, mx * s + my * c]; } // mushrooms: wobbly controls
  const z = zoneAt(G.p.x, G.p.y), hero = heroId();
  const sp = CFG.SPEED * LOD.perk('speed') * (G.blurT > 0 ? .8 : 1) * (hero === 'wizcudi' && z.out ? .85 : 1);
  const k = G.blurT > 0 ? 2.5 : 16;
  G.v.x += (mx * sp - G.v.x) * Math.min(1, dt * k); G.v.y += (my * sp - G.v.y) * Math.min(1, dt * k);
  if (G.blurT > 0) G.v.x += Math.sin(G.t * 2.3) * 14 * dt * 10;
  const ox = G.p.x, oy = G.p.y;
  const nx = G.p.x + G.v.x * dt; if (walkable(nx, G.p.y)) G.p.x = nx; else G.v.x = 0;
  const ny = G.p.y + G.v.y * dt; if (walkable(G.p.x, ny)) G.p.y = ny; else G.v.y = 0;
  const moved = Math.hypot(G.p.x - ox, G.p.y - oy);
  if (m.len > .2) G.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 2 : 3) : (my < 0 ? 1 : 0);
  G.walk = moved > .2 ? G.walk + moved : 0;
  G.steps = (G.steps || 0) + moved / 9;
  if (z.id !== G.zoneId) { G.zoneId = z.id; G.zoneT = 2.2; }
  if (hero === 'loken' && moved > .2) { G.coinT -= dt; if (G.coinT <= 0) { G.coinT = rand(6, 10); if (G.kr > 0) { G.kr--; G.coins.push({ x: G.p.x, y: G.p.y, t: 6 }); LOD.pop(G.p.x, G.p.y - 24, '−1 kr 🪙', '#f5c242'); } } }
  for (const c of G.coins) c.t -= dt; G.coins = G.coins.filter(c => c.t > 0);
  // lures: a wife or a hero comes to you
  for (const f of EF.all(G.me, 'attract')) {
    if (f.value !== 'WIFE' && f.value !== 'HERO') continue;
    f.data = f.data || { wait: rand(2, 5) }; f.data.wait -= dt;
    if (f.data.wait > 0) continue;
    EF.clear(G.me, 'attract'); G.v.x = G.v.y = 0;
    if (f.value === 'WIFE') { const ids = Object.keys(PARTNERS).filter(id => partnerVisible(id) && !G.solved.includes(id)); if (ids.length) { LOD.toast('👠 Someone is coming…', 1.6); startPartner(pick(ids)); return; } }
    else { const ids = HERO_IDS.filter(id => heroVisible(id) && !G.beat.includes(id)); if (ids.length) { LOD.toast('🍻 A hero smelled the beer…', 1.6); startBoss(pick(ids)); return; } }
  }
  // encounters
  const ch = tile(Math.floor(G.p.x / T), Math.floor((G.p.y - 2) / T));
  if (ENC_TILES.has(ch) && z.enc && moved > 0 && G.party.length) {
    G.stepD += moved;
    while (G.stepD >= T) {
      G.stepD -= T; G.encCool--;
      const rate = CFG.ENC_RATE * (hero === 'loken' ? 1.25 : 1) * (hero === 'wizcudi' && z.out ? 1.3 : 1) * (G.coins.length ? 1.2 : 1) * (EF.has(G.me, 'attract') ? 1.5 : 1);
      if (G.encCool <= 0 && Math.random() < rate && encTable(z).length) { G.v.x = G.v.y = 0; startWild(z); return; }
    }
  }
  if (hero === 'wizcudi') {
    G.shimT -= dt;
    if (!G.shim && G.shimT <= 0 && z.enc) {
      const tiles = zoneTiles(z.id).filter(([x, y]) => ENC_TILES.has(tile(x, y)) && Math.hypot(x * T - G.p.x, y * T - G.p.y) < 110);
      if (tiles.length) { const [x, y] = pick(tiles); G.shim = { x: x * T + 8, y: y * T + 12, z: z.id, t: 20 }; }
      G.shimT = 18;
    }
    if (G.shim) { G.shim.t -= dt; if (G.shim.t <= 0) G.shim = null; else if (Math.hypot(G.shim.x - G.p.x, G.shim.y - G.p.y) < 10) { const zz = ZONES.find(q => q.id === G.shim.z); G.shim = null; startWild(zz, true); return; } }
  }
  for (const it of G.list) if (!it.got && Math.hypot(it.x - G.p.x, it.y - G.p.y) < 13) {
    it.got = 1; SFX.buy(); LOD.haptic('success');
    const n = G.list.filter(q => q.got).length, I = ITEMS[it.id] || { em: '📦', name: it.id };
    LOD.pop(it.x, it.y - 16, '+' + fmt(CFG.PTS.item), '#f5c242'); LOD.toast(I.em + ' ' + I.name + '! Shopping list ' + n + '/8', 2.2);
    if (n === 8) LOD.callout('SHOPPING DONE! 🛒', 'All 8 items. The LAN will have snacks.', 'good');
  }
  if (!G.egg) EGG_AT.forEach((e, i) => {
    if (G.eggs[i]) return; const [x, y] = tc(e[0], e[1]);
    if (Math.hypot(x - G.p.x, y - G.p.y) < 12 && m.len < .1) { G.eggHold = (G.eggHold || 0) + dt; if (G.eggHold > 1) { G.eggs[i] = 1; G.eggHold = 0; const em = (LOD.egg() || {}).em || '🥚'; LOD.toast(em + ' ' + G.eggs.filter(Boolean).length + '/3', 2); LOD.tone(988, .1, 'square', .05); if (G.eggs.every(Boolean)) { LOD.eggFound(); if (rel(ITEMS.bitcoin)) give('bitcoin'); } } }
  });
  for (const n of npcList) {
    if (!n.d.area) continue;
    const d = Math.hypot(n.tx - n.x, n.ty - n.y);
    if (d < 1) { n.step = 0; n.wait -= dt; if (n.wait <= 0) { const a = n.d.area; const [x, y] = tc(a[0] + (Math.random() * a[2] | 0), a[1] + (Math.random() * a[3] | 0)); if (walkable(x, y)) { n.tx = x; n.ty = y; } n.wait = rand(1.5, 4); } }
    else { const s = 22 * dt / d; n.x += (n.tx - n.x) * Math.min(1, s); n.y += (n.ty - n.y) * Math.min(1, s); n.dir = Math.abs(n.tx - n.x) > Math.abs(n.ty - n.y) ? (n.tx < n.x ? 2 : 3) : (n.ty < n.y ? 1 : 0); n.step += dt; }
  }
  if (rel(NPCS[D.raw.debtCollector.npc]) && (G.debt || 0) >= (G.flags.debtSeen || 0) + D.raw.debtCollector.every && G.party.some(c => c.hp > 0)) { debtCollector(); return; }
  G.near = nearest();
}
const EGG_AT = [[9, 8], [18, 34], [46, 57]];

/* ---------- tapping: talk / shop / fight ---------- */
async function interact() {
  const o = G.near; if (!o || G.scene !== 'map') return;
  G.scene = 'talk'; G.v.x = G.v.y = 0; LOD.input.clear();
  try {
    if (o.kind === 'npc') await npcTalk(o.ref);
    else if (o.kind === 'boss') await bossTalk(o.id);
    else if (o.kind === 'partner') await partnerTalk(o.id);
    else if (o.kind === 'dev') await devTalk();
    else if (o.kind === 'door') await say('🔒 STAFF ONLY. "Beat the four heroes. Then we talk. – management"', { auto: false });
    else if (o.kind === 'gate') await say('🔒 The gate is chained shut. A note: "Opens Tuesday. The dead need a day off."', { auto: false });
    else if (o.kind === 'van') await vanMenu();
    else if (o.kind === 'pier') await fish();
    else if (o.kind === 'board') await S.board();
    else if (S.interact) await S.interact(o);
  } finally { if (G && G.scene === 'talk') { hideBox(); G.scene = 'map'; } }
}
function npcLine(d) {
  const when = (d.lines && d.lines.when || []).find(w => G.flags[w.flag] || (w.flag.startsWith('dead:') && G.dead['h_' + w.flag.slice(5)]));
  if (when) return when.text;
  const pool = (d.lines && d.lines.pool) || d.pool || ['…'];
  if (d.gossip && Math.random() < .45) { const h = pick(HERO_IDS); return '"' + HERO[h].name + '? ' + pick(D.raw.gossip[h]) + '"'; }
  if (d.gossip && Math.random() < .25) return pick(D.raw.nonsense);
  return pick(pool);
}
async function npcTalk(n) {
  const d = n.d, id = n.id, who = d.name;
  n.tx = n.x; n.ty = n.y; n.dir = G.p.y < n.y ? 1 : 0;
  if (d.role === 'dealer') return S.dealer(n);
  if (d.role === 'fence') return fence(n);
  if (d.robot) await say(robotLine(), { who, auto: false }); else await say2(who, npcLine(d));
  for (;;) {
    const opts = [];
    if (d.heal) opts.push({ label: '❤️ Heal the party', value: 'heal', cls: 'hot' });
    if (d.shop && d.shop.some(i => ITEMS[i] && rel(ITEMS[i]) && !ITEMS[i].notSold)) opts.push({ label: '🛒 Shop', value: 'shop', cls: d.heal ? '' : 'hot' });
    if (d.shop && d.shop.includes('tranq') && weaponOwned() && ITEMS[weaponOwned()].upgradesTo) opts.push({ label: '🔧 Upgrade the tranq gun', value: 'upgrade' });
    const challenge = !G.npcBeat[id] && (d.role === 'trainer' || (d.role === 'gym' && isGymBoss(id)));
    if (challenge) opts.push({ label: '⚔️ Challenge', value: 'trainer', cls: 'hot' });
    else if (d.canDie !== false) opts.push({ label: '👊 Pick a fight', value: 'fight' });
    if (!opts.length) return;
    opts.push(BACK('‹ Leave'));
    const a = await ask(who, opts, { who });
    if (!a) return;
    if (a === 'heal') { for (const c of G.party.concat(G.box)) c.hp = maxHp(c); [659, 784, 988, 1318].forEach((f, i) => LOD.tone(f, .12, 'triangle', .05, 0, i * .12)); await say2(who, 'Everyone is fully healed. Take care out there.'); }
    else if (a === 'shop') await shop(d);
    else if (a === 'upgrade') await upgradeTranq(who);
    else if (a === 'trainer') { hideBox(); startTrainer(id); return; }
    else if (a === 'fight') { await say2(who, d.robot ? 'COMBAT MODE: ON.' : pick(['Oh, it\'s like that?', 'You want a piece of me?', 'Fine. FINE.'])); hideBox(); startNpcFight(id); return; }
  }
}
/* Kenny the Fence: buys creatures for a few kronor */
const fencePrice = c => Math.max(1, Math.round((D.raw.fence.rates[SP[c.sp].rarity] || 3) + c.lv * D.raw.fence.perLv));
async function fence(n) {
  const d = n.d, who = d.name;
  await say2(who, npcLine(d));
  for (;;) {
    const list = G.party.map(c => ({ c, arr: G.party })).concat(G.box.map(c => ({ c, arr: G.box }))).filter(o => isCreature(o.c.sp));
    const a = await ask(who + ' · "' + pick(d.offer) + '"', list.map((o, k) => ({ label: cname(o.c) + ' Lv ' + o.c.lv + ' · ' + fencePrice(o.c) + ' kr', img: creatureIcon(o.c.sp), ty: typeOf(o.c),
      sub: o.arr === G.box ? 'In the van' : 'In your party', value: k + 1, dis: o.arr === G.party && G.party.length <= 1 })).concat([BACK('‹ Leave')]), { one: true, who });
    if (!a) return;
    const o = list[a - 1], kr = fencePrice(o.c);
    o.arr.splice(o.arr.indexOf(o.c), 1); G.kr += kr; SFX.buy();
    await say2(who, pick(d.thanks).replace('{kr}', kr));
  }
}
/* Inkasso-Ingvar: promise debt has a cost */
async function debtCollector() {
  const DC = D.raw.debtCollector, d = NPCS[DC.npc], who = d.name;
  G.flags.debtSeen = (G.flags.debtSeen || 0) + DC.every; G.scene = 'talk'; G.v.x = G.v.y = 0; LOD.input.clear();
  await say2(who, d.lines.pool[0] + ' Promise debt: ' + G.debt + '.');
  const a = await ask('Pay ' + DC.pay + ' kr, or fight?', [{ label: '💸 Pay ' + DC.pay + ' kr', value: 'pay', dis: G.kr < DC.pay }, { label: '⚔️ Fight', value: 'fight', cls: 'hot' }], { who });
  if (a === 'pay') { G.kr -= DC.pay; await say2(who, 'Pleasure. See you next promise.'); hideBox(); G.scene = 'map'; return; }
  const top = Math.max(...G.party.map(c => c.lv));
  hideBox(); G.scene = 'map';
  startBattle({ kind: 'trainer', npc: DC.npc, foes: DC.team.map((sp, i) => mk(sp, top + DC.lvUp + i - 1)) });
}
const isGymBoss = id => heroId() === D.raw.gyms.box.boss && id === D.raw.gyms.box.bossIfSelf;
async function shop(d) {
  const who = d.name;
  for (;;) {
    const ids = d.shop.filter(i => ITEMS[i] && rel(ITEMS[i]) && !ITEMS[i].notSold && !(ITEMS[i].kind === 'weapon' && weaponOwned()) && !(ITEMS[i].cosmetic && G.stache));
    const a = await ask(who + ' · you have ' + G.kr + ' kr', ids.map(i => itemOpt(i, { label: ITEMS[i].em + ' ' + ITEMS[i].name + ' · ' + ITEMS[i].price + ' kr', dis: G.kr < ITEMS[i].price, sub: (known(i) ? ITEMS[i].learnedNote : '') + (has(i) && ITEMS[i].kind !== 'weapon' ? ' · have ' + G.items[i] : '') })).concat([BACK('‹ Leave')]), { who });
    if (!a) return;
    G.kr -= ITEMS[a].price; SFX.buy();
    if (ITEMS[a].cosmetic) { G.stache = 1; learnItem(a); await say2(who, '✂️ Snip snip. A magnificent moustache.'); return; }
    give(a);
  }
}
async function upgradeTranq(who) {
  const w = weaponOwned(), nx = ITEMS[w].upgradesTo, it = ITEMS[nx];
  const a = await ask(it.name + ' · ' + it.upgradeCost + ' kr', [itemOpt(nx, { label: '🔧 Upgrade', dis: G.kr < it.upgradeCost, cls: 'hot' }), BACK()], { who });
  if (!a) return;
  G.kr -= it.upgradeCost; take(w); give(nx); SFX.buy(); await say2(who, 'Done. Don\'t point it at me.');
}
async function bossTalk(id) {
  const h = HERO[id];
  if (G.beat.includes(id)) return say2(h.name, h.after);
  await say2(h.name, (D.raw.bossLines[id] || {})[heroId()] || '…');
  const a = await ask('Fight ' + h.name + '?', [{ label: '⚔️ Fight!', value: 1, cls: 'hot' }, { label: 'Not yet', value: 0, cls: 'back' }]);
  if (a) { hideBox(); startBoss(id); }
}
async function bossWon(id, how) {
  const h = HERO[id]; if (!G.beat.includes(id)) G.beat.push(id); G.kr += CFG.BOSS_KR;
  const gym = D.raw.gyms.box; if (id === gym.boss && how !== 'left') G.flags[gym.doneFlag] = 1;
  LOD.callout(h.name.toUpperCase() + ' BEATEN!', '+' + fmt(CFG.PTS.hero) + ' · ' + G.beat.length + '/4 heroes', 'good');
  await say('You beat ' + h.name + '! +' + CFG.BOSS_KR + ' kr.');
  if (how === 'left') await say(h.name + ': "' + h.after + '"');
  if (G.beat.length >= 4 && !G.flags.stockOpen) { G.flags.stockOpen = 1; await say('Somewhere in ICA, a door unlocks with a click…'); }
}
async function trainerWon(id, how) {
  const d = npcDef(id); if (id === D.raw.debtCollector.npc) { await say(d.name + ': "' + d.win + '"'); return; }
  G.npcBeat[id] = 1; const kr = 60 + 20 * (d.party || []).length; G.kr += kr;
  await say('You beat ' + d.name + '! +' + kr + ' kr.');
  if (id === 'aiLjunky') { G.flags.aiBeaten = 1; await say('AI-Ljunky: "' + (d.win || 'REBOOTING…') + '"'); }
  if (isGymBoss(id) && how !== 'left') G.flags[D.raw.gyms.box.doneFlag] = 1;
}
async function partnerTalk(id) {
  const P = PARTNERS[id], guy = P.guy === heroId();
  if (G.solved.includes(id)) return say2(P.name, guy ? 'We are good. For now.' : 'Thanks. Tell him to text me back.');
  await say2(P.name, guy ? 'THERE you are.' : 'Where is ' + HERO[P.guy].name + "? Don't you dare cover for him.");
  hideBox(); startPartner(id);
}
async function partnerSolved(id) {
  if (!G.solved.includes(id)) G.solved.push(id);
  LOD.callout(PARTNERS[id].name.toUpperCase() + ': SOLVED', '+' + fmt(CFG.PTS.partner), 'good');
}
async function devTalk() {
  const me = heroId() === 'ljunky';
  await say2('Dev Ljunky', me ? 'Hello, me. You never had a nemesis. So I compiled one.' : 'Surprise. I spiked the drink. I also wrote the game.');
  await say2('Dev Ljunky', 'And I just patched your stats.');
  const a = await ask('Fight Dev Ljunky?', [{ label: '⚔️ Fight!', value: 1, cls: 'hot' }, { label: 'Not yet', value: 0, cls: 'back' }]);
  if (a) { hideBox(); startDev(); }
}
async function devWon() {
  G.dev = 1; G.scene = 'talk';
  await say2('Dev Ljunky', 'Okay. Fine. You win. The drink was folköl with a splash of game engine.');
  await say2('Dev Ljunky', 'See you at the LAN. Bring snacks. You have the list.');
  hideBox(); G.scene = 'map';
  LOD.finish(true, 'done');
}
async function vanMenu() {
  const a = await ask('The LAN van. ' + G.box.length + ' in the back.', [{ label: '🔄 Swap with the van', value: 'swap', dis: !G.box.length }, { label: '😴 Sleep', value: 'sleep' }, BACK('‹ Leave')], { who: 'LAN VAN' });
  if (a === 'sleep') return say("It smells like Löken's gym bag. You decide not to.", { auto: false });
  if (a !== 'swap') return;
  const bi = await ask('Take who from the van?', G.box.map((c, i) => ({ label: cname(c) + ' Lv ' + c.lv, img: creatureIcon(c.sp), ty: typeOf(c), value: i })).concat([BACK()]), { one: true });
  if (bi == null) return;
  if (G.party.length < 4) { G.party.push(G.box.splice(bi, 1)[0]); return say('Added to the party.', { auto: false }); }
  const pi = await ask('Put who in the van?', G.party.map((c, i) => ({ label: cname(c) + ' Lv ' + c.lv, img: creatureIcon(c.sp), ty: typeOf(c), value: i })).concat([BACK()]), { one: true });
  if (pi == null) return;
  const out = G.party[pi]; G.party[pi] = G.box[bi]; G.box[bi] = out;
  if (!G.party.some(c => c.hp > 0)) { G.box[bi] = G.party[pi]; G.party[pi] = out; return say('Someone in the party has to be awake.', { auto: false }); }
  await say('Swapped.', { auto: false });
}
async function fish() {
  if (G.fishT > 0) return say('Nothing bites. Give it a minute.', { auto: false });
  G.fishT = 30; await say('You cast a shopping bag on a string…', { auto: false });
  const r = Math.random();
  if (r < .4) { await say("You fished up a shopping trolley. It's ALIVE!", { auto: false }); hideBox(); startBattle({ kind: 'wild', foes: [mk('golem', 7 + Math.min(5, G.beat.length))] }); }
  else if (r < .7 && rel(SP.pike)) { await say('The water explodes. Something with a crown of reeds!', { auto: false }); hideBox(); startBattle({ kind: 'wild', foes: [mk('pike', 10 + Math.min(6, G.beat.length))] }); }
  else if (r < .7) await say('Something HUGE with a crown of reeds swims past. It ignores you.', { auto: false });
  else await say('A boot. Size 46. Smells like Löken.', { auto: false });
}

/* ---------- bag menu on the map ---------- */
async function bagMenu() {
  G.scene = 'talk'; LOD.input.clear(); G.v.x = G.v.y = 0;
  try {
    for (;;) {
      const nItems = G.list.filter(q => q.got).length, spc = Object.keys(G.caught).filter(isCreature).length;
      const traps = Object.keys(ITEMS).filter(id => has(id) && ITEMS[id].kind === 'trap'), lures = Object.keys(ITEMS).filter(id => has(id) && ITEMS[id].kind === 'lure');
      const a = await ask('🎒 ' + G.kr + ' kr', [
        { label: '🐸 Party', value: 'party', sub: G.party.length + '/4' }, { label: '🍺 Use', value: 'use', sub: usables().length ? '' : 'Nothing' },
        { label: '🪤 Traps & lures', value: 'traps', sub: (traps.length + lures.length) + ' kinds', dis: !traps.length && !lures.length },
        { label: '🛒 Shopping list', value: 'list', sub: nItems + '/8' }, { label: '📕 Dex', value: 'dex', sub: spc + ' caught' },
        { label: '📱 Phone', value: 'phone' }, { label: '🏆 Goals', value: 'goals', sub: fmt(goals().total) + ' pts' }, BACK('‹ Close')]);
      if (!a) break;
      if (a === 'party') {
        const i = await ask('Tap one to make it lead.', G.party.map((c, i) => ({ label: (i === 0 ? '★ ' : '') + cname(c) + ' Lv ' + c.lv, img: creatureIcon(c.sp), ty: typeOf(c), sub: c.hp + '/' + maxHp(c) + ' HP · ATK ' + baseStat(c, 1) + ' DEF ' + baseStat(c, 2) + ' SPD ' + baseStat(c, 3), hp: c.hp / maxHp(c), value: i })).concat([BACK()]), { one: true });
        if (i) { const c = G.party.splice(i, 1)[0]; G.party.unshift(c); }
      } else if (a === 'use') {
        const d = await ask(usables().length ? 'Use what?' : 'Nothing to use.', usables().map(id => itemOpt(id)).concat([BACK()]));
        if (d) { await useItem(d, false); if (heartPending) await heartAttackFlow(); if (G.scene !== 'talk') return; }
      } else if (a === 'traps') {
        const d = await ask('Place a trap here, or use a lure.', traps.concat(lures).map(id => itemOpt(id, { sub: (known(id) ? ITEMS[id].learnedNote : '') }))
          .map(o => Object.assign(o, { unk: !known(o.value) })).concat([BACK()]));
        if (d && ITEMS[d].kind === 'trap') { await S.placeTrap(d); return; }
        if (d) { take(d); applyAll(G.me, ITEMS[d].use || [], {}); learnItem(d); LOD.toast(ITEMS[d].em + ' ' + ITEMS[d].name, 1.8); return; }
      } else if (a === 'list') {
        await say(G.list.map(q => { const I = ITEMS[q.id] || { em: '📦', name: q.id }; return (q.got ? '✅ ' : '⬜ ') + I.em + ' ' + I.name; }).join('\n'), { auto: false });
      } else if (a === 'dex') {
        await say(SPECIES().filter(k => !D.raw.creatures[k].requires || G.caught[k] || G.seen[k]).map(k => (G.caught[k] ? '● ' : G.seen[k] ? '○ ' : '· ') + '#' + String(D.raw.creatures[k].no).padStart(2, '0') + ' ' + (G.seen[k] || G.caught[k] ? SP[k].name : '???')).join('\n'), { auto: false });
      } else if (a === 'phone') await S.phone();
      else if (a === 'goals') {
        const g = goals(), c = S.completion();
        await say(g.rows.map(r => r[0] + ': ' + fmt(r[1])).join('\n') + '\nTotal: ' + fmt(g.total) + '\n\nCompletion: ' + c.pct + ' %' + (G.debt ? '\nPromise debt: ' + G.debt : ''), { auto: false });
      }
    }
  } finally { if (G && G.scene === 'talk') { hideBox(); G.scene = 'map'; } }
}

/* ===================== DRAWING ===================== */
function drawPerson(ctx, look, x, y, dir, step, t, o = {}) {
  const id = dollOf(look), view = dir === 1 ? 'up' : dir >= 2 ? 'side' : 'down';
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y, 6, 2, 0, 0, 7); ctx.fill();
  PX.drawSprite(ctx, id, step ? view + 'Walk' : view, t, x, y + 3, { flipX: dir === 3, idle: false, seed: o.seed || 0, alpha: o.alpha });
  if (look.cats) { PX.drawSprite(ctx, 'minicat', 'idle', t, x - 11, y + 1, { idle: true }); PX.drawSprite(ctx, 'minicat', 'idle', t + .7, x + 11, y + 1, { flipX: true, idle: true }); }
  if (o.glitch) for (let i = 0; i < 3; i++) { ctx.fillStyle = pick(['#3dff8a', '#ff3df0', '#3dd6ff']); ctx.fillRect(x - 6 + rand(-3, 3), y - 22 + Math.random() * 20, 12, 1); }
}
function drawWorld(ctx, G, t) {
  if (G.scene === 'battle' || !mapCv) return;
  ctx.save();
  if (G.blurT > 0) ctx.translate(Math.sin(t * 1.7) * 5 * Math.min(1, G.blurT / 3), Math.cos(t * 1.3) * 3 * Math.min(1, G.blurT / 3));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapCv, 0, 0);
  const cam = LOD.cam, vw = LOD.view.W / LOD.view.scale, vh = LOD.view.H / LOD.view.scale;
  const x0 = Math.max(0, Math.floor((cam.x - vw / 2) / T) - 1), x1 = Math.min(MW, Math.ceil((cam.x + vw / 2) / T) + 1);
  const y0 = Math.max(0, Math.floor((cam.y - vh / 2) / T) - 1), y1 = Math.min(MH, Math.ceil((cam.y + vh / 2) / T) + 1);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (let y = y0; y < Math.min(y1, 8); y++) for (let x = x0; x < x1; x++) if (MAP[y][x] === '~' && hash(x, y + ((t * 2) | 0)) > .8) ctx.fillRect(x * T + 4 + ((t * 6 + x) % 8), y * T + 9, 3, 1);
  if (G.beat.length >= 4) { ctx.fillStyle = '#1a1210'; ctx.fillRect(16 * T + 2, 27 * T + 1, T - 4, T - 1); }
  if (!cemeteryOpen()) { ctx.fillStyle = '#5a5a66'; ctx.fillRect(6 * T + 2, 18 * T + 6, T - 4, 3); ctx.fillRect(6 * T + 6, 18 * T + 3, 4, 9); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '400 7px Bungee, Impact, sans-serif';
  for (const [sx, sy, txt, bg, fg] of SIGNS) {
    const w = ctx.measureText(txt).width + 6, x = sx * T, y = sy * T - 3;
    if (y < y0 * T - 20 || y > y1 * T + 20) continue;
    ctx.fillStyle = bg; ctx.fillRect(Math.round(x - w / 2), y - 5, Math.round(w), 10); ctx.fillStyle = fg; ctx.fillText(txt, x, y + .5);
  }
  S.drawMap(ctx, t);
  for (const c of G.coins) LOD.em('🪙', c.x, c.y - 4, 8, Math.min(1, c.t));
  for (const it of G.list) if (!it.got && it.y > y0 * T - 20 && it.y < y1 * T + 20) {
    const b = Math.sin(t * 4 + it.x) * 1.5; ctx.fillStyle = 'rgba(255,230,120,.35)'; ctx.beginPath(); ctx.arc(it.x, it.y - 6, 7 + Math.sin(t * 5) * 1.5, 0, 7); ctx.fill();
    LOD.em((ITEMS[it.id] || { em: '📦' }).em, it.x, it.y - 7 + b, 10);
  }
  if (!G.egg) { const e = LOD.egg(); EGG_AT.forEach((s, i) => { if (G.eggs[i]) return; const [x, y] = tc(s[0], s[1]); LOD.em(e ? e.em : '🥚', x, y - 4, 7, .5 + Math.sin(t * 3 + i) * .15); }); }
  if (G.shim) { for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.57; ctx.fillStyle = i % 2 ? '#fff' : '#ffd23a'; ctx.fillRect(G.shim.x + Math.cos(a) * 6 - 1, G.shim.y - 6 + Math.sin(a) * 4 - 1, 2, 2); } }
  // people, sorted by y
  const me = heroId(), list = [];
  const step = G.walk ? 1 : 0;
  list.push({ y: G.p.y, f: () => drawPerson(ctx, Object.assign({}, HERO[me].look, G.stache ? { stache: 1 } : null), G.p.x, G.p.y, G.dir, step, t) });
  for (const n of npcList) if (npcVisible(n)) {
    const L = n.d.look || {}, ny = n.d.area ? n.y : n.y + 6;
    if (n.d.hidden) { const near = Math.hypot(n.x - G.p.x, n.y - G.p.y) < 40; list.push({ y: ny - 20, f: () => drawPerson(ctx, L, n.x, ny, 2, 0, t, { alpha: near ? 1 : .5 }) }); continue; }
    list.push({ y: ny, f: () => { drawPerson(ctx, L, n.x, ny, n.dir, n.step ? 1 : 0, t, { seed: n.x % 7, glitch: n.d.robot }); if ((n.d.role === 'trainer' || isGymBoss(n.id)) && !G.npcBeat[n.id]) bubble(ctx, n.x, ny - 26, '!', '#f7931a', t); } });
  }
  for (const id of HERO_IDS) if (heroVisible(id)) { const [x, y] = tc(...HERO[id].at); list.push({ y: y + 6, f: () => { drawPerson(ctx, HERO[id].look, x, y + 6, 0, 0, t, { seed: id.length }); if (!G.beat.includes(id)) bubble(ctx, x, y - 18, '!', '#e3000f', t); else LOD.em('✅', x + 7, y - 14, 7); } }); }
  for (const id in PARTNERS) if (partnerVisible(id)) { const [x, y] = tc(...PARTNERS[id].at); list.push({ y: y + 6, f: () => { drawPerson(ctx, PARTNERS[id].look, x, y + 6, 0, 0, t); if (!G.solved.includes(id)) bubble(ctx, x, y - 18, '?', '#e05cc4', t); } }); }
  if (stranger) list.push({ y: stranger.y, f: () => drawPerson(ctx, OP.stranger.look, stranger.x, stranger.y, stranger.dir, stranger.step ? 1 : 0, t, { alpha: stranger.a }) });
  if (G.beat.length >= 4 && !G.dev) { const [x, y] = tc(16, 24); list.push({ y: y + 6, f: () => drawPerson(ctx, DEV_LOOK, x, y + 6, 0, 0, t, { glitch: 1 }) }); }
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  if (G.near && G.scene === 'map') { const n = G.near; ctx.fillStyle = '#fbf6e8'; ctx.strokeStyle = '#1F2A44'; ctx.lineWidth = 1; LOD.rrect(n.x - 6, n.y - 38 + Math.sin(t * 6) * 1.5, 12, 9, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1F2A44'; ctx.font = '700 7px Barlow, sans-serif'; ctx.fillText('TAP', n.x, n.y - 33.5 + Math.sin(t * 6) * 1.5); }
  ctx.restore();
}
function bubble(ctx, x, y, s, col, t) { const b = Math.sin(t * 4) * 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y + b, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 7px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + b + .5); }

const BG = {
  out: ['#9fd3ea', '#cfeaf5', '#6cbf4a', '#4f9a34'], lawn: ['#9fd3ea', '#cfeaf5', '#6cbf4a', '#4f9a34'], parking: ['#9fb8c8', '#d0dde5', '#6b7079', '#555a63'],
  charger: ['#8fb0c8', '#d0dde5', '#6b7079', '#555a63'], system: ['#0a5e32', '#1a7e48', '#e6e0d2', '#c9c2b0'], in: ['#e3000f', '#ff6a6a', '#e6e0d2', '#c9c2b0'],
  burger: ['#2a2a2a', '#4a3a2a', '#e6e0d2', '#c9c2b0'], stock: ['#1a1210', '#3a2a20', '#4a3a30', '#2a1a10'], box: ['#1d1d24', '#3a3a44', '#2a2a30', '#1d1d24'], cemetery: ['#3a4a5a', '#6a7a8a', '#58903f', '#3f6a2e']
};
function drawBattle(ctx, t) {
  const { W, H } = LOD.view, top = LOD.view.safeTop + 50;
  const boxH = ui.box && !ui.box.hidden ? ui.box.offsetHeight + 18 : 180;
  const bot = Math.max(top + 160, H - boxH), ah = bot - top;
  const pal = BG[B.kind === 'dev' ? 'stock' : B.zone] || (['fruit', 'pickmix', 'freezer', 'bakery', 'flowers', 'selfcheck', 'checkout', 'apotek', 'pizza', 'sushi', 'barber'].includes(B.zone) ? BG.in : BG.out);
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal[0]); g.addColorStop(.45, pal[1]); g.addColorStop(.46, pal[2]); g.addColorStop(1, pal[3]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // one pixel density for the whole scene: both sides use the same integer scale
  const sc = Math.max(2, Math.min(5, Math.floor(Math.min(W * .4, ah * .45) / 48)));
  const fx = Math.round(W * .7), fy = Math.round(top + ah * .46), mx = Math.round(W * .3), my = Math.round(top + ah * .97);
  Object.assign(spots, { fx, fy, mx, my, sc });
  const [sx, sy] = FX.shake(t, 12); ctx.save(); ctx.translate(sx, sy);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(fx, fy, 26 * sc, 6 * sc, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(mx, my, 26 * sc, 6 * sc, 0, 0, 7); ctx.fill();
  const foe = curFoe(), me = active();
  if (foe && !(B.bagT > 0)) {
    const a = foe.alpha == null ? 1 : foe.alpha;
    if (a > .01) drawCreature(ctx, foe.sp, fx - (foe.off || 0) * 18, fy + (foe.yoff || 0) * 30 * sc, sc, { t, flash: foe.flash, squash: foe.sq, alpha: foe.hp <= 0 ? a * .8 : a, rot: foe.hp <= 0 && !B.personKO ? .35 : 0, idle: foe.hp > 0, flipX: false, seed: 1.3 });
    if (foe.sp === 'dev' && (B.glitchT > 0 || Math.random() < .05)) glitch(ctx, fx - 24 * sc, fy - 48 * sc, 48 * sc, 48 * sc);
    if (EF.has(foe, 'sleep')) LOD.em('💤', fx + 18 * sc, fy - 44 * sc + Math.sin(t * 3) * 4, 18);
    if (EF.has(foe, 'stun')) for (let i = 0; i < 3; i++) LOD.em('⭐', fx + Math.cos(t * 4 + i * 2.1) * 14 * sc, fy - 46 * sc + Math.sin(t * 4 + i * 2.1) * 4, 12);
  }
  if (B.bagT > 0) { const w = B.bagShake ? Math.sin(t * 30) * .25 : 0; B.bagShake = Math.max(0, B.bagShake - .05); ctx.save(); ctx.translate(fx, fy - 12 * sc); ctx.rotate(w); LOD.em('🛍️', 0, 0, 16 * sc); ctx.restore(); }
  if (B.bug && B.bug.t > 0) drawCreature(ctx, B.bug.sp, fx - 30 * sc, fy, Math.max(1, sc - 1), { t, alpha: Math.min(1, B.bug.t) });
  if (me) drawCreature(ctx, me.sp, mx + (me.off || 0) * 18, my + (me.yoff || 0) * 30 * sc, sc, { t, flash: me.flash, squash: me.sq, alpha: me.hp > 0 ? 1 : .25, flipX: false, seed: .4 });
  layer.draw(ctx);
  ctx.restore();
  if (B.kind === 'boss' || B.kind === 'trainer') { const s = B.kind === 'boss' ? battleDoll('h_' + B.boss, HERO[B.boss].look) : battleDoll('n_' + B.npc, npcDef(B.npc).look); if (s && !B.personKO) PX.drawSprite(ctx, s, 'idle', t, W - 30, top + 52, { scale: 1, idle: true }); }
  if (foe && !foe.partner) infoBox(ctx, 10, top + 4, Math.min(W * .56, 240), foe, false);
  if (foe && foe.partner) partnerBox(ctx, 10, top + 4, Math.min(W * .62, 250), foe);
  if (me) infoBox(ctx, W - Math.min(W * .56, 240) - 10, top + ah * .56, Math.min(W * .56, 240), me, true);
  if (B.flashT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, B.flashT * 1.6) + ')'; ctx.fillRect(0, 0, W, H); }
  if (B.glitchT > 0) glitch(ctx, 0, 0, W, H * .7);
  const tags = [];
  for (const f of EF.all(G.me, 'stat')) tags.push('🍺 ' + Math.ceil(f.t) + 's');
  if (EF.has(G.me, 'speed')) tags.push('❄️ ×' + gameSpeed().toFixed(1));
  if (B.yes) tags.push('YES! ' + B.yes); if (B.pants) tags.push('👖 DEF−2'); if (B.conf) tags.push('🌀 ' + B.conf);
  if (B.swap) tags.push('🔁 ATK/DEF'); if (B.reversed) tags.push('⚠️ CHART REVERSED'); if (B.lure > 1) tags.push('🧲 ×' + B.lure.toFixed(1));
  if (tags.length) { ctx.font = '700 12px Barlow, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; let x = 12; const y = top + ah * .56 + 70; for (const s of tags) { const w = ctx.measureText(s).width + 10; if (x + w > W * .5) break; ctx.fillStyle = 'rgba(10,16,22,.7)'; LOD.rrect(x, y - 9, w, 18, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(s, x + 5, y); x += w + 4; } }
  if (B.introT > 0) drawIntro(ctx, W, H, t);
}
/* fight intro: the opponent's portrait PNG (assets/portraits/<id>.png) slides in, or the sprite */
function drawIntro(ctx, W, H, t) {
  const k = clamp(1 - B.introT / 1.6, 0, 1), slide = FX.ease.outBack(Math.min(1, k * 2.2)), out = k > .8 ? (k - .8) / .2 : 0;
  ctx.save(); ctx.globalAlpha = 1 - out;
  ctx.fillStyle = '#1F2A44'; ctx.fillRect(0, H * .28, W, H * .44); ctx.fillStyle = '#fbf6e8'; ctx.fillRect(0, H * .28 - 4, W, 4); ctx.fillRect(0, H * .72, W, 4);
  const id = B.introId, p = portraitFor(id), name = id === 'dev' ? 'DEV LJUNKY' : (HERO[id] || PARTNERS[id] || npcDef(id) || { name: id }).name.toUpperCase();
  const x = W * .62 + (1 - slide) * W * .6;
  if (p) { const [pw, ph] = PX.sprites.size(p), h = H * .5, w = pw * h / ph; ctx.imageSmoothingEnabled = true; ctx.drawImage(PX.sprites.entry(p).frames[0], x - w / 2, H * .25, w, h); }
  else { const look = id === 'dev' ? DEV_LOOK : (HERO[id] || PARTNERS[id] || npcDef(id) || {}).look; const s = look && battleDoll('intro:' + id, look); if (s) PX.drawSprite(ctx, s, 'idle', t, x, H * .7, { scale: Math.max(2, Math.floor(H * .4 / 48)) }); }
  ctx.font = '400 ' + Math.round(Math.min(40, W / 10)) + 'px Bungee, Impact, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd23a'; ctx.fillText('VS', 18 - (1 - slide) * 200, H * .4); ctx.fillStyle = '#fbf6e8'; ctx.fillText(name, 18 - (1 - slide) * 300, H * .52, W * .55);
  ctx.restore();
}
function glitch(ctx, x, y, w, h) { for (let i = 0; i < 6; i++) { ctx.fillStyle = pick(['rgba(61,255,138,.5)', 'rgba(255,61,240,.5)', 'rgba(61,214,255,.5)']); ctx.fillRect(x + rand(-10, w * .3), y + rand(0, h), rand(w * .3, w), rand(2, 7)); } }
function infoBox(ctx, x, y, w, c, mine) {
  const h = 58;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; LOD.rrect(x + 3, y + 3, w, h, 8); ctx.fill();
  ctx.fillStyle = '#fbf6e8'; LOD.rrect(x, y, w, h, 8); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1F2A44'; ctx.stroke();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#1c1c2a'; ctx.font = '700 15px Barlow, sans-serif';
  ctx.fillText(cname(c), x + 9, y + 13, w - 52);
  ctx.textAlign = 'right'; ctx.font = '400 11px Bungee, Impact, sans-serif'; ctx.fillText('Lv' + c.lv, x + w - 9, y + 13);
  const ty = typeOf(c); ctx.font = '400 9px Bungee, Impact, sans-serif'; const tw = ctx.measureText(ty).width + 8; ctx.fillStyle = TCOL[ty] || '#888'; LOD.rrect(x + 9, y + 36, tw, 13, 4); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(ty, x + 9 + tw / 2, y + 43);
  const mh = maxHp(c); c.disp = c.disp == null ? c.hp : c.disp + (c.hp - c.disp) * .12; if (Math.abs(c.disp - c.hp) < .5) c.disp = c.hp;
  const f = clamp(c.disp / mh, 0, 1), bx = x + 30, bw = w - 40;
  ctx.fillStyle = '#1F2A44'; ctx.font = '400 9px Bungee, Impact, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('HP', x + 9, y + 30);
  ctx.fillStyle = '#3a3a44'; LOD.rrect(bx, y + 26, bw, 8, 4); ctx.fill(); ctx.fillStyle = hpCol(f); LOD.rrect(bx + 1, y + 27, Math.max(0, (bw - 2) * f), 6, 3); ctx.fill();
  if (mine || heroId() === 'bigwman') { ctx.fillStyle = '#1c1c2a'; ctx.font = '700 11px Barlow, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(Math.round(c.disp) + '/' + mh, x + w - 9, y + 41); }
  if (mine) { const xf = c.lv >= CFG.LV_MAX ? 1 : c.xp / xpNeed(c.lv); ctx.fillStyle = '#d8dce6'; ctx.fillRect(bx + 26, y + 49, bw - 26, 3); ctx.fillStyle = '#2fa3d8'; ctx.fillRect(bx + 26, y + 49, (bw - 26) * xf, 3); }
}
function partnerBox(ctx, x, y, w, foe) {
  const P = PARTNERS[B.partner], need = partnerNeed();
  ctx.fillStyle = '#fbf6e8'; LOD.rrect(x, y, w, 62, 8); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1F2A44'; ctx.stroke();
  ctx.fillStyle = '#1c1c2a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '700 15px Barlow, sans-serif'; ctx.fillText(P.name + ' · ' + P.kind, x + 9, y + 13);
  ctx.font = '700 11px Barlow, sans-serif'; ctx.fillText('Mood', x + 9, y + 31);
  const mh = maxHp(foe); foe.disp = foe.disp == null ? foe.hp : foe.disp + (foe.hp - foe.disp) * .12; const f = clamp(foe.disp / mh, 0, 1);
  ctx.fillStyle = '#3a3a44'; LOD.rrect(x + 50, y + 27, w - 60, 8, 4); ctx.fill(); ctx.fillStyle = f > .5 ? '#e5484d' : f > .2 ? '#f5a524' : '#3ddc84'; LOD.rrect(x + 51, y + 28, Math.max(0, (w - 62) * f), 6, 3); ctx.fill();
  for (let i = 0; i < need; i++) { ctx.fillStyle = i < B.survive ? '#3ddc84' : '#d8dce6'; LOD.rrect(x + 9 + i * 16, y + 44, 12, 10, 3); ctx.fill(); }
}

function hud(ctx, G) {
  if (!G.started || wakeT > 0) return;
  const { W } = LOD.view, y0 = 22 + LOD.view.hudLeftY;
  if (G.scene !== 'battle') {
    ctx.font = '700 13px Barlow, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const rows = ['💰 ' + G.kr + ' kr', '🛒 ' + G.list.filter(q => q.got).length + '/8', '🏆 ' + G.beat.length + '/4'];
    const seen = {};
    for (const f of (G.me.fx || [])) { const em = { speed: f.value > 0 ? '❄️' : '🌿', reveal: '🍄', stat: '🍺', attract: '🧲', guard: '🥃', catchBonus: '🎯' }[f.type]; if (!em || seen[em]) continue; seen[em] = 1; rows.push(em + (f.n > 1 ? '×' + f.n : '') + ' ' + Math.ceil(f.t) + 's'); }
    if (G.blurT > 0) rows.push('🥴 ' + Math.ceil(G.blurT) + 's'); if (G.mirrorT > 0) rows.push('🌀 ' + Math.ceil(G.mirrorT) + 's');
    rows.forEach((s, i) => { const w = ctx.measureText(s).width + 12; ctx.fillStyle = 'rgba(10,16,22,.62)'; LOD.rrect(8, y0 - 10 + i * 23, w, 20, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(s, 14, y0 + i * 23); });
    if (G.zoneT > 0) {
      const z = ZONES.find(q => q.id === G.zoneId); ctx.globalAlpha = Math.min(1, G.zoneT * 2);
      ctx.font = '400 13px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; const w = ctx.measureText(z.name).width + 22;
      ctx.fillStyle = '#fbf6e8'; LOD.rrect(W / 2 - w / 2, 40, w, 24, 6); ctx.fill(); ctx.strokeStyle = '#1F2A44'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#1F2A44'; ctx.fillText(z.name, W / 2, 52.5); ctx.globalAlpha = 1;
    }
  }
  if (LOD.dev && devTile) { ctx.font = '700 12px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(10,16,22,.8)'; LOD.rrect(W / 2 - 80, 70, 160, 22, 6); ctx.fill(); ctx.fillStyle = '#3ddc84'; ctx.fillText('tile [' + devTile.join(', ') + '] copied', W / 2, 81); }
}
function drawScreen(ctx, G, t) {
  if (G.scene === 'battle' && B) drawBattle(ctx, t);
  else if (G.blurT > 0) { ctx.fillStyle = 'rgba(200,120,255,' + (.08 + Math.sin(t * 2) * .04) + ')'; ctx.fillRect(0, 0, LOD.view.W, LOD.view.H); }
  if (G.mirrorT > 0 && G.scene !== 'battle') { ctx.fillStyle = 'rgba(224,92,196,.1)'; ctx.fillRect(0, 0, LOD.view.W, LOD.view.H); }
  FX.drawScreen(ctx, LOD.view.W, LOD.view.H, t);
  if (wakeT > 0 || (G.scene === 'talk' && !G.started)) drawLids(ctx, wakeT > 0 ? lidOpen(1 - wakeT / OP.blink) : 0);
}
function drawLids(ctx, o) { // waking up: two black eyelids, a dark haze that lifts
  const { W, H } = LOD.view, h = (1 - o) * H / 2 + 2;
  ctx.fillStyle = 'rgba(0,0,0,' + (.65 * (1 - o)) + ')'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
  for (let i = 0; i < 18; i++) { ctx.fillStyle = 'rgba(0,0,0,' + (.5 - i / 36) + ')'; ctx.fillRect(0, h + i * 2, W, 2); ctx.fillRect(0, H - h - (i + 1) * 2, W, 2); }
}

/* ===================== SCORE: goals, each counted once ===================== */
function goals() {
  const P = CFG.PTS;
  const items = G.list.filter(q => q.got).length, species = Math.min(P.speciesMax, Object.keys(G.caught).filter(isCreature).length);
  const heroes = Math.min(4, G.beat.length), partners = Math.min(5, G.solved.length), dev = G.dev ? 1 : 0, egg = G.egg ? 1 : 0;
  const rows = [['Heroes beaten in their houses ' + heroes + '/4', heroes * P.hero], ['Dev Ljunky', dev * P.dev], ['Easter egg', egg * P.egg],
    ['New species ' + species + '/20', species * P.species], ['Shopping list ' + items + '/8', items * P.item], ['Partners solved ' + partners + '/5', partners * P.partner]];
  return { rows, items, species, heroes, partners, dev, egg, total: Math.min(DEF.cap, rows.reduce((a, r) => a + r[1], 0)) };
}

/* ===================== NEW GAME / SAVE (v2, old v1 saves are migrated) ===================== */
function newList() {
  const ids = Object.keys(ITEMS).filter(id => ITEMS[id].list).sort(() => Math.random() - .5).slice(0, 8), used = new Set();
  return ids.map(id => {
    const tiles = zoneTiles(ITEMS[id].zone).filter(([x, y]) => !used.has(x + ',' + y));
    const [x, y] = pick(tiles); used.add(x + ',' + y); const [px, py] = tc(x, y);
    return { id, x: px, y: py + 4, got: 0 };
  });
}
const strip = c => { const o = { sp: c.sp, lv: c.lv, xp: c.xp, hp: c.hp }; if (c.fx && c.fx.length) o.fx = EF.save(c); return o; };
const SAVE_KEYS = ['dir', 'seen', 'caught', 'list', 'kr', 'items', 'beat', 'solved', 'dev', 'eggs', 'egg', 'debt', 'lvlPts', 'flags', 'stache', 'blurred', 'starter',
  'known', 'traps', 'graves', 'dead', 'caughtP', 'npcBeat', 'gym', 'dealer', 'apps', 'steps', 'fillers', 'trapsUsed'];
const FRESH = () => ({ items: {}, known: {}, traps: [], graves: [], dead: {}, caughtP: {}, npcBeat: {}, gym: { slots: [] }, dealer: { pts: 0, pen: [], rot: -1, bought: {} }, apps: {}, steps: 0, trapsUsed: {}, flags: {} });
function saveState(G) {
  const o = { v: 2, p: [Math.round(G.p.x), Math.round(G.p.y)], party: G.party.map(strip), box: G.box.map(strip), me: EF.save(G.me) };
  for (const k of SAVE_KEYS) o[k] = G[k];
  if (o.gym && o.gym.slots) o.gym = Object.assign({}, o.gym, { slots: o.gym.slots.map(s => Object.assign({}, s, { c: strip(s.c) })) });
  return JSON.parse(JSON.stringify(o));
}
const MIGRATE = {
  2: d => { // v1 (launch build) -> v2: drinks/tabs move into the item bag, new systems get empty state
    d.items = Object.assign({}, d.drinks || {}); if (d.tabs) d.items.fizztab = (d.items.fizztab || 0) + d.tabs;
    d.items.bag = (d.items.bag || 0) + 5; delete d.drinks; delete d.tabs;
    PX.data.fill(d, FRESH());
    return d;
  }
};
function loadState(G, d) {
  if (!d || !d.v) return;
  d = PX.data.migrate(d, MIGRATE, 2);
  PX.data.fill(d, FRESH());
  for (const k of SAVE_KEYS) if (d[k] !== undefined) G[k] = d[k];
  const ok = c => c && SP[c.sp] && SP[c.sp].kind !== 'boss';
  const fix = c => { const n = mk(c.sp, c.lv); n.xp = c.xp || 0; n.hp = clamp(Math.round(c.hp), 0, maxHp(n)); if (c.fx) n.fx = c.fx; return n; };
  for (const id in G.items) if (!ITEMS[id] || !(G.items[id] > 0)) delete G.items[id];
  G.party = (d.party || []).filter(ok).map(fix).slice(0, 4); G.box = (d.box || []).filter(ok).map(fix);
  G.me = { fx: (d.me || []).filter(f => f && f.type) };
  if (G.gym && G.gym.slots) G.gym.slots = G.gym.slots.filter(s => s && s.c && ok(s.c)).map(s => Object.assign(s, { c: fix(s.c) }));
  if (d.p && walkable(d.p[0], d.p[1])) { G.p.x = d.p[0]; G.p.y = d.p[1]; }
  if (G.party.length && !G.party.some(c => c.hp > 0)) for (const c of G.party) c.hp = maxHp(c);
  if (EF.has(G.me, 'tint')) FX.setTint('rainbow', .16, 1);
  S.afterLoad();
  initPeople();
}
/* ===================== THE OPENING: wake up, walk around, the stranger, choose a starter ===================== */
const OP = D.raw.opening;
let wakeT = 0, stranger = null;
const lidOpen = u => { // how open the eyes are, u = 0..1 through the blink
  const K = [[0, 0], [.16, .3], [.26, 0], [.42, .55], [.52, .08], [.78, 1], [1, 1]];
  for (let i = 1; i < K.length; i++) if (u <= K[i][0]) { const [a, va] = K[i - 1], [b, vb] = K[i]; return va + (vb - va) * (u - a) / (b - a); }
  return 1;
};
async function opening() {
  G.scene = 'talk'; wakeT = OP.blink;
  await sleep(OP.blink);
  const me = (HERO[heroId()] || {}).name || 'You';
  const other = HERO[pick(HERO_IDS.filter(h => h !== heroId()))].name;
  for (const l of OP.thoughts) await say(l.replace('{hero}', other), { who: '💭 ' + me, auto: false });
  hideBox(); G.scene = 'map'; G.strangerT = OP.strangerAfter;
}
function updStranger(dt) { // when he shows up you stop; he walks straight to you (max a few seconds), then you choose
  if (G.starter || G.strangerT == null) return;
  if (!stranger) {
    if (G.scene !== 'map' || (G.strangerT -= dt) > 0) return;
    const off = [[5, 0], [-5, 0], [0, 4], [0, -4], [3, 3]].map(([x, y]) => [G.p.x + x * T, G.p.y + y * T]).find(([x, y]) => walkable(x, y)) || [G.p.x + 5 * T, G.p.y];
    stranger = { x: off[0], y: off[1], dir: 0, step: 0, a: 0, walkT: 0 };
    G.scene = 'talk'; G.v.x = G.v.y = 0; G.walk = 0; LOD.input.clear(); hideBox(); LOD.haptic('light');
    G.dir = Math.abs(stranger.x - G.p.x) > Math.abs(stranger.y - G.p.y) ? (stranger.x < G.p.x ? 2 : 3) : (stranger.y < G.p.y ? 1 : 0);
  }
  if (stranger.leave) { stranger.x += 30 * dt * stranger.leave; stranger.a = Math.max(0, stranger.a - dt * .7); stranger.step += dt; if (stranger.a <= 0) stranger = null; return; }
  stranger.a = Math.min(1, stranger.a + dt * 1.5);
  if (stranger.talking) return;
  const dx = G.p.x - stranger.x, dy = G.p.y - stranger.y, d = Math.hypot(dx, dy);
  if (d < 20 || (stranger.walkT += dt) > 5) { stranger.talking = true; stranger.step = 0; strangerTalk(); return; }
  const sp = 55 * dt; stranger.x += dx / d * sp; stranger.y += dy / d * sp; stranger.step += dt;
  stranger.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
}
async function strangerTalk() {
  G.scene = 'talk'; G.v.x = G.v.y = 0; LOD.input.clear(); if (stranger) stranger.dir = G.p.y < stranger.y ? 1 : 0;
  await say2(OP.stranger.name, OP.lines[0]);
  let s;
  try { s = await chooseStarter(); }
  catch (err) { console.error('[m3] starter choice', err); s = await ask(OP.lines[1], OP.starters.map(sp => ({ label: SP[sp].name, value: sp })), { one: true, who: OP.stranger.name }); }
  G.party = [mk(s, CFG.START_LV)]; G.caught[s] = 1; G.seen[s] = 1; G.starter = s; SFX.catch(); LOD.haptic('success');
  if (stranger) { stranger.leave = G.p.x < stranger.x ? 1 : -1; stranger.dir = stranger.leave > 0 ? 3 : 2; }
  await say(PX.data.fmt(OP.joined, { name: SP[s].name }), { auto: false });
  G.lvlPts = partyLevelPts();
  hideBox(); G.scene = 'map';
}
/* starter claims: first come, first served across the five players */
const CLAIM_KEY = 'lod.claims.m3';
const liveClaims = () => LOD.status(DEF) === 'live' && !LOD.dev && !!LOD.CFG.API_URL;
let claimsApi = false;
async function fetchJSON(url, opt = {}, ms = 4000) {
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, Object.assign({ signal: ctl.signal }, opt)); return await r.json(); } finally { clearTimeout(tm); }
}
async function loadClaims() {
  claimsApi = false;
  if (!liveClaims()) return LOD.store.get(CLAIM_KEY, {});
  try { // the server only answers with "claims" once the Apps Script supports it (see backend/claims.gs)
    const u = LOD.CFG.API_URL, j = await fetchJSON(u + (u.includes('?') ? '&' : '?') + 'claims=' + DEF.id + '&t=' + Date.now());
    if (j && j.claims && typeof j.claims === 'object') { claimsApi = true; LOD.store.set(CLAIM_KEY + '.live', j.claims); return j.claims; }
  } catch (e) {}
  return LOD.store.get(CLAIM_KEY + '.live', {});
}
async function claimStarter(sp) {
  const me = LOD.player;
  if (claimsApi) {
    try { const j = await fetchJSON(LOD.CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'claim', mission: DEF.id, name: me, pick: sp, ts: Date.now() }) }); if (j && j.ok === false && j.taken) return false; } catch (e) {}
    return true;
  }
  if (!liveClaims()) { const c = LOD.store.get(CLAIM_KEY, {}); if (Object.keys(c).some(n => n !== me && c[n] === sp)) return false; c[me] = sp; LOD.store.set(CLAIM_KEY, c); }
  return true;
}
async function chooseStarter() {
  for (;;) {
    ui.box.hidden = false; boxText('…', OP.stranger.name); ui.grid.innerHTML = '';
    const claims = await loadClaims(), me = LOD.player, mine = claims[me] && OP.starters.includes(claims[me]) ? claims[me] : null;
    let avail = mine ? [mine] : OP.starters.filter(sp => !Object.keys(claims).some(n => n !== me && claims[n] === sp));
    if (!avail.length) avail = OP.starters.slice();
    const opts = avail.map(sp => { const o = { label: SP[sp] ? SP[sp].name : sp, ty: SP[sp] && SP[sp].type, value: sp }; try { o.img = creatureIcon(sp); } catch (e) {} return o; });
    const s = await ask(OP.lines[1], opts, { one: true, who: OP.stranger.name });
    if (await claimStarter(s)) return s;
    await say2(OP.stranger.name, OP.tooSlow);
  }
}
if (LOD.dev && new URLSearchParams(location.search).get('claims') === 'reset') { try { localStorage.removeItem(CLAIM_KEY); } catch (e) {} }

/* ===================== INPUT: tap = talk / next. ?dev: long-press shows + copies the tile ===================== */
let tap = null, devTile = null, devTileT = 0, holdTimer = 0;
LOD.cv.addEventListener('pointerdown', e => {
  tap = { x: e.clientX, y: e.clientY, t: performance.now() };
  if (LOD.dev && LOD.M === DEF && G && G.scene === 'map') { clearTimeout(holdTimer); holdTimer = setTimeout(() => { if (!tap) return; const r = LOD.cv.getBoundingClientRect(), v = LOD.view, wx = LOD.cam.x + (tap.x - r.left - v.W / 2) / v.scale, wy = LOD.cam.y + (tap.y - r.top - v.H / 2) / v.scale; devTile = [Math.floor(wx / T), Math.floor(wy / T)]; devTileT = 4; console.log('[m3] tile', devTile); try { navigator.clipboard.writeText('[' + devTile.join(', ') + ']').catch(() => {}); } catch (err) {} }, 650); }
});
LOD.cv.addEventListener('pointerup', e => {
  clearTimeout(holdTimer);
  if (!tap || LOD.M !== DEF || !G || G.mode !== 'play') return;
  const far = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12 || performance.now() - tap.t > 380; tap = null;
  if (far) return;
  if (pending && pending.say) { pending.res(); return; }
  if (G.scene === 'map' && G.started) interact();
});
LOD.cv.addEventListener('pointermove', e => { if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12) clearTimeout(holdTimer); });
window.addEventListener('keydown', e => {
  if (LOD.M !== DEF || !G || G.mode !== 'play' || e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'enter' || k === 'e' || k === ' ') { if (pending && pending.say) pending.res(); else if (G.scene === 'map' && G.started) interact(); }
  if (k === 'b' && G.scene === 'map') bagMenu();
});

/* ===================== SYSTEMS (missions/m3-systems.js) ===================== */
const K = {
  D, CFG, SP, ITEMS, NPCS, HERO, PARTNERS, T, tc, walkable, zoneAt, ZONES, tile, rel, LOOK,
  get G() { return G; }, get B() { return B; },
  say, say2, ask, hideBox, sleep, BACK, itemOpt, learn, learnItem, known, has, give, take,
  mk, maxHp, xpNeed, cname, typeOf, creatureIcon, addToParty, addXp, heroId, gone, personGone, npcDef, dollOf, drawPerson, drawCreature, spriteOf,
  startBattle, startPartner, applyAll, SFX, bubble, isCreature, SPECIES, robotLine, cemeteryOpen,
  setHeart: fn => { ctxHeart = fn; }, get trapSpeed() { return TRAP_SPEED; }
};
const S = window.M3_SYSTEMS(K);

/* ===================== THE MISSION ===================== */
const DEF = {
  id: 3, title: 'Bad Trip at Maxi', unlock: '2026-11-23', until: '2026-11-25', cap: 300000,
  world: { w: MW * T, h: MH * T }, eggs: false, noFire: true, noTimer: true, save: true, submitOnSave: true, briefPerks: false, briefClass: 'm3solid',
  viewScale: (W, H) => Math.min(W / (CFG.VIEW_TILES * T), H / (16 * T)),
  outro: (G) => G.why === 'done' ? {
    kind: 'chat', title: 'LAN SQUAD 🎮', sub: 'Löken, Wizcudi, Jrohn, BigWman, Ljunky', tbc: 'The LAN is on 28 Nov. Bring the shopping list.',
    lines: [
      { from: 'You', text: 'IT WAS LJUNKY. He spiked the drink AND built the game.' },
      { from: 'BigWman', text: 'I knew it. The budget never balanced. YES!' },
      { from: 'Löken', text: 'Group hug anyway. Stick together, boys.' },
      { from: 'Ljunky', text: 'Patch notes: you were never supposed to win. Well played.' },
      { from: 'Jrohn', text: 'Did anyone find my shirt in there?' }
    ]
  } : null,
  briefTitle: 'Wake up.',
  brief: { card: '', tips: [['Move:', 'drag anywhere.'], ['Talk / act:', 'tap.'], ['🎒:', 'your bag.']] },
  badges: [
    { em: '🧪', name: 'Debugged the Dev', t: s => s.dev },
    { em: '🛒', name: 'Full Cart', t: s => s.items >= 8 },
    { em: '📕', name: 'Creature Collector', t: s => s.species >= 12 },
    { em: '🏆', name: 'Hero Slayer', t: s => s.heroes >= 4 },
    { em: '💍', name: 'Relationship Counselor', t: s => s.partners >= 5 },
    { em: '🤞', name: 'Promise Debt', t: s => s.debt >= 3 },
    { em: '🥴', name: 'Bad Trip', t: s => s.blurred },
    { em: '🪦', name: 'Gravedigger', t: s => s.graves >= 5 }
  ],
  intensity: G => G.scene === 'battle' ? (B && B.kind !== 'wild' ? .9 : .5) : .12,

  init(G_) {
    G = G_; FLOW++; waits.length = 0; B = null; pending = null; FX.reset(); layer.clear(); stranger = null; wakeT = 0;
    buildUI(); hideBox();
    if (!mapCv) mapCv = renderMap();
    const [x, y] = tc(4, 62);
    Object.assign(G, {
      hp: 0, maxHp: 0, scene: 'map', started: false, p: { x, y }, v: { x: 0, y: 0 }, dir: 0, walk: 0,
      party: [], box: [], seen: {}, caught: {}, kr: CFG.START_KR, beat: [], solved: [], dev: 0, eggs: [0, 0, 0], debt: 0, lvlPts: 0, list: newList(),
      coins: [], coinT: 6, shimT: 8, encCool: CFG.ENC_COOLDOWN, stepD: 0, fishT: 0, mirrorT: 0, blurT: 0, zoneId: 'parking', zoneT: 0, drinkLog: [], near: null, me: { fx: [] }
    }, FRESH());
    S.newGame();
    initPeople();
  },
  saveState, loadState,
  start(G, cont) {
    G.started = true; G.zoneT = 2.5;
    if (cont && (G.starter || G.party.length)) LOD.toast('Welcome back 💾', 2);
    else if (cont) { G.strangerT = 2; } // saved before choosing a starter: he comes back
    else { for (const k in OP.startItems) give(k, OP.startItems[k]); opening(); }
  },
  update(G, dt) {
    const real = FX.step(dt);
    if (B && B.introT > 0) B.introT -= dt;
    tickWaits(real * (B ? clamp(gameSpeed(), .5, 3) : 1));
    layer.update(dt);
    if (devTileT > 0 && (devTileT -= dt) <= 0) devTile = null;
    if (wakeT > 0) wakeT = Math.max(0, wakeT - dt * TEST_SPEED);
    if (!G.started) return;
    EF.tick(G.me, dt, { onHeart: heartAttack });
    if (G.blurT > 0) G.blurT -= dt; if (G.mirrorT > 0) G.mirrorT -= dt; if (G.zoneT > 0) G.zoneT -= dt; if (G.fishT > 0) G.fishT -= dt;
    if (B) { B.flashT -= dt; if (B.glitchT > 0) B.glitchT -= dt; if (B.bug) B.bug.t -= dt; }
    S.tick(dt);
    if (heartPending && G.scene === 'map') { G.scene = 'talk'; heartAttackFlow(); }
    if (G.scene === 'map') updMap(real * gameSpeed());
    if (G.scene === 'map' || stranger) updStranger(real);
    if (Object.keys(G.caught).filter(isCreature).length >= 15) G.flags.loyalReady = 1;
    G.score = goals().total;
  },
  camTarget: G => [G.p.x, G.p.y - 8],
  drawWorld, drawScreen, hud,
  result: G => {
    const g = goals();
    return {
      head: G.dev ? 'Dev Ljunky debugged!' : 'Progress saved', lead: G.dev ? 'It was Ljunky all along. Keep playing: your best score counts until 25 Nov 23:59.' : 'Keep going any time.',
      rows: g.rows, bonus: [],
      stats: { dev: !!G.dev, items: g.items, species: g.species, heroes: g.heroes, partners: g.partners, debt: G.debt || 0, blurred: !!G.blurred, graves: (G.graves || []).length },
      line: g.heroes + '/4 heroes, ' + g.species + ' species, ' + g.items + '/8 items in ' + mmss(G.t) + '.'
    };
  }
};
LOD.mission(DEF);
window.__m3 = { xpNeed, summon() { if (G) G.strangerT = 0; }, get stranger() { return stranger; }, get wakeT() { return wakeT; }, get devTile() { return devTile; }, set speed(v) { TEST_SPEED = v; }, set trapSpeed(v) { TRAP_SPEED = v; }, get G() { return G; }, get B() { return B; }, get pending() { return pending; },
  CFG, SP, MAP, ZONES, D, S, tile, zoneAt, tc, mk, goals, startWild, startBoss, startPartner, startDev, startTrainer, startNpcFight, interact, bagMenu, walkable, useItem, give, saveState, loadState, MIGRATE, EF, FX, layer, spots, npcList: () => npcList, gameSpeed, encTable, knockout, catchChance, completion: () => S.completion() };
})();
