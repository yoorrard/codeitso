// AI 모델 비교 /models (D141, OpenRouter 모델 목록·Vercel AI Gateway·Artificial Analysis 비교표처럼): 여러 회사의 모델을 한 표에서
// 가격·컨텍스트·기능으로 견주고, 줄마다 [담기]로 그 모델을 고른 채 그 회사 API를 담는다. 값은 models.dev 그대로다.
// 자료는 늦게 받는다: 처음엔 '모델을 직접 만드는 회사' 묶음(direct.json, gzip 약 13KB)만, 호스팅·라우터까지 볼 때 hosts.json,
// 한 회사만 볼 때는 그 회사 파일(/catalog/models/p/<id>.json). 거르기·정렬·찾기는 주소(?p=&in=&f=&max=&ctx=&old=&q=&sort=&dir=)에 남는다.
// 좁은 화면에서는 거르기를 접어 두고(<details>), 표 대신 모델 카드 목록이다 (ModelTable).
import { useEffect, useMemo, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { cmpText, withCommas } from '../lib/catalog/core.ts';
import type { BundleRow, Modality, ModelProvider, ModelQuery, ModelSort, ProviderScope, SortDir } from '../lib/catalog/models.ts';
import {
  CONTEXT_STEPS,
  DEFAULT_QUERY,
  MODALITIES,
  PRICE_STEPS,
  defaultDir,
  filterOf,
  filterRows,
  needsHosts,
  readModelQuery,
  scopeProviders,
  sortRows,
  tokens,
  usd,
  writeModelQuery,
} from '../lib/catalog/models.ts';
import { modelsBundle, providerModels } from '../lib/model-data.ts';
import { modelsPath } from '../lib/routes.ts';
import { fill } from '../lib/text.ts';
import { ModelTable, useWide } from './ModelTable.tsx';
import { PricingExplainer } from './ModelsSection.tsx';

interface Props {
  providers: ModelProvider[];
  fetched: string;
}

/** 한 번에 그리는 줄 수 (더 보기마다 늘린다) */
const STEP = 100;

type Load = 'loading' | 'ok' | 'failed';

const p = ko.models.page;

function scopeValue(s: ProviderScope): string {
  return typeof s === 'string' ? s : `one:${s.one}`;
}

function readScope(v: string): ProviderScope {
  if (v === 'direct' || v === 'all') return v;
  if (v.startsWith('one:')) return { one: v.slice(4) };
  return 'major';
}

/** 회사 고르기 이름표 (접힌 거르기 머리에 지금 고른 것을 보인다) */
function scopeLabel(s: ProviderScope, providers: readonly ModelProvider[]): string {
  if (s === 'major') return fill(p.scopeMajor, { n: scopeProviders('major', providers).size });
  if (s === 'direct') return fill(p.scopeDirect, { n: providers.filter((x) => x.direct).length });
  if (s === 'all') return fill(p.scopeAll, { n: providers.length });
  const one = providers.find((x) => x.id === s.one);
  return one ? fill(p.providerOpt, { name: one.name, n: one.live }) : s.one;
}

const SORT_OPTIONS = ['release-desc', 'release-asc', 'in-asc', 'in-desc', 'out-asc', 'out-desc', 'ctx-desc', 'ctx-asc'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

function Filters({ q, set, providers }: { q: ModelQuery; set: (patch: Partial<ModelQuery>) => void; providers: ModelProvider[] }) {
  const direct = providers.filter((x) => x.direct).sort((a, b) => cmpText(a.name, b.name));
  const hosts = providers.filter((x) => !x.direct).sort((a, b) => cmpText(a.name, b.name));
  const majors = scopeProviders('major', providers).size;
  const inputs = MODALITIES.filter((m) => m !== 'text');
  const sortValue = `${q.sort}-${q.dir}` as SortOption;
  return (
    <div class="mf">
      <div class="mf-row">
        <label class="mf-field">
          <span class="mf-label">{p.scope}</span>
          <select value={scopeValue(q.scope)} onChange={(e) => set({ scope: readScope((e.target as HTMLSelectElement).value) })}>
            <option value="major">{fill(p.scopeMajor, { n: majors })}</option>
            <option value="direct">{fill(p.scopeDirect, { n: direct.length })}</option>
            <option value="all">{fill(p.scopeAll, { n: providers.length })}</option>
            <optgroup label={p.groupDirect}>
              {direct.map((x) => (
                <option value={`one:${x.id}`}>{fill(p.providerOpt, { name: x.name, n: x.live })}</option>
              ))}
            </optgroup>
            <optgroup label={p.groupHosts}>
              {hosts.map((x) => (
                <option value={`one:${x.id}`}>{fill(p.providerOpt, { name: x.name, n: x.live })}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <label class="mf-field">
          <span class="mf-label">{p.maxIn}</span>
          <select
            value={q.maxIn === undefined ? '' : String(q.maxIn)}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              set({ maxIn: v === '' ? undefined : Number(v) });
            }}
          >
            <option value="">{p.maxInAny}</option>
            {PRICE_STEPS.map((v) => (
              <option value={String(v)}>{fill(p.maxInOpt, { v: usd(v) })}</option>
            ))}
          </select>
        </label>
        <label class="mf-field">
          <span class="mf-label">{p.minCtx}</span>
          <select
            value={q.minCtx === undefined ? '' : String(q.minCtx)}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              set({ minCtx: v === '' ? undefined : Number(v) });
            }}
          >
            <option value="">{p.minCtxAny}</option>
            {CONTEXT_STEPS.map((v) => (
              <option value={String(v)}>{fill(p.minCtxOpt, { v: tokens(v) })}</option>
            ))}
          </select>
        </label>
        <label class="mf-field">
          <span class="mf-label">{p.sort}</span>
          <select
            value={sortValue}
            onChange={(e) => {
              const [sort, dir] = (e.target as HTMLSelectElement).value.split('-') as [ModelSort, SortDir];
              set({ sort, dir });
            }}
          >
            {SORT_OPTIONS.map((v) => (
              <option value={v}>{p.sorts[v]}</option>
            ))}
          </select>
        </label>
      </div>
      <div class="mf-row">
        <fieldset class="mf-set">
          <legend class="mf-label">{p.inputs}</legend>
          {inputs.map((m) => (
            <label class="mf-chip">
              <input
                type="checkbox"
                checked={q.inputs.includes(m)}
                onChange={(e) => {
                  const on = (e.target as HTMLInputElement).checked;
                  set({ inputs: on ? [...q.inputs, m] : q.inputs.filter((x: Modality) => x !== m) });
                }}
              />
              {ko.models.modality[m]}
            </label>
          ))}
        </fieldset>
        <fieldset class="mf-set">
          <legend class="mf-label">{p.features}</legend>
          {(['reason', 'tools', 'open'] as const).map((k) => (
            <label class="mf-chip">
              <input
                type="checkbox"
                checked={q[k]}
                onChange={(e) => {
                  const patch: Partial<ModelQuery> = {};
                  patch[k] = (e.target as HTMLInputElement).checked;
                  set(patch);
                }}
              />
              {p[k]}
            </label>
          ))}
          <label class="mf-chip">
            <input type="checkbox" checked={q.deprecated} onChange={(e) => set({ deprecated: (e.target as HTMLInputElement).checked })} />
            {p.old}
          </label>
        </fieldset>
      </div>
    </div>
  );
}

export default function ModelsPage({ providers, fetched }: Props) {
  const [q, setQ] = useState<ModelQuery>(DEFAULT_QUERY);
  const [ready, setReady] = useState(false);
  const [direct, setDirect] = useState<BundleRow[] | null>(null);
  const [hosts, setHosts] = useState<BundleRow[] | null>(null);
  const [one, setOne] = useState<Map<string, BundleRow[]>>(new Map());
  const [load, setLoad] = useState<Load>('loading');
  const [tries, setTries] = useState(0);
  const [limit, setLimit] = useState(STEP);
  const wide = useWide();
  const byId = useMemo(() => new Map(providers.map((x) => [x.id, x])), [providers]);

  // 주소 → 상태 (처음과 뒤로 가기)
  useEffect(() => {
    const read = (): void => {
      setQ(readModelQuery(window.location.search));
      setReady(true);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const ids = useMemo(() => scopeProviders(q.scope, providers), [q.scope, providers]);
  const single = typeof q.scope === 'object' ? q.scope.one : null;
  const wantHosts = single === null && needsHosts(ids, providers);

  // 필요한 자료만 받는다
  useEffect(() => {
    if (!ready) return;
    let live = true;
    const jobs: Promise<unknown>[] = [];
    if (single !== null) {
      if (!one.has(single))
        jobs.push(
          providerModels(single).then((f) => {
            if (live) setOne((m) => new Map(m).set(single, f.rows.map((r) => ({ ...r, p: single }))));
          }),
        );
    } else {
      if (!direct) jobs.push(modelsBundle('direct').then((f) => live && setDirect(f.rows)));
      if (wantHosts && !hosts) jobs.push(modelsBundle('hosts').then((f) => live && setHosts(f.rows)));
    }
    if (jobs.length === 0) {
      setLoad('ok');
      return;
    }
    setLoad('loading');
    Promise.all(jobs)
      .then(() => live && setLoad('ok'))
      .catch(() => live && setLoad('failed'));
    return () => {
      live = false;
    };
  }, [ready, single, wantHosts, tries]);

  const found = useMemo(() => {
    const pool: BundleRow[] = single !== null ? (one.get(single) ?? []) : [...(direct ?? []), ...(wantHosts ? (hosts ?? []) : [])];
    return sortRows(filterRows(pool, filterOf(q, providers)), q.sort, q.dir);
  }, [direct, hosts, one, single, wantHosts, q, providers]);
  const shown = found.slice(0, limit);
  const done = load === 'ok' && (single !== null ? one.has(single) : direct !== null && (!wantHosts || hosts !== null));

  // 결과 수를 알린다 (치는 동안은 잠깐 멈춘 뒤)
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => announce(fill(p.foundLive, { n: withCommas(found.length) })), 600);
    return () => window.clearTimeout(t);
  }, [done, found.length]);

  function set(patch: Partial<ModelQuery>): void {
    const next = { ...q, ...patch };
    setQ(next);
    setLimit(STEP);
    window.history.replaceState(null, '', modelsPath(writeModelQuery(next)));
  }

  function onSort(key: ModelSort): void {
    set(q.sort === key ? { dir: q.dir === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: defaultDir(key) });
  }

  const changed = writeModelQuery({ ...q, q: '', sort: DEFAULT_QUERY.sort, dir: DEFAULT_QUERY.dir }) !== '';
  const filters = <Filters q={q} set={set} providers={providers} />;

  return (
    <div class="models-page">
      <PricingExplainer />
      <div class="mf-find">
        <label class="visually-hidden" for="mf-q">
          {p.find}
        </label>
        <input
          id="mf-q"
          class="mf-q"
          type="search"
          value={q.q}
          placeholder={p.findPlaceholder}
          autocomplete="off"
          spellcheck={false}
          enterKeyHint="search"
          onInput={(e) => set({ q: (e.target as HTMLInputElement).value })}
        />
      </div>
      {wide ? (
        <section class="mf-box" aria-label={p.filters}>
          {filters}
        </section>
      ) : (
        <details class="mf-box">
          <summary>
            {p.filters}
            <span class="mf-now">{scopeLabel(q.scope, providers)}</span>
          </summary>
          {filters}
        </details>
      )}
      <div class="mf-status">
        <p class="mf-count">{done ? fill(p.found, { n: withCommas(found.length) }) : ''}</p>
        {changed && (
          <button type="button" class="btn btn-text btn-sm" onClick={() => set({ ...DEFAULT_QUERY, q: q.q })}>
            {p.reset}
          </button>
        )}
      </div>
      {load === 'loading' && (
        <p role="status" class="mt-status">
          {wantHosts && direct ? p.loadingHosts : p.loading}
        </p>
      )}
      {load === 'failed' && (
        <div role="alert" class="mt-status">
          <p>{p.failed}</p>
          <button type="button" class="btn" onClick={() => setTries((n) => n + 1)}>
            {p.retry}
          </button>
        </div>
      )}
      {done && (shown.length > 0 ? <ModelTable rows={shown} caption={p.tableLabel} providers={byId} sort={{ key: q.sort, dir: q.dir, onSort }} /> : <p class="mt-status">{ko.models.empty}</p>)}
      {done && found.length > limit && (
        <div class="mt-more">
          <button type="button" class="btn" onClick={() => setLimit((n) => n + STEP)}>
            {fill(ko.models.moreRows, { n: Math.min(STEP, found.length - limit) })}
          </button>
        </div>
      )}
      <p class="field-hint mt-source">{fill(ko.models.source, { date: fetched })}</p>
    </div>
  );
}
