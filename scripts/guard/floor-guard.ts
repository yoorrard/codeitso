// 품질 바닥선 검사: 자율 실행에서 에이전트가 코드와 검사를 함께 쓰므로, 꼭 지킬 선을 기계로 지킨다.
//   node scripts/guard/floor-guard.ts              src/, tests/, scripts/ 전체
//   node scripts/guard/floor-guard.ts 파일 [파일…]  주어진 파일만 (훅이 쓴다)
// 꼭 예외가 필요한 줄에는 같은 줄에 `floor-guard-ignore: 이유`를 적는다. 이유 없는 예외는 실패로 본다.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { ROOT } from '../lib/load-data.ts';

interface Finding {
  file: string;
  line: number;
  rule: string;
  message: string;
}

const SCAN_DIRS = ['src', 'tests', 'scripts'];
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.astro', '.css']);

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (CODE_EXT.has(extname(p))) out.push(p);
  }
}

/** 주석을 지운다 (줄 번호는 그대로 두려고 줄바꿈은 남긴다). 문자열 안의 // 은 대략 지키지만 완벽하지 않다. */
function stripComments(src: string, ext: string): string {
  const keepNewlines = (m: string): string => m.replace(/[^\n]/g, ' ');
  let s = src.replace(/\/\*[\s\S]*?\*\//g, keepNewlines);
  if (ext === '.astro') s = s.replace(/<!--[\s\S]*?-->/g, keepNewlines);
  if (ext !== '.css') s = s.replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, pre: string) => pre + ' '.repeat(m.length - pre.length));
  return s;
}

function check(file: string): Finding[] {
  const rel = relative(ROOT, file).split('\\').join('/');
  const ext = extname(file);
  const raw = readFileSync(file, 'utf8');
  const code = stripComments(raw, ext);
  const rawLines = raw.split('\n');
  const lines = code.split('\n');
  const out: Finding[] = [];
  const add = (i: number, rule: string, message: string): void => {
    const original = rawLines[i] ?? '';
    const m = original.match(/floor-guard-ignore:\s*(\S.*)?/);
    if (m) {
      if (!m[1]) out.push({ file: rel, line: i + 1, rule: 'ignore-reason', message: 'floor-guard-ignore 뒤에 이유를 적는다' });
      return;
    }
    out.push({ file: rel, line: i + 1, rule, message });
  };

  const isTokens = rel === 'src/styles/tokens.css';
  const isEngine = rel.startsWith('src/lib/engine/');
  const isUi = /^src\/(components|pages|layouts)\//.test(rel);
  const isUiOrStyle = isUi || rel.startsWith('src/styles/') || rel.startsWith('src/lib/');
  const isTest = rel.startsWith('tests/');
  const isGuard = rel.startsWith('scripts/guard/');

  lines.forEach((line, i) => {
    // 1. 토큰 밖 색 값
    if (isUiOrStyle && !isTokens && !isEngine) {
      if (/(^|[^&\w])#[0-9a-fA-F]{3,8}\b/.test(line) && !/url\(\s*['"]?#/.test(line) && !/href=["']#/.test(line)) {
        add(i, 'token-color', '색은 src/styles/tokens.css의 변수(var(--…))만 쓴다');
      }
      if (/\b(rgba?|hsla?|oklch|oklab|lab|lch)\(\s*[\d.]/.test(line)) add(i, 'token-color', '색 함수 값 대신 토큰을 쓴다 (투명도는 color-mix 또는 토큰 추가)');
    }
    // 2. 토큰 밖 모션 길이
    if (isUiOrStyle && !isTokens && !isEngine) {
      if (/\b(transition|animation)(-duration|-delay)?\s*:[^;]*\b(?!0m?s\b)\d+(\.\d+)?m?s\b/.test(line)) {
        add(i, 'token-duration', '모션 길이는 var(--dur-…) 토큰만 쓴다');
      }
      if ((ext === '.ts' || ext === '.tsx') && /\b(duration|delay)\s*:\s*[1-9]\d*/.test(line)) {
        add(i, 'token-duration', 'Web Animations 길이는 src/lib/motion.ts의 토큰 읽기 도우미로 정한다');
      }
    }
    // 3. 외부 자원 불러오기 (링크 <a href>는 괜찮다)
    if (!isGuard) {
      const external = [
        /<script[^>]*\bsrc=["']https?:\/\//,
        /<link[^>]*\bhref=["']https?:\/\//,
        /@import\s+(url\()?\s*["']?https?:\/\//,
        /url\(\s*["']?https?:\/\//,
        /\bfetch\(\s*["'`]https?:\/\//,
        /\bimport\s*(\(|[^;]*from)\s*["']https?:\/\//,
        /<img[^>]*\bsrc=["']https?:\/\//,
      ];
      if (rel.startsWith('src/') && external.some((r) => r.test(line))) {
        add(i, 'external-resource', '외부 주소에서 자원을 불러오지 않는다. 파일을 저장소에 두고 직접 싣는다');
      }
    }
    // 4. 시험 건너뛰기
    if (isTest && /\b(it|test|describe)\.(only|skip)\(/.test(line)) add(i, 'test-skip', '시험을 건너뛰거나 하나만 돌리지 않는다');
    // 5. 타입 검사 끄기와 any
    if (!isGuard && /@ts-ignore|@ts-nocheck/.test(rawLines[i] ?? '')) add(i, 'ts-ignore', '@ts-ignore 대신 원인을 고친다 (불가피하면 @ts-expect-error와 이유)');
    if (!isGuard && (ext === '.ts' || ext === '.tsx' || ext === '.astro') && /(:\s*any\b|\bas\s+any\b|<any>|any\[\])/.test(line) && !/\/\/\s*any:/.test(rawLines[i] ?? '')) {
      add(i, 'no-any', 'any 금지. 불가피하면 같은 줄에 `// any: 이유`');
    }
    // 6. 엔진 순수성
    if (isEngine) {
      if (/\bDate\.now\(|\bnew Date\(|Math\.random\(|\blocalStorage\b|\bwindow\.|\bdocument\.|\bfetch\(|\bprocess\.|from ['"]node:/.test(line)) {
        add(i, 'engine-pure', '엔진은 순수 함수만: 시각·난수·브라우저·Node API를 쓰지 않는다');
      }
      if (/\.localeCompare\(/.test(line)) add(i, 'engine-cmp', '정렬은 cmp()를 쓴다 (localeCompare 금지)');
    }
    // 7. 화면 코드 속 한국어 문장 (문구는 src/copy/ko.ts, 엔진 문장은 data/templates.json)
    if (isUi && (ext === '.tsx' || ext === '.astro' || ext === '.ts') && /[가-힣]/.test(line)) {
      add(i, 'copy-in-code', '화면 문구는 src/copy/ko.ts에 두고 가져다 쓴다');
    }
  });
  return out;
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const files: string[] = [];
if (args.length > 0) {
  for (const a of args) {
    const p = a.startsWith('/') ? a : join(ROOT, a);
    if (existsSync(p) && CODE_EXT.has(extname(p))) files.push(p);
  }
} else {
  for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
}

const findings = files.flatMap(check);
if (findings.length > 0) {
  for (const f of findings) console.log(`${f.file}:${f.line} [${f.rule}] ${f.message}`);
  console.log(`\n품질 바닥선 위반 ${findings.length}건. 고치거나, 정말 예외면 그 줄에 'floor-guard-ignore: 이유'를 적는다.`);
  process.exit(1);
}
if (args.length === 0) console.log(`품질 바닥선 통과 (파일 ${files.length}개)`);
