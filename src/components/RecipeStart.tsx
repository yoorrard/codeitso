// '이 코스로 출발' 섬 (코스 모음 /courses의 카드마다, docs/CONCEPT.md 6.10): 답·고른 도구·그대로 간 막힌 곳·한 줄 입력을 채우고
// 도구끼리 맞춰 보기(/check)로 간다. 저장된 진행이 있고 코스와 다르면 바꿀지 먼저 묻는다. 채우는 일은 src/lib/course.ts가 한다.
// 홈의 코스 미리 보기 시트는 같은 모듈을 누를 때 늦게 불러오는 페이지 스크립트를 쓴다 (첫 화면 JS를 늘리지 않는다, D70).
import { useRef } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { catalog } from '../lib/data.ts';
import { fill } from '../lib/engine/index.ts';
import { courseSession, startCourse, wouldOverwrite } from '../lib/course.ts';

interface Props {
  recipeId: string;
}

export default function RecipeStart({ recipeId }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const recipe = catalog.data.recipes.recipes.find((r) => r.id === recipeId);
  const target = courseSession(recipeId);
  if (!recipe || !target) return null;

  const go = (): void => startCourse(target);
  const start = (): void => {
    if (wouldOverwrite(target)) dialog.current?.showModal();
    else go();
  };
  const titleId = `cc-recipe-${recipe.id}-title`;

  return (
    <>
      <button ref={button} type="button" class="btn" onClick={start} aria-label={fill(ko.home.recipeGoLabel, { title: recipe.title })}>
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
