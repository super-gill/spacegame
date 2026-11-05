import { describe, expect, it } from 'vitest';
import type { Ship } from '@spacegame/sim';
import { OwnShipView } from './own-ship.js';

/** A stand-in ship: only what the view reads. */
const ship = (x: number, vx: number, id = 's'): Ship => ({ id, state: 'flying', position: { x, y: 0 }, velocity: { x: vx, y: 0 }, heading: 0, angularVelocity: 0 }) as unknown as Ship;

describe('your own ship', () => {
  it('is carried forward by its speed between updates', () => {
    const view = new OwnShipView();
    view.update(ship(0, 100), 0);
    expect(view.pose(50)!.position.x).toBeCloseTo(5);
    // Never further than the cap, if updates stop.
    expect(view.pose(5000)!.position.x).toBeCloseTo(15);
  });

  it('fades a correction out instead of jumping', () => {
    const view = new OwnShipView();
    view.update(ship(0, 100), 0);
    // The server says it is 4 units short of where we guessed (it slowed).
    view.update(ship(1, 100), 50);
    const right = view.pose(50)!.position.x;
    expect(right).toBeCloseTo(5); // drawn where it was, no jump
    expect(view.pose(400)!.position.x).toBeCloseTo(1 + 100 * 0.15, 0); // the difference gone later
  });

  it('snaps after a teleport, and for a different ship', () => {
    const view = new OwnShipView();
    view.update(ship(0, 0), 0);
    view.update(ship(5000, 0), 30);
    expect(view.pose(30)!.position.x).toBe(5000);
    view.update(ship(10, 0, 'other'), 60);
    expect(view.pose(60)!.position.x).toBe(10);
  });
});
