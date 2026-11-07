# Interface pass (6d, from 6 November 2026)

The next round of the ship interface, agreed with Jason on 6 November 2026. Everything shown about a ship or the system still comes through the readouts (`lockReadout`, `navReadout`, `gunBearing`): the window rule. Each part is sketched for Jason before it is built, since how it looks is his call, and some parts he wants to see in game before deciding.

Related: [controls.md](controls.md) for what is on screen today; [turrets.md](turrets.md) for arcs and bearing; [weapons.md](weapons.md) for munitions and shield arcs.

## Order

1. **Turret arcs and aim** on the ship.
2. **Audible warnings** with a message for each.
3. **The Plot** (contacts list) and the nav target, then the selection window.
4. **The aim reticle.**

## 1. Turret arcs and aim

Draw where each main gun can bear and where it is pointing, on the HUD round your ship and in the fitting window. Comes from `MountPoint.arc`, `WeaponState` and `gunBearing`.

**Built** (Jason chose option B and the fitting view from the sketches on the mockup canvas, 6 November 2026; he judges it in play): a coverage ring round your own ship while weapons are hot (`render/gun-arcs.ts`), thicker where more main guns bear and missing where none can, with a tick per gun at its aim coloured by `gunBearing`; in outfitting and the fitter, every fitted main gun's arc faint under the selected mount's amber one. The sketches' rejected options: A (a wedge per gun, busy) and C (aim lines only, no blind spots shown).

## 2. Audible warnings

There is no audio in the client yet (controls.md promised "warnings in tiers, with sounds" since 6c; never built). Decisions (Jason, 6 November 2026):

- **Tones, not a voice, for now:** made in the browser (Web Audio), no sound files. A voice may come later.
- **Every sound comes with a message** in the warning banner at the top centre saying what it is, for example `WARNING · MISSILE INBOUND`. Several at once stack, highest tier on top.
- **Tiers,** each with its own sound: advisory (one soft chime), caution (two tones), warning (repeating while it holds), alarm (continuous until it clears or is silenced). Volume and mute in the Controls panel (F1).
- **Shield and hull:** two layers, as the game has them. Armour stays part of the hull (plates add hull points and resistances), not a pool of its own.
- **Proximity** by time to impact at your present velocity, not distance, so flying slowly beside a station or docking stays quiet.
- **Performance limits** only when the ship cannot do what you asked, never for reaching top speed or full turn rate (that would sound all the time and teach you to ignore it).

Draft events (to settle while building; thresholds are working numbers):

| Tier | Events |
| --- | --- |
| Alarm | missile or torpedo about to hit; hull critical; collision imminent |
| Warning | missile or torpedo launched at you; someone locking you (needs a sim event sent to the target); shields down; hull under 50%; collision close |
| Caution | pirate hunting you; shields under 25%; collision ahead within a few seconds; capacitor empty (afterburner and shields stop); afterburner cut out; too heavy to manoeuvre well; a gun out of ammunition; hold or ore hopper full; a drone lost; gravity tiers when gravity is on |
| Advisory | your lock complete; docking refused; drones launched or home; survey done; target destroyed |

**Built** (6 November 2026; Jason reviews in play). The banner shows what holds now; things that just happened keep their toasts and only add a sound, so the banner never fills with stale news. `hud/warnings.ts` (the rules, from the client's own view), `hud/warning-sounds.ts` (when to sound), `hud/tones.ts` (the tones). Volume, sounds off and a button to hear each tier in the Controls panel (F1). A condition sounds when it starts or rises a tier; warnings repeat every 3 seconds; alarms every second until they clear or you click the banner to silence them. At most three lines show, then a count.

| Tier | Banner (while it holds) | Sound only (the toast says it) |
| --- | --- | --- |
| Alarm | `MISSILE IMPACT` or `TORPEDO IMPACT` (under 2 s); `HULL CRITICAL` (under 25%); `COLLISION · ROCK` or `STATION` (under 1.5 s); gravity `CANNOT ESCAPE` | |
| Warning | `MISSILE INBOUND ×n · distance`; `SHIELDS DOWN`; `HULL LOW` (under 50%); `BEING LOCKED` or `TARGET LOCK ON YOU ×n`; collision under 3 s; gravity `CLIMB NOW` | |
| Caution | `PIRATE HUNTING YOU`; `SHIELDS LOW` (under 25%); collision under 6 s; `CAPACITOR EMPTY`; `HOLD FULL` while the tractor is on; gravity pulling hard | a drone lost; a gun out of ammunition |
| Advisory | gravity well | your lock complete; target destroyed; drones launched or home; survey done; docking refused |

Choices for Jason to judge: collision warnings are for rocks and stations only (against ships a straight-line forecast fires on every attack run, seen in the arena); slow bumps (under the harmless impact speed) never warn, so docking is quiet; "too heavy to manoeuvre" is not built, since it needs a definition (how much slower than empty counts); an afterburner that cuts out is covered by `CAPACITOR EMPTY`. The missile line drawn on the canvas and the "hold full" toast are gone: the banner says both.

## 3. The Plot, the nav target and the selection window

**The Plot** (named by the lore, `lore.md`, "The Plot") is a sortable, filterable list of what is around you, the job EVE's overview does. Decisions (Jason, 6 November 2026):

- **Columns:** distance, what it is (hull class, station, rock, cache), name, closing speed, lock state.
- **Filters:** presets first: General, Combat (ships only, hostiles first), Mining (rocks, caches, your drones), and likely Trading, Nav and anti-drone. Filters and columns are data from the start, so the next step can make them editable and save named layouts in settings for reuse.
- **Acting from it:** right-click a row to lock (as on screen: left acts, right chooses); click to select it and make it the nav target.
- **The transponder decides what an unlocked contact shows** (Jason, 6 November 2026; words from `lore.md`, "The transponder", after the Sol pivot: pilots say **squawking** for transponder on and **running dark** for off; a station's is its **beacon**; the chip reads **SQUAWK** or **DARK**): a squawking ship shows its name and hull at once; one running dark, or with no transponder to show (the Aurel), is a radar contact (size and distance) until locked and identified by your targeting computer. Stations always show their beacon and are always named; rocks and caches are radar returns by kind. The transponder is an innate part of every ship, not a module (Jason, same day): a switch, on by default. Lead's notes: NPC traders and the Watch broadcast, pirates run dark; whether running dark is legal, suspicious or a crime belongs to law (7). Today the server sends every pilot's name and ship in sensor range: `visibleWorld` will have to hold identity back for ships running dark.

**Mockup approved** (Jason, 6 November 2026): https://claude.ai/artifact/DDLGgW4jx2ADxTcR88hdkX (a working board, then called the Plot, to click through). As drawn:

- A HUD window on the left, between the launcher strip and the radar, opened with P (added to the launcher); the right edge stays for locks and the target card. Movable like every HUD window.
- Columns DIST (units), TYPE, NAME, CLOSE (units a second, positive coming towards you), LOCK (ACTIVE, LOCKED, LOCKING, or DARK for an unidentified contact).
- An unidentified dark contact reads `RADAR · SMALL` (or MEDIUM, LARGE) and `Unknown contact` in amber; locked, it shows its hull and who flies it. NPCs are named by role (PIRATE, CALDER WATCH, TRADER), players by name. Colours: hostile red, the Watch white, others neutral blue, stations bright, your own kit ink.
- Tabs GENERAL (ships, stations, caches), COMBAT (ships, hostiles first, then unknowns), MINING (rocks, caches, your drones). Column heads sort. The selected row is the nav target, named with its arrival time in the footer.
- The transponder chip sits on the status lines beside credits and hold: SQUAWK, or DARK in amber while running dark (it read COLOURS before the Sol pivot).

**The nav target:** a marker at the edge of the screen with distance and arrival time.

**Built** (6 November 2026, Lead 7; Jason reviews in play):

- **The transponder** (`sim/src/colours.ts`; the code keeps the old name): `Ship.dark` (absent: squawking), input `toggleColours` (K, or click the chip), event `coloursChanged`. Pirates and arena enemies spawn dark; save version 16 puts those already in a save dark. A drone squawks when its mother does. Whether running dark is a crime waits for law (7).
- **The view** (`view.ts`): a dark ship you have not identified arrives as a contact (`Ship.contact`: small, medium or large) with only its motion; see shared-world.md, "As built". Jason chose a plain contact on screen too (6 November): a dashed amber ring the size of its class with a heading tick, labelled `CONTACT · SMALL` when labels are on; the hull appears once your lock completes. Sizes follow the game's own "medium hulls and up" (classes as renamed in the Sol pivot): corvettes, patrol boats, prospectors, miners, drones and pods small; frigates, freighters and barges medium; destroyers and bigger large.
- **The board** (`hud/plot.ts`; the code keeps the name plot; rows in `hud/plot-rows.ts` with tests): as the mockup, a window (P) on the left under the launcher. Tabs and columns are data (`PLOT_PRESETS`, `PLOT_COLUMNS`) ready for saved layouts; the tab and sort are remembered. Rows are updated in place four times a second so a row does not jump from under the pointer. Rocks are those within radar range, nearest 40. A cache is one row however many canisters it has. Right-click acts as on screen: lock, or make a held lock active. Clicking the nav target's row again clears it.
- **The nav target:** chosen on the board, kept by the client (the sim has no nav target). On screen, a chevron over it with name, distance and arrival time; off screen, a chevron at the edge pointing its way with the same words. It is dropped when it leaves your view.
- **The transponder chip:** SQUAWK, or DARK in amber, after credits and cargo on the status lines; click to switch.
- **Fixed the fidgety rows** (Lead 7, same evening, for Jason to confirm): the Mining tab lists your drones first, as their own group (`PlotPreset.groupFirst`), and rows within `PLOT_DISTANCE_BAND` (50 units) keep the order they were last shown in. The report it fixes:
- **Pinned bug** (Jason, 6 November; not game breaking, look later): sitting still in the belt with a Collier's four drone bays out, "the rocks were fidgety", probably rows in the Plot swapping places (he is not sure). Likely cause: the Mining tab sorts drones and rocks together by distance, so flying drones shuffle the list four times a second; rocks being cut also change size and vanish. Proposed fix: drones in their own group at the top of the Mining tab, and a dead band so rows within about 50 units keep their order. Not orbits: he had orbits and gravity off (rocks drawn between updates was fixed anyway, `2cd722e`).
- Known gaps for Jason to judge: the caution `PIRATE HUNTING YOU` read the pirate's brain, which is no longer sent for a dark pirate, so it now comes only once you have locked it (`BEING LOCKED` still warns); shots from an unidentified ship are drawn neutral, not red.

**Selection window mockup** (6 November 2026, Lead 7): on the Plot canvas, https://claude.ai/artifact/DDLGgW4jx2ADxTcR88hdkX, "Selection window: first look": one working artboard with four examples (a station, an unknown contact, a locked pirate, a rock), each with what your sensors and computer give and its actions. Questions for Jason on the canvas: where it sits (suggested: on the right under the lock cards, replacing the target card, which it would show when nothing else is selected); whether selecting and the nav target are one thing; how to select in space with mouse steering (left fires, right locks: middle click or Alt+click?); anything missing.

**Selection window: decided and built** (Jason, 6 November 2026, after the mockup; Lead 7 built it the same evening):

- **It replaces the target card**, on the right under the lock cards, and shows what you selected, or your active lock when nothing is selected. The lock cards stay as they are.
- **Selecting is always the same as setting the nav target.**
- **Right click selects in space** (Jason: "it aligns with lock"): right-click a ship or rock locks it (or makes a held lock active) and selects it; right-click a station or a cache selects it. Left click always fires, never selects. In the Plot, a click selects (again to clear) and a right-click locks and selects. Clicking a lock card, Tab and a click on the radar select too.
- **What it shows:** for a lock, what your targeting computer reads, as the target card did; for something not locked, only the radar's part (range, closing speed, arrival time) and, for a ship showing its colours, its hull and who flies it; a dark ship is a contact of a size. A station adds its services and free pads. Sizes read small, medium or large, the same words as contacts, so identifying a ship no longer changes its size.
- **Actions:** LOCK, MAKE ACTIVE, DOCK (stations), SEND DRONE (a locked rock, with a drone bay), CLEAR (the selection and nav target); UNLOCK stays in the header.
- Not movable yet: it sits in the right column like the target card did. Jason assumed windows can be moved; making it a movable window is a small follow-up if he wants it.
- Code: `hud/target-card.ts` (`TargetCard.update(world, ship, selected)`, `SelectionActions`), `select` and `selectionFor` in `main.ts`.

**Lock cards and the selection window** (the brief before the mockup): lock cards stay small and glanceable (who, condition, whether your guns bear). A selection window shows whatever you have clicked in the Plot or on screen, locked or not: everything your sensors and computer give you, and actions (lock, set nav target, dock at a station). A fuller "show info" page later.

## 4. The aim reticle

Today mouse steering shows the browser's plain crosshair cursor (`#game.mouse-steering` in style.css). Jason: subtle, on theme, not dominating the pointer. Lead's direction: a small open ring in the HUD's line colour at low opacity, with a short tick for where the nose is turning. Three or four options sketched for Jason to pick.

**Built to choose from in game** (6 November 2026, Lead 7, while Jason was away; he picks by flying with them): instead of a static sketch, the styles are switchable in the Controls panel (F1), "Aim reticle (mouse steering)", remembered in the browser (`Settings.reticle`, `render/reticle.ts`). **Ring** (the default for now: a small open ring), **Brackets** (four small corners) and **Dot** (a dot in a faint broken ring), each in the HUD ink at low opacity; Ring and Brackets carry a short tick showing where the nose points now, so you see how far it still has to turn. With the heading locked (V) the reticle goes amber and dashed. **Plain** is the browser's crosshair as before. The reticle is drawn only over open space; over the Plot and other windows the normal pointer shows (Jason likes that). **Decided** (Jason, 6 November 2026, after flying with them): keep all four as a player preference, Ring the default.
