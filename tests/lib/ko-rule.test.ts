// 자료로 만드는 한국어 한 줄 (D143, scripts/lib/ko-rule.ts): 정해진 자료 칸만으로 '무엇인지'를 다체로 쓴다. AI를 부르지 않는다.
import { describe, expect, it } from 'vitest';
import { rawItems } from '../../scripts/catalog/load.ts';
import { KO_MAX } from '../../scripts/lib/ko-template.ts';
import { isKoreanText, koLineFor, ro, ruleKo } from '../../scripts/lib/ko-rule.ts';
import { findBanned } from '../../scripts/lib/words.ts';
import type { CatalogItem } from '../../src/lib/catalog/types.ts';

const base = (over: Partial<CatalogItem> = {}): CatalogItem => ({
  id: 'src:a',
  name: 'A',
  kind: 'apps',
  category: 'opensource',
  summary: 'An example.',
  url: 'https://example.com',
  source: { name: 'Src', url: 'https://example.com' },
  tags: [],
  preview: { type: 'repo' },
  fetchedAt: '2026-10-23',
  ...over,
});

describe('ruleKo 예시', () => {
  it('MCP 서버: 연결 방식과 열쇠', () => {
    expect(ruleKo(base({ kind: 'mcp', category: 'ai', tags: ['remote', 'streamable-http'], preview: { type: 'mcp', remotes: [{ type: 'streamable-http', url: 'u' }] } })))
      .toBe('MCP 서버다. 설치 없이 원격 주소로 붙여 쓴다.');
    expect(ruleKo(base({ kind: 'mcp', category: 'ai', tags: ['databases'], preview: { type: 'mcp', packages: [{ registry: 'npm', name: 'x' }], requiresKey: true } })))
      .toBe('데이터베이스 분야의 MCP 서버다. npx로 내 컴퓨터에서 돌린다. API 키가 필요하다.');
  });
  it('모델·데이터셋·API·템플릿', () => {
    expect(ruleKo(base({ kind: 'models', preview: { type: 'model', task: 'text-generation', library: 'transformers' } })))
      .toBe('텍스트 생성 AI 모델이다. transformers 라이브러리로 불러 쓴다.');
    expect(ruleKo(base({ id: 'kaggle:x', kind: 'kaggle', category: 'datasets', tags: ['health'], preview: { type: 'dataset', host: 'kaggle', size: '1.6 MB' } })))
      .toBe('건강 분야의 Kaggle 데이터셋이다. 파일 크기는 1.6 MB다.');
    expect(ruleKo(base({ kind: 'weather', category: 'api', preview: { type: 'api', auth: 'none', cors: 'yes' } })))
      .toBe('날씨 분야의 API다. API 키 없이 바로 부른다. CORS를 지원해 브라우저에서 바로 부른다.');
    expect(ruleKo(base({ kind: 'blog-portfolio', category: 'templates', tags: ['astro', 'tailwind'], preview: { type: 'template', demo: 'https://d' } })))
      .toBe('Astro·Tailwind CSS 기반 블로그·포트폴리오 템플릿이다. 데모 사이트에서 미리 본다.');
    expect(ruleKo(base({ preview: { type: 'repo', language: 'Python', archived: true } })))
      .toBe('오픈소스 앱이다. 보관된 저장소라 더 이상 고치지 않는다. 주로 Python으로 작성됐다.');
  });
  it('사전에 없는 꼬리표는 옮기지 않고, Object 원형 이름도 꺼내지 않는다', () => {
    expect(ruleKo(base({ tags: ['constructor', 'toString', 'hacktoberfest'] }))).toBe('오픈소스 앱이다.');
  });
  it('원문이 이미 한국어이거나 출처 한국어가 있으면 만들지 않는다', () => {
    expect(ruleKo(base({ summary: '관광 실태 정보를 조회하는 서비스다.' }))).toBeUndefined();
    expect(ruleKo(base({ summaryKo: '출처가 준 한 줄' }))).toBeUndefined();
    expect(isKoreanText('API로 세계 날씨를 본다')).toBe(true);
    expect(isKoreanText('Hello world 世界')).toBe(false);
  });
  it('조사: 영어 이름은 읽는 소리로', () => {
    expect(ro('Python')).toBe('Python으로');
    expect(ro('TypeScript')).toBe('TypeScript로');
    expect(ro('npm')).toBe('npm으로');
    expect(ro('Docker')).toBe('Docker로');
  });
  it('모양이 정해진 상품은 자세한 자료 문장(codeshopper), 그 밖은 rule', () => {
    expect(koLineFor(base({ kind: 'gradients', category: 'design', preview: { type: 'palette', colors: ['#000000', '#ffffff'], angle: 90 } }))?.by).toBe('codeshopper');
    expect(koLineFor(base())?.by).toBe('rule');
  });
});

describe('실제 진열대 전체', () => {
  const items = rawItems().map((r) => r.item);
  it('모든 상품이 한국어로 먼저 읽힌다 (출처·원문 한국어 또는 자료 한 줄)', () => {
    const missing = items.filter((it) => !it.summaryKo?.trim() && !isKoreanText(it.summary) && !koLineFor(it));
    expect(missing.map((it) => it.id).slice(0, 5)).toEqual([]);
  });
  it('자료 한 줄은 다체로 끝나고, 100자 안이며, 쓰지 않는 말·빈 값·매일 흔들리는 수가 없다', () => {
    const bad: string[] = [];
    for (const it of items) {
      const line = ruleKo(it);
      if (!line) continue;
      const volatile = [it.metrics?.stars, it.metrics?.downloads, it.metrics?.likes].filter((n): n is number => typeof n === 'number' && n >= 1000);
      const problems = [
        !/다\.$/.test(line) && '끝맺음',
        [...line].length > KO_MAX && '길이',
        /undefined|null|NaN|\[object/.test(line) && '빈 값',
        findBanned(line, false).length > 0 && '쓰지 않는 말',
        volatile.some((n) => line.includes(String(n))) && '흔들리는 수',
      ].filter(Boolean);
      if (problems.length) bad.push(`${problems.join(',')} ${it.id}: ${line}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
