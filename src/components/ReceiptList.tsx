// 지난 영수증 섬 (/receipts): 이 브라우저에 남긴 영수증(최근 30장). 줄마다 번호·때·대분류별 개수와 [열기]·[.md 받기]·[지우기].
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import type { NavCategory } from '../lib/catalog/types.ts';
import { issuedNow } from '../lib/clock.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { groupByCategory, namesOf } from '../lib/receipt-md.ts';
import { ROUTES, receiptPath } from '../lib/routes.ts';
import { $receipts, removeReceipt } from '../lib/store.ts';
import { fill } from '../lib/text.ts';
import { downloadReceipt } from './ReceiptView.tsx';

interface Props {
  nav: NavCategory[];
}

export default function ReceiptList({ nav }: Props) {
  const all = useStore($receipts);
  const ready = useHydrated();
  const list = ready ? all : [];
  const names = namesOf(nav);
  if (list.length === 0)
    return (
      <div class="cart-empty" data-cart-root>
        <p tabIndex={-1} data-cart-top>
          {ready ? ko.receipts.empty : ''}
        </p>
        <a class="btn btn-primary" href={ROUTES.home}>
          {ko.receipts.browse}
        </a>
      </div>
    );
  return (
    <ul class="rc-list" data-cart-root>
      {list.map((r) => (
        <li class="rc-item" data-receipt={r.id}>
          <div class="rc-text">
            <p class="rc-no">{fill(ko.receipt.no, { no: r.no })}</p>
            <p class="rc-date">{issuedNow(new Date(r.at))}</p>
            {r.project && <p class="rc-project">{r.project}</p>}
            <p class="rc-cats">
              {groupByCategory(r.lines)
                .map((g) => fill(ko.cart.perCat, { name: names.cat(g.cat), n: g.lines.length }))
                .join(' · ')}
            </p>
            <p class="rc-sum">{fill(ko.receipts.summary, { n: r.lines.length })}</p>
          </div>
          <div class="rc-acts">
            <a class="btn btn-soft" href={receiptPath(r.id)} aria-label={fill(ko.receipts.openLabel, { no: r.no })}>
              {ko.receipts.open}
            </a>
            <button type="button" class="btn" aria-label={fill(ko.receipts.downloadLabel, { no: r.no })} onClick={() => downloadReceipt(r, nav)}>
              {ko.receipts.download}
            </button>
            <button
              type="button"
              class="btn btn-text"
              aria-label={fill(ko.receipts.removeLabel, { no: r.no })}
              onClick={() => {
                removeReceipt(r.id);
                announce(ko.receipts.removedLive);
                window.requestAnimationFrame(() => document.querySelector<HTMLElement>('h1')?.focus());
              }}
            >
              {ko.receipts.remove}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
