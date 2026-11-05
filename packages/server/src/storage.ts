import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createStarterWorld, deserializeWorld, serializeWorld, type World } from '@spacegame/sim';
import type { AccountsData } from './accounts.js';

/**
 * The server's files, all in one folder (the data folder):
 *
 * - `world.json`: the world, in the same save format the browser used,
 *   so older saves load through the same migrations.
 * - `accounts.json`: the characters (names, pilots, key hashes).
 * - `*.previous.json`: the file as it was before the last save, in case
 *   a save is ever bad.
 *
 * Files are written to a temporary name and then renamed, so a crash
 * mid-write never leaves half a file.
 */

export class Storage {
  constructor(private readonly folder: string) {
    mkdirSync(folder, { recursive: true });
  }

  private path(name: string): string {
    return join(this.folder, name);
  }

  private write(name: string, text: string): void {
    const target = this.path(name);
    if (existsSync(target)) renameSync(target, this.path(name.replace(/\.json$/, '.previous.json')));
    const temp = `${target}.writing`;
    writeFileSync(temp, text, 'utf8');
    renameSync(temp, target);
  }

  /** The saved world, or a new one if there is none. Refuses to start over a save it cannot read, rather than replace it. */
  loadWorld(): { world: World; fresh: boolean } {
    const target = this.path('world.json');
    if (!existsSync(target)) return { world: createStarterWorld(), fresh: true };
    const loaded = deserializeWorld(readFileSync(target, 'utf8'));
    if (!loaded.ok) throw new Error(`Cannot read ${target} (${loaded.reason}). Move it aside to start a new world.`);
    return { world: loaded.world, fresh: false };
  }

  saveWorld(world: World): void {
    this.write('world.json', serializeWorld(world, new Date().toISOString()));
  }

  loadAccounts(): AccountsData | null {
    const target = this.path('accounts.json');
    if (!existsSync(target)) return null;
    return JSON.parse(readFileSync(target, 'utf8')) as AccountsData;
  }

  saveAccounts(data: AccountsData): void {
    this.write('accounts.json', JSON.stringify(data, null, 2));
  }
}
