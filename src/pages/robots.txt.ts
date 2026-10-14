// robots.txt (T21, D53): 미리 보기는 검색 엔진이 색인하지 않게 막고, 정식은 연다.
import type { APIRoute } from 'astro';
import { STAGE } from '../lib/stage.ts';

export const GET: APIRoute = () => {
  const body = STAGE === 'release' ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
