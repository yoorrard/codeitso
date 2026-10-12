// 첫 수업 끝: '첫 수업 마치기'를 누르면 첫 수업 도장(M7, 처음 한 번만 찍히는 장면)과 인터뷰로 가는 길.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { KM } from '../lib/progress.ts';
import { sfx } from '../lib/sfx.ts';
import { $meta, $trip, markStampsSeen, patchMeta } from '../lib/store.ts';

const STAMP = 'station.lesson';

export default function LessonFinish() {
  const ready = useHydrated();
  const meta = useStore($meta);
  const [justNow, setJustNow] = useState(false);
  const [pressed, setPressed] = useState(false);
  const next = useRef<HTMLAnchorElement>(null);
  const done = ready && meta.lessonDone === true;

  // 누른 버튼이 사라지니 새로 나온 '인터뷰로' 링크로 초점을 옮긴다 (도장 장면을 기다리지 않는다)
  useEffect(() => {
    if (pressed && done) next.current?.focus();
  }, [pressed, done]);

  function finish(): void {
    const firstTime = !$trip.get().seenStamps.includes(STAMP);
    patchMeta({ lessonDone: true });
    markStampsSeen([STAMP]);
    setJustNow(firstTime);
    setPressed(true);
    announce(ko.lesson.finished);
    void sfx('stamp');
  }

  if (!done) {
    return (
      <button type="button" class="btn btn-primary" onClick={finish}>
        {ko.lesson.finish}
      </button>
    );
  }
  return (
    <div class={justNow ? 'lesson-stamp just-now' : 'lesson-stamp'}>
      <span class={justNow ? 'stamp-mark stamp-in' : 'stamp-mark'} aria-hidden="true">
        <img src="/emoji/station-lesson.webp" width={56} height={56} alt="" />
      </span>
      <p>
        {ko.lesson.finished} <span class="km-chip">{fill(ko.lesson.km, { km: KM.lesson })}</span>
      </p>
      <a ref={next} class="btn btn-primary" href="/interview">
        {ko.lesson.next}
      </a>
    </div>
  );
}
