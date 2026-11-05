import { MAX_NAME_LENGTH, type LoginRefusal } from '@spacegame/sim';
import { forgetCharacter, rememberCharacter, rememberedCharacters } from './net/characters.js';
import { Link, LoginError, serverAddress, type Welcome } from './net/link.js';
import { suggestName } from './net/names.js';

/**
 * Character select (docs/shared-world.md, "Characters"): the first thing
 * a player sees. Play as a character this browser remembers, log in with
 * a name and key, or make a new character. A new character's key is
 * shown once, to keep, before play starts.
 *
 * Each tab logs in on its own, so two tabs can play two characters at
 * once (multiboxing). Logging in as a character already playing
 * elsewhere takes it over; the other tab is told why.
 */

const REFUSALS: Record<LoginRefusal | 'noServer', string> = {
  protocol: 'This page is older than the server. Reload the page.',
  badName: 'Names are 1 to 24 letters, digits, spaces and . _ \' -',
  nameTaken: 'Someone already has that name. Try another.',
  unknown: 'No character with that name and key.',
  noServer: 'The server is not answering. Is it running?',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, onClick: () => void, className?: string): HTMLButtonElement {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/** Show character select until the player is in; resolves with the open link and the welcome. */
export function chooseCharacter(): Promise<{ link: Link; welcome: Welcome }> {
  const server = serverAddress();
  const screen = el('div', 'login-screen');
  const box = el('div', 'login-box');
  screen.append(box);
  document.body.append(screen);

  return new Promise((resolve) => {
    const message = el('p', 'login-message');
    let busy = false;

    /** Try to get in; on success, maybe show the key, then hand over. */
    const attempt = (how: { create: string } | { name: string; key: string }): void => {
      if (busy) return;
      busy = true;
      message.textContent = 'Connecting…';
      Link.open(how).then(
        ({ link, welcome }) => {
          const key = welcome.key ?? ('key' in how ? how.key : null);
          if (key) rememberCharacter(server, { name: welcome.name, key });
          if (welcome.key) {
            showKey(welcome.name, welcome.key, () => finish(link, welcome));
          } else {
            finish(link, welcome);
          }
        },
        (error: unknown) => {
          busy = false;
          message.textContent = error instanceof LoginError ? REFUSALS[error.reason] : 'Could not connect.';
        },
      );
    };

    const finish = (link: Link, welcome: Welcome): void => {
      screen.remove();
      resolve({ link, welcome });
    };

    /** The key, shown once, with the reason to keep it. */
    const showKey = (name: string, key: string, play: () => void): void => {
      box.replaceChildren();
      box.append(el('h1', undefined, `Welcome, ${name}`));
      box.append(el('p', undefined, 'This is your key. With your name, it is how you get this character back: on another browser, another computer, or if this browser forgets it. Keep it somewhere safe. It is shown only now.'));
      const keyLine = el('div', 'login-key', key);
      const copy = button('Copy', () => {
        void navigator.clipboard?.writeText(key).then(
          () => (copy.textContent = 'Copied'),
          () => (copy.textContent = 'Copy it by hand'),
        );
      });
      const row = el('div', 'login-row');
      row.append(keyLine, copy);
      box.append(row, el('p', 'muted', 'This browser remembers it too, so you will not be asked each time.'));
      box.append(button('I have kept it: play', play, 'login-primary'));
    };

    // Characters this browser remembers.
    const draw = (): void => {
      box.replaceChildren();
      box.append(el('h1', undefined, 'Spacegame'));
      const known = rememberedCharacters(server);
      if (known.length > 0) {
        box.append(el('h2', undefined, 'Play as'));
        for (const c of known) {
          const row = el('div', 'login-row');
          row.append(
            button(c.name, () => attempt({ name: c.name, key: c.key }), 'login-primary'),
            button('Forget', () => {
              if (window.confirm(`Forget ${c.name} on this browser? You will need the key to log in again.`)) {
                forgetCharacter(server, c.name);
                draw();
              }
            }, 'quiet'),
          );
          box.append(row);
        }
      }

      // A new character, with a suggested name to start from.
      box.append(el('h2', undefined, 'New character'));
      const name = el('input');
      name.type = 'text';
      name.maxLength = MAX_NAME_LENGTH;
      name.value = suggestName();
      name.setAttribute('aria-label', 'New character name');
      const create = (): void => attempt({ create: name.value });
      name.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') create();
      });
      const newRow = el('div', 'login-row');
      newRow.append(name, button('Suggest another', () => (name.value = suggestName()), 'quiet'), button('Create', create, 'login-primary'));
      box.append(newRow);

      // Log in with a key, from another browser or after this one forgot.
      box.append(el('h2', undefined, 'Log in with a key'));
      const who = el('input');
      who.type = 'text';
      who.placeholder = 'Name';
      who.setAttribute('aria-label', 'Character name');
      const key = el('input');
      key.type = 'text';
      key.placeholder = 'XXXX-XXXX-XXXX-XXXX';
      key.setAttribute('aria-label', 'Key');
      const login = (): void => attempt({ name: who.value, key: key.value });
      key.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') login();
      });
      const keyRow = el('div', 'login-row');
      keyRow.append(who, key, button('Log in', login));
      box.append(keyRow, message);
    };
    draw();
  });
}
