import { describe, expect, it } from 'vitest';
import type { World } from '@spacegame/sim';
import { DELAY_TICKS, Timeline } from './timeline.js';

/** A stand-in world: the timeline only reads `tick`. */
const at = (tick: number): World => ({ tick }) as World;

/** The tick being drawn, from a moment. */
const drawn = (m: { from: World; to: World; alpha: number }): number => m.from.tick + (m.to.tick - m.from.tick) * m.alpha;

describe('the timeline', () => {
  it('draws steadily even when updates arrive bunched and late', () => {
    // Updates every 2 ticks, but they land in uneven clumps (as with Windows' 15.6 ms timers).
    const timeline = new Timeline(at(0));
    const frame = 1 / 60;
    let sent = 0;
    const steps: number[] = [];
    let last = drawn(timeline.advance(0, frame));
    for (let f = 0; f < 600; f++) {
      // Every fourth frame nothing arrives; then two at once.
      if (f % 4 !== 3) {
        while (sent < f) {
          sent += 2;
          timeline.add(at(sent));
        }
      }
      const now = drawn(timeline.advance(frame, frame));
      if (f > 120) steps.push(now - last);
      last = now;
    }
    // Once settled, every frame moves on by about one tick: no jumps, no stops.
    for (const step of steps) {
      expect(step).toBeGreaterThan(0.8);
      expect(step).toBeLessThan(1.2);
    }
    // And it draws about DELAY_TICKS behind the newest update.
    expect(sent - last).toBeGreaterThan(DELAY_TICKS - 3);
    expect(sent - last).toBeLessThan(DELAY_TICKS + 3);
  });

  it('jumps to the newest update when told to, and after a long stall', () => {
    const timeline = new Timeline(at(0));
    timeline.add(at(300));
    expect(drawn(timeline.advance(1 / 60, 1 / 60))).toBe(300 - DELAY_TICKS);
    timeline.add(at(303));
    timeline.jump();
    expect(drawn(timeline.advance(0, 1 / 60))).toBe(303);
  });
});
