// Our World in Data의 차트 데이터(grapher) 전체를 받아 데이터셋 진열대(세계 통계·지표)에 쓴다.
//   node scripts/import/data-owid.ts
// 목록: 공식 사이트맵의 /grapher/<slug> 주소 전부. 내용: 공식 Chart API의 <slug>.metadata.json
// (https://docs.owid.io/projects/etl/api/chart-api/). 차트마다 CSV(<slug>.csv)를 바로 받을 수 있다.
import { type Item, cached, fetchJson, fetchText, int, main, makeId, makeItem, mapLimit, progress, summaryOf, tagify, toDate, writeCatalog } from './oss-lib.ts';

const BASE = 'https://ourworldindata.org';

interface OwidColumn {
  titleShort?: string;
  titleLong?: string;
  descriptionShort?: string;
  unit?: string;
  shortUnit?: string;
  timespan?: string;
  type?: string;
  lastUpdated?: string;
  citationShort?: string;
}

interface OwidMeta {
  chart?: { title?: string; citation?: string };
  columns?: Record<string, OwidColumn>;
}

interface Row {
  slug: string;
  title: string;
  description?: string;
  unit?: string;
  timespan?: string;
  lastUpdated?: string;
  citation?: string;
  columns: number;
}

main(async () => {
  const sitemap = await fetchText(`${BASE}/sitemap.xml`);
  // 같은 차트의 선택 변형(?sex=both 등)은 차트 하나로 본다.
  const slugs = [...new Set([...sitemap.matchAll(/<loc>https:\/\/ourworldindata\.org\/grapher\/([^<?#]+)[^<]*<\/loc>/g)].map((m) => m[1] as string))].sort();
  console.log(`  차트 ${slugs.length}`);
  let done = 0;
  const rows = await cached('owid-meta', async () => {
    const out = await mapLimit(slugs, 6, async (slug): Promise<Row | null> => {
      try {
        const m = await fetchJson<OwidMeta>(`${BASE}/grapher/${slug}.metadata.json`, { retries: 3 });
        const cols = Object.values(m.columns ?? {});
        const first = cols[0] ?? {};
        return {
          slug,
          title: m.chart?.title ?? first.titleLong ?? slug,
          description: cols.map((c) => c.descriptionShort).find((d) => d && d.length > 20),
          unit: first.unit || first.shortUnit || undefined,
          timespan: first.timespan || undefined,
          lastUpdated: cols.map((c) => c.lastUpdated).filter(Boolean).sort().at(-1),
          citation: m.chart?.citation ?? first.citationShort,
          columns: cols.length,
        };
      } catch {
        return null;
      } finally {
        progress('차트', ++done, slugs.length, 500);
      }
    });
    return out.filter((r): r is Row => r !== null);
  }, 7);
  const items: Item[] = rows.map((r) => makeItem({
    id: makeId('owid', r.slug),
    name: r.title,
    kind: 'world-stats',
    category: 'datasets',
    summary: summaryOf(r.description) ?? r.title,
    url: `${BASE}/grapher/${r.slug}`,
    source: { name: 'Our World in Data', url: BASE },
    metrics: { updatedAt: toDate(r.lastUpdated) },
    tags: tagify(['owid', 'csv', r.columns > 1 ? 'multi-indicator' : undefined]),
    preview: {
      type: 'dataset',
      host: 'owid',
      chart: `${BASE}/grapher/${r.slug}`,
      csv: `${BASE}/grapher/${r.slug}.csv`,
      ...(r.unit ? { unit: r.unit } : {}),
      ...(r.timespan ? { timespan: r.timespan } : {}),
      ...(r.citation ? { citation: r.citation.slice(0, 300) } : {}),
      ...(int(r.columns) ? { columns: r.columns } : {}),
    },
    use: { snippet: `${BASE}/grapher/${r.slug}.csv?v=1&csvType=full&useColumnShortNames=true`, docs: 'https://docs.owid.io/projects/etl/api/chart-api/' },
  }));
  writeCatalog('datasets', {
    id: 'owid',
    name: 'Our World in Data 차트 데이터',
    url: `${BASE}/`,
    license: 'Chart metadata from the official OWID Chart API. OWID-produced data and charts are CC BY 4.0; data from third-party providers keeps the provider terms named in each chart citation.',
    note: '사이트맵의 모든 차트를 싣는다. snippet은 공식 Chart API의 CSV 주소다.',
  }, items);
});
