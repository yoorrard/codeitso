// 디자인 정하기 엔진 시험 (T38, docs/review/v3/brief.md 4.3~4.5·4.8·4.11절, design.md 5·7절).
// 기대값: 앱 종류별 기본값은 설계서 4.3절 표, 대비 목표는 looks.json contrast.target(4.6:1), 낱말은 4.5절 예.
import { lint } from '@google/design.md/linter';
import { describe, expect, it } from 'vitest';
import type { EngineResult, Session } from '../../src/lib/engine/index.ts';
import { evaluate, fromShareState, normalizeSession, projectName, renderPack, renderReceiptText, receiptModel, toShareState } from '../../src/lib/engine/index.ts';
import { contrast, hexToOklch, oklchToHex, ratio2 } from '../../src/lib/engine/color.ts';
import { LOOK_ROW_FIELDS, LOOK_TEXT_MAX, lookFromShare, lookPickedRows, lookShareState, lookTypeKeys, moodOrder, normalizeLookShape } from '../../src/lib/engine/look-choice.ts';
import { lookMoodOrder } from '../../src/lib/data-parts.ts';
import { ACCENT_RULES, LOOK_FILE_NAME, darkSoftOf, darkenForWhite, deriveAccent, lookChecks, lookSpec, lookSummary, normalizeLook, referenceWords } from '../../src/lib/engine/look.ts';
import { LOOK_GROUPS, renderDesignMd, renderLookCss, renderLookSection } from '../../src/lib/engine/look-render.ts';
import type { LookChoice } from '../../src/lib/engine/types.ts';
import { loadLooks } from '../../scripts/lib/load-data.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const looks = loadLooks();
const T = looks.contrast.target;
const L = cat.data.templates.look;

/** 급식 안내 페이지(무료 AI 채팅·HTML 한 장) 답 + 바꿀 것 */
const BASE: Record<string, string> = {
  'q.type': 'page',
  'q.audience': 'anyone',
  'q.ai': 'chat-free',
  'q.save': 'no',
  'q.domain': 'education',
  'q.edu-topic': 'meal',
  'q.realtime': 'daily',
  'q.budget': 'free-only',
  'q.payment': 'no',
  'q.device': 'phone',
  'q.style': 'clean',
};
const CART = ['html-single', 'neis-meal', 'google-sheets-apps-script'];

function run(answers: Record<string, string> = {}, extra: Partial<Session> = {}): EngineResult {
  return evaluate(cat, { answers: { ...BASE, ...answers }, cart: CART, kept: [], deferred: [], ...extra });
}
const spec = (answers: Record<string, string> = {}, extra: Partial<Session> = {}) => lookSpec(cat, looks, run(answers, extra));

describe('앱 종류별 기본값 (설계서 4.3절 표, 7종)', () => {
  const rows: [type: string, moods: string[], density: string, imagery: string, layout: string][] = [
    ['record', ['warm', 'clean', 'cute'], 'normal', 'sketch', 'recent-list'],
    ['form', ['serious', 'clean', 'warm'], 'normal', 'none', 'all-fields'],
    ['page', ['clean', 'warm', 'bold'], 'airy', 'shapes', 'today-big'],
    ['quiz', ['cute', 'retro', 'bold'], 'normal', 'shapes', 'one-question'],
    ['tool', ['clean', 'serious', 'retro'], 'normal', 'none', 'one-screen'],
    ['board', ['serious', 'clean', 'bold'], 'compact', 'none', 'number-cards'],
    ['custom', ['clean', 'cute', 'serious'], 'normal', 'none', 'one-feature'],
  ];
  it.each(rows)('%s: 모르겠어요면 추천 첫째, 타일 앞 셋은 추천 순서', (type, moods, density, imagery, layout) => {
    const s = spec({ 'q.type': type, 'q.style': 'unknown' });
    expect(s.mood.id).toBe(moods[0]);
    expect(s.moodFrom).toBe('default');
    expect(s.order.slice(0, 3)).toEqual(moods);
    expect([...s.order].sort()).toEqual(looks.moods.map((m) => m.id).sort());
    expect(s.density.id).toBe(density);
    expect(s.imagery?.id).toBe(imagery);
    expect(s.layout?.id).toBe(layout);
    expect(s.theme).toBe('light');
  });

  it("앱 종류를 '아직 안 정했어요'로 두면 직접 쓴 앱 줄 (배치는 안내 페이지 화면)", () => {
    const s = spec({ 'q.type': 'unknown', 'q.style': 'unknown' });
    expect(s.type).toBe('custom');
    expect(s.mood.id).toBe('clean');
    expect(s.layoutType).toBe('page');
  });

  it('느낌을 고르면 느낌의 짝(색·글꼴·모서리·깊이·아이콘·움직임)이 기본값', () => {
    for (const m of looks.moods) {
      const s = spec({ 'q.style': m.id });
      expect(s.mood.id).toBe(m.id);
      expect(s.moodFrom).toBe('picked');
      expect(s.accent.id).toBe(m.accent);
      expect(s.font.id).toBe(m.font);
      expect(s.neutral.id).toBe(m.neutral);
      expect(s.depth.id).toBe(m.depth);
      expect(s.icons?.id).toBe(m.icons);
      expect(s.motion.id).toBe(m.motion);
      expect(s.radius.values).toEqual(m.radiusValues ?? looks.radius.find((r) => r.id === m.radius)?.values);
    }
  });

  it('설계서 4.3절의 느낌 색 (밝음 / 어두움)', () => {
    const want: Record<string, [string, string]> = {
      clean: ['#1D63D6', '#7AB0FF'],
      cute: ['#B8236F', '#FF8CC8'],
      serious: ['#2A3B8F', '#A3B3FF'],
      bold: ['#C42B36', '#FF8E8E'],
      warm: ['#1B7A4A', '#6FD69C'],
      retro: ['#6A45D1', '#B9A6FF'],
    };
    for (const [id, [light, dark]] of Object.entries(want)) {
      const s = spec({ 'q.style': id });
      expect([s.colors.light.primary, s.colors.dark.primary], id).toEqual([light, dark]);
    }
  });
});

describe('직접 쓴 말 반영 (설계서 4.5절): 고른 값 > 쓴 말에서 찾은 값 > 기본값', () => {
  const written = (text: string, look?: LookChoice) => spec({ 'q.style': 'custom' }, { notes: { 'q.style': text }, ...(look ? { look } : {}) });

  it("‘바다처럼 시원하게’ → 대표 색 청록 (찾은 말 '바다')", () => {
    const s = written('바다처럼 시원하게');
    expect(s.accent.id).toBe('teal');
    expect(s.accentFrom).toBe('text');
    expect(s.found).toContainEqual({ field: 'accent', id: 'teal', word: '바다', text: '바다처럼 시원하게' });
    expect(s.texts.mood).toBe('바다처럼 시원하게');
  });

  it("‘레트로 게임’ → 느낌 오락실처럼", () => {
    const s = written('레트로 게임');
    expect(s.mood.id).toBe('retro');
    expect(s.moodFrom).toBe('text');
    expect(s.accent.id).toBe('purple');
  });

  it("‘다크’ → 밝기 '둘 다' (어둡게만이 아니다)", () => {
    const s = written('다크');
    expect(s.theme).toBe('both');
    expect(s.themeFrom).toBe('text');
  });

  it('찾지 못하면 앱 종류 기본값이고 글은 6-1에 그대로', () => {
    const s = written('우리 반 분위기대로');
    expect(s.found).toEqual([]);
    expect(s.mood.id).toBe('clean');
    expect(renderLookSection(cat, looks, s).join('\n')).toContain(fill(L.feel.mine, { text: '우리 반 분위기대로' }));
  });

  it('직접 고른 값이 쓴 말을 이긴다', () => {
    const s = written('바다처럼 시원하고 다크하게', { accent: 'red', theme: 'light' });
    expect(s.accent.id).toBe('red');
    expect(s.accentFrom).toBe('picked');
    expect(s.theme).toBe('light');
    expect(s.found).toEqual([]);
  });

  it('느낌 보기를 골랐으면 남아 있는 쓴 말로 느낌을 바꾸지 않는다 (색은 찾는다)', () => {
    const s = spec({ 'q.style': 'serious' }, { notes: { 'q.style': '레트로 초록' } });
    expect(s.mood.id).toBe('serious');
    expect(s.accent.id).toBe('green');
  });

  it('대표 색 이름에서도 색을 찾는다', () => {
    expect(spec({}, { look: { accentName: '우리 학교 남색' } }).accent.id).toBe('navy');
  });
});

describe('대비 (설계서 4.4절): 견본 80쌍과 테두리', () => {
  it('대표 색 10 × 바탕 4 × 밝기 2 = 80쌍이 모두 4.6:1 이상', () => {
    let pairs = 0;
    for (const a of looks.accents) {
      for (const n of looks.neutrals) {
        expect(contrast(a.light, n.light.surface), `${a.id}/${n.id} 밝음`).toBeGreaterThanOrEqual(T);
        expect(contrast(a.dark, n.dark.surface), `${a.id}/${n.id} 어두움`).toBeGreaterThanOrEqual(T);
        pairs += 2;
      }
      expect(contrast('#FFFFFF', a.light), `${a.id} 흰 버튼 글자`).toBeGreaterThanOrEqual(T);
      expect(contrast(looks.fixed.onDark, a.dark), `${a.id} 어두운 버튼 글자`).toBeGreaterThanOrEqual(T);
      expect(contrast(a.light, a.soft), `${a.id} 옅은 면`).toBeGreaterThanOrEqual(T);
      expect(contrast(a.dark, darkSoftOf(a.dark)), `${a.id} 어두운 옅은 면`).toBeGreaterThanOrEqual(T);
    }
    expect(pairs).toBe(80);
    expect(looks.accents.some((a) => a.id === 'yellow' || a.label === '노랑')).toBe(false);
  });

  it('입력 테두리는 3.1:1 이상, 글자·약한 글자는 4.6:1 이상', () => {
    for (const n of looks.neutrals) {
      for (const side of ['light', 'dark'] as const) {
        const c = n[side];
        expect(contrast(c.border, c.bg), `${n.id} ${side} 테두리`).toBeGreaterThanOrEqual(looks.contrast.border);
        expect(contrast(c.text, c.surface), `${n.id} ${side} 글자`).toBeGreaterThanOrEqual(T);
        expect(contrast(c.muted, c.surface), `${n.id} ${side} 약한 글자`).toBeGreaterThanOrEqual(T);
      }
    }
  });

  it('청록은 4.6:1에 모자라 L을 0.01 낮춘 값을 쓴다 (설계서 4.4절, design.md의 #0B7A80은 먹 면 위 4.52)', () => {
    const ink = looks.neutrals.find((n) => n.id === 'ink');
    expect(contrast('#0B7A80', ink?.light.surface ?? '')).toBeLessThan(T);
    expect(looks.accents.find((a) => a.id === 'teal')?.light).toBe('#02777D');
  });
});

describe('직접 고른 색 (deriveAccent, 설계서 4.4절 규칙 1~4)', () => {
  const six = ['#00A651', '#FFD400', '#808080', '#E4007F', '#7B3FE4', '#FFFFFF'];
  it.each(six)('%s: 버튼 글자·글자색·어두운 색이 모두 4.6:1 이상 (바탕 넷 모두)', (hex) => {
    for (const n of looks.neutrals) {
      const a = deriveAccent(hex, n);
      expect([ACCENT_RULES.onLight[0], ACCENT_RULES.onLight[1]]).toContain(a.light.onButton);
      expect(contrast(a.light.onButton, a.light.button), '버튼 글자').toBeGreaterThanOrEqual(T);
      for (const bg of [n.light.bg, n.light.surface, a.light.soft]) expect(contrast(a.light.text, bg), `글자 ${bg}`).toBeGreaterThanOrEqual(T);
      for (const bg of [n.dark.bg, n.dark.surface, a.dark.soft]) expect(contrast(a.dark.button, bg), `어두운 ${bg}`).toBeGreaterThanOrEqual(T);
      expect(contrast(a.dark.onButton, a.dark.button), '어두운 버튼 글자').toBeGreaterThanOrEqual(T);
      // 옅은 면: L 0.96, C 0.03 이하
      const soft = hexToOklch(a.light.soft);
      expect(soft.l).toBeGreaterThan(0.95);
      expect(soft.c).toBeLessThanOrEqual(0.031);
    }
  });

  it('학교 초록 #00A651: 버튼은 그대로, 글자는 검게(흰 글자 3.19:1), 글자·링크 색은 더 진하게', () => {
    const a = deriveAccent('#00A651', looks.neutrals[0] ?? looks.neutrals[1]!);
    expect(a.light.button).toBe('#00A651');
    expect(a.light.onButton).toBe('#111111');
    expect(a.notes).toMatchObject({ buttonText: 'dark', buttonAdjusted: false, textDarkened: true, darkRaised: false });
    expect(hexToOklch(a.light.text).l).toBeLessThan(hexToOklch('#00A651').l);
    expect(a.dark.button).toBe('#00A651');
  });

  it('흰 글자가 되는 색은 흰 글자, 둘 다 되면 흰 글자', () => {
    const n = looks.neutrals[0]!;
    expect(deriveAccent('#7B3FE4', n).light.onButton).toBe('#FFFFFF');
    expect(deriveAccent('#7B3FE4', n).notes.textDarkened).toBe(false);
    expect(deriveAccent('#1F2937', n).light.onButton).toBe('#FFFFFF');
  });

  it('흰 글자도 검은 글자도 4.6:1에 못 미치는 좁은 띠(#E4007F)는 버튼 바탕을 조금 옮긴다', () => {
    expect(contrast('#FFFFFF', '#E4007F')).toBeLessThan(T);
    expect(contrast('#111111', '#E4007F')).toBeLessThan(T);
    const a = deriveAccent('#E4007F', looks.neutrals[0]!);
    expect(a.notes.buttonAdjusted).toBe(true);
    expect(a.light.button).not.toBe('#E4007F');
    expect(contrast(a.light.onButton, a.light.button)).toBeGreaterThanOrEqual(T);
  });

  it('[흰 글자로 두기]: 흰 글자가 4.6:1이 될 때까지 진하게', () => {
    for (const hex of ['#00A651', '#FFD400', '#808080']) {
      const d = darkenForWhite(hex);
      expect(contrast('#FFFFFF', d), hex).toBeGreaterThanOrEqual(T);
      expect(hexToOklch(d).l).toBeLessThan(hexToOklch(hex).l);
    }
    expect(darkenForWhite('#1D63D6')).toBe('#1D63D6');
  });

  it('OKLCH 왕복은 같은 색 (8비트 반올림 안)', () => {
    for (const hex of ['#1D63D6', '#00A651', '#FFFFFF', '#000000', '#808080', '#E4007F']) expect(oklchToHex(hexToOklch(hex))).toBe(hex);
  });
});

describe('lookChecks: 밝기에 맞는 알림만', () => {
  it('학교 초록: 버튼 글자를 검게(숫자는 접기 안), 글자색을 진하게', () => {
    const s = spec({}, { look: { accent: '#00A651' } });
    const checks = lookChecks(looks, s);
    expect(checks).toContainEqual({ id: 'buttonDark', hex: '#111111', white: ratio2(contrast('#FFFFFF', '#00A651')), dark: ratio2(contrast('#111111', '#00A651')) });
    expect(checks.some((c) => c.id === 'textDarker')).toBe(true);
    expect(checks.some((c) => c.id === 'darkRecheck')).toBe(false);
  });

  it('흰색을 고르면 버튼 둘레에 선, 어둡게만이면 밝은 화면 알림을 내지 않는다', () => {
    expect(lookChecks(looks, spec({}, { look: { accent: '#FFFFFF' } })).some((c) => c.id === 'buttonEdge')).toBe(true);
    const dark = lookChecks(looks, spec({}, { look: { accent: '#FFFFFF', theme: 'dark' } }));
    expect(dark.some((c) => c.id === 'buttonEdge' || c.id === 'buttonDark')).toBe(false);
    expect(dark.some((c) => c.id === 'darkRecheck')).toBe(true);
  });

  it('빨강 대표 색이면 오류에 그림과 글을 붙이라는 알림', () => {
    expect(lookChecks(looks, spec({ 'q.style': 'bold' })).some((c) => c.id === 'redAccent')).toBe(true);
    expect(lookChecks(looks, spec({}, { look: { accent: '#D9232E' } })).some((c) => c.id === 'redAccent')).toBe(true);
    expect(lookChecks(looks, spec({ 'q.style': 'clean' })).some((c) => c.id === 'redAccent')).toBe(false);
  });

  it('글꼴을 직접 쓰면 라이선스 확인, 9번 알아볼 것에도 한 장 (영수증 수도 같다)', () => {
    const r = run({}, { look: { font: 'custom', fontName: '우리체' } });
    expect(lookChecks(looks, lookSpec(cat, looks, r))).toContainEqual({ id: 'fontLicense', name: '우리체' });
    expect(r.research.map((x) => x.id)).toContain('research.look-font');
    expect(run().research.map((x) => x.id)).not.toContain('research.look-font');
    // 영수증 링크로 열어도 글꼴 'custom'은 실려서 알아볼 것 수가 같다 (이름은 없다)
    const back = evaluate(cat, fromShareState(JSON.parse(JSON.stringify(toShareState(r.session)))) ?? {});
    expect(back.research.length).toBe(r.research.length);
    expect(back.session.look?.fontName).toBeUndefined();
  });
});

describe('설계도 6번 (renderLookSection): 짧은 판과 전체 판', () => {
  const sub = (lines: string[]): string[] => lines.filter((l) => l.startsWith('### '));
  const short = renderLookSection(cat, looks, spec());
  const full = renderLookSection(cat, looks, spec({ 'q.ai': 'agent' }));

  it('전체 판: 묶음 열하나 + CSS + 예시 요청, DESIGN.md 안내가 맨 위', () => {
    expect(sub(full)).toEqual([...LOOK_GROUPS.map((g) => `### ${L.sub[g]}`), `### ${L.sub.css}`, `### ${L.sub.ask}`]);
    expect(full[0]).toBe(L.designMd);
  });

  it('짧은 판(무료 AI 채팅): 색·글자·모양·주 버튼·접근성·하지 말 것 + 6-1·CSS·예시', () => {
    expect(sub(short)).toEqual(['feel', 'color', 'type', 'shape', 'parts', 'a11y', 'dos', 'css', 'ask'].map((k) => `### ${L.sub[k as keyof typeof L.sub]}`));
    expect(short.join('\n')).not.toContain(L.designMd);
    expect(short.join('\n')).toContain(fill(L.parts.primary, { tap: 48 }));
    expect(short.join('\n')).not.toContain(L.parts.rules);
  });

  it('줄 수: 짧은 판은 전체 판의 3분의 2 아래, 둘 다 정해진 범위 안', () => {
    expect(short.length).toBeLessThan((full.length * 2) / 3);
    expect(short.length).toBeGreaterThan(50);
    expect(short.length).toBeLessThan(110);
    expect(full.length).toBeGreaterThan(110);
    expect(full.length).toBeLessThan(200);
  });

  it('유료 AI·웹 빌더·코딩 에이전트는 전체 판, 무료 AI 채팅과 고르지 않음은 짧은 판', () => {
    expect(spec({ 'q.ai': 'chat-paid' }).short).toBe(false);
    expect(spec({ 'q.ai': 'builder' }).short).toBe(false);
    expect(spec({ 'q.ai': 'agent' }).short).toBe(false);
    expect(spec({ 'q.ai': 'chat-free' }).short).toBe(true);
  });

  it('밝게만이면 표는 밝은 화면 한 칸, 둘 다면 두 칸', () => {
    const head = (lines: string[]) => lines.find((l) => l.startsWith(`| ${L.color.role} |`));
    expect(head(short)).toBe(`| ${L.color.role} | ${L.color.light} | ${L.color.contrast} |`);
    expect(head(renderLookSection(cat, looks, spec({}, { look: { theme: 'both' } })))).toBe(`| ${L.color.role} | ${L.color.light} | ${L.color.dark} | ${L.color.contrast} |`);
    expect(head(renderLookSection(cat, looks, spec({}, { look: { theme: 'dark' } })))).toBe(`| ${L.color.role} | ${L.color.dark} | ${L.color.contrast} |`);
  });

  it('직접 쓴 말은 따옴표 안의 인용이고, 인용이라는 줄이 붙는다', () => {
    const lines = renderLookSection(cat, looks, spec({}, { look: { note: '버튼은 "크게" 해 줘', refs: '토스' } })).join('\n');
    expect(lines).toContain(fill(L.feel.wish, { text: "버튼은 '크게' 해 줘" }));
    expect(lines).toContain(L.feel.quote);
    expect(lines).toContain(fill(L.feel.refs, { text: '토스' }));
  });

  it('글꼴 받는 줄: HTML 한 장은 <head> 줄, React + Vite는 npm 줄', () => {
    const html = renderLookSection(cat, looks, spec()).join('\n');
    expect(html).toContain('pretendardvariable-dynamic-subset.min.css');
    const react = renderLookSection(cat, looks, lookSpec(cat, looks, evaluate(cat, { answers: { ...BASE, 'q.ai': 'agent' }, cart: ['react-vite', 'neis-meal', 'google-sheets-apps-script'] }))).join('\n');
    expect(react).toContain('npm install pretendard');
  });

  it('같은 입력이면 같은 줄, 채우지 않은 자리가 없다', () => {
    expect(renderLookSection(cat, looks, spec())).toEqual(short);
    for (const m of looks.moods) {
      for (const theme of ['light', 'dark', 'both'] as const) {
        const text = renderLookSection(cat, looks, spec({ 'q.style': m.id, 'q.ai': 'agent' }, { look: { theme } })).join('\n');
        expect(text, `${m.id} ${theme}`).not.toMatch(/\{\{|\}\}|undefined/);
      }
    }
  });
});

describe('CSS 값 (renderLookCss)', () => {
  const css = (theme: 'light' | 'dark' | 'both') => renderLookCss(cat, spec({}, { look: { theme } }));

  it("'둘 다'일 때만 color-scheme: light dark와 어두운 화면 미디어 쿼리", () => {
    expect(css('both')).toContain('@media (prefers-color-scheme: dark)');
    expect(css('both')).toContain('color-scheme: light dark;');
    for (const t of ['light', 'dark'] as const) {
      expect(css(t), t).not.toContain('prefers-color-scheme');
      expect(css(t), t).not.toContain('color-scheme: light dark');
    }
    expect(css('dark')).toContain('color-scheme: dark;');
    expect(css('dark')).toContain(`--color-bg: ${looks.neutrals[0]?.dark.bg};`);
  });

  it('동작 줄이기 묶음은 늘 붙는다', () => {
    for (const t of ['light', 'dark', 'both'] as const) expect(css(t)).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('이름은 Tailwind v4 이름표 (--color-* --font-* --text-* --text-*--line-height --radius-*)', () => {
    const c = css('light');
    for (const v of ['--color-primary:', '--color-on-primary:', '--font-sans:', '--font-heading:', '--text-title:', '--text-title--line-height:', '--text-body:', '--radius-md:', '--spacing-gutter:', '--container-content:']) {
      expect(c, v).toContain(v);
    }
  });

  it('직접 쓴 글꼴 이름은 CSS를 깨는 글자를 뺀다', () => {
    const c = renderLookCss(cat, spec({}, { look: { font: 'custom', fontName: '나눔"};<x>' } }));
    expect(c).toContain('--font-heading: "나눔x"');
  });
});

describe('DESIGN.md (renderDesignMd, @google/design.md 0.4.0)', () => {
  const md = (answers: Record<string, string>, look?: LookChoice) => {
    const r = run(answers, look ? { look } : {});
    return renderDesignMd(cat, looks, lookSpec(cat, looks, r), { project: projectName(cat, r), issuedAt: '2026-10-14 10:00' });
  };

  it('파일 이름은 늘 DESIGN.md', () => {
    expect(LOOK_FILE_NAME).toBe('DESIGN.md');
  });

  it('YAML 머리 + 영어 ## 제목 열하나 (순서대로), 발행 시각은 description에', () => {
    const text = md({});
    expect(text.startsWith('---\nversion: alpha\n')).toBe(true);
    const heads = text.split('\n').filter((l) => l.startsWith('## '));
    expect(heads).toEqual([
      '## Overview',
      '## Colors',
      '## Typography',
      '## Layout',
      '## Elevation & Depth',
      '## Shapes',
      '## Components',
      '## Motion',
      '## Iconography',
      '## Accessibility',
      "## Do's and Don'ts",
    ]);
    expect(text).toMatch(/^description: ".*2026-10-14 10:00.*"$/m);
  });

  const cases: [string, Record<string, string>, LookChoice | undefined][] = [
    ['깔끔하게 밝게만', {}, undefined],
    ['귀엽게 둘 다 (알약)', { 'q.style': 'cute' }, { theme: 'both' }],
    ['강렬하게 어둡게만', { 'q.style': 'bold' }, { theme: 'dark' }],
    ['오락실처럼 노랑 둘 다', { 'q.style': 'retro' }, { accent: '#FFD400', theme: 'both' }],
    ['포근하게 흰색 + 직접 쓴 글꼴', { 'q.style': 'warm' }, { accent: '#FFFFFF', font: 'custom', fontName: '우리 "학교" 체' }],
    ['차분하게 #E4007F 앱 이름', { 'q.style': 'serious' }, { accent: '#E4007F', appName: '반 알림' }],
  ];
  it.each(cases)('%s: 린트 오류 0 · 경고 0', (_name, answers, look) => {
    const report = lint(md(answers, look));
    const bad = report.findings.filter((f) => f.severity !== 'info');
    expect(bad, JSON.stringify(bad)).toEqual([]);
    expect(report.summary.errors).toBe(0);
  });

  it('앱 이름이 있으면 name에', () => {
    expect(md({}, { appName: '반 알림' })).toContain('name: "반 알림"');
  });
});

describe('설계도에 넣기 (renderPack design)', () => {
  it('디자인 묶음 줄을 6번에 그대로 넣는다', () => {
    const r = run();
    const design = renderLookSection(cat, looks, lookSpec(cat, looks, r));
    const md = renderPack(cat, r, { siteUrl: 'https://cc.test', issuedAt: '2026-10-14 10:00', design });
    expect(md).toContain(`## ${cat.data.templates.pack.headings.design}\n\n${design.join('\n')}`);
    expect(md).not.toContain(cat.data.templates.pack.designPending);
  });

  it('디자인 묶음을 못 받았으면 6번에 다시 받으라는 한 줄', () => {
    const md = renderPack(cat, run(), { siteUrl: 'https://cc.test', issuedAt: '2026-10-14 10:00' });
    expect(md).toContain(`- ${cat.data.templates.pack.designPending}`);
    expect(md).toContain(`- ${cat.data.templates.pack.labels.styleFeel}: 깔끔하게`);
  });

  it("'내 말로' 넓히기(P1): 앱 이름은 1번, 더하고 싶은 화면은 3번에 (내가 더함)", () => {
    const md = renderPack(cat, run({}, { look: { appName: '반 급식', screens: ['알레르기 표'] } }), { siteUrl: 'https://cc.test', issuedAt: 'x' });
    expect(md).toContain(`- ${cat.data.templates.pack.labels.appName}: “반 급식”`);
    expect(md).toContain(`**“알레르기 표”** ${cat.data.templates.pack.screenAdded}`);
  });

  it('디자인은 추천·막힌 곳·영수증 숫자를 바꾸지 않는다 (글꼴을 직접 쓴 때의 알아볼 것 하나만 더한다)', () => {
    const plain = run();
    const looked = run({}, { look: { accent: '#00A651', theme: 'both', radius: 'pill', density: 'compact', note: '크게' } });
    expect(looked.slots).toEqual(plain.slots);
    expect(looked.conflicts).toEqual(plain.conflicts);
    expect(looked.research).toEqual(plain.research);
    expect(renderReceiptText(receiptModel(cat, looked, 'x'))).toBe(renderReceiptText(receiptModel(cat, plain, 'x')));
  });
});

describe('세션·영수증 링크의 디자인', () => {
  it('normalizeSession: 모양만 고른다 (색은 대문자, 모르는 밝기·글자 수 넘침은 정리)', () => {
    const s = normalizeSession(cat, {
      answers: {},
      cart: [],
      look: { accent: '#00a651', theme: 'night' as never, font: 'custom', fontName: '가'.repeat(50), radius: 'custom', note: '  한\n줄  ', screens: ['a', '', 'b', 'c', 'd'], extra: 1 } as unknown as LookChoice,
    });
    expect(s.look).toEqual({ accent: '#00A651', font: 'custom', fontName: '가'.repeat(LOOK_TEXT_MAX.fontName), note: '한 줄', screens: ['a', 'b', 'c'] });
    expect(normalizeSession(cat, { answers: {}, cart: [] }).look).toBeUndefined();
    expect(normalizeLookShape({ accent: 'not an id!', theme: 'both' })).toEqual({ theme: 'both' });
  });

  it('evaluate는 session.look을 결과에 실어 둔다', () => {
    expect(run({}, { look: { accent: 'teal' } }).session.look).toEqual({ accent: 'teal' });
  });

  it('영수증 링크에는 보기 id와 #RRGGBB만 (글 칸 없음, custom은 글꼴만)', () => {
    const look: LookChoice = {
      accent: '#00A651',
      accentName: '학교 초록',
      theme: 'both',
      font: 'custom',
      fontName: '우리체',
      icons: 'custom',
      iconsText: '내 아이콘',
      layout: 'week-list',
      note: '비밀 바람',
      refs: '토스',
      appName: '반 앱',
      screens: ['표'],
    };
    const st = toShareState({ answers: {}, cart: [], kept: [], deferred: [], look });
    expect(st.l).toEqual({ accent: '#00A651', theme: 'both', font: 'custom', layout: 'week-list' });
    expect(JSON.stringify(st)).not.toMatch(/학교 초록|우리체|내 아이콘|비밀|토스|반 앱|표/);
    expect(fromShareState(JSON.parse(JSON.stringify(st)))?.look).toEqual({ accent: '#00A651', theme: 'both', font: 'custom', layout: 'week-list' });
  });

  it('링크에서 받은 디자인: 모양이 틀리거나 싣지 않는 칸은 버린다', () => {
    expect(lookFromShare({ accent: '#zzzzzz', theme: 'both', note: '몰래', icons: 'custom', motion: 'lively' })).toEqual({ theme: 'both', motion: 'lively' });
    expect(lookFromShare('x')).toBeUndefined();
    expect(lookShareState({ note: '글만' })).toBeUndefined();
  });

  it('normalizeLook: looks.json에 없는 id를 버린다 (디자인 묶음에서)', () => {
    expect(normalizeLook(looks, { accent: 'gold', font: 'comic', radius: 'round', layout: 'week-list', motion: 'wild', icons: 'custom', iconsText: 'x' })).toEqual({
      radius: 'round',
      layout: 'week-list',
      icons: 'custom',
      iconsText: 'x',
    });
    // 모르는 id가 든 링크로 열어도 기본값으로 그린다
    const s = spec({}, { look: { accent: 'gold' } });
    expect(s.accent.id).toBe('blue');
  });

  it('다른 앱 종류의 배치 id는 그 앱 종류의 첫 배치로', () => {
    expect(spec({ 'q.type': 'quiz' }, { look: { layout: 'week-list' } }).layout?.id).toBe('one-question');
  });
});

describe('1단계 느낌 타일 순서와 시트 상태 한 줄 (단계 화면 첫 묶음, look-choice.ts)', () => {
  const ids = ['clean', 'cute', 'serious', 'bold', 'warm', 'retro'];

  it('추천 셋을 그 순서로 앞에, 나머지는 보기 순서 (lookSpec.order와 같다)', () => {
    const byType = lookMoodOrder(looks);
    for (const type of ['page', 'form', 'record', 'quiz', 'tool', 'board', 'unknown']) {
      const r = run({ 'q.type': type, 'q.style': 'unknown' });
      const [key] = lookTypeKeys(cat, r);
      expect(moodOrder(ids, byType[key] ?? []), type).toEqual(lookSpec(cat, looks, r).order);
    }
    expect(moodOrder(ids, ['warm', 'clean', 'cute'])).toEqual(['warm', 'clean', 'cute', 'serious', 'bold', 'retro']);
  });

  it('보기에 없거나 겹친 추천 id는 버린다', () => {
    expect(moodOrder(['clean', 'cute'], ['nope', 'cute', 'cute'])).toEqual(['cute', 'clean']);
    expect(moodOrder(ids, [])).toEqual(ids);
  });

  it("앱 종류 열쇠: '모르겠어요'·안 답함은 custom, 화면 열쇠는 태그를 따른다", () => {
    expect(lookTypeKeys(cat, run({ 'q.type': 'board' }))).toEqual(['board', 'board', 'type.dashboard']);
    expect(lookTypeKeys(cat, run({ 'q.type': 'unknown' }))[0]).toBe('custom');
    expect(lookTypeKeys(cat, evaluate(cat, { answers: {}, cart: [], kept: [], deferred: [] }))[0]).toBe('custom');
  });

  it('느낌 말고 더 정한 줄 수: 줄마다 칸 하나라도 있으면 하나', () => {
    expect(lookPickedRows(undefined)).toBe(0);
    expect(lookPickedRows({})).toBe(0);
    expect(lookPickedRows({ accent: 'teal', accentName: '학교 초록' })).toBe(1);
    expect(lookPickedRows({ font: 'custom', fontName: 'Noto', note: '크게', refs: '당근', theme: 'both' })).toBe(4);
    // P1 칸(앱 이름·말투·화면)은 열두 줄 밖이다
    expect(lookPickedRows({ appName: '급식' })).toBe(0);
    expect(Object.keys(LOOK_ROW_FIELDS)).toHaveLength(11);
  });
});

describe('그 밖', () => {
  it('미리 보기 이름표', () => {
    expect(lookSummary(cat, spec(), '이번 주 급식')).toBe(fill(cat.data.templates.lookSummary, { title: '이번 주 급식', mood: '깔끔하게', accent: '파랑', font: '기본 고딕' }));
  });

  it('앱 종류별 영어 찾을 낱말', () => {
    expect(referenceWords(looks, { layoutType: 'quiz' })).toEqual(['quiz', 'progress bar', 'result screen', 'onboarding']);
  });

  it('직접 고른 색이면 색 이름은 #코드, 견본이면 견본 이름', () => {
    expect(spec({}, { look: { accent: '#00A651', accentName: '학교 초록' } }).accent.label).toBe('#00A651');
    expect(spec({}, { look: { accent: 'teal' } }).accent.label).toBe('청록');
  });
});

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, k: string) => String(vars[k]));
}
