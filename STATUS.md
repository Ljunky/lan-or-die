# STATUS.md – Mission 3 "Bad Trip at Maxi" (handoff for a planning chat)

Branch **`polish`** (never merged to main by the builder; the owner decides). Rollback tag `m3-pre-polish` = main before M3 (the tag has to be pushed by the owner, the proxy blocked it).
Live on **Mon 23 Nov**, scores count 23–25 Nov. Later content ships as data-only drops Tue 24 / Wed 25 (`release: 'mon'|'tue'|'wed'` on every entry).
Latest state is always: this file + `CHARACTERS.md` (every person and line, generated) + `DATA.md` (how to add content) + `data/m3-data.js` (the content itself).

## Done and tested (bash tests/run.sh = ALL PASSED, M1/M2 untouched)
- Generic engine kit `engine/*.js` (sprites, fx, effects, data), M3 data-driven. The creature roster is the new one (section below); the old 27 creature PNGs are gone.
- Opening: wake-up blink, thoughts (names a random OTHER hero), stranger offers 5 starters; first player picks from 5, next from 4… (live claims need `backend/claims.gs` pasted into the Apps Script, NOT done yet).
- Fights: knockout choice (Catch / Finish off / Let it go), graves + resurrection with a liked lure, trap ladders, The Box gym + training, dealer, phone apps, Kenny the Fence, Inkasso-Ingvar (debt every 3), Klarna (3 uses, 1 per 10 min).
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
- New areas: golf course, city, mountain with a trail, forest and deep forest, a big lake with a castle island. Roads cross bands of tall grass / undergrowth whose levels rise towards each house (Box 8–11, store 17–22, cave 28–32, rave 29–36, lake 34–40).
- Five houses with level gates on your BEST creature (Box 10, store 20, cave 30, rave 35, castle 40). No signs; the name shows as ??? until someone told you; the door tells you in words. Each house has a one-time trophy; your own hero's house is your home (heal + storage). Heroes stay where they are. Dev Ljunky needs all four heroes AND all released houses (not your own).
- The lake: a boat (Boat-Bengt, only after a fisherman told you; he trades it for the van, storage keeps working) or a Pikezilla that knows Ferry (Lv 30) once taught. Water encounters at 34–40. Fishing net (holds a creature 2 turns) and a lake net trap (shore only).
- Seven new people with their own dialogue: Caddy Calle, Kiosk-Klas, Hermit Hilding, Mountain guide Greta, Doorman Dragan, Fisherman Folke, Boat-Bengt. Knowledge chain: Pelle/Hasse/Jonas/Kenny tell the houses (Tue), Pirate the castle (Wed), Folke the boat and the ferry (Wed).
- Release: world, houses (except the castle), net: Tue. Castle, boat, ferry, Bengt: Wed. The Box and its level gate: Mon.

## Built since (point 7: things to do), tested
- **Quests** (data → `quests`): steps done by conditions (same language as dialogue), hand-ins to a person, choices with consequences (`locks` close the other quest, rewards depend on what you chose, `rel` maps change how several people feel). 14 starter quests: Pelle vs Berit (choose a side) / the ticking parcel (mutually exclusive), the pirate's bottle, Freja's penguin, the Barber's cat, Jonas and Anna's light bill, Folke's Pikezilla and perfect cast, Caddy Calle's par. Quests show in 📓 Notes.
- **Props** (data → `props`): puzzle pieces, tees, fishing spots and day events, with dialogue like a person.
- **House puzzles** (each gives an edge on that hero: his team is 3 levels lower and he comments): The Box = kettlebells in order then the rower (Mon); electronics store = find 3 fuses, put them in the fuse box; shaman cave = herbs in the right order (Greta tells you); castle = the throne (a choice: sit or polish); rave = glow stick from the bar, give it to the DJ after dark. Heroes still stand where they were.
- **Mini-games**: fishing (3 timing bars) at the pier and a lake spot; golf (power bar, par 3) at tee 1. One tap each; numbers in data.
- **Day and night**: the real clock tints the outdoors at night; Night-watch Nisse only at night; the rave pulses a bass, louder at night; a Monday balloon stand, a Tuesday market (half price), a Wednesday lost wallet; rumours that change per day (people with `rumours: true`), listed in Notes.

## Creature roster (M3_CREATURES.md, all owner decisions implemented)
- **96 forms in 26 lines** + the Cold Wallet Wraith (kept: it belongs to the grave reward and the Mythic Trap; the only creature outside the roster). 5 starter lines (Badger, Lynx, Toad, Hedgehog, Deer: never wild, never in traps), 21 wild lines (Rat, Cockroach, Crow, Ladybug, Perch, Squirrel, Beetle, Tortoise, Crayfish, Pike, Mantis Shrimp, Trippopotamus, Fox, Boar, Moth, Moose, Bear, Adder, Mountain Hare, Eagle, Wolverine). 25 drug forms (24 + the joke Snapskräfta). Species points count LINES (20 of 21), never forms or evolutions.
- **Types** FANG › WING › ROOT › WATER › STONE › SHELL (MIND stays neutral for people). The old FIZZ/GRUB/WILD/TECH/FROST/RUSTLE are gone everywhere.
- **Younglings and evolution:** zones and trainers name a LINE, the level picks the form (Mouse below 12, Rat to 29, Rat King from 30). Automatic evolution at the set levels (announced, nickname stays). Bag sizes: S always, M only as a youngling, L/XL trap only.
- **Drug forms by feeding:** Bag → Use → drug → creature. Right drug + right teen + level = drug form; too young = "Nothing else happens. Yet." Each feeding can be a bad trip (5–12 %): *sketchy* for 30 REAL minutes (can't fight, grey 🥴, saved as a timestamp). 10 trip traits (Benzo Calm, Love Everyone, Dissociate, Kaleidoscope, Spore Mind, Rail, Tweak, Lamp Frenzy, Breakthrough, Chill) and 25 signature moves, all in `data/m3-data.js` (`trips`, `moves`).
- **Hero teams are drug forms:** Ljunky Cokeroach/Ladd-ybug/Ketacrow, Wizcudi Methmoth/Speedbeetle/Mantis Shroom, Jrohn Acidadder/Shroomboar/Shroomoose, Löken Snortoise/Mollipike/Ketamoose, BigWman Trancequirrel/Blowboar/Psilocybear. Heroes still stand where they were, so levels follow the old ladder; set `tuning.BOSS_AT_GATE: true` when they move into their houses (then gate −2 / ±0 / +2).
- **Trap ladders** ground / water / air, tiers 1–5, habitat, size, bait, night/day; a ready trap rolls nothing 25 % / lower 25 % / own tier 40 % / higher 10 % (higher wrecks the trap), bait and upgrade steps shift it (own never over 60 %), drugged bait can give the drug form. **Materials** (fur, feather, scale, chitin, shell, antler) drop from Finish off. **Trapper Tore** (a clearing at the forest edge, hidden until Hardware Jonas or the mountain guide mention him) upgrades traps for kr + materials and repairs wrecks for half price.
- **Fältboken** replaces the creature list: bought from the dealer for 4 points or found in the camper van in the deep forest (which also holds one very rare bag of meth). Per line: picture/name when seen, habitat/size/bait/trap tier when caught, drug forms as black silhouettes until the recipe is told or tried, the previous owner's margin note.
- **Drug sources:** weed/coke/shrooms the dealer; Xanax at the Apotek after the "show a Signal Crayfish" quest; Molly/Speed/Ketamine from Doorman Dragan at the rave; LSD from Hasse once he trusts you; DMT from the cauldron in the shaman cave; meth from the camper van; coke also behind a bin in a city alley at night.
- **Art:** none yet. Every form shows a dark disc with a ? (type-coloured ring) until `art: 'assets/creatures/<id>.png'` (48 × 48) is added to its entry (no warning meanwhile). Old saves are converted (old creatures become their nearest new form at the same level, old traps come back as mouse traps).
- **Night is now 20:00–06:00** (`tuning.NIGHT`), as the light trap needs.
- **Not built (M3_CREATURES.md §10 "smaller improvements", not in the brief):** footprints on the map, nickname editor and "raised from Lv 1" bonus, trophy wall/taxidermist, wives reacting to creatures in the party. Walter, the Cats and the Loyal Customer are gone with the old roster (their dialogue lines now react to a Toad / Lynx; the Barber wants a Fox, Freja a Rat).
- **Backend:** `backend/claims.gs` has the new starter ids. Re-paste it into the Apps Script and deploy a NEW version, otherwise a live starter pick is rejected as "bad claim".

## Launch tooling (added before Mon 23 Nov)
- **`?dev=day&date=2026-11-23`**: a test day that respects release days and locks and never sends anything (`?dev=all` still unlocks everything). `tests/m3-monday.js` plays Monday this way, including all five hero fights with Tue/Wed drug-form teams.
- **Save code** (pause menu, and the brief of a save mission, also on a phone with no save): the save as a text code (~2.6 k characters, fits one Telegram message; "Save as file" if it ever gets longer) with checksum. Import on the other phone with the same player name; replacing an existing save needs a second tap. Needs **nothing** in the Apps Script.
- **Creature art by file name:** `assets/creatures/<id>.png` is picked up automatically (no `art:` line). `node tools/import-art.js <image> <id>` (or `tools/import-art.html`, no install) turns any picture into a 96 × 96 PNG (`--size 48` for the old format): background removed, cropped, thick navy outline; original colours are kept unless the picture already looks like pixel art. Creatures with 96 px art are drawn at the same on-screen size as 48 px art, smoothed (48 and 96 can be mixed).
- **Apps Script, the only thing to do:** re-paste `backend/claims.gs` (starter ids changed) and deploy a NEW version. Details at the top of that file.

## Batch A (gameplay updates, Mon 23 Nov)
- **Auto-fight** (Fight → ⏩ Auto-fight): best move every turn for grinding, a Stop button between turns, stops by itself under 30 % HP or against an Epic; stays on for the next wild fights.
- **The carrier bag** is drawn now (plastic bag with a print, handles, shine): the foe is sucked in, the bag drops and wiggles (three dots show the wiggles, eyes peek out), then it ties shut with a gold flash and GOTCHA! (caught) or rips with shards and the foe pops back out (escaped).
- **Speech bubble** (three dots) instead of the TAP box over anything you can talk to or search.
- **Kinder start:** 8 bags, 3 Folköl, 2 fizz tablets, a **shoebox trap** (falls apart after 3 catches) and some bait.
- **Hidden stashes** (9): a stone, tyres, a bin, a cooler, a log, a golf bag, a stump. 6 in the parking lot (weed Mon, speed/molly/keta Tue, coins), shrooms (lawn), LSD (golf), DMT (forest, Wed). Max one of each drug, each only on the day its drug is released.
- **"Party" is now "Team"** in everything you read.

## Batch B (design, Mon 23 Nov)
- **Bag** is a grid of big icon tiles; **team** screens (bag and battle swap) are picture cards: picture (or type-coloured `?` disc until the art is drawn), name, level, type, HP bar, stats, trip, lead star, sketchy note.
- **Phone** (`missions/m3-phone.js`): a real phone screen with status bar, clock, wallpaper and an icon grid. Old apps (Tibber, Swish, BankID, Strava, Klarna) live inside it. New: Messages (LAN squad chat with replies), SMHI weather, Flashlight, Camera (selfie counter). **Appbutiken** app store: Calculator (with easter eggs), Kompass (points at The Box), Fråga Björn (8-ball), Pruttis (four premium sounds), Hemnet (what your van is worth).
- **Faunalens + Faunadex** replace the Fältboken as the main field guide: first catch → the phone offers an AI scan; yes → Faunalens installed, the Faunadex becomes a free download in the Appbutiken; later catches get a one-line scan. The paper Fältboken still works for players who already have one.
- Saves: `installed`, `chatSeen`, `selfies` added (old saves start with an empty list).

## Batch C (signs, Mon 23 Nov)
- **Shop signs** are data now (`signs` in `data/m3-data.js`, drawn by the new `missions/m3-signs.js`): cartoon boards with icon, chains and shine, striped awnings over the shop doors, a lit glow and white text at night. New sign: the pier ("FISKEBRYGGAN").
- **Hero houses** have a hanging name plank with the hero's colour, pennants and `OPEN` / `HOME` / `🔒 LV n`.

## Balance pass (simulated, see BALANCE.md; `node tools/balance.js` re-runs it from the data)
The simulator copies the game's battle, XP and encounter maths and was checked against real in-game fights (same win rate, turns and HP loss within noise). It assumes a party of four types, best move, swapping to the best matchup, no items and no trip traits. Times are an ideal grind in the best safe zone; real play is probably 2–3× slower. Re-run after the new roster: two multipliers were added so the numbers land where the old balance was: `tuning.WILD_STAT: 1.2` (wild creatures, also from traps and fishing) and `tuning.BOSS_STAT: .6` (hero teams, which are drug forms ×1.3 and rarer than a youngling party).
- **Monday (old map only):** Lv 10 in ~9 min, Lv 20 in ~1.2 h, Lv 25 in 3.8 h, then it stalls on purpose (the old map tops out at Lv 11 foes). The first house (The Box, Lv 10) opens after minutes.
- **Tuesday/Wednesday (east open):** Lv 20 in 46 min, Lv 30 in 1.7 h, Lv 40 in 2.8 h, Lv 46 in 4.0 h, Lv 50 in 5.2 h (lead only).
- **Wild fights:** equal level = 70–100 % win with the best matchup and no items, losing 25–65 % HP; three levels above you = 0–70 %.
- **Hero bosses (levels 7/8/9 rising by 2 per hero beaten):** a party of four wins ~100 % at boss level +3 (the fourth hero needs +4); a lone creature has no chance. Their trip traits (first strike, immunities, K-hole) make them tougher than the simulator says.
- **Dev Ljunky (Lv 46, HP x2.6, unchanged):** a party of four at Lv 46 wins ~100 % (loses ~1 of 4), at Lv 40 about 78 %, no items.
- **Economy:** unchanged (1.5 kr per foe level; a Fizz tablet is affordable every fight). Catch chances per bag at 25 % HP: Common 56 %, Epic 18 %, Legendary 12 %, Mythic 8 %.
- Houses: The Box 10, store 20, cave 30, rave 35, castle 40.

## NOT built yet
- Heroes still stand where they were (moving them into the houses is a later update; then switch on `BOSS_AT_GATE`). The rave dance-off and the electronics gadget repair mini-games were cut (2 mini-games agreed). Each house is one short puzzle, not a long dungeon. Starter text only: the owner's planning chat rewrites it.

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
