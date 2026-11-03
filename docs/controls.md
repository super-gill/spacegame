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
| Brake | Space | X | Fires thrusters against your velocity and spin until both stop. Works in every mode and overrides other flight keys |

Thrust is relative to where the ship points, not where it is moving, so turning to face away from your drift and hitting W is how you slow down fast. Rotating never changes your velocity.

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

If docking is refused a message says why: too far, or too fast.

## Interface

| Action | Key | Notes |
| --- | --- | --- |
| Show or hide the controls panel | F1 | Also `, or click Controls in the top right |

## HUD

Bottom left, top to bottom:

- `!! PIRATE ON YOUR TAIL` while a pirate is hunting you
- `ZONE` the station security zone you are in, or `OPEN SPACE`
- `VEL` speed in units per second
- `POS` world position
- `HDG` heading in degrees
- `ROT` spin in degrees per second (positive is clockwise)
- `FLT` current flight mode
- `DOCK <station> [F]` when docking is available
- frame rate and sim tick

## On screen

- Edge markers point at stations and ships that are off screen, with their distance.
- Your ship is white. Traders are blue-grey, pirates red. NPC labels (`TRADER`, `PIRATE · HUNTING YOU`) are a development aid and may go later.
- Each station shows its dock range (inner dashed ring) and security zone (faint outer dashed ring).
