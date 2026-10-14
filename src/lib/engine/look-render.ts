// 설계도 6번 '디자인 지시'·디자인 값(CSS)·DESIGN.md 그리기 (T38, 설계서 4.8절, design.md 7절). 순수 함수.
// 값은 look.ts lookSpec이 정하고, 문장은 data/templates.json look. 단계 화면 첫 묶음과 디자인 정하기 시트에는 싣지 않는다:
// 설계도를 만들 때만 쓰는 묶음(src/lib/look-render-data.ts, 설계도 받기에서 미리 받음).
import type { Catalog } from './catalog.ts';
import { ratio2 } from './color.ts';
import type { LookColors, LookRatios, LookSpec } from './look.ts';
import { lookChecks } from './look.ts';
import { fill, pickTemplate } from './text.ts';
import type { LookComponent, LookFamily, Looks } from './types.ts';

function need<T>(x: T | undefined, what: string): T {
  if (x === undefined) throw new Error(`looks.json에 없습니다: ${what}`);
  return x;
}

/** 6번 묶음 열하나 (설계서 4.8절 순서 = Google DESIGN.md 순서) */
export type LookGroup = 'feel' | 'color' | 'type' | 'layout' | 'depth' | 'shape' | 'parts' | 'motion' | 'icons' | 'a11y' | 'dos';
export const LOOK_GROUPS: readonly LookGroup[] = ['feel', 'color', 'type', 'layout', 'depth', 'shape', 'parts', 'motion', 'icons', 'a11y', 'dos'];
/** 짧은 판(무료 AI 채팅)에 남기는 묶음: 색·글꼴·모서리·주 버튼·접근성·하지 말 것 + 내 말 그대로(6-1) */
const SHORT_GROUPS: readonly LookGroup[] = ['feel', 'color', 'type', 'shape', 'parts', 'a11y', 'dos'];

const px = (n: number): string => `${n}px`;
const r2 = (n: number): string => ratio2(n).toFixed(2);
/** CSS 이름 목록의 마지막 이름 (따옴표 없이): "Pretendard Variable", Pretendard → Pretendard */
const familyName = (f: LookFamily): string => (f.css.split(',').pop() ?? f.css).trim().replace(/^"|"$/g, '');

/** 버튼이 알약 모양인가 (아주 둥글게: 작은 값이 9999) */
const isPill = (spec: Pick<LookSpec, 'radius'>): boolean => spec.radius.values[0] >= 9999;

function colorTable(cat: Catalog, spec: LookSpec): string[] {
  const C = cat.data.templates.look.color;
  const sides: ('light' | 'dark')[] = spec.theme === 'both' ? ['light', 'dark'] : [spec.theme === 'dark' ? 'dark' : 'light'];
  const ratios = (k: keyof LookRatios, wrap?: string): string => {
    const v = sides.map((s) => r2(spec.contrast[s][k])).join(' / ');
    return wrap ? fill(wrap, { v }) : v;
  };
  const rows: [keyof LookColors, string][] = [
    ['bg', '—'],
    ['surface', '—'],
    ['text', ratios('text')],
    ['muted', ratios('muted', C.onSurface)],
    ['border', ratios('border', C.onBg)],
    ['line', '—'],
    ['primary', '—'],
    ['onPrimary', ratios('button')],
    ['link', ratios('link', C.onSurface)],
    ['soft', '—'],
    ['success', '—'],
    ['error', '—'],
  ];
  const head = [C.role, ...sides.map((s) => C[s]), C.contrast];
  return [
    `| ${head.join(' | ')} |`,
    `|${head.map(() => '---').join('|')}|`,
    ...rows.map(([k, ratio]) => `| ${C.roles[k]} | ${sides.map((s) => spec.colors[s][k]).join(' | ')} | ${ratio} |`),
  ];
}

function familyLoad(cat: Catalog, spec: LookSpec, f: LookFamily): string {
  const T = cat.data.templates.look.type;
  const name = f.name;
  if (f.needsReview) return fill(T.home, { name, home: f.home });
  if (spec.screenTool === 'react-vite' && f.npm) return fill(T.npm, { name, install: f.npm.install, import: f.npm.import });
  if (f.html) return fill(T.html, { name, line: f.html });
  if (f.npm) return fill(T.npm, { name, install: f.npm.install, import: f.npm.import });
  return fill(T.home, { name, home: f.home });
}

/** 6-x 묶음 하나의 줄 (목록은 '- '로 시작). short면 짧은 판의 내용 */
function groupLines(cat: Catalog, looks: Looks, spec: LookSpec, g: LookGroup, short: boolean): string[] {
  const L = cat.data.templates.look;
  const out: string[] = [];
  const li = (s: string): void => {
    out.push(`- ${s}`);
  };
  const std = { standard: looks.contrast.standard, nonText: looks.contrast.nonText };
  const quote = (s: string): string => s.replace(/[“”"]/g, "'");
  switch (g) {
    case 'feel': {
      li(fill(L.feel.mood, { label: spec.mood.label, ko: spec.mood.keywordsKo.join(', '), en: spec.mood.keywordsEn.join(', ') }));
      li(fill(L.feel.focus, { focus: L.focus[spec.typeTag] ?? L.focus['type.custom'] ?? '' }));
      const t = spec.texts;
      if (t.appName) li(fill(L.feel.appName, { text: quote(t.appName) }));
      if (spec.tone) li(fill(L.feel.tone, { label: spec.tone.label }));
      else if (t.toneText) li(fill(L.feel.toneMine, { text: quote(t.toneText) }));
      let quoted = false;
      if (t.mood) {
        li(fill(L.feel.mine, { text: quote(t.mood) }));
        quoted = true;
      }
      for (const f of spec.found) {
        const label = f.field === 'mood' ? spec.mood.label : f.field === 'accent' ? spec.accent.label : (looks.themes.find((x) => x.id === 'both')?.label ?? f.id);
        li(fill(L.feel.found, { word: f.word, label }));
      }
      if (t.note) {
        li(fill(L.feel.wish, { text: quote(t.note) }));
        quoted = true;
      }
      if (t.refs) {
        li(fill(L.feel.refs, { text: quote(t.refs) }));
        quoted = true;
      }
      if (quoted) li(L.feel.quote);
      li(fill(L.feel.start, std));
      break;
    }
    case 'color': {
      out.push(...colorTable(cat, spec), '');
      li(L.color.primaryRule);
      li(L.color.theme[spec.theme]);
      for (const c of lookChecks(looks, spec)) {
        if (c.id === 'fontLicense' || c.id === 'darkRecheck') continue;
        li(fill(L.checks[c.id], 'hex' in c ? { hex: c.hex } : {}));
      }
      if (!short) li(L.color.fixed);
      li(fill(L.color.standard, std));
      break;
    }
    case 'type': {
      const T = L.type;
      const custom = spec.fontName !== undefined;
      if (spec.heading.id === spec.body.id && !custom) li(fill(T.one, { body: spec.body.name, label: spec.font.label }));
      else li(fill(T.pair, { heading: custom ? quote(spec.fontName || spec.font.label) : spec.heading.name, body: spec.body.name, label: spec.font.label }));
      if (custom) li(fill(T.mine, { text: quote(spec.fontName ?? ''), body: spec.body.name }));
      const families = custom || spec.heading.id === spec.body.id ? [spec.body] : [spec.heading, spec.body];
      for (const f of families) li(familyLoad(cat, spec, f));
      if (!short) li(fill(T.license, { list: families.map((f) => `${f.name} ${f.license}`).join(', ') }));
      const t = spec.density.type;
      const w = spec.font.headingWeight;
      const size = ([s, h]: [number, number], weight?: number): string => `${s}/${h}${weight ? `/${weight}` : ''}`;
      li(fill(T.sizes, { title: size(t.title, w), subtitle: size(t.subtitle, w), bodyLg: size(t.bodyLg), body: size(t.body), label: size(t.label, 600), caption: size(t.caption) }));
      li(T.korean);
      if (!short && (custom || spec.heading.id !== spec.body.id)) li(T.headingOnly);
      if (spec.mood.tabularNums) li(T.tabular);
      if (!short) li(T.families);
      break;
    }
    case 'layout': {
      const d = spec.density;
      li(fill(L.layout.density, { label: d.label, gutter: d.gutter, section: d.section, row: d.row, tap: d.tap }));
      li(pickTemplate(cat.data.templates.devices, spec.deviceTag, 'device.both'));
      if (spec.layout) li(fill(L.layout.pick, { label: spec.layout.label }));
      else if (spec.texts.layoutText) li(fill(L.layout.mine, { text: quote(spec.texts.layoutText) }));
      li(L.layout.safeArea);
      break;
    }
    case 'depth': {
      li(fill(L.depth[spec.depth.id] ?? '', { shadow: spec.depth.shadow }));
      if (spec.depth.border > 0) li(fill(L.depth['border'] ?? '', { n: spec.depth.border }));
      break;
    }
    case 'shape': {
      const [sm, md, lg] = spec.radius.values;
      li(fill(isPill(spec) ? L.shape.pill : L.shape.radius, { sm: px(sm), md: px(md), lg: px(lg) }));
      break;
    }
    case 'parts': {
      const P = L.parts;
      if (!short) {
        const comps = new Map(looks.components.map((c) => [c.id, c]));
        const type = pickTemplate(cat.data.templates.types, spec.typeTag, 'type.page');
        const used: LookComponent[] = [];
        li(P.intro);
        for (const s of type.screens) {
          const list = s.components.map((id) => need(comps.get(id), `components.${id}`));
          for (const c of list) if (!used.includes(c)) used.push(c);
          out.push(`  - ${fill(P.screen, { screen: s.name, parts: list.map((c) => c.label).join(', ') })}`);
        }
        for (const s of spec.texts.screens ?? []) out.push(`  - ${fill(P.screen, { screen: quote(s), parts: cat.data.templates.pack.screenAdded })}`);
        const states = ['loading', 'empty', 'error'].map((id) => need(comps.get(id), `components.${id}`));
        li(fill(P.states, { states: states.map((c) => c.label).join(' · ') }));
        li(fill(P.primary, { tap: spec.density.tap }));
        li(P.secondary);
        li(P.text);
        li(P.rules);
        for (const c of [...used, ...states]) out.push(`  - ${c.label}: ${c.rule}`);
      } else li(fill(P.primary, { tap: spec.density.tap }));
      break;
    }
    case 'motion': {
      const m = spec.motion;
      li(fill(L.motion[m.id] ?? '', { label: m.label, press: m.press, screen: m.screen, list: m.list, celebrate: m.celebrate, easing: m.easing ?? '' }));
      if (m.id !== 'none' && spec.mood.motionStyle) li(L.motion[spec.mood.motionStyle] ?? '');
      li(L.motion['reduce'] ?? '');
      break;
    }
    case 'icons': {
      const I = L.icons;
      const set = spec.icons;
      if (set?.name) li(fill(I.set, { name: set.name, label: set.label, license: set.license ?? '', home: set.home ?? '', react: set.react ?? '' }));
      else if (set) li(I.few);
      else if (spec.texts.iconsText) li(fill(I.mine, { text: quote(spec.texts.iconsText) }));
      li(I.rule);
      if (spec.imagery) li(L.imagery[spec.imagery.id] ?? '');
      else if (spec.texts.imageryText) li(fill(L.imagery['mine'] ?? '', { text: quote(spec.texts.imageryText) }));
      li(L.imagery['rule'] ?? '');
      break;
    }
    case 'a11y': {
      for (const line of L.a11y) li(line);
      if (spec.theme !== 'light') li(L.checks.darkRecheck);
      break;
    }
    case 'dos': {
      for (const line of [...L.dos.common, ...(L.dos.moods[spec.mood.id] ?? []), ...L.dos.cliches]) li(line);
      break;
    }
  }
  return out;
}

/**
 * 설계도 6번 '디자인 지시' 본문 (제목 줄 '## 6. 디자인 지시'는 renderPack이 붙인다).
 * 전체 판: 묶음 열하나 + 디자인 값(CSS) + AI에게 줄 예시 요청. 짧은 판(무료 AI 채팅): 6-1·6-2·6-3·6-6·6-7(주 버튼)·6-10·6-11 + CSS + 예시
 */
export function renderLookSection(cat: Catalog, looks: Looks, spec: LookSpec): string[] {
  const L = cat.data.templates.look;
  const out: string[] = [];
  if (!spec.short) out.push(L.designMd, '');
  const groups = spec.short ? SHORT_GROUPS : LOOK_GROUPS;
  for (const g of groups) out.push(`### ${L.sub[g]}`, '', ...groupLines(cat, looks, spec, g, spec.short), '');
  const where = L.css.where[spec.screenTool ?? ''] ?? L.css.where['default'] ?? '';
  out.push(`### ${L.sub.css}`, '', where, '', '```css', renderLookCss(cat, spec), '```', '');
  const type = pickTemplate(cat.data.templates.types, spec.typeTag, 'type.page');
  out.push(`### ${L.sub.ask}`, '', `> ${fill(L.ask, { screen: type.screens[0]?.name ?? '' })}`);
  return out;
}

// ── CSS 값 ─────────────────────────────────────────────

/** CSS 값에 넣을 글꼴 이름: 따옴표·괄호·세미콜론 같은 CSS를 깨는 글자를 뺀다 (직접 쓴 이름) */
function cssFamily(name: string): string {
  return `"${name.replace(/["'\\;{}<>/*]/g, '').trim()}"`;
}

function colorVars(c: LookColors): string[] {
  return [
    `--color-bg: ${c.bg};`,
    `--color-surface: ${c.surface};`,
    `--color-text: ${c.text};`,
    `--color-text-muted: ${c.muted};`,
    `--color-border: ${c.border};`,
    `--color-line: ${c.line};`,
    `--color-primary: ${c.primary};`,
    `--color-on-primary: ${c.onPrimary};`,
    `--color-link: ${c.link};`,
    `--color-primary-soft: ${c.soft};`,
    `--color-success: ${c.success};`,
    `--color-error: ${c.error};`,
  ];
}

/**
 * 디자인 값 묶음 (설계서 4.8절, design.md 7.3절). 이름은 Tailwind CSS v4(4.3.3)의 이름표(--color-* --font-* --text-*
 * --text-*--line-height --radius-* --spacing-* --container-* --shadow-* --ease-*)에 맞춘다: 그대로 @theme에 옮길 수 있게.
 * '둘 다'일 때만 color-scheme: light dark와 어두운 화면 미디어 쿼리, '어둡게만'이면 어두운 값이 :root에. 동작 줄이기 묶음은 늘 붙인다
 */
export function renderLookCss(cat: Catalog, spec: LookSpec): string {
  const L = cat.data.templates.look;
  const t = spec.density.type;
  const [sm, md, lg] = spec.radius.values;
  const bodyCss = `${spec.body.css}, ${spec.body.fallback}`;
  const headingCss = spec.fontName ? `${cssFamily(spec.fontName)}, ${bodyCss}` : `${spec.heading.css}, ${spec.heading.fallback}`;
  const main = spec.theme === 'dark' ? spec.colors.dark : spec.colors.light;
  const vars = [
    ...(spec.theme === 'both' ? ['color-scheme: light dark;'] : spec.theme === 'dark' ? ['color-scheme: dark;'] : []),
    ...colorVars(main),
    `--font-sans: ${bodyCss};`,
    `--font-heading: ${headingCss};`,
    `--font-weight-heading: ${spec.font.headingWeight};`,
    ...(
      [
        ['title', t.title],
        ['subtitle', t.subtitle],
        ['body-lg', t.bodyLg],
        ['body', t.body],
        ['label', t.label],
        ['caption', t.caption],
      ] as const
    ).flatMap(([name, [size, lh]]) => [`--text-${name}: ${px(size)};`, `--text-${name}--line-height: ${lh};`]),
    `--radius-sm: ${px(sm)};`,
    `--radius-md: ${px(md)};`,
    `--radius-lg: ${px(lg)};`,
    '--radius-full: 9999px;',
    `--radius-button: ${isPill(spec) ? '9999px' : px(md)};`,
    `--spacing-gutter: ${px(spec.density.gutter)};`,
    `--spacing-section: ${px(spec.density.section)};`,
    `--spacing-row: ${px(spec.density.row)};`,
    `--spacing-tap: ${px(spec.density.tap)};`,
    '--container-content: 720px;',
    `--border-width: ${px(Math.max(1, spec.depth.border))};`,
    ...(spec.depth.shadow !== 'none' ? [`--shadow-card: ${spec.depth.shadow};`] : []),
    `--duration-press: ${spec.motion.press}ms;`,
    `--duration-screen: ${spec.motion.screen}ms;`,
    `--duration-list: ${spec.motion.list}ms;`,
    ...(spec.motion.easing ? [`--ease-bounce: ${spec.motion.easing};`] : []),
  ];
  const comment = fill(L.css.comment, { mood: spec.mood.label, accent: spec.accent.id !== undefined ? spec.accent.label : spec.accent.source }).replace(/\*\//g, '');
  const out = [`/* ${comment} */`, ':root {', ...vars.map((v) => `  ${v}`), '}'];
  if (spec.theme === 'both') out.push('@media (prefers-color-scheme: dark) {', '  :root {', ...colorVars(spec.colors.dark).map((v) => `    ${v}`), '  }', '}');
  out.push(
    '@media (prefers-reduced-motion: reduce) {',
    '  *, *::before, *::after {',
    '    animation-duration: 0.01ms !important;',
    '    animation-iteration-count: 1 !important;',
    '    transition-duration: 0.01ms !important;',
    '    scroll-behavior: auto !important;',
    '  }',
    '}',
  );
  return out.join('\n');
}

// ── DESIGN.md ──────────────────────────────────────────

/** DESIGN.md 본문 제목 (@google/design.md 0.4.0 형식: 영어 이름 그대로여야 순서 검사가 알아본다). 내용은 한국어 */
const DESIGN_MD_HEADINGS: Readonly<Record<LookGroup, string>> = {
  feel: 'Overview',
  color: 'Colors',
  type: 'Typography',
  layout: 'Layout',
  depth: 'Elevation & Depth',
  shape: 'Shapes',
  parts: 'Components',
  motion: 'Motion',
  icons: 'Iconography',
  a11y: 'Accessibility',
  dos: "Do's and Don'ts",
};

const yaml = (s: string): string => JSON.stringify(s);

/**
 * DESIGN.md (설계서 4.8절): 맨 위 YAML(colors · typography · rounded · spacing · components) + 영어 ## 제목과 한국어 본문.
 * 어두운 색도 부품(-dark)에서 써서 orphaned-tokens 경고가 나지 않게 하고, 테두리·나눔 선처럼 글자가 아닌 색은
 * backgroundColor만 있는 1px 부품으로 적는다 (글자 대비 검사에 걸리지 않게). 발행 시각은 description에
 */
export function renderDesignMd(cat: Catalog, looks: Looks, spec: LookSpec, opts: { project: string; issuedAt: string }): string {
  const L = cat.data.templates.look;
  const themeLabel = looks.themes.find((x) => x.id === spec.theme)?.label ?? spec.theme;
  const sides: ('light' | 'dark')[] = spec.theme === 'both' ? ['light', 'dark'] : [spec.theme === 'dark' ? 'dark' : 'light'];
  const suffix = (side: 'light' | 'dark'): string => (spec.theme === 'both' && side === 'dark' ? '-dark' : '');
  const lines: string[] = ['---', 'version: alpha', `name: ${yaml(spec.texts.appName ?? opts.project)}`];
  lines.push(
    `description: ${yaml(fill(L.designMdDescription, { mood: spec.mood.label, accent: spec.accent.label, theme: themeLabel, issued: opts.issuedAt }))}`,
  );
  lines.push('colors:');
  for (const side of sides) {
    const c = spec.colors[side];
    const s = suffix(side);
    const pairs: [string, string][] = [
      ['primary', c.primary],
      ['on-primary', c.onPrimary],
      ['primary-soft', c.soft],
      ['link', c.link],
      ['neutral', c.surface],
      ['surface', c.bg],
      ['on-surface', c.text],
      ['on-surface-muted', c.muted],
      ['outline', c.border],
      ['divider', c.line],
      ['error', c.error],
      ['success', c.success],
    ];
    for (const [k, v] of pairs) lines.push(`  ${k}${s}: ${yaml(v)}`);
  }
  const t = spec.density.type;
  const headingFamily = spec.fontName ? spec.fontName.replace(/["\\]/g, '') : familyName(spec.heading);
  const bodyFamily = familyName(spec.body);
  const typo: [string, string, [number, number], number][] = [
    ['headline-lg', headingFamily, t.title, spec.font.headingWeight],
    ['headline-md', headingFamily, t.subtitle, spec.font.headingWeight],
    ['body-lg', bodyFamily, t.bodyLg, 400],
    ['body-md', bodyFamily, t.body, 400],
    ['label-md', bodyFamily, t.label, 600],
    ['caption', bodyFamily, t.caption, 400],
  ];
  lines.push('typography:');
  for (const [k, fam, [size, lh], weight] of typo) {
    lines.push(`  ${k}:`, `    fontFamily: ${yaml(fam)}`, `    fontSize: ${px(size)}`, `    fontWeight: ${weight}`, `    lineHeight: ${lh}`);
  }
  const [sm, md, lg] = spec.radius.values;
  lines.push('rounded:', `  sm: ${px(sm)}`, `  md: ${px(md)}`, `  lg: ${px(lg)}`, '  full: 9999px');
  const d = spec.density;
  lines.push('spacing:', '  xs: 4px', '  sm: 8px', `  md: ${px(d.gutter)}`, '  lg: 24px', `  xl: ${px(d.section)}`, `  gutter: ${px(d.gutter)}`, '  max-width: 720px');
  lines.push('components:');
  const comp = (name: string, props: [string, string][]): void => {
    lines.push(`  ${name}:`, ...props.map(([k, v]) => `    ${k}: ${v}`));
  };
  for (const side of sides) {
    const s = suffix(side);
    const ref = (k: string): string => yaml(`{colors.${k}${s}}`);
    comp(`button-primary${s}`, [
      ['backgroundColor', ref('primary')],
      ['textColor', ref('on-primary')],
      ['typography', yaml('{typography.label-md}')],
      ['rounded', yaml(isPill(spec) ? '{rounded.full}' : '{rounded.md}')],
      ['height', px(d.tap)],
      ['padding', '16px'],
    ]);
    comp(`button-secondary${s}`, [
      ['backgroundColor', ref('primary-soft')],
      ['textColor', ref('link')],
      ['rounded', yaml(isPill(spec) ? '{rounded.full}' : '{rounded.md}')],
      ['height', px(d.tap)],
    ]);
    comp(`link${s}`, [
      ['backgroundColor', ref('neutral')],
      ['textColor', ref('link')],
    ]);
    comp(`page${s}`, [
      ['backgroundColor', ref('surface')],
      ['textColor', ref('on-surface')],
    ]);
    comp(`card${s}`, [
      ['backgroundColor', ref('neutral')],
      ['textColor', ref('on-surface')],
      ['rounded', yaml('{rounded.lg}')],
      ['padding', px(d.gutter)],
    ]);
    comp(`helper-text${s}`, [
      ['backgroundColor', ref('neutral')],
      ['textColor', ref('on-surface-muted')],
      ['typography', yaml('{typography.caption}')],
    ]);
    comp(`input-outline${s}`, [
      ['backgroundColor', ref('outline')],
      ['height', '1px'],
    ]);
    comp(`divider${s}`, [
      ['backgroundColor', ref('divider')],
      ['height', '1px'],
    ]);
    comp(`error-text${s}`, [
      ['backgroundColor', ref('surface')],
      ['textColor', ref('error')],
    ]);
    comp(`success-text${s}`, [
      ['backgroundColor', ref('surface')],
      ['textColor', ref('success')],
    ]);
  }
  lines.push('---', '');
  for (const g of LOOK_GROUPS) {
    lines.push(`## ${DESIGN_MD_HEADINGS[g]}`, '', ...groupLines(cat, looks, spec, g, false), '');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
