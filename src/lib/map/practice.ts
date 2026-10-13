// 내 AI 써 보기의 연습 고리 (brief 6.4·7절 S8, D71): 출발 옆 작은 고리 하나와 점 셋(연습 셋). 지도 모형(model.ts)을 키우지 않으려고 따로 둔다.
// 고리(반지름 30)는 출발에서 올라가는 왼쪽 세로 길에 닿는다(가장 왼쪽 점 84,120이 그 길 위). 출발 표지·첫 마디·위 줄 길과 띄우려고
// 가운데를 (114, 120)에 두었다. 차는 그 닿는 곳에 위를 보고 서고,
// [다 했어요]를 누르면 시계 방향으로 한 바퀴 돌아 같은 자리·같은 방향으로 선다. 점 셋은 위·오른쪽·아래(차에서 시계 방향으로 연습 1·2·3).
import type { Pt } from './model.ts';
import { drive, dur, ease, reduced } from '../motion.ts';
import { runScene } from '../scene.ts';

const C: Pt = { x: 114, y: 120 };
const R = 30;

export const PRACTICE = {
  /** 고리 한 바퀴 (차의 offset-path): 가장 왼쪽 점에서 위로, 시계 방향 */
  d: `M${C.x - R} ${C.y}A${R} ${R} 0 1 1 ${C.x + R} ${C.y}A${R} ${R} 0 1 1 ${C.x - R} ${C.y}`,
  length: 2 * Math.PI * R,
  dots: [
    { x: C.x, y: C.y - R },
    { x: C.x + R, y: C.y },
    { x: C.x, y: C.y + R },
  ] as Pt[],
  /** 이름표 '연습' (왼쪽 끝 기준): 오른쪽 점(반지름 5)과 띄우고, 가운데 세로 길(x 216)에 닿지 않게 */
  label: { x: C.x + R + 12, y: C.y },
  /** 차: 고리가 출발 길에 닿는 곳, 위를 본다 */
  car: { x: C.x - R, y: C.y, angle: -90 },
} as const;

/**
 * S8 연습 한 바퀴: 차가 고리를 한 바퀴(--dur-loop, --ease-drive) → 고리 심이 청록으로 그려지고 점 셋이 남색으로 채워짐(--dur-pop).
 * 마친 모습(채운 고리·점)은 기본 틀이 html에 붙이는 data-lesson-done으로 CSS가 바로 그린다. 그래서 동작 줄이기면 아무것도 돌리지 않는다
 */
export function practiceScene(): void {
  const band = document.querySelector('.map-band.is-practice');
  if (!band || reduced()) return;
  // [다 했어요]는 연습 셋 아래 붙박이 막대에 있어, 누를 때 지도 띠는 보통 화면 위로 지나가 있다. 그때는 움직이지 않고 바로 마친 모습으로
  // 둔다 (S3·S9와 같은 규칙: 화면 밖에서 돌지 않는다). 맨 위로 굴리지 않는다: 확대해 읽던 사람이 읽던 자리를 잃는다 (D71 검토 반영)
  const box = band.getBoundingClientRect();
  if (box.bottom <= 0 || box.top >= window.innerHeight) return;
  const car = band.querySelector('.mb-car');
  const loop = car ? drive(car, PRACTICE.d, 0, PRACTICE.length, { dur: '--dur-loop' }) : null;
  const after = loop ? dur('--dur-loop') : 0;
  const timing = { duration: dur('--dur-pop'), delay: after, fill: 'backwards' as const };
  const ring = [...band.querySelectorAll('.mb-ring path')].map((p) =>
    p.animate([{ strokeDasharray: '1 2', strokeDashoffset: 1 }, { strokeDasharray: '1 2', strokeDashoffset: 0 }], { ...timing, easing: ease('--ease-in-out') }),
  );
  const dots = [...band.querySelectorAll('.mb-dot.is-done')].map((d) =>
    d.animate([{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }], { ...timing, easing: ease('--ease-spring') }),
  );
  runScene(band, [loop, ...ring, ...dots]);
}
