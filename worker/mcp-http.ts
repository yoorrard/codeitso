// 원격 MCP의 HTTP 앞단 중 SDK가 필요 없는 부분 (D154·D157): CORS 머리글, 미리 묻기, 브라우저로 열었을 때 안내 쪽 이동, POST가 아닌 요청.
// worker/index.ts가 이 가벼운 모듈만 먼저 쓰고, 도구를 부르는 POST 때만 SDK가 든 worker/mcp.ts를 불러온다
// (SDK·zod를 처음 읽는 비용을 사이트 집계·방문 수 요청이나 미리 묻기 요청이 내지 않게).
import { FILES, ROUTES } from '../src/lib/routes.ts';

/** 브라우저 MCP 도구가 미리 묻는 머리글. 새 판(2026-07-28)은 Mcp-Method·Mcp-Name·Mcp-Wire-Codec도 보낸다 */
export const ALLOW_HEADERS = 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Wire-Codec, Last-Event-ID';

const HEADERS: Record<string, string> = {
  // 응답 종류를 브라우저가 짐작하지 않게 (JSON·SSE를 다른 것으로 읽지 않는다)
  'X-Content-Type-Options': 'nosniff',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': ALLOW_HEADERS,
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

export function withCors(res: Response, allowHeaders?: string): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v);
  if (allowHeaders) out.headers.set('Access-Control-Allow-Headers', allowHeaders);
  // 흐름 응답(SSE, 새 판 구독)은 SDK가 정한 no-cache·no-transform을 지킨다
  if (!out.headers.has('Cache-Control')) out.headers.set('Cache-Control', 'no-store');
  return out;
}

export function jsonRpcError(status: number, code: number, message: string, id: unknown = null, extra: Record<string, string> = {}): Response {
  const safeId = typeof id === 'string' || typeof id === 'number' ? id : null;
  return withCors(new Response(JSON.stringify({ jsonrpc: '2.0', id: safeId, error: { code, message } }), { status, headers: { 'Content-Type': 'application/json', ...extra } }));
}

/** 미리 묻는 머리글 이름 목록을 그대로 돌려준다 (글자 꼴이 맞을 때만, 아니면 정해 둔 목록) */
function preflightHeaders(request: Request): string {
  const asked = request.headers.get('Access-Control-Request-Headers') ?? '';
  return /^[A-Za-z0-9-]+(\s*,\s*[A-Za-z0-9-]+)*$/.test(asked) && asked.length <= 1_000 ? asked : ALLOW_HEADERS;
}

/** 사람이 브라우저로 /mcp를 열면 연결 안내 쪽으로 보낸다 */
function wantsPage(request: Request): boolean {
  const accept = request.headers.get('Accept') ?? '';
  return request.method === 'GET' && accept.includes('text/html') && !accept.includes('text/event-stream');
}

/**
 * SDK 없이 답할 수 있는 요청이면 응답, 도구·목록을 부르는 POST면 null.
 * 이 서버는 상태가 없어(무상태) GET 흐름·DELETE 세션 끝내기가 없다: 2025 판 클라이언트가 인사 뒤에 여는 GET은 405로 바로 끝난다
 */
export function mcpFront(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.pathname !== FILES.mcp) return withCors(new Response(null, { status: 404 }));
  if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), preflightHeaders(request));
  if (wantsPage(request)) return Response.redirect(`${url.origin}${ROUTES.connect}`, 302);
  if (request.method !== 'POST') return jsonRpcError(405, -32000, 'Method not allowed.', null, { Allow: 'POST, OPTIONS' });
  return null;
}
