// 하네스 검사: .claude/skills/*/SKILL.md, .claude/agents/*.md, .claude/rules/*.md 앞머리(frontmatter)가 맞는지 본다.
// 에이전트가 스킬·에이전트를 새로 쓸 때 틀린 모양으로 조용히 무시되는 일을 막는다.
//   node scripts/guard/validate-harness.ts
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { ROOT } from '../lib/load-data.ts';

const errors: string[] = [];
const err = (m: string): void => {
  errors.push(m);
};

/** 아주 작은 YAML 앞머리 읽기: 최상위 `키: 값`과 `키:` 아래 `- 항목` 목록만 다룬다. */
function frontmatter(file: string): Record<string, string | string[]> | null {
  const text = readFileSync(file, 'utf8');
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---', 4);
  if (end < 0) return null;
  const out: Record<string, string | string[]> = {};
  let listKey: string | null = null;
  for (const line of text.slice(4, end).split('\n')) {
    if (/^\s+-\s+/.test(line) && listKey) {
      const v = line.replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, '');
      (out[listKey] as string[]).push(v);
      continue;
    }
    const m = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1] ?? '';
    const value = (m[2] ?? '').trim();
    if (value === '') {
      out[key] = [];
      listKey = key;
    } else {
      out[key] = value.replace(/^["']|["']$/g, '');
      listKey = null;
    }
  }
  return out;
}

const SKILL_KEYS = new Set([
  'name', 'description', 'when_to_use', 'argument-hint', 'arguments', 'disable-model-invocation', 'user-invocable',
  'allowed-tools', 'disallowed-tools', 'model', 'effort', 'context', 'agent', 'background', 'hooks', 'paths', 'shell',
  'metadata', 'license', 'compatibility',
]);
const AGENT_KEYS = new Set([
  'name', 'description', 'tools', 'disallowedTools', 'model', 'permissionMode', 'maxTurns', 'skills', 'mcpServers', 'hooks',
  'memory', 'background', 'omitClaudeMd', 'effort', 'isolation', 'color', 'initialPrompt', 'experimental',
]);

const skillsDir = join(ROOT, '.claude', 'skills');
const skillNames = new Set<string>();
if (existsSync(skillsDir)) {
  for (const name of readdirSync(skillsDir)) {
    const dir = join(skillsDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const file = join(dir, 'SKILL.md');
    const where = `.claude/skills/${name}`;
    if (!existsSync(file)) {
      err(`${where}: SKILL.md가 없다`);
      continue;
    }
    const fm = frontmatter(file);
    if (!fm) {
      err(`${where}/SKILL.md: 1줄부터 --- 앞머리가 있어야 한다`);
      continue;
    }
    skillNames.add(name);
    if (fm['name'] !== name) err(`${where}: name(${String(fm['name'])})이 폴더 이름과 같아야 한다`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) err(`${where}: 이름은 소문자·숫자·하이픈 64자 안쪽`);
    const desc = typeof fm['description'] === 'string' ? fm['description'] : '';
    if (!desc) err(`${where}: description이 없다`);
    if (desc.length > 1024) err(`${where}: description이 1024자를 넘는다 (${desc.length})`);
    if (/[<>]/.test(desc)) err(`${where}: description에 < > 를 쓰지 않는다`);
    for (const k of Object.keys(fm)) if (!SKILL_KEYS.has(k)) err(`${where}: 모르는 앞머리 필드 ${k} (조용히 무시된다)`);
    const lines = readFileSync(file, 'utf8').split('\n').length;
    if (lines > 500) err(`${where}: SKILL.md가 500줄을 넘는다 (${lines}). 참고 파일로 나눈다`);
    const hasLicense = ['LICENSE', 'LICENSE.txt'].some((f) => existsSync(join(dir, f)));
    const text = readFileSync(file, 'utf8');
    if (/출처:/.test(text) && !hasLicense) err(`${where}: 외부에서 가져온 스킬은 LICENSE를 함께 둔다`);
  }
}

const agentsDir = join(ROOT, '.claude', 'agents');
if (existsSync(agentsDir)) {
  for (const f of readdirSync(agentsDir).filter((x) => x.endsWith('.md'))) {
    const where = `.claude/agents/${f}`;
    const fm = frontmatter(join(agentsDir, f));
    if (!fm) {
      err(`${where}: 1줄부터 --- 앞머리가 있어야 한다`);
      continue;
    }
    if (fm['name'] !== basename(f, '.md')) err(`${where}: name이 파일 이름과 같아야 한다`);
    if (!fm['description']) err(`${where}: description이 없다`);
    for (const k of Object.keys(fm)) if (!AGENT_KEYS.has(k)) err(`${where}: 모르는 앞머리 필드 ${k}`);
    const skills = fm['skills'];
    if (Array.isArray(skills)) for (const s of skills) if (!skillNames.has(s)) err(`${where}: 없는 스킬 ${s}`);
  }
}

const rulesDir = join(ROOT, '.claude', 'rules');
if (existsSync(rulesDir)) {
  for (const f of readdirSync(rulesDir).filter((x) => x.endsWith('.md'))) {
    const fm = frontmatter(join(rulesDir, f));
    if (fm) for (const k of Object.keys(fm)) if (k !== 'paths') err(`.claude/rules/${f}: 규칙 앞머리는 paths만 읽힌다 (${k})`);
  }
}

if (errors.length > 0) {
  for (const e of errors) console.log(`오류  ${e}`);
  console.log(`\n하네스 검사 실패: ${errors.length}개`);
  process.exit(1);
}
console.log(`하네스 검사 통과: 스킬 ${skillNames.size}개`);
