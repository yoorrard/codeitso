// 상품 상세 섬 (/item?id=…, D103): 상품이 13만 개라 쪽을 미리 만들지 않고, 빌드가 id 해시로 나눈 상세 조각
// (/catalog/item/<n>.json, 1024개)에서 이 상품을 꺼내 그린다. 위에서 아래로: 위치 → 큰 미리 보기 | 이름·설명·담기(+메모)
// → 상품 정보 표 → 쓰는 법(출처가 준 설치 명령·조각만) → 관련 상품. 넓은 화면은 오른쪽 담기 칸이 붙어 따라온다.
import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { dateOf, formatCount, paletteColors, pickSummary, shardOf, thumbOf } from '../lib/catalog/core.ts';
import type { DetailRecord, NavCategory, Shard } from '../lib/catalog/types.ts';
import { contrast, isHex, ratio2 } from '../lib/color.ts';
import { METRIC_ICON } from '../lib/labels.ts';
import { ROUTES, categoryPath, itemDataPath, itemPath, listPath } from '../lib/routes.ts';
import { $cart, addToCart, removeFromCart, setCartMemo } from '../lib/store.ts';
import { MEMO_MAX } from '../lib/saved.ts';
import { fill } from '../lib/text.ts';
import CopyButton from './CopyButton.tsx';
import { Icon } from './Icon.tsx';
import { Thumb } from './Thumb.tsx';

interface Props {
  nav: NavCategory[];
}

type State = { k: 'loading' } | { k: 'noId' } | { k: 'missing' } | { k: 'failed' } | { k: 'ok'; item: DetailRecord };

const WHITE = '#FFFFFF'; // floor-guard-ignore: 색 견본의 대비를 재는 기준 흰색(자료 계산), 화면 색이 아니다
const BLACK = '#000000'; // floor-guard-ignore: 색 견본의 대비를 재는 기준 검은색(자료 계산), 화면 색이 아니다

function readId(): string {
  return new URLSearchParams(window.location.search).get('id')?.trim() ?? '';
}

function names(nav: NavCategory[], cat: string, sub: string): { cat: string; sub: string } {
  const c = nav.find((x) => x.id === cat);
  return { cat: c?.name ?? cat, sub: c?.subs.find((s) => s.id === sub)?.name ?? sub };
}

function AddBox({ item }: { item: DetailRecord }) {
  const cart = useStore($cart);
  const line = cart.find((x) => x.id === item.id);
  const [memo, setMemo] = useState(line?.memo ?? '');
  useEffect(() => setMemo(line?.memo ?? ''), [line?.id]);
  const memoId = 'item-memo';
  return (
    <div class="buy-box">
      <label class="field-label" for={memoId}>
        {ko.item.memoLabel}
      </label>
      <textarea
        id={memoId}
        class="memo"
        rows={2}
        maxLength={MEMO_MAX}
        placeholder={ko.item.memoPlaceholder}
        aria-describedby="item-memo-hint"
        value={memo}
        onInput={(e) => setMemo((e.target as HTMLTextAreaElement).value)}
      />
      <p id="item-memo-hint" class="field-hint">
        {ko.item.memoHint}
      </p>
      {line ? (
        <>
          <p class="in-cart" role="status">
            <Icon name="check" size="18px" />
            {ko.item.inCart}
          </p>
          <div class="buy-actions">
            <button
              type="button"
              class="btn btn-soft"
              onClick={() => {
                setCartMemo(item.id, memo);
                announce(ko.item.savedLive);
              }}
            >
              {ko.item.saveMemo}
            </button>
            <button
              type="button"
              class="btn"
              onClick={() => {
                removeFromCart(item.id);
                announce(fill(ko.card.removedLive, { name: item.name }));
              }}
            >
              {ko.item.remove}
            </button>
            <a class="btn btn-text" href={ROUTES.cart}>
              {ko.item.goCart}
            </a>
          </div>
        </>
      ) : (
        <button
          type="button"
          class="btn btn-primary btn-lg buy-add"
          onClick={() => {
            if (addToCart({ id: item.id, name: item.name, cat: item.category, sub: item.kind, memo }, Date.now())) announce(fill(ko.card.addedLive, { name: item.name }));
            else announce(ko.card.full);
          }}
        >
          <Icon name="cart" size="20px" />
          {ko.item.add}
        </button>
      )}
    </div>
  );
}

function Preview({ item }: { item: DetailRecord }) {
  const thumb = thumbOf(item, 8);
  const colors = paletteColors(item);
  return (
    <section class="detail-preview" aria-labelledby="pv-title">
      <h2 id="pv-title" class="visually-hidden">
        {ko.item.preview}
      </h2>
      <Thumb thumb={thumb} uid={`detail:${item.id}`} large />
      {colors.length > 0 && (
        <ul class="swatches" aria-label={fill(ko.item.colors, { n: colors.length })}>
          {colors.map((c) => (
            <li>
              <span class="swatch" style={{ background: c.hex }} aria-hidden="true" />
              <span class="swatch-text">
                <code>{c.hex.toUpperCase()}</code>
                {c.name && <span>{c.name}</span>}
                {isHex(c.hex) && (
                  <span class="swatch-ratio">
                    {fill(ko.item.onWhite, { r: ratio2(contrast(c.hex, WHITE)).toFixed(2) })} · {fill(ko.item.onBlack, { r: ratio2(contrast(c.hex, BLACK)).toFixed(2) })}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {thumb.t === 'img' && <p class="field-hint">{ko.item.externalNote}</p>}
    </section>
  );
}

function Detail({ item, nav }: { item: DetailRecord; nav: NavCategory[] }) {
  const n = names(nav, item.category, item.kind);
  const m = item.metrics ?? {};
  const metrics = (['stars', 'downloads', 'likes'] as const).filter((k) => typeof m[k] === 'number');
  const updated = dateOf(item);
  const summary = pickSummary(item);
  const original = item.summaryKo && item.summary.trim() !== item.summaryKo.trim() ? item.summary : null;
  const use = item.use ?? {};
  return (
    <article class="detail">
      <nav class="crumbs" aria-label={ko.item.breadcrumb}>
        <ol>
          <li>
            <a href={ROUTES.home}>{ko.site.name}</a>
          </li>
          <li>
            <a href={categoryPath(item.category)}>{n.cat}</a>
          </li>
          <li>
            <a href={listPath(item.category, item.kind)}>{n.sub}</a>
          </li>
        </ol>
      </nav>
      <div class="detail-top">
        <Preview item={item} />
        <div class="detail-buy">
          <p class="detail-cat">
            <a href={listPath(item.category, item.kind)}>{n.sub}</a>
            <span class="detail-src">{item.source.name}</span>
          </p>
          <h1 class="detail-name">{item.name}</h1>
          <p class="detail-sum">{summary}</p>
          {item.written && <p class="field-hint">{ko.item.summaryWritten}</p>}
          {original && (
            <details class="detail-orig">
              <summary>{ko.item.summarySource}</summary>
              <p lang="en">{original}</p>
            </details>
          )}
          {metrics.length > 0 && (
            <ul class="detail-metrics">
              {metrics.map((k) => (
                <li>
                  <Icon name={METRIC_ICON[k]} size="16px" />
                  {ko.card.metric[k]} {formatCount(m[k] ?? 0)}
                </li>
              ))}
            </ul>
          )}
          <AddBox item={item} />
          <a class="btn btn-text detail-open" href={item.url} target="_blank" rel="noopener noreferrer">
            {ko.item.open}
            <Icon name="external" size="16px" label={ko.common.external} />
          </a>
        </div>
      </div>
      <section class="detail-sec" aria-labelledby="info-title">
        <h2 id="info-title">{ko.item.info}</h2>
        <dl class="info-table">
          <dt>{ko.item.rows.category}</dt>
          <dd>
            <a href={categoryPath(item.category)}>{n.cat}</a> › <a href={listPath(item.category, item.kind)}>{n.sub}</a>
          </dd>
          <dt>{ko.item.rows.source}</dt>
          <dd>
            <a href={item.source.url} target="_blank" rel="noopener noreferrer">
              {item.source.name}
            </a>
          </dd>
          <dt>{ko.item.rows.license}</dt>
          <dd>{item.license ? <code>{item.license}</code> : <span class="muted">{ko.item.licenseNone}</span>}</dd>
          {metrics.length > 0 && (
            <>
              <dt>{ko.item.rows.popularity}</dt>
              <dd>{metrics.map((k) => `${ko.card.metric[k]} ${formatCount(m[k] ?? 0)}`).join(' · ')}</dd>
            </>
          )}
          {updated && (
            <>
              <dt>{ko.item.rows.updated}</dt>
              <dd>{updated}</dd>
            </>
          )}
          <dt>{ko.item.rows.fetched}</dt>
          <dd>{item.fetchedAt.slice(0, 10)}</dd>
          <dt>{ko.item.rows.url}</dt>
          <dd class="info-url">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              {item.url}
            </a>
          </dd>
          {item.tags.length > 0 && (
            <>
              <dt>{ko.item.rows.tags}</dt>
              <dd>
                <ul class="tag-list">
                  {item.tags.slice(0, 16).map((t) => (
                    <li>{t}</li>
                  ))}
                </ul>
              </dd>
            </>
          )}
        </dl>
      </section>
      <section class="detail-sec" aria-labelledby="use-title">
        <h2 id="use-title">{ko.item.use}</h2>
        {use.install && (
          <div class="code-block">
            <p class="code-label">{ko.item.install}</p>
            <pre>
              <code>{use.install}</code>
            </pre>
            <CopyButton text={use.install} srLabel={ko.item.install} />
          </div>
        )}
        {use.snippet && (
          <div class="code-block">
            <p class="code-label">{ko.item.snippet}</p>
            <pre>
              <code>{use.snippet}</code>
            </pre>
            <CopyButton text={use.snippet} srLabel={ko.item.snippet} />
          </div>
        )}
        {use.docs && (
          <p>
            <a href={use.docs} target="_blank" rel="noopener noreferrer">
              {ko.item.docs}
              <Icon name="external" size="16px" label={ko.common.external} />
            </a>
          </p>
        )}
        {!use.install && !use.snippet && !use.docs && <p class="muted">{ko.item.useNone}</p>}
      </section>
      {item.rel.length > 0 && (
        <section class="detail-sec" aria-labelledby="rel-title">
          <h2 id="rel-title">{ko.item.related}</h2>
          <ul class="rel-list">
            {item.rel.map(([id, name]) => (
              <li>
                <a href={itemPath(id)}>
                  <span class="rel-name">{name}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export default function ItemDetail({ nav }: Props) {
  const [state, setState] = useState<State>({ k: 'loading' });
  const [tries, setTries] = useState(0);

  useEffect(() => {
    const id = readId();
    if (!id) {
      setState({ k: 'noId' });
      return;
    }
    let live = true;
    setState({ k: 'loading' });
    fetch(itemDataPath(shardOf(id)))
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Shard>;
      })
      .then((shard) => {
        if (!live) return;
        const item = shard[id];
        if (!item) {
          setState({ k: 'missing' });
          return;
        }
        document.title = `${item.name} · ${ko.site.name}`;
        setState({ k: 'ok', item });
      })
      .catch(() => live && setState({ k: 'failed' }));
    return () => {
      live = false;
    };
  }, [tries]);

  if (state.k === 'ok') return <Detail item={state.item} nav={nav} />;
  const text = state.k === 'loading' ? ko.item.loading : state.k === 'noId' ? ko.item.noId : state.k === 'missing' ? ko.item.notFound : ko.item.failed;
  return (
    <div class="detail-empty" role={state.k === 'loading' ? 'status' : 'alert'}>
      <h1>{ko.item.pageTitle}</h1>
      <p>{text}</p>
      {state.k === 'failed' && (
        <button type="button" class="btn" onClick={() => setTries((n) => n + 1)}>
          {ko.item.retry}
        </button>
      )}
      {state.k !== 'loading' && (
        <a class="btn btn-text" href={ROUTES.home}>
          {ko.item.toHome}
        </a>
      )}
    </div>
  );
}
