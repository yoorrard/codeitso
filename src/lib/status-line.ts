// 아래 막대 위 줄의 상태 한 줄 (D64, docs/review/v2/brief.md 2.1·2.4): '{단계 이름} · {남은 것} · 약 {m}분'.
// 단계 이름은 단계 줄·<title>과 같다. 시간은 연습(고정 약 10분)과 1·2단계에만 쓰고, 답하거나 고를 때만 다시 센다 (초읽기 없음).
// 저장된 상태와 evaluate() 결과에서 매번 계산한다 (부작용 없음, 시험 있음). 아래 막대의 미니 길은 없앴다 (지도와 이 줄이 같은 일을 한다).
import { ko } from '../copy/ko.ts';
import type { EngineResult } from './engine/index.ts';
import { fill } from './engine/index.ts';
import { progress } from './progress.ts';
import type { ArrivalView } from './arrival-view.ts';
import type { Meta } from './saved.ts';
import type { StageId } from './stages.ts';

/** 상태 한 줄의 id: 꺼진 주 버튼이 aria-describedby로 가리킨다 (까닭은 이 줄이 맡는다, brief 6.7) */
export const STATUS_LINE_ID = 'status-line';

/** 질문 하나에 드는 시간(초). 추정값이다 (D64): 집계의 '영수증 받음(걸린 시간 구간)' 분포를 보고 고친다 */
export const SECONDS_PER_QUESTION = 15;
/** 꼭 고를 것 하나에 드는 시간(초). 추정값이다 (D64) */
export const SECONDS_PER_PICK = 30;
/** 연습은 고정 '약 10분' (문장 세 개를 보내 보기) */
const PRACTICE_SECONDS = 10 * 60;

/** 초를 1분 단위로 올린 분. 0초 이하면 null (시간을 쓰지 않는다) */
export function roundUpMinutes(seconds: number): number | null {
  return seconds > 0 ? Math.ceil(seconds / 60) : null;
}

/**
 * '도구 고르기 · 1개만 더 고르면 돼요 · 약 1분'.
 * questionAt: 만들 앱 정하기에서 지금 보이는 질문 자리(0부터). [이전]으로 돌아가 보는 질문과 'n번째 질문'이 맞게 한다.
 * 없으면 처음 안 답한 질문. 시간은 늘 남은 질문 수로 센다.
 * view: 설계도 받기에서 영수증 링크로 연 남의 영수증('shared')이나 깨진 링크('broken')를 볼 때. 그때는 내 진행 대신 그 사실을 쓴다
 * (아래 막대의 주 버튼이 그 영수증을 내려받거나 처음 화면으로 가므로, 이 줄이 내 진행의 까닭을 말하면 서로 어긋난다).
 */
export function statusLine(
  stage: StageId,
  r: EngineResult,
  meta: Pick<Meta, 'lessonDone' | 'issued'>,
  questionAt?: number,
  view?: ArrivalView['kind'],
): string {
  const S = ko.progress.status;
  const p = progress(r, meta);
  let text: string;
  let seconds = 0;
  switch (stage) {
    case 'test-drive':
      if (meta.lessonDone === true) text = S.testDriveDone;
      else {
        text = S.testDriveTodo;
        seconds = PRACTICE_SECONDS;
      }
      break;
    case 'destination':
      // 남은 질문 수는 보이지 않는다: 조건 질문이 새로 나타나면 늘어나 정직하지 않게 보인다. 'n번째 질문'과 시간만
      if (r.done) text = S.destinationDone;
      else {
        text = fill(S.question, { n: (questionAt ?? r.interview.answered) + 1 });
        seconds = (r.interview.total - r.interview.answered) * SECONDS_PER_QUESTION;
      }
      break;
    case 'waypoints': {
      const pickable = p.requiredLeft - p.requiredNoTool;
      if (!r.done) text = S.locked;
      else if (pickable > 0) {
        text = fill(S.requiredLeft, { n: pickable });
        seconds = pickable * SECONDS_PER_PICK;
      } else if (p.requiredNoTool > 0) text = fill(S.noTool, { n: p.requiredNoTool });
      else text = S.requiredDone;
      break;
    }
    case 'check':
      text = !r.done ? S.locked : p.blocked > 0 ? fill(S.blocked, { n: p.blocked }) : S.clear;
      break;
    case 'arrival':
      if (view === 'shared') text = S.sharedView;
      else if (view === 'broken') text = S.brokenLink;
      else text = !r.done ? S.locked : !r.canIssue ? S.lockedFix : p.stages.arrival ? S.issued : S.arrivalReady;
      break;
  }
  const m = roundUpMinutes(seconds);
  return [ko.stages[stage], text, ...(m === null ? [] : [fill(S.minutes, { m })])].join(' · ');
}
