# The system: bodies, orbits and gravity

How a star system is built and how ships move through it. Status: agreed design, 4 November 2026, with Jason. Not built yet; milestone 6c builds it in two parts (see "Build order").

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
- Traders run between all three; pirates lurk in the belt and the lanes; Concord patrols work the lanes near security zones and hunt pirates (not pilots: crime is milestone 7).

Sizes and periods are set during the build and tuned in play. The system is about two to three times the size of today's sector. There is no in-system faster-than-light travel for now; it is revisited with the map (milestone 8).

## Build order

**6c part 1: bodies and frames (lead).** Body data and rails; spheres of influence carrying ships, projectiles, loot and wrecks; moving stations and pads; docking, undocking and assist against the local frame; NPC steering in moving frames; sensor range as a ship stat; the new starter system; a save migration that keeps every pilot's credits, storage and ships (ships in space are towed to Harbour).

**6c part 2: gravity and life (lead).** Gravity with the eased edge; surface impact; gravity, orbit and path prediction helpers for the client; the belt's asteroids; the third station; Concord patrols; more traders on more routes.

**Client (interface workstream).** Drawing bodies, orbits, the belt and moving stations; the predicted path line; the gravity gauge and warnings; the radar and system map. See "Brief: Interface" in `coordination.md`.

## Later

- Orbit hold autopilot, transfer and approach assists.
- Slingshot racing.
- Elliptical body orbits, rotating stations, landing on surfaces, things on surfaces.
- Generated systems from a seed, stored in the world once made.
- The star's heat near its surface.
