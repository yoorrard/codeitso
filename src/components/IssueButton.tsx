// 도구끼리 맞춰 보기 아래 막대의 주 버튼 하나 (brief 2.1·6.7, D70).
//   잠김(만들 앱을 정하기 전): [만들 앱 정하러 가기] (상태 한 줄 '만들 앱을 정하면 열려요'와 같은 까닭)
//   막힌 곳이 남음: [설계도 받으러 출발하기] 꺼짐(aria-disabled). 까닭은 상태 한 줄('막힌 곳이 1개 있어요')이 맡고 aria-describedby로 잇는다.
//     눌러도 가지 않고, 까닭을 알린 뒤 '막힌 곳 n개' 제목으로 초점을 옮긴다 (키보드로 바로 고칠 수 있게)
//   다 풀림: [설계도 받으러 출발하기] → 영수증을 받았다고 적고 설계도 받기로.
// 섬의 맨 바깥이 버튼 하나여야 아래 막대 폭을 채운다 (astro-island는 display: contents라 .action-main > *가 닿지 않는다).
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { ROUTES } from '../lib/routes.ts';
import { gate, stageById } from '../lib/stages.ts';
import { STATUS_LINE_ID, statusLine } from '../lib/status-line.ts';
import { $meta, patchMeta } from '../lib/store.ts';

export default function IssueButton() {
  const ready = useHydrated();
  const r = useStore($result);
  const meta = useStore($meta);

  // 빌드 때(처음 온 사람)는 잠김. 다시 온 손님에게는 붙을 때까지 감춘다 (check.css)
  if (!ready || !gate('check', r).open) {
    return (
      <a class="btn btn-primary ck-go" href={ROUTES.destination} data-ready={ready ? '' : undefined}>
        {ko.check.toInterview}
      </a>
    );
  }

  const blocked = !r.canIssue;
  const issue = (): void => {
    if (blocked) {
      announce(statusLine('check', r, meta));
      document.getElementById('ck-jams')?.focus();
      return;
    }
    patchMeta({ issued: true });
    window.location.assign(stageById('arrival').path);
  };

  return (
    <button
      type="button"
      class="btn btn-primary btn-issue ck-go"
      data-ready=""
      aria-disabled={blocked ? 'true' : undefined}
      aria-describedby={blocked ? STATUS_LINE_ID : undefined}
      onClick={issue}
    >
      {ko.check.issue}
    </button>
  );
}
