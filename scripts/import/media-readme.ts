// 저장소 README의 첫 그림 (v5.1 D126, 소유자 요청 3): 오픈소스·템플릿·AI 프레임워크처럼 GitHub·GitLab에 있는 상품마다
// README에서 '무엇을 만드는지 보이는' 첫 그림(화면 갈무리·시연 GIF·머리 그림)을 골라 data/catalog-media/readme-images.json에 쓴다.
// 배지·방패·후원 로고·작은 아이콘·아바타는 건너뛴다. 진열대 빌드가 이 파일을 카드·상세 그림으로 붙인다 (scripts/catalog/load.ts).
//   node scripts/import/media-readme.ts            (아직 안 본 상품만)
//   node scripts/import/media-readme.ts --refresh  (모두 다시)
// README는 raw.githubusercontent.com의 HEAD(기본 가지), GitLab은 프로젝트 API의 기본 가지에서 받는다. 동시 요청 수를 정하고, 429·5xx는 쉬었다가 다시.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { blockedImage } from '../../src/lib/catalog/hosts.ts';
import { CATALOG_DIR, FETCHED_AT, ROOT, fetchRaw, main, mapLimit, progress } from './oss-lib.ts';

export const MEDIA_FILE = join(ROOT, 'data', 'catalog-media', 'readme-images.json');

export interface MediaFile {
  fetchedAt: string;
  note?: string;
  /** 상품 id → 고른 그림 주소 */
  images: Record<string, string>;
  /** 고른 그림이 움직이는 GIF일 때 카드에 쓸 멈춘 그림 (있으면) */
  stills: Record<string, string>;
  /** README를 봤지만 쓸 그림이 없던 상품 (다음에 건너뛴다) */
  none: string[];
}

export interface RepoRef {
  host: 'github' | 'gitlab';
  owner: string;
  repo: string;
  /** 가지 이름, 모르면 HEAD */
  ref: string;
  /** README가 있는 하위 폴더 (예: examples/blog), 없으면 '' */
  dir: string;
}

const NOT_REPO = new Set(['orgs', 'topics', 'explore', 'sponsors', 'marketplace', 'features', 'collections', 'apps', 'about', 'search', 'users', 'groups']);

/** github.com·gitlab.com 저장소 주소 → 저장소 (tree/<가지>/<폴더> 포함) */
export function parseRepoUrl(url: string): RepoRef | null {
  const m = /^https?:\/\/(?:www\.)?(github|gitlab)\.com\/([^/?#]+)\/([^/?#]+)(?:\/(?:-\/)?tree\/([^/?#]+)(?:\/([^?#]*))?)?\/?(?:[?#].*)?$/i.exec(url.trim());
  if (!m) return null;
  const [, host = '', owner = '', rawRepo = '', ref, dir] = m;
  if (NOT_REPO.has(owner.toLowerCase())) return null;
  const repo = rawRepo.replace(/\.git$/i, '');
  if (!repo) return null;
  return { host: host.toLowerCase() === 'gitlab' ? 'gitlab' : 'github', owner, repo, ref: ref ?? 'HEAD', dir: (dir ?? '').replace(/\/+$/, '') };
}

interface ItemLike {
  id: string;
  kind: string;
  url: string;
  preview: { type: string; [k: string]: unknown };
}

const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** 상품이 가리키는 저장소: repoUrl(패키지) → repo(주소) → fullName → repo(owner/name + host) → 상품 주소 */
export function repoRefOf(item: ItemLike): RepoRef | null {
  const p = item.preview;
  for (const u of [s(p['repoUrl']), s(p['repo']), s(p['source'])]) {
    if (/^https?:\/\//.test(u)) {
      const r = parseRepoUrl(u);
      if (r) return r;
    }
  }
  const short = /^[\w.-]+\/[\w.-]+$/;
  const host = s(p['host']);
  for (const name of [s(p['fullName']), s(p['repo'])]) {
    if (!short.test(name)) continue;
    if (host === 'codeberg' || host === 'other') return null;
    const [owner = '', repo = ''] = name.split('/');
    const dir = s(p['path']).replace(/^\/+|\/+$/g, '');
    return { host: host === 'gitlab' ? 'gitlab' : 'github', owner, repo, ref: 'HEAD', dir };
  }
  return parseRepoUrl(item.url);
}

/** README를 볼 상품: 저장소·템플릿 (워크플로 템플릿은 플랫폼 저장소 하나를 같이 가리켜 빼고 노드 그림을 그린다) */
export function wantsReadme(item: ItemLike): boolean {
  return (item.preview.type === 'repo' || item.preview.type === 'template') && item.kind !== 'workflow';
}

export interface ImageCandidate {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  at: number;
}

/** README(마크다운·HTML·reST) 속 그림을 나온 차례대로. 주석·코드 덩어리 안의 것은 빼고, 주소는 아직 풀지 않는다 */
export function extractImages(text: string): ImageCandidate[] {
  const body = text.replace(/<!--[\s\S]*?-->/g, (x) => ' '.repeat(x.length)).replace(/^(```|~~~)[\s\S]*?^\1/gm, (x) => ' '.repeat(x.length));
  const out: ImageCandidate[] = [];
  const attr = (tag: string, name: string): string | undefined => {
    const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
    return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
  };
  const size = (v: string | undefined): number | undefined => (v && /^\d+(px)?$/.test(v.trim()) ? Number.parseInt(v, 10) : undefined);
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const url = attr(tag, 'data-canonical-src') ?? attr(tag, 'src');
    if (!url) continue;
    const c: ImageCandidate = { url, alt: attr(tag, 'alt') ?? '', at: m.index };
    const w = size(attr(tag, 'width'));
    const h = size(attr(tag, 'height'));
    if (w !== undefined) c.width = w;
    if (h !== undefined) c.height = h;
    out.push(c);
  }
  for (const m of body.matchAll(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g)) out.push({ url: m[2] ?? '', alt: m[1] ?? '', at: m.index });
  const defs = new Map<string, string>();
  for (const m of body.matchAll(/^\s{0,3}\[([^\]]+)\]:\s*<?(\S+?)>?(?:\s+.*)?$/gm)) defs.set((m[1] ?? '').toLowerCase(), m[2] ?? '');
  for (const m of body.matchAll(/!\[([^\]]*)\]\[([^\]]*)\]/g)) {
    const url = defs.get((m[2] || m[1] || '').toLowerCase());
    if (url) out.push({ url, alt: m[1] ?? '', at: m.index });
  }
  for (const m of body.matchAll(/^\.\.\s+(?:image|figure)::\s*(\S+)/gm)) out.push({ url: m[1] ?? '', alt: '', at: m.index });
  return out.filter((c) => c.url !== '').sort((a, b) => a.at - b.at);
}

/** README 안의 그림 주소를 절대 주소로: 상대 경로는 README 폴더(또는 저장소 뿌리) 기준, GitHub blob 주소는 raw 주소로 */
export function resolveImage(src: string, base: string, root: string): string | null {
  let u = src.trim().replace(/&amp;/g, '&');
  if (/^data:|^#|^mailto:/i.test(u)) return null;
  if (u.startsWith('//')) u = `https:${u}`;
  else if (u.startsWith('/')) u = root + u.slice(1);
  let abs: URL;
  try {
    abs = new URL(u, base);
  } catch {
    return null;
  }
  if (abs.protocol === 'http:') abs.protocol = 'https:';
  if (abs.protocol !== 'https:') return null;
  const gh = /^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/.exec(abs.pathname);
  if (abs.hostname === 'github.com' && gh) return `https://raw.githubusercontent.com/${gh[1]}/${gh[2]}/${gh[3]}`;
  if (abs.hostname === 'gitlab.com') abs.pathname = abs.pathname.replace('/-/blob/', '/-/raw/');
  const out = abs.toString();
  return /^https:\/\/[^\s"'<>()]+$/.test(out) && out.length <= 600 ? out : null;
}

const JUNK = /badge|shields|button|widget|standwith|stand-with|ukraine|lighthouse|license|creativecommons|cc-by|cc-zero|\/workflows\/|build[-_]?status|coverage|sponsor|backer|donat|buy[-_]?me|kofi|ko-fi|patreon|paypal|discord|twitter|x-logo|deploy[-_]?(to|button|with|on)|open[-_]?in|colab|binder|star[-_]?history|stargazers|contrib|avatar|npm[-_]?version|downloads|visitor|counter|trendshift|producthunt|featured|follow|telegram|wechat|qrcode|qr[-_]?code|appstore|app-store|google-play|get[-_]?it[-_]?on|play[-_]?store|made[-_]?with|powered[-_]?by|built[-_]?with/i;
const JUNK_ALT = /badge|build status|coverage|license|\bversion\b|downloads|sponsor|backer|donat|contributor|star history|\bstars?\b|discord|twitter|follow (us|me)|\bchat\b|\bnpm\b|pypi|deploy (to|with|on)|open in|^ci$|ci status|trendshift|product hunt|featured on|qr code|app store|google play|powered by|made with|built with/i;
const LOGO = /logo|icon|favicon|brand|emblem|wordmark|lockup/i;
const VIDEO = /\.(mp4|webm|mov|m4v)([?#]|$)/i;

export const isAnimated = (url: string): boolean => /\.gif([?#]|$)/i.test(url);
const isLogo = (c: { url: string; alt: string }): boolean => LOGO.test(c.alt) || LOGO.test(c.url.split('/').slice(-2).join('/'));

/** 쓸 만한 그림인가: 배지·방패·후원·아바타·방문 수·영상·작은 아이콘이 아니다 */
export function meaningful(c: ImageCandidate, url: string): boolean {
  if (blockedImage(url) || VIDEO.test(url)) return false;
  const path = url.replace(/^https:\/\/[^/]+/, '');
  if (JUNK.test(path) || JUNK_ALT.test(c.alt)) return false;
  if ((c.width !== undefined && c.width < 100) || (c.height !== undefined && c.height < 48)) return false;
  return true;
}

/** README 글과 기준 주소로 그림 고르기: 앞 8개 중 로고가 아닌 첫 그림, 없으면 첫 로고. GIF면 멈춘 그림도 하나 */
export function pickImage(text: string, base: string, root: string): { src: string; still?: string } | null {
  const cands: { url: string; alt: string }[] = [];
  for (const c of extractImages(text)) {
    const url = resolveImage(c.url, base, root);
    if (!url || !meaningful(c, url) || cands.some((x) => x.url === url)) continue;
    cands.push({ url, alt: c.alt });
    if (cands.length === 8) break;
  }
  const chosen = cands.find((c) => !isLogo(c)) ?? cands[0];
  if (!chosen) return null;
  if (!isAnimated(chosen.url)) return { src: chosen.url };
  const still = cands.find((c) => !isLogo(c) && !isAnimated(c.url));
  return still ? { src: chosen.url, still: still.url } : { src: chosen.url };
}

const NAMES = ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.markdown', 'README.rst', 'README'];

async function getText(url: string): Promise<string | null> {
  const res = await fetchRaw(url, { allowStatus: [404, 400, 403, 410, 451], retries: 4, timeoutMs: 30_000 });
  if (!res.ok) {
    await res.body?.cancel();
    return null;
  }
  const text = await res.text();
  return text.slice(0, 400_000);
}

/** README 글과 그 폴더 주소(상대 경로 기준), 저장소 뿌리 주소 */
async function readmeOf(r: RepoRef): Promise<{ text: string; base: string; root: string } | null> {
  const sub = r.dir ? `${r.dir}/` : '';
  if (r.host === 'github') {
    const root = `https://raw.githubusercontent.com/${r.owner}/${r.repo}/${r.ref}/`;
    for (const name of NAMES) {
      const text = await getText(`${root}${sub}${name}`);
      if (text !== null) return { text, base: `${root}${sub}`, root };
    }
    return null;
  }
  const project = `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${r.owner}/${r.repo}`)}`;
  const metaText = await getText(project);
  if (metaText === null) return null;
  let meta: { default_branch?: string; readme_url?: string | null };
  try {
    meta = JSON.parse(metaText) as typeof meta;
  } catch {
    return null;
  }
  const branch = r.ref !== 'HEAD' ? r.ref : (meta.default_branch ?? 'main');
  const root = `https://gitlab.com/${r.owner}/${r.repo}/-/raw/${branch}/`;
  const tries = !r.dir && meta.readme_url ? [meta.readme_url.replace('/-/blob/', '/-/raw/')] : NAMES.map((n) => `${root}${sub}${n}`);
  for (const url of tries) {
    const text = await getText(url);
    if (text !== null) return { text, base: url.slice(0, url.lastIndexOf('/') + 1), root };
  }
  return null;
}

function readItems(): ItemLike[] {
  const out: ItemLike[] = [];
  for (const cat of readdirSync(CATALOG_DIR).sort()) {
    const dir = join(CATALOG_DIR, cat);
    if (!existsSync(join(dir, 'index.json'))) continue;
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'index.json').sort()) {
      const file = JSON.parse(readFileSync(join(dir, name), 'utf8')) as { items?: ItemLike[] };
      if (Array.isArray(file.items)) out.push(...file.items);
    }
  }
  return out;
}

export function readMedia(file: string = MEDIA_FILE): MediaFile {
  if (!existsSync(file)) return { fetchedAt: '', images: {}, stills: {}, none: [] };
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<MediaFile>;
  return { fetchedAt: raw.fetchedAt ?? '', images: raw.images ?? {}, stills: raw.stills ?? {}, none: raw.none ?? [] };
}

const sortObj = (o: Record<string, string>): Record<string, string> => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k] ?? '']));

main(async () => {
  const refresh = process.argv.includes('--refresh');
  const prev = readMedia();
  const items = readItems().filter(wantsReadme);
  const targets = new Map<string, RepoRef>();
  for (const it of items) {
    const r = repoRefOf(it);
    if (r) targets.set(it.id, r);
  }
  const done = new Set([...Object.keys(prev.images), ...prev.none]);
  const todo = [...targets.entries()].filter(([id]) => refresh || !done.has(id));
  console.log(`README 그림: 저장소 상품 ${targets.size}개 중 ${todo.length}개를 본다${refresh ? ' (모두 다시)' : ''}`);
  const images: Record<string, string> = {};
  const stills: Record<string, string> = {};
  const none = new Set<string>();
  if (!refresh) {
    // 지난번 결과 중 아직 진열대에 있는 것만 남긴다
    const prevNone = new Set(prev.none);
    for (const id of targets.keys()) {
      const img = prev.images[id];
      if (img) images[id] = img;
      const still = prev.stills[id];
      if (still) stills[id] = still;
      if (prevNone.has(id)) none.add(id);
    }
  }
  type Picked = { src: string; still?: string } | null | 'failed';
  const byKey = new Map<string, Promise<Picked>>();
  let n = 0;
  let failed = 0;
  await mapLimit(todo, 24, async ([id, r]) => {
    const key = `${r.host}:${r.owner}/${r.repo}@${r.ref}/${r.dir}`.toLowerCase();
    let job = byKey.get(key);
    if (!job) {
      job = readmeOf(r).then(
        (rd): Picked => (rd ? pickImage(rd.text, rd.base, rd.root) : null),
        (): Picked => 'failed', // 네트워크 실패: 기록하지 않아 다음에 다시 본다
      );
      byKey.set(key, job);
    }
    const got = await job;
    if (got === 'failed') failed += 1;
    else if (got) {
      images[id] = got.src;
      if (got.still) stills[id] = got.still;
      else delete stills[id];
      none.delete(id);
    } else {
      none.add(id);
      delete images[id];
      delete stills[id];
    }
    progress('README', (n += 1), todo.length, 500);
  });
  const out: MediaFile = {
    fetchedAt: FETCHED_AT,
    note: 'scripts/import/media-readme.ts가 저장소 README에서 고른 첫 그림 (배지·아바타·후원 로고 제외). 손으로 고치지 않는다.',
    images: sortObj(images),
    stills: sortObj(stills),
    none: [...none].sort(),
  };
  mkdirSync(dirname(MEDIA_FILE), { recursive: true });
  writeFileSync(MEDIA_FILE, `${JSON.stringify(out, null, 1)}\n`);
  console.log(`그림 ${Object.keys(images).length}개 · 멈춘 그림 ${Object.keys(stills).length}개 · 그림 없음 ${none.size}개 · 받기 실패 ${failed}개 → ${MEDIA_FILE}`);
});
