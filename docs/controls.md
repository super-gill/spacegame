# Controls

Every binding is defined once, in `packages/client/src/bindings.ts`. Input handling and the in-game controls panel both read that table, so the panel always matches what the keys do. Remapping in-game is not yet supported.

Press **F1** (or **`**) in game, or click **Controls** in the top right, to see every control. The panel is a developer aid for now and will become part of a settings menu later.

## Flight

**Mouse steering is on by default:** the nose follows the pointer (a crosshair over the game), turning as fast as the hull allows, and **A and D strafe** instead of spinning. Ships thrust only where the nose points (Admin: manoeuvring speed, 0% by default): side and reverse thrusters only slow a drift. To reposition, or to stop, turn and burn. With mouse steering on, the **left button fires** the selected group (Space still does too) and the **right button chooses**: right-click a ship to lock it. While the pointer is over a panel, card or button the nose holds its aim, and clicks there never fire. Turn mouse steering off in the menu (F2, Controls) to steer with A and D as below; then the left button locks ships again and only Space fires.

| Action | Primary | Alternate | Notes |
| --- | --- | --- | --- |
| Spin left | A | Left arrow | Fires rotation thrusters anticlockwise |
| Spin right | D | Right arrow | Fires rotation thrusters clockwise |
| Main engine | W | Up arrow | Accelerates along the heading |
| Reverse thrust | S | Down arrow | Weaker than main; useful for fine approach |
| Strafe left | Q | | Lateral thrust, does not change heading |
| Strafe right | E | | |
| Brake | X | | Fires thrusters against your velocity and spin until both stop. Works in every mode and overrides other flight keys |

Thrust is relative to where the ship points, not where it is moving, so turning to face away from your drift and hitting W is how you slow down fast. Rotating never changes your velocity.

## Targeting

The mouse is for choosing. It is never captured or hidden, and clicks on on-screen buttons never reach the game.

| Action | Input | Notes |
| --- | --- | --- |
| Activation tiles | 1 to 9 | The numbered tiles above your weapons: fire groups first (the key selects the group the fire button fires; new guns join group 1, launchers group 2), then active modules (switches a tractor on or off, drops a charge from a dispenser, sends a survey pulse). Mining lasers join group 3. Swivels need no group |
| Mining turrets (hulk) | Make a rock your active lock, then press a turret's tile | That turret takes the rock and cuts it on its own while it stays locked and in reach. Press the tile again to let it go. Each turret can work a different rock |
| Hold | I | A window: what is aboard, split into ore hold and cargo. In space, JETTISON throws a whole stack out astern for anyone to take; docked, STORE and TAKE move stacks to and from your storage at that station. Also the ore hopper's sorting and the tractor's mode |
| Drone manager | N | Launch, recall and send drones (to your active lock), and see each drone's state and condition. Drones work only rocks you have locked; your tractor collects what they cut. Recall them before you dock: drones left out are lost |
| Heading lock | V | With mouse steering: the nose holds its bearing so you can move the pointer (to the interface, or to pick a target) without turning. Press again to release. A HEADING chip shows the state |
| Lock a ship or a rock | Right click on it (left click without mouse steering) | Locking takes a moment (its lock card fills, and the target card shows LOCKING with a percentage); your targeting computer sets how many you can hold and what the cards show once locked. Clicking a ship you have locked makes it the active lock. Clicking empty space changes nothing. The target card's UNLOCK button drops the lock it shows, without the keyboard. A locked rock shows its range; with a mining computer, what ore it holds, how hard it is and whether your laser can cut it |
| Next lock | Tab | Makes the next lock you hold active; with no locks, locks the nearest ship. Clicking a lock card does the same for that lock |
| Unlock | Esc | Closes the top window (hold, drones) if one is open; otherwise drops the active lock and the next one takes over |

On the right edge, below the menu buttons:

- **Lock strip:** a card per lock, a filling bar while it is still locking, and dashed `FREE` cards for your unused slots. Once locked, a card shows the ship's silhouette and range if your targeting computer reads them. The active lock is outlined. `LOCKS n/max` counts complete locks.
- **Target card** for the active lock. Everything on it comes from your targeting computer, so nothing is known until the lock completes (`LOCKING n%`, `Locking…`). Then it shows only what your computer reads:
  - identity: hostile, neutral, `CALDER WATCH`, pilot or empty; the hull, who flies it and its size; the hull's silhouette
  - motion: range and closing speed (positive while the gap shrinks)
  - condition: shields `UP`, `DOWN` or `NONE` and hull `SOUND`, `DAMAGED` or `CRITICAL`, in words
  - combat (Marksman computers): exact shield and hull, as bars, numbers and the shield ring, and its weapons and damage per second
  - cargo (Tally computers): what it carries
  - The last line, `READS ...`, lists what your computer reads, so a blank is your computer's limit, not a fault.

The active lock also gets corner brackets in space (white when cold, red when hot). A lock drops when its target leaves your sensor range, docks or is destroyed.

## Windows

Small panels in flight (the hold, the drone manager) are windows: open each with its key or its button on the launcher strip under your status lines, drag the title bar to move it (the place is remembered), close it with its ✕ or Esc. Several can be open at once.

## Weapons

| Action | Key | Notes |
| --- | --- | --- |
| Fire the selected group | Space (hold) | Guns fire where the nose points: with a target, put the nose on the orange lead marker. Launchers fire at your active lock and need it complete |
| Drop a countermeasure | C | Needs a dispenser. Chaff may draw radar missiles off, flares outshine your hull to heat seekers; decoys do both. Drop, then turn away |
| Weapons hot / cold | H | Hot: turrets engage your target on their own when on aim and in range. Cold: they hold fire |
| Mine | Hold fire with a mining laser's group selected | The laser cuts the rock its beam reaches if the rock is no harder than the laser is strong, freeing ore in canisters; scoop them with the tractor. Its tile says `CUTTING`, `TOO HARD` or `NO ROCK` |
| Seams | Lock a rock with a mining computer | A gold arc on the rock's edge marks its seam: cut there and the laser tile says `ON SEAM`, half as fast again |
| Ore hopper | Its tile's number, or the hold panel | A small hopper's tile cycles the one ore it spits back out astern: `TAKE ALL`, then each ore in turn. Bigger hoppers sort by a list of KEEP or DROP per ore, set in the hold panel; their tile switches sorting on and off. A large hopper with the ore hold full swaps your cheapest ore for better. Your tractor pulls everything in, then leaves the rejects alone |
| Drop an ore cache | J | Leaves the ore aboard, and loose ore near you, as a cache that lasts an hour, ringed in space and shown on your radar. Anyone can take it. Switches your tractor off so it is not scooped straight back |
| Breach charges | The charge rig's tile | Near a locked rock (within 70 units of its surface): plants a charge where you are. A deep assay marks the rock's breach points; cover them all for all the glass. From 150 units clear: sets off every charge you have on it. The tile says `PLANT`, `DETONATE`, `GET CLOSER` or `TOO CLOSE`. Stay clear of the blast (320 units) |
| Survey | Its tile's number | A survey scanner pulses: rocks in reach worth a look are outlined for a few seconds (amber rich, gold valuable, cyan rare). It cycles in 5 seconds and costs capacitor |
| Tractor beam | R (hold), or its tile | If a tractor is fitted: pulls nearby loot in and scoops it into your hold. Its tile cycles `OFF`, `MINE` (only loot that is yours or nobody's) and `ALL` (other people's too). R alone works in the tile's mode, `MINE` when it is off |
| Afterburner | Shift (hold) | If one is fitted: a higher top speed and more main thrust while held, paid for from the capacitor; it will not light on an empty one |

Fixed guns hit harder than turrets. Turrets let you fight while flying any direction, but a fast target close in can outrun them. Swivels also shoot down missiles and torpedoes coming for you, on their own, hot or cold, if the munition is inside their arc.

## Flight computer

| Action | Key | Notes |
| --- | --- | --- |
| Cycle flight mode | Z | Full assist, then rotation assist, then manual, then back |

The physics has no drag. What the ship does when you let go of the keys depends on the flight mode, shown under the status dial:

| Mode | When you release A/D | When you release the thrust keys |
| --- | --- | --- |
| Full assist (default) | Spin stops | Drift on that axis eases to a stop |
| Rotation assist | Spin stops | You keep drifting |
| Manual | You keep spinning | You keep drifting |

Assists fire the ship's real thrusters, so you will see the flames, and a heavier ship takes longer to settle. In full assist, axes are handled separately: holding W while sliding sideways lets you accelerate forward while the computer cancels the slide.

## Station

| Action | Key | Notes |
| --- | --- | --- |
| Dock | F | Only when the HUD shows `DOCK <station>`; you must be inside the dashed range ring and slower than the docking speed limit |
| Undock | F or the Undock button | Launches you from your pad, out along the way the pad faces |
| Trade | Buttons in the Market tab | Buy 1, Buy max (as many as your credits and hold allow), Sell 1, Sell all |
| Select a mount | Click it in the Outfitting tab, on the drawing or in the mount list | Lists the modules that fit it |
| Preview a module | Hover it | Shows stats after the change beside stats now, even for a change that would be refused |
| Fit or unfit | Buttons in the Outfitting tab | Fit takes the module from your storage here if you have one, otherwise buys it; either way there is a 5% handling fee, plus 5% on anything it replaces. Unfit moves the module to storage here for the 5% fee |
| Sell a stored module | Sell button under Stored here | Pays half its price |

If docking is refused a message says why: too far, too fast, or no free pad here fits your hull.

Docking sets you down on the smallest free landing pad that fits your hull. Pads are the corner-bracket frames round each station, marked S, M or L; one with a ship on it is drawn brighter.

The docked panel has four tabs. It is the same width on every tab, so switching never moves the tabs under the pointer.

**Market** lists each good the station trades, what it charges you (Buy at), what it pays you (Sell at), and how many you have aboard, with your credits and cargo space at the top. A dash means the station does not trade that good in that direction.

**Outfitting** (only at stations that offer it; Harbour does, Ridge Outpost does not) shows your ship with its mounts, its stats, and the module on each mount. Empty mounts are dashed sockets. Select a mount to see what fits it, how many of each you have stored here, and what fitting it costs; a module that cannot be fitted says why (wrong mount type, too big, missing service, not enough power, not enough credits). Each module shows what it is (engine, reactor and so on) beside its brand name. If the fit shown cannot thrust forward or cannot turn, a warning says so, and undocking in that ship repeats it. Below that, **Stored here** lists the modules you own in storage at this station. There is no keyboard way to select mounts yet.

**Ship mart** (only at stations that sell ships; Harbour does, Ridge Outpost does not) lists each ship for sale with a drawing, its size class and role, top speed, acceleration, shields, structure, cargo space, weapon damage per second and price, with your credits and free pads at the top. **Buy** puts the ship on a free pad here, empty; you stay in the ship you are in. When you cannot buy it the button is greyed and the reason shows under it: not enough credits, or no free pad here fits it.

**Your ships** lists every ship you own, wherever it is: docked (which station and pad, or "Here"), or in space (how far from the nearest station). It shows each one's shields and structure as a percentage, and its cargo. The one you are in says Aboard. **Board** moves you into another of your ships docked at the same station; for any other the button is greyed with the reason.

## Ships

You can own several ships and fly one at a time. A ship you are not in is **empty**: it keeps whatever drift it had, takes no orders, and can be shot. Empty ships are drawn faded with a dashed hull; yours are labelled `YOUR <SHIP> · EMPTY` even with labels turned off, and always show on the radar, on its rim when out of range.

| Action | Input | Notes |
| --- | --- | --- |
| Board your nearest empty ship | B | Docked: any of your ships at the same station. In space: within 150 units and under 20 u/s relative to it |
| Board a particular ship | Board button in Your ships | Docked only |
| Step out in an escape pod | G, twice within 2 seconds | In space only. Your ship stays where it is, empty, and keeps any speed it had: slow down first to park it |
| Buy a ship | Buy button in Ship mart | |
| Claim a free Tern | Button at the bottom of the docked panel | Only in an escape pod docked at Harbour, owning no ships |

In space, the HUD names the ship B would board (`BOARD <SHIP> [B]`). When one of yours is near (within 600 units) but not boardable yet, it says what to do: `CLOSE TO 150` with the gap, or `MATCH SPEED` with your speed relative to it. Boarding from an escape pod uses the pod up.

To leave a ship of yours out in space, step out with G: you get a pod beside it, moving gently away, in the flight mode you were using. Fly the pod to a station, board another ship there, come back and board the first one with B.

Ships have no names yet; each is called by its hull and its number among the ships you have been issued, such as `Kessari Warrant #2`.

## Escape pods

When your ship is destroyed you get away in an escape pod: a small orange lifeboat with a blinking beacon. The HUD's top left reads `ESCAPE POD · DOCK AT A STATION`. Fly it to a station and dock as normal.

In a pod at Harbour, if you own no ships, the bottom of the docked panel offers **Claim a free Tern**. If you still own a ship it tells you to fetch it (see Your ships) or buy another.

If your pod is destroyed too, a panel offers **Wake at Harbour**: in a new pod if you own a ship anywhere, or in a free Meridian Tern if you own none.

## Interface

| Action | Key | Notes |
| --- | --- | --- |
| Zoom in and out | Mouse wheel, or = and - | Between about half and one and a half times; eases rather than jumps |
| Show or hide the controls panel | F1 | Also `, or click Controls in the top right |
| Show or hide the menu | F2 | Also the Menu button. Pilot name, show or hide ship labels, Save now, Export save, Import save, New game; and Admin (testing): grant credits, spawn any ship free where you are docked (the Aurel Tacet included) |

While you are typing in a text box (the pilot name), keys go to the box, not the ship.

## HUD

The flight HUD sits at the screen edges and leaves the middle clear. Clicks go through it to the game.

**Top left:** the ship you are in (`ESCAPE POD · DOCK AT A STATION` in a pod, or `· BOARD YOUR SHIP [B]` when one of yours is in reach), the security zone or `OPEN SPACE`, then your credits and cargo space used.

**Top centre:** the warning in force. Today that is `CAUTION · PIRATE HUNTING YOU`; warnings in tiers, with sounds, are coming.

**Bottom centre, in flight** (hidden while docked):

- The status dial. The outer blue ring is your shields, the inner ring your structure (it turns amber below half and red below a quarter). The dashed ring inside is reserved for the capacitor. Your speed in units per second is in the middle, relative to your local frame, which is named under the dial (`REL HARBOUR STATION` inside a station's dock range, else the body whose sphere you are in, else `REL SYSTEM`). Both come from your nav computer; without one the dial shows `-` and `NO NAV COMPUTER`. `SHD` and `HUL` values sit under the rings.
- Under the dial: the flight mode (`Z` to change) and weapons hot or cold (`H`).
- Right of the dial: a tile for each weapon you have fitted. A fixed gun says `SPACE`; a turret says `COLD`, `AUTO` (hot, no complete active lock) or `ENGAGING`. A ring round the icon fills as the weapon reloads. Only modules you use in flight get a tile.
- Above the dial: what you can do now, `DOCK <station> [F]` and the boarding prompt (see Ships).

**Bottom left: the radar.** North up, your ship at the centre pointing where you face, the rim at your radar's sensor range (named under it, `RADAR 3,000 u`). It replaces the old off-screen markers.

- Ships show only inside your sensor range, and none at all without a radar (`NO RADAR · CHARTS ONLY`). A ship nobody has identified is a small dot; once a lock reads its identity it is a diamond in its colour (red hostile, blue-grey trader, white Calder Watch). Your own ships always show, as dashed triangles, on the rim when out of range.
- Stations (squares, with a short name) and bodies (circles, to scale; the belt as its band) are on the charts and always show, pinned to the rim when out of range.
- The dashed box is what the screen shows at the current zoom.
- The active lock has a bracket; other locks a ring that fills as they lock.
- Click a ship on the radar to lock it, or to make it active if it is already locked.

**Right edge:** the lock strip and target card while you hold a lock (see Targeting). Lock cards and the radar are the only parts of the HUD that take clicks.

**Bottom right:** frame rate and sim tick, dim, for testing.

## On screen

- Your ship is white. Traders are blue-grey, pirates red. NPC labels (`TRADER`, `PIRATE · HUNTING YOU`) are a development aid and may go later.
- Each station shows its dock range (inner dashed ring) and security zone (faint outer dashed ring).
- Damaged ships show shield (top) and structure (bottom) bars. Your shots are white, pirate shots red, trader shots blue-grey.
- Loot canisters are small orange diamonds. Wrecks are dashed outlines that fade.
- Stations have landing pads round the rim. Docked ships, yours and others, sit on them.
- Empty ships are faded with a dashed hull. Escape pods are orange with a blinking beacon ring.
- When your escape pod is destroyed a panel offers **Wake at Harbour** (see Escape pods).
