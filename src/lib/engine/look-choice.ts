// 디자인 정하기에서 고른 것(Session.look)의 모양 고르기 (T38, 설계서 4.10절). 순수 함수.
// evaluate()·영수증 링크가 쓰는 작은 파일이다: data/looks.json과 색 계산(look.ts)은 단계 화면 첫 묶음에 싣지 않으므로,
// 여기서는 모양(글자 수·id 꼴·#RRGGBB)만 본다. looks.json에 없는 id는 look.ts normalizeLook이 버린다.
import type { Catalog } from './catalog.ts';
import { tagsWithPrefix } from './conditions.ts';
import type { EngineResult } from './evaluate.ts';
import { oneLine } from './text.ts';
import type { LookChoice } from './types.ts';

/** 직접 쓰기 칸의 글자 수 (설계서 4.2절) */
export const LOOK_TEXT_MAX = {
  accentName: 20,
  fontName: 30,
  iconsText: 30,
  imageryText: 40,
  layoutText: 40,
  note: 80,
  refs: 60,
  appName: 20,
  toneText: 20,
  screen: 40,
} as const;
/** 더하고 싶은 화면 (P1) */
export const LOOK_SCREENS_MAX = 3;
/** 보기 '직접 쓰기'의 id (질문의 직접 쓰기 보기와 같은 이름) */
export const LOOK_CUSTOM = 'custom';

type TextField = Exclude<keyof typeof LOOK_TEXT_MAX, 'screen'>;
const TEXT_FIELDS: readonly TextField[] = ['accentName', 'fontName', 'iconsText', 'imageryText', 'layoutText', 'note', 'refs', 'appName', 'toneText'];
/** 보기 id 칸. 앞의 넷은 '직접 쓰기'(custom)가 될 수 있다 */
const CUSTOMIZABLE = ['font', 'icons', 'imagery', 'layout', 'tone'] as const;
const PLAIN = ['radius', 'density', 'motion'] as const;
const THEMES: readonly string[] = ['light', 'dark', 'both'];
const ID = /^[a-z][a-z0-9-]{0,31}$/;

const isId = (x: unknown): x is string => typeof x === 'string' && ID.test(x);
/** '#rrggbb' → '#RRGGBB'. color.ts를 부르지 않는다: 색 계산은 디자인 묶음에만 싣는다 (단계 화면 첫 묶음을 키우지 않게) */
const normHex = (x: unknown): string | null => (typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x) ? x.toUpperCase() : null);

function obj(raw: unknown): Record<string, unknown> | null {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

/**
 * 받은 값을 믿지 않고 모양만 고른다: 대표 색은 견본 id 꼴이거나 #RRGGBB(대문자로), 밝기는 셋 중 하나,
 * 보기 칸은 id 꼴, 글 칸은 한 줄로 정해진 글자 수까지(빈 글은 버림), 더하고 싶은 화면은 3개까지. 남는 것이 없으면 undefined
 */
export function normalizeLookShape(raw: unknown): LookChoice | undefined {
  const o = obj(raw);
  if (!o) return undefined;
  const out: LookChoice = {};
  const accent = o['accent'];
  const hex = normHex(accent);
  if (hex) out.accent = hex;
  else if (isId(accent) && accent !== LOOK_CUSTOM) out.accent = accent;
  const theme = o['theme'];
  if (typeof theme === 'string' && THEMES.includes(theme)) out.theme = theme as LookChoice['theme'];
  for (const k of CUSTOMIZABLE) {
    const v = o[k];
    if (isId(v)) out[k] = v;
  }
  for (const k of PLAIN) {
    const v = o[k];
    if (isId(v) && v !== LOOK_CUSTOM) out[k] = v;
  }
  for (const k of TEXT_FIELDS) {
    const v = o[k];
    if (typeof v !== 'string') continue;
    const t = oneLine(v, LOOK_TEXT_MAX[k]);
    if (t) out[k] = t;
  }
  const screens = Array.isArray(o['screens'])
    ? o['screens']
        .filter((x): x is string => typeof x === 'string')
        .map((x) => oneLine(x, LOOK_TEXT_MAX.screen))
        .filter(Boolean)
        .slice(0, LOOK_SCREENS_MAX)
    : [];
  if (screens.length > 0) out.screens = screens;
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * 영수증 링크에 싣는 디자인 (설계서 4.10절): 보기 id와 직접 고른 색 코드만. 글 칸은 싣지 않는다.
 * '직접 쓰기'(custom)는 글꼴만 싣는다: 직접 고른 글꼴은 9번 '글꼴 라이선스' 알아볼 것을 더하므로, 다른 기기에서 열어도
 * 영수증의 알아볼 것 수가 같게 (나머지 칸의 custom은 계산에 쓰지 않아 기본값으로 돌아간다)
 */
export function lookShareState(look: LookChoice | undefined): Record<string, string> | undefined {
  if (!look) return undefined;
  const out: Record<string, string> = {};
  if (look.accent) out['accent'] = look.accent;
  if (look.theme) out['theme'] = look.theme;
  for (const k of [...CUSTOMIZABLE, ...PLAIN]) {
    const v = look[k];
    if (v && (v !== LOOK_CUSTOM || k === 'font')) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** 영수증 링크에서 받은 디자인: lookShareState가 싣는 칸만, 모양이 맞는 것만 (글 칸은 받지 않는다) */
export function lookFromShare(raw: unknown): LookChoice | undefined {
  const o = obj(raw);
  if (!o) return undefined;
  const picked: Record<string, unknown> = {};
  for (const k of ['accent', 'theme', ...CUSTOMIZABLE, ...PLAIN]) if (k in o) picked[k] = o[k];
  return normalizeLookShape(lookShareState(normalizeLookShape(picked)));
}

// ── 앱 종류와 느낌 순서 (단계 화면 첫 묶음: 1단계 느낌 타일, T38 설계서 4.3절) ─────────────

const STYLE_TYPE_Q = 'q.type';
/** 앱 종류 태그 → looks.json의 앱 종류 열쇠 (layouts·defaultsByType·referenceKeywords) */
export const LOOK_TYPE_OF_TAG: Readonly<Record<string, string>> = {
  'type.page': 'page',
  'type.form': 'form',
  'type.record': 'record',
  'type.quiz': 'quiz',
  'type.tool': 'tool',
  'type.dashboard': 'board',
  'type.custom': 'custom',
};
/** 직접 쓴 앱·안 정한 앱의 기본값 열쇠 (설계서 4.3절 표 마지막 줄) */
export const LOOK_CUSTOM_TYPE = 'custom';

/**
 * 앱 종류 열쇠 셋: [기본값 열쇠(q.type이 '모르겠어요'·안 답함이면 custom), 화면·배치 열쇠, 앱 종류 태그].
 * 느낌 타일 순서(1단계)와 디자인 값(look.ts lookSpec)이 같은 열쇠를 쓴다
 */
export function lookTypeKeys(cat: Catalog, r: EngineResult): [string, string, string] {
  const tag = tagsWithPrefix(r.interview.tags, 'type.')[0] ?? 'type.page';
  const layoutType = LOOK_TYPE_OF_TAG[tag] ?? 'page';
  const answer = r.interview.answers[STYLE_TYPE_Q];
  const unknown = cat.question.get(STYLE_TYPE_Q)?.options.find((o) => o.id === answer)?.isUnknown === true;
  return [unknown || answer === undefined ? LOOK_CUSTOM_TYPE : layoutType, layoutType, tag];
}

/**
 * 느낌 보기 순서 (설계서 4.3절): 앱 종류의 추천 셋(looks.json defaultsByType[열쇠].moods)을 그 순서로 앞에, 나머지는 보기 순서.
 * 보기에 없는 추천 id는 버린다. 첫째가 '추천' 꼬리표를 단다
 */
export function moodOrder(ids: readonly string[], recommended: readonly string[]): string[] {
  const front = recommended.filter((id, i) => ids.includes(id) && recommended.indexOf(id) === i);
  return [...front, ...ids.filter((id) => !front.includes(id))];
}

/** 디자인 정하기 시트의 줄 (느낌 빼고 열하나)과 그 줄이 쓰는 칸. 줄 순서는 설계서 4.2절 표와 같다 */
export const LOOK_ROW_FIELDS = {
  accent: ['accent', 'accentName'],
  theme: ['theme'],
  font: ['font', 'fontName'],
  radius: ['radius'],
  density: ['density'],
  motion: ['motion'],
  icons: ['icons', 'iconsText'],
  imagery: ['imagery', 'imageryText'],
  layout: ['layout', 'layoutText'],
  note: ['note'],
  refs: ['refs'],
} as const satisfies Record<string, readonly (keyof LookChoice)[]>;
export type LookRow = keyof typeof LOOK_ROW_FIELDS;

/** 느낌 말고 직접 정한 줄 수 (시트 상태 한 줄 '{n}가지를 더 정했어요'). 칸 하나라도 있으면 그 줄을 정한 것이다 */
export function lookPickedRows(look: LookChoice | undefined): number {
  if (!look) return 0;
  return Object.values(LOOK_ROW_FIELDS).filter((fields) => fields.some((k) => look[k] !== undefined)).length;
}
