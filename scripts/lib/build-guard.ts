// 빌드 지킴 (설계서 8.1 L-04·9.4절, D81): astro.config.mjs의 작은 통합(integration)이 부른다. 그래서 npm run build·build:cf 모두 걸린다.
//   - 늘: PUBLIC_BASE_PATH 꼴(/로 시작, 끝 빗금 없음, 영문 소문자·숫자·- 마디), PUBLIC_HOST 값(cloudflare | static)
//   - 정식(PUBLIC_STAGE=release) 빌드만: PUBLIC_SITE_URL이 비었거나 example을 품음, PUBLIC_CONTACT_EMAIL이 빔,
//     빌드 결과(dist/)에 예시 주소·초안 표시('codechauffeur.example' · '(초안)' · '검토 중인 초안')가 남음
// 실패는 한국어 한 줄로 알린다. 판단은 순수 함수이고, 파일을 읽는 것은 scanBuild 하나뿐이다 (시험: tests/build-guard.test.ts).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

export interface BuildEnv {
  PUBLIC_STAGE?: string;
  PUBLIC_SITE_URL?: string;
  PUBLIC_CONTACT_EMAIL?: string;
  PUBLIC_BASE_PATH?: string;
  PUBLIC_HOST?: string;
}

/** 정식 빌드 결과에 남으면 안 되는 글자: 예시 사이트 주소, 법 문서 초안 표시 */
export const RELEASE_FORBIDDEN = ['codechauffeur.example', '(초안)', '검토 중인 초안'] as const;

/** 주소 바탕 꼴. 비었으면 기본 '/'라 괜찮다 */
export function basePathProblem(raw: string | undefined): string | null {
  const v = raw ?? '';
  if (v === '' || v === '/') return null;
  if (!v.startsWith('/')) return `PUBLIC_BASE_PATH는 /로 시작해야 해요 (지금 '${v}'). 예: /code-chauffeur`;
  if (v.endsWith('/')) return `PUBLIC_BASE_PATH 끝에 /를 붙이지 않아요 (지금 '${v}'). 예: /code-chauffeur`;
  if (!/^(\/[a-z0-9-]+)+$/.test(v)) return `PUBLIC_BASE_PATH에는 영문 소문자·숫자·-만 써요 (지금 '${v}'). 예: /code-chauffeur`;
  return null;
}

/** 호스트 종류. 비었으면 기본 cloudflare */
export function hostProblem(raw: string | undefined): string | null {
  const v = raw ?? '';
  return v === '' || v === 'cloudflare' || v === 'static' ? null : `PUBLIC_HOST는 cloudflare나 static만 돼요 (지금 '${v}')`;
}

/** 정식 빌드의 빌드 변수 문제 (미리 보기면 늘 빈 목록) */
export function releaseEnvProblems(env: BuildEnv): string[] {
  if (env.PUBLIC_STAGE !== 'release') return [];
  const out: string[] = [];
  const site = (env.PUBLIC_SITE_URL ?? '').trim();
  if (site === '') out.push('정식 빌드인데 PUBLIC_SITE_URL(사이트 주소)이 비어 있어요. 실제 주소를 넣으세요 (docs/DEPLOY.md 7단계)');
  else if (site.toLowerCase().includes('example')) out.push(`정식 빌드인데 PUBLIC_SITE_URL이 예시 주소예요 (${site}). 실제 주소를 넣으세요`);
  if ((env.PUBLIC_CONTACT_EMAIL ?? '').trim() === '') out.push('정식 빌드인데 PUBLIC_CONTACT_EMAIL(연락 메일 주소)이 비어 있어요. 받을 주소를 넣으세요 (HUMAN H22)');
  return out;
}

/** 빌드를 시작하기 전에 볼 문제 전부 (주소 바탕·호스트는 늘, 나머지는 정식만) */
export function envProblems(env: BuildEnv): string[] {
  return [basePathProblem(env.PUBLIC_BASE_PATH), hostProblem(env.PUBLIC_HOST), ...releaseEnvProblems(env)].filter((x): x is string => x !== null);
}

export interface BuildFile {
  /** 빌드 폴더 기준 경로 */
  path: string;
  text: string;
}

export interface ForbiddenHit {
  word: string;
  files: string[];
}

/** 빌드 결과 글에 남은 금지 글자. 글자마다 남은 파일 목록 */
export function forbiddenHits(files: readonly BuildFile[], words: readonly string[] = RELEASE_FORBIDDEN): ForbiddenHit[] {
  const out: ForbiddenHit[] = [];
  for (const word of words) {
    const where = files.filter((f) => f.text.includes(word)).map((f) => f.path);
    if (where.length > 0) out.push({ word, files: where });
  }
  return out;
}

/** 문제 여럿을 한 줄로 */
export function oneLine(problems: readonly string[]): string {
  return `빌드를 멈췄어요: ${problems.join(' / ')}`;
}

/** 금지 글자마다 고치는 법 */
const FIX: Record<string, string> = {
  'codechauffeur.example': 'PUBLIC_SITE_URL에 실제 주소를 넣으세요',
  '(초안)': '법 문서 최종 문구를 넣으세요 (HUMAN H04)',
  '검토 중인 초안': '법 문서 최종 문구를 넣으세요 (HUMAN H04)',
};

/** 금지 글자 문제를 짧은 문장으로 (파일은 첫 곳과 개수만) */
export function hitProblem(h: ForbiddenHit): string {
  const more = h.files.length > 1 ? ` 외 ${h.files.length - 1}곳` : '';
  // 사람이 열어 볼 수 있는 화면(HTML)을 먼저 보여 준다
  const first = h.files.find((f) => f.endsWith('.html')) ?? h.files[0] ?? '';
  const fix = FIX[h.word];
  return `정식 빌드 결과에 '${h.word}' 글자가 남았어요 (${first}${more})${fix ? `. ${fix}` : ''}`;
}

const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.txt', '.xml', '.webmanifest', '.svg']);

/** 빌드 폴더의 글 파일을 모두 읽는다. 진열대 자료 JSON(맨 위 catalog/, 300MB 남짓)은 화면 문구가 아니라서 건너뛴다 (D103) */
export function readBuild(dir: string): BuildFile[] {
  const out: BuildFile[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (d === dir && name === 'catalog') continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (TEXT_EXT.has(extname(p))) out.push({ path: relative(dir, p).split('\\').join('/'), text: readFileSync(p, 'utf8') });
    }
  };
  walk(dir);
  return out;
}

/** 정식 빌드의 결과 검사. 문제가 없으면 null, 있으면 한 줄 */
export function scanBuild(dir: string, env: BuildEnv): string | null {
  if (env.PUBLIC_STAGE !== 'release') return null;
  const hits = forbiddenHits(readBuild(dir));
  return hits.length === 0 ? null : oneLine(hits.map(hitProblem));
}
