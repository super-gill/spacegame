/**
 * The fitting audit (docs/fitting.md, "The fitter"). Run with `npm run
 * audit`; prints a Markdown report. Uses the same sim code as the game, so
 * it is always about the game as it is.
 *
 * 1. Modules no fit should ever choose: worse in every way than another
 *    module of the same kind, size and mounts.
 * 2. Ladders: a module better in every way than another except price, so
 *    the only question is what you can afford.
 * 3. The reference fits: problems, budgets and the numbers that matter.
 * 4. Every fit with guns against the pirate raider.
 * 5. Swarms: big ships against several small ones.
 * 6. Duels between the combat reference fits, with time and health left.
 */
import { GOODS, HULLS, MODULES, WEAPONS, weaponDps, type ModuleSpec } from '../packages/sim/src/index.js';
import { duel, fitProblems, fitSummary, skirmish, type DuelResult } from '../packages/sim/src/fitlab.js';
import { REFERENCE_FITS } from '../packages/sim/src/reference-fits.js';
import type { Catalogues } from '../packages/sim/src/stats.js';

const cat: Catalogues = { hulls: HULLS, modules: MODULES, weapons: WEAPONS, goods: GOODS };
const out: string[] = [];
const say = (line = ''): void => void out.push(line);

/** Stats where less is better; everything else, more is better. */
const LOWER_BETTER = new Set(['afterburnerDraw', 'surveyCost', 'capacitorPerShot', 'fireInterval', 'power', 'mass', 'price']);

/** Every number that says how good a module is, with its direction handled by `LOWER_BETTER`. */
function profile(m: ModuleSpec): Record<string, number> {
  const p: Record<string, number> = { power: m.power, mass: m.mass, price: m.price };
  for (const [k, v] of Object.entries(m.stats)) if (typeof v === 'number') p[k] = v;
  if (m.capacitorDraw) p['capacitorDraw'] = m.capacitorDraw;
  const w = m.weaponId ? WEAPONS[m.weaponId] : undefined;
  if (w) {
    if (w.mining) {
      p['oreRate'] = w.damage;
      p['strength'] = w.mining.strength;
    } else {
      p['dps'] = weaponDps(w);
      p['projectileSpeed'] = w.projectileSpeed;
    }
    p['range'] = w.range;
    p['capacitorPerShot'] = w.capacitorPerShot;
  }
  return p;
}

/** -1: a worse than b in every way that counts (at least one strictly); 0 otherwise. Ignores keys in `skip`. */
function dominated(a: ModuleSpec, b: ModuleSpec, skip: Set<string>): boolean {
  const pa = profile(a);
  const pb = profile(b);
  const keys = new Set([...Object.keys(pa), ...Object.keys(pb)].filter((k) => !skip.has(k)));
  let strictly = false;
  for (const k of keys) {
    const x = pa[k] ?? 0;
    const y = pb[k] ?? 0;
    const better = LOWER_BETTER.has(k) ? y < x : y > x;
    const worse = LOWER_BETTER.has(k) ? y > x : y < x;
    if (worse) return false;
    if (better) strictly = true;
  }
  return strictly;
}

/** Modules that compete for the same slot: same kind, size and mounts; weapons also by family and fixed or swivel. */
function rivals(): ModuleSpec[][] {
  const groups = new Map<string, ModuleSpec[]>();
  for (const m of Object.values(MODULES)) {
    const w = m.weaponId ? WEAPONS[m.weaponId] : undefined;
    const key = [m.kind, m.size, m.mounts.join('/'), w ? `${w.family}:${w.kind}` : ''].join('|');
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

say(`# Fitting audit`);
say();
say(`${Object.keys(HULLS).length} hulls, ${Object.keys(MODULES).length} modules, ${REFERENCE_FITS.length} reference fits.`);
say();

say(`## Modules no fit should choose`);
say();
const never: string[] = [];
const ladders: string[] = [];
for (const group of rivals()) {
  for (const a of group) {
    for (const b of group) {
      if (a === b) continue;
      if (dominated(a, b, new Set())) never.push(`- ${a.name} (${a.id}) is worse in every way than ${b.name} (${b.id}).`);
      else if (dominated(a, b, new Set(['price'])) && b.price > a.price) ladders.push(`- ${b.name} beats ${a.name} in everything but price (${b.price} against ${a.price}).`);
    }
  }
}
say(never.length > 0 ? never.join('\n') : 'None.');
say();
say(`## Ladders (only price separates them)`);
say();
say(ladders.length > 0 ? ladders.join('\n') : 'None.');
say();

say(`## Reference fits`);
say();
say(`| Fit | Role | Problems | Power | Mass | Price | Speed | Accel | Signature | DPS | Range | Shield + structure | Cargo | Ore | Ore/s |`);
say(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
for (const f of REFERENCE_FITS) {
  const s = fitSummary(cat, f)!;
  const problems = fitProblems(cat, f).map((p) => `${p.mountId ?? ''} ${p.reason}`.trim()).join(', ') || 'none';
  say(`| ${f.name} | ${f.role ?? ''} | ${problems} | ${s.powerDraw}/${s.powerOutput} | ${s.mass.toFixed(1)} | ${s.price.toLocaleString('en-GB')} | ${s.topSpeed} | ${s.acceleration.toFixed(1)} | ${Math.round(s.signature)} | ${s.dps.toFixed(0)} | ${Math.round(s.range)} | ${Math.round(s.shield + s.structure)} | ${s.cargo} | ${s.oreHold} | ${s.miningRate.toFixed(1)} |`);
}
say();

/** A duel's runs in one cell: wins, mean seconds and mean health left for the winner. */
function cell(r: DuelResult, side: 'a' | 'b'): string {
  const won = r.runs.filter((x) => x.winner === side);
  if (won.length === 0) return `${side === 'a' ? r.winsA : r.winsB}`;
  const secs = won.reduce((n, x) => n + x.seconds, 0) / won.length;
  const left = won.reduce((n, x) => n + (side === 'a' ? x.aLeft : x.bLeft), 0) / won.length;
  return `${won.length} (${secs.toFixed(0)} s, ${Math.round(left * 100)}%)`;
}

say(`## Against the pirate raider`);
say();
say(`Every reference fit with guns against the Black Strike raider: wins out of 4, with the mean time to kill and health left. The design asks every stock fit with guns to drive it off or kill it in reasonable time.`);
say();
const raider = REFERENCE_FITS.find((f) => f.name.startsWith('Kessari Warrant, Black Strike'))!;
say(`| Fit | Wins | Raider wins |`);
say(`| --- | --- | --- |`);
for (const f of REFERENCE_FITS) {
  if (f === raider || fitSummary(cat, f)!.dps <= 0) continue;
  const r = duel(f, raider);
  say(`| ${f.name} | ${cell(r, 'a')} | ${cell(r, 'b')} |`);
}
say();

say(`## Swarms`);
say();
say(`One big ship against one to four small ones (Jason: a big ship should win one against one; a swarm should overwhelm it). Small ships make attack passes, as pirates do. Wins out of 4 for the big ship, then the mean time and what the winners had left, and how many small ships died on average.`);
say();
const swarmers = ['Warrant brawler', 'Kessari Warrant, Black Strike'].map((n) => REFERENCE_FITS.find((f) => f.name.startsWith(n))!);
const bigOnes = REFERENCE_FITS.filter((f) => f.role === 'combat' && ['kessari-brig', 'union-frigate'].includes(f.hullId));
say(`| Big ship | Against | 1 | 2 | 3 | 4 |`);
say(`| --- | --- | --- | --- | --- | --- |`);
for (const big of bigOnes) {
  for (const small of swarmers) {
    const cells = [1, 2, 3, 4].map((n) => {
      const r = skirmish([big], Array(n).fill(small));
      const won = r.runs.filter((x) => x.winner === 'a');
      const lost = r.runs.filter((x) => x.winner === 'b');
      const killed = r.runs.reduce((m, x) => m + x.bLost, 0) / r.runs.length;
      if (won.length > 0) return `${r.winsA}/4 (${Math.round(won.reduce((m, x) => m + x.seconds, 0) / won.length)} s, ${Math.round((100 * won.reduce((m, x) => m + x.aLeft, 0)) / won.length)}% left)`;
      return `${r.winsA}/4 (${lost.length > 0 ? `${Math.round(lost.reduce((m, x) => m + x.seconds, 0) / lost.length)} s, ` : ''}${killed.toFixed(1)} killed)`;
    });
    say(`| ${big.name} | ${small.name} | ${cells.join(' | ')} |`);
  }
}
say();

say(`## Duels between combat fits`);
say();
say(`Row against column: wins out of 4 starts, with the mean seconds to win and the winner's health left (a draw is neither dead after two minutes). Both fly the same simple script, which closes and sits nose on: it never circles, so it does not test tracking.`);
say();
const fighters = REFERENCE_FITS.filter((f) => f.role === 'combat');
say(`| | ${fighters.map((f) => f.name).join(' | ')} |`);
say(`| --- | ${fighters.map(() => '---').join(' | ')} |`);
for (const a of fighters) {
  const cells = fighters.map((b) => {
    if (a === b) return '-';
    return cell(duel(a, b), 'a');
  });
  say(`| ${a.name} | ${cells.join(' | ')} |`);
}
say();

console.log(out.join('\n'));
