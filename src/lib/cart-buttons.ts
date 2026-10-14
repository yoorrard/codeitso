// 카드의 [담기] 버튼을 한 곳에서 맡는다 (Base.astro가 모든 쪽에서 한 번 부른다).
// 정적 카드(홈·카테고리)와 목록 섬이 다시 그린 카드 모두 data-add 버튼이라, 문서에 누름 하나를 걸고
// 장바구니가 바뀌거나 섬이 카드를 새로 그렸을 때(CARDS_EVENT) 모든 버튼의 aria-pressed·글을 맞춘다.
import { ko } from '../copy/ko.ts';
import { announce } from './announce.ts';
import { $cart, addToCart, removeFromCart } from './store.ts';
import { fill } from './text.ts';

/** 섬이 카드를 새로 그린 뒤 보내는 알림 */
export const CARDS_EVENT = 'cc:cards';

function sync(root: ParentNode): void {
  const ids = new Set($cart.get().map((x) => x.id));
  for (const b of root.querySelectorAll<HTMLButtonElement>('button[data-add]')) {
    const on = ids.has(b.dataset['add'] ?? '');
    if (b.getAttribute('aria-pressed') === String(on)) continue;
    b.setAttribute('aria-pressed', String(on));
    const name = b.dataset['name'] ?? '';
    b.setAttribute('aria-label', fill(on ? ko.card.removeLabel : ko.card.addLabel, { name }));
    const label = b.querySelector('.add-label');
    if (label) label.textContent = on ? ko.card.added : ko.card.add;
  }
}

export function wireAddButtons(doc: Document = document): void {
  doc.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('button[data-add]') : null;
    if (!b) return;
    const { add: id, name, cat, sub } = b.dataset;
    if (!id || !name || !cat || !sub) return;
    if (b.getAttribute('aria-pressed') === 'true') {
      removeFromCart(id);
      announce(fill(ko.card.removedLive, { name }));
      return;
    }
    if (addToCart({ id, name, cat, sub }, Date.now())) announce(fill(ko.card.addedLive, { name }));
    else announce(ko.card.full);
  });
  $cart.subscribe(() => sync(doc));
  doc.addEventListener(CARDS_EVENT, () => sync(doc));
}
