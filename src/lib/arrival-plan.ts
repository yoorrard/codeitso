// 출발 → 도착 장면 S5+S6의 시간표 (brief 7절, D71 W5b·검토 반영). 순수 함수: 길이 토큰 값을 읽는 함수(d)를 받아 ms를 돌려준다.
// 화면은 dur()를, 시험은 tokens.css의 값을 넘긴다 (tests/lib/scene-times.test.ts가 상한을 잰다).
//   0~night 밤 주행 모드 → night~go 카메라가 출발부터 지나온 길을 훑는다(차는 도구끼리 맞춰 보기에서 선 자리에 그대로)
//   → go~arrive 차가 남은 길을 한 번에 달려 빈 터 앞에 선다(남은 길 몫 × --dur-drive, --dur-hop보다 짧지 않게)
//   → arrive 전조등 두 번 깜빡임(--dur-blink) · 윤곽 실선·두루마리·깃발(--dur-settle) → day 낮으로·기울기 풀림(--dur-settle)
//   → sheet 시트 올라옴(--dur-sheet, 출력 직전에 끝남) → print 영수증 출력(--dur-print) → stamp 도장(--dur-stamp, 출력과 함께 끝남) = end
// 빈 터에 닿는 때(arrive)는 남은 길과 상관없이 늘 같아서, 영수증 섬이 지도 모형 없이도 출력 시작(print)을 안다.
import type { DurToken } from './motion.ts';

export interface ArrivalPlan {
  /** 밤 주행 모드가 다 켜지는 때 (카메라가 지나온 길을 훑기 시작한다) */
  night: number;
  /** 차가 떠나는 때 (그 전에는 카메라만 움직인다) */
  go: number;
  /** 빈 터 앞에 서는 때: 전조등 깜빡임, 윤곽 실선·두루마리·깃발 시작 */
  arrive: number;
  /** 지도가 낮으로 돌아오기 시작하는 때 (기울기도 풀린다) */
  day: number;
  /** 시트가 올라오기 시작하는 때 */
  sheet: number;
  /** 영수증 출력 시작 (종이가 화면에 보이면) */
  print: number;
  /** 도장 시작 */
  stamp: number;
  /** 장면 끝 (출력과 도장이 함께 끝난다) */
  end: number;
}

/**
 * share: 차가 달릴 남은 길(도구끼리 맞춰 보기에서 선 자리 → 빈 터)이 길 전체에서 차지하는 몫(0~1).
 * 차는 길 전체를 --dur-drive에 달리는 빠르기로 남은 길만 달리되, 한 토막이라도 --dur-hop보다 짧게 달리지 않는다
 */
export function arrivalPlan(d: (t: DurToken) => number, share = 0): ArrivalPlan {
  const night = d('--dur-night');
  const drive = d('--dur-drive');
  const run = Math.min(drive, Math.max(d('--dur-hop'), drive * Math.min(1, Math.max(0, share))));
  const arrive = night + drive;
  const day = arrive + d('--dur-settle');
  const print = day + d('--dur-settle');
  const end = print + d('--dur-print');
  return { night, go: arrive - run, arrive, day, sheet: print - d('--dur-sheet'), print, stamp: end - d('--dur-stamp'), end };
}

/** 전조등이 낮춰 있을 때의 불투명도 (깜빡임은 이 값 ↔ 1) */
export const BLINK_DIM = 0.35;

/**
 * 전조등 깜빡임 (브랜드 서명 모션): 켜짐 · 꺼짐 · 켜짐을 3 : 2 : 3으로 (--dur-blink 320이면 120 · 80 · 120). 시작 시각(ms)과 켜짐 여부.
 * 앞에서는 낮춰 달리다 빈 터 앞에서 두 번 켜지므로 번쩍임은 두 번, 장면에서 한 번뿐이다 (1초에 3번 미만)
 */
export function blinkSteps(total: number): { at: number; on: boolean }[] {
  const on = (total * 3) / 8;
  return [
    { at: 0, on: true },
    { at: on, on: false },
    { at: total - on, on: true },
  ];
}
