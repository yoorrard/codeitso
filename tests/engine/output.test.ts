// 출력 엔진 시험: 글자 도우미(text.ts), 영수증(receipt.ts), 설계도·대화 카드·파일 이름(pack.ts),
// 그 밖의 함수(extras.ts: 배지, 에러 사전, 공유 상태, 확인 문제).
// 기대값은 docs/ENGINE.md 6·7절, docs/RECEIPT.md, data/templates.json, data/scoring.json
// (phaseSplitDifficulty 6, baseMinutes 30)으로 손으로 계산했다.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Catalog, EngineResult, ReceiptModel, Session } from '../../src/lib/engine/index.ts';
import { evaluate } from '../../src/lib/engine/index.ts';
import { badges, checkQuiz, fromShareState, matchErrors, toShareState } from '../../src/lib/engine/extras.ts';
import { conversationCards, packFileName, renderPack } from '../../src/lib/engine/pack.ts';
import { difficultyWord, projectName, receiptModel, renderReceiptText, slotLabelFor } from '../../src/lib/engine/receipt.ts';
import { cell, displayWidth, fill, formatMinutes, oneLine, padEndWidth, padStartWidth, truncateWidth } from '../../src/lib/engine/text.ts';
import type { ErrorEntry, Product } from '../../src/lib/engine/types.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { DATA_DIR, readJson } from '../../scripts/lib/load-data.ts';
import { concept, option, product, question, realCatalog, realData, slotRule, stuckRule, tinyCatalog } from '../fixtures/tiny.ts';

// ── 도우미 ─────────────────────────────────────────────

const WIDTH = 36;
const ISSUED = '2026-10-12 14:05';
const SITE = 'https://cc.test';
const REAL = realCatalog();
const T = REAL.data.templates;

/** 답 하나로 태그를 한꺼번에 주는 질문 */
function tagQuestion(tags: Record<string, number>): ReturnType<typeof question> {
  return question('q.tags', [option('o', tags)]);
}
const ANSWERED = { 'q.tags': 'o' };

const GOLDEN: Golden[] = readdirSync(join(DATA_DIR, 'golden'))
  .filter((f) => /^case-\d+\.json$/.test(f))
  .sort()
  .map((f) => readJson<Golden>(join(DATA_DIR, 'golden', f)));

function golden(id: string): Golden {
  const g = GOLDEN.find((x) => x.id === id);
  if (!g) throw new Error(`골든 사례가 없습니다: ${id}`);
  return g;
}

function goldenResult(id: string, extra: Partial<Session> = {}): EngineResult {
  return evaluate(REAL, { ...goldenSession(golden(id)), ...extra });
}

function widths(text: string): number[] {
  return text.split('\n').map(displayWidth);
}

/** 실제 칸 id와 이름을 쓰는 작은 칸 규칙 (영수증·설계도용) */
const SLOT_SCREEN = slotRule('slot-rule.screen', { id: 'slot.screen', label: '화면', capability: 'screen', required: true, order: 10, mustFill: true });
const SLOT_STORE = slotRule('slot-rule.store', { id: 'slot.store', label: '저장', capability: 'store', required: true, order: 20 });
const SLOT_AUTH = slotRule('slot-rule.auth', { id: 'slot.auth', label: '로그인', capability: 'auth', required: true, order: 30, deferrable: true });
const SLOT_DATA = slotRule('slot-rule.data', { id: 'slot.data', label: '외부 데이터', capability: 'data', required: true, order: 40 });
const SLOT_NOTIFY = slotRule('slot-rule.notify', { id: 'slot.notify', label: '알림', capability: 'notify', required: true, order: 45, deferrable: true });
const SLOT_HOST = slotRule('slot-rule.host', { id: 'slot.host', label: '배포·공유', capability: 'host', required: false, order: 50 });

/** 화면(무료·난이도 1·10분) + 저장과 배포를 함께 맡는 상품(무료·난이도 2·20분) + 유료 알림(난이도 3·40분) */
function receiptCatalog(tags: Record<string, number> = { 'type.record': 1 }): Catalog {
  return tinyCatalog({
    questions: [tagQuestion(tags)],
    rules: [SLOT_SCREEN, SLOT_STORE, SLOT_NOTIFY, SLOT_HOST],
    products: [
      product('p.screen', { name: '화면 상품', capabilities: ['screen'], difficulty: 1, setupMinutes: 10 }),
      product('p.both', { name: '저장 배포 상품', capabilities: ['store', 'host'], difficulty: 2, setupMinutes: 20 }),
      product('p.bell', { name: '알림 상품', capabilities: ['notify'], difficulty: 3, setupMinutes: 40, cost: { free: false, note: '월 5달러' } }),
    ],
  });
}
const RECEIPT_CART = ['p.screen', 'p.both', 'p.bell'];

function modelWith(parts: Partial<ReceiptModel>): ReceiptModel {
  const r = evaluate(receiptCatalog(), { answers: ANSWERED, cart: RECEIPT_CART });
  return { ...receiptModel(receiptCatalog(), r, ISSUED), ...parts };
}

// ── text.ts ─────────────────────────────────────────────

describe('fill', () => {
  it('아는 이름을 모두 채운다', () => {
    expect(fill('{{a}}-{{b}}-{{a}}', { a: 'x', b: 2 })).toBe('x-2-x');
    expect(fill('약 {{m}}분', { m: 40 })).toBe('약 40분');
  });

  it('0도 값으로 채운다', () => {
    expect(fill('{{n}}칸', { n: 0 })).toBe('0칸');
  });

  it('빠진 값은 오류를 낸다', () => {
    expect(() => fill('{{project}} 설계도', {})).toThrow(/'project'/);
  });

  it('남는 값은 무시한다', () => {
    expect(fill('그대로', { a: 1 })).toBe('그대로');
  });

  it('이름 꼴이 아니면 건드리지 않는다', () => {
    expect(fill('{{ a }} {a} {{이름}} {{a-b}}', { a: 1 })).toBe('{{ a }} {a} {{이름}} {{a-b}}');
  });

  it('채운 값은 다시 읽지 않는다', () => {
    expect(fill('{{a}}', { a: '{{b}}' })).toBe('{{b}}');
    expect(fill('{{a}}', { a: '$& $1' })).toBe('$& $1');
  });
});

describe('displayWidth', () => {
  it('영문·숫자는 1칸, 한글은 2칸', () => {
    expect(displayWidth('')).toBe(0);
    expect(displayWidth('abc 12')).toBe(6);
    expect(displayWidth('가나')).toBe(4);
    expect(displayWidth('a가')).toBe(3);
    expect(displayWidth('힣')).toBe(2);
  });

  it('한자·가나·전각·한글 자모는 2칸', () => {
    expect(displayWidth('漢字')).toBe(4);
    expect(displayWidth('あア')).toBe(4);
    expect(displayWidth('Ａ，')).toBe(4);
    expect(displayWidth('ㅋ')).toBe(2);
    expect(displayWidth('ᄀ')).toBe(2);
    expect(displayWidth('￦')).toBe(2);
  });

  it('반각 가나·가운뎃점·말줄임표는 1칸', () => {
    expect(displayWidth('ｱ')).toBe(1);
    expect(displayWidth('·')).toBe(1);
    expect(displayWidth('…')).toBe(1);
  });

  it('범위 경계 바로 밖은 1칸', () => {
    expect(displayWidth('ᅟ')).toBe(2);
    expect(displayWidth('ᅠ')).toBe(1);
    expect(displayWidth('힤')).toBe(1);
  });

  it('지금은 코드 포인트마다 센다 (이모지 1칸, 결합 문자도 1칸)', () => {
    expect(displayWidth('😀')).toBe(1);
    expect(displayWidth('é')).toBe(2);
    expect(displayWidth('가')).toBe(3);
  });
});

describe('truncateWidth', () => {
  it('들어가면 그대로 둔다', () => {
    expect(truncateWidth('가나', 4)).toBe('가나');
    expect(truncateWidth('abcd', 4)).toBe('abcd');
  });

  it('넘치면 말줄임표까지 폭 안에서 자른다', () => {
    expect(truncateWidth('abcdef', 4)).toBe('abc…');
    expect(truncateWidth('가나다', 4)).toBe('가…');
    expect(truncateWidth('a가나', 4)).toBe('a가…');
  });

  it('어떤 폭에서도 넘치지 않는다', () => {
    const samples = ['금융위원회 주식시세정보', 'korean-elementary-learning-map-mcp', 'a가b나c다', '漢字テスト'];
    for (const s of samples) {
      for (let max = 1; max <= 30; max++) {
        const out = truncateWidth(s, max);
        expect(displayWidth(out)).toBeLessThanOrEqual(max);
        if (out !== s) {
          expect(out.endsWith('…')).toBe(true);
          expect(s.startsWith(out.slice(0, -1))).toBe(true);
        }
      }
    }
  });
});

describe('폭 맞춤', () => {
  it('padEndWidth는 화면 폭으로 뒤를 채운다', () => {
    expect(padEndWidth('가', 5)).toBe('가   ');
    expect(displayWidth(padEndWidth('가a', 10))).toBe(10);
    expect(padEndWidth('abcdef', 3)).toBe('abcdef');
  });

  it('padStartWidth는 화면 폭으로 앞을 채운다', () => {
    expect(padStartWidth('0원', 4)).toBe(' 0원');
    expect(padStartWidth('유료', 4)).toBe('유료');
    expect(padStartWidth('유료 포함', 4)).toBe('유료 포함');
  });
});

describe('formatMinutes', () => {
  const f = T.receipt.timeFormat;
  it('55분 미만은 10분 단위, 최소 10분', () => {
    expect(formatMinutes(0, f)).toBe('약 10분');
    expect(formatMinutes(4, f)).toBe('약 10분');
    expect(formatMinutes(15, f)).toBe('약 20분');
    expect(formatMinutes(44, f)).toBe('약 40분');
    expect(formatMinutes(45, f)).toBe('약 50분');
    expect(formatMinutes(54, f)).toBe('약 50분');
  });

  it('55분부터 30분 단위', () => {
    expect(formatMinutes(55, f)).toBe('약 1시간');
    expect(formatMinutes(74, f)).toBe('약 1시간');
    expect(formatMinutes(75, f)).toBe('약 1시간 30분');
    expect(formatMinutes(104, f)).toBe('약 1시간 30분');
    expect(formatMinutes(105, f)).toBe('약 2시간');
    expect(formatMinutes(150, f)).toBe('약 2시간 30분');
  });

  it('넘긴 문장 틀을 쓴다', () => {
    const custom = { minutes: '{{m}}m', hours: '{{h}}h', hoursHalf: '{{h}}h30' };
    expect(formatMinutes(30, custom)).toBe('30m');
    expect(formatMinutes(180, custom)).toBe('3h');
    expect(formatMinutes(210, custom)).toBe('3h30');
  });
});

describe('oneLine', () => {
  it('줄바꿈·탭·겹친 공백을 한 칸으로', () => {
    expect(oneLine('  우리 반\r\n\t급식   안내  ')).toBe('우리 반 급식 안내');
  });

  it('기본 80자, 글자(코드 포인트) 기준으로 자른다', () => {
    expect([...oneLine('가'.repeat(100))]).toHaveLength(80);
    expect(oneLine('abcdef', 3)).toBe('abc');
    expect(oneLine('😀😀😀', 2)).toBe('😀😀');
  });

  it('공백뿐이면 빈 문자열', () => {
    expect(oneLine(' \n\t ')).toBe('');
  });
});

describe('cell', () => {
  it('표 칸의 세로줄을 막고 줄바꿈을 없앤다', () => {
    expect(cell('a|b')).toBe('a\\|b');
    expect(cell('a\r\nb\n\nc')).toBe('a b c');
    expect(cell('그대로')).toBe('그대로');
  });
});

// ── receipt.ts ─────────────────────────────────────────────

describe('projectName', () => {
  it('자유 입력을 한 줄 30자로', () => {
    const cat = receiptCatalog();
    const r = evaluate(cat, { answers: ANSWERED, freeText: `  우리 반\n${'가'.repeat(40)}` });
    const name = projectName(cat, r);
    expect(name).toBe(`우리 반 ${'가'.repeat(25)}`);
    expect([...name]).toHaveLength(30);
  });

  it('자유 입력이 비면 유형 이름', () => {
    const cat = receiptCatalog();
    expect(projectName(cat, evaluate(cat, { answers: ANSWERED, freeText: ' \n ' }))).toBe(T.types['type.record']?.label);
    expect(projectName(cat, evaluate(cat, { answers: ANSWERED }))).toBe('기록장');
  });

  it('유형이 여럿이면 id 순 첫 유형', () => {
    const cat = receiptCatalog({ 'type.record': 1, 'type.form': 1 });
    expect(projectName(cat, evaluate(cat, { answers: ANSWERED }))).toBe(T.types['type.form']?.label);
  });

  it('유형이 없거나 모르는 유형이면 내 앱', () => {
    const none = receiptCatalog({});
    expect(projectName(none, evaluate(none, { answers: ANSWERED }))).toBe(T.receipt.unnamed);
    const unknown = receiptCatalog({ 'type.zzz': 1 });
    expect(projectName(unknown, evaluate(unknown, { answers: ANSWERED }))).toBe('내 앱');
  });
});

describe('difficultyWord', () => {
  it('기준 6: 3 이하 쉬움, 6 이하 보통, 넘으면 어려움', () => {
    const w = T.receipt.levels;
    expect([0, 3, 4, 6, 7, 20].map((n) => difficultyWord(REAL, n))).toEqual([w.easy, w.easy, w.normal, w.normal, w.hard, w.hard]);
  });

  it('기준을 바꾸면 경계도 따라간다 (절반은 내림)', () => {
    const cat = tinyCatalog({ scoring: { phaseSplitDifficulty: 5 } });
    const w = T.receipt.levels;
    expect([2, 3, 5, 6].map((n) => difficultyWord(cat, n))).toEqual([w.easy, w.normal, w.normal, w.hard]);
  });
});

describe('slotLabelFor', () => {
  it('맡은 칸이 없으면 기타', () => {
    expect(slotLabelFor(REAL, [], 11)).toBe(T.pack.labels.toolOther);
  });

  it('폭 안이면 쉼표로 잇는다', () => {
    expect(slotLabelFor(REAL, ['화면', '저장'], 11)).toBe('화면, 저장');
  });

  it('폭을 넘으면 첫 칸 외 n개', () => {
    expect(slotLabelFor(REAL, ['저장', '배포·공유'], 11)).toBe('저장 외 1개');
    expect(slotLabelFor(REAL, ['저장', '로그인', '배포·공유'], 11)).toBe('저장 외 2개');
    expect(slotLabelFor(REAL, ['저장', '배포·공유'], 999)).toBe('저장, 배포·공유');
  });

  it('하나뿐이면 길어도 그대로', () => {
    expect(slotLabelFor(REAL, ['아주 긴 칸 이름입니다'], 4)).toBe('아주 긴 칸 이름입니다');
  });
});

describe('receiptModel', () => {
  it('품목: 고른 순서, 맡은 칸, 가격, 도구 비용 합계', () => {
    const cat = receiptCatalog();
    const r = evaluate(cat, { answers: ANSWERED, cart: RECEIPT_CART });
    const m = receiptModel(cat, r, ISSUED);
    expect(m.items).toEqual([
      { slot: '화면', productId: 'p.screen', name: '화면 상품', free: true, price: T.receipt.free, later: false },
      { slot: '저장 외 1개', productId: 'p.both', name: '저장 배포 상품', free: true, price: T.receipt.free, later: false },
      { slot: '알림', productId: 'p.bell', name: '알림 상품', free: false, price: T.receipt.paid, later: false },
    ]);
    expect(m.total).toBe(T.receipt.paidIncluded);
  });

  it('모두 0원으로 시작하면 도구 비용 합계도 0원으로 시작 (요금이라 부르지 않는다)', () => {
    const cat = receiptCatalog();
    const m = receiptModel(cat, evaluate(cat, { answers: ANSWERED, cart: ['p.screen', 'p.both'] }), ISSUED);
    expect(m.total).toBe(T.receipt.totalFree);
    expect(m.total).toBe('0원으로 시작');
    expect(m.totalLabel).toBe('도구 비용 합계');
    expect(m.items.map((i) => i.price)).toEqual(['0원', '0원']);
  });

  it('발행 시각은 넘긴 값 그대로, 이름·글자는 문장 틀에서', () => {
    const cat = receiptCatalog();
    const m = receiptModel(cat, evaluate(cat, { answers: ANSWERED, cart: RECEIPT_CART }), '아무 글자');
    expect(m.issuedAt).toBe('아무 글자');
    expect(m.title).toBe(T.receipt.title);
    expect(m.destination).toBe('기록장');
    expect(m.stamp).toBe(T.receipt.stamp);
    expect(m.footer).toBe(T.receipt.footer);
    expect(m.laterMark).toBe(T.receipt.later);
  });

  it('난이도·시간은 먼저 만들 것의 상품만 (30 + 10 + 20 + 40분)', () => {
    const cat = receiptCatalog();
    const m = receiptModel(cat, evaluate(cat, { answers: ANSWERED, cart: RECEIPT_CART }), ISSUED);
    expect(m.difficulty).toBe(6);
    expect(m.difficultyText).toBe(`6 ${T.receipt.levels.normal}`);
    expect(m.minutes).toBe(100);
    expect(m.timeText).toBe('약 1시간 30분');
  });

  it('나중으로 미룬 칸에만 쓰이면 later, 먼저 만들 것 계산에서 빠진다', () => {
    const cat = receiptCatalog();
    const r = evaluate(cat, { answers: ANSWERED, cart: RECEIPT_CART, deferred: ['slot.notify'] });
    const m = receiptModel(cat, r, ISSUED);
    expect(m.items.map((i) => i.later)).toEqual([false, false, true]);
    expect(m.difficulty).toBe(3);
    expect(m.difficultyText).toBe(`3 ${T.receipt.levels.easy}`);
    expect(m.minutes).toBe(60);
    expect(m.timeText).toBe('약 1시간');
  });

  it('개수는 준비물·읽어 둘 용어·알아볼 것 길이', () => {
    const r = goldenResult('case-03');
    const m = receiptModel(REAL, r, ISSUED);
    expect(m.counts).toEqual({ prep: r.prep.length, study: r.study.all.length, research: r.research.length });
    expect(m.counts).toEqual({ prep: 4, study: 6, research: 2 });
  });

  it('골든 사례 1: 품목과 숫자', () => {
    const m = receiptModel(REAL, goldenResult('case-01'), ISSUED);
    expect(m.items.map((i) => [i.slot, i.productId, i.price])).toEqual([
      ['화면', 'html-single', '0원'],
      ['외부 데이터', 'neis-meal', '0원'],
      ['배포·공유', 'google-sheets-apps-script', '0원'],
    ]);
    expect(m.destination).toBe('안내 페이지');
    expect(m.difficultyText).toBe('5 보통');
    expect(m.timeText).toBe('약 2시간');
  });
});

describe('renderReceiptText', () => {
  it('골든 사례 모두 줄마다 36칸을 넘지 않는다', () => {
    expect(GOLDEN.length).toBeGreaterThanOrEqual(16);
    for (const g of GOLDEN) {
      const text = renderReceiptText(receiptModel(REAL, goldenResult(g.id), ISSUED));
      for (const w of widths(text)) expect(w, g.id).toBeLessThanOrEqual(WIDTH);
    }
  });

  it('긴 자유 입력·긴 상품 이름도 36칸 안', () => {
    const cat = tinyCatalog({
      questions: [tagQuestion({ 'type.record': 1 })],
      rules: [SLOT_SCREEN, SLOT_DATA, SLOT_NOTIFY, SLOT_HOST],
      products: [
        product('p.long', { name: '아주아주 긴 한글 상품 이름입니다 정말로 깁니다', capabilities: ['screen'] }),
        product('p.ascii', { name: 'a-very-long-ascii-product-name-for-receipt', capabilities: ['data'] }),
        product('p.bell', { name: '알림', capabilities: ['notify'], cost: { free: false, note: '유료' } }),
        product('p.host', { name: '배포', capabilities: ['host'] }),
      ],
    });
    const r = evaluate(cat, { answers: ANSWERED, cart: ['p.long', 'p.ascii', 'p.bell', 'p.host'], deferred: ['slot.notify'], freeText: '한'.repeat(30) });
    const text = renderReceiptText(receiptModel(cat, r, ISSUED));
    for (const w of widths(text)) expect(w).toBeLessThanOrEqual(WIDTH);
    const lines = text.split('\n');
    expect(lines.find((l) => l.startsWith('화면'))).toContain('…');
    expect(lines.find((l) => l.startsWith('외부 데이터'))).toContain('a-very-long-ascii-…');
    expect(lines.find((l) => l.startsWith('알림(나중)'))?.endsWith('유료')).toBe(true);
    expect(lines.find((l) => l.startsWith('목적지'))?.endsWith('…')).toBe(true);
  });

  it('줄 순서와 모양', () => {
    const m = receiptModel(REAL, goldenResult('case-08'), ISSUED);
    const lines = renderReceiptText(m).split('\n');
    const sep = '-'.repeat(WIDTH);
    expect(lines.map((l) => l.trim())).toEqual([
      '코드쇼퍼 영수증',
      ISSUED,
      sep,
      '목적지  현황판·알림',
      sep,
      '화면        React + Vite         0원'.trim(),
      '외부 데이터 금융위원회 주식시…   0원',
      '알림(나중)  텔레그램 봇 알림     0원',
      '배포·공유   Cloudflare Workers   0원',
      sep,
      '도구 비용 합계          0원으로 시작',
      '예상 시간              약 2시간 30분',
      '난이도                        6 보통',
      '준비물                             3',
      '읽어 둘 용어                       6',
      '알아볼 것                          1',
      sep,
      `[ ${T.receipt.stamp} ]`,
      T.receipt.footer,
    ]);
  });

  it('품목·합계·개수 줄은 정확히 36칸이고 값이 오른쪽 끝', () => {
    const m = receiptModel(REAL, goldenResult('case-01'), ISSUED);
    const lines = renderReceiptText(m).split('\n');
    const itemLines = lines.slice(5, 5 + m.items.length);
    for (const l of itemLines) {
      expect(displayWidth(l)).toBe(WIDTH);
      expect(l.endsWith('0원')).toBe(true);
    }
    for (const [label, value] of [
      [m.totalLabel, m.total],
      [m.timeLabel, m.timeText],
      [m.difficultyLabel, m.difficultyText],
      [m.countLabels.prep, String(m.counts.prep)],
      [m.countLabels.study, String(m.counts.study)],
      [m.countLabels.research, String(m.counts.research)],
    ] as const) {
      const l = lines.find((x) => x.startsWith(label));
      expect(l && displayWidth(l)).toBe(WIDTH);
      expect(l?.endsWith(` ${value}`)).toBe(true);
    }
  });

  it('제목·시각·도장·맺음말은 가운데', () => {
    const lines = renderReceiptText(modelWith({ title: 'ab', issuedAt: '가나', footer: 'f' })).split('\n');
    expect(lines[0]).toBe(`${' '.repeat(17)}ab`);
    expect(lines[1]).toBe(`${' '.repeat(16)}가나`);
    expect(lines.at(-1)).toBe(`${' '.repeat(17)}f`);
  });

  it('칸 이름 자리는 기본 12칸: 11칸 이름 + 띄움, 도구 이름 19칸 (알림(나중)도 그대로)', () => {
    const m = modelWith({});
    const first = m.items[0];
    expect(first).toBeDefined();
    if (!first) return;
    const name = 'a'.repeat(19);
    const lines = renderReceiptText({
      ...m,
      items: [
        { ...first, slot: '외부 데이터', later: false, name },
        { ...first, slot: '알림', later: true, name },
      ],
    }).split('\n');
    expect(first.price).toBe('0원');
    expect(lines[5]).toBe(`외부 데이터 ${name}  0원`);
    expect(lines[6]).toBe(`알림(나중)  ${name}  0원`);
    for (const l of [lines[5] ?? '', lines[6] ?? '']) expect(displayWidth(l)).toBe(WIDTH);
  });

  it('11칸을 넘는 칸 이름(로그인(나중) 12칸)이 있으면 13칸으로 넓혀 12칸까지 보이고, 도구 이름 자리는 18칸', () => {
    const m = modelWith({});
    const first = m.items[0];
    expect(first).toBeDefined();
    if (!first) return;
    const name = 'a'.repeat(19);
    const lines = renderReceiptText({
      ...m,
      items: [
        { ...first, slot: '아주 긴 칸 이름', later: false, name },
        { ...first, slot: '로그인', later: true, name },
      ],
    }).split('\n');
    expect(lines[5]).toBe(`아주 긴 칸 … ${'a'.repeat(17)}…  0원`);
    expect(lines[6]).toBe(`로그인(나중) ${'a'.repeat(17)}…  0원`);
    for (const l of [lines[5] ?? '', lines[6] ?? '']) expect(displayWidth(l)).toBe(WIDTH);
  });

  it('같은 모델이면 같은 글자 (시계를 읽지 않는다)', () => {
    const m = receiptModel(REAL, goldenResult('case-03'), ISSUED);
    expect(renderReceiptText(m)).toBe(renderReceiptText(structuredClone(m)));
    expect(renderReceiptText(m)).toContain(ISSUED);
  });
});

// ── pack.ts ─────────────────────────────────────────────

describe('renderPack: 골든 사례', () => {
  const headings = Object.values(T.pack.headings);

  it('12개 제목이 정해진 순서로 한 번씩', () => {
    expect(headings).toHaveLength(12);
    for (const g of GOLDEN) {
      const md = renderPack(REAL, goldenResult(g.id), { siteUrl: SITE, issuedAt: ISSUED });
      const lines = md.split('\n');
      const at = headings.map((h) => lines.indexOf(`## ${h}`));
      expect(at.every((i) => i >= 0), g.id).toBe(true);
      expect([...at].sort((a, b) => a - b), g.id).toEqual(at);
      for (const h of headings) expect(lines.filter((l) => l === `## ${h}`), g.id).toHaveLength(1);
    }
  });

  it('채우지 않은 {{ }} 자리가 없다', () => {
    for (const g of GOLDEN) {
      const md = renderPack(REAL, goldenResult(g.id), { siteUrl: SITE, issuedAt: ISSUED });
      expect(md, g.id).not.toMatch(/\{\{|\}\}/);
    }
  });

  it('같은 입력이면 같은 설계도', () => {
    for (const g of GOLDEN) {
      const a = renderPack(REAL, goldenResult(g.id), { siteUrl: SITE, issuedAt: ISSUED });
      const b = renderPack(realCatalog(), goldenResult(g.id), { siteUrl: SITE, issuedAt: ISSUED });
      expect(a, g.id).toBe(b);
    }
  });

  it('머리말: 제목, 발행 시각, 맺음말은 면책 안내', () => {
    const md = renderPack(REAL, goldenResult('case-01'), { siteUrl: SITE, issuedAt: ISSUED });
    const lines = md.split('\n');
    expect(lines[0]).toBe('# 안내 페이지 설계도');
    expect(md).toContain(`${T.pack.labels.issued}: ${ISSUED} · ${T.pack.labels.format} 1`);
    expect(md.trimEnd().endsWith(T.disclaimer)).toBe(true);
  });

  it('나중으로 미룬 칸이 있을 때만 나중에 붙일 것과 그 안내', () => {
    for (const g of GOLDEN) {
      const r = goldenResult(g.id);
      const md = renderPack(REAL, r, { siteUrl: SITE, issuedAt: ISSUED });
      const has = r.session.deferred.length > 0;
      expect(md.includes(T.pack.deferredNote), g.id).toBe(has);
      expect(md.includes(`### ${T.pack.labels.deferred}`), g.id).toBe(has);
    }
    const md = renderPack(REAL, goldenResult('case-08'), { siteUrl: SITE, issuedAt: ISSUED });
    expect(md).toContain(`- 알림: ${T.pack.deferredNote}`);
  });

  it('나중에만 쓰는 도구는 7번에 (나중)', () => {
    const md = renderPack(REAL, goldenResult('case-08'), { siteUrl: SITE, issuedAt: ISSUED });
    expect(md).toContain('| 알림 (나중) | [텔레그램 봇 알림](');
    expect(md).toContain('**텔레그램 봇 알림** (나중)');
    expect(md).not.toContain('**Cloudflare Workers** (나중)');
    const same = renderPack(REAL, goldenResult('case-03'), { siteUrl: SITE, issuedAt: ISSUED });
    expect(same).not.toContain('(나중)');
  });

  it('알아볼 것이 없을 때만 noResearch, 있으면 항목 수만큼', () => {
    for (const g of GOLDEN) {
      const r = goldenResult(g.id);
      const md = renderPack(REAL, r, { siteUrl: SITE, issuedAt: ISSUED });
      expect(md.includes(T.pack.noResearch), g.id).toBe(r.research.length === 0);
      expect(md.includes(T.pack.researchIntro), g.id).toBe(r.research.length > 0);
      expect(md.split('\n').filter((l) => /^### 9-\d+\. /.test(l)), g.id).toHaveLength(r.research.length);
    }
    expect(goldenResult('case-01').research).toHaveLength(0);
    expect(goldenResult('case-12').research).toHaveLength(3);
  });

  it('색인 상품(원문만 있는 도구)이 있을 때만 indexMemo', () => {
    for (const g of GOLDEN) {
      const r = goldenResult(g.id);
      const md = renderPack(REAL, r, { siteUrl: SITE, issuedAt: ISSUED });
      expect(md.includes(T.pack.indexMemo), g.id).toBe(r.cart.some((p) => p.layer === 'index'));
    }
    const md = renderPack(REAL, goldenResult('case-05'), { siteUrl: SITE, issuedAt: ISSUED });
    expect(md).toContain(`**korean-elementary-learning-map-mcp**\n\n- ${T.pack.indexMemo}`);
  });

  it('용어 카드 링크(/terms/)는 사이트 주소 끝의 / 를 떼고 붙인다', () => {
    const r = goldenResult('case-01');
    const a = renderPack(REAL, r, { siteUrl: `${SITE}//`, issuedAt: ISSUED });
    const b = renderPack(REAL, r, { siteUrl: SITE, issuedAt: ISSUED });
    expect(a).toBe(b);
    expect(a).toContain(`](${SITE}/terms/`);
    expect(a).not.toContain(`${SITE}//terms`);
    expect(a).not.toContain('/concepts/');
  });
});

describe('renderPack: 자유 입력', () => {
  const freeText = `우리 학교\n급식   안내 ${'가'.repeat(100)}`;

  it('제목은 30자, 한 줄 설명은 80자, 줄바꿈 없이', () => {
    const md = renderPack(REAL, goldenResult('case-01', { freeText }), { siteUrl: SITE, issuedAt: ISSUED });
    const clean = `우리 학교 급식 안내 ${'가'.repeat(100)}`;
    const title = [...clean].slice(0, 30).join('');
    const one = [...clean].slice(0, 80).join('');
    expect(md.split('\n')[0]).toBe(`# ${title} 설계도`);
    expect(md).toContain(`- ${T.pack.labels.oneLine}: ${one}\n`);
    expect(md).not.toContain('우리 학교\n');
  });

  it('자유 입력이 없으면 유형 목표가 한 줄 설명', () => {
    const md = renderPack(REAL, goldenResult('case-01'), { siteUrl: SITE, issuedAt: ISSUED });
    expect(md).toContain(`- ${T.pack.labels.oneLine}: ${T.types['type.page']?.goal}`);
  });

  it('영수증 링크로 열면 자유 입력 대신 유형 목표', () => {
    const session: Partial<Session> = { ...goldenSession(golden('case-01')), freeText: '비밀 한 줄' };
    const viaLink = fromShareState(JSON.parse(JSON.stringify(toShareState(session as Session))));
    expect(viaLink).not.toBeNull();
    const md = renderPack(REAL, evaluate(REAL, viaLink ?? {}), { siteUrl: SITE, issuedAt: ISSUED });
    expect(md).not.toContain('비밀 한 줄');
    expect(md.split('\n')[0]).toBe('# 안내 페이지 설계도');
    expect(md).toContain(`- ${T.pack.labels.oneLine}: ${T.types['type.page']?.goal}`);
  });
});

describe('renderPack: 작은 자료', () => {
  function packCatalog(): Catalog {
    return tinyCatalog({
      questions: [tagQuestion({ 'type.record': 1, 'ai.agent': 1, 'audience.me': 1, 'need.save': 1 })],
      rules: [SLOT_SCREEN, SLOT_DATA, stuckRule('stuck.together', { always: true })],
      products: [
        product('p.screen', {
          name: '화면 상품',
          capabilities: ['screen'],
          promptFragment: '화면 지시',
          stuck: ['화면 막힘'],
          prep: [
            { label: '가입하기', lead: 'instant' },
            { label: '키 받기', lead: 'days', url: 'https://example.com/key' },
          ],
        }),
        product('p.index', {
          name: '색인 상품',
          layer: 'index',
          capabilities: ['data'],
          recommendable: false,
          promptFragment: '바깥 설명문',
          stuck: ['바깥 막힘'],
        }),
        product('p.orphan', { name: '칸 밖 상품', capabilities: ['proxy'], links: [] }),
      ],
    });
  }
  const session = { answers: ANSWERED, cart: ['p.screen', 'p.index', 'p.orphan'] };

  it('색인 상품 메모에는 indexMemo만, 바깥 문장은 넣지 않는다', () => {
    const cat = packCatalog();
    const md = renderPack(cat, evaluate(cat, session), { siteUrl: SITE, issuedAt: ISSUED });
    expect(md).toContain(`**색인 상품**\n\n- ${T.pack.indexMemo}\n`);
    expect(md).not.toContain('바깥 설명문');
    expect(md).not.toContain('바깥 막힘');
  });

  it('진열 상품 메모: 지시와 막히기 쉬운 곳', () => {
    const cat = packCatalog();
    const md = renderPack(cat, evaluate(cat, session), { siteUrl: SITE, issuedAt: ISSUED });
    const L = T.pack.labels;
    expect(md).toContain(`**화면 상품**\n\n- ${L.instruction}: 화면 지시\n- ${L.stuck}: 화면 막힘`);
    expect(md).toContain(`**${L.together}**\n\n- stuck.together 막힘`);
  });

  it('7번 표: 칸 밖 상품은 기타, 링크가 없으면 이름만', () => {
    const cat = packCatalog();
    const md = renderPack(cat, evaluate(cat, session), { siteUrl: SITE, issuedAt: ISSUED });
    expect(md).toContain(`| ${T.pack.labels.toolOther} | 칸 밖 상품 | p.orphan 제공처 |`);
    expect(md).toContain('| 화면 | [화면 상품](https://example.com/p.screen) |');
    expect(md).toContain(`| ${T.accessLabels.none} | 무료 | - | 2026-10 |`);
  });

  it('준비물: 오래 걸리는 것 먼저, 주소가 있으면 붙인다', () => {
    const cat = packCatalog();
    const md = renderPack(cat, evaluate(cat, session), { siteUrl: SITE, issuedAt: ISSUED });
    expect(md).toContain(`${T.pack.prepIntro}\n\n- [ ] 키 받기 (${T.leadLabels.days}) https://example.com/key\n- [ ] 가입하기 (${T.leadLabels.instant})\n`);
    expect(md).not.toContain(T.pack.noPrep);
  });

  it('준비물이 없으면 noPrep', () => {
    const cat = packCatalog();
    const md = renderPack(cat, evaluate(cat, { answers: ANSWERED, cart: ['p.index'] }), { siteUrl: SITE, issuedAt: ISSUED });
    expect(md).toContain(T.pack.noPrep);
  });

  it('1번: 쓰는 사람, 만드는 AI, 저장 안내는 고른 AI 것', () => {
    const cat = packCatalog();
    const md = renderPack(cat, evaluate(cat, session), { siteUrl: SITE, issuedAt: ISSUED });
    const L = T.pack.labels;
    expect(md).toContain(`- ${L.audience}: ${T.audiences['audience.me']}`);
    expect(md).toContain(`- ${L.ai}: ${T.aiTools['ai.agent']?.label}`);
    expect(md).toContain(`> ${T.aiTools['ai.agent']?.saveAs}`);
  });

  it('5번: 저장할 것, 개인정보, 외부 데이터, 없음', () => {
    const P = T.pack;
    const section5 = (md: string): string[] => {
      const lines = md.split('\n');
      const from = lines.indexOf(`## ${P.headings.data}`);
      const to = lines.indexOf(`## ${P.headings.design}`);
      return lines.slice(from + 1, to).filter((l) => l !== '');
    };
    const cat = packCatalog();
    const model = T.types['type.record']?.dataModel ?? [];
    expect(model.length).toBeGreaterThan(0);
    const withModel = section5(renderPack(cat, evaluate(cat, session), { siteUrl: SITE, issuedAt: ISSUED }));
    expect(withModel).toEqual([
      ...model.map((d) => `- **${d.entity}**: ${d.fields.join(', ')}`),
      `- ${fill(P.dataLines.external, { names: '색인 상품' })}`,
    ]);

    const page = tinyCatalog({ questions: [tagQuestion({ 'type.page': 1, 'need.save': 1, 'sensitive.personal': 1 })], rules: [SLOT_SCREEN], products: [product('p1')] });
    expect(T.types['type.page']?.dataModel ?? []).toHaveLength(0);
    const decide = section5(renderPack(page, evaluate(page, { answers: ANSWERED, cart: ['p1'] }), { siteUrl: SITE, issuedAt: ISSUED }));
    expect(decide).toEqual([`- ${P.dataLines.decideLater}`, `- ${P.dataLines.personal}`]);

    const plain = tinyCatalog({ questions: [tagQuestion({ 'type.record': 1 })], rules: [SLOT_SCREEN], products: [product('p1')] });
    const none = section5(renderPack(plain, evaluate(plain, { answers: ANSWERED, cart: ['p1'] }), { siteUrl: SITE, issuedAt: ISSUED }));
    expect(none).toEqual([`- ${P.dataLines.none}`]);
  });

  it('유형 문장 틀이 없으면 오류로 알린다', () => {
    const cat = tinyCatalog({ questions: [tagQuestion({})] });
    const types = cat.data.templates.types;
    for (const k of Object.keys(types)) Reflect.deleteProperty(types, k);
    expect(() => renderPack(cat, evaluate(cat, { answers: ANSWERED }), { siteUrl: SITE, issuedAt: ISSUED })).toThrow(/type\.page/);
  });
});

describe('conversationCards', () => {
  it('카드 5장을 문장 틀 순서대로, packRef를 채워서', () => {
    const cards = conversationCards(REAL, goldenResult('case-01'));
    expect(cards.map((c) => c.id)).toEqual(['first', 'next', 'verify', 'error', 'change']);
    expect(cards.map((c) => [c.title, c.when])).toEqual(T.conversationCards.map((c) => [c.title, c.when]));
    for (const c of cards) expect(c.text).not.toMatch(/\{\{/);
    expect(cards[0]?.text.startsWith(`${T.aiTools['ai.chat-free']?.packRef}를 읽고`)).toBe(true);
  });

  it('코딩 에이전트면 폴더에 저장한 설계도를 가리킨다', () => {
    const cat = tinyCatalog({ questions: [tagQuestion({ 'ai.agent': 1 })] });
    const cards = conversationCards(cat, evaluate(cat, { answers: ANSWERED }));
    const ref = T.aiTools['ai.agent']?.packRef ?? '';
    expect(ref).toContain('CLAUDE.md');
    expect(cards[0]?.text).toBe(fill(T.conversationCards[0]?.text ?? '', { packRef: ref }));
  });

  it('AI를 고르지 않았으면 무료 채팅 기준', () => {
    const cat = tinyCatalog({ questions: [tagQuestion({})] });
    const cards = conversationCards(cat, evaluate(cat, { answers: ANSWERED }));
    expect(cards[0]?.text).toContain(T.aiTools['ai.chat-free']?.packRef ?? '-');
  });
});

describe('packFileName', () => {
  // 함수는 이용자 기기 시간(로컬 시각)을 쓴다. 로컬 시각으로 만든 Date라 시간대와 무관하게 같은 값이 나온다.
  it('codechauffeur-plan-YYYYMMDD-HHmm.md', () => {
    expect(packFileName(new Date(2026, 9, 12, 14, 5))).toBe('codechauffeur-plan-20261012-1405.md');
  });

  it('한 자리는 0을 채우고 초는 버린다', () => {
    expect(packFileName(new Date(2026, 0, 2, 3, 4, 59, 999))).toBe('codechauffeur-plan-20260102-0304.md');
    expect(packFileName(new Date(2026, 11, 31, 0, 0))).toBe('codechauffeur-plan-20261231-0000.md');
  });
});

// ── extras.ts ─────────────────────────────────────────────

describe('badges', () => {
  it('기본 상품: 무료, 초보 추천, 공식', () => {
    const b = T.badges;
    expect(badges(REAL, product('p'))).toEqual([b.free, b.easy, b.official]);
  });

  it('유료·어려움·공식 아님은 배지 없음, 실시간과 추천 제외는 붙는다', () => {
    const b = T.badges;
    const p = product('p', {
      cost: { free: false, note: '유료' },
      difficulty: 3,
      provider: { type: 'community', name: '누군가' },
      realtime: 'realtime',
      recommendable: false,
    });
    expect(badges(REAL, p)).toEqual([b.realtime, b.caution]);
  });

  it('갱신 주기: frequent는 자주 갱신, daily·static은 없음', () => {
    const b = T.badges;
    const base: Partial<Product> = { cost: { free: false, note: '유료' }, difficulty: 2, provider: { type: 'generic', name: '-' } };
    expect(badges(REAL, product('p', { ...base, realtime: 'frequent' }))).toEqual([b.frequent]);
    expect(badges(REAL, product('p', { ...base, realtime: 'daily' }))).toEqual([]);
    expect(badges(REAL, product('p', { ...base, realtime: 'static' }))).toEqual([]);
  });

  it('진짜 상품: 한국투자증권과 색인 상품', () => {
    const b = T.badges;
    const kis = REAL.product.get('kis-open-api');
    const index = REAL.product.get('korean-elementary-learning-map-mcp');
    expect(kis && badges(REAL, kis)).toEqual([b.free, b.official, b.realtime]);
    expect(index && badges(REAL, index)).toEqual([b.free, b.caution]);
  });
});

describe('matchErrors', () => {
  function errorEntry(id: string, patterns: string[]): ErrorEntry {
    return { id, title: `${id} 제목`, patterns, examples: [], meaning: '뜻', causes: [], tryFirst: [], askAI: '물어보기' };
  }
  const cat = tinyCatalog({
    errors: [errorEntry('e.alpha', ['alpha', 'first']), errorEntry('e.beta', ['beta']), errorEntry('e.exact', ['^whole line$'])],
  });

  it('대소문자 없이 맞춘다', () => {
    expect(matchErrors(cat, 'ALPHA happened').map((e) => e.id)).toEqual(['e.alpha']);
  });

  it('자료에 적힌 순서로, 한 항목은 한 번만', () => {
    expect(matchErrors(cat, 'beta then alpha then first').map((e) => e.id)).toEqual(['e.alpha', 'e.beta']);
  });

  it('앞뒤 공백을 떼고 맞춘다', () => {
    expect(matchErrors(cat, '  Whole Line \n').map((e) => e.id)).toEqual(['e.exact']);
  });

  it('맞는 것이 없거나 빈 글이면 빈 배열', () => {
    expect(matchErrors(cat, 'gamma')).toEqual([]);
    expect(matchErrors(cat, '')).toEqual([]);
    expect(matchErrors(cat, ' \n\t ')).toEqual([]);
  });

  it('진짜 에러 사전', () => {
    const ids = (s: string): string[] => matchErrors(REAL, s).map((e) => e.id);
    expect(ids("Error: Cannot find module 'express'")).toEqual(['module-not-found']);
    expect(ids('HTTP 401 Unauthorized')).toEqual(['http-401']);
    expect(ids('blocked: no access-control-allow-origin header')).toEqual(['cors']);
    expect(ids('GET /api 404 (Not Found)')).toEqual(['http-404']);
    expect(ids('code 4010')).toEqual([]);
    expect(ids('npm: command not found\nGET /x 429')).toEqual(['command-not-found', 'http-429']);
  });
});

describe('공유 상태', () => {
  const full: Session = {
    answers: { 'q.a': 'x', 'q.b': 'y' },
    cart: ['p1', 'p2'],
    kept: ['conflict.a'],
    deferred: ['slot.notify'],
    freeText: '비밀 한 줄',
  };

  it('toShareState는 자유 입력을 넣지 않는다', () => {
    const s = toShareState(full);
    expect(s).toEqual({ v: 1, a: full.answers, c: full.cart, k: full.kept, d: full.deferred });
    expect(JSON.stringify(s)).not.toContain('비밀');
  });

  it('fromShareState는 JSON을 거쳐도 그대로 돌아온다', () => {
    const back = fromShareState(JSON.parse(JSON.stringify(toShareState(full))));
    expect(back).toEqual({ answers: full.answers, cart: full.cart, kept: full.kept, deferred: full.deferred });
  });

  it('모양이 다르면 null', () => {
    for (const raw of [null, undefined, 1, 'v1', true, [], {}, { v: 2 }, { v: '1' }]) {
      expect(fromShareState(raw), JSON.stringify(raw) ?? 'undefined').toBeNull();
    }
  });

  it('버전만 맞으면 빈 상태', () => {
    expect(fromShareState({ v: 1 })).toEqual({ answers: {}, cart: [], kept: [], deferred: [] });
  });

  it('틀린 타입은 버리고 남는 필드는 무시한다', () => {
    const raw = {
      v: 1,
      a: { 'q.a': 'x', 'q.n': 3, 'q.o': { x: 1 }, 'q.z': null },
      c: ['p1', 2, null, 'p2', { id: 'p3' }],
      k: 'conflict.a',
      d: { 0: 'slot.notify' },
      f: '비밀',
      freeText: '비밀',
    };
    const back = fromShareState(raw);
    expect(back).toEqual({ answers: { 'q.a': 'x' }, cart: ['p1', 'p2'], kept: [], deferred: [] });
    expect(back && 'freeText' in back).toBe(false);
  });

  it('a가 객체가 아니면 빈 답', () => {
    expect(fromShareState({ v: 1, a: 'x', c: ['p1'] })).toEqual({ answers: {}, cart: ['p1'], kept: [], deferred: [] });
  });

  it('__proto__ 키로 원형을 바꾸지 못한다', () => {
    const back = fromShareState(JSON.parse('{"v":1,"a":{"__proto__":"x","q.a":"o"}}'));
    expect(back?.answers).toEqual({ 'q.a': 'o' });
    expect(back && Object.getPrototypeOf(back.answers)).toBe(Object.prototype);
  });

  it('모르는 id는 evaluate(normalizeSession)가 버린다', () => {
    const cat = tinyCatalog({ questions: [tagQuestion({})], products: [product('p1')] });
    const back = fromShareState({ v: 1, a: { 'q.tags': 'o', 'q.zzz': 'o' }, c: ['p1', 'p.zzz', 'p1'], k: ['conflict.zzz'], d: ['slot.zzz'] });
    const r = evaluate(cat, back ?? {});
    expect(r.session).toEqual({ answers: { 'q.tags': 'o' }, cart: ['p1'], kept: [], deferred: [] });
  });
});

describe('checkQuiz', () => {
  const cat = tinyCatalog({
    concepts: [
      concept('c.a', {
        quiz: [
          { q: '하나', options: ['가', '나', '다'], answer: 2, explain: '풀이' },
          { q: '둘', options: ['가', '나'], answer: 0, explain: '풀이' },
        ],
      }),
    ],
  });

  it('맞으면 true, 틀리면 false', () => {
    expect(checkQuiz(cat, 'c.a', 0, 2)).toBe(true);
    expect(checkQuiz(cat, 'c.a', 0, 1)).toBe(false);
    expect(checkQuiz(cat, 'c.a', 1, 0)).toBe(true);
    expect(checkQuiz(cat, 'c.a', 1, 5)).toBe(false);
  });

  it('모르는 개념이나 없는 문제 번호는 null', () => {
    expect(checkQuiz(cat, 'c.zzz', 0, 0)).toBeNull();
    expect(checkQuiz(cat, 'c.a', 2, 0)).toBeNull();
    expect(checkQuiz(cat, 'c.a', -1, 0)).toBeNull();
  });

  it('진짜 개념의 첫 문제', () => {
    const c = realData().concepts.concepts[0];
    const q = c?.quiz[0];
    expect(c && q && checkQuiz(REAL, c.id, 0, q.answer)).toBe(true);
    expect(c && q && checkQuiz(REAL, c.id, 0, q.answer + 1)).toBe(false);
  });
});
