import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { deflateRawSync } from 'node:zlib';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { PROTOCOL_VERSION, diffWorld, readCommand, readInput, visibleEvents, visibleWorld, type ClientMessage, type KickReason, type ServerMessage, type World } from '@spacegame/sim';
import { Accounts, type Character } from './accounts.js';
import { Game } from './game.js';
import { ServerStats } from './stats.js';
import { Storage } from './storage.js';
import { serveClient } from './web.js';

/**
 * The Spacegame server (docs/shared-world.md, docs/hosting.md). Start it
 * with `npm start` from the repo root. It:
 *
 * 1. loads the world and the characters from the data folder (or starts
 *    a new world);
 * 2. serves the built client over HTTP, and talks to each player's
 *    browser over a WebSocket at `/ws`;
 * 3. steps the world 60 times a second, sends each player what changed
 *    20 times a second, and saves every minute and on the way out.
 *
 * Settings come from the environment: `PORT` (default 8080), `HOST`
 * (default every network) and `SPACEGAME_DATA` (default
 * `packages/server/data`).
 */

const PORT = Number(process.env['PORT'] ?? 8080);
/** Which network to listen on: every one by default; `127.0.0.1` for this PC only, when Tailscale Serve passes friends in (docs/hosting.md). */
const HOST = process.env['HOST'] || undefined;
const DATA = process.env['SPACEGAME_DATA'] ?? fileURLToPath(new URL('../data', import.meta.url));
const CLIENT = fileURLToPath(new URL('../../client/dist', import.meta.url));

/** Ticks between updates to players: 2 is 30 updates a second (the client draws two updates behind, net/timeline.ts). */
const UPDATE_EVERY_TICKS = 2;
/** Save this often, ms. */
const SAVE_EVERY_MS = 60_000;
/** A player whose connection has this much waiting to send skips updates until it drains, bytes. */
const MAX_BUFFERED_BYTES = 2_000_000;

const storage = new Storage(DATA);
const loaded = storage.loadWorld();
const game = new Game(loaded.world);
// Nobody is connected yet: everyone is away, and ships left in space disappear after the grace.
game.allAway();
const accounts = new Accounts(storage.loadAccounts());
const stats = new ServerStats();

/** One player's browser tab. */
interface Connection {
  socket: WebSocket;
  /** Who it is logged in as, once it has. */
  character: Character | null;
  /** The world as this player last saw it (their view, `visibleWorld`), so the next update sends only what changed. */
  seen: World | null;
}

const connections = new Set<Connection>();

function send(connection: Connection, message: ServerMessage): void {
  if (connection.socket.readyState === connection.socket.OPEN) connection.socket.send(JSON.stringify(message));
}

function kick(connection: Connection, reason: KickReason): void {
  send(connection, { t: 'kicked', reason });
  connection.character = null;
  connection.socket.close();
}

/** Log a connection in as a character: the old connection for it, if any, is told why and closed. */
function enter(connection: Connection, character: Character, key: string | null): void {
  for (const other of connections) {
    if (other !== connection && other.character?.pilotId === character.pilotId) kick(other, 'loggedInElsewhere');
  }
  connection.character = character;
  game.join(character.pilotId, character.name);
  const view = visibleWorld(game.current, character.pilotId);
  connection.seen = view;
  send(connection, { t: 'welcome', pilotId: character.pilotId, name: character.name, key, admin: character.admin === true, world: view });
  console.log(`${character.name} joined (${connections.size} connected)`);
}

function received(connection: Connection, message: ClientMessage): void {
  switch (message.t) {
    case 'create': {
      if (message.protocol !== PROTOCOL_VERSION) return send(connection, { t: 'refused', reason: 'protocol' });
      const made = accounts.create(message.name);
      if (!made.ok) return send(connection, { t: 'refused', reason: made.reason });
      storage.saveAccounts(accounts.toData());
      return enter(connection, made.character, made.key);
    }
    case 'login': {
      if (message.protocol !== PROTOCOL_VERSION) return send(connection, { t: 'refused', reason: 'protocol' });
      const character = typeof message.name === 'string' && typeof message.key === 'string' ? accounts.login(message.name, message.key) : null;
      if (!character) return send(connection, { t: 'refused', reason: 'unknown' });
      return enter(connection, character, null);
    }
    case 'input': {
      const input = readInput(message.input);
      if (connection.character && input) game.input(connection.character.pilotId, input);
      return;
    }
    case 'command': {
      const command = readCommand(message.command);
      if (!connection.character || !command || typeof message.id !== 'number') return;
      // Admin switches are the host's alone.
      if (command.type.startsWith('admin') && !connection.character.admin) {
        return send(connection, { t: 'outcome', id: message.id, outcome: { ok: false, reason: 'notAdmin' } });
      }
      const outcome = game.command(connection.character.pilotId, command);
      return send(connection, { t: 'outcome', id: message.id, outcome: outcome.ok ? { ok: true, event: outcome.event } : { ok: false, reason: outcome.reason } });
    }
    case 'ping':
      return send(connection, { t: 'pong', sent: message.sent });
  }
}

/**
 * Send every logged-in player what changed in what they can see since
 * they last heard (`visibleWorld`: their sensor range, their own things,
 * nobody else's holds or wallet). Each player's view is their own, so
 * each gets their own message. Events are kept if they concern a ship in
 * this view or the last one, so a ship destroyed this tick still gets
 * its explosion.
 */
function update(): void {
  const events = game.takeEvents();
  const now = game.current;
  for (const connection of connections) {
    if (!connection.character || !connection.seen) continue;
    if (connection.socket.bufferedAmount > MAX_BUFFERED_BYTES) continue; // behind: catch up next time
    const pilotId = connection.character.pilotId;
    const view = visibleWorld(now, pilotId, connection.seen);
    const heard = visibleEvents(events, pilotId, { ...connection.seen.ships, ...view.ships });
    const message: ServerMessage = { t: 'update', tick: now.tick, changed: diffWorld(connection.seen, view), events: heard };
    const text = JSON.stringify(message);
    // Now and then, see how well it compresses, for `stats`.
    if (now.tick % 300 === 0) stats.compressed(text.length, deflateRawSync(text).length);
    connection.socket.send(text);
    stats.sent(performance.now(), text.length, connection.character.name);
    connection.seen = view;
  }
}

// The tick loop: catch up on whole ticks, so the world runs at its own pace whatever the timer does.
const tickMs = game.current.dt * 1000;
let due = performance.now();
let ticks = 0;
setInterval(() => {
  const now = performance.now();
  // After a long stall (the PC slept), skip ahead rather than racing to catch up.
  if (now - due > 1000) due = now;
  while (now >= due) {
    const started = performance.now();
    game.step();
    stats.tick(started, performance.now() - started);
    ticks++;
    if (ticks % UPDATE_EVERY_TICKS === 0) update();
    due += tickMs;
  }
}, 4);

function save(): void {
  storage.saveWorld(game.current);
}
setInterval(save, SAVE_EVERY_MS);

const http = createServer(serveClient(CLIENT));
// Compress messages: the world's JSON shrinks several times over, and the host's upload is the limit.
const sockets = new WebSocketServer({ server: http, path: '/ws', perMessageDeflate: { threshold: 1024 } });
sockets.on('connection', (socket) => {
  const connection: Connection = { socket, character: null, seen: null };
  connections.add(connection);
  socket.on('message', (data) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(String(data)) as ClientMessage;
    } catch {
      return; // not JSON: ignore it
    }
    if (typeof message === 'object' && message !== null) received(connection, message);
  });
  socket.on('close', () => {
    connections.delete(connection);
    if (connection.character) {
      // Only if no other connection took this character over.
      const still = [...connections].some((c) => c.character?.pilotId === connection.character?.pilotId);
      if (!still) game.leave(connection.character.pilotId);
      console.log(`${connection.character.name} left (${connections.size} connected)`);
    }
  });
});

http.listen(PORT, HOST, () => {
  console.log(`Spacegame server on port ${PORT}${loaded.fresh ? ', new world' : ''}. Data in ${DATA}. Build ${serverCommit()}.`);
  console.log(`Open http://localhost:${PORT} here, or http://<this machine's Tailscale address>:${PORT} from a friend's.`);
  console.log('Type help for the console commands (op, deop, who, stats, save, stop).');
});

/**
 * The server console: commands typed into the server's window, for the
 * host. Players are either players (log in and play) or operators (also
 * the admin controls: credits, spawning ships, the world's switches). The
 * first character made on a new server is an operator; this is how to
 * change who else is.
 */
const CONSOLE_HELP = [
  'op <name>     make a character an operator (admin controls)',
  'deop <name>   make an operator a player again',
  'who           list characters, who is an operator, who is online',
  'stats         is the server keeping up, and how much is it sending',
  'save          save the world now',
  'stop          save and stop the server (or Ctrl+C)',
].join('\n');

function consoleCommand(line: string): void {
  const [word = '', ...rest] = line.trim().split(/\s+/);
  const name = rest.join(' ');
  switch (word.toLowerCase()) {
    case 'op':
    case 'deop': {
      const on = word.toLowerCase() === 'op';
      if (!accounts.setOperator(name, on)) return console.log(`No character called "${name}".`);
      storage.saveAccounts(accounts.toData());
      // Online now: the change shows when they next connect.
      // Their connection checks the record itself, so the change holds at once for commands.
      for (const c of connections) {
        const record = accounts.list().find((r) => r.pilotId === c.character?.pilotId);
        if (record) c.character = record;
      }
      return console.log(`${name} is now ${on ? 'an operator' : 'a player'}. The server allows or refuses their admin commands from now; the menu's admin controls ${on ? 'appear' : 'go'} when they reconnect.`);
    }
    case 'stats': {
      for (const line of stats.report(performance.now())) console.log(line);
      const w = game.current;
      console.log(`World: ${Object.keys(w.ships).length} ships, ${w.projectiles.length} shots, ${w.munitions.length} missiles, ${w.asteroids.length} rocks.`);
      return;
    }
    case 'who': {
      const online = new Set([...connections].map((c) => c.character?.pilotId));
      for (const c of accounts.list()) console.log(`${c.name}${c.admin ? ' (operator)' : ''}${online.has(c.pilotId) ? ', online' : ''}`);
      return;
    }
    case 'save':
      save();
      return console.log('Saved.');
    case 'stop':
      return shutDown();
    case '':
      return;
    default:
      return console.log(CONSOLE_HELP);
  }
}

createInterface({ input: process.stdin }).on('line', consoleCommand);

// On Ctrl+C: tell everyone, save, then stop.
function shutDown(): void {
  for (const connection of connections) kick(connection, 'serverClosing');
  save();
  console.log('Saved. Goodbye.');
  process.exit(0);
}
process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);

/** The commit the server is running, printed at start so a stale server is easy to spot. "unknown" outside git. */
function serverCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}
