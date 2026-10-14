// 홈 '최근 본 재료' 한 줄 (brief 7절): 상세를 연 재료(최근 20개, 이 브라우저에만). 없으면 아무것도 그리지 않는다.
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { itemPath } from '../lib/routes.ts';
import { $recent, clearRecent } from '../lib/store.ts';

interface Props {
  /** 대분류 id → 이름, '대분류/소분류' → 소분류 이름 */
  names: Record<string, string>;
}

export default function RecentRow({ names }: Props) {
  const list = useStore($recent);
  const ready = useHydrated();
  if (!ready || list.length === 0) return null;
  return (
    <section class="sec row recent" aria-labelledby="row-recent-viewed">
      <div class="sec-head">
        <h2 id="row-recent-viewed" tabIndex={-1}>
          {ko.recent.title}
        </h2>
        <button
          type="button"
          class="btn btn-sm btn-text"
          aria-label={ko.recent.clearLabel}
          onClick={() => {
            clearRecent();
            announce(ko.recent.clearedLive);
          }}
        >
          {ko.recent.clear}
        </button>
      </div>
      <ul class="row-track recent-track">
        {list.map((x) => (
          <li data-cat={x.cat}>
            <a class="recent-tile" href={itemPath(x.id)}>
              <span class="recent-cat">{names[`${x.cat}/${x.sub}`] ?? names[x.cat] ?? x.sub}</span>
              <span class="recent-name">{x.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
