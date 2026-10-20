// robots.txt (T21, D53): 미리 보기는 검색 엔진이 색인하지 않게 막고, 정식은 열고 사이트맵 주소를 알린다 (D136).
// 막고 여는 범위는 주소 바탕 안쪽이다 (설계서 9.4절). 하위 주소(GitHub Pages 프로젝트 사이트)면 로봇은 도메인 맨 위의 robots.txt만 읽으므로
// 이 파일은 참고용이 되고, 미리 보기는 화면마다 붙는 noindex가 막는다.
import type { APIRoute } from 'astro';
import { FILES, ROUTES } from '../lib/routes.ts';
import { STAGE } from '../lib/stage.ts';

export const GET: APIRoute = ({ site }) => {
  const lines = ['User-agent: *', `${STAGE === 'release' ? 'Allow' : 'Disallow'}: ${ROUTES.home}`];
  if (STAGE === 'release' && site) lines.push('', `Sitemap: ${new URL(FILES.sitemap, site).href}`);
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
