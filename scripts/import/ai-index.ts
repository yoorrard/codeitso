// AI 확장 진열대 색인 만들기: data/catalog/ai/*.json을 읽어 소분류별 개수와 출처를 index.json에 적는다.
// 네트워크를 쓰지 않는다. 실행: node scripts/import/ai-index.ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { type CatalogFile, FETCHED_AT, OUT_DIR, ROOT, isMain, sortKeys } from './ai-lib.ts';

export const SUBCATEGORIES: { id: string; nameKo: string; descKo: string }[] = [
  { id: 'skill', nameKo: '에이전트 스킬', descKo: 'SKILL.md 한 폴더로 된 능력 묶음. Claude Code·Codex·Copilot 같은 에이전트가 필요할 때 불러 쓴다.' },
  { id: 'mcp', nameKo: 'MCP 서버', descKo: 'AI 에이전트에 도구와 자료를 이어 주는 MCP(Model Context Protocol) 서버.' },
  { id: 'plugin', nameKo: '플러그인·확장', descKo: '스킬·명령·에이전트·MCP 설정을 한데 묶어 한 번에 설치하는 코딩 에이전트 플러그인과 확장.' },
  { id: 'subagent', nameKo: '서브에이전트', descKo: '역할 하나를 맡기는 에이전트 정의 파일(.md). Claude Code 서브에이전트, Copilot 사용자 에이전트.' },
  { id: 'rules', nameKo: '규칙·지침 파일', descKo: 'AGENTS.md·CLAUDE.md·Cursor 규칙처럼 에이전트가 늘 읽는 프로젝트 지침과 그 템플릿.' },
  { id: 'prompt', nameKo: '프롬프트', descKo: '공개 라이선스로 풀린 프롬프트, 시스템 프롬프트, 슬래시 명령 모음.' },
  { id: 'hook', nameKo: '훅·설정', descKo: '코딩 에이전트가 정해진 순간(도구 실행 전후, 세션 시작·끝)에 돌리는 훅과 에이전트 설정 묶음.' },
  { id: 'framework', nameKo: '프레임워크·SDK', descKo: 'AI 에이전트·앱을 만드는 프레임워크, AI 회사 공식 SDK, MCP·A2A SDK, 평가·기억·로컬 실행 도구.' },
  { id: 'workflow', nameKo: '워크플로 템플릿', descKo: 'n8n·Activepieces·Flowise·Langflow·GitHub Agentic Workflows에서 가져다 쓰는 자동화·AI 흐름 템플릿.' },
];

export interface IndexFile {
  category: 'ai';
  nameKo: string;
  fetchedAt: string;
  count: number;
  subcategories: {
    id: string; nameKo: string; descKo: string; count: number;
    sources: { id: string; name: string; url: string; file: string; count: number; available: number; cut?: string; license: string }[];
  }[];
}

export function buildIndex(files: { file: string; data: CatalogFile }[], fetchedAt = FETCHED_AT): IndexFile {
  const subs = SUBCATEGORIES.map((s) => {
    const sources = files
      .filter((f) => f.data.source.kind === s.id)
      .map((f) => ({
        id: f.data.source.id, name: f.data.source.name, url: f.data.source.url, file: f.file, count: f.data.items.length,
        available: f.data.available, ...(f.data.cut ? { cut: f.data.cut } : {}), license: f.data.source.license,
      }))
      // 많이 실은 출처부터, 같으면 id 순
      .sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return { ...s, count: sources.reduce((n, x) => n + x.count, 0), sources };
  });
  return { category: 'ai', nameKo: 'AI 확장', fetchedAt, count: subs.reduce((n, s) => n + s.count, 0), subcategories: subs };
}

export function main(): IndexFile {
  const names = readdirSync(OUT_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
  const files = names.map((file) => ({ file, data: JSON.parse(readFileSync(join(OUT_DIR, file), 'utf8')) as CatalogFile }));
  const dates = files.map((f) => f.data.fetchedAt).sort();
  const index = buildIndex(files, dates[dates.length - 1] ?? FETCHED_AT);
  const path = join(OUT_DIR, 'index.json');
  writeFileSync(path, `${JSON.stringify(sortKeys(index), null, 2)}\n`);
  console.log(`→ ${relative(ROOT, path)}`);
  for (const s of index.subcategories) console.log(`  ${s.id.padEnd(10)} ${String(s.count).padStart(6)}  (${s.sources.map((x) => `${x.id} ${x.count}/${x.available}`).join(', ')})`);
  console.log(`  합계 ${index.count}`);
  return index;
}

if (isMain(import.meta.url)) main();
