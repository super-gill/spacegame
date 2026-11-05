import { cargoUsed, holdCapacity, maxBuyable, scriptedPrices, shipStats, type World } from '@spacegame/sim';

/**
 * Station market, shown inside the docked panel.
 *
 * One row per good the station trades: what it charges you (Buy at), what
 * it pays you (Sell at), how many you have aboard, and buttons to trade.
 * Buttons call back to main.ts, which runs the sim's trade command and
 * owns the world; this panel only draws and reports clicks.
 *
 * The table is rebuilt only when something it shows changes, not every
 * frame, so buttons stay clickable.
 */

export type TradeRequest = { side: 'buy' | 'sell'; good: string; quantity: number };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class MarketPanel {
  private readonly root: HTMLDivElement;
  private signature = '';

  constructor(
    container: HTMLElement,
    private readonly onTrade: (request: TradeRequest) => void,
  ) {
    this.root = el('div', 'market');
    container.append(this.root);
  }

  /** Redraw if what the market shows has changed. */
  update(world: World, pilotId: string): void {
    const pilot = world.pilots[pilotId];
    const ship = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
    const station = ship?.dockedAt ? world.stations[ship.dockedAt] : undefined;
    if (!pilot || !ship || !station) return;

    const signature = JSON.stringify([station.id, pilot.credits, ship.hold, ship.fit, station.market]);
    if (signature === this.signature) return;
    this.signature = signature;

    const capacity = holdCapacity(shipStats(world, ship));
    this.root.replaceChildren();

    const summary = el('div', 'market-summary');
    summary.append(
      el('span', undefined, `Credits ${pilot.credits.toLocaleString('en-GB')}`),
      el('span', undefined, `Cargo ${cargoUsed(ship)} / ${capacity}`),
    );
    this.root.append(summary);

    const table = el('table');
    const head = el('tr');
    for (const h of ['Good', 'Buy at', 'Sell at', 'Aboard', '']) head.append(el('th', undefined, h));
    table.append(head);

    // Goods the station trades, plus anything aboard it does not (so you can see it, if not sell it).
    const goods = new Set([...Object.keys(station.market), ...Object.keys(ship.hold)]);
    for (const id of [...goods].sort((a, b) => (world.goods[a]?.name ?? a).localeCompare(world.goods[b]?.name ?? b))) {
      const quote = scriptedPrices.quote(world, station.id, id);
      // Drones are counted in the drone bay, not the hold.
      const drone = world.goods[id]?.drone;
      const aboard = drone ? (ship.droneBay ?? []).filter((d) => d.loadoutId === drone.loadoutId).length : (ship.hold[id] ?? 0);
      const canBuy = maxBuyable(world, pilotId, id);
      const row = el('tr');
      row.append(
        el('td', undefined, world.goods[id]?.name ?? id),
        el('td', 'num', quote?.ask != null ? String(quote.ask) : '-'),
        el('td', 'num', quote?.bid != null ? String(quote.bid) : '-'),
        el('td', 'num', aboard ? String(aboard) : ''),
      );

      const actions = el('td', 'actions');
      const button = (label: string, request: TradeRequest, enabled: boolean): void => {
        const b = el('button', undefined, label);
        b.type = 'button';
        b.disabled = !enabled;
        b.addEventListener('click', () => this.onTrade(request));
        actions.append(b);
      };
      button('Buy 1', { side: 'buy', good: id, quantity: 1 }, canBuy >= 1);
      button(`Buy max${canBuy > 1 ? ` (${canBuy})` : ''}`, { side: 'buy', good: id, quantity: Math.max(1, canBuy) }, canBuy >= 1);
      button('Sell 1', { side: 'sell', good: id, quantity: 1 }, quote?.bid != null && aboard >= 1);
      button('Sell all', { side: 'sell', good: id, quantity: Math.max(1, aboard) }, quote?.bid != null && aboard >= 1);
      row.append(actions);
      table.append(row);
    }
    this.root.append(table);
  }

  /** Force a rebuild next update (e.g. after docking somewhere new). */
  invalidate(): void {
    this.signature = '';
  }
}
