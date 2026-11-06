import { describe, expect, it } from 'vitest';
import {
  AFTERBURNER_SIGNATURE_BLOOM,
  KIT_SIGNATURE,
  SHOT_SPEED_FALLOFF,
  TURRET_SLEW_FALLOFF,
} from '../constants.js';
import { buildShip } from '../factory.js';
import { skirmish } from '../fitlab.js';
import { HULLS } from '../hulls.js';
import { LOADOUTS } from '../loadouts.js';
import { MODULES } from '../modules.js';
import { REFERENCE_FITS } from '../reference-fits.js';
import { migrate12to13, migrate13to14 } from '../save.js';
import { fitStats, moduleSignature, shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import type { Ship, World } from '../types.js';
import { WEAPONS } from '../weapons.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';
import { TEST_CATALOGUES } from './fixtures.js';

/**
 * Fitting step 4, the costs (docs/fitting.md, "As built: step 4"). No
 * damage is cut by rule: big guns miss small ships because big turrets
 * slew slowly and big shots fly slowly. The turret model's own tests are
 * in turrets.test.ts.
 */

describe('physics, not damage cuts', () => {
  it('bigger shots fly slower', () => {
    const s = WEAPONS['autocannon-s']!.projectileSpeed;
    expect(WEAPONS['autocannon-m']!.projectileSpeed).toBeCloseTo(s / SHOT_SPEED_FALLOFF);
    expect(WEAPONS['autocannon-l']!.projectileSpeed).toBeCloseTo(s / SHOT_SPEED_FALLOFF ** 2);
  });

  it('point defence is small only, and every swivel module fires it', () => {
    const pdc = Object.values(WEAPONS).filter((w) => w.family === 'pointDefence');
    expect(pdc.map((w) => w.size)).toEqual(['S']);
    for (const m of Object.values(MODULES)) if (m.weaponId && WEAPONS[m.weaponId]?.family === 'pointDefence') expect(m.size).toBe('S');
  });

  it('the Gunlayer L runs more swivels than the M', () => {
    expect(MODULES['paragon-director-l']!.stats.turretControl!).toBeGreaterThan(MODULES['paragon-director-m']!.stats.turretControl!);
  });
});

describe('signature from kit', () => {
  const courier = HULLS['meridian-courier']!;

  it('a bare hull has its own signature; kit adds by kind and size', () => {
    expect(fitStats(TEST_CATALOGUES, courier, {}).signature).toBe(courier.signature);
    const engine = Object.values(MODULES).find((m) => m.kind === 'engine' && m.size === 'S')!;
    const mount = courier.mounts.find((m) => engine.mounts.includes(m.type))!;
    expect(fitStats(TEST_CATALOGUES, courier, { [mount.id]: engine.id }).signature).toBe(courier.signature + KIT_SIGNATURE['engine']!.S);
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

describe('the medium armour plate', () => {
  it('beats the small one on structure, a little worse per tonne', () => {
    const s = MODULES['rookrivet-armour-s']!;
    const m = MODULES['cantorvell-armour-m']!;
    expect(m.stats.structure!).toBeGreaterThan(s.stats.structure!);
    expect(m.stats.structure! / m.mass).toBeLessThanOrEqual(s.stats.structure! / s.mass);
  });
});

describe('saves from before small-only point defence', () => {
  it('turn medium and large swivels into small ones and refund the difference', () => {
    const old = {
      ships: { s1: { id: 's1', ownerId: 'ana', fit: { w3: 'paragon-turret-m', w4: 'paragon-turret-l', w1: 'union-picket-l' } }, npc: { id: 'npc', ownerId: null, fit: { w3: 'paragon-turret-m' } } },
      pilots: { ana: { id: 'ana', credits: 100, storage: { harbour: { 'paragon-turret-m': 2, 'paragon-turret-s': 1, rounds: 5 } } } },
    };
    const next = migrate12to13(old) as typeof old & { ships: Record<string, { fit: Record<string, string> }>; pilots: Record<string, { credits: number; storage: Record<string, Record<string, number>> }> };
    expect(next.ships['s1']!.fit).toEqual({ w3: 'paragon-turret-s', w4: 'paragon-turret-s', w1: 'union-picket-l' });
    expect(next.ships['npc']!.fit).toEqual({ w3: 'paragon-turret-s' });
    expect(next.pilots['ana']!.storage['harbour']).toEqual({ 'paragon-turret-s': 3, rounds: 5 });
    // One M and one L fitted, two M stored: (2600 - 800) * 3 + (7000 - 800).
    expect(next.pilots['ana']!.credits).toBe(100 + 1800 * 3 + 6200);
  });
});

describe('saves from before the turret model', () => {
  it('turn turreted gun modules into the gun of the same name and refund the mounting', () => {
    const old = {
      ships: {
        s1: { id: 's1', ownerId: 'ana', fit: { w1: 'union-picket-l-turret', w2: 'union-picket-l', w3: 'paragon-turret-s' } },
        npc: { id: 'npc', ownerId: null, fit: { w1: 'commonwealth-answer-l-turret' } },
      },
      pilots: { ana: { id: 'ana', credits: 100, storage: { harbour: { 'union-autocannon-m-turret': 2, 'union-autocannon-m': 1, rounds: 5 } } } },
    };
    const next = migrate13to14(old) as typeof old & { ships: Record<string, { fit: Record<string, string> }>; pilots: Record<string, { credits: number; storage: Record<string, Record<string, number>> }> };
    expect(next.ships['s1']!.fit).toEqual({ w1: 'union-picket-l', w2: 'union-picket-l', w3: 'paragon-turret-s' });
    expect(next.ships['npc']!.fit).toEqual({ w1: 'commonwealth-answer-l' });
    expect(next.pilots['ana']!.storage['harbour']).toEqual({ 'union-autocannon-m': 3, rounds: 5 });
    // One Picket L turret fitted (3,000 over the gun), two autocannon M turrets stored (1,050 each).
    expect(next.pilots['ana']!.credits).toBe(100 + 3000 + 1050 * 2);
    for (const id of [...Object.values(next.ships['s1']!.fit), ...Object.keys(next.pilots['ana']!.storage['harbour']!)]) {
      if (id !== 'rounds') expect(MODULES[id], id).toBeDefined();
    }
  });
});

describe('swarms', () => {
  const byName = (name: string) => REFERENCE_FITS.find((f) => f.name.startsWith(name))!;

  it('a brig beats one Warrant brawler, and three of them beat the brig', () => {
    const brawler = byName('Warrant brawler');
    expect(skirmish([byName('Brig brawler')], [brawler], { starts: 1 }).winsA).toBe(1);
    expect(skirmish([byName('Brig brawler')], [brawler, brawler, brawler], { starts: 1 }).winsB).toBe(1);
  });
});
