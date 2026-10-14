// 머리줄 장바구니 (brief 3절): 담은 개수 배지 + 오른쪽 서랍. 섬이 붙기 전에는 /cart 링크이고, 붙으면 누를 때 서랍을 연다
// (새 탭·수정 키를 누른 채면 링크 그대로). 서랍은 모달 <dialog>라 바깥은 잠기고(초점 가둠), Esc·바깥 누르기·[닫기]로 닫으면
// 연 자리로 초점이 돌아간다. 카드 [담음]·키트·상세가 openCart(id)로 열면 그 재료 줄로 초점을 옮긴다 (src/lib/cart-ui.ts).
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import type { NavCategory } from '../lib/catalog/types.ts';
import { DRAWER_READY, OPEN_CART_EVENT } from '../lib/cart-ui.ts';
import type { OpenCartDetail } from '../lib/cart-ui.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { ROUTES } from '../lib/routes.ts';
import { $cart, $storageOk } from '../lib/store.ts';
import { fill } from '../lib/text.ts';
import { CartLines } from './CartLines.tsx';
import { CheckoutButton } from './CheckoutButton.tsx';
import { Icon } from './Icon.tsx';

interface Props {
  nav: NavCategory[];
}

export default function CartDrawer({ nav }: Props) {
  const cart = useStore($cart);
  const storageOk = useStore($storageOk);
  const ready = useHydrated();
  const lines = ready ? cart : [];
  const n = lines.length;
  const dlg = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | undefined>();

  function show(focus?: string): void {
    const d = dlg.current;
    if (!d) return;
    if (!d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
    }
    setFocusId(focus);
    setOpen(true);
  }

  // 열린 뒤(줄이 그려진 뒤) 초점: 고른 재료 줄, 없으면 서랍 제목
  useEffect(() => {
    if (!open) return;
    const d = dlg.current;
    const line = focusId ? d?.querySelector<HTMLElement>(`[data-line="${CSS.escape(focusId)}"]`) : null;
    (line ?? d?.querySelector<HTMLElement>('[data-cart-top]'))?.focus();
  }, [open, focusId]);

  useEffect(() => {
    document.documentElement.dataset[DRAWER_READY] = 'ready';
    const on = (e: Event): void => show((e as CustomEvent<OpenCartDetail>).detail?.focus);
    document.addEventListener(OPEN_CART_EVENT, on);
    return () => document.removeEventListener(OPEN_CART_EVENT, on);
  }, []);

  return (
    <>
      <a
        class="hd-cart"
        href={ROUTES.cart}
        aria-haspopup="dialog"
        aria-label={fill(ko.layout.cartCount, { n })}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          show();
        }}
      >
        <Icon name="cart" size="24px" />
        <span class="hd-cart-word">{ko.layout.cart}</span>
        <span class="hd-badge" data-n={n} aria-hidden="true">
          {n > 99 ? '99+' : n}
        </span>
      </a>
      <dialog
        ref={dlg}
        class="drawer"
        aria-labelledby="drawer-title"
        onClose={() => {
          setOpen(false);
          setFocusId(undefined);
          const back = opener.current;
          opener.current = null;
          if (back?.isConnected) back.focus();
        }}
        onClick={(e) => {
          // 서랍 바깥(어두운 바탕)을 누르면 닫는다
          if (e.target === dlg.current) dlg.current?.close();
        }}
      >
        <div class="drawer-inner" data-cart-root>
          <header class="drawer-head">
            <h2 id="drawer-title" class="drawer-title" tabIndex={-1} data-cart-top>
              {ko.drawer.title} <span class="drawer-n">{fill(ko.drawer.count, { n })}</span>
            </h2>
            <button type="button" class="icon-btn" aria-label={ko.drawer.close} onClick={() => dlg.current?.close()}>
              <Icon name="close" size="24px" />
            </button>
          </header>
          <div class="drawer-body">
            {!storageOk && <p class="notice">{ko.layout.storageOff}</p>}
            {open && n > 0 && <CartLines lines={lines} nav={nav} level="h3" idPrefix="dw" />}
            {open && n === 0 && (
              <div class="cart-empty">
                <p>{ko.drawer.empty}</p>
                <a class="btn btn-primary" href={ROUTES.home}>
                  {ko.drawer.browse}
                </a>
              </div>
            )}
          </div>
          {open && n > 0 && (
            <footer class="drawer-foot">
              <p class="drawer-total">
                <span>{ko.drawer.total}</span>
                <strong>{ko.cart.free}</strong>
              </p>
              <div class="drawer-acts">
                <a class="btn" href={ROUTES.cart}>
                  {ko.drawer.toCart}
                </a>
                <CheckoutButton />
              </div>
            </footer>
          )}
        </div>
      </dialog>
    </>
  );
}
