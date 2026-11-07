# Powers and companies

Status: rewritten 6 November 2026 for the Sol pivot. The history and politics are in [lore.md](lore.md), which is canon. This page is the summary the code is built against. The older "Spacegame: Races and Manufacturers" doc describes the retired six-race setting and is superseded.

## Structure

Power, then company, then product. A **power** is one of the four human origins; it sets a pilot's home system and starting standing, the weapon family its navy hulls are bonused for, its navy and its law. A **company** is a maker with a home power and one or two specialities; it sets which industries it builds for, its house style, where it sells, and whether it is a naval yard. Companies sell everywhere unless they are naval yards. Two are independents with no flag, licensed by the Ceres Registry, building civil and combat hulls for anyone at any size, no Navy tag, no licence (`fleet.md`, "Independents").

## The powers

| Power | Character | Colours | Shape language | Weapon family | Best industries | Navy |
| --- | --- | --- | --- | --- | --- | --- |
| Earth, with Luna | Corporate core; contracts, tolls and courts | Steel blue, white | Layered panels, chamfered blocks, clean seams | Missile; shield tank, electronic warfare | Transport, commerce, patrol | The Charter Fleet (Kessari Orbital Defence) |
| Mars | Disciplined, dutiful, the best navy | Rust red, bone | Symmetrical, armour plates, hard edges | Energy; armour tank | Military, security | The Martian Navy (Seraphine Naval Yards) |
| Venus | Cloud cities; chemistry, biotech, medicine; neutral | Pale gold, green | Smooth curves, domes | Hybrid; regenerative mix, repair, drones | Support, drones, research | The Coastguard (Ishtar Fleet Works) |
| The Belt | Cooperatives and clans; mining and salvage | Rust orange, gunmetal | Exposed trusses, asymmetric, bolted on | Projectile; whatever tank the hull came with, speed | Mining, salvage, exploration | The Union Militia (Union Defence Works) |
| The Aurel | Alien, receded, rare | Pale white, cyan glow | Floating segments | Sealed, integrated systems | One-offs | None known |

Colours and shapes for Mars and Venus are first proposals for the design canvas; Jason to confirm. Style rules, art direction and scale are in `fleet.md`: the company leads the design, the power adds registry markings, no basic shapes or triangles, detail and sensible colour, and a radius range per weight band.

## Companies

Naval yards in bold. Specialities in brackets; the gaps between powers are deliberate and create trade.

| Home | Companies |
| --- | --- |
| Independents (no flag) | Meridian Yards (starter ships, shuttles, couriers, pods, and armed utility: Kite, Harrier, Osprey), Corvane Heavy Industries (heavy mining plant and corporate security: Warden, Bulwark, Foreman; Earth money, Belt yards), Paragon Arms (open-market weapons, PDCs, fire control; modules only) |
| Earth | **Kessari Orbital Defence** (patrol hulls, munitions), Ito-Marr Dynamics (launchers, shields, power, countermeasures), Tessaract Logistics (haulers, freighters, containers, survey), Novum Systems (sensors, electronic warfare, decoys; Lunar), Vantage Aerospace (crewed fighters, no hulls; Lunar) |
| Mars | **Seraphine Naval Yards** (warships), Arcadia Works (state civilian hulls, one per job), Cantor-Vell Arms (energy weapons, armour) |
| Venus | **Ishtar Fleet Works** (railgun and blaster hulls), Solace Medical (support, rescue), Arbor Dynamics (drones), Halden Institute (exploration, scanners) |
| The Belt | **Union Defence Works** (militia gunboats, projectile guns, heavy armour), Belt Forge Collective (mining ships and kit, drones, breaching), Rook and Rivet (salvage, tugs, patch armour), Slagline Motors (engines, thrusters, afterburners, flares) |

## Classes

Two ladders, in `lore.md` under "Hull classes": military (corvette, patrol boat, frigate, destroyer, cruiser, battleship, carrier, dreadnought) and civilian (courier to superfreighter; shuttle to liner; prospector to factory ship; pod, tug, tender, survey ship). The class says what a hull was built as; the fit says what it is now.

## Passenger transport

Its own industry, separate from cargo: taxis and shuttles (Meridian), buses and ferries (Meridian, Tessaract), liners and cruise ships (Tessaract; a Venusian liner yard later). Passenger cabins are a module family.

## Decisions

- **Pilots** pick an origin (Earth, Mars, Venus, the Belt) and a background (navy reservist, miner, hauler, more later) at character creation and start in their origin's home system. Origin is standing and a start, not bonuses; background is a starting ship and employer, and locks nothing.
- **Navy ships** need standing and a licence with the power, and come with duties that grow with access. Owned ships are never taken back; a pilot who abandons their duty becomes a deserter to that power. Current corvettes and patrol boats come Navy grade (licence) or civilian grade (same hull, no Navy tag, open market; Mars sells to Martians only); frigate and above Navy only. Retired navy marks sell whole on the open market with the Navy tag intact. **Navy** is a stat tag, not a generation.
- **Company standing** grows by working with a maker and unlocks discounts and special hulls and modules. It is never lost for flying a rival's ships.
- **The Aurel** have no companies. Each ship is a sealed one-off. They live beyond the Shoals. Not obtainable by normal means to begin with.
- **Support and repair** is Venus-only (the Mercy Clause makes Venus sell to everyone).
- **Stations** are human-built, in the holder's look; the hub is much bigger than its pads; most stations have only a few pads; each power's home has one enormous capital port.
- **Player organisations** are called outfits.
- **Crew** is a later system, costs and risks only, never a people sim.

## Open

- Navy duties: what they are and how often.
- Mars's and Venus's colours and shape language, for the canvas.
- Names for the big ships (Kessari Injunction, Union Walkout) and their large kit.
