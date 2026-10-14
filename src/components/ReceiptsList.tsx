// 지난 영수증 섬 (brief 6.11, D67 W3b): 받은 영수증을 최근 것부터 30장까지. 줄 72 = 앱 종류 청사진 타일 + 이름 + '받은 날 · 영수증 0427'
// + 오른쪽 지우기 44(확인 대화 상자를 거친다). 줄을 누르면 /arrival#r=…로 다시 연다 (ARCHITECTURE 5절).
// 넓은 화면에서는 카드 격자다 (v4 D98, receipts.css). 미니 지도는 걷어 냈다 (v4 D96).
// 영수증 번호는 링크 조각의 해시에서 계산해 보여 주기만 한다(receipt-no.ts). 저장은 store.ts 한 곳.
// 이름은 앱 종류 보기 이름이다. 직접 쓴 앱(type.custom, T37)이면 '직접 쓰기'가 아니라 내 말을 쓰되, 내 말은 링크에도 지난 영수증 기록에도
// 넣지 않으므로(설계서 7.6절, 3.7절) 지금 브라우저의 진행(cc:session:v1)과 같은 영수증일 때만 그 말을 보이고, 아니면 '내 앱'이다.
import { useStore } from '@nanostores/preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import { evaluate, fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { receiptDate, receiptNo } from '../lib/receipt-no.ts';
import { ROUTES } from '../lib/routes.ts';
import type { ReceiptEntry } from '../lib/saved.ts';
import { shareHash, SHARE_PREFIX } from '../lib/share.ts';
import { $receipts, $session, forgetReceipt } from '../lib/store.ts';
import { ArtTile } from './Glyph.tsx';

const typeQuestion = catalog.question.get('q.type');

/** 지금 브라우저의 진행이 받을 영수증: 링크 조각과 직접 쓴 앱의 내 말 (이 브라우저에만 있다) */
interface Own {
  r: string;
  note: string | undefined;
}

/** 줄 이름: 앱 종류 보기 이름. '모르겠어요'는 '내 앱', 직접 쓴 앱은 지금 진행과 같은 영수증일 때만 내 말 */
const nameOf = (e: ReceiptEntry, own: Own): string => {
  const o = typeQuestion?.options.find((x) => x.id === e.type && x.isUnknown !== true);
  if (o?.isCustom === true) return e.r === own.r && own.note ? own.note : ko.receipts.unnamed;
  return o?.label ?? ko.receipts.unnamed;
};
const typeArt: Record<string, string> = {
  record: 'L01',
  form: 'L02',
  page: 'L03',
  quiz: 'L04',
  tool: 'L05',
  board: 'L06',
};

function dateText(at: string): string {
  const d = receiptDate(at, new Date().getFullYear());
  if (!d) return at;
  return fill(d.sameYear ? ko.receipts.date : ko.receipts.dateYear, {
    y: d.y,
    m: d.m,
    d: d.d,
  });
}

interface Row {
  e: ReceiptEntry;
  name: string;
  no: string;
}

export default function ReceiptsList() {
  const ready = useHydrated();
  const live = useStore($receipts);
  const session = useStore($session);
  const list = ready ? live : [];
  const own = useMemo<Own>(() => {
    const s = evaluate(catalog, session).session;
    return { r: shareHash(s).slice(SHARE_PREFIX.length), note: s.notes?.['q.type'] };
  }, [session]);
  const rows = useMemo<Row[]>(
    () =>
      list.map((e) => ({
        e,
        name: nameOf(e, own),
        no: receiptNo(e.r),
      })),
    [list, own],
  );
  const [asking, setAsking] = useState<Row | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (asking && !dialog.current?.open) dialog.current?.showModal();
  }, [asking]);

  const ask = (row: Row, btn: HTMLButtonElement): void => {
    opener.current = btn;
    setAsking(row);
  };

  /** 대화 상자가 닫힐 때: 지웠으면 다음 줄(없으면 제목)로, 그만뒀으면 누른 버튼으로 초점을 돌린다 */
  const closed = (): void => {
    const row = asking;
    const removed = dialog.current?.returnValue === 'yes' && row !== null;
    setAsking(null);
    if (!removed) {
      opener.current?.focus();
      return;
    }
    const at = rows.findIndex((x) => x.e.r === row.e.r);
    forgetReceipt(row.e.r);
    announce(fill(ko.receipts.removed, { name: row.name }));
    // 지운 줄이 빠진 뒤에 초점을 옮긴다
    window.requestAnimationFrame(() => {
      const links = root.current?.querySelectorAll<HTMLElement>('.receipt-del');
      const next = links?.[Math.min(at, (links?.length ?? 1) - 1)];
      if (next) next.focus();
      else root.current?.querySelector<HTMLElement>('.empty-state-title')?.focus();
    });
  };

  if (!ready) return <div class="receipts-wait" />;

  return (
    <div ref={root} class="receipts">
      {rows.length === 0 ? (
        <div class="empty-state">
          <ArtTile name="P01" size="hero" class="empty-state-art" />
          <h2 class="empty-state-title" tabIndex={-1}>
            {ko.receipts.empty}
          </h2>
          <p class="empty-state-text">{ko.receipts.emptyText}</p>
          <a class="btn btn-primary" href={ROUTES.destination}>
            {ko.receipts.goBuild}
          </a>
        </div>
      ) : (
        <>
          <p class="receipts-count">{fill(ko.receipts.count, { n: rows.length })}</p>
          <ul class="list group receipts-list">
            {rows.map((row) => (
              <li key={row.e.r}>
                <a class="list-row is-tall" href={`${ROUTES.arrival}${SHARE_PREFIX}${row.e.r}`}>
                  <span class="list-map" aria-hidden="true">
                    <ArtTile name={(row.e.type && typeArt[row.e.type]) ?? 'L00'} size="md" />
                  </span>
                  <span class="list-text">
                    <span class="list-name">{row.name}</span>
                    <span class="list-sub">
                      {fill(ko.receipts.sub, {
                        date: dateText(row.e.at),
                        no: row.no,
                      })}
                    </span>
                  </span>
                </a>
                <button
                  type="button"
                  class="icon-btn receipt-del"
                  aria-label={fill(ko.receipts.removeLabel, {
                    name: row.name,
                    no: row.no,
                  })}
                  aria-haspopup="dialog"
                  onClick={(ev) => ask(row, ev.currentTarget)}
                >
                  <span class="i-mask i-trash" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <dialog ref={dialog} class="sheet" aria-labelledby="receipt-del-title" aria-describedby="receipt-del-body" onClose={closed}>
        <h2 id="receipt-del-title">{ko.receipts.confirmTitle}</h2>
        <p id="receipt-del-body">
          {asking
            ? fill(ko.receipts.confirmBody, {
                name: asking.name,
                no: asking.no,
              })
            : ''}
        </p>
        <form method="dialog" class="sheet-actions">
          <button class="btn btn-neutral" value="no">
            {ko.receipts.confirmNo}
          </button>
          <button class="btn btn-danger" value="yes">
            {ko.receipts.confirmYes}
          </button>
        </form>
      </dialog>
    </div>
  );
}
