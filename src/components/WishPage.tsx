// 찜한 재료 /wishlist (N1, D137): 카드·상세의 하트로 모은 재료(이 브라우저에만, 300개까지). 장바구니는 이번 앱에 쓸 재료,
// 찜은 나중에 쓸 재료라 따로 둔다. 소분류마다 묶어 보이고, 묶음마다 2~4개를 골라 비교(/compare)로 넘긴다.
// 줄마다 [담기](담기 창, src/lib/cart-buttons.ts)·[빼기], 위에 [모두 장바구니에 담기]·[모두 지우기]. 뺀 뒤에는 [되돌리기]가 잠깐 남는다.
import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { CARDS_EVENT } from '../lib/cart-ui.ts';
import { withCommas } from '../lib/catalog/core.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { CATEGORY_ICON } from '../lib/icons.ts';
import { ROUTES, comparePath, itemPath } from '../lib/routes.ts';
import type { WishItem } from '../lib/saved.ts';
import { $wish, addManyToCart, clearWish, removeWish, restoreWish } from '../lib/store.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';

interface Props {
  /** 대분류 id → 이름, '대분류/소분류' → 소분류 이름 */
  names: Record<string, string>;
}

/** 비교에 넣을 수 있는 재료 수 */
const COMPARE_MAX = 4;

interface Group {
  key: string;
  cat: string;
  items: WishItem[];
}

/** 소분류마다 묶는다 (가장 최근에 찜한 재료가 든 묶음이 앞) */
function groupsOf(list: readonly WishItem[]): Group[] {
  const map = new Map<string, Group>();
  for (const x of list) {
    const key = `${x.cat}/${x.sub}`;
    const g = map.get(key) ?? { key, cat: x.cat, items: [] };
    g.items.push(x);
    map.set(key, g);
  }
  return [...map.values()];
}

export default function WishPage({ names }: Props) {
  const list = useStore($wish);
  const ready = useHydrated();
  /** 묶음 → 비교에 고른 id (고른 적 없으면 앞에서 COMPARE_MAX개) */
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [undo, setUndo] = useState<WishItem[] | null>(null);

  // 새로 그린 [담기] 버튼의 담은 상태를 맞춘다
  useEffect(() => {
    if (ready) document.dispatchEvent(new CustomEvent(CARDS_EVENT));
  }, [ready, list]);

  if (!ready) return null;

  const focusTitle = (): void => document.getElementById('wish-title')?.focus();

  const remove = (x: WishItem): void => {
    setUndo(list);
    removeWish(x.id);
    announce(fill(ko.wish.removedLive, { name: x.name }));
    // 빼기 단추가 사라지므로 초점을 쪽 제목으로 옮긴다
    if (list.length === 1) focusTitle();
  };

  const restore = (): void => {
    if (!undo) return;
    restoreWish(undo);
    setUndo(null);
    announce(ko.wish.undone);
  };

  const undoBar = undo && (
    <p class="wish-undo" role="status">
      <span>{ko.wish.undoNote}</span>
      <button type="button" class="btn btn-text btn-sm" onClick={restore} aria-label={ko.wish.undoLabel}>
        {ko.wish.undo}
      </button>
    </p>
  );

  if (list.length === 0) {
    return (
      <div class="wish-page">
        {undoBar}
        <div class="recent-empty">
          <p>{ko.wish.empty}</p>
          <a class="btn btn-soft" href={ROUTES.categories}>
            {ko.wish.browse}
          </a>
        </div>
      </div>
    );
  }

  const addAll = (): void => {
    const r = addManyToCart(
      list.map(({ id, name, cat, sub }) => ({ id, name, cat, sub })),
      Date.now(),
    );
    announce(
      r.full
        ? ko.wish.cartFull
        : r.added === 0
          ? ko.wish.addedNone
          : r.skipped > 0
            ? fill(ko.wish.addedSome, { n: r.added, m: r.skipped })
            : fill(ko.wish.addedAll, { n: r.added }),
    );
  };

  const clearAll = (): void => {
    setUndo(list);
    clearWish();
    announce(ko.wish.clearedLive);
    focusTitle();
  };

  const groups = groupsOf(list);
  const chosenOf = (g: Group): string[] => (picked[g.key] ?? g.items.slice(0, COMPARE_MAX).map((x) => x.id)).filter((id) => g.items.some((x) => x.id === id));
  const flip = (g: Group, id: string): void => {
    const cur = chosenOf(g);
    setPicked({ ...picked, [g.key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  return (
    <div class="wish-page">
      <div class="wish-bar">
        <p class="wish-count">{fill(ko.wish.count, { n: withCommas(list.length) })}</p>
        <div class="wish-acts">
          <button type="button" class="btn btn-primary" onClick={addAll}>
            <Icon name="cart" size="18px" />
            {ko.wish.addAll}
          </button>
          <button type="button" class="btn btn-text" onClick={clearAll} aria-label={ko.wish.clearLabel}>
            {ko.wish.clear}
          </button>
        </div>
      </div>
      {undoBar}
      {groups.map((g) => {
        const chosen = chosenOf(g);
        // 자료가 바뀌어 저장해 둔 소분류가 없어졌으면 대분류 이름만 쓴다 (id를 그대로 보이지 않게)
        const catName = names[g.cat] ?? g.cat;
        const subName = names[g.key];
        const title = subName ? fill(ko.wish.groupTitle, { cat: catName, sub: subName }) : catName;
        return (
          <section class="wish-group" data-cat={g.cat} aria-labelledby={`wg-${g.key}`}>
            <div class="sec-head">
              <h2 id={`wg-${g.key}`}>
                <span class="cat-dot" aria-hidden="true">
                  <Icon name={CATEGORY_ICON[g.cat as keyof typeof CATEGORY_ICON] ?? 'tag'} size="18px" />
                </span>
                {title} <span class="wish-group-n">{fill(ko.wish.groupCount, { n: g.items.length })}</span>
              </h2>
            </div>
            <ul class="wish-list">
              {g.items.map((x) => {
                const on = chosen.includes(x.id);
                return (
                  <li class="wish-line" key={x.id}>
                    {g.items.length > 1 && (
                      <label class="wish-pick">
                        <input type="checkbox" checked={on} disabled={!on && chosen.length >= COMPARE_MAX} onChange={() => flip(g, x.id)} />
                        <span class="visually-hidden">{fill(ko.wish.pickLabel, { name: x.name })}</span>
                      </label>
                    )}
                    <a class="wish-name" href={itemPath(x.id)}>
                      {x.name}
                    </a>
                    <div class="wish-line-acts">
                      <button
                        type="button"
                        class="add-btn is-line"
                        data-add={x.id}
                        data-name={x.name}
                        data-cat={x.cat}
                        data-sub={x.sub}
                        data-in="false"
                        aria-label={fill(ko.card.addLabel, { name: x.name })}
                      >
                        <span class="add-on" aria-hidden="true">
                          <Icon name="check" size="16px" />
                        </span>
                        <span class="add-off" aria-hidden="true">
                          <Icon name="plus" size="16px" />
                        </span>
                        <span class="add-label">{ko.card.add}</span>
                      </button>
                      <button type="button" class="btn btn-text btn-sm" onClick={() => remove(x)} aria-label={fill(ko.wish.removeLabel, { name: x.name })}>
                        {ko.wish.remove}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {g.items.length > 1 && (
              <div class="wish-compare">
                {chosen.length >= 2 ? (
                  <a class="btn btn-soft" href={comparePath(chosen)}>
                    <Icon name="columns" size="18px" />
                    {fill(ko.wish.compare, { n: chosen.length })}
                  </a>
                ) : (
                  <p class="field-hint">{ko.wish.compareHint}</p>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
