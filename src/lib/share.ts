// 장바구니·영수증 공유 링크 (brief 7절): 재료 id만 싣는다. 메모·프로젝트 메모는 싣지 않는다 (내 글이 링크로 새지 않게).
// 꼴: /cart#s=<id>,<id>,… (id마다 encodeURIComponent라 id 안의 쉼표도 안전하다). 주소 조각(#)이라 서버 기록에 남지 않는다.
import { CART_MAX } from './saved.ts';

export const SHARE_PARAM = 's';
const ID_MAX = 200;

/** 주소 조각 글 ('s=a%3Ab,c%3Ad'), # 없이 */
export function shareFragment(ids: readonly string[]): string {
  return `${SHARE_PARAM}=${ids.map(encodeURIComponent).join(',')}`;
}

/** 주소 조각(#s=… 또는 s=…)에서 id 목록을 읽는다. 모양이 틀린 것은 버리고, 같은 id는 한 번, CART_MAX개까지 */
export function readShare(hash: string): string[] {
  const body = hash.replace(/^#/, '');
  if (!body.startsWith(`${SHARE_PARAM}=`)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of body.slice(SHARE_PARAM.length + 1).split(',')) {
    let id: string;
    try {
      id = decodeURIComponent(part).trim();
    } catch {
      continue;
    }
    if (id === '' || id.length > ID_MAX || /[\s<>"]/.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length === CART_MAX) break;
  }
  return out;
}
