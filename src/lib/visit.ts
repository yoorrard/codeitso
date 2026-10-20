// 바닥글 방문 수 (D134): 이 브라우저가 오늘(한국 날짜) 처음 왔으면 익명 방문 1을 보내고, 오늘·누적 숫자를 받아 온다.
// 보내는 것은 {"t":"visit"} 한 줄뿐이고, 하루 한 번인지는 이 브라우저의 cc:meta:v1.sent에만 적는다(쿠키·식별자 없음).
import { kstDay } from './event-spec.ts';
import { FILES } from './routes.ts';
import { HOST } from './stage.ts';
import { rememberSent } from './store.ts';

export interface VisitStats {
  today: number;
  total: number;
}



/** 서버가 준 값이 숫자 둘인지 본다 */
export function readStats(raw: unknown): VisitStats | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { today, total } = raw as Record<string, unknown>;
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  return ok(today) && ok(total) ? { today, total } : null;
}

/**
 * 오늘·누적 방문 수. 이 브라우저가 오늘(한국 날짜) 처음 왔으면 방문 1을 보내고 센 뒤의 숫자를 그 답으로 받는다(자기 방문까지 포함).
 * 이미 셌으면 GET /api/stats. 받을 곳이 없거나(정적 호스트·개발 서버) 실패하면 null이고 바닥글은 아무것도 보이지 않는다.
 */
export async function visitStats(now: number): Promise<VisitStats | null> {
  if (HOST === 'static') return null;
  try {
    const first = rememberSent(`visit:${kstDay(now)}`);
    const res = first
      ? await fetch(FILES.event, { method: 'POST', body: '{"t":"visit"}', keepalive: true })
      : await fetch(FILES.stats, { headers: { Accept: 'application/json' } });
    return res.status === 200 ? readStats(await res.json()) : null;
  } catch {
    return null;
  }
}
