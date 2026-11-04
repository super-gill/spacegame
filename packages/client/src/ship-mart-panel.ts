import { buyRefusal, fitStats, isGun, occupiedPads, shipPrice, weaponDps, type BuyRefusal, type World } from '@spacegame/sim';
import { shipThumb } from './render/ship-thumb.js';

/**
 * Ship mart, shown inside the docked panel at stations that sell ships.
 *
 * One row per ship for sale: a drawing of it, its name, hull, size class
 * and role, a short read of what it does (top speed, acceleration,
 * shields, structure, cargo space, weapon damage per second, all from
 * `fitStats` on its stock fit), its price, and Buy. When the pilot cannot
 * buy it, Buy is greyed and the reason sits under it.
 *
 * The rules are the sim's: the panel asks `buyRefusal` and never decides
 * for itself. Buying is a sim command run by main.ts, which owns the
 * world; this panel only draws and reports clicks.
 *
 * Nothing here previews on hover, and every row has a fixed-height
 * reason line whether or not there is a reason, so a refusal appearing
 * or clearing never moves a button under the pointer.
 */

/** Player-facing reasons a purchase is refused. Shared with main.ts for toasts. */
export const BUY_REFUSALS: Record<BuyRefusal, string> = {
  noShip: 'You have no ship.',
  notDocked: 'Dock first.',
  noShipMart: 'This station sells no ships.',
  notSold: 'Not sold here.',
  credits: 'Not enough credits.',
  noPad: 'No free pad here fits it.',
};

const THUMB_W = 72;
const THUMB_H = 40;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const fmt = (n: number, digits = 0): string => n.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits });

export class ShipMartPanel {
  private readonly root: HTMLDivElement;
  private signature = '';

  constructor(
    container: HTMLElement,
    private readonly onBuy: (loadoutId: string) => void,
  ) {
    this.root = el('div', 'ship-mart');
    container.append(this.root);
  }

  /** Redraw if anything the ship mart shows has changed. */
  update(world: World, pilotId: string): void {
    const pilot = world.pilots[pilotId];
    const ship = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
    const station = ship?.dockedAt ? world.stations[ship.dockedAt] : undefined;
    if (!pilot || !ship || !station) return;

    const refusals = station.shipMart.map((id) => buyRefusal(world, pilotId, id));
    const signature = JSON.stringify([station.id, pilot.credits, station.shipMart, refusals, [...occupiedPads(station, world.ships)].sort()]);
    if (signature === this.signature) return;
    this.signature = signature;

    this.root.replaceChildren();
    const summary = el('div', 'market-summary');
    const taken = occupiedPads(station, world.ships).size;
    summary.append(
      el('span', undefined, `Credits ${pilot.credits.toLocaleString('en-GB')}`),
      el('span', undefined, `Pads free ${station.pads.length - taken} / ${station.pads.length}`),
    );
    this.root.append(summary);

    const table = el('table');
    const head = el('tr');
    for (const [h, num] of [
      ['', false],
      ['Ship', false],
      ['Speed', true],
      ['Accel', true],
      ['Shield', true],
      ['Hull', true],
      ['Cargo', true],
      ['DPS', true],
      ['Price', true],
      ['', false],
    ] as const) {
      head.append(el('th', num ? 'num' : undefined, h));
    }
    table.append(head);

    station.shipMart.forEach((loadoutId, i) => {
      const loadout = world.loadouts[loadoutId];
      const hull = loadout ? world.hulls[loadout.hullId] : undefined;
      if (!loadout || !hull) return;
      const stats = fitStats(world, hull, loadout.fit);
      const dps = Object.values(stats.weapons).filter(isGun).reduce((sum, w) => sum + weaponDps(w), 0);
      const refusal = refusals[i] ?? null;

      const row = el('tr');
      const thumb = el('td', 'thumb');
      thumb.append(shipThumb(world, hull, loadout.fit, THUMB_W, THUMB_H));

      const name = el('td', 'ship-name');
      name.append(el('div', undefined, hull.name), el('div', 'muted-cell', `${hull.sizeClass} · ${hull.role}`));

      const actions = el('td', 'actions');
      const buy = el('button', undefined, 'Buy');
      buy.type = 'button';
      buy.disabled = refusal !== null;
      buy.addEventListener('click', () => this.onBuy(loadoutId));
      actions.append(buy, el('div', 'refused', refusal ? BUY_REFUSALS[refusal] : ' '));

      row.append(
        thumb,
        name,
        el('td', 'num', `${fmt(stats.maxSpeed)}`),
        el('td', 'num', fmt(stats.mainThrust / stats.mass)),
        el('td', 'num', fmt(stats.shield)),
        el('td', 'num', fmt(stats.structure)),
        el('td', 'num', fmt(stats.cargoCapacity)),
        el('td', 'num', dps > 0 ? fmt(dps, 1) : '-'),
        el('td', 'num price', `${shipPrice(world, loadout).toLocaleString('en-GB')} cr`),
        actions,
      );
      table.append(row);
    });
    this.root.append(table);
    this.root.append(el('p', 'note', 'A ship you buy is set down empty on a free pad here. Board it from Your ships, or with B.'));
  }

  /** Force a rebuild next update (e.g. after docking somewhere new). */
  invalidate(): void {
    this.signature = '';
  }
}
