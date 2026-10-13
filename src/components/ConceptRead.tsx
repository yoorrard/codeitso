// 용어 카드 아래 막대의 섬 (brief 6.10, D67 W3b): 주 버튼 [다 읽었어요] 하나. 누르면 읽음으로 적고(store.ts),
// 먼저 읽어 둘 용어를 다 읽었으면 알린다. 읽은 카드에서는 한 줄 '읽은 용어예요.'와 [용어 카드로]가 그 자리에 선다.
// 읽음 장면(S9)은 W5에서 붙인다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { ROUTES } from '../lib/routes.ts';
import { sfx } from '../lib/sfx.ts';
import { $study, markConceptRead } from '../lib/store.ts';
import { stateKey, track } from '../lib/track.ts';

export default function ConceptRead({ conceptId }: { conceptId: string }) {
  const ready = useHydrated();
  const study = useStore($study);
  const [pressed, setPressed] = useState(false);
  const [requiredDone, setRequiredDone] = useState(false);
  const back = useRef<HTMLAnchorElement>(null);
  const read = ready && study[conceptId]?.read === true;

  // 누른 버튼이 사라지니 그 자리에 선 [용어 카드로]로 초점을 옮긴다
  useEffect(() => {
    if (pressed && read) back.current?.focus();
  }, [pressed, read]);

  const markRead = (): void => {
    markConceptRead(conceptId);
    setPressed(true);
    announce(ko.concept.markedRead);
    // 집계(R-60): 그 상태의 먼저 읽어 둘 용어를 모두 읽었을 때 한 번 (같은 상태는 track이 한 번만 보낸다)
    const required = $result.get().study.required;
    const now = $study.get();
    if (required.length > 0 && required.includes(conceptId) && required.every((id) => now[id]?.read === true)) {
      track('required_done', undefined, stateKey($result.get().session));
      setRequiredDone(true);
      announce(ko.study.requiredDone);
      void sfx('green');
    }
  };

  if (!read) {
    return (
      <button type="button" class="btn btn-primary" onClick={markRead}>
        {ko.concept.markRead}
      </button>
    );
  }
  return (
    <>
      <p class="bar-line">{requiredDone ? ko.study.requiredDone : ko.concept.isRead}</p>
      <a ref={back} class="btn btn-primary" href={ROUTES.terms}>
        {ko.concept.back}
      </a>
    </>
  );
}
