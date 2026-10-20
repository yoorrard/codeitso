// 장바구니·영수증 공유 링크 (brief 7절): 재료 id만 싣는다. 메모·프로젝트 메모는 싣지 않는다 (내 글이 링크로 새지 않게).
// AI API에서 고른 모델 id는 싣는다 (D141): 상품의 옵션(쇼핑몰의 색·크기)이라 받는 사람도 같은 모델로 담는다. 내 글이 아니다.
// 꼴: /cart#s=<id>,<id>@<모델 id>,… (id·모델 id마다 encodeURIComponent라 쉼표·@가 그대로 나오지 않아 안전하다).
// 주소 조각(#)이라 서버 기록에 남지 않는다. 모델 없는 옛 링크도 그대로 읽힌다.
import { CART_MAX, MODEL_ID_MAX } from './saved.ts';

export const SHARE_PARAM = 's';
const ID_MAX = 200;

/** 공유할 재료 한 줄: id만, 또는 id와 고른 모델 id */
export type ShareEntry = string | { id: string; model?: string };

/** 주소 조각 글 ('s=a%3Ab,c%3Ad@gpt-5'), # 없이 */
export function shareFragment(entries: readonly ShareEntry[]): string {
  const part = (e: ShareEntry): string => {
    if (typeof e === 'string') return encodeURIComponent(e);
    return e.model ? `${encodeURIComponent(e.id)}@${encodeURIComponent(e.model)}` : encodeURIComponent(e.id);
  };
  return `${SHARE_PARAM}=${entries.map(part).join(',')}`;
}

function clean(raw: string | undefined, max: number): string | null {
  if (raw === undefined) return null;
  let v: string;
  try {
    v = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
  return v === '' || v.length > max || /[\s<>"]/.test(v) ? null : v;
}

/** 주소 조각(#s=… 또는 s=…)에서 재료와 모델을 읽는다. 모양이 틀린 것은 버리고(모델만 틀리면 모델만), 같은 id는 한 번, CART_MAX개까지 */
export function readShareEntries(hash: string): { id: string; model?: string }[] {
  const body = hash.replace(/^#/, '');
  if (!body.startsWith(`${SHARE_PARAM}=`)) return [];
  const out: { id: string; model?: string }[] = [];
  const seen = new Set<string>();
  for (const part of body.slice(SHARE_PARAM.length + 1).split(',')) {
    const [rawId, rawModel, ...rest] = part.split('@');
    const id = clean(rawId, ID_MAX);
    if (id === null || seen.has(id)) continue;
    seen.add(id);
    const model = rest.length === 0 ? clean(rawModel, MODEL_ID_MAX) : null;
    out.push(model ? { id, model } : { id });
    if (out.length === CART_MAX) break;
  }
  return out;
}

/** 주소 조각에서 id 목록만 */
export function readShare(hash: string): string[] {
  return readShareEntries(hash).map((e) => e.id);
}
