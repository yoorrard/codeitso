// 진열대 계산 (src/lib/catalog/core.ts)과 진열대 읽기 (scripts/catalog/load.ts): 정렬·인기 점수·쪽 나누기·묶음·조각 번호·카드 모양,
// 실제 자료로 개수와 배포 파일 수 (D103).
import { describe, expect, it } from 'vitest';
import {
  cardOf,
  chunkCount,
  chunkOf,
  cmpText,
  factsOf,
  filePopularity,
  fnv1a,
  formatCount,
  metricOf,
  monogram,
  pageCount,
  pageSlice,
  pageWindow,
  relatedIndex,
  safeSvg,
  shardOf,
  sortRanked,
  thumbOf,
  truncate,
  withCommas,
} from '../../src/lib/catalog/core.ts';
import { catalog, categories, homeRows, listOf, navData, shards } from '../../scripts/catalog/load.ts';
import { SEARCH_BLOCK, SEARCH_SHARDS } from '../../src/lib/catalog/search.ts';
import type { CatalogItem } from '../../src/lib/catalog/types.ts';
import { CATEGORY_ORDER, CHUNK_PAGES, MAX_CATALOG_FILES, PAGE_SIZE, SHARDS, SORTS } from '../../src/lib/catalog/types.ts';

function item(id: string, extra: Partial<CatalogItem> = {}): CatalogItem {
  return { id, name: id, kind: 'fonts', category: 'design', summary: `${id} 설명`, url: 'https://example.org', source: { name: '출처', url: 'https://example.org' }, tags: [], preview: { type: 'font' }, fetchedAt: '2026-10-14', ...extra };
}

describe('견주기·해시', () => {
  it('이름은 대소문자·전각을 무시하고 코드 단위 순서로', () => {
    const names = ['banana', 'Apple', '가나', 'ＡＢ', 'apple'];
    expect([...names].sort(cmpText)).toEqual(['ＡＢ', 'Apple', 'apple', 'banana', '가나']);
  });

  it('FNV-1a는 알려진 값과 같고, 조각 번호는 늘 같은 범위', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(shardOf('google-fonts:roboto')).toBe(shardOf('google-fonts:roboto'));
    for (const id of ['x', 'mcp-registry:ac-inference-sh-mcp', '한글:아이디']) {
      const n = shardOf(id);
      expect(n >= 0 && n < SHARDS).toBe(true);
    }
  });
});

describe('쪽 나누기', () => {
  it('쪽 수와 한 쪽 자르기', () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(PAGE_SIZE)).toBe(1);
    expect(pageCount(PAGE_SIZE + 1)).toBe(2);
    const list = Array.from({ length: 130 }, (_, i) => i);
    expect(pageSlice(list, 1)).toHaveLength(60);
    expect(pageSlice(list, 3)).toEqual([120, 121, 122, 123, 124, 125, 126, 127, 128, 129]);
    expect(pageSlice(list, 99)).toEqual(pageSlice(list, 3));
    expect(pageSlice(list, 0)).toEqual(pageSlice(list, 1));
  });

  it('쪽 번호 → 목록 묶음 파일과 그 안의 자리 (8쪽씩)', () => {
    expect(CHUNK_PAGES).toBe(8);
    expect(chunkOf(1)).toEqual({ chunk: 0, offset: 0 });
    expect(chunkOf(2)).toEqual({ chunk: 0, offset: 60 });
    expect(chunkOf(8)).toEqual({ chunk: 0, offset: 420 });
    expect(chunkOf(9)).toEqual({ chunk: 1, offset: 0 });
    expect(chunkOf(0)).toEqual({ chunk: 0, offset: 0 });
    expect(chunkCount(0)).toBe(1);
    expect(chunkCount(480)).toBe(1);
    expect(chunkCount(481)).toBe(2);
    expect(chunkCount(46_231)).toBe(97);
    // 묶음 안의 쪽 자르기는 전체 목록의 쪽 자르기와 같다
    const list = Array.from({ length: 1000 }, (_, i) => i);
    for (const page of [1, 2, 8, 9, 16, 17]) {
      const { chunk, offset } = chunkOf(page);
      const file = list.slice(chunk * 480, chunk * 480 + 480);
      expect(file.slice(offset, offset + PAGE_SIZE)).toEqual(pageSlice(list, page));
    }
  });

  it('쪽 번호 줄은 처음·끝·지금 앞뒤만 보이고 사이를 줄인다', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(7, 20)).toEqual([1, null, 5, 6, 7, 8, 9, null, 20]);
    expect(pageWindow(4, 20)).toEqual([1, 2, 3, 4, 5, 6, null, 20]);
    expect(pageWindow(20, 20)).toEqual([1, null, 18, 19, 20]);
  });
});

describe('숫자·글 다듬기', () => {
  it('큰 수는 만·억으로 짧게', () => {
    expect(withCommas(1234567)).toBe('1,234,567');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(9999)).toBe('9,999');
    expect(formatCount(12_345)).toBe('1.2만');
    expect(formatCount(350_000)).toBe('35만');
    expect(formatCount(100_000)).toBe('10만');
    expect(formatCount(496_258_234)).toBe('5억');
    expect(formatCount(123_000_000)).toBe('1.2억');
  });

  it('지표는 스타 → 좋아요 → 다운로드 하나', () => {
    expect(metricOf(item('a', { metrics: { downloads: 5, likes: 2 } }))).toEqual({ kind: 'likes', value: 2 });
    expect(metricOf(item('a', { metrics: { stars: 9, downloads: 5 } }))).toEqual({ kind: 'stars', value: 9 });
    expect(metricOf(item('a', { metrics: { updatedAt: '2026-01-01' } }))).toBeUndefined();
  });

  it('자르기와 머리글자', () => {
    expect(truncate('가나다라마', 4)).toBe('가나다…');
    expect(truncate('가나', 4)).toBe('가나');
    expect(monogram('01-ai/Yi-1.5-34B-Chat')).toBe('Y1');
    expect(monogram('Model Context Protocol')).toBe('MC');
    expect(monogram('한국문화관광연구원_서비스')).toBe('한국');
  });
});

describe('카드 미리 보기 판', () => {
  it('Base16 팔레트는 바탕 + 강조 8색, 그라디언트는 각도와 색', () => {
    const colors = Array.from({ length: 16 }, (_, i) => ({ name: `base0${i.toString(16)}`, hex: `#0000${i.toString(16).padStart(2, '0')}` }));
    const t = thumbOf(item('p', { preview: { type: 'palette', mode: 'base16', colors } }));
    expect(t).toEqual({ t: 'colors', colors: ['#000000', ...colors.slice(8).map((c) => c.hex)] });
    expect(thumbOf(item('g', { preview: { type: 'palette', mode: 'gradient', angle: 45, colors: ['#ffffff', '#000000'] } }))).toEqual({ t: 'gradient', colors: ['#ffffff', '#000000'], angle: 45 });
  });

  it('위험한 SVG 조각은 버린다', () => {
    expect(safeSvg('<path d="M0 0h1"/>')).toBe('<path d="M0 0h1"/>');
    expect(safeSvg('<path onload="x()"/>')).toBeNull();
    expect(safeSvg('<script>x</script>')).toBeNull();
    expect(safeSvg('<image href="https://e.org/a.png"/>')).toBeNull();
    const t = thumbOf(item('i', { kind: 'icons', preview: { type: 'icons', width: 24, height: 24, icons: [{ body: '<path d="M1 1"/>' }, { body: '<script/>' }] } }));
    expect(t).toEqual({ t: 'icons', w: 24, h: 24, bodies: ['<path d="M1 1"/>'] });
  });

  it('그림은 https 출처 주소만, 검색 엔진 파비콘 서비스는 부르지 않는다', () => {
    expect(thumbOf(item('t', { preview: { type: 'template', image: 'https://cdn.example.org/a.png' } }))).toEqual({ t: 'img', src: 'https://cdn.example.org/a.png', fit: 'cover', label: 'T' });
    expect(thumbOf(item('t', { preview: { type: 'template', image: 'http://cdn.example.org/a.png' } })).t).toBe('mono');
    expect(thumbOf(item('m', { preview: { type: 'mcp', icon: 'https://www.google.com/s2/favicons?domain=x' } })).t).toBe('mono');
  });

  it('카드: 한국어 한 줄을 먼저, 사실은 4개까지 (API: 인증·HTTPS·CORS·무료 한도)', () => {
    const c = cardOf(item('api:x', { kind: 'weather', category: 'api', summaryKo: '날씨를 알려 준다', preview: { type: 'api', auth: 'none', https: true, cors: 'yes', formats: ['JSON'] } }));
    expect(c.summary).toBe('날씨를 알려 준다');
    expect(c.facts).toEqual([{ k: 'auth', v: 'none' }, { k: 'https' }, { k: 'cors' }, { k: 'format', v: 'JSON' }]);
    const free = cardOf(item('api:y', { category: 'api', preview: { type: 'api', auth: 'apiKey', https: true, cors: 'no', freeTierQuote: 'Free forever.', formats: ['JSON'] } }));
    expect(free.facts).toEqual([{ k: 'auth', v: 'apiKey' }, { k: 'https' }, { k: 'free' }, { k: 'format', v: 'JSON' }]);
    expect(factsOf(item('m', { preview: { type: 'mcp', transports: ['stdio'], remotes: [{ url: 'https://x' }] } }))).toEqual([
      { k: 'transport', v: 'stdio' },
      { k: 'transport', v: 'remote' },
    ]);
  });
});

describe('인기 점수와 정렬', () => {
  it('파일 안에서 가장 많이 채워진 지표의 순위 백분위, 없으면 0.5·0', () => {
    const items = [item('a', { metrics: { downloads: 100 } }), item('b', { metrics: { downloads: 10 } }), item('c', { metrics: { downloads: 100 } }), item('d'), item('e', { written: 'codeshopper' })];
    expect(filePopularity(items)).toEqual([1, 0.5, 1, 0, 0.5]);
    expect(filePopularity([item('x'), item('y')])).toEqual([0.5, 0.5]);
  });

  it('인기순은 점수 → 지표 → 이름, 이름순, 최근 갱신순은 날짜 없는 것을 뒤로', () => {
    const r = [
      { item: item('b', { metrics: { stars: 5, updatedAt: '2026-01-01' } }), pop: 0.5 },
      { item: item('a', { metrics: { stars: 9 } }), pop: 0.5 },
      { item: item('c', { metrics: { updatedAt: '2026-05-01' } }), pop: 1 },
    ];
    expect(sortRanked(r, 'popular').map((x) => x.item.id)).toEqual(['c', 'a', 'b']);
    expect(sortRanked(r, 'name').map((x) => x.item.id)).toEqual(['a', 'b', 'c']);
    expect(sortRanked(r, 'recent').map((x) => x.item.id)).toEqual(['c', 'b', 'a']);
  });

  it('관련 상품: 태그를 많이 함께 가진 것 → 모자라면 순위가 가까운 것, 자기는 빼고', () => {
    const tags = [['a', 'b'], ['a', 'b'], ['c'], ['a'], ['z'], ['y']];
    const rel = relatedIndex(tags.map((t) => ({ tags: t })), 3);
    expect(rel[0]).toEqual([1, 3, 2]);
    for (const [i, l] of rel.entries()) {
      expect(l).not.toContain(i);
      expect(new Set(l).size).toBe(l.length);
    }
  });
});

describe('실제 자료 (data/catalog/**)', { timeout: 120_000 }, () => {
  it('대분류 여섯, 소분류마다 상품이 있고, 개수 합이 맞다', () => {
    const cats = categories();
    expect(cats.map((c) => c.id)).toEqual([...CATEGORY_ORDER]);
    let total = 0;
    for (const c of cats) {
      expect(c.subcategories.length).toBeGreaterThan(0);
      expect(c.subcategories.reduce((n, s) => n + s.count, 0)).toBe(c.total);
      for (const s of c.subcategories) expect(listOf(c.id, s.id, 'popular')).toHaveLength(s.count);
      total += c.total;
    }
    expect(total).toBeGreaterThan(100_000);
    expect(navData()).toHaveLength(CATEGORY_ORDER.length);
  });

  it('정렬마다 같은 상품, 상세 조각은 모든 id를 한 번씩 담는다', () => {
    const fonts = listOf('design', 'fonts', 'popular').map((r) => r.item.id).sort();
    for (const sort of SORTS) expect(listOf('design', 'fonts', sort).map((r) => r.item.id).sort()).toEqual(fonts);
    const all = shards();
    expect(all).toHaveLength(SHARDS);
    const count = all.reduce((n, s) => n + Object.keys(s).length, 0);
    expect(count).toBe(catalog().byId.size);
    for (const [n, s] of all.entries()) for (const id of Object.keys(s).slice(0, 3)) expect(shardOf(id)).toBe(n);
    const sample = Object.values(all[0] ?? {})[0];
    expect(sample?.rel.length).toBeGreaterThan(0);
  });

  it('배포 파일 수가 5천 개 아래다 (Cloudflare 한 판 2만 개, D103·D114·D115): 목록 묶음 + 상세 조각 + 검색 + 거르기 + 쪽 + 정적 파일', () => {
    let listFiles = 0;
    for (const c of categories()) for (const s of c.subcategories) listFiles += chunkCount(s.count) * SORTS.length;
    const subs = categories().reduce((n, c) => n + c.subcategories.length, 0);
    const searchFiles = 1 + SEARCH_SHARDS + categories().reduce((n, c) => n + Math.ceil(c.total / SEARCH_BLOCK), 0);
    const facetFiles = subs * 3;
    const pages = categories().length + subs + 20;
    expect(listFiles + SHARDS + searchFiles + facetFiles + pages + 200).toBeLessThan(MAX_CATALOG_FILES);
  });

  it('홈 기획전 다섯 줄이 모두 차고, AI 코딩 툴 줄에는 MCP 서버와 스킬이 섞인다', () => {
    const rows = homeRows();
    expect(rows.map((r) => r.id)).toEqual(['aiTools', 'openApis', 'aiApis', 'templates', 'fontsKo']);
    expect(new Set(rows[0]?.cards.map((c) => c.sub))).toEqual(new Set(['mcp', 'skill']));
    for (const r of rows) expect(r.cards.length, r.id).toBe(10);
  });
});
