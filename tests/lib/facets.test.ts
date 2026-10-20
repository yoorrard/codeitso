// 목록 거르기 (src/lib/catalog/facets.ts, D115): 값 뽑기, 칸 고르기, 주소, 거르기·개수, 정렬 순서.
import { describe, expect, it } from 'vitest';
import {
  applySelection,
  authValue,
  buildFacets,
  decodeOrder,
  encodeOrder,
  facetValues,
  liveCounts,
  openFacets,
  rankOf,
  readSelection,
  selectionSize,
  writeSelection,
} from '../../src/lib/catalog/facets.ts';
import type { CatalogItem } from '../../src/lib/catalog/types.ts';
import { listPath } from '../../src/lib/routes.ts';

function item(id: string, extra: Partial<CatalogItem> = {}): CatalogItem {
  return { id, name: id, kind: 'weather', category: 'api', summary: '', url: 'https://example.org', source: { name: 'A', url: 'https://example.org' }, tags: [], preview: { type: 'api' }, fetchedAt: '2026-10-14', ...extra };
}

describe('값 뽑기 (출처 자료 그대로)', () => {
  it('API: 인증은 아는 꼴로 모으고, HTTPS·CORS·무료 한도는 있을 때만', () => {
    expect(authValue('apiKey')).toBe('apiKey');
    expect(authValue('X-Mashape-Key')).toBe('apiKey');
    expect(authValue('OAuth 2.0 / OIDC')).toBe('oauth');
    expect(authValue('none')).toBe('none');
    expect(authValue('cloud IAM')).toBe('cloud IAM');
    const v = facetValues(item('a', { license: 'MIT', tags: ['weather'], preview: { type: 'api', auth: 'none', https: true, cors: 'unknown', freeTierQuote: 'Free forever.' } }));
    expect(v).toEqual({ source: ['A'], license: ['MIT'], tag: ['weather'], auth: ['none'], https: ['yes'], free: ['yes'] });
  });

  it('MCP 연결 방식, 폰트 모양·글자·가변, 데이터셋 작업·형식', () => {
    expect(facetValues(item('m', { preview: { type: 'mcp', transports: ['stdio', 'streamable-http'] } })).transport).toEqual(['stdio', 'remote']);
    expect(facetValues(item('m2', { preview: { type: 'mcp', remotes: [{ url: 'https://x' }] } })).transport).toEqual(['remote']);
    const f = facetValues(item('f', { preview: { type: 'font', generic: 'serif', subsets: ['latin', 'latin-ext', 'korean'], axes: [{ tag: 'wght' }] } }));
    expect(f).toMatchObject({ generic: ['serif'], script: ['latin', 'korean'], variable: ['yes'] });
    expect(facetValues(item('d', { preview: { type: 'dataset', tasks: ['Classification'], formats: ['csv', 'CSV'] } }))).toMatchObject({ task: ['Classification'], format: ['CSV'] });
  });
});

describe('칸 고르기 (빌드)', () => {
  const items = [
    ...Array.from({ length: 12 }, (_, i) => item(`k${i}`, { license: 'MIT', tags: ['geo', 'x'], preview: { type: 'api', auth: 'apiKey', https: true } })),
    ...Array.from({ length: 8 }, (_, i) => item(`n${i}`, { license: 'Apache-2.0', tags: ['geo', 'y'], preview: { type: 'api', auth: 'none', https: true, freeTierQuote: 'Free.' } })),
  ];
  const file = buildFacets(items);

  it('값이 둘 이상인 칸만 (출처 하나·모두 같은 HTTPS는 빼고), 켜기 칸은 일부에만 있을 때', () => {
    expect(file.facets.map((f) => f.k)).toEqual(['license', 'auth', 'free', 'tag']);
    expect(file.facets.find((f) => f.k === 'license')?.values).toEqual([
      ['MIT', 12],
      ['Apache-2.0', 8],
    ]);
    // 모든 상품에 붙은 태그(geo)는 거르는 뜻이 없어 뺀다
    expect(file.facets.find((f) => f.k === 'tag')?.values).toEqual([
      ['x', 12],
      ['y', 8],
    ]);
  });

  it('거르기: 같은 칸은 또는, 칸끼리는 그리고. 값마다 남는 개수는 그 칸의 고름을 빼고 센다', () => {
    const idx = openFacets(file);
    expect(applySelection(idx, {})).toHaveLength(20);
    expect(applySelection(idx, { license: ['MIT', 'Apache-2.0'] })).toHaveLength(20);
    expect(applySelection(idx, { license: ['Apache-2.0'], auth: ['none'] })).toEqual([12, 13, 14, 15, 16, 17, 18, 19]);
    expect(applySelection(idx, { license: ['MIT'], free: ['yes'] })).toEqual([]);
    const live = liveCounts(idx, { license: ['MIT'] });
    expect(live.license).toEqual([12, 8]);
    expect(live.auth).toEqual([12, 0]);
    expect(live.free).toEqual([0]);
  });

  it('먼저 좁힌 자리(소분류 안 검색 결과) 안에서만 거르고 센다', () => {
    const idx = openFacets(file);
    const within = new Uint8Array(20);
    for (const i of [0, 1, 12]) within[i] = 1;
    expect(applySelection(idx, {}, undefined, within)).toEqual([0, 1, 12]);
    expect(applySelection(idx, { license: ['Apache-2.0'] }, undefined, within)).toEqual([12]);
    const live = liveCounts(idx, { license: ['MIT'] }, within);
    expect(live.license).toEqual([2, 1]);
    expect(live.auth).toEqual([2, 0]);
  });

  it('주소: 아는 칸·값만 읽고, 칸 순서대로 쓴다', () => {
    const q = new URLSearchParams('license=MIT&license=GPL&auth=none&sort=name&bogus=1');
    const sel = readSelection(q, file.facets);
    expect(sel).toEqual({ license: ['MIT'], auth: ['none'] });
    expect(selectionSize(sel)).toBe(2);
    const out = new URLSearchParams();
    writeSelection(out, { auth: ['none'], license: ['MIT', 'Apache-2.0'] });
    expect(out.toString()).toBe('license=MIT&license=Apache-2.0&auth=none');
    expect(listPath('api', 'weather', 'name', 2, { auth: ['none'] })).toBe('/c/api/weather?auth=none&sort=name&page=2');
    expect(listPath('api', 'weather')).toBe('/c/api/weather');
    // 소분류 안 검색어: 기본 정렬이 관련도순이라 인기순을 적고, 관련도순은 뺀다
    expect(listPath('api', 'weather', 'match', 1, {}, ' 한글 폰트 ')).toBe('/c/api/weather?q=%ED%95%9C%EA%B8%80%20%ED%8F%B0%ED%8A%B8');
    expect(listPath('api', 'weather', 'popular', 2, { auth: ['none'] }, 'rain')).toBe('/c/api/weather?q=rain&auth=none&sort=popular&page=2');
    expect(listPath('api', 'weather', 'match')).toBe('/c/api/weather');
  });
});

describe('정렬 순서 파일', () => {
  it('인기순 자리의 나열을 줄였다 되돌리고, 자리별 순위를 셈한다', () => {
    const order = [3, 0, 2, 1, 40000];
    expect(decodeOrder(encodeOrder(order))).toEqual(order);
    expect(decodeOrder('')).toEqual([]);
    expect([...rankOf([2, 0, 1], 3)]).toEqual([1, 2, 0]);
  });
});
