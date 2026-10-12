// 홈의 '이어서 하기'와 내 여행 기록 미리 보기 (docs/UX.md 2.1·3.1). 저장된 진행이 있을 때만 보인다.
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { progress } from '../lib/progress.ts';
import { $result } from '../lib/result.ts';
import { continueTarget, hasProgress, stationById } from '../lib/stations.ts';
import { $meta, $study } from '../lib/store.ts';

export default function HomeContinue() {
  const ready = useHydrated();
  const r = useStore($result);
  const study = useStore($study);
  const meta = useStore($meta);
  if (!ready || !hasProgress(r.session)) return null;

  const t = continueTarget(r);
  const p = progress(r, study, meta);
  const where =
    t.station === 'interview' && t.questionNumber ? fill(ko.home.continueInterview, { n: t.questionNumber }) : fill(ko.home.continueAt, { station: ko.stations[t.station] });

  return (
    <section class="continue-card" aria-labelledby="cc-continue-title">
      <h2 id="cc-continue-title">{ko.home.continueTitle}</h2>
      <p>{where}</p>
      <p class="trip-line">{fill(ko.home.tripPreview, { stamps: p.stamps.length, km: p.km })}</p>
      <a class="btn btn-primary" href={stationById(t.station).path}>
        {ko.home.continueGo}
      </a>
    </section>
  );
}
