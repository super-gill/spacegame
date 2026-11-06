import { PROTOCOL_VERSION, type ClientMessage, type CommandReply, type KickReason, type LoginRefusal, type PilotCommand, type ServerMessage, type ShipInput, type World, type WorldEvent, type ServerKind, type WorldId, type WorldUpdate } from '@spacegame/sim';

/**
 * The client's end of the connection to the server (docs/shared-world.md).
 * It sends the pilot's controls and commands, and hands what the server
 * sends to whoever is listening. It knows nothing about drawing or the HUD.
 */

/** What a successful login brings. */
export interface Welcome {
  pilotId: string;
  name: string;
  /** The character's key, only when it was just created: show it to the player. */
  key: string | null;
  admin: boolean;
  /** Which server this is: names the persistent world (`persistentName`). */
  server: ServerKind;
}

/** In a world: which, and the whole of it as this pilot sees it. */
export interface Entered {
  world: WorldId;
  view: World;
}

export interface LinkListener {
  /** The world changed: the parts that changed and the events since the last update. */
  update(tick: number, changed: WorldUpdate, events: WorldEvent[]): void;
  /** A command's outcome (the world change itself arrives in the next update). */
  outcome(command: PilotCommand, outcome: CommandReply): void;
  /** Round trip time to the server, ms, measured every few seconds. */
  latency(ms: number): void;
  /** The connection ended: kicked with a reason, or simply lost (null). */
  closed(reason: KickReason | null): void;
}

/** How often to measure the round trip, ms. */
const PING_EVERY_MS = 2000;

/** The server's WebSocket address: the same machine and port the page came from. */
export function serverAddress(): string {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}/ws`;
}

export class Link {
  private listener: LinkListener | null = null;
  /**
   * Messages that arrived after the welcome but before anyone listened
   * (a new character reading their key, the game still loading). They
   * are replayed on `listen`: dropping an update would leave this copy of
   * the world behind the one the server thinks it has, and later updates
   * would then change ships this copy has never had.
   */
  private early: ServerMessage[] = [];
  private nextCommandId = 1;
  private readonly pending = new Map<number, PilotCommand>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private kickedFor: KickReason | null = null;
  /** Waiting for the server to say a world was entered (`enter`). */
  private entering: ((entered: Entered) => void) | null = null;

  private constructor(private readonly socket: WebSocket) {}

  /**
   * Connect and log in (with a name and key) or create a character (with
   * a name). Resolves with the welcome, or rejects with why not.
   */
  static open(how: { create: string } | { name: string; key: string }): Promise<{ link: Link; welcome: Welcome }> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(serverAddress());
      const link = new Link(socket);
      let settled = false;
      socket.addEventListener('open', () => {
        const hello: ClientMessage = 'create' in how ? { t: 'create', protocol: PROTOCOL_VERSION, name: how.create } : { t: 'login', protocol: PROTOCOL_VERSION, name: how.name, key: how.key };
        socket.send(JSON.stringify(hello));
      });
      socket.addEventListener('message', (e) => {
        const message = JSON.parse(String(e.data)) as ServerMessage;
        if (!settled) {
          if (message.t === 'welcome') {
            settled = true;
            link.startPinging();
            resolve({ link, welcome: { pilotId: message.pilotId, name: message.name, key: message.key, admin: message.admin, server: message.server } });
          } else if (message.t === 'refused') {
            settled = true;
            socket.close();
            reject(new LoginError(message.reason));
          }
          return;
        }
        link.receive(message);
      });
      socket.addEventListener('close', () => {
        if (!settled) {
          settled = true;
          reject(new LoginError('noServer'));
        }
        link.stopPinging();
        link.listener?.closed(link.kickedFor);
      });
    });
  }

  /**
   * Go into a world (the mode screen's choice); resolves with the world
   * as this pilot sees it. Updates from it follow, held until `listen`.
   */
  enter(world: WorldId): Promise<Entered> {
    return new Promise((resolve) => {
      this.entering = resolve;
      this.send({ t: 'enter', world });
    });
  }

  listen(listener: LinkListener): void {
    this.listener = listener;
    const early = this.early;
    this.early = [];
    for (const message of early) this.receive(message);
  }

  /** The pilot's controls for this tick. */
  sendInput(input: ShipInput): void {
    this.send({ t: 'input', input });
  }

  /** A pilot command; its outcome comes back to the listener. */
  sendCommand(command: PilotCommand): void {
    const id = this.nextCommandId++;
    this.pending.set(id, command);
    this.send({ t: 'command', id, command });
  }

  close(): void {
    this.socket.close();
  }

  private send(message: ClientMessage): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  private receive(message: ServerMessage): void {
    if (message.t === 'entered') {
      this.entering?.({ world: message.world, view: message.view });
      this.entering = null;
      return;
    }
    if (!this.listener && message.t !== 'kicked') {
      this.early.push(message);
      return;
    }
    switch (message.t) {
      case 'update':
        this.listener?.update(message.tick, message.changed, message.events);
        return;
      case 'outcome': {
        const command = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (command) this.listener?.outcome(command, message.outcome);
        return;
      }
      case 'pong':
        this.listener?.latency(performance.now() - message.sent);
        return;
      case 'kicked':
        this.kickedFor = message.reason;
        return;
      default:
        return;
    }
  }

  private startPinging(): void {
    const ping = (): void => this.send({ t: 'ping', sent: performance.now() });
    ping();
    this.pingTimer = setInterval(ping, PING_EVERY_MS);
  }

  private stopPinging(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
}

/** Why logging in failed: the server's reason, or no server answering. */
export class LoginError extends Error {
  constructor(readonly reason: LoginRefusal | 'noServer') {
    super(reason);
  }
}
