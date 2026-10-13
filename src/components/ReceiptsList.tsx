// 지난 영수증 섬 (docs/CONCEPT.md 6.11, T32): 받은 영수증을 최근 것부터 30장까지. 줄을 누르면 /arrival#r=…로 다시 연다.
// 저장은 store.ts 한 곳. 이렇게 다시 열 때는 대표 장면 S5가 돌지 않는다 (ARCHITECTURE 5절).
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import { fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { ROUTES } from '../lib/routes.ts';
import type { ReceiptEntry } from '../lib/saved.ts';
import { SHARE_PREFIX } from '../lib/share.ts';
import { $receipts, forgetReceipt } from '../lib/store.ts';
import { ArtTile } from './Glyph.tsx';
import { Icon } from './Icon.tsx';

const typeQuestion = catalog.question.get('q.type');
const nameOf = (e: ReceiptEntry): string => typeQuestion?.options.find((o) => o.id === e.type && !o.isUnknown)?.label ?? ko.receipts.unnamed;
const typeArt: Record<string, string> = { record: 'L01', form: 'L02', page: 'L03', quiz: 'L04', tool: 'L05', board: 'L06' };

export default function ReceiptsList() {
  const ready = useHydrated();
  const live = useStore($receipts);
  const list = ready ? live : [];

  if (list.length === 0) {
    return (
      <div class="receipts-empty">
        <ArtTile name="P01" size="hero" class="receipts-empty-art" />
        <p>{ko.receipts.empty}</p>
        <a class="btn btn-primary" href={ROUTES.destination}>
          {ko.receipts.goBuild}
        </a>
      </div>
    );
  }

  return (
    <>
      <p class="receipts-count">{fill(ko.receipts.count, { n: list.length })}</p>
      <ul class="receipts-list">
        {list.map((e) => {
          const name = nameOf(e);
          return (
            <li class="receipts-row" key={e.r}>
              <a class="receipts-open" href={`${ROUTES.arrival}${SHARE_PREFIX}${e.r}`} aria-label={fill(ko.receipts.open, { name })}>
                <ArtTile name={(e.type && typeArt[e.type]) ?? 'L00'} size="md" />
                <span class="receipts-text">
                  <span class="receipts-name">{name}</span>
                  <span class="receipts-at">{e.at}</span>
                </span>
              </a>
              <button
                type="button"
                class="btn btn-quiet"
                aria-label={fill(ko.receipts.removeLabel, { name, at: e.at })}
                onClick={() => {
                  forgetReceipt(e.r);
                  announce(fill(ko.receipts.removed, { name }));
                }}
              >
                <Icon name="close" />
                <span>{ko.receipts.remove}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
