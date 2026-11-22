# Mission 3: new creatures, evolutions, drug forms and traps (design)

Replaces every grocery-store creature (Folköl Frog, Trolley Golem, Self-scan Ghost…). The new roster is Swedish wildlife (parking lot, lake, golf course, forest, mountain) plus drug-evolved forms. Everything stays data-driven in `data/m3-data.js`. Art: one 48 × 48 PNG per form in `assets/creatures/` (a missing PNG shows ❔ until it is drawn).

## 1. The big ideas
1. **You catch younglings.** Wild encounters are mostly stage 1 (cub, kit, chick). Adults also appear in harder areas, but they are too big for a carrier bag. You need the right trap.
2. **Three stages, set levels:** youngling → teen → adult, e.g. Badger cub → Badger (Lv 16) → Honey Badger (Lv 32).
3. **Drugs make other forms.** Feed the right drug to a teen at or above its branch level, and it evolves into a drug form instead of the normal adult, e.g. Badger + Xanax → Xanadger. Every drug form is stronger in one way and has a real downside.
4. **The 5 starters exist only as starters.** They never appear in the wild or in traps. The starter pool already hands out one per player (first come, first served), so each friend owns a unique line: "only Löken has a Ketadger".
5. **Habitats matter.** Each creature lives in specific places (lake depth, forest, mountain, city at night). Traps upgrade along ladders: from mouse to moose, and from shore to deep water.

## 2. Types (away from FIZZ / GRUB / TECH)
A new 6-type cycle; each beats the next one:

**FANG › WING › ROOT › WATER › STONE › SHELL › FANG**

| Matchup | Why |
|---|---|
| FANG › WING | predators catch birds |
| WING › ROOT | birds and insects strip plants |
| ROOT › WATER | roots drink the water |
| WATER › STONE | water wears stone down |
| STONE › SHELL | stones crack shells |
| SHELL › FANG | teeth break on shells |

MIND stays neutral, for people (heroes, wives, NPCs, Dev Ljunky). Drug forms keep their base type but get a **trip trait** (section 4).

## 3. Evolution and feeding rules
- **Stats:** stage 1 ≈ 75 % of the line's adult stats, stage 2 ≈ 100 %, stage 3 ≈ 125 %. Drug forms ≈ 130 %, with a trade-off.
- **Normal evolution:** happens at the level in `evolve`, with a short flash animation.
- **Feeding:** Bag → Use → choose a drug → choose a creature.
  - If it is the right stage and at or above `feedLv`, it evolves into the drug form right away.
  - If it is too young or too weak, nothing happens except the drug's normal effect: "Badger cub is very relaxed. Nothing else happens. Yet."
- **Risk:** each feed has a bad-trip chance (5–12 % per drug). The creature is "sketchy" for 30 real minutes and can't fight. No deaths from feeding.
- **Knowledge layer:**
  - Which drug makes which form is `???` in the Dex until someone tells you (the dealer, the shaman, Hasse…) or you try it.
  - The Dex shows a branch form as a black silhouette once you have seen its line.
- **Wild drug forms:** a few appear in the wild, only where it makes sense: Trancequirrel at the rave at night, Methmoth at city lamps at night, Trippopotamus only while you are tripping.

## 4. Trip traits (one per drug)
| Drug | Trait | Upside | Downside |
|---|---|---|---|
| Xanax | Benzo Calm | DEF ×1.4, immune to confusion and guilt | 15 % chance to doze off for a turn |
| Molly (ecstasy) | Love Everyone | heals the party 5 % each turn, wild foes easier to catch while it's out | 20 % chance it refuses to attack ("too much love") |
| Ketamine | Dissociate | immune to stat drops and status | sometimes "K-hole": skips a turn, takes half damage |
| LSD / acid | Kaleidoscope | its type changes each turn (often super-effective); EPICs show while it's in the party | its own type is random too, so it can turn weak |
| Shrooms | Spore Mind | moves can confuse; heals 5 % per turn; EPICs show while it's in the party | SPD −1 |
| Coke (blow) | Rail | always moves first, +crit | loses 5 % HP every turn |
| Speed | Tweak | multi-hit moves hit 2 extra times | accuracy −15 % |
| Meth | Lamp Frenzy | ATK +1 every turn | DEF −1 every turn |
| DMT | Breakthrough | once per battle: the foe "meets the machine elves" and loses 3 turns | can't use any other ability that turn |
| Weed | Chill | heals 8 % per turn; the foe's ATK drops 1 every other turn | SPD −2 |

## 5. The 5 starters (never in the wild)
| Line (type) | Stage 1 | Stage 2 | Adult | Drug forms (feed the teen) |
|---|---|---|---|---|
| Badger (FANG) | Badger Cub | Badger (Lv 16) | **Honey Badger** (Lv 32): "Doesn't Care", ignores stat drops | **Xanadger** (Xanax): "Benzo Nap", heals 40 %, sleeps 1 turn · **Ecstadger** (Molly): "Group Hug", heals the party, foe ATK −1 · **Ketadger** (Ketamine): "K-Hole", vanishes 1 turn, then a huge hit · **Ladger** (LSD): "Kaleidoscope Claw", hits with the best type. Feed at Lv 24+. The flagship line, with 4 branches. |
| Lynx (STONE) | Lynx Kitten | Lynx (Lv 16) | Mountain Lynx (Lv 32) | **MolLynx** (Molly), the cute one: "Big Eyes", the foe can't attack it for 2 turns (too cute). Feed at Lv 22+. |
| Toad (WATER) | Toadlet | Toad (Lv 14) | Giant Toad (Lv 30) | **DMToad** (DMT): "Breakthrough", see the trip traits table. Feed at Lv 26+. |
| Hedgehog (SHELL) | Hoglet | Hedgehog (Lv 16) | Porcupine (Lv 30) | **Sporecupine** (Shrooms): "Spore Quills", 3–5 hits, confuses. Feed at Lv 24+. |
| Deer (ROOT) | Fawn | Deer (Lv 16) | Stag (Lv 32) | **Stonedeer** (Weed): "Chill Out", both sides ATK −1, it heals. Feed at Lv 22+. |

## 6. Wild roster by region
Levels are the zone's. Sizes: S = bag OK, M = bag only as a youngling, L / XL = trap only (section 7).

### Maxi area (parking lot, lawn, ICA, stock room): Lv 2–10
| Line (type, size) | Stages | Where | Drug forms |
|---|---|---|---|
| Rat (FANG, S) | Mouse → Rat (12) → Rat King (30) | ICA aisles, stock room, dumpsters | – |
| Cockroach (SHELL, S) | Nymph → Cockroach (14) → Giant Cockroach (28) | stock room, dumpsters, more at night | **Cokeroach** (Coke): "Rail", always first. Feed Lv 18+ |
| Crow (WING, M) | Crowling → Crow (16) → Raven (32) | parking lot, lawn; ravens on the mountain | **Ketacrow** (Ketamine): "Dissociate". Feed Lv 20+ |
| Ladybug (WING, S) | Larva → Ladybug (12) | lawn, flower department, golf course | **Ladd-ybug** (LSD): "Seven Spots of Truth", reveals EPICs while in the party. Feed Lv 12+ |
| Perch (WATER, S) | Fry → Perch (12) → Big Perch (26) | shore fishing (first fish) | – |

### Golf course: Lv 14–20
| Line | Stages | Where | Drug forms |
|---|---|---|---|
| Squirrel (ROOT, S) | Kit → Squirrel (14) → Flying Squirrel (30) | golf trees, lawn, forest edge | **Trancequirrel** (Molly): "Drop the Bass", team SPD +1, stronger at night. Also wild at the rave at night |
| Beetle (SHELL, S) | Grub → Stag Beetle (18) | golf rough, forest floor | **Speedbeetle** (Speed): "Tweak", 4–6 hits. Feed Lv 18+ |
| Tortoise (SHELL, M) | Hatchling → Tortoise (22) → Elder Tortoise (40) | the golf pond (escaped pets), castle island | **Snortoise** (Coke): "Line Dash", the fastest tortoise alive. Feed Lv 22+ |

### City: Lv 12–20 (most interesting at night)
- Cockroach, Rat and Crow are common.
- **Methmoth** at the street lamps at night, wild (rare).
- Foxes come into town at night (see the forest).

### The lake (depth matters, see traps): Lv 10–42
| Line (type, size) | Stages | Depth | Drug forms |
|---|---|---|---|
| Perch | see above | shore | – |
| Crayfish (SHELL, S) | Crayling → Crayfish (18) → Signal Crayfish (34) | lake bottom, crayfish cage, night | (joke option) **Snapskräfta** (Snaps): sings, +crit |
| Pike (WATER, M → L) | Pike Fry → Pike (22) → **Pikezilla** (38) | reeds, then open, then deep | **Mollipike** (Molly): "Love Bite", drains HP and heals itself. Feed Lv 24+ |
| Mantis Shrimp (WATER, S) | Mantis Larva → Mantis Shrimp (26) | deep water ("escaped from the city aquarium") | **Mantis Shroom** (Shrooms): "Sporepunch", fastest hit + confuse. Feed Lv 26+ |
| **Trippopotamus** (WATER, XL, EPIC) | one stage | deep lake and the castle moat, **only while you are tripping** (shrooms, LSD, or a Ladd-ybug in the party) | – (it already is one). "Bad Trip": everyone is confused, itself too. Catch: deep trawl + tripping |

### Forest (west Lv 22–30, deep Lv 34–42)
| Line (type, size) | Stages | Where | Drug forms |
|---|---|---|---|
| Fox (FANG, M) | Fox Kit → Fox (20) → Silver Fox (36) | forest; golf course and city at night | **Xanaxfox** (Xanax): "Unbothered". Feed Lv 22+ |
| Boar (FANG, L) | Boarlet → Wild Boar (24) → Tusker (40) | west forest, mud | **Shroomboar** (Shrooms): "Truffle Rage", stronger the lower its HP · **Blowboar** (Coke): "Nose Charge", huge hit with recoil. Feed Lv 26+ |
| Moth (WING, S) | Caterpillar → Moth (18) → Death's-head Moth (34) | forest at night, light trap | **Methmoth** (Meth): "Lamp Frenzy". Feed Lv 20+ (rare in the wild at city lamps) |
| Moose (ROOT, XL) | Moose Calf → Moose (30) → Bull Moose (44) | deep forest | **Ketamoose** (Ketamine): "Moose in the Void", skips a turn, heals 50 % · **Shroomoose** (Shrooms): "Antler Bloom", spore cloud, foe confused 3 turns. Feed Lv 32+ |
| Bear (FANG, XL) | Bear Cub → Brown Bear (32) → Old Bear (46) | deep forest, mountain foot | **Psilocybear** (Shrooms): "Third Eye Maul", never misses, confuses. Feed Lv 34+ |

### Mountain: Lv 26–33
| Line (type, size) | Stages | Where | Drug forms |
|---|---|---|---|
| Adder (FANG, S) | Adderling → Adder (22) → Black Adder (36) | sunny rocks, mountain path, forest clearings | **Acidadder** (LSD): "Melt", DEF −2 + poison. Feed Lv 24+ |
| Mountain Hare (ROOT, S) | Leveret → Mountain Hare (18) | mountain scrub | – |
| Eagle (WING, L) | Eaglet → Eagle (28) → Golden Eagle (42) | mountain top; Eaglets in nests along the path | – |
| Wolverine (FANG, M) | Kit → Wolverine (34) | high mountain | – (stays mean without drugs) |

**Dex goal:** "New species" counts **lines** (the first form you catch from each line), not forms. There are 20 wild lines + Trippopotamus, so 20 species = real exploring. Evolving never gives points.

## 7. Traps: ladders you upgrade
Traps work like today: place one, wait real minutes, come back. New rules:
- **Habitat:** ground traps on grass or forest floor, water traps next to water, deep traps only at the pier end or from the boat, light traps only at night (real clock 20:00–06:00).
- **Size:** each tier holds creatures up to a size: S, M, L, XL. Adults in L / XL can **only** be caught with traps.
- **Bait** sets who comes, e.g.:
  - worms: fish
  - cheese: mice and rats
  - honey: badgers and bears
  - nuts: squirrels
  - salt lick: deer and moose
  - meat scraps: fox, adder, boar
  - jam: ladybugs and beetles
  - bread: crows
- **Drugged bait:** put a drug in a trap and a matching drug form may sit in it directly, e.g. coke in a pit trap → Blowboar. A second way to get drug forms, at a price.
- **Upgrade** at **Trapper Tore**, a new NPC at the forest edge who has to be met first (knowledge layer). An upgrade costs kr plus **materials**, and gives shorter waits, higher levels, bigger sizes and deeper water.

| Ladder | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|---|---|---|---|---|---|
| **Water** (from shore to deep) | Rod & worm: shore (perch, crayling, pike fry) | Fishing net: reeds (pike, perch) | **Crayfish cage**: lake bottom at night (crayfish line) | Deep longline: pier end / boat (Pike, Mantis Shrimp, Mollipike) | **Trawl** from the boat: deepest water (Pikezilla; Trippopotamus while tripping) |
| **Ground** (from mouse to moose) | Mouse trap: S (mice, beetles) | Live box: S / M (squirrel, fox kit, crowling) | Snare: M (fox, adder, boarlet) | Pit trap: L (boar, deer-sized) | **Moose pen** with salt lick: XL (moose, bear) |
| **Air / night** | Jam jar: ladybugs, beetles | Mist net: crows, eaglets | Light trap: moths at night (Methmoth rare) | – | – |

**Materials** come from **Finish off** in battle, which today only makes a grave. Now it also drops a material from the creature: fur, feather, scale, chitin, shell, antler. That gives killing a reason and a cost: catch it, or turn it into a trap upgrade?

## 8. Where the drugs come from
These are the existing items (coke, weed, shrooms) plus new ones: Xanax, Molly, Ketamine, LSD, Speed, Meth, DMT. Each is also usable on yourself (screen effects like today).

| Drug | Source |
|---|---|
| Weed | the dealer behind the bottle machines (exists today) |
| Shrooms | the dealer; the forest floor after rain; Jrohn the shaman |
| Coke | the dealer; a city alley at night |
| Xanax | Apotek, but only with a "prescription" from a quest (the doctor wants a Signal Crayfish) |
| Molly, Speed, Ketamine | the rave (the bouncer, the toilet queue) |
| LSD | Hallucinating Hasse, once he trusts you |
| DMT | only from Jrohn in the shaman cave |
| Meth | a camper van in the deep forest (dark joke, very rare) |

## 9. Data format (sketch)
```js
creatures: {
  badgerCub: { line: 'badger', stage: 1, name: 'Badger Cub', type: 'FANG', size: 'S', stats: [...], moves: [...],
               evolve: { lv: 16, to: 'badger' }, starter: true, art: 'assets/creatures/badgerCub.png' },
  badger:    { line: 'badger', stage: 2, evolve: { lv: 32, to: 'honeyBadger' }, feedLv: 24,
               feed: { xanax: 'xanadger', molly: 'ecstadger', keta: 'ketadger', lsd: 'ladger' }, … },
  xanadger:  { line: 'badger', stage: 3, trip: 'xanax', … },
  pikeFry:   { line: 'pike', stage: 1, habitat: ['reeds'], depth: 1, size: 'S', night: false, … },
  trippo:    { line: 'trippo', rarity: 'E', needs: 'reveal', habitat: ['deep'], size: 'XL', … }
},
trips: { xanax: { name: 'Benzo Calm', fx: [...], down: [...], badTrip: .08 }, … },
items: {
  xanax: { kind: 'drug', feed: true, … },
  netT2: { kind: 'trap', ladder: 'water', tier: 2, sizes: ['S', 'M'], habitat: 'reeds', bait: true, upgradesTo: 'crayCage', upgradeCost: { kr: 120, scale: 3 } }
}
```
Zones list creatures by **line**; the game picks the stage from the level, so a line can't appear as an adult below its evolve level.

## 10. More in-game improvements (smaller)
- **Tracks on the map:** footprints, feathers and dug-up earth hint at which line lives nearby. They're readable only after someone has taught you that animal ("Tore taught you boar tracks").
- **Day and night (real clock):** foxes, moths, crayfish and the rave crowd come out at night; ladybugs and squirrels come out during the day.
- **Nicknames** for your creatures, and a "raised from Lv 1" star that gives +5 % stats (rewards raising younglings instead of buying adults).
- **Trophy wall at your home:** Finish off a rare adult and the taxidermist can mount it (cosmetic). Wives react to it.
- **Wives react to your creatures:** a Ketadger in the party makes a wife angrier; a MolLynx calms her.
- **Dex page per line:** habitat, size, bait, which drugs work (as `???` until you learn it), and who told you.

## 11. Decisions for the owner
1. Rename the types to FANG / WING / ROOT / WATER / STONE / SHELL? (Recommended. The old FIZZ / GRUB / TECH names are grocery-store words.)
2. Feeding risk: a temporary "sketchy" status (recommended), or real deaths (graves)?
3. Should drug forms also exist in bosses' teams (e.g. BigWman's rave team: Trancequirrel, Speedbeetle, Methmoth)?
