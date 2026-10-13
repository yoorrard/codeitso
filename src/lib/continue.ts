// 홈 '이어서 가기'의 갈 곳과 둘째 줄 (brief 6.3, D70): '2/4 · 도구 고르기', 만들 앱을 정하는 중이면 '1/4 · 만들 앱 정하기 · 3번째 질문'.
// 갈 곳은 continueTarget()이 정한다. 자료 전체(엔진·카탈로그)를 불러오므로 홈은 저장된 진행이 있을 때만 이 모듈을 늦게 불러온다
// (처음 온 사람의 첫 화면 JS에 넣지 않는다. 다시 온 사람은 단계 화면에서 같은 묶음을 이미 받아 두었다).
import { ko } from '../copy/ko.ts';
import { catalog } from './data.ts';
import { evaluate, fill } from './engine/index.ts';
import type { Session } from './engine/types.ts';
import { continueTarget, stageById, stageNumber } from './stages.ts';

export interface ContinueInfo {
  path: string;
  /** 주 버튼 둘째 줄 */
  where: string;
}

export function continueInfo(s: Partial<Session>): ContinueInfo {
  const t = continueTarget(evaluate(catalog, s));
  const stage = ko.stages[t.stage];
  const where =
    t.stage === 'destination' && t.questionNumber
      ? fill(ko.home.continueInterview, { stage, n: t.questionNumber })
      : fill(ko.home.continueAt, { stage, n: stageNumber(t.stage) ?? 1 });
  return { path: stageById(t.stage).path, where };
}
