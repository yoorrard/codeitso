// dist/를 띄우는 아주 작은 정적 서버 (의존성 없음). 시각 점검과 e2e가 함께 쓴다.
//   node scripts/qa/serve.ts [포트] [--base /code-chauffeur] [--dist 폴더]
// --base를 주면 GitHub Pages 프로젝트 사이트처럼 그 하위 주소에서만 띄우고, 바탕 밖 주소는 404로 돌려준다
// (바탕이 빠진 링크를 e2e가 잡게, 설계서 9.4절). --dist는 빌드 폴더 (기본 dist/, 바탕 빌드는 .qa/dist-base).
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { extname, isAbsolute, join, normalize } from 'node:path';
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

/** 바탕을 뗀 요청 주소. 바탕 밖이면 null (루트 바탕 ''이면 그대로) */
export function underBase(url: string, base: string): string | null {
  if (base === '') return url;
  const path = url.split(/[?#]/)[0] ?? '';
  if (path === base) return `/${url.slice(base.length)}`;
  return url.startsWith(`${base}/`) ? url.slice(base.length) : null;
}

export function startServer(port = 4321, dist = join(ROOT, 'dist'), base = ''): Promise<Server> {
  const server = createServer((req, res) => {
    const url = underBase(req.url ?? '/', base);
    if (req.method === 'POST' && url === '/api/event') {
      res.writeHead(204).end();
      return;
    }
    const file = url === null ? null : resolveFile(dist, url);
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

/** 명령줄: [포트] [--base /바탕] [--dist 폴더] */
export function serveArgs(argv: readonly string[]): { port: number; base: string; dist: string } {
  const opt = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const skip = new Set(['--base', '--dist'].flatMap((n) => [argv.indexOf(n), argv.indexOf(n) + 1]).filter((i) => i > 0));
  const port = argv.find((a, i) => !skip.has(i) && /^\d+$/.test(a));
  const dist = opt('--dist');
  return {
    port: Number(port ?? 4321),
    base: (opt('--base') ?? '').replace(/\/+$/, ''),
    dist: dist ? (isAbsolute(dist) ? dist : join(ROOT, dist)) : join(ROOT, 'dist'),
  };
}

if (process.argv[1]?.endsWith('serve.ts')) {
  const { port, base, dist } = serveArgs(process.argv.slice(2));
  void startServer(port, dist, base).then(() => console.log(`${dist}를 http://127.0.0.1:${port}${base}/ 에서 띄웠다`));
}
