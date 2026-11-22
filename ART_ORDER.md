# Creature art: what to draw and in what order

Generated from `data/m3-data.js` on branch `polish` (run date 2026-11-22). **If this file and the data disagree, the data wins**: list the ids with `node -e` as in section 6 to refresh it.

## 1. Where the animals are documented
| File (branch `polish`) | What is in it |
|---|---|
| `M3_CREATURES.md` | The design: lines, 3 stages, evolution levels, drug forms and trip traits, habitats and sizes, trap ladders, Fältboken. **Read sections 2, 5, 6 and 6b.** |
| `data/m3-data.js` → `creatures` | The truth: every form with line, stage, type, size, release day, evolve level, `feed` recipes, moves and a `desc` line (use it as the visual brief). |
| `data/m3-data.js` → `zones`, `heroes` | Where each line lives (zones) and which forms the five bosses use (`heroes.<id>.team`). |
| `DATA.md` → Creature | How an entry works. The `art` row explains the file-name rule. |
| `CHARACTERS.md` | Every person and line of dialogue (not animals). |
| `tools/import-art.js` / `tools/import-art.html` | Turns any picture into the game's 48 × 48 file (background removed, palette, outline). |

## 2. The technical rules for one picture
- **One file per form**, 48 × 48 px PNG, transparent background, named exactly like the id: `assets/creatures/badgerCub.png`. The game finds it by file name; no `art:` line is needed. Until it exists the game shows a dark disc with a ?.
- **Make it from any picture:** `node tools/import-art.js picture.jpg badgerCub` (or a whole folder of pictures named by id), or open `tools/import-art.html` in a browser (no install, with preview).
- **The palette is 22 colours** (see `engine/sprites.js` → PALETTE) plus a navy `#1F2A44` outline. There are no mid-tone pinks, so a detailed painting loses its fur and its red mouth. Ask the image tool for: *"chunky pixel art, 48×48 sprite, limited palette of about 16 colours, no dithering, bold dark outline, simple shapes, plain white background, no text"*. Chunky and simple converts best.
- **Facing (open decision):** the game draws a creature exactly as drawn (never mirrored). Both the foe (top right) and your own creature (bottom left) use the same picture. Draw everything **facing right, three-quarter view**, and ask the builder to mirror the foe (`flipX: true` for the foe in the battle draw), so both look at each other. If that is not done, the foe will look away from you.
- **Size on screen:** about 190 px (foe) and 230 px (yours) on a phone, so keep the silhouette readable: one clear shape, eyes visible, no tiny detail.

## 3. Drawing rules that save time
1. **Draw one line at a time**, youngling → teen → adult → drug forms, so the family looks related. The youngling has a big head and big eyes. The adult is bigger and meaner.
2. **A drug form is the teen (or the adult) of its line plus one visual cue.** Keep the same animal, change the colour and add the cue:

| Drug | Visual cue |
|---|---|
| Xanax | sleepy half-closed eyes, pastel blue |
| Molly | heart eyes, pink glow, hugging pose |
| Ketamine | blank stare, see-through purple haze |
| LSD | rainbow swirl patterns on the body |
| Shrooms | mushrooms growing on it |
| Coke | huge eyes, white dust on the nose |
| Speed | motion lines, jittery |
| Meth | twitchy, sparks, sunken eyes |
| DMT | geometric aura around it |
| Weed | red eyes, a little smoke, leaf mark |
| Snaps | tiny glass, red nose, singing |

3. **Keep colours per type** so a type can be read at a glance: FANG red-brown, WING sky blue, ROOT green, WATER blue, STONE grey, SHELL amber.
4. **Test small.** Look at the picture at its real 48 × 48 size, not zoomed.

## 4. The order (96 forms to draw; the Cold Wallet Wraith already has art)
Tier names are about what players see first. "Out" = the day the form can appear (mon = 23 Nov, tue = 24 Nov, wed = 25 Nov).

### Tier 1: out on Monday, everybody sees these (31 forms)
The five starters up to their adults (+ Stonedeer) and the Maxi-area wildlife. Every player meets these in the first hour. **Start here.**

| id (= file name) | Name | Line · stage | Type | Size | Out | Why it matters |
|---|---|---|---|---|---|---|
| `badgerCub` | Badger Cub | badger 1 | FANG | S | mon | starter line |
| `badger` | Badger | badger 2 | FANG | M | mon | starter line |
| `honeyBadger` | Honey Badger | badger 3 | FANG | M | mon | starter line |
| `lynxKitten` | Lynx Kitten | lynx 1 | STONE | S | mon | starter line |
| `lynx` | Lynx | lynx 2 | STONE | M | mon | starter line |
| `mountainLynx` | Mountain Lynx | lynx 3 | STONE | M | mon | starter line |
| `toadlet` | Toadlet | toad 1 | WATER | S | mon | starter line |
| `toad` | Toad | toad 2 | WATER | S | mon | starter line |
| `giantToad` | Giant Toad | toad 3 | WATER | M | mon | starter line |
| `hoglet` | Hoglet | hedgehog 1 | SHELL | S | mon | starter line |
| `hedgehog` | Hedgehog | hedgehog 2 | SHELL | S | mon | starter line |
| `porcupine` | Porcupine | hedgehog 3 | SHELL | M | mon | starter line |
| `fawn` | Fawn | deer 1 | ROOT | M | mon | starter line |
| `deer` | Deer | deer 2 | ROOT | M | mon | starter line |
| `stag` | Stag | deer 3 | ROOT | L | mon | starter line |
| `stonedeer` | Stonedeer | deer drug | ROOT | M | mon | starter line; drug form: Weed |
| `mouse` | Mouse | rat 1 | FANG | S | mon | – |
| `rat` | Rat | rat 2 | FANG | S | mon | – |
| `ratKing` | Rat King | rat 3 | FANG | S | mon | – |
| `nymph` | Nymph | cockroach 1 | SHELL | S | mon | – |
| `cockroach` | Cockroach | cockroach 2 | SHELL | S | mon | – |
| `giantCockroach` | Giant Cockroach | cockroach 3 | SHELL | S | mon | – |
| `cokeroach` | Cokeroach | cockroach drug | SHELL | S | mon | boss team: Ljunky; drug form: Coke |
| `crowling` | Crowling | crow 1 | WING | S | mon | – |
| `crow` | Crow | crow 2 | WING | M | mon | – |
| `raven` | Raven | crow 3 | WING | M | mon | – |
| `larva` | Larva | ladybug 1 | WING | S | mon | – |
| `ladybug` | Ladybug | ladybug 2 | WING | S | mon | – |
| `perchFry` | Perch Fry | perch 1 | WATER | S | mon | – |
| `perch` | Perch | perch 2 | WATER | S | mon | – |
| `bigPerch` | Big Perch | perch 3 | WATER | S | mon | – |

### Tier 2: the boss teams (14 forms)
The five heroes fight with these (Cokeroach is already in tier 1). Every player fights them, so they must look good.

| id (= file name) | Name | Line · stage | Type | Size | Out | Why it matters |
|---|---|---|---|---|---|---|
| `ketacrow` | Ketacrow | crow drug | WING | M | tue | boss team: Ljunky; drug form: Ketamine |
| `laddybug` | Ladd-ybug | ladybug drug | WING | S | tue | boss team: Ljunky; drug form: LSD |
| `trancequirrel` | Trancequirrel | squirrel drug | ROOT | S | tue | boss team: BigWman; drug form: Molly |
| `speedbeetle` | Speedbeetle | beetle drug | SHELL | S | tue | boss team: Wizcudi; drug form: Speed |
| `snortoise` | Snortoise | tortoise drug | SHELL | M | tue | boss team: Löken; drug form: Coke |
| `mollipike` | Mollipike | pike drug | WATER | M | tue | boss team: Löken; drug form: Molly |
| `mantisShroom` | Mantis Shroom | mantis drug | WATER | S | tue | boss team: Wizcudi; drug form: Shrooms |
| `shroomboar` | Shroomboar | boar drug | FANG | L | tue | boss team: Jrohn; drug form: Shrooms |
| `blowboar` | Blowboar | boar drug | FANG | L | tue | boss team: BigWman; drug form: Coke |
| `methmoth` | Methmoth | moth drug | WING | S | wed | boss team: Wizcudi; drug form: Meth |
| `ketamoose` | Ketamoose | moose drug | ROOT | XL | tue | boss team: Löken; drug form: Ketamine |
| `shroomoose` | Shroomoose | moose drug | ROOT | XL | tue | boss team: Jrohn; drug form: Shrooms |
| `psilocybear` | Psilocybear | bear drug | FANG | XL | tue | boss team: BigWman; drug form: Shrooms |
| `acidadder` | Acidadder | adder drug | FANG | S | tue | boss team: Jrohn; drug form: LSD |

### Tier 3: Tuesday, the east opens (47 forms)
Golf course, city, lake, forest, mountain. Draw by line, in the order they appear in the table.

| id (= file name) | Name | Line · stage | Type | Size | Out | Why it matters |
|---|---|---|---|---|---|---|
| `xanadger` | Xanadger | badger drug | FANG | M | tue | starter line; drug form: Xanax |
| `ecstadger` | Ecstadger | badger drug | FANG | M | tue | starter line; drug form: Molly |
| `ketadger` | Ketadger | badger drug | FANG | M | tue | starter line; drug form: Ketamine |
| `ladger` | Ladger | badger drug | FANG | M | tue | starter line; drug form: LSD |
| `mollynx` | MolLynx | lynx drug | STONE | M | tue | starter line; drug form: Molly |
| `sporecupine` | Sporecupine | hedgehog drug | SHELL | S | tue | starter line; drug form: Shrooms |
| `squirrelKit` | Squirrel Kit | squirrel 1 | ROOT | S | tue | – |
| `squirrel` | Squirrel | squirrel 2 | ROOT | S | tue | – |
| `flyingSquirrel` | Flying Squirrel | squirrel 3 | ROOT | S | tue | – |
| `grub` | Grub | beetle 1 | SHELL | S | tue | – |
| `stagBeetle` | Stag Beetle | beetle 2 | SHELL | S | tue | – |
| `hatchling` | Hatchling | tortoise 1 | SHELL | S | tue | – |
| `tortoise` | Tortoise | tortoise 2 | SHELL | M | tue | – |
| `elderTortoise` | Elder Tortoise | tortoise 3 | SHELL | L | tue | – |
| `crayling` | Crayling | crayfish 1 | SHELL | S | tue | – |
| `crayfish` | Crayfish | crayfish 2 | SHELL | S | tue | – |
| `signalCrayfish` | Signal Crayfish | crayfish 3 | SHELL | M | tue | – |
| `snapskrafta` | Snapskräfta | crayfish drug | SHELL | S | tue | drug form: Snaps |
| `pikeFry` | Pike Fry | pike 1 | WATER | M | tue | – |
| `pike` | Pike | pike 2 | WATER | M | tue | – |
| `pikezilla` | Pikezilla | pike 3 | WATER | L | tue | – |
| `foxKit` | Fox Kit | fox 1 | FANG | S | tue | – |
| `fox` | Fox | fox 2 | FANG | M | tue | – |
| `silverFox` | Silver Fox | fox 3 | FANG | M | tue | – |
| `xanaxfox` | Xanaxfox | fox drug | FANG | M | tue | drug form: Xanax |
| `boarlet` | Boarlet | boar 1 | FANG | M | tue | – |
| `wildBoar` | Wild Boar | boar 2 | FANG | L | tue | – |
| `tusker` | Tusker | boar 3 | FANG | L | tue | – |
| `caterpillar` | Caterpillar | moth 1 | WING | S | tue | – |
| `moth` | Moth | moth 2 | WING | S | tue | – |
| `deathMoth` | Death's-head Moth | moth 3 | WING | M | tue | – |
| `mooseCalf` | Moose Calf | moose 1 | ROOT | L | tue | – |
| `moose` | Moose | moose 2 | ROOT | XL | tue | – |
| `bullMoose` | Bull Moose | moose 3 | ROOT | XL | tue | – |
| `bearCub` | Bear Cub | bear 1 | FANG | L | tue | – |
| `brownBear` | Brown Bear | bear 2 | FANG | XL | tue | – |
| `oldBear` | Old Bear | bear 3 | FANG | XL | tue | – |
| `adderling` | Adderling | adder 1 | FANG | S | tue | – |
| `adder` | Adder | adder 2 | FANG | S | tue | – |
| `blackAdder` | Black Adder | adder 3 | FANG | M | tue | – |
| `leveret` | Leveret | hare 1 | ROOT | S | tue | – |
| `mountainHare` | Mountain Hare | hare 2 | ROOT | S | tue | – |
| `eaglet` | Eaglet | eagle 1 | WING | M | tue | – |
| `eagle` | Eagle | eagle 2 | WING | L | tue | – |
| `goldenEagle` | Golden Eagle | eagle 3 | WING | L | tue | – |
| `wolverineKit` | Wolverine Kit | wolverine 1 | FANG | M | tue | – |
| `wolverine` | Wolverine | wolverine 2 | FANG | M | tue | – |

### Tier 4: Wednesday, the rare ones (4 forms)
Rarest forms and the lake monster.

| id (= file name) | Name | Line · stage | Type | Size | Out | Why it matters |
|---|---|---|---|---|---|---|
| `dmtoad` | DMToad | toad drug | WATER | S | wed | starter line; drug form: DMT |
| `mantisLarva` | Mantis Larva | mantis 1 | WATER | S | wed | – |
| `mantisShrimp` | Mantis Shrimp | mantis 2 | WATER | S | wed | – |
| `trippo` | Trippopotamus | trippo 1 | WATER | XL | wed | – |

## 5. How many are done
- Done: `wraith` (the only existing creature art).
- Drawn as a code sample, not yet imported: the Badger line (`badgerCub`, `badger`, `honeyBadger`, `xanadger`), made by the planning chat. They can be redrawn or replaced.
- To draw: **96**. Tier 1: 31, tier 2: 14, tier 3: 47, tier 4: 4.
- If time runs out: tier 1 + tier 2 is 45 forms and covers everything a player does on Monday and every boss fight. The rest can stay "?" until Tuesday/Wednesday.

## 6. Where each line lives (for the visual brief)
| Line | Found in (from `zones`) | desc line |
|---|---|---|
| badger | **never wild** (starter only) | A cub with the confidence of a bear. Hisses at vacuum cleaners. |
| lynx | **never wild** (starter only) | Tufted ears, enormous paws, no idea how to use either. |
| toad | **never wild** (starter only) | Fits on a thumbnail. Sings at 3 a.m. |
| hedgehog | **never wild** (starter only) | Rolls into a ball when you say hello. |
| deer | **never wild** (starter only) | Legs too long, ears too big. Falls over a lot. |
| rat | Fruit & veg, Pick-and-mix, Freezer aisle, Bakery, Flower department, Self-checkout, Checkouts, Systembolaget, Apotek Hjärtat, IRON Burger, Pizzeria Berga, J&K99 Sushi, Tailor's Barber, E.ON charger, The lawn, east side, Roadside grass (tue), City outskirts (tue), Lakeside grass (tue), The city (tue), The lawn by the lake, Parking lot | Lives in the dumpster behind the pharmacy. Pays no rent. |
| cockroach | Fruit & veg, Pick-and-mix, Freezer aisle, Bakery, Flower department, Self-checkout, Checkouts, Systembolaget, Apotek Hjärtat, IRON Burger, Pizzeria Berga, J&K99 Sushi, Tailor's Barber, The lawn, east side, City outskirts (tue), The city (tue), Parking lot | Smaller than a thumb. Survives anything. |
| crow | Self-checkout, Systembolaget, IRON Burger, Pizzeria Berga, J&K99 Sushi, E.ON charger, The lawn, east side, Roadside grass (tue), City outskirts (tue), Lakeside grass (tue), The foothills (tue), The mountain trail (tue), The golf course (tue), The city (tue), The mountain (tue), The lawn by the lake, Parking lot | Loud, scruffy, always hungry. Steals a fry and screams. |
| ladybug | Fruit & veg, Pick-and-mix, Bakery, Flower department, E.ON charger, The lawn, east side, Roadside grass (tue), Lakeside grass (tue), The golf course (tue), The lawn by the lake | A spotty little caterpillar thing. Eats aphids all day. |
| perch | The big lake (wed) | Striped, curious, bites at anything. |
| squirrel | Roadside grass (tue), Lakeside grass (tue), The forest (tue), The golf course (tue) | Hides nuts. Forgets where. Plants forests by accident. |
| beetle | Roadside grass (tue), Lakeside grass (tue), The forest (tue), The golf course (tue) | A fat white worm with an attitude. |
| tortoise | The golf course (tue) | Escaped from a living room in 2009. |
| crayfish | The big lake (wed) | A tiny crayfish. Pinches your finger on principle. |
| pike | The big lake (wed) | A toothy little torpedo. |
| mantis | The big lake (wed) | Escaped from the city aquarium. Punches faster than the eye. |
| trippo | The big lake (wed) | Only visible to the tripping. Everyone is confused. Itself too. |
| fox | City outskirts (tue), The forest (tue), The deep forest (tue), The golf course (tue), The city (tue) | Rusty fluff, huge ears, no manners. |
| boar | The forest (tue), The deep forest (tue) | Stripes today. Tusks tomorrow. |
| moth | The forest (tue), The deep forest (tue) | Eats a leaf an hour. Dreams of lamps. |
| moose | The deep forest (tue) | Knees like a table. Sulks when it rains. |
| bear | The deep forest (tue), The mountain (tue) | Cute. Careful: mum is watching. |
| adder | The foothills (tue), The mountain trail (tue), The deep forest (tue), The mountain (tue) | Zig-zag on its back. Bites if stepped on. |
| hare | The foothills (tue), The mountain trail (tue), The mountain (tue) | A tuft of fur with eyes. |
| eagle | The mountain trail (tue), The mountain (tue) | Fluff and hunger. Mum is not far. |
| wolverine | The mountain (tue) | Small, angry, already carrying a grudge. |

Refresh the id list yourself: `git show origin/polish:data/m3-data.js > /tmp/d.js && node -e "global.window={};require('/tmp/d.js');const C=window.M3_DATA.creatures;console.log(Object.keys(C).filter(i=>!require('fs').existsSync('assets/creatures/'+i+'.png')).join(' '))"`.
