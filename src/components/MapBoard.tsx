// 길 지도 (docs/MAP.md 5절, CONCEPT 5.5·6.3~6.6). src/lib/map/model.ts가 계산한 모형을 SVG로 그리기만 한다.
// 섬(client:*)으로 쓰면 저장된 진행으로 다시 그리고, 지시어 없이 쓰면(홈·코스 썸네일) 서버가 그린 정적 SVG가 된다.
// 층: 땅 판 → 그림자 → 길 → 굴 → 마디 → 빈 터·윤곽·깃발 → 집 → 표지 → 이름표 → 차. 그림은 표지 묶음(MapSprite.astro)을 <use>로 쓴다.
// 안의 모든 것은 aria-hidden이고 바깥 svg 하나가 role="img"와 요약 한 문장을 가진다 (지도에서만 알 수 있는 정보는 없다, CONCEPT 5.8).
// 색·굵기는 src/styles/map.css가 토큰으로 칠한다. 움직임(S2~S5·S7)은 T30·T31에서 붙인다.
import { useStore } from '@nanostores/preact';
import { catalog } from '../lib/data.ts';
import { evaluate } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import type { MapModel, MapNode } from '../lib/map/model.ts';
import { mapModel } from '../lib/map/model.ts';
import { $result } from '../lib/result.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import type { StageId } from '../lib/stages.ts';
import { $meta } from '../lib/store.ts';

// 땅 판은 서버에서만 싣는다. 섬은 서버가 그린 땅 판을 그대로 물려받는다: Preact는 붙일 때 dangerouslySetInnerHTML을 쓰지 않고,
// 그 뒤로도 __html이 같으면 건드리지 않는다. 그래서 브라우저 묶음에 땅 판 글자(gzip 약 3KB)가 들어가지 않는다. 파일이 없으면 빈 땅.
const LAND = import.meta.env.SSR
  ? (Object.values(import.meta.glob<string>('../assets/map/land.svg', { query: '?raw', import: 'default', eager: true }))[0] ?? '')
  : '';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
/** 차(20×12)의 가운데가 마디 가운데에서 떨어진 거리: 마디 반쪽 14 + 띄움 1 + 차 길이의 반 10 */
const CAR_BACK = 25;

export type MapVariant = 'band' | 'mini';

const tr = (x: number, y: number): string => `translate(${x} ${y})`;

/** 마디 모양. 지금 여는 곳은 1.15배 (CONCEPT 5.5) */
function shapeAt(n: MapNode, cls: string, dx = 0, dy = 0) {
  return (
    <use
      class={cls}
      href={`#mk-node-${n.shape}`}
      x={-14}
      y={-14}
      width={28}
      height={28}
      transform={tr(n.x + dx, n.y + dy) + (n.state === 'open' ? ' scale(1.15)' : '')}
    />
  );
}

/** 모형을 그리는 순수 컴포넌트. 정적으로도(홈, 코스 썸네일) 섬 안에서도 쓴다. mini는 길과 마디만 */
export function MapSvg({ model: m, variant = 'band' }: { model: MapModel; variant?: MapVariant }) {
  const mini = variant === 'mini';
  const c = m.car;
  // 마디에 선 차는 마디를 가리지 않게 마디 바로 앞 곧은 길에 세운다. 앞이 좁으면(출발 바로 다음 마디) 바로 뒤에, 둘 다 좁으면 마디 위에
  let car = { x: c.x, y: c.y, angle: c.angle };
  if (c.at !== 'start' && c.at !== 'lot') {
    const later = new Set(m.nodes.filter((n) => n.state === 'later').map((n) => n.id));
    for (const r of m.roads) {
      const into = r.to === c.at;
      if (r.kind !== 'main' || (!into && r.from !== c.at)) continue;
      const p = r.points;
      const far = (into ? p[p.length - 2] : p[1]) ?? c;
      const end = into ? r.from : r.to;
      // 곧은 조각 끝이 이웃 물건이면 그 반쪽만큼 비켜야 한다 (빈 터는 길 끝이 터 안 4에 있다, 미룬 마디의 갈림목은 비어 있다)
      const room = p.length > 2 || later.has(end) ? 0 : end === 'lot' ? 6 : 14;
      const len = Math.hypot(far.x - c.x, far.y - c.y);
      if (len + 2 < CAR_BACK + 10 + room) continue;
      const ux = (far.x - c.x) / len;
      const uy = (far.y - c.y) / len;
      car = { x: c.x + ux * CAR_BACK, y: c.y + uy * CAR_BACK, angle: Math.round((Math.atan2(into ? -uy : uy, into ? -ux : ux) * 180) / Math.PI) };
      break;
    }
  }
  const l = m.lot;
  const labels = [m.start.label, l.label, ...m.nodes.map((n) => n.label)];

  return (
    <svg
      class={`map-board is-${variant}`}
      viewBox={mini ? '60 32 312 176' : `0 0 ${m.width} ${m.height}`}
      preserveAspectRatio={mini ? 'xMidYMid meet' : 'xMidYMid slice'}
      data-palette={m.palette}
      role={mini ? undefined : 'img'}
      aria-label={mini ? undefined : m.summary}
      aria-hidden={mini ? 'true' : undefined}
      focusable="false"
    >
      <g aria-hidden="true">
        <g class="map-land" dangerouslySetInnerHTML={{ __html: LAND }} />
        <g class="mb-shadows">
          <rect x={l.box.x + 3} y={l.box.y + 4} width={l.box.w - 2} height={l.box.h - 2} rx={10} />
          {/* 아직 짓지 않은 자리(점선 마디)에는 그림자가 없다 */}
          {m.nodes.filter((n) => n.state !== 'ghost' && n.state !== 'later').map((n) => shapeAt(n, 'mb-shadow', 2, 3))}
        </g>
        <g class="mb-roads">
          {m.roads.map((r) =>
            r.state === 'ghost' || r.state === 'later' ? (
              <path key={r.id} class={`mb-road is-${r.state}`} d={r.d} />
            ) : (
              <g key={r.id} class={`mb-road is-${r.state}`}>
                <path class="mb-outer" d={r.d} />
                <path class="mb-core" d={r.d} />
              </g>
            ),
          )}
        </g>
        {m.tunnel &&
          !mini &&
          (m.tunnel.ghost ? (
            <g class="mb-tunnel-ghost" transform={tr(m.tunnel.x, m.tunnel.y) + (m.tunnel.angle ? ' rotate(90)' : '')}>
              <rect x={-13} y={-8} width={26} height={16} rx={5} />
              <use href="#mk-fn-proxy" x={-6} y={-6} width={12} height={12} />
            </g>
          ) : (
            <use
              href="#mk-tunnel"
              x={m.tunnel.x - 16}
              y={m.tunnel.y - 10}
              width={32}
              height={20}
              transform={m.tunnel.angle ? `rotate(90 ${m.tunnel.x} ${m.tunnel.y})` : undefined}
            />
          ))}
        <use href="#mk-start" x={m.start.x - 14} y={m.start.y - 14} width={28} height={28} />
        {m.nodes.map((n) => (
          <g key={n.id} class={`mb-node is-${n.state}`}>
            {n.cone && <use href="#mk-cone" x={n.cone.x - 8} y={n.cone.y - 8} width={16} height={16} />}
            {n.hatch && !mini && <circle class="mb-hatch" cx={n.x} cy={n.y} r={19} />}
            {shapeAt(n, 'mb-shape')}
            {!mini && (
              <use
                class="mb-icon"
                href={`#mk-fn-${n.shape}`}
                x={n.x - 8}
                y={n.y - (n.shape === 'data' ? 6 : 8)}
                width={16}
                height={16}
              />
            )}
            {m.arrived && n.passed && (
              <use
                href="#mk-done"
                x={n.x + (m.markers.some((k) => k.anchor === n.id && k.x > n.x && k.y < n.y) ? -16 : 4)}
                y={n.y - 16}
                width={12}
                height={12}
              />
            )}
          </g>
        ))}
        <g class={`mb-lot is-${l.state}`}>
          <use href="#mk-lot" x={l.box.x} y={l.box.y} width={l.box.w} height={l.box.h} />
          {l.type && <use class="mb-bp" href={`#mk-bp-${l.type}`} x={l.x - 28} y={l.y - 20} width={56} height={40} />}
          {m.arrived && <use href="#mk-scroll" x={l.x + 10} y={l.y + 8} width={20} height={14} />}
        </g>
        <use href="#mk-flag" x={l.flag.x} y={l.flag.y} width={16} height={24} />
        {!mini && m.houses && (
          <use href={`#mk-house-${m.houses.kind}`} x={m.houses.box.x} y={m.houses.box.y} width={m.houses.box.w} height={m.houses.box.h} />
        )}
        {!mini &&
          m.markers.map((k) => (
            <g key={k.id}>
              <use href={`#mk-${k.kind}`} x={k.x - 10} y={k.y - 10} width={20} height={20} />
              {k.count > 1 && (
                <g class="mb-count" transform={tr(k.x + 10, k.y + 9)}>
                  <circle r={7} />
                  <text text-anchor="middle" dominant-baseline="central" font-size="11">
                    {k.count}
                  </text>
                </g>
              )}
            </g>
          ))}
        {!mini && (
          <g class="mb-labels" font-size="17">
            {labels.map((t) => (
              <text x={t.x} y={t.y} text-anchor={t.anchor} dominant-baseline="central">
                {t.text}
              </text>
            ))}
          </g>
        )}
        {/* 그림자는 돌리기 전에 오른쪽 아래로 (빛은 늘 왼쪽 위에서) */}
        <rect class="mb-car-shadow" x={-10} y={-6} width={20} height={12} rx={4} transform={`${tr(car.x + 2, car.y + 3)} rotate(${car.angle})`} />
        <g class="mb-car" transform={`${tr(car.x, car.y)} rotate(${car.angle})`}>
          <rect class="mb-car-body" x={-10} y={-6} width={20} height={12} rx={4} />
          <path class="mb-car-glass" d="M1-4.4h2.4q2.2 4.4 0 8.8H1q.8-4.4 0-8.8z" />
          <path class="mb-car-light" d="M7.4-5h1.6v3H7.4zM7.4 2h1.6v3H7.4z" />
        </g>
      </g>
    </svg>
  );
}

interface Props {
  /** 지금 단계: 점검은 교통 색과 표지, 도착은(영수증을 받았으면) 빈 터 앞의 차와 실선 윤곽 */
  stage?: StageId;
  variant?: MapVariant;
  /** 지금 여는 칸 id (경유지) */
  focus?: string;
}

/** 지도 섬. 붙기 전에는 처음 온 사람 기준으로 그려 빌드 때 HTML과 첫 그림을 맞춘다 (StatusLine과 같은 방식) */
export default function MapBoard({ stage, variant = 'band', focus }: Props) {
  const ready = useHydrated();
  const live = useStore($result);
  const meta = useStore($meta);
  const r = ready ? live : FIRST_VISIT;
  // 교통 정보는 점검이 열렸을 때만 (목적지를 정하기 전에는 빈 칸마다 막힘이 되어 지도가 온통 빨개진다)
  const model = mapModel(r, { traffic: stage === 'check' && r.done, arrived: ready && stage === 'arrival' && meta.issued === true, focus });
  return <MapSvg model={model} variant={variant} />;
}
