# Weapons and power

How ships fight: the capacitor, the weapon families, damage and defence, munitions and point defence. Status: agreed design, 4 November 2026, with Jason. Milestone 6e builds it in two parts (see "Build order").

Related: [ships.md](ships.md) for hulls, mounts and fitting; [design.md](design.md) for combat as it works today; [system.md](system.md) for the living system.

## Principles

1. **Everything costs.** Every weapon draws on something: capacitor, ammunition, or both. Nothing fires for free (design pillar 5).
2. **Families, not a list.** Weapons come in four families with a character each, so a hull built round one plays differently from a hull built round another. Hulls carry bonuses to a family; which maker leans which way is lore.
3. **Fixed beats turreted.** At the same size, a manually aimed gun always does more damage than a turreted one. The turret's value is coverage and point defence.
4. **Damage has a type, defence has resistances.** The data carries it from the start; play uses a little of it at first and more later.
5. **Mirror EVE where it is good** (the capacitor, the families, locks) and depart where it is not (no energy missiles; police are beatable).

## The capacitor

- A pool of energy on every ship, a **hull property**: `HullSpec.capacitor` (capacity) and `HullSpec.capacitorRecharge` (units per second at rest), like structure and signature. The hull is the shipwright's expertise and its character lives there; a capacitor battery module is possible later as fitting polish (ideas inbox).
- The reactor refills it. Recharge is fastest when the pool is low (as in EVE), so a ship that runs itself dry recovers in a rush and then slows.
- What draws on it: energy weapons per shot, hybrid weapons per shot (less), shield recharge, and **full-size active sensors** (a radar or computer the full size of its mount). Projectile weapons and missile launchers draw none. Thrusters draw none (their cost is fuel, later).
- **Draw follows size, not kind.** A module smaller than its mount draws no capacitor and gives less (it already forgoes the hull bonus). A full-size module draws its listed `capacitorDraw`. So a small radar in a big ship's large radar mount runs on the reactor alone; the large exploration set that fills the mount runs on the capacitor. Ambition costs.
- Empty: energy and hybrid weapons will not fire, shields stop recharging, full-size sensors keep working (a dead radar mid-fight is punishment beyond the point) but the reactor alone cannot refill the pool quickly while they run.
- `ShipStats.capacitor`, `ShipStats.capacitorRecharge`, `ShipStats.capacitorDraw` (steady drain from sensors); `Ship.capacitor` is the live level. The HUD's reserved ring shows it.

## Weapon families

| Family | Short range | Long range | Capacitor | Ammunition | Character |
| --- | --- | --- | --- | --- | --- |
| Projectile | Autocannon | Artillery | None | Rounds, with a damage type per round | Free of the capacitor; artillery hits hard and slowly |
| Energy | Pulse laser | Beam laser | High | None | Never runs dry; drains the pool |
| Hybrid | Blaster | Railgun | Some | Charges | The extremes of range: blasters point blank, railguns the longest reach |
| Missile | Missile | Torpedo | None | Warheads | Homing, counterable; torpedoes heavy, slow and devastating |

- Each gun exists in sizes S, M and L (XL later), one name across sizes: Union Picket (autocannon) and Lockout (artillery); Cantor-Vell Verse (pulse) and Litany (beam), with the Paragon Fairshot as the open-market pulse laser; Commonwealth Retort (blaster) and Answer (railgun); Ito-Marr Magazine (launcher) and Arsenal (torpedo tube). Munitions are KOD's: Summons (missile), Foreclosure (torpedo), Scatter (frag) and Breach (explosive) warheads, Heat for heat-seeking. Today's weapons map in: the Fairshot becomes an energy pulse laser, the Picket stays projectile, the Watchman and Sentry become swivels.
- **Hull bonuses by family** use the existing `HullBonus` tag: a hull rewards full-size weapons of its family with damage, rate of fire, range or capacitor use. From the lore: Halcyon energy (Cantor-Vell), Kessari missile (Ito-Marr launchers, KOD munitions), Free Belt projectile (Union Defence Works), Vael hybrid (Commonwealth Fleet Works); the Oru and Drifters favour none. Paragon sells light guns of every family. The Warrant's family is missiles, which arrive in part 2; in part 1 it keeps a plain weapon damage bonus.
- **Turret is a property of the weapon**, not the mount (`WeaponKind`, as now). A mount takes a turreted weapon only if it provides `fireControl`, which is how a hull decides where turrets can go.

## Ammunition

- Rounds, charges and warheads are goods: bought at stations, carried in the hold, loaded into a weapon (`WeaponState.loaded`, `WeaponState.ammo`). A weapon with no ammunition does not fire. Reloading takes time and happens from the hold.
- Ammunition decides the damage type (and for missiles the warhead). The weapon decides rate, range and tracking.
- Resupply is at stations through the market, so running dry far from home is a real risk that energy weapons do not have.

## Damage and defence

- Every shot and warhead has a **damage type**: `kinetic` (rounds, railgun slugs), `thermal` (lasers, blaster plasma), `explosive` (warheads), `fragmentation` (frag warheads). The data carries all four.
- Shields and armour have **resistances** by type (`ModuleSpec.resists`, fraction of damage stopped). Shields resist thermal well and fragmentation badly; armour the reverse. A hull's bare structure resists nothing.
- In play at first, only two matter: kinetic against thermal, through the starter catalogue. Fragmentation and explosive arrive with missiles (part 2). Widening is data.
- Damage still hits shields first, then structure.

## Missiles and torpedoes (part 2)

- Launchers are weapon modules; missiles and torpedoes are ammunition with a warhead and a **guidance kind**. They fly as steered projectiles with their own speed and turn rate: a fast ship can outrun or outturn a missile; a torpedo is slow enough to shoot down.
- They need a lock to fire at and home on it. Missiles: fast, cheap, light warheads. Torpedoes: heavy, slow, massive warheads, a big-ship weapon.
- Guidance kinds to start: **radar-homing** (needs the firing ship's lock held) and **heat-seeking** (fire and forget, chases the hottest signature near its target, so a decoy or the wrong ship can draw it). Signature-seeking later.
- Munitions have a signature and a little structure so point defence can track and kill them.
- Warheads: **fragmentation** (shreds unshielded hulls and light craft, poor against shields) and **explosive** (heavy blast, the all-rounder). Penetrators for torpedoes later. No energy missiles.

## Point defence cannons (part 2)

- Turreted weapons become **PDCs** (in the world, **swivels**: the Paragon Watchman and Sentry): multi-role, slewing guns for both munitions and ships. Default behaviour is point defence: engage the closest incoming missile or torpedo automatically, no lock needed, because nobody can click a missile while flying. Assigned to a lock (`WeaponState.lockTarget`), a PDC engages that ship instead.
- Being multi-role, a PDC is worse than a dedicated gun at both jobs: less damage than a fixed gun of its size against ships (the standing rule), and its value against munitions is coverage.

## Countermeasures (part 2)

- A countermeasure module (core or utility mount) carries charges. Chaff spoofs radar-homing, flares spoof heat-seeking, a decoy spoofs both for longer but is dear. Makers bundle different mixes.
- Manual launch on a key, with charges resupplied at stations like ammunition.

## Hull classes

Hulls get a class on an age-of-sail ladder (`HullSpec.class`), separate from module size, which stays what fits a mount: pod, cutter, sloop, brig, frigate, ship of the line, capital, and, at any size, merchantman for trade and passengers and hulk for industry. Classes set the expectations for coverage (below), bonuses and later crew, and give the navy, the Watch and the lore a shared language. Capitals (first-rates, flagships) are where station services aboard, hangars and squadrons live, later. Today's hulls: the Tern a cutter, the Warrant a sloop, the Manifest a merchantman, the Ark a pod; the Aurel Tacet sits outside the ladder. Each people's words for line ships and capitals are in `docs/lore.md`.

## Arcs and blind spots

- Each weapon mount gains an **arc**: a centre bearing and a width in hull space. A fixed gun fires only along its mount's facing (as now); a turreted weapon slews within its arc and cannot engage outside it.
- Hull roles set coverage: combat hulls near-full PDC coverage with main guns forward and broadside; fighters forward only and no PDC; industrial hulls PDCs round with few or no primary mounts; traders a PDC or two with blind spots aft, so pirates learn to come from behind.
- The outfitting screen should show coverage (interface workstream).

## Fire groups

- Weapons are assigned to groups; number keys select a group and Space fires it. Turreted weapons in point defence need no group. Default groups: fixed guns in 1, launchers in 2.

## Build order

**6e part 1: power and guns (lead).** Hull classes as data; the capacitor as a hull property with reactor recharge and size-based draw; the six gun types with ammunition as goods, reloading, damage types and resistances in the data; hull bonuses by family; arcs; fire groups. The game is playable and more varied after this alone.

**6e part 2: munitions (lead).** Missiles and torpedoes with guidance and warheads; PDC point defence; countermeasures.

**Client (interface workstream).** The capacitor ring; ammunition counts and reload on the weapon tiles; fire group selection; arcs and coverage in outfitting and on the HUD; incoming munition warnings; countermeasure charges.

**Lore (lore workstream).** Names for the six guns and the two warheads in each maker's voice; which maker leans to which family; the character of each hull's capacitor; countermeasure brand mixes.

## Later

- A capacitor battery module (fitting polish).
- Capacitor warfare and electronic warfare.
- Penetrator and other warheads; signature-seeking guidance; mines.
- XL weapons; modules across two mounts.
