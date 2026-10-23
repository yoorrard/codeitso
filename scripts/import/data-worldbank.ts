// 세계은행 세계개발지표(World Development Indicators, WDI)의 지표 전체를 받아 데이터셋 진열대(세계 통계·지표)에 쓴다.
//   node scripts/import/data-worldbank.ts
// 공식 Indicators API(api.worldbank.org/v2/indicator?source=2)는 로그인 없이 지표 이름·설명·주제를 준다.
// 데이터 카탈로그 API(datacatalogapi.worldbank.org)는 익명 요청을 분당 한 번 꼴로 막아(429) 쓰지 않는다.
import { type Item, fetchJson, main, makeId, makeItem, summaryOf, tagify, writeCatalog } from './oss-lib.ts';

interface WbIndicator {
  id: string;
  name: string;
  unit?: string;
  source?: { id: string; value: string };
  sourceNote?: string;
  sourceOrganization?: string;
  topics?: { id?: string; value?: string }[];
}

main(async () => {
  const [meta, rows] = await fetchJson<[{ total: number }, WbIndicator[]]>('https://api.worldbank.org/v2/indicator?format=json&per_page=5000&source=2');
  console.log(`  지표 ${rows.length}/${meta.total}`);
  const items: Item[] = rows.filter((r) => r.id && r.name).map((r) => makeItem({
    id: makeId('worldbank-wdi', r.id),
    name: r.name,
    kind: 'world-stats',
    category: 'datasets',
    summary: summaryOf(r.sourceNote) ?? r.name,
    url: `https://data.worldbank.org/indicator/${r.id}`,
    source: { name: 'World Bank · World Development Indicators', url: 'https://datatopics.worldbank.org/world-development-indicators/' },
    tags: tagify(['worldbank', 'wdi', ...(r.topics ?? []).map((t) => t.value?.trim()).filter(Boolean)]),
    preview: {
      type: 'dataset',
      host: 'worldbank',
      indicator: r.id,
      ...(r.unit ? { unit: r.unit } : {}),
      ...(r.sourceOrganization ? { publisher: summaryOf(r.sourceOrganization)?.slice(0, 200) } : {}),
    },
    use: { snippet: `https://api.worldbank.org/v2/country/all/indicator/${r.id}?format=json`, docs: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392' },
  }));
  writeCatalog('datasets', {
    id: 'worldbank-wdi',
    name: '세계은행 세계개발지표 (WDI)',
    url: 'https://datatopics.worldbank.org/world-development-indicators/',
    license: 'Indicator metadata from the public World Bank Indicators API. The World Bank publishes WDI under CC BY 4.0 (see each indicator page for third-party source terms).',
    total: meta.total,
    note: 'snippet은 공식 Indicators API의 지표 주소다 (모든 나라, JSON).',
  }, items);
});
