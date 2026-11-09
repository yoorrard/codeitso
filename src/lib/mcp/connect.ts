// 'AI에 연결' 쪽(/connect, D154)의 앱별 설정 글: MCP 주소 하나로 만든다. 순수 함수, 시험: tests/lib/mcp-connect.test.ts
// 설정 모양은 각 앱의 공식 문서를 2026-11-09에 확인한 것이다 (docs/DECISIONS.md D154의 출처 목록).
import { MCP_SERVER } from '../../copy/mcp.ts';

export const CONNECT_CLIENTS = ['claude', 'claudeCode', 'chatgpt', 'cursor', 'vscode', 'codex', 'gemini', 'windsurf'] as const;
export type ConnectClient = (typeof CONNECT_CLIENTS)[number];

export interface ClientSetup {
  id: ConnectClient;
  /** 붙여 넣을 명령이나 설정 파일 글 (없으면 화면에서 누르는 순서만) */
  code?: string;
  /** 설정 파일 이름 (설정 글일 때) */
  file?: string;
  /** 한 번에 설치하는 링크 (앱이 열린다) */
  link?: string;
}

const NAME = MCP_SERVER.name;

const json = (v: unknown): string => JSON.stringify(v, null, 2);

/** Cursor 설치 링크: config는 서버 칸만(이름 빼고) JSON을 base64로 */
export function cursorLink(url: string): string {
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(NAME)}&config=${encodeURIComponent(btoa(JSON.stringify({ url })))}`;
}

/** VS Code 설치 링크: 물음표 뒤 전체가 이름·종류·주소 JSON (URL 인코딩) */
export function vscodeLink(url: string): string {
  return `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: NAME, type: 'http', url }))}`;
}

export function connectSetups(url: string): ClientSetup[] {
  return [
    { id: 'claude' },
    { id: 'claudeCode', code: `claude mcp add --transport http ${NAME} ${url}` },
    { id: 'chatgpt' },
    { id: 'cursor', file: '~/.cursor/mcp.json', code: json({ mcpServers: { [NAME]: { url } } }), link: cursorLink(url) },
    { id: 'vscode', file: '.vscode/mcp.json', code: json({ servers: { [NAME]: { type: 'http', url } } }), link: vscodeLink(url) },
    { id: 'codex', code: `codex mcp add ${NAME} --url ${url}` },
    { id: 'gemini', code: `gemini mcp add --transport http -s user ${NAME} ${url}` },
    { id: 'windsurf', file: 'mcp_config.json', code: json({ mcpServers: { [NAME]: { serverUrl: url } } }) },
  ];
}

/** Claude Code 플러그인 설치 명령 (저장소 = 플러그인 장터) */
export function pluginCommands(repo: string): string {
  return `/plugin marketplace add ${repo}\n/plugin install ${NAME}@${NAME}`;
}
