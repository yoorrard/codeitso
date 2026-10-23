// 빌드 때 만드는 어려운 말 풀이 자료 /glossary.json (D69): 손으로 쓴 용어(data/glossary.json)를 작은 모양으로 묶는다.
// 처음 고르기 때 한 번만 받는다 (src/lib/term-load.ts).
import glossary from '../../data/glossary.json';
import type { GlossaryEntry } from '../lib/glossary.ts';
import { packTerms } from '../lib/term-data.ts';

export function GET(): Response {
  // 자료 파일을 import하면 kind가 string으로 읽힌다. 모양은 schemas/glossary.schema.json과 시험이 지킨다
  const pack = packTerms(glossary.terms as unknown as GlossaryEntry[]);
  return new Response(JSON.stringify(pack), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
