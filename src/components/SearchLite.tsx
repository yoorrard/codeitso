// 검색 쪽 섬 (/search?q=, S1 임시판): 진열대 빌드가 만든 작은 색인(/catalog/search-lite.json: 소분류 이름 + 소분류마다 인기 상품 30개)에서
// 이름에 검색어가 든 것을 찾는다. 전체 검색(상품 13만 개)은 S3가 이 섬을 바꿔 넣는다.
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { FILES, itemPath, listPath } from '../lib/routes.ts';
import { fill } from '../lib/text.ts';

/** [대분류, 소분류, 이름, 상품 수] / [id, 이름, 대분류, 소분류 이름] */
export interface SearchLiteIndex {
  subs: [string, string, string, number][];
  items: [string, string, string, string][];
}

const norm = (s: string): string => s.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
const LIMIT = 120;

export default function SearchLite() {
  const [q, setQ] = useState('');
  const [index, setIndex] = useState<SearchLiteIndex | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setQ(new URLSearchParams(window.location.search).get('q')?.trim() ?? '');
    fetch(FILES.searchLite)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SearchLiteIndex>;
      })
      .then(setIndex)
      .catch(() => setFailed(true));
  }, []);

  if (!q) return <p class="muted">{ko.search.prompt}</p>;
  if (failed) return <p role="alert">{ko.search.failed}</p>;
  if (!index) return <p role="status">{ko.search.loading}</p>;
  const k = norm(q);
  const subs = index.subs.filter((s) => norm(s[2]).includes(k) || norm(s[1]).includes(k));
  const items = index.items.filter((i) => norm(i[1]).includes(k)).slice(0, LIMIT);
  return (
    <div class="search-results">
      <p role="status">{fill(ko.search.results, { q, n: subs.length + items.length })}</p>
      {subs.length > 0 && (
        <section aria-labelledby="sr-subs">
          <h2 id="sr-subs">{ko.search.subsTitle}</h2>
          <ul class="chip-list">
            {subs.map(([cat, sub, name, n]) => (
              <li>
                <a class="chip" href={listPath(cat, sub)}>
                  {name} <span class="chip-n">{n}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {items.length > 0 && (
        <section aria-labelledby="sr-items">
          <h2 id="sr-items">{ko.search.itemsTitle}</h2>
          <ul class="rel-list">
            {items.map(([id, name, , subName]) => (
              <li>
                <a href={itemPath(id)}>
                  <span class="rel-name">{name}</span>
                  <span class="rel-sub">{subName}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {subs.length + items.length === 0 && <p>{ko.search.empty}</p>}
    </div>
  );
}
