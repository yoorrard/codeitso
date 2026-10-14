// 브라우저에 저장하는 값의 모양과, 읽은 값을 믿지 않고 고르는 함수 (부작용 없음, 시험 있음).
// 저장·불러오기 자체는 store.ts가 한다 (docs/ARCHITECTURE.md 4절).
import type { Capability, CustomTool, Session } from './engine/types.ts';

export const KEYS = {
  session: 'cc:session:v1',
  study: 'cc:study:v1',
  meta: 'cc:meta:v1',
  prefs: 'cc:prefs:v1',
  seen: 'cc:seen:v1',
  receipts: 'cc:receipts:v1',
} as const;

/** 더는 쓰지 않는 옛 키. 옮길 값이 없어 읽지 않고, 남아 있으면 지운다 (cc:trip:v1 = 옛 도장 장면 기록, D56) */
export const LEGACY_KEYS = ['cc:trip:v1'] as const;

/** 개념 id → 읽음, 맞힌 확인 문제 번호 */
export type StudyRecord = Record<string, { read: boolean; quiz: number[] }>;

export interface Meta {
  interviewStartedAt?: number;
  /** 보낸 집계 이벤트 열쇠 (최근 SENT_MAX개) */
  sent: string[];
  /** 내 AI 써 보기를 끝까지 함 (연습 마침) */
  lessonDone?: boolean;
  /** 영수증을 한 번 이상 받음 (도착 단계 마침) */
  issued?: boolean;
  /** 도구끼리 맞춰 보기에서 마지막으로 본 막힌 마디(칸 id). 도구 고르기에서 고치고 돌아오면 빨강이 걷히는 장면(S4, D71)을 돌린다 */
  checkJams?: string[];
}

export interface Prefs {
  motion: 'auto' | 'reduce';
  sound: boolean;
  /** 조용히 모시기 (brief 7절): 사건 기사 메시지·효과음·큰 장면을 줄인다. 기본 꺼짐 */
  quiet: boolean;
  /** 어려운 말 풀이 (brief 8절): 글을 골라 뜨는 풀이. 기본 켜짐 */
  glossary: boolean;
  /** 점선 밑줄 (brief 8절): 사전에 있는 말 밑의 점선. 기본 켜짐 */
  marks: boolean;
}

/** 처음 한 번만 다 보이는 큰 장면(S1 배차, S5 출발 → 도착)을 이미 본 기록 (CONCEPT 7절) */
export interface Seen {
  scenes: string[];
}

/** 지난 영수증 한 장 (CONCEPT 8절): 영수증 링크 조각(#r= 뒤), 앱 종류(q.type 답), 받은 때만 둔다. 한 줄 입력은 넣지 않는다 */
export interface ReceiptEntry {
  r: string;
  type?: string;
  at: string;
}

export const SENT_MAX = 20;
export const RECEIPTS_MAX = 30;
/** 영수증 링크 조각의 최대 길이 (share.ts HASH_MAX와 같다) */
const RECEIPT_HASH_MAX = 8000;
export const FREE_TEXT_MAX = 200;
/** 직접 쓴 것 (input.md 7.1절): 내 말 20개·40자, 직접 쓴 도구 5개, 빈틈 10개. 모양·기능·질문 id는 엔진 normalizeSession이 다시 고른다 */
export const NOTES_MAX = 20;
export const NOTE_MAX = 40;
export const CUSTOM_TOOLS_MAX = 5;
export const GAPS_MAX = 10;
const LIST_MAX = 200;

export const EMPTY_SESSION: Session = { answers: {}, cart: [], kept: [], deferred: [] };
export const DEFAULT_PREFS: Prefs = { motion: 'auto', sound: false, quiet: false, glossary: true, marks: true };
export const EMPTY_META: Meta = { sent: [] };
export const EMPTY_SEEN: Seen = { scenes: [] };

function obj(raw: unknown): Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function strings(raw: unknown, max = LIST_MAX): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 100))].slice(0, max);
}

export function readSession(raw: unknown): Session {
  const o = obj(raw);
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(o['answers']))) if (typeof v === 'string') answers[k] = v;
  const out: Session = { answers, cart: strings(o['cart']), kept: strings(o['kept']), deferred: strings(o['deferred']) };
  const free = o['freeText'];
  if (typeof free === 'string' && free.trim() !== '') out.freeText = free.slice(0, FREE_TEXT_MAX);
  const cut = (t: string): string => [...t].slice(0, NOTE_MAX).join('');
  const notes: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(o['notes']))) {
    if (Object.keys(notes).length === NOTES_MAX) break;
    if (/^q\.[a-z0-9-]+$/.test(k) && typeof v === 'string' && v.trim() !== '') notes[k] = cut(v);
  }
  if (Object.keys(notes).length > 0) out.notes = notes;
  const tools: CustomTool[] = [];
  for (const raw of Array.isArray(o['customTools']) ? o['customTools'] : []) {
    const t = obj(raw);
    const [id, name, capability] = [t['id'], t['name'], t['capability']];
    // 기능 이름은 엔진(normalizeSession)이 고른다. 여기서는 글인지만 본다 (홈 첫 화면에 엔진을 싣지 않으려고)
    if (typeof id === 'string' && typeof name === 'string' && typeof capability === 'string') tools.push({ id, name: cut(name), capability: capability as Capability });
    if (tools.length === CUSTOM_TOOLS_MAX) break;
  }
  if (tools.length > 0) out.customTools = tools;
  const gaps = strings(o['gaps']).filter((g) => /^[a-z0-9-]{1,40}$/.test(g)).slice(0, GAPS_MAX);
  if (gaps.length > 0) out.gaps = gaps;
  return out;
}

export function readStudy(raw: unknown): StudyRecord {
  const out: StudyRecord = {};
  for (const [id, v] of Object.entries(obj(raw))) {
    const r = obj(v);
    const quiz = Array.isArray(r['quiz'])
      ? [...new Set(r['quiz'].filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 100))].sort((a, b) => a - b)
      : [];
    const read = r['read'] === true;
    if (read || quiz.length > 0) out[id] = { read, quiz };
  }
  return out;
}

export function readMeta(raw: unknown): Meta {
  const o = obj(raw);
  const out: Meta = { sent: strings(o['sent']).slice(-SENT_MAX) };
  const t = o['interviewStartedAt'];
  if (typeof t === 'number' && Number.isFinite(t) && t > 0) out.interviewStartedAt = t;
  if (o['lessonDone'] === true) out.lessonDone = true;
  if (o['issued'] === true) out.issued = true;
  const jams = strings(o['checkJams'], 12);
  if (jams.length > 0) out.checkJams = jams;
  return out;
}

export function readPrefs(raw: unknown): Prefs {
  const o = obj(raw);
  return {
    motion: o['motion'] === 'reduce' ? 'reduce' : 'auto',
    sound: o['sound'] === true,
    quiet: o['quiet'] === true,
    glossary: o['glossary'] !== false,
    marks: o['marks'] !== false,
  };
}

/** 지난 영수증: 모양이 맞는 것만, 같은 조각은 하나만, 최근 것부터 RECEIPTS_MAX장까지 */
export function readReceipts(raw: unknown): ReceiptEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ReceiptEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const o = obj(item);
    const r = o['r'];
    const at = o['at'];
    if (typeof r !== 'string' || r.length === 0 || r.length > RECEIPT_HASH_MAX || !/^[A-Za-z0-9+\-$_]+$/.test(r) || seen.has(r)) continue;
    if (typeof at !== 'string' || at.length === 0 || at.length > 32) continue;
    const type = o['type'];
    seen.add(r);
    out.push(typeof type === 'string' && /^[a-z0-9-]{1,40}$/.test(type) ? { r, type, at } : { r, at });
    if (out.length === RECEIPTS_MAX) break;
  }
  return out;
}

/** 새 영수증을 맨 앞에 더한다. 같은 조각이 있으면 앞으로 옮기고, 넘치면 가장 오래된 것을 뺀다 (dropped: 뺐는지) */
export function addReceiptEntry(list: ReceiptEntry[], entry: ReceiptEntry): { list: ReceiptEntry[]; dropped: boolean } {
  const rest = list.filter((x) => x.r !== entry.r);
  const next = [entry, ...rest];
  return { list: next.slice(0, RECEIPTS_MAX), dropped: next.length > RECEIPTS_MAX };
}

export function readSeen(raw: unknown): Seen {
  return { scenes: strings(obj(raw)['scenes']) };
}

/** 저장된 진행이 있는가 (홈의 이어서 가기, 코스로 덮어쓸 때 묻기). 엔진을 부르지 않아 홈 첫 화면 JS에 엔진이 들지 않는다 */
export function hasProgress(s: Session): boolean {
  return Object.keys(s.answers).length > 0 || s.cart.length > 0;
}

/** 처음 값과 같으면 저장할 필요가 없다 (키를 지운다) */
export function isEmptySession(s: Session): boolean {
  return (
    Object.keys(s.answers).length === 0 &&
    s.cart.length === 0 &&
    s.kept.length === 0 &&
    s.deferred.length === 0 &&
    !s.freeText &&
    Object.keys(s.notes ?? {}).length === 0 &&
    (s.customTools ?? []).length === 0 &&
    (s.gaps ?? []).length === 0
  );
}
export function isEmptyStudy(s: StudyRecord): boolean {
  return Object.keys(s).length === 0;
}
export function isEmptyMeta(m: Meta): boolean {
  return m.sent.length === 0 && m.interviewStartedAt === undefined && !m.lessonDone && !m.issued && !m.checkJams?.length;
}
export function isDefaultPrefs(p: Prefs): boolean {
  return (
    p.motion === DEFAULT_PREFS.motion &&
    p.sound === DEFAULT_PREFS.sound &&
    p.quiet === DEFAULT_PREFS.quiet &&
    p.glossary === DEFAULT_PREFS.glossary &&
    p.marks === DEFAULT_PREFS.marks
  );
}
export function isEmptyReceipts(l: ReceiptEntry[]): boolean {
  return l.length === 0;
}
export function isEmptySeen(t: Seen): boolean {
  return t.scenes.length === 0;
}
