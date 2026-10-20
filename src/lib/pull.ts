// 프롬프트 뽑기 (v5.1 D121): 담은 재료의 상세 자료(조각 JSON)를 받아 프롬프트 사본을 만들고 지난 프롬프트에 남긴다.
// 장바구니는 비우지 않는다 (재료를 더하거나 메모를 고쳐 다시 뽑는다). 상세 조각은 한 번 받은 것을 기억한다
// (장바구니 쪽의 설치 명령 모으기·공유 목록과 뽑기가 같이 쓴다).
import { shardOf } from './catalog/core.ts';
import type { DetailRecord, Shard } from './catalog/types.ts';
import { countBucket } from './event-spec.ts';
import { modelPrices } from './model-data.ts';
import { buildPrompt } from './prompt.ts';
import { itemDataPath } from './routes.ts';
import type { PromptEntry } from './saved.ts';
import { $cart, $project, savePrompt } from './store.ts';
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

/** 지금 장바구니로 프롬프트를 뽑아 지난 프롬프트에 남긴다. 장바구니와 만들 앱 한 줄은 그대로 둔다 */
export async function pullPrompt(now: number): Promise<PromptEntry> {
  const lines = $cart.get();
  const [details, prices] = await Promise.all([fetchDetails(lines.map((l) => l.id)), modelPrices(lines)]);
  const p = buildPrompt(lines, details, $project.get(), now, Math.floor(Math.random() * 1296).toString(36), prices);
  savePrompt(p);
  // 집계 이벤트 이름은 서버(worker)와 맞춘 그대로 둔다: checkout = 프롬프트 뽑기
  track('checkout', countBucket(p.lines.length));
  return p;
}
