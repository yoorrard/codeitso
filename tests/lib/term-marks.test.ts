// 어려운 말 풀이의 자료 묶기·점선 밑줄 나누기·늦게 불러오는 묶음 (D69). v5: 손으로 쓴 용어만 (도구 이름·에러 안내는 뺐다)
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATA_DIR, readJson } from '../../scripts/lib/load-data.ts';
import type { Glossary } from '../../src/lib/glossary.ts';
import { buildIndex } from '../../src/lib/glossary.ts';
import { packTerms, unpackTerms } from '../../src/lib/term-data.ts';
import { makeTermEngine } from '../../src/lib/term-engine.ts';
import { MARKS_REFERENCE, MARKS_STAGE, markBudget, segmentTerms } from '../../src/lib/term-marks.ts';

const own = readJson<Glossary>(join(DATA_DIR, 'glossary.json')).terms;
const engine = makeTermEngine(packTerms(own));
const index = buildIndex({ terms: own });

/** 밑줄 말만 뽑기 */
const marked = (segs: ReturnType<typeof segmentTerms>): string[] => segs.flatMap((s) => (typeof s === 'string' ? [] : [s.id]));

describe('브라우저에 보내는 모양 (/glossary.json)', () => {
  it('줄이고 풀면 같은 항목이 나온다 (risk는 화면에 필요 없어 빠진다)', () => {
    expect(unpackTerms(packTerms(own))).toEqual(
      own.map((e) => {
        const { risk: _risk, ...rest } = e;
        return rest;
      }),
    );
  });

  it('글 안의 줄바꿈은 풀 때 깨지므로 멈춘다', () => {
    expect(() => packTerms([{ id: 'x', term: 'X', plain: '첫 줄\n둘째 줄이다.', kind: 'code' }])).toThrow();
  });

  it('모양이 틀리면 빈 목록', () => {
    expect(unpackTerms({ v: 2, c: [], e: {} } as unknown as Parameters<typeof unpackTerms>[0])).toEqual([]);
  });
});

describe('늦게 불러오는 묶음 (term-engine)', () => {
  it("두 번 눌러 고른 '키를' → API 키", () => {
    const text = '공공 API 키를 환경 변수에 넣는다.';
    const s = text.indexOf('키를');
    expect(engine.lookup('키를', { text, start: s, end: s + 2 })?.entry.id).toBe('api-key');
  });

  it('모르는 말: 한글만이면 아무것도, 영문·숫자면 찾기', () => {
    for (const t of ['점심 메뉴', '오늘 날씨']) {
      expect(engine.lookup(t)).toBeNull();
      expect(engine.miss(t)).toBeNull();
    }
    expect(engine.miss('xyz123')).toBe('search');
  });

  it('풀이 속 상위 용어(see)의 자리를 찾는다 (겹 풀이 밑줄)', () => {
    const withSee = own.filter((e) => e.see !== undefined);
    expect(withSee.length).toBeGreaterThan(20);
    for (const e of withSee) {
      const at = engine.seeIn(e);
      expect(at?.entry.id, e.id).toBe(e.see);
    }
  });
});

describe('점선 밑줄 나누기 (segmentTerms)', () => {
  const text = '공공 API 키를 환경 변수에 넣고, 배포한 뒤 터미널에서 확인한다.';

  it('나눈 조각을 이으면 원문이고, 조사 꼬리는 밑줄 밖이다', () => {
    const segs = segmentTerms(text, index, markBudget(MARKS_REFERENCE), new Set(), 9);
    expect(segs.map((s) => (typeof s === 'string' ? s : s.text)).join('')).toBe(text);
    expect(segs).toContainEqual({ id: 'api-key', text: 'API 키' });
    expect(segs).toContainEqual({ id: 'env-var', text: '환경 변수' });
  });

  it('한 문단에 2개까지, 한 화면에서 용어마다 처음 한 번', () => {
    expect(marked(segmentTerms(text, index, markBudget(MARKS_REFERENCE)))).toEqual(['api-key', 'env-var']);
    const b = markBudget(MARKS_STAGE);
    expect(marked(segmentTerms('API 키를 넣는다.', index, b))).toEqual(['api-key']);
    expect(marked(segmentTerms('API 키를 또 넣는다.', index, b))).toEqual([]);
  });

  it('거짓 양성 없음 (포트폴리오·블로그·캐시백·점심 메뉴)', () => {
    expect(marked(segmentTerms('포트폴리오 블로그 캐시백 빌드업 점심 메뉴', index, markBudget(8), new Set(), 9))).toEqual([]);
  });
});
