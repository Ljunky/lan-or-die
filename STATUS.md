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

## Built since (point 4: the bigger world), tested
- Map extended east to 160 × 74 tiles; every old coordinate unchanged (the old map is in code, the new part is rectangles in `data/m3-data.js` → `world`). Before Tuesday the east is a wall of trees, so Monday's map is the old one (plus a strip of tall grass in front of The Box).
- New areas: golf course, city, mountain with a trail, forest and deep forest, a big lake with a castle island. Roads cross bands of tall grass / undergrowth whose levels rise towards each house (Box 8–11, store 17–22, cave 28–32, rave 39–42, lake 34–40).
- Five houses with level gates on your BEST creature (Box 10, store 20, cave 30, castle 40, rave 40). No signs; the name shows as ??? until someone told you; the door tells you in words. Each house has a one-time trophy; your own hero's house is your home (heal + storage). Heroes stay where they are. Dev Ljunky needs all four heroes AND all released houses (not your own).
- The lake: a boat (Boat-Bengt, only after a fisherman told you; he trades it for the van, storage keeps working) or a Pikezilla that knows Ferry (Lv 30) once taught. Water encounters at 34–40. Fishing net (holds a creature 2 turns) and a lake net trap (shore only).
- Seven new people with their own dialogue: Caddy Calle, Kiosk-Klas, Hermit Hilding, Mountain guide Greta, Doorman Dragan, Fisherman Folke, Boat-Bengt. Knowledge chain: Pelle/Hasse/Jonas/Kenny tell the houses (Tue), Pirate the castle (Wed), Folke the boat and the ferry (Wed).
- Release: world, houses (except the castle), net: Tue. Castle, boat, ferry, Bengt: Wed. The Box and its level gate: Mon.

## Built since (point 7: things to do), tested
- **Quests** (data → `quests`): steps done by conditions (same language as dialogue), hand-ins to a person, choices with consequences (`locks` close the other quest, rewards depend on what you chose, `rel` maps change how several people feel). 14 starter quests: Pelle vs Berit (choose a side) / the ticking parcel (mutually exclusive), the pirate's bottle, Freja's penguin, the Barber's cat, Jonas and Anna's light bill, Folke's Pikezilla and perfect cast, Caddy Calle's par. Quests show in 📓 Notes.
- **Props** (data → `props`): puzzle pieces, tees, fishing spots and day events, with dialogue like a person.
- **House puzzles** (each gives an edge on that hero: his team is 3 levels lower and he comments): The Box = kettlebells in order then the rower (Mon); electronics store = find 3 fuses, put them in the fuse box; shaman cave = herbs in the right order (Greta tells you); castle = the throne (a choice: sit or polish); rave = glow stick from the bar, give it to the DJ after dark. Heroes still stand where they were.
- **Mini-games**: fishing (3 timing bars) at the pier and a lake spot; golf (power bar, par 3) at tee 1. One tap each; numbers in data.
- **Day and night**: the real clock tints the outdoors at night; Night-watch Nisse only at night; the rave pulses a bass, louder at night; a Monday balloon stand, a Tuesday market (half price), a Wednesday lost wallet; rumours that change per day (people with `rumours: true`), listed in Notes.

## Balance pass (simulated, see BALANCE.md; `node tools/balance.js` re-runs it from the data)
The simulator copies the game's battle, XP and encounter maths and was checked against real in-game fights (same win rate, turns and HP loss within noise). It assumes a party of four types, best move, swapping to the best matchup, no items. Times are an ideal grind in the best safe zone; real play (talking, shopping, exploring, healing) is probably 2-3× slower.
- **Monday (old map only):** Lv 10 in 6 min, Lv 15 in 20 min, Lv 20 in about an hour, Lv 25 in 3.7 h, then it stalls on purpose (the old map tops out at Lv 11 foes). The first house (The Box, Lv 10) opens after minutes.
- **Tuesday/Wednesday (east open):** Lv 20 in 36 min, Lv 30 in 1.6 h, Lv 40 in 3.2 h, Lv 46 in 5.2 h, Lv 50 in 6.5 h (lead only). Every level band up to Lv 32 has a fair zone (win >= 90 %, < 55 % HP lost); above that the best zone is 2-4 levels below you, so Lv 40 to 50 is a slow top end.
- **Hero bosses (7/8/9 rising by 2 per hero beaten):** a party of four is at ~100 % when its level is boss level +3 and 0-15 % at equal level. A lead alone has no chance, so players must bring a party. Fair.
- **Dev Ljunky (Lv 46, HP x2.6, kept as asked):** a party of four at Lv 46 wins ~100 % (loses ~2 of 4 creatures, no items), at Lv 40 about 55 %. Levelling four creatures costs ~2.3× the lead's grind, so Dev is a Wednesday-night goal for dedicated players only.
- **Economy:** 1.5 kr per foe level is about one carrier bag per win at Lv 7 and 3-6 bags per win at Lv 20-40; a Fizz tablet (15 kr) per fight is affordable. Catch chances at 25 % HP: Common 56 %, Epic 18 %, Legendary 12 %, Mythic 8 % per bag (after a knockout 70 / 30 / 22 / 30 %).
- **Not changed.** No number was out of line enough to retune before launch. Open question for the planning chat: two houses want Lv 40 (The rave on Tuesday, The castle on Wednesday), which is about 3 h of ideal grinding after the east opens. If Tuesday should have a reachable second house, set `houses.bigwman.level` to 35 in data/m3-data.js.

## NOT built yet
- Heroes still stand where they were (moving them into the houses is a later update). The rave dance-off and the electronics gadget repair mini-games were cut (2 mini-games agreed). Each house is one short puzzle, not a long dungeon. Starter text only: the owner's planning chat rewrites it.

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
