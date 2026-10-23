import type { FacetMeta } from './facets.ts';
import type { KitTheme } from '../kits.ts';
import type { ModelsSummary } from './models.ts';
import type { SceneId } from './scene.ts';

// 진열대 자료의 모양 (docs/review/v5/brief.md 2절, schemas/catalog-*.json). 가져오기 스크립트(scripts/import/)가 만든
// data/catalog/<대분류>/<출처>.json의 항목은 모두 이 모양이다. 진열대 빌드(scripts/catalog/build.ts)와 화면(섬)이 함께 쓴다.

/** 대분류 (진열대) 순서: 머리줄 메뉴·홈 타일 순서 */
export const CATEGORY_ORDER = ['design', 'ai', 'api', 'opensource', 'templates', 'datasets'] as const;
export type CategoryId = (typeof CATEGORY_ORDER)[number];

export function isCategoryId(x: unknown): x is CategoryId {
  return typeof x === 'string' && (CATEGORY_ORDER as readonly string[]).includes(x);
}

/** 목록 정렬: 인기·이름·최근 갱신 */
export const SORTS = ['popular', 'name', 'recent'] as const;
export type SortKey = (typeof SORTS)[number];

/** 목록 한 쪽의 상품 수: 2·3·4·5열 모두 줄이 꽉 찬다 */
export const PAGE_SIZE = 60;
/** 목록 자료 파일 하나에 담는 쪽 수 (D103): 8쪽 = 카드 480장. 파일 수를 줄이고, 이웃 쪽은 다시 받지 않는다 */
export const CHUNK_PAGES = 8;
/** 상세 자료 조각 수 (D103): id 해시로 나눈다. 조각 하나 평균 상품 약 130개 (상세 하나를 열 때 받는 양) */
export const SHARDS = 1024;
/** 진열대 빌드가 만드는 JSON 파일 수 한도 (D103). Cloudflare Workers 정적 파일은 한 판 2만 개까지라 그 4분의 1 아래로 */
export const MAX_CATALOG_FILES = 5000;
/** 관련 상품 수 */
export const RELATED_MAX = 6;

export interface ItemMetrics {
  stars?: number;
  downloads?: number;
  likes?: number;
  /** 조회 수 (출처가 주는 값만, 예: n8n 템플릿 조회). 인기 점수에만 쓴다 (D133) */
  views?: number;
  /** 최근 뜨는 정도 (출처가 주는 값만, 예: Hugging Face trendingScore). 인기 점수에만 쓴다 (D133) */
  trend?: number;
  /** 사이트 인기 순위 묶음 (Chrome UX Report 상위 1천·5천·1만·5만·10만·50만·100만). 지표가 없는 사이트·API의 인기 점수에만 쓴다 (D133) */
  siteRank?: number;
  /** YYYY-MM-DD */
  updatedAt?: string;
}

/** 쓰는 법: 출처가 준 것만 (설치 명령, CSS·설정 조각, 공식 문서 주소) */
export interface ItemUse {
  install?: string;
  snippet?: string;
  docs?: string;
}

export interface CatalogItem {
  /** `<출처>:<slug>`, 주소에 그대로 쓸 수 있다 */
  id: string;
  name: string;
  /** 소분류 id */
  kind: string;
  /** 대분류 id */
  category: string;
  /** 출처 원문 그대로 (지어내지 않는다) */
  summary: string;
  /** 한국어 한 줄 (출처가 주었거나 코드잇소가 쓴 것: written) */
  summaryKo?: string;
  written?: string;
  /**
   * summaryKo를 진열대 빌드가 붙였을 때: 'codeshopper' = 코드잇소의 한국어 설명(번역·모양이 정해진 상품의 자료 문장, v5.1 D122),
   * 'rule' = 정해진 자료 칸만으로 만든 '무엇인지' 한 줄(D143). rule은 원문을 옮긴 것이 아니라 카드·상세가 원문을 함께 보인다
   */
  koBy?: 'codeshopper' | 'rule';
  url: string;
  source: { name: string; url: string };
  license?: string;
  metrics?: ItemMetrics;
  tags: string[];
  preview: { type: string; [key: string]: unknown };
  use?: ItemUse;
  fetchedAt: string;
}

export interface SourceMeta {
  id: string;
  name: string;
  count: number;
}

export interface SubMeta {
  id: string;
  nameKo: string;
  /** 이 소분류에 실제로 놓인 상품 수 */
  count: number;
  descKo?: string;
  sources: SourceMeta[];
  /** 인기 지표가 있는 상품이 하나라도 있나. 없으면 인기순 대신 '기본순'(출처 차례)이라 부른다 (D152) */
  measured: boolean;
  /** 갱신일이 있는 상품이 하나라도 있나. 없으면 '최근 갱신순'을 보이지 않는다 (D152) */
  dated: boolean;
}

export interface CategoryMeta {
  id: CategoryId;
  nameKo: string;
  total: number;
  fetchedAt: string;
  subcategories: SubMeta[];
}

/** 인기 지표 하나 (카드에 하나만 보인다) */
export interface Metric {
  kind: 'stars' | 'downloads' | 'likes';
  value: number;
}

/** 카드 미리 보기 판: 자료에서 바로 그릴 수 있는 것만 (원본 글꼴·큰 그림은 상세·S3) */
export type Thumb =
  | { t: 'colors'; colors: string[] }
  | { t: 'gradient'; colors: string[]; angle: number }
  /** scene: 그림을 못 받으면 머리글자 대신 보일 장면 (README 그림) */
  | { t: 'img'; src: string; dark?: string; fit: 'cover' | 'contain'; label: string; scene?: SceneId; words?: string[] }
  | { t: 'icons'; w: number; h: number; bodies: string[] }
  | { t: 'pattern'; w: number; h: number; body: string; stroke: boolean }
  /** css·file: 출처 CDN의 견본 글꼴 (화면에 보일 때 지연 로드, src/lib/font-preview.ts). 둘 다 없으면 일반 모양으로만 */
  | { t: 'font'; family: string; generic: string; ko: boolean; css?: string; file?: string }
  | { t: 'style'; colors: string[] }
  | { t: 'emoji'; emoji: string }
  | { t: 'mono'; label: string }
  /** 그림이 없는 저장소·템플릿·모델·데이터셋: 만들면 이런 모양인 장면 (scene.ts, 코드잇소가 그린 예시) */
  | { t: 'scene'; scene: SceneId; label: string; words?: string[] };

/** 카드에 붙는 짧은 사실 (인증·HTTPS·언어·작업…). 이름표 글은 화면(ko.ts)이 붙인다 */
export interface Fact {
  k: 'auth' | 'https' | 'cors' | 'free' | 'lang' | 'task' | 'transport' | 'format' | 'agent' | 'size' | 'host';
  v?: string;
}

/** 목록·기획전 카드 하나 (빌드 때 만든다) */
export interface Card {
  id: string;
  name: string;
  cat: CategoryId;
  sub: string;
  summary: string;
  /** 자료로 만든 한국어 한 줄(koBy rule)일 때 이어서 보이는 출처 원문 (영어, lang="en") */
  orig?: string;
  source: string;
  license?: string;
  metric?: Metric;
  updatedAt?: string;
  thumb: Thumb;
  facts: Fact[];
}

/** 상세 자료 한 건: 항목 그대로 + 관련 상품 [id, 이름] (관련 상품은 늘 같은 소분류) */
export interface DetailRecord extends CatalogItem {
  rel: [string, string][];
}

/** 상세 자료 조각 파일 (/catalog/item/<n>.json): id → 상세 */
export type Shard = Record<string, DetailRecord>;

/** 머리줄 메뉴·상세 섬에 넘기는 대분류 이름표 */
export interface NavCategory {
  id: CategoryId;
  name: string;
  total: number;
  subs: { id: string; name: string; count: number }[];
}

/** 목록 자료 파일 하나 (/catalog/list/<대분류>/<소분류>/<정렬>-<묶음>.json): 쪽 CHUNK_PAGES개의 카드 */
export interface ListChunk {
  v: 1;
  total: number;
  pages: number;
  /** 0부터. 이 파일의 첫 쪽 = chunk × CHUNK_PAGES + 1 */
  chunk: number;
  cards: Card[];
}

/** 기획전 한 줄 (홈): 진열대를 가로지르는 고르기 */
export interface Row {
  id: 'aiTools' | 'uiLibs' | 'aiApis' | 'templates' | 'fontsKo';
  cards: Card[];
  /** '모두 보기' 대상: 소분류 목록, sub가 없으면 대분류 쪽 (K1: 홈의 모든 줄에 있다) */
  more: { cat: CategoryId; sub?: string };
}

/** 스타터 키트 한 묶음 (홈·/kits, data/kits.json → 진열대 빌드): 한 번에 담는 재료 카드와 구현안 */
export interface KitData {
  /** src/lib/kits.ts KIT_IDS 중 하나 */
  id: string;
  theme: KitTheme;
  name: string;
  desc: string;
  cards: Card[];
  /** 구현안: 만드는 차례 3~6줄 */
  outline: string[];
}

/** 출처 파일 머리 (/about/credits): 출처 이름·주소·라이선스 설명 */
export interface SourceFile {
  category: CategoryId;
  file: string;
  name: string;
  url: string;
  license: string;
  count: number;
}

/**
 * 진열대 빌드가 Astro 쪽 빌드에 넘기는 요약 (.cache/catalog/site.json, D103). 페이지 머리말은 13만 개 원본 대신 이것만 읽는다.
 * first = 소분류마다 인기순 1쪽 카드 (목록 쪽 HTML에 그린다), tops = 대분류 쪽의 소분류별 1등 카드.
 */
export interface SiteData {
  v: 1;
  total: number;
  fetched: string;
  categories: CategoryMeta[];
  rows: Row[];
  /** 모든 키트 (data/kits.json 순서, 주제끼리 붙어 있다) */
  kits: KitData[];
  /** 홈에 싣는 키트 id (data/kits.json home) */
  kitHome: string[];
  tops: Record<string, Card[]>;
  first: Record<string, Card[]>;
  /** `${대분류}/${소분류}` → 거르기 칸 (값·개수). 칸이 없으면 빈 배열 (facets.ts) */
  facets: Record<string, FacetMeta[]>;
  sources: SourceFile[];
  /** 같은 id가 두 진열대에 놓인 수 (상세는 처음 것) */
  duplicates: number;
  files: { list: number; item: number; search: number; facet: number; models?: number };
  /** AI 모델·요금 (D141): 수집 날짜와 비교 쪽 제공자 이름표. 모델 자료가 없으면 없다 */
  models?: ModelsSummary;
}
