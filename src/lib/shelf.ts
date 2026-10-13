// 도구 모음(/tools)과 도구 상세(/tools/[id])가 함께 쓰는 이름표와 그림 (T13, docs/CONCEPT.md 6.7).
// 점수·추천은 계산하지 않는다. 기능 이름은 장보기 칸 이름(rules.json)을 그대로 쓰고, 칸이 없는 기능(proxy)만 ko.ts에서 가져온다.
import { ko } from '../copy/ko.ts';
import { data } from './data.ts';
import type { Capability, Product, Recipe, SlotDef } from './engine/index.ts';
import { SLOT_ART, optionArt } from './option-art.ts';

/** 거르기 단추 하나: 값, 이름, 3D 그림(public/emoji/<art>.webp) */
export interface ShelfChoice {
  id: string;
  label: string;
  art: string;
}

const DOMAIN_PREFIX = 'domain.';

export const shelfProducts: Product[] = data.products.products.filter((p) => p.layer === 'shelf');
export const indexProducts: Product[] = data.products.products.filter((p) => p.layer === 'index');

function slotDefs(): SlotDef[] {
  return data.rules.rules.flatMap((r) => (r.type === 'slot' ? [r.slot] : []));
}

/** 기능 이름 (칸 이름과 같다). 칸 순서대로, 칸이 없는 기능은 뒤에 */
const capInfo = new Map<Capability, { label: string; order: number }>();
for (const s of slotDefs()) if (!capInfo.has(s.capability)) capInfo.set(s.capability, { label: s.label, order: s.order });

export function capabilityLabel(c: Capability): string {
  return capInfo.get(c)?.label ?? ko.shelf.capProxy;
}

function capabilityOrder(c: Capability): number {
  return capInfo.get(c)?.order ?? Number.MAX_SAFE_INTEGER;
}

export function capabilityArt(c: Capability): string {
  return SLOT_ART[c] ?? 'tools';
}

export function domainLabel(tagId: string): string {
  return data.taxonomy.tags.find((t) => t.id === tagId)?.label ?? tagId;
}

export function domainArt(tagId: string): string {
  return optionArt('q.domain', tagId.slice(DOMAIN_PREFIX.length)) ?? 'package';
}

/** 상품 그림: 분야가 있으면 첫 분야, 없으면 첫 기능 */
export function productArt(p: Product): string {
  const d = p.domains?.[0];
  if (d) return domainArt(d);
  const c = p.capabilities[0];
  return c ? capabilityArt(c) : 'package';
}

/** 진열된(진열·색인) 상품에 실제로 있는 기능만, 칸 순서대로 */
export function capabilityChoices(products: Product[]): ShelfChoice[] {
  const present = new Set(products.flatMap((p) => p.capabilities));
  return [...present]
    .sort((a, b) => capabilityOrder(a) - capabilityOrder(b))
    .map((c) => ({ id: c, label: capabilityLabel(c), art: capabilityArt(c) }));
}

/** 진열된 상품에 실제로 있는 분야만, taxonomy.json 순서대로 */
export function domainChoices(products: Product[]): ShelfChoice[] {
  const present = new Set(products.flatMap((p) => p.domains ?? []));
  return data.taxonomy.tags.filter((t) => t.id.startsWith(DOMAIN_PREFIX) && present.has(t.id)).map((t) => ({ id: t.id, label: t.label, art: domainArt(t.id) }));
}

/** 진열대 코너: 상품의 첫 기능(대표 기능)으로 묶는다. 여러 기능을 맡는 상품도 한 코너에만 놓는다 */
export function corners(products: Product[]): { capability: Capability; label: string; art: string; products: Product[] }[] {
  return capabilityChoices(products)
    .map((c) => ({
      capability: c.id as Capability,
      label: c.label,
      art: c.art,
      products: products.filter((p) => p.capabilities[0] === c.id),
    }))
    .filter((c) => c.products.length > 0);
}

/** 이 상품이 들어간 레시피 (recipes.json 순서) */
export function recipesWith(productId: string): Recipe[] {
  return data.recipes.recipes.filter((r) => r.cart.includes(productId));
}
