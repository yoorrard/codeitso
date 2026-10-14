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
