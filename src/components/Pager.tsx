// 쪽 번호 줄 (목록·검색 섬이 같이 쓴다): 이전 · 1 … 5 6 [7] 8 9 … 20 · 다음. 링크는 진짜 주소라 새 탭·공유가 되고,
// 그냥 누르면 onGo가 쪽을 다시 읽지 않고 바꾼다. 휴대폰에서는 지금 쪽에서 두 칸 떨어진 번호(is-far)를 감춘다.
import { ko } from '../copy/ko.ts';
import { pageWindow } from '../lib/catalog/core.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';

interface Props {
  page: number;
  pages: number;
  href: (page: number) => string;
  onGo: (page: number) => void;
}

function plain(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function Pager({ page, pages, href, onGo }: Props) {
  if (pages <= 1) return null;
  const link = (p: number) => ({
    href: href(p),
    onClick: (e: MouseEvent) => {
      if (!plain(e)) return;
      e.preventDefault();
      onGo(p);
    },
  });
  const prev = page > 1 ? page - 1 : null;
  const next = page < pages ? page + 1 : null;
  return (
    <nav class="pager" aria-label={ko.list.pages}>
      {prev ? (
        <a class="pager-step" {...link(prev)} aria-label={ko.list.prevLabel}>
          <Icon name="prev" size="18px" />
          <span class="pager-word">{ko.list.prev}</span>
        </a>
      ) : (
        <span class="pager-step is-off" aria-hidden="true">
          <Icon name="prev" size="18px" />
          <span class="pager-word">{ko.list.prev}</span>
        </span>
      )}
      <ol>
        {pageWindow(page, pages).map((p, i) =>
          p === null ? (
            <li class="pager-gap" aria-hidden="true" key={`g${i}`}>
              …
            </li>
          ) : (
            <li key={p} class={Math.abs(p - page) === 2 && p !== 1 && p !== pages ? 'is-far' : undefined}>
              <a class="pager-num" {...link(p)} aria-current={p === page ? 'page' : undefined} aria-label={fill(p === page ? ko.list.current : ko.list.pageLabel, { n: p })}>
                {p}
              </a>
            </li>
          ),
        )}
      </ol>
      {next ? (
        <a class="pager-step" {...link(next)} aria-label={ko.list.nextLabel}>
          <span class="pager-word">{ko.list.next}</span>
          <Icon name="chevron" size="18px" />
        </a>
      ) : (
        <span class="pager-step is-off" aria-hidden="true">
          <span class="pager-word">{ko.list.next}</span>
          <Icon name="chevron" size="18px" />
        </span>
      )}
    </nav>
  );
}
