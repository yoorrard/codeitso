// 아래 막대 위 줄 (D64): 상태 한 줄 '도구 고르기 · 1개만 더 고르면 돼요 · 약 1분'. 미니 길은 없앴다 (지도와 이 줄이 같은 일을 한다).
// 지도가 스크롤 밖으로 나가도 진행이 여기서 보인다. 계산은 status-line.ts가 evaluate() 결과로 한다.
// 빌드 때 글은 처음 온 사람 기준이라, 다시 온 손님에게는 붙어서 data-ready가 달릴 때까지 글을 감춘다 (frame.css).
import { useStore } from '@nanostores/preact';
import { catalog } from '../lib/data.ts';
import { evaluate } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import type { StageId } from '../lib/stages.ts';
import { statusLine } from '../lib/status-line.ts';
import { $meta } from '../lib/store.ts';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);

export default function StatusLine({ stage }: { stage: StageId }) {
  const ready = useHydrated();
  const live = useStore($result);
  const meta = useStore($meta);
  const r = ready ? live : FIRST_VISIT;
  const m = ready ? meta : {};
  return (
    <p class="status-line" data-ready={ready ? '' : undefined}>
      <span class="status-text">{statusLine(stage, r, m)}</span>
    </p>
  );
}
