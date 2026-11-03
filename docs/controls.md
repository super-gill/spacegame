# Controls

Every binding is defined once, in `packages/client/src/bindings.ts`. Input handling and the in-game controls panel both read that table, so the panel always matches what the keys do. Remapping in-game is not yet supported.

Press **F1** (or **`**) in game, or click **Controls** in the top right, to see every control. The panel is a developer aid for now and will become part of a settings menu later.

## Flight

Flight is keyboard only. The mouse is reserved for targeting, interacting with objects and UI in later versions.

| Action | Primary | Alternate | Notes |
| --- | --- | --- | --- |
| Spin left | Q | Left arrow | Fires rotation thrusters anticlockwise |
| Spin right | E | Right arrow | Fires rotation thrusters clockwise |
| Main engine | W | Up arrow | Accelerates along the heading |
| Reverse thrust | S | Down arrow | Weaker than main; useful for fine approach |
| Strafe left | A | | Lateral thrust, does not change heading |
| Strafe right | D | | |
| Brake | X | | Fires thrusters against your velocity and spin until both stop. Works in every mode and overrides other flight keys |

Thrust is relative to where the ship points, not where it is moving, so turning to face away from your drift and hitting W is how you slow down fast. Rotating never changes your velocity.

## Targeting

The mouse is for choosing. It is never captured or hidden, and clicks on on-screen buttons never reach the game.

| Action | Input | Notes |
| --- | --- | --- |
| Target a ship | Left click on it | Clicking empty space leaves your target alone |
| Next target | Tab | Nearest first, then outward; wraps round |
| Clear target | Esc | |

The target gets corner brackets (white when cold, red when hot) and a readout bottom right: who it is, hull, range, closing speed, shields and structure. A target that docks or is destroyed is cleared.

## Weapons

| Action | Key | Notes |
| --- | --- | --- |
| Fire fixed guns | Space (hold) | Fires where the nose points. With a target, put the nose on the orange lead marker |
| Weapons hot / cold | H | Hot: turrets engage your target on their own when on aim and in range. Cold: they hold fire |
| Tractor beam | R (hold) | Pulls nearby loot in and scoops it into your hold |

Fixed guns hit harder than turrets. Turrets let you fight while flying any direction, but a fast target close in can outrun them.

## Flight computer

| Action | Key | Notes |
| --- | --- | --- |
| Cycle flight mode | Z | Full assist, then rotation assist, then manual, then back |

The physics has no drag. What the ship does when you let go of the keys depends on the flight mode, shown on the HUD as `FLT`:

| Mode | When you release Q/E | When you release the thrust keys |
| --- | --- | --- |
| Full assist (default) | Spin stops | Drift on that axis eases to a stop |
| Rotation assist | Spin stops | You keep drifting |
| Manual | You keep spinning | You keep drifting |

Assists fire the ship's real thrusters, so you will see the flames, and a heavier ship takes longer to settle. In full assist, axes are handled separately: holding W while sliding sideways lets you accelerate forward while the computer cancels the slide.

## Station

| Action | Key | Notes |
| --- | --- | --- |
| Dock | F | Only when the HUD shows `DOCK <station>`; you must be inside the dashed range ring and slower than the docking speed limit |
| Undock | F or the Undock button | Places you just outside the station facing the way you were |
| Trade | Buttons in the Market tab | Buy 1, Buy max (as many as your credits and hold allow), Sell 1, Sell all |
| Select a mount | Click it in the Outfitting tab, on the drawing or in the mount list | Lists the modules that fit it |
| Preview a module | Hover it | Shows stats after the change beside stats now, even for a change that would be refused |
| Fit or unfit | Buttons in the Outfitting tab | Fit takes the module from your storage here if you have one, otherwise buys it; either way there is a 5% handling fee, plus 5% on anything it replaces. Unfit moves the module to storage here for the 5% fee |
| Sell a stored module | Sell button under Stored here | Pays half its price |

If docking is refused a message says why: too far, or too fast.

The docked panel has two tabs.

**Market** lists each good the station trades, what it charges you (Buy at), what it pays you (Sell at), and how many you have aboard, with your credits and cargo space at the top. A dash means the station does not trade that good in that direction.

**Outfitting** (only at stations that offer it; Harbour does, Ridge Outpost does not) shows your ship with its mounts, its stats, and the module on each mount. Empty mounts are dashed sockets. Select a mount to see what fits it, how many of each you have stored here, and what fitting it costs; a module that cannot be fitted says why (wrong mount type, too big, missing service, not enough power, not enough credits). Below that, **Stored here** lists the modules you own in storage at this station. There is no keyboard way to select mounts yet.

## Interface

| Action | Key | Notes |
| --- | --- | --- |
| Show or hide the controls panel | F1 | Also `, or click Controls in the top right |
| Show or hide the menu | F2 | Also the Menu button. Pilot name, show or hide ship labels, Save now, Export save, Import save, New game |

While you are typing in a text box (the pilot name), keys go to the box, not the ship.

## HUD

Bottom left, top to bottom:

- `!! PIRATE ON YOUR TAIL` while a pirate is hunting you
- `ZONE` the station security zone you are in, or `OPEN SPACE`
- `SHD` shields and `HUL` structure, current and maximum
- `CR` your credits
- `CARGO` space used and capacity, then what is aboard
- `VEL` speed in units per second
- `POS` world position
- `HDG` heading in degrees
- `ROT` spin in degrees per second (positive is clockwise)
- `FLT` current flight mode
- `WPN` weapons hot or cold
- `DOCK <station> [F]` when docking is available
- frame rate and sim tick

## On screen

- Edge markers point at stations and ships that are off screen, with their distance.
- Your ship is white. Traders are blue-grey, pirates red. NPC labels (`TRADER`, `PIRATE · HUNTING YOU`) are a development aid and may go later.
- Each station shows its dock range (inner dashed ring) and security zone (faint outer dashed ring).
- Damaged ships show shield (top) and structure (bottom) bars. Your shots are white, pirate shots red, trader shots blue-grey.
- Loot canisters are small orange diamonds. Wrecks are dashed outlines that fade.
- When your ship is destroyed a panel offers **Respawn** in a new Meridian Courier at Harbour Station.
