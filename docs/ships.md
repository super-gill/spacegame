# Ships and modules

How ships are built. Status: agreed design, 3 November 2026. Not yet implemented; see "First build slice" for what comes first.

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

**6b: ship mart and pads (0.8.0)**

- Stations get pads (sized S/M/L); docking assigns a pad; docked ships are drawn on their pads.
- Ships for sale parked on pads; buy from the station list; your old ship stays parked on its pad and you can switch between owned ships.

Later in milestone 6: oversized modules across two mounts, turret arcs from mount positions, fire groups, ammunition, power management in combat.
