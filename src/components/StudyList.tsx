// 읽어 둘 용어 섬 (T12, docs/CONCEPT.md 6.8): 먼저 읽어 둘 용어 → 만들면서 볼 용어. 용어마다 읽음 표시와 맞힌 문제 수.
// 목적지를 정하기 전이면 모든 용어 카드를 필수부터 보여 준다.
import { useStore } from '@nanostores/preact';
import { ko } from '../copy/ko.ts';
import { catalog } from '../lib/data.ts';
import { fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { termPath } from '../lib/routes.ts';
import { $study } from '../lib/store.ts';

/** 방금 읽고 돌아온 개념 (들어온 주소를 읽기만 하고 저장하지 않는다) */
function cameFrom(): string | null {
  if (typeof document === 'undefined' || !document.referrer) return null;
  try {
    const ref = new URL(document.referrer);
    if (ref.origin !== window.location.origin) return null;
    return ref.pathname.match(/^\/terms\/([^/]+)\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function Item({ id }: { id: string }) {
  const study = useStore($study);
  const ready = useHydrated();
  const c = catalog.concept.get(id);
  if (!c) return null;
  const rec = ready ? study[id] : undefined;
  // 용어 카드에서 다 읽고 돌아오면 그 줄의 '읽음' 표가 한 번 뒤집혀 나타난다
  const fresh = ready && rec?.read === true && cameFrom() === id;
  return (
    <li class={rec?.read ? 'study-item read' : 'study-item'}>
      <a href={termPath(id)}>{c.title}</a>
      <span class="study-meta">
        <span class={rec?.read ? (fresh ? 'badge flip-in' : 'badge') : 'badge badge-soft'}>{rec?.read ? ko.study.read : ko.study.notRead}</span>
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
        <h2>{fill(ko.study.all, { n: all.length })}</h2>
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
