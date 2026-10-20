// 상품 상세 섬 (/item?id=…, D103): 상품이 13만 개라 쪽을 미리 만들지 않고, 빌드가 id 해시로 나눈 상세 조각
// (/catalog/item/<n>.json, 1024개)에서 이 상품을 꺼내 그린다. 위에서 아래로: 위치 → 종류별 큰 미리 보기(DetailPreview) | 이름·한국어 설명(원문은 접어 둔다)·담기
// → 상품 정보 표 → 쓰는 법(출처가 준 설치 명령·조각만) → 관련 상품. 넓은 화면은 오른쪽 담기 칸이 붙어 따라온다.
// N1 (D137): 맨 위 [뒤로]·위치(뒤로의 기본 행선지는 이 상품의 소분류 목록), 담기 옆 찜 하트(wish-buttons.ts가 맡는다),
// 공유(기기 공유 창 또는 주소 복사), 관련 상품 머리의 [비슷한 재료와 비교](이 상품 + 관련 상품 3개).
// O1 (D138): 설명 속 어려운 말에 점선 밑줄(누르면 풀이), 설명 아래 '어려운 말 풀이' 안내 (TermHint.tsx).
// D141: models.dev 모델 자료가 있는 AI API는 위 칸 바로 아래에 '모델·요금' 표(ModelsSection).
import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { dateOf, formatCount, pickSummary, shardOf } from '../lib/catalog/core.ts';
import type { DetailRecord, NavCategory, Shard } from '../lib/catalog/types.ts';
import { METRIC_ICON } from '../lib/labels.ts';
import { openCart } from '../lib/cart-ui.ts';
import { ROUTES, categoryPath, comparePath, itemDataPath, itemPath, listPath } from '../lib/routes.ts';
import { $cart, $wish, markViewed } from '../lib/store.ts';
import { fill } from '../lib/text.ts';
import CopyButton from './CopyButton.tsx';
import { DetailPreview } from './DetailPreview.tsx';
import { Icon } from './Icon.tsx';
import { ModelsSection, hasModels } from './ModelsSection.tsx';
import { PageTop } from './PageTop.tsx';
import { ShareButton } from './ShareButton.tsx';
import { TermHint, TermText, useTermSegments } from './TermHint.tsx';

interface Props {
  nav: NavCategory[];
}

type State = { k: 'loading' } | { k: 'noId' } | { k: 'missing' } | { k: 'failed' } | { k: 'ok'; item: DetailRecord };

function readId(): string {
  return new URLSearchParams(window.location.search).get('id')?.trim() ?? '';
}

function names(nav: NavCategory[], cat: string, sub: string): { cat: string; sub: string } {
  const c = nav.find((x) => x.id === cat);
  return {
    cat: c?.name ?? cat,
    sub: c?.subs.find((s) => s.id === sub)?.name ?? sub,
  };
}

/** 담기 칸: [장바구니에 담기]를 누르면 담기 창(메모 선택 → [담기])이 뜬다 (src/lib/cart-buttons.ts, data-add). 담긴 뒤에는 [담겼어요]로 메모 고치기·빼기 */
function AddBox({ item }: { item: DetailRecord }) {
  const cart = useStore($cart);
  const wish = useStore($wish);
  const line = cart.find((x) => x.id === item.id);
  const on = line !== undefined;
  const wished = wish.some((x) => x.id === item.id);
  return (
    <div class="buy-box">
      <button
        type="button"
        class="btn btn-lg buy-wish"
        data-wish={item.id}
        data-name={item.name}
        data-cat={item.category}
        data-sub={item.kind}
        aria-pressed={wished ? 'true' : 'false'}
        aria-label={fill(ko.card.wishLabel, { name: item.name })}
      >
        <span class="wish-off" aria-hidden="true">
          <Icon name="heart" size="22px" />
        </span>
        <span class="wish-on" aria-hidden="true">
          <Icon name="heartFill" size="22px" />
        </span>
      </button>
      <button
        type="button"
        class={on ? 'btn btn-soft btn-lg buy-add' : 'btn btn-primary btn-lg buy-add'}
        data-add={item.id}
        data-name={item.name}
        data-cat={item.category}
        data-sub={item.kind}
        data-in={String(on)}
        aria-label={fill(on ? ko.card.inCartLabel : ko.card.addLabel, {
          name: item.name,
        })}
      >
        <Icon name={on ? 'check' : 'cart'} size="20px" />
        {on ? ko.card.added : ko.item.add}
      </button>
      {line?.memo && <p class="buy-memo">{fill(ko.item.memo, { memo: line.memo })}</p>}
      {on && (
        <button type="button" class="btn btn-text buy-go" onClick={() => openCart(item.id)}>
          {ko.item.goCart}
        </button>
      )}
    </div>
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
  const segs = useTermSegments(summary);
  return (
    <article class="detail">
      <PageTop
        back={listPath(item.category, item.kind)}
        crumbs={[
          { href: ROUTES.home, label: ko.site.name },
          { href: categoryPath(item.category), label: n.cat },
          { href: listPath(item.category, item.kind), label: n.sub },
        ]}
      />
      <div class="detail-top">
        <DetailPreview item={item} />
        <div class="detail-buy">
          <p class="detail-cat">
            <a href={listPath(item.category, item.kind)}>{n.sub}</a>
            <span class="detail-src">{item.source.name}</span>
          </p>
          <h1 class="detail-name">{item.name}</h1>
          <p class="detail-sum">
            <TermText text={summary} segs={segs} />
          </p>
          {(item.written || item.koBy) && <p class="field-hint">{ko.item.summaryWritten}</p>}
          {original && (
            <details class="detail-orig">
              <summary>{ko.item.summarySource}</summary>
              <p lang="en">{original}</p>
            </details>
          )}
          <TermHint marked={!!segs?.some((x) => typeof x !== 'string')} />
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
          <div class="detail-acts">
            <a class="btn btn-text detail-open" href={item.url} target="_blank" rel="noopener noreferrer">
              {ko.item.open}
              <Icon name="external" size="16px" label={ko.common.external} />
            </a>
            <ShareButton title={item.name} />
          </div>
        </div>
      </div>
      {hasModels(item) && <ModelsSection item={item} />}
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
            <pre tabIndex={0}>
              <code>{use.install}</code>
            </pre>
            <CopyButton text={use.install} srLabel={ko.item.install} />
          </div>
        )}
        {use.snippet && (
          <div class="code-block">
            <p class="code-label">{ko.item.snippet}</p>
            <pre tabIndex={0}>
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
          <div class="sec-head">
            <h2 id="rel-title">{ko.item.related}</h2>
            <a class="sec-more" href={comparePath([item.id, ...item.rel.slice(0, 3).map(([id]) => id)])}>
              <Icon name="columns" size="16px" />
              {ko.item.compare}
            </a>
          </div>
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
        markViewed({ id: item.id, name: item.name, cat: item.category, sub: item.kind }, Date.now());
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
    <>
      <PageTop back={ROUTES.home} crumbs={[]} />
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
    </>
  );
}
