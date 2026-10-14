// 코드쇼퍼 엔진: 만들 앱 정하기 → 도구 고르기 → 도구끼리 맞춰 보기 → 설계도 받기를 데이터와 규칙만으로 계산한다.
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
export { customToolConflictId, emptySlotId } from './recheck.ts';
// 직접 쓴 답과 도구 (D74). 낱말 찾기(match.ts)는 여기서 내보내지 않는다: 화면이 직접 쓰기를 열 때 import()로 늦게 받는다
// 디자인 정하기(T38): 세션·링크 모양 고르기(look-choice.ts)만 evaluate·extras가 쓴다. 값 정하기(look.ts)·6번 그리기(look-render.ts)는
// 여기서 내보내지 않는다: 디자인 묶음(src/lib/look-data.ts·look-render-data.ts)이 import()로 늦게 받는다
export type { LookRow } from './look-choice.ts';
export { LOOK_CUSTOM, LOOK_ROW_FIELDS, LOOK_TEXT_MAX, lookPickedRows, lookTypeKeys, moodOrder } from './look-choice.ts';
export { CUSTOM_TOOLS_MAX, LINE_MAX, NOTE_MAX, customProduct, isCustomId, productOf } from './custom.ts';
// 웹에서 만드는 도구의 공개 (B-02): 공개 칸을 채우는 가짜 상품 '빌더의 게시 기능'
export { BUILDER_PUBLISH_ID, builderHosts, costUnchecked } from './builder.ts';
export type { ResearchItem, Step, StuckNote, Study } from './checkout.ts';
export { PROXY_STEP } from './checkout.ts';
export type { EngineResult } from './evaluate.ts';
export { customToolClears, evaluate, normalizeSession } from './evaluate.ts';
export type { ReceiptItem, ReceiptModel } from './receipt.ts';
export { difficultyWord, projectName, receiptModel, renderReceiptText, toolDifficultyWord } from './receipt.ts';
export type { PackOptions } from './pack.ts';
export { packFileName, renderPack } from './pack.ts';
export { conversationCards } from './cards.ts';
export type { ShareState } from './extras.ts';
export { badges, checkQuiz, fromShareState, matchErrors, prepWait, toShareState } from './extras.ts';
export type { TimeFormat } from './text.ts';
export { displayWidth, fill, formatMinutes, oneLine } from './text.ts';
export type * from './types.ts';
