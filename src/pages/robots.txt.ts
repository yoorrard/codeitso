// robots.txt (T21, D53): 미리 보기는 검색 엔진이 색인하지 않게 막고, 정식은 연다.
// 막고 여는 범위는 주소 바탕 안쪽이다 (설계서 9.4절). 하위 주소(GitHub Pages 프로젝트 사이트)면 로봇은 도메인 맨 위의 robots.txt만 읽으므로
// 이 파일은 참고용이 되고, 미리 보기는 화면마다 붙는 noindex가 막는다. 사이트맵 줄(site + 바탕)은 T41(L-03)이 더한다.
import type { APIRoute } from 'astro';
import { ROUTES } from '../lib/routes.ts';
import { STAGE } from '../lib/stage.ts';

export const GET: APIRoute = () => {
  const body = `User-agent: *\n${STAGE === 'release' ? 'Allow' : 'Disallow'}: ${ROUTES.home}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
