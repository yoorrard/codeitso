// 지난 영수증 섬 (brief 6.11, D67 W3b): 받은 영수증을 최근 것부터 30장까지. 줄 72 = 미니 지도 56×40 + 이름 + '받은 날 · 영수증 0427'
// + 오른쪽 지우기 44(확인 대화 상자를 거친다). 줄을 누르면 /arrival#r=…로 다시 연다 (그때는 대표 장면 S5가 돌지 않는다, ARCHITECTURE 5절).
// 미니 지도는 영수증 링크 조각을 풀어 엔진을 돌린 모형(MapSvg mini: 길·마디·빈 터)이고, 풀 수 없으면 앱 종류 청사진 타일을 둔다.
// 영수증 번호는 링크 조각의 해시에서 계산해 보여 주기만 한다(receipt-no.ts). 저장은 store.ts 한 곳.
import { useStore } from '@nanostores/preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import { evaluate, fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { mapModel } from '../lib/map/model.ts';
import type { MapModel } from '../lib/map/model.ts';
import { receiptDate, receiptNo } from '../lib/receipt-no.ts';
import { ROUTES } from '../lib/routes.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import type { ReceiptEntry } from '../lib/saved.ts';
import { readShareHash, SHARE_PREFIX } from '../lib/share.ts';
import { $receipts, forgetReceipt } from '../lib/store.ts';
import { ArtTile } from './Glyph.tsx';
import { MapSvg } from './MapBoard.tsx';

const typeQuestion = catalog.question.get('q.type');
const nameOf = (e: ReceiptEntry): string => typeQuestion?.options.find((o) => o.id === e.type && !o.isUnknown)?.label ?? ko.receipts.unnamed;
const typeArt: Record<string, string> = {
  record: 'L01',
  form: 'L02',
  page: 'L03',
  quiz: 'L04',
  tool: 'L05',
  board: 'L06',
};

/** 링크 조각을 풀어 도착한 지도의 모형으로. 깨진 조각이면 null (앱 종류 타일로 대신한다) */
function miniModel(r: string): MapModel | null {
  const read = readShareHash(SHARE_PREFIX + r);
  if (read.status !== 'ok') return null;
  return mapModel(evaluate(catalog, { ...EMPTY_SESSION, ...read.session }), {
    arrived: true,
  });
}

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
  model: MapModel | null;
}

export default function ReceiptsList() {
  const ready = useHydrated();
  const live = useStore($receipts);
  const list = ready ? live : [];
  const rows = useMemo<Row[]>(
    () =>
      list.map((e) => ({
        e,
        name: nameOf(e),
        no: receiptNo(e.r),
        model: miniModel(e.r),
      })),
    [list],
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
                    {row.model ? <MapSvg model={row.model} variant="mini" /> : <ArtTile name={(row.e.type && typeArt[row.e.type]) ?? 'L00'} size="md" />}
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
