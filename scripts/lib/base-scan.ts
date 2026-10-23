// 주소 바탕 빌드 검사 (설계서 9.4절, D81): 하위 주소(/code-chauffeur) 빌드의 HTML·CSS에서 사이트 안 주소가 모두 바탕으로 시작하는지 본다.
// 바깥 주소(http·https)·#·mailto:·data:·blob:·tel:은 뺀다. 순수 함수만 (파일 읽기는 scripts/qa/base-build.ts). 시험: tests/base-scan.test.ts.

export interface BadUrl {
  /** 어디서 (속성 이름, css url) */
  where: string;
  value: string;
}

/** 주소를 보는 HTML 속성: 링크·그림·스크립트, 그림 후보(srcset), 섬 묶음 주소, 출발 장면이 견주는 앞 화면 주소(data-from) */
const ATTRS = ['href', 'src', 'srcset', 'imagesrcset', 'action', 'poster', 'component-url', 'renderer-url', 'before-hydration-url', 'data-from'] as const;

const SKIP = /^(#|mailto:|tel:|data:|blob:|https?:\/\/|\/\/)/i;

/** 바탕 안의 주소인가 (바깥 주소 등은 늘 괜찮다). base는 '/code-chauffeur' 꼴 */
export function okUrl(value: string, base: string): boolean {
  const v = value.trim();
  if (v === '' || SKIP.test(v)) return true;
  return v === `${base}/` || v.startsWith(`${base}/`);
}

/** srcset 값을 주소 목록으로 ('a.png 1x, b.png 2x') */
function srcsetUrls(v: string): string[] {
  return v
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0] ?? '')
    .filter((u) => u !== '');
}

/** HTML 하나에서 바탕 밖 주소 */
export function badHtmlUrls(html: string, base: string): BadUrl[] {
  const out: BadUrl[] = [];
  // 인라인 스크립트 안의 글은 주소가 아니므로 보지 않는다 (태그 속성만)
  const tags = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.slice(0, m.indexOf('>') + 1));
  const re = new RegExp(`\\s(${ATTRS.join('|')})=("([^"]*)"|'([^']*)')`, 'gi');
  for (let m = re.exec(tags); m; m = re.exec(tags)) {
    const attr = (m[1] ?? '').toLowerCase();
    const raw = (m[3] ?? m[4] ?? '').replace(/&amp;/g, '&');
    const urls = attr === 'srcset' || attr === 'imagesrcset' ? srcsetUrls(raw) : [raw];
    for (const u of urls) if (!okUrl(u, base)) out.push({ where: attr, value: u });
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) out.push(...badCssUrls(m[1] ?? '', base));
  return out;
}

/** CSS 하나에서 바탕 밖 url(…) */
export function badCssUrls(css: string, base: string): BadUrl[] {
  const out: BadUrl[] = [];
  for (const m of css.matchAll(/url\(\s*(["']?)([^"')]*)\1\s*\)/g)) {
    const u = m[2] ?? '';
    if (!okUrl(u, base)) out.push({ where: 'css url', value: u });
  }
  return out;
}
