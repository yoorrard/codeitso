// 집계 Worker: 같은 사이트·작은 본문·정해진 이벤트만 그날 횟수를 1 늘린다. 나머지는 버린다. 저장이 실패해도 204.
import { describe, expect, it } from 'vitest';
import { handleEvent, handleStats } from '../../worker/index.ts';

interface Call {
  sql: string;
  args: unknown[];
}

function fakeDb(fail = false): { db: { prepare: (sql: string) => { bind: (...a: unknown[]) => { run: () => Promise<unknown> } } }; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    db: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          run: async () => {
            if (fail) throw new Error('D1 한도');
            calls.push({ sql, args });
            return {};
          },
        }),
      }),
    },
  };
}

const SITE = 'https://chauffeur.example';
const NOW = Date.UTC(2026, 9, 12, 3, 0);

function post(body: BodyInit | null, headers: Record<string, string> = { 'Sec-Fetch-Site': 'same-origin' }, path = '/api/event'): Request {
  return new Request(`${SITE}${path}`, { method: 'POST', body, headers });
}

async function run(req: Request, fail = false): Promise<{ status: number; calls: Call[] }> {
  const { db, calls } = fakeDb(fail);
  // 시험용 가짜 D1은 쓰는 메서드(prepare·bind·run)만 흉내 낸다
  const res = await handleEvent(req, { DB: db as unknown as Parameters<typeof handleEvent>[1]['DB'] }, NOW);
  return { status: res.status, calls };
}

describe('POST /api/event', () => {
  it('정해진 이벤트를 그날·이벤트·구간 한 줄로 센다', async () => {
    const r = await run(post('{"t":"cart_add","b":"api"}'));
    expect(r.status).toBe(204);
    expect(r.calls).toHaveLength(1);
    expect(r.calls[0]?.args).toEqual(['2026-10-12', 'cart_add', 'api']);
    expect(r.calls[0]?.sql).toContain('ON CONFLICT (day, type, bucket) DO UPDATE SET count = count + 1');
  });
  it('Sec-Fetch-Site가 없으면 Origin이 같을 때만', async () => {
    expect((await run(post('{"t":"md_download"}', { Origin: SITE }))).status).toBe(204);
    expect((await run(post('{"t":"md_download"}', { Origin: 'https://evil.example' }))).calls).toHaveLength(0);
    expect((await run(post('{"t":"md_download"}', {}))).status).toBe(403);
  });
  it('다른 사이트에서 온 요청은 버린다', async () => {
    const r = await run(post('{"t":"md_download"}', { 'Sec-Fetch-Site': 'cross-site', Origin: SITE }));
    expect(r.status).toBe(403);
    expect(r.calls).toHaveLength(0);
  });
  it('목록에 없는 이벤트·구간은 버린다', async () => {
    expect((await run(post('{"t":"page_view"}'))).status).toBe(400);
    expect((await run(post('{"t":"cart_add","b":"secret"}'))).calls).toHaveLength(0);
  });
  it('200바이트 넘는 본문은 읽지 않고 버린다 (길이를 밝히지 않아도)', async () => {
    const big = `{"t":"md_download","x":"${'a'.repeat(300)}"}`;
    expect((await run(post(big))).status).toBe(413);
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < 10; i++) c.enqueue(new TextEncoder().encode('a'.repeat(50)));
        c.close();
      },
    });
    const req = new Request(`${SITE}/api/event`, { method: 'POST', body: stream, headers: { 'Sec-Fetch-Site': 'same-origin' }, duplex: 'half' } as RequestInit);
    const r = await run(req);
    expect(r.status).toBe(413);
    expect(r.calls).toHaveLength(0);
  });
  it('POST가 아니거나 다른 주소면 받지 않는다', async () => {
    expect((await run(new Request(`${SITE}/api/event`))).status).toBe(405);
    expect((await run(post('{"t":"md_download"}', undefined, '/api/other'))).status).toBe(404);
  });
  it('저장이 실패해도 204 (그날 집계만 빠진다)', async () => {
    expect((await run(post('{"t":"checkout","b":"n04-06"}'), true)).status).toBe(204);
  });
});

describe('방문 수 (D134)', () => {
  it('방문은 한국 날짜 줄과 누적 줄을 함께 1 늘린다 (센 뒤 숫자를 읽지 못하면 204)', async () => {
    const r = await run(post('{"t":"visit"}'));
    expect(r.status).toBe(204);
    expect(r.calls.map((c) => c.args)).toEqual([
      ['2026-10-12', 'visit', ''],
      ['all', 'visit_total', ''],
    ]);
  });

  function statsDb(rows: { day: string; count: number }[] | Error): Parameters<typeof handleStats>[1]['DB'] {
    // 시험용 가짜 D1: prepare·bind·all만 흉내 낸다
    return {
      prepare: () => ({
        bind: () => ({
          all: async () => {
            if (rows instanceof Error) throw rows;
            return { results: rows };
          },
        }),
      }),
    } as unknown as Parameters<typeof handleStats>[1]['DB'];
  }

  it('GET /api/stats는 오늘(한국 날짜)과 누적 방문 수를 준다 (60초 캐시)', async () => {
    const res = await handleStats(new Request(`${SITE}/api/stats`), { DB: statsDb([{ day: '2026-10-12', count: 5 }, { day: 'all', count: 120 }]) }, NOW);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ today: 5, total: 120 });
    expect(res.headers.get('Cache-Control')).toContain('max-age=60');
  });

  it('처음 방문은 센 뒤의 숫자를 바로 돌려준다 (자기 방문 포함, 캐시하지 않음)', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({}),
          all: async () => ({ results: [{ day: '2026-10-12', count: 1 }, { day: 'all', count: 7 }] }),
        }),
      }),
    } as unknown as Parameters<typeof handleEvent>[1]['DB'];
    const res = await handleEvent(post('{"t":"visit"}'), { DB: db }, NOW);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ today: 1, total: 7 });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('줄이 없으면 0, 저장소가 안 되면 503, GET이 아니면 405', async () => {
    expect(await (await handleStats(new Request(`${SITE}/api/stats`), { DB: statsDb([]) }, NOW)).json()).toEqual({ today: 0, total: 0 });
    expect((await handleStats(new Request(`${SITE}/api/stats`), { DB: statsDb(new Error('D1')) }, NOW)).status).toBe(503);
    expect((await handleStats(new Request(`${SITE}/api/stats`, { method: 'POST' }), { DB: statsDb([]) }, NOW)).status).toBe(405);
  });
});
