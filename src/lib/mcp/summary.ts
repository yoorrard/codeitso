// AI 에이전트용 진열대 요약 (D154·D156). 진열대 빌드가 만들고 MCP 서버(worker/mcp.ts)가 읽는다.
// /catalog/agent.json: 대분류·소분류 이름과 개수, AI 모델 제공자 이름표 (거의 모든 도구가 읽으니 작게 둔다)
// /catalog/agent-kits.json: 스타터 키트(재료 짧은 줄과 구현안), codeitso_get_kits만 읽는다
// 상품 원본은 담지 않는다(상세는 상세 조각 파일). 순수 함수 (빌드와 시험이 같이 쓴다). 상품 사실은 카드에 있던 그대로만 옮긴다.
import type { ModelsSummary } from '../catalog/models.ts';
import type { Card, CategoryId, CategoryMeta, KitData } from '../catalog/types.ts';

/** 요약 파일 판 번호: 모양을 바꾸면 올린다 (MCP 서버가 모르는 판이면 오류로 알린다). 2 = 키트를 따로 뺀 판 (D156) */
export const AGENT_SUMMARY_VERSION = 2;
export const AGENT_KITS_VERSION = 1;
/** 키트 재료 한 줄 설명의 글자 수 */
export const AGENT_LINE_MAX = 160;

/** 재료 짧은 줄 (키트 안) */
export interface AgentCard {
  id: string;
  name: string;
  cat: CategoryId;
  sub: string;
  summary: string;
  license?: string;
}

export interface AgentSub {
  id: string;
  name: string;
  count: number;
  desc?: string;
  /** 인기 지표가 있는 상품이 있나 (없으면 인기순 = 출처 차례, D152) */
  measured: boolean;
  /** 갱신일이 있는 상품이 있나 (없으면 최근 갱신순이 없다) */
  dated: boolean;
}

export interface AgentCategory {
  id: CategoryId;
  name: string;
  total: number;
  fetched: string;
  subs: AgentSub[];
}

export interface AgentKit {
  id: string;
  theme: string;
  name: string;
  desc: string;
  outline: string[];
  items: AgentCard[];
}

/** AI 모델 자료가 있는 제공자 (models.dev, D141) */
export interface AgentProvider {
  id: string;
  name: string;
  /** 자기 모델을 직접 여는 회사 (아니면 호스팅·라우터) */
  direct: boolean;
  /** 지원이 끝나지 않은 모델 수 */
  live: number;
}

export interface AgentSummary {
  v: typeof AGENT_SUMMARY_VERSION;
  total: number;
  /** 가장 최근에 자료를 받은 날 YYYY-MM-DD */
  fetched: string;
  categories: AgentCategory[];
  /** 스타터 키트 수 (키트 자체는 agent-kits.json) */
  kits: number;
  /** AI 모델 제공자 (모델 자료가 없으면 빈 목록) */
  models: { fetched: string; providers: AgentProvider[] };
}

export interface AgentKits {
  v: typeof AGENT_KITS_VERSION;
  kits: AgentKit[];
}

/** 글자 수(코드 포인트)로 자르고 끝에 …를 붙인다 */
export function clip(s: string, max: number): string {
  const chars = [...s.replace(/\s+/g, ' ').trim()];
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

export function agentCard(c: Card): AgentCard {
  const out: AgentCard = { id: c.id, name: c.name, cat: c.cat, sub: c.sub, summary: clip(c.summary, AGENT_LINE_MAX) };
  if (c.license) out.license = c.license;
  return out;
}

export function buildAgentSummary(input: {
  total: number;
  categories: readonly CategoryMeta[];
  kits: number;
  models?: ModelsSummary;
}): AgentSummary {
  const categories: AgentCategory[] = input.categories.map((c) => ({
    id: c.id,
    name: c.nameKo,
    total: c.total,
    fetched: c.fetchedAt,
    subs: c.subcategories.map((s) => {
      const sub: AgentSub = { id: s.id, name: s.nameKo, count: s.count, measured: s.measured, dated: s.dated };
      if (s.descKo) sub.desc = s.descKo;
      return sub;
    }),
  }));
  return {
    v: AGENT_SUMMARY_VERSION,
    total: input.total,
    fetched: input.categories.reduce((d, c) => (c.fetchedAt > d ? c.fetchedAt : d), ''),
    categories,
    kits: input.kits,
    models: {
      fetched: input.models?.fetched ?? '',
      providers: (input.models?.providers ?? []).map((p) => ({ id: p.id, name: p.name, direct: p.direct, live: p.live })),
    },
  };
}

export function buildAgentKits(kits: readonly KitData[]): AgentKits {
  return { v: AGENT_KITS_VERSION, kits: kits.map((k) => ({ id: k.id, theme: k.theme, name: k.name, desc: k.desc, outline: [...k.outline], items: k.cards.map(agentCard) })) };
}

/** 서버가 받은 요약이 이 모양인지 (판이 다르거나 깨졌으면 null) */
export function readAgentSummary(raw: unknown): AgentSummary | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Partial<AgentSummary>;
  if (o.v !== AGENT_SUMMARY_VERSION || !Array.isArray(o.categories) || typeof o.kits !== 'number' || typeof o.total !== 'number') return null;
  if (typeof o.models !== 'object' || o.models === null || !Array.isArray(o.models.providers)) return null;
  return o as AgentSummary;
}

export function readAgentKits(raw: unknown): AgentKits | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Partial<AgentKits>;
  return o.v === AGENT_KITS_VERSION && Array.isArray(o.kits) ? (o as AgentKits) : null;
}
