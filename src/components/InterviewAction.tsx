// 만들 앱 정하기 아래 막대 (brief 6.5·5.6, D70): 왼쪽 [이전] 56×56 중립 아이콘 버튼 + 상태 한 줄(기본 틀의 StatusLine).
// 주 버튼 [도구 고르러 가기]는 마지막 질문에 답해 만들 앱을 다 정했을 때만 나온다. 그 전까지는 보기를 누르면 바로 다음 질문이다(D19).
// '도구 먼저 둘러볼게요'는 주 버튼 자리가 아니라 시트 맨 아래 글 버튼이다. 질문 자리는 질문 섬과 interview-nav.ts로 나눠 쓴다.
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $questionPick, goToQuestion, questionAt } from '../lib/interview-nav.ts';
import { $result } from '../lib/result.ts';
import { ROUTES } from '../lib/routes.ts';
import { Icon } from './Icon.tsx';

export default function InterviewAction() {
  const ready = useHydrated();
  const r = useStore($result);
  const picked = useStore($questionPick);
  // 빌드 때(처음 온 사람)는 첫 질문이라 [이전]도 주 버튼도 없다
  if (!ready) return null;
  const at = questionAt(r, picked);
  return (
    <>
      {at > 0 && (
        <button type="button" class="btn btn-neutral btn-square q-back" aria-label={ko.interview.back} onClick={() => goToQuestion(at - 1)}>
          <Icon name="back" size="20px" />
        </button>
      )}
      {r.done && (
        <a class="btn btn-primary q-go" href={ROUTES.waypoints}>
          {ko.interview.goShop}
        </a>
      )}
    </>
  );
}
