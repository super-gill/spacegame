import type { Condition, Tier } from './warnings.js';

/**
 * When warnings sound (docs/interface.md, "Audible warnings"): a
 * condition sounds when it starts or rises a tier; a warning repeats
 * while it holds; an alarm repeats until it clears or the pilot silences
 * it (clicking the banner); an advisory or caution sounds once. Event
 * sounds play as they come. Pure: it returns what to play, and the caller
 * plays it, so it can be tested without audio.
 */

/** Seconds between repeats while a warning or an alarm holds. */
export const REPEAT_SECONDS: Partial<Record<Tier, number>> = { warning: 3, alarm: 1 };

/** The same tier never sounds twice within this many seconds, so a burst of events is one sound. */
const MIN_GAP_SECONDS = 0.3;

const RANK: Record<Tier, number> = { alarm: 0, warning: 1, caution: 2, advisory: 3 };

export class WarningSounds {
  /** Each holding condition's tier and when it last sounded, seconds. */
  private held = new Map<string, { tier: Tier; lastSounded: number }>();
  private silenced = new Set<string>();
  private lastByTier = new Map<Tier, number>();

  /**
   * The sounds due at `now` (seconds) for the conditions holding and the
   * event sounds just in. At most one sound per tier per call.
   */
  update(now: number, holding: readonly Condition[], events: readonly Tier[] = []): Tier[] {
    const due = new Set<Tier>(events);
    const seen = new Set<string>();
    for (const c of holding) {
      seen.add(c.key);
      const before = this.held.get(c.key);
      const rose = !before || RANK[c.tier] < RANK[before.tier];
      if (rose) this.silenced.delete(c.key);
      const repeat = REPEAT_SECONDS[c.tier];
      const again = !!before && !rose && repeat !== undefined && now - before.lastSounded >= repeat && !this.silenced.has(c.key);
      if (rose || again) {
        due.add(c.tier);
        this.held.set(c.key, { tier: c.tier, lastSounded: now });
      } else if (before && before.tier !== c.tier) {
        // Fell a tier: no sound, but remember the new tier.
        this.held.set(c.key, { tier: c.tier, lastSounded: before.lastSounded });
      }
    }
    // Cleared conditions are forgotten, so they sound again if they come back.
    for (const key of [...this.held.keys()]) {
      if (!seen.has(key)) {
        this.held.delete(key);
        this.silenced.delete(key);
      }
    }
    const out: Tier[] = [];
    for (const tier of due) {
      const last = this.lastByTier.get(tier);
      if (last !== undefined && now - last < MIN_GAP_SECONDS) continue;
      this.lastByTier.set(tier, now);
      out.push(tier);
    }
    return out.sort((a, b) => RANK[a] - RANK[b]);
  }

  /** Stop the alarms and warnings holding now from repeating, until they clear or rise. */
  silence(): void {
    for (const [key, h] of this.held) if (h.tier === 'alarm' || h.tier === 'warning') this.silenced.add(key);
  }

  /** True if any alarm is holding and not silenced: the banner offers to silence it. */
  alarmSounding(): boolean {
    for (const [key, h] of this.held) if (h.tier === 'alarm' && !this.silenced.has(key)) return true;
    return false;
  }
}
