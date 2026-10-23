// 뼈대 조각 (U, D148): 진열대 JSON을 받는 동안 내용과 같은 모양·크기로 자리를 잡아 두는 회색 판.
// Vercel Geist·shadcn/ui Skeleton처럼 판 하나(Sk)와 글줄(SkLine)을 진짜 화면의 클래스 안에 넣어 크기를 맞추고,
// 묶음(SkSet)은 --dur-wait 뒤에야 드러난다(빨리 오면 보이지 않는다, src/lib/wait.ts). 판은 은은하게 숨 쉬고 동작 줄이기면 멈춘다(tokens.css --dur-pulse).
// 뼈대는 화면 낭독기에 숨기고, 묶음마다 숨은 상태 글 하나(role="status")가 '불러오고 있어요'를 알린다.
// 진짜 단추·칸의 클래스(.buy-add·.mt-price…)는 뼈대에 붙이지 않는다: 시험·스크립트가 그 클래스로 진짜 것을 찾는다(자리 맞춤은 style로).
import type { CSSProperties, ComponentChildren } from 'preact';

interface SkProps {
  /** 너비 (CSS 길이). 없으면 칸을 채운다 */
  w?: string;
  /** 높이 (CSS 길이). 글줄은 SkLine */
  h?: string;
  /** 알약 모양 (칩) */
  pill?: boolean;
  /** 둘레 칸에 맞추는 배치 (flex·grid 자리) */
  style?: CSSProperties;
  class?: string;
}

function size(w?: string, h?: string, pill = false, more: CSSProperties = {}): CSSProperties {
  const s: CSSProperties = { ...more };
  if (w) s.inlineSize = w;
  if (h) s.blockSize = h;
  if (pill) s.borderRadius = 'var(--radius-pill)';
  return s;
}

/** 판 하나: 그림·단추·칸 자리 */
export function Sk({ w, h, pill, style, class: cls }: SkProps) {
  return <span class={cls ? `sk ${cls}` : 'sk'} style={size(w, h, pill, style)} aria-hidden="true" />;
}

/** 글줄 하나: 그 자리 글자의 한 줄 높이를 차지한다 (제목이면 제목 크기) */
export function SkLine({ w }: { w?: string }) {
  return <span class="sk sk-l" style={size(w)} aria-hidden="true" />;
}

/** 줄 목록 (넓은 화면 모델 표·비교 표·공유받은 목록): 줄마다 이름 한 줄 + 오른쪽 작은 판 */
export function SkRows({ n }: { n: number }) {
  return (
    <div class="sk-rows" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div class="sk-row">
          <span class="sk-row-main">
            <SkLine w={`${[62, 48, 70, 55][i % 4]}%`} />
          </span>
          <Sk w="4.5rem" h="var(--btn-sm)" />
        </div>
      ))}
    </div>
  );
}

interface SetProps {
  /** 화면 낭독기에 알릴 글 ('…불러오고 있어요.') */
  label: string;
  class?: string;
  children: ComponentChildren;
}

/** 뼈대 묶음: 늦게 드러나고, 숨은 상태 글로 기다림을 알린다 */
export function SkSet({ label, class: cls, children }: SetProps) {
  return (
    <div class={cls ? `sk-set ${cls}` : 'sk-set'}>
      <p class="visually-hidden" role="status">
        {label}
      </p>
      {children}
    </div>
  );
}

/** 카드 격자 뼈대 (검색 첫 결과): 빈 카드 위에 목록과 같은 카드 덮개를 그린다 (shop.css .is-wait .card) */
export function SkCards({ n }: { n: number }) {
  return (
    <ul class="grid is-wait" aria-hidden="true">
      {Array.from({ length: n }, () => (
        <li>
          <div class="card" />
        </li>
      ))}
    </ul>
  );
}
