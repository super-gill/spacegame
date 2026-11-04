# The system: bodies, orbits and gravity

How a star system is built and how ships move through it. Status: agreed design, 4 November 2026, with Jason. Milestone 6c builds it in two parts (see "Build order"); part 1 is on `main` (see "As built: part 1").

Related: [ships.md](ships.md) for ships and fitting, [design.md](design.md) for flight, [lore.md](lore.md) for what the bodies are.

## Principles

1. **Orbits arrange the system.** A star at the centre, planets round the star, moons and stations round planets, the asteroid belt as a slow ring. Everything moves, so routes change length over time and finding your way is real navigation.
2. **Bodies are on rails.** A body's position is a pure function of the tick, worked out from its orbit, never simulated. The sim stays deterministic, saves stay small, and nothing drifts out of orbit however long the world runs. Ships, projectiles, loot and wrecks are the only things that move freely.
3. **Each body has a sphere of influence.** Inside it, that body alone pulls you, and you are carried along with it. Outside every sphere, space is flat: free Newtonian flight exactly as it is today. The star's sphere covers only its own neighbourhood, so you can still park in open space.
4. **Speed is relative to where you are.** Full assist, the speed readout and docking all work against your local frame: the station whose dock range you are in, otherwise the body whose sphere you are in, otherwise the system.
5. **Systems are data.** A system is a list of bodies and stations with their orbits. Today's starter system is written by hand; later systems are generated once from a seed and stored in the world.
6. **The world never pauses**, so there is no time warp. Orbits are tuned for play time: a low orbit round a planet takes a minute or two.

## Bodies

A body has:

| Field | Meaning |
| --- | --- |
| id, name, kind | `star`, `planet`, `moon`, `belt` |
| parent | The body it orbits, or none for the star |
| orbit | Circular for now: radius, period, starting phase, direction |
| radius | The surface. Touching it is an impact |
| gravity | Strength (gravitational parameter); zero for a belt |
| sphere | Sphere of influence radius; gravity is zero outside it |

- Stations orbit a body as bodies do, on rails, with the same orbit fields.
- **Station orbits obey gravity.** A station's period is worked out from its parent's gravity and its orbit radius, not chosen freely. So a ship matching a station's velocity is in the same orbit, and a ship parked beside a station stays beside it with no special rule.
- Planet orbits round the star sit outside the star's sphere, so their periods are free, chosen for play.
- Pads ride with their station. A docked ship's position is its pad's position each tick, and its velocity is the station's.
- The belt is a ring of asteroids that turns slowly. Asteroids are solid (they collide like station hulls), give cover and, in milestone 9, ore.

## Ships in moving frames

Positions and velocities stay in system coordinates, as now. Each tick, everything inside a body's sphere gets that body's gravity **plus the body's own acceleration along its rail**. That is exactly what being carried along with the body means, and nothing else in the sim (collisions, weapons, loot, the tractor) has to change.

It also means:

- Crossing a sphere's edge needs no change of frame, so there is no jump.
- **Slingshots work.** Swing round a planet and leave its sphere, and you leave with the planet's velocity added to yours: you can gain or lose speed.
- Your local frame's velocity is the reference for assist and readouts (principle 4).

## Gravity

**Off by default since 4 November 2026** (Jason, after playtesting: "a clash between the flat space idea and something trying to be more realistic"). It is a world rule, `World.rules.gravity`, saved with the world and switched in the F2 menu's Admin section. Off, nothing pulls: no gravity on ships, shots, loot or wrecks, no gravity tier or orbit in the nav readout (the path line still shows coasting and carrying), no gravity margin in NPC routing, and new pilots wait at rest in the planet's frame on Harbour's path instead of in orbit. Rails, carrying, station orbits and solid surfaces are unchanged. What follows describes the rule switched on.

- Inverse-square towards the body's centre inside its sphere, eased smoothly to zero over the outer part of the sphere, so crossing the edge never jolts you.
- **Free orbits with no thrust.** Once captured you coast on an ellipse with an apoapsis and periapsis, faster low and slower high. Burns change the orbit as they should. The physics updates velocity before position, which keeps an orbit's energy from drifting; a test proves an orbit holds for an hour of play.
- **Flight modes:** full assist cancels gravity as far as your thrusters can, so you hover. That kills an orbit, so orbits are flown in rotation assist or manual. Full assist is for station-keeping; the others are for flying orbits.
- **Impact:** hitting a surface works like hitting a station hull, with damage by speed. A slow touch bounces, a fast one kills. Landing comes later.
- The sim gives the client what it needs to show all this: the gravity at a point, your orbit's apoapsis and periapsis, and a predicted path for a number of seconds ahead.

### Warnings

Warnings compare gravity's pull with **your** main thrust, which depends on your fit and cargo. A loaded freighter has to stay higher than a light courier.

| Gravity against your main thrust | Warning |
| --- | --- |
| Entering a sphere | Advisory: "Entering <body>'s gravity well" |
| Over 25% | Caution: the HUD shows a gravity gauge |
| Over 60% | Warning: "Climb now"; full assist reports it is struggling to hold you |
| Over 100% | Alarm: "Cannot escape. Impact in N s" |
| Your predicted path meets a surface | Collision course with a countdown, at any tier |

## Detection

What you see is what your sensors can see. `ShipStats` gains a sensor range, from the hull and from sensor modules. Ships outside it are not shown. Bodies, stations and the belt are always known (they are on the charts). This replaces today's markers for everything.

## Starter system (proposed)

Calder (the lore's name) becomes a star with a planet, a moon and the belt:

- **Harbour Station** in orbit round the planet. New pilots start here, as now.
- **A third station** round the moon. Its role and market come from the lore workstream.
- **Ridge Outpost** in the belt.
- Traders run between all three; pirates lurk in the belt and the lanes; the Calder Watch (the port's own patrol, in ordinary, beatable ships) works the lanes near security zones and hunts pirates (not pilots: crime is milestone 7).

Sizes and periods are set during the build and tuned in play. The system is about two to three times the size of today's sector. There is no in-system faster-than-light travel for now; it is revisited with the map (milestone 8).

## Build order

**6c part 1: bodies and frames (lead).** Body data and rails; spheres of influence carrying ships, projectiles, loot and wrecks; moving stations and pads; docking, undocking and assist against the local frame; NPC steering in moving frames; sensor range as a ship stat; the new starter system; a save migration that keeps every pilot's credits, storage and ships (ships in space are towed to Harbour).

**6c part 2: gravity and life (lead).** Gravity with the eased edge; surface impact; gravity, orbit and path prediction helpers for the client; the belt's asteroids; the third station; Calder Watch patrols; more traders on more routes.

**Client (interface workstream).** Drawing bodies, orbits, the belt and moving stations; the predicted path line; the gravity gauge and warnings; the radar and system map. See "Brief: Interface" in `coordination.md`.

## As built: part 1

Choices the build made where the plan was silent (Lead 3, 4 November 2026).

- **Data.** `World.bodies` holds `Body` records (`bodies.ts` for the starter system). A body's `orbit` names its parent; the star has none and sits at the origin. Stations carry `orbit` and `velocity`, and `Station.position` and `velocity` are kept equal to their rail at `World.tick`, so everything that reads a station's place reads one field.
- **Carrying is exact.** Each tick, something inside a body's sphere moves by its normal step plus what the body's rail adds beyond its velocity, and its velocity changes by the body's change in velocity (`rails.ts`). A ship left alone keeps its offset from the body to floating-point accuracy. The innermost (smallest) sphere carries; a moon's carry already includes its planet's.
- **The belt** is a body that sits on the star and only turns (`orbit.radius` 0), with a `ring`. It has no sphere and carries nothing. Ridge Outpost orbits it at the ring's radius with the belt's period: the belt has no gravity, so that period is free, and a ship parked beside Ridge slowly drifts off it (full assist holds it inside dock range). Revisit if that feels wrong in play.
- **Speed limit.** Measured against the local frame. Thrust cannot take you past it, but excess speed is kept, so crossing into a moving frame (a station's dock range moving the other way, a sphere edge) never jolts you and slingshots can work. Rams past the limit are no longer clipped either; assist and brake bleed them off.
- **Debris and pods** keep part of the ship's motion relative to its local frame, not the system.
- **Pirates** can have a home on a rail (`PirateBrain.homeOrbit`). Calder's pirate lives 1,500 units inward of Ridge on the belt's turn, on the traders' way in, outside Ridge's security.
- **New pilots in space** appear on Harbour's orbit a little ahead of it, just outside it, at rest in the planet's frame. Harbour comes to them and passes inside dock range, clear of the hull.
- **Sizes** (resized on 4 November after Jason's first play: bigger bodies for the feel, same physics). Star radius 800, sphere 1,500. Fieldmark 5,000 from the star, 30 minutes round, radius 650, sphere 3,300, gravity 3.0e6. Harbour 1,100 from Fieldmark, about 2.2 minutes round. Lantern 2,500 from Fieldmark, about 7.5 minutes round, radius 220, sphere 720, gravity 1.94e5; Lantern Works 480 from Lantern, 2.5 minutes round. The Scree at 10,200 (1,400 wide), 90 minutes round. Bigger bodies and wider station orbits make the same rules read slower on screen.
- **NPCs** route round bodies as well as stations; a trader arrives at a station by adding the station's velocity to its approach.
- **Save version 5** migrates version 4: pilots keep credits, storage and ships; docked ships stay on their pads; ships in space are towed to Harbour; NPCs, shots, wrecks and loot start fresh.
- **Client stopgap:** `packages/client/src/render/bodies.ts` draws each body as a plain circle with its sphere dashed and the belt as a dashed band; stations are drawn between ticks; the HUD's speed is relative to the local frame and names it. The interface workstream owns all of it.
- **Names** are from the lore: Fieldmark (the planet), Lantern (its moon), the Scree (the belt).

## As built: part 2 (so far)

- **Gravity** acts only from the innermost body and is eased to zero from 75% of the sphere to its edge (smoothstep). Shots, loot and wrecks fall as ships do.
- **Full assist** plans against the velocity gravity will give the ship by the end of the tick, so it hovers without sagging, as far as the thrusters allow.
- **Surfaces** use the station-hull rule with their own restitution (0.3) and friction (0.2); damage cause `surface`. A fall from Harbour's height onto the planet bounces with light damage; a fast dive is fatal.
- **The nav computer** is a fitted system (Jason: "fundamental, in every ship"): it is where speed, frame, gravity tier, orbit and the predicted path come from. Path points are every quarter second, relative to the body you start in, so a free orbit draws as a closed loop. The gravity tier compares the pull with the ship's own main acceleration, cargo included.
- **Consequence:** an empty ship left at rest inside a sphere falls. Park in orbit, at a station, or in flat space.
- **Lantern Works** orbits Lantern with a clear lane between station and surface (sizes above).
- **The Scree's rocks** are generated once from a seed (`screeAsteroids`, 180 rocks, 18 to 80 units across, small ones common) and stored in the world. 120 are scattered round the ring and 60 crowd round Ridge, but none within 1,000 units of Ridge or in a lane from Ridge inward towards the star: the Collective keeps its doorstep and approach clear. They ride the belt's turn, are solid to ships (the surface rule) and stop shots; loot and wrecks pass over them.
- **Trade:** two Tessaract traders run Harbour, the Ridge, Lantern Works and home, starting at opposite corners. Harbour's machinery is dearer (78) and its ore bid lower; Lantern Works sells machinery cheap and pays well for ore, food and medicine.
- **The Calder Watch** (one Warrant: an autocannon, a Paragon Marksman M, a medium shield and armour) flies a beat Harbour, Lantern Works, Harbour, the Ridge, holding just outside each security zone (on the far side from the body a station orbits). It locks a pirate its radar shows near the stations and fires only once the lock completes, holds fire when traffic is in the line, breaks off when badly hurt, turns on pirates that shoot it, and never touches pilots. Pirates do not prey on it.
- **NPC flying:** traders and the Watch first move clear of a station they leave (or brush), keeping its velocity and heading away from the body it orbits, so a fast station never runs them down; a ship inside an obstacle's cushion climbs back out while going round it; hunters and the Watch route round obstacles while fighting. Routes keep a wider berth from bodies (1.6 times the radius, or where gravity reaches 30% of their thrust if further), steer for where gravity will take them, arrive at an orbiting station from outside its orbit, and route round the hull they are docking at. A 30-minute soak has traders round the triangle with a few slow bumps.

## Later

- Orbit hold autopilot, transfer and approach assists.
- Slingshot racing.
- Elliptical body orbits, rotating stations, landing on surfaces, things on surfaces.
- Generated systems from a seed, stored in the world once made.
- The star's heat near its surface.
