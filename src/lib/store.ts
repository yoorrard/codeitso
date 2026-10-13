// 브라우저 저장은 이 파일 한 곳에서만 한다 (docs/ARCHITECTURE.md 4절).
// 계산 결과는 저장하지 않는다. 엔진 결과는 result.ts가 매번 evaluate()로 만든다.
// localStorage를 못 쓰면(사생활 보호 모드, 막힌 저장소) 메모리에만 두고 $storageOk를 false로 둔다.
import { persistentAtom, setPersistentEngine } from '@nanostores/persistent';
import { atom } from 'nanostores';
import type { Session } from './engine/types.ts';
import type { Meta, Prefs, ReceiptEntry, Seen, StudyRecord } from './saved.ts';
import {
  DEFAULT_PREFS,
  EMPTY_META,
  EMPTY_SESSION,
  EMPTY_SEEN,
  KEYS,
  LEGACY_KEYS,
  SENT_MAX,
  addReceiptEntry,
  isDefaultPrefs,
  isEmptyMeta,
  isEmptySession,
  isEmptyStudy,
  isEmptyReceipts,
  isEmptySeen,
  readMeta,
  readPrefs,
  readReceipts,
  readSession,
  readStudy,
  readSeen,
} from './saved.ts';

/** 빌드(서버)에서는 저장소가 없어도 안내를 띄우지 않는다. 브라우저에서만 실제로 써 본다. */
function storageWorks(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const probe = 'cc:probe';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const ok = storageWorks();
if (!ok) setPersistentEngine({}, { addEventListener() {}, removeEventListener() {} });
else if (typeof window !== 'undefined') for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);

/** localStorage를 쓸 수 있는가 (false면 '진행 상황이 저장되지 않아요' 한 줄) */
export const $storageOk = atom(ok);

/** JSON으로 저장하되, 읽을 때는 모양을 고르고, 처음 값이면 키를 지운다 */
function codec<T>(read: (raw: unknown) => T, empty: (v: T) => boolean): { encode: (v: T) => string | undefined; decode: (s: string) => T } {
  return {
    encode: (v) => (empty(v) ? undefined : JSON.stringify(v)),
    decode: (s) => {
      try {
        return read(JSON.parse(s));
      } catch {
        return read(undefined);
      }
    },
  };
}

export const $session = persistentAtom<Session>(KEYS.session, EMPTY_SESSION, codec(readSession, isEmptySession));
export const $study = persistentAtom<StudyRecord>(KEYS.study, {}, codec(readStudy, isEmptyStudy));
export const $meta = persistentAtom<Meta>(KEYS.meta, EMPTY_META, codec(readMeta, isEmptyMeta));
export const $prefs = persistentAtom<Prefs>(KEYS.prefs, DEFAULT_PREFS, codec(readPrefs, isDefaultPrefs));
export const $seen = persistentAtom<Seen>(KEYS.seen, EMPTY_SEEN, codec(readSeen, isEmptySeen));
export const $receipts = persistentAtom<ReceiptEntry[]>(KEYS.receipts, [], codec(readReceipts, isEmptyReceipts));

/** 한 번 연 어려운 말 풀이 용어 (brief 8절, D69): 다음 화면부터 그 말에 점선 밑줄을 긋지 않는다. 고른 글은 저장하지 않는다 */
export const TERMS_KEY = 'cc:terms:v1';
export const TERMS_SEEN_MAX = 300;

/** 용어 id 목록만 고른다 (풀이 id: 영문 소문자·숫자·-, 도구 이름 항목은 tool: 앞붙이). 같은 것은 한 번, 최근 300개 */
export function readTermsSeen(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter((x): x is string => typeof x === 'string' && /^(tool:)?[a-z0-9][a-z0-9-]{0,79}$/.test(x));
  return [...new Set(ids)].slice(-TERMS_SEEN_MAX);
}

export const $termsSeen = persistentAtom<string[]>(TERMS_KEY, [], codec(readTermsSeen, (l) => l.length === 0));

/** 풀이를 연 용어를 적는다 (이미 있으면 그대로, 넘치면 가장 오래된 것부터 뺀다) */
export function markTermSeen(id: string): void {
  const list = $termsSeen.get();
  if (list.includes(id)) return;
  $termsSeen.set(readTermsSeen([...list, id]));
}

/** 받은 영수증을 지난 영수증에 더한다. 30장을 넘어 가장 오래된 것을 뺐으면 true */
export function rememberReceipt(entry: ReceiptEntry): boolean {
  const { list, dropped } = addReceiptEntry($receipts.get(), entry);
  $receipts.set(list);
  return dropped;
}

export function forgetReceipt(r: string): void {
  $receipts.set($receipts.get().filter((x) => x.r !== r));
}

export function setPrefs(patch: Partial<Prefs>): void {
  $prefs.set(readPrefs({ ...$prefs.get(), ...patch }));
}

export function markConceptRead(id: string): void {
  const s = $study.get();
  $study.set({ ...s, [id]: { read: true, quiz: s[id]?.quiz ?? [] } });
}

export function markQuizCorrect(id: string, index: number): void {
  const s = $study.get();
  const prev = s[id] ?? { read: false, quiz: [] };
  if (prev.quiz.includes(index)) return;
  $study.set(readStudy({ ...s, [id]: { read: prev.read, quiz: [...prev.quiz, index] } }));
}

export function patchMeta(patch: Partial<Meta>): void {
  $meta.set(readMeta({ ...$meta.get(), ...patch }));
}

/** 보낸 집계 이벤트 열쇠를 기억한다. 이미 보냈으면 false */
export function rememberSent(key: string): boolean {
  const m = $meta.get();
  if (m.sent.includes(key)) return false;
  $meta.set({ ...m, sent: [...m.sent, key].slice(-SENT_MAX) });
  return true;
}

/** 큰 장면을 봤다고 적는다. 다시 열면 끝 상태가 바로 보인다 */
export function markSceneSeen(id: string): void {
  const t = $seen.get();
  if (!t.scenes.includes(id)) $seen.set({ scenes: [...t.scenes, id] });
}

/**
 * '저장한 기록 지우기': 진행 기록 여섯 키(답·읽은 용어·메타·본 장면·지난 영수증·연 풀이 용어)를 지운다 (처음 값으로 돌리면 codec이 키를 지운다).
 * 설정(동작 줄이기·효과음)은 기록이 아니라서 남긴다: 멀미 때문에 켠 동작 줄이기가 지우기로 풀리면 안 된다.
 */
export function clearAll(): void {
  $session.set(EMPTY_SESSION);
  $study.set({});
  $meta.set(EMPTY_META);
  $seen.set(EMPTY_SEEN);
  $receipts.set([]);
  $termsSeen.set([]);
}
