import type { DroneCommand, Ship, World } from '@spacegame/sim';
import { dronesOut, shipStats } from '@spacegame/sim';
import { el, setText, show } from './dom.js';

/**
 * Stopgap (lead): the drone manager (docs/drones.md). The pilot commands;
 * drones fly themselves. One row per drone, stowed or out, with its state
 * and condition; buttons to launch and recall all or one, and to send a
 * drone to the active lock's rock. N opens and closes it. Built as a
 * manager so fighters can join it later; the interface workstream
 * restyles it.
 */
export class DronePanel {
  private readonly root = el('div', 'hud-drones hidden');
  private readonly summary = el('span', 'hud-dim');
  private readonly list = el('div', 'hud-drones-list');
  private readonly empty = el('p', 'hud-dim', 'No drone bay fitted.');
  private open = false;
  private key = '';

  constructor(parent: HTMLElement, private readonly onCommand: (command: DroneCommand) => void) {
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Drones');
    const head = el('div', 'hud-drones-head');
    head.append(el('span', 'hud-drones-title', 'DRONES · N'), this.summary);
    const all = el('div', 'hud-drones-all');
    all.append(
      this.button('LAUNCH ALL', 'Launch every stowed drone the bay can control', { action: 'launch' }),
      this.button('RECALL ALL', 'Bring every drone home', { action: 'recall' }),
      this.button('SEND', 'Send the next free drone to your active lock', { action: 'send' }),
    );
    this.root.append(head, all, this.list, this.empty);
    parent.append(this.root);
  }

  toggle(): void {
    this.open = !this.open;
  }

  update(world: World, ship: Ship | null): void {
    const stats = ship ? shipStats(world, ship) : null;
    const has = Boolean(ship && stats && stats.droneCapacity > 0);
    show(this.root, this.open && ship !== null);
    if (!this.open || !ship || !stats) return;
    show(this.empty, !has);
    if (!has) {
      setText(this.summary, '');
      this.list.replaceChildren();
      this.key = '';
      return;
    }

    const out = dronesOut(world, ship.id);
    const stowed = ship.droneBay ?? [];
    setText(this.summary, `${out.length}/${stats.droneControl} OUT · ${stowed.length + out.length}/${stats.droneCapacity} HELD`);

    // One row per drone, in id order: what it is doing and how whole it is.
    const rows: { id: string; state: string; health: number; isOut: boolean }[] = [];
    for (const d of stowed) {
      const max = world.hulls[world.loadouts[d.loadoutId]?.hullId ?? '']?.structure ?? 1;
      rows.push({ id: d.id, state: 'IN BAY', health: d.structure / max, isOut: false });
    }
    for (const d of out) {
      const brain = world.npcs[d.id];
      const max = world.hulls[d.hullId]?.structure ?? 1;
      const state =
        brain?.kind !== 'drone'
          ? 'OUT'
          : brain.mode === 'return'
            ? 'RETURNING'
            : brain.rockId
              ? d.beams?.some((b) => b.cutting)
                ? brain.sentRockId
                  ? 'CUTTING (SENT)'
                  : 'CUTTING'
                : 'TO ROCK'
              : 'WAITING';
      rows.push({ id: d.droneId ?? d.id, state, health: d.structure / max, isOut: true });
    }
    rows.sort((a, b) => (a.id < b.id ? -1 : 1));

    const key = rows.map((r) => `${r.id}:${r.isOut}`).join(' ');
    if (key !== this.key) {
      this.key = key;
      this.list.replaceChildren(
        ...rows.map((r) => {
          const row = el('div', 'hud-drone');
          row.dataset['drone'] = r.id;
          const name = el('span', 'hud-drone-name', r.id.toUpperCase());
          const state = el('span', 'hud-drone-state');
          const bar = el('span', 'bar');
          bar.append(el('span', 'bar-fill hull'));
          const actions = el('span', 'hud-drone-actions');
          if (r.isOut) {
            actions.append(
              this.button('SEND', `Send ${r.id} to your active lock`, { action: 'send', droneId: r.id }),
              this.button('RECALL', `Recall ${r.id}`, { action: 'recall', droneId: r.id }),
            );
          } else {
            actions.append(this.button('LAUNCH', `Launch ${r.id}`, { action: 'launch', droneId: r.id }));
          }
          row.append(name, state, bar, actions);
          return row;
        }),
      );
    }
    for (const r of rows) {
      const row = this.list.querySelector<HTMLElement>(`[data-drone="${r.id}"]`);
      if (!row) continue;
      setText(row.querySelector('.hud-drone-state')!, r.state);
      (row.querySelector('.bar-fill') as HTMLElement).style.width = `${Math.round(Math.max(0, Math.min(1, r.health)) * 100)}%`;
    }
  }

  private button(label: string, title: string, command: DroneCommand): HTMLButtonElement {
    const b = el('button', 'hud-drone-button', label) as HTMLButtonElement;
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onCommand(command);
    });
    return b;
  }
}
