import type { WorldId } from '@spacegame/sim';
import type { Welcome } from './net/link.js';

/**
 * The mode screen (docs/worlds.md, "Screens"; approved mockup, 6 November
 * 2026): after a character is chosen, where to go. Three cards, Universe,
 * Arena and Dev, with the persistent world open according to the server
 * (`ServerKind`):
 *
 * - **On the dev server** (every server until the map): Dev, Calder on
 *   the newest code, is the persistent world you enter; Universe is
 *   greyed, since it is built with the map (Jason, 6 November 2026).
 * - **On the live server** (later): Universe is entered; Dev is greyed
 *   until it can link to the dev server (step 5).
 *
 * Arena is open on both. Leaving a mode from the menu (F2) comes back
 * here.
 */

interface Card {
  world: WorldId | null;
  title: string;
  text: string;
  foot: string;
  /** The dev card is drawn in the warning colour, as in the mockup. */
  dev?: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Show the mode screen until the player picks a world; resolves with it. `switchCharacter` goes back to character select. */
export function chooseMode(welcome: Welcome, switchCharacter: () => void): Promise<WorldId> {
  const dev = welcome.server === 'dev';
  const cards: Card[] = [
    dev
      ? { world: null, title: 'UNIVERSE', text: 'The persistent world, built with the map. Not open yet.', foot: 'COMES WITH THE MAP' }
      : { world: 'persistent', title: 'UNIVERSE', text: 'The persistent world. Your ships, credits and standing are kept. New features arrive here once tested.', foot: 'ENTER' },
    { world: 'arena', title: 'ARENA', text: 'Combat on its own. Fly any ship with any ready fit, pick a scenario. Nothing carries over.', foot: 'CHOOSE SHIP' },
    dev
      ? { world: 'persistent', title: 'DEV', text: 'Calder on the newest code: test new features before release.', foot: 'ENTER', dev: true }
      : { world: null, title: 'DEV', text: welcome.admin ? 'The test world on the newest code. Comes with the dev server.' : "The test world, for the game's developers.", foot: welcome.admin ? 'NOT SET UP YET' : 'OPERATORS ONLY', dev: true },
  ];

  const screen = el('div', 'login-screen');
  const box = el('div', 'login-box mode-box');
  screen.append(box);
  document.body.append(screen);

  return new Promise((resolve) => {
    box.append(el('h1', undefined, welcome.name), el('h2', undefined, 'Where to'));
    const grid = el('div', 'mode-cards');
    for (const card of cards) {
      const b = el('button', `mode-card${card.dev ? ' mode-dev' : ''}`);
      b.type = 'button';
      b.append(el('span', 'mode-title', card.title), el('span', 'mode-text', card.text), el('span', 'mode-foot', card.foot));
      if (card.world) {
        const world = card.world;
        b.addEventListener('click', () => {
          screen.remove();
          resolve(world);
        });
      } else {
        b.setAttribute('aria-disabled', 'true');
      }
      grid.append(b);
    }
    box.append(grid);
    const foot = el('div', 'mode-footer');
    const back = el('button', 'quiet', 'Switch character');
    back.type = 'button';
    back.addEventListener('click', switchCharacter);
    foot.append(back, el('span', 'muted', 'Leave a mode from the menu (F2) to come back here.'));
    box.append(foot);
    grid.querySelector<HTMLButtonElement>('.mode-card:not([aria-disabled])')?.focus();
  });
}
