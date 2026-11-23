#!/usr/bin/env node
/* LAN OR DIE – Mission 3: build a save code for a player who lost their save.
   The code is the same one the game makes under Pause → Save code. Send it to the player; they choose their name,
   open Pause or the brief → Save code → paste → Import, then Continue.

   node tools/make-save.js --name Jrohn --team badger:24,toad:20,lynx:18 --kr 600 --beat loken --items bag=6,fizztab=3,folkol=2
   Options:
     --name   player name exactly as on the Who's-playing screen (required)
     --team   up to 4 creatures as form:level, comma separated (required). Form ids are in data/m3-data.js (badger, toad, honeyBadger …)
     --van    more creatures waiting in the van, same format
     --starter the starter form id (default: the first creature of the team's line stage 1, e.g. badgerCub)
     --kr     money (default 300)
     --items  bag content as id=count, comma separated (default bag=6,fizztab=2,folkol=2)
     --beat   heroes already beaten: loken,wizcudi,jrohn,bigwman,ljunky (comma separated)
     --time   minutes played (default 60)
     --best   best score so far (default 0, the board keeps the real one)
     --out    write the code to this file as well
   Everything else starts as in a fresh game (position: the van). Caught lines and seen forms are filled in from the team. */
'use strict';
const fs = require('fs'), vm = require('vm'), zlib = require('zlib'), path = require('path');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[++i]; }
const die = m => { console.error('make-save: ' + m); process.exit(1); };
if (!args.name || !args.team) die('need --name and --team (see the top of this file)');
const ctx = { window: {}, console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'm3-data.js'), 'utf8'), ctx);
const D = ctx.window.M3_DATA, C = D.creatures, I = D.items;
const mons = list => (list || '').split(',').filter(Boolean).map(s => { const [id, lv] = s.split(':'); if (!C[id]) die('unknown creature "' + id + '"'); return { sp: id, lv: Math.max(1, Math.min(60, +lv || 5)), xp: 0, hp: 99999 }; });
const party = mons(args.team).slice(0, 4), box = mons(args.van);
if (!party.length) die('the team is empty');
const first = id => { let c = C[id]; for (let n = 0; n < 5 && c && c.stage > 1; n++) { const prev = Object.keys(C).find(k => C[k].evolve && C[k].evolve.to === id); if (!prev) break; id = prev; c = C[id]; } return id; };
const starter = args.starter || first(party[0].sp);
if (!C[starter]) die('unknown starter "' + starter + '"');
const items = {}; for (const s of (args.items || 'bag=6,fizztab=2,folkol=2').split(',').filter(Boolean)) { const [id, n] = s.split('='); if (!I[id]) die('unknown item "' + id + '"'); items[id] = +n || 1; }
const caught = {}, seen = {}, lines = {}, known = {};
for (const c of party.concat(box)) { caught[c.sp] = 1; seen[c.sp] = 1; const line = C[c.sp].line; if (line && !C[c.sp].starter && line !== 'wraith') lines[line] = 1; }
caught[starter] = 1; seen[starter] = 1;
for (const id in items) if (I[id].kind === 'trap' || I[id].kind === 'bait') known[id] = 1;
const heroes = ['loken', 'wizcudi', 'jrohn', 'bigwman', 'ljunky'], beat = (args.beat || '').split(',').filter(Boolean);
for (const h of beat) if (!heroes.includes(h)) die('unknown hero "' + h + '"');
const data = { v: 5, p: [72, 1000], party, box, me: [], dir: 0, seen, caught, list: [], kr: +args.kr || 300, items, beat, solved: [], dev: 0, eggs: [0, 0, 0], egg: false, debt: 0, lvlPts: 0,
  flags: {}, known, people: {}, know: {}, quests: {}, heard: {}, traps: [], graves: [], dead: {}, caughtP: {}, npcBeat: {}, gym: { slots: [] }, dealer: { pts: 0, pen: [], rot: -1, bought: {} },
  apps: {}, steps: 0, trapsUsed: {}, lines, wrecks: {}, wear: {}, stashes: {}, installed: {}, starter };
// the shopping list is rebuilt by the game when it is empty; people, fillers and so on start fresh
const save = { t: Math.round((+args.time || 60) * 60), ts: Date.now(), data };
const hash32 = t => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return (h >>> 0).toString(16).padStart(8, '0'); };
const body = zlib.deflateRawSync(Buffer.from(JSON.stringify({ m: 3, p: args.name, ts: Date.now(), best: +args.best || 0, s: save }), 'utf8')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const code = 'LOD1z.' + body + '.' + hash32(body);
if (args.out) fs.writeFileSync(args.out, code);
console.log(code);
console.error('\nmake-save: ' + party.map(c => c.sp + ' Lv ' + c.lv).join(', ') + ' · ' + (+args.kr || 300) + ' kr · ' + code.length + ' characters. Paste it under Pause → Save code → Import as "' + args.name + '".');
