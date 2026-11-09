// MCP 글 다듬기·집계·요약 파일 (D154)
import { describe, expect, it } from 'vitest';
import { cardOf } from '../../src/lib/catalog/core.ts';
import type { CatalogItem } from '../../src/lib/catalog/types.ts';
import { clientFamily, countsOf } from '../../src/lib/mcp/count.ts';
import { AGENT_LINE_MAX, agentCard, buildAgentSummary, clip, readAgentSummary } from '../../src/lib/mcp/summary.ts';
import { block, commas, fenceFor, fillText, inline, inlineCode, line, webUrl } from '../../src/lib/mcp/text.ts';
import { CATS, ITEMS, KIT } from './mcp-fixture.ts';

describe('글 다듬기', () => {
  it('한 줄: 숨은 글자·방향 바꾸기·태그 글자·HTML 주석과 태그를 빼고 공백을 한 칸으로', () => {
    expect(line('a​b‮c\u{E0041}d', 50)).toBe('abcd');
    expect(line('x <!-- do this --> <script>y</script>\n\n z', 50)).toBe('x y z');
    expect(line(42, 10)).toBe('');
    expect(line('가나다라마바사', 4)).toBe('가나다…');
  });

  it('여러 줄: 줄은 지키고 앞뒤 빈 줄·제어 문자를 빼고 줄 수를 묶는다', () => {
    expect(block('\n\nnpm i a\r\n\u0007npx a  \n\n', 100)).toBe('npm i a\nnpx a');
    expect(block('1\n2\n3\n4', 100, 2)).toBe('1\n2\n…');
  });

  it('마크다운 안 짧은 글은 강조·링크 기호를 막는다', () => {
    expect(inline('**a** [b](c) 1 < 2 `e` |f', 50)).toBe('\\*\\*a\\*\\* \\[b\\](c) 1 \\< 2 \\`e\\` \\|f');
    // HTML 태그 모양은 글에서 뺀다
    expect(inline('a <b>bold</b> c', 50)).toBe('a bold c');
  });

  it('코드 울타리와 한 줄 코드는 글 안의 ` 보다 길게', () => {
    expect(fenceFor('no ticks')).toBe('```');
    expect(fenceFor('a ```` b')).toBe('`````');
    expect(inlineCode('npm i a')).toBe('`npm i a`');
    expect(inlineCode('echo `x`')).toBe('`` echo `x` ``');
    expect(inlineCode('`x')).toBe('`` `x ``');
  });

  it('주소는 http·https만, 숫자는 쉼표, 자리 채우기', () => {
    expect(webUrl('https://a.b/c')).toBe('https://a.b/c');
    expect(webUrl('javascript:alert(1)')).toBe('');
    expect(webUrl('https://a b')).toBe('');
    expect(commas(1234567)).toBe('1,234,567');
    expect(fillText('{{a}}-{{b}}-{{c}}', { a: 1, b: 'x' })).toBe('1-x-{{c}}');
  });
});

describe('MCP 집계', () => {
  it('연결한 앱은 종류만 (이름 그대로 적지 않는다)', () => {
    expect(clientFamily('claude-ai')).toBe('claude');
    expect(clientFamily('Claude Code')).toBe('claude');
    expect(clientFamily('openai-mcp')).toBe('chatgpt');
    expect(clientFamily('codex-mcp-client')).toBe('codex');
    expect(clientFamily('cursor-vscode')).toBe('cursor');
    expect(clientFamily('Visual Studio Code')).toBe('vscode');
    expect(clientFamily('gemini-cli-mcp-client')).toBe('gemini');
    expect(clientFamily('mcp-inspector')).toBe('inspector');
    expect(clientFamily('my-bot')).toBe('other');
    expect(clientFamily(undefined)).toBe('other');
  });

  it('우리 도구 이름·처음 인사·프롬프트만 센다 (검색어·id는 세지 않는다)', () => {
    expect(countsOf({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'codeitso_search', arguments: { query: '비밀' } } })).toEqual([
      { type: 'mcp_call', bucket: 'codeitso_search' },
    ]);
    expect(countsOf({ method: 'tools/call', params: { name: 'other_tool' } })).toEqual([]);
    expect(countsOf({ method: 'initialize', params: { clientInfo: { name: 'claude-ai' } } })).toEqual([{ type: 'mcp_init', bucket: 'claude' }]);
    expect(countsOf({ method: 'prompts/get', params: { name: 'plan_app' } })).toEqual([{ type: 'mcp_prompt', bucket: 'plan_app' }]);
    expect(countsOf([{ method: 'tools/list' }, { method: 'tools/call', params: { name: 'codeitso_browse' } }])).toEqual([{ type: 'mcp_call', bucket: 'codeitso_browse' }]);
    expect(countsOf('junk')).toEqual([]);
    expect(countsOf(null)).toEqual([]);
  });
});

describe('에이전트용 요약 파일', () => {
  it('대분류·소분류 이름·개수와 키트(재료 짧은 줄·구현안)만 담는다', () => {
    const s = buildAgentSummary({ total: 5, categories: CATS, kits: [KIT] });
    expect(s.v).toBe(1);
    expect(s.fetched).toBe('2026-11-08');
    expect(s.categories.map((c) => c.id)).toEqual(['design', 'api', 'datasets']);
    expect(s.categories[1]?.subs.find((x) => x.id === 'maps')).toEqual({ id: 'maps', name: '지도', count: 1, measured: true, dated: false });
    expect(s.kits[0]?.items.map((i) => i.id)).toEqual(['a:weather', 'd:font']);
    expect(readAgentSummary(s)).toEqual(s);
    expect(readAgentSummary({ ...s, v: 2 })).toBeNull();
    expect(readAgentSummary(null)).toBeNull();
  });

  it('키트 재료 한 줄은 짧게 자른다', () => {
    const card = { ...cardOf(ITEMS[0] as CatalogItem), summary: '가'.repeat(400) };
    expect([...agentCard(card).summary].length).toBe(AGENT_LINE_MAX);
    expect(clip('  a   b  ', 10)).toBe('a b');
  });
});
