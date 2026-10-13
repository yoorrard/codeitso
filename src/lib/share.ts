// 영수증 링크 (docs/ARCHITECTURE.md 5절): /arrival#r=<압축 문자열>. 자유 입력(freeText)은 넣지 않는다.
// 받은 값은 믿지 않는다: 풀기 → fromShareState(모양 검사) → evaluate()가 모르는 id를 버린다.
import LZString from 'lz-string';
import { fromShareState, toShareState } from './engine/index.ts';
import type { Session } from './engine/types.ts';
import { ROUTES } from './routes.ts';

const PREFIX = '#r=';
/** 이보다 긴 해시는 열어 보지 않는다 (정상 링크는 수백 자) */
const HASH_MAX = 8000;

export type ShareRead = { status: 'none' } | { status: 'broken' } | { status: 'ok'; session: Partial<Session> };

export function shareHash(s: Session): string {
  return PREFIX + LZString.compressToEncodedURIComponent(JSON.stringify(toShareState(s)));
}

export function shareUrl(siteUrl: string, s: Session): string {
  return `${siteUrl.replace(/\/+$/, '')}${ROUTES.arrival}${shareHash(s)}`;
}

/** location.hash 값을 읽는다. #r=가 없으면 none, 풀 수 없으면 broken */
export function readShareHash(hash: string): ShareRead {
  if (!hash.startsWith(PREFIX)) return { status: 'none' };
  const packed = hash.slice(PREFIX.length);
  if (packed === '' || packed.length > HASH_MAX) return { status: 'broken' };
  try {
    const text = LZString.decompressFromEncodedURIComponent(packed);
    if (!text) return { status: 'broken' };
    const session = fromShareState(JSON.parse(text));
    return session ? { status: 'ok', session } : { status: 'broken' };
  } catch {
    return { status: 'broken' };
  }
}

/** 브라우저: 주소의 #r=를 읽고 바로 지운다 (주소창·방문 기록에 상태를 남기지 않는다) */
export function consumeShareHash(win: Pick<Window, 'location' | 'history'>): ShareRead {
  const read = readShareHash(win.location.hash);
  if (read.status !== 'none') {
    win.history.replaceState(win.history.state, '', win.location.pathname + win.location.search);
  }
  return read;
}
