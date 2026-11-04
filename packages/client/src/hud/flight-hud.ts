import type { NavReadout, Ship, WeaponFamily, World } from '@spacegame/sim';
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
  isGun,
  loadedGoodOf,
  nearestDockableStation,
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
  private readonly walletLine = el('div', 'hud-dim');
  private readonly alert = el('div', 'hud-alert caution hidden');
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
      // The capacitor (6e): the inner ring fills with the pool.
      svg('circle', { cx: MID, cy: MID, r: CAP_R, class: 'ring capacitor' }),
      this.capArc,
      this.speed,
      this.speedUnit,
      this.shieldLabel,
      this.hullLabel,
    );

    const chips = el('div', 'hud-chips');
    chips.append(this.modeChip, this.weaponsChip);
    const centre = el('div', 'hud-dial-column');
    centre.append(dial, this.frameLine, chips);
    const kit = el('div', 'hud-kit');
    kit.append(this.slots, this.weapons);
    this.cluster.append(centre, kit);

    this.root.append(this.status, this.alert, this.prompt, this.cluster, this.debug);
    parent.append(this.root);
  }

  /**
   * Refresh. `ship` is null while the pilot has no ship. `nav` is the
   * ship's `navReadout` (null without a nav computer): speed and frame
   * are shown only through it, never worked out here.
   */
  update(world: World, ship: Ship | null, nav: NavReadout | null, fps: number): void {
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
        setText(tile.state, ship.tractorActive ? 'ON' : 'OFF');
        tile.root.classList.toggle('active', ship.tractorActive);
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
    const specs = shipStats(world, ship).weapons;
    const mounts = Object.keys(specs).sort();
    const key = mounts.map((m) => `${m}:${specs[m]!.id}`).join('|');
    if (key !== this.weaponKey) {
      this.weaponKey = key;
      this.weapons.replaceChildren();
      this.weaponTiles = new Map();
      for (const mountId of mounts) {
        const tile = weaponTile(specs[mountId]!.kind, specs[mountId]!.family, specs[mountId]!.name);
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
        setText(tile.ammo, state.reloadTicks > 0 ? 'RELOADING' : `${state.loaded}${what} · ${boxes} BOX`);
        tile.ammo.classList.toggle('low', state.loaded === 0 && boxes === 0);
      } else {
        setText(tile.ammo, spec.capacitorPerShot > 0 ? 'CAP' : '');
      }
      if (spec.family === 'countermeasure') {
        setText(tile.state, 'C');
        tile.root.classList.toggle('active', false);
      } else if (spec.kind === 'turret') {
        // Swivels shoot down munitions coming for you whether hot or cold.
        const defending = incomingMunitions(world.munitions, ship.id).length > 0;
        setText(tile.state, defending ? 'DEFENDING' : engaging ? 'ENGAGING' : ship.weaponsHot ? 'AUTO' : 'PD');
        tile.root.classList.toggle('active', engaging || defending);
      } else {
        const inGroup = state?.group === ship.fireGroup;
        setText(tile.state, inGroup ? `SPACE · G${state?.group ?? 1}` : `G${state?.group ?? 1}`);
        tile.root.classList.toggle('active', inGroup);
      }
    }
  }
}

/** The short name of an ammunition good for a tile: 'KOD Summons Breach (box of 4)' is BREACH. */
function shortGoodName(name: string): string {
  const words = name.replace(/\s*\(.*\)\s*$/, '').split(/\s+/);
  return (words[words.length - 1] ?? name).toUpperCase();
}

/** Short names for module tiles. */
const SLOT_NAMES: Partial<Record<string, string>> = { tractor: 'TRACTOR', countermeasure: 'CHAFF / FLARE' };

/** A weapon tile: icon with a reload ring, its kind, and how it fires. */
function weaponTile(kind: 'fixed' | 'turret', family: WeaponFamily, name: string): WeaponTile {
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
  const label = el('span', 'hud-weapon-kind', family === 'missile' ? 'LAUNCHER' : family === 'countermeasure' ? 'DISPENSER' : kind === 'fixed' ? 'FIXED' : 'SWIVEL');
  const state = el('span', 'hud-weapon-key', family === 'countermeasure' ? 'C' : kind === 'fixed' ? 'SPACE' : 'PD');
  const ammo = el('span', 'hud-weapon-ammo', '');
  root.append(icon, label, state, ammo);
  return { root, reload, state, ammo };
}
