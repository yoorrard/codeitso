// 주소 (D81·D103): 주소는 routes.ts 한 곳에서 정하고, 모든 주소가 주소 바탕(PUBLIC_BASE_PATH)을 거친다.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { absoluteUrl, BASE_PATH, categoryPath, itemDataPath, itemPath, listDataPath, listPath, normalizeBase, PATHS, ROUTES, searchPath, siteRoot, stripBase, termPath, withBase } from '../../src/lib/routes.ts';

describe('주소 만들기 (루트 빌드)', () => {
  it('기본 바탕은 루트라 주소가 그대로다', () => {
    expect(BASE_PATH).toBe('');
    expect(ROUTES).toEqual(PATHS);
  });

  it('진열대·목록·상세·검색·용어', () => {
    expect(categoryPath('design')).toBe('/c/design');
    expect(listPath('design', 'fonts')).toBe('/c/design/fonts');
    expect(listPath('design', 'fonts', 'popular', 1)).toBe('/c/design/fonts');
    expect(listPath('ai', 'mcp', 'popular', 2)).toBe('/c/ai/mcp?page=2');
    expect(listPath('ai', 'mcp', 'name', 3)).toBe('/c/ai/mcp?sort=name&page=3');
    expect(listPath('ai', 'mcp', 'recent')).toBe('/c/ai/mcp?sort=recent');
    expect(itemPath('google-fonts:roboto')).toBe('/item?id=google-fonts%3Aroboto');
    expect(searchPath('날씨 API')).toBe('/search?q=%EB%82%A0%EC%94%A8%20API');
    expect(termPath('api-key')).toBe('/terms#api-key');
    expect(listDataPath('ai', 'mcp', 'name', 4)).toBe('/catalog/list/ai/mcp/name-4.json');
    expect(itemDataPath(17)).toBe('/catalog/item/17.json');
  });
});

describe('withBase', () => {
  it('바탕이 있으면 앞에 붙이고, 루트면 그대로', () => {
    expect(withBase('/cart', '/code-chauffeur')).toBe('/code-chauffeur/cart');
    expect(withBase('/cart', '/')).toBe('/cart');
    expect(withBase('/cart', '')).toBe('/cart');
  });

  it('홈은 바탕 폴더(끝 빗금), 검색어·조각은 그대로 따라간다', () => {
    expect(withBase('/', '/code-chauffeur')).toBe('/code-chauffeur/');
    expect(withBase('/c/ai/mcp?page=2', '/code-chauffeur')).toBe('/code-chauffeur/c/ai/mcp?page=2');
    expect(withBase('/terms#api', '/code-chauffeur/')).toBe('/code-chauffeur/terms#api');
  });

  it('사이트 안 주소가 아닌 것(#…·바깥 주소)은 건드리지 않는다', () => {
    expect(withBase('#main', '/code-chauffeur')).toBe('#main');
    expect(withBase('https://example.org/a', '/code-chauffeur')).toBe('https://example.org/a');
  });

  it('바탕 꼴 다듬기: 끝 빗금을 떼고, 앞 빗금을 붙인다', () => {
    expect(normalizeBase('/')).toBe('');
    expect(normalizeBase('/code-chauffeur/')).toBe('/code-chauffeur');
    expect(normalizeBase('code-chauffeur')).toBe('/code-chauffeur');
  });
});

describe('siteRoot · absoluteUrl · stripBase', () => {
  it('siteRoot = origin + 바탕 (끝 빗금 없이)', () => {
    expect(siteRoot('https://user.github.io', '/code-chauffeur')).toBe('https://user.github.io/code-chauffeur');
    expect(siteRoot('https://cc.workers.dev/', '/')).toBe('https://cc.workers.dev');
  });

  it('absoluteUrl = site + 바탕 + 주소', () => {
    expect(absoluteUrl('https://user.github.io', '/og.png', '/code-chauffeur')).toBe('https://user.github.io/code-chauffeur/og.png');
    expect(absoluteUrl('https://cc.workers.dev', '/', '/')).toBe('https://cc.workers.dev/');
  });

  it('stripBase는 바탕을 떼고, 바탕 밖은 그대로', () => {
    expect(stripBase('/code-chauffeur/cart', '/code-chauffeur')).toBe('/cart');
    expect(stripBase('/code-chauffeur', '/code-chauffeur')).toBe('/');
    expect(stripBase('/code-chauffeurx/cart', '/code-chauffeur')).toBe('/code-chauffeurx/cart');
    expect(stripBase('/cart', '/')).toBe('/cart');
  });
});

describe('바탕을 넣은 빌드 (BASE_URL=/code-chauffeur/)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('ROUTES·FILES·주소 도우미가 모두 바탕을 거친다', async () => {
    vi.stubEnv('BASE_URL', '/code-chauffeur/');
    vi.resetModules();
    const r = await import('../../src/lib/routes.ts');
    expect(r.BASE_PATH).toBe('/code-chauffeur');
    expect(r.ROUTES.home).toBe('/code-chauffeur/');
    expect(r.ROUTES.cart).toBe('/code-chauffeur/cart');
    expect(r.FILES.manifest).toBe('/code-chauffeur/manifest.webmanifest');
    expect(r.FILES.event).toBe('/code-chauffeur/api/event');
    expect(r.categoryPath('api')).toBe('/code-chauffeur/c/api');
    expect(r.listPath('api', 'weather', 'name', 2)).toBe('/code-chauffeur/c/api/weather?sort=name&page=2');
    expect(r.itemPath('a:b')).toBe('/code-chauffeur/item?id=a%3Ab');
    expect(r.termPath('api')).toBe('/code-chauffeur/terms#api');
    expect(r.listDataPath('api', 'weather', 'popular', 1)).toBe('/code-chauffeur/catalog/list/api/weather/popular-1.json');
    expect(r.itemDataPath(3)).toBe('/code-chauffeur/catalog/item/3.json');
    expect(r.PATHS.cart).toBe('/cart');
  });
});
