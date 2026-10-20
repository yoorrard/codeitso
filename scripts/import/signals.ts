// 인기 신호 받기 (D133): 상품에 지표가 없거나 출처마다 단위가 달라 인기순이 틀릴 때, 같은 단위의 공개 사실을 받아 붙인다.
// 값은 받은 그대로 싣고(지어내지 않는다), 어디서 온 값인지는 출처 파일의 note와 preview(downloadsOf 등)에 적는다.
// - npm 내려받기: api.npmjs.org (지난 한 주·한 달)
// - jsDelivr 요청 수: data.jsdelivr.com (지난 한 달, CDN으로 쓰는 글꼴·꾸러미)
// - 사이트 인기 순위: Chrome UX Report 상위 목록 (CC BY 4.0, zakird/crux-top-lists가 달마다 내는 묶음: 1천·5천·1만·5만·10만·50만·100만 위)
// 요청은 하루 단위로 캐시한다(같은 날 다시 돌리면 같은 값). 사이트 순위 목록은 달 단위.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { CACHE_DIR, FETCHED_AT, fetchJson, fetchRaw, mapLimit, readCache, writeCache } from './api-lib.ts';

export const CRUX_SOURCE = 'Chrome UX Report top lists (CC BY 4.0, via github.com/zakird/crux-top-lists)';

// ---------- npm ----------

export type NpmPeriod = 'last-week' | 'last-month';

/** npm 꾸러미 내려받기 수. 이름 없는 꾸러미(404)는 빠진다. 이름 없는(@없는) 꾸러미는 128개씩 한 번에 묻는다 */
export async function npmDownloads(names: readonly string[], period: NpmPeriod): Promise<Map<string, number>> {
  const cacheName = `signals-npm-${period}-${FETCHED_AT}`;
  const cache = readCache<Record<string, number | null>>(cacheName) ?? {};
  const todo = [...new Set(names)].filter((n) => n && !(n in cache)).sort();
  const plain = todo.filter((n) => !n.startsWith('@'));
  const scoped = todo.filter((n) => n.startsWith('@'));
  const batches: string[][] = [];
  for (let i = 0; i < plain.length; i += 128) batches.push(plain.slice(i, i + 128));
  for (const b of batches) {
    try {
      const res = await fetchRaw(`https://api.npmjs.org/downloads/point/${period}/${b.join(',')}`, { allowStatus: [404], retries: 5 });
      const j = res.status === 404 ? {} : ((await res.json()) as Record<string, { downloads?: number } | null> | { downloads?: number; package?: string });
      if (b.length === 1) {
        const one = j as { downloads?: number };
        cache[b[0] as string] = typeof one.downloads === 'number' ? one.downloads : null;
      } else {
        for (const n of b) {
          const v = (j as Record<string, { downloads?: number } | null>)[n];
          cache[n] = typeof v?.downloads === 'number' ? v.downloads : null;
        }
      }
    } catch {
      // 한 묶음이 실패하면 그 묶음은 비워 둔다 (다음 실행에서 다시 묻는다)
    }
  }
  await mapLimit(scoped, 3, async (n) => {
    try {
      const res = await fetchRaw(`https://api.npmjs.org/downloads/point/${period}/${n}`, { allowStatus: [404], retries: 5 });
      if (res.status === 404) {
        await res.body?.cancel();
        cache[n] = null;
        return;
      }
      const j = (await res.json()) as { downloads?: number };
      cache[n] = typeof j.downloads === 'number' ? j.downloads : null;
    } catch {
      // 비워 둔다
    }
  });
  writeCache(cacheName, cache);
  const out = new Map<string, number>();
  for (const n of names) {
    const v = cache[n];
    if (typeof v === 'number') out.set(n, v);
  }
  return out;
}

/** PyPI 꾸러미의 지난 한 주 내려받기 (pypistats.org). 없는 꾸러미는 빠진다 */
export async function pypiWeekly(names: readonly string[]): Promise<Map<string, number>> {
  const cacheName = `signals-pypi-week-${FETCHED_AT}`;
  const cache = readCache<Record<string, number | null>>(cacheName) ?? {};
  const todo = [...new Set(names)].filter((n) => n && !(n in cache)).sort();
  await mapLimit(todo, 2, async (n) => {
    try {
      const j = await fetchJson<{ data?: { last_week?: number } }>(`https://pypistats.org/api/packages/${n.toLowerCase()}/recent`, { retries: 4 });
      cache[n] = typeof j.data?.last_week === 'number' ? j.data.last_week : null;
    } catch {
      cache[n] = null;
    }
  });
  writeCache(cacheName, cache);
  const out = new Map<string, number>();
  for (const n of names) {
    const v = cache[n];
    if (typeof v === 'number') out.set(n, v);
  }
  return out;
}

// ---------- jsDelivr ----------

/** jsDelivr 지난 한 달 요청 수. spec = 'gh/<주인>/<저장소>' 또는 'npm/<꾸러미>' */
export async function jsdelivrMonthly(specs: readonly string[]): Promise<Map<string, number>> {
  const cacheName = `signals-jsdelivr-${FETCHED_AT}`;
  const cache = readCache<Record<string, number | null>>(cacheName) ?? {};
  const todo = [...new Set(specs)].filter((s) => s && !(s in cache)).sort();
  await mapLimit(todo, 3, async (spec) => {
    try {
      const j = await fetchJson<{ hits?: { total?: number } }>(`https://data.jsdelivr.com/v1/stats/packages/${spec}?period=month`, { retries: 4 });
      cache[spec] = typeof j.hits?.total === 'number' ? j.hits.total : null;
    } catch {
      cache[spec] = null;
    }
  });
  writeCache(cacheName, cache);
  const out = new Map<string, number>();
  for (const s of specs) {
    const v = cache[s];
    if (typeof v === 'number') out.set(s, v);
  }
  return out;
}

// ---------- 사이트 인기 순위 (Chrome UX Report) ----------

let cruxCache: Map<string, number> | undefined;

/** CrUX 세계 상위 목록(origin → 순위 묶음). 달마다 한 번 받아 캐시에 둔다 */
export async function cruxList(): Promise<Map<string, number>> {
  if (cruxCache) return cruxCache;
  const month = FETCHED_AT.slice(0, 7);
  const dir = join(CACHE_DIR, 'crux');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `global-${month}.csv.gz`);
  if (!existsSync(file)) {
    const res = await fetchRaw('https://raw.githubusercontent.com/zakird/crux-top-lists/main/data/global/current.csv.gz', { retries: 4, timeoutMs: 180_000 });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const map = new Map<string, number>();
  for (const line of gunzipSync(readFileSync(file)).toString('utf8').split('\n')) {
    const comma = line.lastIndexOf(',');
    if (comma < 0) continue;
    const rank = Number(line.slice(comma + 1));
    if (!Number.isFinite(rank) || rank <= 0) continue;
    const origin = line.slice(0, comma).toLowerCase();
    const prev = map.get(origin);
    if (prev === undefined || rank < prev) map.set(origin, rank);
  }
  cruxCache = map;
  return map;
}

// 문서·개발자 쪽 하위 도메인은 본 도메인 순위로 본다 (developer.accuweather.com → accuweather.com). 다른 하위 도메인은 그대로.
const DEV_SUBDOMAIN = /^(api|apis|developer|developers|dev|docs|doc|platform|open|openapi|openapis)\./;
// 남의 글·코드를 올려 두는 곳(코드 저장소·API 장터·문서 호스팅)의 순위는 그 상품의 인기가 아니다
const HOSTING = /(^|\.)(github\.com|gitlab\.com|bitbucket\.org|githubusercontent\.com|swaggerhub\.com|rapidapi\.com|postman\.com|getpostman\.com|readme\.io|gitbook\.io|notion\.site|sites\.google\.com|docs\.google\.com|npmjs\.com|pypi\.org|huggingface\.co)$/;

/** 주소의 CrUX 순위 묶음: 같은 origin → www를 붙이거나 뗀 origin → 개발자용 하위 도메인이면 본 도메인. 없으면 undefined */
export function cruxRankOf(list: ReadonlyMap<string, number>, url: string | undefined): number | undefined {
  const host = url ? /^https?:\/\/([^/:?#]+)/i.exec(url.trim())?.[1]?.toLowerCase() : undefined;
  if (!host || HOSTING.test(host)) return undefined;
  const hosts = [host, host.startsWith('www.') ? host.slice(4) : `www.${host}`];
  if (DEV_SUBDOMAIN.test(host)) {
    const base = host.replace(DEV_SUBDOMAIN, '');
    if (base.includes('.')) hosts.push(base, `www.${base}`);
  }
  let best: number | undefined;
  for (const h of hosts) {
    const r = list.get(`https://${h}`) ?? list.get(`http://${h}`);
    if (r !== undefined && (best === undefined || r < best)) best = r;
  }
  return best;
}

/** 지표(내려받기·스타·좋아요·조회)가 하나도 없는 상품에만 사이트 순위를 붙인다 (다른 지표가 있으면 그것이 더 맞는 신호다).
 *  상품 주소가 목록에 없으면 문서 주소(use.docs)로 한 번 더 찾는다 */
export function withSiteRank<T extends { url: string; metrics?: object; use?: { docs?: string } }>(item: T, list: ReadonlyMap<string, number>, url: string = item.url): T {
  const m = (item.metrics ?? {}) as Record<string, unknown>;
  if (['downloads', 'stars', 'likes', 'views'].some((k) => typeof m[k] === 'number')) return item;
  const rank = cruxRankOf(list, url) ?? cruxRankOf(list, item.use?.docs);
  if (rank === undefined) return item;
  return { ...item, metrics: { ...m, siteRank: rank } };
}

/** 상품 목록 전체에 사이트 순위를 붙인다 (다른 지표가 없는 상품만) */
export async function withSiteRanks<T extends { url: string; metrics?: object }>(items: readonly T[]): Promise<T[]> {
  const list = await cruxList();
  return items.map((it) => withSiteRank(it, list));
}

/** 출처 note에 덧붙일 한 줄 */
export function siteRankNote(): string {
  return `metrics.siteRank = global Chrome UX Report rank bucket of the item's site (1000, 5000, 10000, 50000, 100000, 500000, 1000000; ${CRUX_SOURCE}, ${FETCHED_AT.slice(0, 7)}), set only when the item has no other metric. Used only for sorting.`;
}
