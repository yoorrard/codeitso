// 장면 틀 (CONCEPT 7절, brief 7절): 장면이 도는 동안 지도 띠 오른쪽 위에 [건너뛰기](44)를 보이고, 다 끝나면 거둔다.
// 화면 아무 곳 누르기·Esc는 기본 틀(Base.astro)이 맡고, 이 단추는 자기 click에서 모두 끝낸다(data-skip이라 기본 틀은 건드리지 않는다).
// 단추는 띠 안에 hidden으로 미리 그려 둔다(문구는 ko.ts에서, 지도 섬·홈·내 AI 써 보기가 같은 꼴). 장면이 겹치면 마지막 것이 끝날 때 거둔다.
import { dur, skipAll } from './motion.ts';

const running = new WeakMap<Element, number>();

/** 모든 장면을 끝 상태로: 애니메이션은 finish(), 애니메이션 객체가 아닌 것은 cc:skip 신호로 */
export function skipScenes(): void {
  skipAll(document);
  document.dispatchEvent(new CustomEvent('cc:skip'));
}

/** 장면이 끝나 단추를 거둘 때 초점을 둘 곳: 본문 제목(H1, 기본 틀이 화면마다 하나 둔다). 없으면 본문 */
function heading(): HTMLElement | null {
  const h = document.querySelector<HTMLElement>('main h1');
  if (!h) return document.getElementById('main');
  if (!h.hasAttribute('tabindex')) h.tabIndex = -1;
  return h;
}

/**
 * band(지도 띠)에서 장면이 도는 동안 [건너뛰기]를 보인다. anims를 주지 않으면 띠 안에서 도는 애니메이션(CSS 장면 S1).
 * 남은 길이가 --dur-skip-min(1초)보다 긴 장면(S1, S4 들어오기, S5)에만 띄운다: 짧은 장면(S2 0.4초, S3 0.9초 …)마다 단추가 번쩍
 * 뜨고 사라지면 누를 수 없는 과녁이 되고 지도 오른쪽 위 이름표를 가린다(D71 검토 반영). 짧은 장면은 화면 누르기·Esc로 끝난다.
 * 돌 것이 없으면(동작 줄이기, 이미 끝남, 짧은 비침뿐) 아무것도 하지 않는다
 */
export function runScene(band: Element | null, anims?: (Animation | null)[]): void {
  if (!band) return;
  const list = (anims ?? band.getAnimations({ subtree: true })).filter((a): a is Animation => a !== null && a.playState !== 'finished' && a.playState !== 'idle');
  // 남은 길이 = 효과가 끝나는 때 - 지금 (늦춘 시작도 셈에 든다). 동작 줄이기에서도 남는 비침(--dur-fade)에는 띄우지 않는다
  const left = (a: Animation): number => Number(a.effect?.getComputedTiming().endTime ?? 0) - Number(a.currentTime ?? 0);
  if (list.length === 0 || Math.max(...list.map(left)) <= Math.max(dur('--dur-fade'), dur('--dur-skip-min'))) return;
  const btn = band.querySelector<HTMLButtonElement>('.map-skip');
  running.set(band, (running.get(band) ?? 0) + 1);
  if (btn) {
    btn.hidden = false;
    btn.onclick = skipScenes;
  }
  void Promise.allSettled(list.map((a) => a.finished)).then(() => {
    const still = (running.get(band) ?? 1) - 1;
    running.set(band, still);
    if (still > 0 || !btn) return;
    // 단추를 눌러 끝냈으면 초점이 사라진 단추에 남지 않게 본문 제목으로 (WCAG 2.4.3)
    if (document.activeElement === btn) heading()?.focus({ preventScroll: true });
    btn.hidden = true;
  });
}
