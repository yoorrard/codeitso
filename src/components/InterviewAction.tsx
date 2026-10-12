// 인터뷰 아래 막대의 주 버튼: 인터뷰를 마쳤으면 '장보기로 가기', 아니면 '일단 구경만 할게요'(답은 저장해 둔다).
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';

export default function InterviewAction() {
  const ready = useHydrated();
  const r = useStore($result);
  if (ready && r.done) {
    return (
      <a class="btn btn-primary" href="/shop">
        {ko.interview.goShop}
      </a>
    );
  }
  return (
    <a class="btn" href="/shelf">
      {ko.interview.browseOnly}
    </a>
  );
}
