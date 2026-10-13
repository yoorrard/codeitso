// 용어 카드의 섬 (T12, docs/CONCEPT.md 6.8): 확인 문제(고르면 바로 정답·풀이, 맞히면 ✓), '내 AI에게 배우기' 복사,
// '다 읽었어요'(읽음 기록, 먼저 읽어 둘 용어를 다 읽으면 알림). 문제 글과 보기는 빌드 때도 그려져 자바스크립트 없이 읽힌다.
// 읽음·금테 장면(S9)은 T31에서 더한다.
import { useStore } from '@nanostores/preact';
import { useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import { fill, projectName } from '../lib/engine/index.ts';
import type { QuizItem } from '../lib/engine/types.ts';
import { stateKey, track } from '../lib/track.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { sfx } from '../lib/sfx.ts';
import { $study, markConceptRead, markQuizCorrect } from '../lib/store.ts';
import CopyButton from './CopyButton.tsx';

interface Props {
  conceptId: string;
  quiz: QuizItem[];
  askAI: string;
}

function Question({ conceptId, item, index }: { conceptId: string; item: QuizItem; index: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [fresh, setFresh] = useState(false);
  const study = useStore($study);
  const ready = useHydrated();
  const solved = ready && (study[conceptId]?.quiz ?? []).includes(index);

  const pick = (choice: number): void => {
    setPicked(choice);
    const ok = choice === item.answer;
    // 집계(R-60): 같은 문제는 처음 고른 답만 센다
    track('quiz_answer', ok ? 'ok' : 'ng', `${conceptId}.${index}`);
    if (ok) {
      const first = !($study.get()[conceptId]?.quiz ?? []).includes(index);
      markQuizCorrect(conceptId, index);
      setFresh(first);
      void sfx('green');
      const total = catalog.concept.get(conceptId)?.quiz.length ?? 0;
      const allSolved = first && total > 0 && ($study.get()[conceptId]?.quiz.length ?? 0) === total;
      announce(`${ko.concept.correct} ${item.explain}${allSolved ? ` ${ko.concept.quizAll}` : ''}`);
    } else {
      announce(`${fill(ko.concept.wrong, { n: item.answer + 1 })} ${item.explain}`);
      void sfx('tap');
    }
  };

  const qid = `quiz-${conceptId}-${index}`;
  return (
    <li class="quiz-item">
      <p id={qid} class="quiz-q">
        {index + 1}. {item.q}
        {solved && (
          <span class={fresh ? 'mini-stamp stamp-in' : 'mini-stamp'} aria-hidden="true">
            ✓
          </span>
        )}
      </p>
      <ul class="options" aria-labelledby={qid}>
        {item.options.map((o, i) => {
          const state = picked === null ? '' : i === item.answer ? ' is-answer' : picked === i ? ' is-wrong' : '';
          return (
            <li>
              <button type="button" class={`option${state}`} aria-pressed={picked === i} onClick={() => pick(i)}>
                <span class="option-label">
                  {i + 1}. {o}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && (
        <p class={picked === item.answer ? 'quiz-result ok' : 'quiz-result'}>
          <strong>{picked === item.answer ? ko.concept.correct : fill(ko.concept.wrong, { n: item.answer + 1 })}</strong> {item.explain}
        </p>
      )}
    </li>
  );
}

export default function ConceptActions({ conceptId, quiz, askAI }: Props) {
  const ready = useHydrated();
  const r = useStore($result);
  const study = useStore($study);
  const [requiredDone, setRequiredDone] = useState(false);
  const read = ready && study[conceptId]?.read === true;
  const name = ready && Object.keys(r.session.answers).length > 0 ? projectName(catalog, r) : ko.concept.myApp;

  const markRead = (): void => {
    markConceptRead(conceptId);
    announce(ko.concept.markedRead);
    // 집계(R-60): 그 상태의 먼저 읽어 둘 용어를 모두 읽었을 때 한 번 (같은 상태는 track이 한 번만 보낸다)
    const required = $result.get().study.required;
    const study = $study.get();
    if (required.length > 0 && required.includes(conceptId) && required.every((id) => study[id]?.read === true)) {
      track('required_done', undefined, stateKey($result.get().session));
      setRequiredDone(true);
      announce(ko.study.requiredDone);
      void sfx('green');
    }
  };

  return (
    <>
      <section aria-labelledby="quiz-title" class="card">
        <h2 id="quiz-title">{ko.concept.quiz}</h2>
        <p class="q-help">{ko.concept.quizHint}</p>
        <ol class="quiz-list">
          {quiz.map((item, i) => (
            <Question conceptId={conceptId} item={item} index={i} />
          ))}
        </ol>
      </section>
      <section aria-labelledby="ask-title" class="card">
        <h2 id="ask-title">{ko.concept.askAI}</h2>
        <p class="q-help">{ko.concept.askAIHint}</p>
        <p class="prompt-box">{fill(askAI, { project: name })}</p>
        <CopyButton text={fill(askAI, { project: name })} srLabel={`${ko.concept.askAI}: ${ko.common.copy}`} />
      </section>
      <div class="read-row">
        {read ? (
          <p class="kept-note">{ko.concept.isRead}</p>
        ) : (
          <button type="button" class="btn btn-primary" onClick={markRead}>
            {ko.concept.markRead}
          </button>
        )}
        {requiredDone && <p class="kept-note">{ko.study.requiredDone}</p>}
      </div>
    </>
  );
}
