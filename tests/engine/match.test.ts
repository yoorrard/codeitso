// 낱말 찾기 시험 (T36, docs/review/v3/input.md 6절·11.4절). 엔진 계산(evaluate)과는 따로다: 찾은 결과는 화면이
// 보여 주기만 하고, 세션에는 이용자가 누른 보기와 글만 들어간다.
// 문장 표: 맞춘 묶음(낱말표를 맞춰 가며 고친 문장, 모두 맞아야 한다), 맞추지 않은 묶음(낱말표를 보기 전에 적고
// 고치지 않은 문장, 24개 이상), 찾으면 안 되는 글(아무것도 제안하지 않아야 한다), 도구 이름.
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Aliases } from '../../src/lib/aliases.ts';
import { evaluate } from '../../src/lib/engine/index.ts';
import {
  findAliases,
  gapsIn,
  gapsOfSession,
  looksLikeContact,
  matchAnswer,
  matchTool,
  normalizeForMatch,
  qwertyToHangul,
  readMoney,
} from '../../src/lib/engine/match.ts';
import { DATA_DIR, readJson } from '../../scripts/lib/load-data.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const aliases = readJson<Aliases>(join(DATA_DIR, 'aliases.json'));

const top = (qid: string, text: string): string | null => matchAnswer(cat, aliases, qid, text).suggestions[0]?.optionId ?? null;

// ── 정규화와 찾기 (6.1·6.2) ──────────────────────────────────

describe('normalizeForMatch', () => {
  it('전각·대문자·폭 없는 글자를 정리하고 공백을 뺀 글과 어절 경계를 든다', () => {
    const n = normalizeForMatch('ＡＢＣ​ 가계부!');
    expect(n.spaced).toBe('abc 가계부');
    expect(n.compact).toBe('abc가계부');
    expect(n.starts).toEqual([true, false, false, true, false, false]);
    expect(n.ends).toEqual([false, false, true, false, false, true]);
  });
});

describe('findAliases', () => {
  const entries = [
    { id: 'yes', aliases: ['=네'] },
    { id: 'naver', aliases: ['네이버'] },
    { id: 'vite', aliases: ['비트'] },
    { id: 'upbit', aliases: ['업비트'] },
    { id: 'log', aliases: ['로그'] },
    { id: 'login', aliases: ['로그인'] },
    { id: 'blog', aliases: ['블로그'] },
  ];

  it('공백을 뺀 글에서 찾는다 (붙여 쓴 글도 찾는다)', () => {
    expect(findAliases('학교 급식앱', [{ id: 'meal', aliases: ['급식 앱'] }]).map((h) => h.id)).toEqual(['meal']);
  });

  it("'='가 붙은 말은 어절 전체가 같을 때만 맞는다", () => {
    expect(findAliases('네이버 블로그', [{ id: 'yes', aliases: ['=네'] }])).toEqual([]);
    expect(findAliases('네 필요해요', [{ id: 'yes', aliases: ['=네'] }])).toEqual([{ id: 'yes', word: '네', start: 0, end: 1 }]);
  });

  it('긴 말을 먼저, 겹치지 않게 남긴다 (업비트 > 비트, 로그인·블로그 > 로그)', () => {
    expect(findAliases('업비트 시세', entries).map((h) => h.id)).toEqual(['upbit']);
    expect(findAliases('로그인 블로그 로그', entries).map((h) => h.id)).toEqual(['login', 'blog', 'log']);
  });

  it('길이가 같으면 앞 자리, 그다음 자료 순서', () => {
    const hits = findAliases('가나다', [
      { id: 'b', aliases: ['나다'] },
      { id: 'a', aliases: ['가나'] },
      { id: 'c', aliases: ['가나'] },
    ]);
    expect(hits.map((h) => h.id)).toEqual(['a']);
  });

  it('빈 글이나 빈 열쇠는 아무것도 찾지 않는다', () => {
    expect(findAliases('', entries)).toEqual([]);
    expect(findAliases('가계부', [{ id: 'x', aliases: ['!!', '='] }])).toEqual([]);
  });
});

// ── 보기 찾기와 점수 (6.3) ───────────────────────────────────

describe('matchAnswer: 점수는 찾은 서로 다른 말의 개수', () => {
  it('개수가 많은 보기가 앞 (‘Gemini 프로 구독’은 유료)', () => {
    expect(top('q.ai', 'Gemini 프로 구독')).toBe('chat-paid');
  });

  it('보기는 최대 3개, 각 보기는 찾은 말을 든다', () => {
    const m = matchAnswer(cat, aliases, 'q.domain', '날씨 지도 버스 공연 환율');
    expect(m.suggestions).toHaveLength(3);
    expect(m.suggestions[0]?.words.length).toBeGreaterThan(0);
  });

  it('같은 개수면 긴 말, 그다음 자료 순서', () => {
    // 이름(2) vs 반 번호(3): 긴 말 쪽
    expect(top('q.personal', '이름과 반 번호')).toBe('yes-students');
    // 깔끔(2) vs 단정(2): 자료 순서
    expect(top('q.style', '깔끔하고 단정하게')).toBe('clean');
  });

  it("'모르겠어요'·'직접 쓰기' 보기는 제안하지 않는다", () => {
    const m = matchAnswer(cat, aliases, 'q.type', '가계부 퀴즈 신청 소개 계산 현황');
    expect(m.suggestions.map((s) => s.optionId)).not.toContain('unknown');
    expect(m.suggestions.map((s) => s.optionId)).not.toContain('custom');
  });

  it('모르는 질문은 빈 결과', () => {
    expect(matchAnswer(cat, aliases, 'q.nope', '가계부')).toEqual({ suggestions: [], gaps: [] });
  });
});

// ── 부정과 예·아니요 (6.4·6.5) ───────────────────────────────

describe('예·아니요 질문', () => {
  it('주제어 바로 뒤 6글자 안의 부정 말은 아니요 (‘로그인 없이’)', () => {
    const m = matchAnswer(cat, aliases, 'q.login', '로그인 없이 쓰고 싶어요');
    expect(m.suggestions).toEqual([{ optionId: 'no', score: 1, words: ['로그인', '없이'] }]);
  });

  it('부정 조각만 있어도 6글자 안이면 아니요, 더 멀면 주제어는 네 쪽', () => {
    expect(top('q.save', '저장은 안 할래요')).toBe('no');
    expect(top('q.save', '저장 기능도 넣고 싶고 광고는 안 할래요')).toBe('yes');
  });

  it("'안 ' 조각은 띄어 쓴 '안'만 (‘알림 안내’는 부정이 아니다)", () => {
    expect(top('q.notify', '결제 알림 안내')).toBe('yes');
    expect(top('q.payment', '결제는 안 해요')).toBe('no');
  });

  it('순서: 아니요 → 모르겠어요 → 아마 → 네', () => {
    expect(top('q.save', '필요 없을 것 같아요')).toBe('no');
    expect(top('q.save', '잘 모르겠는데 아마')).toBe('unknown');
    expect(top('q.save', '나중에 필요할 수도')).toBe('maybe');
    expect(top('q.save', '네 필요해요')).toBe('yes');
  });

  it('주제어도 공통 말도 없으면 제안하지 않는다', () => {
    expect(matchAnswer(cat, aliases, 'q.notify', '비 오는 날 아침에만').suggestions).toEqual([]);
  });
});

// ── 돈과 주기 (6.6) ─────────────────────────────────────────

describe('돈 읽기 (한 달 기준)', () => {
  it('숫자에 붙은 돈 단위만 읽고 기간을 한 달로 바꾼다', () => {
    expect(readMoney('1년에 10,000원')).toBe(833);
    expect(readMoney('하루 500원')).toBe(15000);
    expect(readMoney('일주일에 2천원')).toBe(8000);
    expect(readMoney('한 달 5천 원')).toBe(5000);
    expect(readMoney('3만')).toBe(30000);
    expect(readMoney('0원')).toBe(0);
    expect(readMoney('돈은 없어요')).toBeNull();
    expect(readMoney('1년에')).toBeNull();
  });

  it("'10,000원' 속의 '0원'을 무료로 읽지 않는다", () => {
    expect(top('q.budget', '10,000원')).toBe('more');
  });

  it('1만 원 미만은 몇천 원까지, 이상은 필요하면 더, 0원은 0원만', () => {
    expect(top('q.budget', '1년에 10,000원')).toBe('small');
    expect(top('q.budget', '하루 500원')).toBe('more');
    expect(top('q.budget', '0원')).toBe('free-only');
    expect(matchAnswer(cat, aliases, 'q.budget', '1년에 10,000원').suggestions[0]?.words).toEqual(['1년', '10,000원']);
  });

  it("낱말 속 '년'은 기간이 아니고, 한 달 말이 있으면 한 달이 이긴다", () => {
    expect(readMoney('청소년 동아리라 한 달 2만원')).toBe(20000);
    expect(top('q.budget', '청소년 동아리라 한 달 2만원')).toBe('more');
    expect(readMoney('작년에 쓴 만큼 월 3만원')).toBe(30000);
    expect(top('q.budget', '작년에 쓴 만큼 월 3만원')).toBe('more');
    expect(matchAnswer(cat, aliases, 'q.budget', '작년에 쓴 만큼 월 3만원').suggestions[0]?.words).toEqual(['월', '3만원']);
    expect(readMoney('연 5만원')).toBe(4167);
    expect(top('q.budget', '연 5만원')).toBe('small');
    expect(readMoney('청소년 동아리 회비 2만원')).toBe(20000);
  });

  it('숫자가 없으면 보기 낱말', () => {
    expect(top('q.budget', '공짜로만')).toBe('free-only');
    expect(top('q.budget', '몇천 원 정도')).toBe('small');
  });
});

describe('주기 읽기', () => {
  it('숫자 + 초·분·시간은 실시간, 숫자 + 일·주·달은 하루 한 번', () => {
    expect(top('q.realtime', '5분마다')).toBe('realtime');
    expect(top('q.realtime', '1시간에 한 번')).toBe('realtime');
    expect(top('q.realtime', '3일에 한 번')).toBe('daily');
    expect(top('q.realtime', '2주마다')).toBe('daily');
  });
});

// ── 영문 자판 (6.7) ─────────────────────────────────────────

describe('영문 자판으로 친 한글', () => {
  it('두벌식 자판 표로 되돌린다 (겹모음·겹받침 포함)', () => {
    expect(qwertyToHangul('gkf dlf ahrfhr')).toBe('할 일 목록');
    expect(qwertyToHangul('dhkd')).toBe('왕');
    expect(qwertyToHangul('dlfrdj')).toBe('읽어');
    expect(qwertyToHangul('rkqt')).toBe('값');
    expect(qwertyToHangul('Rhc')).toBe('꽃');
    // 받침이 뒤 모음의 첫소리로 옮겨 간다 (겹받침이면 뒤 글자만)
    expect(qwertyToHangul('dkfk')).toBe('아라');
    expect(qwertyToHangul('dlfrl')).toBe('일기');
    // 홀로 남은 자모는 자모 그대로
    expect(qwertyToHangul('rr k')).toBe('ㄱㄱ ㅏ');
  });

  it('아무것도 못 찾았을 때만 되돌려 다시 찾고, 읽은 글을 알린다', () => {
    const m = matchAnswer(cat, aliases, 'q.type', 'gkf dlf ahrfhr');
    expect(m.readAs).toBe('할 일 목록');
    expect(m.suggestions[0]?.optionId).toBe('record');
  });

  it('완성 글자가 70%보다 적으면 되돌리지 않는다', () => {
    expect(matchAnswer(cat, aliases, 'q.type', 'budget planner').readAs).toBeUndefined();
  });

  it('영문 이름을 찾았으면 되돌리지 않는다', () => {
    const m = matchAnswer(cat, aliases, 'q.type', 'todo');
    expect(m.readAs).toBeUndefined();
    expect(m.suggestions[0]?.optionId).toBe('record');
  });
});

// ── 빈틈 (6.8) ─────────────────────────────────────────────

describe('빈틈', () => {
  it('질문의 직접 쓰기에서 보기와 함께 찾는다', () => {
    const m = matchAnswer(cat, aliases, 'q.type', 'AI 챗봇 상담');
    expect(m.gaps).toEqual(['ai-feature']);
  });

  it("빈틈 자리가 아닌 질문(q.ai)에서는 찾지 않는다 (‘Claude’는 만드는 AI)", () => {
    expect(matchAnswer(cat, aliases, 'q.ai', 'ChatGPT').gaps).toEqual([]);
  });

  it('gapsIn: 여러 글을 합쳐 자료 순서로, 겹치지 않게', () => {
    const got = gapsIn(cat, aliases, [
      { where: 'line', text: '사진 업로드되는 단톡 같은 앱' },
      { where: 'q.type', text: '챗봇' },
      { where: 'q.ai', text: '챗봇' },
      { where: 'tool', text: 'OpenAI API' },
    ]);
    expect(got).toEqual(['ai-feature', 'chat', 'file-upload']);
  });

  it('빈틈 자리에 없는 글은 보지 않는다 (파일 올리기는 도구 이름에서 찾지 않음)', () => {
    expect(gapsIn(cat, aliases, [{ where: 'tool', text: '업로드 서버' }])).toEqual([]);
  });

  it('gapsOfSession: 내 말·한 줄·직접 쓴 도구 이름을 모두 보고, 지운 글의 빈틈은 남기지 않는다', () => {
    const s = { notes: { 'q.type': '단톡 같은 앱', 'q.save': '업로드한 사진' }, freeText: '챗봇이 답해 주는 페이지', customTools: [{ name: 'Flutter' }] };
    expect(gapsOfSession(cat, aliases, s)).toEqual(['ai-feature', 'native-app', 'chat']);
    expect(gapsOfSession(cat, aliases, { ...s, notes: {}, freeText: '' })).toEqual(['native-app']);
    expect(gapsOfSession(cat, aliases, {})).toEqual([]);
  });

  it('화면의 찾기 묶음은 도구 짐작 말(toolHints)을 싣지 않는다: 빈틈 말을 품은 도구 짐작 말이 없어 결과가 같다', () => {
    // 긴 말이 이기므로 빈틈 말을 가리는 것은 그 말을 품은(같거나 긴) 도구 짐작 말뿐이다. '='가 붙은 빈틈 말은 어절 하나로 품어야 가린다
    const norm = (w: string): string => w.replace(/^=/, '').toLowerCase();
    const hints = aliases.toolHints.flatMap((h) => h.aliases.map(norm));
    const clash = aliases.gaps.flatMap((g) =>
      g.aliases.flatMap((a) => {
        const word = norm(a);
        const hides = (h: string): boolean => (a.startsWith('=') ? h.split(/\s+/).includes(word) : h.replace(/\s+/g, '').includes(word.replace(/\s+/g, '')));
        return hints.filter(hides).map((h) => `${a} ← ${h}`);
      }),
    );
    expect(clash).toEqual([]);
    const lite = { ...aliases, toolHints: [], searchSynonyms: [] };
    for (const name of ['OpenAI API', 'Flutter 앱', '카카오톡 채팅', '슬랙 메신저', '업비트 챗봇']) {
      expect(gapsIn(cat, lite, [{ where: 'tool', text: name }]), name).toEqual(gapsIn(cat, aliases, [{ where: 'tool', text: name }]));
    }
  });
});

// ── 연락처 (4.3) ────────────────────────────────────────────

describe('looksLikeContact', () => {
  it('휴대폰·전화·전자 우편처럼 보이는 글', () => {
    expect(looksLikeContact('연락은 010-1234-5678')).toBe(true);
    expect(looksLikeContact('02 123 4567')).toBe(true);
    expect(looksLikeContact('me@example.com 으로')).toBe(true);
    expect(looksLikeContact('하루 500원')).toBe(false);
    expect(looksLikeContact('학년 3반 25번')).toBe(false);
  });
});

// ── 도구 이름 (8.1) ─────────────────────────────────────────

describe('matchTool', () => {
  // 금융 + 저장 + 알림이 함께 열린 결과: 외부 데이터 칸에 금융 도구가 있다
  const r = evaluate(cat, {
    answers: {
      'q.type': 'board',
      'q.audience': 'me',
      'q.ai': 'chat-free',
      'q.domain': 'finance',
      'q.finance-topic': 'stock',
      'q.save': 'no',
      'q.notify': 'yes',
      'q.realtime': 'daily',
      'q.budget': 'free-only',
      'q.device': 'both',
      'q.style': 'clean',
    },
    cart: [],
  });
  const tool = (slot: string, text: string): ReturnType<typeof matchTool> => matchTool(cat, aliases, r, slot, text);

  it('이미 목록에 있는 도구 (한글 표기와 공식 이름)', () => {
    expect(tool('slot.data', '수파베이스').same).toEqual({ productId: 'supabase', word: '수파베이스', inSlot: false, slots: [] });
    expect(tool('slot.notify', '텔레그램').same).toMatchObject({ productId: 'telegram-bot', inSlot: true, slots: ['slot.notify'] });
    expect(tool('slot.host', 'Netlify').same).toMatchObject({ productId: 'netlify', inSlot: true });
  });

  it("같은 갈래: 이 칸에 있으면 그 칸의 순위대로 두 개 (‘업비트’가 ‘비트’를 이긴다)", () => {
    const m = tool('slot.data', '업비트 API');
    expect(m.same).toBeNull();
    const shelf = r.slots.find((s) => s.slot.id === 'slot.data')?.shelf.map((s) => s.product.id) ?? [];
    const finance = shelf.filter((id) => cat.product.get(id)?.domains?.includes('domain.finance')).slice(0, 2);
    expect(m.near).toEqual({ hintId: 'finance', productIds: finance, inSlot: true });
  });

  it('같은 갈래가 이 칸에 없으면 카탈로그의 진열 도구를 자료 순서로 두 개', () => {
    const m = tool('slot.data', 'OpenWeather');
    const weather = cat.data.products.products
      .filter((p) => p.layer === 'shelf' && p.capabilities.includes('data') && p.domains?.includes('domain.weather'))
      .slice(0, 2)
      .map((p) => p.id);
    expect(m.near).toEqual({ hintId: 'weather', productIds: weather, inSlot: false });
  });

  it('못 찾으면 둘 다 없음, 빈틈은 함께 알린다', () => {
    expect(tool('slot.data', 'PokeAPI')).toEqual({ same: null, near: null, gaps: [] });
    expect(tool('slot.data', 'OpenAI API').gaps).toEqual(['ai-feature']);
  });

  it('모르는 칸이어도 짐작은 카탈로그에서', () => {
    expect(tool('slot.nope', '노션').near).toMatchObject({ hintId: 'store', inSlot: false });
  });
});

// ── 문장 표 (6.10) ──────────────────────────────────────────

type Row = [question: string, text: string, expected: string | null];

/** 맞춘 묶음: 낱말표를 이 문장에 맞춰 고쳤다. 모두 맞아야 한다 (회귀 확인) */
const TUNED: Row[] = [
  ['q.type', '가계부 앱', 'record'],
  ['q.type', '반 친구들 생일 설문', 'form'],
  ['q.type', '우리 동아리 소개 홈페이지', 'page'],
  ['q.type', '영어 단어 퀴즈', 'quiz'],
  ['q.type', '더치페이 계산기', 'tool'],
  ['q.type', '주식 시세 현황판', 'board'],
  ['q.type', '할일 목록', 'record'],
  ['q.type', '독서 기록장', 'record'],
  ['q.type', '체육대회 참가 신청', 'form'],
  ['q.type', '내 포트폴리오 사이트', 'page'],
  ['q.type', 'OX 퀴즈 게임', 'quiz'],
  ['q.type', '자리 바꾸기 뽑기', 'tool'],
  ['q.type', '미세먼지 알리미', 'board'],
  ['q.type', 'gkf dlf ahrfhr', 'record'],
  ['q.audience', '우리 가족 넷', 'few'],
  ['q.audience', '나 혼자 써요', 'me'],
  ['q.audience', '동네 주민 누구나', 'anyone'],
  ['q.audience', '동아리 회원 30명', 'few'],
  ['q.audience', '저만 볼 거예요', 'me'],
  ['q.ai', 'ChatGPT Plus', 'chat-paid'],
  ['q.ai', 'Gemini 프로 구독', 'chat-paid'],
  ['q.ai', '클로드 코드', 'agent'],
  ['q.ai', '뤼튼', 'chat-free'],
  ['q.ai', 'Cursor 써요', 'agent'],
  ['q.ai', 'Lovable로 만들 거예요', 'builder'],
  ['q.save', '저장은 필요 없어요', 'no'],
  ['q.save', '기록을 남겨 두고 싶어요', 'yes'],
  ['q.save', '잘 모르겠어요', 'unknown'],
  ['q.save', '나중에 필요할 수도', 'maybe'],
  ['q.save', '사진만 남겨 두고 싶어요', 'yes'],
  ['q.login', '로그인 없이 쓰고 싶어요', 'no'],
  ['q.login', '선생님만 로그인하면 돼요', 'yes'],
  ['q.login', '회원가입은 귀찮아서 빼고', 'no'],
  ['q.login', '각자 자기 것만 보게', 'yes'],
  ['q.login', '아니요', 'no'],
  ['q.notify', '알림은 싫어요', 'no'],
  ['q.notify', '문자로 알려 주면 좋겠어요', 'yes'],
  ['q.notify', '혹시 모르니 일단 넣어 줘', 'maybe'],
  ['q.payment', '후원 버튼 정도', 'yes'],
  ['q.payment', '돈은 안 받아요', 'no'],
  ['q.domain', '우리 지역 도서관 휴관일', 'book'],
  ['q.domain', '오늘 날씨랑 미세먼지', 'weather'],
  ['q.domain', '버스 도착 시간', 'transport'],
  ['q.domain', '환율 정보', 'finance'],
  ['q.domain', '맛집 지도', 'map'],
  ['q.domain', '공연 일정', 'culture'],
  ['q.domain', '업비트 코인 시세', 'finance'],
  ['q.domain', '우리 학교 급식', 'education'],
  ['q.edu-topic', '급식 메뉴', 'meal'],
  ['q.edu-topic', '방학 날짜', 'schedule'],
  ['q.weather-topic', '미세먼지 농도', 'air'],
  ['q.weather-topic', '내일 비 오는지', 'forecast'],
  ['q.lang-topic', '영어로 번역', 'translate'],
  ['q.lang-topic', '맞춤법 검사', 'dictionary'],
  ['q.finance-topic', '코스피 지수', 'stock'],
  ['q.finance-topic', '달러 환율', 'exchange'],
  ['q.realtime', '5분마다', 'realtime'],
  ['q.realtime', '하루 한 번', 'daily'],
  ['q.realtime', '실시간으로', 'realtime'],
  ['q.realtime', '일주일에 한 번', 'daily'],
  ['q.budget', '1년에 10,000원', 'small'],
  ['q.budget', '하루 500원', 'more'],
  ['q.budget', '0원', 'free-only'],
  ['q.budget', '무료로만', 'free-only'],
  ['q.budget', '한 달 5천 원', 'small'],
  ['q.budget', '3만원까지', 'more'],
  ['q.budget', '돈은 없어요', 'free-only'],
  ['q.personal', '이름과 반 번호', 'yes-students'],
  ['q.personal', '학부모 전화번호', 'yes-others'],
  ['q.device', '아이폰이랑 갤럭시', 'phone'],
  ['q.device', '교실 컴퓨터', 'pc'],
  ['q.style', '파스텔톤으로 귀엽게', 'cute'],
  ['q.style', '깔끔하고 단정하게', 'clean'],
];

/** 맞추지 않은 묶음: 구현 전에 적고 낱말표를 고치지 않았다. 24개 이상 맞으면 된다 (input.md 6.10) */
const UNTUNED: Row[] = [
  ['q.type', '수행평가 제출 받는 곳', 'form'],
  ['q.type', '공부 시간 재는 스톱워치', 'tool'],
  ['q.type', '우리 가게 메뉴판', 'page'],
  ['q.type', '운동 기록 앱', 'record'],
  ['q.type', '단어 암기 카드', 'quiz'],
  ['q.type', '반 투표 만들기', 'form'],
  ['q.type', '용돈 관리', 'record'],
  ['q.audience', '전교생 모두', 'anyone'],
  ['q.audience', '팀원 다섯 명', 'few'],
  ['q.ai', 'ChatGPT 무료', 'chat-free'],
  ['q.ai', '코파일럿', 'agent'],
  ['q.save', '백업해 두고 싶어요', 'yes'],
  ['q.login', '아이디 없이', 'no'],
  ['q.notify', '푸시 알림 받고 싶어요', 'yes'],
  ['q.payment', '결제는 안 해요', 'no'],
  ['q.domain', '기차 시간표', 'transport'],
  ['q.domain', '영화 상영 정보', 'culture'],
  ['q.domain', '서울 날씨', 'weather'],
  ['q.realtime', '10초마다', 'realtime'],
  ['q.realtime', '매일 아침', 'daily'],
  ['q.budget', '한 달에 2만 원', 'more'],
  ['q.budget', '공짜면 좋겠어요', 'free-only'],
  ['q.personal', '학번이랑 이름', 'yes-students'],
  ['q.device', '노트북', 'pc'],
  ['q.style', '화려하고 눈에 띄게', 'bold'],
  ['q.lang-topic', '일본어 번역', 'translate'],
  ['q.finance-topic', '금리 변화', 'economy'],
];

/** 찾으면 안 되는 글: 아무 보기도 제안하지 않아야 한다 (틀린 짐작 0) */
const NO_GUESS: [question: string, text: string][] = [
  ['q.type', '반려식물 물 주기'],
  ['q.type', '비빔밥 레시피'],
  ['q.domain', '포켓몬 도감 정보'],
  ['q.domain', '비빔밥 만드는 법'],
  ['q.notify', '비 오는 날 아침에만'],
  ['q.weather-topic', '자외선 지수'],
  ['q.save', '네이버 블로그처럼'],
  ['q.login', '그냥 아무거나'],
  ['q.budget', '글쎄요'],
  ['q.audience', '음'],
];

describe('문장 표', () => {
  it.each(TUNED)('맞춘 묶음 %s · %s → %s', (qid, text, want) => {
    expect(top(qid, text)).toBe(want);
  });

  it('맞춘 묶음은 73개', () => {
    expect(TUNED).toHaveLength(73);
  });

  it('맞추지 않은 묶음 27개 중 24개 이상', () => {
    const misses = UNTUNED.filter(([qid, text, want]) => top(qid, text) !== want);
    expect(UNTUNED).toHaveLength(27);
    expect(27 - misses.length, JSON.stringify(misses)).toBeGreaterThanOrEqual(24);
  });

  it.each(NO_GUESS)('찾으면 안 되는 글 %s · %s', (qid, text) => {
    expect(matchAnswer(cat, aliases, qid, text).suggestions).toEqual([]);
  });

  it('도구 이름 12개', () => {
    const r = evaluate(cat, { answers: {}, cart: [] });
    const t = (text: string): ReturnType<typeof matchTool> => matchTool(cat, aliases, r, 'slot.data', text);
    const same = (text: string): string | null => t(text).same?.productId ?? null;
    const near = (text: string): string | null => t(text).near?.hintId ?? null;
    expect([
      same('수파베이스'),
      same('Supabase'),
      near('OpenWeather'),
      near('업비트 API'),
      near('노션'),
      same('깃허브 페이지'),
      same('Netlify'),
      near('카톡 알림'),
      same('PokeAPI') ?? near('PokeAPI'),
      same('파파고'),
      t('ChatGPT API').gaps[0] ?? null,
      near('MongoDB'),
    ]).toEqual(['supabase', 'supabase', 'weather', 'finance', 'store', 'github-pages', 'netlify', 'notify', null, 'papago-translation', 'ai-feature', 'store']);
  });
});
