// 품질 바닥선 규칙 (floor-guard.ts가 쓰고, tests/floor-guard.test.ts가 붙잡는다).
// 파일 하나의 경로(저장소 기준)와 원문을 받아 위반 목록을 돌려주는 순수 함수다. 파일을 읽지 않는다.
// 꼭 예외가 필요한 줄에는 같은 줄에 `floor-guard-ignore: 이유`를 적는다. 이유 없는 예외는 실패로 본다.

export interface Finding {
  file: string;
  line: number;
  rule: string;
  message: string;
}

/** 지운 옛 토큰 이름 (v1 → v2, docs/review/v2/systems.md 7절, D67). 화면 코드에서 쓰면 값이 조용히 비어 버린다 */
export const OLD_TOKENS = [
  'paper', 'card', 'surface-2', 'sky', 'ink', 'ink-soft', 'ink-faint', 'on-ink', 'navy-deep', 'blueprint',
  'flow', 'on-flow', 'slow', 'on-slow', 'jam', 'on-jam', 'caution', 'caution-ink', 'focus-on-dark',
  'shadow', 'shadow-lift', 'radius', 'radius-btn', 'radius-tile', 'radius-sheet', 'btn', 'btn-bar', 'btn-home', 'chip',
  'text-sm', 'text-base', 'text-md', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
  'leading', 'leading-tight', 'tracking-heading', 'weight-display', 'weight-medium',
] as const;

/** 남색 면 위 청록 글자를 허락하는 단 하나의 클래스 (parts.css에 정의, brief 4.1). 이 클래스가 든 규칙만 color에 --cyan을 쓸 수 있다 */
export const CYAN_ON_NAVY_CLASS = 'cyan-on-navy';

/** 그림(SVG)의 currentColor를 칠하는 스타일 파일: color가 글자색이 아니라 선 색이다 */
const GRAPHIC_STYLES = new Set(['src/styles/map.css', 'src/styles/map-land.css']);

/** 카드·상자에 두르면 싸 보이는 진한 테두리 색 (brief 5.5, 10절) */
const HEAVY_INK = /var\(\s*--(text|chosen|navy)\s*\)/;

const OLD_TOKEN_RE = new RegExp(`var\\(\\s*--(${OLD_TOKENS.join('|')})\\s*[,)]`);
const GOLD_RE = /--(on-)?gold(-[a-z]+)?\b/;
const BRAND_TEXT_RE = /(^|[^-\w])color\s*:\s*['"]?\s*var\(\s*--(brand-blue|cyan)\s*\)/;

/** 주석을 지운다 (줄 번호는 그대로 두려고 줄바꿈은 남긴다). 문자열 안의 // 은 대략 지키지만 완벽하지 않다. */
export function stripComments(src: string, ext: string): string {
  const keepNewlines = (m: string): string => m.replace(/[^\n]/g, ' ');
  let s = src.replace(/\/\*[\s\S]*?\*\//g, keepNewlines);
  if (ext === '.astro') s = s.replace(/<!--[\s\S]*?-->/g, keepNewlines);
  if (ext !== '.css') s = s.replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, pre: string) => pre + ' '.repeat(m.length - pre.length));
  return s;
}

/** .astro의 <style> 안만 남긴다 (나머지는 공백, 줄바꿈은 그대로) */
function astroStyles(code: string): string {
  const blank = (m: string): string => m.replace(/[^\n]/g, ' ');
  let out = '';
  let last = 0;
  const re = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    out += blank(code.slice(last, m.index + (m[1] ?? '').length)) + (m[2] ?? '');
    last = m.index + (m[1] ?? '').length + (m[2] ?? '').length;
  }
  return out + blank(code.slice(last));
}

interface Decl {
  prop: string;
  value: string;
  line: number;
}

interface Block {
  selector: string;
  decls: Decl[];
}

/** CSS를 규칙 덩어리로 나눈다. 덩어리마다 자기 선언만 둔다 (@media 안의 규칙은 따로 덩어리가 된다) */
export function cssBlocks(css: string): Block[] {
  const out: Block[] = [];
  const stack: { selector: string; decls: Decl[] }[] = [];
  let start = 0;
  let line = 0;
  let startLine = 0;
  const flushDecl = (end: number): void => {
    const top = stack[stack.length - 1];
    const text = css.slice(start, end);
    if (top) {
      const m = text.match(/^\s*([-a-zA-Z]+)\s*:([\s\S]*)$/);
      if (m?.[1] && m[2] !== undefined) {
        const lead = text.slice(0, text.length - text.trimStart().length);
        top.decls.push({ prop: m[1].toLowerCase(), value: m[2].trim(), line: startLine + (lead.match(/\n/g)?.length ?? 0) });
      }
    }
  };
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === '{') {
      const selector = css.slice(start, i).trim();
      stack.push({ selector, decls: [] });
      start = i + 1;
      startLine = line;
    } else if (ch === '}') {
      flushDecl(i);
      const done = stack.pop();
      if (done) out.push(done);
      start = i + 1;
      startLine = line;
    } else if (ch === ';') {
      flushDecl(i);
      start = i + 1;
      startLine = line;
    } else if (ch === '\n') {
      line += 1;
    }
  }
  return out;
}

const BORDER_PROP = /^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-(width|color|style))?$/;

/** 테두리 선언의 굵기(px). 모르면 null. 'medium'은 3px, 'thick'은 5px */
function borderWidth(d: Decl): number | null {
  if (d.prop.endsWith('-color') || d.prop.endsWith('-style')) return null;
  const v = d.value.replace(/var\([^)]*\)/g, ' ');
  const px = v.match(/(^|\s)(\d+(\.\d+)?)px\b/);
  if (px?.[2]) return Number(px[2]);
  if (/\bmedium\b/.test(v)) return 3;
  if (/\bthick\b/.test(v)) return 5;
  if (/\bthin\b/.test(v)) return 1;
  return null;
}

/** 위반 찾기. rel은 저장소 기준 경로(빗금 /) */
export function checkSource(rel: string, raw: string): Finding[] {
  const ext = rel.slice(rel.lastIndexOf('.'));
  const code = stripComments(raw, ext);
  const rawLines = raw.split('\n');
  const lines = code.split('\n');
  const out: Finding[] = [];
  const add = (i: number, rule: string, message: string): void => {
    const original = rawLines[i] ?? '';
    const m = original.match(/floor-guard-ignore:(.*)$/);
    if (m) {
      // 주석 닫기(*/, -->)만 있으면 이유가 없는 것이다
      const reason = (m[1] ?? '').replace(/\*\/|-->|[\s}]+$/g, '').trim();
      if (!reason) out.push({ file: rel, line: i + 1, rule: 'ignore-reason', message: 'floor-guard-ignore 뒤에 이유를 적는다' });
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
  const isSrc = rel.startsWith('src/');

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
      if (isSrc && external.some((r) => r.test(line))) {
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
    // 8. three는 렌더 장치(scripts/assets/render-art.ts) 전용 devDependency다. 화면에서 실행 중 WebGL을 쓰지 않는다 (D26·D54, CONCEPT 5.6)
    if (isSrc && /(\bfrom\s*|\bimport\s*\(?\s*)['"]three(\/[^'"]*)?['"]/.test(line)) {
      add(i, 'no-three', 'three는 화면에서 쓰지 않는다. 3D는 npm run art로 미리 구운 그림만 싣는다');
    }
    // 7. 화면 코드 속 한국어 문장 (문구는 src/copy/ko.ts, 엔진 문장은 data/templates.json)
    if (isUi && (ext === '.tsx' || ext === '.astro' || ext === '.ts') && /[가-힣]/.test(line)) {
      add(i, 'copy-in-code', '화면 문구는 src/copy/ko.ts에 두고 가져다 쓴다');
    }
    // 9. 금색은 없앴다 (D61·D67): 이름도 쓰지 않는다
    if (isSrc && GOLD_RE.test(line)) add(i, 'no-gold', "금색 토큰(--gold…)은 없앴다. 행동은 --accent, 추천 꼬리표는 --accent-soft, 빛은 --cyan");
    // 10. 지운 옛 토큰 이름 (D67)
    if (isUiOrStyle && !isTokens && OLD_TOKEN_RE.test(line)) {
      add(i, 'old-token', '옛 토큰 이름이다. 새 이름을 쓴다 (--ink → --text, --card → --surface, --text-sm → --size-caption…, systems.md 7절)');
    }
    // 11-a. 로고 파랑·청록 글자 (화면 코드의 인라인 style. CSS는 아래에서 규칙 단위로 본다)
    if (isUiOrStyle && ext !== '.css' && ext !== '.astro' && BRAND_TEXT_RE.test(line)) {
      add(i, 'brand-color-text', `--brand-blue·--cyan은 글자색으로 쓰지 않는다 (흰 바탕 3.77·2.36:1). 남색 면 위 청록 글자는 .${CYAN_ON_NAVY_CLASS}`);
    }
  });

  // CSS 규칙 단위 검사: .css 파일과 .astro의 <style>
  if (isUiOrStyle && !isTokens && (ext === '.css' || ext === '.astro')) {
    const css = ext === '.astro' ? astroStyles(code) : code;
    if (ext === '.astro') {
      // <style> 밖(태그의 style 속성)은 줄 단위로
      const outside = code.split('\n').map((l, i) => (css.split('\n')[i]?.trim() ? '' : l));
      outside.forEach((l, i) => {
        if (BRAND_TEXT_RE.test(l)) add(i, 'brand-color-text', `--brand-blue·--cyan은 글자색으로 쓰지 않는다. 남색 면 위 청록 글자는 .${CYAN_ON_NAVY_CLASS}`);
      });
    }
    for (const block of cssBlocks(css)) {
      // 11-b. 로고 파랑·청록 글자: 그림 스타일 파일(지도)은 currentColor가 선 색이라 뺀다
      if (!GRAPHIC_STYLES.has(rel) && !new RegExp(`\\.${CYAN_ON_NAVY_CLASS}(?![-\\w])`).test(block.selector)) {
        for (const d of block.decls) {
          if (d.prop === 'color' && /var\(\s*--(brand-blue|cyan)\s*\)/.test(d.value)) {
            add(d.line, 'brand-color-text', `--brand-blue·--cyan은 글자색으로 쓰지 않는다 (흰 바탕 3.77·2.36:1). 남색 면 위 청록 글자는 .${CYAN_ON_NAVY_CLASS}`);
          }
        }
      }
      // 12. 2px 넘는 진한 테두리 (brief 5.5): 고름은 안쪽 2px --chosen 고리(box-shadow) + --selected 면으로
      const borders = block.decls.filter((d) => BORDER_PROP.test(d.prop));
      const blockWide = borders.some((d) => (borderWidth(d) ?? 0) >= 2);
      for (const d of borders) {
        if (!HEAVY_INK.test(d.value)) continue;
        const own = borderWidth(d);
        if ((own ?? 0) >= 2 || (own === null && blockWide)) {
          add(d.line, 'heavy-border', '2px 넘는 진한 테두리(--text·--chosen·--navy)는 쓰지 않는다. 고름은 box-shadow: inset 0 0 0 2px var(--chosen) + --selected 면');
        }
      }
    }
  }
  return out;
}
