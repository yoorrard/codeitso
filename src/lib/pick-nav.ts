// 도구 고르기의 화면 상태 (brief 6.6, D70): 지금 여는 칸, '고를 예정'으로 눌린 줄, 아래 막대 주 버튼이 할 일.
// 도구 섬(Shop)과 아래 막대 섬(WaypointsAction)이 따로 붙지만 같은 모듈을 나눠 쓰므로 이 atom들로 이어진다.
// '고를 예정'은 저장하지 않는 화면 상태다(엔진은 그대로). 저장은 [{도구}로 정하기]를 누를 때 장바구니(cart)에만 한다.
// 추천·점수·칸 계산은 엔진(evaluate)이 하고, 여기서는 그 결과를 읽어 어느 줄을 누른 채로 보일지와 장바구니를 어떻게 고칠지만 정한다.
import { atom } from 'nanostores';
import { ko } from '../copy/ko.ts';
import type { EngineResult, SlotRanking } from './engine/index.ts';
import { fill } from './engine/index.ts';
import type { Product } from './engine/types.ts';
import { josa } from './josa.ts';
import { requiredLeftSlots } from './progress.ts';

/** 지금 여는 칸 id. null이면 섬이 붙을 때 정한다 (initialSlot) */
export const $openSlot = atom<string | null>(null);

/** 칸마다 손님이 누른 줄(상품 id). 없으면 정한 도구, 그것도 없으면 꼭 고를 것의 추천이 눌린 채로 보인다 */
export const $pending = atom<Record<string, string>>({});

/** 칸 하나의 '고를 예정'을 거둔다 (정하거나 건너뛸 때, 정한 도구를 다시 누를 때) */
export function clearPending(slotId: string): void {
  const next = { ...$pending.get() };
  delete next[slotId];
  $pending.set(next);
}

/** 주 버튼·건너뛰기로 칸을 옮긴 횟수. 바뀌면 도구 섬이 새 칸의 칩을 화면 안으로 굴린다 (칩을 눌러 옮길 때는 굴리지 않는다) */
export const $slotMoves = atom(0);

/** [{도구}로 정하기]에 이름을 그대로 넣는 최대 글자 수 (brief 2.1). 넘으면 '고른 도구로 정하기' */
export const NAME_MAX = 14;

export function rankingOf(r: EngineResult, slotId: string | null): SlotRanking | undefined {
  return slotId === null ? undefined : r.slots.find((s) => s.slot.id === slotId);
}

/** 이 칸의 줄로 보이는 상품 전부 (도구 + 원문만 있는 도구) */
function rowsOf(ranking: SlotRanking): Product[] {
  return [...ranking.shelf, ...ranking.index].map((s) => s.product);
}

/**
 * 이 칸에 정한 도구: 이 칸을 채운 장바구니 상품 중 가장 나중에 담은 것.
 * 한 상품이 여러 칸을 맡으면(배포·공유 + 중간 서버) 다른 칸에서 고른 것이 이 칸에도 정한 도구로 보인다
 */
export function savedFor(r: EngineResult, ranking: SlotRanking): string | null {
  const cart = r.session.cart;
  let best: string | null = null;
  for (const id of ranking.filledBy) if (best === null || cart.indexOf(id) > cart.indexOf(best)) best = id;
  return best;
}

/** 눌린 채로 보이는 줄: 손님이 누른 줄 → 정한 도구 → (꼭 고를 것만) 추천. 있으면 좋은 것은 미리 누르지 않는다 (brief 6.6, game 3.7) */
export function pressedFor(r: EngineResult, ranking: SlotRanking, pending: Record<string, string>): string | null {
  const mine = pending[ranking.slot.id];
  if (mine !== undefined && rowsOf(ranking).some((p) => p.id === mine)) return mine;
  const saved = savedFor(r, ranking);
  if (saved !== null) return saved;
  return ranking.slot.required ? (ranking.recommended?.product.id ?? null) : null;
}

/** 지금 고를 수 있는 꼭 고를 것 (칸 순서): 아직 안 골랐고, 미루거나 그대로 두지 않았고, 맞는 도구가 있는 것. 상태 한 줄의 'n개만 더'와 같은 수 */
export function pickableSlots(r: EngineResult): SlotRanking[] {
  return requiredLeftSlots(r).filter((s) => s.shelf.length > 0);
}

/** 다음에 열 칸: from 다음 칸부터 (끝에서 처음으로 돌아) 고를 수 있는 꼭 고를 것. from 자신은 빼고, 없으면 null */
export function nextOpenSlot(r: EngineResult, from: string | null = null): string | null {
  const open = pickableSlots(r).filter((s) => s.slot.id !== from);
  if (open.length === 0) return null;
  const at = from === null ? -1 : r.slots.findIndex((s) => s.slot.id === from);
  const after = open.find((s) => r.slots.indexOf(s) > at);
  return (after ?? open[0])?.slot.id ?? null;
}

/** 처음 열 칸: 주소의 ?slot=(도구끼리 맞춰 보기의 '도구 바꾸기') → 고를 수 있는 첫 꼭 고를 것 → 첫 칸 */
export function initialSlot(r: EngineResult, asked: string | null): string | null {
  if (asked !== null && rankingOf(r, asked)) return asked;
  return nextOpenSlot(r) ?? r.slots[0]?.slot.id ?? null;
}

/** 상품 p를 빼면 slotId 말고 다른 열린 칸이 비는가 (그 칸을 p 혼자 맡고 있으면 뺄 수 없다) */
function emptiesOther(r: EngineResult, cart: Product[], p: Product, slotId: string): boolean {
  const rest = cart.filter((x) => x.id !== p.id);
  return r.slots.some((s) => s.slot.id !== slotId && p.capabilities.includes(s.slot.capability) && !rest.some((x) => x.capabilities.includes(s.slot.capability)));
}

/**
 * 칸 slotId에 상품 productId를 정한 뒤의 장바구니 (상품 id 순서 그대로).
 * 이 칸을 맡던 다른 상품은 뺀다. 다만 그 상품이 다른 칸도 혼자 맡고 있으면 남긴다 (다른 칸이 몰래 비지 않게)
 */
export function cartAfterPick(r: EngineResult, slotId: string, productId: string): string[] {
  const ranking = rankingOf(r, slotId);
  const picked = ranking ? rowsOf(ranking).find((p) => p.id === productId) : undefined;
  if (!ranking || !picked) return r.session.cart;
  let cart: Product[] = r.cart.some((p) => p.id === productId) ? [...r.cart] : [...r.cart, picked];
  for (const id of ranking.filledBy) {
    const old = cart.find((p) => p.id === id);
    if (old && old.id !== productId && !emptiesOther(r, cart, old, slotId)) cart = cart.filter((p) => p.id !== old.id);
  }
  return cart.map((p) => p.id);
}

/** 있으면 좋은 것에서 뺄 수 있는 정한 도구 (다른 칸을 혼자 맡고 있지 않을 때만). 꼭 고를 것은 빼지 않고 바꾼다 */
export function removableFor(r: EngineResult, ranking: SlotRanking): string | null {
  if (ranking.slot.required) return null;
  const saved = savedFor(r, ranking);
  const p = saved === null ? undefined : r.cart.find((x) => x.id === saved);
  return p && !emptiesOther(r, r.cart, p, ranking.slot.id) ? p.id : null;
}

/**
 * 버튼에 넣는 이름: 괄호 안을 뺀다 ('Cloud Firestore (Firebase)' → 'Cloud Firestore'). 14자를 넘으면 null (brief 2.1).
 * 글자 수는 빈칸을 빼고 센다: 설계서의 본보기 'Cloud Firestore'(빈칸 빼고 14자)가 이름 그대로 들어가게
 */
export function shortName(name: string): string | null {
  const short = plainName(name);
  return [...short.replace(/\s/g, '')].length > NAME_MAX ? null : short;
}

/** 괄호 안을 뺀 이름 (알림 문장에 쓴다) */
export function plainName(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, '').trim() || name;
}

/** 칸 제목 '로그인을 맡을 도구' (칸 머리 H2, 다음 칸 알림) */
export function slotTitle(label: string): string {
  return fill(ko.shop.slotTitle, { obj: josa(label, 'obj') });
}

/**
 * 아래 막대가 할 일 (brief 6.6):
 *  locked = 만들 앱을 정하기 전 [만들 앱 정하러 가기] · save = [{도구}로 정하기/바꾸기] · go = [도구끼리 맞춰 보러 가기]
 *  wait = 눌린 줄이 없어 주 버튼이 꺼짐 (옆에 [이번엔 건너뛰기])
 * 덧붙이는 글 버튼: skip(이번엔 건너뛰기) · remove(있으면 좋은 것의 정한 도구 빼기)
 */
export type BarState =
  | { kind: 'locked' }
  | { kind: 'go'; extra: 'remove' | null }
  | { kind: 'wait'; extra: 'skip' | null }
  | { kind: 'save'; product: Product; change: boolean; extra: 'remove' | null };

export function barState(r: EngineResult, openSlot: string | null, pending: Record<string, string>): BarState {
  if (!r.done) return { kind: 'locked' };
  const ranking = rankingOf(r, openSlot);
  const left = pickableSlots(r).length;
  if (!ranking) return left === 0 ? { kind: 'go', extra: null } : { kind: 'wait', extra: 'skip' };
  const pressed = pressedFor(r, ranking, pending);
  const saved = savedFor(r, ranking);
  const product = pressed === null ? undefined : rowsOf(ranking).find((p) => p.id === pressed);
  const extra = pressed !== null && pressed === saved && removableFor(r, ranking) !== null ? 'remove' : null;
  // 바꾸려고 누른 줄이 있으면 늘 그것을 정하는 버튼
  if (product && pressed !== saved) return { kind: 'save', product, change: saved !== null, extra: null };
  if (left === 0) return { kind: 'go', extra };
  // 이미 정한 칸: 그대로 정하고 다음 고를 것으로 (추천대로 가면 칸마다 한 번)
  if (product) return { kind: 'save', product, change: false, extra };
  // 건너뛸 다른 칸이 없으면(이 칸이 마지막 고를 것) 건너뛰기도 없다
  return { kind: 'wait', extra: nextOpenSlot(r, ranking.slot.id) === null ? null : 'skip' };
}
