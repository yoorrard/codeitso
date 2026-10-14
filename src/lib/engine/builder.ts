// 웹에서 만드는 도구의 공개 (B-02, D89, docs/review/v3/brief.md 7.7절, docs/ENGINE.md 10절).
// 웹에서 만드는 도구(Lovable·Bolt·v0 같은 것, 태그 ai.builder)는 공개도 그 도구 안의 게시 기능으로 한다.
// 그래서 배포 칸에 GitHub Pages나 Cloudflare를 추천하지 않고, 엔진이 가짜 상품 '빌더의 게시 기능'으로 그 칸을 채운다.
// 이 상품은 products.json에 없고 점수·추천·규칙 조건에 끼지 않는다. 비용은 '모름'(영수증 '0원 + 확인 필요')이다.
import type { Catalog } from './catalog.ts';
import { hasTag } from './conditions.ts';
import type { Product, SlotDef } from './types.ts';

/** 빌더의 게시 기능 id. 진열·색인 상품 id와 겹치지 않는다 (검사가 막는다) */
export const BUILDER_PUBLISH_ID = 'builder-publish';
/** 웹에서 만드는 도구 태그 (q.ai의 builder 보기) */
export const BUILDER_TAG = 'ai.builder';

/** 이 칸을 고른 빌더가 맡는가: 웹에서 만드는 도구를 골랐고, 공개(host) 기능의 칸이면 */
export function builderHosts(tags: Record<string, number>, slot: Pick<SlotDef, 'capability'>): boolean {
  return slot.capability === 'host' && hasTag(tags, BUILDER_TAG);
}

/** 빌더의 게시 기능을 상품 모양으로. 화면에 쓰지 않는 자리값(access·cost.free 등)은 규칙 조건에서 읽지 않는다 (matchProduct가 거른다) */
export function builderPublishProduct(cat: Catalog): Product {
  const t = cat.data.templates.builderPublish;
  return {
    id: BUILDER_PUBLISH_ID,
    name: t.name,
    builderPublish: true,
    layer: 'index',
    summary: t.summary,
    capabilities: ['host'],
    provider: { type: 'generic', name: t.provider },
    access: 'none',
    cost: { free: false, note: cat.data.templates.customTool.cost },
    serverRegion: 'unknown',
    difficulty: 1,
    keyExposureRisk: false,
    recommendable: false,
    links: [],
    checkedAt: '',
    needsReview: true,
  };
}

/**
 * 고른 도구에 빌더의 게시 기능을 더한다: 웹에서 만드는 도구를 골랐고, 공개 칸이 **꼭 고를 칸**(여럿이·아무나)이고,
 * 고른 도구 중 공개를 맡는 것이 없을 때만. 나만 쓰는 앱의 선택 칸은 비워 둔다: 채우면 '공개 주소에 올려라'(10번)와
 * '키가 든 파일은 공개 주소에 올리지 않는다'(safety.local-key)가 함께 나오고, 이 상품은 규칙 조건에 끼지 않아
 * 공개 주소 막힌 곳(conflict.key-on-public-host)도 켜지지 않는다. 그 칸의 추천은 rankSlot이 여전히 막는다.
 * 이용자가 다른 공개 도구(진열 도구·직접 쓴 도구)를 고르면 그 도구가 칸을 채우고 이것은 빠진다 (2단계 [다른 곳에 공개하기]).
 */
export function withBuilderPublish(cat: Catalog, cart: Product[], slots: SlotDef[], tags: Record<string, number>): Product[] {
  if (!slots.some((s) => s.required && builderHosts(tags, s))) return cart;
  if (cart.some((p) => p.capabilities.includes('host'))) return cart;
  return [...cart, builderPublishProduct(cat)];
}

/** 비용을 코드쇼퍼가 확인하지 않은 도구: 직접 쓴 도구와 빌더의 게시 기능. 영수증 비용 칸은 '모름' */
export function costUnchecked(p: Product): boolean {
  return p.custom === true || p.builderPublish === true;
}

/** 이용자가 고른 도구가 아닌, 엔진이 채운 상품 (난이도·예상 시간에 더하지 않는다: 쓰던 빌더 안의 기능이라 새로 붙일 도구가 아니다) */
export function toolsToSetUp(cart: Product[]): Product[] {
  return cart.filter((p) => p.builderPublish !== true);
}
