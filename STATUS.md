# STATUS.md – Mission 3 "Bad Trip at Maxi" (handoff for a planning chat)

Branch **`polish`** (never merged to main by the builder; the owner decides). Rollback tag `m3-pre-polish` = main before M3 (the tag has to be pushed by the owner, the proxy blocked it).
Live on **Mon 23 Nov**, scores count 23–25 Nov. Later content ships as data-only drops Tue 24 / Wed 25 (`release: 'mon'|'tue'|'wed'` on every entry).
Latest state is always: this file + `CHARACTERS.md` (every person and line, generated) + `DATA.md` (how to add content) + `data/m3-data.js` (the content itself).

## Done and tested (bash tests/run.sh = ALL PASSED, M1/M2 untouched)
- Generic engine kit `engine/*.js` (sprites, fx, effects, data), M3 data-driven, 27 creature PNGs (the owner will rewrite creatures: only reference them by id).
- Opening: wake-up blink, thoughts (names a random OTHER hero), stranger offers 5 starters; first player picks from 5, next from 4… (live claims need `backend/claims.gs` pasted into the Apps Script, NOT done yet).
- Fights: knockout choice (Catch / Finish off / Let it go), graves + resurrection with a liked lure, traps Mk1–3, The Box gym + training, dealer, phone apps, Kenny the Fence, Inkasso-Ingvar (debt every 3), Klarna (3 uses, 1 per 10 min).
- Balance: XP = 8 + 1.3·lv², LV_MAX 50, anti-grind, bags 10 kr, harder catching. Score = goals only, max 300 000 (heroes 30 000 ×4, Dev 50 000, egg 50 000, species 2 000 ×20, list 2 500 ×8, wives 4 000 ×5).
- Menus: centered scrolling card; creature icons use the PNG files directly (a cross-origin bug froze the starter choice on raw.githack).

## Built since (points 5 and 6), tested
- **People with personality and memory** (`missions/m3-people.js`, text in `data/m3-data.js` → `dialogue`, `personalities`): every named NPC, all 5 heroes and all 5 wives have their own personality, voice and lines. Lines are chosen by conditions (hero you play, times met, what you did/carry/are on, real time of day, release day, their memory of your last answer, relationship), best match first, no repeats until the pool is used up. Replies carry tones that the personality turns into relationship (−5…+5): prices (±25 %), refusing to trade at −3, gifts at +4, hunting you at −4. Friends react when you kill or catch someone they know. Random shoppers get a personality and their own lines.
- **Wives**: own talk per hero, per-hero `reacts` (damage, extra turns), 8 turns, 4 lines of which the right one is whichever `right` condition matches best (who you are, what you carry, debt, drink, a dead friend, what happened last time), wrong answer costs a turn, debt makes her angrier, she remembers the last meeting.
- **Knowledge**: facts only come from people (`tell`). Type hints in the move list only after Freezer Freja told you; ring box and tranquilizer gun are not sold until Fia / Jonas told you (not in `?dev=all`); wives' right line gets a 💡 once someone told you what she wants; **📓 Notes** in the bag lists what you know, who told you and how people feel about you; hero houses show ??? (they are `release: 'wed'` knowledge, the houses themselves come with point 4).
- Format and all conditions: `DATA.md` → "Dialogue". Every person with their text: `CHARACTERS.md` (regenerate with `node tools/dump-characters.js`).
- Starter text only: about 4–8 unique lines per named person, replies on about 8 of them. The owner's planning chat can rewrite any of it in the same format.

## NOT built yet (points 4 and 7). Decisions made by the owner: heroes stay where they are for now (moving them into houses is a later update); Dev Ljunky stays Lv 46
4. **Bigger world**: map extended east (old coordinates kept): golf course, city, forest + deep forest, mountain, big lake; houses with level gates (Ljunky/The Box 10, Wizcudi/electronics store 20, Jrohn/shaman cave 30, Löken/castle 40, BigWman/rave 40) – heroes stay in place for now; castle via boat (Boat-Bengt must be told about by a fisherman) or a "Ferry" creature; Dev Ljunky after all 4 houses; fishing net + lake net trap.
7. **Things to do**: quest chains per important NPC (rewards = knowledge/items/keys/relationships, no points), choices with consequences, mini-games (fishing timing bar + golf power meter first), real-clock day/night (the clock is already a dialogue condition), rumours that change Mon/Tue/Wed, house puzzles before each boss.

## Decisions taken
1. Heroes stay where they are for now; houses (and moving heroes into them) are a later update.
2. Dev Ljunky stays Lv 46 (very hard on purpose).
3. Scope trim (agreed by "go"): 2 mini-games (fishing, golf); starter-set text; simple tiles for new areas.

## What the planning chat can do (no code needed)
- Write persona, voice, lines, replies and quest ideas per character. Easiest: copy the format in `DATA.md` → Dialogue (conditions like `{ hero: 'loken', met: 0 }`, replies with `tone`/`rel`/`tell`), or just plain text per person and the builder converts it.
- Read `CHARACTERS.md` for what exists today.

## Links
- Repo: https://github.com/Ljunky/lan-or-die (branch `polish`)
- Play (pinned build with the starter fix): https://raw.githack.com/Ljunky/lan-or-die/808216485de5/index.html?dev=all&date=2026-11-23&claims=reset
- Play (latest `polish`, may be cached a few minutes): https://raw.githack.com/Ljunky/lan-or-die/polish/index.html?dev=all&date=2026-11-23&claims=reset
