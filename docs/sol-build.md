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
| Earth, Venus | 60,000 | 3,300 Terns | Never drawn in the local view (decided below); stations orbit well clear of it |
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

1. **Sol's skeleton.** Mockups first: the flight view at a capital port (ship and station at real size, no planet; redrawn after Jason's review), the chart with a burn plotted, the burn on the HUD. **Drawn** (7 November, for Jason's review): https://claude.ai/artifact/FVyc8p6Rt1v442zeQS71bv. Keys proposed: M for the chart, U to burn and to cancel. Then: the bodies at scale on rails; camera-relative drawing; the burn; the chart as a working map; the four capital ports and the two free ports with markets moved over from Calder's stations; the patrol is Earth's toll boats (the Calder Watch's Warrants, renamed); one start (Earth, private) at Earth Orbital Exchange. Calder leaves the persistent world (it stays canon through the gate).
2. **All the stations and the lanes; the Relay** (`infrastructure.md`): the Accord's relay buoys as entities, dense on the lanes and round stations, thin off them, none past Saturn but the Gate Lane, and each place's security (Core, Held, Contested, Open) computed from coverage, paths home and the holder's bases instead of painted on, shown on the chart; a world impact at burn speed kills the pod too (the pilot wakes at home; lore, "Death and the Return", without the Fade); and **planets and moons as burn targets** (Jason, 7 November: the burn stops above the body's well); a detour round a world flies and draws as a smooth pass grazing its well, shown on the chart with its extra time before you burn. The other 28 stations with their runners and markets, security by region and lane, NPC traffic that burns along the lanes, pirates waiting at lane ends in Open and Contested space.
3. **The eight starts.** Power and path at character creation; home station, first ship, starting standing. Needs the four navy start hulls (Kessari Citation, Seraphine Deimos, Union Wildcat, Ishtar Sedna) and standing as a number per power.
4. **Names that ship.** Navies ECF, MRN, VSG, UDF; the transponder line (prefix, ship name, hull number, hull, Registry number) on lock, hail, log and witness record; one name per station (mostly lands in slices 1 and 2).
5. **Materials and sites.** Rock in patches at the Belt sites, the Trojans, the rings and the Kuiper Belt; gate-glass at chance 0 in Sol; breaching finds platinum and rare-earth pockets; new goods only as needed.
6. **Hazards.** Mercury's heat, Jupiter's radiation, Venus's death line. Comets as events later.

Alongside, small and separate: item 5 of the re-fit (hull identity cannot be fitted out), item 6 (the four docs left in the pivot audit), item 7 (where ship art's rasterise step lives: at build time in `art/`, writing an atlas the client loads, when ship art goes into the client).

## As built: slice 1 (7 November 2026, Lead 8)

**Sol** (`sim/src/sol.ts`, `createSolWorld`): the Sun, Mercury to Neptune, Luna, Phobos, Deimos, the Galilean moons, Titan, Enceladus, Triton and the big Belt rocks (Vesta, Ceres, Pallas, Psyche, Hygiea), at the sizes and power-law distances above; gravity wells reach 2.5 radii (only felt with the gravity rule on). Six ports, built from Calder's three station types so markets, pads and services carried over: Earth Orbital Exchange (home: new pilots start just off it; outfitting, ship mart), Thetis Orbital and Republic Station Elysium (likewise), Ceres Accord Station (Ridge's ore market, plus outfitting) on the field round Ceres, Slagline dug into Pallas (Lantern's works), Titan Free Port (no ship mart). NPCs, each round one port since only pilots can burn yet: Earth's toll patrol (the old Watch's Warrant) round the Exchange; two prospectors and a barge working the Ceres field and selling at the Accord station; a Black Strike raider at the field's far side. No traders until NPCs can burn (slice 2). `World.system`, `homeStationId` and `rockSite` carry what used to be Calder's constants; Calder (`createStarterWorld`) is unchanged and still makes the Arena and the tests.

**Planets stand still.** Orbits run on rails and stop with the orbits rule, off by default, as in Calder. With the rule on, a planet would carry its ports at a few hundred units a second against a local flight model that flies against a still frame; moving planets wait until local flight works in the planet's frame.

**The burn** (`sim/src/burn.ts`): commands `burnStart` (a station, or null for a braking burn) and `burnCancel`; `Ship.burn`. Each tick a burning ship flies itself (step.ts skips docking, locks, guns and ordinary flight): it wants to close at the speed it could still brake from, √(2ad), turns towards the thrust that gets it there at 2.5 rad/s and burns only when pointing within 0.15 rad, so the flip at the midpoint is a real turn. It ends within 150 units of a point 500 units outside the station's dock range, at under 30 units/s relative to the station, matched to its velocity. A body whose surface the line passes within 1.4 radii of is flown round. Refused: no ship, not flying, a drone, an unknown station, nearer than 20,000 units. 1,000 units/s² by default; freighters 600, barges 500, destroyers 800 (`BURN_ACCELERATION_BY_CLASS`).

**The client:** U burns for the nav target port (pick it on the board or the chart), U again cancels, and with no target while coasting fast U brakes. M opens the chart: LOCAL, INNER, BELT and ALL SOL views, bodies and ports from the rails, click a port to make it the nav target, the burn plotted beside it (distance, time, flip, peak, the hull's burn), BURN. While burning, a banner across the top: where to, a bar with the flip mark, speed, flip in, arrive in, distance left. The camera's lag is capped at 120 pixels so a burning ship stays in view. Far ports on the radar rim keep their marker but no name. A station's card says BEACON ON.

**The save:** a Calder save is kept as `world-calder-backup.json` the first time the server starts on this build, and Sol is saved at once in its place; characters and keys carry over (accounts.json), ships and credits start again.

**Checked** in Chromium on a fresh server: create a character, Dev, start off Earth Orbital Exchange at real scale; the chart plots Elysium at 9.8 million units, 3:18, flip at 1:39; BURN; 40 seconds in the banner read 39,550 u/s, flip in 0:59, arrive in 2:38; arrived after 201 seconds at rest beside Elysium, inside its security zone. No page errors. Found and fixed on the way: the chart's BURN button was rebuilt every frame and could not be clicked (built once now, updated in place). Tests: 10 in the sim (`sol.test.ts`: layout, ports clear of their worlds, the Ceres field, a save round trip stays Sol, the plan, a full burn Earth to Elysium, the detour round Mars, cancel and brake, refusals, the commands) and 1 on the server (the Calder backup).

**Falling into a world** (added after Jason hit Earth at burn speed and his pod bounced off at 20,000 u/s): hitting a planet, moon or big rock at 500 u/s or more (`FALL_FATAL_SPEED`) loses the ship with no wreck, and the nearest port with a free pad recovers the pilot's pod, docked (`fellInto`, `podRecovered`). Burning ships are checked too. Coasting above 2,000 u/s, the burn banner says COASTING and that U brakes (or burns for the nav target).

**Not in slice 1:** lanes and security as data (the chart has no lanes yet), the other 28 stations, NPC burns, other players' plumes seen from afar, Sol's own names for the patrol and the toll boats' transponders (slice 4).

## As built: slice 2, push 1 (7 November 2026, Lead 9)

Slice 2 lands in pushes Jason can fly between. The first is the burn's second half: worlds as targets, the pass round a world made real, and the pod lost in a fall at burn speed.

**Worlds as burn targets** (`burn.ts`, `burnTarget`): a burn's target is a port or a planet or moon (the big Belt rocks are moons here; the Sun and the belts are refused, `unknownTarget`). A burn for a world ends above its gravity well, `BURN_WELL_CLEARANCE` (1.05) times the well's edge out from its centre along the line from the ship, matched to the world's motion. On the chart, click a world (a ring marks it) and the plan says ABOVE THE WELL; the board has no rows for worlds. The target card calls it WORLD.

**The pass round a world** (`burnRoute`): a route is the straight line unless it passes within 1.4 radii (`BURN_BODY_MARGIN`) of a world's centre; then it bends round on the side the line already favours: a tangent in to that clearance circle, an arc along it, a tangent out, and on (up to four worlds). (Push 2 changed how ports in low orbit or dug into rock are handled: see below.) The ship cannot bend at burn speed, so each pass has a speed, √(a·r·0.6) (`bendSpeed`, `BURN_BEND_SHARE`): about 5,200 u/s round Mars, 7,100 round Earth, 25,000 round Jupiter. The guidance law brakes for the pass as it brakes for the end (the least speed it could still shed in time for anything ahead), allowing for the ground the flip covers before the brake bites (`BURN_FLIP_SECONDS`, fading out below 1,000 u/s so a stop finishes crisply). The chart draws the route as the line the ship will fly, with each pass's clearance as a faint dashed ring, and the plan's ROUTE line says ROUND MARS and how much longer than the straight line it takes (`BurnPlan.detourSeconds`). Rounding Earth on the way from Earth Orbital Exchange to Luna costs about ten seconds; the plan's time and the flown time now agree within a few seconds (64 against 66 to Luna). The burn banner reads ROUNDING EARTH during a pass; its numbers come from `burnStatus`, the same route from where the ship is now.

**The chart zooms and pans** (Jason, 7 November: the scale buttons alone were annoying to use): the wheel zooms about the pointer, between 20,000 units and all of Sol; dragging pans; zoomed all the way out the chart locks on the Sun with Sol inside its border, and inside that the centre is kept where Sol still fills the chart. LOCAL, INNER, BELT and ALL SOL stay as quick jumps and light up when the zoom matches one; LOCAL follows your ship until you drag or zoom away from it. A press that moves less than four pixels is a click (a pick).

**The pod does not survive a fall at burn speed** (`FALL_POD_FATAL_SPEED`, 2,000 u/s): the ship is lost with no wreck as before, and nothing gets away; the pilot is left with no ship, told so (`podLost`, sent to that pilot alone), and wakes at their home station as after losing a pod (`wake`). Below that speed and above 500 the pod is still recovered by the nearest port. This is the lore's Return (`infrastructure.md`, "Death, pods and the Return") without the Fade, which is parked until after Open Lanes.

**Checked** in the sim: 23 tests in `sol.test.ts` (the route round Mars stays outside the clearance and on it, is longer and slower than the straight line, flown it never exceeds the pass speed by more than 15% and clears Mars by over 1.2 radii; Slagline's route out and in; a burn to Luna ends above its well at rest; the Sun refused; a 20,000 u/s fall loses the pod and the pilot wakes at Earth Orbital Exchange). Plan times now count the flips (about 1.3 s each).

**Not in this push:** the other 25 stations and the lanes (push 2), the Relay and computed security (push 3), NPCs that burn (push 4).

## As built: slice 2, push 2 (7 November 2026, Lead 9)

**All 31 ports** (`sim/src/sol-ports.ts`): every station `sol.md` names. (The handover said 34; `sol.md`'s tables name 31, and the lead builds what is named.) Each carries `runBy` (the "Run by" column, shown on the target card), `holder` (the power, the Accord or the clans whose space it is in; null for Psyche Dig, where nobody agrees) and, for some, `rank`: the four capital ports, the two Accord free ports, and the two navy yards (ECF Yard L5, MRN Yard Phobos). Push 3 reads these for security.

Placement follows `sol.md`'s "Orbits" column. Round a world at a radius clear of it, or just above it for the low-orbit ports (Lavinia Alpha Dock over Venus's cloud tops, Rook and Rivet Shell Station in Earth's Shell) and the dug-in ones (Slagline). On a body's own orbit sixty degrees ahead or behind for the Lagrange points (Earth-Moon L4 and L5 for the Tessaract and ECF yards, Mars's L5 Trojans for State Mine Eureka), a million units sunward of Venus for Halden's L1 observatory. Round the Sun where a place is a region rather than a world: Corvane Apollo Works in the Near Field, 1.5 million units behind Earth on its path; the Boneyard in the outer Belt by Hygiea; Hilda Moot at 4 AU; the two Gate Reach stations at 40 AU, a third of a million units apart. Rimehold is 700,000 units out from Saturn, in the rings.

**Markets** come from templates by what a station is, with a line or two of local colour each: a foundry (Lantern Works' market: Caloris, Apollo, Vesta), a mine (Ridge's: Eureka, Psyche, Bellows), a yard (machinery and scrap wanted, ammunition sold), a salvage port (scrap wanted, machinery cheap: the Shell, the Boneyard), an outpost (little sold, everything dear: the outer ports and the moots), a clinic (medicine cheap: Mercy, Haven Europa) and a gate station (ammunition and munitions). No new goods; the numbers are placeholders for step 4, the money loop. **Ship marts** from today's catalogue until the first fleet (step 2): the navy yards sell the raider, brig and frigate; Tessaract's yard the starter and the trader; State Yard Deimos the civil three; Bellows the mining ladder; Tycho Port the starter and the raider. **Outfitting** at 26 of the 31; not at Psyche Dig, Hilda Moot, VSG Haven Europa, Plume or Triton Moot (small, remote or nobody's).

**The Accord lanes** (`sim/src/lanes.ts`): `SOL_LANES`, the five from `sol.md` (Inner: Thetis, the Exchange, Elysium; Ceres: Elysium, Ceres; Belt: Ceres, Slagline; Long: Ceres, Callisto Freight Depot, Titan; Gate: Titan, ECF Toll Station), each with the power whose patrols fly it. Design data, not saved: `worldLanes(world)` reads the system's own, `laneLegs` gives the legs where the stations are now.

**Old saves gain the new ports** (`save.ts`): loading a Sol world adds any port the design has and the save lacks, where its orbit puts it at the save's tick, and refreshes every port's market, ship mart, outfitting, runner, holder and rank from the design. Jason's server picks up all 25 on its next start with no save bump.

**Low and dug-in ports, reworked** (`burn.ts`): flying in to the Shell from the Exchange circled Earth for minutes instead of arriving, because with both the ship and the port inside Earth's clearance the route kept sending the ship back out to the circle. The rule now: a pass never asks a ship to be higher than it already is or than where it is going, so the clearance shrinks to the nearer end's own distance (and never below 1.02 radii, `BURN_SURFACE_MARGIN`). Leaving Slagline is a pass at Slagline's height, not a climb out; the Exchange to the Shell takes 38 seconds and never comes within 9,500 units of Earth's surface.

**The chart** draws the lanes as the mockup's wide, faint bands under everything, each named once on its longest leg. With 31 ports, names are placed best first, each at the first of a few spots beside its mark that is on the chart and clear of every name already placed and of the marks that matter (worlds, capitals and free ports, you): the nav target, then the Sun and planets, capitals and free ports, navy yards, other ports, moons, lane names. Zoom in and the rest appear. Capitals and free ports have a larger mark. A key along the bottom (ACCORD LANE, CAPITAL OR FREE PORT, PORT), which push 3 extends with security.

**Checked:** 31 tests in `sol.test.ts` (eight new: all 31 names; runner, holder and rank; every market good and ship-mart loadout exists; the five lanes with every stop a port and none in Calder; a burn from the Exchange to every port planned, none ending within 500 units of a surface; flying in to the Shell; an old six-port save gaining the 25 at their design positions; Slagline out and in never below the port). In Chromium on a fresh server: the board lists 32 rows; Tycho Port's card reads LUNAR OLD MONEY with MARKET, OUTFITTING, SHIP MART; the burn there arrived in 69 seconds; the chart's four views read cleanly. No page errors.

## As built: slice 2, push 3 (7 November 2026, Lead 9)

**The Relay** (`sim/src/relay.ts`, from `infrastructure.md`): buoys that each hear ships within 1.5 million units (`RELAY_RANGE`) and talk to each other within 40 million (`RELAY_LINK_RANGE`, long tight-beam links, so a remote port's one buoy still reaches the net). The Accord laid them: a ring of three, 200,000 units out, round every port on a lane and every navy base; a chain along every lane, one per million units, so the lane's line is always heard by two; a single buoy at each other port; none at the clans' ports (Hilda Moot, Triton Moot), none past Saturn but along the Gate Lane. 298 buoys, one network. Design data like the lanes (`worldRelays`), not saved; when relays become targets (parked) they move into the world. Each buoy has `down`, and everything takes the buoys as an argument, so a cut buoy already changes the reading (tested).

**Security from connectivity** (`relayNet`, then `securityAt(net, p)`): a live reading, never painted on.
- **Open:** no buoy hears you, or the ones that do are cut off from any of the holder's bases.
- **Contested:** off a lane, where two neighbouring ports near you (within 4 million units of you and of each other, `CLAIM_RANGE`) belong to different holders, or one belongs to nobody agreed. The Accord's peace holds on its lanes, so a lane is never contested; deep space between two powers' worlds is nobody's quarrel.
- **Core:** two or more buoys hear you, and the holder has a base within a five-minute burn (`CORE_BURN_SECONDS`).
- **Held:** covered and linked home, but thin (one buoy) or far from a base.

Who holds a place: the Accord within a million units of a lane (`LANE_CORRIDOR`), else the nearest port's holder within `CLAIM_RANGE`. Bases are capital ports, navy yards and depots (a new rank: the ECF Toll Station and MRN Gate Station); the Accord's bases are all four powers'. Free ports are not bases (the Accord has no ships).

What comes out, matching `sol.md`'s map without painting it: Core at the four capitals, the Inner and Ceres lanes, Ceres, the Earth and Venus neighbourhoods and the Gate Reach; Held at Bellows, the Boneyard, Vesta, Caloris, Eureka, Rimehold and Plume (one buoy each), along the Long and Gate lanes past Jupiter, and at Titan and Callisto (far from a base); Contested at Psyche Dig, the Ganymede Local and Haven Europa; Open at the moots, off the lanes and past Saturn. Off a lane the level never rises as you go out, and ends Open by 1.5 million units.

**On the chart:** each buoy's reach is a translucent circle in the colour of what it reads: Core teal, Held in the holder's colour (Earth blue, Mars red, Venus green, the Belt rust; the Accord's and nobody's a muted teal), Contested amber, Open not drawn. Circles of one colour are filled as one path, so overlaps do not stack, and the readings are worked out only when the ports move, so a frame is a handful of fills. Zoomed out a buoy's reach is a speck, so each port wears the mockup's dashed ring in its level's colour until its reach is 30 pixels across.

The first version sampled `securityAt` every 16 pixels and smoothed the image; it recomputed on every pan, and Jason found the chart stuttered (his suggestion: circles with transparent shading). Measured in headless Chromium with the CPU slowed four times, dragging the chart: sampled shading 93 ms a frame on average with 200 ms hitches; circles 53 ms, against 49 ms for the flight view with the chart closed. The chart now costs about 6 ms of that (about 1.5 ms on an ordinary machine). The header says YOU ARE IN CORE · THE ACCORD; the burn plan has ARRIVE IN (Hilda Moot: OPEN · NOBODY HEARS). The key covers the levels.

**Found on the way:** with a 5-million claim range the midpoint between Earth and Mars was Contested (both within range), and a 1.5-million lane corridor swallowed Jupiter's moons; disputes now need neighbouring ports, and the corridor is where two buoys still hear the line.

**Checked:** 7 tests in `relay.test.ts` (the buoys' layout, none at the clans' ports or in Calder; every lane heard by two along its whole length; one network; `sol.md`'s map port by port; the level never rising off a lane; cutting the buoys at the Exchange makes it Open, leaving one makes it Held; Bellows cut off from the net goes Open). In Chromium on a fresh server: YOU ARE IN CORE · THE ACCORD at the Exchange; ARRIVE IN for Hilda Moot, Psyche Dig, Titan and Ceres read Open, Contested, Held and Core; no page errors.

## As built: slice 2, push 4 (7 November 2026, Lead 9)

The last push of slice 2: Sol's traffic. NPC logic only; today's hulls stand in (the Manifest for traders, the Warrant for patrols, the raider for pirates) until the first fleet (Open Lanes step 2) swaps the loadouts under the same brains.

**NPCs burn** (`ai/travel.ts`, `burnRefusal` in `burn.ts`): a brain may ask for a burn in its decisions (`NpcDecisions.burns`); the step checks it exactly as it would a pilot's command and starts it. `travelTo` is the shared rule: burning, wait; far (the burn would be at least 1.5 times `BURN_MIN_DISTANCE`), clear the station just left and ask for a burn; near, fly in and dock as Calder's traders always have. Traders use it for every leg; patrols use it between the stations on their beats and can neither lock nor fight while burning. In Calder everything is near, so nothing there changes.

**The traffic** (`sol.ts`, `solSpawners`): 11 traders (two on the Inner Lane, one each on the Ceres, Belt, Long and Gate lanes, local runs round Earth and Mars, and three out to where the pirates are: Psyche Dig, Jupiter's moons, Hilda Moot); 5 patrols by navy (`WatchBrain.power`: the ECF between the Exchange and its L5 yard, the VSG between Thetis and Mercy, the MRN on the Inner and Ceres lanes, the UDF on the Belt Lane), labelled ECF PATROL and so on in flight; the three Ceres miners as before; 3 pirates.

**Pirates where nobody answers** (`relay.ts` `guardedStations`): a port's protected zone now holds only where the Relay reads Core or Held. At a Contested or Open port nobody comes, so pirates work up to the door, which is where the lore's interceptors wait (a burn ends close to its port, so with every zone guarded no arriving ship could ever be caught). In Calder every zone holds as before. The pirates' homes ride their ports' orbits 1,000 units further out: raiders at Psyche Dig and the Ganymede Local (Contested), the Black Strike at Hilda Moot (Open). The Ceres field is Core now, so its pirate has gone. Pirates never hunt a ship mid-burn.

**At burn speed ships do not ram each other** (`collision.ts`): a burning ship passes others as a near miss (the lanes are swept); it still hits worlds. Found in the soak: traders and a patrol burning into Ceres Accord Station, which sits on the rock ring, rammed and destroyed miners at thousands of units a second.

**Ship stats remembered** (`stats.ts`): the soak ran at 7.8 ms a tick with 26 NPCs (2.1 on `main` with 9), half the server's budget; 61% of it was `shipStats` working a ship's fit out from scratch, many times per ship per tick. It is now remembered by the ship's fit and hold objects, which are only replaced when they change: 2.4 ms a tick, identical answers. Calder and the Arena are faster too.

**Traffic on the chart** (`traffic.ts`, Jason: "a transponder broadcasts locally; if it is in range of the comms network it is relayed to the map; if not you don't see it unless you are in range of its own emitter"): a squawking ship is on your chart if a live buoy hears it, or if you are within its transponder's own range (`TRANSPONDER_RANGE`, 200,000 units); a dark ship never, unless it burns, when its plume shows with no name (sol-build.md: plumes are seen system-wide). The server sends each player in Sol their list about once a second as a `traffic` message (about 4.5 KB with today's traffic; older clients ignore it, so no protocol bump), apart from the per-tick view, which still holds only what radar sees. The chart draws each ship as a small triangle along its heading, coloured by role (traders and miners neutral, patrols white, pirates red, pilots ink, unknown plumes amber), named from its transponder, with a dashed line to where it is burning; marks move on by their velocity between lists. In Open space ships vanish from the chart.

**Checked:** 14 tests in `sol-traffic.test.ts` (a trader burns down the Belt Lane and docks; every NPC starts, no port short of pads (four traders and a patrol starting at Ceres had crowded out a miner, so start ports are spread); a VSG patrol burns its beat; all four navies patrol; every pirate's home reads Contested or Open; zones guarded only in Core or Held, all in Calder; a pirate hunts at an unguarded door but never a ship mid-burn; burning ships do not ram; remembered stats equal worked-out stats and follow cargo and fit; an old save drops the Ceres pirate with its ship and gains the traffic; the traffic rule's four cases). A 15-minute soak of all of Sol: every trader and patrol burned, arrived and docked, both port pirates found prey, no ship lost, none into a world, 2.6 ms a tick. In Chromium: 40 traffic messages in 40 seconds, the MRN patrol and a miner on the chart by name, a trader's burn drawn to Tycho Port, no page errors.

## Decided (Jason, 7 November 2026)

- **Burns route round a world in the way automatically**, the bend and its extra time shown on the chart before you burn (slice 2).

- **The local view shows ships and stations at their real size, and no planet** (Jason, after the first mockup): where a pilot flies, docks and fights, ship and station have actual size and detail; the body a station orbits is not on screen. Bodies are places: on the chart, and on screen only where a pilot has business with them (skimming a giant's or Venus's air, a station dug into a rock, falling too low), reached by navigating to them. This replaces `sol.md`'s "a planet's limb fills the screen" for the flight view; bodies stay enormous on the chart and in their own neighbourhoods.
- **Physics stays local to the ship.** Orbits run on rails (planets too slowly to see in a sitting, stations round their worlds in hours); gravity bites only near a body's surface, steep enough that diving too low is fatal; between and around worlds bodies can be ignored.

- **Sol starts fresh.** The Calder save is kept as a backup file beside the new world; characters and keys are kept; ships and credits reset.
- **A plotted burn.** Pick a nav target and press burn: the ship turns, burns, flips and brakes to arrive at rest; cancellable, and cancelling leaves you coasting fast. No manual burn for now.
- The numbers (sizes, distances, crossing times) are the lead's; Jason sees them in the mockups before they are built.
