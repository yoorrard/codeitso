// 용어 카드 아래 막대의 섬 (brief 6.10, D67 W3b): 주 버튼 [다 읽었어요] 하나. 누르면 읽음으로 적고(store.ts),
// 먼저 읽어 둘 용어를 다 읽었으면 알린다. 읽은 카드에서는 한 줄 '읽은 용어예요. 20장 중 n장 읽음'과 [용어 카드로]가 그 자리에 선다.
// 판의 상태(읽음·다 맞힘)는 붙을 때와 기록이 바뀔 때 이 섬이 칠한다(src/lib/term-state.ts. 판은 정적 HTML이다).
// 판 채우기·숫자 굴리기 연출(S9)과 소리는 걷어 냈다 (v4 D96).
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data-full.ts';
import { fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { ROUTES } from '../lib/routes.ts';
import { $study, markConceptRead } from '../lib/store.ts';
import { paintPlate, termState } from '../lib/term-state.ts';
import { stateKey, track } from '../lib/track.ts';

/** 이 카드의 그림 판 (그림이 없는 카드는 없다) */
const plate = (): HTMLElement | null => document.querySelector('.concept-art');

export default function ConceptRead({ conceptId }: { conceptId: string }) {
  const ready = useHydrated();
  const study = useStore($study);
  const [pressed, setPressed] = useState(false);
  const [requiredDone, setRequiredDone] = useState(false);
  const back = useRef<HTMLAnchorElement>(null);
  const read = ready && study[conceptId]?.read === true;
  const all = catalog.data.concepts.concepts;
  const n = all.filter((c) => study[c.id]?.read === true).length;
  const countText = (k: number): string => fill(ko.study.readCount, { total: all.length, n: k });

  // 판 칠하기: 붙을 때(저장된 기록)와 읽음·다 맞힘이 바뀔 때
  useEffect(() => {
    if (ready) paintPlate(plate(), termState(study, conceptId));
  }, [ready, study]);

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
      <p class="bar-line">
        {requiredDone ? ko.study.requiredDone : ko.concept.isRead}{' '}
        <span class="term-count">{countText(n)}</span>
      </p>
      <a ref={back} class="btn btn-primary" href={ROUTES.terms}>
        {ko.concept.back}
      </a>
    </>
  );
}
