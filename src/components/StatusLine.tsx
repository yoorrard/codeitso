// 아래 막대 위 줄 (docs/CONCEPT.md 5.8): 미니 길(고를 것마다 기능 그림, 고르면 채움)과 상태 한 줄('경유지 · 꼭 고를 것 1개 남음').
// 지도가 스크롤 밖으로 나가도 진행이 여기서 보인다. 계산은 status-line.ts가 evaluate() 결과로 한다.
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { catalog } from '../lib/data.ts';
import { evaluate, fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import type { StageId } from '../lib/stages.ts';
import { miniPath, statusLine } from '../lib/status-line.ts';
import { $meta } from '../lib/store.ts';
import { Glyph } from './Glyph.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);

export default function StatusLine({ stage }: { stage: StageId }) {
  const ready = useHydrated();
  const live = useStore($result);
  const meta = useStore($meta);
  const r = ready ? live : FIRST_VISIT;
  const m = ready ? meta : {};
  const dots = stage === 'waypoints' || stage === 'check' || stage === 'arrival' ? miniPath(r) : [];
  const picked = dots.filter((d) => d.picked).length;
  return (
    <p class="status-line">
      {dots.length > 0 && (
        <span class="mini-path" role="img" aria-label={fill(ko.progress.miniPath, { total: dots.length, picked })}>
          {dots.map((d) => (
            <span class={`mini-node${d.picked ? ' picked' : ''}${d.required ? '' : ' optional'}${d.deferred ? ' later' : ''}`}>
              <Glyph name={`fn-${d.capability}`} />
            </span>
          ))}
        </span>
      )}
      <span class="status-text">{statusLine(stage, r, m)}</span>
    </p>
  );
}
