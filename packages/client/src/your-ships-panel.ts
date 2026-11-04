import { boardRefusal, cargoUsed, ownedShips, shipStats, type BoardRefusal, type World } from '@spacegame/sim';
import { shipThumb } from './render/ship-thumb.js';
import { shipName, shipWhere } from './ui.js';

/**
 * Your ships, shown inside the docked panel at every station.
 *
 * Every ship the pilot owns (`ownedShips`, so pods are left out), with
 * where it is, its condition and cargo, so a pilot who owns several can
 * find them. The one you are aboard says so. The others have Board,
 * enabled when `boardRefusal` allows it (docked here, in practice) and
 * otherwise greyed with the reason underneath.
 *
 * The rules are the sim's; boarding is a sim command run by main.ts.
 * Like the ship mart, each row keeps a fixed-height reason line so
 * nothing moves under the pointer when a reason comes or goes.
 */

/** Player-facing reasons boarding is refused. Shared with main.ts and the HUD prompt. */
export const BOARD_REFUSALS: Record<BoardRefusal, string> = {
  noShip: 'You have no ship.',
  unknownShip: 'That ship is gone.',
  sameShip: 'You are aboard.',
  notOwned: 'Not yours.',
  notEmpty: 'Someone is flying it.',
  notTogether: 'Not here. Dock where it is, or fly alongside it.',
  tooFar: 'Too far. Fly alongside it.',
  tooFast: 'Moving too fast relative to it. Match its speed.',
};

const THUMB_W = 64;
const THUMB_H = 36;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class YourShipsPanel {
  private readonly root: HTMLDivElement;
  private signature = '';

  constructor(
    container: HTMLElement,
    private readonly onBoard: (shipId: string) => void,
  ) {
    this.root = el('div', 'your-ships');
    container.append(this.root);
  }

  /** Redraw if anything the list shows has changed. */
  update(world: World, pilotId: string): void {
    const pilot = world.pilots[pilotId];
    if (!pilot) return;
    const ships = ownedShips(world, pilotId);

    // Rounded so ships drifting in space do not rebuild the list every frame.
    const rows = ships.map((s) => {
      const stats = shipStats(world, s);
      return {
        ship: s,
        where: shipWhere(world, s, pilot.shipId),
        condition: `${Math.round((100 * s.shield) / Math.max(1, stats.shield))}% / ${Math.round((100 * s.structure) / stats.structure)}%`,
        cargo: `${cargoUsed(s)} / ${stats.cargoCapacity}`,
        refusal: s.id === pilot.shipId ? null : boardRefusal(world, pilotId, s.id),
        aboard: s.id === pilot.shipId,
      };
    });
    const signature = JSON.stringify(rows.map((r) => [r.ship.id, r.ship.fit, r.where, r.condition, r.cargo, r.refusal, r.aboard]));
    if (signature === this.signature) return;
    this.signature = signature;

    this.root.replaceChildren();
    if (rows.length === 0) {
      this.root.append(el('p', 'note', 'You own no ships. Buy one at a ship mart, or claim the free Courier at Harbour if you are in a pod.'));
      return;
    }

    const table = el('table');
    const head = el('tr');
    for (const [h, num] of [
      ['', false],
      ['Ship', false],
      ['Where', false],
      ['Shield / hull', true],
      ['Cargo', true],
      ['', false],
    ] as const) {
      head.append(el('th', num ? 'num' : undefined, h));
    }
    table.append(head);

    for (const r of rows) {
      const hull = world.hulls[r.ship.hullId];
      if (!hull) continue;
      const row = el('tr');
      if (r.aboard) row.className = 'selected';
      const thumb = el('td', 'thumb');
      thumb.append(shipThumb(world, hull, r.ship.fit, THUMB_W, THUMB_H));

      const actions = el('td', 'actions');
      if (r.aboard) {
        actions.append(el('div', 'aboard', 'Aboard'), el('div', 'refused', ' '));
      } else {
        const board = el('button', undefined, 'Board');
        board.type = 'button';
        board.disabled = r.refusal !== null;
        board.addEventListener('click', () => this.onBoard(r.ship.id));
        actions.append(board, el('div', 'refused', r.refusal ? BOARD_REFUSALS[r.refusal] : ' '));
      }

      row.append(thumb, el('td', 'ship-name', shipName(world, r.ship)), el('td', 'where', r.where), el('td', 'num', r.condition), el('td', 'num', r.cargo), actions);
      table.append(row);
    }
    this.root.append(table);
  }

  /** Force a rebuild next update. */
  invalidate(): void {
    this.signature = '';
  }
}
