// API 진열대 가져오기 공용 도우미 (scripts/import/api-*.ts만 쓴다).
// 네트워크 요청(다시 시도·쉬어 가기), 동시 실행 묶음, 마크다운 표 읽기, 사이트 한 줄 소개 읽기,
// npm 꾸러미 확인, 상품 모양 맞추기, 정렬된 JSON 쓰기.
// 프록시(HTTPS_PROXY) 뒤에서는 Node가 프록시를 쓰도록 NODE_USE_ENV_PROXY=1로 자기 자신을 다시 띄운다.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_DIR = join(ROOT, 'data', 'catalog', 'api');
export const CATEGORY = 'api';
// 같은 날 다시 돌리면 같은 결과가 나오게 날짜만 쓴다. IMPORT_DATE로 고정할 수 있다.
export const FETCHED_AT = process.env.IMPORT_DATE ?? new Date().toISOString().slice(0, 10);
// 사람이 고른 항목(손 목록)은 고른 날을 둔다. 다시 돌려도 바뀌지 않게.
export const CURATED_AT = '2026-10-14';
export const USER_AGENT = 'codeshopper-catalog-import/1.0 (api shelf; https://github.com/yoorrard/code-chauffeur)';

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
  metrics?: { stars?: number; downloads?: number; likes?: number; updatedAt?: string };
  tags: string[];
  preview?: Preview;
  use?: { install?: string; snippet?: string; docs?: string };
  fetchedAt: string;
}

export interface SourceInfo {
  id: string; // 파일 이름 (data/catalog/api/<id>.json)
  name: string;
  url: string;
  license: string; // 목록 메타데이터를 싣는 근거
  note?: string;
}

export interface CatalogFile {
  source: SourceInfo;
  fetchedAt: string;
  count: number;
  items: Item[];
}

// ---------- 소분류 ----------
// 순서가 곧 화면 순서다. 새 kind는 여기에만 더한다 (목차 만들기·스키마 시험이 이 목록을 본다).
export const SUBCATEGORIES = [
  { id: 'ai-llm', nameKo: 'AI 언어 모델' },
  { id: 'ai-inference', nameKo: 'AI 모델 호스팅·라우터' },
  { id: 'ai-image', nameKo: 'AI 이미지·영상·3D' },
  { id: 'ai-audio', nameKo: 'AI 음성·음악' },
  { id: 'ai-embeddings', nameKo: 'AI 임베딩·리랭크' },
  { id: 'ai-search', nameKo: 'AI용 검색·웹 수집' },
  { id: 'ai-vision', nameKo: 'AI 비전·문서·번역' },
  { id: 'ai-other', nameKo: '그 밖의 AI·머신러닝' },
  { id: 'kr-public', nameKo: '한국 공공데이터' },
  { id: 'kr-dev', nameKo: '한국 개발자 API' },
  { id: 'open-data', nameKo: '공공·과학 데이터' },
  { id: 'maps', nameKo: '지도·위치·교통' },
  { id: 'weather', nameKo: '날씨·환경' },
  { id: 'finance', nameKo: '금융·암호화폐·환율' },
  { id: 'payments', nameKo: '결제·쇼핑' },
  { id: 'messaging', nameKo: '이메일·문자·메신저' },
  { id: 'auth-security', nameKo: '로그인·보안' },
  { id: 'dev', nameKo: '개발 도구' },
  { id: 'business', nameKo: '업무·생산성' },
  { id: 'media', nameKo: '사진·영상·음악' },
  { id: 'news-social', nameKo: '뉴스·소셜' },
  { id: 'text', nameKo: '글·사전·언어' },
  { id: 'entertainment', nameKo: '게임·애니·책·재미' },
  { id: 'life', nameKo: '생활·음식·건강·스포츠' },
  { id: 'cloud', nameKo: '클라우드 서비스' },
] as const;
export type Kind = (typeof SUBCATEGORIES)[number]['id'];
export const KINDS: readonly string[] = SUBCATEGORIES.map((s) => s.id);

// public-apis 계열 목록의 분류 → 소분류.
const PUBLIC_APIS_KIND: Record<string, Kind> = {
  'ai': 'ai-other',
  'machine learning': 'ai-other',
  'animals': 'life',
  'anime': 'entertainment',
  'anti-malware': 'auth-security',
  'art & design': 'media',
  'authentication & authorization': 'auth-security',
  'blockchain': 'finance',
  'books': 'entertainment',
  'business': 'business',
  'calendar': 'business',
  'cloud storage & file sharing': 'dev',
  'continuous integration': 'dev',
  'cryptocurrency': 'finance',
  'currency exchange': 'finance',
  'data validation': 'dev',
  'development': 'dev',
  'disasters': 'weather',
  'dictionaries': 'text',
  'documents & productivity': 'business',
  'email': 'messaging',
  'entertainment': 'entertainment',
  'education': 'open-data',
  'environment': 'weather',
  'events': 'life',
  'finance': 'finance',
  'food & drink': 'life',
  'fraud prevention': 'auth-security',
  'games & comics': 'entertainment',
  'geocoding': 'maps',
  'government': 'open-data',
  'health': 'life',
  'jobs': 'business',
  'music': 'media',
  'news': 'news-social',
  'open data': 'open-data',
  'open source projects': 'dev',
  'patent': 'open-data',
  'personality': 'entertainment',
  'phone': 'messaging',
  'photography': 'media',
  'podcasts': 'media',
  'programming': 'dev',
  'science & math': 'open-data',
  'security': 'auth-security',
  'shopping': 'payments',
  'social': 'news-social',
  'sports & fitness': 'life',
  'test data': 'dev',
  'text analysis': 'text',
  'tracking': 'maps',
  'transportation': 'maps',
  'url shorteners': 'dev',
  'vehicle': 'maps',
  'video': 'media',
  'weather': 'weather',
};

export function kindForPublicApis(category: string): Kind | undefined {
  return PUBLIC_APIS_KIND[category.trim().toLowerCase()];
}

// APIs.guru 분류(x-apisguru-categories 첫 값) → 소분류.
const GURU_KIND: Record<string, Kind> = {
  analytics: 'business',
  backend: 'dev',
  cloud: 'cloud',
  collaboration: 'business',
  customer_relation: 'business',
  developer_tools: 'dev',
  ecommerce: 'payments',
  education: 'open-data',
  email: 'messaging',
  enterprise: 'business',
  entertainment: 'entertainment',
  financial: 'finance',
  forms: 'business',
  hosting: 'cloud',
  iot: 'dev',
  location: 'maps',
  machine_learning: 'ai-other',
  marketing: 'business',
  media: 'media',
  messaging: 'messaging',
  monitoring: 'dev',
  open_data: 'open-data',
  payment: 'payments',
  project_management: 'business',
  search: 'text',
  security: 'auth-security',
  social: 'news-social',
  storage: 'cloud',
  support: 'business',
  telecom: 'messaging',
  text: 'text',
  time_management: 'business',
  tools: 'dev',
  transport: 'maps',
};

// 넓은 분류(분석·개발 도구)보다 좁은 분류(미디어·결제 등)를 먼저 고른다. 분류가 없으면 undefined.
const GURU_GENERIC = new Set(['analytics', 'developer_tools', 'tools', 'enterprise', 'backend']);

export function kindForGuru(categories: readonly string[] | undefined): Kind | undefined {
  const cats = (categories ?? []).map((c) => c.trim().toLowerCase()).filter((c) => GURU_KIND[c]);
  const pick = cats.find((c) => !GURU_GENERIC.has(c)) ?? cats[0];
  return pick ? GURU_KIND[pick] : undefined;
}

// 분류가 없는 목록(GraphQL 목록 등)은 설명 낱말로 고른다. 맞는 낱말이 없으면 개발 도구.
const KEYWORD_KIND: [RegExp, Kind][] = [
  [/\b(payment|checkout|e-?commerce|shop|store|commerce|barcode|product)/i, 'payments'],
  [/\b(blockchain|crypto|bitcoin|ethereum|on-chain|finance|bank|stock|currenc)/i, 'finance'],
  [/\b(transit|routing|route|train|bahn|bus|flight|ev\b|electric car|geoloc|location|map|countr|travel)/i, 'maps'],
  [/\b(weather|climate|air quality|environment)/i, 'weather'],
  [/\b(anime|manga|movie|film|game|pok[eé]mon|star wars|comic|book|art\b|museum)/i, 'entertainment'],
  [/\b(music|video|photo|image|podcast|media)/i, 'media'],
  [/\b(news|social|chat|community|blog)/i, 'news-social'],
  [/\b(health|food|recipe|sport|fitness|hiv|medic|drug)/i, 'life'],
  [/\b(science|chemical|research|archiv|space|nasa|government|open data|holocaust)/i, 'open-data'],
  [/\b(cms|content|business|crm|project|workflow|operations|jobs?\b|strategy|productivity)/i, 'business'],
  [/\b(auth|identity|security)/i, 'auth-security'],
  [/\b(email|sms|messag|telephon)/i, 'messaging'],
  [/\b(dictionar|language|translat|text)/i, 'text'],
];

export function kindByKeywords(text: string): Kind {
  for (const [re, k] of KEYWORD_KIND) if (re.test(text)) return k;
  return 'dev';
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

// ---------- 네트워크 ----------

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface FetchOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  retries?: number;
  timeoutMs?: number;
  allowStatus?: number[]; // 이 상태는 오류로 보지 않고 그대로 돌려준다 (예: 404)
  redirect?: 'follow' | 'manual';
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
        redirect: opts.redirect ?? 'follow',
        signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
      });
      if (res.ok || opts.allowStatus?.includes(res.status)) return res;
      if (opts.redirect === 'manual' && res.status >= 300 && res.status < 400) return res;
      // 429·5xx는 쉬었다가 다시. Retry-After가 있으면 따른다.
      if (res.status === 429 || res.status >= 500) {
        const after = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(after) && after > 0 ? after * 1000 : 1000 * 2 ** attempt;
        await res.body?.cancel();
        await sleep(Math.min(wait, 60_000));
        lastError = new HttpError(res.status, url);
        continue;
      }
      await res.body?.cancel();
      throw new HttpError(res.status, url);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      lastError = err; // 연결 끊김(ECONNRESET)·시간 초과는 쉬었다가 다시
      await sleep(Math.min(1000 * 2 ** attempt, 30_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`fetch failed: ${url}`);
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const res = await fetchRaw(url, opts);
  return res.text();
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const text = await fetchText(url, { ...opts, headers: { accept: 'application/json', ...opts.headers } });
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

// ---------- 글 다듬기 ----------

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'", rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', hellip: '…', middot: '·', trade: '™', reg: '®', copy: '©',
};

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

// 마크다운 꾸밈(링크·굵게·코드)을 벗긴 글.
export function stripMarkdown(md: string): string {
  return stripHtml(
    md
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]{1,3}([^*_`]+)[*_`]{1,3}/g, '$1')
      .replace(/^#+\s*/gm, ''),
  );
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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 로캘과 무관한 비교 (localeCompare를 쓰지 않는다).
export function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function uniqSorted(xs: Iterable<string>): string[] {
  return [...new Set([...xs].map((x) => x.trim()).filter(Boolean))].sort(cmp);
}

// 주소 비교용: 스킴·www·끝 빗금·#·추적 쿼리를 떼고 소문자로.
export function normUrl(u: string): string {
  let s = u.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.split('#')[0] ?? s;
  s = s.replace(/[?&](utm_[a-z]+|ref)=[^&]*/g, '').replace(/\?$/, '');
  return s.replace(/\/+$/, '');
}

export function hostOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

// 한글이 들어 있나.
export function hasHangul(s: string): boolean {
  return /[가-힣]/.test(s);
}

// ---------- 마크다운 표 ----------

export interface MdRow {
  section: string; // 바로 위 ### 제목
  cells: string[]; // 칸 원문 (앞뒤 공백 제거)
  header: string[]; // 그 표의 머리줄 칸 (소문자)
}

export function parseMarkdownTables(md: string): MdRow[] {
  const rows: MdRow[] = [];
  let section = '';
  let header: string[] = [];
  let inTable = false;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^#{2,4}\s/.test(line)) {
      section = line.replace(/^#+\s*/, '').trim();
      inTable = false;
      continue;
    }
    if (!line.startsWith('|') && !/^[^|]+\|[^|]+\|/.test(line)) {
      inTable = false;
      continue;
    }
    const cells = splitRow(line);
    if (cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue; // 구분 줄
    if (!inTable) {
      header = cells.map((c) => stripMarkdown(c).toLowerCase());
      inTable = true;
      continue;
    }
    rows.push({ section, cells, header });
  }
  return rows;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  // 링크 안의 | 는 거의 없지만, 코드 안 \| 는 살린다.
  return s.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim());
}

// 칸에서 첫 링크 [이름](주소).
export function firstLink(cell: string): { text: string; url: string } | undefined {
  const m = cell.match(/\[([^\]]+)\]\(\s*<?([^)\s>]+)>?\s*\)/);
  if (!m) return undefined;
  return { text: stripMarkdown(m[1] as string).trim(), url: (m[2] as string).trim() };
}

// ---------- 사이트 한 줄 소개 ----------
// 사이트가 스스로 쓴 한 줄(meta description/og:description)과 제목을 읽는다.
// 이 원문만 summary에 쓴다. 봇 막기 쪽·빈 소개는 버린다.

export interface SiteMeta { ok: boolean; status: number; finalUrl: string; title?: string; description?: string; text?: string }

function metaContent(html: string, key: string): string | undefined {
  const re1 = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, 'i');
  const m = html.match(re1) ?? html.match(re2);
  const v = m?.[1] ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : undefined;
  return v || undefined;
}

const JUNK_META = /just a moment|access denied|attention required|enable javascript|are you a robot|captcha|cloudflare|404|not found|page not found|forbidden|log ?in to|sign ?in to|redirecting|cannot be displayed|http response code|has been retired/i;
// 코드 조각·CSS 선택자가 소개 칸에 새어 나온 경우.
const CODE_META = /[{}]|=>|\bconst \w+ =|\(\)|\.fern-|^\s*\//;

export function usableDescription(d: string | undefined): string | undefined {
  if (!d) return undefined;
  const t = d.replace(/\s+/g, ' ').trim();
  if (t.length < 25 || JUNK_META.test(t) || CODE_META.test(t)) return undefined;
  return t;
}

// 넘겨주기(3xx)는 손으로 따라간다: 프록시 뒤에서 http:// 넘겨주기가 막히므로 https로 올리고,
// 로그인 확인 쪽(accounts.google.com 등)으로 돌거나 8번을 넘으면 '살아 있지만 소개를 못 읽음'으로 본다.
export async function siteMeta(url: string, opts: { withText?: boolean } = {}): Promise<SiteMeta> {
  let current = url;
  try {
    for (let hop = 0; hop < 8; hop++) {
      const res = await fetchRaw(current, {
        headers: {
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 codeshopper-catalog-import/1.0',
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'en,ko;q=0.8',
        },
        allowStatus: [400, 401, 403, 404, 405, 406, 410, 429, 451, 503],
        retries: 2,
        timeoutMs: 30_000,
        redirect: 'manual',
      });
      const status = res.status;
      if (status >= 300 && status < 400) {
        await res.body?.cancel();
        const loc = res.headers.get('location');
        if (!loc) return { ok: true, status, finalUrl: current };
        const next = new URL(loc, current);
        if (next.protocol === 'http:') next.protocol = 'https:';
        if (/(^|\.)accounts\.google\.com$|(^|\.)login\./i.test(next.hostname)) return { ok: true, status, finalUrl: current };
        current = next.toString();
        continue;
      }
      const html = (await res.text()).slice(0, 1_500_000);
      const titleRaw = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
      const title = titleRaw ? decodeEntities(titleRaw).replace(/\s+/g, ' ').trim() : undefined;
      const description = metaContent(html, 'description') ?? metaContent(html, 'og:description') ?? metaContent(html, 'twitter:description');
      const out: SiteMeta = { ok: status < 400, status, finalUrl: current, title, description };
      if (opts.withText) {
        out.text = stripHtml(
          html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
            .replace(/<\/(div|li|h[1-6]|tr|section|article|td|th)>/gi, '. '),
        );
      }
      return out;
    }
    return { ok: true, status: 310, finalUrl: current };
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 0;
    return { ok: false, status, finalUrl: current };
  }
}

// 요금 쪽 원문에서 무료 사용에 대한 문장 하나를 그대로 고른다 (지어내지 않는다).
// 질문(FAQ 제목)·다른 상품 이야기·기간 한정 행사처럼 오해를 부를 문장은 버린다. 못 찾으면 undefined.
const FREE_WORD = /\bfree\b|무료/i;
const FREE_SPECIFIC = /\d|no credit card|free (tier|plan|forever|quota|credits?|usage|requests?)|무료/i;
const FREE_NOISE = /\?|cookie|privacy|feel free|toll-free|free shipping|free-form|royalty-free|hands-free|risk-free|chatgpt|teachers?\b|startup|apply\b|downgrad|until \d|everything in the free|promo|limited time|black friday/i;

export function freeSentence(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const sentences = text
    .split(/(?<=[.!?。])\s+|\s{2,}|\s·\s|\s\|\s/)
    .map((s) => s.replace(/\s+\.$/, '.').trim())
    .filter((s) => s.length >= 30 && s.length <= 220);
  const hit = sentences.find((s) => FREE_WORD.test(s) && FREE_SPECIFIC.test(s) && !FREE_NOISE.test(s));
  return hit ? clip(hit, 220) : undefined;
}

// ---------- npm 꾸러미 ----------

export interface NpmInfo { name: string; exists: boolean; repo?: string; homepage?: string; weeklyDownloads?: number; deprecated?: boolean }

export async function npmInfo(name: string): Promise<NpmInfo> {
  try {
    const res = await fetchRaw(`https://registry.npmjs.org/${name.replace('/', '%2F')}`, {
      headers: { accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8' },
      allowStatus: [404],
      retries: 3,
    });
    if (res.status === 404) {
      await res.body?.cancel();
      return { name, exists: false };
    }
    const j = (await res.json()) as { 'dist-tags'?: { latest?: string }; versions?: Record<string, { deprecated?: string }>; repository?: { url?: string } | string; homepage?: string };
    const full = await fetchJson<{ repository?: { url?: string } | string; homepage?: string; 'dist-tags'?: { latest?: string }; versions?: Record<string, { deprecated?: string }> }>(
      `https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`,
      { retries: 3 },
    ).catch(() => undefined);
    const repoRaw = full?.repository ?? j.repository;
    const repo = typeof repoRaw === 'string' ? repoRaw : repoRaw?.url;
    const latest = j['dist-tags']?.latest;
    const deprecated = Boolean(latest && j.versions?.[latest]?.deprecated);
    let weeklyDownloads: number | undefined;
    try {
      const d = await fetchJson<{ downloads?: number }>(`https://api.npmjs.org/downloads/point/last-week/${name}`, { retries: 3 });
      weeklyDownloads = typeof d.downloads === 'number' ? d.downloads : undefined;
    } catch {
      weeklyDownloads = undefined;
    }
    return { name, exists: true, repo, homepage: full?.homepage ?? j.homepage, weeklyDownloads, deprecated };
  } catch {
    return { name, exists: false };
  }
}

// ---------- 상품 모양 ----------

export function makeItem(x: Omit<Item, 'category' | 'fetchedAt'> & { fetchedAt?: string }): Item {
  if (!x.summary) throw new Error(`summary 비었음: ${x.id}`);
  if (!KINDS.includes(x.kind)) throw new Error(`알 수 없는 kind ${x.kind}: ${x.id}`);
  // 키 순서를 고정해 다시 돌려도 같은 파일이 나오게 한다.
  return {
    id: safeId(x.id),
    name: x.name.replace(/\s+/g, ' ').trim(),
    kind: x.kind,
    category: CATEGORY,
    summary: clip(x.summary),
    ...(x.summaryKo ? { summaryKo: clip(x.summaryKo) } : {}),
    ...(x.written ? { written: x.written } : {}),
    url: x.url,
    source: { name: x.source.name, url: x.source.url },
    ...(x.license ? { license: x.license } : {}),
    ...(x.metrics && Object.values(x.metrics).some((v) => v !== undefined) ? { metrics: cleanMetrics(x.metrics) } : {}),
    tags: uniqSorted(x.tags.map((t) => t.toLowerCase())),
    ...(x.preview ? { preview: cleanPreview(x.preview) } : {}),
    ...(x.use && Object.values(x.use).some(Boolean) ? { use: cleanUse(x.use) } : {}),
    fetchedAt: x.fetchedAt ?? FETCHED_AT,
  };
}

// id는 '<출처>:<슬러그>'. 슬러그는 주소 한 칸에 그대로 넣을 수 있게 소문자·숫자·점·하이픈만 남긴다.
export function safeId(id: string): string {
  const i = id.indexOf(':');
  if (i <= 0) throw new Error(`id에 출처가 없다: ${id}`);
  const src = id.slice(0, i).toLowerCase();
  const slug = id
    .slice(i + 1)
    .toLowerCase()
    .replace(/\//g, '--')
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-{3,}/g, '--')
    .replace(/^[-.]+|[-.]+$/g, '');
  if (!slug) throw new Error(`id 슬러그가 비었다: ${id}`);
  return `${src}:${slug}`;
}

// 같은 출처 안에서 슬러그가 겹치면 -2, -3 …을 붙인다 (입력 순서가 같으면 결과도 같다).
export function uniqueIds(items: Item[]): Item[] {
  const seen = new Map<string, number>();
  return items.map((it) => {
    const n = (seen.get(it.id) ?? 0) + 1;
    seen.set(it.id, n);
    return n === 1 ? it : { ...it, id: `${it.id}-${n}` };
  });
}

function cleanMetrics(m: NonNullable<Item['metrics']>): NonNullable<Item['metrics']> {
  const out: NonNullable<Item['metrics']> = {};
  if (m.stars !== undefined) out.stars = m.stars;
  if (m.downloads !== undefined) out.downloads = m.downloads;
  if (m.likes !== undefined) out.likes = m.likes;
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

// 미리 보기 칸: 빈 값은 빼고, type을 먼저, 나머지는 이름 순.
function cleanPreview(p: Preview): Preview {
  const out: Preview = { type: p.type };
  for (const k of Object.keys(p).filter((k) => k !== 'type').sort(cmp)) {
    const v = p[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    out[k] = v;
  }
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
  writeFileSync(join(OUT_DIR, `${source.id}.json`), `${JSON.stringify(file, null, 2)}\n`);
  console.log(`  → data/catalog/api/${source.id}.json (${sorted.length})`);
  return file;
}

export function readCatalog(id: string): CatalogFile | undefined {
  const path = join(OUT_DIR, `${id}.json`);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, 'utf8')) as CatalogFile;
}

// 가져오기 중간 결과(사이트 소개·링크 확인)를 같은 날 다시 쓰려고 두는 곳. 저장소에 넣지 않는다.
export const CACHE_DIR = join(ROOT, 'node_modules', '.cache', 'codeshopper-import-api');

export function readCache<T>(name: string): T | undefined {
  const p = join(CACHE_DIR, `${name}.json`);
  if (!existsSync(p)) return undefined;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

export function writeCache(name: string, data: unknown): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, `${name}.json`), JSON.stringify(data));
}

export async function main(name: string, run: () => Promise<void>): Promise<void> {
  ensureProxyEnv();
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
