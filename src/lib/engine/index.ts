// 코드쇼퍼 엔진: 목적지 → 경유지 → 점검 → 도착을 데이터와 규칙만으로 계산한다.
// 화면 코드는 여기서 내보내는 것만 쓴다. 동작을 바꾸면 docs/ENGINE.md와 data/golden을 같이 고친다.

export type { Catalog } from './catalog.ts';
export { cartProducts, cmp, makeCatalog } from './catalog.ts';
export type { Ctx } from './conditions.ts';
export { evalCondition, matchProduct } from './conditions.ts';
export type { InterviewState } from './interview.ts';
export { answerChips, matchingRecipes, runInterview } from './interview.ts';
export type { Scored, Slot, SlotRanking } from './shop.ts';
export { SCORE_KEYS, buildSlots, rankSlot, scoreProduct, userLevel } from './shop.ts';
export type { Conflict, EasierSwap, Split } from './recheck.ts';
export { emptySlotId } from './recheck.ts';
export type { ResearchItem, Step, StuckNote, Study } from './checkout.ts';
export { PROXY_STEP } from './checkout.ts';
export type { EngineResult } from './evaluate.ts';
export { evaluate, normalizeSession } from './evaluate.ts';
export type { ReceiptItem, ReceiptModel } from './receipt.ts';
export { difficultyWord, projectName, receiptModel, renderReceiptText, toolDifficultyWord } from './receipt.ts';
export type { PackOptions } from './pack.ts';
export { conversationCards, packFileName, renderPack } from './pack.ts';
export type { ShareState } from './extras.ts';
export { badges, checkQuiz, fromShareState, matchErrors, toShareState } from './extras.ts';
export type { TimeFormat } from './text.ts';
export { displayWidth, fill, formatMinutes } from './text.ts';
export type * from './types.ts';
