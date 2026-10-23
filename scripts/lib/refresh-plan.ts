// 매일 자료 새로 받기의 줄(레인)과 받는 날 (D128, D143). scripts/import/refresh-all.ts가 쓰고 시험이 그대로 부른다 (부작용 없음).
// 받는 날은 잰 변화량으로 정했다 (docs/DECISIONS.md D143, 2026-10-23 측정):
// - 매일: 새 인기 상품이 날마다 생기는 곳 — Hugging Face 모델·데이터셋·스페이스, Kaggle, AI 확장(스킬·플러그인·에이전트·규칙·워크플로),
//   MCP 등록소(바뀐 것만, updated_since), shadcn 레지스트리, GitHub 오픈소스 목록, 공개 API 목록(몇 초), 공식 API·AI 모델 가격(models.dev, D141)
// - 한 주에 한 번: 사흘 동안 새 상품이 거의 없고 지표만 흔들린 곳 — 글꼴·색·그라디언트·3D 에셋, 꾸러미 순위(npm·PyPI·pub),
//   손으로 고른 디자인 사이트의 링크 확인, 템플릿 갤러리, GitLab·Codeberg, 세계은행·데이터 모음
// - 월요일: 느리고 큰 출처 전체 — MCP 등록소 전체(바뀐 것만 받는 날의 빠짐 맞추기), Iconify 전체, 공공데이터포털, OWID
// 같은 대분류 안에서 겹침을 빼는 차례(손 목록 → 넓은 목록, 다른 출처 → oss-github·tpl-github)는 한 줄 안에서 지킨다.
// 쉬는 날의 출처는 지난 파일을 그대로 두고, 다음 단계는 그 파일을 읽어 겹침을 뺀다.
// Actions는 작업 하나의 벽시계 시간으로 세므로 가장 긴 줄(oss, 약 13분)보다 짧은 줄은 매일 돌려도 시간이 늘지 않는다.

export type Group = 'design' | 'ai' | 'api' | 'oss';

export interface Step {
  file: string;
  args?: readonly string[];
  /** 받는 요일 (한국 시각, 0=일 … 6=토). 없으면 매일 */
  days?: readonly number[];
  /** 오래 걸리는 단계: 시간 한도를 두 배로 */
  long?: boolean;
}

export interface Lane {
  group: Group;
  steps: readonly Step[];
  /** GitHub 토큰을 넘길 줄 (주제 검색을 하는 oss-github·tpl-github). 나머지 줄은 토큰 없이 거울 서버(ecosyste.ms)로 받는다 */
  token?: boolean;
}

export const SUN = 0;
export const MON = 1;
export const TUE = 2;
export const WED = 3;
export const THU = 4;
export const FRI = 5;
export const SAT = 6;
const NOT_MON = [SUN, TUE, WED, THU, FRI, SAT] as const;

const daily = (...files: string[]): Step[] => files.map((file) => ({ file }));
const on = (days: readonly number[], ...files: string[]): Step[] => files.map((file) => ({ file, days }));

export const LANES: Readonly<Record<string, Lane>> = {
  'design-type': { group: 'design', steps: on([TUE], 'design-fonts.ts', 'design-colors.ts', 'design-gradients.ts', 'design-styles.ts', 'design-assets.ts') },
  'design-icons': { group: 'design', steps: [{ file: 'design-icons.ts', days: [MON], long: true }] },
  'design-ui': {
    group: 'design',
    steps: [
      { file: 'design-ui.ts', args: ['--only=shadcn'] },
      { file: 'design-ui.ts', args: ['--only=repos,design-systems,design-md'], days: [THU] },
      { file: 'design-curated.ts', days: [THU] },
    ],
  },
  // 공식 MCP 등록소(4만 6천 개)는 쪽 넘기기가 25분을 넘긴다: 월요일에만 전체, 다른 날은 바뀐 서버만(updated_since, 하루 약 2천 개·30초)
  'ai-mcp': { group: 'ai', steps: [{ file: 'ai-mcp.ts', days: [MON], long: true }, { file: 'ai-mcp.ts', args: ['--since'], days: NOT_MON }] },
  'ai-skills': { group: 'ai', steps: daily('ai-skills.ts') },
  'ai-plugins': { group: 'ai', steps: daily('ai-plugins.ts', 'ai-prompts.ts', 'ai-hooks.ts') },
  'ai-agents': { group: 'ai', steps: daily('ai-agents.ts', 'ai-frameworks.ts') },
  'ai-rules': { group: 'ai', steps: daily('ai-rules.ts', 'ai-workflows.ts') },
  // 공식 API는 AI 모델 가격(D141)도 함께 받아 매일 (가장 긴 줄보다 짧아 시간이 늘지 않는다)
  api: { group: 'api', steps: daily('api-curated.ts', 'api-public-apis.ts', 'api-kr-4kr.ts', 'api-apis-guru.ts') },
  'api-kr': { group: 'api', steps: [{ file: 'api-data-go-kr.ts', days: [MON], long: true }] },
  // oss-github은 같은 대분류의 다른 출처 파일로 겹침을 뺀다. HF·꾸러미 목록은 GitHub 저장소와 거의 겹치지 않아(겹쳐도 하루 늦게 빠짐) 따로 돈다
  'oss-hf': { group: 'oss', steps: daily('oss-hf.ts') },
  'oss-pkg': { group: 'oss', steps: on([FRI], 'oss-packages.ts') },
  oss: { group: 'oss', token: true, steps: [...daily('oss-ollama.ts', 'oss-selfhosted.ts', 'oss-awesome.ts'), ...on([SAT], 'oss-forges.ts'), ...daily('oss-github.ts')] },
  data: {
    group: 'oss',
    steps: [...daily('data-hf.ts', 'data-kaggle.ts'), ...on([TUE], 'data-worldbank.ts'), { file: 'data-go-kr.ts', days: [MON], long: true }, ...on([TUE], 'data-collections.ts')],
  },
  'data-owid': { group: 'oss', steps: [{ file: 'data-owid.ts', days: [MON], long: true }] },
  tpl: { group: 'oss', token: true, steps: on([WED], 'tpl-vercel.ts', 'tpl-official.ts', 'tpl-astro.ts', 'tpl-galleries.ts', 'tpl-github.ts') },
};

export const INDEX: Readonly<Record<Group, string>> = { design: 'design-index.ts', ai: 'ai-index.ts', api: 'api-index.ts', oss: 'oss-index.ts' };

/** 한국 시각의 요일 (0=일) */
export function kstDay(now: Date): number {
  return new Date(now.getTime() + 9 * 3_600_000).getUTCDay();
}

/** 이 단계가 day(한국 요일)에 도는가. all이면 바뀐 것만 받는 단계(--since)는 빼고 전부 */
export function runsOn(step: Step, day: number, all: boolean): boolean {
  if (all) return !step.args?.includes('--since');
  return !step.days || step.days.includes(day);
}

/** 한 줄에서 오늘 돌 단계와 쉬는 단계 */
export function planLane(lane: Lane, day: number, all: boolean): { run: Step[]; rest: Step[] } {
  const run: Step[] = [];
  const rest: Step[] = [];
  for (const s of lane.steps) (runsOn(s, day, all) ? run : rest).push(s);
  return { run, rest };
}
