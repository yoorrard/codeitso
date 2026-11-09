// MCP 익명 집계 (D154): 날짜별로 어느 도구가 몇 번 불렸는지, 어느 종류의 AI 앱이 연결했는지만 센다.
// 검색어·재료 id·장바구니 링크·IP는 세지도 적지도 않는다. 브라우저의 /api/event(event-spec.ts)와 따로 두어 화면에서는 보낼 수 없다.
// 순수 함수: JSON-RPC 본문을 보고 셀 것만 고른다. 시험: tests/lib/mcp-text.test.ts ('MCP 집계')
import { MCP_PROMPT, MCP_TOOLS } from '../../copy/mcp.ts';

export const MCP_EVENT = { call: 'mcp_call', init: 'mcp_init', prompt: 'mcp_prompt' } as const;

/** 연결한 앱의 종류 (clientInfo.name에서). 목록에 없으면 other */
export const CLIENT_FAMILIES = ['claude', 'chatgpt', 'cursor', 'vscode', 'codex', 'gemini', 'windsurf', 'inspector', 'other'] as const;
export type ClientFamily = (typeof CLIENT_FAMILIES)[number];

const TOOL_NAMES: ReadonlySet<string> = new Set(Object.values(MCP_TOOLS).map((t) => t.name));

export function clientFamily(name: unknown): ClientFamily {
  const n = typeof name === 'string' ? name.toLowerCase() : '';
  if (/claude|anthropic/.test(n)) return 'claude';
  if (/chatgpt|openai(?!.*codex)/.test(n)) return 'chatgpt';
  if (/codex/.test(n)) return 'codex';
  if (/cursor/.test(n)) return 'cursor';
  if (/vscode|visual studio code|copilot/.test(n)) return 'vscode';
  if (/gemini/.test(n)) return 'gemini';
  if (/windsurf|codeium/.test(n)) return 'windsurf';
  if (/inspector/.test(n)) return 'inspector';
  return 'other';
}

export interface McpCount {
  type: (typeof MCP_EVENT)[keyof typeof MCP_EVENT];
  bucket: string;
}

/** 2026-07-28 판은 initialize 대신 server/discover에 앱 정보를 _meta로 싣는다 */
const CLIENT_INFO_META = 'io.modelcontextprotocol/clientInfo';

const obj = (x: unknown): Record<string, unknown> => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : {});

/**
 * JSON-RPC 요청 한 건 → 셀 것(0~1개). 묶음(배열)·알림(id 없음)은 세지 않는다. 도구 이름은 우리 도구일 때만,
 * 처음 인사(initialize·server/discover)는 앱 종류만, 프롬프트는 우리 프롬프트만. Worker는 처리가 성공(2xx)한 뒤에만 센다.
 */
export function countsOf(body: unknown): McpCount[] {
  if (Array.isArray(body)) return [];
  const o = obj(body);
  if (o['id'] === undefined || o['id'] === null) return [];
  const params = obj(o['params']);
  if (o['method'] === 'tools/call' && typeof params['name'] === 'string' && TOOL_NAMES.has(params['name'])) {
    return [{ type: MCP_EVENT.call, bucket: params['name'] }];
  }
  if (o['method'] === 'initialize') return [{ type: MCP_EVENT.init, bucket: clientFamily(obj(params['clientInfo'])['name']) }];
  if (o['method'] === 'server/discover') {
    return [{ type: MCP_EVENT.init, bucket: clientFamily(obj(obj(params['_meta'])[CLIENT_INFO_META])['name']) }];
  }
  if (o['method'] === 'prompts/get' && params['name'] === MCP_PROMPT.name) return [{ type: MCP_EVENT.prompt, bucket: MCP_PROMPT.name }];
  return [];
}
