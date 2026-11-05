import { describe, expect, it } from 'vitest';
import { resolutionShare } from '../combat.js';
import {
  AFTERBURNER_SIGNATURE_BLOOM,
  KIT_SIGNATURE,
  RESOLUTION_BY_SIZE,
  RESOLUTION_FLOOR,
  TORPEDO_RESOLUTION_FACTOR,
  TURRET_SLEW_FALLOFF,
} from '../constants.js';
import { fitSummary, TARGET_SIGNATURES } from '../fitlab.js';
import { HULLS } from '../hulls.js';
import { MODULES } from '../modules.js';
import { REFERENCE_FITS } from '../reference-fits.js';
import { fitStats, moduleSignature, shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import type { World } from '../types.js';
import { WEAPONS } from '../weapons.js';
import { createStarterWorld, joinPilot, pilotShip } from '../world.js';
import { TEST_CATALOGUES } from './fixtures.js';

/** Fitting step 4, the costs (docs/fitting.md, "Costs that make choices"). */

describe('weapon resolution', () => {
  it('a target at least the resolution takes everything; smaller ones a share, never below the floor', () => {
    expect(resolutionShare(60, 60)).toBe(1);
    expect(resolutionShare(90, 60)).toBe(1);
    expect(resolutionShare(45, 60)).toBeCloseTo(0.75);
    expect(resolutionShare(5, 60)).toBe(RESOLUTION_FLOOR);
  });

  it('no resolution means full damage to anything', () => {
    expect(resolutionShare(1, 0)).toBe(1);
    expect(resolutionShare(1, undefined)).toBe(1);
  });

  it('comes from size: guns and launchers by their size, torpedoes coarser, mining lasers and dispensers none', () => {
    expect(WEAPONS['autocannon-s']!.resolution).toBe(RESOLUTION_BY_SIZE.S);
    expect(WEAPONS['autocannon-m']!.resolution).toBe(RESOLUTION_BY_SIZE.M);
    expect(WEAPONS['autocannon-l']!.resolution).toBe(RESOLUTION_BY_SIZE.L);
    expect(WEAPONS['missile-launcher-m']!.resolution).toBe(RESOLUTION_BY_SIZE.M);
    expect(WEAPONS['torpedo-tube-m']!.resolution).toBe(RESOLUTION_BY_SIZE.M * TORPEDO_RESOLUTION_FACTOR);
    expect(WEAPONS['mining-turret-l']!.resolution).toBe(0);
    expect(WEAPONS['dispenser-s']!.resolution).toBe(0);
  });

  it('bigger swivels slew slower', () => {
    const s = WEAPONS['autocannon-s']!.turretTurnRate;
    expect(WEAPONS['autocannon-m']!.turretTurnRate).toBeCloseTo(s / TURRET_SLEW_FALLOFF);
    expect(WEAPONS['autocannon-l']!.turretTurnRate).toBeCloseTo(s / TURRET_SLEW_FALLOFF ** 2);
  });

  it('a big gun\'s shot does only part of its damage to a small ship', () => {
    const base = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
    const w0 = joinPilot(base, 'ana', 'Ana');
    const me = pilotShip(w0, 'ana')!;
    const signature = shipStats(w0, me).signature;
    const hit = (resolution: number): number => {
      const w: World = {
        ...w0,
        projectiles: [{ id: 'px', ownerShipId: 'nobody', position: { x: me.position.x, y: me.position.y - 12 }, velocity: { x: 0, y: 900 }, damage: 50, damageType: 'kinetic', resolution, ticksLeft: 10 }],
      };
      const ev = stepWorld(w, {}).events.find((e) => e.type === 'damaged' && e.shipId === me.id);
      return ev && ev.type === 'damaged' ? ev.amount : 0;
    };
    expect(hit(0)).toBe(50);
    expect(hit(signature * 2)).toBeCloseTo(25);
    expect(hit(signature * 100)).toBeCloseTo(50 * RESOLUTION_FLOOR);
  });
});

describe('signature from kit', () => {
  const tern = HULLS['meridian-courier']!;

  it('a bare hull has its own signature; kit adds by kind and size', () => {
    expect(fitStats(TEST_CATALOGUES, tern, {}).signature).toBe(tern.signature);
    const engine = Object.values(MODULES).find((m) => m.kind === 'engine' && m.size === 'S')!;
    const mount = tern.mounts.find((m) => engine.mounts.includes(m.type))!;
    expect(fitStats(TEST_CATALOGUES, tern, { [mount.id]: engine.id }).signature).toBe(tern.signature + KIT_SIGNATURE['engine']!.S);
  });

  it('a module can name its own signature: the charge rig is loud', () => {
    expect(moduleSignature(MODULES['rookrivet-chargerig-s']!)).toBeGreaterThan(0);
    expect(moduleSignature(MODULES['rookrivet-armour-s']!)).toBe(0);
  });

  it('a burning afterburner blooms the signature', () => {
    const base = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
    const w = joinPilot(base, 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!;
    const cold = shipStats(w, me).signature;
    expect(shipStats(w, { ...me, afterburning: true }).signature).toBeCloseTo(cold * (1 + AFTERBURNER_SIGNATURE_BLOOM));
  });
});

describe('what the costs do to fits', () => {
  const byName = (name: string) => REFERENCE_FITS.find((f) => f.name.startsWith(name))!;

  it('small guns lose nothing against small targets; large guns lose a lot', () => {
    const tern = fitSummary(TEST_CATALOGUES, byName('Meridian Tern'))!;
    expect(tern.dpsAgainst.small).toBeCloseTo(tern.dps);
    const frigate = fitSummary(TEST_CATALOGUES, byName('Union Defence Works Walkout'))!;
    expect(frigate.dpsAgainst.large).toBeCloseTo(frigate.dps);
    expect(frigate.dpsAgainst.small / frigate.dps).toBeLessThan(0.6);
  });

  it('measures against fixed signatures', () => {
    expect(TARGET_SIGNATURES.small).toBeLessThan(TARGET_SIGNATURES.medium);
    expect(TARGET_SIGNATURES.medium).toBeLessThan(TARGET_SIGNATURES.large);
  });

  it('the medium armour plate beats the small one on structure for its mass', () => {
    const s = MODULES['rookrivet-armour-s']!;
    const m = MODULES['cantorvell-armour-m']!;
    expect(m.stats.structure!).toBeGreaterThan(s.stats.structure!);
    expect(m.stats.structure! / m.mass).toBeLessThanOrEqual(s.stats.structure! / s.mass);
  });
});
