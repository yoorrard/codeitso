// 화면 자료 나누기 (D82, 설계서 L-08): 단계 화면이 처음 싣는 자료에서 그 화면이 쓰지 않는 칸을 뺀다.
//  - 용어 카드(data/concepts.json)는 엔진과 단계 화면이 쓰는 칸(CONCEPT_CORE)만 src/lib/data.ts에 싣고,
//    풀이 칸(CONCEPT_DETAIL: 설명·문제·AI에게 물을 말…)은 src/lib/data-full.ts가 id로 다시 붙인다.
//  - 에러 안내(data/errors.json)는 사전과 빌드 때만 쓰므로 data-full.ts에만 싣는다.
//  - 진열 상품의 출처 칸(sources)은 자료 검사(npm run validate, Node)만 읽으므로 브라우저에는 싣지 않는다 (data-full.ts에도 없다).
// 빌드에서는 Vite 플러그인(scripts/lib/data-parts-plugin.ts)이 이 함수로 가상 모듈을 만든다. 순수 함수만 둔다 (시험 있음).
import type { AliasEntry, Aliases } from './aliases.ts';
import type { Concept, Looks, Product, Templates } from './engine/types.ts';

/** 엔진(evaluate·영수증·설계도)과 단계 화면 섬이 읽는 용어 칸 */
export const CONCEPT_CORE = ['id', 'title', 'level', 'order', 'prerequisites', 'stepHint'] as const;
/** 용어 화면·사전·검색 색인만 읽는 칸. 스키마의 칸은 둘 중 한쪽에 꼭 있다 (tests/lib/data-parts.test.ts) */
export const CONCEPT_DETAIL = ['aliases', 'summary', 'figure', 'tryIt', 'quiz', 'askAI', 'relatedProducts'] as const;

export type ConceptCore = Pick<Concept, (typeof CONCEPT_CORE)[number]>;
export type ConceptDetail = Pick<Concept, 'id' | (typeof CONCEPT_DETAIL)[number]>;
export interface ConceptsFile<T> {
  version: number;
  concepts: T[];
}
export type ConceptPart = 'core' | 'detail';

/** 진열 상품에서 브라우저에 싣지 않는 칸 (자료 검사만 읽는다) */
export const PRODUCT_CHECK_ONLY = ['sources'] as const;
export type ScreenProduct = Omit<Product, (typeof PRODUCT_CHECK_ONLY)[number]>;
export interface ProductsFile<T> {
  version: number;
  products: T[];
}

function pick(o: object, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (keys.includes(k)) out[k] = v;
  return out;
}

/** 용어 카드 파일을 칸으로 나눈다. detail에도 id를 남겨 다시 붙일 수 있게 한다 */
export function conceptPart(file: ConceptsFile<Concept>, part: 'core'): ConceptsFile<ConceptCore>;
export function conceptPart(file: ConceptsFile<Concept>, part: 'detail'): ConceptsFile<ConceptDetail>;
export function conceptPart(file: ConceptsFile<Concept>, part: ConceptPart): ConceptsFile<ConceptCore | ConceptDetail>;
export function conceptPart(file: ConceptsFile<Concept>, part: ConceptPart): ConceptsFile<ConceptCore | ConceptDetail> {
  const keys: readonly string[] = part === 'core' ? CONCEPT_CORE : ['id', ...CONCEPT_DETAIL];
  return { version: file.version, concepts: file.concepts.map((c) => pick(c, keys) as unknown as ConceptCore | ConceptDetail) };
}

/** 화면에 싣는 진열 상품: 자료 검사만 읽는 칸을 뺀다 */
export function screenProducts(file: ProductsFile<Product>): ProductsFile<ScreenProduct> {
  const drop: readonly string[] = PRODUCT_CHECK_ONLY;
  return {
    version: file.version,
    products: file.products.map((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !drop.includes(k))) as unknown as ScreenProduct),
  };
}

/**
 * 도구 이름 찾기 묶음(T37, 2단계 '목록에 없는 도구 쓰기', src/lib/tool-match.ts)이 싣는 낱말표 칸: 도구 짐작 말과 빈틈.
 * 질문 칸(options·yesNo·aiNames)은 1단계 찾기 묶음(custom-match.ts)이 aliases.json에서 바로 싣는다. 같은 JSON 모듈을 두 묶음이
 * 함께 부르면 빌드가 둘을 한 공유 조각으로 묶어 서로의 칸까지 받게 되므로, 이 칸만 가상 모듈로 따로 뗀다 (빈틈은 두 묶음에 한 벌씩)
 */
export const ALIAS_TOOL_PART = ['toolHints', 'gaps'] as const;
export type ToolAliases = Pick<Aliases, (typeof ALIAS_TOOL_PART)[number]>;
export function toolAliases(file: Pick<Aliases, 'toolHints' | 'gaps'>): ToolAliases {
  return { toolHints: file.toolHints, gaps: file.gaps };
}

/**
 * 설계도 6번·DESIGN.md 문장(templates.look, T38)은 디자인 묶음(src/lib/look-data.ts, 지연)만 읽는다. 단계 화면 첫 묶음의
 * 문장 틀(src/lib/data.ts)에서는 빼고(virtual:cc-data/templates-core), 디자인 묶음이 따로 받는다(virtual:cc-data/templates-look)
 */
export const TEMPLATE_LOOK_ONLY = ['look'] as const;
export type CoreTemplates = Omit<Templates, (typeof TEMPLATE_LOOK_ONLY)[number]>;
export type LookTemplatesPart = Pick<Templates, 'look'>;
export function templatesCore(file: Templates): CoreTemplates {
  const drop: readonly string[] = TEMPLATE_LOOK_ONLY;
  return Object.fromEntries(Object.entries(file).filter(([k]) => !drop.includes(k))) as unknown as CoreTemplates;
}
export function templatesLook(file: Templates): LookTemplatesPart {
  return { look: file.look };
}

/**
 * 디자인 값(looks.json, T38)은 둘로 나눠 싣는다: 디자인 정하기 시트·미리 보기 묶음(src/lib/look-data.ts)은 부품 규칙 문장(components)과
 * 글꼴 받는 법(families의 CSS 이름·받는 줄·라이선스)과 자료 검사만 읽는 칸(sources·checkedAt)을 뺀 것(virtual:cc-data/looks-screen),
 * 설계도 6번 묶음(src/lib/look-render-data.ts)은 부품 규칙과 글꼴 전부를 더 받는다(virtual:cc-data/looks-render)
 */
export const LOOK_RENDER_ONLY = ['components'] as const;
export const LOOK_CHECK_ONLY = ['sources', 'checkedAt'] as const;
/** 시트 묶음의 글꼴 칸: 이름과 확인 여부만 (미리 보기는 바깥 글꼴을 부르지 않고 Pretendard로 그린다) */
export const LOOK_FAMILY_SCREEN = ['id', 'name', 'needsReview'] as const;
export type ScreenLooks = Omit<Looks, (typeof LOOK_RENDER_ONLY)[number]>;
export type RenderLooks = Pick<Looks, (typeof LOOK_RENDER_ONLY)[number] | 'families'>;
const keep = <T extends object>(list: readonly T[], test: (k: string) => boolean): T[] =>
  list.map((x) => Object.fromEntries(Object.entries(x).filter(([k]) => test(k))) as T);
export function looksScreen(file: Looks): ScreenLooks {
  const drop: readonly string[] = LOOK_CHECK_ONLY;
  const fam: readonly string[] = LOOK_FAMILY_SCREEN;
  const { components: _c, ...rest } = file;
  return {
    ...rest,
    families: keep(file.families, (k) => fam.includes(k)),
    iconSets: keep(file.iconSets, (k) => !drop.includes(k)),
    references: keep(file.references, (k) => !drop.includes(k)),
  };
}
export function looksRender(file: Looks): RenderLooks {
  const drop: readonly string[] = LOOK_CHECK_ONLY;
  return { components: file.components, families: keep(file.families, (k) => !drop.includes(k)) };
}

/**
 * 직접 쓰기 찾기 묶음(custom-match.ts)이 싣는 느낌 낱말 (looks.json keywords.mood, T38). looks.json을 통째로 부르면
 * 디자인 묶음과 한 조각으로 묶여 찾기 묶음이 디자인 값까지 받으므로 이 칸만 뗀다
 */
export function lookMoodWords(file: Pick<Looks, 'keywords'>): { mood: AliasEntry[] } {
  return { mood: file.keywords.mood };
}

/**
 * 1단계 느낌 타일 순서 (T38, 설계서 4.3절): 앱 종류마다 추천 셋(looks.json defaultsByType[].moods)만. 단계 화면 첫 묶음에 싣는
 * 작은 가상 모듈이다 (디자인 값 전체는 시트를 열 때 받는다). 순서 계산은 엔진 moodOrder가 한다
 */
export function lookMoodOrder(file: Pick<Looks, 'defaultsByType'>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(file.defaultsByType).map(([k, v]) => [k, v.moods]));
}

/**
 * 디자인 미리 보기 아이콘 (T38, 설계서 4.6절): 아이콘 묶음 셋(looks.json iconSets)에서 아래 메뉴 넷(홈·추가·검색·설정)만.
 * 빌드 때 패키지의 SVG 파일을 읽어 묶음마다 가상 모듈(virtual:cc-data/look-icons-<묶음>)로 싣고, 미리 보기는 고른 묶음 하나만 받는다.
 * 값: [node_modules 안 폴더, 이름 → 파일 이름(.svg 뺀 것)]
 */
export const LOOK_ICON_FILES: Record<string, [string, Record<LookIconName, string>]> = {
  lucide: ['lucide-static/icons', { home: 'house', add: 'plus', search: 'search', settings: 'settings' }],
  phosphor: ['@phosphor-icons/core/assets/regular', { home: 'house', add: 'plus', search: 'magnifying-glass', settings: 'gear-six' }],
  tabler: ['@tabler/icons/icons/outline', { home: 'home', add: 'plus', search: 'search', settings: 'settings' }],
};
export type LookIconName = 'home' | 'add' | 'search' | 'settings';
/** 아이콘 하나: viewBox, 선으로 그리는가(Lucide·Tabler) 면으로 칠하는가(Phosphor), 안쪽 그림 */
export interface LookIcon {
  box: string;
  stroke: boolean;
  body: string;
}

/** SVG 글에서 viewBox·칠 방식·안쪽 그림만 뽑는다: 주석·class·크기와 Tabler의 빈 상자 경로(stroke="none")를 빼고 공백을 줄인다 */
export function iconParts(svg: string): LookIcon {
  const clean = svg.replace(/<!--[\s\S]*?-->/g, '').trim();
  const open = clean.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const body = clean
    .slice(clean.indexOf(open) + open.length, clean.lastIndexOf('</svg>'))
    .replace(/<path[^>]*stroke="none"[^>]*\/>/g, '')
    .replace(/\s*\n\s*/g, '')
    .replace(/\s*\/>/g, '/>')
    .trim();
  return { box: open.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 24 24', stroke: /stroke="currentColor"/.test(open), body };
}

/** 나눈 두 쪽을 id로 다시 붙인다. 순서는 core를 따른다 (원래 파일 순서) */
export function joinConcepts(core: readonly ConceptCore[], detail: readonly ConceptDetail[]): Concept[] {
  const byId = new Map(detail.map((d) => [d.id, d]));
  return core.map((c) => {
    const d = byId.get(c.id);
    if (!d) throw new Error(`concepts: '${c.id}'의 풀이 칸이 없다 (D82)`);
    return { ...c, ...d } as Concept;
  });
}

/**
 * 이 묶음에 싣지 않은 칸을 읽으면 바로 멈춘다: 화면이 조용히 빈칸(undefined)을 그리지 않게.
 * 칸은 열거하지 않으므로 펼치기({...o})·JSON.stringify에는 끼지 않는다.
 */
export function guardMissing<T extends object>(o: T, keys: readonly string[], where: string): T {
  for (const k of keys) {
    Object.defineProperty(o, k, {
      configurable: true,
      enumerable: false,
      get(): never {
        throw new Error(`${where}.${k}: src/lib/data.ts에 싣지 않은 칸이다. src/lib/data-full.ts를 쓴다 (D82)`);
      },
    });
  }
  return o;
}
