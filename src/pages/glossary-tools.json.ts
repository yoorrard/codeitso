// 빌드 때 products.json에서 만드는 도구 이름 풀이 /glossary-tools.json (brief 8절 '도구 이름 49개', D69).
// /glossary.json과 같은 때 나란히 받는다. 풀이 칸은 상품의 summary다.
import { siteToolPack } from '../lib/term-site.ts';

export function GET(): Response {
  return new Response(JSON.stringify(siteToolPack()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
