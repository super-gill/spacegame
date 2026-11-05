# Ship systems (milestone 6f)

Every capability a ship still has for free becomes a fitted system with a cost, and every hull gets a slot budget by class. Status: agreed design, 4 November 2026, with Jason. Built in stages on `main`; "As built" at the end records the choices the build made.

Related: [ships.md](ships.md) for hulls, mounts and fitting; [weapons.md](weapons.md) for guns, the capacitor and shields; [design.md](design.md), pillar 5, "Systems all the way down".

## Principles

1. **Systems all the way down.** If a ship can do it, a module lets it, and the module costs mass, power, money or capacitor.
2. **Slots the EVE way.** Optional kit competes for general slots, so fitting is a choice. Basics every ship needs get fixed slots of their own, outside the budget. Specialised hulls get dedicated slots (a mining hulk's mining laser mounts).
3. **Active slots are on the HUD.** Every slot a pilot switches or fires gets a numbered tile; passive slots do not.
4. **Budgets follow hull class**, so the numbers stay simple. They can be adjusted later.

## Slot budget by hull class

**Superseded (5 November 2026):** slots are now core systems plus high, mid and low tiers; see `docs/fitting.md`. The table below is kept as history.

| Class | Weapon | Utility (active) | Internal (passive) | Cargo bays | Special |
| --- | --- | --- | --- | --- | --- |
| Pod | 0 | 0 | 0 | 0 | |
| Cutter (Tern) | 2 | 2 | 3 | 1 | |
| Sloop (Warrant) | 3 | 3 | 4 | 1 | |
| Brig | 4 | 3 | 5 | 2 | |
| Frigate | 5 | 4 | 6 | 2 | |
| Ship of the line | 8 | 5 | 8 | 3 | bastion mode |
| Capital | 10 | 6 | 10 | 4 | bastion mode, hangars later |
| Merchantman (Manifest) | 1 | 2 | 4 | 6 | |
| Hulk (industry) | 1 | 3 | 4 | 4 | 2 mining mounts |

- **Weapon** slots take any gun, launcher or swivel: fixed or swivel is a property of the weapon, so a pilot can fit all fixed, all swivels or a mix.
- **Utility** slots hold active kit: the tractor beam, the afterburner, countermeasure dispensers, and later electronic warfare.
- **Internal** slots hold passive kit: shield generators, armour, and later a capacitor battery.
- **Fixed slots on every ship, outside the budget:** nav computer, radar, targeting computer, flight computer, pod bay, fire control, engine, reactor and thrusters (the `core` mounts). The pod itself has only what it needs to fly.
- Size still decides what fits a slot, as now.

## The systems

- **Flight computer** (fixed slot). Thrusters and the hull decide how fast a ship *can* turn and accelerate; the flight computer decides how *well* that is used: how cleanly the nose settles on the mouse and how firmly flight assist and the brake work. No flight computer: no mouse steering and no assist; the ship flies in manual on the keys. A cheap one turns the nose slower and settles loosely; a good one snaps on target.
- **Pod bay** (fixed slot). The escape pod comes from it. Losing a ship with no pod bay: the pilot wakes at their home station without that ship or its cargo, as after losing a pod today. Pod bays are cheap; leaving one out is a choice.
- **Fire control** (fixed slot). A fire-control computer decides how many swivels a ship can direct and how fast they track. Swivels beyond its count stay idle. Weapon mounts no longer decide whether a swivel fits.
- **Shield recharge timing** comes from the shield generator (how long after a hit it starts recharging).
- **Tractor beam** (utility). An active module with range, pull and how much it can scoop; R holds it on, or its tile switches it. The starter gets a weak one.
- **Afterburner** (utility). Held on **Shift**, like sprint: while held it raises the ship's speed cap and main thrust and burns capacitor; when the capacitor runs dry it stops.
- **Countermeasure dispensers** (utility) keep C, and get tiles.
- **Electronic warfare** (utility) comes in or just after 6f. **Interdiction and warp disruption** come with faster-than-light travel on the map (8).

## Activation tiles

- One row of tiles on the HUD, numbered 1 to 9, in slot order: first a tile per **fire group** that has weapons, then a tile per **active utility module**.
- A fire-group tile's number key selects that group (the left button fires it). A module tile's number key switches it on or off, or fires it (a dispenser drops a charge).
- Shortcuts stay: R for the tractor, C for countermeasures, Shift held for the afterburner.
- The sim decides the order (`activationSlots`), so the HUD, the keys and the interface workstream all agree.

## Power

More modules draw more power, so reactors start to matter and fitting becomes a trade-off. That is intended; a dedicated fitting-tuning pass comes later. Saves give existing ships the stock systems free on their new slots, as they did for sensors.

## As built (4 November 2026)

- **Slots:** the Tern, Warrant and Manifest follow the budget; the Tacet (sealed, dev) has the fixed system mounts and a second internal mount for an extra reactor; pods have only a flight mount. Fixed system mounts are sized by hull (small on the Tern, medium on the Warrant and Manifest).
- **Modules** (names provisional, a lore ask): flight computers Meridian Helm S (60%), Paragon Helmsman S (85%), Ito-Marr Coxswain M (100%); Meridian Ark Bay S; Paragon Director S (one swivel, tracking 1x) and M (three, 1.25x); tractors Meridian Gleaner S (220 units, 120 u/s) and Tessaract Long Gleaner M (400, 180); afterburners Slagline Kick S (+50% top speed, +80% thrust, 9 capacitor a second) and Ito-Marr Surge M (+60%, +100%, 14). Afterburners draw no reactor power: they pay from the capacitor.
- **Flight computer effects:** with none, assist, the brake and mouse steering do nothing (manual on the keys). Quality q scales how firmly assist and the brake hold (50% to 100%), how fast the nose turns to the mouse (55% to 100% of the hull's turn rate), and how far off the aim it lets the nose sit before acting (up to 0.1 radians at q 0).
- **Pod bay:** without one, losing the ship leaves the pilot without a ship until they wake at Harbour, as after losing a pod.
- **Fire control:** directs the first swivels in mount order up to its count; the rest stay idle. Tracking multiplies swivel slew rate.
- **Shields:** the Ito-Marr Bastion recharges 2.2 seconds after a hit, against 3 for civil generators.
- **Power:** the starter runs at 13 of 13; upgrading anything now means giving something up. The raider moved to the medium reactor to fit its systems.
- **Stock fits:** the starter carries a helm, a director, a pod bay, a Gleaner and a Kick (its armour moved to an internal mount); traders a helm, director, pod bay and chaff screen; the Watch a helm, pod bay and chaff; the raider a helm and pod bay.
- **Tiles:** `activationSlots` lists fire groups that hold a gun or launcher, then tractors and dispensers on utility mounts; number keys 1 to 9 press them (`ShipInput.toggleModule` for modules). Shift holds the afterburner (`ShipInput.afterburner`); `Ship.switchedOn` and `Ship.afterburning` carry the state. The HUD row is a lead stopgap above the weapon tiles.
- **Saves:** format version 6 (`migrate5to6`): modules move to mounts that take them or into storage; stock flight computer, pod bay, fire control and a tractor are fitted free.
- **NPCs** do not use afterburners yet.

## Later

- **Signatures** (Jason): anything hot or energetic flares a ship's signature (afterburners, hot engines, firing); dampers lower it. It matters most with stealth, and waits until then.
- Bastion mode for line ships and capitals ([weapons.md](weapons.md), "Shield arcs").
- A capacitor battery in an internal slot.
