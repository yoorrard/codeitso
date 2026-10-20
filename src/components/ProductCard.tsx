// 상품 카드 (목록·기획전·검색). Astro가 빌드 때 정적으로 그리고(홈·카테고리), 목록 섬(Listing)이 다른 쪽을 같은 모양으로 그린다.
// 카드 전체를 누르면 상세로 간다(이름 링크를 카드 위로 넓힌다). [담기]는 링크 밖의 따로 누르는 버튼이고,
// 누름·담은 상태는 src/lib/cart-buttons.ts가 한 곳에서 맡는다 (data-add, data-in). 이미 담은 카드를 누르면 장바구니 서랍이 그 줄을 연다.
// 오른쪽 위 하트(찜, N1)도 링크 밖 버튼이고 src/lib/wish-buttons.ts가 맡는다 (data-wish, aria-pressed).
import { ko } from '../copy/ko.ts';
import type { Card } from '../lib/catalog/types.ts';
import { METRIC_ICON, factLabel, metricText } from '../lib/labels.ts';
import { formatCount } from '../lib/catalog/core.ts';
import { itemPath } from '../lib/routes.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';
import { Thumb } from './Thumb.tsx';

interface Props {
  card: Card;
  /** 패턴 id를 쪽 안에서 겹치지 않게 하는 자리 이름 */
  slot?: string;
  /** 카드 이름 제목 단계 (목록 h3, 기획전 h3) */
  level?: 'h3' | 'h4';
}

export function ProductCard({ card, slot = '', level = 'h3' }: Props) {
  const H = level;
  return (
    <article class="card" data-cat={card.cat}>
      <Thumb thumb={card.thumb} uid={`${slot}:${card.id}`} />
      <div class="card-body">
        <H class="card-name">
          <a class="card-link" href={itemPath(card.id)}>
            {card.name}
          </a>
        </H>
        <p class="card-sum">{card.summary}</p>
        {card.facts.length > 0 && (
          <ul class="card-facts">
            {card.facts.map((f) => (
              <li>{factLabel(f)}</li>
            ))}
          </ul>
        )}
        <p class="card-meta">
          <span class="card-src">{card.source}</span>
          {card.metric && (
            <span class="card-metric" title={metricText(card.metric)}>
              <Icon name={METRIC_ICON[card.metric.kind]} size="14px" />
              <span class="visually-hidden">{ko.card.metric[card.metric.kind]} </span>
              {formatCount(card.metric.value)}
            </span>
          )}
          {card.license && <span class="card-lic">{card.license}</span>}
        </p>
      </div>
      <button
        type="button"
        class="wish-btn"
        data-wish={card.id}
        data-name={card.name}
        data-cat={card.cat}
        data-sub={card.sub}
        aria-pressed="false"
        aria-label={fill(ko.card.wishLabel, { name: card.name })}
      >
        <span class="wish-off" aria-hidden="true">
          <Icon name="heart" size="20px" />
        </span>
        <span class="wish-on" aria-hidden="true">
          <Icon name="heartFill" size="20px" />
        </span>
      </button>
      <button
        type="button"
        class="add-btn"
        data-add={card.id}
        data-name={card.name}
        data-cat={card.cat}
        data-sub={card.sub}
        data-in="false"
        aria-label={fill(ko.card.addLabel, { name: card.name })}
      >
        <span class="add-on" aria-hidden="true">
          <Icon name="check" size="16px" />
        </span>
        <span class="add-off" aria-hidden="true">
          <Icon name="plus" size="16px" />
        </span>
        <span class="add-label">{ko.card.add}</span>
      </button>
    </article>
  );
}
