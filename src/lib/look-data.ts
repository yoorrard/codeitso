// 디자인 정하기 묶음 (T38, 설계서 4.6·4.10·4.11절): 디자인 값(data/looks.json)과 디자인 계산(engine/look.ts)을 묶은 지연 모듈.
// 단계 화면의 첫 묶음에 싣지 않고 import()로 받는다 (qa:budget '디자인 정하기 묶음', 시트·미리 보기와 함께 14KB, D82).
// 부품 규칙 문장과 출처 칸은 싣지 않는다 (src/lib/data-parts.ts looksScreen): 설계도 6번·DESIGN.md는 look-render-data.ts가 그린다.
// 계산은 엔진이 하고 이 파일은 자료를 붙여 넘기기만 한다.
import looksScreen from 'virtual:cc-data/looks-screen';
import { LOOK_RENDER_ONLY, guardMissing } from './data-parts.ts';
import type { Catalog, EngineResult } from './engine/index.ts';
import type { LookCheck, LookSpec } from './engine/look.ts';
import { LOOK_FILE_NAME, darkenForWhite, lookChecks, lookSpec, lookSummary, normalizeLook, referenceWords } from './engine/look.ts';
import type { LookChoice, Looks } from './engine/types.ts';

// JSON은 넓은 타입(string 등)으로 들어오므로, 스키마 검사(npm run validate)를 믿고 Looks로 본다. 싣지 않은 칸을 읽으면 멈춘다
export const looks = guardMissing({ ...looksScreen }, LOOK_RENDER_ONLY, 'looks') as unknown as Looks;
export { LOOK_FILE_NAME };

/** 고른 것·쓴 말·앱 종류로 정한 디자인 값 */
export function specOf(cat: Catalog, r: EngineResult): LookSpec {
  return lookSpec(cat, looks, r);
}

/** 대비·글꼴 알림 (시트의 대비 줄) */
export function checksOf(spec: LookSpec): LookCheck[] {
  return lookChecks(looks, spec);
}

/** 미리 보기 이름표 (role="img") */
export function summaryOf(cat: Catalog, spec: LookSpec, title: string): string {
  return lookSummary(cat, spec, title);
}

/** looks.json에 없는 id를 버린 고른 것 (저장하기 전에) */
export function cleanChoice(choice: LookChoice | undefined): LookChoice {
  return normalizeLook(looks, choice);
}

/** [흰 글자로 두기]: 흰 글자가 기준을 넘는 버튼 바탕 */
export function whiteButton(hex: string): string {
  return darkenForWhite(hex, { target: looks.contrast.target, onLight: looks.fixed.onLight, onDark: looks.fixed.onDark });
}

/** 이 앱 종류의 영어 찾을 낱말 (다른 앱 둘러보기 칩) */
export function referenceWordsOf(spec: LookSpec): string[] {
  return referenceWords(looks, spec);
}
