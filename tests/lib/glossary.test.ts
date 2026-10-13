// 어려운 말 풀이 (D60): 고른 글에서 용어 찾기와 자료(data/glossary.json)의 약속
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import type { Glossary } from '../../src/lib/glossary.ts';
import { SELECTION_MAX, buildIndex, candidates, lookupTerm, normalizeTerm } from '../../src/lib/glossary.ts';
import { DATA_DIR, readJson } from '../../scripts/lib/load-data.ts';

const glossary = readJson<Glossary>(join(DATA_DIR, 'glossary.json'));
const concepts = readJson<{ concepts: { id: string }[] }>(join(DATA_DIR, 'concepts.json')).concepts.map((c) => c.id);
const index = buildIndex(glossary);
const idOf = (text: string): string | undefined => lookupTerm(index, text)?.entry.id;

describe('견주기 모양', () => {
  it('공백·대소문자·문장 부호를 빼고 견준다', () => {
    expect(normalizeTerm(' API  키 ')).toBe('api키');
    expect(normalizeTerm('“CORS”')).toBe('cors');
    expect(normalizeTerm('React + Vite')).toBe('react+vite');
  });

  it('끝의 조사를 하나씩 떼어 본다', () => {
    expect(candidates('서버에서는')).toEqual(['서버에서는', '서버']);
    expect(candidates('저장소에서도')).toEqual(['저장소에서도', '저장소에서', '저장소']);
    expect(candidates('API 키를')).toEqual(['api키를', 'api키']);
    expect(candidates('배포')).toEqual(['배포']);
  });
});

describe('고른 글에서 용어 찾기', () => {
  it('용어 그대로, 띄어쓰기·조사가 달라도', () => {
    expect(idOf('API 키')).toBe('api-key');
    expect(idOf('API키를')).toBe('api-key');
    expect(idOf('api key')).toBe('api-key');
    expect(idOf('환경변수에')).toBe('env-var');
    expect(idOf('배포는')).toBe('deploy');
    expect(idOf('깃허브에서')).toBe('github');
  });

  it('다른 이름으로도', () => {
    expect(idOf('프런트엔드')).toBe('frontend');
    expect(idOf('localhost')).toBe('localhost');
    expect(idOf('프록시')).toBe('proxy');
  });

  it('긴 글 안에 든 용어는 가장 긴 것, 같으면 앞의 것 (전체가 용어가 아니면 exact가 아니다)', () => {
    const hit = lookupTerm(index, '키를 숨겨 주는 중간 서버가 필요해요');
    expect(hit?.entry.id).toBe('proxy');
    expect(hit?.exact).toBe(false);
    expect(idOf('배포·공유')).toBe('deploy');
  });

  it(`빈 글, 모르는 말, ${SELECTION_MAX}자를 넘는 글은 찾지 않는다`, () => {
    expect(lookupTerm(index, '   ')).toBeNull();
    expect(lookupTerm(index, '점심 메뉴')).toBeNull();
    expect(lookupTerm(index, 'API '.repeat(20))).toBeNull();
  });
});

describe('자료 약속 (data/glossary.json)', () => {
  it('id는 겹치지 않고, 이름·다른 이름의 견주기 모양도 용어끼리 겹치지 않는다', () => {
    const ids = glossary.terms.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const owner = new Map<string, string>();
    for (const t of glossary.terms) {
      for (const name of [t.term, ...(t.aliases ?? [])]) {
        const k = normalizeTerm(name);
        const before = owner.get(k);
        expect(before === undefined || before === t.id, `'${name}'이 ${before}와 ${t.id}에 함께 있다`).toBe(true);
        owner.set(k, t.id);
      }
    }
  });

  it('풀이는 한 문장 해요체, 70자 안쪽. 용어 카드 연결은 있는 카드만', () => {
    for (const t of glossary.terms) {
      expect(t.plain.length, t.id).toBeLessThanOrEqual(70);
      expect(t.plain.endsWith('요.'), `${t.id}: ${t.plain}`).toBe(true);
      if (t.concept) expect(concepts, t.id).toContain(t.concept);
    }
  });

  it('다른 이름은 두 글자 이상 (한 글자는 긴 글 안에서 엉뚱하게 걸린다)', () => {
    for (const t of glossary.terms) for (const a of t.aliases ?? []) expect(normalizeTerm(a).length, `${t.id}: ${a}`).toBeGreaterThanOrEqual(2);
  });
});
