// 장바구니 줄 묶음 (서랍과 /cart가 같이 쓴다): 대분류별로 묶고, 줄마다 이름·소분류·메모(고치기)·빼기.
// 줄(li)은 data-line=<id>와 tabIndex=-1이라 '이미 담은 재료를 다시 담기'가 그 줄로 초점을 옮길 수 있다.
// 빼면 다음 줄(없으면 앞 줄, 그것도 없으면 [data-cart-top])로 초점을 옮긴다.
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import type { NavCategory } from '../lib/catalog/types.ts';
import { groupByCategory, namesOf } from '../lib/receipt-md.ts';
import { itemPath, listPath } from '../lib/routes.ts';
import type { CartLine } from '../lib/saved.ts';
import { MEMO_MAX } from '../lib/saved.ts';
import { removeFromCart, setCartMemo } from '../lib/store.ts';
import { fill } from '../lib/text.ts';

interface Props {
  lines: CartLine[];
  nav: NavCategory[];
  /** 묶음 제목 단계 (서랍 h3, 장바구니 쪽 h2) */
  level: 'h2' | 'h3';
  /** 같은 쪽에 두 벌(서랍·쪽)이 있어도 id가 겹치지 않게 */
  idPrefix: string;
}

function focusAfterRemove(li: HTMLElement | null): void {
  if (!li) return;
  const root = li.closest('[data-cart-root]');
  const all = root ? [...root.querySelectorAll<HTMLElement>('[data-line]')] : [];
  const at = all.indexOf(li);
  const next = all[at + 1] ?? all[at - 1];
  const nextId = next?.dataset['line'];
  window.requestAnimationFrame(() => {
    const target = (nextId && root?.querySelector<HTMLElement>(`[data-line="${CSS.escape(nextId)}"]`)) || root?.querySelector<HTMLElement>('[data-cart-top]');
    target?.focus();
  });
}

function Line({ line, sub, idPrefix }: { line: CartLine; sub: string; idPrefix: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(line.memo ?? '');
  const li = useRef<HTMLLIElement>(null);
  const memoBtn = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  // 누른 [메모 고치기] 바로 그 자리에 열리는 입력 칸으로 초점
  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);
  const fieldId = `${idPrefix}-memo-${line.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  function done(save: boolean): void {
    if (save) {
      setCartMemo(line.id, draft);
      announce(fill(ko.line.savedLive, { name: line.name }));
    } else setDraft(line.memo ?? '');
    setEditing(false);
    window.requestAnimationFrame(() => memoBtn.current?.focus());
  }

  return (
    <li class="cart-line" data-line={line.id} tabIndex={-1} ref={li}>
      <div class="cart-line-text">
        <a class="cart-name" href={itemPath(line.id)}>
          {line.name}
        </a>
        <a class="cart-sub" href={listPath(line.cat, line.sub)}>
          {sub}
        </a>
        {editing ? (
          <form
            class="memo-form"
            onSubmit={(e) => {
              e.preventDefault();
              done(true);
            }}
          >
            <label class="visually-hidden" for={fieldId}>
              {fill(ko.line.memoField, { name: line.name })}
            </label>
            <textarea
              id={fieldId}
              class="memo"
              rows={2}
              maxLength={MEMO_MAX}
              value={draft}
              placeholder={ko.item.memoPlaceholder}
              onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  done(false);
                } else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                  e.preventDefault();
                  done(true);
                }
              }}
              ref={field}
            />
            <div class="memo-acts">
              <button type="submit" class="btn btn-sm btn-soft">
                {ko.line.save}
              </button>
              <button type="button" class="btn btn-sm btn-text" onClick={() => done(false)}>
                {ko.line.cancel}
              </button>
            </div>
          </form>
        ) : (
          line.memo && (
            <p class="cart-memo">
              <span class="visually-hidden">{ko.cart.memo}: </span>
              {line.memo}
            </p>
          )
        )}
      </div>
      {!editing && (
        <div class="cart-line-acts">
          <button
            type="button"
            class="btn btn-sm btn-text"
            ref={memoBtn}
            aria-label={fill(line.memo ? ko.line.editMemoLabel : ko.line.addMemoLabel, { name: line.name })}
            onClick={() => {
              setDraft(line.memo ?? '');
              setEditing(true);
            }}
          >
            {line.memo ? ko.line.editMemo : ko.line.addMemo}
          </button>
          <button
            type="button"
            class="btn btn-sm"
            aria-label={fill(ko.line.removeLabel, { name: line.name })}
            onClick={() => {
              focusAfterRemove(li.current);
              removeFromCart(line.id);
              announce(fill(ko.card.removedLive, { name: line.name }));
            }}
          >
            {ko.line.remove}
          </button>
        </div>
      )}
    </li>
  );
}

export function CartLines({ lines, nav, level, idPrefix }: Props) {
  const names = namesOf(nav);
  const H = level;
  return (
    <div class="cart-groups">
      {groupByCategory(lines).map((g) => (
        <section class="cart-group" aria-labelledby={`${idPrefix}-${g.cat}`} data-cat={g.cat}>
          <H id={`${idPrefix}-${g.cat}`} class="cart-group-title">
            {names.cat(g.cat)} <span class="cart-group-n">{fill(ko.drawer.count, { n: g.lines.length })}</span>
          </H>
          <ul class="cart-lines">
            {g.lines.map((l) => (
              <Line key={l.id} line={l} sub={names.sub(l.cat, l.sub)} idPrefix={idPrefix} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
