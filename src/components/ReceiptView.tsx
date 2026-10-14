// 영수증 쪽 섬 (/receipt?id=…, brief 3절): 이 브라우저에 남긴 영수증 한 장. 0원 영수증(번호·때·만들 앱·대분류별 재료와 개수·합계)
// → [.md 받기] · [복사] · [공유 링크 복사] · [장바구니에 다시 담기] → 재료 목록(.md) 미리 보기.
import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import type { NavCategory } from '../lib/catalog/types.ts';
import { issuedNow } from '../lib/clock.ts';
import { downloadText } from '../lib/download.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { groupByCategory, mdFileName, namesOf, receiptMarkdown } from '../lib/receipt-md.ts';
import { ROUTES, shareUrl, siteRoot } from '../lib/routes.ts';
import type { Receipt } from '../lib/saved.ts';
import { $receipts, addManyToCart } from '../lib/store.ts';
import { fill } from '../lib/text.ts';
import { track } from '../lib/track.ts';
import CopyButton from './CopyButton.tsx';
import { Icon } from './Icon.tsx';

interface Props {
  nav: NavCategory[];
}

/** [.md 받기]: 파일을 내려받고 알린다 (영수증 쪽과 지난 영수증이 같이 쓴다) */
export function downloadReceipt(r: Receipt, nav: NavCategory[]): void {
  const file = mdFileName(r.at);
  downloadText(file, receiptMarkdown(r, namesOf(nav), siteRoot()));
  announce(fill(ko.receipt.downloaded, { file }));
  track('md_download');
}

function Paper({ r, nav }: { r: Receipt; nav: NavCategory[] }) {
  const names = namesOf(nav);
  return (
    <article class="receipt" aria-labelledby="receipt-title">
      <header class="receipt-head">
        <p class="receipt-shop">{ko.receipt.shop}</p>
        <h1 id="receipt-title" class="receipt-title" tabIndex={-1}>
          {ko.receipt.title}
        </h1>
        <dl class="receipt-meta">
          <div>
            <dt>{ko.receipt.noLabel}</dt>
            <dd class="receipt-no">{fill(ko.receipt.no, { no: r.no })}</dd>
          </div>
          <div>
            <dt>{ko.receipt.dateLabel}</dt>
            <dd>{issuedNow(new Date(r.at))}</dd>
          </div>
        </dl>
      </header>
      {r.project && (
        <p class="receipt-project">
          <span class="receipt-label">{ko.receipt.project}</span> {r.project}
        </p>
      )}
      {groupByCategory(r.lines).map((g) => (
        <section class="receipt-group" aria-labelledby={`rc-${g.cat}`} data-cat={g.cat}>
          <h2 id={`rc-${g.cat}`} class="receipt-cat">
            <span>{names.cat(g.cat)}</span>
            <span class="receipt-qty">{fill(ko.receipt.qty, { n: g.lines.length })}</span>
          </h2>
          <ul class="receipt-lines">
            {g.lines.map((l) => (
              <li>
                <span class="receipt-name">{l.name}</span>
                <span class="receipt-dots" aria-hidden="true" />
                <span class="receipt-price">{ko.receipt.free}</span>
                {l.memo && <span class="receipt-memo">{l.memo}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p class="receipt-total">
        <span>{ko.receipt.total}</span>
        <strong>{ko.receipt.free}</strong>
      </p>
      <p class="receipt-paid">{fill(ko.receipt.paid, { n: r.lines.length })}</p>
      <p class="receipt-thanks">{ko.receipt.thanks}</p>
    </article>
  );
}

export default function ReceiptView({ nav }: Props) {
  const list = useStore($receipts);
  const ready = useHydrated();
  const [id, setId] = useState('');
  useEffect(() => setId(new URLSearchParams(window.location.search).get('id')?.trim() ?? ''), []);
  if (!ready) return <p role="status">{ko.item.loading}</p>;
  const r = list.find((x) => x.id === id);
  if (!r)
    return (
      <div class="detail-empty" role="alert">
        <h1>{ko.receipt.pageTitle}</h1>
        <p>{ko.receipt.notFound}</p>
        <a class="btn" href={ROUTES.receipts}>
          {ko.receipt.receipts}
        </a>
        <a class="btn btn-text" href={ROUTES.home}>
          {ko.receipt.toHome}
        </a>
      </div>
    );
  const md = receiptMarkdown(r, namesOf(nav), siteRoot());
  return (
    <div class="receipt-page">
      <Paper r={r} nav={nav} />
      <div class="receipt-side">
        <div class="receipt-acts">
          <button type="button" class="btn btn-primary btn-lg" aria-label={ko.receipt.downloadLabel} onClick={() => downloadReceipt(r, nav)}>
            <Icon name="download" size="20px" />
            {ko.receipt.download}
          </button>
          <CopyButton text={md} label={ko.receipt.copy} srLabel={ko.receipt.copyLabel} done={ko.receipt.copied} onCopied={() => track('md_copy')} />
          <CopyButton text={shareUrl(r.lines.map((l) => l.id))} label={ko.receipt.share} done={ko.cart.shareCopied} />
          <button
            type="button"
            class="btn"
            onClick={() => {
              const res = addManyToCart(
                r.lines.map((l) => ({ id: l.id, name: l.name, cat: l.cat, sub: l.sub, ...(l.memo ? { memo: l.memo } : {}) })),
                Date.now(),
              );
              announce(res.full ? ko.card.full : fill(ko.receipt.readdLive, { added: res.added }));
            }}
          >
            <Icon name="cart" size="20px" />
            {ko.receipt.readd}
          </button>
        </div>
        <p class="field-hint">{ko.cart.shareNote}</p>
        <details class="md-preview">
          <summary>{ko.receipt.preview}</summary>
          <pre>
            <code>{md}</code>
          </pre>
        </details>
        <a class="btn btn-text" href={ROUTES.receipts}>
          {ko.receipt.receipts}
        </a>
      </div>
    </div>
  );
}
