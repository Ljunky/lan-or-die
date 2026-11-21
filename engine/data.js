/* PX.data – load + validate a game's data file, release gating, save migration. Knows nothing about any game.
   const db = PX.data.load(RAW, SCHEMA, { today: '2026-11-23', devAll: false, flag: id => bool });
   db.get('creatures', 'frog'), db.list('items', e => e.kind === 'drug'), db.released(entry), db.warnings
   SCHEMA = { creatures: { req: ['name', 'type'], enums: { rarity: ['C','U','R'] }, refs: { moves: 'moves' }, art: 'art', nums: ['price'] }, … }
     refs: field -> collection. The field can be a string, an array of strings, or an array of [id, …] pairs.
     art: field holding a PNG url; checked in dev (a missing file is a warning, never an error).
   Entries may have release: 'mon' (key into RAW.releases = { mon: 'YYYY-MM-DD' }) and requires: 'flagName'. */
(() => {
'use strict';
const PX = window.PX = window.PX || {};

function load(raw, schema = {}, opt = {}) {
  const warnings = [], warn = m => { warnings.push(m); };
  const releases = raw.releases || {};
  const db = {
    raw, warnings, opt,
    get(col, id) { const c = raw[col]; return c && c[id] ? c[id] : null; },
    ids(col, filter) { const c = raw[col] || {}; return Object.keys(c).filter(id => !filter || filter(c[id], id)); },
    list(col, filter) { const c = raw[col] || {}; return Object.keys(c).filter(id => !filter || filter(c[id], id)).map(id => c[id]); },
    released(e) {
      if (!e) return false;
      if (opt.devAll) return true;
      if (e.release) { const d = releases[e.release] || e.release; if (/^\d{4}-\d{2}-\d{2}$/.test(d) && (opt.today ? opt.today() : '9999') < d) return false; }
      if (e.requires && opt.flag && ![].concat(e.requires).every(f => opt.flag(f))) return false;
      return true;
    },
    live(col, filter) { return db.ids(col, (e, id) => db.released(e) && (!filter || filter(e, id))); }
  };
  // stamp ids
  for (const col in raw) { const c = raw[col]; if (c && typeof c === 'object' && !Array.isArray(c) && schema[col]) for (const id in c) if (c[id] && typeof c[id] === 'object' && c[id].id == null) c[id].id = id; }
  // validate
  for (const col in schema) {
    const S = schema[col], c = raw[col];
    if (!c) { if (S.required) warn('missing collection "' + col + '"'); continue; }
    for (const id in c) {
      const e = c[id], where = col + '.' + id;
      if (!e || typeof e !== 'object') { warn(where + ' is not an object'); continue; }
      for (const f of S.req || []) if (e[f] == null || e[f] === '') warn(where + ': missing "' + f + '"');
      for (const f in S.enums || {}) if (e[f] != null && !S.enums[f].includes(e[f])) warn(where + ': ' + f + ' = "' + e[f] + '" (expected ' + S.enums[f].join('|') + ')');
      for (const f of S.nums || []) if (e[f] != null && (typeof e[f] !== 'number' || !isFinite(e[f]) || e[f] < 0)) warn(where + ': ' + f + ' should be a number ≥ 0');
      if (e.release && !releases[e.release] && !/^\d{4}-\d{2}-\d{2}$/.test(e.release)) warn(where + ': unknown release "' + e.release + '"');
      for (const f in S.refs || {}) {
        const target = S.refs[f], v = e[f]; if (v == null) continue;
        const ids = (Array.isArray(v) ? v : [v]).map(x => Array.isArray(x) ? x[0] : (x && typeof x === 'object' ? x.id : x)).filter(x => x != null);
        for (const r of ids) if (!(raw[target] || {})[r]) warn(where + ': ' + f + ' → unknown ' + target + ' "' + r + '"');
      }
      if (S.check) { try { S.check(e, id, warn, raw); } catch (err) { warn(where + ': check failed ' + err.message); } }
      if (S.art && e[S.art] && opt.checkArt !== false && typeof Image !== 'undefined') {
        const url = e[S.art], img = new Image(); img.onerror = () => warn(where + ': art missing ' + url); img.src = url;
      }
    }
  }
  if (warnings.length && opt.devAll) console.warn('[PX.data] ' + warnings.length + ' warning(s):\n' + warnings.join('\n'));
  return db;
}

/* save migration: steps = { 2: d => {…}, 3: d => {…} }. Runs every step above d.v, in order, then sets d.v = latest. */
function migrate(d, steps, latest) {
  if (!d || typeof d !== 'object') return d;
  let v = d.v || 1;
  const keys = Object.keys(steps).map(Number).sort((a, b) => a - b);
  for (const k of keys) if (k > v) { try { d = steps[k](d) || d; } catch (e) { console.error('[PX.data] migrate to v' + k, e); } v = k; }
  d.v = latest || Math.max(v, ...keys);
  return d;
}
/* fill missing keys from a template (deep for plain objects), never overwriting what exists */
function fill(d, tpl) {
  for (const k in tpl) {
    if (d[k] === undefined) d[k] = JSON.parse(JSON.stringify(tpl[k]));
    else if (tpl[k] && typeof tpl[k] === 'object' && !Array.isArray(tpl[k]) && d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) fill(d[k], tpl[k]);
  }
  return d;
}
/* weighted pick: [[value, weight], …] */
function weighted(pairs, rnd = Math.random) {
  let tot = 0; for (const p of pairs) tot += p[1];
  let r = rnd() * tot; for (const p of pairs) if ((r -= p[1]) <= 0) return p[0];
  return pairs.length ? pairs[pairs.length - 1][0] : null;
}
/* fill {name}-style templates */
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));

PX.data = { load, migrate, fill, weighted, fmt };
})();
