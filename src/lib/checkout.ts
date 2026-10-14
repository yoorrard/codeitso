// 계산하기 (brief 3절): 담은 재료의 상세 자료(조각 JSON)를 받아 영수증 사본을 만들고, 지난 영수증에 남기고, 장바구니를 비운다.
// 상세 조각은 한 번 받은 것을 기억한다 (장바구니 쪽의 설치 명령 모으기와 계산이 같이 쓴다).
import { shardOf } from './catalog/core.ts';
import type { DetailRecord, Shard } from './catalog/types.ts';
import { countBucket } from './event-spec.ts';
import { buildReceipt } from './receipt-md.ts';
import { itemDataPath } from './routes.ts';
import type { Receipt } from './saved.ts';
import { $cart, $project, clearCart, saveReceipt } from './store.ts';
import { track } from './track.ts';

const shards = new Map<number, Promise<Shard>>();

function shard(n: number): Promise<Shard> {
  let p = shards.get(n);
  if (!p) {
    p = fetch(itemDataPath(n)).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<Shard>;
    });
    // 실패한 조각은 기억하지 않는다 (다시 누르면 다시 받는다)
    p.catch(() => shards.delete(n));
    shards.set(n, p);
  }
  return p;
}

/** id들의 상세 자료 (조각마다 한 번만 받는다). 진열대에 없는 id는 빠진다. 받지 못하면 오류 */
export async function fetchDetails(ids: readonly string[]): Promise<Map<string, DetailRecord>> {
  const need = [...new Set(ids.map((id) => shardOf(id)))];
  const got = await Promise.all(need.map((n) => shard(n)));
  const all = new Map<string, DetailRecord>();
  for (const s of got) for (const id of ids) if (s[id]) all.set(id, s[id]);
  return all;
}

/** 지금 장바구니로 영수증을 만들고 남긴다. 장바구니는 비우고 프로젝트 메모는 남긴다 */
export async function checkout(now: number): Promise<Receipt> {
  const lines = $cart.get();
  const details = await fetchDetails(lines.map((l) => l.id));
  const r = buildReceipt(lines, details, $project.get(), now, Math.floor(Math.random() * 1296).toString(36));
  saveReceipt(r);
  clearCart();
  track('checkout', countBucket(r.lines.length));
  return r;
}
