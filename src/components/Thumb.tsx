// 상품 미리 보기 판 (카드·상세). 자료에서 바로 그릴 수 있는 것만 그린다: 색 띠·그라디언트·아이콘 견본·배경 패턴·스타일 색·이모지,
// 출처 그림(지연 로드, brief 5절), 그 밖에는 대분류 색 위 머리글자. 원본 글꼴 견본은 S3에서 지연 로드한다.
// 색 값은 자료(#RRGGBB)라 인라인 style로 칠한다 (CSP는 style 속성만 허락). SVG 조각은 core.ts safeSvg를 거친 것만 온다.
import { fnv1a } from '../lib/catalog/core.ts';
import type { Thumb as ThumbData } from '../lib/catalog/types.ts';
import { ko } from '../copy/ko.ts';

interface Props {
  thumb: ThumbData;
  /** 패턴 id가 한 쪽 안에서 겹치지 않게 (상품 id + 자리) */
  uid: string;
  large?: boolean;
}

export function Thumb({ thumb, uid, large = false }: Props) {
  const cls = `thumb thumb-${thumb.t}${large ? ' is-large' : ''}`;
  switch (thumb.t) {
    case 'colors':
      return (
        <div class={cls} aria-hidden="true">
          {thumb.colors.map((c) => (
            <span style={{ background: c }} />
          ))}
        </div>
      );
    case 'gradient':
      return <div class={cls} aria-hidden="true" style={{ backgroundImage: `linear-gradient(${thumb.angle}deg, ${thumb.colors.join(', ')})` }} />;
    case 'style':
      return (
        <div class={cls} aria-hidden="true" style={{ background: thumb.colors[0] }}>
          {thumb.colors.slice(1).map((c) => (
            <span style={{ background: c }} />
          ))}
        </div>
      );
    case 'img':
      return (
        <div class={`${cls} fit-${thumb.fit}`} aria-hidden="true">
          <span class="thumb-fallback">{thumb.label}</span>
          <picture>
            {thumb.dark && <source media="(prefers-color-scheme: dark)" srcset={thumb.dark} />}
            <img src={thumb.src} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width={large ? 640 : 320} height={large ? 400 : 200} />
          </picture>
        </div>
      );
    case 'icons':
      return (
        <div class={cls} aria-hidden="true">
          {thumb.bodies.map((b) => (
            <svg viewBox={`0 0 ${thumb.w} ${thumb.h}`} width="32" height="32" focusable="false" dangerouslySetInnerHTML={{ __html: b }} />
          ))}
        </div>
      );
    case 'pattern': {
      const id = `pat-${fnv1a(uid).toString(36)}`;
      const body = thumb.stroke ? `<g fill="none" stroke="currentColor" stroke-width="1">${thumb.body}</g>` : thumb.body;
      return (
        <div class={cls} aria-hidden="true">
          <svg width="100%" height="100%" focusable="false">
            <defs>
              <pattern id={id} width={thumb.w} height={thumb.h} patternUnits="userSpaceOnUse" dangerouslySetInnerHTML={{ __html: body }} />
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} />
          </svg>
        </div>
      );
    }
    case 'font': {
      const g = thumb.generic === 'serif' ? 'is-serif' : thumb.generic === 'monospace' ? 'is-mono' : 'is-sans';
      return (
        <div class={`${cls} ${g}`} aria-hidden="true">
          <span class="font-sample">{thumb.ko ? ko.card.sampleKo : ko.card.sampleEn}</span>
          <span class="font-family">{thumb.family}</span>
        </div>
      );
    }
    case 'emoji':
      return (
        <div class={cls} aria-hidden="true">
          <span>{thumb.emoji}</span>
        </div>
      );
    default:
      return (
        <div class={cls} aria-hidden="true">
          <span>{thumb.label}</span>
        </div>
      );
  }
}
