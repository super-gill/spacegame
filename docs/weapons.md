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

## Shield arcs

Agreed with Jason, 4 November 2026, to break up head-on duelling.

- **A shield covers the bow and both beams; the stern is open.** The main drive has to fire, and its wash cannot pass through a shield, so no ship under way can close its shield over the stern. A hit from outside the arc goes straight to armour and hull.
- **Coverage is a property of the shield generator** (`ModuleSpec.shieldArc`, radians centred on the bow; `ShipStats.shieldArc` is the widest fitted). Stock generators cover 270 degrees, leaving a 90-degree stern quarter open (`STOCK_SHIELD_ARC`). Better generators may wrap further; none closes fully.
- **Bastion mode (later, big ships only):** a line ship or capital can shut its drive down and close the shield all the way round, at the cost of not moving. It comes with the first hull of that size.
- **NPCs fight for the stern:** pirates and the Watch hold off their target at their standoff but work their way round it towards its stern, a step at a time (`sternHoldPoint`), nose on the target throughout; a target that keeps turning its bow to them keeps them circling. Pirates cap their speed towards a station so a chase never carries them into its security zone (`keepOutOfZones`).
- **Heat seekers** tend to arrive at the stern, where the engines are: the open quarter.
- Later: hits that land past the shield damage the module nearest the impact (engines from astern, guns and sensors from ahead).

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

## As built: part 1

Choices the build made (Lead 3, 4 November 2026).

- **Capacitor numbers:** Tern 80 (recharge peak 5/s), Warrant 90 (9/s), Manifest 160 (3/s), Tacet 1,000 (100/s), Ark 15 (1/s). Recharge follows EVE's curve: peak at about a quarter full, slowing to zero at full. Shield recharge spends 0.4 capacitor per shield point. Full-size radars, computers and nav computers drain 0.1 to 1.0 per second.
- **Ammunition is boxed:** one unit of the good is a box (rounds 20, shells 4, charges 10), so a hold of 20 is not spent on bullets. Guns reload whole boxes from the hold over 3 to 6 seconds; a new pilot gets three boxes with the Tern. Harbour and the Ridge sell rounds, Lantern Works everything, and NPC crews restock at the dock off-screen.
- **Guns:** the six families in S, M and L from one base profile each, doubling damage and capacitor per size. Today's fits map in: the Fairshot is a pulse laser (1.6 capacitor a shot), the Picket an autocannon on rounds, the Watchman and Sentry swivels on rounds (a Bulwark L exists). Lore names on the modules; the pulse, beam, blaster and railgun lines have no fits yet.
- **Resistances:** shields stop 30 to 35% thermal, 10% kinetic, nothing from fragmentation; armour stops 25 to 30% kinetic, 35 to 40% fragmentation, 5% thermal. Layered defences take the stronger value, not the sum.
- **Toughness went up about two and a half times** (hull structure, shield and armour modules) so a fight lasts long enough for the capacitor to matter. A new pilot flying straight at the raider wins in 8 to 15 seconds, runs the Tern's capacitor dry once, and limps home; pacing fire wins faster and cleaner. The raider gained armour. The Warrant keeps its plain damage bonus until missiles (part 2).
- **Arcs:** the Tern's and Warrant's nose swivels cover 270 degrees (blind astern), the Manifest's single swivel the forward half: pirates learn to come from behind. The Tacet's is all round.
- **NPC gunnery:** pirates and the Watch hold fire below 15% capacitor and open up again when it recovers; ammunition guns fire while loaded. Traders creep the last stretch into a station at docking speed, so a fast-moving Lantern Works does not run them down.
- **Fire groups:** keys 1 to 4; every gun starts in group 1. Nothing assigns groups yet beyond that (outfitting, 6d).
- **Client stopgaps** for the interface workstream: the capacitor fills the dial's inner ring (amber, red when low); weapon tiles show rounds loaded and boxes aboard or CAP, and the fire group; outfitting names the gun types and shows capacitor, recharge, drain and resistances.

## As built: part 2

Choices the build made (Lead 3, 4 November 2026).

- **Launchers:** Ito-Marr Magazine S, M and L (missiles: warhead base 36, 72 and 144, one every 2.5 s, holding 4, 8 and 12) and the Arsenal L (torpedoes: base 320, one every 6 s, holding 4). No capacitor; they reload whole boxes from the hold over 8 to 12 seconds and draw little power. A new launcher joins **fire group 2** and comes loaded with the cheapest munition that fits. Space fires it at the **active lock**, and only a complete one (`launchRefused` otherwise).
- **Munitions are goods**, boxed like rounds, from KOD: Summons Breach (explosive, the all-rounder), Summons Scatter (fragmentation, a little harder hitting), Summons Breach Heat (heat-seeking, a little weaker) in boxes of 4, and Foreclosure Breach torpedoes in boxes of 2. The good carries the airframe (`GoodSpec.munition`: speed, turn rate, life, signature, structure) and the warhead (`ammo.damageType`, `ammo.damage` scaling the launcher's base). A launcher loads any good whose `ammo.fits` names its slot, keeping to the same one while the hold has more.
- **Flight:** a munition leaves with the ship's velocity and reaches its own speed relative to the local frame within about half a second, turning no faster than its turn rate towards where its quarry will be. Missiles fly at 420 to 440 u/s for 8 to 9 seconds; torpedoes at 210 u/s for 16. **A Tern at full speed outruns a torpedo**, and a hard turn close in beats a missile. A munition hits the first hull on its path, bursts within a few units of the ship it homes on, and is stopped by station hulls, rocks and surfaces.
- **Radar-homing** follows the launch target while the launching ship holds its lock; drop the lock and it flies straight. **Heat-seeking** is fire and forget: every tick it turns for the hottest thing within about 50 degrees of its nose and 1,200 units, ships and flares alike, so the wrong ship can draw it.
- **Point defence:** swivels shoot at the nearest munition coming for their own ship (homing on it, or launched at it), inside range and arc, **hot or cold**, before anything else; assigned to a lock or with none coming they behave as before. Any shot that crosses a munition can hit it. A missile dies to two swivel hits, a torpedo takes about eight. A Manifest's forward swivel cannot cover its stern.
- **Countermeasures:** dispensers are utility or core modules with no power need, holding one kind of charge at a time and dropping one per press of C (one per second from S, faster from M). Brands as lore set them, each loaded with the main kind of its mix: Paragon Fair Warning S (chaff), Slagline Sparkler S (flares), Ito-Marr Screen M (chaff), Novum Ghost S (decoys). Charges are goods: chaff and flares in boxes of 6, decoys of 2. A dropped charge drifts astern and fades.
  - Chaff, or a decoy, dropped within 1,500 units of a radar missile chasing its owner draws it with chance *charge signature / (charge + ship signature)*: about 60% for a Tern, 40% for a Manifest. Drawn, the missile chases the charge and is spent. The roll is a hash of the two ids, so the sim stays deterministic.
  - Flares and decoys outshine a small hull while fresh (36 and 50 against a Tern's 18), so a heat seeker turns for them. A flare dropped and then a hard turn out of the seeker's cone is the counter; a big hull is brighter than a flare.
- **Hull bonus:** the Warrant's is now +25% damage from full-size launchers (its family); the plain gun bonus is gone.
- **NPCs:** pirates lock what they hunt and open with missiles from 400 to 1,800 units, then close to guns. The raider carries a Magazine S with one box of four missiles and, since it never docks, no reload: a fight costs it. The Watch carries a Magazine M (with the hull bonus) and a Fair Warning, launching from 350 to 2,200 units. Traders carry an Ito-Marr Screen. Any NPC with a dispenser drops a charge when a munition coming for it is within 700 units. NPCs restock munitions and charges at the dock like rounds.
- **Markets:** Harbour sells Summons Breach, chaff and flares; Lantern Works the whole KOD range, torpedoes and decoys.
- **The starter** has no free mount for a dispenser: a pilot who wants one gives up the armour plate in the utility mount. Its nose swivel already defends.
- **In a 20-minute soak** pirates launched about 20 missiles at traders and the Watch; swivels shot down about 15 and chaff drew off about 10 (some were both); 4 hit. The Watch's missiles at undefended pirates hit 20 of 24. Trader docks went up slightly and losses down.
- **Client stopgaps:** munitions drawn as small darts (torpedoes larger), red when coming for you; charges as flickering points; a pulsing MISSILE INBOUND line at the top with count, guidance and range; launcher and dispenser tiles show what is loaded and boxes aboard; swivel tiles say PD, or DEFENDING while something is inbound; C drops a charge; toasts when a launch is refused or a charge draws a missile off.

## Later

- A capacitor battery module (fitting polish).
- Mixed dispenser magazines, so a brand's mix (lore) is dropped as a mix rather than one kind at a time.
- Picking which munition a launcher loads (today: the one in it while any is left, else the cheapest that fits).
- Lock warnings: knowing that someone is locking you before the missile comes.
- Capacitor warfare and electronic warfare.
- Penetrator and other warheads; signature-seeking guidance; mines.
- XL weapons; modules across two mounts.
