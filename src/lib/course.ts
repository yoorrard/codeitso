// 미리 짠 코스로 출발 (docs/CONCEPT.md 6.10, brief 6.3): 코스의 답·고른 도구·그대로 간 막힌 곳·한 줄 입력을 채우고
// 도구끼리 맞춰 보기(/check)로 간다. 저장된 진행이 있고 코스와 다르면 화면이 먼저 바꿀지 묻는다(wouldOverwrite).
// 자료 전체(엔진·카탈로그)를 불러오므로 홈은 [이 코스로 출발]을 누를 때 이 모듈을 늦게 불러온다(첫 화면 JS에 넣지 않는다, D70).
import { catalog } from './data.ts';
import type { Session } from './engine/types.ts';
import { commitSession } from './result.ts';
import { hasProgress, sameSession, stageById } from './stages.ts';
import { $session, patchMeta } from './store.ts';

/** 코스 id → 채울 상태. 없는 코스면 null */
export function courseSession(id: string): Session | null {
  const recipe = catalog.data.recipes.recipes.find((r) => r.id === id);
  if (!recipe) return null;
  const target: Session = { answers: recipe.answers, cart: recipe.cart, kept: recipe.kept ?? [], deferred: [] };
  if (recipe.freeText) target.freeText = recipe.freeText;
  return target;
}

/** 지금 저장된 진행을 코스가 덮어쓰는가 (같은 코스면 묻지 않는다) */
export function wouldOverwrite(target: Session): boolean {
  const now = $session.get();
  return hasProgress(now) && !sameSession(catalog, now, target);
}

/** 코스로 채우고 도구끼리 맞춰 보기로 간다. 코스로 채운 상태는 만들 앱 정하기 시작 시각이 없다 (발행 집계 구간 none) */
export function startCourse(target: Session): void {
  commitSession(target);
  patchMeta({ interviewStartedAt: undefined });
  window.location.assign(stageById('check').path);
}
