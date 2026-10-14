# C02 묶음 B 대조표 — 한국 공공 데이터 API (교육 중심)

- 초안: `.qa/c02/batch-b.json` (상품 11개, 모두 `layer: shelf`, `recommendable: true`, `needsReview: true`, `checkedAt: 2026-10`)
- 만든 날: 2026-10-12
- **확인 방법**: 이 작업 환경에서는 공식 사이트에 직접 닿지 않았다. WebFetch로 `open.neis.go.kr`, `www.career.go.kr`, `stdict.korean.go.kr`, `www.data.go.kr`를 열면 모두 `getaddrinfo ENOTFOUND`가 났다. 그래서 **WebSearch로 공식 페이지(검색 색인에 저장된 내용)를 확인**했다. 아래 '원문에서 확인한 내용'은 모두 검색 결과에 나온 공식 페이지 문장의 요약이다. 사람이 원문을 직접 열어 대조해야 한다 (C01).
- 검색 한도(세션 공용 200회)가 중간에 다 차서, TourAPI 요청 변수(MobileOS·MobileApp), TAGO 제공 도시 범위, 공공데이터포털 인코딩·디코딩 키 안내, 에어코리아 요청 변수는 찾지 못했다. 그래서 이것들은 카드에 쓰지 않았다.
- **서버 위치(`serverRegion: kr`)**: 11개 모두 원문으로 확인하지 못했다. 국내 공공기관 API라서 지금 진열대의 공공 데이터 상품 7개와 같은 값으로 두었다. 이용자 데이터를 저장하는 상품이 아니라서 엔진 판단(저장 칸 충돌)에는 쓰이지 않는다.
- **공공데이터포털 '트래픽'의 단위**: 포털 표기는 "개발계정 : 10,000"처럼 숫자만 있다. 에어코리아 사용자 지원 페이지가 "개발계정 : 일 500건"이라고 적은 것을 근거로 하루 한도로 읽었다. 사람이 확인해야 한다.
- **`realtime`**: 공공데이터포털은 거의 모든 API를 '업데이트 주기: 실시간'으로 적는다. 이 표기는 '부르면 지금 값을 준다'는 뜻이라서, 자료가 실제로 얼마나 자주 바뀌는지를 따져 보수적으로 골랐다(사전·공휴일은 `static`, 관광·행사는 `daily`).

---

## 1. `neis-school-info` 나이스 학교기본정보

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| provider | 교육부 (운영 한국교육학술정보원) | 제공 기관 교육부·16개 시도교육청. 문의처 openinfo@keris.or.kr (KERIS) | [학교기본정보](https://open.neis.go.kr/portal/data/service/selectServicePage.do?infId=OPEN17020190531110010104913&infSeq=1) · [개발자 가이드](https://open.neis.go.kr/portal/guide/apiGuidePage.do) |
| cost | 무료 | 공공데이터포털 목록: 비용 무료 | [data.go.kr 15122275](https://www.data.go.kr/data/15122275/openapi.do) |
| freeLimit | (비움) | 데이터셋 안내의 '신청제한횟수' 값이 비어 있었음. 포털 목록은 "기관 정책에 따라 트래픽 수는 상이". **확인 못 함** | 위 두 링크 |
| access / prep | key / 포털 로그인 후 인증키 발급, instant | "활용가이드 > 인증키 신청", "별도의 회원가입없이 구글, 네이버, 다음 등의 포털 회원 인증으로" 로그인, 키는 신청 후 바로 나와 마이페이지 발급 내역에서 확인 | [개발자 가이드](https://open.neis.go.kr/portal/guide/apiGuidePage.do) |
| realtime | static | "적재 주기 · 매주" | [학교기본정보](https://open.neis.go.kr/portal/data/service/selectServicePage.do?infId=OPEN17020190531110010104913&infSeq=1) |
| license | 이용허락범위 제한 없음 | 포털 목록: 이용허락범위 제한 없음. 개발단계 자동승인 / 운영단계 심의승인 | [data.go.kr 15122275](https://www.data.go.kr/data/15122275/openapi.do) |
| keyExposureRisk | true | 약관: 키를 남에게 주거나 공유할 수 없고, 비정상 사용 때 키 사용 정지 가능 (약관 페이지에 '(안)' 표기 — 최종본인지 확인 필요) | [이용약관](https://open.neis.go.kr/portal/userAgreementPage.do) |
| stuck 1 | 키 없으면 5건만 | "인증키가 없으면 5건만 샘플로 출력" | [개발자 가이드](https://open.neis.go.kr/portal/guide/apiGuidePage.do) |
| stuck 2 | 매주 모아 올림 | "적재 주기 · 매주" | 학교기본정보 |
| stuck 3 | 폐교는 학교알리미 | 폐교 현황은 학교알리미의 신설/폐교 학교정보에서 확인하라는 안내 | 학교기본정보 |
| serverRegion | kr | 확인 못 함 (머리말 참고) | — |

## 2. `careernet` 커리어넷 진로정보 오픈 API

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| summary | 학과·직업·학교·진로심리검사 | 제공 API 9개: 진로심리검사(v1·v2), 학교정보, 진로교육자료, 직업백과, 직업정보, 학과정보, 주니어직업정보, 진로상담사례 | [Open API 센터](https://www.career.go.kr/cnet/front/openapi/openApiMainCenter.do) |
| provider | 교육부 (운영 한국직업능력연구원) | 포털 목록 이름이 '교육부_커리어넷 …'과 '한국직업능력연구원_…' 두 가지. 운영 주체 표기는 사람 확인 | [data.go.kr 15057878](https://www.data.go.kr/data/15057878/openapi.do) · [15057113](https://www.data.go.kr/data/15057113/openapi.do) |
| cost | 무료 | 포털 목록: 비용부과유무 무료 (커리어넷 누리집의 요금 안내는 **확인 못 함**) | data.go.kr 15057878 |
| freeLimit | (비움) | **확인 못 함** | — |
| access / prep | approval / 회원 가입 → 인증키 신청 → 담당자 승인, days | "서비스를 활용하려면 커리어넷 회원", 인증키 신청 후 "담당자의 승인 이후에 정상적인 사용이 가능". 승인에 걸리는 기간은 **확인 못 함** → 보수적으로 `days` | [이용안내](https://www.career.go.kr/cnet/front/openapi/openApiUseGuideCenter.do) · [인증키 안내](https://www.career.go.kr/cnet/front/openapi/openApiApply04Center.do) |
| realtime | static | **확인 못 함**. 학과·직업 정보의 성격으로 고름 | — |
| license | 공공누리 제1유형 (출처표시) | 포털 목록(학과정보 API): "공공저작물 : 출처표시 (제 1유형)". 같은 계열 파일데이터(15091131)는 '제한 없음'으로 달라 사람 확인 | data.go.kr 15057878 · 15057113 |
| 응답 형식 | needsConcepts에서 json 뺌 | 포털 목록: API 유형 LINK, 데이터 포맷 XML (JSON 지원 여부 **확인 못 함**) | data.go.kr 15057878 |
| stuck 1·2·3 | 승인 대기 / '인증신청현황' 메뉴 / 키 하나로 모든 API | 신청 → 담당자 승인 → "인증신청현황" 메뉴에서 확인, "발급받은 인증키로 커리어넷의 모든 오픈API를 이용" | 이용안내 · 인증키 안내 |
| serverRegion | kr | 확인 못 함 | — |

## 3. `stdict` 표준국어대사전 오픈 API

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost | 무료 | 포털 목록: 비용부과유무 무료 | [data.go.kr 3057780](https://www.data.go.kr/data/3057780/openapi.do) |
| freeLimit | (비움) | 하루 한도 **확인 못 함**. 2013년쯤 개인 블로그에 "인증 키당 일일 요청 횟수 제한"이라는 말만 있음(숫자 없음, 공식 아님) | — |
| access / prep | key / 누리집 회원 가입 후 인증키 신청, hours | 포털 목록: 개발·운영 모두 자동승인, 트래픽은 기관 정책에 따름. 가입 후 키 신청(`stdict.korean.go.kr/openapi/openApiRegister.do`)은 **블로그·공개 코드에서만 봄, 공식 원문 확인 못 함**. 걸리는 시간 확인 못 함 → `hours` | data.go.kr 3057780 |
| license | CC BY-SA, 공공누리 제1유형 | 포털 목록: "저작자표시-동일조건변경허락", "공공저작물 : 출처표시 (제 1유형)" | data.go.kr 3057780 |
| realtime | static | 확인 못 함 (사전이라 static) | — |
| 응답 형식 | needsConcepts에서 json 뺌 | **확인 못 함** | — |
| stuck 1 | 우리말샘과 계정 하나 | "국어사전('우리말샘', '표준국어대사전') 누리집은 통합 계정(ID)으로 운영" | [우리말샘 본인인증](https://opendict.korean.go.kr/sign/joinMemberShip) |
| stuck 2 | 출처 적기 | 이용허락범위(출처표시) | data.go.kr 3057780 |
| serverRegion | kr | 확인 못 함 | — |

## 4. `opendict` 우리말샘 오픈 API

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| summary | 여러 사람이 함께 만드는 개방형 사전 | 누리집 제목 "함께 만들고 모두 누리는 우리말 사전", 포털 목록 이름 "개방형 사전(우리말샘)" | [우리말샘](https://opendict.korean.go.kr/main) · [data.go.kr 15019347](https://www.data.go.kr/data/15019347/openapi.do) |
| cost | 무료 | 포털 목록: 무료 | data.go.kr 15019347 · [15105193](https://www.data.go.kr/data/15105193/openapi.do) |
| freeLimit | (비움) | 포털 목록은 "기관 정책에 따라 트래픽 수는 상이". LINE 개발자 블로그(약 4년 전)에 "하루 25,000건"이 있으나 공식 아님 → **확인 못 함** | — |
| access / prep | key / 회원 가입(휴대폰·전자 우편 인증) 후 키 신청, hours | 가입 때 휴대폰 본인 인증과 전자 우편 인증. 키 신청 절차·걸리는 시간은 **확인 못 함** | [본인인증](https://opendict.korean.go.kr/sign/joinMemberShip) |
| license | CC BY-SA, 공공누리 제1유형 | 15019347: 제1유형 + 저작자표시-동일조건변경허락, 개발·운영 자동승인. 15119597: 같은 허락범위, 운영 심의승인 | data.go.kr 15019347 · [15119597](https://www.data.go.kr/data/15119597/openapi.do) |
| 응답 형식 | needsConcepts에 json, promptFragment "JSON으로" | 15119597: API 유형 LINK, 데이터 포맷 JSON+XML | data.go.kr 15119597 |
| realtime | static | 포털은 '실시간' 표기. 사전이라 static으로 둠 (머리말 참고) | — |
| stuck 3 | 표준국어대사전과 뜻풀이가 다를 수 있음 | 원문 문장 아님. '함께 만드는 사전'에서 나온 조심 문구 — 사람이 판단 | — |
| serverRegion | kr | 확인 못 함 | — |

## 5. `krdict` 한국어기초사전 오픈 API

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost | 무료 | 포털 목록: 비용부과유무 무료 | [data.go.kr 15105059](https://www.data.go.kr/data/15105059/openapi.do) |
| freeLimit | 하루 5만 건 | "인증키는 이메일 계정으로 발급받을 수 있으며 서비스 요청은 하루에 50,000건까지 가능" (영문 페이지도 같음) | [오픈 API 사용 신청](https://krdict.korean.go.kr/kor/openApi/openApiRegister) · [소개](https://krdict.korean.go.kr/kor/openApi/openApiInfo) |
| access / prep | key / 전자 우편 주소로 키 신청, hours | 키는 신청한 전자 우편으로 전송, 신청 전 저작권 정책 확인. 바로 오는지는 **확인 못 함** → `hours` | 사용 신청 |
| license | CC BY-SA 2.0 대한민국 | 저작권 정책: 따로 표시 없는 자료는 CC BY-SA 2.0 KR, 상업적 이용 가능, 멀티미디어 파일은 파일별 조건. **포털 목록은 '이용허락범위 제한 없음'으로 달라** 누리집 정책을 따름 | [저작권 정책](https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo) · data.go.kr 15105059 |
| 응답 형식 | needsConcepts에서 json 뺌, stuck "XML" | 소개 페이지: 검색 출력 결과 필드 "XML 형식(공통)". 포털 목록은 JSON+XML로 적혀 있어 다름 — 사람 확인 | 소개 · data.go.kr 15105059 |
| stuck 1·2 | 010 한도 초과, 020 등록 안 된 키, 키 32자리 | 오류 010 Daily API Limit Exceeded, 020 Unregistered key, 021 일시 중지된 키. 요청 변수 key는 16진수 32자리 | 소개 |
| realtime | static | 확인 못 함 (사전이라 static) | — |
| serverRegion | kr | 확인 못 함 | — |

## 6. `tour-api` 한국관광공사 국문 관광정보 (TourAPI)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| summary | 관광지·행사를 지역·위치·낱말 검색으로 | 지역코드·서비스분류코드·법정동코드·지역기반·위치기반·키워드검색 등 15종, 약 26만 건. REST, JSON+XML. 독일어판에 `searchFestival2`가 있음 | [data.go.kr 15101578](https://www.data.go.kr/data/15101578/openapi.do) |
| cost | 무료 | 포털 목록: 무료 | data.go.kr 15101578 |
| freeLimit | 개발계정 하루 1,000건, 활용 사례 등록으로 증가 신청 | "개발계정 : 1,000 / 운영계정 : 활용사례 등록시 신청하면 트래픽 증가 가능" (단위는 머리말 참고) | data.go.kr 15101578 |
| access / prep | key / 포털 가입 후 활용신청(개발 자동승인), hours | 개발단계 자동승인 / 운영단계 심의승인. 키가 동작하기까지 걸리는 시간은 **확인 못 함** → `hours` | data.go.kr 15101578 |
| realtime | daily | 포털은 '실시간'. 관광 정보 성격으로 daily (머리말 참고) | — |
| license | 제한 없음, 사진은 공공누리 제1·3유형 | 이용허락범위 제한 없음. "이 서비스의 이미지는 공공누리 1유형, 3유형 이미지", 피사체 명예훼손·인격권 침해 용도와 기업 CI·BI 사용 금지 | data.go.kr 15101578 |
| stuck 3 | 데이터베이스에 쌓으려면 운영계정 신청, 실시간 호출 권장 | TourAPI Q&A 답변: "DB저장 방식은 공공데이터 포털에서 운영계정으로 신청", "DB저장방식이 아닌 실시간호출 서비스를 가능한 권고" | [TourAPI Q&A 904](https://api.visitkorea.or.kr/customer/qnaView.do?pageNo=2&qnaNo=904) |
| stuck 4 | 운영계정은 심의 | 운영단계 심의승인 | data.go.kr 15101578 |
| 요청 변수 | 쓰지 않음 | MobileOS·MobileApp 같은 필수 변수는 검색 한도로 **확인 못 함** (확인되면 stuck에 넣을 만함) | — |
| serverRegion | kr | 확인 못 함 | — |

## 7. `kasi-holidays` 한국천문연구원 특일 정보 (공휴일)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| summary | 국경일·공휴일·기념일·24절기 | "국경일, 공휴일, 기념일, 24절기, 잡절 정보", 공공기관 휴일 여부·명칭 | [data.go.kr 15012690](https://www.data.go.kr/data/15012690/openapi.do) |
| cost | 무료 | 이용료 무료 | data.go.kr 15012690 |
| freeLimit | 개발계정 하루 10,000건 | "개발계정 : 10,000 / 운영계정 : 활용사례 등록시 신청하면 트래픽 증가 가능" | data.go.kr 15012690 |
| access / prep | key / 개발·운영 모두 자동승인, hours | "개발단계 : 자동승인 / 운영단계 : 자동승인". 걸리는 시간 **확인 못 함** | data.go.kr 15012690 |
| license | 제한 없음 | 이용허락범위 제한 없음 | data.go.kr 15012690 |
| realtime | static | 포털은 '실시간'(수정일 2023-03-29). 공휴일 자료는 드물게 바뀌어 static | — |
| 응답 형식 / stuck 1 | XML | 데이터 포맷 XML, 서비스 주소 `apis.data.go.kr/B090041/openapi/service/SpcdeInfoService` | data.go.kr 15012690 |
| stuck 2 | SERVICE_KEY_IS_NOT_REGISTERED_ERROR | 포털 API 문서 공통 안내: 에러코드 30, "인증키가 정확한지와 해당 서비스의 활용신청이 정상적으로 완료되었는지 확인" | 포털 여러 API 문서의 공통 오류표 (검색 결과로 확인, 페이지 하나로 확정 못 함. 예: [15077093](https://www.data.go.kr/data/15077093/openapi.do)) |
| serverRegion | kr | 확인 못 함 | — |

## 8. `airkorea` 에어코리아 대기오염정보

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| summary | 측정소별 수치와 미세먼지 예보 | 측정소별·시도별 실시간 측정정보, 나쁨 이상 측정소, 대기질 예보통보, 초미세먼지 주간예보. 예보 요청 주소 `…/getMinuDustFrcstDspth` | [data.go.kr 15073861](https://www.data.go.kr/data/15073861/openapi.do) |
| cost | 무료 | 비용 무료, JSON+XML | data.go.kr 15073861 |
| freeLimit | 개발 하루 500건, 운영 하루 1만 건 | 목록: 개발계정 500. 사용자 지원: "개발계정 : 일 500건 제공중이며 운영계정 일 10,000건 제공 가능" | data.go.kr 15073861 · [15075624](https://www.data.go.kr/data/15075624/openapi.do) |
| access / prep | key / 개발계정 자동승인, hours | 개발단계 자동승인 / 운영단계 심의승인. 공지: 개발계정(500건/일)은 심의 없이 자동승인, 운영계정은 에어코리아 사용자 관리시스템에서 계정 신청·개발보고서 등록 | data.go.kr 15073861 · [공지 1895](https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000001895) |
| license | 공공누리 제3유형 (출처표시, 변경금지) | "공공저작물 : 출처표시, 변경금지 (제 3유형)". 영문 조회 서비스(15156659)는 '제한 없음'으로 다름 | data.go.kr 15073861 |
| realtime | frequent | 측정소가 매시간 농도를 측정해 실시간 공개 ("매시간 갱신"이라는 문장 자체는 찾지 못함) | [에어코리아 확정자료 안내](https://www.airkorea.or.kr/web/last_amb_data?pMENU_NO=123) |
| stuck 2 | 측정소정보 API로 측정소 찾기 | 같은 기관의 측정소정보 API가 따로 있음 | [data.go.kr 15073877](https://www.data.go.kr/data/15073877/openapi.do) |
| stuck 3 | 확정 전 자료, 점검 때 값이 빌 수 있음 | 실시간 자료는 최종 확정 전 자료. 장비점검·통신장애 등 이상데이터는 "-"로 표기 (누리집 표시 기준 — API 응답도 같은지는 확인 못 함) | 에어코리아 확정자료 안내 |
| stuck 4 | 운영계정은 사용자 관리시스템에서 | 공지 1895 | 공지 1895 |
| serverRegion | kr | 확인 못 함 | — |

## 9. `tago-bus-arrival` 국토교통부(TAGO) 버스도착정보

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost | 무료 | 무료, JSON+XML | [data.go.kr 15098530](https://www.data.go.kr/data/15098530/openapi.do) |
| freeLimit | 개발계정 하루 10,000건 | "개발계정은 일 10,000건", 운영계정은 활용사례 등록 시 증가 | data.go.kr 15098530 |
| access / prep | key / 도착정보·정류소정보 활용신청, 개발·운영 자동승인, hours | "개발단계 : 자동승인 / 운영단계 : 자동승인". 정류소ID는 TAGO 버스정류소정보 API에서 얻음 | data.go.kr 15098530 |
| license | 제한 없음 | 이용허락범위 제한 없음 | data.go.kr 15098530 |
| realtime | realtime | 업데이트 주기 실시간, 운행 중인 버스의 도착 예정 정보 | data.go.kr 15098530 |
| stuck 1 | 도시코드·정류소ID 필요 | 필수 변수 serviceKey, cityCode, nodeId. 요청 주소 `apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList` | data.go.kr 15098530 |
| stuck 2 | 초 단위 | 응답 '도착예상시간(초)' | data.go.kr 15098530 |
| stuck 3 | 제공 도시는 도시코드 목록으로 | "제공 도시는 도시코드 목록 조회 기능으로 확인". 서울이 빠지는지는 **확인 못 함** | data.go.kr 15098530 |
| 기타 | — | 2022년 공지: TAGO 오픈API 13종 폐기·대체, 버스도착정보는 15098530이 대체 서비스. 목록 수정일 2023-07-12 | [공지 2723](https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000002723) |
| serverRegion | kr | 확인 못 함 | — |

## 10. `seoul-open-data` 서울 열린데이터광장

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost | 대부분 무료 | 열린데이터광장 안에서 '무료'라는 문장은 **찾지 못함**. 서울 데이터 허브: "누구나 서울시의 행정 데이터를 무료로 검색하고 시각화하며 다운로드". 보수적으로 '대부분 무료' | [서울 데이터 허브](https://data.seoul.go.kr/bsp/wgs/index.do?tab=portal) |
| freeLimit | API마다 다름, 한 번에 1,000건 | "한번에 최대 1,000건을 요청", 실시간 지하철은 하루 최대 1,000건, 제약 없이 쓰려면 활용사례(갤러리)에 인증키와 콘텐츠 등록 | [Open API 소개](https://data.seoul.go.kr/together/guide/useGuide.do) |
| access / prep | key / 로그인(없으면 서울시 누리집 가입) 후 인증키 신청, hours | "열린데이터 광장 로그인(이용자 ID가 없으면 서울시 포털로 이동하여 회원가입) → 인증키 신청". 바로 나오는지 **확인 못 함** → `hours` | Open API 소개 · [인증키 신청](https://data.seoul.go.kr/together/mypage/actkeyMain.do) |
| license | (넣지 않음) | API마다 다름. 'Open API 현황' 데이터셋은 공공누리 1유형 — 묶음 전체 값으로 쓰지 않음 | [OA-2191](https://data.seoul.go.kr/dataList/OA-2191/S/1/datasetView.do) |
| realtime | daily | 포털이라 API마다 다름. data-go-kr과 같은 값 | — |
| stuck 1 | sample 키 5건 | "sample 키는 최초5건 이내에서만 호출 가능함. 정식 서비스를 위해서는 인증키 발급 필수" | Open API 소개 |
| stuck 2 | 한 번에 1,000건 | 위와 같음 | Open API 소개 |
| stuck 3 | 기본 주소가 http | 기본 요청 주소 `http://openapi.seoul.go.kr:8088/`(일부 서비스는 다른 주소). https 화면에서 막힌다는 것은 브라우저의 일반 동작(섞인 콘텐츠 차단)으로, 원문 문장은 아님 | Open API 소개 |
| stuck 4 | 형식이 API마다 다름 | "xml, xls, json 중 택 일이나 일부 특정 형태로만 사용 가능한 경우가 있습니다" | Open API 소개 |
| serverRegion | kr | 확인 못 함 | — |

## 11. `culture-events` 한눈에보는문화정보 (공연·전시)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| summary | 공연·전시의 기간·장소·가격·사진 | "기간별, 지역별, 분야별 공연 및 전시 목록과 상세정보, 장소, 일정, 가격, 위치 좌표, 썸네일 이미지, 관련 링크" | [data.go.kr 15138937](https://www.data.go.kr/data/15138937/openapi.do) |
| provider | 한국문화정보원 (문화포털) | 포털 목록 이름 '한국문화정보원_한눈에보는문화정보조회서비스' | data.go.kr 15138937 |
| cost | 무료 | 비용부과유무 무료, 데이터 포맷 XML | data.go.kr 15138937 |
| freeLimit | 개발계정 하루 10,000건 | "개발계정 : 10,000 / 운영계정 : 활용사례 등록시 신청하면 트래픽 증가 가능" | data.go.kr 15138937 |
| access / prep | key / 포털 활용신청, 개발·운영 자동승인, hours | "개발단계 : 자동승인 / 운영단계 : 자동승인". 문화포털 가이드: 포털 로그인 → API 검색 → 활용신청 → 마이페이지에서 인증키 확인 | data.go.kr 15138937 · [문화포털 가이드](https://www.culture.go.kr/industry/apiGuideA.do) |
| license | 제한 없음 | 이용허락범위 제한 없음 | data.go.kr 15138937 |
| realtime | daily | 포털은 '실시간'. 행사 정보 성격으로 daily | — |
| stuck 1 | XML | 데이터 포맷 XML (가이드에서 다시 확인하라는 말이 있음) | data.go.kr 15138937 |
| stuck 2 | 기간별·지역별·분야별 주소가 다름 | 요청 주소 `apis.data.go.kr/B553457/nopenapi/rest/publicperformancedisplays/period` 등 조회마다 따로 | 문화포털 가이드 |
| stuck 3 | 개발 안내서는 압축 파일 | "한눈에보는문화정보 조회서비스 개발가이드(zip)" | 문화포털 가이드 |
| serverRegion | kr | 확인 못 함 | — |

---

## 넣지 않은 후보

| 후보 | 이유 |
|---|---|
| 국가유산청(문화재) 정보 | 인증키가 필요한지, 무료인지, 이용허락범위가 무엇인지 원문으로 확인하지 못했다. 국가유산청 개방목록 페이지에서 확인한 것은 요청 주소(`http://www.khs.go.kr/cha/SearchKindOpenapiList.do`, https 아님), "현재 xml타입의 데이터로만 제공", "클라이언트에서 직접적인 호출은 불가", 요청 변수 표에 인증키 칸이 없다는 것뿐이다. `access`와 `keyExposureRisk`를 정할 수 없고, 국가유산청 누리집이 개편되며 국가유산 정보가 '국가유산포털'로 옮겨 가는 중이라 주소도 바뀔 수 있다. 원문 확인 뒤 다시 넣는다. 출처: [개방목록](https://www.khs.go.kr/html/HtmlPage.do?pg=%2Fpublicinfo%2Fpbinfo3_0201.jsp&mn=NS_04_04_03) · [활용정보](https://www.khs.go.kr/html/HtmlPage.do?pg=%2Fpublicinfo%2Fpbinfo3_0202.jsp&mn=NS_04_04_03) |

## 합칠 때 골든 사례가 바뀌는 곳 (참고)

`data/`는 건드리지 않고, 메모리에서 진짜 자료 + 이 묶음을 합쳐 골든 20개를 돌려 봤다. 10개가 달라진다.

| 사례 | 바뀌는 것 | 판단 |
|---|---|---|
| case-12 버스 도착 알림 | slot.data 추천 null → `tago-bus-arrival` | 의도한 개선 (교통 분야 상품이 생김) |
| case-20 동네 문화 행사 | 추천 `data-go-kr` → `culture-events`, 2위 `data-go-kr` | 의도한 개선 (문화 분야 상품이 생김) |
| case-01·09 급식, case-17 학사일정, case-18 시간표 | slot.data 2위가 `neis-school-info`로 | 주제(topic)가 없는 상품은 주제 감점(-3)을 안 받아서, 주제가 다른 나이스 상품보다 위로 온다. 학교 코드를 찾는 데 꼭 필요한 API라 2위로는 그럴듯하다 |
| case-05 교육과정 찾기 | 추천 null → `neis-school-info` | **문제**. 교육과정을 찾는 사람에게 학교기본정보를 추천한다. 학교 기본 정보용 topic(예: `topic.school-info`)과 질문 보기를 더하거나, 다른 방법을 정해야 한다 |
| case-07 번역 도구 | 추천 null → `krdict` | **판단 필요**. '번역·언어' 분야에 사전이 생겨 번역 도구에 사전을 추천한다. 다른 묶음에서 번역 상품이 들어오면 그쪽이 앞설 수 있다. 사전 셋은 점수가 같아 id 순으로 krdict가 앞선다 |
| case-15·16 날씨 위젯 | 추천 `kma-forecast` → `airkorea`, 2위 `kma-forecast` | **문제**. 점수가 같아서 id 알파벳 순으로 airkorea가 앞선다. 날씨 분야에 주제 태그(예보·대기질)를 두거나 다른 기준이 필요하다 |
