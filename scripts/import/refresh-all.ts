// 매일 자료 새로 받기 (v5.1 P4, D128, D143, .github/workflows/daily-refresh.yml): 가져오기 스크립트를 여러 줄(레인)로 나눠 함께 돌리고,
// 모두 끝나면 대분류 목차(index.json)를 다시 만든다.
//   node scripts/import/refresh-all.ts               오늘(한국 시각 요일) 차례인 단계만
//   node scripts/import/refresh-all.ts design api    이름을 준 갈래(design·ai·api·oss)나 줄(oss-hf …)만
//   REFRESH_ALL=1 node scripts/import/refresh-all.ts 요일과 상관없이 모두 (MCP 등록소는 전체)
//   REFRESH_DAY=3 node scripts/import/refresh-all.ts 그 요일(0=일 … 6=토)인 것처럼
// 줄과 받는 날은 scripts/lib/refresh-plan.ts (잰 변화량으로 정했다, D143). 출처 파일 쓰기는 '뜻 있게 바뀌었을 때만'(stable-write.ts).
// 왜 줄로 나누나: 차례로 돌리면 이 작업 환경에서 갈래마다 23~40분이 걸렸다(2026-10-20 측정). 출처 파일은 서로 다르므로
// 같은 대분류 안에서 겹침을 빼는 차례만 한 줄 안에 지키고 나머지는 함께 돈다.
// AI 갈래는 줄마다 저장소 복제 폴더를 따로 써서(AI_IMPORT_CACHE) 같은 저장소를 함께 받다 부딪히지 않게 한다.
// 출처 하나가 실패하면 그 파일은 지난 자료 그대로 남는다. 실패는 경고로 알리고 다음 단계(단위 시험)가 판단한다. 모두 실패했을 때만 1로 끝낸다.
// 스크립트 하나가 REFRESH_STEP_MINUTES(기본 25분, 긴 단계는 두 배)를 넘기면 멈춘다. 가져오기는 끝에 한 번 쓰므로 멈춘 출처도 지난 자료 그대로다.
// 끝나면 .cache/refresh/results.json에 단계마다 결과를 남긴다 (refresh-summary.ts가 요약에 쓴다).
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { INDEX, LANES, kstDay, planLane, type Group, type Lane, type Step } from '../lib/refresh-plan.ts';
import { ROOT } from './oss-lib.ts';

interface StepResult {
  lane: string;
  file: string;
  args?: readonly string[];
  code: number;
  seconds: number;
}

const groups = process.argv.slice(2);
const unknown = groups.filter((g) => !(g in INDEX) && !(g in LANES));
if (unknown.length) {
  console.error(`모르는 갈래·줄: ${unknown.join(', ')}. 쓸 수 있는 이름: ${[...Object.keys(INDEX), ...Object.keys(LANES)].join(' ')}`);
  process.exit(1);
}
const wantLane = (name: string, lane: Lane) => groups.length === 0 || groups.includes(lane.group) || groups.includes(name);
const wantGroup = (g: Group) => Object.entries(LANES).some(([n, l]) => l.group === g && wantLane(n, l));
const all = process.env.REFRESH_ALL === '1';
const forcedDay = process.env.REFRESH_DAY;
const day = forcedDay !== undefined && /^[0-6]$/.test(forcedDay) ? Number(forcedDay) : kstDay(new Date());
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
const label = (s: Step): string => [s.file, ...(s.args ?? [])].join(' ');

function runScript(step: Step, log: string, env: NodeJS.ProcessEnv, limitMs: number = stepLimitMs): Promise<number> {
  return new Promise((resolve) => {
    const argv = [process.execPath, join(ROOT, 'scripts', 'import', step.file), ...(step.args ?? [])].map((a) => JSON.stringify(a)).join(' ');
    const cmd = `exec ${argv} >> ${JSON.stringify(log)} 2>&1`;
    const child = spawn(cmd, { shell: true, env, stdio: 'ignore', detached: true });
    const timer = setTimeout(() => {
      appendFileSync(log, `\n✗ ${label(step)}: ${Math.round(limitMs / 60_000)}분을 넘겨 멈췄다 (지난 자료 그대로)\n`);
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

async function runLane(name: string, lane: Lane, steps: readonly Step[]): Promise<StepResult[]> {
  const log = join(logDir, `${name}.log`);
  writeFileSync(log, '');
  const own = lane.token ? baseEnv : noTokenEnv;
  const env = lane.group === 'ai' ? { ...own, AI_IMPORT_CACHE: join(aiCache, name) } : own;
  const out: StepResult[] = [];
  for (const step of steps) {
    const started = Date.now();
    appendFileSync(log, `\n▶ ${label(step)}\n`);
    console.log(`▶ ${name} ${label(step)}`);
    const code = await runScript(step, log, env, step.long ? stepLimitMs * 2 : stepLimitMs);
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(`${code === 0 ? '✓' : '✗'} ${name} ${label(step)} ${seconds}초`);
    out.push({ lane: name, file: step.file, ...(step.args ? { args: step.args } : {}), code, seconds });
  }
  return out;
}

const started = Date.now();
const plans = Object.entries(LANES)
  .filter(([n, l]) => wantLane(n, l))
  .map(([name, lane]) => ({ name, lane, ...planLane(lane, day, all) }));
const lanes = plans.filter((p) => p.run.length > 0);
const resting = plans.flatMap((p) => p.rest.map((s) => ({ lane: p.name, file: s.file, ...(s.args ? { args: s.args } : {}), days: [...(s.days ?? [])] })));
console.log(`줄 ${lanes.length}개를 함께 돈다 (한국 시각 ${'일월화수목금토'[day]}요일${all ? ', 모두' : ''}). 오늘 쉬는 단계 ${resting.length}개.`);
const results = (await Promise.all(lanes.map((p) => runLane(p.name, p.lane, p.run)))).flat();
const indexLog = join(logDir, 'index.log');
writeFileSync(indexLog, '');
for (const g of Object.keys(INDEX) as Group[]) {
  if (!wantGroup(g)) continue;
  const t = Date.now();
  const step: Step = { file: INDEX[g] };
  const code = await runScript(step, indexLog, baseEnv);
  results.push({ lane: 'index', file: step.file, code, seconds: Math.round((Date.now() - t) / 1000) });
}

const inActions = process.env.GITHUB_ACTIONS === 'true';
for (const name of [...lanes.map((p) => p.name), 'index']) {
  const text = readFileSync(join(logDir, `${name}.log`), 'utf8');
  if (inActions) console.log(`::group::${name}`);
  else console.log(`\n=== ${name} ===`);
  console.log(text.split('\n').slice(-60).join('\n'));
  if (inActions) console.log('::endgroup::');
}
const show = (r: StepResult) => [r.file, ...(r.args ?? [])].join(' ');
for (const r of results) console.log(`${r.code === 0 ? '✓' : '✗'} ${r.lane.padEnd(12)} ${show(r).padEnd(44)} ${String(r.seconds).padStart(5)}초`);
const failed = results.filter((r) => r.code !== 0);
for (const r of failed) console.log(`${inActions ? '::warning::' : ''}${show(r)} 실패 (코드 ${r.code}). 그 출처는 지난 자료 그대로다 (.cache/refresh/${r.lane}.log).`);
const seconds = Math.round((Date.now() - started) / 1000);
console.log(`모두 ${seconds}초`);
writeFileSync(join(logDir, 'results.json'), `${JSON.stringify({ seconds, kstDay: day, steps: results, resting }, null, 2)}\n`);
process.exit(results.length > 0 && failed.length === results.length ? 1 : 0);
