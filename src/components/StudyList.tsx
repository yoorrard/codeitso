// 공부할 것 섬 (T12, docs/UX.md 3.7): 시작 전 필수 → 단계별. 개념마다 읽음 표시와 맞힌 문제 수.
// 인터뷰 전이면 모든 개념을 필수부터 보여 준다.
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { catalog } from '../lib/data.ts';
import { fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { $study } from '../lib/store.ts';

function Item({ id }: { id: string }) {
  const study = useStore($study);
  const ready = useHydrated();
  const c = catalog.concept.get(id);
  if (!c) return null;
  const rec = ready ? study[id] : undefined;
  return (
    <li class={rec?.read ? 'study-item read' : 'study-item'}>
      <a href={`/concepts/${id}`}>{c.title}</a>
      <span class="study-meta">
        <span class={rec?.read ? 'badge' : 'badge badge-soft'}>{rec?.read ? ko.study.read : ko.study.notRead}</span>
        <span>{fill(ko.study.quizCount, { n: rec?.quiz.length ?? 0, total: c.quiz.length })}</span>
      </span>
    </li>
  );
}

export default function StudyList() {
  const ready = useHydrated();
  const r = useStore($result);
  const has = ready && r.study.all.length > 0;

  if (!has) {
    const all = [...catalog.data.concepts.concepts].sort((a, b) => (a.level === b.level ? a.order - b.order : a.level === 'must' ? -1 : 1));
    return (
      <>
        <p class="q-help">{ko.study.noSession}</p>
        <h2>{ko.study.all}</h2>
        <ul class="study-list">
          {all.map((c) => (
            <Item id={c.id} />
          ))}
        </ul>
      </>
    );
  }
  return (
    <>
      <section aria-labelledby="study-required" class="card">
        <h2 id="study-required">{ko.study.required}</h2>
        <p class="q-help">{ko.study.requiredMinutes}</p>
        <ul class="study-list">
          {r.study.required.map((id) => (
            <Item id={id} />
          ))}
        </ul>
      </section>
      <section aria-labelledby="study-steps">
        <h2 id="study-steps">{ko.study.steps}</h2>
        <ol class="step-concepts">
          {r.steps
            .filter((s) => s.concepts.length > 0)
            .map((s) => (
              <li>
                <strong>{s.title}</strong>
                <ul class="study-list">
                  {s.concepts.map((id) => (
                    <Item id={id} />
                  ))}
                </ul>
              </li>
            ))}
        </ol>
      </section>
    </>
  );
}
