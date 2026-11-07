# Hull handover

Generated from the ship registry's data on 7 November 2026 by the lore chat; regenerate rather than edit. One row per hull. Every term used here is defined in `hull-terms.md`, which is the authority; the rules in one screen:

- **Tiers.** T1: legacy (old civilian mark) and retired navy (old navy mark sold whole, Navy tag intact). T2: production hulls and their patterns. T3: special operations and clan hulls. The tier is price band and rarity; the generation is what the hull is.
- **Navy is a tag**, not a generation: better stats. A hull's **grade** is a flag on the owned ship: Navy or civilian for current corvettes, patrol boats and light fighters (frigate and above are Navy only); Militia or cooperative for every Belt hull, toggled by rota; none for independents and legacy.
- **Patterns** are T2 stat variants of a base hull (better at one thing, worse at another), behind standing or a licence; see `fleet.md` "Pattern grid". They are not new hulls.
- **T3 roles are hull abilities**, one per hull: watcher, hunter, striker. Jumps need a jump target (a watcher's lock, a fleet or station beacon), are in-system only, loud, and have a long cooldown. Clan hulls are the Belt's T3 and have no drives. See `fleet.md` "Special operations: the T3 line".
- **Rebuilds and retired marks point at a source or successor hull** (the Base column). Union pattern hulls are their source rebuilt; retired marks are the hull the production mark replaced.
- **Independents** (Meridian, Corvane) carry no tag and need no licence at any size. **Union pattern** is sold only in the Belt. **Retired navy** is expensive. The five routes to a warship are in `fleet.md`.
- **Weight band and rating tag** come from `fleet.md` "Weight bands": `[weight]-[function]`; radius ranges per band are there too.
- The per-power weapon family and tank are in `lore.md` "Weapons and war"; who responds with what is in `navy.md`.

Columns: key is the catalogue id where one exists (`id` column) or the registry key; grades and route follow the rules above; Drawn says whether the registry has art.

## Kessari Orbital Defence (earth)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `kes-notice` |  | Kessari Notice | Corvette, Retired navy corvette | T1 | surplus | Navy tag intact, open market | Kessari Citation | Light | `Light-Corvette` |  | open market, expensive | yes |
| `kes-writ` |  | Kessari Writ | Patrol boat, Retired navy patrol boat | T1 | surplus | Navy tag intact, open market | Kessari Warrant | Medium | `Medium-Patrol boat` |  | open market, expensive | yes |
| `kes-decree` |  | Kessari Decree | Frigate, Retired navy frigate | T1 | surplus | Navy tag intact, open market | Kessari Injunction | Medium | `Medium-Frigate` |  | open market, expensive | yes |
| `kes-ruling` |  | Kessari Ruling | Destroyer, Retired navy destroyer | T1 | surplus | Navy tag intact, open market | Kessari Verdict | Heavy | `Heavy-Destroyer` |  | open market, expensive | yes |
| `kes-citation` |  | Kessari Citation | Corvette, Fast interceptor and toll runner | T2 | production | Navy / civilian |  | Light | `Light-Corvette` | Pursuit pattern: Interceptor: afterburners and a tackle fit, little else | yard, Navy grade behind the licence; civilian grade open | yes |
| `warrant` | kessari-wedge | Kessari Warrant | Patrol boat, Toll patrol and escort | T2 | production | Navy / civilian |  | Medium | `Medium-Patrol boat` | Toll pattern: Electronic warfare and sensors; stops ships without shooting them | yard, Navy grade behind the licence; civilian grade open | yes |
| `kessari-brig` | kessari-brig | Kessari Injunction | Frigate, Missile frigate, the Charter Fleet's backbone | T2 | production | Navy only |  | Medium | `Medium-Frigate` | Siege pattern: Torpedo tubes in place of launchers; slow, brutal | yard, licence only | yes |
| `kes-verdict` |  | Kessari Verdict | Destroyer, Heavy missile destroyer | T2 | production | Navy only |  | Heavy | `Heavy-Destroyer` | Picket pattern: PDC coverage for the line; a swarm's nightmare | yard, licence only | yes |
| `kes-statute` |  | Kessari Statute | Cruiser, Line cruiser | T2 | production | Navy only |  | Super-heavy | `Super-heavy-Cruiser` |  | yard, licence only | yes |
| `kes-precedent` |  | Kessari Precedent | Battleship, The Charter Fleet's heaviest line ship | T2 | production | Navy only |  | Super-heavy | `Super-heavy-Battleship` |  | yard, licence only | yes |
| `kes-mandate` |  | Kessari Mandate | Carrier, Drone and fighter carrier | T2 | production | Navy only |  | Capital | `Capital-Carrier` |  | yard, licence only | yes |
| `kes-charter` |  | Kessari Charter | Dreadnought, The Charter Fleet's flagship | T2 | production | Navy only |  | Capital | `Capital-Dreadnought` |  | yard, licence only | yes |
| `kes-summons` |  | Kessari Summons | Frigate, Watcher | T3 | special operations, watcher: fast and agile despite size; cold-running; finds the target and holds a lock that is a jump target; no real damage | Navy (top of the ladder) |  | Medium | `Medium-Watcher` |  | navy standing ladder, stolen, or story | yes |
| `kes-custody` |  | Kessari Custody | Cruiser, Hunter | T3 | special operations, hunter: jumps onto a lock (gate-born drive), lands close, pins the target (burn, turn and capacitor penalties); survives until the fleet arrives; modest guns | Navy (top of the ladder) |  | Super-heavy | `Super-heavy-Hunter` |  | navy standing ladder, stolen, or story | yes |
| `kes-sentence` |  | Kessari Sentence | Battleship, Striker | T3 | special operations, striker: jumps in behind the hunter, alpha far above its class, low defences, committed once landed | Navy (top of the ladder) |  | Super-heavy | `Super-heavy-Striker` |  | navy standing ladder, stolen, or story | yes |

## Tessaract Logistics (earth)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tes-memo` |  | Tessaract Memo | Light civil, Courier, legacy | T1 | legacy | none (old civilian mark) | Tessaract Docket | Light | `Light-Courier` |  | used market, cheap | yes |
| `tes-invoice` |  | Tessaract Invoice | Cargo, Hauler, legacy | T1 | legacy | none (old civilian mark) | Tessaract Waybill | Medium | `Medium-Hauler` |  | used market, cheap | yes |
| `tes-ledger` |  | Tessaract Ledger | Cargo, Freighter, legacy | T1 | legacy | none (old civilian mark) | Tessaract Manifest | Heavy | `Heavy-Freighter` |  | used market, cheap | yes |
| `tes-bill` |  | Tessaract Bill | Bulk, Bulk freighter, legacy | T1 | legacy | none (old civilian mark) | Tessaract Lading | Super-heavy | `Super-heavy-Bulk freighter` |  | used market, cheap | yes |
| `tes-almanac` |  | Tessaract Almanac | Passenger, Ferry, legacy | T1 | legacy | none (old civilian mark) | Tessaract Timetable | Medium | `Medium-Ferry` |  | used market, cheap | yes |
| `tes-docket` |  | Tessaract Docket | Light civil, Courier | T2 | production | none (civilian) |  | Light | `Light-Courier` |  | yard or ship mart | yes |
| `tessaract-spine` | tessaract-spine | Tessaract Manifest | Cargo, Freighter, six bays | T2 | production | none (civilian) |  | Heavy | `Heavy-Freighter` | Deep-space pattern: Jump drive and armour for the Marches and beyond | yard or ship mart | yes |
| `tes-waybill` |  | Tessaract Waybill | Cargo, Hauler | T2 | production | none (civilian) |  | Medium | `Medium-Hauler` |  | yard or ship mart | yes |
| `tes-consignment` |  | Tessaract Consignment | Bulk, Superfreighter (convoy command ship) | T2 | production; command ship (fleet bonuses, bay, defence umbrella, fleet beacon) | none (civilian) |  | Capital | `Capital-Superfreighter (convoy command ship)` |  | yard or ship mart | yes |
| `tes-lading` |  | Tessaract Lading | Bulk, Bulk freighter | T2 | production | none (civilian) |  | Super-heavy | `Super-heavy-Bulk freighter` | Convoy pattern: PDCs and a tougher hull; sold to firms that lost a Lading | yard or ship mart | yes |
| `tes-tariff` |  | Tessaract Tariff | Bulk, Tanker | T2 | production | none (civilian) |  | Heavy | `Heavy-Tanker` |  | yard or ship mart | yes |
| `tes-itinerary` |  | Tessaract Itinerary | Passenger, Heavy bus, short-route liner | T2 | production | none (civilian) |  | Heavy | `Heavy-Bus` |  | yard or ship mart | yes |
| `tes-passage` |  | Tessaract Passage | Passenger, Liner | T2 | production | none (civilian) |  | Super-heavy | `Super-heavy-Liner` |  | yard or ship mart | yes |
| `tes-timetable` |  | Tessaract Timetable | Passenger, Ferry | T2 | production | none (civilian) |  | Medium | `Medium-Ferry` |  | yard or ship mart | yes |
| `tes-covenant` |  | Tessaract Covenant | Bulk, Prototype superfreighter | T3 | prototype: a civil specialist with one Lattice-derived component; see fleet.md "Civil T3: prototypes" | none (top of company standing) |  | Capital | `Capital-Prototype Superfreighter` |  | top of company standing, or story | no |

## Vantage Aerospace (earth)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `van-cutlass` |  | Vantage Cutlass | Subcraft, Heavy fighter, retired navy | T1 | surplus | Navy tag intact, open market | Vantage Sabre | Subcraft | `Subcraft-Heavy fighter, retired navy` |  | open market, expensive | yes |
| `van-dirk` |  | Vantage Dirk | Subcraft, Light fighter, retired navy | T1 | surplus | Navy tag intact, open market | Vantage Foil | Subcraft | `Subcraft-Light fighter, retired navy` |  | open market, expensive | yes |
| `kes-light` |  | Vantage Foil | Subcraft, Light fighter | T2 | production | Navy / civilian |  | Subcraft | `Subcraft-Light fighter` |  | yard, Navy grade behind the licence; civilian grade open | yes |
| `kes-heavy` |  | Vantage Sabre | Subcraft, Heavy fighter | T2 | production | Navy only |  | Subcraft | `Subcraft-Heavy fighter` |  | yard, licence only | yes |

## Seraphine Naval Yards (mars)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ser-deimos-mk1` |  | Seraphine Deimos Mk I | Corvette, Colony picket | T1 | legacy | none (old civilian mark) | Seraphine Deimos | Light | `Light-Corvette` |  | used market, cheap | yes |
| `ser-phobos-mk2` |  | Seraphine Phobos Mk II | Patrol boat, Reserve patrol boat | T1 | legacy | none (old civilian mark) | Seraphine Phobos | Medium | `Medium-Patrol boat` |  | used market, cheap | yes |
| `ser-deimos` |  | Seraphine Deimos | Corvette, Picket and scout | T2 | production | Navy / civilian |  | Light | `Light-Corvette` |  | yard, Navy grade behind the licence; civilian grade open to Martians only | yes |
| `ser-phobos` |  | Seraphine Phobos | Patrol boat, Patrol and escort | T2 | production | Navy / civilian |  | Medium | `Medium-Patrol boat` | Escort pattern: Heavy armour, convoy work | yard, Navy grade behind the licence; civilian grade open to Martians only | yes |
| `ser-resolve` |  | Seraphine Resolve | Frigate, Energy frigate | T2 | production | Navy only |  | Medium | `Medium-Frigate` | Vanguard pattern: More guns, less armour; the ship that goes in first | yard, licence only | yes |
| `ser-constancy` |  | Seraphine Constancy | Destroyer, Energy destroyer | T2 | production | Navy only |  | Heavy | `Heavy-Destroyer` | Bastion pattern: The thickest armour Mars builds; stands and does not move | yard, licence only | yes |
| `ser-valles` |  | Seraphine Valles | Cruiser, Line cruiser | T2 | production | Navy only |  | Super-heavy | `Super-heavy-Cruiser` |  | yard, licence only | yes |
| `ser-tharsis` |  | Seraphine Tharsis | Battleship, Line battleship | T2 | production | Navy only |  | Super-heavy | `Super-heavy-Battleship` |  | yard, licence only | yes |
| `carrier` |  | Seraphine Hellas | Carrier, Fighter carrier | T2 | production | Navy only |  | Capital | `Capital-Carrier` |  | yard, licence only | yes |
| `ser-olympus` |  | Seraphine Olympus | Dreadnought, Flagship | T2 | production | Navy only |  | Capital | `Capital-Dreadnought` |  | yard, licence only | yes |
| `ser-noctis` |  | Seraphine Noctis | Frigate, Watcher | T3 | special operations, watcher: fast and agile despite size; cold-running; finds the target and holds a lock that is a jump target; no real damage | Navy (top of the ladder) |  | Medium | `Medium-Watcher` |  | navy standing ladder, stolen, or story | yes |
| `ser-cerberus` |  | Seraphine Cerberus | Cruiser, Hunter | T3 | special operations, hunter: jumps onto a lock (gate-born drive), lands close, pins the target (burn, turn and capacitor penalties); survives until the fleet arrives; modest guns | Navy (top of the ladder) |  | Super-heavy | `Super-heavy-Hunter` |  | navy standing ladder, stolen, or story | yes |
| `ser-medusae` |  | Seraphine Medusae | Battleship, Striker | T3 | special operations, striker: jumps in behind the hunter, alpha far above its class, low defences, committed once landed | Navy (top of the ladder) |  | Super-heavy | `Super-heavy-Striker` |  | navy standing ladder, stolen, or story | yes |

## Arcadia Works (mars)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hal-light-mk4` |  | Arcadia Fighter Mk IV | Subcraft, Light fighter, retired navy | T1 | surplus | Navy tag intact, open market | Arcadia Fighter Mk V | Subcraft | `Subcraft-Light fighter, retired navy` |  | open market, expensive, Martian buyers first | yes |
| `hal-heavy-mk1` |  | Arcadia Heavy Fighter Mk I | Subcraft, Heavy fighter, retired navy | T1 | surplus | Navy tag intact, open market | Arcadia Heavy Fighter Mk II | Subcraft | `Subcraft-Heavy fighter, retired navy` |  | open market, expensive, Martian buyers first | yes |
| `arc-courier-mk3` |  | Arcadia Courier Mk III | Light civil, Courier, legacy | T1 | legacy | none (old civilian mark) | Arcadia Courier Mk IV | Light | `Light-Courier` |  | used market, cheap | yes |
| `arc-shuttle-mk2` |  | Arcadia Shuttle Mk II | Light civil, Shuttle, legacy | T1 | legacy | none (old civilian mark) | Arcadia Shuttle Mk III | Light | `Light-Shuttle` |  | used market, cheap | yes |
| `arc-freighter-mk1` |  | Arcadia Freighter Mk I | Cargo, Freighter, legacy | T1 | legacy | none (old civilian mark) | Arcadia Freighter Mk II | Heavy | `Heavy-Freighter` |  | used market, cheap | yes |
| `arc-hauler-mk2` |  | Arcadia Hauler Mk II | Cargo, Hauler, legacy | T1 | legacy | none (old civilian mark) | Arcadia Hauler Mk III | Medium | `Medium-Hauler` |  | used market, cheap | yes |
| `arc-ice-mk1` |  | Arcadia Ice Hauler Mk I | Bulk, Ice hauler, legacy | T1 | legacy | none (old civilian mark) | Arcadia Ice Hauler Mk II | Heavy | `Heavy-Ice hauler` |  | used market, cheap | yes |
| `hal-light` |  | Arcadia Fighter Mk V | Subcraft, Light fighter | T2 | production | Navy / civilian |  | Subcraft | `Subcraft-Light fighter` |  | yard, Navy grade behind the licence; civilian grade open to Martians only | yes |
| `hal-heavy` |  | Arcadia Heavy Fighter Mk II | Subcraft, Heavy fighter | T2 | production | Navy only |  | Subcraft | `Subcraft-Heavy fighter` |  | yard, licence only | yes |
| `arc-courier` |  | Arcadia Courier Mk IV | Light civil, Courier | T2 | production | none (civilian) |  | Light | `Light-Courier` |  | yard or ship mart | yes |
| `arc-shuttle` |  | Arcadia Shuttle Mk III | Light civil, Shuttle | T2 | production | none (civilian) |  | Light | `Light-Shuttle` |  | yard or ship mart | yes |
| `arc-freighter` |  | Arcadia Freighter Mk II | Cargo, Freighter | T2 | production | none (civilian) |  | Heavy | `Heavy-Freighter` | Navy pattern: The Martian Navy's own supply ship; armoured, PDCs | yard or ship mart | yes |
| `arc-hauler` |  | Arcadia Hauler Mk III | Cargo, Hauler | T2 | production | none (civilian) |  | Medium | `Medium-Hauler` |  | yard or ship mart | yes |
| `arc-bulk` |  | Arcadia Bulk Freighter Mk I | Bulk, Bulk freighter | T2 | production | none (civilian) |  | Super-heavy | `Super-heavy-Bulk freighter` |  | yard or ship mart | yes |
| `arc-ice` |  | Arcadia Ice Hauler Mk II | Bulk, Ice hauler | T2 | production | none (civilian) |  | Heavy | `Heavy-Ice hauler` |  | yard or ship mart | yes |
| `arc-ferry` |  | Arcadia Ferry Mk II | Passenger, Ferry | T2 | production | none (civilian) |  | Medium | `Medium-Ferry` |  | yard or ship mart | yes |
| `arc-tender` |  | Arcadia Tender Mk I | Service, Repair tender | T2 | production | none (civilian) |  | Medium | `Medium-Repair tender` |  | yard or ship mart | yes |
| `arc-tug` |  | Arcadia Tug Mk II | Service, Tug | T2 | production | none (civilian) |  | Medium | `Medium-Tug` |  | yard or ship mart | yes |
| `arc-mk0` |  | Arcadia Prototype Mk 0 | Bulk, Prototype bulk freighter | T3 | prototype: a civil specialist with one Lattice-derived component; see fleet.md "Civil T3: prototypes" | none (top of company standing) |  | Super-heavy | `Super-heavy-Prototype Bulk freighter` |  | top of company standing, or story | no |

## Ishtar Fleet Works (venus)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ish-hathor-221` |  | Ishtar Hathor '221 | Subcraft, Light fighter, retired navy, gun removed | T1 | surplus | Navy tag intact, open market | Ishtar Hathor | Subcraft | `Subcraft-Light fighter, retired navy, gun removed` |  | open market, expensive | yes |
| `ish-sedna-218` |  | Ishtar Sedna '218 | Corvette, Retired navy corvette, guns removed | T1 | surplus | Navy tag intact, open market | Ishtar Sedna | Light | `Light-Corvette` |  | open market, expensive | yes |
| `ish-lakshmi-205` |  | Ishtar Lakshmi '205 | Patrol boat, Retired navy patrol boat, guns removed | T1 | surplus | Navy tag intact, open market | Ishtar Lakshmi | Medium | `Medium-Patrol boat` |  | open market, expensive | yes |
| `ish-hathor` |  | Ishtar Hathor | Subcraft, Light fighter | T2 | production | Navy / civilian |  | Subcraft | `Subcraft-Light fighter` |  | yard, Navy grade behind the licence; civilian grade open | yes |
| `ish-sedna` |  | Ishtar Sedna | Corvette, Fast rescue and picket | T2 | production | Navy / civilian |  | Light | `Light-Corvette` |  | yard, Navy grade behind the licence; civilian grade open | yes |
| `ish-lakshmi` |  | Ishtar Lakshmi | Patrol boat, Coastguard patrol and rescue escort | T2 | production | Navy / civilian |  | Medium | `Medium-Patrol boat` | Lifeline pattern: Repair and shield transfer; a Solace kit built in | yard, Navy grade behind the licence; civilian grade open | yes |
| `ish-maat` |  | Ishtar Maat | Frigate, Hybrid frigate | T2 | production | Navy only |  | Medium | `Medium-Frigate` | Longbow pattern: Railguns and nothing else; answers from farther than anyone | yard, licence only | yes |
| `ish-maxwell` |  | Ishtar Maxwell | Destroyer, Hybrid destroyer | T2 | production | Navy only |  | Heavy | `Heavy-Destroyer` |  | yard, licence only | yes |
| `ish-aphrodite` |  | Ishtar Aphrodite | Cruiser, Rescue cruiser and command ship | T2 | production; command ship (fleet bonuses, bay, defence umbrella, fleet beacon) | Navy only |  | Super-heavy | `Super-heavy-Cruiser` |  | yard, licence only | yes |
| `ish-hecate` |  | Ishtar Hecate | Cruiser, Hunter | T3 | special operations, hunter: jumps onto a lock (gate-born drive), lands close, pins the target (burn, turn and capacitor penalties); survives until the fleet arrives; modest guns | Navy (top of the ladder) |  | Super-heavy | `Super-heavy-Hunter` |  | navy standing ladder, stolen, or story | yes |

## Solace Medical (venus)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sol-stretcher` |  | Solace Stretcher | Subcraft, Heavy SAR fighter | T2 | production | Navy only |  | Subcraft | `Subcraft-Heavy SAR fighter` |  | yard, licence only | yes |
| `sol-haven` |  | Solace Haven | Service, Repair tender, medium | T2 | production | none (civilian) |  | Medium | `Medium-Repair tender` | Field pattern: Armour over comfort; flies with the Coastguard into the Marches | yard or ship mart | no |
| `sol-refuge` |  | Solace Refuge | Service, Repair ship, heavy | T2 | production | none (civilian) |  | Heavy | `Heavy-Repair ship` |  | yard or ship mart | no |
| `sol-respite` |  | Solace Respite | Service, Tender, small | T2 | production | none (civilian) |  | Light | `Light-Tender` |  | yard or ship mart | no |
| `sol-sanctuary` |  | Solace Sanctuary | Service, Hospital ship, large (SAR command ship) | T2 | production; command ship (fleet bonuses, bay, defence umbrella, fleet beacon) | none (civilian) |  | Super-heavy | `Super-heavy-Hospital ship` |  | yard or ship mart | no |
| `sol-grace` |  | Solace Grace | Service, Prototype hospital ship | T3 | prototype: a civil specialist with one Lattice-derived component; see fleet.md "Civil T3: prototypes" | none (top of company standing) |  | Super-heavy | `Super-heavy-Prototype Hospital ship` |  | top of company standing, or story | no |

## Halden Institute (venus)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hal-expedition` |  | Halden Expedition | Service, Explorer, large (exploration command ship) | T2 | production; command ship (fleet bonuses, bay, defence umbrella, fleet beacon) | none (civilian) |  | Heavy | `Heavy-Explorer` |  | yard or ship mart | no |
| `hal-inquiry` |  | Halden Inquiry | Service, Survey ship, medium | T2 | production | none (civilian) |  | Medium | `Medium-Survey ship` |  | yard or ship mart | no |
| `hal-query` |  | Halden Query | Service, Survey ship, small | T2 | production | none (civilian) |  | Light | `Light-Survey ship` |  | yard or ship mart | no |
| `hal-threshold` |  | Halden Threshold | Service, Prototype explorer | T3 | prototype: a civil specialist with one Lattice-derived component; see fleet.md "Civil T3: prototypes" | none (top of company standing) |  | Heavy | `Heavy-Prototype Explorer` |  | top of company standing, or story | no |

## Arbor Dynamics (venus)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `arb-canopy` |  | Arbor Canopy | Service, Drone tender, medium | T2 | production | none (civilian) |  | Medium | `Medium-Drone tender` |  | yard or ship mart | no |
| `vae-heavy` |  | Arbor Bramble | Drone, Heavy combat drone | T2 | production | none (civilian) |  | Drone | `Drone-Heavy combat drone` |  | yard or ship mart | yes |
| `arb-shoot` |  | Arbor Shoot | Drone, Repair drone | T2 | production | none (civilian) |  | Drone | `Drone-Repair drone` |  | yard or ship mart | no |
| `vae-light` |  | Arbor Thorn | Drone, Light combat drone | T2 | production | none (civilian) |  | Drone | `Drone-Light combat drone` |  | yard or ship mart | yes |
| `arb-grove` |  | Arbor Grove | Service, Prototype drone tender | T3 | prototype: a civil specialist with one Lattice-derived component; see fleet.md "Civil T3: prototypes" | none (top of company standing) |  | Capital | `Capital-Prototype Drone tender` |  | top of company standing, or story | no |

## Lavinia Atmospherics (venus)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `lav-monsoon` |  | Lavinia Monsoon | Bulk, Gas tanker | T2 | production | none (civilian) |  | Heavy | `Heavy-Gas tanker` |  | yard or ship mart | no |
| `lav-gale` |  | Lavinia Gale | Mining, Skimmer, medium | T2 | production | none (civilian) |  | Medium | `Medium-Skimmer` |  | yard or ship mart | no |
| `lav-zephyr` |  | Lavinia Zephyr | Mining, Skimmer, small | T2 | production | none (civilian) |  | Light | `Light-Skimmer` |  | yard or ship mart | no |
| `lav-cyclone` |  | Lavinia Cyclone | Industry, Gas refinery, capital (gas command ship) | T2 | production; command ship (fleet bonuses, bay, defence umbrella, fleet beacon) | none (civilian) |  | Capital | `Capital-Gas refinery` |  | yard or ship mart | no |
| `lav-tempest` |  | Lavinia Tempest | Mining, Prototype skimmer | T3 | prototype: a civil specialist with one Lattice-derived component; see fleet.md "Civil T3: prototypes" | none (top of company standing) |  | Heavy | `Heavy-Prototype Skimmer` |  | top of company standing, or story | no |

## Union Defence Works (belt)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bel-heavy` |  | Vantage Cutlass, Militia refit | Subcraft, Heavy fighter; Union pattern over a Vantage Cutlass | T2 | production | Militia (on rota) / cooperative (off) |  | Subcraft | `Subcraft-Heavy fighter; Union pattern over a Vantage Cutlass` |  | Belt only, cooperative standing | yes |
| `bel-light` |  | Vantage Dirk, Militia refit | Subcraft, Light fighter; Union pattern over a Vantage Dirk | T2 | production | Militia (on rota) / cooperative (off) |  | Subcraft | `Subcraft-Light fighter; Union pattern over a Vantage Dirk` |  | Belt only, cooperative standing | yes |
| `uni-wildcat` |  | Union Wildcat | Corvette, Fast raider and picket; Union pattern over a Kessari Notice | T2 | production | Militia (on rota) / cooperative (off) |  | Light | `Light-Corvette` |  | Belt only, cooperative standing | yes |
| `uni-blockade` |  | Union Blockade | Patrol boat, Militia patrol; Union pattern over a Kessari Writ | T2 | production | Militia (on rota) / cooperative (off) |  | Medium | `Medium-Patrol boat` | Raider pattern: Afterburners, projectile guns, no shields worth the name; the Black Strike's dream | Belt only, cooperative standing | yes |
| `uni-boycott` |  | Union Boycott | Frigate, Projectile frigate; Union pattern over a Kessari Decree | T2 | production | Militia (on rota) / cooperative (off) |  | Medium | `Medium-Frigate` | Picket pattern: PDCs and flak for the Militia's rotas | Belt only, cooperative standing | yes |
| `walkout` | union-frigate | Union Walkout | Destroyer, Heavy gun destroyer; Union pattern over a Kessari Ruling | T2 | production | Navy only |  | Heavy | `Heavy-Destroyer` |  | Belt only, cooperative standing | yes |
| `uni-solidarity` |  | Union Solidarity | Cruiser, Line cruiser; Union pattern over a Statute-generation Earth cruiser | T2 | production | Militia (on rota) / cooperative (off) |  | Super-heavy | `Super-heavy-Cruiser` |  | Belt only, cooperative standing | yes |

## Belt Forge Collective (belt)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bf-pony-old` |  | The old Pony | Light civil, Courier, legacy | T1 | legacy | none (old civilian mark) | Belt Forge Pony | Light | `Light-Courier` |  | used market, cheap | yes |
| `bf-adit-old` |  | The old Adit | Cargo, Freighter, legacy | T1 | legacy | none (old civilian mark) | Belt Forge Adit | Heavy | `Heavy-Freighter` |  | used market, cheap | yes |
| `bf-mule-old` |  | The old Mule | Cargo, Hauler, legacy | T1 | legacy | none (old civilian mark) | Belt Forge Mule | Medium | `Medium-Hauler` |  | used market, cheap | yes |
| `rookrivet-hulk-old` |  | The old Collier | Mining, Barge, legacy | T1 | legacy | none (old civilian mark) | Belt Forge Collier | Heavy | `Heavy-Barge` |  | used market, cheap | yes |
| `rookrivet-prospector-old` |  | The old Prospector | Mining, Prospector, legacy | T1 | legacy | none (old civilian mark) | Belt Forge Prospector | Light | `Light-Prospector` |  | used market, cheap | yes |
| `rookrivet-breacher-old` |  | The old Sinker | Mining, Miner, legacy | T1 | legacy | none (old civilian mark) | Belt Forge Sinker | Medium | `Medium-Miner` |  | used market, cheap | yes |
| `bel-miner` |  | Belt Forge Jackleg | Subcraft, Mining subcraft | T2 | production | Navy only |  | Subcraft | `Subcraft-Mining subcraft` |  | yard, licence only | yes |
| `bf-burrow` |  | Belt Forge Burrow | Light civil, Courier, blockade runner | T2 | production | none (civilian) |  | Light | `Light-Courier` |  | yard or ship mart | yes |
| `bf-pony` |  | Belt Forge Pony | Light civil, Courier | T2 | production | none (civilian) |  | Light | `Light-Courier` |  | yard or ship mart | yes |
| `bf-adit` |  | Belt Forge Adit | Cargo, Freighter | T2 | production | none (civilian) |  | Heavy | `Heavy-Freighter` |  | yard or ship mart | yes |
| `bf-mule` |  | Belt Forge Mule | Cargo, Hauler | T2 | production | none (civilian) |  | Medium | `Medium-Hauler` |  | yard or ship mart | yes |
| `bf-cistern` |  | Belt Forge Cistern | Bulk, Ice hauler | T2 | production | none (civilian) |  | Heavy | `Heavy-Ice hauler` |  | yard or ship mart | yes |
| `bf-auger` |  | Belt Forge Auger | Mining, Ice miner, medium | T2 | production | none (civilian) |  | Medium | `Medium-Ice miner` |  | yard or ship mart | yes |
| `rookrivet-hulk` | rookrivet-hulk | Belt Forge Collier | Mining, Barge | T2 | production | none (civilian) |  | Heavy | `Heavy-Barge` | Deep pattern: Jump drive and bunkers; mines where the patrols do not go | yard or ship mart | yes |
| `rookrivet-prospector` | rookrivet-prospector | Belt Forge Prospector | Mining, Prospector | T2 | production | none (civilian) |  | Light | `Light-Prospector` |  | yard or ship mart | yes |
| `rookrivet-breacher` | rookrivet-breacher | Belt Forge Sinker | Mining, Miner, medium | T2 | production | none (civilian) |  | Medium | `Medium-Miner` | Breaching pattern: Two shotfirer rigs and a Sounder; the knot hunter | yard or ship mart | yes |
| `bf-headframe` |  | Belt Forge Headframe | Industry, Factory ship, largest (mining command ship) | T2 | production; command ship (fleet bonuses, bay, defence umbrella, fleet beacon) | none (civilian) |  | Capital | `Capital-Factory ship` |  | yard or ship mart | yes |
| `bf-winder` |  | Belt Forge Winder | Industry, Refinery ship, large | T2 | production | none (civilian) |  | Super-heavy | `Super-heavy-Refinery ship` |  | yard or ship mart | yes |
| `rookrivet-drone` | rookrivet-drone | Belt Forge Knocker | Drone, Mining drone | T2 | production | none (civilian) |  | Drone | `Drone-Mining drone` |  | yard or ship mart | no |
| `bf-lodestar` |  | Belt Forge Lodestar | Industry, Prototype factory ship | T3 | prototype: a civil specialist with one Lattice-derived component; see fleet.md "Civil T3: prototypes" | none (top of company standing) |  | Capital | `Capital-Prototype Factory ship` |  | top of company standing, or story | no |

## Rook and Rivet (belt)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `rr-scrapper-old` |  | The old Scrapper | Service, Salvage tender, legacy | T1 | legacy | none (old civilian mark) | Rook and Rivet Scrapper | Light | `Light-Salvage tender` |  | used market, cheap | yes |
| `rr-grab` |  | Rook and Rivet Grab | Subcraft, Salvage subcraft | T2 | production | Navy only |  | Subcraft | `Subcraft-Salvage subcraft` |  | yard, licence only | yes |
| `rr-breaker` |  | Rook and Rivet Breaker | Industry, Shipbreaker, large (salvage command ship) | T2 | production; command ship (fleet bonuses, bay, defence umbrella, fleet beacon) | none (civilian) |  | Super-heavy | `Super-heavy-Shipbreaker` |  | yard or ship mart | yes |
| `rr-scrapper` |  | Rook and Rivet Scrapper | Service, Salvage tender, small | T2 | production | none (civilian) |  | Light | `Light-Salvage tender` |  | yard or ship mart | yes |
| `rr-shunt` |  | Rook and Rivet Shunt | Service, Tug | T2 | production | none (civilian) |  | Light | `Light-Tug` |  | yard or ship mart | yes |
| `rr-wrecker` |  | Rook and Rivet Wrecker | Service, Salvage tender, medium | T2 | production | none (civilian) |  | Medium | `Medium-Salvage tender` |  | yard or ship mart | yes |
| `rr-lazarus` |  | Rook and Rivet Lazarus | Service, Prototype recovery tender | T3 | prototype: a civil specialist with one Lattice-derived component; see fleet.md "Civil T3: prototypes" | none (top of company standing) |  | Heavy | `Heavy-Prototype Recovery tender` |  | top of company standing, or story | no |

## The clans (belt)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dri-miner` |  | Long Wake Dredge | Subcraft, Salvage subcraft | T3 | clan | none (clan standing) |  | Subcraft | `Subcraft-Salvage subcraft` |  | clan standing or a very rare sale | yes |
| `dri-heavy` |  | Vesk heavy raider | Subcraft, Heavy raider | T3 | clan | none (clan standing) |  | Subcraft | `Subcraft-Heavy raider` |  | clan standing or a very rare sale | yes |
| `dri-light` |  | Vesk light raider | Subcraft, Light raider | T3 | clan | none (clan standing) |  | Subcraft | `Subcraft-Light raider` |  | clan standing or a very rare sale | yes |
| `vesk-vane` |  | Vesk Vane | Corvette, Watcher; stealth raider and escort | T3 | clan, watcher: fast and agile despite size; cold-running; finds the target and holds a lock that is a jump target; no real damage | none (clan standing) |  | Light | `Light-Watcher` |  | clan standing or a very rare sale | yes |
| `vesk-shade` |  | Vesk Shade | Frigate, Striker; stealth raider | T3 | clan, striker: jumps in behind the hunter, alpha far above its class, low defences, committed once landed | none (clan standing) |  | Medium | `Medium-Striker` |  | clan standing or a very rare sale | yes |
| `lw-keel` |  | Long Wake Keel | Service, Salvage tender | T3 | clan | none (clan standing) |  | Medium | `Medium-Salvage tender` |  | clan standing or a very rare sale | no |
| `lw-trawl` |  | Long Wake Trawl | Service, Recovery tender, heavy | T3 | clan | none (clan standing) |  | Heavy | `Heavy-Recovery tender` |  | clan standing or a very rare sale | no |
| `saro-farwalker` |  | Saro Farwalker | Service, Explorer, large | T3 | clan | none (clan standing) |  | Heavy | `Heavy-Explorer` |  | clan standing or a very rare sale | no |
| `saro-waystar` |  | Saro Waystar | Service, Survey ship | T3 | clan | none (clan standing) |  | Medium | `Medium-Survey ship` |  | clan standing or a very rare sale | no |

## Meridian Yards (indep)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `escape-pod` | escape-pod | Meridian Ark | Pod, The lifeboat every registered ship carries | T2 | production | none (independent, no licence) |  | Pod | `Pod-Lifeboat` |  | open market, anywhere | no |
| `mer-kite` |  | Meridian Kite | Corvette, Armed courier | T2 | production | none (independent, no licence) |  | Light | `Light-Corvette` |  | open market, anywhere | yes |
| `tern` | meridian-courier | Meridian Tern | Corvette, The Registry-issue starter; a courier | T2 | production | none (independent, no licence) |  | Light | `Light-Corvette` | Courier pattern: Faster, lighter, one less mount; Meridian's only pattern | open market, anywhere | yes |
| `mer-harrier` |  | Meridian Harrier | Patrol boat, Gunboat | T2 | production | none (independent, no licence) |  | Medium | `Medium-Patrol boat` |  | open market, anywhere | yes |
| `mer-shrike` |  | Meridian Shrike | Patrol boat, Bounty hull | T2 | production | none (independent, no licence) |  | Medium | `Medium-Patrol boat` |  | open market, anywhere | no |
| `mer-osprey` |  | Meridian Osprey | Frigate, Armed hauler, the Q-ship | T2 | production | none (independent, no licence) |  | Medium | `Medium-Frigate` |  | open market, anywhere | yes |
| `mer-gull` |  | Meridian Gull | Light civil, Shuttle | T2 | production | none (independent, no licence) |  | Light | `Light-Shuttle` |  | open market, anywhere | no |
| `mer-petrel` |  | Meridian Petrel | Light civil, Taxi | T2 | production | none (independent, no licence) |  | Light | `Light-Taxi` |  | open market, anywhere | no |
| `mer-skua` |  | Meridian Skua | Cargo, Hauler | T2 | production | none (independent, no licence) |  | Medium | `Medium-Hauler` |  | open market, anywhere | no |
| `mer-fulmar` |  | Meridian Fulmar | Passenger, Bus or ferry | T2 | production | none (independent, no licence) |  | Medium | `Medium-Bus or ferry` |  | open market, anywhere | no |
| `mer-grebe` |  | Meridian Grebe | Service, Tug | T2 | production | none (independent, no licence) |  | Medium | `Medium-Tug` |  | open market, anywhere | no |

## Corvane Heavy Industries (indep)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cor-miner` |  | Corvane Navvy | Subcraft, Mining subcraft | T2 | production | none (independent, no licence) |  | Subcraft | `Subcraft-Mining subcraft` |  | open market, anywhere | yes |
| `cor-warden` |  | Corvane Warden | Destroyer, Corporate security escort | T2 | production | none (independent, no licence) |  | Heavy | `Heavy-Destroyer` |  | open market, anywhere | yes |
| `cor-bulwark` |  | Corvane Bulwark | Cruiser, Corporate security, a mining fleet's bodyguard (security command ship) | T2 | production; command ship (fleet bonuses, bay, defence umbrella, fleet beacon) | none (independent, no licence) |  | Super-heavy | `Super-heavy-Cruiser` |  | open market, anywhere | yes |
| `cor-dray` |  | Corvane Dray | Bulk, Bulk ore freighter | T2 | production | none (independent, no licence) |  | Super-heavy | `Super-heavy-Bulk ore freighter` |  | open market, anywhere | no |
| `cor-foreman` |  | Corvane Foreman | Industry, Factory ship, armed | T2 | production | none (independent, no licence) |  | Super-heavy | `Super-heavy-Factory ship` |  | open market, anywhere | yes |
| `cor-smelter` |  | Corvane Smelter | Industry, Refinery ship, large | T2 | production | none (independent, no licence) |  | Super-heavy | `Super-heavy-Refinery ship` |  | open market, anywhere | no |
| `cor-still` |  | Corvane Still | Industry, Gas refinery, capital (gas command ship) | T2 | production; command ship (fleet bonuses, bay, defence umbrella, fleet beacon) | none (independent, no licence) |  | Capital | `Capital-Gas refinery` |  | open market, anywhere | no |
| `cor-colossus` |  | Corvane Colossus | Industry, Prototype gas refinery | T3 | prototype: a civil specialist with one Lattice-derived component; see fleet.md "Civil T3: prototypes" | none (independent, no licence) |  | Capital | `Capital-Prototype Gas refinery` |  | open market, anywhere | no |

## Aurel (aurel)

| Key | Id | Hull | Class | Tier | Generation / role | Grades | Base | Weight | Tag | Patterns | Route | Drawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `aurel-tacet` | aurel-tacet | Aurel Tacet | Voice, The sealed development and test ship | T2 | production | none (civilian) |  | Voice | `Voice-Voice` |  | yard or ship mart | no |

