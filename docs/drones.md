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
- **Rook and Rivet Mining Drone** (names provisional, a lore ask): structure 60, top speed 220, a weak laser (Nibbler: strength 0.5, 0.6 ore a second, reach 90), its own small capacitor. No sensors of its own.
- **Drone bays** (internal modules, kind `droneBay`): `droneCapacity` drones held in all (stowed and out), `droneControl` out at once, `droneRange` how far from the mother they work. Rook and Rivet Drone Cradle S (1, 1, 1,200 units, no power) on the prospector; Drone Bay M (6, 4, 2,000 units) on the hulk, in place of its armour. The stock prospector comes with one drone, the hulk with four.
- **Stowed drones** are `Ship.droneBay` items keeping their structure, so a damaged drone comes back damaged.
- **Buying:** the good `mining-drone` (1,500 at Harbour, 1,400 at Ridge) goes straight into the drone bay, not the hold; selling takes the most worn first.
- **Commands** (`ShipInput.droneCommand`, `drones.ts`): `launch` (all the bay can control, or one), `recall` (all or one), `send` (the next drone working on its own, or a named one, to the active lock's rock; with none out it launches one).
- **Choosing rocks:** a drone keeps to a rock it was sent to while it stays locked. Otherwise it takes a locked rock no turret and no other drone is on, in lock order, else the least crowded; it stays on a rock unless another is emptier. Drones decide one after another each tick, so they share rocks out without swapping back and forth.
- **Flying:** a drone parks on the rock's near side (so its ore drifts towards the mother's tractor), on the seam when the seam is on that side, spread along the face when drones share a rock; it faces the rock only once nearly there (forward thrust only), and slides round anything close rather than stalling against it. With no locked rock it waits beside the mother.
- **Home and lost:** recalled, or beyond the bay's range, a drone flies home and is stowed when it reaches the hull. One destroyed is lost (`droneLost`, `destroyed`); drones out when the mother docks or is destroyed are lost (`leftBehind`).
- **Events:** `dronesLaunched`, `droneStowed`, `droneLost`, `droneRefused`.
- **Client stopgaps (lead):** the drone manager (N): a row per drone with its state (IN BAY, TO ROCK, CUTTING, WAITING, RETURNING) and condition, and LAUNCH ALL, RECALL ALL and SEND, plus per-drone launch, send and recall. Drones are labelled DRONE D1 and so on.

## Later

- Fighters and guards (combat drones attacking the mother's lock), heavy mining craft, carriers.
- A collector drone that ferries ore from far rocks.
- NPC miners with drones, for pirates to prey on.
