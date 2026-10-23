// 장바구니 쪽 섬 (/cart, brief 3절): 공유받은 목록(#s=…) → 만들 앱 한 줄 → 대분류별 줄(메모 고치기·빼기)
// → 장바구니 도구(설치 명령 한꺼번에 복사·공유 링크 복사·모두 비우기) | 담은 재료 요약(대분류별 개수, 합계 0원, [프롬프트 뽑기] → 단말 화면 창).
import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import type { DetailRecord, NavCategory } from '../lib/catalog/types.ts';
import { fetchDetails } from '../lib/pull.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { groupByCategory, installBundle, namesOf } from '../lib/prompt.ts';
import { ROUTES, shareUrl } from '../lib/routes.ts';
import { PROJECT_MAX } from '../lib/saved.ts';
import { modelProviderOf } from '../lib/catalog/models.ts';
import { providerModels } from '../lib/model-data.ts';
import type { ModelChoice } from '../lib/saved.ts';
import { readShareEntries } from '../lib/share.ts';
import { $cart, $project, $storageOk, addManyToCart, clearCart, setProject } from '../lib/store.ts';
import { fill } from '../lib/text.ts';
import { useHeld } from '../lib/wait.ts';
import { CartLines } from './CartLines.tsx';
import CopyButton from './CopyButton.tsx';
import { PromptButton } from './PromptButton.tsx';
import { Sk, SkRows, SkSet } from './Skeleton.tsx';

interface Props {
  nav: NavCategory[];
}

type Load<T> = { k: 'loading' } | { k: 'failed' } | { k: 'ok'; v: T };

/** 공유받은 모델 id → 이름 (제공자 모델 파일에서, 못 찾으면 id 그대로) */
async function sharedModels(entries: readonly { id: string; model?: string }[]): Promise<Map<string, ModelChoice>> {
  const out = new Map<string, ModelChoice>();
  await Promise.all(
    entries.map(async (e) => {
      const provider = modelProviderOf(e.id);
      if (!e.model || !provider) return;
      const row = await providerModels(provider)
        .then((f) => f.rows.find((r) => r.id === e.model))
        .catch(() => undefined);
      out.set(e.id, { id: e.model, name: row?.name ?? e.model });
    }),
  );
  return out;
}

/** 공유받은 목록 (#s=…): 재료 이름을 상세 자료에서 찾아 보여 주고 [모두 담기]. 고른 모델(D141)도 함께 담는다 */
function Shared({ entries, nav, onDone }: { entries: { id: string; model?: string }[]; nav: NavCategory[]; onDone: () => void }) {
  const [got, setGot] = useState<Load<{ items: DetailRecord[]; models: Map<string, ModelChoice> }>>({ k: 'loading' });
  const [tries, setTries] = useState(0);
  const waiting = useHeld(got.k === 'loading');
  const names = namesOf(nav);
  const ids = entries.map((e) => e.id);
  useEffect(() => {
    let live = true;
    setGot({ k: 'loading' });
    Promise.all([fetchDetails(ids), sharedModels(entries)])
      .then(([m, models]) => live && setGot({ k: 'ok', v: { items: ids.map((id) => m.get(id)).filter((x): x is DetailRecord => x !== undefined), models } }))
      .catch(() => live && setGot({ k: 'failed' }));
    return () => {
      live = false;
    };
  }, [entries.map((e) => `${e.id}@${e.model ?? ''}`).join(','), tries]);
  const found = got.k === 'ok' && !waiting ? got.v.items : [];
  const models = got.k === 'ok' ? got.v.models : new Map<string, ModelChoice>();
  const missing = got.k === 'ok' && !waiting ? ids.length - found.length : 0;
  return (
    <section class="shared" aria-labelledby="shared-title" data-shared>
      <h2 id="shared-title" tabIndex={-1}>
        {fill(ko.shared.title, { n: ids.length })}
      </h2>
      <p class="muted">{ko.shared.lead}</p>
      {waiting && (
        <SkSet label={ko.shared.loading}>
          <SkRows n={Math.min(ids.length, 6)} />
        </SkSet>
      )}
      {got.k === 'failed' && (
        <p role="alert">
          {ko.shared.failed}{' '}
          <button type="button" class="btn btn-sm" onClick={() => setTries((n) => n + 1)}>
            {ko.shared.retry}
          </button>
        </p>
      )}
      {found.length > 0 && (
        <ul class="shared-list">
          {groupByCategory(found.map((d) => ({ ...d, cat: d.category }))).flatMap((g) =>
            g.lines.map((d) => (
              <li data-cat={d.category}>
                <span class="shared-cat">{names.cat(d.category)}</span> {d.name}
                {models.has(d.id) && <span class="shared-model"> · {fill(ko.models.shared, { model: models.get(d.id)?.name ?? '' })}</span>}
              </li>
            )),
          )}
        </ul>
      )}
      {missing > 0 && <p class="field-hint">{fill(ko.shared.missing, { n: missing })}</p>}
      <div class="shared-acts">
        {found.length > 0 && (
          <button
            type="button"
            class="btn btn-primary"
            aria-label={fill(ko.shared.addAllLabel, { n: found.length })}
            onClick={() => {
              const r = addManyToCart(
                found.map((d) => {
                  const model = models.get(d.id);
                  return { id: d.id, name: d.name, cat: d.category, sub: d.kind, ...(model ? { model } : {}) };
                }),
                Date.now(),
              );
              announce(r.full ? ko.card.full : r.skipped > 0 ? fill(ko.shared.addedSkip, { added: r.added, skipped: r.skipped }) : fill(ko.shared.addedLive, { added: r.added }));
              onDone();
            }}
          >
            {ko.shared.addAll}
          </button>
        )}
        <button type="button" class="btn" onClick={onDone}>
          {ko.shared.dismiss}
        </button>
      </div>
    </section>
  );
}

/** 설치 명령 한꺼번에 복사: 담은 재료의 상세 자료에서 설치 명령만 모은다 */
function InstallAll({ ids }: { ids: string[] }) {
  const cart = useStore($cart);
  const [got, setGot] = useState<Load<Map<string, DetailRecord>>>({ k: 'loading' });
  const [tries, setTries] = useState(0);
  const waiting = useHeld(got.k === 'loading');
  const key = ids.join(',');
  useEffect(() => {
    let live = true;
    setGot({ k: 'loading' });
    fetchDetails(ids)
      .then((m) => live && setGot({ k: 'ok', v: m }))
      .catch(() => live && setGot({ k: 'failed' }));
    return () => {
      live = false;
    };
  }, [key, tries]);
  // 모으는 동안 [설치 명령 한꺼번에 복사] 단추 자리에 같은 크기의 판 (U, D148)
  if (waiting)
    return (
      <SkSet label={ko.cart.installLoading} class="install-all">
        <Sk w="15rem" h="var(--btn-md)" />
      </SkSet>
    );
  if (got.k === 'failed')
    return (
      <p class="field-hint" role="alert">
        {ko.cart.installFailed}{' '}
        <button type="button" class="btn btn-text btn-sm" onClick={() => setTries((n) => n + 1)}>
          {ko.cart.installRetry}
        </button>
      </p>
    );
  if (got.k !== 'ok') return null;
  const bundle = installBundle(cart.map((l) => ({ name: l.name, install: got.v.get(l.id)?.use?.install })));
  if (bundle.count === 0) return <p class="field-hint">{ko.cart.installNone}</p>;
  return (
    <div class="install-all">
      <CopyButton text={bundle.text} label={ko.cart.installAll} srLabel={fill(ko.cart.installAllLabel, { n: bundle.count })} done={fill(ko.cart.installCopied, { n: bundle.count })} />
      <span class="field-hint">{fill(ko.cart.installCount, { n: bundle.count })}</span>
    </div>
  );
}

/** 만들 앱 한 줄: 쓰는 동안은 칸 안에만 두고, 칸을 떠날 때(프롬프트 뽑기를 누를 때도) 저장한다 */
function ProjectBox() {
  const [draft, setDraft] = useState($project.get());
  return (
    <div class="project-box">
      <label class="field-label" for="cart-project">
        {ko.cart.project}
      </label>
      <textarea
        id="cart-project"
        class="memo"
        rows={2}
        maxLength={PROJECT_MAX}
        placeholder={ko.cart.projectPlaceholder}
        aria-describedby="cart-project-hint"
        value={draft}
        onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
        onChange={(e) => setProject((e.target as HTMLTextAreaElement).value)}
      />
      <p id="cart-project-hint" class="field-hint">
        {ko.cart.projectHint}
      </p>
    </div>
  );
}

function ClearAll({ n }: { n: number }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" class="btn btn-text" onClick={() => setAsking(true)}>
        {ko.cart.clear}
      </button>
    );
  return (
    <div class="clear-ask" role="group" aria-labelledby="clear-ask">
      <p id="clear-ask">{fill(ko.cart.clearAsk, { n })}</p>
      <button
        type="button"
        class="btn btn-sm"
        onClick={() => {
          clearCart();
          announce(ko.cart.clearedLive);
        }}
      >
        {ko.cart.clearConfirm}
      </button>
      <button type="button" class="btn btn-sm btn-text" onClick={() => setAsking(false)}>
        {ko.cart.cancel}
      </button>
    </div>
  );
}

export default function CartPage({ nav }: Props) {
  const cart = useStore($cart);
  const ok = useStore($storageOk);
  const ready = useHydrated();
  const lines = ready ? cart : [];
  const names = namesOf(nav);
  const [shared, setShared] = useState<{ id: string; model?: string }[]>([]);

  useEffect(() => {
    const read = (): void => setShared(readShareEntries(window.location.hash));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  function closeShared(): void {
    window.history.replaceState(null, '', ROUTES.cart);
    setShared([]);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.cart-page [data-cart-top]')?.focus());
  }

  const ids = lines.map((l) => l.id);
  return (
    <div class="cart-page" data-cart-root>
      {shared.length > 0 && <Shared entries={shared} nav={nav} onDone={closeShared} />}
      {!ok && <p class="notice">{ko.layout.storageOff}</p>}
      <p class="cart-count" role="status" tabIndex={-1} data-cart-top>
        {lines.length > 0 ? fill(ko.cart.count, { n: lines.length }) : ready ? ko.cart.empty : ''}
      </p>
      {/* 깨어나기 전에는 저장된 장바구니를 몰라 빈 안내를 그리지 않는다 (담은 사람에게 '비었어요'가 번쩍이지 않게, U D148) */}
      {!ready ? null : lines.length === 0 ? (
        <div class="cart-empty">
          <a class="btn btn-primary" href={ROUTES.home}>
            {ko.cart.browse}
          </a>
          <a class="btn btn-text" href={ROUTES.prompts}>
            {ko.cart.history}
          </a>
        </div>
      ) : (
        <div class="cart-layout">
          <div class="cart-main">
            <ProjectBox />
            <CartLines lines={lines} nav={nav} level="h2" idPrefix="cp" />
            <section class="cart-tools" aria-labelledby="cart-tools-title">
              <h2 id="cart-tools-title" class="visually-hidden">
                {ko.cart.tools}
              </h2>
              <InstallAll ids={ids} />
              <div class="share-row">
                <CopyButton text={shareUrl(lines.map((l) => ({ id: l.id, ...(l.model ? { model: l.model.id } : {}) })))} label={ko.cart.share} done={ko.cart.shareCopied} />
                <span class="field-hint">{ko.cart.shareNote}</span>
              </div>
              <ClearAll n={lines.length} />
            </section>
          </div>
          <aside class="cart-summary" aria-labelledby="sum-title">
            <h2 id="sum-title">{ko.cart.summary}</h2>
            <ul class="sum-cats">
              {groupByCategory(lines).map((g) => (
                <li data-cat={g.cat}>
                  <span class="sum-dot" aria-hidden="true" />
                  {fill(ko.cart.perCat, { name: names.cat(g.cat), n: g.lines.length })}
                </li>
              ))}
            </ul>
            <p class="sum-total">
              <span>{ko.cart.total}</span>
              <strong>{ko.cart.free}</strong>
            </p>
            <p class="field-hint">{ko.cart.freeNote}</p>
            <PromptButton nav={nav} wide />
            <a class="btn btn-text" href={ROUTES.prompts}>
              {ko.cart.history}
            </a>
          </aside>
        </div>
      )}
    </div>
  );
}
