# Materials

Status: canon for the game, written 7 November 2026 by the lore chat (`ws/lore`) from Jason's direction: real minerals under their real names, exotic materials reserved for other systems, and the materials define what the mining ships do. This page is the lead's reference for the ore catalogue, the gas and ice loops, refining and the maker alloys. Catalogue ids never change; display names and lore do. Related: `mining.md` (as built), `industries.md` (who mines, by power), `fleet.md` (the hulls), `lore.md` "Mining and materials" (the words Belters use).

## The shape

Three sources, each with its own way of getting at it, and two stages of processing:

| Source | Where in Sol | Method | Kit | Comes off as |
| --- | --- | --- | --- | --- |
| Rock | The Belt, the inner moons, Mars's moons | **Cut** with a laser; **breach** big rocks with charges to reach pockets, then cut | Mining laser (light, heavy), breach charges, collector drones | Ore canisters |
| Ice | The outer Belt, the outer moons, the rings | **Saw** with an ice cutter (a laser boils ice off and wastes it) | Ice saw (light, heavy), collector drones | Ice blocks |
| Gas | Venus's upper air now; the gas giants later | **Skim** a depth band with an intake; deeper is denser and hotter, and below the death line the hull dies | Intake (by depth rating), heat sink, tanks | Gas in tanks |

Capitals never work the site: they cannot manoeuvre among rocks or through a cloud band, so they park at the edge and reach in with subcraft, drones or a fleet. A mining ship is therefore defined by four things: **which method it carries**, **what grade of target it can take** (laser strength against hardness, saw grade against ice density, intake depth rating against the band), **how much it holds**, and **whether it processes anything on board**. The industrial ships and command ships are defined by the processing.

Skimming is the one exception to "ships never land": a skimmer works the top of the air where a hull survives for minutes, comes back hot, and the death line below is where the exception ends.

## Materials

Real names. Belters keep their own words for some of them (in brackets); those are slang in dialogue, not the catalogue name.

### Rock

| Material | Catalogue id | Grade | Found | Used for |
| --- | --- | --- | --- | --- |
| Nickel-iron | `ore` | Common | Every rock | Hull plate, frames, everything structural. Lantern Works eats it by the thousand tonnes |
| Copper (Belters: copperband, for the striped rock it comes in) | `banded-ore` | Middling | Most rocks, more in big ones | Wiring, reactors, every electrical system |
| Zinc (Belters: blackjack, the old miners' word for the black ore) | `black-ore` | Middling | Most rocks | Armour composites, capacitor cells, galvanising |
| Platinum (Belters: glint) | `glintstone` | Valuable | Big rocks only; pockets found by breaching | Catalysts, sensor contacts, the best electronics; Cantor-Vell and Novum buy all they can |
| Rare earths | `rare-earths` (new) | Valuable | Big rocks in worse space; the Marches | Magnets, drive coils, lasers, sensor arrays |
| Silicates | by-product of refining rock, not mined | Common | Everywhere | Glass, optics, ceramics, radiation shielding; worth little, needed everywhere |

### Ice

| Material | Catalogue id | Grade | Found | Used for |
| --- | --- | --- | --- | --- |
| Water ice | `water-ice` (new) | Common | The outer Belt, the outer moons, the rings | Water, oxygen, reaction mass; every station's life support |
| Ammonia ice | `ammonia-ice` (new) | Middling | Farther out, the outer moons | Nitrogen, fertiliser for the farms, coolant |
| Methane and carbon dioxide ice | `carbon-ice` (new) | Middling | The outer moons, the rings | Carbon and fuel feedstock; plastics and composites |

### Gas

| Material | Catalogue id | Grade | Found | Used for |
| --- | --- | --- | --- | --- |
| Carbon dioxide | `venus-air` (new) | Common | Venus, every band | Carbon and oxygen; the feedstock of Venus's chemistry |
| Sulphur | `sulphur` (new) | Middling | Venus, the cloud bands (the acid) | Chemicals, medicine, batteries; Solace and Halden's supply |
| Nitrogen | `nitrogen` (new) | Middling | Venus, the upper band | Air for every habitat; propellant |
| Hydrogen | `hydrogen` (new) | Common | The gas giants, later | Propellant and reaction mass in bulk |
| Helium-3 | `helium-3` (new) | Valuable | The gas giants, deep bands, later | Fusion fuel; the reason anyone skims a giant |

Venus's bands: the upper band is thin and safe and gives nitrogen and carbon dioxide slowly; the cloud bands give sulphur and fill tanks faster, hot; below the death line the Tempest alone survives, and it fills in seconds. The gas giants are the later prize: hydrogen in bulk at the top, helium-3 deep.

### Exotics (other systems only)

Nothing exotic is mined in Sol. Sol's wealth is ordinary and enormous. The exotics live where the Lattice is broken, and they are why anyone goes there.

| Material | Catalogue id | Found | Used for |
| --- | --- | --- | --- |
| Gate-glass | `gate-glass` | Splinters and knots in rock where a gate was shattered (the Shoals, systems like Calder's Scree), and salvage from husks in the Dimming and the Dark; never in Sol | No human can make it. Researchers, Novum's gate-waking work, the Hollow Choir; the one Lattice-derived component in every civil T3 and the gate-born drives of the military T3 |
| Husk material | later | Dead Aurel hulls in the Shoals and the Dark | Cantor-Vell's best armour and weapons (secretly); priceless to researchers |
| One exotic per new system | later | Named when the system is | The reason that system is worth the risk |

Breaching in Sol therefore finds platinum and rare-earth pockets, not glass. The breaching mechanic as built (deep assay, breach points, charges, the bloom that invites pirates) stays exactly as it is; only the prize changes. Gate-glass stays in the catalogue with its id and comes back the moment the player leaves Sol.

## Rarity follows security

| Space | What is there |
| --- | --- |
| Sol's inner Belt, Mars's moons (Core, Held) | Nickel-iron, copper, zinc; platinum in the big rocks; water ice at the outer edge |
| Sol's outer Belt and outer moons (Held, Contested) | The same, plus ammonia and carbon ice; the first rare earths |
| Venus's air | Carbon dioxide, nitrogen, sulphur |
| The Marches (Contested, Open) | Richer rock, rare earths in quantity, the gas giants of other systems |
| The Shoals and the Dark (Open, unknown) | The exotics |

The lead's `OreSpec` (tier, chance, share, smallest rock) already expresses this per ore; the system's security band should scale chance and share.

## Processing

Two stages. Raw sells; refined sells for more and takes less hold; alloy is what things are made of.

1. **Raw to refined**, at a refinery. Ore to metal (nickel-iron to steel, copper, zinc, platinum, rare earths, with silicates as the by-product); ice to water, oxygen, nitrogen and carbon; gas to propellant and feedstock. Refineries are stations (Lantern Works pays best and refines best), the refinery ships (Belt Forge Winder, Corvane Smelter, Corvane Foreman under fire) and the command ships on station (Headframe, Cyclone, Still). **Field refining is agreed, at a worse yield than a station** (the lore chat's recommendation; a number for the lead to tune, around seven tenths), so a fleet with a Headframe lands metal and a lone Prospector lands rock, and the station still matters.
2. **Refined to alloy**, at a maker's works. Metal plus additives becomes a maker alloy, and hulls and modules are made of alloys. This is the manufacturing milestone's entry point; recipes are left for it. The alloys exist now, as goods with names and prices, so that the economy and the dialogue can use them:

| Maker | Alloy | Character |
| --- | --- | --- |
| Kessari Orbital Defence | Charter steel | Earth's navy plate: heavy, exact, expensive |
| Tessaract Logistics | Lanecast | Light structural alloy for freight frames; cheap by the kilometre |
| Seraphine Yards (Mars) | Tharsis plate | Thick, bolted, survives; the Martian answer to everything |
| Ishtar Shipwrights (Venus) | Cloudweave | A regen-friendly composite the nanites can knit; light, self-healing, hates heat |
| Belt Forge Collective | Patchplate | Reclaimed steel re-rolled from scrap; rough, cheap, everywhere in the Belt |
| Corvane Heavy Industries | Lantern steel | Furnace steel from Lantern Works; the industrial standard |
| Meridian Yards | Registry grey | The cheapest alloy that passes inspection |
| Cantor-Vell Arms | (secret) husk-derived laminate | Mars's best armour; where it comes from is not admitted |

## What each mining hull does

Stock fit, tool slots, role bonus and built-in equipment per hull, including the eleven hulls agreed in the gap pass. This sits inside the fitting model of `fitting.md` and `hull-terms.md`: any hull can fit anything its slots take; the role bonus nudges; the built-in hold, hopper, heat rating, bays and processing are the hull's identity and never fitted out. **Tool slot** grades are the size of the hull's tool slots with the role bonus at full size: laser and saw 1 to 3 are small, medium and large against the rock's hardness or the ice's density; intake D1 to D3 is the hull's heat rating against the band (D1 upper, D2 cloud, D3 below the death line), which is built in, not fitted. Holds are relative within the industry; numbers are the lead's.

| Hull | Builder | Stock method | Tool slot and role bonus | Built-in hold | Built-in processing | Role in a wing or fleet |
| --- | --- | --- | --- | --- | --- | --- |
| Meridian Dunlin (new) | Meridian | Cut | L1 | Small | None | The first miner anyone buys; outgrown fast |
| Belt Forge Prospector | Belt Forge | Cut; survey | L1, the best scanner at its size | Small | None | Finds the rock, picks the easy ones, scouts for the fleet |
| The old Prospector | Belt Forge | Cut; survey | L1, poor scanner | Small | None | T1 |
| Arcadia Miner Mk II (new) | Arcadia | Cut | L2 | Medium, small for its size | None | Mars's cutter: armoured, slow, works under fire |
| Arcadia Miner Mk I (new) | Arcadia | Cut | L1 | Medium | None | T1 |
| Belt Forge Sinker | Belt Forge | Cut; breach | L2; carries charges | Medium | None | The Belt's working miner; breaches pockets |
| The old Sinker | Belt Forge | Cut | L2, no breach kit | Medium | None | T1 |
| Corvane Pithead (new) | Corvane | Cut; breach | L3, two heavy lasers | Large | Sorting hopper (ore sorted by kind, no refining) | The heavy cutter; armed; the step before the Headframe |
| Belt Forge Collier | Belt Forge | None (hauls) | | Very large, ore only | None | Carries the fleet's ore home |
| Belt Forge Rime (new) | Belt Forge | Saw | S1 | Small | None | The light ice cutter |
| The old Rime (new) | Belt Forge | Saw | S1 | Small | None | T1 |
| Belt Forge Auger | Belt Forge | Saw | S2 | Medium | None | The working ice miner |
| Belt Forge Cistern; Arcadia Ice Hauler Mk II; Tessaract Tariff | | None (haul ice, liquids, gas) | | Very large | None | Haulers |
| Lavinia Breeze (new) | Lavinia | Skim | D1 | Small | None | T1; shallow only, comes back hot |
| Lavinia Zephyr | Lavinia | Skim | D1, briefly D2 | Small | None | The first skimmer anyone flies |
| Lavinia Gale | Lavinia | Skim | D2 | Medium | None | The working skimmer |
| Lavinia Tempest (T3) | Lavinia | Skim | D3 | Medium | None | Below the death line and back; a Lattice heat sink |
| Lavinia Monsoon | Lavinia | None (hauls) | | Very large, gas only | None | Carries the wing's gas |
| Belt Forge Jackleg; Corvane Navvy | | Cut | L1 | Tiny | None | Subcraft: a command ship's wing |
| Belt Forge Knocker | Belt Forge | Cut | L1 | None (brings canisters back) | None | Mining drone |
| Arbor Tendril (new) | Arbor | None (collects) | | Tiny | None | Collector drone: gathers canisters and blocks for the mother ship |
| Belt Forge Winder; Corvane Smelter; Corvane Foreman | | None | | Large, refined goods | Refining, field yield | The refinery ships |
| Belt Forge Headframe | Belt Forge | None; its wing cuts | | Huge | Refining; ore transfer without docking | Mining command ship |
| Lavinia Cyclone; Corvane Still | | None; their wings skim | | Huge, gas | Refining gas to propellant and feedstock | Gas command ships |
| Belt Forge Lodestar (T3) | Belt Forge | None; its wing cuts | | Huge | Refining; a survey array that finds platinum and rare-earth pockets where scanners read nothing (the gate-glass reading moves to other systems) | T3 mining command ship |
| Corvane Colossus (T3) | Corvane | None; its wing and fleet cut | | Huge, with loading cradles for Drays and Pitheads | Refining at a rate nothing human matches; furnaces lined with gate-glass | T3 mining carrier: the Lodestar finds, the Colossus processes |

Salvage and exploration are not materials industries, but their hulls use the same shape: a Grab collects, a Scrapper cuts, a Breaker processes; a Query scans, an Expedition stores and analyses.

## For the lead

- New goods to add (ids above): `rare-earths`, `water-ice`, `ammonia-ice`, `carbon-ice`, `venus-air`, `sulphur`, `nitrogen`, `hydrogen`, `helium-3`, the refined metals and the eight alloys. Existing ids keep their ids; display names change: `banded-ore` to Copper, `black-ore` to Zinc, `glintstone` to Platinum. `gate-glass` stays and drops out of Sol's rock tables (chance 0 in Sol).
- Ice is a rock with an `ice` block instead of an `ore` block, cut by a saw not a laser; gas is a planet with depth bands, each a table of gases with a fill rate and a heat rate, and a death line.
- Field refining: a `refine` capability on a hull with a yield below the station's.
- Breaching in Sol targets platinum and rare-earth pockets.
- The alloys are goods now, recipes later.
