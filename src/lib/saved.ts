// 브라우저에 저장하는 값의 모양과, 읽은 값을 믿지 않고 고르는 함수 (부작용 없음, 시험 있음).
// 저장·불러오기 자체는 store.ts가 한다 (docs/ARCHITECTURE.md 4절).
import type { Session } from './engine/types.ts';

export const KEYS = {
  session: 'cc:session:v1',
  study: 'cc:study:v1',
  meta: 'cc:meta:v1',
  prefs: 'cc:prefs:v1',
  seen: 'cc:seen:v1',
} as const;

/** 개념 id → 읽음, 맞힌 확인 문제 번호 */
export type StudyRecord = Record<string, { read: boolean; quiz: number[] }>;

export interface Meta {
  interviewStartedAt?: number;
  /** 보낸 집계 이벤트 열쇠 (최근 SENT_MAX개) */
  sent: string[];
  /** 시운전을 끝까지 함 (시운전 단계 마침) */
  lessonDone?: boolean;
  /** 영수증을 한 번 이상 받음 (도착 단계 마침) */
  issued?: boolean;
}

export interface Prefs {
  motion: 'auto' | 'reduce';
  sound: boolean;
}

/** 처음 한 번만 다 보이는 큰 장면(S1 배차, S5 출발 → 도착)을 이미 본 기록 (CONCEPT 7절) */
export interface Seen {
  scenes: string[];
}

export const SENT_MAX = 20;
export const FREE_TEXT_MAX = 200;
const LIST_MAX = 200;

export const EMPTY_SESSION: Session = { answers: {}, cart: [], kept: [], deferred: [] };
export const DEFAULT_PREFS: Prefs = { motion: 'auto', sound: false };
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
  return out;
}

export function readPrefs(raw: unknown): Prefs {
  const o = obj(raw);
  return { motion: o['motion'] === 'reduce' ? 'reduce' : 'auto', sound: o['sound'] === true };
}

export function readSeen(raw: unknown): Seen {
  return { scenes: strings(obj(raw)['scenes']) };
}

/** 처음 값과 같으면 저장할 필요가 없다 (키를 지운다) */
export function isEmptySession(s: Session): boolean {
  return Object.keys(s.answers).length === 0 && s.cart.length === 0 && s.kept.length === 0 && s.deferred.length === 0 && !s.freeText;
}
export function isEmptyStudy(s: StudyRecord): boolean {
  return Object.keys(s).length === 0;
}
export function isEmptyMeta(m: Meta): boolean {
  return m.sent.length === 0 && m.interviewStartedAt === undefined && !m.lessonDone && !m.issued;
}
export function isDefaultPrefs(p: Prefs): boolean {
  return p.motion === DEFAULT_PREFS.motion && p.sound === DEFAULT_PREFS.sound;
}
export function isEmptySeen(t: Seen): boolean {
  return t.scenes.length === 0;
}
