// 아래 막대 위 줄 (D64): 상태 한 줄 '도구 고르기 · 1개만 더 고르면 돼요 · 약 1분'. 미니 길은 없앴다 (지도와 이 줄이 같은 일을 한다).
// 만들 앱 정하기에서는 질문 섬과 같은 자리($questionPick)를 읽어, [이전]으로 돌아가 보는 질문이 'n번째 질문'이 된다.
// 지도가 스크롤 밖으로 나가도 진행이 여기서 보인다. 계산은 status-line.ts가 evaluate() 결과로 한다.
// 빌드 때 글은 처음 온 사람 기준이라, 다시 온 손님에게는 붙어서 data-ready가 달릴 때까지 글을 감춘다 (frame.css).
// 설계도 받기에서 영수증 링크로 연 영수증을 볼 때는 내 진행 대신 그 사실을 쓴다 ($arrivalView, D70).
// id(STATUS_LINE_ID)는 꺼진 주 버튼이 aria-describedby로 가리킨다: 꺼진 까닭은 이 줄이 맡는다 (brief 6.7).
// 도구 고르기에서 숫자가 바뀌면 숫자만 굴린다(S3, --dur-roll, 마디가 채워지는 동안 겹쳐서): 옛 숫자는 위로 빠지고 새 숫자가 아래에서 올라온다.
import { useStore } from '@nanostores/preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { catalog } from '../lib/data.ts';
import { evaluate } from '../lib/engine/index.ts';
import { $arrivalView } from '../lib/arrival-view.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $questionPick, questionAt } from '../lib/interview-nav.ts';
import { $result } from '../lib/result.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import type { StageId } from '../lib/stages.ts';
import { STATUS_LINE_ID, statusLine } from '../lib/status-line.ts';
import { $meta } from '../lib/store.ts';
import { dur } from '../lib/motion.ts';
import { numberParts, rollNumbers } from '../lib/roll.ts';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);

export default function StatusLine({ stage }: { stage: StageId }) {
  const ready = useHydrated();
  const live = useStore($result);
  const meta = useStore($meta);
  const picked = useStore($questionPick);
  const view = useStore($arrivalView);
  const r = ready ? live : FIRST_VISIT;
  const m = ready ? meta : {};
  // 만들 앱 정하기: [이전]으로 돌아가 보는 질문이 'n번째 질문'이 된다 (brief 6.5)
  const at = stage === 'destination' ? questionAt(r, ready ? picked : null) : undefined;
  const text = statusLine(stage, r, m, at, stage === 'arrival' ? view.kind : undefined);
  const box = useRef<HTMLSpanElement>(null);
  const shown = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!ready) return;
    const before = shown.current;
    shown.current = text;
    if (stage === 'waypoints' && before !== null && before !== text && box.current) rollNumbers(box.current, before, text, dur('--dur-pop'));
  }, [ready, text]);
  return (
    <p class="status-line" id={STATUS_LINE_ID} data-ready={ready ? '' : undefined}>
      <span class="status-text" ref={box}>
        {numberParts(text).map((x) => (/^\d/.test(x) ? <span class="sl-n"><span>{x}</span></span> : x))}
      </span>
    </p>
  );
}
