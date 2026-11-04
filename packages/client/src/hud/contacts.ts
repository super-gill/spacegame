import type { Ship, World } from '@spacegame/sim';
import { bodyPosition, distance, lockReadout, shipStats } from '@spacegame/sim';
import { shipName } from '../ui.js';
import { el, setText } from './dom.js';
import { formatDistance, sameTarget, type NavTarget } from './nav-target.js';
import { radarShows } from './radar-geometry.js';
import { readoutStance, readoutWho, type TargetStance } from './target-card.js';

/**
 * The contacts list, on O: everything your charts and sensors know, nearest
 * first, like EVE's overview.
 *
 * - **Stations and bodies** from the charts, always. Click one to select
 *   it; N makes the selection your nav target (double-click does both).
 * - **Ships** only within sensor range, named only once a lock reads who
 *   they are (CONTACT until then). Click one to lock it, as on the radar.
 * - **Your own ships**, always, wherever you left them.
 *
 * Marks: a diamond on the nav target, a bracket on a locked ship.
 */

/** What a row stands for. */
export type ContactKind = 'station' | 'body' | 'belt' | 'ship' | 'yours';

export interface Contact {
  key: string;
  kind: ContactKind;
  id: string;
  name: string;
  distance: number;
  /** Colour class: a stance for ships, `chart` for stations and bodies. */
  tone: TargetStance | 'chart';
  locked: boolean;
}

/** The most rows shown; the farthest drop off. */
export const MAX_CONTACTS = 24;

const TYPE_WORD: Record<ContactKind, string> = {
  station: 'STN',
  body: 'BODY',
  belt: 'BELT',
  ship: 'SHIP',
  yours: 'YOURS',
};

/** Everything the list shows for this ship, nearest first. Pure: tested. */
export function contactsFor(world: World, ship: Ship, pilotId: string): Contact[] {
  const out: Contact[] = [];
  const at = ship.position;
  for (const s of Object.values(world.stations)) {
    out.push({ key: `station:${s.id}`, kind: 'station', id: s.id, name: s.name, distance: Math.max(0, distance(at, s.position) - s.radius), tone: 'chart', locked: false });
  }
  for (const b of Object.values(world.bodies)) {
    const c = bodyPosition(world, b.id);
    const d = distance(at, c);
    // A belt is a ring: its distance is to the nearest edge of the band.
    const gap = b.ring ? Math.max(0, Math.abs(d - b.ring.radius) - b.ring.width / 2) : Math.max(0, d - b.radius);
    out.push({ key: `body:${b.id}`, kind: b.ring ? 'belt' : 'body', id: b.id, name: b.name, distance: gap, tone: 'chart', locked: false });
  }
  const sensor = shipStats(world, ship).sensorRange;
  const locked = new Set(ship.locks.map((l) => l.targetId));
  for (const other of Object.values(world.ships)) {
    if (other.id === ship.id || other.state !== 'flying') continue;
    const d = distance(at, other.position);
    const yours = other.ownerId === pilotId;
    if (!yours && !radarShows(d, sensor)) continue;
    const read = locked.has(other.id) ? lockReadout(world, ship, other.id) : null;
    const who = readoutWho(read);
    const name = yours ? `Your ${shipName(world, other)}` : read?.identity ? `${read.identity.hullName} · ${who}` : 'Contact';
    out.push({
      key: `ship:${other.id}`,
      kind: yours ? 'yours' : 'ship',
      id: other.id,
      name,
      distance: d,
      tone: yours && !read ? 'pilot' : readoutStance(read),
      locked: locked.has(other.id),
    });
  }
  out.sort((a, b) => a.distance - b.distance || a.key.localeCompare(b.key));
  return out.slice(0, MAX_CONTACTS);
}

/** The chart object a contact names, for selection and nav; null for ships. */
export function contactChart(c: Pick<Contact, 'kind' | 'id'>): NavTarget | null {
  if (c.kind === 'station') return { kind: 'station', id: c.id };
  if (c.kind === 'body' || c.kind === 'belt') return { kind: 'body', id: c.id };
  return null;
}

interface Row {
  root: HTMLButtonElement;
  mark: HTMLSpanElement;
  type: HTMLSpanElement;
  name: HTMLSpanElement;
  dist: HTMLSpanElement;
}

export interface ContactsHandlers {
  /** A ship row was clicked: lock it or make it active. */
  onShip: (shipId: string) => void;
  /** A station or body row was clicked. */
  onSelect: (target: NavTarget) => void;
  /** A station or body row was double-clicked: select it and fly to it. */
  onNav: (target: NavTarget) => void;
}

export class ContactsPanel {
  private readonly root = el('div', 'hud-contacts hidden');
  private readonly list = el('div', 'hud-contacts-list');
  private readonly rows = new Map<string, Row>();
  private order = '';
  private open = false;

  constructor(parent: HTMLElement, private readonly handlers: ContactsHandlers) {
    const head = el('div', 'hud-contacts-head');
    head.append(el('span', undefined, 'CONTACTS'), el('span', 'hud-dim', 'N SET NAV · O CLOSE'));
    this.root.setAttribute('role', 'listbox');
    this.root.setAttribute('aria-label', 'Contacts');
    this.root.append(head, this.list);
    parent.append(this.root);
  }

  get visible(): boolean {
    return this.open;
  }

  toggle(open = !this.open): void {
    this.open = open;
  }

  update(world: World, ship: Ship | null, pilotId: string, selected: NavTarget | null, nav: NavTarget | null): void {
    const showing = this.open && ship !== null && ship.state === 'flying';
    this.root.classList.toggle('hidden', !showing);
    if (!showing || !ship) return;

    const contacts = contactsFor(world, ship, pilotId);
    const seen = new Set<string>();
    for (const c of contacts) {
      seen.add(c.key);
      let row = this.rows.get(c.key);
      if (!row) {
        row = this.makeRow(c);
        this.rows.set(c.key, row);
      }
      const chart = contactChart(c);
      const isNav = chart !== null && sameTarget(chart, nav);
      const isSelected = chart !== null && sameTarget(chart, selected);
      setText(row.mark, isNav ? '◆' : c.locked ? '[ ]' : '');
      setText(row.type, TYPE_WORD[c.kind]);
      setText(row.name, c.name);
      setText(row.dist, formatDistance(c.distance));
      const cls = `hud-contact ${c.tone}${isSelected ? ' selected' : ''}${isNav ? ' nav' : ''}${c.locked ? ' locked' : ''}`;
      if (row.root.className !== cls) row.root.className = cls;
      row.root.setAttribute('aria-selected', String(isSelected));
    }
    for (const [key, row] of this.rows) {
      if (!seen.has(key)) {
        row.root.remove();
        this.rows.delete(key);
      }
    }
    // Reorder only when the order changes, so rows do not flicker under the pointer.
    const order = contacts.map((c) => c.key).join('|');
    if (order !== this.order) {
      this.order = order;
      this.list.replaceChildren(...contacts.map((c) => this.rows.get(c.key)!.root));
    }
  }

  private makeRow(c: Contact): Row {
    const root = el('button', 'hud-contact');
    root.type = 'button';
    root.dataset['key'] = c.key;
    const mark = el('span', 'mark');
    const type = el('span', 'type');
    const name = el('span', 'name');
    const dist = el('span', 'dist');
    root.append(mark, type, name, dist);
    const chart = contactChart(c);
    root.addEventListener('click', () => {
      if (chart) this.handlers.onSelect(chart);
      else this.handlers.onShip(c.id);
    });
    if (chart) root.addEventListener('dblclick', () => this.handlers.onNav(chart));
    return { root, mark, type, name, dist };
  }
}
