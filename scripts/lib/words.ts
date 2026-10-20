// 쓰지 않는 말 (v5 brief 1·4절, D108 → v5.1 D119). 화면 문구(ko.ts·kits.json)에서 버린 v1~v4 세계의 말과 다체 끝맺음을,
// 용어 풀이(data/glossary.json)에서 버린 세계의 말만 찾는다. 화면 말투는 해요체(토스·카카오처럼), 법 문서는 합니다체,
// 상품 설명·용어 풀이는 사전 글이라 다체 그대로다. 상품 자료(data/catalog)는 출처 원문이라 보지 않는다.
// 부작용 없는 도우미: scripts/guard/check-words.ts와 시험(tests/words.test.ts)이 함께 쓴다.

export interface BannedWord {
  /** 찾는 모양 (정규식) */
  re: RegExp;
  /** 대신 쓸 말 (출력용) */
  instead: string;
  /** 문장이 이 모양을 품으면 다른 뜻이라 괜찮다 */
  allowIf?: RegExp;
}

/** v5에서 버린 세계의 말 (단계 흐름·기사·설계도·교통 비유, v5.1에서 영수증·계산). v5.1의 말은 쇼핑몰 말: 재료·상품·카테고리·장바구니·담기·프롬프트 뽑기 */
export const BANNED: readonly BannedWord[] = [
  { re: /기사님|기사 메시지/, instead: '빼기 (v5에는 기사가 없다)' },
  { re: /목적지/, instead: '만들 앱 / 프로젝트' },
  { re: /설계도/, instead: '프롬프트' },
  { re: /꾸러미/, instead: '프롬프트' },
  { re: /영수증|계산하기|재료 목록\(\.md\)/, instead: '프롬프트 / 프롬프트 뽑기 (v5.1에는 영수증이 없다)', allowIf: /바뀌었/ },
  { re: /경유지|시운전|배차|탑승/, instead: '빼기 (옛 단계·탈것 비유)' },
  { re: /내 AI 써 보기|만들 앱 정하기|도구 고르기|도구끼리 맞춰 보기|설계도 받기/, instead: '빼기 (v5에는 단계 흐름이 없다)' },
  { re: /막힌 곳|통행 불가|지름길|서행/, instead: '빼기 (v4 호환성 판단은 v5에서 하지 않는다)' },
  { re: /교통 정보/, instead: '빼기 (옛 교통 비유)', allowIf: /버스|국토교통부|대중교통|지하철/ },
  { re: /미리 짠 코스/, instead: '묶음 기획전 / 스타터 키트' },
];

/** 다체 끝맺음 ('~다', '~이다'): 화면 문구는 해요체로 쓴다 (v5.1 D119). 합니다체('~니다')는 법 문서의 말투라 잡지 않는다 */
const DACHE = /[가-힣]다[.?!…)]?$/;
const FORMAL = /니다[.?!…)]?$/;

export interface WordHit {
  word: string;
  instead: string;
}

/** 문장 하나에서 쓰지 않는 말을 찾는다. tone이면 다체 끝맺음도 찾는다 (화면 문구만) */
export function findBanned(text: string, tone = true): WordHit[] {
  const out: WordHit[] = [];
  for (const b of BANNED) {
    if (b.allowIf?.test(text)) continue;
    const m = text.match(b.re);
    if (m) out.push({ word: m[0].trim(), instead: b.instead });
  }
  if (!tone) return out;
  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    const t = sentence.trim();
    if (FORMAL.test(t)) continue;
    const m = t.match(DACHE);
    if (m) out.push({ word: m[0], instead: "해요체('~해요')로 쓴다 (v5.1 D119)" });
  }
  return out;
}

/**
 * JSON 값 안의 문장을 경로와 함께 모두 꺼낸다. 이름이 skip에 든 칸(id, 주소, 출처 따위)은 건너뛴다.
 */
export function collectStrings(value: unknown, skip: ReadonlySet<string>, path = ''): { path: string; text: string }[] {
  if (typeof value === 'string') return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => collectStrings(v, skip, `${path}[${i}]`));
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([k, v]) => (skip.has(k) ? [] : collectStrings(v, skip, path ? `${path}.${k}` : k)));
  }
  return [];
}
