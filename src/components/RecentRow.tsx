// 최근 본 재료 (brief 7절): 상세를 연 재료(최근 20개, 이 브라우저에만).
// 홈은 한 줄(없으면 아무것도 그리지 않는다)에 '모두 보기'(/recent)를 두고, /recent(page)는 격자로 모두 보이고 없으면 빈 안내를 보인다 (K1 D131).
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { CATEGORY_ICON } from '../lib/icons.ts';
import { ROUTES, itemPath } from '../lib/routes.ts';
import { $recent, clearRecent } from '../lib/store.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';

interface Props {
  /** 대분류 id → 이름, '대분류/소분류' → 소분류 이름 */
  names: Record<string, string>;
  /** /recent 쪽: 격자로 모두, 비면 빈 안내 (제목 h1은 쪽이 그린다) */
  page?: boolean;
}

export default function RecentRow({ names, page = false }: Props) {
  const list = useStore($recent);
  const ready = useHydrated();
  if (!ready) return null;
  if (list.length === 0) {
    return page ? (
      <div class="recent-empty">
        <p>{ko.recent.empty}</p>
        <a class="btn btn-soft" href={ROUTES.categories}>
          {ko.recent.browse}
        </a>
      </div>
    ) : null;
  }
  const clear = (
    <button
      type="button"
      class="btn btn-sm btn-text"
      aria-label={ko.recent.clearLabel}
      onClick={() => {
        clearRecent();
        announce(ko.recent.clearedLive);
        // 단추가 사라지므로 초점을 쪽 제목으로 옮긴다 (/recent)
        if (page) document.getElementById('recent-title')?.focus();
      }}
    >
      {ko.recent.clear}
    </button>
  );
  // 줄 맨 앞은 대분류 아이콘 (카테고리 타일·메뉴와 같은 표, 색 띠 대신 D144)
  const tiles = list.map((x) => (
    <li data-cat={x.cat}>
      <a class="recent-tile" href={itemPath(x.id)}>
        <span class="cat-dot" aria-hidden="true">
          <Icon name={CATEGORY_ICON[x.cat as keyof typeof CATEGORY_ICON] ?? 'tag'} size="18px" />
        </span>
        <span class="recent-cat">{names[`${x.cat}/${x.sub}`] ?? names[x.cat] ?? x.sub}</span>
        <span class="recent-name">{x.name}</span>
      </a>
    </li>
  ));
  if (page) {
    return (
      <div class="recent-page">
        <div class="recent-acts">{clear}</div>
        <ul class="recent-grid">{tiles}</ul>
      </div>
    );
  }
  return (
    <section class="sec row recent" aria-labelledby="row-recent-viewed">
      <div class="sec-head">
        <h2 id="row-recent-viewed" tabIndex={-1}>
          {ko.recent.title}
        </h2>
        <div class="sec-acts">
          {clear}
          <a class="sec-more" href={ROUTES.recent} aria-label={fill(ko.home.moreOf, { title: ko.recent.title })}>
            {ko.home.more}
            <Icon name="chevron" size="16px" />
          </a>
        </div>
      </div>
      <ul class="row-track recent-track">{tiles}</ul>
    </section>
  );
}
