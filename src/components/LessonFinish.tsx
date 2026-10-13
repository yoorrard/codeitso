// 내 AI 써 보기 끝: '다 했어요'를 누르면 연습을 마침으로 적고, '만들 앱 정하러 가기'를 보인다 (docs/CONCEPT.md 6.2, D64).
// S8(차가 연습 고리를 한 바퀴)은 지도와 함께 T31에서 더한다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { ROUTES } from '../lib/routes.ts';
import { sfx } from '../lib/sfx.ts';
import { $meta, patchMeta } from '../lib/store.ts';
import { Icon } from './Icon.tsx';

export default function LessonFinish() {
  const ready = useHydrated();
  const meta = useStore($meta);
  const [pressed, setPressed] = useState(false);
  const next = useRef<HTMLAnchorElement>(null);
  const done = ready && meta.lessonDone === true;

  // 누른 버튼이 사라지니 새로 나온 '만들 앱 정하러 가기' 링크로 초점을 옮긴다
  useEffect(() => {
    if (pressed && done) next.current?.focus();
  }, [pressed, done]);

  function finish(): void {
    patchMeta({ lessonDone: true });
    setPressed(true);
    announce(ko.lesson.finished);
    void sfx('arrive');
  }

  if (!done) {
    return (
      <button type="button" class="btn btn-primary" onClick={finish}>
        {ko.lesson.finish}
      </button>
    );
  }
  return (
    <div class={pressed ? 'lesson-finished just-now' : 'lesson-finished'}>
      <p>
        <span class="done-check" aria-hidden="true">
          <Icon name="check" size="20px" />
        </span>
        {ko.lesson.finished}
      </p>
      <a ref={next} class="btn btn-primary" href={ROUTES.destination}>
        {ko.lesson.next}
      </a>
    </div>
  );
}
