// 상품 미리 보기 판 (카드·상세). 자료에서 바로 그릴 수 있는 것만 그린다: 색 띠·그라디언트·아이콘 견본·배경 패턴·스타일 색·이모지,
// 출처 그림(지연 로드, brief 5절), 그 밖에는 대분류 색 위 머리글자. 폰트 견본 글꼴은 보일 때 src/lib/font-preview.ts가 받는다(data-font-*).
// 색 값은 자료(#RRGGBB)라 인라인 style로 칠한다 (CSP는 style 속성만 허락). SVG 조각은 core.ts safeSvg를 거친 것만 온다.
import { fnv1a } from '../lib/catalog/core.ts';
import { SCENE_H, SCENE_W, sceneShapes } from '../lib/catalog/scene.ts';
import type { SceneId } from '../lib/catalog/scene.ts';
import type { Thumb as ThumbData } from '../lib/catalog/types.ts';
import { ko } from '../copy/ko.ts';

/** 만들면 이런 모양인 장면 (그린 예시, src/lib/catalog/scene.ts). 색은 shop.css의 .t-<색> 토큰 */
function SceneSvg({ scene, label, words }: { scene: SceneId; label: string; words?: string[] | undefined }) {
  return (
    <svg class="scene-svg" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} focusable="false" aria-hidden="true">
      {sceneShapes(scene, label, words).map((x) => {
        switch (x.k) {
          case 'r':
            return <rect x={x.x} y={x.y} width={x.w} height={x.h} rx={x.r || undefined} class={`f t-${x.c}${x.o ? ` o o-${x.o}` : ''}`} />;
          case 'c':
            return <circle cx={x.x} cy={x.y} r={x.r} class={`f t-${x.c}`} />;
          case 'p':
            return x.fill ? <path d={x.d} class={`f t-${x.c}`} /> : <path d={x.d} class={`s t-${x.c}`} stroke-width={x.sw} />;
          default:
            return (
              <text x={x.x} y={x.y} font-size={x.z} text-anchor={x.mid ? 'middle' : undefined} class={`f t-${x.c}${x.mono ? ' is-mono' : ''}${x.bold ? ' is-bold' : ''}`}>
                {x.s}
              </text>
            );
        }
      })}
    </svg>
  );
}

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
        <div class={`${cls} fit-${thumb.fit}${thumb.scene ? ' has-scene' : ''}`} aria-hidden="true">
          <span class={`thumb-fallback${thumb.scene ? ' is-scene' : ''}`}>{thumb.scene ? <SceneSvg scene={thumb.scene} label={thumb.label} words={thumb.words} /> : thumb.label}</span>
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
          <span
            class="font-sample"
            data-font-family={thumb.family}
            data-font-generic={thumb.generic}
            data-font-css={thumb.css}
            data-font-file={thumb.file}
            data-font-full={large ? 'true' : undefined}
          >
            {large ? (thumb.ko ? ko.item.fontSampleKo : ko.item.fontSampleEn) : thumb.ko ? ko.card.sampleKo : ko.card.sampleEn}
          </span>
          <span class="font-family">{thumb.family}</span>
        </div>
      );
    }
    case 'scene':
      return (
        <div class={`${cls} is-${thumb.scene}`} aria-hidden="true">
          <SceneSvg scene={thumb.scene} label={thumb.label} words={thumb.words} />
        </div>
      );
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
