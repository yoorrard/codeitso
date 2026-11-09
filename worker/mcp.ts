// 원격 MCP 서버 (D154): POST /mcp, 공식 SDK(@modelcontextprotocol/server)의 무상태 Streamable HTTP.
// 도구 다섯 개와 프롬프트 하나는 모두 읽기 전용이고, 진열대 빌드가 만든 정적 JSON(env.ASSETS)만 읽는다. 바깥 사이트에 묻지 않는다.
// 무료 Worker 한도 안에 두려고: 본문 64KB까지, 한 isolate 안에서 같은 접속 주소의 분당 요청 수를 묶고, 읽은 JSON은 isolate 메모리에 잠깐 둔다.
// 세는 것은 도구 이름·앱 종류뿐(src/lib/mcp/count.ts). 검색어·재료 id·장바구니 링크·IP는 적지 않는다(observability도 꺼 둔다).
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { MCP_ERRORS, MCP_INSTRUCTIONS, MCP_PROMPT, MCP_SERVER, MCP_TOOLS } from '../src/copy/mcp.ts';
import { CATEGORY_ORDER, SORTS } from '../src/lib/catalog/types.ts';
import { utcDay } from '../src/lib/event-spec.ts';
import { countsOf } from '../src/lib/mcp/count.ts';
import { renderCart, renderCategory, renderDetails, renderKit, renderKits, renderOverview, renderSearch, renderSubList } from '../src/lib/mcp/render.ts';
import { fillText } from '../src/lib/mcp/text.ts';
import type { Loader, ToolContext } from '../src/lib/mcp/tools.ts';
import { LIMITS, ToolError, browse, getKits, getMaterials, openCart, searchMaterials } from '../src/lib/mcp/tools.ts';
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

function remember(path: string, value: unknown, size: number): void {
  if (size > CACHE_CHARS / 4) return;
  cache.set(path, { value, size });
  cached += size;
  for (const [k, v] of cache) {
    if (cached <= CACHE_CHARS) break;
    cache.delete(k);
    cached -= v.size;
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
    },
  };
}

/** 시험에서 캐시를 비운다 */
export function clearMcpCache(): void {
  cache.clear();
  cached = 0;
}

// ── 서버 (요청마다 새로 만든다: SDK v2의 무상태 방식) ─────────────────────

const FORMATS = ['markdown', 'json'] as const;
type Format = (typeof FORMATS)[number];
const format = z.enum(FORMATS).default('markdown');
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const ID = z.string().min(3).max(200).regex(/^[^\s<>"]+$/);
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
        category: z.enum(CATEGORY_ORDER).optional().describe(t.search.category),
        subcategory: SUB_ID.optional().describe(t.search.subcategory),
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
        category: z.enum(CATEGORY_ORDER).optional().describe(t.browse.category),
        subcategory: SUB_ID.optional().describe(t.browse.subcategory),
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
        kit_id: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional().describe(t.kits.kitId),
        response_format: format.describe(t.kits.format),
      }),
      annotations: { title: t.kits.title, ...READ_ONLY },
    },
    async (a) =>
      guard(async () => {
        const r = await getKits(ctx, a.kit_id);
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

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

function withCors(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  out.headers.set('Cache-Control', 'no-store');
  return out;
}

function jsonRpcError(status: number, code: number, message: string, extra: Record<string, string> = {}): Response {
  return withCors(new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code, message } }), { status, headers: { 'Content-Type': 'application/json', ...extra } }));
}

/** 한 isolate 안의 1분 창 요청 수 (접속 주소별). 메모리에만, 1분 뒤 버린다 */
const windows = new Map<string, { start: number; n: number }>();

export function allowRequest(key: string, now: number, limit = RATE_PER_MINUTE): boolean {
  const w = windows.get(key);
  if (!w || now - w.start >= 60_000) {
    if (windows.size > 5_000) windows.clear();
    windows.set(key, { start: now, n: 1 });
    return true;
  }
  w.n += 1;
  return w.n <= limit;
}

export function resetRateWindows(): void {
  windows.clear();
}

async function readBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get('Content-Length') ?? '0') > MCP_BODY_MAX) return null;
  const text = await request.text();
  return new TextEncoder().encode(text).length > MCP_BODY_MAX ? null : text;
}

const UPSERT =
  'INSERT INTO daily_events (day, type, bucket, count) VALUES (?1, ?2, ?3, 1) ON CONFLICT (day, type, bucket) DO UPDATE SET count = count + 1';

async function record(db: McpEnv['DB'], body: unknown, now: number): Promise<void> {
  if (!db) return;
  const counts = countsOf(body);
  try {
    for (const c of counts) await db.prepare(UPSERT).bind(utcDay(now), c.type, c.bucket).run();
  } catch {
    // 하루 한도를 넘었거나 저장소가 잠시 안 되면 그날 집계만 빠진다
  }
}

/** 사람이 브라우저로 /mcp를 열면 연결 안내 쪽으로 보낸다 */
function wantsPage(request: Request): boolean {
  const accept = request.headers.get('Accept') ?? '';
  return request.method === 'GET' && accept.includes('text/html') && !accept.includes('text/event-stream');
}

const handlers = new WeakMap<object, ReturnType<typeof createMcpHandler>>();

function handlerFor(env: McpEnv): ReturnType<typeof createMcpHandler> {
  let h = handlers.get(env);
  if (!h) {
    h = createMcpHandler(
      ({ requestInfo }) => {
        const origin = requestInfo ? new URL(requestInfo.url).origin : '';
        return createCodeitsoServer({ load: assetsLoader(env, origin), site: origin });
      },
      { maxRequestBodySize: MCP_BODY_MAX },
    );
    handlers.set(env, h);
  }
  return h;
}

export async function handleMcp(request: Request, env: McpEnv, waitUntil: (p: Promise<unknown>) => void, now: number): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== FILES.mcp) return withCors(new Response(null, { status: 404 }));
  if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }));
  if (wantsPage(request)) return Response.redirect(`${url.origin}${ROUTES.connect}`, 302);

  const who = request.headers.get('CF-Connecting-IP') ?? 'local';
  if (!allowRequest(who, now)) return jsonRpcError(429, -32000, MCP_ERRORS.rate, { 'Retry-After': '60' });

  if (request.method !== 'POST') return withCors(await handlerFor(env).fetch(request));
  const text = await readBody(request);
  if (text === null) return jsonRpcError(413, -32600, 'Request body too large.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return jsonRpcError(400, -32700, 'Parse error: the body is not JSON.');
  }
  waitUntil(record(env.DB, body, now));
  return withCors(await handlerFor(env).fetch(request, { parsedBody: body }));
}
