/* Creature art source (dev tool only). Each function draws a creature on a 48x48 canvas centred at 0,0.
   tools/bake-art.js renders these, snaps them to the PX palette, adds the navy outline and writes assets/creatures/<id>.png.
   The game only loads the PNGs, so a new creature can also be a hand-drawn 48x48 PNG with no code at all. */
window.ART = (() => {
function cBody(c, col, f) { c.fillStyle = col; c.beginPath(); f(); c.fill(); }
const E = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r, r, 0, 0, 7); c.fill(); };
const O = (c, x, y, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); };
const Rc = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
function eyes(c, x1, x2, y, r = 3, glow) {
  for (const x of [x1, x2]) { E(c, x, y, r, glow || '#fff'); E(c, x + .6, y + .4, r * .55, glow ? '#fff8c0' : '#111'); if (!glow) E(c, x - .6, y - .8, r * .22, '#fff'); }
}
const ART = {
  frog(c) {
    O(c, 0, 20, 14, 3, 'rgba(0,0,0,.25)');
    O(c, -12, 16, 5, 3, '#3f9a3a'); O(c, 12, 16, 5, 3, '#3f9a3a');
    Rc(c, -10, -2, 20, 20, '#e8c547'); Rc(c, -10, 4, 20, 7, '#2f6fd0'); Rc(c, -10, -2, 20, 2, '#c9ced6'); Rc(c, -10, 16, 20, 2, '#c9ced6');
    c.fillStyle = '#fff'; c.font = 'bold 5px sans-serif'; c.textAlign = 'center'; c.fillText('FOLK', 0, 9.5);
    O(c, 0, -6, 13, 7, '#4fb548'); E(c, -7, -12, 5, '#4fb548'); E(c, 7, -12, 5, '#4fb548'); eyes(c, -7, 7, -12, 3);
    c.strokeStyle = '#1e5a1e'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, -5, 5, .2, Math.PI - .2); c.stroke();
    for (const [x, y, r] of [[-5, -20, 3], [0, -22, 4], [5, -20, 3], [-9, -18, 2], [9, -18, 2]]) E(c, x, y, r, '#fffbea');
  },
  cuke(c) {
    O(c, 0, 20, 16, 3, 'rgba(0,0,0,.25)');
    c.fillStyle = '#9fdc7a'; c.beginPath(); c.moveTo(-4, -6); c.lineTo(-20, -16); c.lineTo(-14, 0); c.fill(); c.beginPath(); c.moveTo(4, -6); c.lineTo(20, -16); c.lineTo(14, 0); c.fill();
    O(c, 0, 4, 10, 17, '#3f8f3a', .25); O(c, -2, 2, 6, 13, '#57ad4a', .25);
    for (const [x, y] of [[-4, -6], [3, 0], [-5, 8], [4, 12], [0, -12]]) E(c, x, y, 1.2, '#2b6a28');
    c.strokeStyle = '#7fd36a'; c.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 2.4, -16); c.lineTo(i * 4, -23); c.stroke(); }
    eyes(c, -4, 5, -9, 2.8); O(c, 1, -3, 4, 2, '#2b6a28');
  },
  peng(c) {
    O(c, 0, 21, 14, 3, 'rgba(0,0,0,.25)');
    O(c, -6, 20, 5, 2, '#f39c34'); O(c, 6, 20, 5, 2, '#f39c34');
    O(c, 0, 4, 15, 17, '#22262e'); O(c, 0, 7, 10, 13, '#f4f6fa');
    O(c, -15, 6, 4, 9, '#22262e', .3); O(c, 15, 6, 4, 9, '#22262e', -.3);
    Rc(c, -13, 4, 26, 8, 'rgba(120,200,120,.85)'); for (let i = -10; i <= 10; i += 4) E(c, i, 8, 1.4, '#3f9a3a');
    Rc(c, -13, 4, 26, 1, 'rgba(255,255,255,.7)');
    eyes(c, -5, 5, -7, 2.6); c.fillStyle = '#f39c34'; c.beginPath(); c.moveTo(-3, -3); c.lineTo(3, -3); c.lineTo(0, 1); c.fill();
    E(c, -9, -12, 1.5, '#dff4ff'); E(c, 10, -1, 1.2, '#dff4ff');
  },
  golem(c) {
    O(c, 0, 21, 17, 3, 'rgba(0,0,0,.25)');
    c.strokeStyle = '#8c96a2'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-16, -10); c.lineTo(16, -10); c.lineTo(12, 12); c.lineTo(-12, 12); c.closePath(); c.fillStyle = 'rgba(140,150,162,.35)'; c.fill(); c.stroke();
    c.lineWidth = 1; for (let i = -12; i <= 12; i += 4) { c.beginPath(); c.moveTo(i, -10); c.lineTo(i * .8, 12); c.stroke(); } for (let j = -5; j <= 8; j += 5) { c.beginPath(); c.moveTo(-15, j); c.lineTo(15, j); c.stroke(); }
    Rc(c, -18, -15, 36, 3, '#d8312f');
    E(c, -9, 17, 3.5, '#333'); E(c, 9, 17, 3.5, '#333'); O(c, 11, 17, 2, 3.5, '#555', .8);
    c.lineWidth = 3; c.strokeStyle = '#8c96a2'; c.beginPath(); c.moveTo(-15, -2); c.lineTo(-22, 6); c.stroke(); c.beginPath(); c.moveTo(15, -2); c.lineTo(22, -8); c.stroke();
    E(c, -22, 7, 3, '#6d7682'); E(c, 22, -9, 3, '#6d7682');
    eyes(c, -5, 5, -3, 3, '#ffd23a');
  },
  ghost(c) {
    O(c, 0, 22, 12, 2.5, 'rgba(0,0,0,.18)');
    c.fillStyle = '#e6f0f4'; c.beginPath(); c.moveTo(-15, 16); c.lineTo(-15, -6); c.arc(0, -6, 15, Math.PI, 0); c.lineTo(15, 16);
    for (let i = 0; i < 5; i++) c.lineTo(15 - i * 7.5 - 3.75, i % 2 ? 16 : 11); c.closePath(); c.fill();
    Rc(c, -10, -14, 20, 14, '#1c2a36'); Rc(c, -10, -14, 20, 1, '#3c5a6e');
    Rc(c, -6, -10, 3, 3, '#5ff0ff'); Rc(c, 3, -10, 3, 3, '#5ff0ff'); Rc(c, -4, -4, 8, 1.5, '#5ff0ff');
    c.fillStyle = 'rgba(255,40,40,.75)'; c.beginPath(); c.moveTo(-2, 0); c.lineTo(2, 0); c.lineTo(10, 18); c.lineTo(-10, 18); c.fill();
  },
  slime(c) {
    O(c, 0, 20, 17, 3, 'rgba(0,0,0,.25)');
    c.fillStyle = 'rgba(140,220,255,.55)'; c.beginPath(); c.moveTo(-17, 18); c.quadraticCurveTo(-20, -4, -6, -14); c.quadraticCurveTo(0, -22, 6, -14); c.quadraticCurveTo(20, -4, 17, 18); c.closePath(); c.fill();
    for (const [x, y, col] of [[-8, 8, '#ff4f7b'], [6, 10, '#ffd23a'], [-2, 13, '#7bd36a'], [9, 1, '#b05cff'], [-10, 0, '#ff9a3a']]) { O(c, x, y, 3, 2, col, x * .1); }
    Rc(c, 0, 4, 4, 2, '#ff4f7b'); Rc(c, -4, 15, 6, 1.5, '#fff');
    eyes(c, -5, 5, -5, 3); O(c, -9, -8, 3, 2, 'rgba(255,255,255,.7)');
  },
  bat(c) {
    O(c, 0, 22, 10, 2, 'rgba(0,0,0,.18)');
    c.fillStyle = '#b9bec7'; c.beginPath(); c.moveTo(-8, -2); c.lineTo(-24, -12); c.lineTo(-20, 0); c.lineTo(-24, 8); c.lineTo(-8, 6); c.fill();
    c.beginPath(); c.moveTo(8, -2); c.lineTo(24, -12); c.lineTo(20, 0); c.lineTo(24, 8); c.lineTo(8, 6); c.fill();
    c.fillStyle = '#f4f6f8'; c.beginPath(); c.moveTo(-10, -10); c.lineTo(10, -10); c.lineTo(12, 16); c.lineTo(-12, 16); c.closePath(); c.fill();
    c.strokeStyle = '#f4f6f8'; c.lineWidth = 2.5; c.beginPath(); c.arc(-5, -12, 4, Math.PI, 0); c.stroke(); c.beginPath(); c.arc(5, -12, 4, Math.PI, 0); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -8); c.lineTo(-4, 14); c.moveTo(5, -8); c.lineTo(7, 14); c.stroke();
    eyes(c, -4, 4, -4, 2.5); c.fillStyle = '#d8312f'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('2 KR', 0, 10);
  },
  mummy(c) {
    O(c, 0, 21, 15, 3, 'rgba(0,0,0,.25)');
    E(c, 0, 2, 17, '#c98a4a'); c.strokeStyle = '#8a5522'; c.lineWidth = 2.2; c.beginPath();
    for (let a = 0; a < 14; a += .2) { const r = a * 1.15; const x = Math.cos(a) * r, y = 2 + Math.sin(a) * r; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    c.fillStyle = 'rgba(245,240,225,.95)'; c.save(); c.rotate(-.25); c.fillRect(-18, -6, 36, 4); c.fillRect(-18, 8, 36, 4); c.restore(); c.save(); c.rotate(.5); c.fillRect(-18, 0, 30, 3.5); c.restore();
    for (const [x, y] of [[-6, -5], [6, -5]]) { E(c, x, y, 3.2, '#ffe14a'); E(c, x, y, 1.4, '#fff'); }
    E(c, -10, -12, 1.2, '#fff'); E(c, 9, 13, 1.2, '#fff');
  },
  banshee(c) {
    O(c, 0, 22, 12, 2.5, 'rgba(0,0,0,.18)');
    c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(-14, -18); c.lineTo(10, -18); c.lineTo(18, 0); c.lineTo(10, 18); c.lineTo(-14, 18); c.closePath(); c.fill();
    c.strokeStyle = '#c99a10'; c.lineWidth = 1.5; c.stroke(); E(c, 11, 0, 2.2, '#2a2a2a');
    O(c, -3, 6, 7, 9, '#2a0a12'); O(c, -3, 11, 4, 3, '#e0405a');
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-11, -12); c.lineTo(-5, -9); c.moveTo(5, -12); c.lineTo(-1, -9); c.stroke();
    E(c, -8, -6, 2.4, '#fff'); E(c, 2, -6, 2.4, '#fff'); E(c, -8, -6, 1.1, '#111'); E(c, 2, -6, 1.1, '#111');
    c.fillStyle = '#d8312f'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('-50%', -3, -12);
  },
  crow(c) {
    O(c, 0, 21, 13, 3, 'rgba(0,0,0,.25)');
    Rc(c, -4, 14, 1.5, 6, '#555'); Rc(c, 3, 14, 1.5, 6, '#555');
    O(c, -2, 6, 13, 10, '#1d1f26'); O(c, -13, 4, 8, 4, '#2a2d36', -.4); O(c, 9, -6, 8, 8, '#1d1f26');
    c.fillStyle = '#9aa0a8'; c.beginPath(); c.moveTo(15, -8); c.lineTo(23, -5); c.lineTo(15, -3); c.fill();
    Rc(c, 19, -10, 5, 8, '#d8312f'); Rc(c, 19, -10, 5, 1.5, '#c9ced6');
    E(c, 11, -8, 2.2, '#fff'); E(c, 11.6, -8, 1.1, '#111');
    O(c, -14, 12, 6, 2.5, '#1d1f26', .5);
  },
  snake(c) {
    O(c, 0, 21, 16, 3, 'rgba(0,0,0,.25)');
    c.strokeStyle = '#2f8f3a'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath();
    c.moveTo(-18, 16); c.bezierCurveTo(-4, 24, 14, 18, 6, 8); c.bezierCurveTo(-2, 0, -12, 2, -6, -8); c.stroke();
    c.strokeStyle = '#59c264'; c.lineWidth = 2; c.stroke(); c.lineCap = 'butt';
    Rc(c, -12, -20, 13, 12, '#c9ced6'); Rc(c, -12, -20, 13, 2, '#eef1f4');
    Rc(c, -9, -26, 2, 6, '#e8c547'); Rc(c, -3, -26, 2, 6, '#e8c547');
    eyes(c, -9, -3, -14, 2.2); Rc(c, -8, -10, 5, 1, '#333');
    E(c, 8, -16, 2, '#7df0ff'); E(c, 13, -10, 1.4, '#7df0ff');
  },
  bear(c) {
    O(c, 0, 21, 16, 3, 'rgba(0,0,0,.25)');
    O(c, 0, 16, 16, 4, '#d9933f'); Rc(c, -15, 7, 30, 6, '#5a3014'); Rc(c, -16, 5, 32, 3, '#6fc04a'); Rc(c, -14, 10, 28, 2, '#ffd23a');
    c.fillStyle = '#e0a04c'; c.beginPath(); c.ellipse(0, 4, 16, 12, 0, Math.PI, 0); c.fill();
    E(c, -12, -12, 4, '#f6e7c2'); E(c, 12, -12, 4, '#f6e7c2');
    E(c, 0, -6, 11, '#8a5522'); O(c, 0, -2, 5, 3.5, '#c99a6a'); E(c, 0, -3.5, 1.6, '#222');
    eyes(c, -4, 4, -8, 2.2);
    for (const [x, y] of [[-10, 0], [8, 1], [-3, 2], [12, -2]]) O(c, x, y, 1.4, .8, '#fff6dc', .4);
  }
  ,
  /* ---------- new creatures (Tue/Wed drops) ---------- */
  fly(c) {
    O(c, 0, 20, 14, 3, 'rgba(0,0,0,.2)');
    c.strokeStyle = '#f5d23a'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.arc(0, -4, 15, .5, 2.6); c.stroke();
    c.strokeStyle = '#7a5a20'; c.lineWidth = 2; c.beginPath(); c.moveTo(13, 3); c.lineTo(16, 1); c.stroke(); c.lineCap = 'butt';
    for (let i = 0; i < 16; i++) { const a = i * 2.4, r = 10 + (i % 4) * 4; E(c, Math.cos(a) * r, -6 + Math.sin(a) * r * .8, 1.6, '#222'); E(c, Math.cos(a) * r - 1, -7 + Math.sin(a) * r * .8, 1, 'rgba(200,230,255,.9)'); }
    eyes(c, -4, 4, -1, 2.4);
  },
  genie(c) {
    O(c, 0, 21, 10, 2.5, 'rgba(0,0,0,.2)');
    c.fillStyle = 'rgba(200,235,255,.8)'; c.beginPath(); c.moveTo(-9, 6); c.lineTo(9, 6); c.lineTo(6, 20); c.lineTo(-6, 20); c.fill(); Rc(c, -8, 10, 16, 6, '#bfe8ff');
    O(c, 6, 7, 4, 4, '#ffe14a'); O(c, 6, 7, 2.5, 2.5, '#fff7a8');
    c.fillStyle = '#3a8ad8'; c.beginPath(); c.moveTo(-3, 7); c.quadraticCurveTo(-14, -4, -4, -10); c.lineTo(4, -10); c.quadraticCurveTo(12, -2, 3, 7); c.fill();
    E(c, 0, -15, 7, '#4a9ae8'); Rc(c, -6, -23, 12, 3, '#ffd23a'); E(c, 0, -24, 2, '#e05cc4');
    O(c, -10, -6, 5, 2, '#4a9ae8', -.6); O(c, 10, -6, 5, 2, '#4a9ae8', .6); eyes(c, -3, 3, -16, 2); Rc(c, -2, -11, 4, 1, '#1d3a6a');
  },
  owl(c) {
    O(c, 0, 21, 13, 3, 'rgba(0,0,0,.25)');
    O(c, 0, 4, 14, 16, '#7a4a22'); O(c, 0, 8, 9, 11, '#c99a6a'); for (let i = -6; i <= 6; i += 4) O(c, i, 8 + Math.abs(i) * .3, 1.6, 1, '#8a5a2a');
    c.fillStyle = '#7a4a22'; c.beginPath(); c.moveTo(-13, -8); c.lineTo(-9, -20); c.lineTo(-5, -10); c.fill(); c.beginPath(); c.moveTo(13, -8); c.lineTo(9, -20); c.lineTo(5, -10); c.fill();
    E(c, -6, -6, 6, '#f4e2b8'); E(c, 6, -6, 6, '#f4e2b8'); E(c, -6, -6, 3.6, '#f39c34'); E(c, 6, -6, 3.6, '#f39c34'); E(c, -6, -6, 1.6, '#111'); E(c, 6, -6, 1.6, '#111');
    Rc(c, -2, -3, 4, 5, '#c98a4a'); Rc(c, -2, -3, 4, 1, '#e8b878');
    O(c, -5, 20, 3, 1.5, '#f39c34'); O(c, 5, 20, 3, 1.5, '#f39c34');
  },
  snail(c) {
    O(c, 0, 20, 17, 3, 'rgba(0,0,0,.25)');
    O(c, -2, 16, 18, 4, '#f39cc0'); E(c, -16, 10, 5, '#f39cc0'); Rc(c, -19, 0, 1.5, 8, '#f39cc0'); Rc(c, -14, 0, 1.5, 8, '#f39cc0'); E(c, -18.5, 0, 2, '#fff'); E(c, -13.5, 0, 2, '#fff'); E(c, -18.5, 0, 1, '#111'); E(c, -13.5, 0, 1, '#111');
    Rc(c, -4, -14, 16, 28, '#8a1d4a'); Rc(c, -2, -12, 12, 24, '#c8306e'); Rc(c, 0, -20, 8, 7, '#e6e0d2'); Rc(c, -1, -2, 14, 8, '#fbf6e8');
    c.fillStyle = '#c8306e'; c.font = 'bold 5px sans-serif'; c.textAlign = 'center'; c.fillText('HOST', 6, 4);
    Rc(c, 0, -8, 2, 4, 'rgba(255,255,255,.6)');
  },
  lizard(c) {
    O(c, 0, 21, 17, 3, 'rgba(0,0,0,.25)');
    c.strokeStyle = '#5fae3e'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(14, 12); c.quadraticCurveTo(24, 4, 20, -6); c.stroke(); c.lineCap = 'butt';
    O(c, 0, 10, 15, 8, '#5fae3e');
    c.fillStyle = '#f2c46a'; c.beginPath(); c.moveTo(-13, 6); c.lineTo(13, 6); c.lineTo(0, -6); c.fill(); E(c, -4, 2, 1.8, '#c8262e'); E(c, 4, 3, 1.8, '#c8262e'); E(c, 0, -1, 1.5, '#7a4a22');
    for (const x of [-9, -3, 3, 9]) { c.fillStyle = '#8a5522'; c.beginPath(); c.moveTo(x - 2, 6); c.lineTo(x, 0); c.lineTo(x + 2, 6); c.fill(); }
    E(c, -15, 4, 7, '#6cbf4a'); eyes(c, -17, -12, 2, 2); Rc(c, -21, 7, 6, 1, '#2b6a28');
    for (const x of [-9, -2, 6, 12]) Rc(c, x, 16, 3, 4, '#4f9a34');
  },
  salmon(c) {
    O(c, 0, 21, 14, 3, 'rgba(0,0,0,.25)');
    Rc(c, -6, 10, 1.5, 11, '#c98a4a'); Rc(c, 5, 10, 1.5, 11, '#c98a4a');
    E(c, 0, 2, 14, '#1d1f26'); E(c, 0, 2, 11, '#f4f6fa'); E(c, 0, 2, 7, '#ff8a5a'); for (let i = -4; i <= 4; i += 4) Rc(c, i - .5, -3, 1, 10, '#ffc0a0');
    c.fillStyle = '#ff8a5a'; c.beginPath(); c.moveTo(-14, -2); c.lineTo(-22, -8); c.lineTo(-20, 4); c.fill(); c.beginPath(); c.moveTo(14, -2); c.lineTo(22, -8); c.lineTo(20, 4); c.fill();
    O(c, 0, -12, 4, 3, '#7ed35a'); eyes(c, -4, 4, 0, 2);
  },
  moth(c) {
    O(c, 0, 21, 10, 2, 'rgba(0,0,0,.18)');
    for (const s of [-1, 1]) { c.fillStyle = '#3a2414'; c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(s * 18, -22, s * 24, -4); c.quadraticCurveTo(s * 20, 6, s * 6, 4); c.fill(); c.fillStyle = '#6d4a2b'; c.beginPath(); c.moveTo(s * 4, 0); c.quadraticCurveTo(s * 16, -14, s * 20, -4); c.quadraticCurveTo(s * 14, 2, s * 4, 2); c.fill(); }
    O(c, 0, 6, 4, 10, '#c9b38a'); for (let i = 0; i < 4; i++) Rc(c, -4, 2 + i * 4, 8, 1, '#8a7a5a');
    E(c, 0, -6, 5, '#c9b38a'); eyes(c, -2, 2, -7, 1.6); c.strokeStyle = '#3a2414'; c.lineWidth = 1; c.beginPath(); c.moveTo(-2, -10); c.lineTo(-6, -18); c.moveTo(2, -10); c.lineTo(6, -18); c.stroke();
  },
  pike(c) {
    O(c, 0, 21, 20, 3, 'rgba(0,0,0,.25)');
    c.fillStyle = '#4f7a3a'; c.beginPath(); c.moveTo(-22, 4); c.quadraticCurveTo(-4, -12, 18, 0); c.quadraticCurveTo(-4, 16, -22, 4); c.fill();
    c.fillStyle = '#c9d88a'; c.beginPath(); c.moveTo(-18, 6); c.quadraticCurveTo(-2, 12, 16, 3); c.lineTo(16, 5); c.quadraticCurveTo(-2, 14, -18, 7); c.fill();
    for (let i = -14; i < 12; i += 5) E(c, i, -1 + Math.abs(i) * .1, 1.5, '#c9d88a');
    c.fillStyle = '#4f7a3a'; c.beginPath(); c.moveTo(18, 0); c.lineTo(24, -8); c.lineTo(24, 8); c.fill();
    c.fillStyle = '#fff'; for (let i = -20; i < -10; i += 3) { c.beginPath(); c.moveTo(i, 4); c.lineTo(i + 1.5, 7); c.lineTo(i + 3, 4); c.fill(); }
    E(c, -14, -1, 2.4, '#ffd23a'); E(c, -14, -1, 1.1, '#111');
    for (let i = -6; i <= 6; i += 3) { c.fillStyle = '#7ed35a'; c.fillRect(i - 1 - 6, -16 + Math.abs(i) * .5, 2, 9); } Rc(c, -14, -10, 16, 2, '#ffd23a');
  },
  loyal(c) {
    O(c, 0, 22, 12, 2.5, 'rgba(0,0,0,.18)');
    c.fillStyle = '#e8b820'; c.beginPath(); c.moveTo(-16, 18); c.lineTo(-14, -6); c.arc(0, -6, 14, Math.PI, 0); c.lineTo(16, 18); for (let i = 0; i < 5; i++) c.lineTo(16 - i * 8 - 4, i % 2 ? 18 : 13); c.closePath(); c.fill();
    c.fillStyle = '#ffd23a'; c.beginPath(); c.arc(0, -6, 11, Math.PI, 0); c.fill();
    Rc(c, -20, -2, 14, 9, '#e3000f'); Rc(c, -19, 0, 12, 2, '#fff'); c.fillStyle = '#fff'; c.font = 'bold 4px sans-serif'; c.textAlign = 'center'; c.fillText('ICA', -13, 6);
    eyes(c, -4, 4, -8, 2.6, '#fff8c0'); Rc(c, -3, -1, 6, 1.5, '#8a6a00');
    for (const [x, y] of [[-12, -18], [12, -16], [16, 4]]) { c.fillStyle = '#fff6b0'; c.fillRect(x - 1, y - 3, 2, 6); c.fillRect(x - 3, y - 1, 6, 2); }
  },
  walter(c) {
    O(c, 0, 21, 15, 3, 'rgba(0,0,0,.25)');
    O(c, 2, 8, 14, 9, '#c98a4a'); for (const x of [-8, -2, 8, 13]) Rc(c, x, 13, 4, 8, '#c98a4a');
    c.strokeStyle = '#c98a4a'; c.lineWidth = 3; c.beginPath(); c.moveTo(15, 4); c.quadraticCurveTo(22, -4, 18, -10); c.stroke();
    E(c, -10, -4, 9, '#d9a05a'); O(c, -17, 0, 5, 4, '#e8c08a'); E(c, -21, -1, 2, '#222');
    O(c, -6, -10, 3.5, 7, '#7a4a22', .4); eyes(c, -13, -7, -6, 2);
    Rc(c, -10, 2, 10, 3, '#d8312f'); E(c, -5, 6, 2, '#ffd23a'); c.fillStyle = '#d8312f'; c.beginPath(); c.ellipse(-18, 4, 2, 3, 0, 0, 7); c.fill();
  },
  cat(c) {
    O(c, 0, 21, 14, 3, 'rgba(0,0,0,.25)');
    O(c, 2, 9, 13, 10, '#f2efe8'); O(c, 6, 6, 5, 4, '#4a3a30');
    c.strokeStyle = '#4a3a30'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(14, 12); c.quadraticCurveTo(24, 4, 18, -8); c.stroke(); c.lineCap = 'butt';
    E(c, -8, -4, 10, '#f2efe8'); c.fillStyle = '#f2efe8'; c.beginPath(); c.moveTo(-17, -8); c.lineTo(-15, -20); c.lineTo(-9, -12); c.fill(); c.beginPath(); c.moveTo(1, -8); c.lineTo(-1, -20); c.lineTo(-7, -12); c.fill();
    E(c, -12, -5, 2.6, '#3a7bd5'); E(c, -4, -5, 2.6, '#3a7bd5'); Rc(c, -12.5, -6.5, 1, 3, '#111'); Rc(c, -4.5, -6.5, 1, 3, '#111');
    O(c, -8, 0, 2, 1.2, '#ff9ab0'); Rc(c, -24, 0, 8, 1, '#ccc'); Rc(c, 0, 0, 8, 1, '#ccc');
    Rc(c, 12, -14, 6, 8, '#f7931a'); c.fillStyle = '#fff'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('₿', 15, -8);
  },
  lich(c) {
    O(c, 0, 22, 12, 2.5, 'rgba(0,0,0,.2)');
    c.fillStyle = '#2a0a3a'; c.beginPath(); c.moveTo(-14, 20); c.lineTo(-10, -6); c.lineTo(10, -6); c.lineTo(14, 20); c.fill();
    Rc(c, -10, -6, 20, 26, '#4a1a6a'); Rc(c, -6, -2, 12, 20, '#fbf6e8'); for (let i = 0; i < 5; i++) { Rc(c, -4, 1 + i * 3.5, 8, 1, '#8a93a6'); Rc(c, -5, 1 + i * 3.5, 1, 1, i < 2 ? '#3f9a3a' : '#8a93a6'); }
    E(c, 0, -12, 8, '#e6e0d2'); Rc(c, -4, -14, 3, 3, '#5ff0a0'); Rc(c, 1, -14, 3, 3, '#5ff0a0'); for (let i = -3; i <= 3; i += 2) Rc(c, i, -8, 1, 2, '#2a0a3a');
    c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(-8, -18); c.lineTo(-6, -24); c.lineTo(-3, -19); c.lineTo(0, -25); c.lineTo(3, -19); c.lineTo(6, -24); c.lineTo(8, -18); c.fill();
    for (const [x, y] of [[-17, -4], [17, 2], [-16, 12]]) E(c, x, y, 2, '#b06bff');
  },
  elk(c) {
    O(c, 0, 21, 16, 3, 'rgba(0,0,0,.25)');
    for (const x of [-10, -4, 6, 11]) Rc(c, x, 10, 3, 11, '#5a3a22');
    O(c, 2, 6, 15, 8, '#7a4a2a'); E(c, -12, -4, 7, '#7a4a2a'); O(c, -17, 0, 5, 4, '#8a5a3a');
    for (const s of [-1, 1]) { const bx = -12 + s * 5; c.fillStyle = s < 0 ? '#ff3df0' : '#3dd6ff'; c.beginPath(); c.arc(bx + s * 6, -18, 6, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(bx + s * 6, -18, 3, 0, Math.PI * 2); c.fill(); for (let i = 0; i < 3; i++) E(c, bx + s * (4 + i * 3), -22 - i, 1.2, '#fff'); }
    eyes(c, -14, -9, -5, 2, '#3dff8a');
    for (let i = 0; i < 5; i++) E(c, -4 + i * 4, 2 + (i % 2) * 4, 1.5, ['#ff3df0', '#3dd6ff', '#ffd23a', '#3dff8a', '#ff9a3a'][i]);
  },
  serpent(c) {
    O(c, 0, 21, 18, 3, 'rgba(0,0,0,.2)');
    c.strokeStyle = '#fbf6e8'; c.lineWidth = 9; c.beginPath(); c.moveTo(-20, 18); c.bezierCurveTo(-30, -6, 20, 20, 12, -2); c.bezierCurveTo(6, -14, -10, -8, -6, -16); c.stroke();
    c.strokeStyle = '#8a93a6'; c.lineWidth = 1; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(-18 + i * 4, 12 - i); c.lineTo(-14 + i * 4, 12 - i); c.stroke(); }
    Rc(c, -12, -24, 12, 10, '#fbf6e8'); Rc(c, -12, -24, 12, 1, '#8a93a6'); eyes(c, -9, -3, -20, 2); Rc(c, -10, -16, 8, 1.5, '#d8312f');
    c.fillStyle = '#d8312f'; c.font = 'bold 5px sans-serif'; c.textAlign = 'center'; c.fillText('-99kr', 10, 14);
  },
  wraith(c) {
    O(c, 0, 22, 12, 2.5, 'rgba(0,0,0,.2)');
    c.fillStyle = 'rgba(80,200,255,.55)'; c.beginPath(); c.moveTo(-16, 18); c.lineTo(-15, -4); c.arc(0, -4, 15, Math.PI, 0); c.lineTo(16, 18); for (let i = 0; i < 5; i++) c.lineTo(16 - i * 8 - 4, i % 2 ? 18 : 12); c.closePath(); c.fill();
    Rc(c, -9, -6, 18, 14, '#1c2a36'); Rc(c, -9, -6, 18, 2, '#3c5a6e'); Rc(c, -3, -2, 6, 6, '#f7931a'); c.fillStyle = '#fff'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('₿', 0, 3.5);
    eyes(c, -5, 5, -12, 2.6, '#bff8ff');
    for (const [x, y] of [[-18, -14], [18, -10], [-20, 6], [20, 8]]) { Rc(c, x - 1, y - 1, 3, 3, '#ffd23a'); }
    c.strokeStyle = '#ffd23a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-9, 10); c.lineTo(-14, 16); c.moveTo(9, 10); c.lineTo(14, 16); c.stroke();
  }
};
return { ART, E, O, Rc, eyes };
})();
