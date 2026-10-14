// Claude Code Templates (aitmpl.com, davila7/claude-code-templates, MIT) 카탈로그 읽기.
// 한 파일(components.json)에 에이전트·명령·MCP·설정·훅·스킬·프로젝트 템플릿이 함께 있어서
// 소분류 스크립트(ai-skills, ai-agents, ai-mcp, ai-prompts, ai-hooks, ai-rules)가 필요한 종류만 가져다 쓴다.
import { type Item, fetchJson, log, makeItem } from './ai-lib.ts';

export const AITMPL_URL = 'https://www.aitmpl.com/components.json';
export const AITMPL_SOURCE = { name: 'Claude Code Templates (aitmpl.com)', url: 'https://www.aitmpl.com' };
export const AITMPL_LICENSE = 'MIT (davila7/claude-code-templates)';
const REPO_FILES = 'https://github.com/davila7/claude-code-templates/blob/main/cli-tool/components';

export interface AitmplComponent {
  name: string; path?: string; category?: string; type?: string; description?: string; author?: string; repo?: string;
  license?: string; keywords?: string[]; downloads?: number; installCommand?: string; id?: string; language?: string; subtype?: string;
}

export type AitmplType = 'agents' | 'commands' | 'mcps' | 'settings' | 'hooks' | 'skills' | 'templates';

// components.json의 종류 이름 → 설치 명령의 옵션 이름 (README 예시: --agent, --command, --mcp, --setting, --hook, --skill)
const FLAG: Record<AitmplType, string | undefined> = {
  agents: 'agent', commands: 'command', mcps: 'mcp', settings: 'setting', hooks: 'hook', skills: 'skill', templates: undefined,
};

let cache: Record<string, AitmplComponent[]> | undefined;

export async function loadAitmpl(): Promise<Record<string, AitmplComponent[]>> {
  if (!cache) {
    log('· Claude Code Templates (aitmpl.com/components.json)');
    cache = await fetchJson<Record<string, AitmplComponent[]>>(AITMPL_URL);
  }
  return cache;
}

export function aitmplItem(c: AitmplComponent, type: AitmplType, kind: string, sourceId: string, previewType: 'skill' | 'mcp' | 'prompt'): Item | undefined {
  if (!c.description) return undefined;
  // 프로젝트 템플릿은 path 대신 id만 있다.
  const ref = (c.path ?? c.id ?? c.name).replace(/\.(md|json)$/, '');
  const flag = FLAG[type];
  return makeItem({
    sourceId, slug: `${type}-${ref}`, name: c.name, kind, summary: c.description,
    url: type === 'templates' || !c.path ? AITMPL_SOURCE.url : `${REPO_FILES}/${type}/${c.path}`,
    source: AITMPL_SOURCE,
    license: c.license || 'MIT',
    metrics: { downloads: c.downloads },
    tags: ['claude-code', type.replace(/s$/, ''), c.category, ...(c.keywords ?? []).slice(0, 4), c.language],
    preview: { type: previewType, agent: 'claude-code', component: type.replace(/s$/, ''), category: c.category },
    use: { install: c.installCommand ?? (flag ? `npx claude-code-templates@latest --${flag} ${ref} --yes` : undefined), docs: AITMPL_SOURCE.url },
  });
}

export async function aitmplItems(type: AitmplType, kind: string, sourceId: string, previewType: 'skill' | 'mcp' | 'prompt'): Promise<{ items: Item[]; available: number }> {
  const all = await loadAitmpl();
  const list = all[type] ?? [];
  const items = list.map((c) => aitmplItem(c, type, kind, sourceId, previewType)).filter((x): x is Item => !!x);
  return { items, available: list.length };
}
