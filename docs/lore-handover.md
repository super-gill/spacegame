# Lore handover: the Sol pivot and everything since

The one page for the lead. Started 7 November 2026 by the lore chat; kept current as the fleet is finished (a dated line in "Changes" for each session that adds something). It tracks the final decisions, the new content, the capabilities, and the intentions, and says where each lives. Where it and an older page disagree, this page and `hull-terms.md` win; `lore.md`'s Decisions list is the chronological record.

## What to read, in order

1. This page.
2. `hull-terms.md`: what every fleet word means in mechanics, and the fields and systems it implies.
3. `hulls.md`: one row per hull, generated from the registry. The per-hull handover.
4. `navy.md`: the navy as a system: security by influence, rungs, escalation, rules of engagement, wanted, stop and scan, task groups, each navy's operations, bases, sovereignty later.
5. `t3-capabilities.md`: the special operations abilities specified against existing systems, with tunables.
6. `fleet.md`: every builder and hull, grids, patterns, legacy, Belt lineage, weight bands, style and art direction, independents, Union pattern, the T3 line, five routes to a warship.
7. `lore.md` (canon: setting, history, law, weapons, companies, pirates, names, decisions) and `races.md` (the power and company summary the code is built against).
8. The ship registry page (Jason's artifact, Version 24 at the time of writing) for the art: 71 of 121 hulls drawn.

Nothing in these is needed in code before milestone 7 (Law) except what is already built. They exist so the lead can build around the hulls and the navies without re-deriving them.

## The setting, settled

- **Sol.** Humanity grew up in Sol. Four powers: Earth (with Luna; the Kessari Combine is Earth's trading bloc), Mars, Venus, the Belt. The Belt found the gate; the Gate War (6 to 9 GW); the Ceres Accord (9 GW: Witness Law, the Mercy Clause, Open Lanes; the Ceres Registry licenses pilots and outfits). Present about 240 GW.
- **Law is local and escalating.** No galactic police. Station security in its zone, then the holder's navy patrol, reserve, navy, and special operations. Detail in `navy.md`.
- **The Lattice and the Aurel** are unchanged from the pivot write-up: fully alien, receded, a horizon. The gate-born drive (below) is the one piece of Lattice material in human hands.
- **Physics and map:** EVE-style system collections joined by gates; current Newtonian physics; burn/flip/burn with interception; no in-system FTL except the gate-born jump; planets huge and never landable; shields stay.
- **Weapon families and tanks:** Earth missiles and shields; Mars energy and armour; Venus hybrids and a regenerative mix; the Belt projectiles and whatever tank the hull came with.
- **Pilots:** origin (Earth, Mars, Venus, the Belt) and background (navy reservist, miner, hauler, more later), not careers. Crew is a later system, costs and risks only.

## The fleet, settled

- **Tiers.** T1 legacy and retired navy; T2 production and pattern; T3 special operations and clan. Tier is price and rarity; generation is what the hull is. (`hull-terms.md`)
- **Navy is a tag**, not a generation: better stats. **Grade** is a state on the owned ship: Navy or civilian on current corvettes, patrol boats and light fighters; frigate and above and heavy fighters Navy only; Militia or cooperative on every Belt hull, by rota; none on independents, legacy and clan hulls. A civilian-grade ship upgrades with the licence. Mars sells civilian grade to Martians only.
- **Retired navy marks are sold whole**, Navy tag intact, expensive. Demilitarised surplus is retired as an idea. Venus pulls the guns before sale; the tag stays.
- **Patterns** are T2 stat variants behind standing or a licence, not new bodies. The pattern grid is in `fleet.md`.
- **Independents.** Meridian Yards and Corvane Heavy Industries: no flag, Registry-licensed, Accord free ports, civil and combat hulls for anyone at any size, no tag, no licence. Meridian cheap (Kite, Harrier, Osprey); Corvane pricier (Warden, Bulwark, Foreman). Paragon Arms stays modules only.
- **The Belt's military.** The Union Militia is a rota; Union Defence Works is a refit shop; the Union pattern is a Militia standard applied to captured, bought or copied hulls (Wildcat over a Notice, Blockade over a Writ, Boycott over a Decree, Walkout over a Ruling, Solidarity over a Statute-generation cruiser, Dirk and Cutlass refits), sold only in the Belt for cooperative standing. The clans are the Belt's T3 (Vesk Vane and Shade; Saro and the Long Wake for exploration and recovery).
- **Fighters follow the navy rules.** Vantage (Earth: Foil, Sabre; retired Dirk, Cutlass), Arcadia (Mars: Fighter Mk V, Heavy Fighter Mk II; retired Mk IV, Mk I), Ishtar (Venus: Hathor; retired '221). The Solace Stretcher is a heavy SAR fighter sold to every navy, generic by design. Fighters carry the bulk of the weak first response.
- **Venus** is light on guns by choice, not toothless: it climbs the whole ladder against pirates and pilots and restrains itself only towards navies. Its territory is Venus itself and its stations (Havens and Accord free ports) in other powers' systems; it is not a claimant in the sovereignty struggle.
- **Five routes to a warship:** navy licence; independents; retired navy; Union pattern; clan hull. (`fleet.md`)
- **Weight bands and the rating tag** `[weight]-[function]`; radius ranges per band; art direction (no basic shapes or triangles, detail, colour by role, company and power, mounts visible). (`fleet.md`)

## Special operations: the T3 line

- Three roles, one per hull, each a hull ability: **watcher** (fast, cold, holds a lock that is a jump target), **hunter** (jumps onto the lock, lands close, pins the target until the fleet arrives), **striker** (jumps in behind, one devastating pass, committed). Stealth is the line's theme, not a hull.
- **Jump:** in-system only, needs a jump target (watcher's lock, fleet beacon, station beacon), loud arrival, long cooldown, gate-born drive, single digits per power, banned under Open Lanes.
- **Who fields what:** Earth Kessari Summons, Custody, Sentence; Mars Seraphine Noctis, Cerberus, Medusae; Venus Ishtar Hecate (hunter, unacknowledged); the Belt Vesk Vane and Shade (no drives).
- The abilities as mechanics, with tunables: `t3-capabilities.md`. The hunting group as an NPC task group: `navy.md` and `t3-capabilities.md`.

## The navy as a system (summary; `navy.md` is the page)

Security by influence (Core, Held, Contested, Open); five rungs with each power's hulls; escalation by what was witnessed, ending on leave, dock and pay, capture or death; rules of engagement (never pods; never first on a lit transponder; one hail for dark); wanted follows the hull first and the pilot second, per power, not omniscient; amnesty always purchasable, work-off possible; stop and scan as the common interaction; task groups with civilian hulls in navy service; each navy's character; no open war, Earth and Mars mostly hostile with skirmishes in Contested systems; bases decide response time.

## Intentions (direction, not yet designed)

- **Sovereignty.** Systems beyond Sol are a perpetual struggle between Earth, Mars and the Belt; navy pilots do it as their job, independents get paid around it; influence is dynamic so security levels change. Venus is not a claimant.
- **Crew** as a system (costs and risks), with subcraft pilots as crew.
- **The pirate factions' mirror** of `navy.md` (what each flies, how it forms up, how it escalates): next lore write after the fleet.
- **Civilian yards' art and any last names**: Tessaract, Arcadia civil, Solace, Halden, Arbor, Belt Forge, Rook and Rivet, Meridian's birds, the drones, the Aurel. Each will be logged below as it lands; no rule changes expected from them.

## For the lead, when milestone 7 comes

In dependency order: standing and licences; the Navy tag bonus and the grade flag; the used market with legacy and retired navy; patterns as variants; the Belt rota; security levels, patrol beats, witnessed crime as a record on the hull id, the rungs as task groups, hail and scan, rules of engagement, wanted and amnesty; then, when T3 hulls exist, locks, beacons, jumps, the pin and hunting groups. Fields are listed at the end of `hull-terms.md`.

## Still open

- Mars and Venus colours were proposals; they are now drawn (rust and bone; pale gold and green) and stand unless Jason objects.
- Arena name and scenario names; Injunction and Walkout confirmed as final (pending Jason's word).
- Contraband lists, fine and bounty scales, how fast a cold record warms (`navy.md` Open).
- Fleet beacon as module or hull property; pin on docked ships; jumping to pods (`t3-capabilities.md` Open, with proposals).
- `ships.md` line 101 still says "Meridian Civil Yards"; the lead's file, change when touched.

## Changes

- 2026-11-07: page created. Covers the Sol pivot (6 November) and everything decided on 7 November: Navy as a tag and grades; retired navy sold whole; the T3 line and its capabilities; navies as a system; Venus's teeth and territory; independents; the Belt's military as a rota and refit shop; fighters under the navy rules; Venus's fighters; the hull handover and terms. Registry at Version 24, 71 of 121 hulls drawn: all military lineups, the independents' combat hulls, the Grab.
