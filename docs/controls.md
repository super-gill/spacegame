# Controls

Bindings are defined in `packages/client/src/input.ts` in the `KEYS` table. Remapping in-game is not yet supported.

## Flight

Flight is keyboard only. The mouse is reserved for targeting, interacting with objects and UI in later versions.

| Action | Primary | Alternate | Notes |
| --- | --- | --- | --- |
| Rotate left | Q | Left arrow | Adds anticlockwise spin; spin continues after release |
| Rotate right | E | Right arrow | Adds clockwise spin; tap the other key to stop |
| Main engine | W | Up arrow | Accelerates along the heading |
| Reverse thrust | S | Down arrow | Weaker than main; useful for fine approach |
| Strafe left | A | | Lateral thrust, does not change heading |
| Strafe right | D | | |
| Brake | Space | X | Fires thrusters against your velocity and spin until both stop |

Rotation works like thrust: Q and E add spin, and the ship keeps turning until you counter it or brake. Rotating does not change your velocity. Thrust is relative to where the ship points, not where it is moving, so turning to face away from your drift and hitting W is how you slow down fast.

A very small amount of space drag slowly bleeds off leftover drift and spin, so a ship left alone will eventually come to rest. It is far weaker than your thrusters.

## Station

| Action | Key | Notes |
| --- | --- | --- |
| Dock | F | Only when the HUD shows `DOCK <station>`; you must be inside the dashed range ring and slower than the docking speed limit |
| Undock | F or the Undock button | Places you just outside the station facing the way you were |

If docking is refused a message says why: too far, or too fast.

## HUD

Bottom left, top to bottom:

- `VEL` speed in units per second
- `POS` world position
- `HDG` heading in degrees
- `ROT` spin in degrees per second (positive is clockwise)
- `DOCK <station> [F]` when docking is available
- frame rate and sim tick
