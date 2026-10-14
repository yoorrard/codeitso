// 주소 (CONCEPT 2.2절, 설계서 9.4절): 주소는 routes.ts 한 곳에서 정하고, 모든 주소가 주소 바탕(PUBLIC_BASE_PATH)을 거친다.
// 옛 주소 넘기기(public/_redirects 10줄)는 T35에서 지웠다 (설계서 3.6절).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { absoluteUrl, BASE_PATH, normalizeBase, PATHS, ROUTES, siteRoot, stripBase, termPath, toolPath, waypointPath, withBase } from '../../src/lib/routes.ts';

describe('주소 만들기 (루트 빌드)', () => {
  it('기본 바탕은 루트라 주소가 그대로다', () => {
    expect(BASE_PATH).toBe('');
    expect(ROUTES).toEqual(PATHS);
  });

  it('도구·용어·도구 고르기', () => {
    expect(toolPath('github-pages')).toBe('/tools/github-pages');
    expect(termPath('api-key')).toBe('/terms/api-key');
    expect(waypointPath()).toBe('/waypoints');
    expect(waypointPath('slot.store')).toBe('/waypoints?slot=slot.store');
    // 막힌 곳의 [목록에 없는 도구 쓰기 ›]: 그 칸의 도구 이름 칸까지 펼친다 (T37)
    expect(waypointPath('slot.data', true)).toBe('/waypoints?slot=slot.data&write=1');
    expect(waypointPath(undefined, true)).toBe('/waypoints');
  });
});

describe('withBase', () => {
  it('바탕이 있으면 앞에 붙이고, 루트면 그대로', () => {
    expect(withBase('/arrival', '/code-chauffeur')).toBe('/code-chauffeur/arrival');
    expect(withBase('/arrival', '/')).toBe('/arrival');
    expect(withBase('/arrival', '')).toBe('/arrival');
    expect(withBase('/arrival')).toBe('/arrival');
  });

  it('홈은 바탕 폴더(끝 빗금), 검색어·조각은 그대로 따라간다', () => {
    expect(withBase('/', '/code-chauffeur')).toBe('/code-chauffeur/');
    expect(withBase('/waypoints?slot=a', '/code-chauffeur')).toBe('/code-chauffeur/waypoints?slot=a');
    expect(withBase('/courses#c1', '/code-chauffeur/')).toBe('/code-chauffeur/courses#c1');
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
    expect(siteRoot('https://cc.workers.dev')).toBe('https://cc.workers.dev');
  });

  it('absoluteUrl = site + 바탕 + 주소', () => {
    expect(absoluteUrl('https://user.github.io', '/arrival', '/code-chauffeur')).toBe('https://user.github.io/code-chauffeur/arrival');
    expect(absoluteUrl('https://cc.workers.dev', '/', '/')).toBe('https://cc.workers.dev/');
  });

  it('stripBase는 바탕을 떼고, 바탕 밖은 그대로', () => {
    expect(stripBase('/code-chauffeur/arrival', '/code-chauffeur')).toBe('/arrival');
    expect(stripBase('/code-chauffeur', '/code-chauffeur')).toBe('/');
    expect(stripBase('/code-chauffeurx/arrival', '/code-chauffeur')).toBe('/code-chauffeurx/arrival');
    expect(stripBase('/arrival', '/')).toBe('/arrival');
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
    expect(r.withBase('/arrival')).toBe('/code-chauffeur/arrival');
    expect(r.ROUTES.home).toBe('/code-chauffeur/');
    expect(r.ROUTES.arrival).toBe('/code-chauffeur/arrival');
    expect(r.ROUTES.privacy).toBe('/code-chauffeur/legal/privacy');
    expect(r.FILES.manifest).toBe('/code-chauffeur/manifest.webmanifest');
    expect(r.FILES.searchIndex).toBe('/code-chauffeur/search-index.json');
    expect(r.FILES.event).toBe('/code-chauffeur/api/event');
    expect(r.toolPath('neis-meal')).toBe('/code-chauffeur/tools/neis-meal');
    expect(r.termPath('api')).toBe('/code-chauffeur/terms/api');
    expect(r.waypointPath('slot.store')).toBe('/code-chauffeur/waypoints?slot=slot.store');
    expect(r.siteRoot('https://user.github.io')).toBe('https://user.github.io/code-chauffeur');
    // 바탕을 붙이기 전 주소는 그대로 (영수증 링크는 siteRoot() + PATHS.arrival)
    expect(r.PATHS.arrival).toBe('/arrival');
  });

  it('영수증 링크는 바탕을 한 번만 품는다', async () => {
    vi.stubEnv('BASE_URL', '/code-chauffeur/');
    vi.resetModules();
    const { siteRoot: root } = await import('../../src/lib/routes.ts');
    const { shareUrl } = await import('../../src/lib/share.ts');
    const url = shareUrl(root('https://user.github.io'), { answers: {}, cart: [], kept: [], deferred: [] });
    expect(url.startsWith('https://user.github.io/code-chauffeur/arrival#r=')).toBe(true);
  });
});
