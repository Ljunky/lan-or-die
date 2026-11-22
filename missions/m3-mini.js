/* LAN OR DIE – Mission 3 mini-games: one-thumb timing bar (fishing) and power meter (golf). Numbers and texts: data/m3-data.js → minigames.
   window.M3_MINI(K) → { fishing(cfg), golf(cfg), force }. Each returns a Promise with the result. Tapping anywhere on the card stops the marker. */
window.M3_MINI = function (K) {
'use strict';
const CSS = `
#m3ui .mm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(8,12,20,.55),rgba(8,12,20,.82));pointer-events:auto;touch-action:manipulation;z-index:5}
#m3ui .mm[hidden]{display:none}
#m3ui .mm-card{width:min(calc(100% - 24px),420px);background:#fbf6e8;color:#1c1c2a;border:4px solid #1F2A44;border-radius:14px;box-shadow:0 0 0 3px #fbf6e8,0 12px 40px rgba(0,0,0,.6);padding:14px 14px 16px;font:700 17px/1.3 Barlow,system-ui,sans-serif;text-align:center}
#m3ui .mm-title{font:400 18px Bungee,Impact,sans-serif;color:#1F2A44}
#m3ui .mm-sub{min-height:44px;margin:6px 0 10px;white-space:pre-line}
#m3ui .mm-track{position:relative;height:38px;border-radius:19px;background:#d8dce6;border:3px solid #1F2A44;overflow:hidden}
#m3ui .mm-zone{position:absolute;top:0;bottom:0;background:#3ddc84;opacity:.9}
#m3ui .mm-perfect{position:absolute;top:0;bottom:0;background:#ffd23a}
#m3ui .mm-mark{position:absolute;top:-2px;bottom:-2px;width:8px;margin-left:-4px;background:#e3000f;border-radius:4px;box-shadow:0 0 0 2px #fff}
#m3ui .mm-btn{margin-top:12px;width:100%;min-height:56px;font:400 22px Bungee,Impact,sans-serif;border-radius:12px;border:3px solid #8a6a00;background:#ffd23a;color:#1c1c2a;cursor:pointer;touch-action:manipulation}
#m3ui .mm-btn:active{background:#ffe9a8}
`;
let el = null, force = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function ensure() {
  if (el) return el;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  el = document.createElement('div'); el.className = 'mm'; el.hidden = true;
  el.innerHTML = '<div class="mm-card"><div class="mm-title"></div><div class="mm-sub"></div><div class="mm-track"><i class="mm-zone"></i><i class="mm-perfect"></i><b class="mm-mark"></b></div><button class="mm-btn">TAP!</button></div>';
  K.uiRoot.appendChild(el); return el;
}
const q = s => el.querySelector(s);
function show(title, sub) { ensure(); el.hidden = false; q('.mm-title').textContent = title; q('.mm-sub').textContent = sub || ''; }
function hide() { if (el) el.hidden = true; }
const pos = (n, a, b) => { n.style.left = (a * 100) + '%'; n.style.width = Math.max(0, (b - a) * 100) + '%'; };

/* one bar: a marker swings left-right, you tap. zone = [from, to] (0-1), perfect = [from, to] inside it. Resolves { v, hit, perfect } */
function bar({ zone, perfect, speed }) {
  return new Promise(res => {
    const mark = q('.mm-mark'), zn = q('.mm-zone'), pf = q('.mm-perfect'), btn = q('.mm-btn');
    if (zone) pos(zn, zone[0], zone[1]); else zn.style.width = '0'; if (perfect) pos(pf, perfect[0], perfect[1]); else pf.style.width = '0';
    const t0 = performance.now(); let done = false, v = 0;
    const raf = () => { if (done) return; const ph = ((performance.now() - t0) / 1000 * speed) % 2; v = ph < 1 ? ph : 2 - ph; mark.style.left = (v * 100) + '%'; requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    const stop = () => { if (done) return; done = true; el.removeEventListener('pointerdown', stop); K.tone(880, .05, 'square', .05); K.haptic('light');
      const hit = !!zone && v >= zone[0] && v <= zone[1], pf2 = !!perfect && v >= perfect[0] && v <= perfect[1]; mark.style.left = (v * 100) + '%'; res({ v, hit, perfect: pf2 }); };
    el.addEventListener('pointerdown', stop);
    let sched = false;
    const watch = setInterval(() => { if (done) return clearInterval(watch); if (force != null && !sched) { sched = true; setTimeout(() => {   // tests: tap at a chosen place, also on a bar that is already swinging
      const mid = (a, b) => (a + b) / 2;
      v = force === 'perfect' ? (perfect ? mid(...perfect) : zone ? mid(...zone) : .5) : force === 'hit' ? (zone ? mid(...zone) : .5) : force === 'miss' ? (zone && zone[0] > .5 ? .02 : .98) : +force;
      stop();
    }, 160); } }, 40);
  });
}

/* fishing: N reels, each a timing bar with a green zone that shrinks. cfg = minigames.fishing */
async function fishing(cfg, label) {
  show(label || 'Fishing', 'Something is nibbling. Tap when the marker is in the green.');
  let hits = 0, perfectHits = 0;
  for (let i = 0; i < cfg.rounds; i++) {
    const w = cfg.zone * (1 - i * .18), c = .2 + Math.random() * .6, zone = [c - w / 2, c + w / 2], pw = Math.max(.025, w * .28);
    q('.mm-sub').textContent = 'Reel ' + (i + 1) + ' of ' + cfg.rounds + (i ? ' · ' + hits + ' so far' : '');
    const r = await bar({ zone, perfect: [c - pw / 2, c + pw / 2], speed: cfg.speed * (1 + i * .12) });
    if (r.hit) { hits++; if (r.perfect) perfectHits++; }
    q('.mm-sub').textContent = r.perfect ? 'PERFECT! 🎣' : r.hit ? 'Good.' : 'It slips…';
    await sleep(force != null ? 20 : 650);
  }
  hide();
  return { hits, rounds: cfg.rounds, ok: hits >= cfg.need, perfect: perfectHits >= 1 && hits >= cfg.need, perfectHits };
}

/* golf: a hole `distance` metres away. Each shot: tap to set the power. The green zone is the power that carries exactly to the hole. cfg = minigames.golf */
async function golf(cfg, hole) {
  show(hole.name || 'Golf', 'Hole: ' + hole.distance + ' m · par ' + hole.par);
  let remaining = hole.distance, strokes = 0, holed = false;
  while (strokes < cfg.maxStrokes && !holed) {
    strokes++;
    const need = remaining / cfg.maxCarry, w = cfg.window, zone = need <= 1 ? [Math.max(0, need - w), Math.min(1, need + w)] : [1 - w * 1.5, 1], perfect = need <= 1 ? [Math.max(0, need - w / 3), Math.min(1, need + w / 3)] : null;
    q('.mm-sub').textContent = 'Stroke ' + strokes + ' · ' + Math.round(remaining) + ' m to the hole';
    const r = await bar({ zone, perfect, speed: cfg.speed });
    let carry = r.v * cfg.maxCarry * (.96 + Math.random() * .08);
    if (r.perfect && need <= 1) carry = remaining + (Math.random() - .5) * cfg.cup;         // dead on
    else if (r.hit && need <= 1) carry = remaining + (Math.random() - .5) * cfg.cup * 3;    // close
    remaining = Math.abs(remaining - carry);
    holed = remaining <= cfg.cup;
    q('.mm-sub').textContent = holed ? 'In the hole! ⛳' : 'Landed ' + Math.round(carry) + ' m. ' + Math.round(remaining) + ' m left.';
    await sleep(force != null ? 20 : 800);
  }
  hide();
  const diff = strokes - hole.par;
  return { strokes, holed, par: hole.par, label: !holed ? 'Gave up' : strokes === 1 ? 'Hole in one!' : diff < 0 ? 'Birdie' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : 'Over par' };
}

return { fishing, golf, set force(v) { force = v; }, get active() { return !!el && !el.hidden; } };
};
