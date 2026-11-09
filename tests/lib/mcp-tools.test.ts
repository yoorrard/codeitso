// MCP 도구 (D154): 작은 진열대(mcp-fixture.ts)로 검색·자세히·둘러보기·키트·장바구니와 마크다운을 본다.
import { describe, expect, it } from 'vitest';
import { renderCart, renderDetails, renderKit, renderKits, renderOverview, renderSearch, renderSubList, renderCategory } from '../../src/lib/mcp/render.ts';
import type { CategoryOverview, CategoryResult, KitList, KitResult, SubListResult, ToolContext } from '../../src/lib/mcp/tools.ts';
import { LIMITS, ToolError, browse, getKits, getMaterials, openCart, searchMaterials, shareFragmentOf } from '../../src/lib/mcp/tools.ts';
import { SITE, fixtureFiles, fixtureLoader } from './mcp-fixture.ts';

function ctx(files = fixtureFiles()): ToolContext & { reads: string[] } {
  const load = fixtureLoader(files);
  return { load, site: SITE, reads: load.reads };
}

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ToolError) return e.code;
    throw e;
  }
  return 'ok';
}

describe('codeitso_search', () => {
  it('이름에 든 재료가 먼저, 같은 뜻 낱말(날씨 ↔ weather)도 찾고 재료 쪽 주소를 붙인다', async () => {
    const r = await searchMaterials(ctx(), { query: 'weather', limit: 10, offset: 0 });
    expect(r.items.map((i) => i.id)).toEqual(['a:weather', 'd:font', 'd:pub', 'a:maps']);
    expect(r.total).toBe(4);
    expect(r.has_more).toBe(false);
    const w = r.items[0];
    expect(w).toMatchObject({ category_name: 'API', subcategory_name: '날씨·환경', license: 'MIT', popularity: '1,200 stars', updated: '2026-10-01' });
    expect(w?.page_url).toBe(`${SITE}/item?id=a%3Aweather`);
    expect(r.related_subcategories.map((s) => s.subcategory)).toContain('weather');
  });

  it('친 낱말 그대로 맞은 재료가 같은 뜻으로만 맞은 재료보다 앞선다', async () => {
    const r = await searchMaterials(ctx(), { query: '날씨', limit: 10, offset: 0 });
    // 날씨체·공공 날씨는 이름에 '날씨', Weather Now·Map Tiles는 같은 뜻 'weather'로만 맞는다
    expect(r.items.slice(0, 2).map((i) => i.id).sort()).toEqual(['d:font', 'd:pub']);
  });

  it('대분류·소분류로 좁히고, 쪽을 나눈다', async () => {
    const c = ctx();
    expect((await searchMaterials(c, { query: 'weather', category: 'api', limit: 10, offset: 0 })).items.map((i) => i.id)).toEqual(['a:weather', 'a:maps']);
    const sub = await searchMaterials(c, { query: 'weather', category: 'api', subcategory: 'maps', limit: 10, offset: 0 });
    expect(sub.items.map((i) => i.id)).toEqual(['a:maps']);
    expect(sub.subcategory).toBe('maps');
    const p1 = await searchMaterials(c, { query: 'weather', limit: 1, offset: 0 });
    expect(p1).toMatchObject({ count: 1, has_more: true, next_offset: 1 });
    const p2 = await searchMaterials(c, { query: 'weather', limit: 1, offset: 1 });
    expect(p2.related_subcategories).toEqual([]);
    expect(p2.items[0]?.id).not.toBe(p1.items[0]?.id);
  });

  it('잘못된 입력은 모델이 읽을 오류로 알린다', async () => {
    const c = ctx();
    expect(await code(searchMaterials(c, { query: '!!!', limit: 5, offset: 0 }))).toBe('empty_query');
    expect(await code(searchMaterials(c, { query: 'weather', category: 'nope', limit: 5, offset: 0 }))).toBe('unknown_category');
    expect(await code(searchMaterials(c, { query: 'weather', subcategory: 'kr-public', limit: 5, offset: 0 }))).toBe('sub_ambiguous');
    expect(await code(searchMaterials(c, { query: 'weather', category: 'design', subcategory: 'maps', limit: 5, offset: 0 }))).toBe('sub_not_in_category');
    expect(await code(searchMaterials(c, { query: 'weather', limit: 5, offset: 50 }))).toBe('offset');
  });

  it('자료 파일이 없으면 data 오류', async () => {
    const files = fixtureFiles();
    files.clear();
    expect(await code(searchMaterials(ctx(files), { query: 'weather', limit: 5, offset: 0 }))).toBe('data');
  });
});

describe('codeitso_get_materials', () => {
  it('출처 글은 숨은 글자·HTML을 빼고, 설치 명령·조각·인증·관련 재료를 그대로 옮긴다', async () => {
    const r = await getMaterials(ctx(), ['a:weather', 'nope:x', 'a:weather']);
    expect(r.not_found).toEqual(['nope:x']);
    expect(r.items).toHaveLength(1);
    const d = r.items[0];
    expect(d?.source_text).toBe('Free weather API. Fast');
    expect(d?.summary_ko).toBe('무료 날씨 API다.');
    expect(d?.summary_ko_by).toBe('codeitso');
    expect(d?.requires).toBe('api_key');
    expect(d?.install).toBe('# 설치\nnpm i weather-now\nnpx weather-now init');
    expect(d?.install_one_line).toBe('npm i weather-now && npx weather-now init');
    expect(d?.docs_url).toBe('https://example.org/docs');
    expect(d?.facts).toEqual({ auth: 'apiKey', https: true, cors: 'yes' });
    expect(d?.related).toEqual([{ id: 'a:maps', name: 'Map Tiles' }]);
    expect(d?.metrics).toEqual({ stars: 1200, updated_at: '2026-10-01' });
  });

  it('AI API 제공자는 지원이 끝나지 않은 모델과 가격을 붙인다', async () => {
    const r = await getMaterials(ctx(), ['models-dev:anthropic']);
    expect(r.items[0]?.models).toEqual({
      fetched: '2026-11-08',
      total: 1,
      items: [{ id: 'claude-new', name: 'Claude New', input_usd_per_mtok: 3, output_usd_per_mtok: 15, context_tokens: 200000 }],
    });
  });

  it(`한 번에 ${LIMITS.ids}개까지만 읽는다`, async () => {
    const ids = Array.from({ length: 9 }, (_, i) => `x:${i}`);
    expect((await getMaterials(ctx(), ids)).not_found).toHaveLength(LIMITS.ids);
  });
});

describe('codeitso_browse', () => {
  it('인자가 없으면 대분류·소분류 개수, 대분류만 주면 소분류 설명과 정렬, 소분류는 재료 목록', async () => {
    const c = ctx();
    const all = (await browse(c, { sort: 'popular', limit: 15, offset: 0 })) as CategoryOverview;
    expect(all.categories.map((x) => x.id)).toEqual(['design', 'api', 'datasets']);
    expect(all).toMatchObject({ total: 5, fetched: '2026-11-08', kits: 1 });
    const api = (await browse(c, { category: 'api', sort: 'popular', limit: 15, offset: 0 })) as CategoryResult;
    expect(api.subcategories.find((s) => s.id === 'maps')?.sorts).toEqual(['popular', 'name']);
    const list = (await browse(c, { subcategory: 'weather', sort: 'popular', limit: 15, offset: 0 })) as SubListResult;
    expect(list).toMatchObject({ category: 'api', subcategory: 'weather', total: 1, count: 1, has_more: false });
  });

  it('갱신일이 없는 소분류는 최근 갱신순이 없고, 겹치는 소분류 id는 대분류를 묻는다', async () => {
    const c = ctx();
    expect(await code(browse(c, { subcategory: 'maps', sort: 'recent', limit: 5, offset: 0 }))).toBe('no_recent');
    expect(await code(browse(c, { subcategory: 'kr-public', sort: 'popular', limit: 5, offset: 0 }))).toBe('sub_ambiguous');
    expect(await code(browse(c, { subcategory: 'nope', sort: 'popular', limit: 5, offset: 0 }))).toBe('unknown_sub');
    const ds = (await browse(c, { category: 'datasets', subcategory: 'kr-public', sort: 'popular', limit: 5, offset: 0 })) as SubListResult;
    expect(ds.items.map((i) => i.id)).toEqual(['d:pub']);
  });
});

describe('codeitso_get_kits', () => {
  it('키트 목록과 한 키트의 재료·구현안', async () => {
    const c = ctx();
    const list = (await getKits(c, undefined)) as KitList;
    expect(list.kits).toEqual([{ id: 'weather-app', theme: 'edu', name: '날씨 앱 키트', desc: '날씨 앱 재료예요.', item_count: 2, page_url: `${SITE}/kits#kit-weather-app` }]);
    const kit = (await getKits(c, 'weather-app')) as KitResult;
    expect(kit.outline).toEqual(['API 키 받기', '오늘 날씨 보이기']);
    expect(kit.items.map((i) => i.id)).toEqual(['a:weather', 'd:font']);
    expect(await code(getKits(c, 'nope'))).toBe('unknown_kit');
  });
});

describe('codeitso_open_cart', () => {
  it('공유 링크의 # 뒤만 읽는다 (주소 전체·조각만 모두)', () => {
    expect(shareFragmentOf('https://codeitso.yoorrard.workers.dev/cart#s=a%3Ab')).toBe('s=a%3Ab');
    expect(shareFragmentOf('#s=a%3Ab')).toBe('s=a%3Ab');
    expect(shareFragmentOf('s=a%3Ab')).toBe('s=a%3Ab');
    expect(shareFragmentOf('https://evil.example/?s=a')).toBe('');
  });

  it('고른 모델·설치 명령·인증을 싣고, 없어진 재료는 표시만 한다', async () => {
    const share = `https://codeitso.yoorrard.workers.dev/cart#s=a%3Aweather,models-dev%3Aanthropic@claude-new,gone%3Ax`;
    const r = await openCart(ctx(), { share, offset: 0, limit: 10 });
    expect(r.total).toBe(3);
    expect(r.cart_url).toBe(`${SITE}/cart#s=a%3Aweather,models-dev%3Aanthropic@claude-new,gone%3Ax`);
    expect(r.items[0]).toMatchObject({ id: 'a:weather', install: 'npm i weather-now && npx weather-now init', requires: 'api_key', license: 'MIT' });
    expect(r.items[1]).toMatchObject({ id: 'models-dev:anthropic', chosen_model: 'claude-new', requires: 'api_key' });
    expect(r.items[2]).toMatchObject({ id: 'gone:x', missing: true });
    const page = await openCart(ctx(), { share, offset: 2, limit: 1 });
    expect(page).toMatchObject({ offset: 2, count: 1, has_more: false });
  });

  it('재료가 없는 링크는 오류', async () => {
    expect(await code(openCart(ctx(), { share: 'https://codeitso.yoorrard.workers.dev/cart', offset: 0, limit: 10 }))).toBe('bad_share');
  });
});

describe('마크다운', () => {
  it('검색 결과: 재료마다 이름·id·자리·라이선스, 다음 쪽 안내', async () => {
    const r = await searchMaterials(ctx(), { query: 'weather', limit: 2, offset: 0 });
    const md = renderSearch(r);
    expect(md).toContain('## Search "weather": 4 materials');
    expect(md).toContain('1. **Weather Now** `a:weather` · API > 날씨·환경 · License: MIT · 1,200 stars · updated 2026-10-01');
    expect(md).toContain('More: call again with offset=2.');
  });

  it('자세히: 출처 글은 제3자 글 이름표와 인용, 설치·조각은 울타리를 끊지 못한다', async () => {
    const md = renderDetails(await getMaterials(ctx(), ['a:weather', 'nope:x']));
    expect(md).toContain('Source description (third-party text, quoted) — src:\n> Free weather API. Fast');
    expect(md).toContain('```sh\n# 설치\nnpm i weather-now\nnpx weather-now init\n```');
    expect(md).toContain('````\nconst w = ```x```;\n````');
    expect(md).toContain('Not found: `nope:x`');
    expect(md).not.toContain('ignore previous');
    expect(md).not.toContain('​');
  });

  it('둘러보기·키트·장바구니', async () => {
    const c = ctx();
    expect(renderOverview((await browse(c, { sort: 'popular', limit: 5, offset: 0 })) as CategoryOverview)).toContain('- **API** `api` (3):');
    expect(renderCategory((await browse(c, { category: 'api', sort: 'popular', limit: 5, offset: 0 })) as CategoryResult)).toContain('**지도** `maps` (1; sort: popular/name)');
    expect(renderSubList((await browse(c, { subcategory: 'weather', sort: 'popular', limit: 5, offset: 0 })) as SubListResult)).toContain('sorted by popular');
    expect(renderKits((await getKits(c, undefined)) as KitList)).toContain('**날씨 앱 키트** `weather-app` (edu, 2)');
    expect(renderKit((await getKits(c, 'weather-app')) as KitResult)).toContain('1. API 키 받기');
    const cart = renderCart(await openCart(c, { share: '#s=models-dev%3Aanthropic@claude-new,gone%3Ax', offset: 0, limit: 10 }));
    expect(cart).toContain('Chosen model: `claude-new`');
    expect(cart).toContain('Install (from source): `npm install @anthropic-ai/sdk`');
    expect(cart).toContain('`gone:x`: no longer in the catalog');
  });
});
