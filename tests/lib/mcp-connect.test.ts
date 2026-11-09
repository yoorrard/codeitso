// 'AI에 연결' 쪽의 앱별 설정 글 (D154): 각 앱 공식 문서의 모양 그대로인지
import { describe, expect, it } from 'vitest';
import { ko } from '../../src/copy/ko.ts';
import { MCP_TOOLS } from '../../src/copy/mcp.ts';
import { CONNECT_CLIENTS, connectSetups, cursorLink, pluginCommands, vscodeLink } from '../../src/lib/mcp/connect.ts';

const URL_ = 'https://codeitso.yoorrard.workers.dev/mcp';

describe('앱별 설정 글', () => {
  const by = new Map(connectSetups(URL_).map((s) => [s.id, s]));

  it('앱마다 하나씩, 명령은 이름 codeitso와 주소 하나로', () => {
    expect([...by.keys()]).toEqual([...CONNECT_CLIENTS]);
    expect(by.get('claudeCode')?.code).toBe(`claude mcp add --transport http codeitso ${URL_}`);
    expect(by.get('codex')?.code).toBe(`codex mcp add codeitso --url ${URL_}`);
    expect(by.get('gemini')?.code).toBe(`gemini mcp add --transport http -s user codeitso ${URL_}`);
    expect(JSON.parse(by.get('cursor')?.code ?? '')).toEqual({ mcpServers: { codeitso: { url: URL_ } } });
    expect(JSON.parse(by.get('vscode')?.code ?? '')).toEqual({ servers: { codeitso: { type: 'http', url: URL_ } } });
    expect(JSON.parse(by.get('windsurf')?.code ?? '')).toEqual({ mcpServers: { codeitso: { serverUrl: URL_ } } });
    expect(by.get('claude')?.code).toBeUndefined();
  });

  it('한 번에 설치 링크: Cursor는 서버 칸만 base64, VS Code는 이름·종류·주소 JSON', () => {
    const c = new URL(cursorLink(URL_));
    expect(c.protocol).toBe('cursor:');
    expect(c.searchParams.get('name')).toBe('codeitso');
    expect(JSON.parse(atob(c.searchParams.get('config') ?? ''))).toEqual({ url: URL_ });
    const v = vscodeLink(URL_);
    expect(v.startsWith('vscode:mcp/install?')).toBe(true);
    expect(JSON.parse(decodeURIComponent(v.slice('vscode:mcp/install?'.length)))).toEqual({ name: 'codeitso', type: 'http', url: URL_ });
  });

  it('Claude Code 플러그인: 저장소를 장터로 더하고 codeitso@codeitso를 설치', () => {
    expect(pluginCommands('yoorrard/codeitso')).toBe('/plugin marketplace add yoorrard/codeitso\n/plugin install codeitso@codeitso');
  });
});

describe("'AI가 할 수 있는 일' 목록", () => {
  it('도구마다 한 줄 (쪽이 같은 차례로 도구 이름을 붙인다)', () => {
    expect(ko.connect.can).toHaveLength(Object.keys(MCP_TOOLS).length);
  });
});
