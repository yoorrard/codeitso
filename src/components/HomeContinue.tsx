// 홈의 '이어서 가기' (docs/CONCEPT.md 6.1 다시 온 손님). 저장된 진행이 있을 때만 보인다.
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { progress } from '../lib/progress.ts';
import { $result } from '../lib/result.ts';
import { continueTarget, hasProgress, stageById, stageNumber } from '../lib/stages.ts';
import { $meta } from '../lib/store.ts';

export default function HomeContinue() {
  const ready = useHydrated();
  const r = useStore($result);
  const meta = useStore($meta);
  if (!ready || !hasProgress(r.session)) return null;

  const t = continueTarget(r);
  const p = progress(r, meta);
  const stage = ko.stages[t.stage];
  const where = t.stage === 'destination' && t.questionNumber ? fill(ko.home.continueInterview, { stage, n: t.questionNumber }) : fill(ko.home.continueAt, { stage, n: stageNumber(t.stage) ?? 1 });
  const left = p.requiredLeft > 0 ? fill(ko.progress.requiredLeft, { n: p.requiredLeft }) : p.blocked > 0 ? fill(ko.progress.blocked, { n: p.blocked }) : '';

  return (
    <section class="continue-card" aria-labelledby="cc-continue-title">
      <h2 id="cc-continue-title">{ko.home.continueTitle}</h2>
      <p>{where}</p>
      {left && <p class="trip-line">{left}</p>}
      <a class="btn btn-primary" href={stageById(t.stage).path}>
        {ko.home.continueGo}
      </a>
    </section>
  );
}
