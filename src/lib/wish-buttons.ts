// 찜 하트 (N1, D137): 카드·상세의 button[data-wish]를 한 곳에서 맡는다 (Base.astro가 모든 쪽에서 한 번 부른다).
// 정적 카드(홈·카테고리)와 섬이 그린 카드 모두 같은 버튼이라, 문서에 누름 하나를 걸고 찜이 바뀌거나 섬이 카드를 새로 그렸을 때(CARDS_EVENT)
// 모든 하트의 눌림(aria-pressed)과 머리줄 찜 배지를 맞춘다. 이름은 그대로 두고 눌림으로 상태를 알린다(누름 단추).
import { ko } from '../copy/ko.ts';
import { announce } from './announce.ts';
import { CARDS_EVENT } from './cart-ui.ts';
import { pop } from './motion.ts';
import { $wish, toggleWish } from './store.ts';
import { fill } from './text.ts';

/** 머리줄 배지에 마지막으로 보인 개수 (처음 맞출 때는 부풀리지 않는다, U D148) */
let shown: number | null = null;

function sync(root: ParentNode): void {
  const list = $wish.get();
  const ids = new Set(list.map((x) => x.id));
  for (const b of root.querySelectorAll<HTMLButtonElement>('button[data-wish]')) {
    const on = String(ids.has(b.dataset['wish'] ?? ''));
    if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
  }
  const n = list.length;
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[data-wish-link]')) {
    a.setAttribute('aria-label', fill(ko.layout.wishCount, { n }));
    const badge = a.querySelector<HTMLElement>('.hd-wish-n');
    if (badge) {
      badge.dataset['n'] = String(n);
      badge.textContent = n > 99 ? '99+' : String(n);
      if (shown !== null && shown !== n && n > 0) pop(badge, 'bump');
    }
  }
  shown = n;
}

export function wireWishButtons(): void {
  document.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('button[data-wish]') : null;
    if (!b) return;
    const { wish: id, name = '', cat = '', sub = '' } = b.dataset;
    if (!id) return;
    const r = toggleWish({ id, name, cat, sub }, Date.now());
    announce(r === 'full' ? ko.wish.full : fill(r === 'on' ? ko.wish.addedLive : ko.wish.removedLive, { name }));
    // 채운 하트가 작게 커지며 자리 잡는다 (상세의 하트는 섬이 다시 그린 뒤라 한 박자 늦게)
    if (r === 'on') requestAnimationFrame(() => pop(b.querySelector('.wish-on .icon-wrap')));
  });
  $wish.subscribe(() => sync(document));
  document.addEventListener(CARDS_EVENT, () => sync(document));
}
