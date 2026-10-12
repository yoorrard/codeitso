// '영수증 뽑기' 주 버튼 (재확인 아래 막대). 발행할 수 있을 때만 켜지고, 꺼져 있으면 aria-disabled와 이유 글.
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import { evaluate, fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import { stationById } from '../lib/stations.ts';
import { patchMeta } from '../lib/store.ts';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);

export default function IssueButton() {
  const ready = useHydrated();
  const live = useStore($result);
  const r = ready ? live : FIRST_VISIT;
  const blocked = !r.canIssue;
  const open = r.conflicts.filter((c) => !c.kept).length;
  const reason = !r.done ? ko.check.issueBlockedInterview : fill(ko.check.issueBlocked, { n: open });

  const issue = (): void => {
    if (blocked) {
      announce(reason);
      return;
    }
    patchMeta({ issued: true });
    window.location.assign(stationById('receipt').path);
  };

  return (
    <div class="issue-wrap">
      {blocked && (
        <p id="issue-reason" class="issue-reason">
          {reason}
        </p>
      )}
      <button type="button" class="btn btn-primary btn-issue" aria-disabled={blocked} aria-describedby={blocked ? 'issue-reason' : undefined} onClick={issue}>
        {ko.common.issue}
      </button>
    </div>
  );
}
