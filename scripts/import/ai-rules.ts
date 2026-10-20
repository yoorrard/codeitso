// AI 확장 › 규칙·지침 파일 (AGENTS.md, CLAUDE.md, Cursor 규칙, Copilot 지침 …).
// 1) 형식 안내(코드잇소가 쓴 글, 공식 문서 주소로 확인한 사실만) 2) 공개 규칙 모음 저장소에서 직접 읽은 템플릿.
// 실행: node scripts/import/ai-rules.ts
import {
  type Item, checkout, cloneRepo, ensureProxy, isMain, log, makeItem, readRepoFile, repoMeta, repoTreeUrl,
  splitFrontMatter, str, strList, writeCatalog,
} from './ai-lib.ts';
import { AITMPL_LICENSE, aitmplItems } from './ai-aitmpl.ts';

const KIND = 'rules';

// ---------- 1. 형식 안내 (손으로 씀) ----------
// 파일 이름과 읽는 도구는 각 공식 문서에서 확인했다 (2026-10-14). 설명은 코드잇소가 쓴 한국어 한 줄.

export interface RuleFormat {
  slug: string; name: string; file: string; tools: string[]; docs: string; ko: string; tags: string[];
}

export const FORMATS: RuleFormat[] = [
  { slug: 'agents-md', name: 'AGENTS.md', file: 'AGENTS.md', tools: ['Codex', 'Cursor', 'GitHub Copilot', 'Kiro', 'OpenCode', 'Windsurf'], docs: 'https://agents.md/',
    ko: '여러 코딩 에이전트가 함께 읽는 공개 형식의 지침 파일이다. 저장소 맨 위에 두고 빌드·시험 명령, 코드 규칙, 주의할 점을 적는다.', tags: ['open-format', 'cross-agent'] },
  { slug: 'claude-md', name: 'CLAUDE.md', file: 'CLAUDE.md', tools: ['Claude Code'], docs: 'https://code.claude.com/docs/en/memory',
    ko: 'Claude Code가 세션을 시작할 때 읽는 기억 파일이다. 프로젝트 맨 위나 하위 폴더에 두고 명령, 구조, 지킬 규칙을 적는다.', tags: ['claude'] },
  { slug: 'gemini-md', name: 'GEMINI.md', file: 'GEMINI.md', tools: ['Gemini CLI'], docs: 'https://geminicli.com/docs/cli/gemini-md/',
    ko: 'Gemini CLI가 맥락으로 읽는 지침 파일이다. 프로젝트와 상위 폴더의 GEMINI.md를 모아 모델에 넘긴다.', tags: ['gemini'] },
  { slug: 'copilot-instructions', name: 'Copilot repository instructions', file: '.github/copilot-instructions.md', tools: ['GitHub Copilot'],
    docs: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
    ko: 'GitHub Copilot이 저장소 전체에 적용하는 지침 파일이다. 경로별 지침은 .github/instructions/*.instructions.md에 applyTo와 함께 둔다.', tags: ['copilot'] },
  { slug: 'cursor-rules', name: 'Cursor Project Rules', file: '.cursor/rules/*.mdc', tools: ['Cursor'], docs: 'https://cursor.com/docs/context/rules',
    ko: 'Cursor가 읽는 프로젝트 규칙이다. .cursor/rules 폴더에 머리말(description·globs·alwaysApply)이 있는 .mdc 파일로 둔다.', tags: ['cursor', 'mdc'] },
  { slug: 'windsurf-rules', name: 'Windsurf / Devin Desktop Rules', file: '.devin/rules/*.md (.windsurf/rules/*.md)', tools: ['Windsurf', 'Devin Desktop'], docs: 'https://docs.devin.ai/desktop/cascade/memories',
    ko: 'Cascade가 읽는 작업 공간 규칙이다. 규칙 하나를 파일 하나로 .devin/rules에 두고, 예전 위치인 .windsurf/rules도 읽는다.', tags: ['windsurf'] },
  { slug: 'clinerules', name: 'Cline Rules', file: '.clinerules', tools: ['Cline'], docs: 'https://docs.cline.bot/customization/cline-rules',
    ko: 'Cline이 읽는 프로젝트 규칙이다. .clinerules 파일이나 폴더에 마크다운으로 적는다.', tags: ['cline'] },
  { slug: 'kiro-steering', name: 'Kiro Steering', file: '.kiro/steering/*.md', tools: ['Kiro'], docs: 'https://kiro.dev/docs/steering/',
    ko: 'Kiro가 읽는 안내(steering) 파일이다. .kiro/steering 폴더에 제품·기술·구조 같은 주제별 마크다운을 둔다.', tags: ['kiro'] },
  { slug: 'roo-rules', name: 'Roo Code Rules', file: '.roo/rules/', tools: ['Roo Code'], docs: 'https://roocodeinc.github.io/Roo-Code/features/custom-instructions/',
    ko: 'Roo Code가 읽는 사용자 지침이다. .roo/rules 폴더에 마크다운 파일로 두고, 모드별 폴더도 쓸 수 있다.', tags: ['roo-code'] },
  { slug: 'aider-conventions', name: 'Aider CONVENTIONS.md', file: 'CONVENTIONS.md', tools: ['Aider'], docs: 'https://aider.chat/docs/usage/conventions.html',
    ko: 'Aider에게 코드 규칙을 알려 주는 파일이다. 읽기 전용으로 불러와 대화마다 참고하게 한다.', tags: ['aider'] },
  { slug: 'continue-rules', name: 'Continue Rules', file: '.continue/rules/', tools: ['Continue'], docs: 'https://docs.continue.dev/customize/deep-dives/rules',
    ko: 'Continue가 읽는 규칙이다. .continue/rules 폴더에 마크다운 파일로 둔다.', tags: ['continue'] },
  { slug: 'opencode-rules', name: 'OpenCode Rules', file: 'AGENTS.md', tools: ['OpenCode'], docs: 'https://opencode.ai/docs/rules/',
    ko: 'OpenCode는 프로젝트의 AGENTS.md를 규칙으로 읽는다.', tags: ['opencode', 'agents-md'] },
  { slug: 'augment-rules', name: 'Augment Rules', file: '.augment/rules/', tools: ['Augment Code'], docs: 'https://docs.augmentcode.com/setup-augment/guidelines',
    ko: 'Augment Code가 읽는 규칙이다. .augment/rules 폴더에 두며, 예전 .augment-guidelines 파일도 문서에 나온다.', tags: ['augment'] },
  { slug: 'codex-agents-md', name: 'Codex AGENTS.md', file: 'AGENTS.md', tools: ['Codex'], docs: 'https://learn.chatgpt.com/docs/agent-configuration/agents-md',
    ko: 'Codex가 작업 전에 읽는 AGENTS.md 사용법이다. 전역·프로젝트·하위 폴더 파일을 겹쳐 읽는다.', tags: ['codex', 'openai', 'agents-md'] },
];

export function formatItems(): Item[] {
  return FORMATS.map((f) => makeItem({
    sourceId: 'rules-format', slug: f.slug, name: f.name, kind: KIND, summary: f.ko, summaryKo: f.ko, written: 'codeshopper',
    url: f.docs,
    source: { name: '코드잇소 정리 (공식 문서 기준)', url: f.docs },
    tags: ['format', ...f.tags, ...f.tools],
    preview: { type: 'prompt', file: f.file, tools: f.tools },
    use: { docs: f.docs },
  }));
}

// ---------- 2. 규칙 모음 저장소 ----------

interface RuleRepo {
  id: string; slug: string; name: string; match: RegExp; license: string; tool: string; fileHint: (p: string) => string;
  names?: (readme: string) => Map<string, { name: string; desc: string }>;
}

// awesome-cursorrules README의 "- [이름](…/rules/x.mdc) - 설명" 줄
export function cursorrulesNames(readme: string): Map<string, { name: string; desc: string }> {
  const out = new Map<string, { name: string; desc: string }>();
  for (const m of readme.matchAll(/^\s*- \[([^\]]+)\]\([^)]*\/(rules\/[^)]+\.mdc)\)\s*-\s*(.+)$/gm)) {
    if (m[1] && m[2] && m[3]) out.set(decodeURIComponent(m[2]), { name: m[1].trim(), desc: m[3].trim() });
  }
  return out;
}

export const RULE_REPOS: RuleRepo[] = [
  { id: 'rules-copilot', slug: 'github/awesome-copilot', name: 'Awesome GitHub Copilot (instructions)', match: /^instructions\/[^/]+\.instructions\.md$/, license: 'MIT', tool: 'github-copilot',
    fileHint: (p) => `.github/instructions/${p.split('/').pop()}` },
  { id: 'rules-cursorrules', slug: 'PatrickJS/awesome-cursorrules', name: 'Awesome CursorRules', match: /^rules\/[^/]+\.mdc$/, license: 'CC0-1.0', tool: 'cursor',
    fileHint: (p) => `.cursor/rules/${p.split('/').pop()}`, names: cursorrulesNames },
  { id: 'rules-cursor-mdc', slug: 'sanjeed5/awesome-cursor-rules-mdc', name: 'Awesome Cursor Rules MDC', match: /^rules-mdc\/[^/]+\.mdc$/, license: 'CC0-1.0', tool: 'cursor',
    fileHint: (p) => `.cursor/rules/${p.split('/').pop()}` },
];

export async function fromRuleRepo(cfg: RuleRepo): Promise<{ items: Item[]; available: number }> {
  log(`· ${cfg.name} (${cfg.slug})`);
  const repo = cloneRepo(cfg.slug, ['README.md']);
  const meta = await repoMeta(cfg.slug);
  const names = cfg.names?.(readRepoFile(repo, 'README.md') ?? '') ?? new Map();
  const paths = repo.files.filter((f) => cfg.match.test(f));
  checkout(repo, paths);
  const items: Item[] = [];
  for (const p of paths) {
    const text = readRepoFile(repo, p);
    if (!text) continue;
    const { data, body } = splitFrontMatter(text);
    const base = (p.split('/').pop() ?? p).replace(/\.(instructions\.md|mdc)$/, '');
    const named = names.get(p);
    const desc = str(data.description) ?? named?.desc ?? body.split('\n').find((l) => l.trim() && !l.startsWith('#'));
    if (!desc) continue;
    const globs = str(data.globs) ?? str(data.applyTo);
    items.push(makeItem({
      sourceId: cfg.id, slug: base, name: named?.name ?? str(data.name) ?? base.replace(/-cursorrules-prompt-file$/, '').replace(/[-_]+/g, ' '),
      kind: KIND, summary: named?.desc ?? desc, url: repoTreeUrl(repo, p, 'blob'),
      source: { name: cfg.name, url: `https://github.com/${cfg.slug}` },
      license: cfg.license,
      // 별은 모음 저장소 전체의 값이라 metrics에 넣지 않는다.
      metrics: { updatedAt: meta?.pushedAt },
      tags: [cfg.tool, ...strList(data.tags), ...base.replace(/-cursorrules-prompt-file$/, '').split(/[-_]/).filter((w) => w.length > 2).slice(0, 4)],
      preview: { type: 'prompt', tool: cfg.tool, file: cfg.fileHint(p), applyTo: globs, raw: `https://raw.githubusercontent.com/${cfg.slug}/${repo.branch}/${p}`, repoStars: meta?.stars },
    }));
  }
  return { items, available: paths.length };
}

export async function main(): Promise<void> {
  const formats = formatItems();
  writeCatalog({
    source: { id: 'rules-format', name: '코드잇소 정리: 지침 파일 형식', url: 'https://agents.md/', kind: KIND, license: '코드잇소가 쓴 설명 (사실은 각 공식 문서 기준)', note: 'written: codeshopper' },
    available: formats.length, items: formats,
  });
  let total = formats.length;
  for (const cfg of RULE_REPOS) {
    const r = await fromRuleRepo(cfg);
    writeCatalog({ source: { id: cfg.id, name: cfg.name, url: `https://github.com/${cfg.slug}`, kind: KIND, license: cfg.license }, available: r.available, items: r.items });
    total += r.items.length;
  }
  const tmpl = await aitmplItems('templates', KIND, 'rules-aitmpl', 'prompt');
  writeCatalog({ source: { id: 'rules-aitmpl', name: 'Claude Code Templates (project templates)', url: 'https://www.aitmpl.com', kind: KIND, license: AITMPL_LICENSE, note: '프레임워크별 CLAUDE.md·설정 묶음' }, available: tmpl.available, items: tmpl.items });
  total += tmpl.items.length;
  log(`규칙 합계: ${total}`);
}

if (isMain(import.meta.url)) {
  ensureProxy();
  await main();
}

