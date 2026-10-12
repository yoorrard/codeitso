// dist/를 띄우는 아주 작은 정적 서버 (의존성 없음). 시각 점검과 e2e가 함께 쓴다.
//   node scripts/qa/serve.ts [포트]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { ROOT } from '../lib/load-data.ts';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

export function resolveFile(dist: string, urlPath: string): string | null {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0]?.split('#')[0] ?? '/')).replace(/^(\.\.[/\\])+/, '');
  const candidates = [join(dist, clean), join(dist, clean, 'index.html'), join(dist, `${clean}.html`)];
  for (const c of candidates) {
    if (c.startsWith(dist) && existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

export function startServer(port = 4321, dist = join(ROOT, 'dist')): Promise<Server> {
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/event') {
      res.writeHead(204).end();
      return;
    }
    const file = resolveFile(dist, req.url ?? '/');
    const notFound = join(dist, '404.html');
    if (!file) {
      res.writeHead(404, { 'content-type': TYPES['.html'] ?? 'text/html' });
      if (existsSync(notFound)) createReadStream(notFound).pipe(res);
      else res.end('404');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1]?.endsWith('serve.ts')) {
  const port = Number(process.argv[2] ?? 4321);
  void startServer(port).then(() => console.log(`dist를 http://127.0.0.1:${port} 에서 띄웠다`));
}
