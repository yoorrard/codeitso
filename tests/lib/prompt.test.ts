// 프롬프트 뽑기 (prompt.ts, D121): 사본 만들기(주소·설치 한 줄·인증), 첫 줄, 만들 앱, 대분류 순서 재료 한 줄, 라이선스 한 줄,
// 파일 이름, 설치 명령 한꺼번에.
import { describe, expect, it } from 'vitest';
import { ko } from '../../src/copy/ko.ts';
import type { DetailRecord, NavCategory } from '../../src/lib/catalog/types.ts';
import { authOf, buildPrompt, groupByCategory, installBundle, installLine, namesOf, promptFileName, promptLineOf, promptText } from '../../src/lib/prompt.ts';
import type { CartLine } from '../../src/lib/saved.ts';

const nav: NavCategory[] = [
  { id: 'design', name: '디자인', total: 1, subs: [{ id: 'fonts-ko', name: '한글 폰트', count: 1 }] },
  { id: 'ai', name: 'AI 확장', total: 1, subs: [{ id: 'mcp', name: 'MCP 서버', count: 1 }] },
  { id: 'api', name: 'API', total: 1, subs: [{ id: 'kr-public', name: '한국 공공데이터', count: 1 }] },
];
const names = namesOf(nav);

function detail(id: string, cat: string, kind: string, extra: Partial<DetailRecord> = {}): DetailRecord {
  return { id, name: id, kind, category: cat, summary: '', url: `https://example.com/${kind}`, source: { name: '출처', url: 'https://example.com' }, tags: [], preview: { type: 'none' }, fetchedAt: '2026-10-14', rel: [], ...extra };
}

const at = new Date(2026, 9, 14, 15, 30).getTime();
const lines: CartLine[] = [
  { id: 'official:neis', name: '나이스 교육정보 개방 포털', cat: 'api', sub: 'kr-public', addedAt: 1, memo: '급식 메뉴\n불러오기' },
  { id: 'korean-fonts:pretendard', name: 'Pretendard (프리텐다드)', cat: 'design', sub: 'fonts-ko', addedAt: 2, memo: '제목 글꼴' },
  { id: 'mcp:ctx', name: 'context7', cat: 'ai', sub: 'mcp', addedAt: 3 },
  { id: 'gone:item', name: '빠진 재료', cat: 'design', sub: 'fonts-ko', addedAt: 4 },
];
const details = new Map<string, DetailRecord>([
  ['official:neis', detail('official:neis', 'api', 'kr-public', { url: 'https://open.neis.go.kr', preview: { type: 'api', auth: 'apiKey' } })],
  ['korean-fonts:pretendard', detail('korean-fonts:pretendard', 'design', 'fonts-ko', { license: 'OFL-1.1', use: { install: 'npm i pretendard', snippet: '@import "pretendard";' } })],
  ['mcp:ctx', detail('mcp:ctx', 'ai', 'mcp', { license: 'MIT', preview: { type: 'mcp', requiresKey: false } })],
]);

describe('프롬프트 사본', () => {
  it('주소·설치 한 줄·인증만 옮기고, 못 찾은 재료는 이름·자리만', () => {
    const p = buildPrompt(lines, details, '  우리 반 급식 앱 ', at, 'x1');
    expect(p.id).toBe(`${at.toString(36)}x1`);
    expect(p.at).toBe(at);
    expect(p.project).toBe('우리 반 급식 앱');
    expect(p.lines[0]).toEqual({ id: 'official:neis', name: '나이스 교육정보 개방 포털', cat: 'api', sub: 'kr-public', memo: '급식 메뉴\n불러오기', url: 'https://open.neis.go.kr', auth: 'key' });
    expect(p.lines[1]).toEqual({ id: 'korean-fonts:pretendard', name: 'Pretendard (프리텐다드)', cat: 'design', sub: 'fonts-ko', memo: '제목 글꼴', url: 'https://example.com/fonts-ko', install: 'npm i pretendard' });
    expect(p.lines[3]).toEqual({ id: 'gone:item', name: '빠진 재료', cat: 'design', sub: 'fonts-ko' });
    expect(buildPrompt(lines, details, ' ', at).project).toBeUndefined();
    expect(promptLineOf(lines[2] as CartLine, detail('x', 'ai', 'mcp', { url: 'javascript:alert(1)' })).url).toBeUndefined();
  });

  it('인증: API 키·OAuth·MCP 키 필요, 인증 없음은 없음', () => {
    expect(authOf({ preview: { type: 'api', auth: 'apiKey' } })).toBe('key');
    expect(authOf({ preview: { type: 'api', auth: 'OAuth' } })).toBe('oauth');
    expect(authOf({ preview: { type: 'api', auth: 'None' } })).toBeUndefined();
    expect(authOf({ preview: { type: 'mcp', requiresKey: true } })).toBe('key');
    expect(authOf({ preview: { type: 'font' } })).toBeUndefined();
  });

  it('설치 명령: 여러 줄은 &&로 잇고 주석 줄은 뺀다, 너무 길면 첫 줄만', () => {
    expect(installLine('# 설치\nnpm i a\n\nnpx a init')).toBe('npm i a && npx a init');
    expect(installLine(`npm i a\n${'x'.repeat(400)}`)).toBe('npm i a');
    expect(installLine('  ')).toBeUndefined();
  });
});

describe('프롬프트 글', () => {
  const text = promptText(buildPrompt(lines, details, '우리 반 급식 앱', at), names);
  const rows = text.split('\n');

  it('첫 줄은 용도대로 써 달라는 말, 다음 줄은 만들 앱', () => {
    expect(rows[0]).toBe(ko.prompt.text.lead);
    expect(rows[1]).toBe('만들 앱: 우리 반 급식 앱');
    expect(rows[2]).toBe('');
  });

  it('재료는 대분류 순서(디자인 → AI 확장 → API)로 한 줄씩: 소분류·이름·메모·주소·설치·인증', () => {
    expect(rows.slice(3, 7)).toEqual([
      '- [한글 폰트] Pretendard (프리텐다드) — 제목 글꼴 · https://example.com/fonts-ko · 설치: npm i pretendard',
      '- [한글 폰트] 빠진 재료',
      '- [MCP 서버] context7 · https://example.com/mcp',
      '- [한국 공공데이터] 나이스 교육정보 개방 포털 — 급식 메뉴 불러오기 · https://open.neis.go.kr · API 키 필요',
    ]);
  });

  it('끝은 라이선스 한 줄뿐이고 군더더기가 없다', () => {
    expect(rows.slice(7)).toEqual(['', ko.prompt.text.license, '']);
    expect(text).not.toMatch(/영수증|0원|##/);
  });

  it('만들 앱이 없으면 그 줄이 없다', () => {
    const t = promptText(buildPrompt(lines, details, '', at), names).split('\n');
    expect(t[1]).toBe('');
  });
});

describe('도우미', () => {
  it('파일 이름은 codeitso-prompt-<yyyymmdd-hhmm>.md', () => {
    expect(promptFileName(at)).toBe('codeitso-prompt-20261014-1530.md');
  });
  it('대분류 순서로 묶고 모르는 대분류는 끝에', () => {
    expect(groupByCategory([{ cat: 'zzz' }, { cat: 'api' }, { cat: 'design' }]).map((g) => g.cat)).toEqual(['design', 'api', 'zzz']);
  });
  it('이름표: 모르면 id 그대로', () => {
    expect(names.cat('api')).toBe('API');
    expect(names.sub('ai', 'mcp')).toBe('MCP 서버');
    expect(names.sub('ai', 'nope')).toBe('nope');
  });
  it('설치 명령 한꺼번에: 있는 것만, 이름 한 줄씩', () => {
    expect(installBundle([{ name: 'A', install: 'npm i a' }, { name: 'B' }, { name: 'C', install: ' ' }, { name: 'D\nx', install: 'pip install d\n' }])).toEqual({ text: '# A\nnpm i a\n\n# D x\npip install d', count: 2 });
  });
});
