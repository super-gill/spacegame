import { describe, expect, it } from 'vitest';
import {
  AFTERBURNER_SIGNATURE_BLOOM,
  KIT_SIGNATURE,
  SHOT_SPEED_FALLOFF,
} from '../constants.js';
import { skirmish } from '../fitlab.js';
import { HULLS } from '../hulls.js';
import { MODULES } from '../modules.js';
import { REFERENCE_FITS } from '../reference-fits.js';
import { migrate12to13, migrate13to14, migrate14to15 } from '../save.js';
import { fitStats, moduleSignature, shipStats } from '../stats.js';
import { WEAPONS } from '../weapons.js';
import { createStarterWorld, joinPilot, pilotShip } from '../world.js';
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

  it('the Fire Control L runs more close-in weapon systems than the M', () => {
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
        s1: { id: 's1', ownerId: 'ana', fit: { w1: 'union-picket-l-turret', w2: 'union-picket-l', w3: 'paragon-pulse-s' } },
        npc: { id: 'npc', ownerId: null, fit: { w1: 'commonwealth-answer-l-turret' } },
      },
      pilots: { ana: { id: 'ana', credits: 100, storage: { harbour: { 'union-autocannon-m-turret': 2, 'union-autocannon-m': 1, rounds: 5 } } } },
    };
    const next = migrate13to14(old) as typeof old & { ships: Record<string, { fit: Record<string, string> }>; pilots: Record<string, { credits: number; storage: Record<string, Record<string, number>> }> };
    expect(next.ships['s1']!.fit).toEqual({ w1: 'union-picket-l', w2: 'union-picket-l', w3: 'paragon-pulse-s' });
    expect(next.ships['npc']!.fit).toEqual({ w1: 'commonwealth-answer-l' });
    expect(next.pilots['ana']!.storage['harbour']).toEqual({ 'union-autocannon-m': 3, rounds: 5 });
    // One Picket L turret fitted (3,000 over the gun), two autocannon M turrets stored (1,050 each).
    expect(next.pilots['ana']!.credits).toBe(100 + 3000 + 1050 * 2);
    for (const id of [...Object.values(next.ships['s1']!.fit), ...Object.keys(next.pilots['ana']!.storage['harbour']!)]) {
      if (id !== 'rounds') expect(MODULES[id], id).toBeDefined();
    }
  });
});

describe('saves from before close-in weapon systems', () => {
  it('turn swivels into CIWS on free CIWS hardpoints and refund the rest, fitted or stored', () => {
    const old = {
      ships: {
        // A frigate with three swivels: four free CIWS hardpoints take them all.
        f: { id: 'f', hullId: 'union-frigate', ownerId: 'ana', heading: 0, fit: { w1: 'union-picket-l', w3: 'paragon-turret-s', w4: 'paragon-turret-s', w5: 'paragon-turret-s' }, weapons: [{ mountId: 'w1', cooldownTicks: 0, aim: 0.3, loaded: 7, reloadTicks: 0, group: 1 }] },
        // A Tern with one: no CIWS hardpoints, so it is refunded.
        t: { id: 't', hullId: 'meridian-courier', ownerId: 'ana', heading: 0, fit: { w1: 'paragon-pulse-s', w2: 'paragon-turret-s' }, weapons: [] },
        // An NPC brig: refitted, nobody refunded.
        npc: { id: 'npc', hullId: 'kessari-brig', ownerId: null, heading: 0, fit: { w3: 'paragon-turret-s', w4: 'paragon-turret-s', w5: 'paragon-turret-s' }, weapons: [] },
      },
      pilots: { ana: { id: 'ana', credits: 100, storage: { harbour: { 'paragon-turret-s': 2, rounds: 5 } } } },
    };
    type Next = { ships: Record<string, { fit: Record<string, string>; weapons: { mountId: string; aim: number; loaded: number }[] }>; pilots: Record<string, { credits: number; storage: Record<string, Record<string, number>> }> };
    const next = migrate14to15(old) as Next;
    expect(next.ships['f']!.fit).toEqual({ w1: 'union-picket-l', d1: 'paragon-ciws-m', d2: 'paragon-ciws-m', d3: 'paragon-ciws-m' });
    // The gun that stayed keeps its state; the new CIWS come loaded.
    expect(next.ships['f']!.weapons.find((w) => w.mountId === 'w1')).toMatchObject({ aim: 0.3, loaded: 7 });
    expect(next.ships['f']!.weapons.find((w) => w.mountId === 'd1')!.loaded).toBe(WEAPONS['ciws-m']!.magazine);
    expect(next.ships['f']!.weapons.some((w) => w.mountId === 'w3')).toBe(false);
    expect(next.ships['t']!.fit).toEqual({ w1: 'paragon-pulse-s' });
    // Two of the brig's three become CIWS; the third is nobody's to refund.
    expect(next.ships['npc']!.fit).toEqual({ d1: 'paragon-ciws-m', d2: 'paragon-ciws-m' });
    expect(next.pilots['ana']!.storage['harbour']).toEqual({ rounds: 5 });
    // The Tern's one and the two stored, at 800 each.
    expect(next.pilots['ana']!.credits).toBe(100 + 800 * 3);
  });
});

describe('swarms', () => {
  const byName = (name: string) => REFERENCE_FITS.find((f) => f.name.startsWith(name))!;

  it('a brig beats one Warrant brawler, and three of them beat the brig', () => {
    const brawler = byName('Warrant brawler');
    expect(skirmish([byName('Injunction brawler')], [brawler], { starts: 1 }).winsA).toBe(1);
    expect(skirmish([byName('Injunction brawler')], [brawler, brawler, brawler], { starts: 1 }).winsB).toBe(1);
  });
});
