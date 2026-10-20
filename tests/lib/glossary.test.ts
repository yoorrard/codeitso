// 어려운 말 풀이 (D60, v2 D66): 고른 글에서 용어 찾기(매처)와 자료(data/glossary.json)의 약속.
// 사례는 docs/review/v2/glossary.md 5.2절 표와 5.13절 목록을 그대로 옮겼다.
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import type { Glossary, GlossaryHit } from '../../src/lib/glossary.ts';
import {
  ALSO_MAX,
  ERROR_MAX,
  SELECTION_MAX,
  buildIndex,
  findAllTerms,
  findTerms,
  hasLatinOrDigit,
  looksLikeError,
  lookupTerm,
  missAction,
  normalizeTerm,
} from '../../src/lib/glossary.ts';
import { DATA_DIR, ROOT, readJson } from '../../scripts/lib/load-data.ts';

const glossary = readJson<Glossary>(join(DATA_DIR, 'glossary.json'));
const index = buildIndex(glossary);

/** 고른 글만 (문맥 없음) */
const pick = (selection: string): GlossaryHit | null => lookupTerm(index, selection);
/** 문맥 속에서 고른 글 (두 번 눌러 어절 하나를 고른 것처럼). at은 같은 글이 여럿일 때 몇 번째인지 */
function pickIn(context: string, selection: string, at = 0): GlossaryHit | null {
  let start = -1;
  for (let i = 0; i <= at; i++) start = context.indexOf(selection, start + 1);
  if (start < 0) throw new Error(`'${selection}'이 문맥에 없다`);
  return lookupTerm(index, selection, { text: context, start, end: start + selection.length });
}
const ids = (hit: GlossaryHit | null): { id: string | null; also: string[]; exact: boolean | null } => ({
  id: hit?.entry.id ?? null,
  also: hit?.also.map((e) => e.id) ?? [],
  exact: hit?.exact ?? null,
});

describe('정규화와 열쇠', () => {
  it('공백·대소문자·문장 부호를 빼고 견준다 (+·#은 남긴다)', () => {
    expect(normalizeTerm(' API  키 ')).toBe('api키');
    expect(normalizeTerm('“CORS”')).toBe('cors');
    expect(normalizeTerm('React + Vite')).toBe('react+vite');
    expect(normalizeTerm('SD_SCHUL_CODE')).toBe('sdschulcode');
  });

  it('전각 글자, 폭 없는 공백, 소프트 하이픈, 풀어 쓴 한글', () => {
    expect(normalizeTerm('ＪＳＯＮ')).toBe('json');
    expect(normalizeTerm('API\u200B키')).toBe('api키');
    expect(normalizeTerm('배\u00AD포')).toBe('배포');
    expect(normalizeTerm('배포'.normalize('NFD'))).toBe('배포');
    expect(pick('Ｊ Ｓ Ｏ Ｎ')?.entry.id).toBe('json');
    expect(pick('API\u200B키')?.entry.id).toBe('api-key');
    expect(pick('배\u00AD포')?.entry.id).toBe('deploy');
    expect(pick('배포'.normalize('NFD'))?.entry.id).toBe('deploy');
  });

  it("'API 키'·'API키'·'api key'는 같은 열쇠", () => {
    expect(pick('API 키')?.entry.id).toBe('api-key');
    expect(pick('API키를')?.entry.id).toBe('api-key');
    expect(pick('api key')?.entry.id).toBe('api-key');
  });
});

describe('문맥으로 감싸는 용어 찾기 (5.2절 표)', () => {
  const s = '공공 API 키를 환경 변수에 넣어 두세요.';

  it("두 번 눌러 고른 '키를' → API 키 (문맥 'API 키를'이 감싼다)", () => {
    expect(ids(pickIn('API 키를', '키를'))).toEqual({ id: 'api-key', also: [], exact: true });
    expect(ids(pickIn(s, '키를'))).toEqual({ id: 'api-key', also: [], exact: true });
  });

  it("'API' → API 키 + 칩 API", () => {
    expect(ids(pickIn(s, 'API'))).toEqual({ id: 'api-key', also: ['api'], exact: true });
  });

  it("'환경' → 환경 변수, '변수에' → 환경 변수 + 칩 변수", () => {
    expect(ids(pickIn(s, '환경'))).toEqual({ id: 'env-var', also: [], exact: true });
    expect(ids(pickIn(s, '변수에'))).toEqual({ id: 'env-var', also: ['variable'], exact: true });
  });

  it("'API 키를 환경 변수에' → API 키 + 칩 환경 변수 (감싸는 것이 없으면 안에서 앞의 것)", () => {
    expect(ids(pickIn(s, 'API 키를 환경 변수에'))).toEqual({ id: 'api-key', also: ['env-var'], exact: false });
  });

  it("'에러를'(CORS 에러를) → CORS, '깃허브'(깃허브 저장소에서도) → 저장소 + 칩 GitHub", () => {
    expect(ids(pickIn('CORS 에러를 만나면 중간 서버를 써요.', '에러를'))).toEqual({ id: 'cors', also: [], exact: true });
    expect(ids(pickIn('깃허브 저장소에서도 볼 수 있어요.', '깃허브'))).toEqual({ id: 'git-repo', also: ['github'], exact: true });
  });

  it("'콘솔'(Firebase 콘솔에서) → 관리 화면 + 칩 콘솔", () => {
    expect(ids(pickIn('Firebase 콘솔에서 키를 받아요.', '콘솔에서'))).toEqual({ id: 'dashboard', also: ['console'], exact: true });
  });

  it('문맥은 고른 범위 앞뒤 48자까지만 본다', () => {
    const far = `API ${'가'.repeat(60)} 키를`;
    expect(pickIn(far, '키를')).toBeNull();
    const near = `${'가나다라 '.repeat(20)}API 키를 넣어요.`;
    expect(pickIn(near, '키를')?.entry.id).toBe('api-key');
  });

  it(`같이 보여 줄 말은 ${ALSO_MAX}개까지, 첫째와 겹치지 않는다`, () => {
    const hit = pickIn('배포 전에 API 키와 CORS, 환경 변수를 확인해요.', '배포 전에 API 키와 CORS, 환경 변수를');
    expect(hit?.entry.id).toBe('deploy');
    expect(hit?.also).toHaveLength(ALSO_MAX);
    expect(hit?.also.map((e) => e.id)).toEqual(['api-key', 'env-var']);
  });
});

describe('어절 첫머리와 꼬리 (거짓 양성 막기)', () => {
  it.each(['포트폴리오', '리포트', '블로그', '카탈로그', '캐시백', '빌드업', '시크릿 창', '코스', '어디로 모실까요?', '점심 메뉴'])(
    "'%s'은 아무것도 찾지 않는다",
    (text) => {
      expect(pick(text)).toBeNull();
    },
  );

  it.each([
    ['서버 리스트', 'server'],
    ['급식API를', 'api'],
    ['엣지 함수', 'function'],
  ])("'%s' → 안에서 %s", (text, id) => {
    expect(ids(pick(text))).toEqual({ id, also: [], exact: false });
  });

  it.each([
    ['본인인증', 'identity-verify'],
    ['휴대폰 인증', 'identity-verify'],
    ['Client Secret', 'secret'],
    ['Firebase 콘솔', 'dashboard'],
    ['Node.js', 'nodejs'],
    ['Firebase CLI', 'cli'],
    ['웹후크', 'webhook'],
    ['깃헙에', 'github'],
    ['푸시 알림', 'push-notify'],
  ])("다른 이름·고친 이름: '%s' → %s", (text, id) => {
    expect(pick(text)?.entry.id).toBe(id);
  });

  it('조사 0~2개, 복수 들, 끝의 요', () => {
    expect(pick('서버에서는')?.entry.id).toBe('server');
    expect(pick('저장소에서도')?.entry.id).toBe('git-repo');
    expect(pick('패키지들을')?.entry.id).toBe('package');
    expect(pick('데이터베이스는요')?.entry.id).toBe('database');
    expect(pick('환경 변수라서')?.entry.id).toBe('env-var');
    expect(pick('서버에서는요')?.entry.id).toBe('server');
    // 조사 셋은 꼬리로 보지 않는다
    expect(pick('서버에서부터까지는')).toBeNull();
  });

  it('하다·되다 활용', () => {
    expect(pick('배포하려면')?.entry.id).toBe('deploy');
    expect(pick('커밋했어요')?.entry.id).toBe('commit');
    expect(pick('로그인했어요')?.entry.id).toBe('auth');
    expect(pick('배포된')?.entry.id).toBe('deploy');
  });

  it("영문 s·es, 그러나 'https'는 http + s가 아니다", () => {
    expect(pick('APIs')?.entry.id).toBe('api');
    expect(pick('tokens')?.entry.id).toBe('token');
    expect(pick('APIs를')?.entry.id).toBe('api');
    expect(pick('https')?.entry.id).toBe('https');
    expect(pick('https를')?.entry.id).toBe('https');
    expect(pick('http')?.entry.id).toBe('http');
  });

  it("한 글자 이름('봇')은 고른 글 전체가 그 말일 때만", () => {
    expect(pick('봇')?.entry.id).toBe('bot');
    expect(pick('봇이')?.entry.id).toBe('bot');
    expect(pick('챗봇')?.entry.id).toBe('bot');
    expect(pick('로봇')).toBeNull();
    expect(pickIn('봇이 알림을 보내요.', '봇이')?.entry.id).toBe('bot');
    expect(pickIn('봇이 알림을 보내요.', '알림을')).toBeNull();
  });

  it("다른 용어를 만드는 꼬리는 막힌다 ('로그인'을 '로그' + '인'으로 보지 않는다)", () => {
    expect(ids(pick('로그인'))).toEqual({ id: 'auth', also: [], exact: true });
  });

  it('숫자 뒤 영문 단위는 새 용어가 될 수 있다', () => {
    expect(pick('500MB')?.entry.id).toBe('mb-gb');
  });

  it("읽는 법(say)은 열쇠가 아니다 ('코스'는 CORS가 아니다)", () => {
    expect(index.byId.get('cors')?.say).toBe('코스');
    expect(pick('코스')).toBeNull();
  });
});

describe('찾지 않는 것과 모르는 말', () => {
  it(`빈 글, ${SELECTION_MAX}자를 넘는 글은 용어를 찾지 않는다`, () => {
    expect(pick('   ')).toBeNull();
    expect(pick('API '.repeat(20))).toBeNull();
    expect(pick(`${'가'.repeat(SELECTION_MAX)}`)).toBeNull();
  });

  it('고른 범위 앞뒤의 공백·따옴표는 다듬는다', () => {
    expect(pickIn('그건 “CORS” 때문이에요.', '“CORS” ')?.entry.id).toBe('cors');
  });

  it(`에러 문장 판단: ${ERROR_MAX}자 이하, 영문·숫자가 섞임`, () => {
    expect(looksLikeError('TypeError: Failed to fetch')).toBe(true);
    expect(looksLikeError('Error: listen EADDRINUSE: address already in use :::3000')).toBe(true);
    expect(looksLikeError('remote: error: GH013: Repository rule violations found')).toBe(true);
    expect(looksLikeError('오류가 났어요')).toBe(false);
    expect(looksLikeError('ReferenceError: x is not defined')).toBe(true);
    expect(looksLikeError('Edge Functions')).toBe(false);
    expect(looksLikeError('하루 500건')).toBe(false);
    expect(looksLikeError(`Error ${'x'.repeat(ERROR_MAX)}`)).toBe(false);
  });

  it('모르는 말: 에러 → 에러 안내, 영문·숫자 섞임 → 사전, 한글만 → 아무것도', () => {
    expect(missAction('Failed to fetch')).toBe('error');
    expect(missAction('Supabase anon')).toBe('search');
    expect(missAction('어디로 모실까요?')).toBeNull();
    expect(hasLatinOrDigit('ＡＢＣ')).toBe(true);
  });
});

describe('빠르기', () => {
  it('212개 자료에서 한 번 찾는 데 1ms보다 훨씬 짧다', () => {
    const context = '공공 API 키를 환경 변수에 넣고, CORS 에러가 나면 중간 서버를 써요.';
    const n = 500;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) lookupTerm(index, '키를', { text: context, start: 7, end: 9 });
    expect((performance.now() - t0) / n).toBeLessThan(1);
  });
});

describe('자료 약속 (data/glossary.json)', () => {
  /** 풀이에 써도 되는 기본 낱말(브라우저·API·서버·요청·명령·저장소)과 서비스 이름. 이 밖의 용어는 상위 용어 하나(see)까지 */
  const BASIC = new Set(['api', 'server', 'browser', 'request', 'command', 'git-repo', 'github', 'git', 'firebase', 'cloudflare', 'google-sheets', 'neis', 'tago', 'ecos', 'osm', 'data-portal']);
  /** 위험을 숨기지 않는 말 */
  const RISK_WORDS = /안 된다|안 되는|지워질 수 있다|사라진다|꺼야 한다|숨겨야 한다|막아 둬야|돈이 나간다|돈이 나가|읽힐 수 있다/;
  const KINDS = new Set(['key', 'money', 'data', 'code', 'ai', 'law']);

  it('스키마(schemas/glossary.schema.json)를 지킨다', () => {
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(readJson(join(ROOT, 'schemas', 'glossary.schema.json')));
    expect(validate(glossary), JSON.stringify(validate.errors?.slice(0, 3))).toBe(true);
  });

  it('손으로 쓴 용어는 204개 (v5에서 옛 코드잇소 말 9개를 뺐다), id가 겹치지 않고 kind가 있다', () => {
    expect(glossary.terms).toHaveLength(204);
    const all = glossary.terms.map((t) => t.id);
    expect(new Set(all).size).toBe(all.length);
    for (const t of glossary.terms) expect(KINDS.has(t.kind), `${t.id}: ${t.kind}`).toBe(true);
  });

  it('풀이는 한 문장 다체, 70자 이하. 예는 한 문장 60자 이하', () => {
    for (const t of glossary.terms) {
      expect(t.plain.length, t.id).toBeLessThanOrEqual(70);
      expect(t.plain.endsWith('다.'), `${t.id}: ${t.plain}`).toBe(true);
      if (t.example !== undefined) expect(/요\.$/.test(t.example), `${t.id}: ${t.example}`).toBe(false);
      expect(/[.?!]\s/.test(t.plain), `${t.id}: 두 문장`).toBe(false);
      if (t.example !== undefined) {
        expect(t.example.length, t.id).toBeLessThanOrEqual(60);
        expect(/[.?!]\s/.test(t.example), `${t.id}: 예가 두 문장`).toBe(false);
      }
    }
    const avg = glossary.terms.reduce((n, t) => n + t.plain.length, 0) / glossary.terms.length;
    expect(avg).toBeLessThanOrEqual(45);
  });

  it('이름·다른 이름의 열쇠는 용어끼리 겹치지 않고, 다른 이름은 두 글자 이상', () => {
    const owner = new Map<string, string>();
    for (const t of glossary.terms) {
      for (const a of t.aliases ?? []) expect(normalizeTerm(a).length, `${t.id}: ${a}`).toBeGreaterThanOrEqual(2);
      // 띄어쓰기·문장 부호만 다른 이름은 넣지 않는다 (매처는 같은 열쇠로 본다. 사전 색인도 정규화한 모양을 함께 넣는다)
      const keys = [t.term, ...(t.aliases ?? [])].map(normalizeTerm);
      expect(new Set(keys).size, `${t.id}: ${keys.join(', ')}`).toBe(keys.length);
      for (const name of [t.term, ...(t.aliases ?? [])]) {
        const k = normalizeTerm(name);
        const before = owner.get(k);
        expect(before === undefined || before === t.id, `'${name}'이 ${before}와 ${t.id}에 함께 있다`).toBe(true);
        owner.set(k, t.id);
      }
    }
  });

  it('상위 용어(see)는 있는 용어만, 옛 카드·도구·에러 고리는 없다', () => {
    for (const t of glossary.terms) {
      if (t.see) expect(index.byId.has(t.see) && t.see !== t.id, `${t.id}: ${t.see}`).toBe(true);
      expect(t.concept ?? t.tool ?? t.error, t.id).toBeUndefined();
    }
  });

  it('상위 용어(see)는 풀이 문장에서 실제로 찾히고, 풀이 속 다른 용어는 그 하나까지', () => {
    for (const t of glossary.terms) {
      if (t.see) expect(findAllTerms(index, t.plain).some((m) => m.entry.id === t.see), `${t.id}: ${t.see}가 풀이에 없다`).toBe(true);
      const others = [...new Set(findTerms(index, t.plain).map((m) => m.entry.id))].filter((id) => id !== t.id && !BASIC.has(id));
      expect(others.length, `${t.id}: ${others.join(', ')}`).toBeLessThanOrEqual(1);
      if (others[0]) expect(t.see, `${t.id}: 풀이 속 ${others[0]}을 see로 잇는다`).toBe(others[0]);
    }
  });

  it('위험이 있는 용어는 풀이에서 위험을 숨기지 않는다', () => {
    const risky = glossary.terms.filter((t) => t.risk);
    expect(risky.map((t) => t.id)).toEqual(
      expect.arrayContaining(['admin-key', 'test-mode', 'force-push', 'public-env-prefix', 'env-file', 'rls', 'token', 'secret', 'api-key', 'webhook', 'ssh-key', 'public-key', 'firebase-config']),
    );
    for (const t of risky) expect(RISK_WORDS.test(t.plain), `${t.id}: ${t.plain}`).toBe(true);
  });

  it('읽는 법은 한글만, 다른 용어의 열쇠와 겹치지 않는다', () => {
    for (const t of glossary.terms) {
      if (t.say === undefined) continue;
      expect(/^[가-힣]+(?:[ ·][가-힣]+)*$/.test(t.say), `${t.id}: ${t.say}`).toBe(true);
      const owner = index.byKey.get(normalizeTerm(t.say));
      expect(owner === undefined || owner.id === t.id, `${t.id}: 읽는 법 '${t.say}'이 ${owner?.id}의 열쇠`).toBe(true);
    }
  });

  it('옛 단계 이름을 쓰지 않는다', () => {
    for (const t of glossary.terms) {
      const text = [t.term, ...(t.aliases ?? []), t.plain, t.example ?? ''].join(' ');
      expect(/시운전|경유지|점검|들르는 곳/.test(text), `${t.id}: ${text}`).toBe(false);
    }
  });

  it('자기 이름으로 자기를 찾는다 (열쇠를 다른 용어에 빼앗기지 않음)', () => {
    for (const t of glossary.terms) {
      for (const name of [t.term, ...(t.aliases ?? [])]) {
        if (normalizeTerm(name).length < 2 && name !== t.term) continue;
        expect(pick(name)?.entry.id, `${t.id}: '${name}'`).toBe(t.id);
      }
    }
  });
});
