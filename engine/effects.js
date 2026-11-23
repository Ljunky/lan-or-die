/* PX.effects – a generic effect system. Knows nothing about any game.
   An effect is plain data:
     { type: 'speed', value: 1, duration: 60, turns: 0, target: 'self'|'enemy'|'area'|'creature',
       stacks: true, maxStacks: 3, onOverdose: { type: 'blackout' }, hidden: true, learnedNote: '…' }
   - duration (seconds) or turns (battle turns); neither = instant (handler.instant runs once).
   - Timed effects live in holder.fx = [{ type, value, t, turns, n, src }] — plain JSON, so they save as-is.
   - Works on any object (the player, a creature, an NPC). The game registers what each type DOES:
       PX.effects.define('heal', { instant(holder, e, ctx) { … } })
       PX.effects.define('speed', { start(h, e, ctx) {}, tick(h, e, dt, ctx) {}, end(h, e, ctx) {} })
     Types without a handler still work as timed numbers: read them with PX.effects.sum(holder, 'speed'). */
(() => {
'use strict';
const PX = window.PX = window.PX || {};
const handlers = {};
const define = (type, h) => { handlers[type] = h || {}; return type; };
const list = h => (h.fx = h.fx || []);

/* apply one effect def to a holder. Returns { stacks, overdose, instant } */
function apply(holder, e, ctx = {}) {
  if (!holder || !e || !e.type) return { ok: false };
  const h = handlers[e.type] || {}, timed = (e.duration || 0) > 0 || (e.turns || 0) > 0;
  if (!timed) { if (h.instant) h.instant(holder, e, ctx); return { ok: true, instant: true }; }
  const L = list(holder), src = e.src || e.type;
  let cur = L.find(f => f.type === e.type && f.src === src);
  if (cur && e.stacks) {
    cur.n++;
    if (e.maxStacks && cur.n > e.maxStacks) { // overdose: drop the stacks, run the overdose effect
      L.splice(L.indexOf(cur), 1); if (h.end) h.end(holder, cur, ctx);
      if (e.onOverdose) apply(holder, Object.assign({ src: src + ':od' }, e.onOverdose), ctx);
      return { ok: true, overdose: true, stacks: 0 };
    }
    cur.t = Math.max(cur.t, e.duration || 0); cur.turns = Math.max(cur.turns || 0, e.turns || 0);
  } else if (cur) { cur.t = Math.max(cur.t, e.duration || 0); cur.turns = Math.max(cur.turns || 0, e.turns || 0); cur.value = e.value; }
  else {
    cur = { type: e.type, value: e.value != null ? e.value : 1, t: e.duration || 0, turns: e.turns || 0, n: 1, src };
    if (e.data) cur.data = e.data;
    L.push(cur); if (h.start) h.start(holder, cur, ctx);
  }
  return { ok: true, stacks: cur.n };
}
/* real-time tick (seconds). Turn-only effects are not touched here. */
function tick(holder, dt, ctx = {}) {
  const L = holder && holder.fx; if (!L || !L.length) return;
  for (let i = L.length - 1; i >= 0; i--) {
    const f = L[i], h = handlers[f.type] || {};
    if (h.tick) h.tick(holder, f, dt, ctx);
    if (f.t > 0) { f.t -= dt; if (f.t <= 0 && !(f.turns > 0)) { L.splice(i, 1); if (h.end) h.end(holder, f, ctx); } }
  }
}
/* one battle turn passed */
function turn(holder, ctx = {}) {
  const L = holder && holder.fx; if (!L) return [];
  const ended = [];
  for (let i = L.length - 1; i >= 0; i--) {
    const f = L[i]; if (!(f.turns > 0)) continue;
    if (--f.turns <= 0 && !(f.t > 0)) { L.splice(i, 1); ended.push(f); const h = handlers[f.type]; if (h && h.end) h.end(holder, f, ctx); }
  }
  return ended;
}
const all = (holder, type) => ((holder && holder.fx) || []).filter(f => f.type === type);
const has = (holder, type) => all(holder, type).length > 0;
const sum = (holder, type) => all(holder, type).reduce((a, f) => a + (typeof f.value === 'number' ? f.value : 1) * (f.n || 1), 0);
const stacks = (holder, type) => all(holder, type).reduce((a, f) => a + (f.n || 1), 0);
function clear(holder, type, ctx = {}) {
  const L = holder && holder.fx; if (!L) return;
  for (let i = L.length - 1; i >= 0; i--) if (!type || L[i].type === type) { const f = L.splice(i, 1)[0]; const h = handlers[f.type]; if (h && h.end) h.end(holder, f, ctx); }
}
/* plain copy for a save file; restore = just assign it back to holder.fx */
const save = holder => ((holder && holder.fx) || []).map(f => Object.assign({}, f));

PX.effects = { define, apply, tick, turn, has, sum, stacks, all, clear, save, handlers };
})();
