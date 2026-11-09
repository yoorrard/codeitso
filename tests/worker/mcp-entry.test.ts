// Worker 진입 (D157): /mcp의 가벼운 요청은 SDK 없이 앞단이 답하고, 도구를 부르는 POST만 worker/mcp.ts를 늦게 불러와 JSON으로 답한다.
import { describe, expect, it } from 'vitest';
import worker from '../../worker/index.ts';

const ORIGIN = 'https://codeitso.example';
// 시험용 가짜 묶음: 도구 목록·인사는 파일을 읽지 않는다
const env = { ASSETS: { fetch: async () => new Response('not found', { status: 404 }) } } as unknown as Env;
const ctx = { waitUntil: () => {}, passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;
const call = (init: RequestInit & { path?: string }): Promise<Response> =>
  // 시험에서는 cf 속성이 없는 보통 Request를 넘긴다
  worker.fetch(new Request(`${ORIGIN}${init.path ?? '/mcp'}`, init) as unknown as Request<unknown, IncomingRequestCfProperties>, env, ctx) as Promise<Response>;

describe('/mcp 진입', () => {
  it('미리 묻기·브라우저 열기·GET 흐름은 앞단이 바로 답한다', async () => {
    expect((await call({ method: 'OPTIONS' })).status).toBe(204);
    const page = await call({ headers: { Accept: 'text/html' } });
    expect(page.status).toBe(302);
    expect(page.headers.get('Location')).toBe(`${ORIGIN}/connect`);
    const sse = await call({ headers: { Accept: 'text/event-stream' } });
    expect(sse.status).toBe(405);
    expect(sse.headers.get('Allow')).toBe('POST, OPTIONS');
  });

  it('도구를 부르는 POST는 MCP 모듈이 JSON 한 덩어리로 답한다 (2025 판도 SSE가 아니다)', async () => {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' };
    const init = await call({ method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'x', version: '1' } } }) });
    expect(init.status).toBe(200);
    expect(init.headers.get('Content-Type')).toContain('application/json');
    expect(init.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const list = await call({ method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) });
    const body = (await list.json()) as { result: { tools: { name: string }[] } };
    expect(body.result.tools).toHaveLength(7);
  });
});
