// 빌드 때 만드는 어려운 말 풀이 자료 /glossary.json (brief 8절, D69): 손으로 쓴 용어 212개 + 에러 안내 글.
// 처음 고르기·처음 밑줄 누름·섬 화면의 쉬는 시간 중 먼저 오는 때에 한 번만 받는다 (src/lib/term-load.ts).
import { sitePack } from '../lib/term-site.ts';

export function GET(): Response {
  return new Response(JSON.stringify(sitePack()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
