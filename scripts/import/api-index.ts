// API 진열대 목차(data/catalog/api/index.json) 만들기. 네트워크 없이 이미 받은 파일만 읽는다.
//   node scripts/import/api-index.ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type CatalogFile, CATEGORY, OUT_DIR, SUBCATEGORIES, cmp } from './api-lib.ts';

// 살펴봤지만 넣지 않은 출처·상품과 이유 (보고·다음 판 참고용).
export const REJECTED: { name: string; url: string; reason: string }[] = [
  { name: 'RapidAPI Hub', url: 'https://rapidapi.com/hub', reason: 'No open listing API; terms forbid scraping the marketplace.' },
  { name: 'Postman Public API Network', url: 'https://www.postman.com/explore', reason: 'No open bulk listing; terms restrict automated collection.' },
  { name: 'ProgrammableWeb', url: 'https://www.programmableweb.com', reason: 'Directory shut down (2023).' },
  { name: 'API Tracker, any-api.com, apilist.fun, public-apis.io, free-apis.github.io', url: 'https://any-api.com', reason: 'Mirrors of APIs.guru or public-apis already imported, or no open data.' },
  { name: 'dl0312/open-apis-korea', url: 'https://github.com/dl0312/open-apis-korea', reason: 'No license on the list text (and not updated since 2024). Korean APIs come from public-apis-4Kr (MIT) and the hand-checked list instead.' },
  { name: 'ripienaar/free-for-dev', url: 'https://github.com/ripienaar/free-for-dev', reason: 'A list of free tiers of SaaS (hosting, storage, login…) — the v5 brief drops that catalog because free tiers change too often.' },
  { name: 'cheahjs/free-llm-api-resources', url: 'https://github.com/cheahjs/free-llm-api-resources', reason: 'Repository no longer reachable; its providers are covered by models.dev.' },
  { name: 'Google APIs Discovery Service', url: 'https://www.googleapis.com/discovery/v1/apis', reason: 'Already inside APIs.guru (googleapis.com, 281 APIs).' },
  { name: 'data.gov (US) API catalog', url: 'https://catalog.data.gov', reason: 'US-only datasets, mostly files not APIs; public-apis and APIs.guru already cover the main US government APIs.' },
  { name: '공공데이터포털 목록 조회 오픈API', url: 'https://www.data.go.kr', reason: '서비스 키가 필요해 쓰지 않았다. 같은 목록을 포털 목록 화면에서 끝까지 넘겨 받았다(data-go-kr.json).' },
  { name: '공공데이터포털 활용신청 100건 미만 API', url: 'https://www.data.go.kr/tcs/dss/selectDataSetList.do?dType=API', reason: '1만2천 개가 넘어 활용신청 100건 이상만 실었다 (개수는 data-go-kr.json의 source.note).' },
  { name: 'Vector databases (Pinecone, Weaviate, Qdrant…)', url: 'https://www.pinecone.io', reason: 'Storage services; the v5 brief drops storage/deploy tool catalogs.' },
  { name: 'Midjourney, Suno, Udio', url: 'https://www.midjourney.com', reason: 'No official public API (only unofficial wrappers).' },
  { name: 'Bing Web Search API', url: 'https://learn.microsoft.com/bing/search-apis/', reason: 'Retired by Microsoft on 2025-08-11.' },
  { name: 'GitHub Models', url: 'https://docs.github.com/en/github-models', reason: 'Official docs say it has been retired (checked 2026-10-14).' },
  { name: 'LMNT', url: 'https://www.lmnt.com', reason: 'Official site says the service has ended (checked 2026-10-14).' },
  { name: 'Nomic Atlas / Embed API', url: 'https://docs.nomic.ai', reason: 'Company pivoted (docs now describe an AEC workspace); embed models stay on the open-source shelf.' },
  { name: 'PlayHT', url: 'https://play.ht', reason: 'Acquired by Meta in 2025; public API status unclear.' },
  { name: 'Kakao Brain Karlo', url: 'https://developers.kakao.com', reason: 'Service ended.' },
  { name: 'LG EXAONE API (LG 자체)', url: 'https://www.lgresearch.ai', reason: 'LG가 직접 여는 공개 API를 찾지 못했다. 2026-01 무료 제공도 FriendliAI를 통해서였다 (models-dev:friendli).' },
  { name: 'Kakao Kanana, KT 믿:음, SKT A.X, Saltlux LUXIA API', url: 'https://huggingface.co', reason: '누구나 신청할 수 있는 공개 API 문서를 찾지 못했다 (모델은 Hugging Face 공개 가중치).' },
  { name: 'models.dev prices', url: 'https://models.dev', reason: 'Prices are community-maintained; only sentences copied from official pricing pages are shown (preview.freeTierQuote).' },
];

function main(): void {
  const files = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .sort(cmp);
  const catalogs = files.map((f) => JSON.parse(readFileSync(join(OUT_DIR, f), 'utf8')) as CatalogFile);
  const known = new Set<string>(SUBCATEGORIES.map((s) => s.id));
  const seen = new Set<string>();
  const bySub = new Map<string, Map<string, number>>();
  let total = 0;
  for (const c of catalogs) {
    for (const it of c.items) {
      if (!known.has(it.kind)) throw new Error(`알 수 없는 kind "${it.kind}" (${c.source.id}: ${it.id}). api-lib.ts SUBCATEGORIES에 더한다.`);
      if (seen.has(it.id)) throw new Error(`API 진열대 안에서 id가 겹친다: ${it.id}`);
      seen.add(it.id);
      const m = bySub.get(it.kind) ?? new Map<string, number>();
      m.set(c.source.id, (m.get(c.source.id) ?? 0) + 1);
      bySub.set(it.kind, m);
      total++;
    }
  }
  const nameOf = new Map(catalogs.map((c) => [c.source.id, c.source.name]));
  const index = {
    category: CATEGORY,
    nameKo: 'API',
    fetchedAt: catalogs.map((c) => c.fetchedAt).sort(cmp).at(-1),
    total,
    subcategories: SUBCATEGORIES.filter((s) => bySub.has(s.id)).map((s) => {
      const m = bySub.get(s.id) as Map<string, number>;
      return {
        id: s.id,
        nameKo: s.nameKo,
        count: [...m.values()].reduce((a, b) => a + b, 0),
        sources: [...m.entries()].sort(([a], [b]) => cmp(a, b)).map(([id, count]) => ({ id, name: nameOf.get(id) ?? id, count })),
      };
    }),
    sources: catalogs.map((c) => ({ ...c.source, file: `${c.source.id}.json`, count: c.count, fetchedAt: c.fetchedAt })),
    rejected: REJECTED,
  };
  writeFileSync(join(OUT_DIR, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`API 목차: 상품 ${total}개, 소분류 ${index.subcategories.length}개, 출처 파일 ${catalogs.length}개`);
  for (const s of index.subcategories) console.log(`  ${s.id.padEnd(14)} ${String(s.count).padStart(5)}  ${s.nameKo}  (${s.sources.map((x) => `${x.id} ${x.count}`).join(', ')})`);
}

main();
