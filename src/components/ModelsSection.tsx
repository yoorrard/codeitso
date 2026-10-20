// 상세의 '모델·요금' (D141): models.dev 자료가 있는 AI API 상품에서만. 제공자 모델 파일(/catalog/models/p/<id>.json)을 받아
// 새 모델부터 20개를 보이고 [모두 보기], 지원이 끝난 모델은 [지원이 끝난 모델도 보기]로. 아래에 출처·수집 날짜와 '실제 청구·한도는 공식 페이지',
// 공식 요금 안내·사용 한도 안내(손으로 확인한 주소)·무료 문장(요금 쪽 원문), 다른 회사와 비교 링크, API 요금 읽는 법(어려운 말은 용어 사전으로).
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import type { ProviderModels } from '../lib/catalog/models.ts';
import type { ProviderScope } from '../lib/catalog/models.ts';
import { DEFAULT_QUERY, MAJOR_PROVIDERS, isDeprecated, modelProviderOf, writeModelQuery } from '../lib/catalog/models.ts';
import { apiInfo } from '../lib/catalog/preview.ts';
import type { DetailRecord } from '../lib/catalog/types.ts';
import { providerModels } from '../lib/model-data.ts';
import { modelsPath, termPath } from '../lib/routes.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';
import { ModelTable, useWide } from './ModelTable.tsx';

/** 처음 보이는 모델 수: 넓은 화면(표) · 좁은 화면(카드) */
const FIRST = { wide: 20, narrow: 6 } as const;

type State = { k: 'loading' } | { k: 'failed' } | { k: 'ok'; file: ProviderModels };

/** '[[보이는 말|용어 id]]'를 용어 사전 링크로 */
export function TermText({ text }: { text: string }) {
  const parts = text.split(/(\[\[[^\]|]+\|[a-z0-9-]+\]\])/g);
  return (
    <>
      {parts.map((p) => {
        const m = /^\[\[([^\]|]+)\|([a-z0-9-]+)\]\]$/.exec(p);
        return m ? (
          <a class="term-link" href={termPath(m[2] ?? '')}>
            {m[1]}
          </a>
        ) : (
          p
        );
      })}
    </>
  );
}

/** API 요금 읽는 법 (상세와 /models가 같이 쓴다) */
export function PricingExplainer({ open = false }: { open?: boolean }) {
  return (
    <details class="mt-explain" open={open}>
      <summary>{ko.models.explain.title}</summary>
      <ul>
        {ko.models.explain.points.map((p) => (
          <li>
            <TermText text={p} />
          </li>
        ))}
      </ul>
    </details>
  );
}

/** 상세에 '모델·요금'을 그릴 상품인가: models.dev 제공자이고 모델이 있다 */
export function hasModels(item: DetailRecord): boolean {
  const a = apiInfo(item);
  return modelProviderOf(item.id) !== null && (a?.modelCount ?? 0) > 0;
}

export function ModelsSection({ item }: { item: DetailRecord }) {
  const provider = modelProviderOf(item.id) ?? '';
  const [state, setState] = useState<State>({ k: 'loading' });
  const [tries, setTries] = useState(0);
  const [all, setAll] = useState(false);
  const [old, setOld] = useState(false);
  const a = apiInfo(item);
  const p = item.preview;
  const limitsUrl = typeof p['limitsUrl'] === 'string' && p['limitsUrl'].startsWith('https://') ? p['limitsUrl'] : undefined;
  const limitsAt = typeof p['limitsCheckedAt'] === 'string' ? p['limitsCheckedAt'] : undefined;
  const plan = item.tags.includes('subscription-plan');
  const first = useWide() ? FIRST.wide : FIRST.narrow;
  // 비교 쪽: 주요 회사면 처음 보이는 그대로, 모델을 직접 만드는 회사면 그 회사들끼리, 호스팅·라우터면 모든 곳
  const scope: ProviderScope = (MAJOR_PROVIDERS as readonly string[]).includes(provider) ? 'major' : item.kind === 'ai-llm' ? 'direct' : 'all';

  useEffect(() => {
    let live = true;
    setState({ k: 'loading' });
    providerModels(provider)
      .then((file) => live && setState({ k: 'ok', file }))
      .catch(() => live && setState({ k: 'failed' }));
    return () => {
      live = false;
    };
  }, [provider, tries]);

  const rows = state.k === 'ok' ? state.file.rows : [];
  const live = rows.filter((r) => !isDeprecated(r));
  const shown = (old ? rows : live).slice(0, all ? undefined : first);
  const total = old ? rows.length : live.length;
  const oldCount = rows.length - live.length;
  const target = { id: item.id, name: item.name, cat: item.category, sub: item.kind };

  return (
    <section class="detail-sec models-sec" aria-labelledby="models-title">
      <div class="sec-head">
        <h2 id="models-title">
          {ko.models.title} {state.k === 'ok' && <span class="sec-n">{fill(ko.models.count, { n: live.length })}</span>}
        </h2>
        <a class="sec-more" href={modelsPath(writeModelQuery({ ...DEFAULT_QUERY, scope }))}>
          <Icon name="columns" size="16px" />
          {ko.models.compare}
        </a>
      </div>
      <p class="muted">{ko.models.lead}</p>
      {plan && <p class="notice">{ko.models.planNote}</p>}
      {state.k === 'loading' && <p role="status">{ko.models.loading}</p>}
      {state.k === 'failed' && (
        <div role="alert" class="mt-status">
          <p>{ko.models.failed}</p>
          <button type="button" class="btn" onClick={() => setTries((n) => n + 1)}>
            {ko.models.retry}
          </button>
        </div>
      )}
      {state.k === 'ok' && (
        <>
          {shown.length > 0 ? <ModelTable rows={shown} caption={fill(ko.models.tableLabel, { name: item.name })} item={target} knowledge /> : <p>{ko.models.empty}</p>}
          <div class="mt-more">
            {!all && total > first && (
              <button type="button" class="btn" onClick={() => setAll(true)}>
                {fill(ko.models.more, { n: total })}
              </button>
            )}
            {oldCount > 0 && (
              <label class="check">
                <input type="checkbox" checked={old} onChange={(e) => setOld((e.target as HTMLInputElement).checked)} />
                {fill(ko.models.showOld, { n: oldCount })}
              </label>
            )}
          </div>
          <p class="field-hint mt-source">{fill(ko.models.source, { date: state.file.fetched })}</p>
        </>
      )}
      {(a?.pricingUrl || limitsUrl) && (
        <ul class="mt-links">
          {a?.pricingUrl && (
            <li>
              <a href={a.pricingUrl} target="_blank" rel="noopener noreferrer">
                {ko.models.pricing}
                <Icon name="external" size="16px" label={ko.common.external} />
              </a>
            </li>
          )}
          {limitsUrl && (
            <li>
              <a href={limitsUrl} target="_blank" rel="noopener noreferrer">
                {ko.models.limits}
                <Icon name="external" size="16px" label={ko.common.external} />
              </a>
              {limitsAt && <span class="field-hint"> {fill(ko.models.limitsChecked, { date: limitsAt })}</span>}
            </li>
          )}
        </ul>
      )}
      {a?.freeQuote && (
        <figure class="free-quote">
          <blockquote lang="en">{a.freeQuote}</blockquote>
          {a.freeCheckedAt && <figcaption>{fill(ko.pv.api.freeChecked, { date: a.freeCheckedAt })}</figcaption>}
        </figure>
      )}
      <PricingExplainer />
    </section>
  );
}
