// 재료 비교 /compare?ids=a,b,c (N1, D137): 2~4개 재료를 한 표에 나란히 (Amazon '비슷한 상품 비교'·npm 비교처럼).
// 상세 조각(/catalog/item/<n>.json)에서 꺼내 그리므로 값은 모두 출처 자료 그대로다(지어내지 않는다, 없으면 '출처에 없음').
// 들어오는 길: 상세의 [비슷한 재료와 비교](이 재료 + 관련 상품 3개), 찜한 재료에서 같은 소분류끼리 고른 것.
// 휴대폰에서는 표를 옆으로 민다(표 칸만 밀리고 쪽은 밀리지 않는다, 첫 칸은 붙어 있다). [빼기]로 열을 빼면 주소도 바꾼다.
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { CARDS_EVENT } from '../lib/cart-ui.ts';
import { dateOf, factsOf, formatCount, pickSummary, shardOf } from '../lib/catalog/core.ts';
import type { DetailRecord, NavCategory, Shard } from '../lib/catalog/types.ts';
import { factLabel } from '../lib/labels.ts';
import { comparePath, itemDataPath, itemPath, listPath } from '../lib/routes.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';

interface Props {
  nav: NavCategory[];
}

/** 한 번에 비교하는 재료 수 */
const MAX = 4;

type State = { k: 'loading' } | { k: 'noIds' } | { k: 'failed' } | { k: 'ok'; items: DetailRecord[]; missing: number };

function readIds(): string[] {
  const raw = new URLSearchParams(window.location.search).get('ids') ?? '';
  return [...new Set(raw.split(',').map((x) => x.trim()).filter((x) => x !== ''))].slice(0, MAX);
}

async function load(ids: readonly string[]): Promise<{ items: DetailRecord[]; missing: number }> {
  const shards = [...new Set(ids.map((id) => shardOf(id)))];
  const files = new Map<number, Shard>();
  await Promise.all(
    shards.map(async (n) => {
      const r = await fetch(itemDataPath(n));
      if (!r.ok) throw new Error(String(r.status));
      files.set(n, (await r.json()) as Shard);
    }),
  );
  const items = ids.map((id) => files.get(shardOf(id))?.[id]).filter((x): x is DetailRecord => x !== undefined);
  return { items, missing: ids.length - items.length };
}

export default function ComparePage({ nav }: Props) {
  const [state, setState] = useState<State>({ k: 'loading' });
  const [tries, setTries] = useState(0);

  useEffect(() => {
    const ids = readIds();
    if (ids.length === 0) {
      setState({ k: 'noIds' });
      return;
    }
    let live = true;
    setState({ k: 'loading' });
    load(ids)
      .then((r) => live && setState({ k: 'ok', ...r }))
      .catch(() => live && setState({ k: 'failed' }));
    return () => {
      live = false;
    };
  }, [tries]);

  // 표의 [담기] 버튼 상태를 맞춘다 (src/lib/cart-buttons.ts)
  useEffect(() => {
    if (state.k === 'ok') document.dispatchEvent(new CustomEvent(CARDS_EVENT));
  }, [state]);

  if (state.k !== 'ok') {
    const text = state.k === 'loading' ? ko.compare.loading : state.k === 'noIds' ? ko.compare.noIds : ko.compare.failed;
    return (
      <div class="cmp-status" role={state.k === 'loading' ? 'status' : 'alert'}>
        <p>{text}</p>
        {state.k === 'failed' && (
          <button type="button" class="btn" onClick={() => setTries((n) => n + 1)}>
            {ko.compare.retry}
          </button>
        )}
      </div>
    );
  }

  const { items, missing } = state;
  const subName = (it: DetailRecord): string => nav.find((c) => c.id === it.category)?.subs.find((s) => s.id === it.kind)?.name ?? it.kind;
  const remove = (it: DetailRecord): void => {
    const next = items.filter((x) => x.id !== it.id);
    setState({ k: 'ok', items: next, missing });
    window.history.replaceState(null, '', comparePath(next.map((x) => x.id)));
    announce(fill(ko.compare.removedLive, { name: it.name }));
    document.getElementById('cmp-title')?.focus();
  };
  const none = <span class="muted">{ko.compare.none}</span>;
  const metrics = (it: DetailRecord) => {
    const m = it.metrics ?? {};
    const list = (['stars', 'downloads', 'likes'] as const).filter((k) => typeof m[k] === 'number');
    return list.length > 0 ? list.map((k) => `${ko.card.metric[k]} ${formatCount(m[k] ?? 0)}`).join(' · ') : none;
  };
  const rows: { label: string; cell: (it: DetailRecord) => ComponentChildren }[] = [
    { label: ko.compare.rows.sub, cell: (it) => <a href={listPath(it.category, it.kind)}>{subName(it)}</a> },
    { label: ko.compare.rows.summary, cell: (it) => <span class="cmp-sum">{pickSummary(it)}</span> },
    { label: ko.compare.rows.source, cell: (it) => it.source.name },
    { label: ko.compare.rows.license, cell: (it) => (it.license ? <code>{it.license}</code> : none) },
    { label: ko.compare.rows.popularity, cell: metrics },
    { label: ko.compare.rows.updated, cell: (it) => dateOf(it) ?? none },
    {
      label: ko.compare.rows.facts,
      cell: (it) => {
        const facts = factsOf(it);
        return facts.length > 0 ? (
          <ul class="card-facts">
            {facts.map((f) => (
              <li>{factLabel(f)}</li>
            ))}
          </ul>
        ) : (
          none
        );
      },
    },
    { label: ko.compare.rows.install, cell: (it) => (it.use?.install ? <code class="cmp-code">{it.use.install}</code> : none) },
    {
      label: ko.compare.rows.url,
      cell: (it) => (
        <a href={it.url} target="_blank" rel="noopener noreferrer">
          {ko.compare.open}
          <Icon name="external" size="14px" label={ko.common.external} />
        </a>
      ),
    },
  ];

  return (
    <div class="cmp-page">
      {missing > 0 && <p class="notice">{fill(ko.compare.missing, { n: missing })}</p>}
      {items.length < 2 && <p class="notice">{ko.compare.few}</p>}
      {items.length > 0 && (
        <div class="cmp-scroll" role="region" aria-labelledby="cmp-cap" tabIndex={0}>
          <table class="cmp">
            <caption id="cmp-cap" class="visually-hidden">
              {ko.compare.tableLabel}
            </caption>
            <thead>
              <tr>
                <td class="cmp-corner" />
                {items.map((it) => (
                  <th scope="col" data-cat={it.category}>
                    <a class="cmp-name" href={itemPath(it.id)}>
                      {it.name}
                    </a>
                    <div class="cmp-head-acts">
                      <button
                        type="button"
                        class="add-btn is-line"
                        data-add={it.id}
                        data-name={it.name}
                        data-cat={it.category}
                        data-sub={it.kind}
                        data-in="false"
                        aria-label={fill(ko.card.addLabel, { name: it.name })}
                      >
                        <span class="add-on" aria-hidden="true">
                          <Icon name="check" size="16px" />
                        </span>
                        <span class="add-off" aria-hidden="true">
                          <Icon name="plus" size="16px" />
                        </span>
                        <span class="add-label">{ko.card.add}</span>
                      </button>
                      <button type="button" class="btn btn-text btn-sm" onClick={() => remove(it)} aria-label={fill(ko.compare.removeLabel, { name: it.name })}>
                        {ko.compare.remove}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr>
                  <th scope="row">{r.label}</th>
                  {items.map((it) => (
                    <td>{r.cell(it)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
