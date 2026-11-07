# Infrastructure

Status: canon for the game, written 7 November 2026 by the lore chat (`ws/lore`) from Jason's direction. How ships talk across a system, how far they fly, and the infrastructure that decides how safe a place is. Numbers (ranges, coverage radii, response times, tank sizes) are the lead's. Related: `navy.md` (security levels, rungs, escalation, distress), `lore.md` ("The transponder", "Law enforcement", Witness Law), `sol.md` (the map), `materials.md` (where fuel comes from), `fitting.md` (tanks and scoops as modules), and the lead's pending fuel note in `coordination.md` (4 November), which this page answers on the lore side.

## The idea in one paragraph

Security is connectivity. A place is safe because it is wired: relays carry the distress call, the witness record and the patrol's orders, and the holder's bases put ships behind them. Where the Relay is dense and the holder's bases are close, help comes fast, crimes are recorded and pilots recover quickly. Where the Relay is thin, help is slow and records are lost. Where there is none, nobody hears anything and nothing that happens there is a crime in law. The Relay is physical, so it can be built, cut, jammed, defended and taken, and that is how security changes, most of all away from Sol.

## The Relay

**The Accord Relay Network (ARN)**, "the Relay": a chain of relay buoys along the lanes, round the stations and through the fields, run in Sol by the Ceres Accord and paid for out of Earth's tolls. On the Relay, messages, prices, contracts, bounties, distress calls and witness records move at once, because the game compresses distance and light-speed is effectively instant across a covered region.

- **Off the Relay**, a ship talks only to what is inside its own comms range: ship to ship, or to a station's own transmitter. Nothing reaches anyone else.
- **Between systems, the gates carry the signal** (`lore.md`: the Lattice passes signals as well as ships). A system's Relay joins the next system's through the gate; a sleeping or broken gate is a dead line.
- **Relays are named like everything else** (`sol.md` naming rule): an Accord buoy squawks `ARN [lane or region] [number]`, for example `ARN Inner Lane 014`. A power's own buoy outside Sol squawks its navy's prefix (`MRN Relay`, `ECF Relay`), a Belt cooperative's squawks `UDF Relay` or its cooperative's name.

### What rides on it

| Traffic | On the Relay | Off it |
| --- | --- | --- |
| **Distress beacon** | Reaches the holder's patrol and every ship in coverage; the response follows `navy.md` (standing, rung, burn time from the nearest base) | Reaches only ships inside the caller's own comms range. Nobody official comes |
| **Witness record** | Uploads to a certified log at once; the crime is on the record | Held in the witness's own log until the witness reaches coverage. If the witness dies or is jammed first, the crime never happened in law |
| **Wanted and amnesty** | Wanted status follows the hull wherever the Relay reaches | A wanted hull is unknown until it enters coverage or is scanned by someone who carries the record |
| **Market prices, contracts, bounties** | Live at every covered station | Last known: an off-Relay station's prices are as old as the last ship that carried them in |
| **Survey data, charts, sightings** | Sold and shared live | Worth only what you can carry back |
| **Patrol orders and fleet beacons** | Instant | A navy fleet off the Relay acts on its last orders |

### Witness Law, sharpened

Under the Ceres Accord only a certified log counts as a witness (`lore.md`). The Relay is how a log is certified: **a witness record counts when it reaches the Relay**. So:

- In Core and Held space a crime is on the record the moment it is seen.
- In Contested space it is on the record if the witness reaches a working relay, which pirates know, and which is why they hunt witnesses, cut relays and jam.
- In Open space it is on the record only if the witness survives to carry it home. A chase after the fact is a real thing: the pirate wants the witness dead before it reaches coverage; the witness wants to burn for the nearest buoy.
- **Jamming** (the Null Ledger's trade, `lore.md`) blocks a ship's uplink in its range: a jammed witness cannot upload, a jammed distress call goes nowhere. Jamming itself is a crime, if anyone records it.

### The Relay as a target

Relays are hulls with transponders: small, unarmed or lightly armed, repairable, destructible.

- **Cutting** a relay drops coverage in its radius until it is repaired or replaced, and so drops the security of that region (below). Pirates cut relays before a raid; a navy cuts a rival's to blind it.
- **Jamming** a relay blinds it for as long as the jammer sits in range.
- **Taking** a relay (outside Sol) reflags it: its records and its coverage serve the new holder.
- **Repairing and building** relays is a profession: relay tenders (Tessaract builds the Accord's in Sol under contract; navies and cooperatives build their own elsewhere), paid by the holder.
- **In Sol**, attacking an Accord relay is a crime against all four powers and every navy answers. Sol's Relay is the most protected infrastructure in known space, which is why Sol's security barely moves.
- **Away from Sol** the Relay is the thing a sovereignty struggle is fought over (`navy.md`, "Later: sovereignty"). Who owns the relays owns the record, the distress calls and the response: holding a system means holding its Relay.

## Security from connectivity

The levels in `navy.md` (Core, Held, Contested, Open) stand. What sets a region's level is its **connectivity**: how much of it the Relay covers, how many links lead back to the holder, and how far the holder's nearest bases are (`navy.md`, "Bases"). The level is a live reading, not a label: it drops when relays are cut and rises when they are built.

| Level | Relay | Bases | Response | Recovery |
| --- | --- | --- | --- | --- |
| **Core** | Dense and redundant: every lane, station and field covered, several paths home | The holder's capital port or a major port within a short burn | Fast and heavy; the patrol in minutes and the navy behind it | Pods recovered at once; tows and repair a call away; insurance pays |
| **Held** | The lanes, the stations and the main fields; one path home | A depot in the system | Patrols come; the navy comes late | Pods recovered; tows on contract |
| **Contested** | Patchy, and two holders' nets overlapping or fighting | Thin or none, and two navies watching each other | Slow and uncertain; depends whose relay heard you | Pods recovered if someone's relay heard them |
| **Open** | None, or a few dead buoys | None | None. Nobody hears | A pod drifts until a passing ship finds it; nothing is on the record |

Within Sol the map in `sol.md` already follows this: Core where the Accord lanes and the capitals are, Held round the outer bodies, Contested where nets and claims overlap (the inner Belt's ore rights, Psyche, Ganymede), Open past Saturn and off the lanes where the Accord never laid buoys. Beyond Sol, a system's level comes from the Relay its holder has built and kept, which is exactly what gets fought over.

## Fuel and range

Answers the open fuel note in `coordination.md` on the lore side; the design pass and numbers are Jason's and the lead's.

- **One fuel: hydrogen.** Reaction mass and fusion fuel in one good, so range is one number a pilot plans around.
- **Tanks** are modules with mass and capacity (`fitting.md`); some hulls carry built-in long-range tanks (the Manifest's Deep-space pattern, the Halden Expedition, the Saro Farwalker). Fuel has mass: a full tank is a slower ship.
- **The shape of range in Sol** (numbers are the lead's): a light or medium hull crosses the inner system, Venus to Mars to Ceres, on one tank; Jupiter needs a top-up (Callisto Freight Depot exists for it); beyond Saturn needs long-range tanks or a tanker (Titan Free Port is the last full fill before the Gate Lane).
- **Where fuel comes from:**
  - Station markets: cheap in Core, dear off the lanes, absent in Open.
  - Ice, refined to hydrogen (Rimehold, Plume, Bellows; any refinery ship or command ship in the field).
  - The giants' air, skimmed and refined. The skimmer carriers (Lavinia Cyclone, Corvane Still) are a fleet's fuel station as well as its gas works.
  - Stars, scooped (below).
- **Running dry:** the ship drifts on what it has. Then the pod, a tow (a Grebe, a Shunt, a Tug Mk II, called over the Relay and paid), or the VSG. Off the Relay nobody hears the call: an explorer who runs dry in Open space is waiting for luck. Tugs and rescue are real professions because fuel runs out.

### Star scooping

Allowed everywhere, Sol included; it matters beyond Sol.

- A **fuel scoop** (module) skims hydrogen from a star's corona. The price is heat: the closer and longer, the more the hull and shields take, and a ship that stays too long cooks. Bigger, hotter stars fill faster and hurt more.
- **In Sol** it is legal and rarely worth it: fuel is cheap at every station, and the Sun's corona is inside Mercury's glare. Pilots try it once, near Corvane Caloris Foundry, and remember it.
- **Beyond Sol** it is the explorer's lifeline: off the Relay there are no stations, and a star is the only pump. It is what lets a Query or a Farwalker go far past where anyone could rescue it.

## Death, pods and the Return

The lore is `lore.md`, "Death and the Return". What it needs from the systems:

- **Ship death** ejects the pod (Meridian Ark, `fleet.md`). A pod that survives flies home: no Return, no Fade, the ship and its cargo lost.
- **Pod death** is the Return: the pilot wakes at their home station's Registry clinic. Lost with the ship: cargo, and the ship's log (witness records, charts, survey data, evidence) except what already reached the Relay.
- **Reach**: a Return works only where the Lattice reaches (Sol and gate-joined systems). The pilot's Fade narrows it further: from anywhere, to near a woken gate, to well-connected space, to Core only. A pod death outside the pilot's reach is final.
- **The Fade** is a pilot value that only goes one way, except by Aurel retuning. The cost per Return is small early and climbs; the count is in the dozens. Visible on the Registry scan as a rough reading, never a precise number.
- **Costs** per Return, all the lead's to tune: time in the clinic (longer as the pilot fades), a Registry fee, insurance only in covered space.
- **Late warnings**: in the last few Returns, comms whispers, sensor ghosts and a phantom contact on the board. Never a stat change.
- **Ironman**: a pilot flag set at creation; the first pod death is final.
- **The Voiced**: a pilot flag set by the Aurel arc; the Fade stops and Returns always work; the transponder reads as unknown; one or two Aurel ships granted.
- **NPCs**: returner NPCs (some navy pilots, some pirate captains) fade by the same rules, which gives veterans a reason to be careful; everyone else dies.

## The other infrastructure

- **Approach control.** Every station runs an approach zone on its own transmitter. In Core and Held space: docking clearance, a speed limit inside the zone, transponder on. Breaking them is the cheapest crime and the commonest patrol stop (`navy.md`, "Stop and scan"). Belt stations ask nothing and say so.
- **Tolls.** Earth charges at the lane ends in Core (the ECF Toll Station at the gate, Earth's ports on the Inner Lane). The tolls pay for the Accord's Relay in Sol. Running dark to dodge a toll is legal in the Belt and suspicious everywhere else.
- **Supply.** Stations consume water, food, fuel and parts and post demand over the Relay. That is the economy's hook into freight, ice and gas without new systems; an off-Relay station's demand is only known when someone visits.
- **Pads and docking** follow the weight bands (`fleet.md`): a capital cannot dock at a small station; it holds off and sends shuttles.
- **Charts.** Survey data is a good. Halden and the Saro sell routes, rock maps and relay maps; an off-Relay region's chart is as old as its last survey.
- **Crew consumables** (air, water, food) wait for crew (`lore.md`, "Crew": a direction, not yet a system).

## For the lead

- **Relay nodes** are an entity: position, coverage radius, owner, health, jammed state, link to the network. A region's coverage is the union of live nodes linked back to the holder; the holder's network is joined between systems by awake gates.
- **Security level** per region is computed from coverage, redundancy (paths home) and distance to the holder's bases, and updates live when a node dies, is jammed or changes owner.
- **Distress** propagates only through coverage; off it, only to ships in the caller's own comms range.
- **Witness records** are held in the witnessing ship's log until uploaded through a live node; a record is lost if the ship dies first. Jamming blocks the upload in the jammer's range.
- **Market data** at an off-Relay station is a snapshot updated by visiting ships.
- **Fuel** as in the coordination note: one good (hydrogen), tanks as modules with mass, burn by throttle and engine draw, sold at markets, refined from ice and gas, scooped from stars with a heat cost.
- In Sol, build the Accord's Relay dense on the lanes and round stations, thin off them, none past Saturn except the Gate Lane, so the map in `sol.md` reads out of it rather than being painted on.

## Open

- [ ] Numbers: coverage radius, comms range, tank sizes, burn rates, scoop heat (the lead).
- [ ] Whether a pod has fuel; whether flight assist burns fuel (from the coordination note; Jason and the lead).
- [ ] Who may build relays in Sol beyond the Accord (proposal: nobody; Sol's Relay is the Accord's alone).
- [ ] Death: whether Ironman pilots share the persistent world; whether an Aurel retuning is partial or whole (the Voiced as written are whole); the Fade count and curve (Jason and the lead).
