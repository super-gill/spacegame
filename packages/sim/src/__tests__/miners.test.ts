import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../constants.js';
import { SAVE_FORMAT, deserializeWorld } from '../save.js';
import { stepWorld } from '../step.js';
import type { World, WorldEvent } from '../types.js';
import { createStarterWorld } from '../world.js';

/** NPC miners (docs/mining.md, "NPC miners"): prospectors and a hulk working the belt round Ridge. */

const MINUTE = Math.round(60 / FIXED_DT);

function soak(minutes: number): { w: World; events: WorldEvent[] } {
  let w = createStarterWorld();
  const events: WorldEvent[] = [];
  for (let i = 0; i < minutes * MINUTE; i++) {
    w = stepWorld(w, {});
    for (const e of w.events) if ((e as { shipId?: string }).shipId?.includes('miner')) events.push(e);
  }
  return { w, events };
}

describe('NPC miners', () => {
  // One soak shared by the checks below: eight minutes of the starter system.
  const { w, events } = soak(8);
  const by = (shipPrefix: string, type: WorldEvent['type']): WorldEvent[] => events.filter((e) => e.type === type && (e as { shipId: string }).shipId.startsWith(shipPrefix));

  it('start docked at Ridge: two prospectors and a hulk', () => {
    const start = createStarterWorld();
    const miners = Object.entries(start.npcs).filter(([, b]) => b.kind === 'miner');
    expect(miners.map(([id]) => id).sort()).toEqual(['npc-miner-hulk-1', 'npc-miner-prospector-1', 'npc-miner-prospector-2-1']);
    for (const [id] of miners) expect(start.ships[id]!.dockedAt).toBe('station-ridge');
  });

  it('cut ore, fill up, go and sell, and come back for more', () => {
    for (const prefix of ['npc-miner-prospector-1', 'npc-miner-prospector-2-1', 'npc-miner-hulk-1']) {
      const freed = by(prefix, 'oreFreed').reduce((n, e) => n + (e.type === 'oreFreed' ? e.amount : 0), 0);
      expect(freed, prefix).toBeGreaterThan(100);
      expect(by(prefix, 'docked').length, prefix).toBeGreaterThan(0);
      expect(by(prefix, 'undocked').length, prefix).toBeGreaterThan(1);
    }
  });

  it('a prospector sells at Ridge, the hulk hauls to Lantern Works', () => {
    expect(by('npc-miner-prospector-1', 'docked').every((e) => e.type === 'docked' && e.stationId === 'station-ridge')).toBe(true);
    expect(by('npc-miner-hulk-1', 'docked').every((e) => e.type === 'docked' && e.stationId === 'station-lantern')).toBe(true);
  });

  it('the hulk works as a pilot would: locked rocks, assigned turrets, drones out and home again', () => {
    expect(by('npc-miner-hulk-1', 'laserAssigned').length).toBeGreaterThan(0);
    expect(by('npc-miner-hulk-1', 'dronesLaunched').length).toBeGreaterThan(0);
    expect(by('npc-miner-hulk-1', 'droneStowed').length).toBeGreaterThan(0);
  });

  it('sold ore leaves the hold', () => {
    for (const [id, brain] of Object.entries(w.npcs)) {
      const ship = w.ships[id];
      if (brain.kind !== 'miner' || !ship || ship.state !== 'docked') continue;
      expect(Object.keys(ship.hold).filter((g) => w.goods[g]?.ore), id).toEqual([]);
    }
  });

  it('old saves gain the miner spawners', () => {
    const fresh = createStarterWorld();
    const old = { ...fresh, spawners: fresh.spawners.filter((sp) => !sp.id.startsWith('miner')), npcs: {}, ships: {} };
    const r = deserializeWorld(JSON.stringify({ format: SAVE_FORMAT, version: 7, savedAt: '', world: old }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.world.spawners.map((sp) => sp.id)).toEqual(expect.arrayContaining(['miner-prospector', 'miner-prospector-2', 'miner-hulk']));
  });
});
