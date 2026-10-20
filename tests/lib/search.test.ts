// 전체 검색 (src/lib/catalog/search.ts, scripts/catalog/search-index.ts, D114): 목록 줄이기, 낱말 조각, 질의 실행, 대분류 묶기, 색인 만들기.
import { describe, expect, it } from 'vitest';
import type { Ranked } from '../../src/lib/catalog/core.ts';
import { cardOf } from '../../src/lib/catalog/core.ts';
import type { TokenShard } from '../../src/lib/catalog/search.ts';
import {
  blockOf,
  decodePostings,
  decodeSubDocs,
  encodePostings,
  encodeSubDocs,
  groupByCategory,
  hitsInSub,
  indexTokens,
  matchSubs,
  prefixable,
  queryTerms,
  runQuery,
  shardsFor,
  synonymMap,
  tokenShard,
} from '../../src/lib/catalog/search.ts';
import type { CatalogItem, CategoryMeta } from '../../src/lib/catalog/types.ts';
import { buildSearch, readWords, searchCard } from '../../scripts/catalog/search-index.ts';

function item(id: string, extra: Partial<CatalogItem> = {}): CatalogItem {
  return { id, name: id, kind: 'weather', category: 'api', summary: '', url: 'https://example.org', source: { name: 'src', url: 'https://example.org' }, tags: [], preview: { type: 'api' }, fetchedAt: '2026-10-14', ...extra };
}

describe('자리 목록 글자로 줄이기', () => {
  it('차이를 36진수로, 1씩 이어지면 ~길이로 줄이고 되돌리면 같다', () => {
    for (const ids of [[], [0], [5], [0, 5, 6, 7, 8, 9, 20], [3, 4, 5], [1, 2, 3, 4, 5, 6], [100, 1000, 1001, 1002, 1003, 40000]]) {
      expect(decodePostings(encodePostings(ids))).toEqual(ids);
    }
    expect(encodePostings([0, 5, 6, 7, 8, 9, 20])).toBe('0.5.~4.b');
    expect(encodePostings(Array.from({ length: 1000 }, (_, i) => i)).length).toBeLessThan(10);
  });
});

describe('낱말과 조각', () => {
  it('색인 낱말은 영어 허사와 한 글자 영문을 뺀다', () => {
    expect(indexTokens('The Weather API for you')).toEqual(['weather', 'api']);
    expect(indexTokens('날씨정보를 알려 준다')).toEqual(expect.arrayContaining(['날씨정보를', '날씨정보', '날씨', '씨정']));
  });

  it('앞부분이 같은 낱말은 같은 조각에 있다 (영문 세 글자, 한글 두 글자)', () => {
    expect(tokenShard('weather')).toBe(tokenShard('weathered'));
    expect(tokenShard('wea')).toBe(tokenShard('weather'));
    expect(tokenShard('날씨정보')).toBe(tokenShard('날씨'));
    expect(prefixable('ai')).toBe(false);
    expect(prefixable('api')).toBe(true);
    expect(prefixable('책')).toBe(false);
    expect(prefixable('날씨')).toBe(true);
  });

  it('질의 낱말: 조사 뗀 꼴은 앞부분으로, 같은 뜻 낱말은 그대로만, 흔한 말은 없어도 된다', () => {
    const syn = synonymMap([['날씨', '기상', 'weather'], ['폰트', 'font']]);
    const [t] = queryTerms('날씨를', syn);
    expect(t?.forms).toEqual(['날씨를', '날씨']);
    expect(t?.alts).toEqual(['기상', 'weather']);
    expect(queryTerms('the font', syn).map((x) => x.text)).toEqual(['font']);
    expect(queryTerms('font', syn)[0]?.alts).toEqual(['폰트']);
    expect(queryTerms('mcp server', new Map(), new Set(['mcp']))[0]?.optional).toBe(true);
    expect(shardsFor(queryTerms('weather', syn))).toContain(tokenShard('날씨'));
  });
});

describe('질의 실행', () => {
  // 문서 0: name "weather api", 1: tag weathered, 2: name "날씨 알림", 3: 설명에만 api
  const docs: [string[], string[]][] = [
    [['weather', 'api'], []],
    [[], ['weathered']],
    [['날씨', '알림'], []],
    [[], ['api']],
  ];
  const shards = new Map<number, TokenShard>();
  const post = new Map<string, [number[], number[]]>();
  docs.forEach(([n, o], d) => {
    for (const t of n) (post.get(t) ?? post.set(t, [[], []]).get(t))?.[0].push(d);
    for (const t of o) (post.get(t) ?? post.set(t, [[], []]).get(t))?.[1].push(d);
  });
  for (const [t, [n, o]] of post) {
    const k = tokenShard(t);
    const s = shards.get(k) ?? {};
    s[t] = [encodePostings(n), encodePostings(o)];
    shards.set(k, s);
  }
  const get = (n: number): TokenShard | undefined => shards.get(n);

  it('이름 그대로가 앞부분보다, 이름이 설명보다 높다', () => {
    const r = runQuery(queryTerms('weather'), get);
    expect(r.hits).toEqual([
      { doc: 0, score: 6 },
      { doc: 1, score: 1 },
    ]);
    expect(runQuery(queryTerms('api'), get).hits.map((h) => h.doc)).toEqual([0, 3]);
  });

  it('같은 뜻 낱말은 그대로만 찾는다 (weather → weathered를 찾지 않는다)', () => {
    const syn = synonymMap([['날씨', 'weather']]);
    expect(runQuery(queryTerms('날씨', syn), get).hits.map((h) => h.doc)).toEqual([0, 2]);
  });

  it('모든 낱말이 든 문서만, 없으면 하나라도 든 문서로 넓힌다', () => {
    expect(runQuery(queryTerms('weather api'), get).hits.map((h) => h.doc)).toEqual([0]);
    const loose = runQuery(queryTerms('알림 api'), get);
    expect(loose.loose).toBe(true);
    expect(loose.hits.map((h) => h.doc).sort()).toEqual([0, 2, 3]);
    expect(runQuery(queryTerms('없는말'), get).hits).toEqual([]);
  });

  it('흔한 말은 꼭 들지 않아도 되고, 들면 점수만 더한다', () => {
    const r = runQuery(queryTerms('weather api', new Map(), new Set(['api'])), get);
    expect(r.hits.map((h) => h.doc)).toEqual([0, 1]);
    expect(r.loose).toBe(false);
  });

  it('소분류 안에서 찾기(keep): 낱말마다 먼저 거르고, 그 안에서 그리고·넓히기를 정한다', () => {
    // 문서 2·3만 이 소분류: 'weather'는 이름 문서 0이 빠지고 남는 것이 없다
    const keep = (d: number): boolean => d === 2 || d === 3;
    expect(runQuery(queryTerms('weather'), get, undefined, keep).hits).toEqual([]);
    expect(runQuery(queryTerms('api'), get, undefined, keep).hits.map((h) => h.doc)).toEqual([3]);
    // 전체에서는 '알림 api'가 넓혀야 하지만, 소분류 안에서도 그리고로 찾은 것이 없으니 넓힌다
    const loose = runQuery(queryTerms('알림 api'), get, undefined, keep);
    expect(loose.loose).toBe(true);
    expect(loose.hits.map((h) => h.doc).sort()).toEqual([2, 3]);
  });

  it('소분류 안 검색 파일: 인기순 자리 → 문서 번호를 줄였다 되돌리고, 순서를 어기는 자리는 따로 싣는다', () => {
    const docs = [4, 9, 10, 11, 12, 2, 30, 31];
    const f = encodeSubDocs(docs);
    expect(f.total).toBe(8);
    expect(f.extra).toEqual([[5, 2]]);
    const posOf = decodeSubDocs(JSON.parse(JSON.stringify(f)));
    expect([...posOf].sort((a, b) => a[1] - b[1])).toEqual(docs.map((d, i) => [d, i]));
    expect(decodeSubDocs(encodeSubDocs([]))).toEqual(new Map());
    // 점수 높은 순 → 소분류 인기순, 소분류 밖 문서는 뺀다
    expect(
      hitsInSub(
        [
          { doc: 31, score: 6 },
          { doc: 2, score: 6 },
          { doc: 99, score: 6 },
          { doc: 4, score: 2 },
        ],
        posOf,
      ),
    ).toEqual([
      { pos: 5, score: 6 },
      { pos: 7, score: 6 },
      { pos: 0, score: 2 },
    ]);
  });

  it('대분류는 문서 번호 범위로 묶고, 블록 자리를 셈한다', () => {
    const cats = [
      { id: 'design', start: 0, count: 2 },
      { id: 'api', start: 2, count: 500 },
    ];
    const g = groupByCategory([{ doc: 3, score: 1 }, { doc: 1, score: 6 }], cats);
    expect(g.get('design')).toEqual([{ doc: 1, score: 6 }]);
    expect(g.get('api')).toEqual([{ doc: 3, score: 1 }]);
    expect(blockOf(2 + 250, cats, 200)).toEqual({ cat: 'api', k: 1, at: 50 });
    expect(blockOf(9999, cats)).toBeNull();
  });

  it('소분류 이름으로도 찾는다', () => {
    const subs: [string, string, string, number][] = [['api', 'weather', '날씨·환경', 104], ['design', 'fonts', '폰트', 2124]];
    expect(matchSubs(queryTerms('날씨'), subs).map((s) => s[1])).toEqual(['weather']);
    expect(matchSubs(queryTerms('font', synonymMap([['폰트', 'font']])), subs).map((s) => s[1])).toEqual(['fonts']);
  });
});

describe('색인 만들기 (빌드)', () => {
  const items = [
    item('a:weather', { name: 'Weather Now', tags: ['forecast'], metrics: { stars: 10 } }),
    item('a:maps', { name: 'Map Tiles', kind: 'maps', summary: 'weather overlay maps', metrics: { stars: 50 } }),
    item('d:font', { name: '날씨체', kind: 'fonts', category: 'design', preview: { type: 'font' } }),
  ];
  const ranked: Ranked[] = items.map((it, i) => ({ item: it, pop: 1 - i * 0.1 }));
  const cats: CategoryMeta[] = [
    { id: 'design', nameKo: '디자인', total: 1, fetchedAt: '2026-10-14', subcategories: [{ id: 'fonts', nameKo: '폰트', count: 1, sources: [] }] },
    {
      id: 'api',
      nameKo: 'API',
      total: 2,
      fetchedAt: '2026-10-14',
      subcategories: [
        { id: 'weather', nameKo: '날씨·환경', count: 1, sources: [] },
        { id: 'maps', nameKo: '지도', count: 1, sources: [] },
      ],
    },
  ];
  const lists = new Map<string, Ranked[]>([
    ['design/fonts', [ranked[2] as Ranked]],
    ['api/weather', [ranked[0] as Ranked]],
    ['api/maps', [ranked[1] as Ranked]],
  ]);
  const byId = new Map(ranked.map((r) => [r.item.id, r]));
  const built = buildSearch(cats, lists, byId, (r) => cardOf(r.item), [['날씨', 'weather']], 16, 1);

  it('문서 번호는 대분류 순서 → 대분류 안 인기순, 블록은 대분류마다', () => {
    expect(built.meta.cats).toEqual([
      { id: 'design', start: 0, count: 1 },
      { id: 'api', start: 1, count: 2 },
    ]);
    expect([...built.blocks.keys()]).toEqual(['design-0', 'api-0', 'api-1']);
    expect(built.blocks.get('api-0')?.[0]?.id).toBe('a:weather');
    expect(built.meta.subs).toHaveLength(3);
  });

  it('지은 색인으로 찾으면 이름에 든 문서가 먼저, 한글로 찾아도 영어 낱말을 찾는다', () => {
    const get = (n: number): TokenShard | undefined => built.shards[n];
    const syn = synonymMap(built.meta.syn);
    const common = new Set(built.meta.common);
    // 0 = 날씨체(이름에 '날씨'), 1 = Weather Now(이름), 2 = Map Tiles(설명에만)
    const r = runQuery(queryTerms('weather', syn, common), get, built.meta.shards);
    expect(r.hits).toEqual([
      { doc: 0, score: 6 },
      { doc: 1, score: 6 },
      { doc: 2, score: 2 },
    ]);
    expect(runQuery(queryTerms('날씨', syn, common), get, built.meta.shards).hits.map((h) => h.doc)).toEqual([0, 1, 2]);
    expect(runQuery(queryTerms('tiles', syn, common), get, built.meta.shards).hits.map((h) => h.doc)).toEqual([2]);
  });

  it('소분류마다 인기순 자리 → 문서 번호 파일을 만든다 (소분류 안 검색)', () => {
    expect([...built.subDocs.keys()]).toEqual(['design-fonts', 'api-weather', 'api-maps']);
    expect(decodeSubDocs(built.subDocs.get('api-maps') as never)).toEqual(new Map([[2, 0]]));
    expect(decodeSubDocs(built.subDocs.get('design-fonts') as never)).toEqual(new Map([[0, 0]]));
  });

  it('흔한 말(이름 밖 문서가 너무 많은 낱말)은 이름 밖 목록을 싣지 않는다', () => {
    const tight = buildSearch(cats, lists, byId, (r) => cardOf(r.item), [], 16, 1, 0);
    expect(tight.meta.common).toContain('weather');
    const lists2 = tight.shards[tokenShard('weather', 16)]?.['weather'];
    expect(lists2?.[1]).toBe('');
    expect(decodePostings(lists2?.[0] ?? '')).toEqual([1]);
  });

  it('결과 카드의 무거운 아이콘 견본은 머리글자로 줄인다', () => {
    const heavy = cardOf(item('i:x', { name: 'Big Icons', category: 'design', preview: { type: 'icons', icons: Array.from({ length: 4 }, () => ({ body: `<path d="${'M0 0'.repeat(200)}"/>` })) } }));
    expect(heavy.thumb.t).toBe('icons');
    expect(searchCard(heavy).thumb).toEqual({ t: 'mono', label: 'BI' });
  });

  it('같은 뜻 묶음 자료는 한 칸에 낱말 하나씩', () => {
    const groups = readWords();
    expect(groups.length).toBeGreaterThan(50);
    for (const g of groups) for (const w of g) expect(w, w).toMatch(/^[a-z0-9가-힣]+$/);
  });
});
