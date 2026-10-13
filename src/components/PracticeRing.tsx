// 내 AI 써 보기 지도 띠의 연습 고리 (brief 6.4·7절 S8, D71): 출발 길에 닿은 작은 고리 하나, 점 셋(연습 셋), 이름표 '연습'.
// 지도(MapSvg)의 extra 층으로 차 바로 밑에 그린다. 마치기 전에는 아직 안 난 길(회색 점)과 빈 점, 마치면(html[data-lesson-done]) 남색 바깥 + 청록 심과
// 남색 점이 덮는다(map.css). 그래서 다시 열거나 동작 줄이기여도 마친 모습이 바로 보이고, 움직임(차가 한 바퀴 → 심 그리기)은 practice.ts가 붙인다.
import { ko } from '../copy/ko.ts';
import type { MapModel } from '../lib/map/model.ts';
import { PRACTICE } from '../lib/map/practice.ts';
import { MapSvg } from './MapBoard.tsx';

function PracticeRing() {
  const dot = (cls: string) =>
    PRACTICE.dots.map((p) => <circle class={cls} cx={p.x} cy={p.y} r={5} />);
  return (
    <g class="mb-practice">
      <path class="mb-road is-ghost" d={PRACTICE.d} />
      <g class="mb-ring">
        <path class="mb-outer" d={PRACTICE.d} pathLength={1} />
        <path class="mb-core" d={PRACTICE.d} pathLength={1} />
      </g>
      {dot('mb-dot')}
      {dot('mb-dot is-done')}
      <g class="mb-labels" font-size="17">
        <text x={PRACTICE.label.x} y={PRACTICE.label.y} text-anchor="start" dominant-baseline="central">
          {ko.map.practice}
        </text>
      </g>
    </g>
  );
}

/** 연습 고리를 얹은 지도 (Astro에서 지시어 없이 쓰는 정적 그림). 차는 고리가 출발 길에 닿는 곳에 선다 */
export function PracticeMap({ model }: { model: MapModel }) {
  return <MapSvg model={model} decorative extra={<PracticeRing />} carAt={PRACTICE.car} />;
}
