# Mining (milestone 9a) and drones

Mining with depth, and the drone system it introduces. Status: agreed design, 4 November 2026, with Jason. Built in two parts on `main`; "As built" at the end records the choices the build made.

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

## The hulk and part 2 (Jason, 5 November 2026; being designed)

- **Ordinary hulk mining:** the hulk mounts heavy swivel mining lasers and works several rocks at once. A bigger mining computer holds several rock locks; a laser is assigned a rock (make it the active lock, press the laser's tile) and keeps cutting it while the pilot locks the next. Bigger, more sophisticated modules and ore holds in its bays. Lasers still take each rock's mix.
- **Breach charges are their own kind of mining:** cracking rocks open to reach pockets of particular ores, so a breach rig can target an ore. Designed separately from ordinary hulk mining.
- **Drones:** Jason's lean is small mining bots that cut ore and bring it back to their parent ship. They are ships in the world (see "Drones"), built as a general system.
- Cargo today: the prospector has +25% from full-size pods and a Hopper S (40 ore-only); nothing yet is specific to ore beyond the hopper. Ore holds come with the hulk.
- **Sizes:** the full-size hulk first; the capital-size mining ship later; the middle size last, as a mix of the two.
- **Drones follow your locks:** the hulk has plenty of locks, so drones can be sent to other locked rocks.

### As built: the hulk (5 November 2026)

- **Rook and Rivet Hulk** (class `hulk`, Free Belt, 85,000 credits, sold at Ridge Outpost; name provisional, a lore ask). Radius 46, the biggest hull that fits the stations' large pads; 2,700 structure, top speed 130, turn 0.45 radians a second, a 600-point capacitor recharging fast. Budget: 1 weapon (a swivel astern), 3 utility, 4 internal, 4 bays, 2 mining mounts. Role bonuses: +25% ore from full-size ore holds, +25% ore cut from full-size mining lasers.
- **Mining mounts** (mount type `mining`) take only heavy mining turrets, and turn all the way round, so either turret can take any rock.
- **Rook and Rivet Excavator L** (weapon `mining-turret-l`): a turret, strength 1 (cuts anything in the Scree), 2.2 ore a second (2.75 on the hulk) before the soft-rock and seam bonuses, 10 capacitor a second, range 480 from the hull's centre, slewing 0.8 radians a second.
- **Assigning:** make a locked rock the active lock and press a turret's tile: that turret takes the rock (`WeaponState.lockTarget`, event `laserAssigned`) and cuts it on its own, with no trigger held, while the rock stays locked and in reach. Press the tile again, or with no rock active, to let it go. A weapon assigned a target lets it go whenever the lock goes, for any reason (unlocked, out of range, the rock mined out, a ship gone) (Jason, 5 November). Mining turrets never engage ships and do not use fire control. Tiles come right after fire groups; the HUD says CUTTING, ON SEAM, TOO HARD, OUT OF REACH or NO ROCK.
- **Rook and Rivet Assay L:** eight locks, with composition.
- **Rook and Rivet Ore Hold L** (bay, kind `oreHold`): 200 ore-only units. Stock fit: four ore holds and a Hopper M, so 1,100 units for ore and no ordinary cargo.
- **Rook and Rivet Furnace L:** a 40-power reactor; the stock fit adds a medium reactor to run two turrets, the assay and big sensors.
- **Stock fit** also carries a long-reach tractor (Long Gleaner M), the Deep Dowser M, a chaff dispenser, a shield and armour.
- **Numbers:** two turrets on big rocks cut about 7 ore a second, more on seams: a full 1,100-unit hold in about two to three minutes, worth about 46,000 at Lantern in nickel-iron alone. Full, it accelerates at about a quarter of its empty rate. To tune in play.


## Decisions (Jason, 4 November 2026)

1. The full sequence (survey, analyse, break, cut, collect) is for big, rich rocks only; small ships work small rocks.
2. Mining charges are placed on a rock and set off by their tile, not fired from a launcher.
3. Drones come in part 2, built as a general system.
4. Ores are an expandable catalogue, so more can be added later.
5. Hulks get ore holds.
6. A light ship should earn more by playing it well, not by better prices: soft rock cuts faster, seams, an ore hopper with one ore filter, caches to collect later (which pirates and other players can find). Loose ore stays put; a tractor with no room parks canisters. Caches last an hour.
7. Light ships get what they get: a laser takes a rock's mix. Hulks choose their ore, by breaking rocks open and cutting the pockets (part 2).
8. Rocks respawn over time; a big hulk must really make money; drones will matter in most industries (fighters, light mining craft that strip a field from a mother ship, carriers), so the system must be easy to add to.

## As built: part 1 (4 November 2026)

- **Ore catalogue:** an ore is a good with an `ore` block (`OreSpec`: tier, chance, share, smallest rock). Rocks made from then on can hold any ore in the catalogue; adding one is adding a good. Four now: Nickel-iron (common, 30; the Scree is nickel-iron and ice, and its id stays `ore`), and, with names provisional (a lore ask), Banded ore and Black ore (middling, 60 and 75), Glintstone (valuable, 170, only in rocks of radius 35 and up). Gate-glass waits for part 2.
- **Rocks:** each holds `contents` (ore to whole units, about radius squared over 12: 27 units at radius 18, 530 at 80), a `hardness` from 0.1 for the smallest to 0.9 for the biggest, give or take 0.08, and a `field` (`ring` 120 rocks, `ridge` 60). Mined out, a rock crumbles (`rockCrumbled`).
- **Rockfall:** every 20 seconds each field below its count gains one rock, at least 1,500 units from any ship and clear of other rocks, seeded by how many have been made so worlds replay the same way; ids run `rock-n1`, `rock-n2` and on. New rocks keep to the belt's motion (frozen when orbits are stopped).
- **Locking rocks:** any targeting computer can lock a rock by its id (signature is its radius, so it locks fast). `lockReadout` gives motion, and with the `composition` readout the ores, total, hardness and radius. Guns and launchers never engage a rock.
- **Mining computer:** Rook and Rivet Assay S (computer mount; identity, motion and composition, no combat readings).
- **Survey scanner** (utility, tile): Rook and Rivet Dowser S (1,500 units, 15 capacitor, grade 1: rich or plain) and Tessaract Deep Dowser M (2,600, 25, grade 2: names the best ore). A pulse records `Ship.survey` (rocks in reach and their readings); it cycles in 5 seconds and the HUD shows it for 8.
- **Mining lasers** (weapon family `mining`, fire group 3 by default): a beam along the nose while the group fires, out to its range, cutting the first rock it reaches if the rock is no harder than the laser's strength. Mining laser S: strength 0.45, 0.75 ore a second, 4 capacitor a second, range 260 (Rook and Rivet Pick S). M: 0.7, 1.3, 8, 300. Slow on purpose, so cutting rather than hauling is most of a trip (retuned after Jason's first playtest, when a 20-unit hold filled in 11 seconds). Freed ore comes out in canisters of 5 in the rock's mix from the first canister (`Asteroid.mined` keeps count), drifting towards the laser: a light ship gets what it gets, and choosing an ore is for hulks working pockets (part 2); the tractor scoops them. A too-hard rock says so once (`miningTooHard`). `Ship.beams` carries what each laser is doing, for drawing. Lasers do nothing to ships.
- **Prospector:** Rook and Rivet Prospector (cutter, Free Belt, 2,600 credits), sold at Ridge Outpost and Harbour: Assay S, Dowser S, Pick S, a swivel, a Gleaner and a 40-unit hold (+150% cargo from full-size pods); +25% ore cut from full-size lasers. About 0.94 ore a second; a full hold in about 43 seconds of cutting.
- **Prices:** Lantern Works pays best for every ore; Ridge buys cheaply (the real money is a long haul away). A prospector's hold of nickel-iron is worth about 1,700 at Lantern, of glintstone about 7,600, so the survey matters.
- **Client stopgaps (lead):** click a rock to lock it; the target card reads rock (ores, hardness, whether your laser cuts it); survey highlights outline rocks in amber (rich), gold (valuable) or cyan (rare) and the pulse ring spreads; mining beams flicker orange while cutting, dashed grey when not; tiles show SURVEY with its cycle and the laser's CUTTING or TOO HARD; the tractor tile says HOLD FULL, a toast says so once, and the tractor's lines stop, when there is no room left.
- **Saves:** format version 7 (`migrate6to7`): existing rocks are given contents and a field, seeded from their ids. Starter stations' ship marts refresh on load, like their markets.
- **Light ship mechanics** (after Jason's playtest: the light ship earned too little, and the fix should be a mechanic, not prices):
  - **Soft rock cuts faster:** the rate is multiplied by 1 plus how far the laser's strength exceeds the rock's hardness, as a share of the strength (`cutRate`): twice the rate on the softest rock, the plain rate at the laser's limit.
  - **Seams:** every rock has a seam, a fixed bearing from its centre (from its id, `rockSeam`). A beam biting within 0.45 radians of it frees ore 1.5 times as fast. The mining computer's composition readout gives the seam, drawn as a gold arc on the locked rock; the laser tile says ON SEAM.
  - **Ore hopper** (internal, kind `oreHopper`): hold space only ore may use (`oreCapacity`; Rook and Rivet Hopper S 40, M 100). Ore fills hopper space first, then ordinary cargo (`holdSpaceFor`). Its tile cycles a filter through the ore catalogue (`Ship.hopperEject`): the tractor still takes every canister in, but the hopper spits the filtered ore straight back out astern at 30 units a second (`oreEjected`), and that ship's tractor leaves its own rejects alone while the filter stays on that ore (`Loot.ejectedBy`). Changed after Jason's playtest (5 November): the first version left filtered canisters where they were, which looked like the tractor was failing. The prospector carries a Hopper S instead of armour: 60 units for ore.
  - **Freed ore stays put:** canisters sit at rest beside the rock and last 10 minutes. With the gravity rule off, loose loot slows to rest against its frame (2-second time constant).
  - **No dragging:** a tractor never drags loot it has no room for. With a full hold and the ship sitting still (under 10 units a second against its frame), it gathers canisters into a bunch at rest just off the hull; once the ship moves off, the beam lets them go and the bunch stays where it is, ready to cache or come back for (Jason, 5 November).
  - **Caches** (J): the ore aboard goes out of the stern, and loose ore canisters within 200 units (or tractor reach) join it. A cache lasts an hour (Jason), shows on its owner's radar as amber squares and in space with a ring, and anyone can scoop it; taking someone else's becomes theft with law (7). Dropping one switches a running tractor off, or it would scoop the cache straight back. Pirates do not hunt caches until NPC miners exist (part 2).
  - Typical numbers: soft rock off the seam about 1.7 ore a second, on the seam about 2.5; 60 units in 25 to 35 seconds. A hold of nickel-iron is worth about 2,500 at Lantern.
- **Not yet:** NPC miners, charges, the hulk, drones, gate-glass (part 2).

## NPC miners (5 November 2026)

Agreed with Jason: two prospectors and a hulk to start; pirates hunt them like any traffic; NPC caches later, as a second step.

- **Skin-deep, like traders:** NPCs have no wallets. Their ore really comes out of the rocks and is really hauled, and docking at the market takes it out of the hold (`sellNpcOre`), but it pays nobody and moves no prices. NPCs chasing profit comes with the economy milestone (10).
- **The brain** (`MinerBrain`, `ai/miner.ts`): docked (sell, wait, undock), outbound (the nearest rock round its field station, within 4,500 units, that its lasers can cut and no other miner has taken), mining, inbound (full, or hunted). It flies along planned paths (`ai/navigate.ts`, shared with drones) and works through the same inputs as a pilot.
- **Prospectors** park off the rock's face, turn to it, cut with the tractor on, then take the next rock until full; they sell at Ridge.
- **The hulk** goes for rocks of radius 35 and up, parks 150 units off, locks up to four rocks within 420 units, gives each turret one, launches its drones and runs its tractor. Full or hunted, it recalls its drones and waits up to 25 seconds for them before leaving, then hauls to Lantern Works: a long, exposed run.
- **Hunted** (a pirate hunting it): it heads for its market, locks the pirate and goes weapons hot, as traders do.
- **Spawners:** `miner-prospector` and `miner-prospector-2` (respawn 90 s), `miner-hulk` (180 s), all starting docked at Ridge. Saves made before them gain the spawners on load.
- **Belt:** about 18,500 units of ore to start; the three miners take roughly 16,000 an hour, rockfall can replace about 37,000 an hour, so the belt keeps up while the Ridge field runs thin locally.
- **Cost:** the starter system now steps at about 2.7 ms a tick headless (pathfinding for the hulk's drones and the miners). Fine at 60 a second; to watch as NPCs grow.

