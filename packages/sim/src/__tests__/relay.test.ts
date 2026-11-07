import { describe, expect, it } from 'vitest';
import { laneLegs, SOL_LANES } from '../lanes.js';
import { RELAY_RANGE, relayNet, relayPosition, securityAt, worldRelays, type SecurityLevel } from '../relay.js';
import { createSolWorld } from '../sol.js';
import { createStarterWorld } from '../world.js';
import { add, distance, length, scale, sub } from '../vec2.js';

/** The Accord's Relay and security computed from it (docs/infrastructure.md; docs/sol-build.md, slice 2, push 3). */

const sol = createSolWorld();
const byName = (name: string) => Object.values(sol.stations).find((s) => s.name === name)!;
const levelAt = (name: string, relays = worldRelays(sol)): SecurityLevel => securityAt(relayNet(sol, relays), byName(name).position).level;

describe('the Relay', () => {
  it('lays buoys round Sol\'s ports and along its lanes, none at the clans\' ports, none in Calder', () => {
    const relays = worldRelays(sol);
    expect(relays.length).toBeGreaterThan(200);
    const at = (name: string) => relays.filter((n) => n.anchor.kind === 'station' && n.anchor.stationId === byName(name).id).length;
    expect(at('Earth Orbital Exchange')).toBe(3);
    expect(at('Bellows')).toBe(1);
    expect(at('Hilda Moot')).toBe(0);
    expect(at('Triton Moot')).toBe(0);
    expect(worldRelays(createStarterWorld())).toEqual([]);
  });

  it('chains every lane so that its line is always heard by two buoys', () => {
    const net = relayNet(sol);
    for (const lane of SOL_LANES) {
      for (const leg of laneLegs(lane, sol.stations)) {
        for (let t = 0; t <= 1; t += 0.01) {
          const p = add(leg.from, scale(sub(leg.to, leg.from), t));
          expect(net.nodes.filter((n) => distance(n.at, p) <= RELAY_RANGE).length, `${lane.name} at ${t.toFixed(2)}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('puts every buoy where it rides, and is one network in Sol', () => {
    for (const node of worldRelays(sol)) expect(relayPosition(sol, node)).not.toBeNull();
    expect(relayNet(sol).reaches).toHaveLength(1);
  });
});

describe('security from connectivity', () => {
  it('reads sol.md\'s map out of the Relay rather than painting it on', () => {
    // Core: the capitals, the inner lanes, Ceres, the gate.
    for (const name of ['Earth Orbital Exchange', 'Thetis Orbital', 'Republic Station Elysium', 'Slagline', 'Ceres Accord Station', 'Tycho Port', 'ECF Toll Station', 'MRN Gate Station']) expect(levelAt(name), name).toBe('core');
    // Held: off the lanes in the powers' space, and the thin outer lanes.
    for (const name of ['Bellows', 'The Boneyard', 'Vesta Concession', 'Corvane Caloris Foundry', 'State Mine Eureka', 'Titan Free Port', 'Callisto Freight Depot', 'Rimehold']) expect(levelAt(name), name).toBe('held');
    // Contested: nobody agrees (Psyche), and Jupiter's moons, claimed by three holders.
    for (const name of ['Psyche Dig', 'The Ganymede Local', 'VSG Haven Europa']) expect(levelAt(name), name).toBe('contested');
    // Open: the clans' waters, where the Accord laid nothing.
    for (const name of ['Hilda Moot', 'Triton Moot']) expect(levelAt(name), name).toBe('open');
  });

  it('drops off a lane: walking away from the Inner Lane it never rises, and ends Open', () => {
    const net = relayNet(sol);
    const rank: Record<SecurityLevel, number> = { core: 3, held: 2, contested: 1, open: 0 };
    const leg = laneLegs(SOL_LANES[0]!, sol.stations)[1]!;
    const across = scale({ x: -(leg.to.y - leg.from.y), y: leg.to.x - leg.from.x }, 1 / length(sub(leg.to, leg.from)));
    for (const t of [0.3, 0.5, 0.7]) {
      const on = add(leg.from, scale(sub(leg.to, leg.from), t));
      expect(securityAt(net, on)).toMatchObject({ level: 'core', holder: 'accord', onLane: true });
      const seen: SecurityLevel[] = [];
      for (let off = 0; off <= 2_500_000; off += 25_000) seen.push(securityAt(net, add(on, scale(across, off))).level);
      for (let i = 1; i < seen.length; i++) expect(rank[seen[i]!], `at ${t}, step ${i}`).toBeLessThanOrEqual(rank[seen[i - 1]!]);
      expect(seen.at(-1)).toBe('open');
    }
  });

  it('is a live reading: cut the buoys that hear a place and it goes dark', () => {
    const relays = worldRelays(sol);
    const exchange = byName('Earth Orbital Exchange').position;
    expect(levelAt('Earth Orbital Exchange', relays)).toBe('core');
    const cut = relays.map((n) => (distance(relayPosition(sol, n)!, exchange) <= RELAY_RANGE ? { ...n, down: true } : n));
    expect(levelAt('Earth Orbital Exchange', cut)).toBe('open');
    // Cut all but one: heard, but thin, so Held.
    let kept = false;
    const thin = relays.map((n) => {
      if (distance(relayPosition(sol, n)!, exchange) > RELAY_RANGE) return n;
      if (!kept) {
        kept = true;
        return n;
      }
      return { ...n, down: true };
    });
    expect(levelAt('Earth Orbital Exchange', thin)).toBe('held');
  });

  it('cuts a far port off when the buoys linking it home go', () => {
    // Bellows's single buoy reaches home over a long link; with every other buoy cut it hears itself and nothing else.
    const bellows = byName('Bellows');
    const alone = worldRelays(sol).map((n) => (n.anchor.kind === 'station' && n.anchor.stationId === bellows.id ? n : { ...n, down: true }));
    expect(levelAt('Bellows', alone)).toBe('open');
  });
});
