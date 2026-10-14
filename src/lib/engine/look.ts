// 디자인 정하기 (T38, 설계서 4절, docs/review/v3/design.md 5·7절). 순수 함수: 화면·시각·난수 없음.
// 이 파일은 디자인 값 정하기(lookSpec)·대비(deriveAccent·lookChecks)이고, 설계도 6번·CSS 값·DESIGN.md 그리기는 look-render.ts다.
// 값은 data/looks.json(Looks). evaluate()는 이 파일을 쓰지 않는다: 디자인은 추천·막힌 곳과 상관없고, 이 파일과 looks.json은
// 단계 화면의 첫 묶음에 싣지 않는다(디자인 묶음 src/lib/look-data.ts, 누를 때 import()).
// 정하는 순서는 셋이다: 직접 고른 값 > 직접 쓴 말에서 찾은 값(낱말표, AI 아님) > 느낌·앱 종류의 기본값.
import type { Catalog } from './catalog.ts';
import { contrast, hexToOklch, isHex, oklchToHex, ratio2, shiftUntil } from './color.ts';
import { tagsWithPrefix } from './conditions.ts';
import type { EngineResult } from './evaluate.ts';
import { LOOK_CUSTOM, LOOK_TYPE_OF_TAG, lookTypeKeys, moodOrder } from './look-choice.ts';
import { findAliases } from './match.ts';
import { fill } from './text.ts';
import type {
  LookChoice,
  LookDensity,
  LookDepth,
  LookFamily,
  LookFont,
  LookIconSet,
  LookKeyword,
  LookMood,
  LookMotion,
  LookNeutral,
  LookOption,
  Looks,
  NeutralSet,
} from './types.ts';

/** 에이전트가 찾는 이름이라 시각을 붙이지 않는다. 발행 시각은 YAML description에 (설계서 4.8절) */
export const LOOK_FILE_NAME = 'DESIGN.md';

const STYLE_Q = 'q.style';
export { LOOK_TYPE_OF_TAG };

export type LookFrom = 'picked' | 'text' | 'default';
export type LookTheme = 'light' | 'dark' | 'both';

/** 대비를 맞출 때 쓰는 값 (looks.json contrast·fixed와 같다, 스키마가 값을 고정한다) */
export interface AccentRules {
  target: number;
  onLight: [string, string];
  onDark: string;
}
export const ACCENT_RULES: AccentRules = { target: 4.6, onLight: ['#FFFFFF', '#111111'], onDark: '#0B1220' };

/** 대표 색 한 벌: 밝은 화면(버튼·버튼 글자·글자·옅은 면)과 어두운 화면(버튼·버튼 글자·옅은 면) */
export interface AccentSet {
  /** 견본 id (직접 고른 색이면 없음) */
  id?: string;
  /** 견본 이름 또는 #RRGGBB */
  label: string;
  /** 고른 색 (견본이면 견본의 밝은 값) */
  source: string;
  light: { button: string; onButton: string; text: string; soft: string };
  dark: { button: string; onButton: string; soft: string };
  /** 고른 색을 그대로 못 쓴 까닭 (화면은 쉬운 말로, 설계도는 6-2에 적는다) */
  notes: { buttonText: 'white' | 'dark'; buttonAdjusted: boolean; textDarkened: boolean; darkRaised: boolean };
}

/** 화면 하나(밝음 또는 어두움)의 색 역할 */
export interface LookColors {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  line: string;
  primary: string;
  onPrimary: string;
  link: string;
  soft: string;
  success: string;
  error: string;
}

/** 잰 대비: 글자/바탕, 약한 글자/면, 테두리/바탕, 버튼 글자/버튼, 링크·강조 글자/면 */
export interface LookRatios {
  text: number;
  muted: number;
  border: number;
  button: number;
  link: number;
}

export interface LookFound {
  field: 'mood' | 'accent' | 'theme';
  id: string;
  /** 찾은 말 (낱말표의 꼴) */
  word: string;
  /** 찾은 글 (원문) */
  text: string;
}

export interface LookSpec {
  /** 기본값 열쇠 (q.type 보기, 직접 쓴 앱·안 정함은 custom) */
  type: string;
  /** 화면·배치 열쇠 (앱 종류 태그) */
  layoutType: string;
  typeTag: string;
  /** 타일 순서: 앱 종류 추천 셋, 나머지는 자료 순서 */
  order: string[];
  mood: LookMood;
  moodFrom: LookFrom;
  accent: AccentSet;
  accentFrom: LookFrom;
  theme: LookTheme;
  themeFrom: LookFrom;
  neutral: LookNeutral;
  font: LookFont;
  heading: LookFamily;
  body: LookFamily;
  fontFrom: LookFrom;
  /** 직접 고른 글꼴 (font가 custom). 이름 없이 받았으면(영수증 링크) 빈 글 */
  fontName?: string;
  radius: { id: string; label: string; values: [number, number, number] };
  density: LookDensity;
  motion: LookMotion;
  depth: LookDepth;
  icons: LookIconSet | null;
  imagery: LookOption | null;
  layout: LookOption | null;
  tone: LookOption | null;
  colors: { light: LookColors; dark: LookColors };
  contrast: { light: LookRatios; dark: LookRatios };
  found: LookFound[];
  /** 직접 쓴 글 (설계도에 '내 말 그대로'로) */
  texts: {
    mood?: string;
    accentName?: string;
    iconsText?: string;
    imageryText?: string;
    layoutText?: string;
    note?: string;
    refs?: string;
    appName?: string;
    toneText?: string;
    screens?: string[];
  };
  /** 화면 도구(2단계 화면 칸에 고른 도구 id). 없으면 null */
  screenTool: string | null;
  /** 무료 AI 채팅(또는 AI를 안 고름): 설계도 6번 짧은 판 */
  short: boolean;
  /** 1단계에서 고른 기기 태그 (device.*) */
  deviceTag?: string;
}

export type LookCheck =
  | { id: 'buttonDark'; hex: string; white: number; dark: number }
  | { id: 'buttonAdjusted'; hex: string }
  | { id: 'textDarker'; hex: string }
  | { id: 'darkRaised'; hex: string }
  | { id: 'buttonEdge'; hex: string }
  | { id: 'redAccent' }
  | { id: 'darkRecheck' }
  | { id: 'fontLicense'; name: string };

// ── 색 ────────────────────────────────────────────────

/** 옅은 주색 면: OKLCH 밝기 0.96, 채도 0.03 이하 (설계서 4.4절 4) */
export function softOf(hex: string): string {
  const o = hexToOklch(hex);
  return oklchToHex({ l: 0.96, c: Math.min(o.c, 0.03), h: o.h });
}

/** 어두운 화면의 옅은 주색 면: OKLCH 밝기 0.26, 채도 0.05 이하 (design.md 7.3절). 면으로만 쓴다 */
export function darkSoftOf(hex: string): string {
  const o = hexToOklch(hex);
  return oklchToHex({ l: 0.26, c: Math.min(o.c, 0.05), h: o.h });
}

/** [흰 글자로 두기]: 흰 글자가 기준을 넘을 때까지 버튼 바탕을 진하게 바꾼 색 (설계서 4.4절) */
export function darkenForWhite(hex: string, rules: AccentRules = ACCENT_RULES): string {
  return shiftUntil(hex.toUpperCase(), -0.01, (x) => contrast(rules.onLight[0], x) >= rules.target).hex;
}

/**
 * 직접 고른 색에서 대표 색 한 벌을 만든다 (설계서 4.4절 규칙 1~4, 엔진 목표 4.6:1).
 * 1. 버튼 바탕은 고른 색 그대로. 버튼 글자는 흰색과 #111111 중 목표를 넘는 쪽(둘 다면 흰색).
 *    둘 다 못 넘는 좁은 띠(회색 L≈0.18)에서는 버튼 바탕을 가까운 쪽으로 조금 옮긴다(buttonAdjusted).
 * 2. 글자·링크 색은 바탕·면·옅은 면 모두에서 목표를 넘을 때까지 L을 0.01씩 낮춘다.
 * 3. 어두운 화면 색은 어두운 바탕·면·어두운 옅은 면에서, 그리고 그 위 진한 글자가 목표를 넘을 때까지 L을 0.01씩 올린다.
 * 4. 옅은 면은 L 0.96, C 0.03 이하 (어두운 옅은 면은 L 0.26, C 0.05 이하).
 */
export function deriveAccent(hex: string, neutral: { light: NeutralSet; dark: NeutralSet }, rules: AccentRules = ACCENT_RULES): AccentSet {
  const src = hex.toUpperCase();
  const T = rules.target;
  const [white, ink] = rules.onLight;
  let button = src;
  let onButton = white;
  let buttonAdjusted = false;
  if (contrast(white, src) >= T) onButton = white;
  else if (contrast(ink, src) >= T) onButton = ink;
  else {
    const down = shiftUntil(src, -0.01, (x) => contrast(white, x) >= T);
    const up = shiftUntil(src, 0.01, (x) => contrast(ink, x) >= T);
    const l0 = hexToOklch(src).l;
    const useUp = Math.abs(hexToOklch(up.hex).l - l0) < Math.abs(hexToOklch(down.hex).l - l0);
    button = useUp ? up.hex : down.hex;
    onButton = useUp ? ink : white;
    buttonAdjusted = true;
  }
  const soft = softOf(src);
  const n = neutral.light;
  const text = shiftUntil(src, -0.01, (x) => [n.bg, n.surface, soft].every((s) => contrast(x, s) >= T));
  const d = neutral.dark;
  const dark = shiftUntil(
    src,
    0.01,
    (x) => [d.bg, d.surface, darkSoftOf(x)].every((s) => contrast(x, s) >= T) && contrast(rules.onDark, x) >= T,
  );
  return {
    label: src,
    source: src,
    light: { button, onButton, text: text.hex, soft },
    dark: { button: dark.hex, onButton: rules.onDark, soft: darkSoftOf(dark.hex) },
    notes: { buttonText: onButton === white ? 'white' : 'dark', buttonAdjusted, textDarkened: text.moved, darkRaised: dark.moved },
  };
}

/** 견본 색 한 벌 (looks.json에 든 값 그대로, 대비는 npm run validate가 지킨다) */
function swatchAccent(sw: Looks['accents'][number], rules: AccentRules): AccentSet {
  const [white, ink] = rules.onLight;
  const onButton = contrast(white, sw.light) >= rules.target ? white : ink;
  return {
    id: sw.id,
    label: sw.label,
    source: sw.light,
    light: { button: sw.light, onButton, text: sw.light, soft: sw.soft },
    dark: { button: sw.dark, onButton: rules.onDark, soft: darkSoftOf(sw.dark) },
    notes: { buttonText: onButton === white ? 'white' : 'dark', buttonAdjusted: false, textDarkened: false, darkRaised: false },
  };
}

function rulesOf(looks: Looks): AccentRules {
  return { target: looks.contrast.target, onLight: looks.fixed.onLight, onDark: looks.fixed.onDark };
}

// ── 고른 것 정리 ───────────────────────────────────────

const byId = <T extends { id: string }>(list: readonly T[], id: string | undefined): T | undefined => (id === undefined ? undefined : list.find((x) => x.id === id));

/**
 * looks.json에 없는 id를 버린다 (영수증 링크·옛 저장값). 대표 색은 견본 id나 #RRGGBB, 첫 화면 배치는 어느 앱 종류의 배치든,
 * '직접 쓰기'(custom)는 글꼴·아이콘·그림·배치·말투에만. 글 칸은 그대로 둔다 (모양은 normalizeSession이 이미 골랐다)
 */
export function normalizeLook(looks: Looks, choice: LookChoice | undefined): LookChoice {
  const c: LookChoice = { ...(choice ?? {}) };
  if (c.accent !== undefined && !isHex(c.accent) && !byId(looks.accents, c.accent)) delete c.accent;
  const keep = (k: 'font' | 'icons' | 'imagery' | 'tone', list: readonly { id: string }[]): void => {
    const v = c[k];
    if (v !== undefined && v !== LOOK_CUSTOM && !byId(list, v)) delete c[k];
  };
  keep('font', looks.fonts);
  keep('icons', looks.iconSets);
  keep('imagery', looks.imagery);
  keep('tone', looks.tones);
  const layouts = Object.values(looks.layouts).flat();
  if (c.layout !== undefined && c.layout !== LOOK_CUSTOM && !byId(layouts, c.layout)) delete c.layout;
  if (c.radius !== undefined && !byId(looks.radius, c.radius)) delete c.radius;
  if (c.density !== undefined && !byId(looks.density, c.density)) delete c.density;
  if (c.motion !== undefined && !byId(looks.motion, c.motion)) delete c.motion;
  return c;
}

/** 글 여럿에서 낱말표의 말을 찾아 가장 많이 찾은 대상 하나 (같으면 앞 글·앞자리·자료 순서) */
function bestHit(texts: (string | undefined)[], entries: LookKeyword[], field: LookFound['field']): LookFound | null {
  const found = new Map<string, { words: string[]; first: number; text: string }>();
  texts.forEach((text, ti) => {
    if (!text) return;
    for (const h of findAliases(text, entries)) {
      const f = found.get(h.id) ?? { words: [], first: ti * 10000 + h.start, text };
      if (!f.words.includes(h.word)) f.words.push(h.word);
      found.set(h.id, f);
    }
  });
  const order = entries.map((e) => e.id);
  const best = [...found].sort(([a, x], [b, y]) => y.words.length - x.words.length || x.first - y.first || order.indexOf(a) - order.indexOf(b))[0];
  if (!best) return null;
  const [id, f] = best;
  return { field, id, word: f.words[0] ?? '', text: f.text };
}

/** 화면 칸(기능 screen)에 고른 도구 id */
function screenToolOf(r: EngineResult): string | null {
  return r.slots.find((s) => s.slot.capability === 'screen')?.filledBy[0] ?? null;
}

function need<T>(x: T | undefined, what: string): T {
  if (x === undefined) throw new Error(`looks.json에 없습니다: ${what}`);
  return x;
}

/**
 * 고른 것·쓴 말·앱 종류로 디자인 값을 모두 정한다 (설계서 4.3~4.5절). 결과는 미리 보기·대비 줄·설계도 6번·CSS·DESIGN.md가 함께 쓴다
 */
export function lookSpec(cat: Catalog, looks: Looks, r: EngineResult): LookSpec {
  const choice = normalizeLook(looks, r.session.look);
  const notes = r.session.notes ?? {};
  const moodText = notes[STYLE_Q];
  const [type, layoutType, typeTag] = lookTypeKeys(cat, r);
  const defaults = need(looks.defaultsByType[type], `defaultsByType.${type}`);
  const found: LookFound[] = [];

  // 느낌: q.style의 답이 느낌이면 고른 것, 아니면(직접 쓰기·모르겠어요) 쓴 말 → 앱 종류 추천 첫째
  const answer = r.interview.answers[STYLE_Q];
  let mood = byId(looks.moods, answer);
  let moodFrom: LookFrom = 'picked';
  if (!mood) {
    const hit = bestHit([moodText], looks.keywords.mood, 'mood');
    mood = hit ? byId(looks.moods, hit.id) : undefined;
    if (mood && hit) {
      moodFrom = 'text';
      found.push(hit);
    } else {
      mood = need(byId(looks.moods, defaults.moods[0]), `moods.${defaults.moods[0]}`);
      moodFrom = 'default';
    }
  }
  const order = moodOrder(looks.moods.map((m) => m.id), defaults.moods);
  const neutral = need(byId(looks.neutrals, mood.neutral), `neutrals.${mood.neutral}`);
  const rules = rulesOf(looks);

  // 대표 색
  let accent: AccentSet;
  let accentFrom: LookFrom = 'picked';
  if (choice.accent && isHex(choice.accent)) accent = deriveAccent(choice.accent, neutral, rules);
  else if (choice.accent) accent = swatchAccent(need(byId(looks.accents, choice.accent), `accents.${choice.accent}`), rules);
  else {
    const hit = bestHit([moodText, choice.accentName], looks.keywords.accent, 'accent');
    const sw = hit ? byId(looks.accents, hit.id) : undefined;
    if (sw && hit) {
      accentFrom = 'text';
      found.push(hit);
      accent = swatchAccent(sw, rules);
    } else {
      accentFrom = 'default';
      accent = swatchAccent(need(byId(looks.accents, mood.accent), `accents.${mood.accent}`), rules);
    }
  }

  // 밝기: 어두운 말은 '둘 다'로 (어둡게만으로 두지 않는다)
  let theme: LookTheme = 'light';
  let themeFrom: LookFrom = 'default';
  if (choice.theme) {
    theme = choice.theme;
    themeFrom = 'picked';
  } else {
    const hit = bestHit([moodText], looks.keywords.theme, 'theme');
    if (hit) {
      theme = 'both';
      themeFrom = 'text';
      found.push(hit);
    }
  }

  // 글꼴
  const fontId = choice.font && choice.font !== LOOK_CUSTOM ? choice.font : mood.font;
  const font = need(byId(looks.fonts, fontId), `fonts.${fontId}`);
  const heading = need(byId(looks.families, font.heading), `families.${font.heading}`);
  const body = need(byId(looks.families, font.body), `families.${font.body}`);

  const step = need(byId(looks.radius, choice.radius ?? mood.radius), `radius.${choice.radius ?? mood.radius}`);
  const rv = choice.radius ? step.values : (mood.radiusValues ?? step.values);
  const radius = { id: step.id, label: step.label, values: [rv[0] ?? 0, rv[1] ?? 0, rv[2] ?? 0] as [number, number, number] };

  const density = need(byId(looks.density, choice.density ?? defaults.density), `density.${choice.density ?? defaults.density}`);
  const motion = need(byId(looks.motion, choice.motion ?? mood.motion), `motion.${choice.motion ?? mood.motion}`);
  const depth = need(byId(looks.depths, mood.depth), `depths.${mood.depth}`);
  const icons = choice.icons === LOOK_CUSTOM && choice.iconsText ? null : need(byId(looks.iconSets, choice.icons && choice.icons !== LOOK_CUSTOM ? choice.icons : mood.icons), 'iconSets');
  const imagery = choice.imagery === LOOK_CUSTOM && choice.imageryText ? null : (byId(looks.imagery, choice.imagery !== LOOK_CUSTOM ? choice.imagery : undefined) ?? need(byId(looks.imagery, defaults.imagery), `imagery.${defaults.imagery}`));
  const typeLayouts = looks.layouts[layoutType] ?? [];
  const layout = choice.layout === LOOK_CUSTOM && choice.layoutText ? null : (byId(typeLayouts, choice.layout) ?? typeLayouts[0] ?? null);
  const tone = choice.tone === LOOK_CUSTOM ? null : (byId(looks.tones, choice.tone) ?? null);

  const colorsOf = (side: 'light' | 'dark'): LookColors => {
    const n = neutral[side];
    const a = side === 'light' ? accent.light : { ...accent.dark, text: accent.dark.button };
    return {
      bg: n.bg,
      surface: n.surface,
      text: n.text,
      muted: n.muted,
      border: n.border,
      line: n.line,
      primary: a.button,
      onPrimary: a.onButton,
      link: a.text,
      soft: a.soft,
      success: looks.fixed.success[side],
      error: looks.fixed.error[side],
    };
  };
  const colors = { light: colorsOf('light'), dark: colorsOf('dark') };
  const ratiosOf = (c: LookColors): LookRatios => ({
    text: contrast(c.text, c.bg),
    muted: contrast(c.muted, c.surface),
    border: contrast(c.border, c.bg),
    button: contrast(c.onPrimary, c.primary),
    link: contrast(c.link, c.surface),
  });

  const texts: LookSpec['texts'] = {};
  if (moodText) texts.mood = moodText;
  for (const k of ['accentName', 'iconsText', 'imageryText', 'layoutText', 'note', 'refs', 'appName', 'toneText'] as const) {
    const v = choice[k];
    if (v) texts[k] = v;
  }
  if (choice.screens && choice.screens.length > 0) texts.screens = choice.screens;

  const aiTag = tagsWithPrefix(r.interview.tags, 'ai.')[0] ?? 'ai.chat-free';
  const spec: LookSpec = {
    type,
    layoutType,
    typeTag,
    order,
    mood,
    moodFrom,
    accent: choice.accentName && accent.id === undefined ? { ...accent, label: accent.source } : accent,
    accentFrom,
    theme,
    themeFrom,
    neutral,
    font,
    heading,
    body,
    fontFrom: choice.font ? 'picked' : 'default',
    radius,
    density,
    motion,
    depth,
    icons,
    imagery,
    layout,
    tone,
    colors,
    contrast: { light: ratiosOf(colors.light), dark: ratiosOf(colors.dark) },
    found,
    texts,
    screenTool: screenToolOf(r),
    short: aiTag === 'ai.chat-free',
  };
  if (choice.font === LOOK_CUSTOM) spec.fontName = choice.fontName ?? '';
  const device = tagsWithPrefix(r.interview.tags, 'device.')[0];
  if (device) spec.deviceTag = device;
  return spec;
}

/** 미리 보기·대비 줄·설계도에 함께 알릴 것 (밝기에 맞는 것만) */
export function lookChecks(looks: Looks, spec: LookSpec): LookCheck[] {
  const out: LookCheck[] = [];
  const a = spec.accent;
  const light = spec.theme !== 'dark';
  const dark = spec.theme !== 'light';
  const [white, ink] = looks.fixed.onLight;
  if (light && a.notes.buttonAdjusted) out.push({ id: 'buttonAdjusted', hex: a.light.button });
  if (light && a.notes.buttonText === 'dark') {
    out.push({ id: 'buttonDark', hex: a.light.onButton, white: ratio2(contrast(white, a.light.button)), dark: ratio2(contrast(ink, a.light.button)) });
  }
  if (light && a.notes.textDarkened) out.push({ id: 'textDarker', hex: a.light.text });
  if (light && contrast(a.light.button, spec.colors.light.bg) < looks.contrast.nonText) out.push({ id: 'buttonEdge', hex: spec.colors.light.border });
  if (dark && a.notes.darkRaised) out.push({ id: 'darkRaised', hex: a.dark.button });
  if (isRed(looks, a)) out.push({ id: 'redAccent' });
  if (dark) out.push({ id: 'darkRecheck' });
  if (spec.fontName !== undefined) out.push({ id: 'fontLicense', name: spec.fontName });
  return out;
}

/** 대표 색이 오류 색(빨강)과 헷갈리는가: 빨강 견본, 또는 직접 고른 색의 색상이 오류 색에서 20도 안이고 채도가 뚜렷함 */
function isRed(looks: Looks, a: AccentSet): boolean {
  if (a.id !== undefined) return a.id === 'red';
  const e = hexToOklch(looks.fixed.error.light);
  const o = hexToOklch(a.source);
  const dh = Math.abs(((o.h - e.h + 540) % 360) - 180);
  return o.c >= 0.1 && dh <= 20;
}

/** 미리 보기 이름표 (role="img"): 제목과 느낌·색·글꼴 */
export function lookSummary(cat: Catalog, spec: LookSpec, title: string): string {
  return fill(cat.data.templates.lookSummary, { title, mood: spec.mood.label, accent: spec.accent.label, font: spec.font.label });
}

/** 이 앱 종류의 영어 찾을 낱말 (다른 앱 둘러보기 칩) */
export function referenceWords(looks: Looks, spec: Pick<LookSpec, 'layoutType'>): string[] {
  const k = looks.referenceKeywords[spec.layoutType] ?? looks.referenceKeywords['custom'];
  return k ? [...k.first, ...k.more] : [];
}
