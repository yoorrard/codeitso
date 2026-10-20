// AI 모델 표 (D141): 상세 '모델·요금'과 /models 비교가 같이 쓴다. 값은 models.dev 그대로(src/lib/catalog/models.ts가 쓰기만 다듬는다).
// 넓은 화면(1024px 이상)은 진짜 표(<table>, 비교 쪽은 머리 칸 정렬 단추와 aria-sort), 좁은 화면은 모델마다 카드 목록(<ul>)이라
// 쪽이 옆으로 밀리지 않는다. 줄마다 모델 id 복사와 [담기](그 모델을 고른 채로 담기 창, data-model → src/lib/cart-buttons.ts).
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { CARDS_EVENT } from '../lib/cart-ui.ts';
import type { ModelProvider, ModelRow, ModelSort, SortDir } from '../lib/catalog/models.ts';
import { MODALITIES, tokens, usd } from '../lib/catalog/models.ts';
import { copyText } from '../lib/clipboard.ts';
import { itemPath } from '../lib/routes.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';
import '../styles/models.css';

/** 담기 버튼이 담는 상품 (제공자) */
export interface ModelItem {
  id: string;
  name: string;
  cat: string;
  sub: string;
}

type Row = ModelRow & { p?: string };

interface Props {
  rows: readonly Row[];
  /** 표 이름 (caption) */
  caption: string;
  /** 한 회사 상세: 그 상품. 비교 쪽은 줄마다 providers에서 찾는다 */
  item?: ModelItem;
  providers?: ReadonlyMap<string, ModelProvider>;
  /** 비교 쪽: 머리 칸 정렬 */
  sort?: { key: ModelSort; dir: SortDir; onSort: (key: ModelSort) => void };
  /** 지식 기준일 칸 (상세만) */
  knowledge?: boolean;
}

const WIDE = '(min-width: 1024px)';

/** 넓은 화면인가 (표 ↔ 카드). 서버 그림(섬 밖)은 카드(휴대폰 먼저), 브라우저는 처음부터 화면 폭대로 */
export function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = (): void => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

const t = ko.models;

function Price({ v }: { v: number | undefined }) {
  if (v === undefined)
    return (
      <span class="muted">
        <span aria-hidden="true">—</span>
        <span class="visually-hidden">{t.none}</span>
      </span>
    );
  return <>{usd(v)}</>;
}

function Tok({ v }: { v: number | undefined }) {
  return v === undefined ? <Price v={undefined} /> : <>{tokens(v)}</>;
}

function Yes({ on }: { on: boolean | undefined }) {
  return on ? (
    <span class="mt-yes">
      <Icon name="check" size="16px" />
      <span class="visually-hidden">{t.yes}</span>
    </span>
  ) : (
    <span class="muted">
      <span aria-hidden="true">—</span>
      <span class="visually-hidden">{t.no}</span>
    </span>
  );
}

function inputsOf(r: Row): string {
  return MODALITIES.filter((m) => r.mi.includes(m))
    .map((m) => t.modality[m])
    .join('·');
}

/** 모델 id 복사 (작은 단추, 누르는 곳은 44px) */
function CopyId({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      class="mt-copy"
      aria-label={fill(t.copyIdLabel, { id })}
      data-state={done ? 'done' : 'idle'}
      onClick={() => {
        void copyText(id).then((ok) => {
          announce(ok ? t.copiedId : ko.common.copyFailed);
          if (!ok) return;
          setDone(true);
          window.setTimeout(() => setDone(false), 2000);
        });
      }}
    >
      <Icon name={done ? 'check' : 'copy'} size="16px" />
    </button>
  );
}

function Badges({ r }: { r: Row }) {
  if (!r.status && !r.open) return null;
  return (
    <span class="mt-badges">
      {r.status && <span class={`mt-badge is-${r.status}`}>{t.status[r.status]}</span>}
      {r.open && <span class="mt-badge">{t.open}</span>}
    </span>
  );
}

function ModelName({ r }: { r: Row }) {
  return (
    <div class="mt-model">
      <span class="mt-name">{r.name}</span>
      <Badges r={r} />
      <span class="mt-id">
        <code>{r.id}</code>
        <CopyId id={r.id} />
      </span>
    </div>
  );
}

function AddModel({ r, item }: { r: Row; item: ModelItem }) {
  return (
    <button
      type="button"
      class="add-btn is-line mt-add"
      data-add={item.id}
      data-name={item.name}
      data-cat={item.cat}
      data-sub={item.sub}
      data-model={r.id}
      data-model-name={r.name}
      data-in="false"
      aria-label={fill(t.addLabel, { model: r.name, name: item.name })}
    >
      <span class="add-on" aria-hidden="true">
        <Icon name="check" size="16px" />
      </span>
      <span class="add-off" aria-hidden="true">
        <Icon name="plus" size="16px" />
      </span>
      <span class="add-label">{ko.card.add}</span>
    </button>
  );
}

function itemFor(r: Row, item: ModelItem | undefined, providers: ReadonlyMap<string, ModelProvider> | undefined): ModelItem | undefined {
  if (item) return item;
  const p = r.p !== undefined ? providers?.get(r.p) : undefined;
  return p ? { id: p.item, name: p.name, cat: 'api', sub: p.sub } : undefined;
}

function SortHead({ label, k, sort, num }: { label: string; k: ModelSort; sort: NonNullable<Props['sort']>; num?: boolean }) {
  const on = sort.key === k;
  return (
    <th scope="col" class={num ? 'is-num' : undefined} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" class="mt-sort" data-on={String(on)} onClick={() => sort.onSort(k)}>
        {label}
        <span class="mt-sort-mark" aria-hidden="true">
          {on ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}

function Head({ label, k, sort, num }: { label: string; k?: ModelSort; sort?: Props['sort']; num?: boolean }) {
  if (k && sort) return <SortHead label={label} k={k} sort={sort} num={num} />;
  return (
    <th scope="col" class={num ? 'is-num' : undefined}>
      {label}
    </th>
  );
}

function Table({ rows, caption, item, providers, sort, knowledge }: Props) {
  const c = t.cols;
  const withProvider = !item;
  return (
    <div class="mt-scroll" role="region" aria-labelledby="mt-cap" tabIndex={0}>
      <table class="mt">
        <caption id="mt-cap" class="visually-hidden">
          {caption}
        </caption>
        <thead>
          <tr>
            <Head label={c.model} />
            {withProvider && <Head label={c.provider} />}
            <Head label={c.input} k="in" sort={sort} num />
            <Head label={c.output} k="out" sort={sort} num />
            <Head label={c.cache} num />
            <Head label={c.context} k="ctx" sort={sort} num />
            <Head label={c.maxOut} num />
            <Head label={c.inputs} />
            <Head label={c.reasoning} />
            <Head label={c.tools} />
            {knowledge && <Head label={c.knowledge} />}
            <Head label={c.release} k="release" sort={sort} />
            <th scope="col">
              <span class="visually-hidden">{c.add}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const it = itemFor(r, item, providers);
            const pname = r.p !== undefined ? providers?.get(r.p)?.name : undefined;
            return (
              <tr key={`${r.p ?? ''}/${r.id}`} data-model-row={r.id} data-deprecated={r.status === 'deprecated' ? 'true' : undefined}>
                <th scope="row">
                  <ModelName r={r} />
                </th>
                {withProvider && <td>{it && pname ? <a href={itemPath(it.id)}>{pname}</a> : (pname ?? r.p)}</td>}
                <td class="is-num">
                  <Price v={r.in} />
                </td>
                <td class="is-num">
                  <Price v={r.out} />
                </td>
                <td class="is-num">
                  <Price v={r.cr} />
                </td>
                <td class="is-num">
                  <Tok v={r.ctx} />
                </td>
                <td class="is-num">
                  <Tok v={r.max} />
                </td>
                <td>{inputsOf(r)}</td>
                <td>
                  <Yes on={r.reason} />
                </td>
                <td>
                  <Yes on={r.tools} />
                </td>
                {knowledge && <td>{r.knowledge ?? <Price v={undefined} />}</td>}
                <td>{r.release ?? <Price v={undefined} />}</td>
                <td>{it && <AddModel r={r} item={it} />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Line({ children }: { children: ComponentChildren }) {
  return <p class="mt-line">{children}</p>;
}

function Cards({ rows, caption, item, providers, knowledge }: Props) {
  return (
    <ul class="mt-cards" aria-label={caption}>
      {rows.map((r) => {
        const it = itemFor(r, item, providers);
        const pname = r.p !== undefined ? providers?.get(r.p)?.name : undefined;
        const extra = [
          r.ctx !== undefined ? fill(t.cell.context, { v: tokens(r.ctx) }) : '',
          r.max !== undefined ? fill(t.cell.maxOut, { v: tokens(r.max) }) : '',
          r.cr !== undefined ? fill(t.cell.cache, { v: usd(r.cr) }) : '',
          r.cw !== undefined ? fill(t.cell.cacheWrite, { v: usd(r.cw) }) : '',
        ].filter(Boolean);
        const feats = [r.reason ? t.cols.reasoning : '', r.tools ? t.cols.tools : ''].filter(Boolean);
        const dates = [knowledge && r.knowledge ? fill(t.cell.knowledge, { v: r.knowledge }) : '', r.release ? fill(t.cell.release, { v: r.release }) : ''].filter(Boolean);
        return (
          <li key={`${r.p ?? ''}/${r.id}`} class="mt-card" data-model-row={r.id} data-deprecated={r.status === 'deprecated' ? 'true' : undefined}>
            <div class="mt-card-head">
              <div class="mt-card-title">
                {pname && it && (
                  <a class="mt-provider" href={itemPath(it.id)}>
                    {pname}
                  </a>
                )}
                <ModelName r={r} />
              </div>
              {it && <AddModel r={r} item={it} />}
            </div>
            <p class="mt-price">
              {r.in !== undefined || r.out !== undefined ? (
                <>
                  {t.cols.input} <Price v={r.in} /> · {t.cols.output} <Price v={r.out} />
                </>
              ) : (
                <span class="muted">{t.none}</span>
              )}
            </p>
            {extra.length > 0 && <Line>{extra.join(' · ')}</Line>}
            {r.big && <Line>{fill(t.cell.big, { in: r.big.in !== undefined ? usd(r.big.in) : '—', out: r.big.out !== undefined ? usd(r.big.out) : '—' })}</Line>}
            {r.au && <Line>{fill(t.cell.audio, { in: r.au.in !== undefined ? usd(r.au.in) : '—', out: r.au.out !== undefined ? usd(r.au.out) : '—' })}</Line>}
            <ul class="mt-tags">
              {MODALITIES.filter((m) => r.mi.includes(m)).map((m) => (
                <li>{t.modality[m]}</li>
              ))}
              {feats.map((f) => (
                <li class="is-feat">{f}</li>
              ))}
            </ul>
            {dates.length > 0 && <Line>{dates.join(' · ')}</Line>}
          </li>
        );
      })}
    </ul>
  );
}

export function ModelTable(props: Props) {
  const wide = useWide();
  // 줄을 새로 그리면(표 ↔ 카드, 줄이 바뀜) [담기] 단추 상태를 장바구니와 맞춘다 (src/lib/cart-buttons.ts)
  useEffect(() => {
    document.dispatchEvent(new CustomEvent(CARDS_EVENT));
  }, [wide, props.rows]);
  return wide ? <Table {...props} /> : <Cards {...props} />;
}
