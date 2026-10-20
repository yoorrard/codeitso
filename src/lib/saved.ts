// 브라우저에 저장하는 값의 모양과, 읽은 값을 믿지 않고 고르는 함수 (부작용 없음, 시험 있음).
// 저장·불러오기 자체는 store.ts가 한다 (docs/ARCHITECTURE.md 5절).
// v5.1: 장바구니(담은 재료와 메모) + 프로젝트 메모 + 지난 프롬프트(뽑은 때의 재료 사본) + 최근 본 재료 + 설정 + 연 용어 + 집계 기록.

export const KEYS = {
  cart: 'cc:cart:v1',
  project: 'cc:project:v1',
  prompts: 'cc:prompts:v1',
  recent: 'cc:recent:v1',
  meta: 'cc:meta:v1',
  prefs: 'cc:prefs:v1',
} as const;

/** 더는 쓰지 않는 옛 키(v4 단계 흐름의 답·용어 카드·장면·영수증). 옮길 값이 없어 읽지 않고, 남아 있으면 지운다 */
export const LEGACY_KEYS = ['cc:trip:v1', 'cc:session:v1', 'cc:study:v1', 'cc:seen:v1', 'cc:receipts:v1'] as const;
/** v5 영수증 (v5.1에서 지난 프롬프트로 바뀌었다). 지난 프롬프트가 비어 있으면 한 번 옮기고 지운다 (store.ts) */
export const OLD_RECEIPTS_KEY = 'cc:receipts:v2';

/** 장바구니 한 줄: 재료 id, 담은 때, 이용자 메모(어디에 어떻게 쓸지). 이름·자리는 서랍을 자료 없이 바로 그리려고 같이 둔다 */
export interface CartLine {
  id: string;
  name: string;
  /** 대분류 id (design, ai, api…) */
  cat: string;
  /** 소분류 id */
  sub: string;
  memo?: string;
  /** 담은 때 (ms) */
  addedAt: number;
}

/** 뽑은 프롬프트 한 줄: 뽑은 때의 재료 사본 (출처 자료 그대로, 지어내지 않는다). 그래서 진열대가 바뀌어도 다시 볼 수 있다 */
export interface PromptLine {
  id: string;
  name: string;
  cat: string;
  sub: string;
  memo?: string;
  /** 공식 주소 */
  url?: string;
  /** 설치 명령 한 줄 */
  install?: string;
  /** 쓰려면 필요한 인증: API 키 · OAuth 로그인 */
  auth?: 'key' | 'oauth';
}

export interface PromptEntry {
  /** 저장 열쇠 */
  id: string;
  /** 뽑은 때 (ms) */
  at: number;
  /** 만들 앱 한 줄 (프로젝트 메모) */
  project?: string;
  lines: PromptLine[];
}

/** 최근 본 재료 한 줄 (상세를 연 때) */
export interface RecentItem {
  id: string;
  name: string;
  cat: string;
  sub: string;
  at: number;
}

export interface Meta {
  /** 보낸 집계 이벤트 열쇠 (최근 SENT_MAX개) */
  sent: string[];
}

export interface Prefs {
  motion: 'auto' | 'reduce';
  /** 어려운 말 풀이: 글을 골라 뜨는 풀이. 기본 켜짐 */
  glossary: boolean;
}

export const SENT_MAX = 20;
/** 장바구니에 담을 수 있는 줄 수 (넘치면 가장 오래된 것부터 빠지지 않고 담기를 막는다) */
export const CART_MAX = 300;
export const MEMO_MAX = 200;
export const PROJECT_MAX = 300;
/** 남기는 지난 프롬프트 수 (넘치면 가장 오래된 것부터 빠진다) */
export const PROMPTS_MAX = 30;
/** 최근 본 재료 수 */
export const RECENT_MAX = 20;
const ID_MAX = 200;
const NAME_MAX = 200;
/** 프롬프트 사본 칸의 길이 상한 (글자): 저장소를 지키고, 넘는 것은 공식 주소가 대신한다 */
export const PROMPT_FIELD_MAX = { url: 500, install: 300 } as const;

export const DEFAULT_PREFS: Prefs = { motion: 'auto', glossary: true };
export const EMPTY_META: Meta = { sent: [] };

function obj(raw: unknown): Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function strings(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 100))].slice(0, max);
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** 앞뒤 공백을 걷고 max자(글자 단위)까지. 비면 없음 */
export function cleanText(raw: unknown, max: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = [...raw.trim()].slice(0, max).join('');
  return t === '' ? undefined : t;
}

/** 메모는 MEMO_MAX자까지 */
export function cleanMemo(raw: unknown): string | undefined {
  return cleanText(raw, MEMO_MAX);
}

function time(raw: unknown): number {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/** id·이름·대분류·소분류가 모양에 맞으면 그 칸을 돌려준다 */
function head(o: Record<string, unknown>): { id: string; name: string; cat: string; sub: string } | null {
  const [id, name, cat, sub] = [o['id'], o['name'], o['cat'], o['sub']];
  if (typeof id !== 'string' || id.length === 0 || id.length > ID_MAX) return null;
  if (typeof name !== 'string' || name.trim().length === 0) return null;
  if (typeof cat !== 'string' || !SLUG.test(cat) || typeof sub !== 'string' || !SLUG.test(sub)) return null;
  return { id, name: [...name].slice(0, NAME_MAX).join(''), cat, sub };
}

/** 장바구니: 모양이 맞는 줄만, 같은 id는 처음 것 하나, CART_MAX줄까지. S1 판의 담은 때(at)도 읽는다 */
export function readCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const o = obj(item);
    const h = head(o);
    if (!h || seen.has(h.id)) continue;
    const line: CartLine = { ...h, addedAt: time(o['addedAt'] ?? o['at']) };
    const memo = cleanMemo(o['memo']);
    if (memo) line.memo = memo;
    seen.add(h.id);
    out.push(line);
    if (out.length === CART_MAX) break;
  }
  return out;
}

export function readProject(raw: unknown): string {
  return cleanText(raw, PROJECT_MAX) ?? '';
}

function readPromptLine(raw: unknown): PromptLine | null {
  const o = obj(raw);
  const h = head(o);
  if (!h) return null;
  const line: PromptLine = { ...h };
  const memo = cleanMemo(o['memo']);
  if (memo) line.memo = memo;
  const url = cleanText(o['url'], PROMPT_FIELD_MAX.url);
  if (url && /^https?:\/\//.test(url)) line.url = url;
  const install = cleanText(o['install'], PROMPT_FIELD_MAX.install);
  if (install) line.install = install;
  if (o['auth'] === 'key' || o['auth'] === 'oauth') line.auth = o['auth'];
  return line;
}

/** 지난 프롬프트 한 장 (v5 영수증도 읽는다: 번호·라이선스·조각 칸은 버린다) */
export function readPrompt(raw: unknown): PromptEntry | null {
  const o = obj(raw);
  const id = o['id'];
  if (typeof id !== 'string' || !/^[a-z0-9]{1,40}$/.test(id)) return null;
  const at = time(o['at']);
  if (at === 0 || !Array.isArray(o['lines'])) return null;
  const lines: PromptLine[] = [];
  const seen = new Set<string>();
  for (const l of o['lines']) {
    const line = readPromptLine(l);
    if (!line || seen.has(line.id)) continue;
    seen.add(line.id);
    lines.push(line);
    if (lines.length === CART_MAX) break;
  }
  if (lines.length === 0) return null;
  const r: PromptEntry = { id, at, lines };
  const project = cleanText(o['project'], PROJECT_MAX);
  if (project) r.project = project;
  return r;
}

/** 지난 프롬프트: 새것이 앞, 같은 id는 하나, PROMPTS_MAX개까지 */
export function readPrompts(raw: unknown): PromptEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PromptEntry[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    const r = readPrompt(x);
    if (!r || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out.sort((a, b) => b.at - a.at).slice(0, PROMPTS_MAX);
}

/** 같은 재료·메모·만들 앱이면 같은 프롬프트다 (다시 뽑으면 지난 것을 맨 앞으로 옮긴다) */
export function samePrompt(a: PromptEntry, b: PromptEntry): boolean {
  const key = (p: PromptEntry): string => JSON.stringify([p.project ?? '', p.lines.map((l) => [l.id, l.memo ?? ''])]);
  return key(a) === key(b);
}

export function readRecent(raw: unknown): RecentItem[] {
  if (!Array.isArray(raw)) return [];
  const out: RecentItem[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    const o = obj(x);
    const h = head(o);
    if (!h || seen.has(h.id)) continue;
    seen.add(h.id);
    out.push({ ...h, at: time(o['at']) });
    if (out.length === RECENT_MAX) break;
  }
  return out;
}

/** 본 재료를 맨 앞에 (이미 있으면 앞으로 옮긴다), RECENT_MAX개까지 */
export function pushRecent(list: readonly RecentItem[], item: RecentItem): RecentItem[] {
  return [item, ...list.filter((x) => x.id !== item.id)].slice(0, RECENT_MAX);
}

export function readMeta(raw: unknown): Meta {
  return { sent: strings(obj(raw)['sent'], 200).slice(-SENT_MAX) };
}

export function readPrefs(raw: unknown): Prefs {
  const o = obj(raw);
  return { motion: o['motion'] === 'reduce' ? 'reduce' : 'auto', glossary: o['glossary'] !== false };
}

/** 처음 값과 같으면 저장할 필요가 없다 (키를 지운다) */
export function isEmptyList(l: readonly unknown[]): boolean {
  return l.length === 0;
}
export const isEmptyCart = isEmptyList;
export function isEmptyMeta(m: Meta): boolean {
  return m.sent.length === 0;
}
export function isDefaultPrefs(p: Prefs): boolean {
  return p.motion === DEFAULT_PREFS.motion && p.glossary === DEFAULT_PREFS.glossary;
}

export type AddResult = 'added' | 'exists' | 'full';

/** 줄 하나를 더한다. 이미 있으면 메모만 바꾸고(메모를 주었을 때) 자리는 그대로. 가득 찼으면 그대로 */
export function addLine(list: readonly CartLine[], line: CartLine): { list: CartLine[]; result: AddResult } {
  const at = list.findIndex((x) => x.id === line.id);
  if (at >= 0) {
    const next = [...list];
    const prev = next[at];
    if (prev) next[at] = line.memo === undefined ? prev : { ...prev, memo: line.memo };
    return { list: next, result: 'exists' };
  }
  if (list.length >= CART_MAX) return { list: [...list], result: 'full' };
  return { list: [...list, line], result: 'added' };
}

/** 여러 줄을 한 번에 (스타터 키트·공유 링크). 이미 있는 것은 건너뛰고, 가득 차면 거기서 멈춘다 */
export function addLines(list: readonly CartLine[], lines: readonly CartLine[]): { list: CartLine[]; added: number; skipped: number; full: boolean } {
  let next = [...list];
  let added = 0;
  let skipped = 0;
  for (const l of lines) {
    const r = addLine(next, l);
    if (r.result === 'full') return { list: next, added, skipped, full: true };
    if (r.result === 'exists') skipped += 1;
    else added += 1;
    next = r.list;
  }
  return { list: next, added, skipped, full: false };
}

/** 'YYYYMMDD-HHMM' (이용자 기기 시각): 프롬프트 .md 파일 이름 */
export function stamp(at: number): string {
  const d = new Date(at);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
