// 재료 목록 .md (receipt-md.ts): 영수증 사본 만들기, AI에게 주는 머리말, 만들 앱, 대분류 순서 묶음, 재료 칸(주소·라이선스·설치·조각·메모),
// 라이선스 주의, 파일 이름, 코드 울타리, 설치 명령 한꺼번에.
import { describe, expect, it } from 'vitest';
import { ko } from '../../src/copy/ko.ts';
import type { DetailRecord, NavCategory } from '../../src/lib/catalog/types.ts';
import { buildReceipt, fence, groupByCategory, installBundle, mdFileName, namesOf, receiptLineOf, receiptMarkdown } from '../../src/lib/receipt-md.ts';
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
  ['official:neis', detail('official:neis', 'api', 'kr-public', { url: 'https://open.neis.go.kr', use: { docs: 'https://open.neis.go.kr/portal/guide' } })],
  ['korean-fonts:pretendard', detail('korean-fonts:pretendard', 'design', 'fonts-ko', { license: 'OFL-1.1', use: { install: 'npm i pretendard', snippet: '@import "pretendard";' } })],
  ['mcp:ctx', detail('mcp:ctx', 'ai', 'mcp', { license: 'MIT', use: { snippet: '```json\n{"mcpServers":{}}\n```' } })],
]);

describe('영수증 사본', () => {
  it('상세 자료의 사실만 옮기고, 못 찾은 재료는 이름·자리만', () => {
    const r = buildReceipt(lines, details, '  우리 반 급식 앱 ', at, 'x1');
    expect(r.id).toBe(`${at.toString(36)}x1`);
    expect(r.no).toMatch(/^20261014-\d{4}$/);
    expect(r.project).toBe('우리 반 급식 앱');
    expect(r.lines[1]).toEqual({ id: 'korean-fonts:pretendard', name: 'Pretendard (프리텐다드)', cat: 'design', sub: 'fonts-ko', memo: '제목 글꼴', url: 'https://example.com/fonts-ko', license: 'OFL-1.1', source: '출처', install: 'npm i pretendard', snippet: '@import "pretendard";' });
    expect(r.lines[3]).toEqual({ id: 'gone:item', name: '빠진 재료', cat: 'design', sub: 'fonts-ko' });
    expect(buildReceipt(lines, details, ' ', at).project).toBeUndefined();
    expect(receiptLineOf(lines[2] as CartLine, details.get('mcp:ctx')).license).toBe('MIT');
  });
});

describe('재료 목록 .md', () => {
  const r = buildReceipt(lines, details, '우리 반 급식 앱', at);
  const md = receiptMarkdown(r, names, 'https://shop.example');

  it('머리: 제목, 번호·때·개수·0원, AI에게 하는 말(라이선스·비밀 값 주의)', () => {
    expect(md.startsWith(`${ko.md.title}\n`)).toBe(true);
    expect(md).toContain(`영수증 No. ${r.no} · 2026-10-14 15:30 · 재료 4개 · 0원`);
    expect(md).toContain(ko.md.aiLead);
    for (const rule of ko.md.aiRules) expect(md).toContain(`- ${rule}`);
    expect(md).toMatch(/라이선스를 지켜 줘/);
    expect(md).toMatch(/서버 쪽 환경 변수/);
  });

  it('만들 앱 → 재료(대분류 순서: 디자인 → AI 확장 → API, 묶음 안은 담은 순서)', () => {
    expect(md).toContain(`${ko.md.projectTitle}\n\n우리 반 급식 앱\n`);
    const order = ['### 디자인 (2개)', '#### Pretendard (프리텐다드)', '#### 빠진 재료', '### AI 확장 (1개)', '#### context7', '### API (1개)', '#### 나이스 교육정보 개방 포털'].map((h) => md.indexOf(h));
    expect(order.every((x) => x > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('재료 칸: 종류·공식 주소·라이선스(없으면 확인 안내)·출처·문서·내 메모(한 줄로), 설치·조각은 코드 울타리', () => {
    expect(md).toContain('- 종류: 디자인 › 한글 폰트');
    expect(md).toContain('- 공식 주소: https://example.com/fonts-ko');
    expect(md).toContain('- 라이선스: OFL-1.1');
    expect(md).toContain(`- ${ko.md.licenseNone}`);
    expect(md).toContain('- 문서: https://open.neis.go.kr/portal/guide');
    expect(md).toContain('- 내 메모: 급식 메뉴 불러오기');
    expect(md).toContain('설치:\n\n```sh\nnpm i pretendard\n```');
    expect(md).toContain('````\n```json\n{"mcpServers":{}}\n```\n````');
  });

  it('끝: 라이선스 주의와 사이트 주소', () => {
    expect(md).toContain(ko.md.noteTitle);
    expect(md).toContain('2026-10-14에 코드쇼퍼 진열대에서 받은');
    expect(md.trimEnd().endsWith('https://shop.example')).toBe(true);
  });

  it('프로젝트 메모가 없으면 만들 앱 칸이 없다', () => {
    expect(receiptMarkdown(buildReceipt(lines, details, '', at), names, 'https://x')).not.toContain(ko.md.projectTitle);
  });
});

describe('도우미', () => {
  it('파일 이름은 codeshopper-<yyyymmdd-hhmm>.md', () => {
    expect(mdFileName(at)).toBe('codeshopper-20261014-1530.md');
  });
  it('코드 울타리는 글 안 ` 줄보다 길다', () => {
    expect(fence('a')).toBe('```\na\n```');
    expect(fence('x ```` y', 'sh')).toBe('`````sh\nx ```` y\n`````');
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
