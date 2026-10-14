// 집계 Worker: 같은 사이트·작은 본문·정해진 이벤트만 그날 횟수를 1 늘린다. 나머지는 버린다. 저장이 실패해도 204.
import { describe, expect, it } from 'vitest';
import { handleEvent } from '../../worker/index.ts';

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
    const r = await run(post('{"t":"card_copy","b":"first"}'));
    expect(r.status).toBe(204);
    expect(r.calls).toHaveLength(1);
    expect(r.calls[0]?.args).toEqual(['2026-10-12', 'card_copy', 'first']);
    expect(r.calls[0]?.sql).toContain('ON CONFLICT (day, type, bucket) DO UPDATE SET count = count + 1');
  });
  it('Sec-Fetch-Site가 없으면 Origin이 같을 때만', async () => {
    expect((await run(post('{"t":"interview_start"}', { Origin: SITE }))).status).toBe(204);
    expect((await run(post('{"t":"interview_start"}', { Origin: 'https://evil.example' }))).calls).toHaveLength(0);
    expect((await run(post('{"t":"interview_start"}', {}))).status).toBe(403);
  });
  it('다른 사이트에서 온 요청은 버린다', async () => {
    const r = await run(post('{"t":"interview_start"}', { 'Sec-Fetch-Site': 'cross-site', Origin: SITE }));
    expect(r.status).toBe(403);
    expect(r.calls).toHaveLength(0);
  });
  it('목록에 없는 이벤트·구간은 버린다', async () => {
    expect((await run(post('{"t":"page_view"}'))).status).toBe(400);
    expect((await run(post('{"t":"card_copy","b":"secret"}'))).calls).toHaveLength(0);
  });
  it('200바이트 넘는 본문은 읽지 않고 버린다 (길이를 밝히지 않아도)', async () => {
    const big = `{"t":"interview_start","x":"${'a'.repeat(300)}"}`;
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
    expect((await run(post('{"t":"interview_start"}', undefined, '/api/other'))).status).toBe(404);
  });
  it('저장이 실패해도 204 (그날 집계만 빠진다)', async () => {
    expect((await run(post('{"t":"quiz_answer","b":"ok"}'), true)).status).toBe(204);
  });
});
