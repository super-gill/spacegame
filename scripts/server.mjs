#!/usr/bin/env node
/**
 * Server manager (docs/hosting.md, "Managing the server"). One place to
 * stop, update and start the game server, so hosting is one command.
 *
 *   node scripts/server.mjs update    stop, pull, install, build, start (the default)
 *   node scripts/server.mjs start     build nothing, just start
 *   node scripts/server.mjs stop      stop cleanly: everyone is told, the world is saved
 *   node scripts/server.mjs restart   stop, then start
 *   node scripts/server.mjs status    is it running?
 *   node scripts/server.mjs ships     rebuild the ship sprites from art/ships (only what changed;
 *                                      add --all for everything). Players press Ctrl+F5 to see them.
 *
 * `update` builds the sprites too (npm run build runs scripts/ships.mjs),
 * so a ship the art changed shows after the next update with nothing else
 * to do (docs/ship-pipeline.md).
 *
 * On Windows, double-click `server.bat` in the repo folder for `update`,
 * or run `server.bat stop` and so on from a terminal.
 *
 * Stopping talks to the server through its data folder: the server writes
 * `server.pid` there when it starts, and saves and exits when a
 * `stop-request` file appears (packages/server/src/main.ts). Only if it
 * has not gone after STOP_WAIT_SECONDS is it forced, which can lose up to
 * a minute of play.
 *
 * The data folder is SPACEGAME_DATA if set, else packages/server/data,
 * the same as the server's.
 */
import { execSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.SPACEGAME_DATA ?? join(REPO, 'packages', 'server', 'data');
const PID_FILE = join(DATA, 'server.pid');
const STOP_FILE = join(DATA, 'stop-request');
const STOP_WAIT_SECONDS = 20;

function say(text) {
  console.log(`[server] ${text}`);
}

/** Run a command in the repo, showing its output. Returns true if it worked. */
function run(command) {
  say(`> ${command}`);
  const result = spawnSync(command, { cwd: REPO, stdio: 'inherit', shell: true });
  return result.status === 0;
}

/** The running server's process id, or null if none is running (a stale pid file is cleared). */
function runningPid() {
  if (!existsSync(PID_FILE)) return null;
  const pid = Number(readFileSync(PID_FILE, 'utf8').trim());
  try {
    process.kill(pid, 0);
    return pid;
  } catch {
    unlinkSync(PID_FILE);
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ask the server to stop, wait for it, and force it only if it does not go. */
async function stop() {
  const pid = runningPid();
  if (!pid) return say('Not running.');
  say(`Stopping (process ${pid}): everyone is told, the world is saved...`);
  writeFileSync(STOP_FILE, 'stop', 'utf8');
  for (let i = 0; i < STOP_WAIT_SECONDS * 4; i++) {
    await sleep(250);
    if (!runningPid()) return say('Stopped.');
  }
  say(`Still running after ${STOP_WAIT_SECONDS} seconds: forcing it. The last minute of play may be lost.`);
  try {
    process.kill(pid);
  } catch {
    // Gone in the meantime.
  }
  if (existsSync(STOP_FILE)) unlinkSync(STOP_FILE);
}

/** Pull the newest code. Skipped, with a note, when git is not installed (GitHub Desktop keeps its own). */
function pull() {
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    say('git is not on this computer\'s PATH, so nothing was pulled. Pull in GitHub Desktop first, then run this again.');
    return true;
  }
  if (run('git pull --ff-only')) return true;
  say('The pull failed (local changes in the repo, or no network). Nothing was changed; the server was not started.');
  return false;
}

/** Start the server in this window. Returns when it stops. */
function start() {
  const pid = runningPid();
  if (pid) return say(`Already running (process ${pid}). Use "restart" to restart it.`);
  say('Starting. Ctrl+C or "server stop" from another window stops it cleanly.');
  const child = spawn('npm start', { cwd: REPO, stdio: 'inherit', shell: true });
  child.on('exit', (code) => process.exit(code ?? 0));
}

async function update() {
  await stop();
  if (!pull()) return process.exit(1);
  if (!run('npm install')) return process.exit(1);
  if (!run('npm run build')) return process.exit(1);
  say('Updated. Players need Ctrl+F5 if the client changed.');
  start();
}

const command = process.argv[2] ?? 'update';
switch (command) {
  case 'update':
    await update();
    break;
  case 'start':
    start();
    break;
  case 'stop':
    await stop();
    break;
  case 'restart':
    await stop();
    start();
    break;
  case 'ships':
    // The server serves the built client, so rebuild it after the sprites for them to go out.
    if (!run(`npm run ships${process.argv.includes('--all') ? ' -- --all' : ''}`)) process.exit(1);
    if (!run('npm run build --workspace=@spacegame/client')) process.exit(1);
    say('Ship sprites rebuilt. No restart needed; players press Ctrl+F5 to see them.');
    break;
  case 'status': {
    const pid = runningPid();
    say(pid ? `Running (process ${pid}). Data in ${DATA}.` : 'Not running.');
    break;
  }
  default:
    say(`Unknown command "${command}". Use update, start, stop, restart, status or ships.`);
    process.exit(1);
}
