// 화면 사이를 오가는 작은 도구 (N1, D137). Base.astro가 모든 쪽에서 한 번 부른다.
// - 뒤로(a[data-back]): 이전 화면이 이 사이트 안이면 그 화면으로(history.back), 아니면 링크 주소(위 단계)로 간다.
//   새 탭으로 열었거나 바깥에서 바로 들어왔으면 이전 화면이 없으므로 위 단계(상세 → 그 소분류, 소분류 → 대분류 …)가 받는다.
// - '/' 키: 글을 치는 중이 아니면 이 쪽의 검색창(소분류 안 검색이 있으면 그것, 없으면 머리줄)으로 초점을 옮긴다 (GitHub·YouTube처럼).
// - 맨 위로: 화면 두 장 넘게 내려가면 오른쪽 아래에 뜨고, 누르면 맨 위로 가서 본문으로 초점을 옮긴다.
import { BASE_PATH, ROUTES, normalizeBase } from './routes.ts';

/** 이전 화면이 이 사이트 안인가: 같은 출처(origin)·같은 주소 바탕이고, 이 탭에 앞 기록이 있을 때 */
export function cameFromSite(referrer: string, here: string, base: string, historyLength: number): boolean {
  if (historyLength < 2 || referrer === '') return false;
  try {
    const r = new URL(referrer);
    if (r.origin !== new URL(here).origin) return false;
    const b = normalizeBase(base);
    return b === '' || r.pathname === b || r.pathname.startsWith(`${b}/`);
  } catch {
    return false;
  }
}

/** 글을 치는 곳인가 ('/' 키를 가로채지 않는다) */
export function isTyping(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = (el as HTMLInputElement).type;
  return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file'].includes(type);
}

function plain(e: MouseEvent | KeyboardEvent): boolean {
  return !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

function wireBack(): void {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || !plain(e)) return;
    const a = e.target instanceof Element ? e.target.closest('a[data-back]') : null;
    if (!a) return;
    if (cameFromSite(document.referrer, window.location.href, BASE_PATH, window.history.length)) {
      e.preventDefault();
      window.history.back();
    }
  });
}

function visible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0;
}

function wireSlash(): void {
  document.addEventListener('keydown', (e) => {
    // Shift는 막지 않는다: '/'를 Shift로 치는 자판도 있다
    if (e.key !== '/' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    if (isTyping(document.activeElement) || document.querySelector('dialog[open]')) return;
    // 먼저 이 쪽의 안 검색창(소분류·대분류), 그다음 검색 쪽 검색창, 마지막에 머리줄 (querySelectorAll은 문서 순서라 차례대로 찾는다)
    const box = ['input[data-find]', '#page-q', '#hd-q'].map((sel) => [...document.querySelectorAll<HTMLInputElement>(sel)].find(visible)).find((x) => x !== undefined);
    e.preventDefault();
    if (box) {
      box.focus();
      box.select();
    } else window.location.href = ROUTES.search;
  });
}

function wireToTop(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-to-top]');
  if (!btn) return;
  let ticking = false;
  const update = (): void => {
    ticking = false;
    btn.hidden = window.scrollY < window.innerHeight * 2;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
  btn.addEventListener('click', () => {
    const reduce = document.documentElement.dataset['motion'] === 'reduce' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  });
}

export function wirePageNav(): void {
  wireBack();
  wireSlash();
  wireToTop();
}
