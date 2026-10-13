// 길 지도 (docs/MAP.md 5절, CONCEPT 5.5·6.3~6.6). src/lib/map/model.ts가 계산한 모형을 SVG로 그리기만 한다.
// 섬(client:*)으로 쓰면 저장된 진행으로 다시 그리고, 지시어 없이 쓰면(코스 썸네일) 서버가 그린 정적 SVG가 된다.
// 층: 땅 판 → 그림자 → 길(밤 빛 → 바깥 → 심) → 굴 → 마디 → 지금 여는 곳 고리 → 빈 터·윤곽·깃발 → 집 → 표지 → 이름표 → 차.
// 그림은 표지 묶음(MapSprite.astro)을 <use>로 쓴다. 자리는 모두 모형의 값 그대로다 (이 파일에서 자리를 고치지 않는다).
// 안의 모든 것은 aria-hidden이고 바깥 svg 하나가 role="img"와 요약 한 문장을 가진다 (지도에서만 알 수 있는 정보는 없다, CONCEPT 5.8).
// 색·굵기는 src/styles/map.css가 토큰으로 칠한다. 움직임(S2~S5·S7)은 W5에서 붙인다.
import { useStore } from '@nanostores/preact';
import '../styles/map-land.css';
import '../styles/map.css';
import { $arrivalView, resultFor } from '../lib/arrival-view.ts';
import { catalog } from '../lib/data.ts';
import { evaluate } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $mapFocus } from '../lib/map/focus.ts';
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

// 붙기 전 첫 그림은 빌드 때 HTML과 같아야 한다: Preact는 붙일 때 속성 차이를 고치지 않고, 그 뒤에는 앞 그림과만 견준다.
// 그래서 붙기 전에는 처음 온 사람 기준 모형으로 바깥 svg(class·data-palette)를 그리고, 안쪽은 땅 판만 둔다
const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);

export type MapVariant = 'band' | 'mini';

const tr = (x: number, y: number): string => `translate(${x} ${y})`;

/** 마디 모양 (지금 여는 곳도 키우지 않는다. 고리는 m.focus가 따로 그린다) */
function shapeAt(n: MapNode, cls: string, dx = 0, dy = 0) {
  return <use class={cls} href={`#mk-node-${n.shape}`} x={n.x + dx - 14} y={n.y + dy - 14} width={28} height={28} />;
}

interface SvgProps {
  model: MapModel;
  variant?: MapVariant;
  /** false면 땅 판만 그린다: 섬이 붙기 전(빌드 때 HTML)에는 저장된 진행을 모르므로, 처음 온 사람의 길을 보였다가 바꾸지 않는다 */
  live?: boolean;
  /** 장식 그림 (홈 본보기 지도, 코스 미리 보기): 뜻은 옆 글이 전하므로 요약 글 없이 aria-hidden */
  decorative?: boolean;
}

/** 모형을 그리는 순수 컴포넌트. 정적으로도(코스 썸네일) 섬 안에서도 쓴다. mini는 길과 마디만 */
export function MapSvg({ model: m, variant = 'band', live = true, decorative = false }: SvgProps) {
  const mini = variant === 'mini';
  const hidden = mini || !live || decorative;
  const l = m.lot;
  const labels = [m.start.label, l.label, ...m.nodes.map((n) => n.label)];
  const main = m.roads.filter((r) => r.kind === 'main');
  // 밤 주행 빛: 이어진 길을 한 path로 그려 겹치는 이음매가 두 번 칠해지지 않게 한다 (흐림 필터 없이 넓은 선 하나).
  // 교통 정보를 덮은 길(도구끼리 맞춰 보기)에는 두지 않는다: 청록 빛이 초록·빨강 길과 섞여 교통 색을 흐린다
  const halo = main
    .filter((r) => !m.traffic && r.state !== 'ghost')
    .map((r) => r.d)
    .join(' ');
  const t = m.tunnel;
  const car = m.car;

  return (
    <svg
      class={`map-board is-${variant}${m.traffic ? ' is-traffic' : ''}`}
      viewBox={mini ? '60 32 312 176' : `0 0 ${m.width} ${m.height}`}
      preserveAspectRatio={mini ? 'xMidYMid meet' : 'xMidYMid slice'}
      data-palette={m.palette}
      role={hidden ? undefined : 'img'}
      aria-label={hidden ? undefined : m.summary}
      aria-hidden={hidden ? 'true' : undefined}
      focusable="false"
    >
      <g aria-hidden="true">
        {/* 땅 판(1296×720) 밖까지 아주 넓은 화면에서도 같은 땅색이 이어지게 (느낌 팔레트를 따른다) */}
        {!mini && <rect class="ml-land" x={-4320} y={-2400} width={9072} height={5040} />}
        <g class="map-land" dangerouslySetInnerHTML={{ __html: LAND }} />
        {live && (
          <g class="mb-live">
            <g class="mb-shadows">
              {/* 아직 짓지 않은 자리(점선 마디)에는 그림자가 없다. 빈 터는 맨땅이라 그림자를 두지 않는다 */}
              {m.nodes.filter((n) => n.state !== 'ghost' && n.state !== 'later').map((n) => shapeAt(n, 'mb-shadow', 2, 3))}
            </g>
            <g class="mb-roads">
              {!mini && halo && <path class="mb-halo" d={halo} />}
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
            {t &&
              !mini &&
              (t.ghost ? (
                <g class="mb-tunnel-ghost">
                  <rect x={t.x - (t.angle ? 8 : 13)} y={t.y - (t.angle ? 13 : 8)} width={t.angle ? 16 : 26} height={t.angle ? 26 : 16} rx={5} />
                  <use href="#mk-fn-proxy" x={t.x - 6} y={t.y - 6} width={12} height={12} />
                </g>
              ) : (
                <g class="mb-tunnel">
                  {/* 몸은 길 방향을 따르되(세로 길은 mk-tunnel-v) 돌리지 않아 그림자가 늘 오른쪽 아래, 표지는 똑바로 */}
                  {t.angle ? (
                    <use href="#mk-tunnel-v" x={t.x - 10} y={t.y - 16} width={20} height={32} />
                  ) : (
                    <use href="#mk-tunnel" x={t.x - 16} y={t.y - 10} width={32} height={20} />
                  )}
                  <use href="#mk-tunnel-sign" x={t.sign.x - 8} y={t.sign.y - 8} width={16} height={16} />
                </g>
              ))}
            <use href="#mk-start" x={m.start.x - 14} y={m.start.y - 14} width={28} height={28} />
            {m.nodes.map((n) => (
              <g key={n.id} class={`mb-node is-${n.state}`}>
                {n.cone && <use href="#mk-cone" x={n.cone.x - 8} y={n.cone.y - 8} width={16} height={16} />}
                {n.hatch && !mini && <use class="mb-hatch" href="#mk-hatch-ring" x={n.x - 22} y={n.y - 22} width={44} height={44} />}
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
            {m.focus && !mini && <circle class="mb-focus" cx={m.focus.x} cy={m.focus.y} r={m.focus.r} />}
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
                  {k.countAt && (
                    <g class="mb-count" transform={tr(k.countAt.x, k.countAt.y)}>
                      <circle r={10} />
                      <text text-anchor="middle" dominant-baseline="central" font-size="15">
                        {k.count}
                      </text>
                    </g>
                  )}
                </g>
              ))}
            {!mini && (
              <g class="mb-labels" font-size="17">
                {labels.map((x) => (
                  <text x={x.x} y={x.y} text-anchor={x.anchor} dominant-baseline="central">
                    {x.text}
                  </text>
                ))}
              </g>
            )}
            {!mini && (
              // 차: 그림자는 돌지 않는 바깥 묶음의 필터(#mb-shade, 페이지에 한 번 MapSprite.astro)가, 자리·방향은 안쪽 묶음이.
              // S3·S5는 안쪽 묶음에 offset-path(routeD)를 준다
              <g class="mb-car-wrap" filter="url(#mb-shade)">
                <g class="mb-car" transform={`${tr(car.x, car.y)} rotate(${car.angle})`}>
                  <use href="#mk-car-top" x={-18} y={-9} width={36} height={18} />
                  <use class="mb-car-lights" href="#mk-car-lights" x={-18} y={-9} width={36} height={18} />
                </g>
              </g>
            )}
          </g>
        )}
      </g>
    </svg>
  );
}

interface Props {
  /** 지금 단계: 도구 고르기는 지금 여는 곳 고리, 도구끼리 맞춰 보기는 교통 색과 표지, 설계도 받기는(영수증을 받았으면) 빈 터 앞의 차와 실선 윤곽 */
  stage?: StageId;
  variant?: MapVariant;
}

/**
 * 지도 섬. 붙기 전(빌드 때 HTML)에는 땅 판만 그리고, 붙은 뒤 저장된 진행으로 길·마디·차를 그려 --dur-fade로 비친다.
 * 그래서 다시 온 사람이 처음 온 사람의 지도를 잠깐 보는 일이 없다 (D68).
 */
export default function MapBoard({ stage, variant = 'band' }: Props) {
  const ready = useHydrated();
  const live = useStore($result);
  const meta = useStore($meta);
  const open = useStore($mapFocus);
  // 설계도 받기를 영수증 링크로 열었으면 그 영수증의 지도를 그린다 (아래 시트와 같은 상태)
  const view = useStore($arrivalView);
  const shared = stage === 'arrival' && view.kind === 'shared';
  const r = ready ? (shared ? resultFor(catalog, view, live) : live) : FIRST_VISIT;
  const model = mapModel(r, {
    // 교통 정보는 도구끼리 맞춰 보기가 열렸을 때만 (만들 앱을 정하기 전에는 빈 칸마다 막힘이 되어 지도가 온통 빨개진다)
    traffic: stage === 'check' && r.done,
    // 도착 그림은 설계도 받기 문이 열려 있을 때만 (영수증을 받은 뒤 도구를 바꿔 막힌 곳이 생기면 다시 길 위로). 받은 영수증은 도착한 그림
    arrived: ready && stage === 'arrival' && (shared || meta.issued === true) && r.canIssue,
    // 지금 여는 곳 고리는 도구 고르기가 열렸을 때만 (만들 앱을 정하기 전에는 펼친 칸이 없다)
    focus: ready && stage === 'waypoints' && r.done ? (open ?? undefined) : undefined,
  });
  return <MapSvg model={model} variant={variant} live={ready} />;
}
