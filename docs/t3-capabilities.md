# Special operations capabilities: the spec

Written 7 November 2026 by the lore chat for the lead, after Jason asked whether a fresh chat could build a hunter from the docs. It could not: the roles were named and placed (`fleet.md` "Special operations: the T3 line", `hull-terms.md` "Roles and capabilities"), not specified. This page specifies them as mechanics against the systems that already exist: contacts and locks (`interface.md`), the transponder (`Ship.dark`), the capacitor and afterburner (`ship-systems.md`, `weapons.md`), shields, burn/flip/burn navigation, security zones and witnessed crime (`design.md`, `navy.md`). Every number is a starting guess marked **tune**; the shapes are the decisions. Nothing here is needed until T3 hulls exist in the game.

## Three abilities, one each

A T3 hull has exactly one role and the role is one hull ability. The abilities are: **lock** (watcher), **jump** and **pin** (hunter: jump is shared with the striker, pin is the hunter's own), **strike** (striker). Clan hulls have lock (Vane) and strike (Shade) and no jump.

## Lock (watcher)

What it is in fiction: the watcher shadows a ship off the board and holds it in its sights; its lock is what the hunters jump to.

Mechanically, it extends the target lock that already exists:

- A watcher's lock is an ordinary target lock (`interface.md`, LOCK column) with three differences: it **holds at long range** (`lockRangeWatcher`, suggest 3× a normal targeting computer's range, tune), it **survives the target running dark** (a dark contact normally cannot be locked from range; a watcher keeps a lock it already has through a transponder change), and while held it is **published as a jump target** to the watcher's power or fleet.
- Acquiring it takes time (`lockTimeWatcher`, suggest 8 s at long range falling to 2 s close, tune) and needs line of sight in the sim's sense (no rock or station between).
- It breaks when: the target leaves the watcher's lock range; the watcher takes shield or hull damage above a threshold (`lockBreakDamage`, suggest any hull damage, tune); the watcher lights its transponder or fires (a watcher that shoots is a frigate, not a watcher); or the target docks or gates out.
- The target is told. The existing warning `BEING LOCKED` and `TARGET LOCK ON YOU ×n` fire as for any lock, so a pilot being watched knows *something* has them, without knowing what. That is the counterplay: break line of sight, close and shoot the thing you cannot see on the board, or run for a gate before the hunter arrives.
- **Cold running.** A watcher running dark is a smaller radar return than its class (`radarSizeWatcherDark`, suggest it reads as `RADAR · SMALL` at any range where a frigate would read MEDIUM, tune) and is not picked up by station sensors inside a security zone until closer than a normal dark ship would be. It is not invisible; it is small and quiet.
- Cost: the watcher's hull is thin (shields and hull at the bottom of its band), its mounts are light, and it carries no missiles or bays.

## Jump (hunter and striker)

What it is in fiction: a gate-born drive hops the ship a short way without a gate, from a standing start to close range on a target. Banned under Open Lanes; every navy denies it.

Mechanically, a new action on hulls with the drive:

- **Needs a jump target.** One of: a watcher's published lock (on a ship), a **fleet beacon** (a ship in the same fleet that has one running: a hunter can be a beacon for strikers once it has landed), or a **station beacon** (a station of the jumper's power, or any station under a Venusian Haven's Mercy rules). No target, no jump. The player picks the target from the contacts list or the fleet list; NPCs pick by task.
- **Range.** In-system only, never through a gate. `jumpRange` is a hard cap in sim units (suggest the sensor range of a capital-class radar, so a jump is always to something the ship could in principle see, tune). Arrival is at `jumpArrivalDistance` from the target (suggest 300 units, inside gun range and outside collision, tune), on a random bearing, with the ship's velocity set to the target's velocity (it arrives matching course, which is what lets a slow hunter land on a fast target).
- **Spool.** Pressing jump starts a spool (`jumpSpool`, suggest 12 s, tune) during which the ship cannot fire or afterburn and its drive signature is visible on the board to anyone with a lock on it. Damage during spool does not cancel it; a broken jump target does (if the watcher loses its lock mid-spool, the jump fails and half the cooldown is charged).
- **Arrival is loud.** On landing: the full capacitor is dumped to zero; shields are down for `jumpShieldGap` (suggest 6 s, tune) and then recharge from empty; a flash on the board visible to every ship in sensor range of the arrival point, lit transponder or not; the hull is witnessed to have jumped (see Law, below).
- **Cooldown.** `jumpCooldown` (suggest 10 minutes of sim time, tune). A ship that has jumped is committed: it fights or it burns out the old way.
- **Who has it.** Hunter and striker hulls only. Single digits per power exist in the fiction; in the game it is a hull property and the rarity is the route (top of the standing ladder, stolen, story).

## Pin (hunter)

What it is in fiction: the hunter grabs the target and holds it for the fleet. "Interferes with a target ship's ability to operate."

Mechanically, a held beam with range and an effect profile:

- **Activation.** A hunter with a locked target inside `pinRange` (suggest 600 units, tune) can hold the pin (held key, like the afterburner; NPCs hold it continuously). It needs line of sight and breaks if the target leaves range or the hunter's lock is lost.
- **Effect on the target, while held**, applied as multipliers so they stack with nothing else of their kind (a second hunter does not double it): main thrust and speed cap × `pinThrust` (suggest 0.35, tune); turn rate × `pinTurn` (suggest 0.5, tune); capacitor recharge × `pinCapacitor` (suggest 0.25, tune), so afterburners and energy weapons starve; and the target's burn/flip/burn plan is invalid (the nav computer shows arrival time as unknown while pinned). Shields, hull and guns are untouched: a pinned ship can still fight, it just cannot leave.
- **Cost to the hunter.** The pin drains the hunter's capacitor continuously (`pinDrain`, tune) so a hunter holding a pin cannot afterburn and fires only its modest guns; it has to be within 600 units of something it has just annoyed. Its hull is the top of its band and it carries spaced armour for exactly this.
- **Counterplay.** Kill the hunter (it is a cruiser, so this takes a group or a battleship); break line of sight behind a rock or station; get outside pin range before it lands (the arrival flash gives a few seconds); carry countermeasures that break locks (the existing C key breaks a watcher's or hunter's lock on a roll, tune the roll); or surrender (weapons cold, transponder lit), which the Coastguard and the Charter Fleet accept and Mars accepts after boarding.
- **Not** an area effect, **not** a tractor (it does not move the target), **not** a disable (guns and shields keep working). Those three lines keep it a hunter and not a win button.

## Strike (striker)

What it is in fiction: the striker jumps in behind the hunter and ends it. Stripped down, bristling, flown in packs by elite crews, committed once it lands.

Mechanically, a damage profile rather than a new verb:

- The striker's mounts are oversized for its class (`fleet.md`: eighteen open rails a side on the Sentence, four heavy lenses on the Medusae) and it carries a **first-salvo bonus**: for `strikeWindow` (suggest 20 s, tune) after arrival its weapons fire at `strikeMultiplier` (suggest 2.0, tune) damage and ignore the first `strikeShieldBypass` fraction of the target's shield (suggest 0.5, tune; Mars's version ignores armour instead, because its lenses are energy). After the window it is a battleship with thin armour and an empty capacitor.
- Cost: shields and hull at the bottom of its band; the jump cooldown means it cannot leave; the capacitor dump on arrival means the window is paid for by whatever charge it recovers in 20 seconds, so a striker that lands and is immediately pinned itself (by an enemy hunter) has wasted its one pass.
- Clan strikers (the Shade) have the first-salvo bonus with no jump: they burn in cold behind a watcher and the window starts when they light up.

## The group as NPCs

A hunting group is a task group (`navy.md`, "Who turns up", rung 5) spawned against a hull at wanted rung 4 or above. Behaviour, in order: the watcher burns to the target's system, runs dark, acquires a lock and holds station at the edge of its range; when the lock is stable for `groupLockHold` (suggest 30 s, tune) the hunter jumps, lands and pins; the strikers jump to the hunter's beacon `strikerDelay` later (suggest 10 s, tune) and open fire; the regular reserve or navy group burns in behind by the ordinary rungs. The group disengages when the target dies, docks at a station it cannot follow into, surrenders, or when the hunter is destroyed (strikers without a pin burn out). A group never forms inside a Core security zone of another power.

## Law

Jumping is witnessed like any crime (`navy.md`): the arrival flash is seen by every ship and station in sensor range. In another power's Held or Core space, a witnessed jump is an Open Lanes violation that climbs the escalation table like firing on a navy hull; the jumper's own power denies everything and pays nobody. This is why hunting groups work in the Marches and in the hunter's own space, and why a stolen hunter is a problem for whoever holds it.

## What the player gets

Flying a T3 is the top of a navy's standing ladder, so the player version is the NPC version with a human on the stick: a watcher pilot does escort-and-lock work for hunting groups and sees the whole thing from the dark; a hunter pilot gets the jump and the pin and owes the navy for them; a striker pilot gets one pass and a long walk home. All three come with duties (`navy.md`): a pilot in a T3 is on call.

## Tunables, collected

`lockRangeWatcher`, `lockTimeWatcher`, `lockBreakDamage`, `radarSizeWatcherDark`, `jumpRange`, `jumpArrivalDistance`, `jumpSpool`, `jumpShieldGap`, `jumpCooldown`, `pinRange`, `pinThrust`, `pinTurn`, `pinCapacitor`, `pinDrain`, `strikeWindow`, `strikeMultiplier`, `strikeShieldBypass`, `groupLockHold`, `strikerDelay`. All starting guesses; Jason: response times and the like are tuned in game and per system.

## Open

- Whether a fleet beacon is a module (anything can carry one) or a hull property (only hunters and capitals). Proposal: a module, Navy grade, so a Mandate or a Hellas can be a jump target for its own strikers.
- Whether the pin should work on stations' docking clamps (holding a ship on the pad). Proposal: no.
- Whether a pinned pod can be jumped to. Proposal: no; the Mercy Clause.
