// 원격 MCP 끝점 (D154): 공식 MCP 클라이언트로 처음 인사 → 도구 목록 → 도구 부르기, 그리고 HTTP 앞단(CORS·본문 크기·요청 수·집계)을 본다.
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it } from 'vitest';
import { MCP_TOOLS } from '../../src/copy/mcp.ts';
import { MCP_BODY_MAX, RATE_PER_MINUTE, allowRequest, assetsLoader, cachedChars, clearMcpCache, handleMcp, rateKey, rateWindowCount, resetCounts, resetRateWindows } from '../../worker/mcp.ts';
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
  resetCounts();
});

const counted = (rows: Row[]): Record<string, number> => Object.fromEntries(rows.map((r) => [`${String(r.args[1])}:${String(r.args[2])}`, Number(r.args[3])]));

describe('공식 MCP 클라이언트로', () => {
  it('처음 인사 → 도구 다섯·프롬프트 하나 (모두 읽기 전용) → 검색·자세히·장바구니', async () => {
    const { env, rows, waits } = makeEnv();
    let clock = NOW;
    const fetchLike = async (input: string | URL | Request, init?: RequestInit): Promise<Response> =>
      handleMcp(new Request(input, init), env, (p) => waits.push(p), clock);
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

    // 빈 대분류(null)는 없는 것과 같다 (몇몇 앱은 고르지 않은 칸을 null로 보낸다)
    const nullCat = await client.callTool({ name: 'codeitso_search', arguments: { query: 'weather', category: null, subcategory: null, limit: 2 } });
    expect(nullCat.isError).toBeFalsy();
    // id 꼴이 아닌 글자는 받지 않는다
    expect((await client.callTool({ name: 'codeitso_get_materials', arguments: { ids: ['<script>'] } })).isError).toBe(true);

    // 집계는 처음 한 건을 바로 쓰고, 그 뒤는 1분 동안 모았다가 다음 요청 때 한 번에 쓴다
    await Promise.all(waits);
    expect(counted(rows)).toEqual({ 'mcp_init:claude': 1 });
    clock = NOW + 61_000;
    const prompt = await client.getPrompt({ name: 'plan_app', arguments: { app: '우리 반 날씨 앱' } });
    expect(JSON.stringify(prompt.messages)).toContain('우리 반 날씨 앱');
    await client.close();

    await Promise.all(waits);
    const c = counted(rows.slice(1));
    expect(c['mcp_call:codeitso_search']).toBe(3);
    expect(c['mcp_call:codeitso_open_cart']).toBe(1);
    expect(c['mcp_prompt:plan_app']).toBe(1);
    expect(rows.every((r) => r.args[0] === '2026-11-09')).toBe(true);
    // 검색어·재료 id는 집계에 들어가지 않는다
    expect(JSON.stringify(rows)).not.toContain('weather');
  });

  it('새 판(2026-07-28) 클라이언트도 server/discover로 인사하고 도구를 부른다', async () => {
    const { env, rows, waits } = makeEnv();
    const fetchLike = async (input: string | URL | Request, init?: RequestInit): Promise<Response> =>
      handleMcp(new Request(input, init), env, (p) => waits.push(p), NOW);
    const client = new Client({ name: 'cursor-vscode', version: '1.0.0' }, { versionNegotiation: { mode: { pin: '2026-07-28' } } });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${ORIGIN}/mcp`), { fetch: fetchLike }));
    expect((await client.listTools()).tools).toHaveLength(Object.keys(MCP_TOOLS).length);
    const r = await client.callTool({ name: 'codeitso_search', arguments: { query: 'weather', limit: 1 } });
    expect(JSON.stringify(r.content)).toContain('Weather Now');
    await client.close();
    await Promise.all(waits);
    expect(counted(rows)).toEqual({ 'mcp_init:cursor': 1 });
  });
});

describe('정적 JSON 캐시', () => {
  it('같은 파일을 동시에 놓치면 한 번만 받고, 셈한 글자 수도 한 번만 는다', async () => {
    let fetches = 0;
    const body = JSON.stringify({ a: 'x'.repeat(100) });
    const env = {
      ASSETS: {
        fetch: async (): Promise<Response> => {
          fetches += 1;
          await new Promise((r) => setTimeout(r, 5));
          return new Response(body);
        },
      },
    };
    const load = assetsLoader(env, ORIGIN);
    const [a, b] = await Promise.all([load.json('/catalog/x.json'), load.json('/catalog/x.json')]);
    expect(a).toEqual(b);
    expect(fetches).toBe(1);
    expect(cachedChars()).toBe(body.length);
    await load.json('/catalog/x.json');
    expect(fetches).toBe(1);
  });
});

describe('HTTP 앞단', () => {
  it('CORS 미리 묻기는 204, 브라우저로 열면 연결 안내 쪽으로, 다른 GET은 405', async () => {
    const { env } = makeEnv();
    const pre = await handleMcp(new Request(`${ORIGIN}/mcp`, { method: 'OPTIONS' }), env, () => {}, NOW);
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('*');
    for (const h of ['Mcp-Protocol-Version', 'Mcp-Method', 'Mcp-Name']) expect(pre.headers.get('Access-Control-Allow-Headers')).toContain(h);
    // 브라우저가 묻는 머리글 이름은 그대로 돌려준다 (이름 꼴이 아니면 정해 둔 목록)
    const ask = (h: string): Request => new Request(`${ORIGIN}/mcp`, { method: 'OPTIONS', headers: { 'Access-Control-Request-Headers': h } });
    expect((await handleMcp(ask('content-type, mcp-method, x-new'), env, () => {}, NOW)).headers.get('Access-Control-Allow-Headers')).toBe('content-type, mcp-method, x-new');
    expect((await handleMcp(ask('a;b'), env, () => {}, NOW)).headers.get('Access-Control-Allow-Headers')).toContain('Mcp-Name');
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
    // 길이를 밝히지 않은(chunked) 큰 본문도 끝까지 읽지 않고 413
    const chunk = new TextEncoder().encode('x'.repeat(16 * 1024));
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        sent += 1;
        if (sent > 100) c.close();
        else c.enqueue(chunk);
      },
    });
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: stream, duplex: 'half' };
    // duplex는 Node fetch의 흐름 본문 표시 (DOM 타입에 아직 없다)
    const chunked = await handleMcp(new Request(`${ORIGIN}/mcp`, init as RequestInit), env, () => {}, NOW);
    expect(chunked.status).toBe(413);
    expect(sent).toBeLessThan(10);
  });

  it('묶음(배열) 요청은 400, 바뀜 구독은 이 서버에 없다고 알린다, 알림은 세지 않는다', async () => {
    const { env, rows, waits } = makeEnv();
    const batch = await handleMcp(post([{ jsonrpc: '2.0', id: 1, method: 'tools/list' }]), env, (p) => waits.push(p), NOW);
    expect(batch.status).toBe(400);
    expect(await batch.json()).toMatchObject({ error: { code: -32600 } });
    const listen = await handleMcp(post({ jsonrpc: '2.0', id: 7, method: 'subscriptions/listen', params: {} }), env, () => {}, NOW);
    expect(listen.status).toBe(200);
    expect(await listen.json()).toMatchObject({ id: 7, error: { code: -32601 } });
    await handleMcp(post({ jsonrpc: '2.0', method: 'notifications/initialized' }), env, (p) => waits.push(p), NOW);
    await Promise.all(waits);
    expect(rows).toEqual([]);
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

  it('요청 수 열쇠: IPv6은 앞 64비트(줄여 쓴 꼴도 펴서), IPv4를 담은 IPv6은 IPv4로', () => {
    expect(rateKey('203.0.113.9')).toBe('203.0.113.9');
    expect(rateKey('2001:db8::1:2:3:4')).toBe(rateKey('2001:db8:0:0:5:6:7:8'));
    expect(rateKey('2001:db8:0:1::1')).not.toBe(rateKey('2001:db8:0:2::1'));
    expect(rateKey('::ffff:203.0.113.9')).toBe('203.0.113.9');
  });

  it('주소를 계속 바꾸는 요청에도 요청 수 창이 끝없이 늘지 않는다', () => {
    for (let i = 0; i < 6_000; i += 1) allowRequest(`k${i}`, NOW);
    expect(rateWindowCount()).toBeLessThanOrEqual(5_001);
    // 1분이 지나면 지난 창은 지운다
    allowRequest('later', NOW + 61_000);
    expect(rateWindowCount()).toBe(1);
  });

  it('다른 주소는 404', async () => {
    const { env } = makeEnv();
    expect((await handleMcp(new Request(`${ORIGIN}/mcp/x`, { method: 'POST' }), env, () => {}, NOW)).status).toBe(404);
  });
});
