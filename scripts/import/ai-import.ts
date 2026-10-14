// AI 확장 진열대 전체 가져오기: 소분류 스크립트를 차례로 돌린 뒤 색인을 만든다 (네트워크 필요).
// 실행: node scripts/import/ai-import.ts [mcp skills plugins agents rules prompts hooks frameworks workflows]
// 이름을 주면 그것만 돈다. 복제본은 운영체제 임시 폴더(AI_IMPORT_CACHE로 바꿀 수 있음)에 둔다.
import { ensureProxy, isMain } from './ai-lib.ts';

const STEPS: Record<string, () => Promise<unknown>> = {
  mcp: async () => (await import('./ai-mcp.ts')).main(),
  skills: async () => (await import('./ai-skills.ts')).main(),
  plugins: async () => (await import('./ai-plugins.ts')).main(),
  agents: async () => (await import('./ai-agents.ts')).main(),
  rules: async () => (await import('./ai-rules.ts')).main(),
  prompts: async () => (await import('./ai-prompts.ts')).main(),
  hooks: async () => (await import('./ai-hooks.ts')).main(),
  frameworks: async () => (await import('./ai-frameworks.ts')).main(),
  workflows: async () => (await import('./ai-workflows.ts')).main(),
};

if (isMain(import.meta.url)) {
  ensureProxy();
  const want = process.argv.slice(2);
  const unknown = want.filter((w) => !STEPS[w]);
  if (unknown.length) {
    console.error(`모르는 단계: ${unknown.join(', ')}. 쓸 수 있는 이름: ${Object.keys(STEPS).join(' ')}`);
    process.exit(1);
  }
  const failed: string[] = [];
  for (const [name, run] of Object.entries(STEPS)) {
    if (want.length && !want.includes(name)) continue;
    console.log(`\n=== ${name} ===`);
    try {
      await run();
    } catch (err) {
      // 한 출처가 막혀도 나머지는 계속 받는다. 실패한 단계의 파일은 지난 판이 그대로 남는다.
      console.error(`  ${name} 실패: ${err instanceof Error ? err.message : String(err)}`);
      failed.push(name);
    }
  }
  (await import('./ai-index.ts')).main();
  if (failed.length) {
    console.error(`\n실패한 단계: ${failed.join(', ')}. 네트워크를 확인하고 node scripts/import/ai-import.ts ${failed.join(' ')} 로 다시 돌린다.`);
    process.exit(1);
  }
}
