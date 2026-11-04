# Ship systems (milestone 6f)

Every capability a ship still has for free becomes a fitted system with a cost, and every hull gets a slot budget by class. Status: agreed design, 4 November 2026, with Jason. Built in stages on `main`; "As built" at the end records the choices the build made.

Related: [ships.md](ships.md) for hulls, mounts and fitting; [weapons.md](weapons.md) for guns, the capacitor and shields; [design.md](design.md), pillar 5, "Systems all the way down".

## Principles

1. **Systems all the way down.** If a ship can do it, a module lets it, and the module costs mass, power, money or capacitor.
2. **Slots the EVE way.** Optional kit competes for general slots, so fitting is a choice. Basics every ship needs get fixed slots of their own, outside the budget. Specialised hulls get dedicated slots (a mining hulk's mining laser mounts).
3. **Active slots are on the HUD.** Every slot a pilot switches or fires gets a numbered tile; passive slots do not.
4. **Budgets follow hull class**, so the numbers stay simple. They can be adjusted later.

## Slot budget by hull class

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

## Later

- **Signatures** (Jason): anything hot or energetic flares a ship's signature (afterburners, hot engines, firing); dampers lower it. It matters most with stealth, and waits until then.
- Bastion mode for line ships and capitals ([weapons.md](weapons.md), "Shield arcs").
- A capacitor battery in an internal slot.
