// 사전 (brief 6.12, D67 W3b; T15): 검색 칸 48 하나. 에러 문장을 붙여 넣으면 맞는 에러 안내(엔진의 matchErrors)를 맨 위 카드로,
// 나머지는 검색 색인(/search-index.json, 처음 쓸 때 불러옴) 결과를 묶음마다 줄 목록으로 보여 준다.
// 묶음 순서: 에러가 났을 때(경고등) → 용어(어려운 말 풀이도 여기, brief 8절) → 막히기 쉬운 곳 → 도구. 단 에러 문장이 아닌 낱말로 찾았으면
// 색인에만 걸린 에러 줄(3개까지)은 맨 뒤에 둔다('API 키'를 찾은 사람에게 에러 여섯 줄이 용어를 밀어내지 않게).
// 에러 카드는 시트 안의 유일한 카드다. 다른 에러는 줄로 두고, 누르면 그 에러가 카드가 된다. 카드가 있을 때 그 위에 알림 상자 하나(키 값 지우기).
// 아무것도 넣지 않았으면 눌러서 바로 찾는 예 칩을 둔다. 모양은 parts.css(사전 시트는 어느 화면에서나 열린다).
import type MiniSearch from 'minisearch';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { termPath, toolPath } from '../lib/routes.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import { fill, matchErrors } from '../lib/engine/index.ts';
import type { ErrorEntry } from '../lib/engine/types.ts';
import type { SearchDoc } from '../lib/search-index.ts';
import { getSearchIndex } from '../lib/search-client.ts';
import { productArt } from '../lib/shelf.ts';
import CopyButton from './CopyButton.tsx';
import { ArtTile } from './Glyph.tsx';
import { Icon } from './Icon.tsx';

const T = catalog.data.templates;
const D = ko.dict;
/** 묶음과 거기 드는 색인 문서 종류. 용어 묶음은 어려운 말 풀이 문서('term')도 받는다 */
const GROUPS: { id: keyof typeof D.groups; types: string[] }[] = [
  { id: 'concept', types: ['concept', 'term'] },
  { id: 'stuck', types: ['stuck'] },
  { id: 'product', types: ['product'] },
];
const LIMIT = 6;
type Level = 2 | 3;
/** 제목 단계 n의 태그 (사전 페이지는 H1 아래라 2, 시트는 시트 제목 h2 아래라 3부터) */
const hn = (n: number): 'h2' | 'h3' | 'h4' | 'h5' => (n <= 2 ? 'h2' : n === 3 ? 'h3' : n === 4 ? 'h4' : 'h5');
/** 에러 문장처럼 보이면 사전에 없을 때 질문 틀을 보여 준다 */
const ERRORISH = new RegExp(['error', 'failed', 'not found', 'denied', 'refused', 'exception', 'undefined', ...D.errorWords].join('|'), 'i');

function Paste({ text, label }: { text: string; label: string }) {
  return (
    <div class="paste">
      <div class="paste-head">
        <span class="paste-label">{D.pasteLabel}</span>
        <CopyButton text={text} srLabel={`${label}: ${ko.common.copy}`} />
      </div>
      <p class="paste-body">{text}</p>
    </div>
  );
}

function ErrorCard({ e, level }: { e: ErrorEntry; level: Level }) {
  const concepts = (e.concepts ?? []).map((id) => catalog.concept.get(id)).filter((c) => c !== undefined);
  const Title = hn(level + 1);
  const Sub = hn(level + 2);
  return (
    <article class="error-card" aria-labelledby={`err-${e.id}`}>
      <Title id={`err-${e.id}`} class="error-card-title" tabIndex={-1}>
        {e.title}
      </Title>
      <Sub class="error-card-sub">{D.errorMeaning}</Sub>
      <p>{e.meaning}</p>
      <Sub class="error-card-sub">{D.errorCauses}</Sub>
      <ul>
        {e.causes.map((c) => (
          <li>{c}</li>
        ))}
      </ul>
      <Sub class="error-card-sub">{D.errorTry}</Sub>
      <ol>
        {e.tryFirst.map((c) => (
          <li>{c}</li>
        ))}
      </ol>
      <Sub class="error-card-sub">{D.errorAsk}</Sub>
      <Paste text={e.askAI} label={e.title} />
      {concepts.length > 0 && (
        <>
          <Sub class="error-card-sub">{D.related}</Sub>
          <ul class="chip-row">
            {concepts.map((c) => (
              <li>
                <a class="chip" href={termPath(c.id)}>
                  {c.title}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function ResultRow({ doc }: { doc: SearchDoc }) {
  const type = String(doc.type);
  if (type === 'concept') {
    const c = catalog.concept.get(doc.ref);
    return (
      <li>
        <a class="list-row" href={termPath(doc.ref)}>
          <span class="list-text">
            <span class="list-name">{c?.title ?? doc.title}</span>
            <span class="list-sub is-one">{doc.body}</span>
          </span>
          <span class="list-chev" aria-hidden="true" />
        </a>
      </li>
    );
  }
  const p = type === 'stuck' || type === 'product' ? catalog.product.get(doc.ref) : undefined;
  if (type === 'stuck') {
    return (
      <li>
        {p && p.layer === 'shelf' ? (
          <a class="list-row" href={toolPath(p.id)}>
            <span class="list-text">
              <span class="list-name">{p.name}</span>
              <span class="list-sub">{doc.body}</span>
            </span>
            <span class="list-chev" aria-hidden="true" />
          </a>
        ) : (
          <p class="list-row dict-plain">{doc.body}</p>
        )}
      </li>
    );
  }
  if (type === 'product' && p) {
    const shelf = p.layer === 'shelf';
    return (
      <li>
        <a
          class="list-row is-tall"
          href={shelf ? toolPath(p.id) : p.links[0]?.url}
          target={shelf ? undefined : '_blank'}
          rel={shelf ? undefined : 'noopener noreferrer'}
        >
          <ArtTile name={productArt(p)} size="md" class="list-tile" />
          <span class="list-text">
            <span class="list-name">
              {p.name}
              {!shelf && <span class="tag dict-tag">{D.indexBadge}</span>}
            </span>
            <span class="list-sub is-one">{p.summary}</span>
          </span>
          {shelf ? <span class="list-chev" aria-hidden="true" /> : <span class="list-ext" aria-hidden="true" />}
          {!shelf && <span class="visually-hidden"> ({D.newTab})</span>}
        </a>
      </li>
    );
  }
  // 다른 종류(어려운 말 풀이 같은 것): 이름과 한 문장만
  return (
    <li>
      <div class="list-row">
        <span class="list-text">
          <span class="list-name">{doc.title}</span>
          <span class="list-sub">{doc.body}</span>
        </span>
      </div>
    </li>
  );
}

export default function Dictionary({ autoFocus = false, initial = '', level = 2 }: { autoFocus?: boolean; initial?: string; level?: Level }) {
  const Group = hn(level);
  const Card = hn(level + 1);
  const [q, setQ] = useState(initial);
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null);
  const [failed, setFailed] = useState(false);
  /** 줄에서 눌러 카드로 연 에러 */
  const [picked, setPicked] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // 색인을 못 받았으면 다음 입력 때 다시 받아 본다
  const load = (): void => {
    getSearchIndex().then(
      (ms) => {
        setFailed(false);
        setIndex(ms);
      },
      () => setFailed(true),
    );
  };

  useEffect(() => {
    load();
    // 섬이 붙기 전에 친 글도 이어받는다
    if (!initial && input.current?.value) setQ(input.current.value);
    if (autoFocus) input.current?.focus();
  }, []);

  const query = q.trim();
  useEffect(() => {
    if (query && !index && failed) load();
    setPicked(null);
  }, [query]);
  const matched = query ? matchErrors(catalog, query) : [];
  const matchedIds = new Set(matched.map((e) => e.id));
  const hits = query && index ? index.search(query) : [];
  // 색인에서 찾은 에러 중 엔진이 맞히지 않은 것은 줄로
  const errorRows = hits
    .filter((h) => String(h['type']) === 'error' && !matchedIds.has(String(h['ref'])))
    .map((h) => catalog.data.errors.errors.find((e) => e.id === String(h['ref'])))
    .filter((e) => e !== undefined)
    .slice(0, matched.length > 0 || ERRORISH.test(query) ? LIMIT : 3);
  const errors = [...matched, ...errorRows];
  const card = errors.find((e) => e.id === picked) ?? matched[0] ?? null;
  const rows = errors.filter((e) => e !== card);
  const groups = GROUPS.map((g) => ({
    id: g.id,
    docs: hits.filter((h) => g.types.includes(String(h['type']))).slice(0, LIMIT) as unknown as SearchDoc[],
  })).filter((g) => g.docs.length > 0);
  const total = errors.length + groups.reduce((a, g) => a + g.docs.length, 0);
  const fallback = query !== '' && matched.length === 0 && ERRORISH.test(query);
  // 에러 묶음은 에러 문장일 때(엔진이 맞혔거나 에러처럼 보이면) 맨 위에. 낱말로 찾았을 때 색인에만 걸린 에러는 용어·도구 뒤에 둔다
  const errorFirst = matched.length > 0 || ERRORISH.test(query);

  // 결과 수는 입력을 멈췄을 때 한 번만 알린다
  useEffect(() => {
    if (!query) return;
    const found = matched.length > 0 ? `${D.errorFound} ` : '';
    const t = window.setTimeout(() => announce(total > 0 ? `${found}${fill(D.count, { n: total })}` : D.empty), 700);
    return () => window.clearTimeout(t);
  }, [query, total, matched.length]);

  const openError = (id: string): void => {
    setPicked(id);
    // 카드가 된 에러의 제목으로 초점을 옮긴다 (누른 줄은 사라진다)
    window.requestAnimationFrame(() => document.getElementById(`err-${id}`)?.focus());
  };

  const errorGroup =
    errors.length > 0 || fallback ? (
      <section class="dict-group" aria-labelledby="dict-g-error">
        <Group id="dict-g-error" class="dict-group-title">
          <Icon name="warning" />
          <span>{D.groups.error}</span>
        </Group>
        {(card || fallback) && (
          <p class="alert">
            <span class="alert-icon i-mask i-info" aria-hidden="true" />
            <span>{D.keyWarn}</span>
          </p>
        )}
        {card && <ErrorCard key={card.id} e={card} level={level} />}
        {fallback && (
          <div class="error-card">
            <Card class="error-card-title">{D.fallbackTitle}</Card>
            <Paste text={T.errorFallback} label={D.fallbackTitle} />
          </div>
        )}
        {rows.length > 0 && (
          <ul class="list group">
            {rows.map((e) => (
              <li key={e.id}>
                <button type="button" class="list-row" onClick={() => openError(e.id)}>
                  <span class="list-text">
                    <span class="list-name">{e.title}</span>
                    <span class="list-sub is-one">{e.meaning}</span>
                  </span>
                  <span class="list-chev" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    ) : null;

  return (
    <div class="dict">
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label for="dict-q" class="field-label">
          {D.label}
        </label>
        <span class="field-wrap">
          <span class="field-icon i-mask i-search" aria-hidden="true" />
          <input
            ref={input}
            id="dict-q"
            class="field"
            type="search"
            value={q}
            placeholder={D.placeholder}
            autocomplete="off"
            enterkeyhint="search"
            onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)}
          />
          {q && (
            <button
              type="button"
              class="icon-btn field-clear"
              tabIndex={-1}
              aria-label={ko.common.clearSearch}
              onClick={() => {
                setQ('');
                input.current?.focus();
              }}
            >
              <Icon name="close" size="20px" />
            </button>
          )}
        </span>
      </form>
      {!query && (
        <section class="dict-group" aria-labelledby="dict-examples">
          <Group id="dict-examples" class="dict-hint">
            {D.examplesTitle}
          </Group>
          <ul class="chip-row dict-examples">
            {D.examples.map((x) => (
              <li>
                <button
                  type="button"
                  class="chip"
                  onClick={() => {
                    setQ(x);
                    input.current?.focus();
                  }}
                >
                  {x}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {query && !index && <p class="dict-hint">{failed ? D.failed : D.loading}</p>}
      {errorFirst && errorGroup}
      {groups.map((g) => (
        <section class="dict-group" aria-labelledby={`dict-g-${g.id}`}>
          <Group id={`dict-g-${g.id}`} class="dict-group-title">
            {D.groups[g.id]}
          </Group>
          <ul class="list group">
            {g.docs.map((d) => (
              <ResultRow doc={d} />
            ))}
          </ul>
        </section>
      ))}
      {!errorFirst && errorGroup}
      {query && index && total === 0 && !fallback && <p class="dict-hint">{D.empty}</p>}
    </div>
  );
}
