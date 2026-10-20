// Astro 페이지 머리말이 읽는 진열대 요약 (D103). 진열대 빌드(scripts/catalog/build.ts, npm run build가 먼저 돌린다)가
// .cache/catalog/site.json에 쓴 것을 한 번 읽어 둔다. 13만 개 원본은 읽지 않는다. 빌드 때만 쓴다 (섬은 props로 받는다).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FacetMeta } from './facets.ts';
import type { ModelsSummary } from './models.ts';
import type { Card, CategoryId, CategoryMeta, KitData, NavCategory, Row, SiteData, SourceFile, SubMeta } from './types.ts';

/** 진열대 빌드가 쓰고 Astro가 읽는 요약 파일 (저장소에 올리지 않는다, .cache/는 .gitignore) */
export const SITE_FILE = join(process.cwd(), '.cache', 'catalog', 'site.json');

let cache: SiteData | null = null;

export function site(): SiteData {
  if (cache) return cache;
  try {
    cache = JSON.parse(readFileSync(SITE_FILE, 'utf8')) as SiteData;
  } catch {
    throw new Error(`진열대 요약(${SITE_FILE})이 없다. npm run catalog를 먼저 돌린다 (npm run build·dev는 저절로 돌린다)`);
  }
  return cache;
}

export function categories(): CategoryMeta[] {
  return site().categories;
}

export function totalItems(): number {
  return site().total;
}

/** 머리줄 메뉴·상세 섬의 이름표 */
export function navData(): NavCategory[] {
  return categories().map((c) => ({ id: c.id, name: c.nameKo, total: c.total, subs: c.subcategories.map((s) => ({ id: s.id, name: s.nameKo, count: s.count })) }));
}

/** 최근 본 재료의 이름표: 대분류 id → 이름, '대분류/소분류' → 소분류 이름 */
export function categoryNames(): Record<string, string> {
  return Object.fromEntries(categories().flatMap((c) => [[c.id, c.nameKo], ...c.subcategories.map((s) => [`${c.id}/${s.id}`, s.nameKo])]));
}

export function homeRows(): Row[] {
  return site().rows;
}

/** 모든 스타터 키트 (data/kits.json 순서, /kits) */
export function allKits(): KitData[] {
  return site().kits ?? [];
}

/** 홈에 싣는 스타터 키트 (data/kits.json home 순서) */
export function homeKits(): KitData[] {
  const all = allKits();
  return (site().kitHome ?? []).flatMap((id) => all.filter((k) => k.id === id));
}

/** 대분류 쪽의 소분류별 1등 상품 */
export function topsOf(cat: CategoryId): Card[] {
  return site().tops[cat] ?? [];
}

/** 소분류 목록 쪽 HTML에 그리는 인기순 1쪽 */
export function firstPage(cat: CategoryId, sub: SubMeta['id']): Card[] {
  return site().first[`${cat}/${sub}`] ?? [];
}

/** 소분류의 거르기 칸 (값·개수) */
export function facetsOf(cat: CategoryId, sub: SubMeta['id']): FacetMeta[] {
  return site().facets?.[`${cat}/${sub}`] ?? [];
}

export function sources(): SourceFile[] {
  return site().sources;
}

/** AI 모델 비교 쪽의 제공자 이름표와 수집 날짜 (D141). 모델 자료가 없으면 빈 목록 */
export function modelsSummary(): ModelsSummary {
  return site().models ?? { fetched: '', providers: [] };
}
