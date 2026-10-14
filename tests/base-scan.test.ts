// 주소 바탕 빌드 검사 (설계서 9.4절): HTML 속성·CSS url()의 사이트 안 주소가 모두 바탕으로 시작하는지.
import { describe, expect, it } from 'vitest';
import { badCssUrls, badHtmlUrls, okUrl } from '../scripts/lib/base-scan.ts';

const B = '/code-chauffeur';

describe('okUrl', () => {
  it('바탕 안 주소와 바깥 주소·#·mailto·data는 괜찮다', () => {
    for (const u of [`${B}/`, `${B}/tools/a`, '#main', 'mailto:a@b.kr', 'https://x.org/a', 'data:image/png;base64,AA', '//cdn.x/a']) expect(okUrl(u, B)).toBe(true);
  });

  it('바탕이 빠졌거나 비슷한 이름은 안 된다', () => {
    for (const u of ['/tools/a', '/', `${B}`, `${B}x/a`, 'tools/a']) expect(okUrl(u, B)).toBe(false);
  });
});

describe('badHtmlUrls', () => {
  it('href·src·srcset·섬 주소·data-from을 보고, 인라인 스크립트 본문은 보지 않는다', () => {
    const html = [
      `<a href="${B}/about">a</a><a href="/about">b</a>`,
      `<img src="${B}/_astro/a.webp" srcset="${B}/_astro/a.webp 1x, /_astro/b.webp 2x">`,
      `<astro-island component-url="/_astro/X.js" renderer-url="${B}/_astro/r.js"></astro-island>`,
      `<script is:inline data-from="/check">var x = "/not-a-link"; a.href = '/nope';</script>`,
      `<use href="#mk-car"></use><a href="mailto:a@b.kr">m</a>`,
      `<style>@font-face{src:url('/fonts/a.woff2')}</style>`,
    ].join('\n');
    expect(badHtmlUrls(html, B)).toEqual([
      { where: 'href', value: '/about' },
      { where: 'srcset', value: '/_astro/b.webp' },
      { where: 'component-url', value: '/_astro/X.js' },
      { where: 'data-from', value: '/check' },
      { where: 'css url', value: '/fonts/a.woff2' },
    ]);
  });
});

describe('badCssUrls', () => {
  it('url()의 따옴표 있음·없음을 모두 본다', () => {
    expect(badCssUrls(`a{background:url(${B}/a.png)} b{src:url("/fonts/b.woff2")} c{mask:url(#m)}`, B)).toEqual([{ where: 'css url', value: '/fonts/b.woff2' }]);
  });
});
