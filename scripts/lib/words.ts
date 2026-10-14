// 쓰지 않는 말 (docs/CONCEPT.md 3.9절, D64). 화면 문구와 자료 문장에서 옛 비유·옛 단계 이름·탈것 앱 말·영어 섞어 쓰기를 찾는다.
// 부작용 없는 도우미: scripts/guard/check-words.ts와 시험이 함께 쓴다.

export interface BannedWord {
  /** 찾는 모양 (정규식) */
  re: RegExp;
  /** 대신 쓸 말 (출력용) */
  instead: string;
  /** 문장이 이 모양을 품으면 다른 뜻이라 괜찮다 (예: 버스 '정류장') */
  allowIf?: RegExp;
  /** 화면·꾸러미 문장에만 건다 (개념·상품 설명의 일반 동사 '담다'는 괜찮다) */
  uiOnly?: boolean;
}

/** 버린 세계(버스·스탬프 투어·가게·학교)와 바꾼 말. 대신 쓸 말은 CONCEPT 3절 용어 사전 */
export const BANNED: readonly BannedWord[] = [
  { re: /정류장/, instead: '단계', allowIf: /버스|정류소/ },
  { re: /노선도|노선 띠/, instead: '단계 줄(화면에 이름을 띄우지 않음)' },
  { re: /전광판/, instead: '상태 한 줄' },
  { re: /주행 거리|\d\s*km\b|\bkm\b/, instead: '남은 일의 개수 ("꼭 고를 것 1개 남음")' },
  { re: /도장/, instead: '✓·읽음 (영수증의 "코드쇼퍼 · 요금 0원"은 글에 \'도장\'이라 쓰지 않는다)' },
  { re: /기사님/, instead: '기사 메시지(문서 안 이름) 또는 빼기' },
  { re: /첫 수업/, instead: '내 AI 써 보기' },
  { re: /인터뷰/, instead: '만들 앱 정하기' },
  { re: /장보기/, instead: '도구 고르기' },
  { re: /재확인/, instead: '도구끼리 맞춰 보기' },
  { re: /계산대/, instead: '설계도 받기' },
  { re: /장바구니/, instead: '고른 도구' },
  { re: /(?<![부])담(?:기\b|기를|았|은 |을 |아 |아서|아요|겨|는 )/, instead: '고르기 / 골랐어요', uiOnly: true },
  { re: /진열대|진열 상품/, instead: '도구 모음 / 도구' },
  { re: /색인 상품|색인에서 찾은/, instead: '원문만 있는 도구' },
  { re: /상품/, instead: '도구' },
  { re: /레시피/, instead: '미리 짠 코스 / 코스' },
  { re: /꾸러미/, instead: '설계도' },
  { re: /공부할 것/, instead: '읽어 둘 용어' },
  { re: /조사할 것|조사 카드/, instead: '알아볼 것' },
  { re: /예상 막힘/, instead: '막히기 쉬운 곳' },
  { re: /2위/, instead: '다른 후보' },
  { re: /[12]차(?![가-힣])|[12]차로|[12]차에|[12]차는|[12]차가/, instead: '먼저 만들 것 / 나중에 붙일 것' },
  { re: /뽑기|뽑는|뽑아/, instead: '받기 / 출력' },
  { re: /아마도/, instead: '아마 그럴 거예요' },
  { re: /개념 카드|필요한 개념|모든 개념|관련 개념|먼저 볼 개념|알면 좋은 개념|읽은 개념/, instead: '용어 카드 / 필요한 용어' },
  { re: /추천 공식/, instead: '추천 기준' },
  { re: /초보 추천/, instead: '처음 쓰기 쉬움' },
  { re: /초록불|빨간불|신호등/, instead: '원활 / 막힘 / 교통 정보' },
  { re: /충돌/, instead: '막힌 곳' },
  { re: /체크|클릭|큐레이션|오픈(?!소스| 소스|스트리트맵| API| 데이터|사전|AI)/, instead: '확인 / 누르기 / 고르기 / 열기 (copy.md)' },
  // D64: 단계 이름은 할 일을 말한다. 비유 단계 이름(시운전·경유지·점검)과 탈것 앱 말(호출·배차·탑승), 가짜 기다림을 쓰지 않는다.
  // '목적지'는 홈 소개 문장·지도의 빈 터 이름표·영수증 줄에 남는다. '점검'·'호출'은 기술 뜻(개발자 도구의 점검, API 호출)이 있어 화면·설계도 문장에만 건다
  { re: /시운전/, instead: '내 AI 써 보기' },
  { re: /경유지/, instead: "도구 고르기 (기능 하나는 '고를 것')" },
  { re: /점검/, instead: '도구끼리 맞춰 보기 (단계 이름) / 확인', uiOnly: true },
  { re: /들르는 곳/, instead: '필요한 기능마다 / 기능마다' },
  { re: /길 찾는 중/, instead: '빼기 (가짜 기다림을 쓰지 않는다) / 지금까지 정한 것' },
  { re: /호출/, instead: '빼기 (탈것 앱 말)', uiOnly: true, allowIf: /API|호출 한도|호출 수|호출이 안|함수/ },
  { re: /배차/, instead: '빼기 (탈것 앱 말)' },
  { re: /탑승/, instead: '빼기 (탈것 앱 말)' },
];

export interface WordHit {
  word: string;
  instead: string;
}

/** 문장 하나에서 쓰지 않는 말을 찾는다. ui가 false면 화면·꾸러미 전용 규칙은 건너뛴다 */
export function findBanned(text: string, ui = true): WordHit[] {
  const out: WordHit[] = [];
  for (const b of BANNED) {
    if (b.uiOnly && !ui) continue;
    if (b.allowIf?.test(text)) continue;
    const m = text.match(b.re);
    if (m) out.push({ word: m[0].trim(), instead: b.instead });
  }
  return out;
}

/**
 * JSON 값 안의 문장을 경로와 함께 모두 꺼낸다. 이름이 skip에 든 칸(id, 주소, 출처 따위)은 건너뛴다.
 * skipGroup에 든 칸은 값이 묶음(객체·배열)일 때만 건너뛰고, 문장 하나면 검사한다.
 */
export function collectStrings(value: unknown, skip: ReadonlySet<string>, skipGroup: ReadonlySet<string> = new Set(), path = ''): { path: string; text: string }[] {
  if (typeof value === 'string') return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => collectStrings(v, skip, skipGroup, `${path}[${i}]`));
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([k, v]) =>
      skip.has(k) || (skipGroup.has(k) && typeof v !== 'string') ? [] : collectStrings(v, skip, skipGroup, path ? `${path}.${k}` : k),
    );
  }
  return [];
}
