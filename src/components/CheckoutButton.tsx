// [계산하기] (서랍과 /cart가 같이 쓴다): 담은 재료의 상세 자료를 받아 0원 영수증을 만들고 영수증 쪽으로 간다.
// 받는 동안은 버튼을 잠그고 알리고, 못 받으면 오류 한 줄(다시 누르면 다시 받는다).
import { useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { checkout } from '../lib/checkout.ts';
import { receiptPath } from '../lib/routes.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';

export function CheckoutButton({ wide = false }: { wide?: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'fail'>('idle');
  return (
    <div class={wide ? 'checkout is-wide' : 'checkout'}>
      <button
        type="button"
        class="btn btn-primary btn-lg checkout-btn"
        aria-disabled={state === 'busy' ? 'true' : undefined}
        onClick={() => {
          if (state === 'busy') return;
          setState('busy');
          announce(ko.cart.checkingOut);
          checkout(Date.now())
            .then((r) => {
              announce(fill(ko.receipt.issuedLive, { no: r.no }));
              window.location.assign(receiptPath(r.id));
            })
            .catch(() => {
              setState('fail');
              announce(ko.cart.checkoutFailed);
            });
        }}
      >
        <Icon name="check" size="20px" />
        {ko.cart.checkout}
      </button>
      {state === 'busy' && (
        <p class="field-hint" role="status">
          {ko.cart.checkingOut}
        </p>
      )}
      {state === 'fail' && (
        <p class="copy-fail" role="alert">
          {ko.cart.checkoutFailed}
        </p>
      )}
    </div>
  );
}
