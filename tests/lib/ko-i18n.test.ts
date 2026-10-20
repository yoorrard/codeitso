// 한국어 설명 만들기 (v5.1 P4, D128): 자료로 만드는 한 줄(ko-template)과 매일 번역 도우미(ko-translate).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readKo } from '../../scripts/catalog/load.ts';
import { KO_MAX, commas, hasBatchim, templateKo } from '../../scripts/lib/ko-template.ts';
import { AUTO_FILE_MAX, autoFileName, batchLines, cleanKo, parseNumbered, parseReply, pickCandidates, preferIds, userPrompt } from '../../scripts/lib/ko-translate.ts';
import type { Ranked } from '../../src/lib/catalog/core.ts';
import type { CatalogItem } from '../../src/lib/catalog/types.ts';

const base = (over: Partial<CatalogItem>): CatalogItem => ({
  id: 'x:y',
  name: 'Y',
  kind: 'fonts',
  category: 'design',
  summary: '',
  url: 'https://example.com',
  source: { name: 'Google Fonts', url: 'https://fonts.google.com' },
  tags: [],
  preview: { type: 'font' },
  fetchedAt: '2026-10-20',
  ...over,
});

describe('자료로 만드는 한국어 한 줄', () => {
  it('글꼴: 갈래·굵기·기울임꼴·문자·디자이너를 자료에서만 쓴다', () => {
    const ko = templateKo(base({
      tags: ['latin', 'cyrillic', 'sans-serif', 'variable'],
      preview: { type: 'font', generic: 'sans-serif', weights: [100, 400, 900], italic: true, subsets: ['latin', 'latin-ext', 'cyrillic'], designers: ['Christian Robertson'] },
    }));
    expect(ko).toBe('가변 산세리프 글꼴로, 굵기 100·400·900과 기울임꼴을 지원한다. 지원 문자는 라틴·키릴이다. Christian Robertson의 디자인이다.');
  });

  it('한글 글꼴은 고딕·명조로 부르고 한글을 먼저 적는다', () => {
    const ko = templateKo(base({ kind: 'fonts-ko', tags: ['korean', 'latin', 'serif'], preview: { type: 'font', generic: 'serif', weights: [400], subsets: ['latin', 'korean'] } }));
    expect(ko).toBe('한글 명조 글꼴로, 굵기는 400 한 가지다. 지원 문자는 한글·라틴이다.');
  });

  it('그라디언트·차트 색·패턴·아이콘·로고·3D·게임 에셋', () => {
    expect(templateKo(base({ kind: 'gradients', preview: { type: 'palette', mode: 'gradient', angle: 90, colors: ['#000000', '#ffffff'], css: 'background: x' } })))
      .toBe('두 색(#000000 → #ffffff)이 왼쪽에서 오른쪽으로 이어지는 선형 그라디언트다. CSS 한 줄로 배경에 바로 쓴다.');
    expect(templateKo(base({ kind: 'chart-palettes', tags: ['colorblind-friendly'], preview: { type: 'palette', mode: 'chart', scheme: 'sequential', classes: [3, 9] } })))
      .toBe('값이 커질수록 짙어지는 차트용 연속 색 단계다. 3~9단계로 고를 수 있다. 색각 이상이 있어도 구분하기 쉽게 고른 색이다.');
    expect(templateKo(base({ kind: 'patterns', name: 'Wavy Circles', summary: 'x: seamless SVG pattern (stroke, up to 3 colors).', preview: { type: 'asset', mode: 'stroke' } })))
      .toBe('물결·원 무늬가 끊김 없이 반복되는 SVG 배경 패턴이다. 선으로 그렸고 색은 최대 3가지를 쓴다.');
    expect(templateKo(base({ kind: 'icons', source: { name: 'Iconify', url: '' }, tags: ['ui-24px', 'uses-stroke'], preview: { type: 'icons', total: 1890, author: 'Lucide Contributors', palette: false } })))
      .toBe('Lucide Contributors의 단색 UI 아이콘 1,890개 묶음이다. 24px 격자에 맞춰 선(stroke)으로 그렸다. Iconify로 바로 불러 쓴다.');
    expect(templateKo(base({ kind: 'logos', name: 'Acme', tags: ['payment'], preview: { type: 'icons', images: { light: 'a', dark: 'b' } } })))
      .toBe('결제 Acme의 로고 SVG다. 밝은 화면용과 어두운 화면용이 따로 있다.');
    expect(templateKo(base({ kind: '3d', tags: ['hdri', 'outdoor', 'night'], preview: { type: 'asset', format: 'hdri', maxResolution: [16384, 8192] } })))
      .toBe('실외 밤 장면을 360도로 담은 HDRI 환경 맵으로, 3D 장면의 배경과 빛에 쓴다. 최대 16K 해상도다.');
    expect(templateKo(base({ kind: 'game-assets', source: { name: 'Kenney', url: '' }, tags: ['2d'], summary: 'P: Download this package (1078 assets) for free', preview: { type: 'asset', format: 'pack' } })))
      .toBe('Kenney의 2D 게임 에셋 묶음으로, 에셋 1,078개가 들어 있다.');
  });

  it('맡지 않는 소분류·자료가 모자란 상품은 비운다, 길이는 100자 안', () => {
    expect(templateKo(base({ kind: 'mcp', category: 'ai' }))).toBeUndefined();
    expect(templateKo(base({ kind: 'gradients', preview: { type: 'palette', colors: ['#000'] } }))).toBeUndefined();
    const long = templateKo(base({ preview: { type: 'font', generic: 'serif', weights: [400, 700], subsets: ['latin', 'greek', 'cyrillic', 'arabic', 'hebrew', 'thai'], designers: ['A Very Long Designer Name Indeed', 'Another Long Designer Name Here', 'Third'] } }));
    expect([...(long ?? '')].length).toBeLessThanOrEqual(KO_MAX);
    expect(long).toMatch(/다\.$/);
  });

  it('숫자 쉼표와 받침', () => {
    expect(commas(1234567)).toBe('1,234,567');
    expect(hasBatchim('라틴')).toBe(true);
    expect(hasBatchim('그리스')).toBe(false);
    expect(hasBatchim('900')).toBe(true);
  });
});

const ranked = (id: string, kind: string, pop: number, extra: Partial<CatalogItem> = {}): Ranked => ({
  item: base({ id, name: id, kind, category: 'ai', summary: 'A tool.', ...extra }),
  pop,
});

describe('매일 번역 도우미', () => {
  it('없는 것만, 자료 한 줄이 없는 것 먼저, 목록마다 인기 순위대로 고른다', () => {
    const all = [
      ranked('a1', 'mcp', 0.9), ranked('a2', 'mcp', 0.8), ranked('a3', 'mcp', 0.7),
      ranked('b1', 'skill', 0.9), ranked('b2', 'skill', 0.1),
      ranked('c1', 'skill', 0.5, { summaryKo: '출처 한국어' }),
    ];
    const got = pickCandidates(all, new Set(['a1']), new Set(['b1']), 10).map((c) => c.id);
    expect(got).toEqual(['a2', 'a3', 'b2', 'b1']);
    expect(pickCandidates(all, new Set(), new Set(), 2)).toHaveLength(2);
  });

  it('요청 글에 번호·이름·소분류·원문을 싣는다', () => {
    const [c] = pickCandidates([ranked('a', 'mcp', 1)], new Set(), new Set(), 1);
    expect(JSON.parse(userPrompt(c ? [c] : []).split('\n')[1] ?? '[]')).toEqual([{ i: 1, name: 'a', kind: 'ai/mcp', summary: 'A tool.' }]);
  });

  it('답에서 번호별 글을 꺼내고, 다체·한글·100자·주소 없음을 검사한다', () => {
    const r = parseReply('여기 있다\n```json\n{"1":"PDF를 읽는 MCP 서버다.","2":"bad","x":"y"}\n```');
    expect(r.get(1)).toBe('PDF를 읽는 MCP 서버다.');
    expect(r.size).toBe(2);
    expect(parseReply('nothing')).toEqual(new Map());
    expect(cleanKo(' "UI 컴포넌트 모음이다(shadcn/ui)." ')).toBe('UI 컴포넌트 모음이다(shadcn/ui).');
    expect(cleanKo('An English line.')).toBeUndefined();
    expect(cleanKo('PDF를 읽는 MCP 서버예요.')).toBeUndefined();
    expect(cleanKo('자세히는 https://x.io 를 본다.')).toBeUndefined();
    expect(cleanKo(`${'가'.repeat(101)}다.`)).toBeUndefined();
    expect(cleanKo(3)).toBeUndefined();
  });

  it('auto 파일은 차면 다음 번호로 넘어간다', () => {
    expect(autoFileName(new Map())).toBe('auto-1.json');
    expect(autoFileName(new Map([['auto-1.json', 10], ['agent.json', 99999]]))).toBe('auto-1.json');
    expect(autoFileName(new Map([['auto-1.json', AUTO_FILE_MAX], ['auto-2.json', AUTO_FILE_MAX]]))).toBe('auto-3.json');
  });

  it('한국어 파일이 겹치면 이름 순으로 먼저 읽은 것이 이기고, 빼라는 파일은 읽지 않는다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cc-ko-order-'));
    writeFileSync(join(dir, 'agent.json'), JSON.stringify({ a: '살핀 번역이다.' }));
    writeFileSync(join(dir, 'auto-1.json'), JSON.stringify({ a: '자동 번역이다.', b: '자동 번역이다.' }));
    writeFileSync(join(dir, 'template.json'), JSON.stringify({ b: '자료 한 줄이다.', c: '자료 한 줄이다.' }));
    expect(Object.fromEntries(readKo(dir))).toEqual({ a: '살핀 번역이다.', b: '자동 번역이다.', c: '자료 한 줄이다.' });
    expect([...readKo(dir, ['template.json']).keys()]).toEqual(['a', 'b']);
  });
});

describe('API 열쇠 없이 Claude 세션이 번역하는 묶음 (D140)', () => {
  const cand = (id: string, summary = 'A tool.') => ({ id, name: `${id}\tname`, kind: 'ai/mcp', summary, rank: 0, templated: false });
  it('키트 재료를 앞으로 당기고 한도까지 자른다', () => {
    expect(preferIds([cand('a'), cand('b'), cand('c')], new Set(['c']), 2).map((c) => c.id)).toEqual(['c', 'a']);
  });
  it('묶음 줄은 번호·종류·이름·원문을 탭으로, 줄바꿈·탭은 빈칸으로', () => {
    expect(batchLines([cand('x', 'line one\nline two')])).toEqual(['1\tai/mcp\tx name\tline one line two']);
  });
  it('번역 결과는 번호<탭>한국어 줄만 읽는다', () => {
    const m = parseNumbered('1\tPDF를 읽는 MCP 서버다.\nnoise\n\n12\t  표를 그리는 라이브러리다. \n');
    expect([...m.entries()]).toEqual([[1, 'PDF를 읽는 MCP 서버다.'], [12, '표를 그리는 라이브러리다.']]);
  });
});

