import type { Ship, World } from '@spacegame/sim';
import {
  FLIGHT_MODE_LABELS,
  boardableShips,
  cargoUsed,
  distance,
  isEscapePod,
  localFrame,
  nearestDockableStation,
  relativeVelocity,
  shipPilot,
  shipStats,
} from '@spacegame/sim';
import { boardPrompt, shipName } from '../ui.js';
import { el, setAttr, setText, show, svg } from './dom.js';
import { arcPath, fraction, reloadProgress } from './geometry.js';

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

interface WeaponTile {
  root: HTMLDivElement;
  reload: SVGPathElement;
  state: HTMLSpanElement;
}

export class FlightHud {
  private readonly root = el('div', 'flight-hud');
  private readonly status = el('div', 'hud-status');
  private readonly shipLine = el('div', 'hud-ship');
  private readonly zoneLine = el('div', 'hud-dim');
  private readonly walletLine = el('div', 'hud-dim');
  private readonly alert = el('div', 'hud-alert caution hidden');
  private readonly cluster = el('div', 'hud-cluster');
  private readonly prompt = el('div', 'hud-prompt');
  private readonly shieldArc = svg('path', { class: 'ring shield' });
  private readonly hullArc = svg('path', { class: 'ring hull' });
  private readonly speed = svg('text', { x: MID, y: MID + 8, class: 'dial-speed', 'text-anchor': 'middle' });
  private readonly speedUnit = svg('text', { x: MID, y: MID + 26, class: 'dial-unit', 'text-anchor': 'middle' });
  private readonly shieldLabel = svg('text', { x: 40, y: DIAL - 10, class: 'dial-label shield', 'text-anchor': 'middle' });
  private readonly hullLabel = svg('text', { x: DIAL - 40, y: DIAL - 10, class: 'dial-label hull', 'text-anchor': 'middle' });
  private readonly frameLine = el('div', 'hud-frame');
  private readonly modeChip = el('span', 'hud-chip');
  private readonly weaponsChip = el('span', 'hud-chip');
  private readonly weapons = el('div', 'hud-weapons');
  private readonly debug = el('div', 'hud-debug');
  private weaponTiles = new Map<string, WeaponTile>();
  private weaponKey = '';

  constructor(parent: HTMLElement) {
    this.status.append(this.shipLine, this.zoneLine, this.walletLine);

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
      // Reserved for the capacitor (milestone 6e): drawn empty so the
      // dial keeps its shape when it arrives.
      svg('circle', { cx: MID, cy: MID, r: CAP_R, class: 'ring capacitor' }),
      this.speed,
      this.speedUnit,
      this.shieldLabel,
      this.hullLabel,
    );
    setText(this.speedUnit, 'u/s');

    const chips = el('div', 'hud-chips');
    chips.append(this.modeChip, this.weaponsChip);
    const centre = el('div', 'hud-dial-column');
    centre.append(dial, this.frameLine, chips);
    this.cluster.append(centre, this.weapons);

    this.root.append(this.status, this.alert, this.prompt, this.cluster, this.debug);
    parent.append(this.root);
  }

  /** Refresh. `ship` is null while the pilot has no ship. */
  update(world: World, ship: Ship | null, fps: number): void {
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
    setAttr(this.hullArc, 'd', arcPath(MID, MID, HULL_R, hullF, RING_START, RING_SWEEP));
    const hullState = hullF < HULL_ALARM ? 'ring hull alarm' : hullF < HULL_CAUTION ? 'ring hull caution' : 'ring hull';
    setAttr(this.hullArc, 'class', hullState);
    // Speed against the local frame: the station in dock range, else the body whose sphere you are in.
    const rel = relativeVelocity(world, ship);
    setText(this.speed, Math.hypot(rel.x, rel.y).toFixed(0));
    const frame = localFrame(world, ship);
    const frameName = frame.kind === 'station' ? world.stations[frame.id]?.name : frame.kind === 'body' ? world.bodies[frame.id]?.name : undefined;
    setText(this.frameLine, frameName ? `REL ${frameName.toUpperCase()}` : 'REL SYSTEM');
    setText(this.shieldLabel, `SHD ${Math.ceil(ship.shield)}`);
    setText(this.hullLabel, `HUL ${Math.ceil(ship.structure)}`);

    setText(this.modeChip, `${FLIGHT_MODE_LABELS[ship.flightMode].toUpperCase()} · Z`);
    setText(this.weaponsChip, ship.weaponsHot ? 'WEAPONS HOT · H' : 'WEAPONS COLD · H');
    this.weaponsChip.classList.toggle('hot', ship.weaponsHot);

    this.updateWeapons(world, ship);
  }

  /** One tile per weapon mount, rebuilt only when the fit changes. */
  private updateWeapons(world: World, ship: Ship): void {
    const specs = shipStats(world, ship).weapons;
    const mounts = Object.keys(specs).sort();
    const key = mounts.map((m) => `${m}:${specs[m]!.id}`).join('|');
    if (key !== this.weaponKey) {
      this.weaponKey = key;
      this.weapons.replaceChildren();
      this.weaponTiles = new Map();
      for (const mountId of mounts) {
        const tile = weaponTile(specs[mountId]!.kind, specs[mountId]!.name);
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
      if (spec.kind === 'turret') {
        setText(tile.state, engaging ? 'ENGAGING' : ship.weaponsHot ? 'AUTO' : 'COLD');
        tile.root.classList.toggle('active', engaging);
      }
    }
  }
}

/** A weapon tile: icon with a reload ring, its kind, and how it fires. */
function weaponTile(kind: 'fixed' | 'turret', name: string): WeaponTile {
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
  const label = el('span', 'hud-weapon-kind', kind === 'fixed' ? 'FIXED' : 'TURRET');
  const state = el('span', 'hud-weapon-key', kind === 'fixed' ? 'SPACE' : 'COLD');
  root.append(icon, label, state);
  return { root, reload, state };
}
