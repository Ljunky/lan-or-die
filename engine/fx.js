/* PX.fx – generic game feel. Knows nothing about any game.
   Trauma shake, hit-stop, pooled particles, floating numbers, tweens + easing, fade, screen tint + wobble, projectile arcs.
   ?fx=off in the URL (or PX.fx.enabled = false) turns everything off: no shake, no hit-stop, no particles, tweens finish at once.
   Usage (once per frame):  dt = PX.fx.step(dt)  -> returns 0 while hit-stop is active
                            const [sx, sy] = PX.fx.shake(t);  ctx.translate(sx, sy)
                            layer.draw(ctx)   (a layer holds particles, numbers and arcs in one coordinate space) */
(() => {
'use strict';
const PX = window.PX = window.PX || {};
const q = new URLSearchParams(location.search);
const fx = PX.fx = { enabled: q.get('fx') !== 'off' };

/* ---------- easing ---------- */
const ease = fx.ease = {
  linear: k => k, inQuad: k => k * k, outQuad: k => k * (2 - k), inOutQuad: k => k < .5 ? 2 * k * k : -1 + (4 - 2 * k) * k,
  outCubic: k => 1 - Math.pow(1 - k, 3), outBack: k => { const s = 1.70158; k -= 1; return k * k * ((s + 1) * k + s) + 1; },
  outElastic: k => k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k - .075) * (2 * Math.PI) / .3) + 1,
  outBounce: k => { if (k < 1 / 2.75) return 7.5625 * k * k; if (k < 2 / 2.75) return 7.5625 * (k -= 1.5 / 2.75) * k + .75; if (k < 2.5 / 2.75) return 7.5625 * (k -= 2.25 / 2.75) * k + .9375; return 7.5625 * (k -= 2.625 / 2.75) * k + .984375; }
};

/* ---------- trauma shake + hit-stop ---------- */
let trauma = 0, stopT = 0;
fx.addTrauma = v => { if (fx.enabled) trauma = Math.min(1, trauma + v); };
fx.hitStop = ms => { if (fx.enabled) stopT = Math.max(stopT, Math.min(.12, ms / 1000)); };
fx.stopped = () => stopT > 0;
fx.shake = (t, max = 10) => {
  if (!fx.enabled || trauma <= 0) return [0, 0];
  const s = trauma * trauma * max; // trauma^2 feels better than linear
  return [Math.round((Math.sin(t * 91.3) + Math.sin(t * 37.1)) * .5 * s), Math.round((Math.sin(t * 77.7 + 1) + Math.sin(t * 29.9)) * .5 * s)];
};

/* ---------- tweens ---------- */
const tweens = [];
fx.tween = (obj, to, dur, e = 'outQuad', done) => {
  const from = {}; for (const k in to) from[k] = obj[k];
  if (!fx.enabled || dur <= 0) { Object.assign(obj, to); if (done) done(); return null; }
  const tw = { obj, from, to, dur, t: 0, e: typeof e === 'function' ? e : ease[e] || ease.linear, done };
  tweens.push(tw); return tw;
};
fx.wait = s => new Promise(r => fx.tween({ v: 0 }, { v: 1 }, s, 'linear', r));

/* ---------- fade + tint + wobble (screen space) ---------- */
const screen = { fade: 0, fadeCol: '#000', tint: null, tintA: 0, wobble: 0 };
fx.screen = screen;
fx.fade = (to, dur = .3, col = '#000') => new Promise(r => { screen.fadeCol = col; if (!fx.enabled) { screen.fade = 0; r(); return; } fx.tween(screen, { fade: to }, dur, 'inOutQuad', r); });
fx.setTint = (col, a = .15, wobble = 0) => { screen.tint = col; screen.tintA = fx.enabled ? a : 0; screen.wobble = fx.enabled ? wobble : 0; };
fx.clearTint = () => { screen.tint = null; screen.tintA = 0; screen.wobble = 0; };
/* call before drawing the world: sways the camera when wobble is on */
fx.applyWobble = (ctx, t, W, H) => {
  if (!screen.wobble) return;
  const w = screen.wobble; ctx.translate(W / 2, H / 2); ctx.rotate(Math.sin(t * 1.3) * .02 * w); ctx.scale(1 + Math.sin(t * 1.9) * .02 * w, 1 + Math.cos(t * 1.6) * .02 * w); ctx.translate(-W / 2 + Math.sin(t * 2.1) * 4 * w, -H / 2);
};
/* call last, in screen coords */
fx.drawScreen = (ctx, W, H, t) => {
  if (screen.tint && screen.tintA > 0) {
    ctx.save(); ctx.globalAlpha = screen.tintA * (.85 + Math.sin(t * 2) * .15); ctx.fillStyle = screen.tint;
    if (screen.tint === 'rainbow') { const g = ctx.createLinearGradient(0, 0, W, H), h = (t * 40) % 360; g.addColorStop(0, 'hsl(' + h + ',90%,60%)'); g.addColorStop(.5, 'hsl(' + (h + 120) + ',90%,60%)'); g.addColorStop(1, 'hsl(' + (h + 240) + ',90%,60%)'); ctx.fillStyle = g; }
    ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  if (screen.fade > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, screen.fade); ctx.fillStyle = screen.fadeCol; ctx.fillRect(0, 0, W, H); ctx.restore(); }
};

/* ---------- layer: pooled particles, floating numbers, arcs ---------- */
fx.layer = (max = 240) => {
  const pool = [], live = [], nums = [], arcs = [];
  const L = {
    burst(x, y, o = {}) {
      if (!fx.enabled) return;
      const n = o.n || 12;
      for (let i = 0; i < n && live.length < max; i++) {
        const p = pool.pop() || {}, a = o.angle != null ? o.angle + (Math.random() - .5) * (o.spread || Math.PI * 2) : Math.random() * Math.PI * 2, s = (o.speed || 120) * (.4 + Math.random() * .8);
        Object.assign(p, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 0), g: o.gravity != null ? o.gravity : 300, t: 0, life: (o.life || .6) * (.6 + Math.random() * .6),
          c: Array.isArray(o.color) ? o.color[i % o.color.length] : o.color || '#fff', s: o.size || 3, shape: o.shape || 'sq', text: o.text });
        live.push(p);
      }
    },
    number(x, y, text, o = {}) {
      if (!fx.enabled) return;
      nums.push({ x: x + (Math.random() - .5) * 10, y, text: String(text), t: 0, life: o.life || .9, col: o.color || '#fff', size: o.size || (o.crit ? 26 : 20), crit: !!o.crit });
    },
    /* projectile arc from (x0,y0) to (x1,y1). o.h = arc height, o.dur, o.draw(ctx, x, y, k, rot), returns a Promise that resolves on impact */
    arc(x0, y0, x1, y1, o = {}) {
      return new Promise(res => {
        if (!fx.enabled) { res(); return; }
        arcs.push({ x0, y0, x1, y1, h: o.h != null ? o.h : 80, dur: o.dur || .55, t: 0, draw: o.draw, spin: o.spin || 8, res });
      });
    },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) { const p = live[i]; p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t >= p.life) { live.splice(i, 1); pool.push(p); } }
      for (let i = nums.length - 1; i >= 0; i--) { const n = nums[i]; n.t += dt; if (n.t >= n.life) nums.splice(i, 1); }
      for (let i = arcs.length - 1; i >= 0; i--) { const a = arcs[i]; a.t += dt; if (a.t >= a.dur) { arcs.splice(i, 1); a.res(); } }
    },
    draw(ctx) {
      for (const p of live) {
        ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
        if (p.text) { ctx.font = (p.s * 4) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.text, p.x, p.y); }
        else { ctx.fillStyle = p.c; const s = p.s; ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s); }
      }
      ctx.globalAlpha = 1;
      for (const a of arcs) {
        const k = Math.min(1, a.t / a.dur), x = a.x0 + (a.x1 - a.x0) * k, y = a.y0 + (a.y1 - a.y0) * k - Math.sin(k * Math.PI) * a.h;
        if (a.draw) a.draw(ctx, x, y, k, k * a.spin); else { ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 3, 6, 6); }
      }
      for (const n of nums) {
        const k = n.t / n.life, pop = k < .15 ? ease.outBack(k / .15) : 1, y = n.y - ease.outCubic(k) * 34;
        ctx.save(); ctx.globalAlpha = k > .7 ? 1 - (k - .7) / .3 : 1; ctx.translate(n.x, y); ctx.scale(pop, pop);
        ctx.font = '400 ' + n.size + 'px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = '#1F2A44'; ctx.strokeText(n.text, 0, 0); ctx.fillStyle = n.col; ctx.fillText(n.text, 0, 0); ctx.restore();
      }
    },
    clear() { live.length = nums.length = 0; for (const a of arcs) a.res(); arcs.length = 0; },
    get count() { return live.length; }
  };
  return L;
};

/* ---------- step: tick trauma, hit-stop and tweens. Returns the dt the game should use (0 during hit-stop) ---------- */
fx.step = dt => {
  trauma = Math.max(0, trauma - dt * 1.6);
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur), e = tw.e(k);
    for (const key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
    if (k >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); }
  }
  if (stopT > 0) { stopT -= dt; return 0; }
  return dt;
};
fx.reset = () => { trauma = 0; stopT = 0; for (const tw of tweens.splice(0)) if (tw.done) tw.done(); screen.fade = 0; fx.clearTint(); };
})();
