/**
 * Numbers for the console's `stats` command: is the server keeping up,
 * and how much is it sending? Kept for the last ten seconds, rolling.
 *
 * A tick has 16.7 ms (60 a second). If ticks often take longer, the
 * world falls behind and everyone stutters together; if the worst tick
 * is long but the average short, something occasional is heavy (a big
 * fight, a breach).
 */

/** How much history to keep, ms. */
const WINDOW_MS = 10_000;

export class ServerStats {
  /** [when, how long] for each tick. */
  private ticks: [number, number][] = [];
  /** [when, bytes, who] for each update sent. */
  private sends: [number, number, string][] = [];
  /** When counting began, so the first ten seconds are not reported as slow. */
  private readonly startedMs = performance.now();

  /** Compressed size over raw size, from a sample of updates: what actually goes down the wire. */
  private compression = 1;

  /** A sampled update: its size before and after compression. */
  compressed(raw: number, packed: number): void {
    if (raw > 0) this.compression = packed / raw;
  }

  tick(atMs: number, tookMs: number): void {
    this.ticks.push([atMs, tookMs]);
    this.trim(atMs);
  }

  sent(atMs: number, bytes: number, who: string): void {
    this.sends.push([atMs, bytes, who]);
  }

  private trim(nowMs: number): void {
    const since = nowMs - WINDOW_MS;
    while (this.ticks.length > 0 && this.ticks[0]![0] < since) this.ticks.shift();
    while (this.sends.length > 0 && this.sends[0]![0] < since) this.sends.shift();
  }

  /** A few lines for the console. */
  report(nowMs: number): string[] {
    this.trim(nowMs);
    // Over the last ten seconds, or since the server started if that is sooner.
    const seconds = Math.max(0.001, Math.min(WINDOW_MS, nowMs - this.startedMs) / 1000);
    const times = this.ticks.map(([, t]) => t);
    const average = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const worst = times.length > 0 ? Math.max(...times) : 0;
    const over = times.filter((t) => t > 1000 / 60).length;
    const lines = [
      `Last ${seconds.toFixed(0)} s: ${(times.length / seconds).toFixed(1)} ticks a second (should be 60).`,
      `Tick time: ${average.toFixed(2)} ms on average, ${worst.toFixed(2)} ms at worst, ${over} over the 16.7 ms budget.`,
    ];
    const byWho = new Map<string, { bytes: number; count: number }>();
    for (const [, bytes, who] of this.sends) {
      const w = byWho.get(who) ?? { bytes: 0, count: 0 };
      w.bytes += bytes;
      w.count++;
      byWho.set(who, w);
    }
    if (byWho.size === 0) lines.push('Nobody connected.');
    for (const [who, w] of byWho) {
      const mbit = (w.bytes * 8) / seconds / 1_000_000;
      lines.push(`${who}: ${(w.count / seconds).toFixed(1)} updates a second, ${(w.bytes / w.count / 1024).toFixed(1)} KB each, ${mbit.toFixed(2)} Mbit/s before compression, about ${(mbit * this.compression).toFixed(2)} Mbit/s sent.`);
    }
    return lines;
  }
}
