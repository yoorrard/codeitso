// 막힘 감사 (D101): 미리 짠 코스 다섯 + 무작위 답 300개마다, 칸별로 고를 수 있는 도구를 하나씩 바꿔 끼워
// evaluate()를 돌리고 '그대로 가기' 없이는 끝까지 갈 수 없는 조합(canIssue false)을 센다. 읽기만 한다.
//   node scripts/audit-blocks.ts            요약 (막은 규칙별 조합 수, 규칙·도구별 묶음)
//   node scripts/audit-blocks.ts --list     막힌 조합을 모두 한 줄씩
//   node scripts/audit-blocks.ts --seed 7   무작위 답의 씨앗 (기본 1)
import { evaluate, makeCatalog, runInterview } from '../src/lib/engine/index.ts';
import type { Catalog, CustomTool, EngineResult, Session } from '../src/lib/engine/index.ts';
import { loadData } from './lib/load-data.ts';

const args = process.argv.slice(2);
const LIST = args.includes('--list');
const seedAt = args.indexOf('--seed');
const SEED = seedAt >= 0 ? Number(args[seedAt + 1]) : 1;
const RANDOM_SETS = 300;

const cat = makeCatalog(loadData());

/** 씨앗이 같으면 같은 답 (mulberry32) */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 보이는 질문마다 보기 하나를 고른다 (모르겠어요·직접 쓰기 보기도 고를 수 있다) */
function randomAnswers(c: Catalog, next: () => number): Record<string, string> {
  const answers: Record<string, string> = {};
  for (;;) {
    const q = runInterview(c, answers).next;
    if (!q) return answers;
    const opt = q.options[Math.floor(next() * q.options.length)];
    if (!opt) return answers;
    answers[q.id] = opt.id;
  }
}

/**
 * 칸 순서대로, 빈 필수 칸은 추천(없으면 진열 첫 상품)으로 채운다. 선택 칸은 비워 둔다.
 * 고를 도구가 하나도 없는 칸(예: 직접 쓴 분야의 외부 데이터)은 이용자가 하듯 이름 없는 직접 쓴 도구로 채운다
 */
function baseSession(answers: Record<string, string>): Partial<Session> {
  const cart: string[] = [];
  const customTools: CustomTool[] = [];
  const tried = new Set<string>();
  for (;;) {
    const r = evaluate(cat, { answers, cart, customTools });
    const open = r.slots.find((s) => s.slot.required && s.filledBy.length === 0 && !s.builder && !tried.has(s.slot.id));
    if (!open) return { answers, cart, customTools };
    tried.add(open.slot.id);
    const pick = open.recommended?.product.id ?? open.shelf[0]?.product.id ?? open.index[0]?.product.id;
    if (pick) {
      if (!cart.includes(pick)) cart.push(pick);
      continue;
    }
    const id = `custom-${customTools.length + 1}`;
    customTools.push({ id, name: '', capability: open.slot.capability });
    cart.push(id);
  }
}

/** 이 칸을 맡던 도구를 빼고(다른 칸을 혼자 맡으면 남긴다) 후보를 넣는다: 도구 고르기에서 바꿀 때와 같다 */
function swapIn(r: EngineResult, slotId: string, pick: string | null): string[] {
  const ranking = r.slots.find((s) => s.slot.id === slotId);
  if (!ranking) return r.session.cart;
  const others = r.slots.filter((s) => s.slot.id !== slotId);
  let cart = [...r.session.cart];
  for (const old of r.session.cart.filter((id) => ranking.filledBy.includes(id))) {
    const p = cat.product.get(old);
    const rest = cart.filter((id) => id !== old);
    const alone = others.some(
      (s) => p?.capabilities.includes(s.slot.capability) && !rest.some((x) => cat.product.get(x)?.capabilities.includes(s.slot.capability)),
    );
    if (!alone) cart = rest;
  }
  return pick && !cart.includes(pick) ? [...cart, pick] : cart;
}

interface Row {
  source: string;
  answers: Record<string, string>;
  cart: string[];
  blockers: string[];
}

const seen = new Set<string>();
const rows: Row[] = [];
let total = 0;

function run(source: string, s: Partial<Session>): void {
  const key = JSON.stringify([s.answers, [...(s.cart ?? [])].sort(), s.deferred ?? []]);
  if (seen.has(key)) return;
  seen.add(key);
  const r = evaluate(cat, { ...s, kept: [] });
  if (!r.done) return;
  total += 1;
  if (r.canIssue) return;
  rows.push({ source, answers: r.session.answers, cart: r.session.cart, blockers: r.conflicts.filter((c) => !c.kept).map((c) => c.id) });
}

function sweep(source: string, start: Partial<Session>): void {
  const base = evaluate(cat, start);
  const at = (cart: string[], deferred: string[] = []): Partial<Session> => ({ ...start, cart, deferred });
  run(source, at(base.session.cart));
  for (const ranking of base.slots) {
    const ids = [...ranking.shelf, ...ranking.index].map((x) => x.product.id);
    for (const id of ids) run(source, at(swapIn(base, ranking.slot.id, id)));
    // 선택 칸은 비워 둘 수 있고, 미룰 수 있는 칸은 비우고 '나중에 붙일 것'으로 미룰 수 있다
    if (!ranking.slot.required) run(source, at(swapIn(base, ranking.slot.id, null)));
    else if (ranking.slot.deferrable) run(source, at(swapIn(base, ranking.slot.id, null), [ranking.slot.id]));
  }
}

for (const recipe of cat.data.recipes.recipes) {
  sweep(`course:${recipe.id}`, { answers: recipe.answers, cart: recipe.cart });
  sweep(`course:${recipe.id}`, baseSession(recipe.answers));
}
const next = rng(SEED);
for (let i = 0; i < RANDOM_SETS; i += 1) {
  const answers = randomAnswers(cat, next);
  sweep(`random:${i + 1}`, baseSession(answers));
}

const byRule = new Map<string, number>();
const byRuleTool = new Map<string, number>();
for (const row of rows) {
  for (const b of row.blockers) {
    byRule.set(b, (byRule.get(b) ?? 0) + 1);
    for (const id of row.cart) byRuleTool.set(`${b} · ${id}`, (byRuleTool.get(`${b} · ${id}`) ?? 0) + 1);
  }
}
const sortDesc = (m: Map<string, number>): [string, number][] => [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));

console.log(`조합 ${total}개 중 막힌 조합 ${rows.length}개 (씨앗 ${SEED}, 무작위 답 ${RANDOM_SETS}개 + 미리 짠 코스 ${cat.data.recipes.recipes.length}개)`);
const courses = rows.filter((r) => r.source.startsWith('course:'));
console.log(`  그중 미리 짠 코스: ${courses.length}개`);
console.log('\n막은 것별 조합 수');
for (const [id, n] of sortDesc(byRule)) console.log(`  ${String(n).padStart(6)}  ${id}`);
console.log('\n막은 것 · 장바구니 도구별 (상위 40)');
for (const [k, n] of sortDesc(byRuleTool).slice(0, 40)) console.log(`  ${String(n).padStart(6)}  ${k}`);
if (LIST) {
  console.log('\n막힌 조합');
  for (const r of rows) console.log(`${r.source}\t${r.blockers.join(',')}\t${r.cart.join('+')}\t${JSON.stringify(r.answers)}`);
}
