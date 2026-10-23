// 공공데이터포털(data.go.kr) 오픈API 목록 전체를 '활용신청 많은 순'으로 끝까지 넘겨 받는다.
//   node scripts/import/api-data-go-kr.ts
// 포털 목록 화면(selectDataSetList.do, dType=API, 100개씩)이 기계가 읽을 수 있는 유일한 전체 목록이다
// (목록 조회 오픈API는 서비스 키가 필요하다). 쪽마다 1초 쉬고, 연결이 끊기면 다시 시도한다.
// 1만2천 개가 넘어 진열대에는 활용신청 MIN_APPLICATIONS건 이상만 싣는다 (전체 개수는 source.note에 적는다).
import { type Item, decodeEntities, fetchText, main, makeItem, readCache, writeCache, writeCatalog } from './api-lib.ts';

const BASE = 'https://www.data.go.kr';
const PER_PAGE = 100;
export const MIN_APPLICATIONS = 100;

export interface PortalApi {
  pk: string;
  title: string;
  summary: string;
  category?: string; // 분류 (예: 환경기상)
  orgType?: string; // 공공기관·중앙행정기관·지방자치단체 …
  formats: string[];
  provider?: string;
  updatedAt?: string;
  views?: number;
  applications?: number;
  keywords: string[];
}

const num = (s: string | undefined): number | undefined => {
  if (!s) return undefined;
  const n = Number(s.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

const text = (s: string | undefined): string => decodeEntities((s ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function field(block: string, label: string): string | undefined {
  const m = block.match(new RegExp(`<strong>${label}</strong>([\\s\\S]*?)</li>`));
  return m ? text(m[1]) : undefined;
}

export function parseListPage(html: string): { total?: number; items: PortalApi[] } {
  const total = num(html.match(/오픈API\s*<span>\s*\(([\d,]+)건\)/)?.[1]);
  const items: PortalApi[] = [];
  for (const block of html.split('<div class="apply-result-item">').slice(1)) {
    const link = block.match(/<a href="\/data\/(\d+)\/openapi\.do">([\s\S]*?)<\/a>/);
    if (!link) continue;
    const badges = [...(block.match(/<div class="apply-result-category">([\s\S]*?)<\/div>/)?.[1] ?? '').matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
    const formats = [...block.matchAll(/data-ext="([A-Z0-9+-]+)"/g)].map((m) => m[1] as string);
    items.push({
      pk: link[1] as string,
      title: text(link[2]),
      summary: text(block.match(/<span class="apply-result-summary">([\s\S]*?)<\/span>/)?.[1]),
      category: badges[0] || undefined,
      orgType: badges[1] || undefined,
      formats: [...new Set(formats)],
      provider: field(block, '제공기관'),
      updatedAt: field(block, '수정일')?.match(/\d{4}-\d{2}-\d{2}/)?.[0],
      views: num(field(block, '조회수')),
      applications: num(field(block, '활용신청')),
      keywords: (field(block, '키워드') ?? '').split(',').map((k) => k.trim()).filter(Boolean),
    });
  }
  return { total, items };
}

async function fetchPage(page: number, sort: string): Promise<string> {
  const url = `${BASE}/tcs/dss/selectDataSetList.do?dType=API&currentPage=${page}&perPage=${PER_PAGE}&sort=${sort}`;
  return fetchText(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) codeitso-catalog-import/1.0', accept: 'text/html' },
    retries: 8,
    timeoutMs: 90_000,
  });
}

// 한 정렬로 끝까지 넘긴다.
async function fetchSorted(sort: string): Promise<{ total: number; items: PortalApi[] }> {
  const cacheName = `data-go-kr-${sort}-${new Date().toISOString().slice(0, 10)}`;
  const cached = readCache<{ total: number; items: PortalApi[] }>(cacheName);
  if (cached) return cached;
  const first = parseListPage(await fetchPage(1, sort));
  const total = first.total ?? 0;
  const pages = Math.ceil(total / PER_PAGE);
  const all = [...first.items];
  for (let p = 2; p <= pages; p++) {
    await new Promise((r) => setTimeout(r, 1000));
    const page = parseListPage(await fetchPage(p, sort));
    all.push(...page.items);
    if (p % 20 === 0 || p === pages) console.log(`  [${sort}] 쪽 ${p}/${pages} (${all.length}개)`);
    if (page.items.length === 0) break;
  }
  const out = { total, items: all };
  writeCache(cacheName, out);
  return out;
}

// 같은 활용신청 수끼리는 쪽을 넘기는 사이 순서가 바뀌어 몇 개가 빠지고 몇 개가 겹친다.
// 그래서 '활용순'과 '수정일순' 두 번 끝까지 넘겨 합친다.
export async function fetchAll(): Promise<{ total: number; items: PortalApi[] }> {
  const byUse = await fetchSorted('use');
  const byDate = await fetchSorted('date');
  const byPk = new Map<string, PortalApi>();
  for (const it of [...byUse.items, ...byDate.items]) if (!byPk.has(it.pk)) byPk.set(it.pk, it);
  return { total: Math.max(byUse.total, byDate.total), items: [...byPk.values()] };
}

export function portalItem(a: PortalApi): Item {
  return makeItem({
    id: `data-go-kr:${a.pk}`,
    name: a.title,
    kind: 'kr-public',
    summary: a.summary || `${a.title} (${a.provider ?? '공공데이터포털'})`,
    url: `${BASE}/data/${a.pk}/openapi.do`,
    source: { name: '공공데이터포털', url: BASE },
    metrics: { downloads: a.applications, updatedAt: a.updatedAt },
    tags: ['data-go-kr', a.category, a.orgType, ...a.formats, ...a.keywords.slice(0, 6)].filter((t): t is string => Boolean(t)),
    preview: {
      type: 'api',
      provider: a.provider,
      orgType: a.orgType,
      portalCategory: a.category,
      formats: a.formats,
      applications: a.applications,
      views: a.views,
      auth: 'apiKey',
    },
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main('api-data-go-kr', async () => {
    const { total, items } = await fetchAll();
    const counts = items.map((i) => i.applications ?? 0);
    const kept = items.filter((i) => (i.applications ?? 0) >= MIN_APPLICATIONS);
    const atLeast = (n: number) => counts.filter((c) => c >= n).length;
    console.log(`  전체 ${total}개, 받은 것 ${items.length}개, 활용신청 ≥1000: ${atLeast(1000)}, ≥100: ${atLeast(100)}, ≥10: ${atLeast(10)}, ≥1: ${atLeast(1)}`);
    writeCatalog(
      {
        id: 'data-go-kr',
        name: '공공데이터포털 오픈API',
        url: `${BASE}/tcs/dss/selectDataSetList.do?dType=API`,
        license: '공공데이터의 제공 및 이용 활성화에 관한 법률에 따른 공개 목록 (각 API의 이용허락범위는 상세 쪽에 있다)',
        note: `Portal lists ${total} Open APIs (read all ${items.length} on ${new Date().toISOString().slice(0, 10)} by paging both the 'applications' and 'last updated' orders to the end). Kept the ${kept.length} with at least ${MIN_APPLICATIONS} applications (활용신청). metrics.downloads = 활용신청 수.`,
      },
      kept.map(portalItem),
    );
  });
}
