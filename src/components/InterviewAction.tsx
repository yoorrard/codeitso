// 목적지 아래 막대의 주 버튼: 목적지를 정했으면 '경유지로 가기', 아니면 '도구 먼저 둘러볼게요'(답은 저장해 둔다).
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { ROUTES } from '../lib/routes.ts';

export default function InterviewAction() {
  const ready = useHydrated();
  const r = useStore($result);
  if (ready && r.done) {
    return (
      <a class="btn btn-primary" href={ROUTES.waypoints}>
        {ko.interview.goShop}
      </a>
    );
  }
  return (
    <a class="btn" href={ROUTES.tools}>
      {ko.interview.browseOnly}
    </a>
  );
}
