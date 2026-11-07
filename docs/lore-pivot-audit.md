# Lore pivot audit

Written by the lore chat on 6 November 2026, after the Sol pivot (`lore.md`, "Decisions"). **Worked by Lead 8 on 7 November 2026:** every "change now" item, the whole code pass and the one-line "when next touched" items are done (ticked); left: `turrets.md`, `fitting.md`, `mining.md` and `drones.md` when next touched, and the design canvas. Every place outside `lore.md` and `races.md` that still speaks the retired setting, and what to do about it. The lead ticks items off as they land and deletes this file when it is empty. Ids never change; everything here is words.

## Rules

- **History stays as written.** `changelog.md`, everything under `audits/`, and the dated entries in `coordination.md`'s Log and Decisions describe what was true when they were written. Do not rewrite them.
- **Living design docs change when next touched,** except the handful marked *now*, which mislead anyone reading today.
- **Code strings change in one pass** with the class and module renames, since they ship to players.

## The word list

| Retired | Now | Where it bites |
| --- | --- | --- |
| race (as a game concept) | power, or origin for a pilot | `design.md`, `ships.md`, `architecture.md`, `HullSpec.race`, `HullBonus.source: 'race'`, `Manufacturer.race` |
| Halcyon, Vael, Oru, Drifter, Free Belt Union | Mars, Venus (retired), (retired), the Belt | `ships.md` bonus list, `weapons.md` families, design canvas |
| Concord, Landfall Accord | the Ceres Accord | Any doc that names the treaty |
| After Landfall (AL) | years since the gate woke (GW) | Dates in lore only; none found in design docs |
| cutter, sloop, brig, frigate, ship of the line, capital, merchantman, hulk | corvette, patrol boat, frigate, destroyer, cruiser and battleship, carrier and dreadnought, freighter, barge | `HullSpec.class` values, `weapons.md` "Hull classes", `fitting.md`, `turrets.md`, `mining.md`, `drones.md`, `controls.md` |
| swivel (the in-world word) | PDC | `weapons.md`, `turrets.md`, `ship-systems.md`, `fitting.md`, `architecture.md`, `outfitting-panel.ts` |
| colours, the Registry beacon, a station's light | transponder, a station's beacon | `interface.md`, `controls.md`, `roadmap.md`, `flight-hud.ts`, `ui.ts`, `bindings.ts`; the module `colours.ts` and `toggleColours` are code names and can stay |
| the Plot | the board | `interface.md`, `controls.md`, `roadmap.md`, `bindings.ts`, `main.ts`, the `plot.ts` files (code names can stay) |
| Helm, Helmsman, Coxswain | Course, Vector, Trajectory | `ship-systems.md`, `modules.ts` |
| Davit, Gunlayer, Sally | Pod Rack, Fire Control, Surge | `ship-systems.md`, `modules.ts`, `fitting.md` |
| Verse, Litany, Compline | Volley, Enfilade, Cordon | `weapons.md`, `modules.ts`, `weapons.ts` |
| Commonwealth Fleet Works | Ishtar Fleet Works | `manufacturers.ts` (id `commonwealth` stays), `weapons.md` |
| Covenant Standard | Luna Standard | lore only |
| Meridian Arm, Pale Reach | known space, beyond the Shoals | `roadmap.md` line 99 |

## Docs, by file

### Change now

- [x] **`weapons.md`**: line 35, gun names (Volley, Enfilade; Ishtar Retort and Answer); line 36, families by power (Earth missile, Mars energy, Venus hybrid, Belt projectile); line 76, "in the world, swivels" becomes "in the world, PDCs"; line 86, the class ladder becomes the two ladders in `lore.md`, "Hull classes". The "As built" notes that say swivel are history and can stay.
- [x] **`ships.md`**: line 5, "races and manufacturers" becomes "powers and companies"; line 10, "race by style" becomes "power by style"; lines 13, 21, 27 and 100, race becomes power; line 87, the race bonus list becomes Earth missiles and shields, Mars energy weapons, Venus hybrids and drones, the Belt projectile weapons and speed.
- [x] **`ship-systems.md`**: lines 30, 40 and 64, swivel becomes PDC; line 61, the module names become Meridian Course S, Paragon Vector S, Ito-Marr Trajectory M, Meridian Pod Rack S, Paragon Fire Control S and M.
- [x] **`interface.md`**: lines 58 to 76, the Colours section: transponder for colours, beacon for a station's light, the board for the Plot, and the chip reads SQUAWK or DARK. The code names (`colours.ts`, `toggleColours`, `coloursChanged`) can stay.
- [x] **`controls.md`**: lines 35, 38 and 57, the Plot becomes the board; line 125, "Show colours / run dark" becomes "Squawk / run dark" and the description says transponder; line 30, hulk becomes barge.
- [x] **`README.md`**: line 71, "Races and manufacturers" becomes "Powers and companies".
- [x] **`roadmap.md`**: line 99, the placeholder note: Calder's names are final and the Meridian Arm is gone; what is still placeholder is listed in `lore.md`, "Open questions".

### Change when next touched

- [x] **`design.md`**: line 158, "their role and their race" becomes "their role and their power".
- [x] **`architecture.md`**: line 36, "name and race" becomes "name and power"; line 60, "plus the swivel" becomes "plus the PDC".
- [ ] **`turrets.md`** and **`fitting.md`**: swivel becomes PDC and the class words change wherever they describe the living model rather than the build history; the "As built" steps stay.
- [ ] **`mining.md`** and **`drones.md`**: "the hulk" as a ship becomes "the Collier" or "the barge"; the class word hulk becomes barge.
- [x] **`roadmap.md`**: lines 16 and 38, the Plot and colours become the board and the transponder when the rows are next rewritten.
- [x] **`shared-world.md`**: line 66 reads fine; "running dark" survives the pivot.

### Leave alone

`changelog.md`; everything in `audits/`; the Log and Decisions in `coordination.md`; `system.md` (nothing to change).

## Code, by file (the lead's pass)

Done in one pass (Lead 8, 7 November 2026). Choices made along the way: `race` became `power` (`PowerId`: `earth`, `mars`, `venus`, `belt`, `aurel`), since it sets each maker's colour on screen; class values are camelCase like the rest of the code (`patrolBoat`), and the Prospector and Sinker take the civilian classes the lore gives them (`prospector`, `miner`) rather than a military rung; `HULL_CLASS_NAMES` gives every class its name on screen. The reference fits named for a class are renamed for their hull, as the Warrant's are: Brig brawler is now Injunction brawler, Frigate anti-small is Walkout anti-small. The ores take `materials.md`'s names (Copper, Zinc, Platinum), which supersede the Names table's Copperband, Blackjack and Glintstone. Mars's and Venus's colours are `races.md`'s proposals, unconfirmed.

- [x] **`hulls.ts`**: `class` values: `cutter` to `corvette`, `sloop` to `patrol-boat`, `brig` to `frigate`, `frigate` to `destroyer`, `merchantman` to `freighter`, `hulk` to `barge`; `pod`, `drone` and `aurel` stay. Check whether class is saved anywhere before renaming `frigate`, since its meaning moves one rung. `race` can become `power` or stay as a field name; cosmetic.
- [x] **`manufacturers.ts`**: `commonwealth` name becomes "Ishtar Fleet Works"; `race` values `kessari` and `freeBelt` can become `earth` and `belt` if the field is renamed, otherwise leave.
- [x] **`modules.ts`** and **`weapons.ts`**: the renames under "Names" in `lore.md`: Course, Vector, Trajectory, Pod Rack, Fire Control, Surge, Volley, Enfilade, Cordon, Ishtar Retort and Answer. Everything else keeps its name.
- [x] **`outfitting-panel.ts`**: `ciws: 'Swivel'` becomes `'PDC'`; the `Swivel dps` row becomes `PDC dps`.
- [x] **`bindings.ts`**: `togglePlot` label "The Plot" becomes "The board"; `toggleColours` label becomes "Squawk / run dark".
- [x] **`main.ts`**: the window title "Plot" becomes "Board".
- [x] **`flight-hud.ts`** and **`ui.ts`**: the chip reads SQUAWK or DARK; the toast says "Squawking." and "Running dark: others see a radar contact until they lock you."; the tooltip says transponder.
- [x] **`plot-rows.test.ts`**: the test's name and wording follow.

## Outside the repo

- [x] The claude.ai doc "Spacegame: Lore of the Known Universe" carries a superseded banner (lore chat, 6 November).
- [x] The claude.ai doc "Spacegame: Races and Manufacturers" carries a superseded banner (lore chat, 6 November).
- [ ] The design canvas "Spacegame ship concepts": the Halcyon, Vael, Oru and Drifter boards are retired; Mars and Venus boards are needed, in the colours proposed in `races.md`; Earth keeps Kessari's look and the Belt keeps the Free Belt's. For whoever next does concept art, after the ships conversation.
- [x] The project handover doc lists `docs/races.md` and the old Races doc as references; the next lead handover should point at `lore.md` and this audit.
