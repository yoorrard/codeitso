// 아래 막대의 상태 한 줄 (D64, docs/review/v2/brief.md 2.1·2.4): '{단계 이름} · {남은 것} · 약 {m}분'
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/lib/engine/index.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import { roundUpMinutes, SECONDS_PER_PICK, SECONDS_PER_QUESTION, statusLine } from '../../src/lib/status-line.ts';
import { option, question, realCatalog, slotRule, tinyCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const results = goldenFiles().map((f) => evaluate(cat, goldenSession(readJson<Golden>(f))));
const ready = results.find((r) => r.canIssue && r.session.cart.length > 0 && r.slots.some((s) => s.slot.required));
const blocked = results.find((r) => r.done && r.session.cart.length > 0 && !r.canIssue);
if (!ready || !blocked) throw new Error('골든 사례가 모자란다');
const empty = evaluate(cat, {});
const answersOnly = evaluate(cat, { answers: ready.session.answers });
const halfway = evaluate(cat, { answers: Object.fromEntries(Object.entries(ready.session.answers).slice(0, 2)) });

/** 1분 단위 올림을 손으로: 0초면 시간 없음 */
const about = (seconds: number): string => (seconds > 0 ? ` · 약 ${Math.ceil(seconds / 60)}분` : '');

describe("'약 n분' 올림 (brief 2.4)", () => {
  it('0초면 시간을 쓰지 않는다', () => {
    expect(roundUpMinutes(0)).toBeNull();
    expect(roundUpMinutes(-5)).toBeNull();
  });

  it('1~60초는 약 1분, 61초는 약 2분', () => {
    expect(roundUpMinutes(1)).toBe(1);
    expect(roundUpMinutes(60)).toBe(1);
    expect(roundUpMinutes(61)).toBe(2);
    expect(roundUpMinutes(600)).toBe(10);
  });

  it('계수: 질문 하나 15초, 꼭 고를 것 하나 30초', () => {
    expect(SECONDS_PER_QUESTION).toBe(15);
    expect(SECONDS_PER_PICK).toBe(30);
  });
});

describe('상태 한 줄: 내 AI 써 보기 (연습)', () => {
  it('보통: 연습 3개와 고정 약 10분, 다 함: 시간 없음', () => {
    expect(statusLine('test-drive', empty, {})).toBe('내 AI 써 보기 · 연습 3개 · 약 10분');
    expect(statusLine('test-drive', empty, { lessonDone: true })).toBe('내 AI 써 보기 · 다 했어요');
  });
});

describe('상태 한 줄: 1 만들 앱 정하기', () => {
  it('보통: n번째 질문과 남은 질문 × 15초 (남은 질문 수는 보이지 않는다)', () => {
    const left = (empty.interview.total - empty.interview.answered) * SECONDS_PER_QUESTION;
    expect(statusLine('destination', empty, {})).toBe(`만들 앱 정하기 · 1번째 질문${about(left)}`);
    const n = halfway.interview.answered + 1;
    const rest = (halfway.interview.total - halfway.interview.answered) * SECONDS_PER_QUESTION;
    expect(statusLine('destination', halfway, {})).toBe(`만들 앱 정하기 · ${n}번째 질문${about(rest)}`);
  });

  it('다 됨: 시간 없음', () => {
    expect(statusLine('destination', ready, {})).toBe('만들 앱 정하기 · 다 정했어요');
  });

  it('[이전]으로 돌아가 보는 질문이 n번째가 되고, 시간은 그대로 남은 질문 수로 센다 (brief 6.5)', () => {
    const rest = (halfway.interview.total - halfway.interview.answered) * SECONDS_PER_QUESTION;
    expect(statusLine('destination', halfway, {}, 0)).toBe(`만들 앱 정하기 · 1번째 질문${about(rest)}`);
    // 다 정한 뒤 돌아가 봐도 '다 정했어요'
    expect(statusLine('destination', ready, {}, 0)).toBe('만들 앱 정하기 · 다 정했어요');
  });
});

describe('상태 한 줄: 2 도구 고르기', () => {
  it('잠김: 만들 앱을 정하면 열린다', () => {
    expect(statusLine('waypoints', empty, {})).toBe('도구 고르기 · 만들 앱을 정하면 열려요');
  });

  it('보통: 남은 꼭 고를 것 × 30초', () => {
    const left = answersOnly.slots.filter((s) => s.slot.required).length;
    expect(left).toBeGreaterThan(0);
    expect(statusLine('waypoints', answersOnly, {})).toBe(`도구 고르기 · ${left}개만 더 고르면 돼요${about(left * SECONDS_PER_PICK)}`);
  });

  it('다 됨', () => {
    expect(statusLine('waypoints', ready, {})).toBe('도구 고르기 · 꼭 고를 것을 다 골랐어요');
  });

  it('맞는 도구가 없는 꼭 고를 것만 남으면 그 수를 말하고 시간은 쓰지 않는다', () => {
    const tiny = tinyCatalog({
      questions: [question('q.a', [option('x')])],
      rules: [slotRule('slot-rule.screen', { id: 'slot.screen', capability: 'screen', required: true })],
    });
    const r = evaluate(tiny, { answers: { 'q.a': 'x' } });
    expect(r.done).toBe(true);
    expect(r.slots[0]?.shelf).toEqual([]);
    expect(statusLine('waypoints', r, {})).toBe('도구 고르기 · 맞는 도구가 없는 기능 1개');
  });
});

describe('상태 한 줄: 3 도구끼리 맞춰 보기', () => {
  it('잠김·막힘·다 풀림 (시간 없음)', () => {
    expect(statusLine('check', empty, {})).toBe('도구끼리 맞춰 보기 · 만들 앱을 정하면 열려요');
    const n = blocked.conflicts.filter((c) => !c.kept).length;
    expect(statusLine('check', blocked, {})).toBe(`도구끼리 맞춰 보기 · 막힌 곳이 ${n}개 있어요`);
    expect(statusLine('check', ready, {})).toBe('도구끼리 맞춰 보기 · 막힌 곳이 없어요');
  });
});

describe('상태 한 줄: 4 설계도 받기', () => {
  it('잠김·막힘·준비됨·받음', () => {
    expect(statusLine('arrival', empty, {})).toBe('설계도 받기 · 만들 앱을 정하면 열려요');
    expect(statusLine('arrival', blocked, {})).toBe('설계도 받기 · 막힌 곳을 풀면 열려요');
    expect(statusLine('arrival', ready, {})).toBe('설계도 받기 · 받을 준비가 됐어요');
    expect(statusLine('arrival', ready, { issued: true })).toBe('설계도 받기 · 영수증을 받았어요');
  });

  it('영수증 링크로 연 영수증·깨진 링크는 내 진행 대신 그 사실을 쓴다 (주 버튼과 같은 까닭, D70)', () => {
    expect(statusLine('arrival', empty, {}, undefined, 'shared')).toBe('설계도 받기 · 받은 영수증을 보고 있어요');
    expect(statusLine('arrival', ready, { issued: true }, undefined, 'broken')).toBe('설계도 받기 · 영수증 링크를 열지 못했어요');
    expect(statusLine('arrival', ready, { issued: true }, undefined, 'own')).toBe('설계도 받기 · 영수증을 받았어요');
    // 다른 단계는 보는 영수증과 상관없다
    expect(statusLine('check', blocked, {}, undefined, 'shared')).toBe(statusLine('check', blocked, {}));
  });
});
