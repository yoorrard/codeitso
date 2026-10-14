// 용어 카드의 섬 (brief 6.10, D67 W3b): 확인 문제와 '내 AI에게 배우기'. 문제 글과 보기는 빌드 때도 그려져 자바스크립트 없이 읽힌다.
// 확인 문제: 보기는 중립 버튼 56. 고르면 바로 정답(--ok-soft + ✓ '정답')과 고른 오답(--bad-soft + '오답'), 그리고 풀이.
// 색만으로 전하지 않게 보기마다 글 표시를 함께 둔다. 맞힌 문제는 문제 글 앞에 ✓와 숨은 글 '맞힌 문제'.
// 내 AI에게 배우기: 붙여 넣을 말 상자(머리 'AI에게 보낼 말' + [복사], 몸 --fill). [다 읽었어요]는 아래 막대(ConceptRead)에 있다.
// 다 맞히면 문제 끝에 '다 맞혔어요 ✓'(2px 남색 고리, brief 4.8)가 선다 (빛 돌기 연출 S9와 소리는 걷어 냈다, v4 D96).
// 위쪽 그림 판의 상태(읽음·다 맞힘)도 이 섬이 칠한다(아래 막대 섬 ConceptRead와 함께, src/lib/term-state.ts).
import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data-full.ts';
import { fill, projectName } from '../lib/engine/index.ts';
import type { QuizItem } from '../lib/engine/types.ts';
import { track } from '../lib/track.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $result } from '../lib/result.ts';
import { $study, markQuizCorrect } from '../lib/store.ts';
import { paintPlate, termState } from '../lib/term-state.ts';
import CopyButton from './CopyButton.tsx';

interface Props {
  conceptId: string;
  quiz: QuizItem[];
  askAI: string;
}

function Question({ conceptId, item, index }: { conceptId: string; item: QuizItem; index: number }) {
  const [picked, setPicked] = useState<number | null>(null);
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
      const total = catalog.concept.get(conceptId)?.quiz.length ?? 0;
      const allSolved = first && total > 0 && ($study.get()[conceptId]?.quiz.length ?? 0) === total;
      announce(`${ko.concept.correct} ${item.explain}${allSolved ? ` ${ko.concept.quizAll}` : ''}`);
    } else {
      announce(`${fill(ko.concept.wrong, { n: item.answer + 1 })} ${item.explain}`);
    }
  };

  const qid = `quiz-${conceptId}-${index}`;
  const ok = picked === item.answer;
  return (
    <li class="quiz-item">
      <p id={qid} class="quiz-q">
        {solved && (
          <>
            <span class="i-mask i-check" aria-hidden="true" />
            <span class="visually-hidden">{ko.concept.solvedLabel}: </span>
          </>
        )}
        <span>
          {index + 1}. {item.q}
        </span>
      </p>
      <ul class="quiz-opts" aria-labelledby={qid}>
        {item.options.map((o, i) => {
          const state = picked === null ? '' : i === item.answer ? ' is-answer' : picked === i ? ' is-wrong' : '';
          return (
            <li>
              <button type="button" class={`btn quiz-opt${state}`} aria-pressed={picked === i} onClick={() => pick(i)}>
                <span class="quiz-opt-text">
                  {i + 1}. {o}
                </span>
                {state === ' is-answer' && <span class="quiz-mark">{ko.concept.answerTag}</span>}
                {state === ' is-wrong' && <span class="quiz-mark">{ko.concept.wrongTag}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && (
        <p class={ok ? 'quiz-result is-ok' : 'quiz-result is-bad'}>
          <strong>{ok ? ko.concept.correct : fill(ko.concept.wrong, { n: item.answer + 1 })}</strong> {item.explain}
        </p>
      )}
    </li>
  );
}

export default function ConceptActions({ conceptId, quiz, askAI }: Props) {
  const ready = useHydrated();
  const r = useStore($result);
  const study = useStore($study);
  const allDone = ready && quiz.length > 0 && (study[conceptId]?.quiz.length ?? 0) >= quiz.length;
  // 위쪽 그림 판을 기록대로 칠한다 (읽음·다 맞힘). 아래 막대 섬은 보일 때에야 붙어서 여기서도 칠한다
  useEffect(() => {
    if (ready) paintPlate(document.querySelector('.concept-art'), termState(study, conceptId));
  }, [ready, study]);
  const name = ready && Object.keys(r.session.answers).length > 0 ? projectName(catalog, r) : ko.concept.myApp;
  const text = fill(askAI, { project: name });

  return (
    <>
      <section class="sec" aria-labelledby="quiz-title">
        <h2 id="quiz-title" class="sec-title">
          {ko.concept.quiz}
        </h2>
        <p class="sec-note">{ko.concept.quizHint}</p>
        <ol class="quiz-list">
          {quiz.map((item, i) => (
            <Question conceptId={conceptId} item={item} index={i} />
          ))}
        </ol>
        {allDone && (
          <p class="quiz-done">
            <span class="i-mask i-check" aria-hidden="true" />
            {ko.study.solved}
          </p>
        )}
      </section>
      <section class="sec" aria-labelledby="ask-title">
        <h2 id="ask-title" class="sec-title">
          {ko.concept.askAI}
        </h2>
        <p class="sec-note">{ko.concept.askAIHint}</p>
        <div class="paste">
          <div class="paste-head">
            <span class="paste-label">{ko.concept.pasteLabel}</span>
            <CopyButton text={text} srLabel={`${ko.concept.askAI}: ${ko.common.copy}`} />
          </div>
          <p class="paste-body">{text}</p>
        </div>
      </section>
    </>
  );
}
