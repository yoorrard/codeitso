import type { Catalog } from './catalog.ts';
import { isCustomCapability, isCustomId } from './custom.ts';
import type { Capability, CustomTool, ErrorEntry, Product, Session } from './types.ts';

/** 상품 카드의 조건 배지 (추천 표시와 따로, 모든 상품에 붙는다) */
export function badges(cat: Catalog, p: Product): string[] {
  const b = cat.data.templates.badges;
  const out: string[] = [];
  if (p.cost.free) out.push(b.free);
  if (p.difficulty === 1) out.push(b.easy);
  if (p.provider.type === 'official') out.push(b.official);
  if (p.realtime === 'realtime') out.push(b.realtime);
  if (p.realtime === 'frequent') out.push(b.frequent);
  if (!p.recommendable) out.push(b.caution);
  return out;
}

/** 사전: 붙여 넣은 에러 문장에 맞는 안내 (적힌 순서). 없으면 빈 배열 → templates.errorFallback을 보여 준다 */
export function matchErrors(cat: Catalog, text: string): ErrorEntry[] {
  const t = text.trim();
  if (!t) return [];
  return cat.data.errors.errors.filter((e) => e.patterns.some((p) => new RegExp(p, 'i').test(t)));
}

/**
 * 영수증 링크(/arrival#r=…)에 넣는 상태. 직접 쓴 글(한 줄·내 말)과 직접 쓴 도구 이름은 넣지 않는다: 받은 사람의 화면(우리 주소)에
 * 남이 지은 글이 그대로 보이지 않게(brief 7.6). 보기 id 'custom'과 custom-n은 그대로 둔다. 압축(lz-string)은 화면 쪽에서 한다.
 * x·g는 있을 때만 넣고 판 번호는 1 그대로다(옛 화면은 모르는 칸을 버린다).
 */
export interface ShareState {
  v: 1;
  a: Record<string, string>;
  c: string[];
  k: string[];
  d: string[];
  /** 장바구니의 직접 쓴 도구 id → 맡은 기능 (이름 없음) */
  x?: Record<string, Capability>;
  /** 빈틈 id */
  g?: string[];
}

export function toShareState(s: Session): ShareState {
  const out: ShareState = { v: 1, a: s.answers, c: s.cart, k: s.kept, d: s.deferred };
  const tools = (s.customTools ?? []).filter((t) => s.cart.includes(t.id));
  if (tools.length > 0) out.x = Object.fromEntries(tools.map((t) => [t.id, t.capability]));
  if (s.gaps && s.gaps.length > 0) out.g = s.gaps;
  return out;
}

/** 링크에서 받은 값을 믿지 않는다: 모양이 다르면 null, 모르는 id는 normalizeSession이 버린다 */
export function fromShareState(raw: unknown): Partial<Session> | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o['v'] !== 1) return null;
  const strArr = (x: unknown): string[] => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []);
  const answers: Record<string, string> = {};
  const a = o['a'];
  if (typeof a === 'object' && a !== null) {
    for (const [k, v] of Object.entries(a as Record<string, unknown>)) if (typeof v === 'string') answers[k] = v;
  }
  const out: Partial<Session> = { answers, cart: strArr(o['c']), kept: strArr(o['k']), deferred: strArr(o['d']) };
  // 직접 쓴 도구는 이름 없이 만든다 (영수증·설계도는 templates.customTool.hiddenName을 쓴다)
  const x = o['x'];
  const tools: CustomTool[] = [];
  if (typeof x === 'object' && x !== null && !Array.isArray(x)) {
    for (const [id, capability] of Object.entries(x as Record<string, unknown>)) {
      if (isCustomId(id) && isCustomCapability(capability)) tools.push({ id, name: '', capability });
    }
  }
  if (tools.length > 0) out.customTools = tools;
  const gaps = strArr(o['g']);
  if (gaps.length > 0) out.gaps = gaps;
  return out;
}

/** 확인 문제 채점 */
export function checkQuiz(cat: Catalog, conceptId: string, index: number, choice: number): boolean | null {
  const q = cat.concept.get(conceptId)?.quiz[index];
  return q ? q.answer === choice : null;
}
