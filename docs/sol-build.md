# Building Sol

Lead 8's plan for the re-fit's first item (7 November 2026): moving the start from Calder to all of Sol, as `sol.md` describes it. `sol.md` says what Sol is; this page says how the game gets there: the numbers (scale, layout, travel), the travel mechanic, and the order of work in slices. Proposals until Jason signs them off; "Open" lists what is his.

## Why this is big

Calder is about 20,000 units across. Ships are 6 to 46 units long and fly at 130 to 340 units a second; stations are 70 to 90 units. A planet is 650 units. Sol with enormous bodies and minute-long crossings is four orders of magnitude bigger. That changes four things in the engine, not just the content:

1. **Travel.** At today's speeds, crossing Sol would take days. Ships need a second way to move: a burn (below).
2. **Rocks.** Today's belt is one ring of rocks round the star. In Sol, rock lives in patches (resource sites) scattered over the Belt, the Trojans, the rings and the Kuiper Belt.
3. **Drawing.** Coordinates reach hundreds of millions of units. The client must draw relative to the camera, or ships jitter at the edge of Sol (canvas maths is not exact that far out).
4. **The map.** The radar shows 5,500 units round you. A system 500 million units across needs the system chart (roadmap 6d) to be a real tool: where things are, the lanes, and where a burn goes.

## Scale

Units stay what they are: a Tern is 18 across, a station 70 to 90. Distances are compressed from the real ones; bodies are not. A planet's real size against a ship cannot be drawn (Earth would be 700,000 Terns across), so bodies are big enough to read as worlds at every zoom, which is Jason's rule.

| Body | Radius, units | Against a Tern | Notes |
| --- | --- | --- | --- |
| The Sun | 1,500,000 | | Never approached; Mercury's glare and heat begin far out |
| Jupiter | 450,000 | | Its moons orbit inside its radiation |
| Saturn | 380,000 | | Rings out to about 2.3 radii |
| Uranus, Neptune | 160,000 | | |
| Earth, Venus | 60,000 | 3,300 Terns | At flight zoom (2,000 units on screen) the limb is a gentle curve across the screen |
| Mars | 32,000 | | |
| Ganymede, Titan, Mercury | 24,000 | | Moons are worlds too |
| Luna, Callisto, Europa | 16,000 | | |
| Triton | 12,000 | | |
| Ceres | 9,000 | | The largest Belt rock: a small world |
| Vesta, Pallas | 5,000 | | Slagline is dug into Pallas: a door in a cliff |
| Hygiea, Enceladus | 4,000 | | |
| Psyche | 2,500 | | |
| Phobos | 1,200 | | A capital port could hide behind it |
| Deimos | 700 | | |
| Belt rocks | 10 to 600 | | Ship-sized to station-sized, as today |
| Capital ports | 400 to 600 | | The largest things humans built: specks against their worlds |
| Other stations | 70 to 250 | | |

**Distances from the Sun** follow a power law, d = 30,000,000 × AU^0.6 units, which keeps the inner system close and the outer system lonely:

| Region | Real AU | Units from the Sun |
| --- | --- | --- |
| Mercury | 0.4 | 17 million |
| Venus | 0.7 | 24 million |
| Earth | 1.0 | 30 million |
| Mars | 1.5 | 38 million |
| Ceres | 2.8 | 56 million |
| Jupiter | 5.2 | 81 million |
| Saturn | 9.5 | 116 million |
| Uranus | 19 | 176 million |
| Neptune | 30 | 231 million |
| The Gate Reach | 40 | 274 million |

Moons and stations round a planet keep their own small scale: Luna 600,000 units from Earth (ten Earth radii), the Lagrange yards beside it, Phobos 50,000 units above Mars. A planet's neighbourhood is a place you fly in at ordinary speed; between planets you burn.

**Orbits** run on rails as now, slowly enough that nobody sees a planet move in a sitting: Earth's year is a real-time week or more. Stations round a planet go round in hours.

## Travel: the burn

Lore (`lore.md`, "Travel inside a system"): no faster-than-light travel; ships burn, flip at the midpoint and burn again to brake; a crossing is a committed burn of minutes; a burning ship is the most visible thing in the sky; interceptors wait at the destination.

The proposal: **a burn is a flight mode, not a module.** Every ship with a main drive can burn.

- **Plotting.** Pick a destination as the nav target (on the board or the chart) and press burn. The ship turns, then accelerates hard along the line, flips at the midpoint and brakes to arrive a few thousand units short of the target, at rest relative to it.
- **Committed.** While burning you cannot fire, lock or dock. You can cancel, but cancelling at speed leaves you coasting fast in the dark between worlds until you brake (the same burn, backwards).
- **Visible.** A burning ship's plume is seen across the whole system: on the chart and the board, everyone sees its line and where it is going, whether it squawks or runs dark. Running dark hides the name, never the plume.
- **Interception.** A burn ends slow and close to its destination. That is where pirates and navies wait: what security does along a lane and at its ends matters, and the Core lanes are safe because the navy is at both ends.
- **Gravity.** A burn does not start or end deep in a well: you climb out at ordinary speed first, and arrive above the station's orbit. Falling into a world is the end of a ship (pod recovery by the nearest station).

**Burn acceleration** of about 1,000 units/s² (a hull stat, so freighters and barges burn slower and couriers faster) gives these crossings, time t = 2√(d / a):

| Crossing | Distance | Time |
| --- | --- | --- |
| Earth to Luna | 0.6 million | under a minute |
| Earth to Venus, Earth to Mars (the Inner Lane, when close) | 6 to 10 million | 2.5 to 3 minutes |
| Mars to Ceres (the Ceres Lane) | 18 million | 4.5 minutes |
| Ceres to Jupiter | 25 million | 5 minutes |
| Earth to Saturn | 86 million | 10 minutes |
| Earth to the Gate Reach | 244 million | 16 minutes |

Planets move round the Sun, so the Inner Lane's length changes over a week; burns aim at where the target will be, which the rails make exact.

## Regions and lanes

Security by region from `sol.md` becomes data: each body (and each lane) carries a security level, and a point in space takes the level of the region it is in, one lower off a lane. Regions are spheres round bodies; lanes are corridors between their stations (the line between two moving ports, a few hundred thousand units wide). Hazards are region rules: heat and glare near Mercury and the Sun (sensors shorten, shields drain), radiation inside Jupiter's belts (shields strip), the death line in Venus's air (a depth past which a hull crushes).

## Slices

Each slice is played before the next starts. Visual slices get mockups first (Jason's rule).

1. **Sol's skeleton.** Mockups first: the flight view near Earth (the limb, a capital port as a speck, approach), the chart with a burn plotted, the burn on the HUD. **Drawn** (7 November, for Jason's review): https://claude.ai/artifact/FVyc8p6Rt1v442zeQS71bv. Keys proposed: M for the chart, U to burn and to cancel. Then: the bodies at scale on rails; camera-relative drawing; the burn; the chart as a working map; the four capital ports and the two free ports with markets moved over from Calder's stations; the patrol is Earth's toll boats (the Calder Watch's Warrants, renamed); one start (Earth, private) at Earth Orbital Exchange. Calder leaves the persistent world (it stays canon through the gate).
2. **All the stations and the lanes.** The other 28 stations with their runners and markets, security by region and lane, NPC traffic that burns along the lanes, pirates waiting at lane ends in Open and Contested space.
3. **The eight starts.** Power and path at character creation; home station, first ship, starting standing. Needs the four navy start hulls (Kessari Citation, Seraphine Deimos, Union Wildcat, Ishtar Sedna) and standing as a number per power.
4. **Names that ship.** Navies ECF, MRN, VSG, UDF; the transponder line (prefix, ship name, hull number, hull, Registry number) on lock, hail, log and witness record; one name per station (mostly lands in slices 1 and 2).
5. **Materials and sites.** Rock in patches at the Belt sites, the Trojans, the rings and the Kuiper Belt; gate-glass at chance 0 in Sol; breaching finds platinum and rare-earth pockets; new goods only as needed.
6. **Hazards.** Mercury's heat, Jupiter's radiation, Venus's death line. Comets as events later.

Alongside, small and separate: item 5 of the re-fit (hull identity cannot be fitted out), item 6 (the four docs left in the pivot audit), item 7 (where ship art's rasterise step lives: at build time in `art/`, writing an atlas the client loads, when ship art goes into the client).

## Decided (Jason, 7 November 2026)

- **Sol starts fresh.** The Calder save is kept as a backup file beside the new world; characters and keys are kept; ships and credits reset.
- **A plotted burn.** Pick a nav target and press burn: the ship turns, burns, flips and brakes to arrive at rest; cancellable, and cancelling leaves you coasting fast. No manual burn for now.
- The numbers (sizes, distances, crossing times) are the lead's; Jason sees them in the mockups before they are built.
