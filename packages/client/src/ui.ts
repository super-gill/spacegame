import type { Ship, Station, World, WorldEvent } from '@spacegame/sim';
import { nearestDockableStation } from '@spacegame/sim';

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
    const lines = [
      `VEL ${speed.toFixed(0).padStart(4)} u/s`,
      `POS ${ship.position.x.toFixed(0).padStart(6)} ${ship.position.y.toFixed(0).padStart(6)}`,
      `HDG ${((ship.heading * 180) / Math.PI).toFixed(0).padStart(4)}°`,
      `ROT ${((ship.angularVelocity * 180) / Math.PI).toFixed(0).padStart(4)}°/s`,
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
      }
    }
  }

  private showToast(text: string, ms = 1800): void {
    this.toast.textContent = text;
    this.toast.classList.remove('hidden');
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.add('hidden'), ms);
  }
}
