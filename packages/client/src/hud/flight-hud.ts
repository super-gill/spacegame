import type { NavReadout, Ship, WeaponSpec, World } from '@spacegame/sim';
import {
  FLIGHT_MODE_LABELS,
  boardableShips,
  cargoUsed,
  distance,
  isEscapePod,
  nearestDockableStation,
  shipPilot,
  shipStats,
} from '@spacegame/sim';
import { boardPrompt, shipName } from '../ui.js';
import { el, setAttr, setText, show, svg } from './dom.js';
import { arcPath, fraction, reloadProgress } from './geometry.js';
import { arcCovers, capacitorTone, gunSupply, gunWord, litSegments } from './weapon-readout.js';

/**
 * The flight HUD: the always-on instruments at the screen edges.
 *
 * - Top left: which ship you are in, the zone, credits and cargo, and the
 *   nav target with its distance and arrival time (from the nav computer).
 * - Bottom centre: the status dial (shield and hull rings, the
 *   capacitor as a segmented inner ring, and your speed against your
 *   local frame), the frame named under it, the flight mode, weapons and
 *   fire group, and a tile per weapon. Only modules you use in flight get
 *   a place here; the rest belong in the ship status window.
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
/** The capacitor ring is cut into segments, EVE style, so a shot's cost is visible as a step. */
const CAP_SEGMENTS = 20;
const CAP_GAP_DEG = 3;

/** Hull below these fractions turns to the caution, then the alarm colour. */
const HULL_CAUTION = 0.5;
const HULL_ALARM = 0.25;

const NONE = '-';

/** The frame speed is measured against, in words: `REL HARBOUR STATION`, `REL FIELDMARK`, `REL SYSTEM`. */
function frameWords(world: World, nav: NavReadout): string {
  const f = nav.frame;
  const name = f.kind === 'station' ? world.stations[f.id]?.name : f.kind === 'body' ? world.bodies[f.id]?.name : undefined;
  return name ? `REL ${name.toUpperCase()}` : 'REL SYSTEM';
}

interface WeaponTile {
  root: HTMLDivElement;
  /** Cooldown between shots, round the icon. */
  reload: SVGPathElement;
  group: HTMLSpanElement;
  state: HTMLSpanElement;
  /** What the gun runs on: magazine or capacitor as a bar, with words. Absent for a gun that spends nothing. */
  supply: HTMLSpanElement | null;
  supplyBar: HTMLSpanElement;
  supplyText: HTMLSpanElement;
}

export class FlightHud {
  private readonly root = el('div', 'flight-hud');
  private readonly status = el('div', 'hud-status');
  private readonly shipLine = el('div', 'hud-ship');
  private readonly zoneLine = el('div', 'hud-dim');
  private readonly walletLine = el('div', 'hud-dim');
  private readonly navLine = el('div', 'hud-nav');
  private readonly alert = el('div', 'hud-alert caution hidden');
  private readonly cluster = el('div', 'hud-cluster');
  private readonly prompt = el('div', 'hud-prompt');
  private readonly shieldArc = svg('path', { class: 'ring shield' });
  private readonly capSegments: SVGPathElement[] = [];
  private readonly capLabel = svg('text', { x: MID, y: MID - 24, class: 'dial-label cap', 'text-anchor': 'middle' });
  private readonly hullArc = svg('path', { class: 'ring hull' });
  private readonly speed = svg('text', { x: MID, y: MID + 8, class: 'dial-speed', 'text-anchor': 'middle' });
  private readonly speedUnit = svg('text', { x: MID, y: MID + 26, class: 'dial-unit', 'text-anchor': 'middle' });
  private readonly shieldLabel = svg('text', { x: 40, y: DIAL - 10, class: 'dial-label shield', 'text-anchor': 'middle' });
  private readonly hullLabel = svg('text', { x: DIAL - 40, y: DIAL - 10, class: 'dial-label hull', 'text-anchor': 'middle' });
  private readonly frameLine = el('div', 'hud-frame');
  private readonly modeChip = el('span', 'hud-chip');
  private readonly weaponsChip = el('span', 'hud-chip');
  private readonly groupChip = el('span', 'hud-chip');
  private readonly weapons = el('div', 'hud-weapons');
  private readonly debug = el('div', 'hud-debug');
  private weaponTiles = new Map<string, WeaponTile>();
  private weaponKey = '';

  constructor(parent: HTMLElement) {
    this.status.append(this.shipLine, this.zoneLine, this.walletLine, this.navLine);

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
      ...this.buildCapacitor(),
      this.capLabel,
      this.speed,
      this.speedUnit,
      this.shieldLabel,
      this.hullLabel,
    );

    const chips = el('div', 'hud-chips');
    chips.append(this.modeChip, this.weaponsChip, this.groupChip);
    const centre = el('div', 'hud-dial-column');
    centre.append(dial, this.frameLine, chips);
    this.cluster.append(centre, this.weapons);

    this.root.append(this.status, this.alert, this.prompt, this.cluster, this.debug);
    parent.append(this.root);
  }

  /** The capacitor ring: CAP_SEGMENTS short arcs over the same sweep as the other rings. */
  private buildCapacitor(): SVGPathElement[] {
    const step = RING_SWEEP / CAP_SEGMENTS;
    for (let i = 0; i < CAP_SEGMENTS; i++) {
      const d = arcPath(MID, MID, CAP_R, 1, RING_START + i * step + CAP_GAP_DEG / 2, step - CAP_GAP_DEG);
      this.capSegments.push(svg('path', { class: 'ring cap-seg', d }));
    }
    return this.capSegments;
  }

  /**
   * Refresh. `ship` is null while the pilot has no ship. `nav` is the
   * ship's `navReadout` (null without a nav computer): speed and frame
   * are shown only through it, never worked out here.
   */
  update(world: World, ship: Ship | null, nav: NavReadout | null, fps: number, navTarget = ''): void {
    setText(this.debug, `${fps.toFixed(0)} fps · tick ${world.tick}`);
    show(this.status, ship !== null);
    show(this.cluster, ship !== null && ship.state === 'flying');
    if (!ship) {
      show(this.alert, false);
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
    setText(this.navLine, ship.state === 'flying' ? navTarget : '');
    setText(this.walletLine, `CR ${(pilot?.credits ?? 0).toLocaleString('en-GB')} · CARGO ${cargoUsed(ship)}/${stats.cargoCapacity}`);

    // Top centre: until warning tiers land, the one warning there is.
    const hunted = Object.values(world.npcs).some((b) => b.kind === 'pirate' && b.mode === 'hunt' && b.targetId === ship.id);
    show(this.alert, hunted);
    setText(this.alert, 'CAUTION · PIRATE HUNTING YOU');

    // Above the dial: what you can do now.
    const near = ship.state === 'flying' ? nearestDockableStation(ship, world.stations) : null;
    const actions = [near ? `DOCK ${near.name.toUpperCase()} [F]` : '', pilot && !inPod ? boardPrompt(world, pilot.id, ship) : ''];
    setText(this.prompt, ship.state === 'flying' ? actions.filter(Boolean).join('   ·   ') : '');

    if (ship.state !== 'flying') return;

    // Dial.
    const shieldF = fraction(ship.shield, stats.shield);
    const hullF = fraction(ship.structure, stats.structure);
    setAttr(this.shieldArc, 'd', arcPath(MID, MID, SHIELD_R, shieldF, RING_START, RING_SWEEP));
    // Capacitor: lit segments for the pool, amber below a quarter, red when
    // the hungriest gun can no longer pay for a shot.
    const capF = fraction(ship.capacitor, stats.capacitor);
    const hungriest = Math.max(0, ...Object.values(stats.weapons).map((w) => w.capacitorPerShot));
    const tone = capacitorTone(ship.capacitor, stats.capacitor, hungriest);
    const lit = litSegments(capF, CAP_SEGMENTS);
    this.capSegments.forEach((seg, i) => setAttr(seg, 'class', i < lit ? `ring cap-seg lit ${tone}` : 'ring cap-seg'));
    setText(this.capLabel, `CAP ${Math.round(capF * 100)}%`);
    setAttr(this.capLabel, 'class', `dial-label cap ${tone}`);
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
    // The fire group Space fires, and whether any gun is in it.
    const fixedInGroup = ship.weapons.some((w) => w.group === ship.fireGroup && stats.weapons[w.mountId]?.kind === 'fixed');
    const hasFixed = Object.values(stats.weapons).some((w) => w.kind === 'fixed');
    setText(this.groupChip, hasFixed && !fixedInGroup ? `GROUP ${ship.fireGroup} EMPTY · 1-4` : `GROUP ${ship.fireGroup} · 1-4`);
    this.groupChip.classList.toggle('caution', hasFixed && !fixedInGroup);
    show(this.groupChip, hasFixed);

    this.updateWeapons(world, ship);
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
        const tile = weaponTile(specs[mountId]!);
        this.weaponTiles.set(mountId, tile);
        this.weapons.append(tile.root);
      }
    }
    // Swivels fire only at a complete lock, and only within their mount's arc.
    const active = ship.locks.find((l) => l.targetId === ship.activeLock);
    const target = active && active.progress >= 1 ? world.ships[active.targetId] : undefined;
    const hull = world.hulls[ship.hullId];
    for (const [mountId, tile] of this.weaponTiles) {
      const spec = specs[mountId]!;
      const state = ship.weapons.find((w) => w.mountId === mountId);
      const progress = state ? reloadProgress(state.cooldownTicks, spec.fireInterval, world.dt) : 1;
      setAttr(tile.reload, 'd', progress < 1 ? arcPath(14, 14, 12, progress, -90, 360) : '');

      // What it runs on: rounds loaded and spare, or shots the capacitor can pay for.
      const boxes = spec.ammo ? (ship.hold[spec.ammo] ?? 0) : 0;
      const round = spec.ammo ? world.goods[spec.ammo] : undefined;
      const supply = gunSupply(spec, state ?? { loaded: 0, reloadTicks: 0 }, boxes, round, ship.capacitor, stats.capacitor, world.dt);
      if (tile.supply) {
        setText(tile.supplyText, supply.text);
        tile.supplyBar.style.setProperty('--fill', supply.fill.toFixed(3));
        setAttr(tile.supply, 'class', `hud-weapon-supply ${supply.tone}`);
      }
      const cannot = supply.tone === 'dry' || supply.tone === 'starved';

      const group = state?.group ?? 1;
      setText(tile.group, String(group));
      if (spec.kind === 'turret') {
        const mount = hull?.mounts.find((m) => m.id === mountId);
        const bearing = target ? Math.atan2(target.position.y - ship.position.y, target.position.x - ship.position.x) - ship.heading : 0;
        const blind = target !== undefined && mount !== undefined && !arcCovers(mount, bearing);
        const far = target !== undefined && distance(ship.position, target.position) > spec.range;
        const engaging = ship.weaponsHot && target !== undefined && !blind && !far && !cannot;
        // COLD, AUTO (hot, waiting for a lock), BLIND (lock outside its arc),
        // TOO FAR (beyond its range), ENGAGING, or HOLD (cannot pay for a shot).
        setText(tile.state, !ship.weaponsHot ? 'COLD' : !target ? 'AUTO' : blind ? 'BLIND' : far ? 'TOO FAR' : engaging ? 'ENGAGING' : 'HOLD');
        tile.root.classList.toggle('active', engaging);
        tile.root.classList.toggle('armed', false);
        tile.root.classList.toggle('blind', ship.weaponsHot && blind);
        tile.group.classList.add('hidden');
      } else {
        const inGroup = group === ship.fireGroup;
        setText(tile.state, inGroup ? 'SPACE' : `GROUP ${group}`);
        tile.root.classList.toggle('armed', inGroup);
        tile.root.classList.toggle('active', false);
      }
      tile.root.classList.toggle('cannot', cannot);
    }
  }
}

/**
 * A weapon tile: the fire group in the corner, an icon with the cooldown
 * ring, the gun type, what it runs on (a bar and words), and how it fires.
 */
function weaponTile(spec: WeaponSpec): WeaponTile {
  const kind = spec.kind;
  // Energy guns draw their bar from the capacitor, in its colour.
  const root = el('div', `hud-weapon ${kind}${!spec.ammo && spec.capacitorPerShot > 0 ? ' energy' : ''}`);
  root.title = spec.name;
  const group = el('span', 'hud-weapon-group', '1');
  const icon = svg('svg', { width: 28, height: 28, viewBox: '0 0 28 28', 'aria-hidden': 'true' });
  if (kind === 'fixed') {
    icon.append(svg('path', { d: 'M14 6 V20 M10 11 L14 6 L18 11 M9 23 H19', class: 'icon' }));
  } else {
    icon.append(svg('circle', { cx: 14, cy: 16, r: 6, class: 'icon' }), svg('path', { d: 'M14 16 L21 7', class: 'icon' }));
  }
  const reload = svg('path', { class: 'reload' });
  icon.append(reload);
  const label = el('span', 'hud-weapon-kind', gunWord(spec));
  const supply = el('span', 'hud-weapon-supply');
  const supplyBar = el('span', 'bar');
  const supplyText = el('span', 'words');
  supply.append(supplyBar, supplyText);
  const spends = spec.ammo !== null || spec.capacitorPerShot > 0;
  const state = el('span', 'hud-weapon-key', kind === 'fixed' ? 'SPACE' : 'COLD');
  root.append(group, icon, label, ...(spends ? [supply] : []), state);
  return { root, reload, group, state, supply: spends ? supply : null, supplyBar, supplyText };
}
