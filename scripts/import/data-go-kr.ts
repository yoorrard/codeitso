// 공공데이터포털(data.go.kr) 파일데이터 목록을 '활용(다운로드) 많은 순'으로 받아 데이터셋 진열대(한국 공공데이터)에 쓴다.
//   node scripts/import/data-go-kr.ts
// 포털 목록 화면(selectDataSetList.do, dType=FILE, 100개씩)이 로그인·서비스 키 없이 읽을 수 있는 유일한 전체 목록이다.
// 파일데이터가 8만 개가 넘어 다운로드 MIN_DOWNLOADS건 이상만 싣는다 (정렬된 목록이라 기준 밑으로 몇 쪽 더 본 뒤 멈춘다).
// 쪽마다 1초 쉰다. 오픈API 목록은 API 진열대(api-data-go-kr.ts)가 맡는다.
import { type Item, cached, decodeEntities, fetchText, main, makeItem, sleep, tagify, writeCatalog } from './oss-lib.ts';

const BASE = 'https://www.data.go.kr';
const PER_PAGE = 100;
export const MIN_DOWNLOADS = 3000;
const EXTRA_PAGES = 3; // 기준 밑으로 내려간 뒤 더 볼 쪽 수 (같은 수끼리 순서가 흔들리는 것 대비)

export interface PortalFile {
  pk: string;
  title: string;
  summary: string;
  category?: string;
  orgType?: string;
  formats: string[];
  provider?: string;
  updatedAt?: string;
  views?: number;
  downloads?: number;
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

export function parseFileListPage(html: string): { total?: number; items: PortalFile[] } {
  const total = num(html.match(/파일데이터\s*<span>\s*([\d,]+)건/)?.[1]);
  const items: PortalFile[] = [];
  for (const block of html.split('<div class="apply-result-item">').slice(1)) {
    const link = block.match(/<a href="\/data\/(\d+)\/fileData\.do">([\s\S]*?)<\/a>/);
    if (!link) continue;
    const badges = [...(block.match(/<div class="apply-result-category">([\s\S]*?)<\/div>/)?.[1] ?? '').matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
    const formats = [...block.matchAll(/data-ext="([A-Za-z0-9+-]+)"/g)].map((m) => (m[1] as string).toUpperCase());
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
      downloads: num(field(block, '다운로드')),
      keywords: (field(block, '키워드') ?? '').split(',').map((k) => k.trim()).filter(Boolean),
    });
  }
  return { total, items };
}

async function fetchPage(page: number): Promise<string> {
  return fetchText(`${BASE}/tcs/dss/selectDataSetList.do?dType=FILE&currentPage=${page}&perPage=${PER_PAGE}&sort=use`, {
    headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) codeshopper-catalog-import/1.0', accept: 'text/html' },
    retries: 8,
    timeoutMs: 90_000,
  });
}

main(async () => {
  const { total, rows } = await cached('data-go-kr-files', async () => {
    const all: PortalFile[] = [];
    let total: number | undefined;
    let below = 0;
    for (let page = 1; ; page++) {
      const p = parseFileListPage(await fetchPage(page));
      total ??= p.total;
      all.push(...p.items);
      if (!p.items.length) break;
      if ((p.items.at(-1)?.downloads ?? 0) < MIN_DOWNLOADS && ++below > EXTRA_PAGES) break;
      if (page % 10 === 0) console.log(`  쪽 ${page}: 마지막 다운로드 ${p.items.at(-1)?.downloads}`);
      await sleep(1000);
    }
    return { total, rows: all };
  });
  const byPk = new Map<string, PortalFile>();
  for (const r of rows) if (!byPk.has(r.pk) && (r.downloads ?? 0) >= MIN_DOWNLOADS) byPk.set(r.pk, r);
  console.log(`  전체 ${total}, 받은 ${rows.length}, 다운로드 ${MIN_DOWNLOADS}+ ${byPk.size}`);
  const items: Item[] = [...byPk.values()].map((f) => makeItem({
    id: `data-go-kr-files:${f.pk}`,
    name: f.title,
    kind: 'kr-public',
    category: 'datasets',
    summary: f.summary || `${f.title} (${f.provider ?? '공공데이터포털'})`,
    url: `${BASE}/data/${f.pk}/fileData.do`,
    source: { name: '공공데이터포털', url: BASE },
    metrics: { downloads: f.downloads, updatedAt: f.updatedAt },
    tags: tagify(['data-go-kr', f.category, f.orgType, ...f.formats, ...f.keywords.slice(0, 6)]),
    preview: {
      type: 'dataset',
      host: 'data-go-kr',
      ...(f.provider ? { provider: f.provider } : {}),
      ...(f.orgType ? { orgType: f.orgType } : {}),
      ...(f.category ? { portalCategory: f.category } : {}),
      formats: f.formats,
      ...(f.views !== undefined ? { views: f.views } : {}),
    },
  }));
  writeCatalog('datasets', {
    id: 'data-go-kr-files',
    name: '공공데이터포털 파일데이터',
    url: `${BASE}/tcs/dss/selectDataSetList.do?dType=FILE`,
    license: '공공데이터포털 목록 정보(제목·설명·제공기관·형식·다운로드 수). 각 데이터의 이용허락범위(공공누리 유형)는 데이터 쪽에서 확인한다.',
    total,
    cut: `다운로드 ${MIN_DOWNLOADS.toLocaleString('en-US')}건 이상 (활용 많은 순으로 넘기다 기준 밑에서 멈춘다)`,
  }, items);
});
