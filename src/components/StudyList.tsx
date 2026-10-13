// 용어 카드 목록의 섬 (brief 6.10, D67 W3b): 맨 위 "20장 중 n장 읽음" → (만들 앱을 정했으면) '읽어 둘 용어' 줄 목록.
// 그 아래 2열 타일(옅은 판 위 청사진 그림)은 terms/index.astro가 정적으로 그리고, 이 섬은 타일의 상태 글('아직 안 읽음'(숨은 글)·'읽음 ✓'·'다 맞혔어요 ✓')만
// 저장된 기록에 맞춰 바꾼다 (그림 SVG를 섬 묶음에 넣지 않으려고. ShelfFilter와 같은 방식). 퍼센트·순위는 쓰지 않는다.
// 타일 위 옅은 판도 같은 상태로 칠한다: 읽음은 한 단 짙은 판, 다 맞힘은 2px 고리 (S9, src/lib/term-scene.ts).
import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { catalog } from '../lib/data.ts';
import { fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { termPath } from '../lib/routes.ts';
import type { StudyRecord } from '../lib/saved.ts';
import { $study } from '../lib/store.ts';
import type { TermState } from '../lib/term-scene.ts';
import { paintPlate, termState } from '../lib/term-scene.ts';

const WORD: Record<TermState, string> = {
  todo: ko.study.notRead,
  read: ko.study.read,
  solved: ko.study.solved,
};

/** 정적 타일([data-term])의 상태 글을 기록에 맞춘다 */
function paintTiles(study: StudyRecord): void {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-term-state]'))) {
    const s = termState(study, el.dataset['termState'] ?? '');
    el.textContent = WORD[s];
    el.classList.toggle('is-read', s !== 'todo');
    // 안 읽은 것은 숨은 글로만 ('아직'이 열여덟 번 되풀이되지 않게. 위의 'n장 읽음'이 같은 말을 한다)
    el.classList.toggle('visually-hidden', s === 'todo');
    paintPlate(el.closest('.term-tile')?.querySelector('.term-plate') ?? null, s);
  }
  document.querySelector('.term-grid')?.setAttribute('data-ready', '');
}

export default function StudyList() {
  const ready = useHydrated();
  const r = useStore($result);
  const study = useStore($study);
  const all = catalog.data.concepts.concepts;
  const n = ready ? all.filter((c) => study[c.id]?.read === true).length : 0;
  const mine = ready ? r.study.required : [];

  useEffect(() => {
    if (ready) paintTiles(study);
  }, [ready, study]);

  return (
    <div class="study-top">
      <p class="study-count" data-wait={ready ? undefined : ''}>
        {fill(ko.study.readCount, { total: all.length, n })}
      </p>
      {ready && mine.length === 0 && <p class="study-note">{ko.study.noSession}</p>}
      {mine.length > 0 && (
        <section class="study-mine" aria-labelledby="study-mine">
          <h2 id="study-mine" class="sec-title">
            {ko.study.mine}
          </h2>
          <p class="study-note">{ko.study.mineNote}</p>
          <ul class="list group">
            {mine.map((id) => {
              const c = catalog.concept.get(id);
              if (!c) return null;
              const s = termState(study, id);
              return (
                <li key={id}>
                  <a class="list-row" href={termPath(id)}>
                    <span class="list-text">
                      <span class="list-name">{c.title}</span>
                    </span>
                    <span class={s === 'todo' ? 'term-state visually-hidden' : 'term-state is-read'}>{WORD[s]}</span>
                    <span class="list-chev" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
