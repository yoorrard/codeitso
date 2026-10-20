// 이용 가이드 열기 (O1, D138): 기본 틀(Base.astro)의 작은 스크립트가 부른다. 가이드 그림(Tour.tsx + tour.css)은 열 때만 받아
// 첫 화면 JS·CSS를 늘리지 않는다. 열리는 길 둘: (1) 둘러보는 쪽에 처음 오면 한 번 저절로 (2) [data-tour-open] 단추(머리줄 [?]·카테고리 메뉴·바닥글).
// 한 번 열면 store.ts의 $guide.tour를 켜서 다시 저절로 열지 않는다. 브라우저 저장을 못 쓰면 쪽마다 다시 뜨므로 저절로 열지 않는다.
import { tourAutoPath } from './guide.ts';
import { stripBase } from './routes.ts';
import { $guide, $storageOk } from './store.ts';

let opening = false;

async function openTour(opener: HTMLElement | null): Promise<void> {
  if (opening || document.querySelector('dialog.tour[open]')) return;
  opening = true;
  try {
    const m = await import('../components/Tour.tsx');
    await m.showTour(opener, () => {
      opening = false;
    });
  } catch {
    // 묶음을 못 받았으면(망 끊김) 다음 누르기에 다시 해 본다
    opening = false;
  }
}

export function wireTour(): void {
  document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-tour-open]') : null;
    if (!btn) return;
    e.preventDefault();
    // 카테고리 메뉴 안의 단추면 메뉴를 닫고, 가이드를 닫은 뒤에는 메뉴 단추로 초점을 돌린다
    const menu = btn.closest<HTMLDetailsElement>('details[data-menu]');
    if (menu) menu.open = false;
    void openTour(menu?.querySelector<HTMLElement>('summary') ?? btn);
  });
  if ($guide.get().tour || !$storageOk.get() || !tourAutoPath(stripBase(window.location.pathname))) return;
  // 첫 그림과 섬이 자리 잡은 뒤에 연다. 다른 창(담기 창·서랍)이 먼저 열려 있으면 이번 쪽에서는 열지 않는다
  const start = (): void => {
    if ($guide.get().tour || document.querySelector('dialog[open]')) return;
    void openTour(null);
  };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(start, { timeout: 1200 });
  else window.setTimeout(start, 400);
}
