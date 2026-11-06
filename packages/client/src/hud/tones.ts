import type { Tier } from './warnings.js';

/**
 * Warning tones, made in the browser (Web Audio): no sound files.
 * Jason, 6 November 2026: tones for now, a voice maybe later.
 *
 * - advisory: one soft chime
 * - caution: two rising tones
 * - warning: three quick pips (repeated by the caller while it holds)
 * - alarm: a two-note klaxon (repeated by the caller until it clears or is silenced)
 *
 * Browsers start audio only after the player has clicked or pressed a
 * key, so the context is made on the first sound after that and stays.
 */

interface Note {
  /** Seconds after the start. */
  at: number;
  hz: number;
  seconds: number;
  wave: OscillatorType;
  /** Loudness, 0 to 1, before the master volume. */
  level: number;
}

const SHAPES: Record<Tier, Note[]> = {
  advisory: [{ at: 0, hz: 880, seconds: 0.16, wave: 'sine', level: 0.35 }],
  caution: [
    { at: 0, hz: 660, seconds: 0.14, wave: 'triangle', level: 0.5 },
    { at: 0.17, hz: 880, seconds: 0.18, wave: 'triangle', level: 0.5 },
  ],
  warning: [
    { at: 0, hz: 990, seconds: 0.08, wave: 'square', level: 0.22 },
    { at: 0.13, hz: 990, seconds: 0.08, wave: 'square', level: 0.22 },
    { at: 0.26, hz: 990, seconds: 0.08, wave: 'square', level: 0.22 },
  ],
  alarm: [
    { at: 0, hz: 740, seconds: 0.24, wave: 'sawtooth', level: 0.2 },
    { at: 0.26, hz: 1040, seconds: 0.24, wave: 'sawtooth', level: 0.2 },
  ],
};

/** How long each tier's sound lasts, seconds: the caller repeats after this and a gap. */
export const TONE_SECONDS: Record<Tier, number> = { advisory: 0.16, caution: 0.35, warning: 0.34, alarm: 0.5 };

export class Tones {
  private context: AudioContext | null = null;
  private volume = 0.5;
  private muted = false;

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  play(tier: Tier): void {
    if (this.muted || this.volume <= 0) return;
    const ctx = this.ready();
    if (!ctx) return;
    const start = ctx.currentTime + 0.01;
    for (const n of SHAPES[tier]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.wave;
      osc.frequency.value = n.hz;
      // A quick fade in and out so no note clicks.
      const peak = n.level * this.volume;
      const t0 = start + n.at;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + 0.01);
      gain.gain.setValueAtTime(peak, t0 + n.seconds - 0.03);
      gain.gain.linearRampToValueAtTime(0, t0 + n.seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + n.seconds + 0.02);
    }
  }

  /** The audio context, made on first use; null where the browser has none or will not start it yet. */
  private ready(): AudioContext | null {
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.context = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
    return this.context.state === 'closed' ? null : this.context;
  }
}
