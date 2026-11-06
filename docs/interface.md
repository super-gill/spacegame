# Interface pass (6d, from 6 November 2026)

The next round of the ship interface, agreed with Jason on 6 November 2026. Everything shown about a ship or the system still comes through the readouts (`lockReadout`, `navReadout`, `gunBearing`): the window rule. Each part is sketched for Jason before it is built, since how it looks is his call, and some parts he wants to see in game before deciding.

Related: [controls.md](controls.md) for what is on screen today; [turrets.md](turrets.md) for arcs and bearing; [weapons.md](weapons.md) for munitions and shield arcs.

## Order

1. **Turret arcs and aim** on the ship.
2. **Audible warnings** with a message for each.
3. **The Plot** (contacts list) and the nav target, then the selection window.
4. **The aim reticle.**

## 1. Turret arcs and aim

Draw where each main gun can bear and where it is pointing, on the HUD round your ship and in the fitting window. Comes from `MountPoint.arc`, `WeaponState` and `gunBearing`. Sketches first.

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

## 3. The Plot, the nav target and the selection window

**The Plot** (working name, after a navy ops room's picture of contacts; lore ask open) is a sortable, filterable list of what is around you, the job EVE's overview does. Decisions (Jason, 6 November 2026):

- **Columns:** distance, what it is (hull class, station, rock, cache), name, closing speed, lock state.
- **Filters:** presets first: General, Combat (ships only, hostiles first), Mining (rocks, caches, your drones), and likely Trading, Nav and anti-drone. Filters and columns are data from the start, so the next step can make them editable and save named layouts in settings for reuse.
- **Acting from it:** right-click a row to lock (as on screen: left acts, right chooses); click to select it and make it the nav target.
- **Transponders decide what an unlocked contact shows** (Jason, 6 November 2026): a ship broadcasting its transponder shows its name and hull at once; one running dark, or without one, is a radar contact (size and distance) until locked and identified by your targeting computer. Stations broadcast beacons and are always named; rocks and caches are radar returns by kind. The transponder is an innate part of every ship, not a module (Jason, same day): a switch, on by default. Lead's notes: NPC traders and the Watch broadcast, pirates run dark; whether running dark is legal, suspicious or a crime belongs to law (7). Today the server sends every pilot's name and ship in sensor range: `visibleWorld` will have to hold identity back for ships running dark.

**The nav target:** a marker at the edge of the screen with distance and arrival time.

**Lock cards and the selection window** (Jason: wants to see it in game before deciding): lock cards stay small and glanceable (who, condition, whether your guns bear). A selection window shows whatever you have clicked in the Plot or on screen, locked or not: everything your sensors and computer give you, and actions (lock, set nav target, dock at a station). A fuller "show info" page later.

## 4. The aim reticle

Today mouse steering shows the browser's plain crosshair cursor (`#game.mouse-steering` in style.css). Jason: subtle, on theme, not dominating the pointer. Lead's direction: a small open ring in the HUD's line colour at low opacity, with a short tick for where the nose is turning. Three or four options sketched for Jason to pick.
