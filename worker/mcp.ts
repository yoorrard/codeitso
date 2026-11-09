// 원격 MCP 서버 (D154): POST /mcp, 공식 SDK(@modelcontextprotocol/server)의 무상태 Streamable HTTP.
// 도구 다섯 개와 프롬프트 하나는 모두 읽기 전용이고, 진열대 빌드가 만든 정적 JSON(env.ASSETS)만 읽는다. 바깥 사이트에 묻지 않는다.
// 무료 Worker 한도 안에 두려고: 본문 64KB까지, 한 isolate 안에서 같은 접속 주소의 분당 요청 수를 묶고, 읽은 JSON은 isolate 메모리에 잠깐 둔다.
// 세는 것은 도구 이름·앱 종류뿐(src/lib/mcp/count.ts). 검색어·재료 id·장바구니 링크·IP는 적지 않는다(observability도 꺼 둔다).
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { MCP_ERRORS, MCP_INSTRUCTIONS, MCP_PROMPT, MCP_SERVER, MCP_TOOLS } from '../src/copy/mcp.ts';
import { CATEGORY_ORDER, SORTS } from '../src/lib/catalog/types.ts';
import { utcDay } from '../src/lib/event-spec.ts';
import { readLimited } from './body.ts';
import { countsOf } from '../src/lib/mcp/count.ts';
import { renderCart, renderCategory, renderDetails, renderKit, renderKits, renderOverview, renderSearch, renderSubList } from '../src/lib/mcp/render.ts';
import { fillText } from '../src/lib/mcp/text.ts';
import type { Loader, ToolContext } from '../src/lib/mcp/tools.ts';
import { LIMITS, SAFE_ID, ToolError, browse, getKits, getMaterials, openCart, searchMaterials } from '../src/lib/mcp/tools.ts';
import { FILES, ROUTES } from '../src/lib/routes.ts';

/** 요청 본문 상한 (바이트). 도구 인자는 장바구니 링크라도 이보다 훨씬 작다 */
export const MCP_BODY_MAX = 64 * 1024;
/** 한 isolate에서 같은 접속 주소의 1분 요청 수 상한 (에이전트 한 대화는 보통 분당 수십 번 아래) */
export const RATE_PER_MINUTE = 120;
/** isolate 메모리에 둘 JSON 글자 수 합 (128MB 한도 안에서 넉넉히 아래) */
const CACHE_CHARS = 8_000_000;

/**
 * MCP가 쓰는 묶음: 정적 파일(필수)과 집계 D1(시험에서는 없을 수 있다). Cloudflare 전역 타입(Env) 대신 쓰는 메서드만 적어
 * 화면 쪽 타입 검사(e2e가 이 파일을 import)에서도 읽힌다. Worker의 진짜 Env(Fetcher·D1Database)는 이 모양에 맞는다.
 */
export interface McpEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB?: { prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } } };
}

// ── 정적 JSON 읽기 (isolate 안 캐시) ────────────────────────────────────

const cache = new Map<string, { value: unknown; size: number }>();
let cached = 0;
/** 같은 파일을 동시에 여러 요청이 놓치면 한 번만 받아 읽는다 (CPU·메모리 두 배를 막는다) */
const inflight = new Map<string, Promise<unknown>>();

function remember(path: string, value: unknown, size: number): void {
  if (size > CACHE_CHARS / 4) return;
  const old = cache.get(path);
  if (old) {
    cached -= old.size;
    cache.delete(path);
  }
  cache.set(path, { value, size });
  cached += size;
  for (const [k, v] of cache) {
    if (cached <= CACHE_CHARS) break;
    cache.delete(k);
    cached -= v.size;
  }
}

async function readAsset(env: Pick<McpEnv, 'ASSETS'>, origin: string, path: string): Promise<unknown> {
  const res = await env.ASSETS.fetch(new Request(`${origin}${path}`));
  if (!res.ok) return null;
  const text = await res.text();
  try {
    const value: unknown = JSON.parse(text);
    remember(path, value, text.length);
    return value;
  } catch {
    return null;
  }
}

export function assetsLoader(env: Pick<McpEnv, 'ASSETS'>, origin: string): Loader {
  return {
    async json(path) {
      const hit = cache.get(path);
      if (hit) {
        // 최근에 쓴 것을 뒤로 (오래 안 쓴 것부터 버린다)
        cache.delete(path);
        cache.set(path, hit);
        return hit.value;
      }
      const running = inflight.get(path);
      if (running) return running;
      const p = readAsset(env, origin, path).finally(() => inflight.delete(path));
      inflight.set(path, p);
      return p;
    },
  };
}

/** 캐시가 셈한 글자 수 (시험: 동시에 놓쳐도 늘어나지 않는지) */
export function cachedChars(): number {
  return cached;
}

/** 시험에서 캐시를 비운다 */
export function clearMcpCache(): void {
  cache.clear();
  inflight.clear();
  cached = 0;
}

// ── 서버 (요청마다 새로 만든다: SDK v2의 무상태 방식) ─────────────────────

const FORMATS = ['markdown', 'json'] as const;
type Format = (typeof FORMATS)[number];
const format = z.enum(FORMATS).default('markdown');
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const ID = z.string().min(1).max(200).regex(SAFE_ID);
const SUB_ID = z.string().min(1).max(40).regex(/^[a-z0-9][a-z0-9-]*$/);

interface TextResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function reply<T extends object>(data: T, fmt: Format, md: (d: T) => string): TextResult {
  if (fmt === 'json') return { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data as Record<string, unknown> };
  return { content: [{ type: 'text', text: md(data) }] };
}

/** 도구 하나를 감싼다: ToolError는 모델이 읽을 오류 결과로, 그 밖은 자료 오류 한 줄로 */
async function guard(run: () => Promise<TextResult>): Promise<TextResult> {
  try {
    return await run();
  } catch (e) {
    const text = e instanceof ToolError ? e.message : MCP_ERRORS.data;
    return { content: [{ type: 'text', text }], isError: true };
  }
}

export function createCodeitsoServer(ctx: ToolContext): McpServer {
  const t = MCP_TOOLS;
  const server = new McpServer(
    { name: MCP_SERVER.name, title: MCP_SERVER.title, version: MCP_SERVER.version, websiteUrl: ctx.site },
    { instructions: fillText(MCP_INSTRUCTIONS, { site: ctx.site }) },
  );

  server.registerTool(
    t.search.name,
    {
      title: t.search.title,
      description: t.search.description,
      inputSchema: z.strictObject({
        query: z.string().min(1).max(LIMITS.query).describe(t.search.query),
        category: z.enum(CATEGORY_ORDER).nullish().describe(t.search.category),
        subcategory: SUB_ID.nullish().describe(t.search.subcategory),
        limit: z.number().int().min(1).max(LIMITS.searchPage).default(10).describe(t.search.limit),
        offset: z.number().int().min(0).max(LIMITS.searchOffset).default(0).describe(t.search.offset),
        response_format: format.describe(t.search.format),
      }),
      annotations: { title: t.search.title, ...READ_ONLY },
    },
    async (a) =>
      guard(async () => {
        const args = { query: a.query, limit: a.limit, offset: a.offset, ...(a.category ? { category: a.category } : {}), ...(a.subcategory ? { subcategory: a.subcategory } : {}) };
        return reply(await searchMaterials(ctx, args), a.response_format, renderSearch);
      }),
  );

  server.registerTool(
    t.get.name,
    {
      title: t.get.title,
      description: t.get.description,
      inputSchema: z.strictObject({
        ids: z.array(ID).min(1).max(LIMITS.ids).describe(t.get.ids),
        response_format: format.describe(t.get.format),
      }),
      annotations: { title: t.get.title, ...READ_ONLY },
    },
    async (a) => guard(async () => reply(await getMaterials(ctx, a.ids), a.response_format, renderDetails)),
  );

  server.registerTool(
    t.browse.name,
    {
      title: t.browse.title,
      description: t.browse.description,
      inputSchema: z.strictObject({
        category: z.enum(CATEGORY_ORDER).nullish().describe(t.browse.category),
        subcategory: SUB_ID.nullish().describe(t.browse.subcategory),
        sort: z.enum(SORTS).default('popular').describe(t.browse.sort),
        limit: z.number().int().min(1).max(LIMITS.browsePage).default(15).describe(t.browse.limit),
        offset: z.number().int().min(0).max(100_000).default(0).describe(t.browse.offset),
        response_format: format.describe(t.browse.format),
      }),
      annotations: { title: t.browse.title, ...READ_ONLY },
    },
    async (a) =>
      guard(async () => {
        const r = await browse(ctx, { sort: a.sort, limit: a.limit, offset: a.offset, ...(a.category ? { category: a.category } : {}), ...(a.subcategory ? { subcategory: a.subcategory } : {}) });
        if ('categories' in r) return reply(r, a.response_format, renderOverview);
        if ('subcategories' in r) return reply(r, a.response_format, renderCategory);
        return reply(r, a.response_format, renderSubList);
      }),
  );

  server.registerTool(
    t.kits.name,
    {
      title: t.kits.title,
      description: t.kits.description,
      inputSchema: z.strictObject({
        kit_id: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).nullish().describe(t.kits.kitId),
        response_format: format.describe(t.kits.format),
      }),
      annotations: { title: t.kits.title, ...READ_ONLY },
    },
    async (a) =>
      guard(async () => {
        const r = await getKits(ctx, a.kit_id ?? undefined);
        return 'kits' in r ? reply(r, a.response_format, renderKits) : reply(r, a.response_format, renderKit);
      }),
  );

  server.registerTool(
    t.cart.name,
    {
      title: t.cart.title,
      description: fillText(t.cart.description, { site: ctx.site }),
      inputSchema: z.strictObject({
        share: z.string().min(3).max(LIMITS.share).describe(t.cart.share),
        offset: z.number().int().min(0).max(300).default(0).describe(t.cart.offset),
        limit: z.number().int().min(1).max(LIMITS.cartPage).default(LIMITS.cartPage).describe(t.cart.limit),
        response_format: format.describe(t.cart.format),
      }),
      annotations: { title: t.cart.title, ...READ_ONLY },
    },
    async (a) => guard(async () => reply(await openCart(ctx, { share: a.share, offset: a.offset, limit: a.limit }), a.response_format, renderCart)),
  );

  server.registerPrompt(
    MCP_PROMPT.name,
    {
      title: MCP_PROMPT.title,
      description: MCP_PROMPT.description,
      argsSchema: z.object({ app: z.string().min(1).max(500).describe(MCP_PROMPT.arg) }),
    },
    ({ app }) => ({
      messages: [{ role: 'user', content: { type: 'text', text: fillText(MCP_PROMPT.text, { app: app.replace(/\s+/g, ' ').trim() }) } }],
    }),
  );

  return server;
}

// ── HTTP 앞단: CORS·본문 크기·요청 수·집계 ──────────────────────────────

/** 브라우저 MCP 도구가 미리 묻는 머리글. 새 판(2026-07-28)은 Mcp-Method·Mcp-Name·Mcp-Wire-Codec도 보낸다 */
const ALLOW_HEADERS = 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Wire-Codec, Last-Event-ID';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': ALLOW_HEADERS,
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

function withCors(res: Response, allowHeaders?: string): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  if (allowHeaders) out.headers.set('Access-Control-Allow-Headers', allowHeaders);
  // 흐름 응답(SSE)은 SDK가 정한 no-cache·no-transform을 지킨다
  if (!out.headers.has('Cache-Control')) out.headers.set('Cache-Control', 'no-store');
  return out;
}

function jsonRpcError(status: number, code: number, message: string, id: unknown = null, extra: Record<string, string> = {}): Response {
  const safeId = typeof id === 'string' || typeof id === 'number' ? id : null;
  return withCors(new Response(JSON.stringify({ jsonrpc: '2.0', id: safeId, error: { code, message } }), { status, headers: { 'Content-Type': 'application/json', ...extra } }));
}

/** 미리 묻는 머리글 이름 목록을 그대로 돌려준다 (글자 꼴이 맞을 때만, 아니면 정해 둔 목록) */
function preflightHeaders(request: Request): string {
  const asked = request.headers.get('Access-Control-Request-Headers') ?? '';
  return /^[A-Za-z0-9-]+(\s*,\s*[A-Za-z0-9-]+)*$/.test(asked) && asked.length <= 1_000 ? asked : ALLOW_HEADERS;
}

/**
 * 요청 수 열쇠: IPv6은 앞 64비트(한 집·한 회선이 뒤 64비트를 바꿔 가며 피하지 못하게), IPv4는 그대로.
 * 줄여 쓴 주소(2001:db8::1)는 여덟 칸으로 펴서 자른다. IPv4를 담은 IPv6(::ffff:203.0.113.9)은 IPv4로 본다
 */
export function rateKey(ip: string): string {
  if (!ip.includes(':')) return ip;
  const v4 = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
  if (v4?.[1]) return v4[1];
  const [head = '', tail] = ip.toLowerCase().split('::');
  const a = head === '' ? [] : head.split(':');
  const b = tail === undefined || tail === '' ? [] : tail.split(':');
  const zeros = tail === undefined ? [] : Array.from({ length: Math.max(0, 8 - a.length - b.length) }, () => '0');
  const groups = [...a, ...zeros, ...b].slice(0, 4).map((g) => g.replace(/^0+(?=.)/, ''));
  return `${groups.join(':')}::/64`;
}

/** 한 isolate 안의 1분 창 요청 수 (접속 주소별). 메모리에만 두고, 1분이 지난 창은 다음 요청 때 지운다 */
const windows = new Map<string, { start: number; n: number }>();
let swept = 0;

function sweep(now: number): void {
  for (const [k, w] of windows) if (now - w.start >= 60_000) windows.delete(k);
  // 그래도 너무 많으면(주소를 계속 바꾸는 요청) 오래된 창부터 지운다. 모두 지우지 않아 다른 이용자의 수가 되살아나지 않는다
  for (const k of windows.keys()) {
    if (windows.size <= 4_000) break;
    windows.delete(k);
  }
  swept = now;
}

export function allowRequest(key: string, now: number, limit = RATE_PER_MINUTE): boolean {
  if (now - swept >= 60_000 || windows.size > 5_000) sweep(now);
  const w = windows.get(key);
  if (!w || now - w.start >= 60_000) {
    windows.delete(key);
    windows.set(key, { start: now, n: 1 });
    return true;
  }
  w.n += 1;
  return w.n <= limit;
}

export function resetRateWindows(): void {
  windows.clear();
  swept = 0;
}

/** 시험: 지금 메모리에 남은 요청 수 창 개수 */
export function rateWindowCount(): number {
  return windows.size;
}

const UPSERT =
  'INSERT INTO daily_events (day, type, bucket, count) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (day, type, bucket) DO UPDATE SET count = count + ?4';
/** 집계는 isolate 안에 모았다가 1분에 한 번(또는 50건마다) 쓴다: 많이 불려도 D1 무료 쓰기 한도(하루 10만 줄)를 사이트 방문 수와 나눠 쓴다 */
const FLUSH_MS = 60_000;
const FLUSH_MAX = 50;
const pending = new Map<string, number>();
let pendingTotal = 0;
let flushed = 0;

function addCounts(body: unknown, now: number): boolean {
  const counts = countsOf(body);
  for (const c of counts) {
    const key = `${utcDay(now)}|${c.type}|${c.bucket}`;
    pending.set(key, (pending.get(key) ?? 0) + 1);
    pendingTotal += 1;
  }
  return counts.length > 0 && (now - flushed >= FLUSH_MS || pendingTotal >= FLUSH_MAX);
}

async function flushCounts(db: McpEnv['DB']): Promise<void> {
  const rows = [...pending];
  pending.clear();
  pendingTotal = 0;
  if (!db) return;
  try {
    for (const [key, n] of rows) {
      const [day, type, bucket] = key.split('|');
      await db.prepare(UPSERT).bind(day, type, bucket, n).run();
    }
  } catch {
    // 하루 한도를 넘었거나 저장소가 잠시 안 되면 그 집계만 빠진다
  }
}

/** 시험: 모아 둔 집계를 비운다 */
export function resetCounts(): void {
  pending.clear();
  pendingTotal = 0;
  flushed = 0;
}

/** 사람이 브라우저로 /mcp를 열면 연결 안내 쪽으로 보낸다 */
function wantsPage(request: Request): boolean {
  const accept = request.headers.get('Accept') ?? '';
  return request.method === 'GET' && accept.includes('text/html') && !accept.includes('text/event-stream');
}

/** 이 서버는 알림을 보내지 않는다: 바뀜 구독(subscriptions/listen)을 열면 쓸모없는 흐름이 isolate에 남는다 */
const REFUSED_METHODS = new Set(['subscriptions/listen']);

const handlers = new WeakMap<object, ReturnType<typeof createMcpHandler>>();

function handlerFor(env: McpEnv): ReturnType<typeof createMcpHandler> {
  let h = handlers.get(env);
  if (!h) {
    h = createMcpHandler(
      ({ requestInfo }) => {
        const origin = requestInfo ? new URL(requestInfo.url).origin : '';
        return createCodeitsoServer({ load: assetsLoader(env, origin), site: origin });
      },
      { maxRequestBodySize: MCP_BODY_MAX, maxSubscriptions: 1 },
    );
    handlers.set(env, h);
  }
  return h;
}

export async function handleMcp(request: Request, env: McpEnv, waitUntil: (p: Promise<unknown>) => void, now: number): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== FILES.mcp) return withCors(new Response(null, { status: 404 }));
  if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), preflightHeaders(request));
  if (wantsPage(request)) return Response.redirect(`${url.origin}${ROUTES.connect}`, 302);

  const who = rateKey(request.headers.get('CF-Connecting-IP') ?? 'local');
  if (!allowRequest(who, now)) return jsonRpcError(429, -32000, MCP_ERRORS.rate, null, { 'Retry-After': '60' });

  if (request.method !== 'POST') return withCors(await handlerFor(env).fetch(request));
  const text = await readLimited(request, MCP_BODY_MAX);
  if (text === null) return jsonRpcError(413, -32600, 'Request body too large.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return jsonRpcError(400, -32700, 'Parse error: the body is not JSON.');
  }
  // 묶음 요청(2025-06-18 판부터 규격에서 빠졌다)은 받지 않는다: 한 요청이 도구 호출 100번이 되어 요청 수 제한·CPU 계산을 비켜 간다
  if (Array.isArray(body)) return jsonRpcError(400, -32600, 'Batch requests are not supported. Send one JSON-RPC message per request.');
  const msg = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (typeof msg['method'] === 'string' && REFUSED_METHODS.has(msg['method'])) {
    return jsonRpcError(200, -32601, `Method not supported by this server: ${msg['method']}`, msg['id']);
  }
  const res = withCors(await handlerFor(env).fetch(request, { parsedBody: body }));
  // 처리가 성공한 단건 요청만 센다 (SDK가 거절한 요청·알림은 세지 않는다)
  const isJson = (request.headers.get('Content-Type') ?? '').includes('application/json');
  if (res.ok && isJson && addCounts(body, now)) {
    flushed = now;
    waitUntil(flushCounts(env.DB));
  }
  return res;
}
