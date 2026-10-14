// 쓰지 않는 말 검사 (CONCEPT 3.9): 옛 비유를 잡고, 다른 뜻으로 쓴 같은 낱말은 놓아준다
import { describe, expect, it } from 'vitest';
import { collectStrings, findBanned } from '../scripts/lib/words.ts';

const words = (text: string, ui = true): string[] => findBanned(text, ui).map((h) => h.word);

describe('쓰지 않는 말', () => {
  it('옛 단계 이름과 가게·학교 비유를 잡는다', () => {
    expect(words('다음 정류장은 장보기입니다.')).toEqual(['정류장', '장보기']);
    expect(words('인터뷰를 마치면 열려요.')).toEqual(['인터뷰']);
    expect(words('설계 꾸러미를 받아요.')).toEqual(['꾸러미']);
    expect(words('2차로 미루기')).toEqual(['2차로']);
    expect(words('영수증 뽑기')).toEqual(['뽑기']);
  });

  it('옛 단계 이름과 탈것 앱 말을 잡는다 (D64)', () => {
    expect(words('다음은 경유지예요. 들르는 곳마다 도구를 골라요.')).toEqual(['경유지', '들르는 곳']);
    expect(words('10분 시운전부터 해 보세요')).toEqual(['시운전']);
    expect(words('출발 전 점검')).toEqual(['점검']);
    expect(words('길 찾는 중')).toEqual(['길 찾는 중']);
    expect(words('기사 호출하기')).toEqual(['호출']);
    expect(words('배차 완료, 탑승하세요')).toEqual(['배차', '탑승']);
  });

  it("기술 뜻의 '점검'·'호출'은 화면 밖 자료에서, 'API 호출'은 어디서나 놓아준다", () => {
    expect(words('브라우저에 들어 있는 점검 도구예요.', false)).toEqual([]);
    expect(words('하루 호출 한도가 있어요.')).toEqual([]);
    expect(words('한 달 API 호출이 1,000번이에요.')).toEqual([]);
  });

  it('새 말은 통과한다', () => {
    expect(words('도구 고르기 · 1개만 더 고르면 돼요 · 약 1분')).toEqual([]);
    expect(words('고른 도구끼리 잘 맞을까요?')).toEqual([]);
    expect(words('코드는 몰라도 됩니다. 목적지만 말하세요.')).toEqual([]);
    expect(words('설계도 받으러 출발하기')).toEqual([]);
    expect(words('막힌 곳이 없어요. 모두 원활해요.')).toEqual([]);
    expect(words('도착했습니다. 요금은 0원입니다.')).toEqual([]);
  });

  it('다른 뜻으로 쓴 같은 낱말은 놓아준다', () => {
    expect(words('학교 앞 정류장의 버스 도착 시간')).toEqual([]);
    expect(words('Leaflet + 오픈스트리트맵 지도')).toEqual([]);
    expect(words('담임 교사가 쓰는 신청서')).toEqual([]);
    expect(words('부담 없이 시작해요')).toEqual([]);
  });

  it("일반 동사 '담다'는 화면·설계도 문장에서만 막는다", () => {
    expect(words('표에 나눠 담아요.')).toEqual(['담아요']);
    expect(words('표에 나눠 담아요.', false)).toEqual([]);
  });

  it('영어 섞어 쓰기를 잡는다', () => {
    expect(words('버튼을 클릭하세요')).toEqual(['클릭']);
  });

  it('v3: 옛 소개 문구와 화면에서 쓰지 않는 영어 말을 잡는다 (D83, L-01)', () => {
    expect(words('자료는 누구나 고칠 수 있어요')).toEqual(['누구나 고칠']);
    expect(words('모두 공개 저장소의 data 폴더에 있어요.')).toEqual(['공개 저장소']);
    expect(words('테마와 폰트를 골라요')).toEqual(['테마', '폰트']);
    expect(words('프리뷰 · 팔레트 · 커스텀')).toEqual(['프리뷰', '팔레트', '커스텀']);
    expect(words('가이드와 튜토리얼, 온보딩, 길잡이')).toEqual(['가이드', '튜토리얼', '온보딩', '길잡이']);
    expect(words('다크 모드로 바꾸기')).toEqual(['다크 모드']);
    expect(words('다크모드')).toEqual(['다크모드']);
    expect(words('화면 올리기 전에')).toEqual(['화면 올리기']);
    expect(words('체크리스트')).toEqual(['체크']);
  });

  it("v3: 문서 이름 '활용 가이드'는 화면 밖 설명에서 놓아주고, '공개 저장소'는 어디서나 막는다 (D85)", () => {
    expect(words('공개 저장소는 누구나 볼 수 있으니 키를 올리면 안 돼요.', false)).toEqual(['공개 저장소']);
    expect(words('비공개 저장소도 나중에 공개될 수 있어요.', false)).toEqual(['공개 저장소']);
    expect(words('공개한 저장소는 누구나 볼 수 있어요. 비공개로 둔 저장소도 공유될 수 있어요.', false)).toEqual([]);
    expect(words('변환 방법은 기상청 활용 가이드에 있어요.', false)).toEqual([]);
    expect(words('화면 올리기·저장·로그인', false)).toEqual(['화면 올리기']);
  });

  it('v3: 바꾼 말은 통과한다', () => {
    expect(words('틀린 곳을 알려 주세요')).toEqual([]);
    expect(words('색·글꼴 더 정하기')).toEqual([]);
    expect(words('화면 밝기: 기기 따라 · 밝게 · 어둡게')).toEqual([]);
    expect(words('만들기 안내 · 공개하기 · 공개한 뒤')).toEqual([]);
    expect(words('© 2026 코드쇼퍼')).toEqual([]);
  });
});

describe('JSON 문장 꺼내기', () => {
  it('id·주소 같은 칸은 건너뛰고 경로와 함께 꺼낸다', () => {
    const got = collectStrings({ id: 'slot.store', title: '저장', list: [{ url: 'https://x', text: '가' }] }, new Set(['id', 'url']));
    expect(got).toEqual([
      { path: 'title', text: '저장' },
      { path: 'list[0].text', text: '가' },
    ]);
  });

  it('id 묶음 칸은 묶음일 때만 건너뛴다 (같은 이름의 문장 하나는 검사)', () => {
    const got = collectStrings({ answers: { 'q.type': 'page' }, labels: { answers: '고른 답' } }, new Set(), new Set(['answers']));
    expect(got).toEqual([{ path: 'labels.answers', text: '고른 답' }]);
  });
});
