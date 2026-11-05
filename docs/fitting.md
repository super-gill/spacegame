# Fitting overhaul (design, 5 November 2026)

**Status: draft for Jason's review. No code until he approves it.** Supersedes the mount types in `docs/ships.md` and the slot budget in `docs/ship-systems.md` once built.

## Goals (Jason, 5 November)

- **EVE's fitting freedom.** A hull has a purpose but can be fitted universally. Role bonuses nudge; they never dictate. Odd builds are legitimate if they pay their costs: an armour-bricked hauler, a mining hull with a gun and nothing but armour, an oversized afterburner on a small hull, small guns on a big hull to hunt small ships.
- **Not combat first.** Mining, hauling, salvage, exploration and industry get the same fitting depth as fighting, and the same care in balancing.
- **Balancing is ongoing, and part of the fun.** Tools make it cheap: the fitter, reference fits and an audit (below).
- **Buy, then fit.** Modules are items. You buy them at a market, they sit in your station storage, and you fit them from there.

## What a hull is

A hull is three things and nothing else:

1. **Fitting constraints:** how many high, mid and low slots it has and their sizes; its core system slots and their sizes; and its frame (mass, structure, top speed, turn rate, capacitor, signature, radius). Power comes from reactors, as now.
2. **Role bonuses:** a few percentages for full-size modules of the kinds its role wants (mining lasers on a mining hull, launchers on the Warrant). Nudges.
3. **Built-in role equipment:** things a role gets that cannot be fitted elsewhere: a mining hull's ore hold (built), later a carrier's drone bay or a freighter's sealed hold. Few, and each one is the hull's identity.

## Slots

Every ship has **core systems**, one of each, at a size the hull sets. Then **high**, **mid** and **low** slots, which any module of that tier can use.

| Tier | What goes there | Today's kinds |
| --- | --- | --- |
| **Core** (fixed) | What every ship needs to be a ship | engine(s), thrusters, main reactor, nav computer, radar, targeting computer, flight computer, fire control, pod bay |
| **High** | Acts outward, or draws a lot of power | guns, swivels, launchers, mining lasers and turrets, tractor, charge rig |
| **Mid** | The ship's own active systems | shield generator, afterburner, countermeasures, survey scanner, ore hopper; later shield boosters, self repair, sensor boosters, electronic warfare |
| **Low** | Passive, internal | armour, cargo pods and containers, drone bay, extra reactors; later capacitor batteries and other core extensions |

- **High slots are hardpoints:** each has a place on the hull and a firing arc, as weapon mounts do now. Mid and low slots have places only so the ship can be drawn from its fit.
- **The dedicated mining mount goes.** Mining turrets fit high slots; the Hulk's two big highs have full arcs. The mining hull's bonus is the nudge.
- **Tractor and charge rig move to high** (Jason, agreed). **Afterburner moves to mid.** Jason's rule of thumb: outward-acting in high, inward in mid, passive in low; how scanners, countermeasures and electronic warfare fit that rule is still open (question 1).
- **Drone bays stay a low** so any ship can trade armour for drones. Carriers later get theirs built in.

### Sizes

- **Undersizing is legal** (it already is): a small module in a bigger slot. Role bonuses apply only at full size, as now. Undersizing is a real tactic only if big weapons are weak against small targets (below).
- **Oversizing:** a module one size up in a mid or low slot (Jason's oversized afterburner), paying only its natural costs: its own power, mass and capacitor draw, which are already a large share of a small hull's budget (Jason). The audit watches for oversized modules that cost too little (a bigger afterburner draws no power today, only capacitor while burning); a penalty is added only if needed. Not in core slots. Not in high slots, so arcs and hardpoints stay honest; slot merging covers big guns.
- **Slot merging (part two):** two neighbouring slots of the same tier and size become one a size up, losing both. The hull lists which pairs may merge. A glass cannon: two small highs on the nose become one medium gun.

## Costs that make choices

Freedom only works if every module costs something a different build would rather keep.

- **Power** stays the one budget (no second budget like EVE's CPU unless power alone fails to discipline fits). An extra reactor in a low is how a glass cannon pays for its guns.
- **Mass** already costs acceleration and spin-up (thrust divided by mass); top speed and turn rate stay hull limits. Armour should feel heavy: the audit checks that an armour-bricked hull is clearly slower to get going and to turn. If not, armour's mass goes up.
- **Capacitor:** shields, energy guns, scanners and boosters share one pool.
- **Signature** (proposal): bigger and hotter kit raises the hull's signature (big guns, engines, charge rigs), making it easier to see and lock.
- **Big weapons against small targets** (proposal, needed for undersizing): each weapon has a **resolution** by size (small 15, medium 30, large 60). A hit does full damage to a target whose signature is at least the resolution, and proportionally less to smaller ones. A large gun barely scratches a frigate; a small gun does full damage to anything. Swivels also traverse slower the bigger they are. Mining lasers are unaffected (rocks are big).

## Buying and fitting

- **Modules are items.** They are sold at markets (for now every station sells every module, Jason: the starter system is the test bed; regional stock later), bought into your **station storage**, and fitted from storage at a station with outfitting. Unfitting puts them back in storage; you can sell them at the market.
- **One storage per station** for goods and modules together (today's `Pilot.storage` for modules and `Pilot.hangar` for goods merge).
- **No fitting fee per item** (Jason): fitting and unfitting while docked is free, so experimenting costs nothing. A charge for keeping a new fit is open (question 3).
- **Ships** stay in the ship mart, sold with their stock fit.

## Rigs (later)

Permanent hull modifications: a bonus with a drawback, installed at outfitting, destroyed if removed. Each hull gets a rig count now (small 1, medium 2, large 3) with nothing to fit until the tiers have been played. Name to come from the lore chat.

## Slot counts, first pass

Translated from today's mounts so totals stay close and stock ships stay viable; the audit will move these. Sizes in order.

| Hull | High | Mid | Low | Core sizes (engine, reactor, computer) | Built in | Rigs |
| --- | --- | --- | --- | --- | --- | --- |
| Meridian Tern (cutter) | S S S | S S | S S S | S, S, S | | 1 |
| Kessari Warrant (sloop) | M M S S | M S S | M M S | M, M, M | | 2 |
| Tessaract Manifest (merchantman) | S S | M S S | M M M M M M S | M, M, S | | 2 |
| Rook and Rivet Prospector (cutter) | S S S | S S S | S S S | S, S, S | ore hold 100 | 1 |
| Rook and Rivet Breacher (sloop) | M M M S S | M S S | M M M S | M, M, M | ore hold 250 | 2 |
| Rook and Rivet Hulk (hulk) | L L M M | L M M S | L L L L M M | M, L, L | ore hold 1,200 | 3 |
| Aurel Tacet (dev) | S S S | S S | S S | S, S, S | | 0 |
| Drone, escape pod | as today: core only, plus the drone's laser in one small high | | | | | 0 |

## The fitter

A fitting calculator for Jason and the lead, built from the same sim code as the game so it can never drift out of date.

- **Where:** a second page of the client (`fitter.html`), served wherever the game is (the Tailscale preview included), plus a command-line audit for the lead.
- **Fit a ship:** pick any hull, put any module in any slot (illegal choices shown with the reason), and see the ship's stats live: power and mass, speed, acceleration and turn, capacitor and its balance, shield and armour totals and resistances, damage per second by type and against small, medium and large targets, lock time and range, cargo and ore hold, mining yield, drones. A second fit side by side shows the differences.
- **Simulate:** headless runs of the real sim. Duels against reference fits (brawler, kiter, glass cannon, brick tank, pirate raider, Watch), several runs each, with win rate and time to kill; a mining run on a standard patch of rock (ore an hour, value an hour at each market); a hauling run under pirate pressure (survival rate).
- **Reference fits** live in the repo (`docs/fits/*.json`), shared between the fitter, the tests and the audit. Jason can export a fit from the fitter and send it; the lead adds it to the library.
- **The audit** (`npm run audit`): for every hull, modules no fit should ever choose (worse in every respect than another option), slots with only one sensible choice, the best fit per role, and the duel matrix between archetypes. Run at every release; the release notes say what moved.

## Saves

Mount ids are kept where a slot survives, so most fits carry straight over. Anything that no longer fits (a module in a slot of the wrong tier or too small) goes to the owner's storage at the nearest station with outfitting, and the pilot is told on load. Ore holds, drones and cargo are untouched.

## Build order

1. **The fitter and the audit, on today's rules.** Measures where fitting stands before anything changes, and every later step is checked against it.
2. **Tiers:** core, high, mid and low slots; every hull and module re-tagged; stock fits re-checked; the outfitting screen shows tiers; save migration.
3. **Buy, then fit:** modules as items at markets, one storage per station, fitting from storage.
4. **Costs:** weapon resolution against signature, signature from kit, mass checked, numbers moved by the audit.
5. **Oversizing,** then **slot merging**; **rigs** after the tiers have been played.

Release 0.13.0 first (after Jason's playtest of breaching and holds), so the overhaul starts from a stable version.

## Questions for Jason

Answered 5 November: tractor and charge rig in highs; oversizing pays only its natural costs; no fee per fitted item; every station sells every module for now.

1. **The tier rule.** "Outward in high, inward in mid, passive in low" puts survey scanners, countermeasures and electronic warfare in highs, since all three act outward, but your list had them in mids. EVE keeps them in mids on purpose, so a fighting ship trades tank for interference. Lead's suggestion: high does work on something else (shoots, cuts, pulls, blasts); mid runs the ship's own active systems, including sensing, defending and interfering; low is passive.
2. **Weapon resolution against signature** (explained in chat): agreed, or tracking only?
3. **Charging for a new fit:** charge something when you undock with a changed fit, or nothing at all?
