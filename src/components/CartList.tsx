// 장바구니 쪽 섬 (/cart, S1 최소판): 담은 재료를 대분류별로 묶어 보여 주고 빼기·메모를 다룬다.
// 계산(0원 영수증·재료 목록 .md 받기)과 오른쪽 서랍은 S2에서 더한다.
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import type { NavCategory } from '../lib/catalog/types.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { ROUTES, itemPath, listPath } from '../lib/routes.ts';
import { $cart, $storageOk, removeFromCart } from '../lib/store.ts';
import { fill } from '../lib/text.ts';

interface Props {
  nav: NavCategory[];
}

export default function CartList({ nav }: Props) {
  const cart = useStore($cart);
  const ok = useStore($storageOk);
  const ready = useHydrated();
  const lines = ready ? cart : [];
  if (lines.length === 0) {
    return (
      <div class="cart-empty">
        <p>{ko.cart.empty}</p>
        <a class="btn btn-primary" href={ROUTES.home}>
          {ko.cart.browse}
        </a>
      </div>
    );
  }
  return (
    <div class="cart">
      {!ok && <p class="notice">{ko.layout.storageOff}</p>}
      <p class="cart-count" role="status">
        {fill(ko.cart.count, { n: lines.length })}
      </p>
      {nav
        .filter((c) => lines.some((l) => l.cat === c.id))
        .map((c) => (
          <section class="cart-group" aria-labelledby={`cart-${c.id}`} data-cat={c.id}>
            <h2 id={`cart-${c.id}`}>{c.name}</h2>
            <ul class="cart-lines">
              {lines
                .filter((l) => l.cat === c.id)
                .map((l) => (
                  <li class="cart-line">
                    <div class="cart-line-text">
                      <a class="cart-name" href={itemPath(l.id)}>
                        {l.name}
                      </a>
                      <a class="cart-sub" href={listPath(l.cat, l.sub)}>
                        {c.subs.find((s) => s.id === l.sub)?.name ?? l.sub}
                      </a>
                      {l.memo && (
                        <p class="cart-memo">
                          <span class="visually-hidden">{ko.cart.memo}: </span>
                          {l.memo}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      class="btn btn-sm"
                      aria-label={fill(ko.cart.removeLabel, { name: l.name })}
                      onClick={() => {
                        removeFromCart(l.id);
                        announce(fill(ko.card.removedLive, { name: l.name }));
                      }}
                    >
                      {ko.cart.remove}
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      <p class="cart-soon">{ko.cart.soon}</p>
    </div>
  );
}
