// 매일 자료 새로 받기 (v5.1 P4, D128, .github/workflows/daily-refresh.yml): 가져오기 스크립트를 여러 줄(레인)로 나눠 함께 돌리고,
// 모두 끝나면 대분류 목차(index.json)를 다시 만든다.
//   node scripts/import/refresh-all.ts               매일 몫 (주간 몫은 월요일(KST)에만)
//   node scripts/import/refresh-all.ts design api    이름을 준 갈래만 (design·ai·api·oss)
//   REFRESH_ALL=1 node scripts/import/refresh-all.ts 주간 몫까지 모두
// 왜 이렇게: 차례로 돌리면 이 작업 환경에서 갈래마다 23~40분이 걸렸다(2026-10-20 측정). 출처 파일은 서로 다르므로
// 같은 대분류 안에서 겹침을 빼는 차례(손 목록 → 넓은 목록, 다른 출처 → oss-github·tpl-github)만 한 줄 안에 지키고 나머지는 함께 돈다.
// 느리고 잘 바뀌지 않는 출처(공공데이터포털 두 목록, Iconify 묶음 전체, OWID 차트 목록)는 주간 몫이다.
// AI 갈래는 줄마다 저장소 복제 폴더를 따로 써서(AI_IMPORT_CACHE) 같은 저장소를 함께 받다 부딪히지 않게 한다.
// 출처 하나가 실패하면 그 파일은 지난 자료 그대로 남는다. 실패는 경고로 알리고 다음 단계(단위 시험)가 판단한다. 모두 실패했을 때만 1로 끝낸다.
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
}

const s = (...files: string[]): Step[] => files.map((file) => ({ file }));
const weekly = (file: string): Step => ({ file, weekly: true });

export const LANES: Record<string, Lane> = {
  'design-type': { group: 'design', steps: s('design-fonts.ts', 'design-colors.ts', 'design-gradients.ts', 'design-styles.ts', 'design-assets.ts') },
  'design-icons': { group: 'design', steps: [weekly('design-icons.ts')] },
  'design-ui': { group: 'design', steps: s('design-ui.ts', 'design-curated.ts') },
  'ai-mcp': { group: 'ai', steps: s('ai-mcp.ts') },
  'ai-skills': { group: 'ai', steps: s('ai-skills.ts') },
  'ai-plugins': { group: 'ai', steps: s('ai-plugins.ts', 'ai-prompts.ts', 'ai-hooks.ts') },
  'ai-agents': { group: 'ai', steps: s('ai-agents.ts', 'ai-frameworks.ts') },
  'ai-rules': { group: 'ai', steps: s('ai-rules.ts', 'ai-workflows.ts') },
  api: { group: 'api', steps: s('api-curated.ts', 'api-public-apis.ts', 'api-kr-4kr.ts', 'api-apis-guru.ts') },
  'api-kr': { group: 'api', steps: [weekly('api-data-go-kr.ts')] },
  oss: { group: 'oss', steps: s('oss-hf.ts', 'oss-ollama.ts', 'oss-selfhosted.ts', 'oss-awesome.ts', 'oss-packages.ts', 'oss-forges.ts', 'oss-github.ts') },
  data: { group: 'oss', steps: [...s('data-hf.ts', 'data-kaggle.ts', 'data-worldbank.ts'), weekly('data-go-kr.ts'), ...s('data-collections.ts')] },
  'data-owid': { group: 'oss', steps: [weekly('data-owid.ts')] },
  tpl: { group: 'oss', steps: s('tpl-vercel.ts', 'tpl-official.ts', 'tpl-astro.ts', 'tpl-galleries.ts', 'tpl-github.ts') },
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
const aiCache = process.env.AI_IMPORT_CACHE ?? join(ROOT, '.cache', 'ai-import');

function runScript(file: string, log: string, env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve) => {
    const cmd = `${JSON.stringify(process.execPath)} ${JSON.stringify(join(ROOT, 'scripts', 'import', file))} >> ${JSON.stringify(log)} 2>&1`;
    const child = spawn(cmd, { shell: true, env, stdio: 'ignore' });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

async function runLane(name: string, lane: Lane): Promise<StepResult[]> {
  const log = join(logDir, `${name}.log`);
  writeFileSync(log, '');
  const env = lane.group === 'ai' ? { ...baseEnv, AI_IMPORT_CACHE: join(aiCache, name) } : baseEnv;
  const out: StepResult[] = [];
  for (const step of lane.steps) {
    if (step.weekly && !withWeekly) continue;
    const started = Date.now();
    appendFileSync(log, `\n▶ ${step.file}\n`);
    const code = await runScript(step.file, log, env);
    out.push({ lane: name, file: step.file, code, seconds: Math.round((Date.now() - started) / 1000) });
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
