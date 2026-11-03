# Ships and modules

How ships are built. Status: agreed design, 3 November 2026. Slice 6a is in play from 0.7.0; 6b and the rest of milestone 6 are not built yet. See "First build slice".

Related: [races.md](races.md) for races and manufacturers. Concept art lives on the "Spacegame ship concepts" design canvas; the full race and manufacturer design and the lore are in the "Spacegame: Races and Manufacturers" and "Spacegame: Lore of the Known Universe" docs.

## Principles

1. **You build the ship.** A hull is a frame. Every bit of performance (thrust, turning, shields, power, cargo, weapons) comes from modules fitted to it. A bare hull cannot do anything.
2. **Function by shape, race by style.** Every module type has one universal silhouette, so any pilot can read an enemy's fit at a glance. The race and manufacturer show in line style and colour.
3. **The look is the fit.** A ship is drawn as its hull plus each module at its mount point. A freighter with four pods looks like a freighter with four pods.
4. **Bonuses live on ships, never pilots.** Any pilot can fly any ship they can buy; its bonuses come with it.
5. **Everything is data.** Hulls, modules, races, manufacturers and industries are catalogue entries. Adding one never needs engine code.

## Hulls

A hull has:

| Field | Meaning |
| --- | --- |
| race, manufacturer | Who built it; sets its look and bonuses |
| role | Its intended industry (combat, transport, passengers, mining, salvage, exploration, drones, support, construction, ...) |
| size class | S, M, L, XL; decides which station pads it fits |
| mass, structure, outline | Its own body |
| flight limits | Top speed and spin limits, as now |
| mount points | See below |
| bonuses | Role and race bonuses, see below |

### Mount points

Each mount point has:

- **type**: what kind of module it takes: weapon, bay, utility, engine, core, internal.
- **size**: S, M, L or XL.
- **position and facing** on the hull: where the module sits and points. Visuals, turret arcs (later) and damage locality (later) come from this.
- **services**: what it provides (power, fire control, ammunition feed, heavy load, sensor view, ...). A module states which services it needs.

A bare hull shows its mounts as dashed sockets sized to the mount. In space, only fitted modules are drawn.

## Modules

A module has a type, a size, mass, power draw, the services it needs, a shape, its stats, and its manufacturer. Brands differ only in trade-offs (heavier but cheaper, lighter but power-hungry), never in what they fit.

| Module | Mount type | Silhouette | Provides |
| --- | --- | --- | --- |
| Fixed weapon | weapon | Barrels along the heading | Damage; aimed by flying |
| Turret | weapon | Round base, barrel, slew ring | Damage; tracks the target |
| Missile launcher (later) | weapon | Box of round tubes | Guided damage, uses ammunition |
| Engine | engine | Rear nozzle, plume sized to thrust | Main thrust |
| Thruster package | core | Small vents (internal marker) | Reverse, lateral and rotation thrust |
| Reactor | core / internal | Marker only | Power |
| Shield generator | internal | Marker only | Shield capacity and recharge |
| Shield emitter | utility | Small node with a ring | Shield bonus |
| Armour plating | utility | Plates on the hull | Structure |
| Cargo pod | bay | Solid block with bands | Cargo space |
| Passenger cabin | bay | Rounded block, rows of lit windows | Passenger berths |
| Sensor | utility | Dish or antenna on a stalk | Detection range (later) |
| Mining laser | weapon or utility | Concave emitter, dashed beam | Mining (milestone 9) |
| Salvage arm | utility | Jointed arm with claw | Salvage (milestone 9) |
| Hangar bay | bay | Open mouth | Drones and crewed craft (later) |

### Fitting rules

- A module goes only on a mount of its type that provides the services it needs.
- **Size:** a module may be the mount's size or smaller. A smaller module works but loses the hull's bonus for that mount.
- **Oversized modules** may span two adjacent mounts of the same type and size (an extra-large pod across two large bays). This makes glass cannons and unwieldy freighters possible.
- **Power:** total power draw may not exceed reactor output.
- Fitting happens only while docked at a station with **outfitting**.
- Swapping out a module is allowed any time you are docked at outfitting.

### Derived stats

A ship's performance is computed from its hull plus its fit (plus cargo mass), never stored:

- mass = hull + every module + cargo
- thrusts from engines and thruster packages, divided by that mass
- shields from shield generators and emitters
- structure from the hull plus armour
- cargo space from cargo pods
- weapons from weapon modules
- power generated against power drawn

### Bonuses

- **Role bonus**: the hull rewards modules of its role at its mount size (a medium mining hull rewards medium mining lasers).
- **Race bonus**: the hull rewards its race's tech (Halcyon: energy weapons; Kessari: missiles and shields; Free Belt: projectile weapons and speed; Vael: drones, rail guns, armour repair; Oru: drones and craft; Drifter: scanners, stealth, range).
- A manufacturer's specialist lines get stronger bonuses than its other lines.

## Ships in the world

- A ship is a hull with modules fitted, owned by a pilot or an NPC, or unowned (for sale).
- Owned ships are never lost to anyone else: a pilot can own several, parked at stations.
- Later: damage hits the module where it lands; cargo pods can be jettisoned; modules become items you store, carry, loot and salvage.

## Buying ships

- Most stations have a **ship mart**: a few fitted ships parked on the station's pads, physically visible, unowned and flagged for sale. You buy from the list inside the station. Stock is limited by pads and refilled by deliveries over time.
- A manufacturer's own station sells its full catalogue and bare hulls.
- Navy hulls need standing and a licence with that race (see races.md).
- New pilots start in a Meridian Civil Yards starter ship.

## The Sparrow

The Sparrow is now a development ship: complete, unrefittable, outside the normal economy. It stays in the code for testing.

## First build slice

Split in two so each half is playable:

**6a: modular ships (0.7.0)**

- Hull and module data model, fitting rules, derived stats replacing today's fixed hull stats.
- Ships drawn from their fit (hull outline plus module shapes at mount points).
- Hulls: a Meridian civilian starter (new pilots), the Kessari wedge frigate (Kessari Orbital Defence) and the Tessaract spine hauler.
- About a dozen modules across engine, thruster package, reactor, shield generator, armour, cargo pod, and light and medium fixed weapons and turrets.
- Outfitting screen when docked at a station with outfitting: see mounts, fit and remove modules, see derived stats change.
- Bonuses on those three hulls.

**6b: ships you own, pads, ship mart, boarding and pods (0.8.0)**

Planned 3 November 2026 with Jason's decisions. Not built yet.

*Owning versus flying.* A ship's owner (`Ship.ownerId`) and whoever is flying it are separate facts. A pilot flies at most one ship (`Pilot.shipId`) and may own any number. A ship nobody is flying is **empty**; an NPC brain flying a pilot's ship is how hired pilots will work later, so nothing may assume "owner" means "pilot aboard".

*Pads.* Stations have pads (S, M, L), each with a position and facing on the station. Hulls already have a size class. Docking puts the ship on the smallest free pad it fits and records the pad on the ship; no free pad that fits refuses docking with a reason. Docked ships, flown or empty, are drawn on their pads.

*Ship mart.* A station may sell ships: its stock is a list of loadouts, unlimited for now. A ship's price is its hull's price (a new hull field) plus its modules' prices. Buying needs a free pad that fits; the new ship is the buyer's, empty, docked on that pad. Pilots fly it by boarding it. Harbour sells the Courier, the Wedge and the Spine to start with.

*Boarding.* A pilot command, `boardShip`, moves the pilot from the ship they are in to another ship they own that is empty. Allowed when both are docked at the same station, or in space within a short range of each other with a low relative speed (named constants). The ship left behind stays exactly where it is, empty. Boarding from a pod consumes the pod.

*Empty ships.* Stay where they were left, drift with their momentum in space, and can be shot, rammed and destroyed like any ship (they leave a wreck and loot; there is no pod). Taking someone else's ship belongs with law and salvage later. NPC pirates hunt pilots, not empty ships, for now.

*Escape pods.* A pod is a sealed small hull with a fixed fit: a small engine and thrusters, no weapons, no cargo. It cannot be bought or refitted. When a ship a pilot is flying is destroyed, the pilot is ejected in a new pod at the wreck, with a little of the wreck's velocity. A pod can fly, dock (small pad) and board ships its pilot owns. Pods can be shot; making that a crime is milestone 7. NPCs do not get pods.

*Losing everything.* When a pod is destroyed, the pilot wakes at Harbour Station: in a new pod docked there if they own any ship, or in a free starter Courier docked there if they own none. A pilot in a pod who owns no ship can also claim the free starter Courier while docked at Harbour. Owning other ships means fetching one.

*Saves.* New save version with a migration: stations gain pads, docked ships are put on pads, everything else carries over.

*Build order.* The lead builds the sim foundation first (ownership rules, pads and docking, buying, boarding, pods, the death flow, the save migration, all with tests and the new contracts in `docs/coordination.md`). Then a client workstream builds the ship mart screen, pads and docked ships on screen, the board key and prompt, and the pod's look.

Later in milestone 6: oversized modules across two mounts, turret arcs from mount positions, fire groups, ammunition, power management in combat.
