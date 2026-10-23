// 섬끼리 장바구니 서랍을 여는 약속: 카드 [담음]·키트·상세의 '장바구니 보기'가 머리줄 서랍 섬(CartDrawer)을 연다.
// 서랍 섬이 아직 붙지 않았으면(느린 기기) 장바구니 쪽으로 간다.
import { ROUTES } from './routes.ts';

export const OPEN_CART_EVENT = 'cc:open-cart';
/** 목록 섬이 카드를 새로 그린 뒤 보내는 알림 ([담기] 버튼 상태를 다시 맞춘다, cart-buttons.ts) */
export const CARDS_EVENT = 'cc:cards';
/** 서랍 섬이 붙으면 <html data-cart-drawer="ready"> */
export const DRAWER_READY = 'cartDrawer';

export interface OpenCartDetail {
  /** 이 재료 줄로 초점을 옮긴다 */
  focus?: string;
}

export function openCart(focus?: string): void {
  if (document.documentElement.dataset[DRAWER_READY] !== 'ready') {
    window.location.assign(ROUTES.cart);
    return;
  }
  document.dispatchEvent(new CustomEvent<OpenCartDetail>(OPEN_CART_EVENT, { detail: focus ? { focus } : {} }));
}
