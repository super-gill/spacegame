import type { GunBearing, NavReadout, Ship, WeaponFamily, World } from '@spacegame/sim';
import {
  FLIGHT_MODE_LABELS,
  boardableShips,
  cargoUsed,
  ACTIVATION_KEYS,
  activationSlots,
  distance,
  goodsFitting,
  incomingMunitions,
  isEscapePod,
  gunBearing,
  isGun,
  isMainGun,
  loadedGoodOf,
  nearestDockableStation,
  shipPilot,
  shipStats,
  holdCapacity,
  SURVEY_CYCLE_SECONDS,
  breachAction,
  hopperRejects,
  isSwitchedOn,
  rockAt,
} from '@spacegame/sim';
import { boardPrompt, shipName } from '../ui.js';
import { el, setAttr, setText, show, svg } from './dom.js';
import { arcPath, fraction, reloadProgress } from './geometry.js';
import type { Condition } from './warnings.js';


/** The commit this client was built from (vite.config.ts), so a stale build is easy to spot. */
declare const __BUILD_COMMIT__: string;
const BUILD_COMMIT = typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : 'dev';

/**
 * The flight HUD: the always-on instruments at the screen edges.
 *
 * - Top left: which ship you are in, the zone, credits and cargo.
 * - Bottom centre: the status dial (shield and hull rings round your
 *   speed against your local frame, with the capacitor ring reserved
 *   for milestone 6e), the frame named under it, the flight mode and weapons state, and a tile per weapon. Only modules
 *   you use in flight get a place here; the rest belong in the ship
 *   status window.
 * - Above the dial: what you can do right now (dock, board).
 * - Top centre: the one warning in force (a placeholder until warning
 *   tiers land).
 * - Bottom right: frame rate and tick, dim, for testing.
 *
 * Built once; `update` changes only what moved.
 */

/** Gauge rings start bottom left and run clockwise to bottom right, leaving a gap at the bottom. */
const RING_START = 135;
const RING_SWEEP = 270;
const DIAL = 190;
const MID = DIAL / 2;
const SHIELD_R = 84;
const HULL_R = 72;
const CAP_R = 54;

/** Hull below these fractions turns to the caution, then the alarm colour. */
const HULL_CAUTION = 0.5;
const HULL_ALARM = 0.25;
/** The warning banner shows this many lines; the rest are counted. */
const WARNING_LINES = 3;

const NONE = '-';

/** The frame speed is measured against, in words: `REL HARBOUR STATION`, `REL FIELDMARK`, `REL SYSTEM`. */
function frameWords(world: World, nav: NavReadout): string {
  const f = nav.frame;
  const name = f.kind === 'station' ? world.stations[f.id]?.name : f.kind === 'body' ? world.bodies[f.id]?.name : undefined;
  return name ? `REL ${name.toUpperCase()}` : 'REL SYSTEM';
}

interface WeaponTile {
  root: HTMLDivElement;
  reload: SVGPathElement;
  state: HTMLSpanElement;
  /** What the gun runs on: rounds loaded and boxes aboard, or CAP. */
  ammo: HTMLSpanElement;
}

export class FlightHud {
  private readonly root = el('div', 'flight-hud');
  private readonly status = el('div', 'hud-status');
  private readonly shipLine = el('div', 'hud-ship');
  private readonly zoneLine = el('div', 'hud-dim');
  private readonly walletLine = el('span', 'hud-dim');
  /** The colours chip (docs/interface.md, section 3): COLOURS, or DARK in amber; click to switch. */
  private readonly coloursChip = el('button', 'hud-colours') as HTMLButtonElement;
  /** Called when the colours chip is clicked (main.ts sends the toggle). */
  onToggleColours: () => void = () => {};
  /** The warning banner (hud/warnings.ts): what holds now, highest tier first. Click to silence alarms. */
  private readonly alert = el('div', 'hud-warnings hidden');
  private warningKey = '';
  private readonly cluster = el('div', 'hud-cluster');
  private readonly prompt = el('div', 'hud-prompt');
  private readonly shieldArc = svg('path', { class: 'ring shield' });
  private readonly capArc = svg('path', { class: 'ring cap' });
  private readonly hullArc = svg('path', { class: 'ring hull' });
  private readonly speed = svg('text', { x: MID, y: MID + 8, class: 'dial-speed', 'text-anchor': 'middle' });
  private readonly speedUnit = svg('text', { x: MID, y: MID + 26, class: 'dial-unit', 'text-anchor': 'middle' });
  private readonly shieldLabel = svg('text', { x: 40, y: DIAL - 10, class: 'dial-label shield', 'text-anchor': 'middle' });
  private readonly hullLabel = svg('text', { x: DIAL - 40, y: DIAL - 10, class: 'dial-label hull', 'text-anchor': 'middle' });
  private readonly frameLine = el('div', 'hud-frame');
  private readonly modeChip = el('span', 'hud-chip');
  private readonly weaponsChip = el('span', 'hud-chip');
  private readonly headingChip = el('span', 'hud-chip');
  /** Heading lock state from the client (mouse steering only); null hides the chip. */
  headingLock: boolean | null = null;
  private readonly weapons = el('div', 'hud-weapons');
  /** Stopgap (lead, 6f): the numbered activation tiles and the afterburner, above the weapon tiles. */
  private readonly slots = el('div', 'hud-slots');
  private slotKey = '';
  private slotTiles: { root: HTMLDivElement; label: HTMLSpanElement; state: HTMLSpanElement }[] = [];
  private readonly burner = el('div', 'hud-slot burner');
  private readonly debug = el('div', 'hud-debug');
  private weaponTiles = new Map<string, WeaponTile>();
  private weaponKey = '';

  constructor(parent: HTMLElement) {
    const walletRow = el('div', 'hud-wallet');
    this.coloursChip.type = 'button';
    this.coloursChip.addEventListener('click', () => this.onToggleColours());
    walletRow.append(this.walletLine, this.coloursChip);
    this.status.append(this.shipLine, this.zoneLine, walletRow);

    const dial = svg('svg', {
      width: DIAL,
      height: DIAL,
      viewBox: `0 0 ${DIAL} ${DIAL}`,
      class: 'hud-dial',
      role: 'img',
      'aria-label': 'Shield, hull and speed',
    });
    const track = (r: number) => svg('path', { class: 'ring track', d: arcPath(MID, MID, r, 1, RING_START, RING_SWEEP) });
    dial.append(
      track(SHIELD_R),
      this.shieldArc,
      track(HULL_R),
      this.hullArc,
      // The capacitor (6e): the inner ring fills with the pool.
      svg('circle', { cx: MID, cy: MID, r: CAP_R, class: 'ring capacitor' }),
      this.capArc,
      this.speed,
      this.speedUnit,
      this.shieldLabel,
      this.hullLabel,
    );

    const chips = el('div', 'hud-chips');
    chips.append(this.modeChip, this.weaponsChip, this.headingChip);
    const centre = el('div', 'hud-dial-column');
    centre.append(dial, this.frameLine, chips);
    const kit = el('div', 'hud-kit');
    kit.append(this.slots, this.weapons);
    this.cluster.append(centre, kit);

    this.root.append(this.status, this.alert, this.prompt, this.cluster, this.debug);
    parent.append(this.root);
  }

  /**
   * The warning banner: the conditions holding now (already sorted,
   * highest tier first), at most `WARNING_LINES` lines and a count of the
   * rest. `silenceable` adds a hint that a click silences the alarm;
   * `onSilence` is called as the button goes down.
   */
  setWarnings(list: readonly Condition[], silenceable: boolean, onSilence: () => void): void {
    const key = list.map((c) => `${c.tier}|${c.text}`).join('/') + (silenceable ? '/s' : '');
    if (key === this.warningKey) return;
    this.warningKey = key;
    show(this.alert, list.length > 0);
    // Silence on the press, not the click: a countdown (collision in 1.3 s)
    // rebuilds these rows every frame, and a click whose press landed on a
    // row that was replaced before the release never fires.
    this.alert.onpointerdown = silenceable
      ? (e) => {
          e.preventDefault();
          onSilence();
        }
      : null;
    this.alert.classList.toggle('silenceable', silenceable);
    const rows = list.slice(0, WARNING_LINES).map((c) => el('div', `hud-warning ${c.tier}`, `${c.tier.toUpperCase()} · ${c.text}`));
    if (list.length > WARNING_LINES) rows.push(el('div', 'hud-warning more', `+${list.length - WARNING_LINES} MORE`));
    if (silenceable) rows.push(el('div', 'hud-warning hint', 'CLICK TO SILENCE THE ALARM'));
    this.alert.replaceChildren(...rows);
  }

  /**
   * Refresh. `ship` is null while the pilot has no ship. `nav` is the
   * ship's `navReadout` (null without a nav computer): speed and frame
   * are shown only through it, never worked out here.
   */
  update(world: World, ship: Ship | null, nav: NavReadout | null, fps: number): void {
    setText(this.debug, `${fps.toFixed(0)} fps · tick ${world.tick} · build ${BUILD_COMMIT}`);
    show(this.status, ship !== null);
    show(this.cluster, ship !== null && ship.state === 'flying');
    if (!ship) {
      setText(this.prompt, '');
      return;
    }
    const stats = shipStats(world, ship);
    const pilot = shipPilot(world, ship.id);

    // Top left.
    const inPod = isEscapePod(world, ship);
    if (inPod) {
      const canBoard = pilot != null && boardableShips(world, pilot.id).length > 0;
      setText(this.shipLine, canBoard ? 'ESCAPE POD · BOARD YOUR SHIP [B]' : 'ESCAPE POD · DOCK AT A STATION');
    } else {
      setText(this.shipLine, shipName(world, ship).toUpperCase());
    }
    this.shipLine.classList.toggle('pod', inPod);
    const secure = Object.values(world.stations).find((s) => distance(ship.position, s.position) < s.securityRadius);
    setText(this.zoneLine, secure ? `${secure.name.toUpperCase()} SECURITY` : 'OPEN SPACE');
    setText(this.walletLine, `CR ${(pilot?.credits ?? 0).toLocaleString('en-GB')} · CARGO ${cargoUsed(ship)}/${holdCapacity(stats)}`);
    const dark = ship.dark === true;
    setText(this.coloursChip, dark ? 'DARK' : 'COLOURS');
    this.coloursChip.classList.toggle('dark', dark);
    const tip = dark ? 'Running dark: others see a radar contact until they lock you. Click or K to show colours' : 'Showing colours: others see your name and hull. Click or K to run dark';
    if (this.coloursChip.title !== tip) this.coloursChip.title = tip;

    // Above the dial: what you can do now.
    const near = ship.state === 'flying' ? nearestDockableStation(ship, world.stations) : null;
    const actions = [near ? `DOCK ${near.name.toUpperCase()} [F]` : '', pilot && !inPod ? boardPrompt(world, pilot.id, ship) : ''];
    setText(this.prompt, ship.state === 'flying' ? actions.filter(Boolean).join('   ·   ') : '');

    if (ship.state !== 'flying') return;

    // Dial.
    const shieldF = fraction(ship.shield, stats.shield);
    const hullF = fraction(ship.structure, stats.structure);
    setAttr(this.shieldArc, 'd', arcPath(MID, MID, SHIELD_R, shieldF, RING_START, RING_SWEEP));
    const capF = fraction(ship.capacitor, stats.capacitor);
    setAttr(this.capArc, 'd', arcPath(MID, MID, CAP_R, capF, RING_START, RING_SWEEP));
    this.capArc.classList.toggle('low', capF < 0.2);
    setAttr(this.hullArc, 'd', arcPath(MID, MID, HULL_R, hullF, RING_START, RING_SWEEP));
    const hullState = hullF < HULL_ALARM ? 'ring hull alarm' : hullF < HULL_CAUTION ? 'ring hull caution' : 'ring hull';
    setAttr(this.hullArc, 'class', hullState);
    // Speed and frame come from the nav computer; without one there is no speed reading.
    setText(this.speed, nav ? nav.speed.toFixed(0) : NONE);
    setText(this.speedUnit, nav ? 'u/s' : 'NO NAV');
    setText(this.frameLine, nav ? frameWords(world, nav) : 'NO NAV COMPUTER');
    setText(this.shieldLabel, `SHD ${Math.ceil(ship.shield)}`);
    setText(this.hullLabel, `HUL ${Math.ceil(ship.structure)}`);

    setText(this.modeChip, `${FLIGHT_MODE_LABELS[ship.flightMode].toUpperCase()} · Z`);
    setText(this.weaponsChip, ship.weaponsHot ? 'WEAPONS HOT · H' : 'WEAPONS COLD · H');
    this.weaponsChip.classList.toggle('hot', ship.weaponsHot);
    show(this.headingChip, this.headingLock !== null);
    setText(this.headingChip, this.headingLock ? 'HEADING LOCKED · V' : 'HEADING FREE · V');
    this.headingChip.classList.toggle('hot', this.headingLock === true);

    this.updateWeapons(world, ship);
    this.updateSlots(world, ship);
  }

  /**
   * The activation tiles (sim `activationSlots`): number, what it is, and
   * its state: the selected fire group, a tractor on or off, a
   * dispenser's charges. The afterburner shows as SHIFT, lit while burning.
   */
  private updateSlots(world: World, ship: Ship): void {
    const slots = activationSlots(world, ship).slice(0, ACTIVATION_KEYS);
    const key = slots.map((s) => (s.kind === 'group' ? `g${s.group}` : `${s.mountId}:${s.moduleId}`)).join('|');
    if (key !== this.slotKey) {
      this.slotKey = key;
      this.slots.replaceChildren();
      this.slotTiles = slots.map((s, i) => {
        const root = el('div', 'hud-slot');
        const label = el('span', 'hud-slot-label', s.kind === 'group' ? `G${s.group}` : SLOT_NAMES[s.moduleKind] ?? s.moduleKind.toUpperCase());
        const state = el('span', 'hud-slot-state', '');
        root.append(el('span', 'hud-slot-key', String(i + 1)), label, state);
        this.slots.append(root);
        return { root, label, state };
      });
      this.slots.append(this.burner);
    }
    slots.forEach((s, i) => {
      const tile = this.slotTiles[i]!;
      if (s.kind === 'group') {
        const selected = ship.fireGroup === s.group;
        setText(tile.state, selected ? 'FIRE' : '');
        tile.root.classList.toggle('active', selected);
      } else if (s.moduleKind === 'tractor') {
        // A tractor with nowhere to put things pulls nothing.
        const full = cargoUsed(ship) >= holdCapacity(shipStats(world, ship));
        // On, it takes only your own loot (MINE) or everything in reach (ALL).
        const on = isSwitchedOn(ship, s.mountId);
        const mode = ship.tractorMode === 'all' ? 'ALL' : 'MINE';
        setText(tile.state, on || ship.tractorActive ? (full ? `${mode} · FULL` : mode) : 'OFF');
        tile.root.classList.toggle('active', ship.tractorActive);
        tile.root.classList.toggle('danger', on && ship.tractorMode === 'all');
      } else if (s.moduleKind === 'weapon') {
        // A mining turret: the rock it was given, and whether it is cutting.
        const state = ship.weapons.find((w) => w.mountId === s.mountId);
        const beam = ship.beams?.find((b) => b.mountId === s.mountId);
        const rock = state?.lockTarget ?? null;
        setText(tile.state, !rock ? 'NO ROCK' : beam ? (beam.cutting ? (beam.onSeam ? 'ON SEAM' : 'CUTTING') : 'TOO HARD') : 'OUT OF REACH');
        tile.root.classList.toggle('active', Boolean(beam?.cutting));
      } else if (s.moduleKind === 'oreHopper') {
        // The hopper's sorting: a small one names the ore it drops; a bigger one says whether its list is on.
        const drop = hopperRejects(ship);
        const grade = shipStats(world, ship).hopperGrade;
        const text = drop.length === 0 ? 'TAKE ALL' : grade <= 1 ? `DROP ${(world.goods[drop[0]!]?.name ?? drop[0]!).toUpperCase()}` : `SORTING · ${drop.length} OUT`;
        setText(tile.state, text);
        tile.root.classList.toggle('active', drop.length > 0);
      } else if (s.moduleKind === 'breachCharger') {
        // What a press does now: plant, set off, or why neither.
        const left = ship.hold['breach-charge'] ?? 0;
        const rockFor = (id: string) => {
          const r = rockAt(world, id);
          return r ? { position: r.position, radius: r.rock.radius } : null;
        };
        const action = breachAction(world, ship, rockFor, '');
        const armed = (world.charges ?? []).filter((c) => c.shipId === ship.id).length;
        setText(tile.state, action.kind === 'plant' ? `PLANT · ${left}` : action.kind === 'detonate' ? `DETONATE ${armed}` : (CHARGE_STATES[action.reason] ?? '') + (armed > 0 ? '' : ` · ${left}`));
        tile.root.classList.toggle('active', action.kind !== 'refuse');
        tile.root.classList.toggle('danger', action.kind === 'detonate');
      } else if (s.moduleKind === 'surveyScanner') {
        // Ready, or seconds until the scanner has cycled.
        const since = ship.survey ? (world.tick - ship.survey.tick) * world.dt : Infinity;
        const wait = Math.ceil(SURVEY_CYCLE_SECONDS - since);
        setText(tile.state, wait > 0 ? `${wait}s` : 'READY');
        tile.root.classList.toggle('active', since < 1);
      } else {
        const charges = ship.weapons.find((w) => w.mountId === s.mountId)?.loaded ?? 0;
        setText(tile.state, String(charges));
        tile.root.classList.toggle('active', false);
      }
    });
    const stats = shipStats(world, ship);
    show(this.burner, stats.afterburnerSpeed > 0);
    setText(this.burner, ship.afterburning ? 'SHIFT · BURN' : 'SHIFT · AB');
    this.burner.classList.toggle('active', ship.afterburning === true);
  }

  /** One tile per weapon mount, rebuilt only when the fit changes. */
  private updateWeapons(world: World, ship: Ship): void {
    const stats = shipStats(world, ship);
    const specs = stats.weapons;
    const mounts = Object.keys(specs).sort();
    const key = mounts.map((m) => `${m}:${specs[m]!.id}`).join('|');
    if (key !== this.weaponKey) {
      this.weaponKey = key;
      this.weapons.replaceChildren();
      this.weaponTiles = new Map();
      for (const mountId of mounts) {
        const tile = weaponTile(specs[mountId]!.kind, specs[mountId]!.family, specs[mountId]!.name, specs[mountId]!.id);
        this.weaponTiles.set(mountId, tile);
        this.weapons.append(tile.root);
      }
    }
    // Turrets fire only at a complete active lock.
    const active = ship.locks.find((l) => l.targetId === ship.activeLock);
    const engaging = ship.weaponsHot && active !== undefined && active.progress >= 1;
    for (const [mountId, tile] of this.weaponTiles) {
      const spec = specs[mountId]!;
      const state = ship.weapons.find((w) => w.mountId === mountId);
      const progress = state ? reloadProgress(state.cooldownTicks, spec.fireInterval, world.dt) : 1;
      setAttr(tile.reload, 'd', progress < 1 ? arcPath(14, 14, 12, progress, -90, 360) : '');
      // Stopgap (lead, 6e): what the weapon runs on. Rounds loaded and
      // boxes in the hold that fit it; for launchers and dispensers, which
      // munition or charge is loaded. The fire group for fixed guns.
      if (spec.ammo && state) {
        const boxes = goodsFitting(world.goods, spec.ammo).reduce((n, g) => n + (ship.hold[g.id] ?? 0), 0);
        const good = loadedGoodOf(state, spec, world.goods);
        const what = !isGun(spec) && good ? ` ${shortGoodName(world.goods[good]?.name ?? good)}` : '';
        // Name the ammunition a gun needs, so an empty one says what to buy.
        const kind = isGun(spec) ? ` ${AMMO_SHORT[spec.ammo] ?? spec.ammo.toUpperCase()}` : '';
        setText(tile.ammo, state.reloadTicks > 0 ? 'RELOADING' : `${state.loaded}${what} · ${boxes} BOX${kind}`);
        tile.ammo.classList.toggle('low', state.loaded === 0 && boxes === 0);
      } else {
        setText(tile.ammo, spec.capacitorPerShot > 0 ? 'CAP' : '');
      }
      if (spec.family === 'countermeasure') {
        setText(tile.state, 'C');
        tile.root.classList.toggle('active', false);
      } else if (spec.kind === 'turret' && spec.family === 'mining') {
        // A mining turret: what it is doing with the rock it was given.
        const beam = ship.beams?.find((b) => b.mountId === mountId);
        setText(tile.state, !state?.lockTarget ? 'NO ROCK' : beam ? (beam.cutting ? (beam.onSeam ? 'ON SEAM' : 'CUTTING') : 'TOO HARD') : 'OUT OF REACH');
        tile.root.classList.toggle('active', Boolean(beam?.cutting));
      } else if (isMainGun(spec)) {
        // A main gun turret: its group, and whether it bears on its lock
        // (docs/turrets.md). With no lock it fires straight ahead.
        const inGroup = state?.group === ship.fireGroup;
        const bearing = gunBearing(world, ship, stats, mountId);
        setText(tile.state, `${inGroup ? 'SPACE · ' : ''}G${state?.group ?? 1} · ${BEARING_WORDS[bearing]}`);
        tile.root.classList.toggle('active', inGroup);
        tile.root.classList.toggle('bears', bearing === 'bears');
      } else if (spec.kind === 'turret') {
        // CIWS shoot down munitions coming for you whether hot or cold.
        const defending = incomingMunitions(world.munitions, ship.id).length > 0;
        setText(tile.state, defending ? 'DEFENDING' : engaging ? 'ENGAGING' : ship.weaponsHot ? 'AUTO' : 'PD');
        tile.root.classList.toggle('active', engaging || defending);
      } else {
        const inGroup = state?.group === ship.fireGroup;
        // A mining laser says whether it is cutting what it touches.
        const beam = spec.family === 'mining' ? ship.beams?.find((b) => b.mountId === mountId) : undefined;
        const beamText = beam ? (beam.rockId === null ? 'NO ROCK' : beam.cutting ? (beam.onSeam ? 'ON SEAM' : 'CUTTING') : 'TOO HARD') : null;
        setText(tile.state, beamText ?? (inGroup ? `SPACE · G${state?.group ?? 1}` : `G${state?.group ?? 1}`));
        tile.root.classList.toggle('active', inGroup);
      }
    }
  }
}

/** How a main gun stands against its lock, in a tile's few letters. */
const BEARING_WORDS: Record<GunBearing, string> = { noLock: 'AHEAD', outOfArc: 'NO ARC', outOfRange: 'RANGE', slewing: 'SLEWING', bears: 'BEARS' };

/** The short name of an ammunition good for a tile: 'KOD Summons Breach (box of 4)' is BREACH. */
function shortGoodName(name: string): string {
  const words = name.replace(/\s*\(.*\)\s*$/, '').split(/\s+/);
  return (words[words.length - 1] ?? name).toUpperCase();
}

/** Short names for ammunition on weapon tiles. */
const AMMO_SHORT: Partial<Record<string, string>> = { rounds: 'ROUNDS', shells: 'SHELLS', charges: 'CHARGES' };

/** The gun type from its weapon id ('railgun-m' is RAILGUN), for the tile. */
function gunName(weaponId: string): string {
  return weaponId.replace(/-[sml]$/, '').replace(/-/g, ' ').toUpperCase();
}

/** Short names for module tiles. */
/** Why a charge rig's tile will not plant or set off, shortest first. */
const CHARGE_STATES: Partial<Record<string, string>> = { noCharges: 'NO CHARGES', noRock: 'NO ROCK', tooFar: 'GET CLOSER', tooClose: 'TOO CLOSE', tooSmall: 'TOO SMALL' };

const SLOT_NAMES: Partial<Record<string, string>> = { breachCharger: 'CHARGES', tractor: 'TRACTOR', countermeasure: 'CHAFF / FLARE', surveyScanner: 'SURVEY', oreHopper: 'HOPPER', weapon: 'TURRET' };

/** A weapon tile: icon with a reload ring, its kind, and how it fires. */
function weaponTile(kind: 'fixed' | 'turret', family: WeaponFamily, name: string, weaponId: string): WeaponTile {
  const root = el('div', `hud-weapon ${kind}`);
  root.title = name;
  const icon = svg('svg', { width: 28, height: 28, viewBox: '0 0 28 28', 'aria-hidden': 'true' });
  if (kind === 'fixed') {
    icon.append(svg('path', { d: 'M14 6 V20 M10 11 L14 6 L18 11 M9 23 H19', class: 'icon' }));
  } else {
    icon.append(svg('circle', { cx: 14, cy: 16, r: 6, class: 'icon' }), svg('path', { d: 'M14 16 L21 7', class: 'icon' }));
  }
  const reload = svg('path', { class: 'reload' });
  icon.append(reload);
  const label = el('span', 'hud-weapon-kind', family === 'missile' ? 'LAUNCHER' : family === 'countermeasure' ? 'DISPENSER' : family === 'mining' && kind === 'turret' ? 'MINING TURRET' : family === 'pointDefence' ? 'SWIVEL' : gunName(weaponId));
  const state = el('span', 'hud-weapon-key', family === 'countermeasure' ? 'C' : family === 'mining' && kind === 'turret' ? 'NO ROCK' : family === 'pointDefence' ? 'PD' : 'SPACE');
  const ammo = el('span', 'hud-weapon-ammo', '');
  root.append(icon, label, state, ammo);
  return { root, reload, state, ammo };
}
