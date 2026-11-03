import type { Ship, Station, World, WorldEvent } from '@spacegame/sim';
import { FLIGHT_MODE_LABELS, distance, nearestDockableStation } from '@spacegame/sim';

/**
 * DOM overlay: HUD text, docked panel and transient toasts.
 * Pure presentation; reads the world and never changes it.
 */

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

export class Ui {
  private readonly hud = must<HTMLDivElement>('hud');
  private readonly dockPanel = must<HTMLDivElement>('dock-panel');
  private readonly dockStationName = must<HTMLHeadingElement>('dock-station-name');
  private readonly undockButton = must<HTMLButtonElement>('undock-button');
  private readonly toast = must<HTMLDivElement>('toast');
  private toastTimer: number | null = null;

  constructor(onUndock: () => void) {
    this.undockButton.addEventListener('click', onUndock);
  }

  update(world: World, ship: Ship, fps: number): void {
    const speed = Math.hypot(ship.velocity.x, ship.velocity.y);
    const near = nearestDockableStation(ship, world.stations);
    const secure = Object.values(world.stations).find((s) => distance(ship.position, s.position) < s.securityRadius);
    const hunted = Object.values(world.npcs).some((b) => b.kind === 'pirate' && b.mode === 'hunt' && b.targetId === ship.id);
    const lines = [
      hunted ? '!! PIRATE ON YOUR TAIL' : '',
      `ZONE ${secure ? `${secure.name.toUpperCase()} SECURITY` : 'OPEN SPACE'}`,
      `VEL ${speed.toFixed(0).padStart(4)} u/s`,
      `POS ${ship.position.x.toFixed(0).padStart(6)} ${ship.position.y.toFixed(0).padStart(6)}`,
      `HDG ${((ship.heading * 180) / Math.PI).toFixed(0).padStart(4)}°`,
      `ROT ${((ship.angularVelocity * 180) / Math.PI).toFixed(0).padStart(4)}°/s`,
      `FLT ${FLIGHT_MODE_LABELS[ship.flightMode].toUpperCase()}  [Z]`,
      near && ship.state === 'flying' ? `DOCK ${near.name.toUpperCase()}  [F]` : '',
      `${fps.toFixed(0)} fps  tick ${world.tick}`,
    ];
    this.hud.textContent = lines.filter(Boolean).join('\n');

    const docked = ship.state === 'docked';
    this.dockPanel.classList.toggle('hidden', !docked);
    if (docked && ship.dockedAt) {
      const station: Station | undefined = world.stations[ship.dockedAt];
      this.dockStationName.textContent = station?.name ?? 'Station';
    }
  }

  handleEvents(events: WorldEvent[]): void {
    for (const e of events) {
      if (e.type === 'dockRefused') {
        this.showToast(e.reason === 'tooFast' ? 'Too fast to dock. Slow down.' : 'No station in range.');
      } else if (e.type === 'flightModeChanged') {
        this.showToast(`Flight mode: ${FLIGHT_MODE_LABELS[e.mode]}`, 1200, 'info');
      } else if (e.type === 'huntStarted') {
        this.showToast('Pirate closing in. Run for station security.', 3000);
      } else if (e.type === 'huntEnded') {
        this.showToast('The pirate has broken off.', 2000, 'info');
      } else if (e.type === 'collided') {
        this.showToast(`Hull contact at ${Math.round(e.speed)} u/s`, 1200);
      }
    }
  }

  private showToast(text: string, ms = 1800, tone: 'warn' | 'info' = 'warn'): void {
    this.toast.textContent = text;
    this.toast.classList.toggle('info', tone === 'info');
    this.toast.classList.remove('hidden');
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.add('hidden'), ms);
  }
}
