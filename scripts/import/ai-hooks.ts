// AI 확장 › 훅·설정 (코딩 에이전트가 정해진 순간에 돌리는 훅, 에이전트 설정 묶음).
// Claude Code Templates의 hooks·settings(MIT) · Awesome GitHub Copilot의 hooks(MIT)
// 실행: node scripts/import/ai-hooks.ts
import {
  type Item, checkout, cloneRepo, dedupeAcross, ensureProxy, isMain, log, makeItem, readRepoFile, repoTreeUrl, splitFrontMatter,
  str, strList, textKey, writeCatalog,
} from './ai-lib.ts';
import { AITMPL_LICENSE, aitmplItems } from './ai-aitmpl.ts';

const KIND = 'hook';

export async function fromCopilotHooks(): Promise<{ items: Item[]; available: number }> {
  log('· Awesome GitHub Copilot (hooks)');
  const repo = cloneRepo('github/awesome-copilot');
  const files = repo.files.filter((f) => /^hooks\/[^/]+\/README\.md$/.test(f));
  checkout(repo, files);
  const items: Item[] = [];
  for (const f of files) {
    const { data } = splitFrontMatter(readRepoFile(repo, f) ?? '');
    const description = str(data.description);
    if (!description) continue;
    const dir = f.replace(/\/README\.md$/, '');
    items.push(makeItem({
      sourceId: 'hook-copilot', slug: dir.split('/')[1] ?? dir, name: str(data.name) ?? dir, kind: KIND, summary: description,
      url: repoTreeUrl(repo, dir),
      source: { name: 'Awesome GitHub Copilot (hooks)', url: 'https://github.com/github/awesome-copilot' },
      license: 'MIT',
      tags: ['copilot', 'hook', ...strList(data.tags)],
      preview: { type: 'skill', agent: 'github-copilot', component: 'hook', file: `${dir}/hooks.json` },
    }));
  }
  return { items, available: files.length };
}

export async function main(): Promise<void> {
  const hooks = await aitmplItems('hooks', KIND, 'hook-aitmpl', 'skill');
  const settings = await aitmplItems('settings', KIND, 'hook-aitmpl-settings', 'skill');
  const cop = await fromCopilotHooks();
  const key = (it: Item) => textKey(it);
  const [h, s, c] = dedupeAcross([{ key, items: hooks.items }, { key, items: settings.items }, { key, items: cop.items }]);
  writeCatalog({ source: { id: 'hook-aitmpl', name: 'Claude Code Templates (hooks)', url: 'https://www.aitmpl.com', kind: KIND, license: AITMPL_LICENSE }, available: hooks.available, items: h ?? [] });
  writeCatalog({ source: { id: 'hook-aitmpl-settings', name: 'Claude Code Templates (settings)', url: 'https://www.aitmpl.com', kind: KIND, license: AITMPL_LICENSE }, available: settings.available, items: s ?? [] });
  writeCatalog({ source: { id: 'hook-copilot', name: 'Awesome GitHub Copilot (hooks)', url: 'https://github.com/github/awesome-copilot', kind: KIND, license: 'MIT' }, available: cop.available, items: c ?? [] });
  log(`훅·설정 합계: ${(h?.length ?? 0) + (s?.length ?? 0) + (c?.length ?? 0)}`);
}

if (isMain(import.meta.url)) {
  ensureProxy();
  await main();
}
