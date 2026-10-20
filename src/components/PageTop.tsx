// 본문 맨 위 한 줄 (N1, D137): [뒤로] + 위치(거쳐 온 위 단계). Base.astro가 정적으로 그리고, 상세 섬은 상품을 읽은 뒤 같은 모양으로 그린다.
// [뒤로]는 진짜 링크(위 단계 주소)이고, 이전 화면이 이 사이트면 src/lib/page-nav.ts가 그 화면으로 되돌린다(history.back).
import { ko } from '../copy/ko.ts';
import { Icon } from './Icon.tsx';

export interface Crumb {
  href: string;
  label: string;
}

interface Props {
  /** [뒤로]의 기본 행선지. 없으면 [뒤로]를 그리지 않는다 (처음 화면) */
  back: string | null;
  crumbs: Crumb[];
}

export function PageTop({ back, crumbs }: Props) {
  if (!back && crumbs.length === 0) return null;
  return (
    <div class="page-top">
      {back && (
        <a class="back-link" href={back} data-back>
          <Icon name="back" size="18px" />
          <span>{ko.layout.back}</span>
        </a>
      )}
      {crumbs.length > 0 && (
        <nav class="crumbs" aria-label={ko.list.breadcrumb}>
          <ol>
            {crumbs.map((c) => (
              <li>
                <a href={c.href}>{c.label}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}
