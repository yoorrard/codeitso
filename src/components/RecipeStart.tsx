// '이 코스로 출발' 섬: 답·고른 도구·그대로 간 막힌 곳·한 줄 입력을 채우고 도구끼리 맞춰 보기(/check)로 간다 (docs/CONCEPT.md 6.10).
// 저장된 진행이 있고 코스와 다르면 바꿀지 먼저 묻는다.
import { useRef } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { catalog } from '../lib/data.ts';
import { fill } from '../lib/engine/index.ts';
import type { Session } from '../lib/engine/types.ts';
import { commitSession } from '../lib/result.ts';
import { hasProgress, sameSession, stageById } from '../lib/stages.ts';
import { $session, patchMeta } from '../lib/store.ts';

interface Props {
  recipeId: string;
  /** 주 버튼으로 (한 화면에 하나만). 홈의 카드에서는 보통 버튼 */
  primary?: boolean;
}

export default function RecipeStart({ recipeId, primary = false }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const recipe = catalog.data.recipes.recipes.find((r) => r.id === recipeId);
  if (!recipe) return null;
  const target: Session = { answers: recipe.answers, cart: recipe.cart, kept: recipe.kept ?? [], deferred: [] };
  if (recipe.freeText) target.freeText = recipe.freeText;

  const go = (): void => {
    commitSession(target);
    // 코스로 채운 상태는 목적지 시작 시각이 없다 (발행 집계 구간 none)
    patchMeta({ interviewStartedAt: undefined });
    window.location.assign(stageById('check').path);
  };
  const start = (): void => {
    const now = $session.get();
    if (hasProgress(now) && !sameSession(catalog, now, target)) dialog.current?.showModal();
    else go();
  };
  const titleId = `cc-recipe-${recipe.id}-title`;

  return (
    <>
      <button ref={button} type="button" class={primary ? 'btn btn-primary' : 'btn'} onClick={start} aria-label={fill(ko.home.recipeGoLabel, { title: recipe.title })}>
        {ko.home.recipeGo}
      </button>
      <dialog ref={dialog} class="sheet" aria-labelledby={titleId} onClose={() => button.current?.focus()}>
        <h2 id={titleId}>{ko.home.overwriteTitle}</h2>
        <p>{ko.home.overwriteBody}</p>
        <form method="dialog" class="sheet-actions">
          <button class="btn">{ko.home.overwriteNo}</button>
          <button class="btn btn-primary" value="go" onClick={go}>
            {ko.home.overwriteYes}
          </button>
        </form>
      </dialog>
    </>
  );
}
