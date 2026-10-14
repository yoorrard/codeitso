// 주소 바탕 빌드 시험 (설계서 9.4절, D81): GitHub Pages 프로젝트 사이트처럼 하위 주소로 빌드해 주소가 모두 바탕을 품는지 본다.
//   npm run qa:base     PUBLIC_BASE_PATH=/code-chauffeur PUBLIC_HOST=static으로 .qa/dist-base에 빌드하고 검사
//   npm run e2e:base    위 빌드·검사 + tests/e2e/base-path.spec.ts (정적 서버를 --base로 띄움)
//   --no-build          빌드는 건너뛰고 .qa/dist-base만 검사
// 기본 빌드(dist/)는 건드리지 않는다. 그래서 npm run e2e·qa:budget은 그대로 기본 빌드를 본다.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { ko } from '../../src/copy/ko.ts';
import { badCssUrls, badHtmlUrls, okUrl } from '../lib/base-scan.ts';
import type { BadUrl } from '../lib/base-scan.ts';
import { ROOT } from '../lib/load-data.ts';

export const BASE = '/code-chauffeur';
export const OUT = join(ROOT, '.qa', 'dist-base');

const args = process.argv.slice(2);
const env = { ...process.env, PUBLIC_BASE_PATH: BASE, PUBLIC_HOST: 'static' };

/** 자식 명령을 돌리고, 실패하면 한 줄로 알리고 멈춘다 (긴 오류 더미 대신) */
function run(what: string, file: string, argv: readonly string[], runEnv: NodeJS.ProcessEnv): void {
  try {
    execFileSync(process.execPath, [file, ...argv], { stdio: 'inherit', env: runEnv, cwd: ROOT });
  } catch {
    console.log(`\n${what}이 실패했다. 위 출력을 본다.`);
    process.exit(1);
  }
}

if (!args.includes('--no-build')) {
  console.log(`주소 바탕 ${BASE} · 정적 호스트로 빌드 → ${relative(ROOT, OUT)}`);
  run('주소 바탕 빌드', join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs'), ['build', '--outDir', OUT], env);
}
if (!existsSync(OUT)) {
  console.log(`${relative(ROOT, OUT)}가 없다. --no-build 없이 다시 돌린다.`);
  process.exit(1);
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
}
const files: string[] = [];
walk(OUT, files);

const problems: string[] = [];
const note = (file: string, bad: readonly BadUrl[]): void => {
  for (const b of bad) problems.push(`${relative(OUT, file)}: ${b.where}="${b.value}"`);
};
let pages = 0;
for (const f of files) {
  const ext = extname(f);
  if (ext === '.html') {
    pages += 1;
    const html = readFileSync(f, 'utf8');
    note(f, badHtmlUrls(html, BASE));
    // 정적 호스트: 방문 통계 스크립트를 싣지 않는다
    if (html.includes('cloudflareinsights')) problems.push(`${relative(OUT, f)}: 정적 호스트인데 방문 통계 스크립트가 들어 있다`);
  } else if (ext === '.css') {
    note(f, badCssUrls(readFileSync(f, 'utf8'), BASE));
  }
}

// 웹 앱 설명서: start_url·scope·아이콘이 바탕 안
const manifestFile = join(OUT, 'manifest.webmanifest');
if (existsSync(manifestFile)) {
  const m = JSON.parse(readFileSync(manifestFile, 'utf8')) as { start_url?: string; scope?: string; icons?: { src: string }[] };
  for (const [k, v] of [['start_url', m.start_url], ['scope', m.scope], ...(m.icons ?? []).map((i) => ['icons.src', i.src] as const)] as const) {
    if (!v || !okUrl(v, BASE)) problems.push(`manifest.webmanifest: ${k}="${v ?? ''}"`);
  }
} else {
  problems.push('manifest.webmanifest가 없다');
}
// 정적 호스트의 개인정보 처리방침은 익명 집계 묶음이 '이 주소에서는 세지 않아요'
const privacy = join(OUT, 'legal', 'privacy', 'index.html');
if (!existsSync(privacy) || !readFileSync(privacy, 'utf8').includes(ko.legal.privacyStatic.count)) {
  problems.push('legal/privacy: 정적 호스트용 익명 집계 문장(ko.legal.privacyStatic.count)이 없다');
}
// 소개도 처리방침과 같은 사실을 말한다: '이 주소에서는 이름 없는 횟수도 보내지 않아요'이고 '서버로는 … 횟수만 보내요'는 없다
const about = join(OUT, 'about', 'index.html');
const aboutHtml = existsSync(about) ? readFileSync(about, 'utf8') : '';
if (!aboutHtml.includes(ko.about.storedStatic) || aboutHtml.includes(ko.about.stored)) {
  problems.push('about: 정적 호스트용 끝 줄(ko.about.storedStatic)이 없거나 집계를 보낸다는 줄(ko.about.stored)이 남았다');
}

if (problems.length > 0) {
  for (const p of problems.slice(0, 40)) console.log(`  ${p}`);
  if (problems.length > 40) console.log(`  … 외 ${problems.length - 40}건`);
  console.log(`\n주소 바탕 검사 실패 ${problems.length}건. 주소는 src/lib/routes.ts의 ROUTES·FILES·withBase()로 만든다 (설계서 9.4절).`);
  process.exit(1);
}
console.log(`주소 바탕 검사 통과: 페이지 ${pages}개의 href·src가 모두 ${BASE}/ 안 (바깥 링크·#·mailto 빼고), 설명서·처리방침·소개 확인`);

if (args.includes('--e2e')) {
  run('주소 바탕 e2e(tests/e2e/base-path.spec.ts)', join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js'), ['test', '--project=base-path'], { ...process.env, E2E_BASE: '1' });
}
