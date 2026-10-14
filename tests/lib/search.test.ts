import { describe, expect, it } from 'vitest';
import { tokenize } from '../../src/lib/search-tokenize.ts';

describe('검색 낱말 나누기 (ARCHITECTURE 7절)', () => {
  it('영문과 한글을 따로 자르고 영문은 소문자로', () => {
    expect(tokenize('API키는')).toEqual(expect.arrayContaining(['api', '키는', '키']));
  });

  it('조사를 뗀 꼴도 넣는다', () => {
    expect(tokenize('환경변수를')).toEqual(expect.arrayContaining(['환경변수를', '환경변수']));
    expect(tokenize('서버에서')).toEqual(expect.arrayContaining(['서버']));
  });

  it('두 글자 이상이면 두 글자 조각도', () => {
    expect(tokenize('환경변수')).toEqual(expect.arrayContaining(['환경변수', '환경', '경변', '변수']));
  });

  it('한 글자 낱말도 버리지 않는다', () => {
    expect(tokenize('키')).toEqual(['키']);
  });

  it('기호·띄어쓰기는 나누는 자리로만', () => {
    expect(tokenize('zsh: command not found: npm')).toEqual(['zsh', 'command', 'not', 'found', 'npm']);
  });

  it('같은 낱말은 한 번만', () => {
    const t = tokenize('API api API');
    expect(t).toEqual(['api']);
  });
});

import { makeCatalog, matchErrors } from '../../src/lib/engine/index.ts';
import { buildSearchIndex, loadSearchIndex } from '../../src/lib/search-index.ts';
import { loadData } from '../../scripts/lib/load-data.ts';

describe('사전 검색 (T15 완성 확인)', () => {
  const data = loadData();
  const ms = loadSearchIndex(JSON.stringify(buildSearchIndex(data)));
  const top = (q: string): string => {
    const r = ms.search(q)[0];
    return r ? `${String(r['type'])}:${String(r['ref'])}` : '';
  };

  it('"환경변수"는 환경 변수 개념이 맨 위', () => {
    expect(top('환경변수')).toBe('concept:env-var');
  });

  it('"API키는"은 API 키 개념이 API 개념보다 위', () => {
    expect(top('API키는')).toBe('concept:api-key');
  });

  it('"CORS 에러가 났어요"는 에러 안내(정규식)와 검색 모두 CORS가 맨 위', () => {
    expect(matchErrors(makeCatalog(data), 'CORS 에러가 났어요')[0]?.id).toBe('cors');
    expect(top('CORS 에러가 났어요')).toBe('concept:cors');
  });

  it('"zsh: command not found: npm"은 에러 안내가 맨 위', () => {
    expect(matchErrors(makeCatalog(data), 'zsh: command not found: npm')[0]?.id).toBe('command-not-found');
  });
});

import type { SearchDoc } from '../../src/lib/search-index.ts';
import { applySynonyms } from '../../src/lib/search-index.ts';
import { loadValidationInput } from '../../scripts/lib/load-data.ts';

describe('검색 동의어 (data/aliases.json searchSynonyms, v3 설계서 3.5절)', () => {
  const { data, glossary, aliases } = loadValidationInput(false);
  const synonyms = aliases.searchSynonyms;
  const withSyn = loadSearchIndex(JSON.stringify(buildSearchIndex(data, glossary, synonyms)));
  const without = loadSearchIndex(JSON.stringify(buildSearchIndex(data, glossary)));
  const ids = (ms: typeof withSyn, q: string): string[] => ms.search(q).map((r) => String(r.id));

  // 화면 문구에서 쓰지 않는 말(D83)이라도 이용자가 치면 결과가 나와야 한다. 새 화면(디자인 정하기·만들기 안내)이 없는 지금은 기존 결과로
  it.each([
    ['테마', 'term:css'],
    ['다크모드', 'term:css'],
    ['다크 모드', 'term:css'],
    ['폰트', 'term:css'],
    ['가이드', 'term:official-docs'],
    ['튜토리얼', 'term:official-docs'],
    ['화면 올리기', 'concept:deploy'],
  ])('"%s"는 결과를 내고 동의어가 가리키는 %s가 맨 위', (q, top) => {
    const got = ids(withSyn, q);
    expect(got.length).toBeGreaterThan(0);
    expect(got[0]).toBe(top);
  });

  it('동의어가 없으면 "테마"·"폰트"는 아무것도 찾지 못한다 (결과는 동의어 덕분)', () => {
    expect(ids(without, '테마')).toEqual([]);
    expect(ids(without, '폰트')).toEqual([]);
  });

  it('동의어는 기존 검색 순위를 바꾸지 않는다', () => {
    for (const q of ['환경변수', 'API키는', 'CORS 에러가 났어요', '배포']) expect(ids(withSyn, q)[0]).toBe(ids(without, q)[0]);
  });

  it('대상 이름은 띄어쓰기·대소문자를 빼고 견주고, 없는 이름이면 아무 문서에도 붙지 않는다', () => {
    const docs: SearchDoc[] = [
      { id: 'term:css', type: 'term', ref: 'css', title: 'CSS', body: '' },
      { id: 'term:x', type: 'term', ref: 'x', title: '공식 문서', keys: '공식 문서', body: '' },
    ];
    const names = new Map([
      ['term:css', ['CSS']],
      ['term:x', ['공식 문서']],
    ]);
    const hit = applySynonyms(docs, names, [
      { id: 'a', aliases: ['테마'], to: ['css'] },
      { id: 'b', aliases: ['가이드 북'], to: ['공식문서'] },
      { id: 'c', aliases: ['커스텀'], to: ['직접 쓰기'] },
    ]);
    expect(Object.fromEntries(hit)).toEqual({ a: 1, b: 1, c: 0 });
    expect(docs[0]?.keys).toBe('테마');
    expect(docs[1]?.keys).toBe('공식 문서 가이드 북 가이드북');
  });
});
