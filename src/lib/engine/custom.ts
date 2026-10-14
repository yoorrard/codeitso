// 직접 쓴 답과 도구 (T36, docs/review/v3/input.md 7·8절, docs/ENGINE.md 9절).
// 직접 쓴 도구는 카탈로그에 넣지 않는 '모름' 도구다: 칸은 채우지만 점수·추천이 없고, 모르는 사실은 규칙 조건에서
// 값이 없다(맞지 않음). 서버 위치만 자료 규칙이 처음부터 위험 쪽에 둔 '모름'(unknown)이다.
import type { Catalog } from './catalog.ts';
import type { EngineResult } from './evaluate.ts';
import { fill, oneLine } from './text.ts';
import type { Capability, CustomTool, Product } from './types.ts';

/** 직접 쓴 도구는 모두 5개까지 */
export const CUSTOM_TOOLS_MAX = 5;
/** 직접 쓴 글(질문의 내 말, 도구 이름)의 길이: 한 줄로 정리한 뒤 코드 포인트 수 */
export const NOTE_MAX = 40;
/** 마지막 한 줄(freeText)의 길이 */
export const LINE_MAX = 80;

/**
 * 직접 쓴 도구가 맡을 수 있는 기능: 칸이 쓰는 기능만. 중간 서버(proxy)는 칸이 없어 화면에서 생기지 않고,
 * 조작한 링크로 들어와도 받지 않는다 (확인하지 않은 도구가 '키를 숨긴다'고 단정하면 키 노출 막힌 곳이 사라진다)
 */
const CUSTOM_CAPABILITIES: readonly Capability[] = ['screen', 'store', 'auth', 'data', 'host', 'notify'];

export function isCustomId(id: string): boolean {
  return /^custom-[1-5]$/.test(id);
}

export function isCustomCapability(x: unknown): x is Capability {
  return typeof x === 'string' && (CUSTOM_CAPABILITIES as readonly string[]).includes(x);
}

/**
 * 직접 쓴 도구 하나를 엔진의 상품 모양으로. 화면에 쓰지 않는 자리값(access·cost.free·keyExposureRisk 등)은
 * 규칙 조건에서 읽지 않는다(productField가 값 없음을 돌려준다). 비용·제공·자격은 설계도·영수증이 '확인 필요'로 쓴다.
 */
export function customProduct(cat: Catalog, tool: CustomTool): Product {
  const t = cat.data.templates.customTool;
  return {
    id: tool.id,
    name: tool.name || t.hiddenName,
    custom: true,
    layer: 'index',
    summary: t.summary,
    capabilities: [tool.capability],
    provider: { type: 'generic', name: t.provider },
    access: 'none',
    cost: { free: false, note: t.cost },
    serverRegion: 'unknown',
    // 준비물: 가입·키가 필요한지 모르므로 '걸리는 시간 모름'으로 한 줄 (설계도 8번이 '없다'고 단정하지 않게)
    prep: [{ label: fill(t.prep, { name: tool.name || t.hiddenName }), lead: 'unknown' }],
    difficulty: cat.data.scoring.unknownDifficulty,
    keyExposureRisk: false,
    recommendable: false,
    links: [],
    checkedAt: '',
    needsReview: true,
  };
}

/**
 * 이름 없이 받은 직접 쓴 도구(영수증 링크로 열어 이름 자리가 hiddenName '직접 쓴 도구')인가.
 * 그때는 '(직접 씀)'·': 이름' 꼬리를 붙이지 않는다 ('직접 쓴 도구 (직접 씀)'처럼 같은 말이 겹치지 않게)
 */
export function nameHidden(cat: Catalog, p: Product): boolean {
  return p.custom === true && p.name === cat.data.templates.customTool.hiddenName;
}

/** 결과의 도구 하나: 장바구니(직접 쓴 도구 포함) → 세션의 직접 쓴 도구 → 카탈로그 */
export function productOf(cat: Catalog, r: EngineResult, id: string): Product | undefined {
  const tool = r.session.customTools?.find((t) => t.id === id);
  return r.cart.find((p) => p.id === id) ?? (tool ? customProduct(cat, tool) : cat.product.get(id));
}

const obj = (x: unknown): Record<string, unknown> | null => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : null);

/** 받은 직접 쓴 도구를 믿지 않는다: 모양·id·기능이 맞는 것만, 같은 id·같은 이름(띄어쓰기·대소문자 무시)은 앞의 것 하나, 5개까지 */
export function normalizeCustomTools(raw: unknown): CustomTool[] {
  const out: CustomTool[] = [];
  const names = new Set<string>();
  for (const item of Array.isArray(raw) ? raw : []) {
    const o = obj(item);
    const id = o?.['id'];
    const capability = o?.['capability'];
    const rawName = o?.['name'];
    if (typeof id !== 'string' || !isCustomId(id) || !isCustomCapability(capability) || typeof rawName !== 'string') continue;
    const name = oneLine(rawName, NOTE_MAX);
    const key = name.toLowerCase().replace(/\s+/g, '');
    if (out.some((t) => t.id === id) || (key && names.has(key))) continue;
    if (key) names.add(key);
    out.push({ id, name, capability });
    if (out.length === CUSTOM_TOOLS_MAX) break;
  }
  return out;
}

/** 내 말: 있는 질문 id만, 한 줄로 40자까지, 빈 글과 글이 아닌 값은 버린다 */
export function normalizeNotes(cat: Catalog, raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [qid, v] of Object.entries(obj(raw) ?? {})) {
    if (typeof v !== 'string' || !cat.question.has(qid)) continue;
    const text = oneLine(v, NOTE_MAX);
    if (text) out[qid] = text;
  }
  return out;
}

/** 빈틈: 조사 카드 research.gap-<id>가 있는 id만 (엔진은 낱말표를 읽지 않는다), 겹치지 않게 */
export function normalizeGaps(cat: Catalog, raw: unknown): string[] {
  const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  return [...new Set(ids)].filter((id) => cat.card.has(`research.gap-${id}`));
}
