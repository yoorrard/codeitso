// 섬 쪽 점선 밑줄 (brief 8절 '섬은 쉬는 시간에 더한다', glossary.md 5.7, D69). 단계 화면 섬이 설명 글 칸에 쓴다.
// 처음엔 글 그대로 그리고, 쉬는 시간(requestIdleCallback, 늦어도 2초)에 풀이 묶음을 불러온 뒤 밑줄을 더한다.
// 밑줄 말은 Astro 쪽(TermText.astro)과 같은 <button class="term-mark" popovertarget="term-pop">이고, 누르면 풀이 섬이 연다.
//   const mark = useTermMarks();      // 화면(섬) 하나에 한 번, 그 화면의 맨 위 컴포넌트에서
//   <p class="q-help">{mark(q.help)}</p>
// 그릴 때마다 새 셈으로 시작해 부르는 순서대로 센다: 용어마다 처음 한 번, 화면에 5개, 한 칸에 2개까지.
// 설정의 '점선 밑줄'이 꺼지면 그리지 않고, 이 화면을 열 때 이미 연 용어는 긋지 않는다.
import { useStore } from '@nanostores/preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { $prefs, $termsSeen } from '../lib/store.ts';
import type { TermEngine } from '../lib/term-engine.ts';
import { termEngine } from '../lib/term-load.ts';
import { MARKS_STAGE, markBudget } from '../lib/term-marks.ts';

export function useTermMarks(limit = MARKS_STAGE): (text: string) => ComponentChildren {
  const [engine, setEngine] = useState<TermEngine | null>(null);
  const on = useStore($prefs).marks;
  // 화면을 연 때의 '한 번 연 용어' (보는 중에 연 말의 밑줄은 거두지 않는다: 초점이 돌아갈 자리가 사라지지 않게)
  const [skip] = useState(() => new Set($termsSeen.get()));

  useEffect(() => {
    let alive = true;
    const go = (): void => {
      termEngine().then(
        (e) => alive && setEngine(e),
        () => undefined,
      );
    };
    const idle = 'requestIdleCallback' in window;
    const id = idle ? window.requestIdleCallback(go, { timeout: 2000 }) : window.setTimeout(go, 200);
    return () => {
      alive = false;
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);

  const budget = markBudget(limit);
  return (text) => {
    if (!engine || !on) return text;
    return engine.segment(text, budget, skip).map((p) =>
      typeof p === 'string' ? (
        p
      ) : (
        <button type="button" class="term-mark" data-term={p.id} popovertarget="term-pop">
          {p.text}
        </button>
      ),
    );
  };
}
