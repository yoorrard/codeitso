// 오픈소스·데이터셋·템플릿 진열대 가져오기 공용 도우미 (scripts/import/oss-*.ts, data-*.ts, tpl-*.ts만 쓴다).
// 네트워크(다시 시도·쉬어 가기), 동시 실행, 캐시, 글 다듬기, GitHub 저장소 정보(ecosyste.ms 거울),
// awesome 목록 읽기(awesome.ecosyste.ms), git 부분 내려받기, 상품 모양 맞추기, 정렬된 JSON 쓰기, 목차 만들기.
// 프록시(HTTPS_PROXY) 뒤에서는 Node가 프록시를 쓰도록 NODE_USE_ENV_PROXY=1로 자기 자신을 다시 띄운다.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stabilizeFile, stableLine, writeIfChanged } from './stable-write.ts';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CATALOG_DIR = join(ROOT, 'data', 'catalog');
export const CACHE_DIR = join(ROOT, '.cache', 'import-oss');
// 같은 날 다시 돌리면 같은 결과가 나오게 날짜만 쓴다. IMPORT_DATE로 고정할 수 있다.
export const FETCHED_AT = process.env.IMPORT_DATE ?? new Date().toISOString().slice(0, 10);
export const USER_AGENT = 'codeshopper-catalog-import/1.0 (+https://github.com/yoorrard/code-chauffeur)';

// ---------- 모양 ----------

export type PreviewType =
  | 'font' | 'palette' | 'icons' | 'style' | 'repo' | 'model' | 'dataset' | 'api'
  | 'skill' | 'mcp' | 'site' | 'template' | 'asset' | 'prompt';

export interface Preview {
  type: PreviewType;
  [field: string]: unknown;
}

export interface Metrics {
  stars?: number;
  downloads?: number;
  likes?: number;
  /** 인기 점수용 (D133, scripts/import/signals.ts): 조회 수·최근 뜨는 정도·사이트 순위 묶음 */
  views?: number;
  trend?: number;
  siteRank?: number;
  updatedAt?: string;
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
  metrics?: Metrics;
  tags: string[];
  preview?: Preview;
  use?: { install?: string; snippet?: string; docs?: string };
  fetchedAt: string;
}

export interface SourceInfo {
  id: string; // 파일 이름 (data/catalog/<category>/<id>.json)
  name: string;
  url: string;
  license: string; // 목록 메타데이터를 싣는 근거
  note?: string;
  total?: number; // 출처 전체 개수 (인기 기준으로 자른 경우)
  cut?: string; // 자른 기준 (사람이 읽는 한 줄)
}

export interface CatalogFile {
  source: SourceInfo;
  fetchedAt: string;
  count: number;
  items: Item[];
}

// ---------- 대분류·소분류 ----------
// 순서가 곧 화면 순서다. 새 kind는 여기에만 더한다 (목차·스키마 시험이 이 목록을 본다).

export const CATEGORIES = {
  opensource: {
    nameKo: '오픈소스',
    kinds: [
      { id: 'models', nameKo: 'AI 모델' },
      { id: 'ai-demos', nameKo: 'AI 데모 앱 (스페이스)' },
      { id: 'ai-apps', nameKo: 'AI 앱·에이전트 프로젝트' },
      { id: 'apps', nameKo: '바로 쓰는 오픈소스 앱' },
      { id: 'js-libraries', nameKo: 'JavaScript 라이브러리' },
      { id: 'py-libraries', nameKo: 'Python 라이브러리' },
      { id: 'dart-libraries', nameKo: 'Flutter·Dart 패키지' },
      { id: 'auth', nameKo: '로그인·인증' },
      { id: 'cms', nameKo: 'CMS·블로그 엔진' },
      { id: 'ecommerce', nameKo: '쇼핑몰·결제' },
      { id: 'bots', nameKo: '봇 (디스코드·텔레그램·슬랙)' },
      { id: 'extensions', nameKo: '브라우저 확장' },
      { id: 'cli', nameKo: '명령줄 도구' },
      { id: 'games', nameKo: '게임·게임 엔진' },
      { id: 'projects', nameKo: '그 밖의 오픈소스 프로젝트' },
      { id: 'awesome', nameKo: '어썸 리스트 (주제별 모음)' },
    ],
  },
  datasets: {
    nameKo: '데이터셋',
    kinds: [
      { id: 'ai-training', nameKo: 'AI 학습 데이터셋' },
      { id: 'kaggle', nameKo: 'Kaggle 데이터셋' },
      { id: 'ml-classic', nameKo: '머신러닝 기본 데이터셋' },
      { id: 'kr-public', nameKo: '한국 공공데이터 (파일)' },
      { id: 'kr-language', nameKo: '한국어·한국 데이터 모음' },
      { id: 'world-stats', nameKo: '세계 통계·지표' },
      { id: 'open-data', nameKo: '분야별 공개 데이터' },
      { id: 'sample-data', nameKo: '앱에 넣는 기본 데이터 (국가·통화·지도)' },
    ],
  },
  templates: {
    nameKo: '템플릿·스타터',
    kinds: [
      { id: 'web-starter', nameKo: '웹앱 기본 스타터' },
      { id: 'saas', nameKo: 'SaaS 스타터 키트' },
      { id: 'ai-app', nameKo: 'AI 챗봇·에이전트 앱' },
      { id: 'admin', nameKo: '관리자 대시보드' },
      { id: 'landing', nameKo: '랜딩 페이지' },
      { id: 'blog-portfolio', nameKo: '블로그·포트폴리오' },
      { id: 'docs-site', nameKo: '문서 사이트' },
      { id: 'ecommerce', nameKo: '쇼핑몰' },
      { id: 'mobile', nameKo: '모바일 앱' },
      { id: 'desktop', nameKo: '데스크톱 앱' },
      { id: 'extension', nameKo: '브라우저 확장' },
      { id: 'bot', nameKo: '봇' },
      { id: 'backend', nameKo: '백엔드·API 서버' },
      { id: 'game', nameKo: '게임' },
      { id: 'html', nameKo: 'HTML·CSS 무료 템플릿' },
    ],
  },
} as const;

export type CategoryId = keyof typeof CATEGORIES;
export type OssKind = (typeof CATEGORIES.opensource.kinds)[number]['id'];
export type DataKind = (typeof CATEGORIES.datasets.kinds)[number]['id'];
export type TplKind = (typeof CATEGORIES.templates.kinds)[number]['id'];

export function kindsOf(category: CategoryId): string[] {
  return CATEGORIES[category].kinds.map((k) => k.id);
}

// ---------- 다시 띄우기 (프록시) ----------

export function ensureProxyEnv(): void {
  const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (!proxy || process.env.NODE_USE_ENV_PROXY === '1') return;
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' },
  });
  process.exit(r.status ?? 1);
}

// 스크립트 진입점: 프록시 설정 후 실행, 실패하면 1로 끝낸다.
// 시험(Vitest)이 파서만 쓰려고 스크립트를 불러올 때는 돌리지 않는다.
export function main(fn: () => Promise<void>): void {
  if (process.env.VITEST) return;
  ensureProxyEnv();
  fn().catch((err: unknown) => {
    console.error(err instanceof Error ? (err.stack ?? err.message) : err);
    process.exit(1);
  });
}

// ---------- 네트워크 ----------

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface FetchOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  retries?: number;
  timeoutMs?: number;
  allowStatus?: number[]; // 이 상태는 오류로 보지 않고 그대로 돌려준다 (예: 404)
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
        signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
      });
      if (res.ok || opts.allowStatus?.includes(res.status)) return res;
      // 429·5xx는 쉬었다가 다시. Retry-After가 있으면 따른다.
      if (res.status === 429 || res.status >= 500) {
        const after = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(after) && after > 0 ? after * 1000 : 2000 * 2 ** attempt;
        await res.body?.cancel();
        await sleep(Math.min(wait, 120_000));
        lastError = new HttpError(res.status, url);
        continue;
      }
      await res.body?.cancel();
      throw new HttpError(res.status, url);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      lastError = err; // 연결 끊김·시간 초과는 쉬었다가 다시
      await sleep(Math.min(1000 * 2 ** attempt, 30_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`fetch failed: ${url}`);
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  return (await fetchRaw(url, opts)).text();
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const text = await fetchText(url, { ...opts, headers: { accept: 'application/json', ...opts.headers } });
  return JSON.parse(text) as T;
}

// Link 머리글의 rel="next" 주소.
export function nextLink(res: Response): string | undefined {
  return res.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
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

export function progress(label: string, done: number, total: number, every = 200): void {
  if (done === total || done % every === 0) console.log(`  ${label} ${done}/${total}`);
}

// ---------- 캐시 (.cache/import-oss, 저장소에 올리지 않는다) ----------
// 같은 날 다시 돌릴 때 네트워크를 아낀다. REFRESH=1이면 무시하고 새로 받는다.

function cachePath(name: string): string {
  return join(CACHE_DIR, `${name.replace(/[^a-zA-Z0-9._-]+/g, '_')}.json`);
}

export function readCache<T>(name: string, maxAgeDays = 3): T | undefined {
  if (process.env.REFRESH === '1') return undefined;
  const p = cachePath(name);
  if (!existsSync(p)) return undefined;
  try {
    const { savedAt, value } = JSON.parse(readFileSync(p, 'utf8')) as { savedAt: number; value: T };
    if (Date.now() - savedAt > maxAgeDays * 86_400_000) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

export function writeCache(name: string, value: unknown): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(name), JSON.stringify({ savedAt: Date.now(), value }));
}

export async function cached<T>(name: string, fn: () => Promise<T>, maxAgeDays = 3): Promise<T> {
  const hit = readCache<T>(name, maxAgeDays);
  if (hit !== undefined) return hit;
  const value = await fn();
  writeCache(name, value);
  return value;
}

// ---------- 글 다듬기 ----------

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'", rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', hellip: '…', middot: '·', trade: '™', reg: '®', copy: '©',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k in ENTITIES) return ENTITIES[k] as string;
    try {
      if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16));
      if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10));
    } catch {
      return m;
    }
    return m;
  });
}

export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, ' ').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

// 마크다운 꾸밈(그림·링크·굵게·코드·제목)을 벗긴 글.
export function stripMarkdown(md: string): string {
  return stripHtml(
    md
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#+\s*/gm, ''),
  );
}

// 이모지 단축어(:rocket:)와 꾸밈 이모지를 뺀다. 원문 뜻은 그대로.
export function tidy(text: string): string {
  return text
    .replace(/:[a-z0-9_+-]+:/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{FE0F}\u{200D}]/gu, ' ')
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

// 원문 설명을 상품 summary로: 꾸밈 벗기기 → 정리 → 300자. 비면 undefined.
export function summaryOf(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const s = clip(tidy(stripMarkdown(text)));
  return s.length >= 2 ? s : undefined;
}

// 자동으로 만들어진 카드의 틀 문장. 설명이 아니므로 건너뛴다.
const BOILERPLATE = [
  /check out the configuration reference/i,
  /model card (has been|was) automatically generated/i,
  /this is the model card of a .* model that has been pushed on the hub/i,
  /provide a (quick|longer) summary of what the (model|dataset)/i,
  /^more information needed$/i,
  /this model is a fine-tuned version of .* on (an unknown|the None) dataset/i,
  /^(\[?more information needed\]?|todo|tbd|wip)\.?$/i,
  /^(this )?(dataset|model) (card|was) (generated|created) (using|with|by)/i,
  /^\s*(table of contents|contents|license|installation|usage)\s*:?$/i,
];

// README 첫 문단(제목·배지·그림·표·코드·HTML 덩어리·틀 문장을 건너뛴 첫 글 문단).
export function readmeFirstParagraph(md: string): string | undefined {
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '\n');
  for (const block of body.split(/\n\s*\n/)) {
    const b = block.trim();
    if (!b) continue;
    if (/^(#|\||>|!\[|\[!\[|<(img|p|div|h\d|a|picture|br|table|center|details|video|source|hr|span)\b|-{3,}|={3,}|\*{3,})/i.test(b)) continue;
    if (/^\s*([-*+]|\d+\.)\s/.test(b)) continue; // 목록은 설명이 아니다
    const text = summaryOf(b);
    if (!text || BOILERPLATE.some((re) => re.test(text))) continue;
    if (/:$/.test(text)) continue; // '다음과 같다:'처럼 목록을 여는 문장은 설명이 아니다
    if (text.length >= 30 && /[a-zA-Z가-힣]{3}/.test(text)) return text;
  }
  return undefined;
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^[-.]+|[-.]+$/g, '');
}

// <출처>:<슬러그>. owner/repo는 owner--repo. 슬러그는 소문자·숫자·점·하이픈만.
export function makeId(source: string, key: string): string {
  const slug = key
    .split('/')
    .map((part) => slugify(part))
    .filter(Boolean)
    .join('--');
  return `${source}:${slug || 'item'}`;
}

// 로캘과 무관한 비교 (localeCompare를 쓰지 않는다).
export function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function uniqSorted(xs: Iterable<string | undefined | null | false>): string[] {
  return [...new Set([...xs].filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean))].sort(cmp);
}

// 태그: 소문자·하이픈. 너무 길거나 빈 것은 버린다.
export function tagify(xs: Iterable<string | undefined | null | false>): string[] {
  const out: string[] = [];
  for (const x of xs) {
    if (typeof x !== 'string') continue;
    const t = x.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && t.length <= 40) out.push(t);
  }
  return uniqSorted(out);
}

export function hostOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function isHttpUrl(u: string | null | undefined): u is string {
  if (!u) return false;
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:';
  } catch {
    return false;
  }
}

export function toDate(s: string | number | null | undefined): string | undefined {
  if (s === null || s === undefined || s === '') return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

export function int(n: unknown): number | undefined {
  const x = typeof n === 'string' ? Number(n.replace(/[^\d.]/g, '')) : typeof n === 'number' ? n : NaN;
  return Number.isFinite(x) && x >= 0 ? Math.round(x) : undefined;
}

export function hasHangul(s: string): boolean {
  return /[가-힣]/.test(s);
}

// SPDX·라이선스 이름 정리. 'other'·'noassertion'·빈 값은 버린다.
export function cleanLicense(l: string | null | undefined): string | undefined {
  if (!l) return undefined;
  const t = l.trim();
  if (!t || /^(other|noassertion|none|unknown|null|n\/a|unlicensed)$/i.test(t)) return undefined;
  const map: Record<string, string> = {
    'mit': 'MIT', 'apache-2.0': 'Apache-2.0', 'gpl-3.0': 'GPL-3.0', 'gpl-2.0': 'GPL-2.0', 'agpl-3.0': 'AGPL-3.0',
    'lgpl-3.0': 'LGPL-3.0', 'lgpl-2.1': 'LGPL-2.1', 'bsd-3-clause': 'BSD-3-Clause', 'bsd-2-clause': 'BSD-2-Clause',
    'mpl-2.0': 'MPL-2.0', 'isc': 'ISC', 'unlicense': 'Unlicense', 'cc0-1.0': 'CC0-1.0', 'cc-by-4.0': 'CC-BY-4.0',
    'cc-by-sa-4.0': 'CC-BY-SA-4.0', 'cc-by-nc-4.0': 'CC-BY-NC-4.0', 'cc-by-nc-sa-4.0': 'CC-BY-NC-SA-4.0',
    'openrail': 'OpenRAIL', 'creativeml-openrail-m': 'CreativeML-OpenRAIL-M', 'wtfpl': 'WTFPL', 'epl-2.0': 'EPL-2.0',
    'artistic-2.0': 'Artistic-2.0', 'zlib': 'Zlib', 'bsl-1.0': 'BSL-1.0', 'odbl': 'ODbL-1.0', 'odc-by': 'ODC-By-1.0',
    'pddl': 'PDDL-1.0', 'cc-by-3.0': 'CC-BY-3.0', 'cc-by-sa-3.0': 'CC-BY-SA-3.0', 'llama2': 'Llama 2 Community License',
    'llama3': 'Llama 3 Community License', 'llama3.1': 'Llama 3.1 Community License', 'llama3.2': 'Llama 3.2 Community License',
    'llama3.3': 'Llama 3.3 Community License', 'llama4': 'Llama 4 Community License', 'gemma': 'Gemma Terms of Use',
  };
  return map[t.toLowerCase()] ?? t;
}

// ---------- 상품 모양 ----------

export function makeItem(x: Omit<Item, 'fetchedAt'> & { fetchedAt?: string }): Item {
  // 키 순서를 고정해 JSON 차이를 줄인다.
  const item: Item = {
    id: x.id,
    name: x.name.replace(/\s+/g, ' ').trim(),
    kind: x.kind,
    category: x.category,
    summary: clip(x.summary),
    ...(x.summaryKo ? { summaryKo: x.summaryKo } : {}),
    ...(x.written ? { written: x.written } : {}),
    url: x.url,
    source: { name: x.source.name, url: x.source.url },
    ...(x.license ? { license: x.license } : {}),
    tags: uniqSorted(x.tags),
    fetchedAt: x.fetchedAt ?? FETCHED_AT,
  };
  const m = x.metrics;
  if (m) {
    const metrics: Metrics = {};
    if (m.stars !== undefined) metrics.stars = m.stars;
    if (m.downloads !== undefined) metrics.downloads = m.downloads;
    if (m.likes !== undefined) metrics.likes = m.likes;
    if (m.views !== undefined) metrics.views = m.views;
    if (m.trend !== undefined && m.trend > 0) metrics.trend = m.trend;
    if (m.siteRank !== undefined) metrics.siteRank = m.siteRank;
    if (m.updatedAt) metrics.updatedAt = m.updatedAt;
    if (Object.keys(metrics).length) item.metrics = metrics;
  }
  if (x.preview) item.preview = sortKeys(x.preview, ['type']) as Preview;
  if (x.use) {
    const use: Item['use'] = {};
    if (x.use.install) use.install = x.use.install;
    if (x.use.snippet) use.snippet = x.use.snippet;
    if (x.use.docs) use.docs = x.use.docs;
    if (Object.keys(use).length) item.use = use;
  }
  // 최종 키 순서
  return sortKeys(item, ['id', 'name', 'kind', 'category', 'summary', 'summaryKo', 'written', 'url', 'source', 'license', 'metrics', 'tags', 'preview', 'use', 'fetchedAt']) as unknown as Item;
}

// 앞에 둘 키를 먼저, 나머지는 이름 순. undefined 값은 버린다.
function sortKeys(obj: object, first: string[]): Record<string, unknown> {
  const src = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of first) if (src[k] !== undefined) out[k] = src[k];
  for (const k of Object.keys(src).sort(cmp)) if (!(k in out) && src[k] !== undefined) out[k] = src[k];
  return out;
}

// 같은 id가 겹치면 먼저 온 것(더 인기 있는 것)을 남긴다. 결과는 id 순.
export function dedupe(items: Item[]): Item[] {
  const seen = new Map<string, Item>();
  for (const it of items) if (!seen.has(it.id)) seen.set(it.id, it);
  return [...seen.values()].sort((a, b) => cmp(a.id, b.id));
}

// 인기 순(별·내려받기·좋아요 큰 것 먼저) 비교. 같으면 id 순.
export function byPopularity(a: Item, b: Item): number {
  const pa = a.metrics?.stars ?? a.metrics?.downloads ?? a.metrics?.likes ?? 0;
  const pb = b.metrics?.stars ?? b.metrics?.downloads ?? b.metrics?.likes ?? 0;
  return pb - pa || cmp(a.id, b.id);
}

export function catalogPath(category: CategoryId, sourceId: string): string {
  return join(CATALOG_DIR, category, `${sourceId}.json`);
}

export function writeCatalog(category: CategoryId, source: SourceInfo, items: Item[]): CatalogFile {
  const kinds = new Set(kindsOf(category));
  for (const it of items) {
    if (it.category !== category) throw new Error(`${it.id}: category ${it.category} ≠ ${category}`);
    if (!kinds.has(it.kind)) throw new Error(`${it.id}: unknown kind ${it.kind}`);
  }
  const sorted = dedupe(items);
  const next: CatalogFile = {
    source: sortKeys(source, ['id', 'name', 'url', 'license', 'note', 'total', 'cut']) as unknown as SourceInfo,
    fetchedAt: FETCHED_AT,
    count: sorted.length,
    items: sorted,
  };
  // 뜻 있게 바뀌었을 때만 쓴다 (D143, stable-write.ts): 지표·날짜 흔들림은 지난 스냅숏을 두고, 그대로면 파일도 받은 날도 그대로.
  const p = catalogPath(category, source.id);
  const s = stabilizeFile(p, next, FETCHED_AT);
  const wrote = writeIfChanged(p, `${JSON.stringify(s.file, null, 2)}\n`);
  const byKind = new Map<string, number>();
  for (const it of s.file.items) byKind.set(it.kind, (byKind.get(it.kind) ?? 0) + 1);
  console.log(`✔ ${category}/${source.id}.json ${s.file.items.length}개 (${[...byKind].map(([k, n]) => `${k} ${n}`).join(', ')})`);
  console.log(stableLine(s, wrote));
  return s.file;
}

export function readCatalog(category: CategoryId, sourceId: string): CatalogFile | undefined {
  const p = catalogPath(category, sourceId);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as CatalogFile) : undefined;
}

// ---------- 목차 (data/catalog/<category>/index.json) ----------

export interface IndexFile {
  category: string;
  nameKo: string;
  fetchedAt: string;
  total: number;
  subcategories: { id: string; nameKo: string; count: number; sources: { id: string; name: string; count: number }[] }[];
  sources: { id: string; name: string; url: string; license: string; count: number; total?: number; cut?: string; note?: string }[];
}

export function writeIndex(category: CategoryId): IndexFile {
  const dir = join(CATALOG_DIR, category);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json').sort(cmp) : [];
  const cats = CATEGORIES[category];
  const perKind = new Map<string, Map<string, { name: string; count: number }>>();
  const sources: IndexFile['sources'] = [];
  let total = 0;
  let fetchedAt = '';
  for (const f of files) {
    const file = JSON.parse(readFileSync(join(dir, f), 'utf8')) as CatalogFile;
    if (file.fetchedAt > fetchedAt) fetchedAt = file.fetchedAt;
    total += file.items.length;
    sources.push({
      id: file.source.id, name: file.source.name, url: file.source.url, license: file.source.license, count: file.items.length,
      ...(file.source.total !== undefined ? { total: file.source.total } : {}),
      ...(file.source.cut ? { cut: file.source.cut } : {}),
      ...(file.source.note ? { note: file.source.note } : {}),
    });
    for (const it of file.items) {
      const m = perKind.get(it.kind) ?? new Map();
      const s = m.get(file.source.id) ?? { name: file.source.name, count: 0 };
      s.count++;
      m.set(file.source.id, s);
      perKind.set(it.kind, m);
    }
  }
  const index: IndexFile = {
    category,
    nameKo: cats.nameKo,
    fetchedAt: fetchedAt || FETCHED_AT,
    total,
    subcategories: cats.kinds.map((k) => {
      const m = perKind.get(k.id) ?? new Map<string, { name: string; count: number }>();
      const srcs = [...m].map(([id, s]) => ({ id, name: s.name, count: s.count })).sort((a, b) => cmp(a.id, b.id));
      return { id: k.id, nameKo: k.nameKo, count: srcs.reduce((n, s) => n + s.count, 0), sources: srcs };
    }),
    sources,
  };
  writeFileSync(join(dir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`✔ ${category}/index.json 합계 ${total}개`);
  for (const s of index.subcategories) console.log(`  ${s.id.padEnd(16)} ${String(s.count).padStart(6)}  ${s.nameKo}`);
  return index;
}

// ---------- GitHub 저장소 정보 ----------
// 1) GITHUB_TOKEN으로 REST(되는 곳에서만) → 2) repos.ecosyste.ms(GitHub 공개 거울, CC BY-SA 4.0, 익명 5000회/시간).

export interface RepoMeta {
  fullName: string; // owner/repo (원래 대소문자)
  host: 'github' | 'gitlab' | 'codeberg';
  description: string;
  stars: number;
  license?: string;
  homepage?: string;
  language?: string;
  topics: string[];
  pushedAt?: string;
  archived: boolean;
  fork: boolean;
  template?: boolean;
  defaultBranch?: string;
}

interface EcoRepoJson {
  full_name: string; description: string | null; stargazers_count: number | null; license: string | null;
  homepage: string | null; language: string | null; topics: string[] | null; pushed_at: string | null;
  archived: boolean | null; fork: boolean | null; template?: boolean | null; default_branch?: string | null;
}

export function fromEcoRepo(j: EcoRepoJson, host: RepoMeta['host'] = 'github'): RepoMeta {
  return {
    fullName: j.full_name,
    host,
    description: j.description ?? '',
    stars: j.stargazers_count ?? 0,
    license: cleanLicense(j.license),
    homepage: j.homepage || undefined,
    language: j.language ?? undefined,
    topics: j.topics ?? [],
    pushedAt: toDate(j.pushed_at),
    archived: !!j.archived,
    fork: !!j.fork,
    template: j.template ?? undefined,
    defaultBranch: j.default_branch ?? undefined,
  };
}

// github.com/owner/repo 꼴 주소에서 owner/repo. 아니면 undefined.
export function githubSlug(url: string): string | undefined {
  const m = url.match(/^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[/#?].*)?$/);
  if (!m) return undefined;
  const owner = m[1] as string;
  const repo = m[2] as string;
  if (/^(topics|orgs|sponsors|marketplace|features|collections|apps|settings|login|about|site|users|search|trending|explore)$/i.test(owner)) return undefined;
  return `${owner}/${repo}`;
}

const repoMemo = new Map<string, RepoMeta | null>();

export async function repoMeta(fullName: string): Promise<RepoMeta | undefined> {
  const key = fullName.toLowerCase();
  if (repoMemo.has(key)) return repoMemo.get(key) ?? undefined;
  const cacheName = `repo-${key.replace('/', '__')}`;
  const hit = readCache<RepoMeta | null>(cacheName, 7);
  if (hit !== undefined) {
    repoMemo.set(key, hit);
    return hit ?? undefined;
  }
  let meta: RepoMeta | undefined;
  try {
    const res = await fetchRaw(`https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/${fullName}`, {
      allowStatus: [404, 410], retries: 4, headers: { accept: 'application/json' },
    });
    if (res.ok) meta = fromEcoRepo((await res.json()) as EcoRepoJson);
    else await res.body?.cancel();
  } catch (err) {
    console.warn(`  저장소 정보 실패 ${fullName}: ${err instanceof Error ? err.message : err}`);
    return undefined; // 일시 오류는 캐시하지 않는다
  }
  repoMemo.set(key, meta ?? null);
  writeCache(cacheName, meta ?? null);
  return meta;
}

// 저장소 → 미리 보기(repo).
export function repoPreview(m: RepoMeta): Preview {
  return {
    type: 'repo',
    host: m.host,
    repo: m.fullName,
    ...(m.language ? { language: m.language } : {}),
    ...(m.archived ? { archived: true } : {}),
    ...(m.template ? { template: true } : {}),
  };
}

export function repoUrl(m: RepoMeta): string {
  const base = m.host === 'gitlab' ? 'https://gitlab.com' : m.host === 'codeberg' ? 'https://codeberg.org' : 'https://github.com';
  return `${base}/${m.fullName}`;
}

// ecosyste.ms의 조직(owner) 저장소 목록 전체 (별 많은 순).
export async function ownerRepos(owner: string): Promise<RepoMeta[]> {
  return cached(`owner-${owner}`, async () => {
    // 큰 조직은 100개씩 받으면 거울 서버가 500을 내기도 해서, 실패하면 30개씩으로 줄여 다시 받는다.
    for (const perPage of [100, 30]) {
      const out: RepoMeta[] = [];
      try {
        for (let page = 1; ; page++) {
          const rows = await fetchJson<EcoRepoJson[]>(
            `https://repos.ecosyste.ms/api/v1/hosts/GitHub/owners/${owner}/repositories?per_page=${perPage}&sort=stargazers_count&order=desc&page=${page}`,
            { retries: 2, timeoutMs: 60_000 },
          );
          out.push(...rows.map((r) => fromEcoRepo(r)));
          if (rows.length < perPage) break;
        }
        return out;
      } catch (err) {
        console.warn(`  조직 ${owner} (${perPage}개씩) 실패: ${err instanceof Error ? err.message : err}`);
      }
    }
    return [];
  }, 7);
}

// ---------- awesome 목록 (awesome.ecosyste.ms) ----------
// awesome 목록 README를 항목 단위로 나눠 둔 공개 색인. 항목마다 그 목록 안의 분류(category·sub_category)가 붙는다.

export interface AwesomeEntry {
  name: string; // 목록에 적힌 이름
  description: string; // 목록에 적힌 설명
  url: string;
  category?: string;
  subCategory?: string;
}

interface ListProjectJson {
  name: string | null;
  description: string | null;
  category: string | null;
  sub_category: string | null;
  project: { url: string } | null;
}

export async function awesomeEntries(list: string): Promise<AwesomeEntry[]> {
  return cached(`awesome-${list.replace('/', '__')}`, async () => {
    const out: AwesomeEntry[] = [];
    // list_projects는 Link 머리글을 주지 않는다. 100개가 꽉 찬 쪽이면 다음 쪽을 더 읽는다.
    for (let page = 1; ; page++) {
      const rows = await fetchJson<ListProjectJson[]>(
        `https://awesome.ecosyste.ms/api/v1/lists/${encodeURIComponent(list)}/list_projects?per_page=100&page=${page}`,
      );
      for (const r of rows) {
        if (!r.project?.url) continue;
        out.push({
          name: (r.name ?? '').trim(),
          description: (r.description ?? '').trim(),
          url: r.project.url,
          category: r.category ?? undefined,
          subCategory: r.sub_category ?? undefined,
        });
      }
      if (rows.length < 100) break;
    }
    return out;
  }, 7);
}

// ---------- git 부분 내려받기 ----------
// 큰 저장소에서 필요한 파일만: blob 없이 얕게 받고(--filter=blob:none --depth 1), 고른 무늬의 파일만 꺼낸다.
// .cache/import-oss/git/<owner>__<repo>. 목록은 git ls-tree로 (blob을 받지 않는다).

function git(args: string[], cwd?: string): string {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], timeout: 900_000, maxBuffer: 512 * 1024 * 1024 }).toString();
}

export function gitClone(repo: string, branch?: string): string {
  const dir = join(CACHE_DIR, 'git', `${repo.replace('/', '__')}${branch ? `@${branch}` : ''}`);
  if (!existsSync(join(dir, '.git'))) {
    mkdirSync(dirname(dir), { recursive: true });
    git(['clone', '-q', '--depth', '1', '--filter=blob:none', '--no-checkout', ...(branch ? ['--branch', branch] : []), `https://github.com/${repo}.git`, dir]);
  } else if (process.env.REFRESH === '1') {
    git(['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin'], dir);
    git(['reset', '-q', '--soft', 'FETCH_HEAD'], dir);
  }
  return dir;
}

// 무늬(gitignore 꼴, 예: /examples/*/README.md)에 맞는 파일만 꺼낸다.
export function gitCheckout(repo: string, patterns: string[], branch?: string): string {
  const dir = gitClone(repo, branch);
  // sparse-checkout set과 read-tree는 없는 blob을 한 번에 몰아 받는다 (checkout -- 경로는 파일마다 따로 받아 느리다).
  git(['sparse-checkout', 'set', '--no-cone', ...patterns], dir);
  git(['read-tree', '-mu', 'HEAD'], dir);
  return dir;
}

// 저장소의 파일 경로 전체 (root 아래만).
export function gitFiles(dir: string, root = ''): string[] {
  return git(['ls-tree', '-r', '--name-only', 'HEAD', ...(root ? ['--', root] : [])], dir).split('\n').filter(Boolean);
}

export function gitHeadDate(dir: string): string | undefined {
  try {
    return toDate(git(['log', '-1', '--format=%cI'], dir).trim());
  } catch {
    return undefined;
  }
}

// 저장소 안 폴더의 바로 아래 하위 폴더 이름들 (ls-tree).
export function gitSubdirs(dir: string, path: string): string[] {
  return git(['ls-tree', '-d', '--name-only', 'HEAD', `${path.replace(/\/$/, '')}/`], dir)
    .split('\n')
    .filter(Boolean)
    .map((p) => p.split('/').pop() as string)
    .filter((n) => !n.startsWith('.') && !n.startsWith('_'))
    .sort(cmp);
}

export function readIfExists(p: string): string | undefined {
  return existsSync(p) ? readFileSync(p, 'utf8') : undefined;
}

// 마크다운 첫 # 제목.
export function readmeTitle(md: string | undefined): string | undefined {
  if (!md) return undefined;
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  const h = body.match(/^#\s+(.+)$/m)?.[1] ?? body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const t = h ? tidy(stripMarkdown(h)) : '';
  return t && t.length <= 80 ? t : undefined;
}

// ---------- Hugging Face Hub ----------
// 공개 API (https://huggingface.co/docs/hub/api). 쪽은 Link 머리글의 cursor로 넘긴다.

export const HF = 'https://huggingface.co';

// keep(row)가 false인 줄이 나오면(정렬된 목록이라 그 뒤도 모두 기준 밑) 멈춘다.
export async function hfList<T>(kind: 'models' | 'datasets' | 'spaces', params: string, keep: (row: T, index: number) => boolean): Promise<T[]> {
  const out: T[] = [];
  let url: string | undefined = `${HF}/api/${kind}?${params}&limit=1000`;
  while (url) {
    const res = await fetchRaw(url, { headers: { accept: 'application/json' } });
    const rows = (await res.json()) as T[];
    let stop = rows.length === 0;
    for (const r of rows) {
      if (!keep(r, out.length)) {
        stop = true;
        break;
      }
      out.push(r);
    }
    url = stop ? undefined : nextLink(res);
    await sleep(300);
  }
  return out;
}

// HF 카드의 license 값(문자열 또는 배열).
export function hfLicense(v: unknown): string | undefined {
  if (Array.isArray(v)) return cleanLicense(typeof v[0] === 'string' ? v[0] : undefined);
  return typeof v === 'string' ? cleanLicense(v) : undefined;
}

export function asStrings(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return typeof v === 'string' ? [v] : [];
}

// ---------- 성인물 거르기 ----------
// 초심자 쇼핑몰이라 성인물 표시(허브의 not-for-all-audiences 태그)나 이름에 성인물 낱말이 있는 항목은 싣지 않는다.
// 'xxx'는 폴더 이름 자리표시(eval_results-xxx) 같은 곳에도 흔해서 낱말 목록에 넣지 않는다.
const ADULT = /\b(porn\w*|hentai|nudes?|nudity|nudify|naked|erotic\w*|sexy?|horny|onlyfans|r18|18\+)\b/i;
const ADULT_ANYWHERE = /nsfw|hentai|porn/i; // 붙여 쓴 이름(lynansfw 등)도 잡는다

export function isAdult(texts: (string | undefined | null)[], tags: readonly string[] = []): boolean {
  if (tags.some((t) => t === 'not-for-all-audiences' || /^nsfw/i.test(t))) return true;
  return texts.some((t) => !!t && (ADULT_ANYWHERE.test(t) || ADULT.test(t.replace(/[_-]+/g, ' '))));
}

// ---------- 템플릿 소분류 (이름·설명 낱말) ----------
// 순서가 중요하다: 좁은 쓰임(봇·확장·관리자)을 넓은 쓰임(AI·백엔드)보다 먼저 본다. 맞는 것이 없으면 undefined.
const TEMPLATE_KIND_RULES: [RegExp, TplKind][] = [
  [/\b(discord|telegram|slack|whatsapp|kakao|line|twitch)\b[\w\s.-]{0,20}\b(bots?|agents?|apps?)\b|\bbot (template|starter|boilerplate)\b/i, 'bot'],
  [/\b(chrome|browser|firefox|web|edge)[- ]?extensions?\b|\bmanifest v3\b/i, 'extension'],
  [/\b(admin|dashboards?|back[- ]?office|control panel)\b/i, 'admin'],
  [/\bsaas\b|\bsubscriptions?\b|\bmulti[- ]?tenant\b|\bstarter kit for (startups|indie)/i, 'saas'],
  [/\b(e-?commerce|storefront|shopify|medusa|commerce|online store|shopping)\b/i, 'ecommerce'],
  [/\blanding[- ]?pages?\b|\bmarketing (site|website|page)\b|\bone[- ]page\b/i, 'landing'],
  [/\b(docs|documentation)[- ](sites?|websites?|themes?|templates?|starters?|portals?)\b|\bknowledge base\b|\bwiki\b|\b(starlight|docusaurus|vitepress|nextra|mintlify|mkdocs|docsify|fumadocs)\b/i, 'docs-site'],
  [/\b(blog|portfolio|personal (website|site|homepage)|resume|cv|homepage|jamstack site)\b/i, 'blog-portfolio'],
  [/\b(react native|expo|flutter|ios|android|mobile app|ionic|capacitor)\b/i, 'mobile'],
  [/\b(electron|tauri|desktop app|wails|neutralino)\b/i, 'desktop'],
  [/\b(games?|phaser|godot|pixi|unity|gamedev)\b/i, 'game'],
  [/\b(rest api|graphql|backend|api server|express|fastapi|hono|nestjs|django rest|workers?|cron|serverless functions?|microservices?)\b/i, 'backend'],
];

// AI 앱은 '그냥 AI라는 낱말이 들어간 것'(AI-ready 테마 등)과 구별하려고, 설명에는 뚜렷한 말(AI 챗봇·RAG·OpenAI 등)만 보고
// 짧은 낱말(AI·LLM·agent)은 이름에 있을 때만 본다.
const AI_STRONG = /\b(ai[- ](chat ?bots?|chat|assistants?|agents?|apps?|powered|companion|tutor|image|voice)|chat ?bots?|chatgpt|gpt-?[345]\w*|llms?[- ]?(apps?|powered|chat)|rag|retrieval[- ]augmented|openai|anthropic|claude|gemini|langchain|langgraph|llama ?index|ollama|ai sdk|mcp servers?)\b/i;
const AI_NAME = /\b(ai|llms?|gpt|agents?|agentic|rag|chat)\b/i;
const AI_POSITION = TEMPLATE_KIND_RULES.findIndex(([, k]) => k === 'mobile'); // 블로그 규칙 다음, 모바일 규칙 앞

export function templateKindByText(text: string, name?: string): TplKind | undefined {
  for (let i = 0; i < TEMPLATE_KIND_RULES.length; i++) {
    if (i === AI_POSITION && (AI_STRONG.test(text) || (name !== undefined && AI_NAME.test(name)))) return 'ai-app';
    const [re, k] = TEMPLATE_KIND_RULES[i] as [RegExp, TplKind];
    if (re.test(text)) return k;
  }
  return undefined;
}

// ---------- 아주 작은 YAML 읽기 ----------
// awesome-selfhosted-data 같은 단순한 파일(키: 값, 키: 아래 '- 값' 목록, 한 단계 들여 쓴 키: 값)만 읽는다.
// 맨 위 키의 여러 줄 글(|, >)은 읽고, 앵커·흐름 꼴({}, [])은 다루지 않는다. 의존성을 늘리지 않으려고 직접 쓴다.
export type YamlValue = string | number | boolean | null | YamlValue[] | { [k: string]: YamlValue };

function yamlScalar(raw: string): string | number | boolean | null {
  const t = raw.trim();
  if (t === '' || t === '~' || t === 'null') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    const inner = t.slice(1, -1);
    return t.startsWith("'") ? inner.replace(/''/g, "'") : inner.replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  return t;
}

export function parseSimpleYaml(text: string): Record<string, YamlValue> {
  const out: Record<string, YamlValue> = {};
  let key: string | undefined;
  let listItem: Record<string, YamlValue> | undefined;
  let block: { key: string; folded: boolean; lines: string[] } | undefined; // 맨 위 키의 여러 줄 글 (| 또는 >)
  const endBlock = () => {
    if (!block) return;
    const body = block.folded ? block.lines.map((l) => l.trim()).join(' ').replace(/\s+/g, ' ') : block.lines.join('\n');
    out[block.key] = body.trim();
    block = undefined;
  };
  for (const line of text.split(/\r?\n/)) {
    if (block) {
      if (!line.trim() || /^\s/.test(line)) {
        block.lines.push(line.replace(/^\s{1,2}/, ''));
        continue;
      }
      endBlock();
    }
    if (!line.trim() || line.trim().startsWith('#') || line.startsWith('---')) continue;
    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (top) {
      key = top[1] as string;
      listItem = undefined;
      const raw = (top[2] as string).trim();
      if (/^[|>][-+]?$/.test(raw)) {
        block = { key, folded: raw.startsWith('>'), lines: [] };
        continue;
      }
      out[key] = raw ? yamlScalar(raw) : null;
      continue;
    }
    if (!key) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item) {
      const cur = Array.isArray(out[key]) ? (out[key] as YamlValue[]) : [];
      const kv = (item[1] as string).match(/^([A-Za-z0-9_-]+):\s+(.*)$/);
      if (kv) {
        listItem = { [kv[1] as string]: yamlScalar(kv[2] as string) };
        cur.push(listItem);
      } else {
        listItem = undefined;
        cur.push(yamlScalar(item[1] as string));
      }
      out[key] = cur;
      continue;
    }
    const nested = line.match(/^\s+([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (nested) {
      if (listItem) {
        listItem[nested[1] as string] = yamlScalar(nested[2] as string);
      } else {
        const cur = out[key] && typeof out[key] === 'object' && !Array.isArray(out[key]) ? (out[key] as Record<string, YamlValue>) : {};
        cur[nested[1] as string] = yamlScalar(nested[2] as string);
        out[key] = cur;
      }
    }
  }
  endBlock();
  return out;
}

// ---------- awesome 목록 → GitHub 저장소 상품 ----------
// 목록마다 고를 칸(section: '분류 > 하위 분류'에 맞는 무늬)과 소분류를 정하고, 저장소 정보(ecosyste.ms)로 별·라이선스를 붙인다.

export interface ListPick {
  list: string; // owner/repo (awesome.ecosyste.ms에 색인된 목록)
  section?: RegExp; // 없으면 목록 전체
  kind: (text: string, section: string) => string; // 저장소 설명·칸 이름으로 소분류
  tags?: string[];
}

export interface RepoCandidate {
  slug: string; // owner/repo
  listName: string; // 목록에 적힌 이름
  listDescription: string;
  kind: string;
  tags: string[];
  lists: string[];
}

export async function candidatesFromLists(picks: ListPick[]): Promise<Map<string, RepoCandidate>> {
  const out = new Map<string, RepoCandidate>();
  for (const p of picks) {
    let entries: AwesomeEntry[];
    try {
      entries = await awesomeEntries(p.list);
    } catch (err) {
      console.warn(`  목록 실패 ${p.list}: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    let n = 0;
    for (const e of entries) {
      const section = `${e.category ?? ''} > ${e.subCategory ?? ''}`;
      if (p.section && !p.section.test(section)) continue;
      // 큰 저장소 안의 폴더·파일 링크(/tree/, /blob/)는 그 저장소 자체가 아니므로 건너뛴다.
      if (/github\.com\/[^/]+\/[^/]+\/(tree|blob)\//.test(e.url)) continue;
      const slug = githubSlug(e.url);
      if (!slug) continue;
      const key = slug.toLowerCase();
      const prev = out.get(key);
      if (prev) {
        if (!prev.lists.includes(p.list)) prev.lists.push(p.list);
        continue;
      }
      out.set(key, {
        slug,
        listName: e.name,
        listDescription: e.description,
        kind: p.kind(`${e.name} ${e.description}`, section),
        tags: p.tags ?? [],
        lists: [p.list],
      });
      n++;
    }
    console.log(`  ${p.list}: ${n}`);
  }
  return out;
}

export interface RepoItemOptions {
  sourceId: string;
  category: CategoryId;
  source: { name: string; url: string };
  minStars: number;
  dropArchived: boolean;
  install?: (m: RepoMeta) => string | undefined;
  rekind?: (c: RepoCandidate, m: RepoMeta) => string; // 저장소 정보(설명·주제)를 보고 소분류를 다시 고른다
  skip?: Set<string>; // 다른 출처에 이미 있는 저장소 (owner/repo 소문자)
}

export async function repoItems(cands: RepoCandidate[], o: RepoItemOptions): Promise<{ items: Item[]; dropped: Record<string, number> }> {
  const dropped: Record<string, number> = { missing: 0, fork: 0, archived: 0, stars: 0, adult: 0, elsewhere: 0 };
  let done = 0;
  const rows = await mapLimit(cands, 8, async (c) => {
    const m = await repoMeta(c.slug);
    progress('저장소', ++done, cands.length, 250);
    return { c, m };
  });
  const items: Item[] = [];
  for (const { c, m } of rows) {
    if (!m) { dropped.missing = (dropped.missing ?? 0) + 1; continue; }
    if (o.skip?.has(m.fullName.toLowerCase()) || o.skip?.has(c.slug.toLowerCase())) { dropped.elsewhere = (dropped.elsewhere ?? 0) + 1; continue; }
    if (m.fork) { dropped.fork = (dropped.fork ?? 0) + 1; continue; }
    if (o.dropArchived && m.archived) { dropped.archived = (dropped.archived ?? 0) + 1; continue; }
    if (m.stars < o.minStars) { dropped.stars = (dropped.stars ?? 0) + 1; continue; }
    if (isAdult([m.fullName, m.description, c.listDescription], m.topics)) { dropped.adult = (dropped.adult ?? 0) + 1; continue; }
    const repoName = m.fullName.split('/')[1] ?? m.fullName;
    // 목록에 적힌 이름은 저장소 이름과 닮았을 때만 쓴다 (표 칸의 라이선스 글 같은 엉뚱한 이름을 막는다).
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ln = c.listName && !/^https?:/.test(c.listName) && c.listName.length <= 60 ? c.listName : undefined;
    const listName = ln && norm(ln) && (norm(ln).includes(norm(repoName)) || norm(repoName).includes(norm(ln))) ? ln : undefined;
    const summary = summaryOf(m.description) ?? summaryOf(c.listDescription) ?? repoName;
    items.push(makeItem({
      id: makeId(o.sourceId, m.fullName),
      name: listName ?? repoName,
      kind: o.rekind ? o.rekind(c, m) : c.kind,
      category: o.category,
      summary,
      url: `https://github.com/${m.fullName}`,
      source: o.source,
      license: m.license,
      metrics: { stars: m.stars, updatedAt: m.pushedAt },
      tags: tagify([...c.tags, m.language, ...m.topics.slice(0, 8), m.archived ? 'archived' : undefined]),
      preview: { ...repoPreview(m), ...(m.homepage && isHttpUrl(m.homepage) ? { homepage: m.homepage } : {}), listedIn: c.lists },
      use: o.install ? { install: o.install(m) } : undefined,
    }));
  }
  return { items, dropped };
}

// ---------- GitHub 주제 검색 (되는 곳에서만) ----------
// 이 작업 환경의 프록시는 저장소에 묶인 세션이라 search API를 막는다. 토큰이 있는 곳(예: GitHub Actions)에서는
// 주제마다 별 많은 순으로 최대 1,000개(API 한도)까지 받는다. 막히면 빈 배열을 돌려주고 알린다.
let githubSearchBlocked = false;

// 검색 결과에 저장소 정보가 다 들어 있으므로 repoMeta 기억에 넣어 둔다 (후보마다 거울 서버에 다시 묻지 않는다, D128).
// 쪽 수는 GITHUB_TOPIC_PAGES(기본 10, 쪽마다 100개)로 줄일 수 있다: 매일 작업 흐름은 5쪽만 받는다.
export async function githubTopicRepos(topic: string, minStars: number): Promise<RepoMeta[]> {
  if (githubSearchBlocked) return [];
  const pages = Math.min(10, Math.max(1, Number(process.env.GITHUB_TOPIC_PAGES) || 10));
  const list = await cached(`gh-topic-${topic}-${minStars}-${pages}`, async () => {
    const out: RepoMeta[] = [];
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    for (let page = 1; page <= pages; page++) {
      const q = encodeURIComponent(`topic:${topic} stars:>=${minStars} fork:false`);
      const res = await fetchRaw(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=100&page=${page}`, {
        headers: { accept: 'application/vnd.github+json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        allowStatus: [401, 403, 422],
      });
      if (!res.ok) {
        const body = await res.text();
        if (res.status === 403 && /rate limit/i.test(body)) {
          await sleep(60_000);
          page--;
          continue;
        }
        githubSearchBlocked = true;
        console.warn(`  GitHub 검색을 쓸 수 없다 (${res.status}): 주제 검색은 건너뛴다`);
        return [];
      }
      const j = (await res.json()) as { items: { full_name: string; description: string | null; stargazers_count: number; license: { spdx_id: string | null } | null; homepage: string | null; language: string | null; topics?: string[]; pushed_at: string | null; archived: boolean; fork: boolean; is_template?: boolean; default_branch?: string }[] };
      for (const r of j.items) {
        out.push({
          fullName: r.full_name, host: 'github', description: r.description ?? '', stars: r.stargazers_count,
          license: cleanLicense(r.license?.spdx_id), homepage: r.homepage || undefined, language: r.language ?? undefined,
          topics: r.topics ?? [], pushedAt: toDate(r.pushed_at), archived: r.archived, fork: r.fork,
          template: r.is_template, defaultBranch: r.default_branch,
        });
      }
      if (j.items.length < 100) break;
      await sleep(2500); // 검색 API는 분당 30회
    }
    return out;
  }, 7);
  for (const m of list) if (!repoMemo.has(m.fullName.toLowerCase())) repoMemo.set(m.fullName.toLowerCase(), m);
  return list;
}

// ---------- 출처 사이 겹침 ----------
// 같은 저장소가 여러 출처에 나오면 정보가 더 많은 출처(공식 갤러리·전용 목록)에 두고, 넓게 모은 출처(awesome 목록)에서는 뺀다.
// 이미 쓴 자료 파일에서 GitHub 저장소(owner/repo, 소문자)를 모은다. 그래서 넓게 모으는 스크립트는 다른 출처 다음에 돈다.
export function knownRepos(category: CategoryId, exceptSources: string[]): Set<string> {
  const dir = join(CATALOG_DIR, category);
  const out = new Set<string>();
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json') || f === 'index.json' || exceptSources.includes(f.replace(/\.json$/, ''))) continue;
    const file = JSON.parse(readFileSync(join(dir, f), 'utf8')) as CatalogFile;
    for (const it of file.items) {
      const p = it.preview ?? { type: 'repo' };
      const cands = [it.url, typeof p.repo === 'string' ? (p.repo.startsWith('http') ? p.repo : `https://github.com/${p.repo}`) : undefined, typeof p.source === 'string' ? p.source : undefined];
      for (const u of cands) {
        if (!u || /\/(tree|blob)\//.test(u)) continue;
        const slug = githubSlug(u);
        if (slug) out.add(slug.toLowerCase());
      }
    }
  }
  return out;
}
