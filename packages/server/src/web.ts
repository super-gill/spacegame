import { existsSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

/**
 * Serves the built client (`packages/client/dist`) so friends need only
 * the server's address. Plain files, nothing clever: build the client
 * first (`npm run build`).
 */

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function serveClient(folder: string): (request: IncomingMessage, response: ServerResponse) => void {
  const root = normalize(folder);
  return (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    let path = normalize(join(root, decodeURIComponent(url.pathname)));
    // Never serve anything outside the client folder.
    if (path !== root && !path.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
    if (!existsSync(path)) {
      response.writeHead(404, { 'content-type': 'text/plain' }).end(existsSync(join(root, 'index.html')) ? 'Not found' : 'The client is not built: run npm run build');
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    response.end(readFileSync(path));
  };
}
