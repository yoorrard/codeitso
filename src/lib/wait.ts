// 기다림 표시 (U, D148): 진열대 JSON을 받는 동안 내용 모양의 뼈대(skeleton)를 보인다.
// - 늦게 보인다: 뼈대 묶음(.sk-set, 목록의 카드 덮개)은 --dur-wait(200ms) 뒤에 나타난다(CSS animation-delay). 그 안에 오면 아무것도 깜박이지 않는다
//   (Nielsen 0.1초·1초 한계, '로딩 표시 늦추기' 관례: Learning Equality 300ms·Productboard 300ms·spin-delay 같은 늦춤 + 최소 시간).
// - 보였으면 잠깐은 머문다: 뼈대가 나타난 바로 뒤에 내용이 오면 번쩍이므로, 나타난 때부터 HOLD_MS는 지킨다 (이 파일의 useHeld).
// 자리는 처음부터 잡는다: 뼈대는 늦게 '보일' 뿐 처음부터 같은 크기로 그려져 있어 내용이 들어와도 아래가 밀리지 않는다.
import { useEffect, useRef, useState } from 'preact/hooks';

/** 뼈대를 보이기 전 기다림 (ms). tokens.css --dur-wait와 같다 */
export const WAIT_MS = 200;
/** 한 번 보인 뼈대가 머무는 가장 짧은 시간 (ms) */
export const HOLD_MS = 300;

/**
 * 기다림이 끝났을 때 뼈대를 더 붙잡아 둘 시간 (ms). 순수 함수 (시험: tests/lib/wait.test.ts).
 * 뼈대가 아직 안 보였으면(WAIT_MS 안에 끝남) 0, 보였으면 보인 때부터 HOLD_MS가 지날 때까지.
 */
export function holdLeft(startedAt: number, now: number): number {
  const shownAt = startedAt + WAIT_MS;
  if (now < shownAt) return 0;
  return Math.max(0, shownAt + HOLD_MS - now);
}

/** busy가 끝나도 뼈대가 보였으면 잠깐 붙잡아 둔 값. 섬은 이 값이 참인 동안 뼈대(또는 aria-busy)를 그린다 */
export function useHeld(busy: boolean): boolean {
  const [held, setHeld] = useState(busy);
  const since = useRef(busy && typeof performance !== 'undefined' ? performance.now() : 0);
  useEffect(() => {
    if (busy) {
      since.current = performance.now();
      setHeld(true);
      return;
    }
    const left = holdLeft(since.current, performance.now());
    if (left === 0) {
      setHeld(false);
      return;
    }
    const t = window.setTimeout(() => setHeld(false), left);
    return () => window.clearTimeout(t);
  }, [busy]);
  return busy || held;
}
