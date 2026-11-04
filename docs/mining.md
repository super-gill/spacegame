# Mining (milestone 9a) and drones

Mining with depth, and the drone system it introduces. Status: design for Jason's review, 4 November 2026. Built in two parts on `main` after he agrees.

Related: [ship-systems.md](ship-systems.md) for slots and active modules; [weapons.md](weapons.md) for launchers, charges as goods and the capacitor; [system.md](system.md) for the Scree; [design.md](design.md), pillar 5, "Systems all the way down".

## Principles

1. **An ecosystem, not a button.** Finding, reading, breaking, cutting and collecting are separate jobs, each done by a fitted system, so ships and fits specialise.
2. **Depth scales with the prize.** Small, poor rocks can be lasered straight away; big, rich rocks need the full sequence. A starter can scrape; a proper rig digs.
3. **The hulk is a business.** A full hulk is worth more than any other honest way to spend that time, with more money up front and more risk.
4. **Fields live.** Rocks are finite and run out; new ones drift in over time.
5. **Drones are a platform.** Mining introduces them, but they are built to grow: collectors and miners now, fighters, heavy subcraft and carriers later.

## The loop

1. **Survey.** A survey scanner (utility, active tile) pulses. For a few seconds, rocks within its range that hold anything light up on screen and radar; a better scanner reaches further and hints at what (common, valuable, rare). Costs capacitor.
2. **Analyse.** A mining computer, fitted in the targeting computer mount instead of a combat computer, reads a locked rock: what ores it holds, how much, and how hard its structure is (`lockReadout` gains a `composition` readout). Fitting one means giving up combat readouts.
3. **Break** (big rocks). Mining charges are a good, bought like ammunition and held in a charge dispenser (utility). A charge is placed on the rock and set off by its tile; the rock fractures into smaller chunks and exposes ore pockets. The blast hurts anything close, its owner included.
4. **Cut.** A mining laser runs on a rock or an exposed pocket while held, drawing capacitor, and frees ore as canisters of loot. Lasers have a strength: a weak one only cuts soft, small rocks. Proper lasers fit the hulk's dedicated mining mounts; a light one fits a weapon mount, so any ship can dabble.
5. **Collect.** Canisters are scooped by the tractor, or by collector drones.

## Rocks

- Every rock in the Scree has contents (seeded, like its position): ores and amounts, a structure value and a hardness. Most hold common ore; some hold valuable minerals; a few hold gate-glass.
- Rocks are finite. Cutting takes ore out; breaking a rock replaces it with its chunks; a rock with nothing left crumbles away.
- **Respawn:** each field has a target count of rocks. Below it, new rocks drift in at the field's edge over minutes (seeded, so worlds stay reproducible), so a mined-out patch recovers and miners move round the belt.
- Rocks stay solid obstacles and cover, as now.

## Ores

- Three or four ores plus gate-glass (names and lore from the lore workstream): a common ore worth little, two middling ones, one valuable, and gate-glass rare and very valuable.
- Ores are goods with mass, sold at stations; Lantern Works, a foundry, pays best for most. Refining and manufacturing come later (milestone 9).

## Ships

- **Prospector** (cutter class): survey scanner, mining computer, a light laser, a small hold. Finds rocks and picks the easy ones; scouts for a hulk.
- **Hulk** (industry class, as the slot budget sets: 1 weapon, 3 utility, 4 internal, 4 bays, 2 mining mounts): slow and tough, two heavy lasers, an **ore hold** (bays that take only ore but hold far more of it), and a drone bay.
- **Money:** a Manifest trading the best routes today clears roughly 4,000 to 7,500 credits a leg, about a minute each (stock never runs out until the economy milestone). A hulk filling its ore hold in about eight to ten minutes and selling at Lantern Works should clear well above what a Manifest makes in the same time, with gate-glass finds on top. Numbers to tune in play.

## Drones

Built as a general system so later kinds slot in without rework.

- **A drone is a ship.** It is an ordinary ship in the world with a small hull of class `drone`, flown by a drone brain through the same inputs as everything else, so it collides, takes damage, can be locked, shot and destroyed, and is seen on radar like any ship. Heavier subcraft (fighters, light mining craft) are the same thing with bigger hulls.
- **The mother ship** carries drones in a **drone bay** module: how many it holds (capacity), how many can be out at once (control), and how fast it launches and recovers them. Drones in the bay are kept as items with their own condition, so a damaged drone comes back damaged.
- **Drone kinds are data:** a hull, a fit and a brain role. Mining brings `collector` (scoops canisters to the mother ship) and `miner` (cuts ore and brings it back). Later: `fighter` (attacks the mother ship's lock), `guard`, heavy mining craft that strip a field and use the mother as a base, and carriers whose main weapon is their wing.
- **Control:** drones get orders through tiles (launch, recall, and a task such as collect, mine or attack). They stay within a leash range of the mother ship and return when recalled, when their hold is full or when badly hurt.
- **Costs:** drones are bought, take bay space and power to control, and are lost if destroyed.

## Build order

**Part 1: finding and cutting.** Rock contents and depletion, respawn, the survey scanner, the mining computer readout, mining lasers (light and heavy), ore canisters, ores as goods with prices, the prospector.

**Part 2: breaking, hulks and drones.** Mining charges and fracturing, the hulk with its ore hold and mining mounts, the drone system (bays, collector and miner drones), gate-glass, NPC miners for pirates to prey on, and the money tuned in play.

**Client (interface workstream).** Survey highlights, the composition readout, laser beams, drone tiles and status.

**Lore (lore workstream).** Ore names and what each is for; gate-glass; who builds the prospector, the hulk, the lasers, scanners and drones; mining charges.

## Questions for Jason

1. Full sequence only for big, rich rocks (lean), or for every rock?
2. Charges placed and set off by their tile (lean), or fired from a launcher?
3. Drones in part 2 (lean), or part 1?
