// 원격 MCP 끝점 (D154): 공식 MCP 클라이언트로 처음 인사 → 도구 목록 → 도구 부르기, 그리고 HTTP 앞단(CORS·본문 크기·요청 수·집계)을 본다.
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it } from 'vitest';
import { MCP_TOOLS } from '../../src/copy/mcp.ts';
import { MCP_BODY_MAX, RATE_PER_MINUTE, allowRequest, clearMcpCache, handleMcp, resetRateWindows } from '../../worker/mcp.ts';
import { fixtureFiles } from './mcp-fixture.ts';

const ORIGIN = 'https://codeitso.example';
const NOW = Date.UTC(2026, 10, 9, 3, 0);

interface Row {
  args: unknown[];
}

function makeEnv(): { env: Parameters<typeof handleMcp>[1]; rows: Row[]; waits: Promise<unknown>[] } {
  const files = fixtureFiles();
  const rows: Row[] = [];
  const env = {
    ASSETS: {
      fetch: async (req: Request): Promise<Response> => {
        const path = new URL(req.url).pathname;
        return files.has(path) ? new Response(JSON.stringify(files.get(path))) : new Response('not found', { status: 404 });
      },
    },
    DB: {
      prepare: () => ({ bind: (...args: unknown[]) => ({ run: async () => rows.push({ args }) }) }),
    },
  };
  // 시험용 가짜 정적 파일·D1은 쓰는 메서드만 흉내 낸다
  return { env: env as unknown as Parameters<typeof handleMcp>[1], rows, waits: [] };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'CF-Connecting-IP': '203.0.113.9', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  resetRateWindows();
  clearMcpCache();
});

describe('공식 MCP 클라이언트로', () => {
  it('처음 인사 → 도구 다섯·프롬프트 하나 (모두 읽기 전용) → 검색·자세히·장바구니', async () => {
    const { env, rows, waits } = makeEnv();
    const fetchLike = async (input: string | URL | Request, init?: RequestInit): Promise<Response> =>
      handleMcp(new Request(input, init), env, (p) => waits.push(p), NOW);
    const client = new Client({ name: 'claude-ai', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${ORIGIN}/mcp`), { fetch: fetchLike }));

    expect(client.getServerVersion()).toMatchObject({ name: 'codeitso', title: '코드잇소' });
    expect(client.getInstructions()).toContain('third-party text');
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(Object.values(MCP_TOOLS).map((t) => t.name).sort());
    for (const t of tools) {
      expect(t.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
      expect(t.title).toBeTruthy();
      expect(t.name.length).toBeLessThanOrEqual(64);
    }
    expect((await client.listPrompts()).prompts.map((p) => p.name)).toEqual(['plan_app']);

    const search = await client.callTool({ name: 'codeitso_search', arguments: { query: 'weather', limit: 2 } });
    expect(search.isError).toBeFalsy();
    expect(JSON.stringify(search.content)).toContain('Weather Now');

    const json = await client.callTool({ name: 'codeitso_get_materials', arguments: { ids: ['a:weather'], response_format: 'json' } });
    expect(json.structuredContent).toMatchObject({ items: [{ id: 'a:weather', page_url: `${ORIGIN}/item?id=a%3Aweather` }], not_found: [] });

    const cart = await client.callTool({ name: 'codeitso_open_cart', arguments: { share: `${ORIGIN}/cart#s=a%3Aweather` } });
    expect(JSON.stringify(cart.content)).toContain('npm i weather-now');

    // 잘못된 인자는 모델이 읽을 오류 결과 (전송 오류가 아니다)
    const bad = await client.callTool({ name: 'codeitso_search', arguments: { query: 'weather', limit: 999 } });
    expect(bad.isError).toBe(true);
    const unknown = await client.callTool({ name: 'codeitso_browse', arguments: { subcategory: 'kr-public' } });
    expect(unknown.isError).toBe(true);
    expect(JSON.stringify(unknown.content)).toContain('Add category');

    const prompt = await client.getPrompt({ name: 'plan_app', arguments: { app: '우리 반 날씨 앱' } });
    expect(JSON.stringify(prompt.messages)).toContain('우리 반 날씨 앱');
    await client.close();

    await Promise.all(waits);
    const counted = rows.map((r) => `${String(r.args[1])}:${String(r.args[2])}`);
    expect(counted).toContain('mcp_call:codeitso_search');
    expect(counted).toContain('mcp_call:codeitso_open_cart');
    expect(counted).toContain('mcp_prompt:plan_app');
    // 검색어·재료 id는 집계에 들어가지 않는다
    expect(JSON.stringify(rows)).not.toContain('weather');
  });
});

describe('HTTP 앞단', () => {
  it('CORS 미리 묻기는 204, 브라우저로 열면 연결 안내 쪽으로, 다른 GET은 405', async () => {
    const { env } = makeEnv();
    const pre = await handleMcp(new Request(`${ORIGIN}/mcp`, { method: 'OPTIONS' }), env, () => {}, NOW);
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(pre.headers.get('Access-Control-Allow-Headers')).toContain('Mcp-Protocol-Version');
    const page = await handleMcp(new Request(`${ORIGIN}/mcp`, { headers: { Accept: 'text/html,*/*' } }), env, () => {}, NOW);
    expect(page.status).toBe(302);
    expect(page.headers.get('Location')).toBe(`${ORIGIN}/connect`);
    const sse = await handleMcp(new Request(`${ORIGIN}/mcp`, { headers: { Accept: 'text/event-stream' } }), env, () => {}, NOW);
    expect(sse.status).toBe(405);
  });

  it('JSON이 아닌 본문은 400, 큰 본문은 413', async () => {
    const { env } = makeEnv();
    const bad = await handleMcp(post('{not json'), env, () => {}, NOW);
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: { code: -32700 } });
    const big = await handleMcp(post(JSON.stringify({ pad: 'x'.repeat(MCP_BODY_MAX) })), env, () => {}, NOW);
    expect(big.status).toBe(413);
  });

  it(`같은 접속 주소에서 1분에 ${RATE_PER_MINUTE}번을 넘으면 429`, async () => {
    for (let i = 0; i < RATE_PER_MINUTE; i += 1) expect(allowRequest('198.51.100.1', NOW)).toBe(true);
    expect(allowRequest('198.51.100.1', NOW + 1_000)).toBe(false);
    expect(allowRequest('198.51.100.2', NOW + 1_000)).toBe(true);
    expect(allowRequest('198.51.100.1', NOW + 61_000)).toBe(true);
    const { env } = makeEnv();
    resetRateWindows();
    for (let i = 0; i < RATE_PER_MINUTE; i += 1) allowRequest('203.0.113.9', NOW);
    const res = await handleMcp(post({ jsonrpc: '2.0', id: 1, method: 'ping' }), env, () => {}, NOW);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  it('다른 주소는 404', async () => {
    const { env } = makeEnv();
    expect((await handleMcp(new Request(`${ORIGIN}/mcp/x`, { method: 'POST' }), env, () => {}, NOW)).status).toBe(404);
  });
});
