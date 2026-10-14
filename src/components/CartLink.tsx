// 머리줄의 장바구니 버튼 섬: 담은 개수 배지. 빌드 때는 0개로 그리고, 깨어나면 저장된 장바구니를 읽는다.
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { ROUTES } from '../lib/routes.ts';
import { $cartCount } from '../lib/store.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';

export default function CartLink() {
  const live = useStore($cartCount);
  const ready = useHydrated();
  const n = ready ? live : 0;
  return (
    <a class="hd-cart" href={ROUTES.cart} aria-label={fill(ko.layout.cartCount, { n })}>
      <Icon name="cart" size="24px" />
      <span class="hd-cart-word">{ko.layout.cart}</span>
      <span class="hd-badge" data-n={n} aria-hidden="true">
        {n > 99 ? '99+' : n}
      </span>
    </a>
  );
}
