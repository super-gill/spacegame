import type { Ship, Station, World, WorldEvent } from '@spacegame/sim';
import { FLIGHT_MODE_LABELS, cargoUsed, distance, nearestDockableStation, shipPilot, shipStats } from '@spacegame/sim';

/**
 * DOM overlay: HUD text, docked panel, death panel and transient toasts.
 * Pure presentation; reads the world and never changes it. Buttons call
 * back into main.ts, which owns the world.
 */

/** Why docking was refused, in words. */
const DOCK_REFUSALS: Record<'tooFar' | 'tooFast' | 'noPad', string> = {
  tooFar: 'No station in range.',
  tooFast: 'Too fast to dock. Slow down.',
  noPad: 'No free pad here fits this hull.',
};

/**
 * Who a ship is, for labels: the pilot flying it, or for an empty ship
 * its owner marked as empty. Owning is not flying; never label an empty
 * ship with its owner's name alone.
 */
export function shipLabel(world: World, ship: Ship): string {
  const pilot = shipPilot(world, ship.id);
  if (pilot) return pilot.name.toUpperCase();
  const owner = ship.ownerId ? world.pilots[ship.ownerId] : undefined;
  return owner ? `EMPTY · ${owner.name.toUpperCase()}` : 'UNKNOWN';
}

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

export class Ui {
  private readonly hud = must<HTMLDivElement>('hud');
  private readonly targetPanel = must<HTMLDivElement>('target-panel');
  private readonly dockPanel = must<HTMLDivElement>('dock-panel');
  private readonly dockStationName = must<HTMLHeadingElement>('dock-station-name');
  private readonly undockButton = must<HTMLButtonElement>('undock-button');
  private readonly marketTab = must<HTMLButtonElement>('tab-market');
  private readonly outfittingTab = must<HTMLButtonElement>('tab-outfitting');
  private readonly marketContainer = must<HTMLDivElement>('market-container');
  private readonly outfittingContainer = must<HTMLDivElement>('outfitting-container');
  /** Which station service the docked panel shows. */
  dockTab: 'market' | 'outfitting' = 'market';
  private readonly deathPanel = must<HTMLDivElement>('death-panel');
  private readonly respawnButton = must<HTMLButtonElement>('respawn-button');
  private readonly toast = must<HTMLDivElement>('toast');
  private toastTimer: number | null = null;

  constructor(onUndock: () => void, onRespawn: () => void) {
    this.undockButton.addEventListener('click', onUndock);
    this.respawnButton.addEventListener('click', onRespawn);
    this.marketTab.addEventListener('click', () => (this.dockTab = 'market'));
    this.outfittingTab.addEventListener('click', () => (this.dockTab = 'outfitting'));
  }

  /** Refresh the HUD. `ship` is null while the pilot has no ship (destroyed). */
  update(world: World, ship: Ship | null, fps: number): void {
    this.deathPanel.classList.toggle('hidden', ship !== null);
    this.updateTarget(world, ship);
    if (!ship) {
      this.dockPanel.classList.add('hidden');
      this.hud.textContent = `NO SHIP\n${fps.toFixed(0)} fps  tick ${world.tick}`;
      return;
    }
    const stats = shipStats(world, ship);
    const hold = Object.entries(ship.hold)
      .filter(([, n]) => n > 0)
      .map(([item, n]) => `${item} ${n}`)
      .join(', ');
    const speed = Math.hypot(ship.velocity.x, ship.velocity.y);
    const near = nearestDockableStation(ship, world.stations);
    const secure = Object.values(world.stations).find((s) => distance(ship.position, s.position) < s.securityRadius);
    const hunted = Object.values(world.npcs).some((b) => b.kind === 'pirate' && b.mode === 'hunt' && b.targetId === ship.id);
    const lines = [
      hunted ? '!! PIRATE ON YOUR TAIL' : '',
      `ZONE ${secure ? `${secure.name.toUpperCase()} SECURITY` : 'OPEN SPACE'}`,
      `SHD ${Math.ceil(ship.shield).toString().padStart(3)}/${Math.round(stats.shield)}  HUL ${Math.ceil(ship.structure).toString().padStart(3)}/${Math.round(stats.structure)}`,
      `CR  ${(shipPilot(world, ship.id)?.credits ?? 0).toLocaleString('en-GB')}`,
      `CARGO ${cargoUsed(ship)}/${stats.cargoCapacity}${hold ? `  ${hold}` : ''}`,
      `VEL ${speed.toFixed(0).padStart(4)} u/s`,
      `POS ${ship.position.x.toFixed(0).padStart(6)} ${ship.position.y.toFixed(0).padStart(6)}`,
      `HDG ${((ship.heading * 180) / Math.PI).toFixed(0).padStart(4)}°`,
      `ROT ${((ship.angularVelocity * 180) / Math.PI).toFixed(0).padStart(4)}°/s`,
      `FLT ${FLIGHT_MODE_LABELS[ship.flightMode].toUpperCase()}  [Z]`,
      `WPN ${ship.weaponsHot ? 'HOT' : 'COLD'}  [H]`,
      near && ship.state === 'flying' ? `DOCK ${near.name.toUpperCase()}  [F]` : '',
      `${fps.toFixed(0)} fps  tick ${world.tick}`,
    ];
    this.hud.textContent = lines.filter(Boolean).join('\n');

    const docked = ship.state === 'docked';
    this.dockPanel.classList.toggle('hidden', !docked);
    if (docked && ship.dockedAt) {
      const station: Station | undefined = world.stations[ship.dockedAt];
      this.dockStationName.textContent = station?.name ?? 'Station';
      // Outfitting only where the station offers it.
      const canRefit = station?.outfitting ?? false;
      if (!canRefit) this.dockTab = 'market';
      this.outfittingTab.disabled = !canRefit;
      this.outfittingTab.title = canRefit ? '' : 'No outfitting at this station';
      const onMarket = this.dockTab === 'market';
      this.marketTab.setAttribute('aria-selected', String(onMarket));
      this.outfittingTab.setAttribute('aria-selected', String(!onMarket));
      this.marketContainer.classList.toggle('hidden', !onMarket);
      this.outfittingContainer.classList.toggle('hidden', onMarket);
      this.dockPanel.classList.toggle('wide', !onMarket);
    }
  }

  /** Bottom-right readout for the selected target: who, how far, closing speed, shields and structure. */
  private updateTarget(world: World, ship: Ship | null): void {
    const target = ship?.targetId ? world.ships[ship.targetId] : undefined;
    const hull = target ? world.hulls[target.hullId] : undefined;
    if (!ship || !target || !hull) {
      this.targetPanel.classList.add('hidden');
      return;
    }
    const stats = shipStats(world, target);
    const brain = world.npcs[target.id];
    const who = brain ? brain.kind.toUpperCase() : shipLabel(world, target);
    const range = distance(ship.position, target.position);
    // Closing speed: positive when the gap is shrinking.
    const dx = target.position.x - ship.position.x;
    const dy = target.position.y - ship.position.y;
    const rvx = target.velocity.x - ship.velocity.x;
    const rvy = target.velocity.y - ship.velocity.y;
    const closing = range > 0 ? -(dx * rvx + dy * rvy) / range : 0;
    this.targetPanel.textContent = [
      `TARGET ${who}`,
      `HULL   ${hull.name.toUpperCase()}`,
      `RANGE  ${range.toFixed(0).padStart(5)}`,
      `CLOSE  ${closing.toFixed(0).padStart(5)} u/s`,
      `SHD ${Math.ceil(target.shield).toString().padStart(3)}/${Math.round(stats.shield)}  HUL ${Math.ceil(target.structure).toString().padStart(3)}/${Math.round(stats.structure)}`,
      `[Tab] next  [Esc] clear`,
    ].join('\n');
    this.targetPanel.classList.remove('hidden');
  }

  /**
   * Toasts for events involving this pilot's ship: things that happened to
   * it (`shipId`) or that it caused (`by`).
   */
  handleEvents(events: WorldEvent[], myShipId: string): void {
    for (const e of events) {
      const mine = e.shipId === myShipId;
      if (e.type === 'podEjected' && e.from === myShipId) {
        this.showToast('Your ship was destroyed. You got away in an escape pod.', 4000);
        continue;
      }
      if (e.type === 'destroyed') {
        if (mine) this.showToast('Your ship was destroyed.', 3000);
        else if (e.by === myShipId) this.showToast('Target destroyed.', 2000, 'info');
        continue;
      }
      if (!mine) continue;
      if (e.type === 'dockRefused') {
        this.showToast(DOCK_REFUSALS[e.reason]);
      } else if (e.type === 'flightModeChanged') {
        this.showToast(`Flight mode: ${FLIGHT_MODE_LABELS[e.mode]}`, 1200, 'info');
      } else if (e.type === 'huntStarted') {
        this.showToast('Pirate closing in. Run for station security.', 3000);
      } else if (e.type === 'huntEnded') {
        this.showToast('The pirate has broken off.', 2000, 'info');
      } else if (e.type === 'collided') {
        this.showToast(`Hull contact at ${Math.round(e.speed)} u/s`, 1200);
      } else if (e.type === 'rammed') {
        this.showToast(`Collision at ${Math.round(e.speed)} u/s`, 1200);
      } else if (e.type === 'weaponsHotChanged') {
        this.showToast(e.hot ? 'Weapons hot' : 'Weapons cold', 1000, e.hot ? 'warn' : 'info');
      } else if (e.type === 'lootCollected') {
        this.showToast(`+${e.amount} ${e.item}`, 1200, 'info');
      }
    }
  }

  /** Show a message from outside the sim's events, e.g. the result of a trade. */
  notify(text: string, tone: 'warn' | 'info' = 'info'): void {
    this.showToast(text, 1600, tone);
  }

  private showToast(text: string, ms = 1800, tone: 'warn' | 'info' = 'warn'): void {
    this.toast.textContent = text;
    this.toast.classList.toggle('info', tone === 'info');
    this.toast.classList.remove('hidden');
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.add('hidden'), ms);
  }
}
