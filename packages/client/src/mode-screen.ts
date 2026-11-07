import type { WorldId } from '@spacegame/sim';
import type { Welcome } from './net/link.js';

/**
 * The mode screen (docs/worlds.md, "Screens"; approved mockup, 6 November
 * 2026): after a character is chosen, where to go. Two cards:
 *
 * - **Universe**, the persistent world: Sol (docs/sol-build.md);
 * - **Arena**, combat on its own, which opens the arena setup.
 *
 * The mockup's third card, Dev, is gone (Jason, 7 November 2026: with
 * all of Sol built, a separate dev world is not needed). Leaving a mode
 * from the menu (F2) comes back here.
 */

interface Card {
  world: WorldId | null;
  title: string;
  text: string;
  foot: string;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Show the mode screen until the player picks a world; resolves with it. `switchCharacter` goes back to character select. */
export function chooseMode(welcome: Welcome, switchCharacter: () => void): Promise<WorldId> {
  const cards: Card[] = [
    { world: 'persistent', title: 'UNIVERSE', text: 'Sol, the persistent world. Your ships, credits and standing are kept.', foot: 'ENTER' },
    { world: 'arena', title: 'ARENA', text: 'Combat on its own. Fly any ship with any ready fit, pick a scenario. Nothing carries over.', foot: 'CHOOSE SHIP' },
  ];

  const screen = el('div', 'login-screen');
  const box = el('div', 'login-box mode-box');
  screen.append(box);
  document.body.append(screen);

  return new Promise((resolve) => {
    box.append(el('h1', undefined, welcome.name), el('h2', undefined, 'Where to'));
    const grid = el('div', 'mode-cards');
    for (const card of cards) {
      const b = el('button', 'mode-card');
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
