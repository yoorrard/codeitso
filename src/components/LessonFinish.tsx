// 내 AI 써 보기의 아래 막대 주 버튼 (brief 6.4, D70): [다 했어요]를 누르면 연습을 마침으로 적고 [만들 앱 정하러 가기]로 바뀐다.
// 건너뛰기는 H1 아래 글 버튼이 맡는다(주 버튼이 아니다). 누른 버튼이 사라지므로 새 링크로 초점을 옮긴다.
// 이미 마친 손님은 붙기 전 [다 했어요]가 잠깐 보이지 않게 감춘다(practice.css, 기본 틀의 data-lesson-done).
// 누르면 연습 마침 장면 S8(차가 연습 고리를 한 바퀴 → 고리 심이 청록으로, D71). 마친 모습은 data-lesson-done으로 CSS가 바로 그린다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { practiceScene } from '../lib/map/practice.ts';
import { ROUTES } from '../lib/routes.ts';
import { sfx } from '../lib/sfx.ts';
import { $meta, patchMeta } from '../lib/store.ts';

export default function LessonFinish() {
  const ready = useHydrated();
  const meta = useStore($meta);
  const [pressed, setPressed] = useState(false);
  const next = useRef<HTMLAnchorElement>(null);
  const done = ready && meta.lessonDone === true;

  useEffect(() => {
    // 아래 막대는 sticky라 그냥 focus()하면 페이지 끝으로 굴러간다
    if (pressed && done) next.current?.focus({ preventScroll: true });
  }, [pressed, done]);

  function finish(): void {
    patchMeta({ lessonDone: true });
    // 마친 뒤에는 H1 아래 '건너뛰고 만들 앱 정하기'를 거둔다(주 버튼이 같은 곳으로 간다). 다시 열 때는 기본 틀이 첫 그림 전에 붙인다
    document.documentElement.setAttribute('data-lesson-done', '');
    practiceScene();
    setPressed(true);
    announce(ko.lesson.finished);
    void sfx('clear');
  }

  if (!done) {
    return (
      <button type="button" class="btn btn-primary lesson-go" data-ready={ready ? '' : undefined} onClick={finish}>
        {ko.lesson.finish}
      </button>
    );
  }
  return (
    <a ref={next} class="btn btn-primary lesson-go" data-ready="" href={ROUTES.destination}>
      {ko.lesson.next}
    </a>
  );
}
