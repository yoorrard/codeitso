// 골든 사례 비교. 부작용이 없어서 Vitest(T03)에서 그대로 import해 쓸 수 있다.
import type { EngineResult } from '../../src/lib/engine/index.ts';
import type { CustomTool, Session } from '../../src/lib/engine/types.ts';

export interface GoldenSlot {
  id: string;
  required: boolean;
  recommended: string | null;
  score?: number;
  runnerUp?: string | null;
  reasons?: string[];
  filledBy: string[];
}

export interface GoldenExpect {
  asked: string[];
  tags?: Record<string, number>;
  slots: GoldenSlot[];
  conflicts: string[];
  canIssue: boolean;
  research: string[];
  safety: string[];
  study: { required: string[]; all: string[] };
  steps?: string[];
  prep?: string[];
  /** 켜진 막힘 규칙 id (상품 메모 제외). 적은 사례만 비교한다 */
  stuckRules?: string[];
  difficulty: number;
  difficultyFirst?: number;
  minutes?: number;
  split: { needed: boolean; defer: string[]; easier?: { slotId: string; from: string; to: string }[] };
}

export interface Golden {
  id: string;
  title: string;
  note?: string;
  answers: Record<string, string>;
  cart: string[];
  kept?: string[];
  deferred?: string[];
  /** 직접 쓴 것 (D74, input.md 11.2절): 질문 id → 내 말, 목록에 없는 도구, 빈틈 id */
  notes?: Record<string, string>;
  customTools?: CustomTool[];
  gaps?: string[];
  expect: GoldenExpect;
}

export function goldenSession(g: Golden): Partial<Session> {
  const s: Partial<Session> = { answers: g.answers, cart: g.cart, kept: g.kept ?? [], deferred: g.deferred ?? [] };
  if (g.notes) s.notes = g.notes;
  if (g.customTools) s.customTools = g.customTools;
  if (g.gaps) s.gaps = g.gaps;
  return s;
}

/** 엔진 결과를 골든 기대값 모양으로 바꾼다 */
export function actual(r: EngineResult): GoldenExpect {
  return {
    asked: r.interview.visible.map((q) => q.id),
    slots: r.slots.map((s) => {
      const out: GoldenSlot = { id: s.slot.id, required: s.slot.required, recommended: s.recommended?.product.id ?? null, filledBy: s.filledBy };
      if (s.recommended) {
        out.score = s.recommended.score;
        out.runnerUp = s.runnerUp?.product.id ?? null;
        out.reasons = s.recommended.reasons;
      }
      return out;
    }),
    conflicts: r.conflicts.map((c) => c.id),
    canIssue: r.canIssue,
    research: r.research.map((x) => x.id),
    safety: r.safety.ruleIds,
    study: { required: r.study.required, all: r.study.all },
    steps: r.steps.map((s) => s.slotId),
    prep: r.prep.map((p) => p.label),
    stuckRules: r.stuck.filter((s) => s.from.startsWith('stuck.')).map((s) => s.from),
    difficulty: r.split.difficulty,
    difficultyFirst: r.split.difficultyFirst,
    minutes: r.minutes,
    split: { needed: r.split.needed, defer: r.split.defer, easier: r.split.easier },
  };
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** 기대값과 실제 결과의 차이. 빈 배열이면 통과 */
export function compareGolden(r: EngineResult, e: GoldenExpect): string[] {
  const got = actual(r);
  const problems: string[] = [];
  const check = (name: string, want: unknown, have: unknown): void => {
    if (!same(want, have)) problems.push(`${name}\n      기대: ${JSON.stringify(want)}\n      실제: ${JSON.stringify(have)}`);
  };
  if (!r.done) problems.push(`목적지 질문이 끝나지 않음: 다음 질문 ${r.interview.next?.id}`);
  check('물어본 질문', e.asked, got.asked);
  for (const [t, v] of Object.entries(e.tags ?? {})) check(`태그 ${t}`, v, r.interview.tags[t] ?? 0);
  check('칸 목록', e.slots.map((s) => s.id), got.slots.map((s) => s.id));
  for (const want of e.slots) {
    const have = got.slots.find((s) => s.id === want.id);
    if (!have) continue;
    check(`${want.id} 필수`, want.required, have.required);
    check(`${want.id} 추천`, want.recommended, have.recommended);
    if (want.score !== undefined) check(`${want.id} 점수`, want.score, have.score);
    if (want.runnerUp !== undefined) check(`${want.id} 다른 후보(2위)`, want.runnerUp, have.runnerUp);
    if (want.reasons !== undefined) check(`${want.id} 추천 이유`, want.reasons, have.reasons);
    check(`${want.id} 채운 상품`, want.filledBy, have.filledBy);
  }
  check('충돌', e.conflicts, got.conflicts);
  check('출발 가능(canIssue)', e.canIssue, got.canIssue);
  check('알아볼 것', e.research, got.research);
  check('안전 규칙', e.safety, got.safety);
  check('읽어 둘 용어', e.study, got.study);
  if (e.steps) check('진행 순서', e.steps, got.steps);
  if (e.prep) check('준비물', e.prep, got.prep);
  if (e.stuckRules) check('막힘 규칙', e.stuckRules, got.stuckRules);
  check('난이도', e.difficulty, got.difficulty);
  if (e.difficultyFirst !== undefined) check('먼저 만들 것 난이도', e.difficultyFirst, got.difficultyFirst);
  if (e.minutes !== undefined) check('예상 시간(분)', e.minutes, got.minutes);
  check('나누기 제안', e.split.needed, got.split.needed);
  check('미룰 수 있는 칸', e.split.defer, got.split.defer);
  if (e.split.easier) check('더 쉬운 길(상품 바꾸기)', e.split.easier, got.split.easier);
  return problems;
}
