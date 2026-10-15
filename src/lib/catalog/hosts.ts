// 미리 보기에서 부르는 출처의 공식 CDN (brief 5절, D116). 폰트 견본만 이 호스트에서 지연 로드한다.
// astro.config.mjs의 CSP(style-src·font-src)가 이 목록을 그대로 쓰고, core.ts thumbOf가 이 호스트의 주소만 카드에 싣는다.
// 호스트를 더하면 두 곳이 같이 바뀐다. 추적·광고 호스트는 넣지 않는다.

/** 글꼴 CSS를 주는 곳 (Google Fonts, Fontshare, jsDelivr, 네이버 한글한글 아름답게, Spoqa) */
export const FONT_CSS_HOSTS = ['fonts.googleapis.com', 'api.fontshare.com', 'cdn.jsdelivr.net', 'hangeul.pstatic.net', 'spoqa.github.io'] as const;
/** 글꼴 파일을 주는 곳 (위 CSS가 가리키는 곳 + Fontsource 파일) */
export const FONT_FILE_HOSTS = ['fonts.gstatic.com', 'cdn.fontshare.com', 'cdn.jsdelivr.net', 'hangeul.pstatic.net', 'spoqa.github.io'] as const;

/** https 주소의 호스트가 목록에 있으면 그 주소, 아니면 null */
export function allowedUrl(v: unknown, hosts: readonly string[]): string | null {
  if (typeof v !== 'string' || !/^https:\/\/[^\s"'<>()]+$/.test(v)) return null;
  const host = v.slice(8).split(/[/?#]/)[0] ?? '';
  return hosts.includes(host) ? v : null;
}
