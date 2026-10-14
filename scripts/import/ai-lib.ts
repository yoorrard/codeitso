// AI 확장 진열대 가져오기 공용 도우미 (scripts/import/ai-*.ts만 쓴다).
// 네트워크(다시 시도·쉬어 가기·프록시), 동시 실행 묶음, 얕은 git 복제, 머리말(YAML) 읽기,
// GitHub 저장소 정보, 상품 모양 맞추기, 출처 사이 중복 정리, 정렬된 JSON 쓰기.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_DIR = join(ROOT, 'data', 'catalog', 'ai');
export const CATEGORY = 'ai';
// 같은 날 다시 돌리면 같은 결과가 나오게 날짜만 쓴다. IMPORT_DATE로 고정할 수 있다.
export const FETCHED_AT = process.env.IMPORT_DATE ?? new Date().toISOString().slice(0, 10);
export const USER_AGENT = 'codeshopper-catalog-import/1.0 (ai shelf; https://github.com/yoorrard/code-chauffeur)';
// 복제한 저장소를 두는 곳. 저장소 밖이라 커밋되지 않는다.
export const CACHE_DIR = process.env.AI_IMPORT_CACHE ?? join(tmpdir(), 'codeshopper-ai-import');

// 프록시 뒤(HTTPS_PROXY)에서는 Node 내장 fetch가 프록시를 쓰도록 NODE_USE_ENV_PROXY=1로 자기 자신을 다시 띄운다.
// Node 22.21 이상에서 듣는다. 프록시가 없는 보통 컴퓨터에서는 아무 일도 하지 않는다.
export function ensureProxy(): void {
  const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (!proxy || process.env.NODE_USE_ENV_PROXY === '1') return;
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' },
  });
  process.exit(r.status ?? 1);
}

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
  id: string; // 파일 이름 (data/catalog/ai/<id>.json)
  name: string;
  url: string;
  kind: string; // 이 출처가 채우는 소분류
  license: string; // 목록 메타데이터를 싣는 근거 (자료의 라이선스나 이용 조건)
  note?: string;
}

export interface CatalogFile {
  source: SourceInfo;
  fetchedAt: string;
  count: number;
  available: number; // 출처에 있던 개수 (중복·인기 기준으로 덜어 내기 전)
  cut?: string; // 덜어 낸 기준 (없으면 전부 실음)
  items: Item[];
}

// ---------- 네트워크 ----------

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export class HttpError extends Error {
  status: number;
  url: string;
  constructor(status: number, url: string) {
    super(`HTTP ${status} ${url}`);
    this.status = status;
    this.url = url;
  }
}

export interface FetchOptions {
  headers?: Record<string, string>;
  retries?: number;
  timeoutMs?: number;
  method?: 'GET' | 'POST';
  body?: string;
}

export async function fetchRaw(url: string, opts: FetchOptions = {}): Promise<Response> {
  const retries = opts.retries ?? 5;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: opts.method ?? 'GET',
        body: opts.body,
        headers: { 'user-agent': USER_AGENT, accept: '*/*', ...(opts.body ? { 'content-type': 'application/json' } : {}), ...opts.headers },
        redirect: 'follow',
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      if (res.ok) return res;
      // 429·5xx는 쉬었다가 다시 (Retry-After를 따른다). 나머지는 바로 실패.
      if (res.status === 429 || res.status >= 500) {
        const after = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(after) && after > 0 ? after * 1000 : 1500 * 2 ** attempt;
        await res.body?.cancel();
        lastError = new HttpError(res.status, url);
        await sleep(Math.min(wait, 90_000));
        continue;
      }
      await res.body?.cancel();
      throw new HttpError(res.status, url);
    } catch (err) {
      if (err instanceof HttpError && err.status !== 429 && err.status < 500) throw err;
      lastError = err;
      await sleep(Math.min(1500 * 2 ** attempt, 30_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`fetch failed: ${url}`);
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  return (await fetchRaw(url, opts)).text();
}

// 같은 날 다시 돌릴 때 이미 받은 응답을 쓴다 (큰 등록소를 처음부터 다시 받지 않으려고).
// 캐시는 CACHE_DIR/http/<날짜>/ 아래에 두고, AI_IMPORT_NO_CACHE=1이면 끈다.
function cachePath(url: string, body?: string): string {
  return join(CACHE_DIR, 'http', FETCHED_AT, `${createHash('sha1').update(url + (body ?? '')).digest('hex')}.json`);
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const useCache = process.env.AI_IMPORT_NO_CACHE !== '1';
  const path = cachePath(url, opts.body);
  if (useCache && existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as T;
  const text = await fetchText(url, { ...opts, headers: { accept: 'application/json', ...opts.headers } });
  const parsed = JSON.parse(text) as T;
  if (useCache) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  return parsed;
}

// 동시 실행 개수를 정해 차례로 돈다. 결과 순서는 입력 순서와 같다.
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i] as T, i);
    }
  });
  await Promise.all(workers);
  return out;
}

export function log(msg: string): void {
  console.log(msg);
}

// ---------- git 얕은 복제 ----------
// GitHub REST API는 세션·토큰에 따라 막힐 수 있어서, 파일 목록과 내용은 git으로 받는다(익명 공개 읽기).
// blob 없이 받은 뒤 필요한 경로만 꺼낸다.

export interface Repo {
  dir: string;
  slug: string; // owner/repo
  branch: string;
  files: string[]; // 저장소 안 모든 파일 경로
}

const repoCache = new Map<string, Repo>();

export function cloneRepo(slug: string, sparse: string[] = []): Repo {
  const cached = repoCache.get(slug);
  if (cached) {
    if (sparse.length) checkout(cached, sparse);
    return cached;
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  const dir = join(CACHE_DIR, slug.replace('/', '__'));
  let fresh = false;
  if (existsSync(join(dir, '.git'))) {
    // 이미 받은 복제본은 새 커밋만 받아 맞춘다 (여러 스크립트가 같은 저장소를 쓴다).
    try {
      git(['-C', dir, 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', 'HEAD']);
      git(['-C', dir, 'reset', '-q', '--soft', 'FETCH_HEAD']);
      fresh = true;
    } catch {
      fresh = false;
    }
  }
  if (!fresh) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    git(['clone', '-q', '--depth', '1', '--filter=blob:none', '--no-checkout', `https://github.com/${slug}.git`, dir]);
  }
  const branch = git(['-C', dir, 'rev-parse', '--abbrev-ref', 'HEAD']).trim();
  const files = git(['-C', dir, 'ls-tree', '-r', '--name-only', 'HEAD']).split('\n').filter(Boolean);
  const repo: Repo = { dir, slug, branch, files };
  repoCache.set(slug, repo);
  if (sparse.length) checkout(repo, sparse);
  return repo;
}

// 고른 경로만 작업 폴더로 꺼낸다. 경로가 많으면 나눠서 넘긴다.
export function checkout(repo: Repo, paths: string[]): void {
  const want = paths.filter((p) => repo.files.includes(p));
  for (let i = 0; i < want.length; i += 200) {
    git(['-C', repo.dir, 'checkout', '-q', 'HEAD', '--', ...want.slice(i, i + 200)]);
  }
}

export function readRepoFile(repo: Repo, path: string): string | undefined {
  const full = join(repo.dir, path);
  if (!existsSync(full)) checkout(repo, [path]);
  return existsSync(full) ? readFileSync(full, 'utf8') : undefined;
}

export function repoTreeUrl(repo: Repo, path: string, kind: 'tree' | 'blob' = 'tree'): string {
  return `https://github.com/${repo.slug}/${kind}/${repo.branch}/${path}`.replace(/\/$/, '');
}

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

// 폴더 안 파일을 모두 나열한다 (복제본 대신 로컬 시험 자료에 쓸 때).
export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(dir, full));
    }
  };
  walk(dir);
  return out;
}

// ---------- GitHub 저장소 정보 ----------
// 1) gh CLI → 2) GITHUB_TOKEN으로 REST → 3) repos.ecosyste.ms(공개 미러, CC BY-SA 4.0).

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
}

let ghWorks: boolean | undefined;
const metaCache = new Map<string, RepoMeta | null>();

interface GithubRepoJson {
  full_name: string; description: string | null; stargazers_count: number;
  license: { spdx_id: string | null } | null; homepage: string | null; language: string | null;
  topics?: string[]; pushed_at: string | null; archived: boolean;
}
interface EcoRepoJson {
  full_name: string; description: string | null; stargazers_count: number; license: string | null;
  homepage: string | null; language: string | null; topics: string[] | null; pushed_at: string | null; archived: boolean;
}

const SPDX: Record<string, string> = {
  mit: 'MIT', 'apache-2.0': 'Apache-2.0', 'bsd-3-clause': 'BSD-3-Clause', 'bsd-2-clause': 'BSD-2-Clause',
  'gpl-3.0': 'GPL-3.0', 'gpl-2.0': 'GPL-2.0', 'agpl-3.0': 'AGPL-3.0', 'lgpl-3.0': 'LGPL-3.0', 'lgpl-2.1': 'LGPL-2.1',
  'mpl-2.0': 'MPL-2.0', unlicense: 'Unlicense', 'cc0-1.0': 'CC0-1.0', isc: 'ISC', 'cc-by-4.0': 'CC-BY-4.0',
  'cc-by-sa-4.0': 'CC-BY-SA-4.0', 'epl-2.0': 'EPL-2.0', 'bsl-1.0': 'BSL-1.0', '0bsd': '0BSD', 'artistic-2.0': 'Artistic-2.0',
  wtfpl: 'WTFPL', zlib: 'Zlib', 'cc-by-nc-4.0': 'CC-BY-NC-4.0', 'cc-by-nc-sa-4.0': 'CC-BY-NC-SA-4.0', 'eupl-1.2': 'EUPL-1.2',
};

// 라이선스 이름을 SPDX 표기로 맞춘다. 알 수 없거나 'other'면 비운다 (지어내지 않는다).
export function normalizeLicense(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  const low = s.toLowerCase();
  if (!s || low === 'other' || low === 'noassertion' || low === 'none' || low === 'null') return undefined;
  if (SPDX[low]) return SPDX[low];
  const byName: [RegExp, string][] = [
    [/^mit( license)?$/i, 'MIT'], [/^apache( license)?,? (version )?2\.0$/i, 'Apache-2.0'], [/^apache-2$/i, 'Apache-2.0'],
    [/^bsd 3-clause/i, 'BSD-3-Clause'], [/^bsd 2-clause/i, 'BSD-2-Clause'], [/^isc( license)?$/i, 'ISC'],
    [/^gnu general public license v3/i, 'GPL-3.0'], [/^gnu affero general public license v3/i, 'AGPL-3.0'],
    [/^mozilla public license 2\.0$/i, 'MPL-2.0'], [/^the unlicense$/i, 'Unlicense'], [/^creative commons zero/i, 'CC0-1.0'],
  ];
  for (const [re, id] of byName) if (re.test(s)) return id;
  // 이미 SPDX 꼴이면 그대로 둔다 (예: Apache-2.0, GPL-3.0-only).
  if (/^[A-Za-z0-9.+-]+$/.test(s) && s.length <= 40) return s;
  return undefined;
}

function ghAvailable(): boolean {
  if (ghWorks !== undefined) return ghWorks;
  try {
    // 세션이 정한 저장소로만 묶인 토큰이면 공개 저장소 조회가 막힌다. 그래서 공개 저장소 하나로 확인한다.
    execFileSync('gh', ['api', 'repos/octocat/Hello-World', '--jq', '.id'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 20_000 });
    ghWorks = true;
  } catch {
    ghWorks = false;
  }
  return ghWorks;
}

export async function repoMeta(slug: string): Promise<RepoMeta | null> {
  const key = slug.toLowerCase();
  if (metaCache.has(key)) return metaCache.get(key) ?? null;
  let meta: RepoMeta | null = null;
  if (ghAvailable()) {
    try {
      const out = execFileSync('gh', ['api', `repos/${slug}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000 });
      const j = JSON.parse(out) as GithubRepoJson;
      meta = {
        fullName: j.full_name, description: j.description ?? '', stars: j.stargazers_count,
        license: normalizeLicense(j.license?.spdx_id), homepage: j.homepage || undefined, language: j.language ?? undefined,
        topics: j.topics ?? [], pushedAt: j.pushed_at?.slice(0, 10), archived: j.archived,
      };
    } catch {
      meta = null;
    }
  }
  if (!meta && process.env.GITHUB_TOKEN && !process.env.GITHUB_TOKEN.includes('injected')) {
    try {
      const j = await fetchJson<GithubRepoJson>(`https://api.github.com/repos/${slug}`, {
        headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }, retries: 2,
      });
      meta = {
        fullName: j.full_name, description: j.description ?? '', stars: j.stargazers_count,
        license: normalizeLicense(j.license?.spdx_id), homepage: j.homepage || undefined, language: j.language ?? undefined,
        topics: j.topics ?? [], pushedAt: j.pushed_at?.slice(0, 10), archived: j.archived,
      };
    } catch {
      meta = null;
    }
  }
  if (!meta) {
    try {
      const j = await fetchJson<EcoRepoJson>(
        `https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/${encodeURIComponent(slug)}`, { retries: 3 },
      );
      meta = {
        fullName: j.full_name, description: j.description ?? '', stars: j.stargazers_count,
        license: normalizeLicense(j.license), homepage: j.homepage || undefined, language: j.language ?? undefined,
        topics: j.topics ?? [], pushedAt: j.pushed_at?.slice(0, 10), archived: j.archived,
      };
    } catch {
      meta = null;
    }
  }
  metaCache.set(key, meta);
  return meta;
}

// ---------- 글 다듬기 ----------

// 출처 글을 한 문단으로 줄이고 300자 안으로 자른다 (단어 중간에서 자르지 않는다).
export function clip(text: string | null | undefined, max = 300): string {
  if (!text) return '';
  const s = text
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 그림
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // 링크는 글자만
    .replace(/<[^>]+>/g, ' ')
    .replace(/`+/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/(^|\n)\s*[#>]+\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if ([...s].length <= max) return s;
  const chars = [...s].slice(0, max - 1).join('');
  const cut = chars.lastIndexOf(' ');
  return `${(cut > max * 0.6 ? chars.slice(0, cut) : chars).replace(/[\s,.;:–—-]+$/, '')}…`;
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

export function tagify(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_/]+/g, '-').replace(/[^a-z0-9가-힣.+#-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function uniqTags(tags: (string | null | undefined)[], max = 12): string[] {
  const out: string[] = [];
  for (const t of tags) {
    if (!t) continue;
    const v = tagify(t);
    if (v && v.length <= 40 && !out.includes(v)) out.push(v);
  }
  return out.slice(0, max).sort();
}

// "https://github.com/a/b/tree/main/x" → "a/b", 아니면 undefined
export function githubSlug(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const m = /^(?:git\+)?(?:https?:\/\/|git@)(?:www\.)?github\.com[/:]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[/#?].*)?$/.exec(url.trim());
  if (!m || !m[1] || !m[2]) return undefined;
  return `${m[1]}/${m[2]}`;
}

// 중복 정리용 열쇠: GitHub 저장소(+ 하위 경로)면 소문자 경로, 아니면 주소 그대로.
export function dedupeKey(url: string | null | undefined, subPath?: string): string | undefined {
  const slug = githubSlug(url);
  if (slug) {
    const path = (subPath ?? '').replace(/^\/+|\/+$/g, '');
    return `gh:${slug.toLowerCase()}${path ? `/${path.toLowerCase()}` : ''}`;
  }
  if (!url) return undefined;
  return url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

export function isoDate(v: string | number | null | undefined): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

// ---------- 머리말(YAML) ----------
// SKILL.md·에이전트 .md·server.yaml에 쓰이는 단순한 YAML만 읽는다:
// 키: 값, 따옴표 문자열, 블록 글(| >), 들여쓴 맵, '- ' 목록, [a, b] 한 줄 목록.

export type Yaml = string | number | boolean | null | Yaml[] | { [k: string]: Yaml };

export function splitFrontMatter(text: string): { data: Record<string, Yaml>; body: string } {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(src);
  if (!m) return { data: {}, body: src };
  let data: Record<string, Yaml> = {};
  try {
    const parsed = parseYaml(m[1] ?? '');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
  } catch {
    data = {};
  }
  return { data, body: src.slice(m[0].length) };
}

interface Line { indent: number; text: string }

export function parseYaml(src: string): Yaml {
  const lines: Line[] = [];
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*#/.test(raw) || raw.trim() === '') {
      lines.push({ indent: -1, text: raw }); // 빈 줄은 블록 글 안에서만 뜻이 있다
      continue;
    }
    const indent = raw.length - raw.trimStart().length;
    lines.push({ indent, text: raw });
  }
  const pos = { i: 0 };
  return parseBlock(lines, pos, 0);
}

function nextContent(lines: Line[], pos: { i: number }): Line | undefined {
  while (pos.i < lines.length && (lines[pos.i] as Line).indent < 0) pos.i++;
  return lines[pos.i];
}

function parseBlock(lines: Line[], pos: { i: number }, minIndent: number): Yaml {
  const first = nextContent(lines, pos);
  if (!first || first.indent < minIndent) return null;
  const indent = first.indent;
  if (first.text.trimStart().startsWith('- ') || first.text.trim() === '-') {
    const arr: Yaml[] = [];
    while (true) {
      const ln = nextContent(lines, pos);
      if (!ln || ln.indent !== indent) break;
      const t = ln.text.trimStart();
      if (!(t.startsWith('- ') || t === '-')) break;
      const rest = t === '-' ? '' : t.slice(2);
      pos.i++;
      if (rest === '') {
        arr.push(parseBlock(lines, pos, indent + 1));
      } else if (/^[^'"\s][^:]*:(\s|$)/.test(rest) && !/^https?:/.test(rest)) {
        // "- key: value" 꼴: 같은 항목의 다음 키들은 더 깊이 들여쓴다
        const virt: Line[] = [{ indent: indent + 2, text: `${' '.repeat(indent + 2)}${rest}` }];
        let j = pos.i;
        while (j < lines.length) {
          const l = lines[j] as Line;
          if (l.indent >= 0 && l.indent <= indent) break;
          virt.push(l);
          j++;
        }
        pos.i = j;
        arr.push(parseBlock(virt, { i: 0 }, indent + 1));
      } else {
        arr.push(scalar(rest));
      }
    }
    return arr;
  }
  const obj: Record<string, Yaml> = {};
  while (true) {
    const ln = nextContent(lines, pos);
    if (!ln || ln.indent !== indent) break;
    const t = ln.text.trim();
    const m = /^("[^"]*"|'[^']*'|[^:]+?)\s*:(?:\s+(.*))?$/.exec(t);
    if (!m) {
      pos.i++;
      continue;
    }
    const key = unquote((m[1] ?? '').trim());
    const rest = (m[2] ?? '').trim();
    pos.i++;
    if (/^[|>][-+]?\d*$/.test(rest)) {
      obj[key] = blockScalar(lines, pos, indent, rest);
    } else if (rest === '' || rest.startsWith('#')) {
      const nxt = nextContent(lines, pos);
      if (nxt && (nxt.indent > indent || (nxt.indent === indent && nxt.text.trimStart().startsWith('- ')))) {
        obj[key] = parseBlock(lines, pos, nxt.indent);
      } else {
        obj[key] = null;
      }
    } else {
      // 여러 줄로 이어진 평문 (들여쓴 다음 줄)
      let value = rest;
      while (pos.i < lines.length) {
        const l = lines[pos.i] as Line;
        if (l.indent < 0) break;
        if (l.indent <= indent) break;
        value += ` ${l.text.trim()}`;
        pos.i++;
      }
      obj[key] = scalar(value);
    }
  }
  return obj;
}

function blockScalar(lines: Line[], pos: { i: number }, parentIndent: number, header: string): string {
  const folded = header.startsWith('>');
  const parts: string[] = [];
  let blockIndent = -1;
  while (pos.i < lines.length) {
    const l = lines[pos.i] as Line;
    if (l.indent >= 0 && l.indent <= parentIndent) break;
    if (l.indent < 0) {
      parts.push('');
    } else {
      if (blockIndent < 0) blockIndent = l.indent;
      parts.push(l.text.slice(Math.min(blockIndent, l.indent)));
    }
    pos.i++;
  }
  while (parts.length && parts[parts.length - 1] === '') parts.pop();
  if (!folded) return parts.join('\n');
  return parts.reduce((acc, p) => (p === '' ? `${acc}\n` : acc === '' || acc.endsWith('\n') ? acc + p : `${acc} ${p}`), '');
}

function unquote(s: string): string {
  if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) {
    const inner = s.slice(1, -1);
    return s.startsWith('"')
      ? inner.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      : inner.replace(/''/g, "'");
  }
  return s;
}

function scalar(raw: string): Yaml {
  let s = raw.trim();
  if (!(s.startsWith('"') || s.startsWith("'"))) s = s.replace(/\s+#.*$/, '');
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return splitFlow(inner).map((x) => scalar(x));
  }
  if (s.startsWith('"') || s.startsWith("'")) return unquote(s);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(s) && s.length < 16) return Number(s);
  return s;
}

function splitFlow(s: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q: string | null = null;
  for (const ch of s) {
    if (q) {
      cur += ch;
      if (ch === q) q = null;
    } else if (ch === '"' || ch === "'") {
      q = ch;
      cur += ch;
    } else if (ch === ',') {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function str(v: Yaml | undefined): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

export function strList(v: Yaml | undefined): string[] {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter((x): x is string => !!x);
  const s = str(v);
  return s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [];
}

// ---------- CSV ----------

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...body] = rows;
  if (!head) return [];
  return body
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
}

// ---------- 상품 만들기·쓰기 ----------

export interface ItemInput {
  sourceId: string; // id 앞부분 (<source>:<slug>)
  slug: string;
  name: string;
  kind: string;
  summary: string | null | undefined;
  summaryKo?: string;
  written?: 'codeshopper';
  url: string;
  source: { name: string; url: string };
  license?: string | null;
  metrics?: Metrics;
  tags?: (string | null | undefined)[];
  preview?: Preview;
  use?: { install?: string; snippet?: string; docs?: string };
}

// git+https://…, 끝의 .git, 빈칸을 정리한다. http(s)가 아니면 undefined.
export function safeUrl(raw: string | null | undefined): string | undefined {
  const u = (raw ?? '').trim().replace(/^git\+/, '').replace(/^git:\/\//, 'https://');
  if (!/^https?:\/\/[^\s]+$/.test(u)) return undefined;
  return /github\.com\/[^/]+\/[^/]+\.git$/.test(u) ? u.replace(/\.git$/, '') : u;
}

export function makeItem(i: ItemInput): Item {
  const item: Item = {
    id: `${i.sourceId}:${slugify(i.slug)}`,
    name: ((i.name ?? '').trim() || i.slug).slice(0, 120),
    kind: i.kind,
    category: CATEGORY,
    summary: clip(i.summary),
    url: safeUrl(i.url) ?? i.source.url,
    source: i.source,
    tags: uniqTags(i.tags ?? []),
    fetchedAt: FETCHED_AT,
  };
  if (i.summaryKo) item.summaryKo = clip(i.summaryKo);
  if (i.written) item.written = i.written;
  const lic = normalizeLicense(i.license ?? undefined);
  if (lic) item.license = lic;
  const m = cleanMetrics(i.metrics);
  if (m) item.metrics = m;
  if (i.preview) item.preview = dropEmpty(i.preview) as Preview;
  if (i.use) {
    // 출처 주소에 붙은 빈칸을 지우고, http(s)가 아닌 문서 주소는 버린다.
    const docs = i.use.docs?.trim();
    const use = dropEmpty({ ...i.use, docs: docs && /^https?:\/\//.test(docs) ? docs : undefined }) as Item['use'];
    if (use && Object.keys(use).length) item.use = use;
  }
  return item;
}

function cleanMetrics(m: Metrics | undefined): Metrics | undefined {
  if (!m) return undefined;
  const out: Metrics = {};
  if (typeof m.stars === 'number' && Number.isFinite(m.stars) && m.stars >= 0) out.stars = Math.round(m.stars);
  if (typeof m.downloads === 'number' && Number.isFinite(m.downloads) && m.downloads >= 0) out.downloads = Math.round(m.downloads);
  if (typeof m.likes === 'number' && Number.isFinite(m.likes) && m.likes >= 0) out.likes = Math.round(m.likes);
  if (m.updatedAt) out.updatedAt = m.updatedAt;
  return Object.keys(out).length ? out : undefined;
}

function dropEmpty(v: unknown): unknown {
  if (Array.isArray(v)) {
    const a = v.map(dropEmpty).filter((x) => x !== undefined);
    return a.length ? a : undefined;
  }
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      const y = dropEmpty(x);
      if (y !== undefined) o[k] = y;
    }
    return Object.keys(o).length ? o : undefined;
  }
  if (v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return undefined;
  return v;
}

// id가 겹치면 뒤의 것에 -2, -3을 붙인다 (같은 이름의 스킬이 여러 폴더에 있을 때).
export function uniqueIds(items: Item[]): Item[] {
  const seen = new Map<string, number>();
  for (const it of items) {
    const n = (seen.get(it.id) ?? 0) + 1;
    seen.set(it.id, n);
    if (n > 1) it.id = `${it.id}-${n}`;
  }
  return items;
}

// 같은 재료가 여러 출처에 있으면 앞 출처(우선순위가 높은 쪽)에만 남긴다.
// 열쇠는 여러 개일 수 있다 (저장소 주소, 설명 첫머리 …). 하나라도 겹치면 같은 재료로 본다.
// 뒤 출처의 인기 지표는 앞 항목에 비어 있을 때만 채운다.
export type KeyFn = (it: Item) => string | (string | undefined)[] | undefined;

// mergeStars가 false면 별은 옮기지 않는다: 모음 저장소의 별을 파일 하나하나의 인기로 잘못 보이지 않게.
// self가 false인 출처는 자기 안에서는 겹침을 보지 않는다 (등록소 안의 항목은 이름이 달라서 이미 서로 다른 재료다).
export function dedupeAcross(groups: { key: KeyFn; items: Item[]; self?: boolean }[], opts: { mergeStars?: boolean } = {}): Item[][] {
  const owner = new Map<string, { item: Item; group: number }>();
  return groups.map((g, gi) => {
    const kept: Item[] = [];
    for (const it of g.items) {
      const raw = g.key(it);
      const keys = (Array.isArray(raw) ? raw : [raw]).filter((k): k is string => !!k);
      const prev = keys.map((k) => owner.get(k)).find((x) => x !== undefined && (x.group !== gi || g.self !== false));
      if (prev) {
        if (it.metrics) {
          const { stars, ...rest } = it.metrics;
          prev.item.metrics = { ...(opts.mergeStars !== false && stars !== undefined ? { stars } : {}), ...rest, ...prev.item.metrics };
        }
        continue;
      }
      for (const k of keys) if (!owner.has(k)) owner.set(k, { item: it, group: gi });
      kept.push(it);
    }
    return kept;
  });
}

// 설명 첫머리(소문자, 글자·숫자만 80자)로 만든 열쇠. 같은 파일을 여러 모음이 옮겨 실었을 때 잡는다.
export function textKey(it: Item, prefix = 'text'): string | undefined {
  const t = it.summary.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 80);
  return t.length >= 40 ? `${prefix}:${it.kind}:${t}` : undefined;
}

const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// 키를 알파벳 순으로 정렬한 값 (파일 비교가 쉽도록)
export function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .sort(cmpStr)
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

// 한 상품을 한 줄에 쓴다. 같은 입력이면 같은 파일이 나온다.
export function writeCatalog(file: Omit<CatalogFile, 'count' | 'fetchedAt'>): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const items = uniqueIds([...file.items].sort((a, b) => cmpStr(a.id, b.id))).sort((a, b) => cmpStr(a.id, b.id));
  const head = sortKeys({ source: file.source, fetchedAt: FETCHED_AT, count: items.length, available: file.available, ...(file.cut ? { cut: file.cut } : {}) }) as Record<string, unknown>;
  const lines = Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  const body = items.map((it) => `    ${JSON.stringify(sortKeys(it))}`).join(',\n');
  const text = `{\n${lines.join('\n')}\n  "items": [\n${body}\n  ]\n}\n`;
  const path = join(OUT_DIR, `${file.source.id}.json`);
  writeFileSync(path, text);
  log(`  → ${relative(ROOT, path)} (${items.length}/${file.available})`);
  return path;
}

export function readCatalog(id: string): CatalogFile | undefined {
  const path = join(OUT_DIR, `${id}.json`);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, 'utf8')) as CatalogFile;
}

// 어느 스크립트를 직접 실행했는지 (import될 때는 main을 돌리지 않으려고)
export function isMain(metaUrl: string): boolean {
  return process.argv[1] !== undefined && fileURLToPath(metaUrl) === process.argv[1];
}
