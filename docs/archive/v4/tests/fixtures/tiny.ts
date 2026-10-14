// 엔진 단위 시험용 작은 가짜 자료 (T04). 규칙 하나하나를 고립해서 보려고, 문장 틀(templates)·분류표·점수표만
// 진짜 자료에서 가져오고 질문·규칙·상품·개념은 시험마다 직접 만든다.
// 진짜 자료 전체가 필요한 시험(문장 그리기 등)은 realData()를 쓴다.
import type { Catalog } from '../../src/lib/engine/index.ts';
import { makeCatalog } from '../../src/lib/engine/index.ts';
import type {
  Concept,
  ConflictRule,
  Data,
  Option,
  Product,
  Question,
  ResearchCard,
  ResearchRule,
  SafetyRule,
  SlotDef,
  SlotRule,
  StuckRule,
} from '../../src/lib/engine/types.ts';
import { loadData } from '../../scripts/lib/load-data.ts';

const REAL: Data = loadData();

/** 진짜 자료 사본 (고쳐도 다른 시험에 번지지 않는다) */
export function realData(): Data {
  return structuredClone(REAL);
}

export function realCatalog(): Catalog {
  return makeCatalog(realData());
}

export interface TinyParts {
  questions?: Question[];
  rules?: Data['rules']['rules'];
  products?: Product[];
  concepts?: Concept[];
  cards?: ResearchCard[];
  recipes?: Data['recipes']['recipes'];
  errors?: Data['errors']['errors'];
  /** 점수표 일부만 바꾸기 */
  scoring?: Partial<Data['scoring']>;
  /** 가중치 일부만 바꾸기 */
  weights?: Partial<Data['scoring']['weights']>;
}

/** 분류표·점수표·문장 틀은 진짜, 나머지는 넘긴 것만 든 자료 */
export function tinyData(parts: TinyParts = {}): Data {
  const d = realData();
  d.questions.questions = parts.questions ?? [];
  d.rules.rules = parts.rules ?? [];
  d.products.products = parts.products ?? [];
  d.concepts.concepts = parts.concepts ?? [];
  d.researchCards.cards = parts.cards ?? [];
  d.recipes.recipes = parts.recipes ?? [];
  d.errors.errors = parts.errors ?? [];
  d.templates.notBuildRules = [];
  if (parts.scoring) Object.assign(d.scoring, parts.scoring);
  if (parts.weights) Object.assign(d.scoring.weights, parts.weights);
  return d;
}

export function tinyCatalog(parts: TinyParts = {}): Catalog {
  return makeCatalog(tinyData(parts));
}

// ── 만들기 도우미 ─────────────────────────────────────────────

export function option(id: string, tags: Record<string, number> = {}, extra: Partial<Option> = {}): Option {
  return { id, label: `보기 ${id}`, tags, ...extra };
}

export function question(id: string, options: Option[], extra: Partial<Question> = {}): Question {
  return { id, text: `질문 ${id}`, picture: false, options, ...extra };
}

/** 기본: 공식·무료·가입 없음·난이도 1·키 노출 없음·추천 가능한 진열 상품 */
export function product(id: string, extra: Partial<Product> = {}): Product {
  return {
    id,
    name: `상품 ${id}`,
    layer: 'shelf',
    summary: `${id} 요약`,
    capabilities: ['screen'],
    provider: { type: 'official', name: `${id} 제공처` },
    access: 'none',
    cost: { free: true, note: '무료' },
    serverRegion: 'none',
    difficulty: 1,
    keyExposureRisk: false,
    recommendable: true,
    links: [{ label: '공식 문서', url: `https://example.com/${id}` }],
    checkedAt: '2026-10',
    needsReview: false,
    ...extra,
  };
}

export function slotRule(id: string, slot: Partial<SlotDef> & Pick<SlotDef, 'id' | 'capability'>, when: SlotRule['when'] = { always: true }): SlotRule {
  return { id, type: 'slot', when, slot: { label: `칸 ${slot.id}`, required: false, order: 10, ...slot } };
}

export function conflictRule(id: string, when: ConflictRule['when'], researchCard = 'card.x'): ConflictRule {
  return { id, type: 'conflict', when, message: `${id} 충돌`, fixHint: `${id} 고치기`, researchCard };
}

export function researchRule(id: string, when: ResearchRule['when'], card = 'card.x'): ResearchRule {
  return { id, type: 'research', when, card };
}

export function safetyRule(id: string, when: SafetyRule['when'], line = `${id} 안전 지시.`): SafetyRule {
  return { id, type: 'safety', when, line };
}

export function stuckRule(id: string, when: StuckRule['when'], extra: Partial<StuckRule> = {}): StuckRule {
  return { id, type: 'stuck', when, text: `${id} 막힘`, ...extra };
}

export function card(id: string, extra: Partial<ResearchCard> = {}): ResearchCard {
  return { id, area: `${id} 영역`, what: `${id} 무엇`, why: `${id} 왜`, where: ['어디'], doneWhen: `${id} 끝`, ...extra };
}

export function concept(id: string, extra: Partial<Concept> = {}): Concept {
  return {
    id,
    title: `개념 ${id}`,
    level: 'must',
    order: 10,
    summary: `${id} 요약`,
    quiz: [{ q: '문제', options: ['가', '나'], answer: 1, explain: '풀이' }],
    askAI: '내가 만들려는 것: {{project}}. 이 개념을 설명해 줘.',
    prerequisites: [],
    ...extra,
  };
}
