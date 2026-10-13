// 어려운 말 풀이 2판의 자료 묶기·점선 밑줄 나누기·늦게 불러오는 묶음·사전 색인 (brief 8절, glossary.md 5.7·5.12·5.13, D69)
import { describe, expect, it } from 'vitest';
import { loadValidationInput } from '../../scripts/lib/load-data.ts';
import { makeCatalog, matchErrors } from '../../src/lib/engine/index.ts';
import type { GlossaryEntry } from '../../src/lib/glossary.ts';
import { buildIndex, normalizeTerm } from '../../src/lib/glossary.ts';
import { buildSearchIndex, loadSearchIndex, termKeys } from '../../src/lib/search-index.ts';
import { errorQueries, packTerms, siteEntries, toolEntries, toolEntryId, unpackTerms } from '../../src/lib/term-data.ts';
import { makeTermEngine } from '../../src/lib/term-engine.ts';
import { MARKS_REFERENCE, MARKS_STAGE, markBudget, segmentTerms } from '../../src/lib/term-marks.ts';

const { data, glossary } = loadValidationInput(false);
const catalog = makeCatalog(data);
const manual = glossary.terms;
const products = data.products.products;
const all = siteEntries(manual, products);
const own = all.filter((e) => e.kind !== 'tool');
const tools = all.filter((e) => e.kind === 'tool');
const queries = errorQueries(own, data.errors.errors, (t) => matchErrors(catalog, t)[0]?.id);
const engine = makeTermEngine(packTerms(own, queries), packTerms(tools));
const index = buildIndex({ terms: all });

/** 밑줄 말만 뽑기 */
const marked = (segs: ReturnType<typeof segmentTerms>): string[] => segs.flatMap((s) => (typeof s === 'string' ? [] : [s.id]));

describe('도구 이름 항목 (빌드 때 products.json에서)', () => {
  it('상품마다 이름을 열쇠로 하고, 풀이 칸은 summary, 진열 도구만 도구 카드로 잇는다', () => {
    const t = toolEntries([
      { id: 'a', name: '구글 설문지 (Google Forms)', summary: '설문을 받는 도구', layer: 'shelf' },
      { id: 'b', name: 'DeepL API (번역)', summary: '번역해 주는 API', layer: 'index' },
    ]);
    expect(t[0]).toEqual({ id: toolEntryId('a'), term: '구글 설문지 (Google Forms)', aliases: ['구글 설문지', 'Google Forms'], plain: '설문을 받는 도구', kind: 'tool', tool: 'a' });
    // 괄호 안 한글('번역')은 설명이라 열쇠가 아니다. 색인 도구는 카드가 없다
    expect(t[1]).toEqual({ id: toolEntryId('b'), term: 'DeepL API (번역)', aliases: ['DeepL API'], plain: '번역해 주는 API', kind: 'tool' });
  });

  it('손으로 쓴 용어와 열쇠가 겹치면 손으로 쓴 쪽이 이기고, 열쇠가 안 남는 도구 항목은 뺀다', () => {
    const t = toolEntries([{ id: 'x', name: 'Supabase', summary: '', layer: 'shelf' }], new Set([normalizeTerm('Supabase')]));
    expect(t).toEqual([]);
    expect(tools.length).toBeGreaterThan(40);
    expect(tools.length).toBeLessThanOrEqual(products.length);
    for (const e of tools) {
      for (const n of [e.term, ...(e.aliases ?? [])]) expect(index.byKey.get(normalizeTerm(n))?.id, n).toBe(e.id);
    }
  });

  it('손으로 쓴 용어가 색인 도구(페이지 없음)를 가리키면 도구 카드 고리를 뗀다', () => {
    const shelf = new Set(products.filter((p) => p.layer === 'shelf').map((p) => p.id));
    for (const e of all) if (e.tool !== undefined) expect(shelf.has(e.tool), e.id).toBe(true);
  });
});

describe('브라우저에 보내는 모양 (/glossary.json)', () => {
  it('줄이고 풀면 같은 항목이 나온다', () => {
    expect(unpackTerms(packTerms(own))).toEqual(own.map((e) => {
      const { risk: _risk, ...rest } = e;
      return rest;
    }));
    expect(unpackTerms(packTerms(tools))).toEqual(tools);
  });

  it('글 안의 줄바꿈은 풀 때 깨지므로 멈춘다', () => {
    const bad: GlossaryEntry = { id: 'x', term: 'X', plain: '두 줄\n풀이예요.', kind: 'code' };
    expect(() => packTerms([bad])).toThrow();
  });

  it('모양이 틀리면 빈 목록', () => {
    expect(unpackTerms({ v: 2 } as unknown as Parameters<typeof unpackTerms>[0])).toEqual([]);
  });

  it("'에러 안내 보기'의 글은 사전에서 그 에러 카드를 맨 위로 올린다", () => {
    const wanted = new Set(own.map((e) => e.error).filter((x) => x !== undefined));
    expect(Object.keys(queries).sort()).toEqual([...wanted].sort());
    for (const [id, q] of Object.entries(queries)) expect(matchErrors(catalog, q)[0]?.id, `${id}: ${q}`).toBe(id);
  });
});

describe('늦게 불러오는 묶음 (term-engine)', () => {
  it("두 번 눌러 고른 '키를' → API 키 (P2)", () => {
    const text = '공공 API 키를 환경 변수에 넣어요.';
    const s = text.indexOf('키를');
    expect(engine.lookup('키를', { text, start: s, end: s + 2 })?.entry.id).toBe('api-key');
  });

  it('도구 이름도 찾고, 손으로 쓴 용어가 이긴다', () => {
    expect(engine.lookup('Google Forms')?.entry.id).toBe(toolEntryId('google-forms'));
    expect(engine.lookup('공공데이터포털')?.entry.id).toBe('data-portal');
  });

  it('모르는 말: 한글만이면 아무것도, 영문·숫자면 사전, 에러 문장이면 에러 안내', () => {
    for (const t of ['점심 메뉴', '어디로 모실까요?']) {
      expect(engine.lookup(t)).toBeNull();
      expect(engine.miss(t)).toBeNull();
    }
    expect(engine.miss('xyz123')).toBe('search');
    expect(engine.miss('TypeError: Failed to fetch')).toBe('error');
  });

  it('풀이 속 상위 용어(see)의 자리를 찾는다 (겹 풀이 밑줄)', () => {
    const withSee = own.filter((e) => e.see !== undefined);
    expect(withSee.length).toBeGreaterThan(20);
    for (const e of withSee) {
      const at = engine.seeIn(e);
      expect(at?.entry.id, e.id).toBe(e.see);
      if (at) expect(e.plain.slice(at.start, at.end).length).toBeGreaterThan(0);
    }
  });
});

describe('점선 밑줄 나누기 (segmentTerms)', () => {
  const text = '공공 API 키를 환경 변수에 넣고, 배포한 뒤 터미널에서 확인해요.';

  it('나눈 조각을 이으면 원문이고, 조사 꼬리는 밑줄 밖이다', () => {
    const segs = segmentTerms(text, index, markBudget(MARKS_REFERENCE), new Set(), 9);
    expect(segs.map((s) => (typeof s === 'string' ? s : s.text)).join('')).toBe(text);
    expect(segs).toContainEqual({ id: 'api-key', text: 'API 키' });
    expect(segs).toContainEqual({ id: 'env-var', text: '환경 변수' });
  });

  it('한 문단에 2개까지', () => {
    expect(marked(segmentTerms(text, index, markBudget(MARKS_REFERENCE)))).toEqual(['api-key', 'env-var']);
  });

  it('한 화면에서 용어마다 처음 한 번, 화면 한계까지', () => {
    const b = markBudget(MARKS_STAGE);
    expect(marked(segmentTerms('API 키를 넣어요.', index, b))).toEqual(['api-key']);
    expect(marked(segmentTerms('API 키를 또 넣어요.', index, b))).toEqual([]);
    const c = markBudget(1);
    expect(marked(segmentTerms(text, index, c))).toEqual(['api-key']);
    expect(marked(segmentTerms('환경 변수', index, c))).toEqual([]);
  });

  it('이미 연 용어와 noMark 용어는 긋지 않는다', () => {
    expect(marked(segmentTerms(text, index, markBudget(8), new Set(['api-key'])))).toEqual(['env-var', 'deploy']);
    const noMark = own.find((e) => e.noMark === true);
    if (!noMark) throw new Error('noMark 용어가 없다');
    expect(marked(segmentTerms(`${noMark.term}이 와요.`, index, markBudget(8)))).toEqual([]);
  });

  it('거짓 양성 없음 (포트폴리오·블로그·캐시백·점심 메뉴)', () => {
    expect(marked(segmentTerms('포트폴리오 블로그 캐시백 빌드업 점심 메뉴', index, markBudget(8), new Set(), 9))).toEqual([]);
  });
});

describe('사전 색인에 어려운 말 풀이 (P8)', () => {
  const ms = loadSearchIndex(JSON.stringify(buildSearchIndex(data, glossary)));
  const top3 = (q: string): string[] => ms.search(q).slice(0, 3).map((r) => String(r.id));

  it("1판에서 0건이던 말이 이제 찾힌다", () => {
    expect(top3('프레임워크')).toContain('term:framework');
    expect(top3('캐시')).toContain('term:cache');
    expect(top3('반응형')).toContain('term:responsive');
    expect(top3('노코드')).toContain('term:no-code');
    expect(top3('라이선스')).toContain('term:license');
    expect(top3('마크다운')).toContain('term:markdown');
    expect(ms.search('SDK').length).toBeGreaterThan(0);
  });

  it('용어 카드가 있는 말은 카드 문서에 이름을 더해 한 줄로 (붙여 쓴 꼴도)', () => {
    expect(top3('환경변수')[0]).toBe('concept:env-var');
    expect(ms.search('api key')[0]?.id).toBe('concept:api-key');
    expect(top3('API 키').filter((id) => id.endsWith('api-key'))).toEqual(['concept:api-key']);
  });

  it('붙여 쓴 꼴', () => {
    expect(termKeys(['API 키', 'api key', 'JSON'])).toBe('API 키 API키 api key apikey JSON');
  });
});
