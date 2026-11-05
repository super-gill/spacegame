import type { Ship, World } from '@spacegame/sim';
import { activationSlots, holdSpaceFor, holdUse, hopperRejects, isSwitchedOn, oreGoods, shipStats, storedGoods } from '@spacegame/sim';
import { el, setText } from './dom.js';
import type { HudWindow } from './windows.js';

/** What the hold panel asks for. Hold changes in flight go through ship inputs; storage is a pilot command. */
export interface HoldActions {
  jettison(good: string): void;
  setHopper(drop: string[]): void;
  pressTile(mountId: string): void;
  dropCache(): void;
  store(good: string, quantity: number): void;
  take(good: string, quantity: number): void;
}

/**
 * Stopgap (lead): the hold panel (I), a window (windows.ts). What is
 * aboard, split into the ore hold and cargo, with a JETTISON per stack in
 * space or STORE per stack when docked; the station's storage when
 * docked, with TAKE; the ore hopper's sorting (one ore on a small hopper,
 * KEEP or DROP per ore on bigger ones); and the tractor's mode and the
 * cache drop. Rows are rebuilt only when what is listed changes, and
 * numbers are updated in place, so a click is never lost to a rebuild.
 */
export class HoldPanel {
  private readonly root = el('div', 'hud-hold');
  private structure = '';
  /** Number cells to update in place, by key. */
  private cells = new Map<string, HTMLElement>();

  constructor(
    private readonly window: HudWindow,
    private readonly actions: HoldActions,
  ) {
    window.body.append(this.root);
  }

  toggle(): void {
    this.window.toggle();
  }

  update(world: World, ship: Ship | null, pilotId: string): void {
    if (!this.window.opened) return;
    if (!ship) {
      this.rebuild('none', () => [el('p', 'hud-dim', 'No ship.')]);
      return;
    }
    const stats = shipStats(world, ship);
    const use = holdUse(ship, stats, world.goods);
    const docked = ship.state === 'docked' && ship.dockedAt !== null;
    const stationId = docked ? ship.dockedAt! : '';
    const pilot = world.pilots[pilotId];
    // Goods in this station's storage (unfitted modules are listed in outfitting).
    const hangar = docked ? Object.entries(pilot?.storage?.[stationId] ?? {}).filter(([g, n]) => n > 0 && world.goods[g]) : [];
    const aboard = Object.entries(ship.hold).filter(([, n]) => n > 0);
    const isOre = (g: string): boolean => Boolean(world.goods[g]?.ore);
    const oreRows = use.ore.capacity > 0 ? aboard.filter(([g]) => isOre(g)) : [];
    const cargoRows = use.ore.capacity > 0 ? aboard.filter(([g]) => !isOre(g)) : aboard;
    const tractor = activationSlots(world, ship).find((s) => s.kind === 'module' && s.moduleKind === 'tractor');
    const drop = hopperRejects(ship);
    const listed = ship.hopper?.drop ?? [];

    const key = JSON.stringify([
      docked,
      stationId,
      use.ore.capacity,
      oreRows.map(([g]) => g),
      cargoRows.map(([g]) => g),
      hangar.map(([g]) => g),
      stats.hopperGrade,
      listed,
      ship.hopper?.off ?? false,
      tractor ? [tractor.kind === 'module' ? tractor.mountId : '', isSwitchedOn(ship, tractor.kind === 'module' ? tractor.mountId : ''), ship.tractorMode ?? 'mine'] : null,
    ]);
    this.rebuild(key, () => {
      const parts: HTMLElement[] = [];
      const name = (g: string): string => world.goods[g]?.name ?? g;
      const stackRow = (g: string, where: 'hold' | 'hangar'): HTMLElement => {
        const row = el('div', 'hud-hold-row');
        const count = el('span', 'hud-hold-count');
        this.cells.set(`${where}:${g}`, count);
        const label = el('span', 'hud-hold-name', name(g));
        const act = el('span', 'hud-hold-actions');
        if (where === 'hold' && docked) act.append(this.button('STORE', `Store all your ${name(g)} at this station`, () => this.actions.store(g, ship.hold[g] ?? 0)));
        if (where === 'hold' && !docked) act.append(this.button('JETTISON', `Throw all your ${name(g)} out astern. Anyone can take it`, () => this.actions.jettison(g)));
        if (where === 'hangar') act.append(this.button('TAKE', `Load as much ${name(g)} as fits`, () => this.take(world, g, pilotId)));
        row.append(label, count, act);
        return row;
      };
      const section = (title: string, cellKey: string, rows: HTMLElement[], empty: string): HTMLElement => {
        const box = el('div', 'hud-hold-section');
        const head = el('div', 'hud-hold-head');
        const used = el('span', 'hud-dim');
        this.cells.set(cellKey, used);
        head.append(el('span', 'hud-hold-title', title), used);
        box.append(head, ...(rows.length > 0 ? rows : [el('p', 'hud-dim', empty)]));
        return box;
      };
      if (use.ore.capacity > 0) parts.push(section('ORE HOLD', 'ore', oreRows.map(([g]) => stackRow(g, 'hold')), 'Empty. Ore goes here, and only here.'));
      parts.push(section('CARGO', 'cargo', cargoRows.map(([g]) => stackRow(g, 'hold')), 'Empty.'));
      if (docked) parts.push(section('STATION STORAGE', 'hangar', hangar.map(([g]) => stackRow(g, 'hangar')), 'Nothing stored here.'));

      // The hopper's sorting.
      if (stats.hopperGrade > 0) {
        const box = el('div', 'hud-hold-section');
        const head = el('div', 'hud-hold-head');
        const status = drop.length === 0 ? 'TAKING ALL' : 'SORTING';
        head.append(el('span', 'hud-hold-title', `HOPPER ${['', 'S', 'M', 'L'][stats.hopperGrade] ?? ''}`), el('span', 'hud-dim', status));
        box.append(head);
        const ores = oreGoods(world.goods).map((g) => g.id);
        if (stats.hopperGrade <= 1) {
          // One ore dropped, or none.
          const row = el('div', 'hud-hold-choices');
          row.append(this.choice('TAKE ALL', drop.length === 0, () => this.actions.setHopper([])));
          for (const g of ores) row.append(this.choice(`DROP ${name(g).toUpperCase()}`, drop[0] === g, () => this.actions.setHopper([g])));
          box.append(row);
        } else {
          for (const g of ores) {
            const row = el('div', 'hud-hold-row');
            const dropped = listed.includes(g);
            const toggle = this.choice(dropped ? 'DROP' : 'KEEP', !dropped, () => this.actions.setHopper(dropped ? listed.filter((x) => x !== g) : [...listed, g]));
            toggle.title = dropped ? `Keep ${name(g)}` : `Spit ${name(g)} out astern`;
            row.append(el('span', 'hud-hold-name', name(g)), el('span', 'hud-hold-count'), toggle);
            box.append(row);
          }
          const tile = activationSlots(world, ship).find((s) => s.kind === 'module' && s.moduleKind === 'oreHopper');
          const foot = el('div', 'hud-hold-choices');
          if (tile && tile.kind === 'module') foot.append(this.choice(ship.hopper?.off || listed.length === 0 ? 'SORTING OFF' : 'SORTING ON', drop.length > 0, () => this.actions.pressTile(tile.mountId)));
          foot.append(this.button('KEEP ALL', 'Clear the list: keep every ore', () => this.actions.setHopper([])));
          box.append(foot);
          if (stats.hopperGrade >= 3) box.append(el('p', 'hud-dim', 'With the ore hold full, better ore coming in pushes out your cheapest.'));
        }
        parts.push(box);
      }

      // The tractor and the cache.
      if (tractor && tractor.kind === 'module' && !docked) {
        const box = el('div', 'hud-hold-section');
        const on = isSwitchedOn(ship, tractor.mountId);
        const mode = !on ? 'OFF' : ship.tractorMode === 'all' ? 'ALL' : 'MINE';
        const head = el('div', 'hud-hold-head');
        head.append(el('span', 'hud-hold-title', 'TRACTOR'), el('span', 'hud-dim', mode === 'ALL' ? "ALL: other people's too" : mode === 'MINE' ? 'MINE: yours and nobody\'s' : 'OFF'));
        const row = el('div', 'hud-hold-choices');
        row.append(this.button('CYCLE', 'Off, then your own loot only, then everything, then off (its tile does the same)', () => this.actions.pressTile(tractor.mountId)));
        if (!docked) row.append(this.button('DROP CACHE · J', 'Leave your ore here as a cache that lasts an hour', () => this.actions.dropCache()));
        box.append(head, row);
        parts.push(box);
      }
      return parts;
    });

    // Numbers, in place.
    this.cell('ore', `${use.ore.used} / ${use.ore.capacity}`);
    this.cell('cargo', `${use.cargo.used} / ${use.cargo.capacity}`);
    this.cell('hangar', docked ? (world.stations[stationId]?.name ?? '').toUpperCase() : '');
    for (const [g, n] of aboard) this.cell(`hold:${g}`, String(n));
    for (const [g, n] of hangar) this.cell(`hangar:${g}`, String(n));
  }

  private take(world: World, good: string, pilotId: string): void {
    const pilot = world.pilots[pilotId];
    const ship = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
    if (!pilot || !ship?.dockedAt) return;
    const room = holdSpaceFor(ship, shipStats(world, ship), world.goods, good);
    const n = Math.min(room, storedGoods(pilot, ship.dockedAt, good));
    this.actions.take(good, Math.max(1, n));
  }

  private rebuild(key: string, build: () => HTMLElement[]): void {
    if (key === this.structure) return;
    this.structure = key;
    this.cells = new Map();
    this.root.replaceChildren(...build());
  }

  private cell(key: string, text: string): void {
    const node = this.cells.get(key);
    if (node) setText(node, text);
  }

  private button(label: string, title: string, onClick: () => void): HTMLButtonElement {
    const b = el('button', 'hud-hold-button', label) as HTMLButtonElement;
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  private choice(label: string, on: boolean, onClick: () => void): HTMLButtonElement {
    const b = this.button(label, label, onClick);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    return b;
  }
}
