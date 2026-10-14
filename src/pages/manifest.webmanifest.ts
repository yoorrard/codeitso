// 웹 앱 설명서 /manifest.webmanifest (설계서 3.6·9.4절, D81): 정적 파일이던 것을 끝점으로 바꿔 start_url·scope·아이콘 주소에 주소 바탕을 넣는다.
// 아이콘 파일은 npm run logo가 장바구니 로고에서 public/에 만든다 (D104). 이름과 설명은 화면 문구(ko.ts)와 같다.
import type { APIRoute } from 'astro';
import { ko } from '../copy/ko.ts';
import { FILES, ROUTES } from '../lib/routes.ts';

// 설명서는 CSS 변수를 읽지 못해 토큰 값을 그대로 쓴다: 로고 파랑(--brand-blue 낮 값)과 흰 바탕(--surface)
const THEME_COLOR = '#0364F5'; // floor-guard-ignore: 웹 앱 설명서는 CSS 변수를 읽지 못해 --brand-blue 낮 값을 그대로 쓴다
const BACKGROUND_COLOR = '#FFFFFF'; // floor-guard-ignore: 웹 앱 설명서는 CSS 변수를 읽지 못해 --surface 값을 그대로 쓴다

export const GET: APIRoute = () => {
  const manifest = {
    name: ko.site.name,
    short_name: ko.site.name,
    description: ko.site.description,
    lang: 'ko',
    start_url: ROUTES.home,
    scope: ROUTES.home,
    display: 'browser',
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: [
      { src: FILES.icon192, type: 'image/png', sizes: '192x192' },
      { src: FILES.icon512, type: 'image/png', sizes: '512x512' },
      { src: FILES.iconMaskable, type: 'image/png', sizes: '512x512', purpose: 'maskable' },
    ],
  };
  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } });
};
