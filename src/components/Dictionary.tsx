// 사전 (T15, docs/UX.md 3.10): 검색창 하나. 에러 문장을 붙여 넣으면 맞는 에러 안내(엔진의 matchErrors)를 맨 위에,
// 나머지는 검색 색인(/search-index.json, 처음 쓸 때 불러옴) 결과를 용어·에러·예상 막힘·상품으로 묶어 보여 준다.
import type MiniSearch from 'minisearch';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import { fill, matchErrors } from '../lib/engine/index.ts';
import type { ErrorEntry } from '../lib/engine/types.ts';
import type { DocType, SearchDoc } from '../lib/search-index.ts';
import { getSearchIndex } from '../lib/search-client.ts';
import CopyButton from './CopyButton.tsx';

const T = catalog.data.templates;
const ORDER: DocType[] = ['concept', 'error', 'stuck', 'product'];
const LIMIT = 6;
/** 에러 문장처럼 보이면 사전에 없을 때 질문 틀을 보여 준다 */
const ERRORISH = new RegExp(['error', 'failed', 'not found', 'denied', 'refused', 'exception', 'undefined', ...ko.dict.errorWords].join('|'), 'i');


function ErrorCard({ e }: { e: ErrorEntry }) {
  const concepts = (e.concepts ?? []).map((id) => catalog.concept.get(id)).filter((c) => c !== undefined);
  return (
    <article class="card error-card" aria-labelledby={`err-${e.id}`}>
      <h3 id={`err-${e.id}`}>{e.title}</h3>
      <h4>{ko.dict.errorMeaning}</h4>
      <p>{e.meaning}</p>
      <h4>{ko.dict.errorCauses}</h4>
      <ul>
        {e.causes.map((c) => (
          <li>{c}</li>
        ))}
      </ul>
      <h4>{ko.dict.errorTry}</h4>
      <ol>
        {e.tryFirst.map((c) => (
          <li>{c}</li>
        ))}
      </ol>
      <h4>{ko.dict.errorAsk}</h4>
      <p class="q-help">{ko.dict.keyWarn}</p>
      <p class="prompt-box">{e.askAI}</p>
      <CopyButton text={e.askAI} srLabel={`${e.title}: ${ko.common.copy}`} />
      {concepts.length > 0 && (
        <p>
          {ko.dict.related}:{' '}
          {concepts.map((c, i) => (
            <>
              {i > 0 && ', '}
              <a href={`/concepts/${c.id}`}>{c.title}</a>
            </>
          ))}
        </p>
      )}
    </article>
  );
}

function ResultItem({ doc }: { doc: SearchDoc }) {
  if (doc.type === 'concept') {
    const c = catalog.concept.get(doc.ref);
    return (
      <li class="dict-item">
        <a href={`/concepts/${doc.ref}`}>{c?.title ?? doc.title}</a>
        <p class="q-help">{doc.body}</p>
      </li>
    );
  }
  if (doc.type === 'error') {
    const e = catalog.data.errors.errors.find((x) => x.id === doc.ref);
    return e ? (
      <li class="dict-item">
        <details>
          <summary>{e.title}</summary>
          <ErrorCard e={e} />
        </details>
      </li>
    ) : null;
  }
  const p = catalog.product.get(doc.ref);
  if (doc.type === 'stuck') {
    return (
      <li class="dict-item">
        <p>{doc.body}</p>
        {p && p.layer === 'shelf' && (
          <a class="q-help" href={`/products/${p.id}`}>
            {p.name}
          </a>
        )}
      </li>
    );
  }
  if (!p) return null;
  return (
    <li class="dict-item">
      {p.layer === 'shelf' ? (
        <a href={`/products/${p.id}`}>{p.name}</a>
      ) : (
        <span>
          {p.name} <span class="badge badge-soft">{ko.dict.indexBadge}</span>{' '}
          {p.links[0] && (
            <a href={p.links[0].url} rel="noopener noreferrer" target="_blank">
              {ko.dict.source}
            </a>
          )}
        </span>
      )}
      <p class="q-help">{p.summary}</p>
    </li>
  );
}

export default function Dictionary({ autoFocus = false }: { autoFocus?: boolean }) {
  const [q, setQ] = useState('');
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getSearchIndex().then(setIndex);
    // 섬이 붙기 전에 친 글도 이어받는다
    if (input.current?.value) setQ(input.current.value);
    if (autoFocus) input.current?.focus();
  }, []);

  const query = q.trim();
  const errors = query ? matchErrors(catalog, query) : [];
  const errorIds = new Set(errors.map((e) => `error:${e.id}`));
  const hits = query && index ? index.search(query).filter((h) => !errorIds.has(String(h.id))) : [];
  const groups = ORDER.map((type) => ({ type, docs: hits.filter((h) => h['type'] === type).slice(0, LIMIT) as unknown as SearchDoc[] })).filter((g) => g.docs.length > 0);
  const total = errors.length + groups.reduce((a, g) => a + g.docs.length, 0);

  // 결과 수는 입력을 멈췄을 때 한 번만 알린다
  useEffect(() => {
    if (!query) return;
    const t = window.setTimeout(() => announce(total > 0 ? fill(ko.dict.count, { n: total }) : ko.dict.empty), 700);
    return () => window.clearTimeout(t);
  }, [query, total]);

  return (
    <div class="dict">
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label for="dict-q" class="dict-label">
          {ko.dict.label}
        </label>
        <input
          ref={input}
          id="dict-q"
          class="line-input"
          type="search"
          value={q}
          placeholder={ko.dict.placeholder}
          autocomplete="off"
          enterkeyhint="search"
          onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)}
        />
      </form>
      {query && !index && <p class="q-help">{ko.dict.loading}</p>}
      {errors.map((e) => (
        <ErrorCard e={e} />
      ))}
      {query && errors.length === 0 && ERRORISH.test(query) && (
        <section class="card">
          <h3>{ko.dict.fallbackTitle}</h3>
          <p class="prompt-box">{T.errorFallback}</p>
          <CopyButton text={T.errorFallback} />
        </section>
      )}
      {groups.map((g) => (
        <section aria-labelledby={`dict-g-${g.type}`}>
          <h3 id={`dict-g-${g.type}`}>{ko.dict.groups[g.type]}</h3>
          <ul class="dict-list">
            {g.docs.map((d) => (
              <ResultItem doc={d} />
            ))}
          </ul>
        </section>
      ))}
      {query && index && total === 0 && !ERRORISH.test(query) && <p>{ko.dict.empty}</p>}
    </div>
  );
}
