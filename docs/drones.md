# Drones

Drones as a general system, mining drones first. Status: agreed with Jason, 5 November 2026; first build on `main`. Later kinds (fighters, guards, heavy mining craft working from a mother ship, carriers) use the same machinery.

Related: [mining.md](mining.md) for rocks, locks and the hulk; [ship-systems.md](ship-systems.md) for slots and tiles.

## Decisions (Jason, 5 November 2026)

1. **The mother commands; drones fly themselves.** The pilot does not fly a drone.
2. **Drones work only rocks you have locked,** so they never wander off mining everything in sight. The hulk has plenty of locks for this.
3. **Drones have no hold.** They cut ore free at the rock; the mother's tractor brings it in and its hopper filters it.
4. **The parent ship goes to the rocks.** Drones do not drag rocks or ferry ore; a collector drone could do the latter later if it is wanted.
5. **A prospector carries one drone; the hulk several.**
6. **Drones have their own interface,** the drone manager, which will later manage fighters too.

## As built (5 November 2026)

- **A drone is a ship** (hull class `drone`): it flies, can be locked and shot, and shows on radar. It carries `motherId` and `droneId`, and an NPC brain of kind `drone` (`ai/drone.ts`). A mother's drones pass through it and through each other without harm; anything else they hit is a collision as usual.
- **Belt Forge Knocker** (names from the lore): structure 60, top speed 220, a weak laser (Nibbler: strength 0.5, 0.6 ore a second, reach 90), its own small capacitor. No sensors of its own.
- **Drone bays** (internal modules, kind `droneBay`): `droneCapacity` drones held in all (stowed and out), `droneControl` out at once, `droneRange` how far from the mother they work. Rook and Rivet Drone Cradle S (1, 1, 1,200 units, no power) on the prospector; Drone Bay M (6, 4, 2,000 units) on the hulk, in place of its armour. The stock prospector comes with one drone, the hulk with four.
- **Stowed drones** are `Ship.droneBay` items keeping their structure, so a damaged drone comes back damaged.
- **Buying:** the good `mining-drone` (1,500 at Harbour, 1,400 at Ridge) goes straight into the drone bay, not the hold; selling takes the most worn first.
- **Commands** (`ShipInput.droneCommand`, `drones.ts`): `launch` (all the bay can control, or one), `recall` (all or one), `send` (the next drone working on its own, or a named one, to the active lock's rock; with none out it launches one).
- **Choosing rocks:** a drone keeps to a rock it was sent to while it stays locked. Otherwise it takes a locked rock no turret and no other drone is on, in lock order, else the least crowded; it stays on a rock unless another is emptier. Drones decide one after another each tick, so they share rocks out without swapping back and forth.
- **Pathfinding** (`ai/path.ts`, after Jason saw a drone wedged between rocks and drones wrecking themselves on them): a drone plans its way with A* on a grid round the rocks (and the mother's hull), pulled tight into a few straight legs and replanned every second. Among rocks it slows down in proportion to the room it has, since it burns only forwards and needs room to turn and stop. Its cutting spot is stepped round the rock's face until it is clear of other rocks and the mother. Drones only take rocks their laser can cut.
- **Flying:** a drone parks on the rock's near side (so its ore drifts towards the mother's tractor), on the seam when the seam is on that side, spread along the face when drones share a rock; it faces the rock only once nearly there (forward thrust only), and slides round anything close rather than stalling against it. With no locked rock it waits beside the mother.
- **Sharing a rock and cutting at an angle** (after Jason's playtests: drones idle on a drifting chunk, and ten drones from a hulk full of bays piled up on one rock): spots fill a ring round the face, a drone's width apart either side of the seam, then a second ring further out while the face stays in laser range (`slotPlace`); they used to repeat from the seventh drone. A drone cuts from wherever the face is within 90% of its laser's range once it is near its spot and nose on, rather than only from the exact spot, since a forward-only drone that stops short cannot back off. When every place round the face is tight it takes the one with the most room, out to the edge of laser range. Launched drones come out clear of rocks (20 units from any surface), trying further out and then round the hull, since a mother parked beside a rock used to launch them into it.
- **Storage:** drones live in the drone bays (`Ship.droneBay`), never in cargo; the bays' capacity is the limit, and buying past it says the drone bays are full (it used to say there was not enough cargo space).
- **Home and lost:** recalled, or beyond the bay's range, a drone flies home and is stowed when it reaches the hull. One destroyed is lost (`droneLost`, `destroyed`); drones out when the mother docks or is destroyed are lost (`leftBehind`).
- **Events:** `dronesLaunched`, `droneStowed`, `droneLost`, `droneRefused`.
- **Client stopgaps (lead):** the drone manager (N): a row per drone with its state (IN BAY, TO ROCK, CUTTING, WAITING, RETURNING) and condition, and LAUNCH ALL, RECALL ALL and SEND, plus per-drone launch, send and recall. Drones are labelled DRONE D1 and so on. When drones out are waiting for a reason the pilot can change, a line says so (nothing locked, every locked rock too hard for their lasers, or the soft ones beyond the bays' range: `droneIdleReason`), and a locked rock's card says whether the drones can cut it (`droneStrength`).

## Later

- Fighters and guards (combat drones attacking the mother's lock), heavy mining craft, carriers.
- Heavier mining drones (Jason, 5 November 2026): a stronger laser for harder rocks, taking more than one place in the drone bay. The limit on today's drones (hardness 0.5, rocks up to about radius 50) stays: big rocks are turret work.
- A collector drone that ferries ore from far rocks.
- NPC miners with drones, for pirates to prey on.
