# Turrets (0.16 design, for Jason's sign-off)

Status: **agreed 6 November 2026**, written by Lead 4 from Jason's decisions in the arena tests. **Step 1 (turret guns) built** on `main` by Lead 5, 6 November; see "As built: step 1". Steps 2 to 4 to come.

## Why

The arena showed what the fitting step 4 numbers could not:

- With fixed guns and 0 to 20% manoeuvring, every course change turns your guns off the target. Kiting a brig works only while you coast in a straight line; the moment you turn (to avoid a collision, to reposition) it closes and wins.
- Fixed guns ended up secondary: the ship that could manoeuvre and shoot (swivels) did the work.
- Jason's shape still holds and is the target: **a big ship wins one against one; a swarm overwhelms it; a big ship with good close defence is a small ship's nightmare and needs a missile swarm or a barrage to crack; a small ship lives just outside that close defence and under the big guns.**

## Decisions (Jason, 6 November)

1. **Fixed guns are dropped.** Every main gun is a turret. We commit to the new model.
2. **Range costs accuracy, not damage, for shot weapons; lasers lose power with range.** Projectile and bolt weapons get a spread; lasers do less damage the further they reach.
3. **Close-in weapon systems (CIWS)** replace the swivel: a huge rate of fire, short range, a big magazine to feed it for a while; it shoots any target but prefers missiles and torpedoes.
4. **CIWS is for medium ships and up.** Small ships defend against munitions with countermeasures (dispensers), which they already have. Medium hulls get some CIWS; large hulls good coverage.
5. **Main turrets fire at your selected lock** (Option A below). Fire control governs CIWS only.
6. **No XL guns yet:** nothing could carry one; they come with ships of the line.
7. **Where a gun can bear is a property of the hull:** each hardpoint's position and arc, set hull by hull. A hardpoint with a narrow forward arc is in effect a nose gun; there is no separate weapon type for it.

## The model

### Main guns: all turrets

- Every gun family (autocannon, artillery, pulse laser, beam laser, blaster, railgun) comes as a turret in S, M and L (XL with ships of the line). The turreted versions built in step 4 become the guns, at full damage: `MAIN_TURRET_DAMAGE` goes.
- **Traverse by size is the main lever.** Small turrets follow anything; large ones cannot follow a quick ship close in. Starting values: S 3.0, M 1.5, L 0.75 rad/s (each size half the one below, steeper than today's 1.6). Fire control and gun bonuses may speed them.
- **Arcs come from the mounts.** Each hardpoint already has a position and may have an arc; turrets fire only where their arc and the hull let them. A big hull with guns down its sides fights broadside; one with them forward fights nose on. This is where hull design gives each ship a character.
- **Launchers stay as they are.** Missiles and torpedoes launch forward and guide themselves; they are not guns. Dispensers (countermeasures) stay too.
- **Retired:** the standing rule "fixed guns out-damage turrets", `MAIN_TURRET_DAMAGE`, `TURRET_MOUNTING` (a turret is just a gun now), fixed gun modules and their weapons.

### Range: spread and laser falloff

- **Spread** (autocannon, artillery, blaster, railgun): each shot leaves within a small cone, so how far it misses grows with range. A big target is hit anyway; a small one at long range mostly is not. That is geometry, not a damage cut. Deterministic: the scatter comes from the world's seeded random numbers. Starting cones (half angle): autocannon 2.0°, blaster 2.5°, artillery 0.8°, railgun 0.3°.
- **Laser falloff** (pulse, beam): full damage out to half the laser's range, then falling in a straight line to 40% at full range. Lasers are hitscan or near it, so they always hit; range costs them power instead. Lore hook: the beam spreads and the energy disperses.
- **Missiles and torpedoes:** no change; they guide.

### Close-in weapon systems

- A new module kind on a new hardpoint type, `ciws`. **Only medium hulls and up have `ciws` hardpoints**, so a small ship cannot fit one, whatever its slots. Starting coverage: merchantman and brig 2, hulk 2, frigate 4. Each hardpoint has an arc, so coverage has gaps a pilot can find.
- Behaviour: engages anything hostile inside its range on its own, munitions first, then the nearest ship. Weapons hot or cold decides whether it shoots ships; munitions it always shoots.
- Starting numbers: range 350, a light round every 0.03 s (about 33 a second, 2 damage each, about 66 a second against a ship), traverse 6 rad/s, a 2,000-round magazine fed from boxes of rounds in the hold. Inside 350 a small ship melts; outside it, it is untouched.
- Fire control: the Gunlayers set how many CIWS a ship can run and how well they track (as they do swivels today). Main turrets need no fire control.
- The swivel (Watchman S) goes. Saves map fitted and stored swivels: on medium and larger hulls to CIWS on the new hardpoints where they fit, otherwise into storage at the nearest station, refunded where nothing fits.

### Who aims, and how the player fires

Decided: **Option A** (Jason, 6 November).

- **Option A, turrets follow your lock** (chosen). Your selected group's turrets track your active lock with lead; you fire them (Space or left button) when they bear. The mouse keeps steering the ship, as now. Skill is in position, range, arcs and when to fire; the HUD shows each turret's arc and whether it bears. Simple to learn, keeps mouse steering, and NPCs fly by the same rules.
- **Option B, turrets follow the pointer** (not chosen). Your selected group aims where the mouse points (twin-stick style); other groups can be set to fire at your lock on their own. More hands-on aiming, but the mouse can no longer steer: steering goes to the keys (A and D spin, W thrust), a big change to the controls Jason has been playing with.

### Balance targets for the audit

The audit's swarm table and the arena are the measures. Starting targets, to be confirmed by Jason in the arena:

- A brig beats one Warrant and loses to three; a stock frigate loses to about five or six.
- A frigate with full CIWS coverage shreds Warrants that come inside 350 but cannot catch a Warrant that holds at 400 to 600 with M guns; it needs main guns that can track, or help.
- A missile swarm (several launchers) gets through a frigate's CIWS; a single launcher does not.
- A kiter can hold range and keep firing while it turns.
- Peers: specialist beats generalist at its specialty and loses outside it.

## What changes in the code

- **Sim:** weapons (turret guns in S, M, L; CIWS; spread; laser falloff), modules (fixed guns retired, CIWS added), hulls (`ciws` hardpoints on medium and up; arcs checked on every main hardpoint), combat (turret aiming for all guns per Option A or B, spread from the seeded random numbers, falloff where damage lands, CIWS targeting with munitions first), loadouts and reference fits refitted, NPC scripts (`ai/fight.ts`, pirates, watch) simplified now that guns track.
- **Saves:** a migration maps every fitted fixed gun to the turret of the same family and size (same maker), swivels as above, and refunds price differences.
- **Client:** turret arcs and "bears" marks on the HUD, the fitter and fitting window updated, CIWS shown with its magazine.
- **Docs:** weapons, fitting, ship systems, controls (if Option B), this doc becomes "As built".

## Build order

1. **Turret guns** (all main guns turreted, traverse by size, arcs; fixed guns retired; save migration), aiming at the selected lock.
2. **Spread and laser falloff.**
3. **CIWS** (hardpoints, module, targeting, swivels retired and migrated).
4. **Refit and tune:** loadouts, reference fits, NPC scripts; audit and arena against the targets above; release.

## As built: step 1 (turret guns)

- **Every main gun is a turret** (`weapons.ts`): autocannon, artillery, pulse and beam lasers, blasters and railguns in S, M and L, at full damage. Traverse `GUN_TRAVERSE` 3 rad/s at S, each size `TURRET_SLEW_FALLOFF` (2) slower: M 1.5, L 0.75. `isMainGun` tells them from swivels, launchers, dispensers and mining lasers. `kind: 'fixed'` is now only launchers, dispensers and light mining lasers.
- **Retired:** the `<gun>-turret-m/l` weapons, the `<module>-turret` modules, `MAIN_TURRET_DAMAGE`, `MAIN_TURRET_SLEW`, `TURRET_MOUNTING`, the "fixed out-damages" rule and its tests, and the "Frigate turrets" reference fit. Still true and tested: every main gun hits harder per shot than a swivel.
- **Aiming** (`combat.ts`, `fireWeapons`): a main gun slews to the lead on its lock (the active one, or `WeaponState.lockTarget`), never outside its mount's arc, and fires on the trigger in its group when within `TURRET_FIRE_TOLERANCE` and in range. **No lock** (lead's call, for Jason to confirm): it settles back to its mount's facing and fires straight along it on the trigger, so a ship without a lock or a targeting computer can still shoot. Turret aim is held in the world frame, so a ship turning hard drags its guns behind its nose until they catch up.
- **Bearing** (`gunBearing`, `GunBearing`): `noLock`, `outOfArc`, `outOfRange`, `slewing` or `bears`, by the same tests as firing. The HUD tile says `AHEAD`, `NO ARC`, `RANGE`, `SLEWING` or `BEARS` after the group.
- **Arcs** (`hulls.ts`, `high()`): every high slot now has an explicit arc. The default is the forward half (180 degrees) centred on the mount's facing, so a bow gun bears on anything ahead but nothing astern. Mounts that already had arcs keep them: broadside and aft mounts (the brig's and frigate's sides and stern, the hulk's and Sinker's aft mount) 270 degrees centred on where they face; the Tessaract Spine's nose and the courier's, Warrant's and prospector's swivel mounts as before; the Collier's mining mounts and the Tacet's second mount all round. **For Jason to review in the arena.** What it gives: the frigate's two L guns fight nose on, its four M side and stern mounts cover the flanks and rear; the brig's two bow Ms fight forward and its three others cover the sides and stern; a small ship's guns cover its forward half, so it can keep firing while it turns across a target but not while running from it.
- **Readouts** (contract change): `LockReadout.combat.fixedDps` and `turretDps` are now `gunDps` (main guns) and `pointDefenceDps` (swivels). The target card says `ARMED n · DPS x`.
- **NPCs:** `mainGun` picks the first main gun (a swivel if there is none). Pirates and the watch hold the trigger whenever the lock is in range (the watch still checks for bystanders), instead of waiting for the nose; the lab's duellist and runner do the same (`DUELLIST.aimTolerance` is gone), and fire groups holding main guns or launchers take turns.
- **Saves:** version 14 (`migrate13to14`) turns every fitted and stored `<module>-turret` into `<module>` and refunds the turret mounting's price to the owner.
- **Client:** outfitting names main guns by type and says `turret: follows your lock at x rad/s and fires with its group when it bears`; stat rows `Gun dps` and `Swivel dps`; the lead marker uses the first main gun.
- **Not yet:** drawing each turret's arc and aim on the ship (HUD and fitting window) is left for a focused interface pass or step 4.

## Open

- **Arcs:** the defaults above, for Jason to judge in the arena.
- **No lock:** guns fire straight along their mounts (lead's call); the alternative is that they do not fire at all without a lock.
