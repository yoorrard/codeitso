// 설계도 창 (v4 D98, docs/review/v4/brief.md 2·3절): 단계 화면의 #blueprint-pane 안. 1024px부터 오른쪽 고정 칸(sticky),
// 600~1023은 본문 위 카드, 600 아래는 본문 뒤 카드 (frame.css). 지금(V1)은 고른 것을 글로 요약한다:
// 만들 앱 → 기능마다 고른 도구(아직·나중에) → 정한 수와 막힌 곳 수. V2가 같은 자리를 연결망 설계도로 채운다.
// 계산은 하지 않는다: evaluate() 결과(r.slots·filledBy·conflicts)를 읽기만 한다.
// 빌드 때는 처음 온 사람 기준(빈 안내)을 그리고, 다시 온 손님에게는 붙을 때까지 감춘다 (frame.css data-resume).
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { catalog } from '../lib/data.ts';
import { evaluate, fill, productOf, projectName } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
const P = ko.pane;

export default function BlueprintPane() {
  const ready = useHydrated();
  const live = useStore($result);
  const r = ready ? live : FIRST_VISIT;
  const started = Object.keys(r.session.answers).length > 0;
  const picked = r.slots.filter((s) => s.filledBy.length > 0).length;
  const open = r.conflicts.filter((c) => !c.kept).length;

  return (
    <div class="bp" data-ready={ready ? '' : undefined}>
      <h2 id="bp-title" class="bp-title">
        {P.title}
      </h2>
      {!started ? (
        <p class="bp-empty">{P.empty}</p>
      ) : (
        <>
          <p class="bp-app">
            <span class="bp-label">{P.app}</span>
            <span class="bp-app-name">{projectName(catalog, r)}</span>
          </p>
          {r.slots.length === 0 ? (
            <p class="bp-empty">{P.noSlots}</p>
          ) : (
            <>
              <ul class="bp-list">
                {r.slots.map((s) => {
                  const names = s.filledBy.map((id) => productOf(catalog, r, id)?.name ?? id);
                  const later = r.session.deferred.includes(s.slot.id);
                  return (
                    <li key={s.slot.id} class={names.length > 0 ? 'bp-row is-picked' : 'bp-row'}>
                      <span class="bp-slot">
                        {s.slot.label}
                        {!s.slot.required && <span class="bp-opt"> ({P.optional})</span>}
                      </span>
                      <span class="bp-tool">{names.length > 0 ? names.join(', ') : later ? P.later : P.none}</span>
                    </li>
                  );
                })}
              </ul>
              <p class="bp-foot">
                {fill(P.count, { n: r.slots.length, picked })}
                {picked > 0 && ` · ${open > 0 ? fill(P.blocked, { n: open }) : P.clear}`}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
