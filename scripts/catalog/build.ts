// 진열대 빌드 (D103): data/catalog/**(약 13만 개)를 읽어 화면이 받아 그릴 작은 JSON을 public/catalog/에 쓴다.
// npm run build·dev가 Astro보다 먼저 돌린다. 네트워크를 쓰지 않는다.
//   public/catalog/list/<대분류>/<소분류>/<정렬>-<묶음>.json  카드 480장(8쪽)씩, 정렬(인기·이름·최근)마다
//   public/catalog/item/<n>.json                              상세 조각 1024개 (id 해시 → 조각, 관련 상품 포함)
//   public/catalog/search/meta.json · t-<n>.json · b-<대분류>-<k>.json   전체 검색 (D114: 낱말 조각 256개 + 결과 카드 블록)
//   public/catalog/facet/<대분류>/<소분류>.json · -name.json · -recent.json  거르기 (D115: 값마다 자리 목록 + 정렬 순서)
//   .cache/catalog/site.json                                  Astro 페이지 머리말이 읽는 요약 (메뉴·홈 기획전·스타터 키트·목록 1쪽·출처)
// Cloudflare 정적 파일은 한 판 2만 개까지라(brief 5절) 쪽마다 HTML을 만들지 않고, 파일 수를 5천 개 아래로 지킨다.
//   --if-stale  자료·빌드 코드가 지난번과 같고 결과가 있으면 건너뛴다
//   --out <dir> 결과 폴더를 바꾼다 (시험용, 요약도 그 안에 쓴다)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { chunkCount, pageCount } from '../../src/lib/catalog/core.ts';
import type { FacetMeta, OrderFile } from '../../src/lib/catalog/facets.ts';
import { buildFacets, encodeOrder } from '../../src/lib/catalog/facets.ts';
import { SITE_FILE } from '../../src/lib/catalog/site.ts';
import type { ListChunk, SiteData } from '../../src/lib/catalog/types.ts';
import { CHUNK_PAGES, MAX_CATALOG_FILES, PAGE_SIZE, SORTS } from '../../src/lib/catalog/types.ts';
import { CATALOG_DIR, KITS_FILE, KO_DIR, MEDIA_DIR, card, cards, catalog, categories, homeRows, kits, kitsFile, listOf, shards, topOf } from './load.ts';
import { WORDS_FILE, buildSearch, readWords } from './search-index.ts';

const ROOT = join(import.meta.dirname, '..', '..');

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const OUT = outArg >= 0 && args[outArg + 1] ? join(process.cwd(), args[outArg + 1] ?? '') : join(ROOT, 'public', 'catalog');
const SITE = outArg >= 0 ? join(OUT, 'site.json') : SITE_FILE;
const STAMP = join(dirname(SITE), 'stamp.txt');

/** 입력 지문: 자료 파일과 빌드 코드의 경로·크기·고친 시각 */
function signature(): string {
  const h = createHash('sha256');
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else h.update(`${relative(ROOT, p)}:${st.size}:${st.mtimeMs}\n`);
    }
  };
  for (const d of [CATALOG_DIR, join(ROOT, 'scripts', 'catalog'), join(ROOT, 'src', 'lib', 'catalog')]) walk(d);
  if (existsSync(KO_DIR)) walk(KO_DIR);
  if (existsSync(MEDIA_DIR)) walk(MEDIA_DIR);
  for (const f of [KITS_FILE, WORDS_FILE]) {
    const st = statSync(f);
    h.update(`${relative(ROOT, f)}:${st.size}:${st.mtimeMs}\n`);
  }
  h.update(OUT);
  return h.digest('hex');
}

const sig = signature();
if (args.includes('--if-stale') && existsSync(STAMP) && existsSync(SITE) && existsSync(join(OUT, 'search', 'meta.json')) && readFileSync(STAMP, 'utf8') === sig) {
  console.log('진열대 자료가 그대로라 다시 만들지 않는다 (public/catalog).');
  process.exit(0);
}

const started = performance.now();
let files = 0;
let bytes = 0;
function write(path: string, data: unknown): void {
  const text = JSON.stringify(data);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  files += 1;
  bytes += Buffer.byteLength(text);
}

rmSync(OUT, { recursive: true, force: true });
const cats = categories();
const { sources, duplicates } = catalog();
const total = cats.reduce((n, c) => n + c.total, 0);

// 1. 목록 자료: 소분류 × 정렬 × 묶음(8쪽)
let listFiles = 0;
for (const c of cats) {
  for (const s of c.subcategories) {
    for (const sort of SORTS) {
      const list = listOf(c.id, s.id, sort);
      const pages = pageCount(list.length);
      const n = chunkCount(list.length);
      for (let k = 0; k < n; k += 1) {
        const from = k * CHUNK_PAGES * PAGE_SIZE;
        const body: ListChunk = { v: 1, total: list.length, pages, chunk: k, cards: cards(list.slice(from, from + CHUNK_PAGES * PAGE_SIZE)) };
        write(join(OUT, 'list', c.id, s.id, `${sort}-${k}.json`), body);
        listFiles += 1;
      }
    }
  }
}

// 2. 상세 조각
const all = shards();
all.forEach((shard, i) => write(join(OUT, 'item', `${i}.json`), shard));

// 3. 전체 검색 (D114): 메타 + 낱말 조각 + 결과 카드 블록
const { lists, byId } = catalog();
const search = buildSearch(cats, lists, byId, (r) => card(r.item), readWords());
write(join(OUT, 'search', 'meta.json'), search.meta);
search.shards.forEach((t, i) => write(join(OUT, 'search', `t-${i}.json`), t));
for (const [key, b] of search.blocks) write(join(OUT, 'search', `b-${key}.json`), b);
const searchFiles = 1 + search.shards.length + search.blocks.size;

// 4. 거르기 (D115): 소분류마다 값별 자리 목록 + 이름순·최근 갱신순 순서
const facets: Record<string, FacetMeta[]> = {};
let facetFiles = 0;
for (const c of cats) {
  for (const s of c.subcategories) {
    const popular = listOf(c.id, s.id, 'popular');
    const file = buildFacets(popular.map((r) => r.item));
    facets[`${c.id}/${s.id}`] = file.facets;
    if (file.facets.length === 0) continue;
    write(join(OUT, 'facet', c.id, `${s.id}.json`), file);
    const at = new Map(popular.map((r, i) => [r, i]));
    for (const sort of ['name', 'recent'] as const) {
      const body: OrderFile = { v: 1, order: encodeOrder(listOf(c.id, s.id, sort).map((r) => at.get(r) ?? 0)) };
      write(join(OUT, 'facet', c.id, `${s.id}-${sort}.json`), body);
    }
    facetFiles += 3;
  }
}

if (files > MAX_CATALOG_FILES) {
  console.error(`진열대 자료 파일이 ${files}개라 한도 ${MAX_CATALOG_FILES}개를 넘는다. CHUNK_PAGES나 SHARDS(src/lib/catalog/types.ts)를 고친다.`);
  process.exit(1);
}

// 5. Astro 쪽 요약
const site: SiteData = {
  v: 1,
  total,
  fetched: cats.reduce((d, c) => (c.fetchedAt > d ? c.fetchedAt : d), ''),
  categories: cats,
  rows: homeRows(),
  kits: kits(),
  kitHome: kitsFile().home,
  tops: Object.fromEntries(cats.map((c) => [c.id, c.subcategories.flatMap((s) => topOf(c.id, s.id, 1)).slice(0, 10)])),
  first: Object.fromEntries(cats.flatMap((c) => c.subcategories.map((s) => [`${c.id}/${s.id}`, listOf(c.id, s.id, 'popular').slice(0, PAGE_SIZE).map((r) => card(r.item))]))),
  facets,
  sources,
  duplicates,
  files: { list: listFiles, item: all.length, search: searchFiles, facet: facetFiles },
};
mkdirSync(dirname(SITE), { recursive: true });
writeFileSync(SITE, JSON.stringify(site));
writeFileSync(STAMP, sig);

const secs = ((performance.now() - started) / 1000).toFixed(1);
console.log(
  `진열대 빌드: 상품 ${total.toLocaleString('en-US')}개 (대분류 ${cats.length}, 소분류 ${cats.reduce((n, c) => n + c.subcategories.length, 0)}) → ` +
    `파일 ${files}개 (목록 ${listFiles} · 상세 ${all.length} · 검색 ${searchFiles} · 거르기 ${facetFiles}), ${(bytes / 1e6).toFixed(1)}MB, ${secs}초. 같은 id ${duplicates}건은 처음 것만 상세에.`,
);
