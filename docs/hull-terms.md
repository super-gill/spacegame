# Hull terms: what each word means in the game

Written 7 November 2026 for the lead. Every term the fleet uses, what it is in the fiction, what it changes in mechanics, and the field it suggests. `hulls.md` is the per-hull table that uses these terms; `fleet.md` has the lists; `navy.md` the systems. Where this page and an older page disagree, this page wins.

## The hull itself

**Hull.** A catalogue entry: a body with a class, a weight band, mounts and base stats. Catalogue ids never change. Everything below is a property of a hull or of an owned ship built on one.

**Class.** What a hull was built as. Military ladder: corvette, patrol boat, frigate, destroyer, cruiser, battleship, carrier, dreadnought. Civilian ladder: courier, shuttle, taxi, bus or ferry, liner, hauler, freighter, bulk freighter, superfreighter, prospector, collier, factory ship, pod, tug, tender, survey ship, and so on. The class says what it was built as; the fit says what it is now. Mechanically: the slot layout and the base stat band. Suggests `class`.

**Weight band.** Light, Medium, Heavy, Super-heavy, Capital for ships; Subcraft, Drone, Pod, Voice by kind. Set by class for military hulls and by hull for civilian ones (`fleet.md` "Weight bands"). Mechanically: the mass band the sim uses, the radius range the art uses, and the docking rules later. Suggests `weight`.

**Rating tag.** `[weight]-[function]`, for example `Medium-Frigate`, `Heavy-Hauler`, `Super-heavy-Hunter`. A display string built from weight and function; the Ceres Registry's shorthand. Not a mechanic on its own.

**Mark.** A version of a hull in the fiction: Mk II, '218, "the old Pony". A new mark is a new hull entry; the old one keeps flying (see legacy and retired navy). Suggests nothing beyond a separate hull entry with a `base` pointer.

**Fitting model.** Unchanged from `fitting.md` (approved 5 November): every hull can fit anything its slots take, and odd builds are legitimate if they pay their costs. A hull is three things, and the fleet lore maps onto them:

1. **Fitting constraints**: slot counts and sizes, core system sizes, and the frame (mass, structure, speed, turn, capacitor, signature). The weight band, the builder's trade-off (Corvane heavy and armoured, Belt Forge light and far-ranging, Meridian cheap and slight), the Navy and UDF tags (better frame stats) and patterns (frame variants) all live here.
2. **Role bonuses**: a few percentages for full-size modules of the kinds the role wants. Nudges, never requirements. The "grades" in `materials.md` (laser L1 to L3, saw S1 to S3, intake D1 to D3) are the size of the hull's tool slots with the role bonus at full size.
3. **Built-in role equipment**: what a role gets that cannot be fitted elsewhere or fitted out. Few, and each one is the hull's identity: a mining hull's unusually large ore hold, a hopper, a skimmer's heat-rated hull, a carrier's hangar bays and wing control, a command ship's command suite and fleet beacon, the Shrike's cell block, a T3's capability (lock, gate-born jump, pin), a prototype's one Lattice component.

**Hull identity cannot be fitted out** (Jason, 7 November): the fitting freedom is real, but a pilot never removes the built-in equipment, and the frame keeps a hull honest (a capital's turn and mass are why it never works the site). **Stock fits** are fixed per hull: they are what NPCs fly, so traffic stays readable, and what the art draws. Subcraft, drones and pods are bay products with fixed fits.

## Tiers and generations

**Tier.** The price band and rarity of a hull (every Aurel and Unsung ship is T3, Jason, 7 November; they are beyond human and never on any market): **T1** cheap or old, **T2** current, **T3** rare and the best at one thing. A tier contains two generations each. Mechanically: a price multiplier and where the hull appears (used market, ship mart, standing reward). Suggests `tier` (1, 2, 3).

**Generation.** What the hull *is*. Six values:

| Generation | Tier | What it is | Where it comes from | Mechanically |
| --- | --- | --- | --- | --- |
| **Legacy** | T1 | An earlier civilian mark no longer built | The used market, fences, salvage | Fewer slots or weaker stats than its successor; cheap; small per-ship variance (wear, kitbash); points at its successor with `base` |
| **Retired navy** (surplus) | T1 | A navy mark the navy has replaced, sold whole | The open market where that navy releases them (`fleet.md` "Navy grade, civilian grade and retired navy hulls") | Navy tag intact, so still strong; older mounts; no yard support; expensive; points at its successor with `base` |
| **Production** | T2 | The current mark | Ship marts and the maker's yard | Catalogue price and stats; carries a grade (below) |
| **Pattern** | T2 | A specialised stat variant of a production hull, built to a navy's or company's pattern | Standing with the maker, or a navy licence | Same hull body, different slot mix or stat bonuses, better at one thing and worse at another; points at its base with `base`; not a new body (`fleet.md` "Pattern grid") |
| **Special operations** | T3 | A hull built around one capability of the hunting doctrine | The top of a navy's standing ladder, stolen, or a story | Best in the game at its one role, below production at something else; carries a role (below); never on the open market |
| **Clan** | T3 | A bespoke Belt hull built over generations | Standing with a clan, or a very rare sale | Rare, the best at one thing, no two alike; the Belt's special operations; no jump drives |

Suggests `generation` and, where it applies, `base` (the hull this one came before, came from, or varies).

**The Belt has no T1 or T2 of its own.** A Belt hull's generation is its source's (a Union Wildcat over a Notice is T1 underneath), and the Belt never retires anything. Belt rows are **Union pattern** (a UDF standard applied to a rebuilt hull, see below) and **clan**.

## Tags and grades

**Navy tag.** A tag on a hull meaning "navy grade": better stats than the same hull without it (how much is the lead's call). What a navy licence buys. The tag, not the hull, is what makes a warship a navy warship. Suggests a boolean `navy` on the hull entry, and the stat bonus it applies.

**UDF tag.** The Belt's Navy tag. Carried by any Belt hull while on UDF rota; off rota it comes off. Same mechanic, toggled by a rota state rather than a purchase.

**Grade.** The state of an *owned ship* built on a hull that can carry a tag: **Navy** (tag on, licence and duties apply) or **civilian** (tag off, open market, no duties). Available on current corvettes, patrol boats and light fighters; frigate and above and heavy fighters are built Navy only. A civilian-grade ship can be brought up to Navy grade later with the licence, so a pilot keeps the ship when they join. For the Belt the grades are **UDF** and **cooperative**, by rota. Independents, legacy and clan hulls have no grade. Suggests `grade` on the owned ship, not the hull.

**Civilian hull.** A hull built for a civilian job (hauler, shuttle, prospector) with no Navy tag and no grade. Navies buy them as sold for non-offensive roles and fly them in navy livery with no tag.

**Licence.** A pilot's standing-gated permission with one power's navy. It unlocks Navy grade and Navy-only hulls, and comes with **duties** that grow with access (patrols, escorts, responses: sovereignty work, see `navy.md`). An owned ship is never taken back; a pilot who abandons their duties is a **deserter** to that power. Suggests `licence` per power on the pilot, with a duty ledger.

**Standing.** Reputation with a power, a company, a cooperative or a clan. Gates licences, patterns, Union pattern purchases and clan hulls. Never lost for flying a rival's ships. Already designed (`design.md`).

## Roles and capabilities (T3)

**Role.** The one capability a special operations hull is built around. Three values, each a hull ability the lead implements once:

| Role | Class | Ability | Cost |
| --- | --- | --- | --- |
| **Watcher** | Frigate (corvette for the clans) | Fast and agile despite size; cold-running (off the board when dark); holds a **lock** on a target that other ships can jump to | No real damage; dies to anything that catches it |
| **Hunter** | Cruiser | **Jumps** onto a jump target and lands at close range; **pins** the target (burn, turn and capacitor penalties while held); heavy armour | Slow; modest guns; long jump cooldown; no shields for a few seconds after landing |
| **Striker** | Battleship (frigate for the clans) | Jumps in behind the hunter; alpha damage far above its class | Low defences; committed once landed (cooldown) |

**Jump.** An in-system hop without a gate, from a standing start to a point at close range. Needs a **jump target**: a watcher's lock, a friendly fleet beacon, or a station beacon. Never crosses systems. Arrival is loud (a flash on the board, a capacitor dump, a shield gap) and the cooldown is long. The drive is gate-born (Lattice material), single digits per power, banned under the Ceres Accord's Open Lanes clause. Clan hulls have no drive and burn in.

**Hunting group.** The NPC task group the roles form: watcher, hunter, strikers, then the regular patrol by burn. Spawned against wanted ships (`navy.md`).

## Makers and routes

**Naval yard.** A company that builds for its navy only: Kessari (Earth), Seraphine (Mars), Ishtar (Venus). Its production hulls carry the Navy tag and come in two grades where the class allows.

**Fighter makers.** Vantage (Earth), Arcadia (Mars), Ishtar and Solace (Venus). Fighters follow the navy rules: light fighters Navy or civilian grade, heavy fighters Navy only, retired marks sold whole. The Solace Stretcher is a SAR heavy sold to every navy.

**Independent.** A company with no flag: Meridian Yards, Corvane Heavy Industries. Licensed by the Ceres Registry, based at Accord free ports, sells civil and combat hulls to anyone at any size. No Navy tag, no licence, no grade. Meridian cheap (Registry-issue prices), Corvane a bit pricier. Paragon Arms is the module-maker equivalent.

**Union pattern.** The Belt's UDF standard applied by Union Defence Works, the refit shop, to a captured, bought or copied hull. "Wildcat" is a standard, not a slipway. Sold only in the Belt for cooperative standing and cheap credits; every one a little different; old mounts; the UDF tag only while on rota. Points at its source with `base`.

**Route.** How a pilot reaches a hull. Five for warships: navy licence; independents; retired navy; Union pattern; clan hull. The table in `fleet.md` "Five routes to a warship" says what each costs and what the catch is.

## Small craft

**Subcraft.** A crewed NPC small craft carried in a bay: fighters (combat subcraft), mining, salvage and rescue subcraft. Bay products from companies. Light combat sold openly; heavy behind the licence; industrial subcraft never armed. Pilots are crew (a later system, costs and risks only).

**Drone.** An uncrewed bay product. Combat drones follow the same grade rules by maker; industrial drones never armed. In the art, drones are pure machines, not small fighters: no cockpit, no fighter silhouette; a frame around a sensor, a tool or a weapon, with thrusters where they fit (Jason, 7 November).

**Pod.** The lifeboat every registered ship carries (Meridian Ark). Shooting one is the one crime every power pursues (the Mercy Clause).

## What the lead needs to carry, in one list

On the hull entry: `class`, `weight`, `tier`, `generation`, `navy` (tag), `role` (T3 only), `base` (successor, source or pattern base), `maker`, `power` or `independent`, `patterns` (list of pattern hull ids), sale route.
On the owned ship: `grade` (navy / civilian / udf / cooperative / none) and, for Union pattern, the rota state that sets it. Its transponder line (`lore.md`, "What a transponder says"): `name` (the pilot's), `flag` (E, M, V, B or A), `registry` (`CR-` plus flag letter plus six digits, fixed for the hull's life), `hullNumber` (navy and UDF only, class letter plus number) and the prefix, which follows from service, rota state, the Mercy Clause and flag.
On the pilot: standing per power, company, cooperative and clan; licences and their duty ledgers; home station; `continuity` (the Fade, one way only) and the flags `ironman` and `voiced` (`lore.md`, "Death and the Return").
Systems the terms imply, in dependency order: standing and licences; the Navy tag bonus and the grade flag; the used market with legacy and retired navy; patterns as variants; the Belt rota; then, when T3 hulls exist, locks, beacons, jumps, the pin and hunting groups.
