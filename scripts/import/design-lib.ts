// 디자인 진열대 가져오기 공용 도우미 (scripts/import/design-*.ts만 쓴다).
// 네트워크 요청(다시 시도·쉬어 가기), 동시 실행 묶음, GitHub 저장소 정보, 상품 모양 맞추기, 정렬된 JSON 쓰기.
// 프록시 뒤에서 돌릴 때: NODE_USE_ENV_PROXY=1 node scripts/import/design-fonts.ts
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_DIR = join(ROOT, 'data', 'catalog', 'design');
export const CATEGORY = 'design';
// 같은 날 다시 돌리면 같은 결과가 나오게 날짜만 쓴다. IMPORT_DATE로 고정할 수 있다.
export const FETCHED_AT = process.env.IMPORT_DATE ?? new Date().toISOString().slice(0, 10);
export const USER_AGENT = 'codeshopper-catalog-import/1.0 (design shelf; https://github.com/yoorrard/code-chauffeur)';

export type PreviewType =
  | 'font' | 'palette' | 'icons' | 'style' | 'repo' | 'model' | 'dataset' | 'api'
  | 'skill' | 'mcp' | 'site' | 'template' | 'asset' | 'prompt';

export interface Preview {
  type: PreviewType;
  [field: string]: unknown;
}

export interface Item {
  id: string;
  name: string;
  kind: string;
  category: string;
  summary: string;
  summaryKo?: string;
  written?: 'codeshopper';
  url: string;
  source: { name: string; url: string };
  license?: string;
  /** views·trend·siteRank는 인기 점수용 (D133, scripts/import/signals.ts) */
  metrics?: { stars?: number; downloads?: number; likes?: number; views?: number; trend?: number; siteRank?: number; updatedAt?: string };
  tags: string[];
  preview?: Preview;
  use?: { install?: string; snippet?: string; docs?: string };
  fetchedAt: string;
}

export interface SourceInfo {
  id: string; // 파일 이름 (data/catalog/design/<id>.json)
  name: string;
  url: string;
  license: string; // 목록 메타데이터를 싣는 근거 (자료 자체의 라이선스나 이용 조건)
  note?: string;
}

export interface CatalogFile {
  source: SourceInfo;
  fetchedAt: string;
  count: number;
  items: Item[];
}

// ---------- 네트워크 ----------

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface FetchOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  retries?: number;
  timeoutMs?: number;
  allowStatus?: number[]; // 이 상태는 오류로 보지 않고 그대로 돌려준다 (예: 404)
}

export async function fetchRaw(url: string, opts: FetchOptions = {}): Promise<Response> {
  const retries = opts.retries ?? 5;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: opts.method ?? 'GET',
        body: opts.body,
        headers: { 'user-agent': USER_AGENT, accept: '*/*', ...opts.headers },
        redirect: 'follow',
        signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
      });
      if (res.ok || opts.allowStatus?.includes(res.status)) return res;
      // 429·5xx는 쉬었다가 다시. Retry-After가 있으면 따른다.
      if (res.status === 429 || res.status >= 500) {
        const after = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(after) && after > 0 ? after * 1000 : 1000 * 2 ** attempt;
        await res.body?.cancel();
        await sleep(Math.min(wait, 60_000));
        lastError = new Error(`${res.status} ${url}`);
        continue;
      }
      await res.body?.cancel();
      throw new HttpError(res.status, url);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      lastError = err;
      await sleep(Math.min(1000 * 2 ** attempt, 30_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`fetch failed: ${url}`);
}

export class HttpError extends Error {
  status: number;
  url: string;
  constructor(status: number, url: string) {
    super(`HTTP ${status} ${url}`);
    this.status = status;
    this.url = url;
  }
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const res = await fetchRaw(url, opts);
  return res.text();
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  let text = await fetchText(url, { ...opts, headers: { accept: 'application/json', ...opts.headers } });
  // Google Fonts 메타데이터는 앞에 )]}' 가 붙는다.
  if (text.startsWith(")]}'")) text = text.slice(4);
  return JSON.parse(text) as T;
}

// 동시 실행 개수를 정해 차례로 돈다. 결과 순서는 입력 순서와 같다.
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i] as T, i);
    }
  });
  await Promise.all(workers);
  return out;
}

export function progress(label: string, done: number, total: number): void {
  if (done === total || done % 100 === 0) console.log(`  ${label} ${done}/${total}`);
}

// ---------- GitHub 저장소 정보 ----------
// 1) gh CLI(로그인됨) → 2) GITHUB_TOKEN으로 REST → 3) repos.ecosyste.ms(공개 미러, 익명 5000회/시간).

export interface RepoMeta {
  fullName: string;
  description: string;
  stars: number;
  license?: string;
  homepage?: string;
  language?: string;
  topics: string[];
  pushedAt?: string;
  archived: boolean;
  fork: boolean;
  via: 'gh' | 'github' | 'ecosystems';
}

let ghWorks: boolean | undefined;
function ghAvailable(): boolean {
  if (ghWorks !== undefined) return ghWorks;
  try {
    execFileSync('gh', ['api', 'rate_limit', '--jq', '.resources.core.remaining'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 20_000 });
    ghWorks = true;
  } catch {
    ghWorks = false;
  }
  return ghWorks;
}

let githubRestWorks = true;

interface GithubRepoJson {
  full_name: string; description: string | null; stargazers_count: number;
  license: { spdx_id: string | null } | null; homepage: string | null; language: string | null;
  topics?: string[]; pushed_at: string | null; archived: boolean; fork: boolean;
}

interface EcoRepoJson {
  full_name: string; description: string | null; stargazers_count: number; license: string | null;
  homepage: string | null; language: string | null; topics: string[] | null; pushed_at: string | null;
  archived: boolean; fork: boolean;
}

function fromGithub(j: GithubRepoJson, via: 'gh' | 'github'): RepoMeta {
  const spdx = j.license?.spdx_id;
  return {
    fullName: j.full_name,
    description: j.description ?? '',
    stars: j.stargazers_count,
    license: spdx && spdx !== 'NOASSERTION' ? spdx : undefined,
    homepage: j.homepage || undefined,
    language: j.language ?? undefined,
    topics: j.topics ?? [],
    pushedAt: j.pushed_at?.slice(0, 10),
    archived: j.archived,
    fork: j.fork,
    via,
  };
}

const SPDX_FIX: Record<string, string> = {
  mit: 'MIT', 'apache-2.0': 'Apache-2.0', 'bsd-3-clause': 'BSD-3-Clause', 'bsd-2-clause': 'BSD-2-Clause',
  'gpl-3.0': 'GPL-3.0', 'gpl-2.0': 'GPL-2.0', 'agpl-3.0': 'AGPL-3.0', 'lgpl-3.0': 'LGPL-3.0', 'lgpl-2.1': 'LGPL-2.1',
  'mpl-2.0': 'MPL-2.0', isc: 'ISC', unlicense: 'Unlicense', 'cc0-1.0': 'CC0-1.0', 'cc-by-4.0': 'CC-BY-4.0',
  'cc-by-sa-4.0': 'CC-BY-SA-4.0', 'ofl-1.1': 'OFL-1.1', '0bsd': '0BSD', wtfpl: 'WTFPL', zlib: 'Zlib',
  'epl-2.0': 'EPL-2.0', 'bsl-1.0': 'BSL-1.0', 'artistic-2.0': 'Artistic-2.0', 'ms-pl': 'MS-PL', 'cc-by-3.0': 'CC-BY-3.0',
};

export function normalizeSpdx(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const k = raw.trim().toLowerCase();
  if (!k || k === 'other' || k === 'noassertion') return undefined;
  return SPDX_FIX[k] ?? raw.trim();
}

function fromEco(j: EcoRepoJson): RepoMeta {
  return {
    fullName: j.full_name,
    description: j.description ?? '',
    stars: j.stargazers_count,
    license: normalizeSpdx(j.license),
    homepage: j.homepage || undefined,
    language: j.language ?? undefined,
    topics: j.topics ?? [],
    pushedAt: j.pushed_at?.slice(0, 10),
    archived: j.archived,
    fork: j.fork,
    via: 'ecosystems',
  };
}

export async function repoMeta(fullName: string): Promise<RepoMeta | undefined> {
  if (ghAvailable()) {
    try {
      const out = execFileSync('gh', ['api', `repos/${fullName}`], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000 }).toString();
      return fromGithub(JSON.parse(out) as GithubRepoJson, 'gh');
    } catch {
      /* 없는 저장소거나 실패: 다음 방법으로 */
    }
  }
  const token = process.env.GITHUB_TOKEN;
  if (token && githubRestWorks) {
    try {
      const res = await fetchRaw(`https://api.github.com/repos/${fullName}`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
        allowStatus: [404, 403],
        retries: 3,
      });
      if (res.status === 200) return fromGithub((await res.json()) as GithubRepoJson, 'github');
      if (res.status === 403) githubRestWorks = false;
      await res.body?.cancel();
    } catch {
      /* 다음 방법으로 */
    }
  }
  const res = await fetchRaw(`https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/${encodeURIComponent(fullName)}`, {
    allowStatus: [404],
    retries: 4,
  });
  if (res.status === 404) {
    await res.body?.cancel();
    return undefined;
  }
  return fromEco((await res.json()) as EcoRepoJson);
}

// GitHub 주제 검색(별 순). gh나 GITHUB_TOKEN이 있을 때만 된다. 없으면 빈 배열과 함께 알린다.
export async function searchTopic(topic: string, minStars: number): Promise<{ names: string[]; available: boolean }> {
  const q = `topic:${topic} stars:>=${minStars} fork:false archived:false`;
  const names: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const path = `search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=100&page=${page}`;
    let json: { items: { full_name: string }[]; total_count: number } | undefined;
    if (ghAvailable()) {
      try {
        json = JSON.parse(execFileSync('gh', ['api', path], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000 }).toString());
      } catch {
        json = undefined;
      }
    }
    if (!json && process.env.GITHUB_TOKEN) {
      const res = await fetchRaw(`https://api.github.com/${path}`, {
        headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' },
        allowStatus: [403, 422],
      });
      if (res.status === 200) json = (await res.json()) as typeof json;
      else await res.body?.cancel();
    }
    if (!json) return { names, available: page > 1 };
    for (const it of json.items) names.push(it.full_name);
    if (json.items.length < 100 || names.length >= json.total_count) break;
    await sleep(2500); // 검색 API는 분당 30회
  }
  return { names, available: true };
}

// ---------- 글 다듬기 ----------

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', hellip: '…', middot: '·' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k in ENTITIES) return ENTITIES[k] as string;
    if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10));
    return m;
  });
}

export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, ' ').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

// 원문을 300자 안으로. 문장 끝에서 자르고, 안 되면 낱말 끝에서 자르고 …를 붙인다.
export function clip(text: string, max = 300): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('다. '));
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1).trim();
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 로캘과 무관한 비교 (localeCompare를 쓰지 않는다).
export function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function uniqSorted(xs: Iterable<string>): string[] {
  return [...new Set([...xs].map((x) => x.trim()).filter(Boolean))].sort(cmp);
}

// ---------- 상품 모양 ----------

export function makeItem(x: Omit<Item, 'category' | 'fetchedAt'> & { fetchedAt?: string }): Item {
  if (!x.summary) throw new Error(`summary 비었음: ${x.id}`);
  // 키 순서를 고정해 다시 돌려도 같은 파일이 나오게 한다.
  const item: Item = {
    id: safeId(x.id),
    name: x.name,
    kind: x.kind,
    category: CATEGORY,
    summary: clip(x.summary),
    ...(x.summaryKo ? { summaryKo: x.summaryKo } : {}),
    ...(x.written ? { written: x.written } : {}),
    url: x.url,
    source: { name: x.source.name, url: x.source.url },
    ...(x.license ? { license: x.license } : {}),
    ...(x.metrics && Object.values(x.metrics).some((v) => v !== undefined) ? { metrics: cleanMetrics(x.metrics) } : {}),
    tags: uniqSorted(x.tags.map((t) => t.toLowerCase())),
    ...(x.preview ? { preview: x.preview } : {}),
    ...(x.use && Object.values(x.use).some(Boolean) ? { use: cleanUse(x.use) } : {}),
    fetchedAt: x.fetchedAt ?? FETCHED_AT,
  };
  return item;
}

// id는 '<출처>:<슬러그>'. 슬러그는 주소 한 칸에 그대로 넣을 수 있게 소문자·숫자·점·하이픈만 남긴다
// (GitHub 'owner/repo' → 'owner--repo', 밑줄 → 하이픈).
export function safeId(id: string): string {
  const i = id.indexOf(':');
  if (i <= 0) throw new Error(`id에 출처가 없다: ${id}`);
  const src = id.slice(0, i).toLowerCase();
  const slug = id
    .slice(i + 1)
    .toLowerCase()
    .replace(/\//g, '--')
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error(`id 슬러그가 비었다: ${id}`);
  return `${src}:${slug}`;
}

function cleanMetrics(m: NonNullable<Item['metrics']>): NonNullable<Item['metrics']> {
  const out: NonNullable<Item['metrics']> = {};
  if (m.stars !== undefined) out.stars = m.stars;
  if (m.downloads !== undefined) out.downloads = m.downloads;
  if (m.likes !== undefined) out.likes = m.likes;
  if (m.views !== undefined) out.views = m.views;
  if (m.trend !== undefined && m.trend > 0) out.trend = m.trend;
  if (m.siteRank !== undefined) out.siteRank = m.siteRank;
  if (m.updatedAt) out.updatedAt = m.updatedAt;
  return out;
}

function cleanUse(u: NonNullable<Item['use']>): NonNullable<Item['use']> {
  const out: NonNullable<Item['use']> = {};
  if (u.install) out.install = u.install;
  if (u.snippet) out.snippet = u.snippet;
  if (u.docs) out.docs = u.docs;
  return out;
}

// ---------- 쓰기 ----------

export function writeCatalog(source: SourceInfo, items: Item[]): CatalogFile {
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.id)) throw new Error(`id 겹침: ${it.id}`);
    seen.add(it.id);
  }
  const sorted = [...items].sort((a, b) => cmp(a.id, b.id));
  const file: CatalogFile = { source, fetchedAt: FETCHED_AT, count: sorted.length, items: sorted };
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `${source.id}.json`);
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`  → data/catalog/design/${source.id}.json (${sorted.length})`);
  return file;
}

export function readCatalog(id: string): CatalogFile | undefined {
  const path = join(OUT_DIR, `${id}.json`);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, 'utf8')) as CatalogFile;
}

// 사람이 쓴 항목(목록·스타일)은 고른 날을 fetchedAt으로 둔다. 다시 돌려도 바뀌지 않게.
export const CURATED_AT = '2026-10-14';

export async function main(name: string, run: () => Promise<void>): Promise<void> {
  const t0 = Date.now();
  console.log(`[${name}] 시작 (${FETCHED_AT})`);
  try {
    await run();
    console.log(`[${name}] 끝 ${((Date.now() - t0) / 1000).toFixed(0)}초`);
  } catch (err) {
    console.error(`[${name}] 실패:`, err);
    process.exitCode = 1;
  }
}

// ---------- 손으로 고른 사이트 확인 ----------
// 주소가 살아 있는지 보고, 사이트가 스스로 쓴 한 줄(meta description/og:description)과 제목을 가져온다.
// summary에는 이 원문만 쓴다. 못 가져오면 제목, 그것도 없으면 이름과 도메인만 둔다.

export interface SiteMeta { ok: boolean; status: number; finalUrl: string; title?: string; description?: string }

function metaContent(html: string, key: string): string | undefined {
  const re1 = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, 'i');
  const m = html.match(re1) ?? html.match(re2);
  const v = m?.[1] ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : undefined;
  return v || undefined;
}

export async function siteMeta(url: string): Promise<SiteMeta> {
  try {
    const res = await fetchRaw(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; codeshopper-catalog-import/1.0)', accept: 'text/html,application/xhtml+xml' },
      allowStatus: [401, 403, 404, 410, 429, 451, 503],
      retries: 2,
      timeoutMs: 30_000,
    });
    const status = res.status;
    const html = (await res.text()).slice(0, 400_000);
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    return {
      ok: status < 400 || status === 401 || status === 403 || status === 429 || status === 503, // 봇 막기(401·403·429·503)는 살아 있는 것으로 본다
      status,
      finalUrl: res.url || url,
      title: title ? decodeEntities(title).replace(/\s+/g, ' ').trim() || undefined : undefined,
      description: metaContent(html, 'description') ?? metaContent(html, 'og:description') ?? metaContent(html, 'twitter:description'),
    };
  } catch (err) {
    return { ok: false, status: err instanceof HttpError ? err.status : 0, finalUrl: url };
  }
}

export function siteSummary(name: string, url: string, meta: SiteMeta): string {
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
  const looksBlocked = (s?: string) =>
    !s || /just a moment|attention required|access denied|captcha|403|forbidden|cloudflare|security (filter|checkpoint)|request didn.t go through|verify you are (a )?human|checking your browser|enable javascript|are you a robot|ddos|too many requests|^loading/i.test(s);
  if (!looksBlocked(meta.description)) return meta.description as string;
  if (!looksBlocked(meta.title)) return meta.title as string;
  return `${name} (${host})`;
}

// ---------- npm 꾸러미 ----------
// 버전 해석은 npm 레지스트리, 파일은 정확한 버전으로 unpkg → jsDelivr 순서로 받는다.

export interface NpmLatest { name: string; version: string; description?: string; license?: string; homepage?: string; repository?: { url?: string } | string }

export async function npmLatest(pkg: string): Promise<NpmLatest> {
  return fetchJson<NpmLatest>(`https://registry.npmjs.org/${pkg.replace('/', '%2F')}/latest`);
}

export async function npmFile(pkg: string, version: string, path: string): Promise<string> {
  const p = path.replace(/^\//, '');
  try {
    return await fetchText(`https://unpkg.com/${pkg}@${version}/${p}`, { retries: 3 });
  } catch {
    return fetchText(`https://cdn.jsdelivr.net/npm/${pkg}@${version}/${p}`, { retries: 3 });
  }
}

export async function npmMonthlyDownloads(pkg: string): Promise<number | undefined> {
  try {
    const res = await fetchRaw(`https://api.npmjs.org/downloads/point/last-month/${pkg}`, { allowStatus: [404], retries: 4 });
    if (res.status === 404) {
      await res.body?.cancel();
      return undefined;
    }
    return ((await res.json()) as { downloads?: number }).downloads;
  } catch {
    return undefined;
  }
}

// ---------- 색 바꾸기 ----------

export const to2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

export function normHex(s: string): string | undefined {
  const m = s.trim().match(/^#?([0-9a-f]{3,8})$/i);
  if (!m?.[1]) return undefined;
  let h = m[1].toLowerCase();
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return undefined;
  if (h.length === 8 && h.endsWith('ff')) h = h.slice(0, 6);
  return `#${h}`;
}

export function rgbToHex(s: string): string | undefined {
  const m = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/i);
  if (!m) return undefined;
  const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
  const hex = `#${to2(Number(m[1]))}${to2(Number(m[2]))}${to2(Number(m[3]))}`;
  return a >= 1 ? hex : `${hex}${to2(a * 255)}`;
}

// OKLCH → sRGB hex (sRGB 밖의 색은 잘라 맞춘다. 원래 값은 value에 남긴다).
export function oklchToHex(s: string): string | undefined {
  const m = s.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i);
  if (!m) return undefined;
  const L = m[2] ? Number(m[1]) / 100 : Number(m[1]);
  const C = Number(m[3]);
  const h = (Number(m[4]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const ss = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * ss,
  ];
  const enc = (x: number) => {
    const c = Math.max(0, Math.min(1, x));
    return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  };
  return `#${lin.map((x) => to2(enc(x))).join('')}`;
}
