# Navies as a system

Status: first write, 7 November 2026, from Jason's direction. The navy is primarily the NPCs' realm: it is what powers conflict and crime, and what law enforcement escalates with. This page says how each navy operates in game terms, reusing the systems that already exist or are already planned (`design.md` "Stations and security", `system.md` "The Calder Watch", `roadmap.md` milestone 7 Law, `interface.md` transponder). The hulls are in `fleet.md`; the history is in `lore.md`. Everything here is for the lead to map onto code when milestone 7 comes; nothing is needed before then.

## What already exists, and what this page builds on

| Existing | Where | How the navies use it |
| --- | --- | --- |
| Security zones round stations (`securityRadius`) | `design.md` | Station security's reach. Unchanged. |
| The Calder Watch: a port's own patrol flying a beat in ordinary beatable ships | `system.md` | The model for every patrol. The Watch becomes the holder's navy patrol on a beat. |
| Witnessed crime: nothing auto-flags; it counts if seen or if a distress call reached someone in time | `design.md` | The trigger for every response. The navy only knows what was witnessed. |
| Reputation as a record, standing with NPC factions | `design.md`, roadmap 7 | Standing with each power is what the navy checks before it helps you or hunts you. |
| Transponder: showing or running dark (`Ship.dark`) | `interface.md` | Dark in the wrong place is the commonest reason to be stopped. |
| Distress beacon | `design.md` | The call that brings the patrol, if it likes you. |
| Escalating security response: local watch, then its reserve, then the holder's navy, thinner farther out; no galactic police | roadmap 7 | Kept exactly. This page names the steps and who flies them. |
| Pirate brain: detection range, hunts outside security zones, turns on whoever shoots it | `design.md` | The mirror. Pirates escalate too. |
| Sector security bands (core, fringe, null) | `design.md` | Mapped onto influence below. |

## What the pivot changes

The old rule was: local system law enforcement, weak but responsive, based on standing; it defends you if it likes you and you raised a distress beacon, then escalates as required. That rule stands, with one change of ownership. There is no separate local law in Sol: the local law is the holder's navy patrol, flying a beat in that power's space, and a station's own security inside its zone. Outside Sol, who holds a system decides whose patrol it is, how many there are and how fast they come; where nobody holds it, there is no law and the pirates know it.

## Security by influence

Sol is the first system built and it is alive. Within Sol the levels vary by region (Core round the capitals and on the Accord lanes, Held and Contested farther out, Open past Saturn); `sol.md` maps them. Later systems take a security level from the owning power's influence, which is where the conflicts between Earth, Mars and the Belt happen.

| Level | Where | Who is there | Response |
| --- | --- | --- | --- |
| **Core** | Sol: each power's home volume, the capital ports, the lanes between them | Station security, beat patrols on every lane, a reserve at every major port, the navy within an hour's burn | Fast and heavy. A witnessed crime brings a patrol in minutes and it does not stop coming. |
| **Held** | A system one power clearly holds | Beat patrols on the main lanes, a reserve at the capital port only | Patrols come; the navy comes for big things, late. |
| **Contested** | A system two powers claim, or a Marches system with a thin presence | One or two patrols, no reserve, two navies watching each other | Slow and thin, and the two sides may be busier with each other than with you. Skirmishes happen here. |
| **Open** | Nobody's | Station security where there is a station, nothing else | None. Distress beacons reach nobody who will come. |

Calder as built is a Held system with one Watch and three ports, which is why one Warrant on a beat is enough.

## Who turns up

Five rungs, each flown by the hulls in `fleet.md`. The rung reached depends on the level above, on what was witnessed, and on how long it goes on.

| Rung | What it is | Earth | Mars | Venus | The Belt |
| --- | --- | --- | --- | --- | --- |
| 1 **Station security** | The station's own PDCs and a pair of security craft, holder's livery; never leaves its zone | Vantage Foils, civilian grade | Arcadia Fighter Mk V | Ishtar Hathors with a Solace Stretcher | Militia Dirk refits |
| 2 **The patrol** | The local law: a pair on a beat between the ports, answering beacons | Two Kessari Warrants (Toll pattern on the gate beat) | Two Seraphine Phobos | A Lakshmi and a Sedna | A Union Blockade and a Wildcat |
| 3 **The reserve** | A frigate or destroyer group that burns from the nearest major port | An Injunction with two Citations | A Resolve and a Constancy | A Maat | A Boycott and two Wildcats |
| 4 **The navy** | A cruiser group: the power has decided to end it | A Statute, a Verdict, escorts and a Mandate's fighters | A Valles and two Constancies | A Maxwell and an Aphrodite (rescue first, even now) | A Solidarity and a Walkout |
| 5 **The hunting group** | Special operations: a watcher, a hunter, strikers. Only for the wanted, only when the navy is sure where you are | Summons, Custody, Sentences | Noctis, Cerberus, Medusae | Hecate, unacknowledged | Vanes and Shades, burning in |

Thinner farther out: Core has all five, Held has one to four, Contested one to three and slowly, Open none.

Fighters carry the bulk of the weak response: rung 1 is fighters in the station's livery almost everywhere, and most pilots will shoot a station's fighters before they ever see a patrol boat. For the lead, when tuning: the weak response has to be beatable by a Tern with some skill, and losing it should cost the station, not the power.

## Escalation

What is witnessed decides the rung; time and persistence climb it. A response ends when you leave the system, dock and pay, are caught, or die. Everything is ordinary beatable ships until rung 5.

| Witnessed | First rung | Climbs to | Notes |
| --- | --- | --- | --- |
| Running dark in a Core volume | 2, a hail and a scan | 3 if you run | In Held space the patrol hails when it meets you; in Contested and Open nobody cares. The commonest stop. |
| Refusing a scan, or contraband found | 2, a fine or seizure | 3 if you run | Contraband is defined by the holder, so the same hold is legal in the Belt and not on Earth. |
| Firing on a lit ship | 2 | 3 | Witnessed means seen by a patrol, a station, or any ship whose distress beacon reached someone in time. |
| Killing a ship | 3 | 4 | A record entry against the hull (below). |
| Killing a pod | 4 | 5 | The Mercy Clause. The one crime every power pursues, including Venus. |
| Firing on a navy hull | 3 | 4, then 5 if it continues | The patrol stops hailing and calls the reserve. |
| Deserting a navy licence | Nothing at once | 5, in that power's space, once wanted | The ship is yours. The power's patience is not. |

**The distress beacon.** Any ship can raise one. The patrol answers in proportion to the raiser's standing with the holder: a pilot the power likes gets the pair at full burn; a stranger gets a hail; a wanted hull gets nothing, or a scan. Raising a beacon also makes the attack witnessed, so the attacker's record grows whether or not help arrives in time.

## Rules of engagement

- The navy never shoots pods. Ever. It is the one rule all four share, and the Hollow Choir is hunted for breaking it.
- The navy never fires first on a lit transponder. It hails, it scans, it orders a stop, and it fires if fired on or if the stop is refused twice.
- A dark ship gets one hail. Then it is a suspect and the patrol closes to scan range with weapons hot.
- A surrender (weapons cold, engines off, transponder lit) is accepted: a boarding, a seizure of contraband, a fine, and a record entry. Mars boards; Earth fines; Venus checks you for injuries first; the Belt takes a cut.
- The navy does not pursue across a gate unless the hull is wanted at rung 4 or above. Patrols stay on their beat.

## Wanted

- A wanted status follows the **hull first** (its Ceres Registry id and the record attached to it) and the **pilot second**. Patrols scan hulls, not faces. A fresh hull bought used carries its own history and none of yours, which cools you down a great deal; your own record still counts with the power that holds it, and a scan that matches pilot to hull warms it back up.
- The record is per power. Earth does not care what you did to Mars, unless it was a pod.
- It is not omniscient. Being wanted does not mean everyone knows where you are. It means the next patrol that scans you knows what you are, and in Core space that is soon.
- **Amnesty is always purchasable**: a fine through the Ceres Registry at a port of the power concerned, scaled to the record, and the record is cleared for that hull. **Working it off is possible**: bounties, escort duty, or navy work for that power, each entry cleared by a job done.
- Bounties: a wanted hull at rung 3 or above has a price on it that any pilot with standing can collect. That is how a pirate becomes a bounty (`design.md`).

## Stop and scan

The interaction most pilots meet most. A patrol that hails you wants one of: your transponder lit, your hold scanned, a toll paid, or you gone from its beat. Comply and you lose a minute; bribe (Earth and the Belt, never Mars, Venus has nothing to sell) and you lose credits; run and you have started the table above; fight and you have skipped to rung 3. Scans find contraband, stolen hull ids, and the pilot-to-hull match that warms a cold record.

## Task groups

The recipes the navy flies in. Navies buy civilian hulls as sold for everything that does not shoot: tankers, tenders, transports, rescue, survey, in navy livery with a Navy registry flash and no Navy tag.

| Group | Job | Composition | Civilian hulls in it |
| --- | --- | --- | --- |
| Beat patrol | The local law | Two patrol boats, or a patrol boat and a corvette | None |
| Gate picket | Watching a gate | A corvette, running dark at a distance | None |
| Convoy escort | Shepherding traders | A frigate and two corvettes round three to six haulers | The haulers themselves (Tessaract, Arcadia, Meridian) |
| Response group | The reserve | A frigate or destroyer and escorts | A Solace Stretcher behind it (Venus always; others sometimes) |
| Blockade | Holding a lane or a gate shut | A destroyer, two patrol boats, a tanker | A Tessaract tanker as the fuel |
| Cruiser group | The navy | A cruiser, a destroyer, escorts, a carrier's fighters | A fleet tender (Tessaract Manifest in navy livery), a Solace hospital hull |
| Hunting group | Special operations | A watcher, a hunter, two to four strikers | None |
| Supply run | Keeping the above fed | Navy-liveried freighters with a patrol escort | Tessaract Waybill and Manifest, Arcadia Freighter Mk II (Navy pattern), Meridian Gull shuttles |

## Each navy's operations

**Earth, the Charter Fleet (Kessari).** Operates by contract: the toll patrols are a revenue service with guns, and the Charter Fleet proper is held back for things that threaten revenue. Beat patrols everywhere in Earth's volume, dense and bureaucratic: a stop is a scan, a toll and a receipt. Fines over boarding. Sells its civilian grade openly and its retired marks by contract, so half the Marches flies Earth hulls against Earth patrols. Buys Tessaract hulls for everything that carries. The quiet contracts (special operations) are never acknowledged.

**Mars, the Martian Navy (Seraphine).** Disciplined and dutiful. Fewer patrols than Earth and every one of them means it: a Martian stop is a boarding, not a fine. Convoy escort is doctrine; Mars does not let its traders fly alone. The reserve is the best in known space and arrives in formation. Sells civilian grade to Martians only and releases retired marks only once the replacement is in service. Buys Arcadia hulls for everything that carries, in Navy pattern, and nothing from anyone else. Open about its special operations and still in rust.

**Venus, the Coastguard (Ishtar, Solace).** Neutral, and the Mercy Clause binds it: rescue first, arrest second. A Venusian patrol answers a distress beacon from anyone, including the pilot who caused it, and treats the pod as the first priority at every rung. Light on guns by choice, the heaviest thing it admits to is a destroyer, and it sells search and rescue hulls and kit to every other navy. Checks you for injuries before it checks your hold. One hunter it cannot account for.

Not toothless. Venus's restraint is towards the other navies, not towards pirates or pilots. Inside its own volume and round its Havens the Coastguard climbs the ladder like anyone else: Hathors and a Stretcher, then a Lakshmi and a Sedna, then a Maat, then a Maxwell with an Aphrodite behind it, and for a pod killer the Hecate. The railguns are real and the regen mix makes a Coastguard hull hard to finish. The Hollow Choir, which preys on pods, is the faction Venus hunts hardest.

*Territory.* In Sol, Venus holds Venus, its cloud cities, its orbit and its capital port, at Core security. Beyond Sol it takes no systems. Its territory is its stations: Havens (Solace's rescue stations) and free ports under the Ceres Accord, placed by treaty in Contested and Open systems because nobody else can hold them. Each is a Venusian security zone with Hathors and a Stretcher on the pads, a Lakshmi at the dock, and a response that goes no further than rung 3 against another navy and as far as it needs to against pirates. A Haven is where a system's wounded go, where pods come back, and where both sides of a sovereignty struggle can trade, so the power that burns one loses the Mercy Clause and everyone's goodwill. A Venusian system is a system with a Haven in it, not a system Venus owns, and the struggle for it happens around Venus rather than against it. Venus fights for its own volume, its Havens and its convoys (medical, liners, the SAR hulls it sells), and nowhere else by choice.

**The Belt, the Union Militia (Union Defence Works).** A rota, not a fleet: cooperatives and clans contribute ships and crews on shifts, in rebuilt hulls to the Union pattern that never retire, holding lanes rather than patrolling them. The Militia tag is a shift, not a possession: on rota a Belt hull carries it and the hazard stripes; off rota it goes home in cooperative colours. Weak and responsive, the old rule in its purest form: the Militia will defend you if the cooperative likes you, and it takes a cut from anyone it stops. Who answers depends on which cooperative holds the station and which clan is nearby. Stops Earth toll boats on principle. No special operations drives; the clans supply watchers and strikers who burn in. Buys nothing: Belt Forge, Rook and Rivet and captured hulls do the carrying.

## Between the navies

No open war in 240 GW. Earth and Mars are mostly hostile: they shadow each other's convoys, contest the same Marches systems, and skirmish there sometimes, patrol against patrol, deniable afterwards. Venus is neutral and mediates. The Belt and Earth quarrel over tolls and the Militia stops Earth's toll boats where it can. In a Contested system the player can stumble into a skirmish, sell to either side, or use one navy's attention on the other. Navies never fight inside Sol's Core volumes; the Ceres Accord holds there, and everybody's capital port is in range.

## Bases

Ships come from somewhere and go back. Each power has one enormous capital port in Sol (the reserve and the navy live there), depots at its held systems' main ports (a patrol pair and fuel), and nothing in Open space. Response time is the burn from the nearest base that has the rung you triggered, so a system's security level is really a statement about where its bases are. Pirates base the same way: a fence or a hidden dock, with the same burn-time logic in reverse.

## For the lead, when milestone 7 comes

In order of dependency, each reusing what exists:

1. **Security level** per system, from the holder's influence (Core, Held, Contested, Open); Calder is Held.
2. **Patrol beats** as the Calder Watch already flies, with the holder's hulls, two per lane in Core, answering distress beacons by standing.
3. **Witnessed crime** as designed: a record entry against the hull's Registry id, with the pilot as a second key; per power.
4. **The rungs**: station security (zone), patrol, reserve, navy, hunting group, each a task group spawned at the nearest base that has it, with a burn time; the rung from the escalation table; ends on leave, dock and pay, capture or death.
5. **Hail, scan, stop**: a hail state on contact, a scan at range, a stop order, contraband by holder, fines and seizure, bribes where the power takes them.
6. **Rules of engagement** as flags on the patrol brain: never pods, never first on a lit transponder, one hail for dark.
7. **Wanted** from the record: bounty at rung 3, amnesty as a Registry fine, work-off as jobs that clear entries.
8. **Inter-navy stance** per pair of powers (hostile, cool, neutral, allied), only used in Contested systems.

## Later: sovereignty

Jason's thinking, 7 November, not yet designed: the systems beyond Sol end up a perpetual sovereignty struggle between the powers, and the security level above is the live read-out of it. The player interacts with it from wherever they stand: navy pilots find it is basically their job (patrols, escorts, responses, holding a system); independents get paid around it (transporting people and materials, collecting resources, exploring unexplored or enemy-held systems). Comes later. Two things to hold to now so nothing written contradicts it: influence is dynamic, so a system's level can change; and navy duties are sovereignty work, not errands. Venus does not take part as a claimant: its Havens sit inside other powers' struggles and its influence is the ports (see "Each navy's operations").

## Open

- Contraband lists per power.
- Fine and bounty scales.
- How fast a cold record warms on a pilot-to-hull match.
- Whether station security ever leaves its zone to answer a beacon (proposal: no).
- Pirate factions' mirror of this page: what each flies, how it forms up, how it escalates. To write next.
