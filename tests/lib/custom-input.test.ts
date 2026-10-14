// 직접 쓰기 칸의 검사와 결과 꼴 (T37, 설계서 7.2절, input.md 4.2·4.3절). 화면 부품(CustomAnswer)이 쓰는 순수 함수.
import { describe, expect, it } from 'vitest';
import { ko } from '../../src/copy/ko.ts';
import {
  checkText,
  composingKey,
  customOf,
  foundWords,
  isNameQuestion,
  keepLine,
  nextCustomId,
  reshown,
  resultKind,
  toolNameProblem,
  withCustomTool,
  withNote,
  withoutCustomTool,
} from '../../src/lib/custom-input.ts';
import { NOTE_MAX } from '../../src/lib/engine/index.ts';
import type { Question } from '../../src/lib/engine/types.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const q = (id: string): Question => {
  const x = cat.question.get(id);
  if (!x) throw new Error(`질문 ${id}가 없다`);
  return x;
};
const custom = (id: string) => {
  const c = customOf(q(id));
  if (!c) throw new Error(`${id}에 직접 쓰기가 없다`);
  return c;
};

describe('checkText: 길이는 한 줄로 정리한 뒤 코드 포인트로 센다', () => {
  it('앞뒤 공백을 지우고 줄바꿈·탭·겹친 공백을 한 칸으로', () => {
    expect(checkText('  가계부\n\t앱  ', NOTE_MAX)).toEqual({ text: '가계부 앱', count: 5, over: 0, error: null });
  });

  it('빈 글(공백뿐)은 받지 않는다', () => {
    expect(checkText('   \n ', NOTE_MAX).error).toBe('empty');
  });

  it('자르지 않고 넘친 글자 수를 센다 (그림 문자 하나는 한 글자)', () => {
    const c = checkText('가'.repeat(41), NOTE_MAX);
    expect([c.count, c.over, c.error, [...c.text].length]).toEqual([41, 1, 'tooLong', 41]);
    expect(checkText('😀'.repeat(40), NOTE_MAX)).toMatchObject({ count: 40, over: 0, error: null });
    expect(checkText('가'.repeat(40), NOTE_MAX).error).toBeNull();
  });
});

describe('composingKey: 한글 조합을 끝내는 Enter는 확인으로 치지 않는다', () => {
  it('isComposing이거나 keyCode 229 (Safari)', () => {
    expect(composingKey({ isComposing: true, keyCode: 13 })).toBe(true);
    expect(composingKey({ isComposing: false, keyCode: 229 })).toBe(true);
    expect(composingKey({ isComposing: false, keyCode: 13 })).toBe(false);
    expect(composingKey({})).toBe(false);
  });
});

describe('찾은 결과의 꼴', () => {
  it('하나 · 여럿 · 못 찾음', () => {
    const s = { optionId: 'x', score: 1, words: [] };
    expect(resultKind({ suggestions: [s] })).toBe('one');
    expect(resultKind({ suggestions: [s, s] })).toBe('many');
    expect(resultKind({ suggestions: [] })).toBe('none');
  });

  it("찾은 말 여럿은 '로그인'·'없이' 꼴로 (틀이 바깥 따옴표를 두고, 낭독기가 기호를 읽지 않게 화살표 없이)", () => {
    expect(ko.custom.found.replace('{{word}}', foundWords(['로그인', '없이'])).replace('{{label}}', '아니요')).toBe("'로그인'·'없이'에 맞는 보기: 아니요");
    expect(ko.custom.found).not.toContain('→');
    expect(foundWords(['가계부'])).toBe('가계부');
  });

  it('못 찾으면 보기가 6개 이하인 질문만 모든 보기를 다시 보인다 (직접 쓰기 빼고)', () => {
    expect(reshown(q('q.save')).map((o) => o.id)).toEqual(['yes', 'no', 'maybe', 'unknown']);
    expect(reshown(q('q.domain'))).toEqual([]);
    expect(reshown(q('q.type'))).toEqual([]);
  });
});

describe('keepLine: 그대로 둘 때의 계산 한 줄 (설계서 7.4절)', () => {
  it("like가 있으면 그 보기 이름과 같게 ('모르겠어요', 몇 명이 같이, 쓰는 AI는 '아직 안 정했어요')", () => {
    expect(keepLine(q('q.save'), custom('q.save'), ko.custom.keepLike)).toBe("'모르겠어요'와 같게 계산하고, 내 말은 설계도에 그대로 넣을게요.");
    expect(keepLine(q('q.save'), custom('q.save'), ko.custom.keepLike)).toBe(ko.custom.keepUnknown);
    const few = q('q.audience').options.find((o) => o.id === 'few')?.label ?? '';
    expect(keepLine(q('q.audience'), custom('q.audience'), ko.custom.keepLike)).toContain(`'${few}'`);
    expect(keepLine(q('q.aitool-chat'), custom('q.aitool-chat'), ko.custom.keepLike)).toContain("'아직 안 정했어요'와 같게");
  });

  it('보기에 keep 문장이 있으면 그 문장 (앱 종류 · 가져올 정보)', () => {
    expect(keepLine(q('q.type'), custom('q.type'), ko.custom.keepLike)).toBe(custom('q.type').keep);
    expect(keepLine(q('q.domain'), custom('q.domain'), ko.custom.keepLike)).toBe(custom('q.domain').keep);
  });
});

describe('질문 모양', () => {
  it("모든 질문에 '직접 쓰기'가 하나씩 있고, 도움말이 있다 (화면이 끝에 '사람 이름·연락처는 쓰지 마세요.'를 붙인다)", () => {
    for (const x of cat.data.questions.questions) {
      const c = customOf(x);
      expect(c?.field, x.id).toBeTruthy();
      expect(c?.hint, x.id).toBeTruthy();
      expect(c?.hint?.endsWith(ko.custom.privacy), x.id).toBe(false);
    }
  });

  it("'쓰는 AI' 질문만 도구 이름 칸이다 (맞춤법 검사를 끈다)", () => {
    expect(['q.aitool-chat', 'q.aitool-builder', 'q.aitool-agent'].every((id) => isNameQuestion(q(id)))).toBe(true);
    expect(isNameQuestion(q('q.ai'))).toBe(false);
    expect(isNameQuestion(q('q.type'))).toBe(false);
  });
});

describe('withNote', () => {
  it('넣고, 지우고, 원본은 그대로', () => {
    const before = { 'q.type': '가계부 앱' };
    expect(withNote(before, 'q.save', '사진만')).toEqual({ 'q.type': '가계부 앱', 'q.save': '사진만' });
    expect(withNote(before, 'q.type', null)).toEqual({});
    expect(withNote(undefined, 'q.type', null)).toEqual({});
    expect(before).toEqual({ 'q.type': '가계부 앱' });
  });
});

describe('찾기 묶음 (지연 모듈 custom-match.ts): 낱말표를 칸 이름으로 골라 실어도 엔진과 같은 결과', async () => {
  const { join } = await import('node:path');
  const { DATA_DIR, readJson } = await import('../../scripts/lib/load-data.ts');
  const { matchAnswer, gapsOfSession } = await import('../../src/lib/engine/match.ts');
  const m = await import('../../src/lib/custom-match.ts');
  const full = readJson<import('../../src/lib/aliases.ts').Aliases>(join(DATA_DIR, 'aliases.json'));
  const texts: [string, string][] = [
    ['q.type', '가계부 앱'],
    ['q.type', '단톡방처럼 대화하는 앱'],
    ['q.login', '로그인 없이 쓰고 싶어요'],
    ['q.budget', '1년에 10,000원'],
    ['q.ai', 'ChatGPT Plus'],
    ['q.domain', '포켓몬 도감 정보'],
    ['q.aitool-chat', '뤼튼'],
    ['q.type', 'rkrPqn'],
  ];

  it('질문 직접 쓰기는 낱말표 전체로 찾은 것과 같다', () => {
    for (const [qid, text] of texts) expect(m.answerMatch(cat, qid, text), `${qid} ${text}`).toEqual(matchAnswer(cat, full, qid, text));
  });

  it('가계부 앱 → 기록장 하나, 빈틈 알림 문장과 세션 빈틈', () => {
    expect(m.answerMatch(cat, 'q.type', '가계부 앱').suggestions.map((s) => s.optionId)).toEqual(['record']);
    expect(m.gapMessage('chat')).toBe(full.gaps.find((g) => g.id === 'chat')?.message);
    expect(m.gapMessage('없는-빈틈')).toBe('');
    const s = { notes: { 'q.type': '챗봇 앱' }, freeText: '단톡 같은 거', customTools: [{ id: 'custom-1', name: 'Flutter', capability: 'screen' as const }] };
    expect(m.sessionGaps(cat, s)).toEqual(gapsOfSession(cat, full, s));
  });

  it('연락처 경고', () => {
    expect(m.looksLikeContact('010-1234-5678로 연락')).toBe(true);
  });
});

describe('목록에 없는 도구 (2단계, input.md 8.1절): id·이름 검사·세션 조각', () => {
  const tool = (id: string, name: string) => ({ id, name, capability: 'data' as const });

  it('새 id는 비어 있는 가장 작은 번호, 5개를 다 쓰면 null', () => {
    expect(nextCustomId([])).toBe('custom-1');
    expect(nextCustomId([tool('custom-1', 'A'), tool('custom-3', 'C')])).toBe('custom-2');
    expect(nextCustomId([1, 2, 3, 4, 5].map((k) => tool(`custom-${k}`, `T${k}`)))).toBeNull();
  });

  it('같은 이름(띄어쓰기·대소문자 무시)은 duplicate, 5개를 다 쓰면 limit', () => {
    expect(toolNameProblem([tool('custom-1', 'Open Weather')], 'openweather')).toBe('duplicate');
    expect(toolNameProblem([tool('custom-1', 'PokeAPI')], 'OpenWeather')).toBeNull();
    expect(toolNameProblem([1, 2, 3, 4, 5].map((k) => tool(`custom-${k}`, `T${k}`)), 'New')).toBe('limit');
  });

  it('더하기는 장바구니에 넣지 않고(정하기가 넣는다) 지우기는 장바구니에서도 뺀다. 원본은 그대로', () => {
    const before = { customTools: [tool('custom-1', 'PokeAPI')], cart: ['custom-1', 'supabase'] };
    const add = withCustomTool(before, 'OpenWeather', 'data');
    expect(add).toEqual({ id: 'custom-2', customTools: [tool('custom-1', 'PokeAPI'), tool('custom-2', 'OpenWeather')] });
    expect(withCustomTool(before, 'pokeapi', 'data')).toBeNull();
    expect(withoutCustomTool(before, 'custom-1')).toEqual({ customTools: [], cart: ['supabase'] });
    expect(before.cart).toEqual(['custom-1', 'supabase']);
  });
});

describe('도구 이름 찾기 묶음 (지연 모듈 tool-match.ts): 도구 짐작 말과 빈틈만 실어도 엔진과 같은 결과', async () => {
  const { join } = await import('node:path');
  const { DATA_DIR, readJson } = await import('../../scripts/lib/load-data.ts');
  const { matchTool } = await import('../../src/lib/engine/match.ts');
  const { evaluate } = await import('../../src/lib/engine/index.ts');
  const { goldenSession } = await import('../../scripts/lib/golden.ts');
  const t = await import('../../src/lib/tool-match.ts');
  const full = readJson<import('../../src/lib/aliases.ts').Aliases>(join(DATA_DIR, 'aliases.json'));
  const golden = (id: string) => readJson<import('../../scripts/lib/golden.ts').Golden>(join(DATA_DIR, 'golden', `${id}.json`));
  const results = ['case-03', 'case-04'].map((id) => evaluate(cat, goldenSession(golden(id))));
  const names = ['수파베이스', 'OpenWeather', 'PokeAPI', '깃허브 페이지', 'Flutter 앱', '챗봇 API', 'Notion'];

  it('열린 칸마다 이름마다 낱말표 전체로 찾은 것과 같다', () => {
    for (const r of results) {
      for (const s of r.slots) for (const name of names) expect(t.toolMatch(cat, r, s.slot.id, name), `${s.slot.id} ${name}`).toEqual(matchTool(cat, full, r, s.slot.id, name));
    }
  });

  it('수파베이스 → 이미 목록에 있는 Supabase, 빈틈 알림 문장', () => {
    const r = results[1];
    const store = r?.slots.find((s) => s.slot.capability === 'store');
    if (!r) throw new Error('case-04');
    expect(store && t.toolMatch(cat, r, store.slot.id, '수파베이스').same?.productId).toBe('supabase');
    expect(t.gapMessage('native-app')).toBe(full.gaps.find((g) => g.id === 'native-app')?.message);
    expect(t.gapMessage('없는-빈틈')).toBe('');
  });
});
