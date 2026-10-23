// 프레임워크·플랫폼이 공식 저장소에 둔 스타터·예제·템플릿 폴더를 모두 받아 템플릿 진열대에 쓴다.
//   node scripts/import/tpl-official.ts            (전부)
//   node scripts/import/tpl-official.ts nextjs     (출처 하나만, id로)
// 저장소를 얕게 받아(git, blob 없이) 폴더 목록과 README·package.json만 꺼내 읽는다. 출처마다 파일 하나
// (data/catalog/templates/<id>.json). 설치 명령은 각 프레임워크 공식 문서에 적힌 만들기 명령 꼴이다.
import { join } from 'node:path';
import {
  type Item, type SourceInfo, type TplKind, gitCheckout, gitFiles, gitHeadDate, main, makeId, makeItem, readIfExists,
  readmeFirstParagraph, readmeTitle, repoMeta, summaryOf, tagify, templateKindByText, writeCatalog,
} from './oss-lib.ts';

interface Ctx {
  dir: string; // 저장소 안 폴더 경로 (예: examples/with-stripe)
  base: string; // 마지막 폴더 이름
  title?: string;
  summary?: string;
  pkg?: { name?: string; description?: string; keywords?: string[] };
}

interface DirSource {
  id: string;
  name: string;
  repo: string;
  branch?: string;
  root: string; // 템플릿 폴더들이 있는 곳
  nested?: number; // 0이면 root 바로 아래 폴더가 템플릿. n이면 n단계 아래까지 README와 코드가 있는 폴더를 찾는다.
  include?: (base: string, dir: string) => boolean;
  kind: (c: Ctx) => TplKind;
  install?: (c: Ctx) => string | undefined;
  name_?: (c: Ctx) => string;
  tags: (c: Ctx) => (string | undefined)[];
  docs?: string;
  note?: string;
}

const textKind = (fallback: TplKind) => (c: Ctx): TplKind =>
  templateKindByText(`${c.base.replace(/[-_]/g, ' ')} ${c.title ?? ''} ${c.summary ?? ''}`, `${c.base.replace(/[-_]/g, ' ')} ${c.title ?? ''}`) ?? fallback;
const fixed = (k: TplKind) => (): TplKind => k;
const pretty = (s: string) => s.replace(/^(template|expo-template)-/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

const SOURCES: DirSource[] = [
  {
    id: 'nextjs-examples', name: 'Next.js 공식 예제', repo: 'vercel/next.js', branch: 'canary', root: 'examples',
    kind: textKind('web-starter'),
    install: (c) => `npx create-next-app --example ${c.base} ${c.base}-app`,
    tags: (c) => ['nextjs', 'react', ...(c.base.startsWith('with-') ? [c.base.slice(5)] : [])],
    docs: 'https://nextjs.org/docs/app/api-reference/cli/create-next-app',
  },
  {
    id: 'vite-templates', name: 'Vite 공식 템플릿 (create-vite)', repo: 'vitejs/vite', branch: 'main', root: 'packages/create-vite',
    include: (b) => b.startsWith('template-'),
    kind: fixed('web-starter'),
    install: (c) => `npm create vite@latest my-app -- --template ${c.base.replace('template-', '')}`,
    name_: (c) => `Vite + ${pretty(c.base).replace(/ Ts$/, ' (TypeScript)')}`,
    tags: (c) => ['vite', c.base.replace('template-', '').replace(/-ts$/, ''), c.base.endsWith('-ts') ? 'typescript' : 'javascript'],
    docs: 'https://vite.dev/guide/#scaffolding-your-first-vite-project',
  },
  {
    id: 'astro-examples', name: 'Astro 공식 예제', repo: 'withastro/astro', branch: 'main', root: 'examples',
    kind: textKind('web-starter'),
    install: (c) => `npm create astro@latest -- --template ${c.base}`,
    tags: (c) => ['astro', c.base],
    docs: 'https://docs.astro.build/en/install-and-setup/',
  },
  {
    id: 'react-router-templates', name: 'React Router 공식 템플릿', repo: 'remix-run/react-router-templates', branch: 'main', root: '',
    kind: textKind('web-starter'),
    install: (c) => `npx create-react-router@latest --template remix-run/react-router-templates/${c.base}`,
    tags: (c) => ['react-router', 'remix', 'react', c.base],
    docs: 'https://reactrouter.com/start/framework/installation',
  },
  {
    id: 'expo-templates', name: 'Expo 공식 템플릿', repo: 'expo/expo', branch: 'main', root: 'templates',
    include: (b) => b.startsWith('expo-template-'),
    kind: fixed('mobile'),
    install: (c) => `npx create-expo-app@latest --template ${c.base.replace('expo-template-', '')}`,
    name_: (c) => `Expo ${pretty(c.base)}`,
    tags: () => ['expo', 'react-native', 'mobile'],
    docs: 'https://docs.expo.dev/more/create-expo/',
  },
  {
    id: 'expo-examples', name: 'Expo 공식 예제', repo: 'expo/examples', branch: 'master', root: '',
    kind: fixed('mobile'),
    install: (c) => `npx create-expo-app@latest --example ${c.base}`,
    tags: (c) => ['expo', 'react-native', 'mobile', ...(c.base.startsWith('with-') ? [c.base.slice(5)] : [])],
    docs: 'https://docs.expo.dev/more/create-expo/',
  },
  {
    id: 'cloudflare-templates', name: 'Cloudflare Workers 공식 템플릿', repo: 'cloudflare/templates', branch: 'main', root: '',
    include: (b) => b.endsWith('-template'),
    kind: textKind('backend'),
    install: (c) => `npm create cloudflare@latest -- --template=cloudflare/templates/${c.base}`,
    tags: () => ['cloudflare', 'workers'],
    docs: 'https://developers.cloudflare.com/workers/get-started/guide/',
  },
  {
    id: 'tauri-templates', name: 'Tauri 공식 템플릿 (create-tauri-app)', repo: 'tauri-apps/create-tauri-app', branch: 'dev', root: 'templates',
    include: (b) => b.startsWith('template-'),
    kind: fixed('desktop'),
    install: (c) => `npm create tauri-app@latest my-app -- --template ${c.base.replace('template-', '')}`,
    name_: (c) => `Tauri + ${pretty(c.base).replace(/ Ts$/, ' (TypeScript)')}`,
    tags: (c) => ['tauri', 'desktop', 'rust', c.base.replace('template-', '').replace(/-ts$/, '')],
    docs: 'https://v2.tauri.app/start/create-project/',
  },
  {
    id: 'electron-forge-templates', name: 'Electron Forge 공식 템플릿', repo: 'electron/forge', branch: 'main', root: 'packages/template',
    include: (b) => b !== 'base',
    kind: fixed('desktop'),
    install: (c) => `npx create-electron-app@latest my-app --template=${c.base}`,
    name_: (c) => `Electron Forge + ${pretty(c.base)}`,
    tags: (c) => ['electron', 'desktop', c.base],
    docs: 'https://www.electronforge.io/templates/vite',
  },
  {
    id: 'wxt-templates', name: 'WXT 브라우저 확장 템플릿', repo: 'wxt-dev/wxt', branch: 'main', root: 'templates',
    kind: fixed('extension'),
    install: (c) => `npx wxt@latest init my-extension --template ${c.base}`,
    name_: (c) => `WXT + ${pretty(c.base)}`,
    tags: (c) => ['wxt', 'browser-extension', 'chrome', 'firefox', c.base],
    docs: 'https://wxt.dev/guide/installation.html',
  },
  {
    id: 'chrome-extension-samples', name: 'Chrome 확장 공식 예제', repo: 'GoogleChrome/chrome-extensions-samples', branch: 'main', root: 'functional-samples',
    kind: fixed('extension'),
    tags: () => ['chrome', 'browser-extension', 'manifest-v3'],
    docs: 'https://developer.chrome.com/docs/extensions/get-started',
  },
  {
    id: 'flutter-samples', name: 'Flutter 공식 예제', repo: 'flutter/samples', branch: 'main', root: '',
    kind: (c) => templateKindByText(`${c.base} ${c.summary ?? ''}`) === 'game' ? 'game' : 'mobile',
    tags: () => ['flutter', 'dart', 'mobile'],
    docs: 'https://docs.flutter.dev/get-started',
  },
  {
    id: 'supabase-examples', name: 'Supabase 공식 예제', repo: 'supabase/supabase', branch: 'master', root: 'examples', nested: 3,
    include: (_b, dir) => !/\/(archive|_internal|prompts)(\/|$)/.test(`/${dir}`),
    kind: (c) => /expo|flutter|swift|kotlin|android|ios|react-native|ionic/.test(c.dir) ? 'mobile' : textKind('web-starter')(c),
    tags: (c) => ['supabase', ...c.dir.split('/').slice(1, -1)],
    docs: 'https://supabase.com/docs/guides/getting-started',
  },
  {
    id: 'stackblitz-starters', name: 'StackBlitz 공식 스타터', repo: 'stackblitz/starters', branch: 'main', root: '',
    include: (b) => b !== 'test',
    kind: textKind('web-starter'),
    name_: (c) => `StackBlitz: ${pretty(c.base)}`,
    tags: (c) => ['stackblitz', c.base],
    docs: 'https://developer.stackblitz.com/guides/integration/open-from-github',
  },
  {
    id: 'codesandbox-templates', name: 'CodeSandbox 공식 템플릿', repo: 'codesandbox/sandbox-templates', branch: 'main', root: '',
    kind: textKind('web-starter'),
    name_: (c) => `CodeSandbox: ${pretty(c.base)}`,
    tags: (c) => ['codesandbox', c.base],
    docs: 'https://codesandbox.io/docs/learn/devboxes/synced-templates',
  },
  {
    id: 'awesome-llm-apps', name: 'Awesome LLM Apps (실행되는 AI 앱 모음)', repo: 'Shubhamsaboo/awesome-llm-apps', branch: 'main', root: '', nested: 4,
    include: (_b, dir) => !/^(docs|\.github)(\/|$)/.test(dir),
    kind: fixed('ai-app'),
    tags: (c) => ['llm', ...c.dir.split('/').slice(0, 1).map((d) => d.replace(/_/g, '-'))],
    note: 'Shubhamsaboo/awesome-llm-apps 저장소 안의 앱 폴더(README와 코드가 함께 있는 폴더).',
  },
];

const CODE_FILE = /(^|\/)(package\.json|requirements\.txt|pyproject\.toml|pubspec\.yaml|Cargo\.toml|go\.mod|app\.py|main\.py|streamlit_app\.py|index\.html|deno\.json|wrangler\.(toml|jsonc?))$/;

// 템플릿 폴더 목록. nested면 README와 코드 파일이 함께 있는 가장 위 폴더들.
function templateDirs(src: DirSource, files: string[]): string[] {
  const root = src.root ? `${src.root}/` : '';
  const rel = files.filter((f) => f.startsWith(root)).map((f) => f.slice(root.length));
  if (!src.nested) {
    const dirs = new Set<string>();
    for (const f of rel) {
      const parts = f.split('/');
      if (parts.length >= 2 && !parts[0]?.startsWith('.') && !parts[0]?.startsWith('_')) dirs.add(parts[0] as string);
    }
    return [...dirs].map((d) => `${root}${d}`).filter((d) => (src.include ? src.include(d.split('/').pop() as string, d) : true)).sort();
  }
  const readmeDirs = new Set(rel.filter((f) => /(^|\/)README\.md$/i.test(f)).map((f) => f.split('/').slice(0, -1).join('/')).filter(Boolean));
  const codeDirs = new Set(rel.filter((f) => CODE_FILE.test(f)).map((f) => f.split('/').slice(0, -1).join('/')));
  const cands = [...readmeDirs].filter((d) => d.split('/').length <= (src.nested ?? 1) && codeDirs.has(d)).sort();
  const picked: string[] = [];
  for (const d of cands) if (!picked.some((p) => d.startsWith(`${p}/`))) picked.push(d);
  return picked.map((d) => `${root}${d}`).filter((d) => (src.include ? src.include(d.split('/').pop() as string, d) : true));
}

async function importSource(src: DirSource): Promise<void> {
  const r = src.root ? `/${src.root}` : '';
  const depth = src.nested ? '**' : '*';
  const dir = gitCheckout(src.repo, [`${r}/${depth}/README.md`, `${r}/${depth}/readme.md`, `${r}/${depth}/package.json`], src.branch);
  const files = gitFiles(dir, src.root);
  const dirs = templateDirs(src, files);
  const meta = await repoMeta(src.repo);
  const updatedAt = gitHeadDate(dir);
  const items: Item[] = [];
  for (const d of dirs) {
    const base = d.split('/').pop() as string;
    const readme = readIfExists(join(dir, d, 'README.md')) ?? readIfExists(join(dir, d, 'readme.md'));
    let pkg: Ctx['pkg'];
    try {
      const raw = readIfExists(join(dir, d, 'package.json'));
      pkg = raw ? (JSON.parse(raw) as Ctx['pkg']) : undefined;
    } catch {
      pkg = undefined;
    }
    const title = readmeTitle(readme);
    const summary = (readme ? readmeFirstParagraph(readme) : undefined) ?? summaryOf(pkg?.description);
    const ctx: Ctx = { dir: d, base, title, summary, pkg };
    const name = src.name_ ? src.name_(ctx) : (title ?? pretty(base));
    items.push(makeItem({
      id: makeId(src.id, d.slice(src.root ? src.root.length + 1 : 0).replace(/\//g, '-')),
      name,
      kind: src.kind(ctx),
      category: 'templates',
      summary: summary ?? name,
      url: `https://github.com/${src.repo}/tree/${src.branch ?? 'main'}/${d}`,
      source: { name: src.name, url: `https://github.com/${src.repo}${src.root ? `/tree/${src.branch ?? 'main'}/${src.root}` : ''}` },
      license: meta?.license,
      metrics: updatedAt ? { updatedAt } : undefined,
      tags: tagify([...src.tags(ctx), ...(pkg?.keywords ?? []).slice(0, 5)]),
      preview: { type: 'template', host: 'github', repo: src.repo, path: d, ...(meta?.language ? { language: meta.language } : {}) },
      use: { install: src.install?.(ctx), docs: src.docs },
    }));
  }
  const info: SourceInfo = {
    id: src.id,
    name: src.name,
    url: `https://github.com/${src.repo}`,
    license: `Folder names, README text and package.json descriptions from the public repository ${src.repo}${meta?.license ? ` (${meta.license})` : ''}.`,
    ...(src.note ? { note: src.note } : {}),
  };
  writeCatalog('templates', info, items);
}

main(async () => {
  const only = process.argv[2];
  for (const src of SOURCES) {
    if (only && src.id !== only) continue;
    try {
      await importSource(src);
    } catch (err) {
      console.error(`✘ ${src.id}: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  }
});
