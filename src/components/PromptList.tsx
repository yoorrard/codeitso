// 지난 프롬프트 섬 (/prompts, v5.1): 이 브라우저에 남긴 프롬프트(최근 30개). 줄마다 때·만들 앱·대분류별 개수와
// [보기](단말 화면 창)·[.md 받기]·[다시 담기]·[지우기].
import { useStore } from '@nanostores/preact';
import { useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import type { NavCategory } from '../lib/catalog/types.ts';
import { issuedNow } from '../lib/clock.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { groupByCategory, namesOf } from '../lib/prompt.ts';
import { ROUTES } from '../lib/routes.ts';
import type { PromptEntry } from '../lib/saved.ts';
import { $prompts, addManyToCart, removePrompt } from '../lib/store.ts';
import { fill } from '../lib/text.ts';
import { PromptDialog, downloadPrompt } from './PromptDialog.tsx';

interface Props {
  nav: NavCategory[];
}

export default function PromptList({ nav }: Props) {
  const all = useStore($prompts);
  const ready = useHydrated();
  const [open, setOpen] = useState<PromptEntry | null>(null);
  const list = ready ? all : [];
  const names = namesOf(nav);
  if (list.length === 0)
    return (
      <div class="cart-empty" data-cart-root>
        <p tabIndex={-1} data-cart-top>
          {ready ? ko.prompts.empty : ''}
        </p>
        <a class="btn btn-primary" href={ROUTES.home}>
          {ko.prompts.browse}
        </a>
      </div>
    );
  return (
    <>
      <ul class="rc-list" data-cart-root>
        {list.map((p) => {
          const date = issuedNow(new Date(p.at));
          return (
            <li class="rc-item" data-prompt={p.id}>
              <div class="rc-text">
                <p class="rc-no">{date}</p>
                {p.project && <p class="rc-project">{p.project}</p>}
                <p class="rc-cats">
                  {groupByCategory(p.lines)
                    .map((g) => fill(ko.cart.perCat, { name: names.cat(g.cat), n: g.lines.length }))
                    .join(' · ')}
                </p>
                <p class="rc-sum">{fill(ko.prompts.summary, { n: p.lines.length })}</p>
              </div>
              <div class="rc-acts">
                <button type="button" class="btn btn-soft" aria-label={fill(ko.prompts.openLabel, { date })} onClick={() => setOpen(p)}>
                  {ko.prompts.open}
                </button>
                <button type="button" class="btn" aria-label={fill(ko.prompts.downloadLabel, { date })} onClick={() => downloadPrompt(p, nav)}>
                  {ko.prompts.download}
                </button>
                <button
                  type="button"
                  class="btn"
                  aria-label={fill(ko.prompts.readdLabel, { date })}
                  onClick={() => {
                    const r = addManyToCart(
                      p.lines.map((l) => ({ id: l.id, name: l.name, cat: l.cat, sub: l.sub, ...(l.memo ? { memo: l.memo } : {}) })),
                      Date.now(),
                    );
                    announce(r.full ? ko.card.full : fill(ko.prompts.readdLive, { added: r.added }));
                  }}
                >
                  {ko.prompts.readd}
                </button>
                <button
                  type="button"
                  class="btn btn-text"
                  aria-label={fill(ko.prompts.removeLabel, { date })}
                  onClick={() => {
                    removePrompt(p.id);
                    announce(ko.prompts.removedLive);
                    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('h1')?.focus());
                  }}
                >
                  {ko.prompts.remove}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {open && <PromptDialog key={open.id} entry={open} nav={nav} onClose={() => setOpen(null)} />}
    </>
  );
}
