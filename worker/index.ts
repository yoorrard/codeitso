// 익명 집계 Worker (docs/ARCHITECTURE.md 8·9절, R-60). /api/*만 이 함수를 먼저 거치고, 나머지는 정적 파일이 바로 나간다.
// 받는 것은 POST /api/event: 같은 사이트에서 온 요청, 200바이트 이하 본문, 정해진 이벤트·구간만. 받으면 그날 횟수를 1 늘리고 204.
// 주는 것은 GET /api/stats: 오늘(한국 날짜)과 누적 방문 수 두 숫자 (D134, 바닥글). 두 줄만 읽는다.
// IP·기기 정보·쿠키는 읽지도 적지도 않는다. 저장이 실패해도(하루 한도 등) 204로 끝낸다 (사이트는 정적이라 영향 없음).
// Env(DB·ASSETS 묶음)의 타입은 wrangler.jsonc에서 만든다: npm run typecheck:worker (worker-configuration.d.ts, 저장소에 두지 않음)
import { BODY_MAX, VISIT_TOTAL, dayKey, kstDay, parseEvent } from '../src/lib/event-spec.ts';

const UPSERT =
  'INSERT INTO daily_events (day, type, bucket, count) VALUES (?1, ?2, ?3, 1) ON CONFLICT (day, type, bucket) DO UPDATE SET count = count + 1';

function empty(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

/** 같은 사이트의 페이지가 보낸 요청인가. 브라우저가 붙이는 Sec-Fetch-Site를 먼저 보고, 없으면 Origin을 본다 */
function sameSite(request: Request): boolean {
  const site = request.headers.get('Sec-Fetch-Site');
  if (site !== null) return site === 'same-origin';
  const origin = request.headers.get('Origin');
  return origin !== null && origin === new URL(request.url).origin;
}

/** 본문을 limit 바이트까지만 읽는다. 넘으면 null (길이를 밝히지 않은 큰 본문도 끝까지 읽지 않는다) */
async function readLimited(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

export async function handleEvent(request: Request, env: Pick<Env, 'DB'>, now: number): Promise<Response> {
  if (new URL(request.url).pathname !== '/api/event') return empty(404);
  if (request.method !== 'POST') return empty(405, { Allow: 'POST' });
  if (!sameSite(request)) return empty(403);
  if (Number(request.headers.get('Content-Length') ?? '0') > BODY_MAX) return empty(413);
  const body = await readLimited(request, BODY_MAX);
  if (body === null) return empty(413);
  const event = parseEvent(body);
  if (!event) return empty(400);
  try {
    await env.DB.prepare(UPSERT).bind(dayKey(event.type, now), event.type, event.bucket).run();
    if (event.type === 'visit') {
      await env.DB.prepare(UPSERT).bind(VISIT_TOTAL.day, VISIT_TOTAL.type, VISIT_TOTAL.bucket).run();
      // 방문은 센 뒤의 숫자를 바로 돌려준다: 처음 온 사람의 바닥글이 자기 방문까지 센 숫자를 보이게 (D134)
      return statsResponse(await readStats(env, now), 'no-store');
    }
  } catch {
    // 하루 한도를 넘었거나 저장소가 잠시 안 되면 그날 집계만 빠진다
  }
  return empty(204);
}

const STATS =
  "SELECT day, count FROM daily_events WHERE (day = ?1 AND type = 'visit' AND bucket = '') OR (day = 'all' AND type = 'visit_total' AND bucket = '')";

async function readStats(env: Pick<Env, 'DB'>, now: number): Promise<{ today: number; total: number }> {
  const { results } = await env.DB.prepare(STATS).bind(kstDay(now)).all<{ day: string; count: number }>();
  return {
    today: results.find((r) => r.day !== VISIT_TOTAL.day)?.count ?? 0,
    total: results.find((r) => r.day === VISIT_TOTAL.day)?.count ?? 0,
  };
}

function statsResponse(stats: { today: number; total: number }, cache: string): Response {
  return new Response(JSON.stringify(stats), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache } });
}

/** GET /api/stats: { today, total } 방문 수. 기본 키로 두 줄만 읽고, 브라우저는 60초 동안 다시 묻지 않는다 */
export async function handleStats(request: Request, env: Pick<Env, 'DB'>, now: number): Promise<Response> {
  if (request.method !== 'GET') return empty(405, { Allow: 'GET' });
  try {
    return statsResponse(await readStats(env, now), 'public, max-age=60');
  } catch {
    return empty(503);
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/stats') return handleStats(request, env, Date.now());
    if (path.startsWith('/api/')) return handleEvent(request, env, Date.now());
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
