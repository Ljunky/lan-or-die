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

## NOT built yet (points 4–7 of the owner's big update). Waiting for the owner's "go"
5. **People with memory and personality**: dialogue per person (conditions: hero played, times met, what you did, real time of day, release day; memory of last answer; no repeats; relationship −5…+5; friends react to kills/catches). Wives: own story, 4 lines, right line depends on what she learned about you, 8 turns, remembers meetings.
6. **Knowledge layer**: hero houses "???" until someone tells you; Boat-Bengt, Ferry ability, wives' right lines, "strong!" hints unlocked by people; 📓 Notes page.
4. **Bigger world**: map extended east (old coordinates kept): golf course, city, forest + deep forest, mountain, big lake; hero houses with level gates (Ljunky/The Box 10, Wizcudi/electronics store 20, Jrohn/shaman cave 30, Löken/castle 40, BigWman/rave 40); castle via boat or a "Ferry" creature; Dev Ljunky after all 4 houses; fishing net + lake net trap.
7. **Things to do**: quest chains per important NPC (rewards = knowledge/items/keys/relationships, no points), choices with consequences, mini-games (proposal: fishing timing bar + golf power meter first), real-clock day/night, rumours that change Mon/Tue/Wed, house puzzles before each boss.
Planned order: 5 and 6, then 4 and 7.

## Open decisions for the owner
1. Monday: heroes stay where they are today and beating them counts; from Tuesday they live in their houses (a hero already beaten stays beaten). OK?
2. Dev Ljunky is Lv 46 and the cave/castle/rave need Lv 30–40: with the new XP curve nobody reaches 300 000 by Wednesday. Keep, or lower?
3. Scope trim proposed: 2 mini-games (fishing, golf), starter-set of text (6–10 lines + 2–3 replies per named person, one 2–3 step quest chain for ~8 NPCs), filler shoppers share line pools by slice, simple tiles for the new areas.

## What the planning chat can do (no code needed)
- Write persona, voice, lines, replies and quest ideas per character; the builder turns them into data. Easiest format: see "Dialogue" in DATA.md once point 5 is built; until then, plain text per person is fine.
- Read `CHARACTERS.md` for what exists today.

## Links
- Repo: https://github.com/Ljunky/lan-or-die (branch `polish`)
- Play (pinned build with the starter fix): https://raw.githack.com/Ljunky/lan-or-die/808216485de5/index.html?dev=all&date=2026-11-23&claims=reset
- Play (latest `polish`, may be cached a few minutes): https://raw.githack.com/Ljunky/lan-or-die/polish/index.html?dev=all&date=2026-11-23&claims=reset
