// 매일 자료 새로 받기 (v5.1 P4, D128, .github/workflows/daily-refresh.yml): 가져오기 스크립트를 여러 줄(레인)로 나눠 함께 돌리고,
// 모두 끝나면 대분류 목차(index.json)를 다시 만든다.
//   node scripts/import/refresh-all.ts               매일 몫 (주간 몫은 월요일(KST)에만)
//   node scripts/import/refresh-all.ts design api    이름을 준 갈래만 (design·ai·api·oss)
//   REFRESH_ALL=1 node scripts/import/refresh-all.ts 주간 몫까지 모두
// 왜 이렇게: 차례로 돌리면 이 작업 환경에서 갈래마다 23~40분이 걸렸다(2026-10-20 측정). 출처 파일은 서로 다르므로
// 같은 대분류 안에서 겹침을 빼는 차례(손 목록 → 넓은 목록, 다른 출처 → oss-github·tpl-github)만 한 줄 안에 지키고 나머지는 함께 돈다.
// 느리고 잘 바뀌지 않는 출처(공공데이터포털 두 목록, Iconify 묶음 전체, OWID 차트 목록, MCP 등록소 전체)는 주간 몫이다.
// AI 갈래는 줄마다 저장소 복제 폴더를 따로 써서(AI_IMPORT_CACHE) 같은 저장소를 함께 받다 부딪히지 않게 한다.
// 출처 하나가 실패하면 그 파일은 지난 자료 그대로 남는다. 실패는 경고로 알리고 다음 단계(단위 시험)가 판단한다. 모두 실패했을 때만 1로 끝낸다.
// 스크립트 하나가 REFRESH_STEP_MINUTES(기본 25분, 주간 몫은 두 배)를 넘기면 멈춘다. 가져오기는 끝에 한 번 쓰므로 멈춘 출처도 지난 자료 그대로다.
// 시작·끝 줄은 바로 찍어(작업 흐름 기록에서 어디서 오래 걸리는지 보이게) 하고, 스크립트 기록은 끝에 줄마다 묶어 보인다.
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './oss-lib.ts';

type Group = 'design' | 'ai' | 'api' | 'oss';
interface Step {
  file: string;
  weekly?: boolean;
}
interface Lane {
  group: Group;
  steps: Step[];
  /** GitHub 토큰을 넘길 줄 (주제 검색을 하는 oss-github·tpl-github). 나머지 줄은 토큰 없이 거울 서버(ecosyste.ms)로 받는다 */
  token?: boolean;
}

const s = (...files: string[]): Step[] => files.map((file) => ({ file }));
const weekly = (file: string): Step => ({ file, weekly: true });

export const LANES: Record<string, Lane> = {
  'design-type': { group: 'design', steps: s('design-fonts.ts', 'design-colors.ts', 'design-gradients.ts', 'design-styles.ts', 'design-assets.ts') },
  'design-icons': { group: 'design', steps: [weekly('design-icons.ts')] },
  'design-ui': { group: 'design', steps: s('design-ui.ts', 'design-curated.ts') },
  // 공식 MCP 등록소(4만 6천 개)는 Actions에서 쪽 넘기기가 느려 25분을 넘긴다 → 주간 몫
  'ai-mcp': { group: 'ai', steps: [weekly('ai-mcp.ts')] },
  'ai-skills': { group: 'ai', steps: s('ai-skills.ts') },
  'ai-plugins': { group: 'ai', steps: s('ai-plugins.ts', 'ai-prompts.ts', 'ai-hooks.ts') },
  'ai-agents': { group: 'ai', steps: s('ai-agents.ts', 'ai-frameworks.ts') },
  'ai-rules': { group: 'ai', steps: s('ai-rules.ts', 'ai-workflows.ts') },
  api: { group: 'api', steps: s('api-curated.ts', 'api-public-apis.ts', 'api-kr-4kr.ts', 'api-apis-guru.ts') },
  'api-kr': { group: 'api', steps: [weekly('api-data-go-kr.ts')] },
  // oss-github은 같은 대분류의 다른 출처 파일로 겹침을 뺀다. HF·꾸러미 목록은 GitHub 저장소와 거의 겹치지 않아(겹쳐도 하루 늦게 빠짐) 따로 돈다
  'oss-hf': { group: 'oss', steps: s('oss-hf.ts') },
  'oss-pkg': { group: 'oss', steps: s('oss-packages.ts') },
  oss: { group: 'oss', token: true, steps: s('oss-ollama.ts', 'oss-selfhosted.ts', 'oss-awesome.ts', 'oss-forges.ts', 'oss-github.ts') },
  data: { group: 'oss', steps: [...s('data-hf.ts', 'data-kaggle.ts', 'data-worldbank.ts'), weekly('data-go-kr.ts'), ...s('data-collections.ts')] },
  'data-owid': { group: 'oss', steps: [weekly('data-owid.ts')] },
  tpl: { group: 'oss', token: true, steps: s('tpl-vercel.ts', 'tpl-official.ts', 'tpl-astro.ts', 'tpl-galleries.ts', 'tpl-github.ts') },
};

const INDEX: Record<Group, string> = { design: 'design-index.ts', ai: 'ai-index.ts', api: 'api-index.ts', oss: 'oss-index.ts' };

/** 주간 몫을 도는 날: 한국 시각 월요일 */
export function isWeeklyDay(now: Date): boolean {
  return new Date(now.getTime() + 9 * 3_600_000).getUTCDay() === 1;
}

interface StepResult {
  lane: string;
  file: string;
  code: number;
  seconds: number;
}

const groups = process.argv.slice(2);
const unknown = groups.filter((g) => !(g in INDEX));
if (unknown.length) {
  console.error(`모르는 갈래: ${unknown.join(', ')}. 쓸 수 있는 이름: ${Object.keys(INDEX).join(' ')}`);
  process.exit(1);
}
const wantGroup = (g: Group) => groups.length === 0 || groups.includes(g);
const withWeekly = process.env.REFRESH_ALL === '1' || isWeeklyDay(new Date());
const logDir = join(ROOT, '.cache', 'refresh');
mkdirSync(logDir, { recursive: true });
const baseEnv = { ...process.env, ...(process.env.HTTPS_PROXY || process.env.https_proxy ? { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } : {}) };
// 토큰이 있으면 디자인·AI 가져오기는 저장소마다 gh CLI를 차례로 불러(동시 요청 없음) 시간당 1,000회 한도를 다 쓰고 느려진다
// (첫 Actions 실행에서 45분 넘게 걸림). 그래서 토큰은 주제 검색 줄에만 준다.
const noTokenEnv: NodeJS.ProcessEnv = { ...baseEnv };
delete noTokenEnv.GITHUB_TOKEN;
delete noTokenEnv.GH_TOKEN;
const aiCache = process.env.AI_IMPORT_CACHE ?? join(ROOT, '.cache', 'ai-import');

const stepLimitMs = (Number(process.env.REFRESH_STEP_MINUTES) || 25) * 60_000;

function runScript(file: string, log: string, env: NodeJS.ProcessEnv, limitMs: number = stepLimitMs): Promise<number> {
  return new Promise((resolve) => {
    const cmd = `exec ${JSON.stringify(process.execPath)} ${JSON.stringify(join(ROOT, 'scripts', 'import', file))} >> ${JSON.stringify(log)} 2>&1`;
    const child = spawn(cmd, { shell: true, env, stdio: 'ignore', detached: true });
    const timer = setTimeout(() => {
      appendFileSync(log, `\n✗ ${file}: ${Math.round(limitMs / 60_000)}분을 넘겨 멈췄다 (지난 자료 그대로)\n`);
      try {
        if (child.pid) process.kill(-child.pid, 'SIGTERM');
      } catch {
        // 이미 끝났다
      }
    }, limitMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code ?? 1);
    });
  });
}

async function runLane(name: string, lane: Lane): Promise<StepResult[]> {
  const log = join(logDir, `${name}.log`);
  writeFileSync(log, '');
  const own = lane.token ? baseEnv : noTokenEnv;
  const env = lane.group === 'ai' ? { ...own, AI_IMPORT_CACHE: join(aiCache, name) } : own;
  const out: StepResult[] = [];
  for (const step of lane.steps) {
    if (step.weekly && !withWeekly) continue;
    const started = Date.now();
    appendFileSync(log, `\n▶ ${step.file}\n`);
    console.log(`▶ ${name} ${step.file}`);
    const code = await runScript(step.file, log, env, step.weekly ? stepLimitMs * 2 : stepLimitMs);
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(`${code === 0 ? '✓' : '✗'} ${name} ${step.file} ${seconds}초`);
    out.push({ lane: name, file: step.file, code, seconds });
  }
  return out;
}

const started = Date.now();
const lanes = Object.entries(LANES).filter(([, l]) => wantGroup(l.group));
console.log(`줄 ${lanes.length}개를 함께 돈다${withWeekly ? ' (주간 몫 포함)' : ' (주간 몫은 월요일에)'}.`);
const results = (await Promise.all(lanes.map(([n, l]) => runLane(n, l)))).flat();
const indexLog = join(logDir, 'index.log');
writeFileSync(indexLog, '');
for (const g of Object.keys(INDEX) as Group[]) {
  if (!wantGroup(g)) continue;
  const t = Date.now();
  const code = await runScript(INDEX[g], indexLog, baseEnv);
  results.push({ lane: 'index', file: INDEX[g], code, seconds: Math.round((Date.now() - t) / 1000) });
}

const inActions = process.env.GITHUB_ACTIONS === 'true';
for (const [name] of [...lanes, ['index']]) {
  const text = readFileSync(join(logDir, `${name}.log`), 'utf8');
  if (inActions) console.log(`::group::${name}`);
  else console.log(`\n=== ${name} ===`);
  console.log(text.split('\n').slice(-40).join('\n'));
  if (inActions) console.log('::endgroup::');
}
for (const r of results) console.log(`${r.code === 0 ? '✓' : '✗'} ${r.lane.padEnd(12)} ${r.file.padEnd(22)} ${String(r.seconds).padStart(5)}초`);
const failed = results.filter((r) => r.code !== 0);
for (const r of failed) console.log(`${inActions ? '::warning::' : ''}${r.file} 실패 (코드 ${r.code}). 그 출처는 지난 자료 그대로다 (.cache/refresh/${r.lane}.log).`);
console.log(`모두 ${Math.round((Date.now() - started) / 1000)}초`);
process.exit(results.length > 0 && failed.length === results.length ? 1 : 0);
