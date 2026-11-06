# Fitting overhaul (design, 5 November 2026)

**Status: approved by Jason, 5 November 2026.** Building starts with the fitter, after 0.13.0. Supersedes the mount types in `docs/ships.md` and the slot budget in `docs/ship-systems.md` once built.

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
- **Tractor and charge rig move to high** (Jason, agreed). **Afterburner moves to mid.** The rule (Jason, 5 November): high does work on something else; mid runs the ship's own active systems, including sensing, defending and interfering; low is passive.
- **Drone bays stay a low** so any ship can trade armour for drones. Carriers later get theirs built in.

### Sizes

- **Undersizing is legal** (it already is): a small module in a bigger slot. Role bonuses apply only at full size, as now. Undersizing is a real tactic only if big weapons are weak against small targets (below).
- **Oversizing:** a module one size up in a mid or low slot (Jason's oversized afterburner), paying only its natural costs: its own power, mass and capacitor draw, which are already a large share of a small hull's budget (Jason). The EVE version works because the cost defines the whole fit: a large afterburner empties a small capacitor almost at once, so the build needs capacitor modules in every spare low, and the right ones are rare and expensive. Ours needs the same: capacitor draw that scales hard with module size, and capacitor modules for lows (batteries that add to the pool, rechargers that speed it up), so an oversized build is possible, tight and costly rather than a free upgrade. Expensive higher-grade kit (EVE's faction and pirate gear) comes later with the economy. The audit watches for oversized modules that cost too little. Not in core slots. Not in high slots, so arcs and hardpoints stay honest; slot merging covers big guns.
- **Slot merging (part two):** two neighbouring slots of the same tier and size become one a size up, losing both. The hull lists which pairs may merge. A glass cannon: two small highs on the nose become one medium gun.

## Costs that make choices

Freedom only works if every module costs something a different build would rather keep.

- **Power** stays the one budget (no second budget like EVE's CPU unless power alone fails to discipline fits). An extra reactor in a low is how a glass cannon pays for its guns.
- **Mass** already costs acceleration and spin-up (thrust divided by mass); top speed and turn rate stay hull limits. Armour should feel heavy: the audit checks that an armour-bricked hull is clearly slower to get going and to turn. If not, armour's mass goes up.
- **Capacitor:** shields, energy guns, scanners and boosters share one pool.
- **Signature** (proposal): bigger and hotter kit raises the hull's signature (big guns, engines, charge rigs), making it easier to see and lock.
- **Big weapons against small targets** (proposal, needed for undersizing): each weapon has a **resolution** by size (small 15, medium 30, large 60). A hit does full damage to a target whose signature is at least the resolution, and proportionally less to smaller ones. Swivels also traverse slower the bigger they are: both, Jason. Mining lasers are unaffected (rocks are big).
- **But a big ship must be able to defend itself** (Jason): in EVE a battleship fitted as a battleship struggles with anything much smaller, which an MMO's fleets cover but which would be punishing here, where a player is often alone. So: a floor on resolution (a big gun never does less than about 40% to a small target, to tune); every big hull has a few small highs for swivels, and stock fits use them; drones as the other answer to small ships. The audit checks that every stock fit with guns can drive off or kill a pirate raider in reasonable time.

## Buying and fitting

- **Modules are items.** They are sold at markets (for now every station sells every module, Jason: the starter system is the test bed; regional stock later), bought into your **station storage**, and fitted from storage at a station with outfitting. Unfitting puts them back in storage; you can sell them at the market.
- **One storage per station** for goods and modules together (today's `Pilot.storage` for modules and `Pilot.hangar` for goods merge).
- **No fitting fee** (Jason, for now): fitting and unfitting while docked is free, so experimenting costs nothing.
- **Ships** stay in the ship mart, sold with their stock fit.

## Rigs (later)

Permanent hull modifications: a bonus with a drawback, installed at outfitting, destroyed if removed. Each hull gets a rig count now (small 1, medium 2, large 3) with nothing to fit until the tiers have been played. Name to come from the lore chat.

## Hull classes set the template

The class ladder stays (`HullSpec.class`, `docs/ship-systems.md`). A class sets a hull's slot template and the usual size of its slots, which follows the class up the ladder; each hull then varies within its class for character (one slot moved between tiers, or one extra in its role), and its pad size (`sizeClass`) follows as now. Today's budget table translates: high is today's weapon slots plus one (tractor and charge rig moved in), mid is today's utility slots (afterburner and scanners stay, shields move in), low is today's internal slots plus cargo bays (shields move out).

| Class | High | Mid | Low | Usual slot size |
| --- | --- | --- | --- | --- |
| Pod | 0 | 0 | 0 | |
| Cutter | 3 | 2 | 3 | S |
| Sloop | 4 | 3 | 4 | M, some S |
| Brig | 5 | 3 | 6 | M |
| Frigate | 6 | 4 | 7 | M and L |
| Ship of the line | 9 | 5 | 10 | L |
| Capital | 11 | 6 | 13 | L, XL later |
| Merchantman | 2 | 3 | 9 | M |
| Hulk | 4 | 4 | 6 | L and M |

## Slot counts, first pass

Translated from today's mounts so totals stay close and stock ships stay viable; the audit will move these. Sizes in order.

| Hull | High | Mid | Low | Core sizes (engine, reactor, computer) | Built in | Rigs |
| --- | --- | --- | --- | --- | --- | --- |
| Meridian Tern (cutter) | S S S | S S | S S S | S, S, S | | 1 |
| Kessari Warrant (sloop) | M M S S | M S S | M M S | M, M, M | | 2 |
| Tessaract Manifest (merchantman) | S S | M S S | M M M M M M S | M, M, S | | 2 |
| Belt Forge Prospector (cutter) | S S S | S S S | S S S | S, S, S | ore hold 100 | 1 |
| Belt Forge Sinker (sloop) | M M M S S | M S S | M M M S | M, M, M | ore hold 250 | 2 |
| Belt Forge Collier (hulk) | L L M M | L M M S | L L L L M M | M, L, L | ore hold 1,200 | 3 |
| Aurel Tacet (dev) | S S S | S S | S S | S, S, S | | 0 |
| Drone, escape pod | as today: core only, plus the drone's laser in one small high | | | | | 0 |

### As built: step 2, the tiers (5 November 2026)

- **Mount types** (`MountType`): the core systems as before (`engine`, `core`, `radar`, `computer`, `nav`, `flight`, `podBay`, `fireControl`) and the tiers `high`, `mid`, `low`. The old `weapon`, `utility`, `internal`, `bay` and `mining` mounts are gone. High slots keep their positions, facings and swivel arcs; a high slot without an arc fires straight ahead.
- **Modules re-tagged:** every weapon, launcher, mining laser and turret, the tractor and the charge rig in high; shields, afterburners, countermeasures, survey scanners and hoppers in mid; armour, cargo pods and containers and drone bays in low; reactors in core or low. Cargo containers no longer need a heavy-load mount.
- **Slots as built** (high / mid / low, sizes in order):

| Hull | Class | High | Mid | Low |
| --- | --- | --- | --- | --- |
| Meridian Tern | cutter | S S S | S S | S S S |
| Kessari Warrant | sloop | M M S S | M S S | M M S S |
| Tessaract Manifest | merchantman | S S | M M S | M M M M M M S S S |
| Belt Forge Prospector | cutter | S S S | S S S | S S S |
| Belt Forge Sinker | sloop | M M S M S | M M S | M S M M |
| Belt Forge Collier | hulk | L L M M | L M M S | M M L L L L |
| Kessari Injunction (working name) | brig | M M M M M | M M S | M M M M S S |
| Union Defence Works Walkout (working name) | frigate | L L M M M M | L M M S | L L M M M M S |
| Aurel Tacet (dev) | | S S S | S S | S S |

  The Warrant has four lows, as the sloop template says, rather than the first pass's three.
- **Mount ids kept** where a slot survived, so fits carry over; the stock fits moved only their tractors and charge rigs to new high slots and their shields to mids.
- **Tiles:** groups, then mining turrets, then active modules in high slots, then in mids, in mount order.
- **Outfitting** lists core systems, then high, mid and low slots, with the counts and any built-in ore hold under the hull's bonuses.
- **Saves:** version 11 (`migrate10to11`): what still fits stays; the rest moves to the smallest free slot that takes it (a running tractor stays on); anything left over goes to the owner's storage where the ship is docked, else at Harbour.

### Placement (5 November 2026)

Where a slot sits matters for arcs, blind spots and, later, damage to the modules on the side that is hit, so placement is a rule (Jason):

- **High slots are hardpoints on the hull's edge** (within a fifth of the hull's radius of the outline), each with a facing, and a swivel's arc; blind spots come from the shape.
- **Mid slots sit in the body, low slots deep inside**, both within the outline. The one exception is a merchantman's cargo pods, which hang off its spine.
- **Core systems keep their own places.**
- A test checks every hull against the rule, and every hull was moved to it, checked against a drawing of each slot map.

### As built: step 3 and the fitting window (5 November 2026)

- **Buy, then fit:** `buyModule` buys modules into storage at the station; the fitting window's **Buy and fit** buys and fits in one, **Fit** fits from storage, **Unfit to storage** puts it back, and stored modules sell back at half price. There is no fitting fee (`FIT_FEE_FRACTION` 0).
- **Every station outfits** while Calder is the dev environment (Ridge Outpost gained outfitting; saves pick it up on load).
- **One storage per station** (`Pilot.storage`) holds unfitted modules and stored goods together; the old `hangar` is gone. Save 12 (`migrate11to12`) merges them.
- **The fitting window** (`outfitting-panel.ts`), built from the approved mockup: budget bars (power with a preview outline, capacitor, mass with acceleration and spin-up, cargo, ore hold); the slots by tier on the left; the hull in the middle with every slot marked where it sits by tier and size (circle high, diamond mid, square low, outline core), the selected high slot's arc and blind spot or line of fire; every ship number below it, now and after; and on the right what fits the selected slot, from storage first, then for sale, then every module stored here to sell. Pointing at a module previews it everywhere.
- **One window, two places:** the window works on a `FitContext` (hull, fit, how to check a change, what is stored, whether it is free). The game builds one for the docked ship (`stationFitContext`); the fitter builds one per fit with nothing to buy, any module in any slot it fits, and over-power fits allowed so a build can be sketched before it balances. Its styles live in `fitting-window.css`, shared by both pages.

### As built: the first big ships (5 November 2026)

Step 4 balances big guns against small targets, and there were no big combat hulls to test it on, so two came first (Jason: a Kessari brig and a frigate, sold at Harbour while Calder is the dev system).

- **Kessari Injunction** (`kessari-brig`, brig, working name): the Warrant's wedge, longer and wider. Two guns at the nose, a swivel on each flank and one aft, five highs in all, M throughout. Missile and shield bonuses like the Warrant. 30,000 bare; the yard fit is about 68,000.
- **Union Defence Works Walkout** (`union-frigate`, frigate, working name): the Free Belt militia's slab. Two L guns forward, M swivels on every corner, L shield and plate slots. +25% structure from full-size armour, +15% damage from full-size projectile guns. 60,000 bare; the militia fit about 137,000.
- **Large kit** to fit a frigate, first numbers: Slagline Runner L engine and Jink L thrusters, Ito-Marr Bastion L shield, Union Defence Works Bulwark L armour.
- **Pads:** both take large pads (radius 34 and 42).
- **Reference fits:** both stock fits, a brig brawler, and a frigate with undersized guns built to swat small ships.
- **The duellist** now closes to its guns' range, not its launcher's: Warrants carrying a Magazine used to hold off at missile range, out of gun range, and draw. Audit: `docs/audits/2026-11-05-big-ships.md`.
- **What the audit shows, before step 4:** each class beats everything below it every time, quickly and barely scratched (the frigate kills a brig in about nine seconds with 85% left; the brig kills any Warrant). Big guns hit small ships as hard as big ones today. That is what step 4 is for.
- **Also found:** the Cantor-Vell Vigil M armour (100 structure, 4.5 t) is worse than the Patchplate S (240 structure, 2 t) apart from slightly better resists; step 4 looks at it with the rest.

### As built: step 4, the costs (5 November 2026, reworked with Jason the same night)

**No damage is cut by rule** (Jason). A first build gave weapons a resolution against signature with a 40% floor; it was taken out the same night. Our shots are real projectiles that travel and miss, so physics does the job: big turrets slew slowly, big shots fly slowly, and fixed guns aim with the hull, so a heavy ship's slow turn is their tracking. The design Jason wants: **a big ship wins one against one; a swarm of small ships overwhelms it; a big ship may never get its big guns on a small one; a big ship covered in point defence is a small ship's nightmare and shrugs off against another big ship.**

- **Point defence is small only.** Swivels (the Paragon Watchman S) are the PDCs: turreted, shooting down munitions by themselves, engaging ships too. Since 6 November they fire light, fast rounds (3 a shot, 30 a second; 40 made fixed guns feel secondary) out to 900 units, beyond any small ship's guns, so a ship making passes flies through their fire; the standing rule is now that every fixed gun hits harder per shot. The Sentry M and Bulwark L are gone; big ships carry several Watchmen. Save 13 (`migrate12to13`) swaps fitted and stored M and L swivels for Watchmen and refunds the price difference.
- **Fire control sets how many PDCs:** Gunlayer S one, M three, and a new **Gunlayer L** eight, so a heavy ship can fill every high with swivels as a crowd clearer (Jason: that will be a doctrine). The frigate's fire control mount is now L.
- **Turreted main guns** (superseded in 0.16 by the turret model, `docs/turrets.md`: every main gun is now a turret and these modules are gone, save 14), separate from PDCs: every medium and large main gun also comes turreted (`<gun>-turret-m`, `-l`; modules `<fixed id>-turret`, from the same maker; working names). They follow the lock with no fire control, fire with their group on the trigger, do no point defence, do 75% of the fixed gun's damage (`MAIN_TURRET_DAMAGE`; fixed guns stay the hardest hitters), cost more to mount (`TURRET_MOUNTING`: mass 1.4, power 1.25, price 1.5 times), and slew slowly: M 1.5 rad/s, L about 0.94 (`MAIN_TURRET_SLEW`), against the swivel's 4.
- **Slower big shots:** each size up flies 1.15 times slower (`SHOT_SPEED_FALLOFF`); **slower big turrets:** each size up slews 1.6 times slower (`TURRET_SLEW_FALLOFF`, was 1.3).
- **Signature from kit** (`KIT_SIGNATURE`, `moduleSignature`): engines add 2, 4, 8 by size; guns 0, 1, 4; a module can name its own (the charge rig adds 6). A burning afterburner blooms it by half (`AFTERBURNER_SIGNATURE_BLOOM`). It sets lock time against the ship; heat seekers and decoys still use the hull's.
- **Armour:** the Vigil M goes from 100 to 460 structure.
- **Swarms in the lab:** `skirmish(sideA, sideB)` fights side against side; each ship takes the nearest enemy, and a ship much smaller than its target makes attack passes with the pirates' own `attackRun`. The audit adds a swarm table (brig and frigate fits against one to four Warrants), every fit with guns against the raider, and times and health left in the duels. Reference fits added: Frigate turrets, Frigate crowd clearer. Report: `docs/audits/2026-11-05-costs.md`.
- **Not done here:** capacitor modules for lows belong with oversizing (step 5).

**What the audit shows** (6 November, lab ships carrying a hold full of ammunition):

- **The brig is about right:** the brig brawler beats one or two Warrant brawlers and loses to three; the yard fit beats one and loses to two.
- **The frigate is strong against a swarm:** the militia fit beats four Warrant brawlers with 10% left. How many small ships should beat each class is a target for Jason ("Questions for Jason").
- **The crowd clearer is not yet the swarm specialist Jason wants** (it should beat a swarm better than the militia fit, and lose to a peer, which it does): it beats three brawlers with 23% left and loses to four, a little worse than the militia fit. Six fast swivels burn about 80 rounds a second, so a frigate's hold of rounds lasts about 40 seconds of fire: ammunition is now its limit (question for Jason).
- **Raiders cannot touch big ships:** four Black Strike raiders barely scratch a brig or frigate.
- **Mining ships and the stock Manifest lose to the raider** every time (one swivel each; the Collier's drones do not fly in the lab).

### The arena (6 November 2026)

**Replaced** (0.18, Lead 8): the arena is now the Arena world, open to every player from the mode screen, with the same reference fits and enemies (`docs/worlds.md`, "As built: step 3"). What follows is how the admin arena worked.

Fights on demand, for Jason to feel what the audit measures. In the menu's admin section (operators only): pick a reference fit to fly, an enemy fit and how many (1 to 8), and **Start arena**. You are put in a free ship of that fit far out in empty space (each pilot's arena is 50,000 units from the system and from each other), with a hold full of ammunition and weapons hot; the enemies start 1,400 units off and come for you, flown by the lab's own scripts (`ai/fight.ts`, shared by `fitlab.ts` and the arena brain in `ai/arena.ts`), so the fight is the one the audit measures. **Start arena** again restarts it; **End arena** removes its ships (and your pod, if you lost) and puts you back in the ship you came from. Commands `adminArena` and `adminArenaEnd` (`arena.ts`); `Pilot.arena`, brain kind `arena` (shown as ARENA, hostile).

## The fitter

A fitting calculator for Jason and the lead, built from the same sim code as the game so it can never drift out of date.

- **Where:** a second page of the client (`fitter.html`), served wherever the game is (the Tailscale preview included), plus a command-line audit for the lead.
- **Fit a ship:** pick any hull, put any module in any slot (illegal choices shown with the reason), and see the ship's stats live: power and mass, speed, acceleration and turn, capacitor and its balance, shield and armour totals and resistances, damage per second by type and against small, medium and large targets, lock time and range, cargo and ore hold, mining yield, drones. A second fit side by side shows the differences.
- **Simulate:** headless runs of the real sim. Duels against reference fits (brawler, kiter, glass cannon, brick tank, pirate raider, Watch), several runs each, with win rate and time to kill; a mining run on a standard patch of rock (ore an hour, value an hour at each market); a hauling run under pirate pressure (survival rate).
- **Reference fits** live in the sim (`packages/sim/src/reference-fits.ts`), shared between the fitter, the tests and the audit. Jason can export a fit from the fitter as JSON and send it; the lead pastes it into the library.
- **The audit** (`npm run audit`): for every hull, modules no fit should ever choose (worse in every respect than another option), slots with only one sensible choice, the best fit per role, and the duel matrix between archetypes. Run at every release; the release notes say what moved. Reports are kept in `docs/audits/`.

### As built: step 1 (5 November 2026)

- **The lab** (`packages/sim/src/fitlab.ts`): `fitProblems` (why a fit could not be fitted), `fitSummary` (budgets, flight, defence, damage, sensors, holds, mining), and `duel` (two fits flown by the same scripted pilot from four starts, up to two minutes, in empty space; deterministic). The scripted pilot closes to 60% of its longest range, keeps its nose on the lead point, fires on aim, and takes its fire groups in turn.
- **Reference fits:** the seven stock ships plus a Warrant brawler, kiter and glass cannon and a Manifest brick.
- **The fitter page** (`fitter.html`, linked from the menu): two fits, A and B, each edited in the game's own fitting window (since step 3; at first it was a form of drop-downs), the numbers compared, a duel, saving in the browser, and JSON export and import.
- **The audit** (`scripts/audit.ts`): modules worse in every way than a rival, ladders where only price separates two modules, the reference fits' numbers, and the duel matrix. Not done yet: slots with one sensible choice, best fit per role, and mining and hauling runs.
- **Baseline** (`docs/audits/2026-11-05-baseline.md`): the Ito-Marr Arsenal L is worse in every way than the Magazine L, and the Assay S than the Meridian Plotter S; the three countermeasure dispensers are a pure price ladder; the Warrant brawler beats every other combat fit, and the glass cannon loses to all of them (its energy guns empty the Warrant's 90-point capacitor).

## Saves

Mount ids are kept where a slot survives, so most fits carry straight over. Anything that no longer fits (a module in a slot of the wrong tier or too small) goes to the owner's storage at the nearest station with outfitting, and the pilot is told on load. Ore holds, drones and cargo are untouched.

## Build order

1. **The fitter and the audit, on today's rules.** Measures where fitting stands before anything changes, and every later step is checked against it.
2. **Tiers:** core, high, mid and low slots; every hull and module re-tagged; stock fits re-checked; the outfitting screen shows tiers; save migration.
3. **Buy, then fit:** modules as items at markets, one storage per station, fitting from storage.
4. **Costs:** weapon resolution against signature, signature from kit, mass checked, numbers moved by the audit. Built 5 November (below).
5. **Oversizing,** then **slot merging**; **rigs** after the tiers have been played.

Release 0.13.0 first (after Jason's playtest of breaching and holds), so the overhaul starts from a stable version.

## Questions for Jason

Answered 5 November (Jason):
- Tractor and charge rig in highs, afterburner in mids.
- Oversizing pays only the modules' natural requirements; balance it by adjusting base hulls and modules, not by adding special penalties.
- No fitting fee at all for now, per item or for keeping a new fit.
- Big guns struggle with small ships by **both** weapon resolution against signature and slower big turrets; mindful that big ships must still defend themselves (the floor, small highs, drones and the audit check above). The floor starts at about 40%, to tune.
- The starter system is the dev environment: every station sells every module. The real, playable systems come with the map (8), with regional stock.

- **The tier rule:** high does work on something else (shoots, cuts, pulls, blasts); mid runs the ship's own active systems, including sensing, defending and interfering; low is passive. Scanners, countermeasures and electronic warfare are mids.

Nothing open: the design is approved for building, starting with the fitter.
