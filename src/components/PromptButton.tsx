// [프롬프트 뽑기] (서랍과 /cart가 같이 쓴다, v5.1 D121): 담은 재료의 상세 자료를 받아 프롬프트를 만들고, 지난 프롬프트에 남기고,
// 바로 단말 화면 창(PromptDialog)으로 보인다. 받는 동안은 버튼을 잠그고 알리고, 못 받으면 오류 한 줄(다시 누르면 다시 받는다).
import { useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import type { NavCategory } from '../lib/catalog/types.ts';
import { pullPrompt } from '../lib/pull.ts';
import type { PromptEntry } from '../lib/saved.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';
import { PromptDialog } from './PromptDialog.tsx';

export function PromptButton({ nav, wide = false }: { nav: NavCategory[]; wide?: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'fail'>('idle');
  const [entry, setEntry] = useState<PromptEntry | null>(null);
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
          pullPrompt(Date.now())
            .then((p) => {
              setState('idle');
              setEntry(p);
              announce(fill(ko.prompt.issuedLive, { n: p.lines.length }));
            })
            .catch(() => {
              setState('fail');
              announce(ko.cart.checkoutFailed);
            });
        }}
      >
        <Icon name="sparkle" size="20px" />
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
      {entry && <PromptDialog key={entry.id} entry={entry} nav={nav} fresh onClose={() => setEntry(null)} />}
    </div>
  );
}
