import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, isAbsolute, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';

const siteRoot = fileURLToPath(new URL('./dist/', import.meta.url));
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// Preview the same static directory at either / or a GitHub Pages project path.
export function createPreviewServer({base = '/'} = {}) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) {
    throw new Error('Base must be / or a path such as /FarmSolver/.');
  }
  return http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (base !== '/' && pathname === base.slice(0, -1)) {
        res.writeHead(308, {Location: base}).end();
        return;
      }
      if (!pathname.startsWith(base)) {
        res.writeHead(404).end('Not found');
        return;
      }
      const filename = pathname.slice(base.length) || 'index.html';
      const target = resolve(siteRoot, filename);
      const withinRoot = relative(siteRoot, target);
      if (withinRoot.startsWith('..') || isAbsolute(withinRoot)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const data = await readFile(target);
      res.writeHead(200, {
        'Content-Type': contentTypes[extname(target)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const {values} = parseArgs({options: {
    base: {type: 'string', default: '/'},
    port: {type: 'string', default: '4173'},
  }});
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
  createPreviewServer({base: values.base}).listen(port, '127.0.0.1', () => {
    console.log(`Local: http://127.0.0.1:${port}${values.base}`);
  });
}
