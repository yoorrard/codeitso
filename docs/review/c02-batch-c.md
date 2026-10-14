# C02 묶음 C 대조표 — 지도·그림·번역·금융·날씨 (초안 10개)

초안: `.qa/c02/batch-c.json` · 모두 `needsReview: true`, `checkedAt: "2026-10"`, `layer: "shelf"`, `recommendable: true`.

## 확인 방법 (먼저 읽기)

- 이 작업 환경에서는 공식 사이트 대부분에 직접 닿지 않았다. WebFetch는 DNS 실패(ENOTFOUND), curl은 프록시 403.
- **원문 직접 읽음**: GitHub에 있는 공식 저장소 파일만 열렸다 (Open-Meteo README, Leaflet LICENSE·README, 네이버 지도 API v3 문서 원본 `navermaps/maps.js.ncp`).
- **검색 결과로 확인**: 나머지는 WebSearch(공식 도메인으로 좁힘)가 돌려준 공식 페이지 내용 요약으로 확인했다. 아래 표의 '확인 방법' 칸에 `검색`으로 적었다. 사람이 원문을 직접 열어 대조해야 한다.
- 작업 끝 무렵 WebSearch 사용 한도가 다 차서 더 찾지 못했다 (네이버 지도 새 Maps 상품 요금표가 여기에 걸렸다).
- `serverRegion`: 원문으로 확인한 것은 Open-Meteo(유럽·북미)와 DeepL(기본 EU, AWS 전 세계 지역 처리 가능)뿐이다. 국내 기관·국내 클라우드는 기존 카드 관례대로 `kr`(확인 못 함), 해외 회사 중 확인 못 한 곳은 `unknown`.
- `realtime`: 번역 API는 요청할 때마다 바로 결과를 주므로 `realtime`으로 적었다 (판단, 원문 문장 아님).

## 넣지 않은 후보

| 후보 | 이유 |
|---|---|
| Pixabay API | 공식 API 문서에서 확인한 것은 호출 한도(60초에 100번), 응답 24시간 캐시 의무, 영구 핫링크 금지(오래 쓸 그림은 내 서버에 내려받기)뿐. **무료 여부와 출처 표시 의무를 공식 원문으로 확인하지 못했다** (검색 결과는 제3자 글뿐). 또 그림을 내 서버에 내려받아야 해서 서버 없는 초심자 정적 사이트에 맞지 않는다. 그림 분야는 Unsplash로 채웠다. |
| 기상청 외 다른 대기 데이터(Open-Meteo 대기질 API) | Open-Meteo 카드 하나로 두고 따로 만들지 않았다. 국내 대기 데이터는 에어코리아 카드로 넣었다. |

## 1. leaflet-osm — Leaflet + 오픈스트리트맵 지도

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free / note | true / "무료. 이용자가 많아지면 다른 지도 타일 제공처로 옮겨야 해요" | (검색) 타일 정책: "OpenStreetMap data is free for everyone to use. Our tile servers are not." 기부로 운영, 용량 제한. 많이 쓰는 앱은 자기 타일 서버나 다른 제공처를 쓰라고 함. 쓰는 데 돈을 내는 절차는 없음 | https://operations.osmfoundation.org/policies/tiles/ |
| freeLimit | "정해진 숫자 한도는 없어요. 너무 많이 쓰거나 규칙을 어기면 예고 없이 막힐 수 있어요." | (검색) 정책은 '많이 씀'을 숫자로 정하지 않음. 서비스를 해치면 예고 없이 막을 수 있다고 함. 보장(SLA) 없음 | https://operations.osmfoundation.org/policies/tiles/ |
| access | none | (검색) 키 없음. 대신 올바른 User-Agent·Referer, 캐시 헤더 따르기(못 읽으면 최소 7일) 요구 | 같은 곳 |
| 출처 표시 의무 (promptFragment·stuck) | "지도 오른쪽 아래에 '© OpenStreetMap contributors' 출처와 저작권 안내 링크" | (검색) 지도 위에 보이게 표시(보통 오른쪽 아래), UI 밑이나 접힌 메뉴에 숨기면 안 됨. 권장 문구 "© OpenStreetMap contributors", ODbL임을 알리는 링크(openstreetmap.org/copyright) 필요. 출처가 없어 손으로 막는 경우가 있다고 위키에 있음 | https://www.openstreetmap.org/copyright · https://osmfoundation.org/wiki/Licence/Attribution_Guidelines · https://wiki.openstreetmap.org/wiki/Blocked_tiles |
| 오프라인 내려받기 금지 (promptFragment·stuck) | "지도를 미리 통째로 내려받아 두는 기능은 만들지 마" | (검색) 대량 내려받기, 미리 받아 두기, 오프라인 저장 금지 | https://operations.osmfoundation.org/policies/tiles/ |
| license | BSD 2-Clause (Leaflet) | (원문 직접) LICENSE 첫 줄 "BSD 2-Clause License". README: "about 40 kB of gzipped JS plus 3.2 kB of gzipped CSS" | https://github.com/Leaflet/Leaflet/blob/main/LICENSE |
| provider | community | Leaflet은 오픈소스, 타일은 OSM 재단 | 위 링크들 |
| serverRegion | unknown | 확인 못 함 | — |
| stuck "상자 높이" | 지도 상자에 높이가 없으면 안 보임 | 확인 못 함 (Leaflet 사용법 일반 지식). 사람 확인 필요 | https://leafletjs.com |

## 2. naver-maps — 네이버 지도 API (네이버 클라우드)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | **false** | (검색) 공지: 2025-07-01부터 AI·NAVER API의 지도 API 7종(Web Dynamic Map 포함) 월 무료 이용량 종료, 100% 유료. 새 Maps 상품(Application Services > Maps)으로 개편. 사용 가이드에는 "무료 이용량은 대표 계정에 한해 제공, 대표 계정이 아니면 호출 시 과금" 문장이 있음. **새 상품의 무료 이용량 숫자는 확인 못 함** → 무료로 시작할 수 있다고 확인하지 못해 false | https://www.ncloud.com/support/notice/all/1930 · https://www.ncloud.com/support/notice/all/1965 · https://guide.ncloud-docs.com/docs/application-maps-overview |
| cost.note | "쓴 만큼 요금이 나가요. 무료 이용량이 있는지는 요금 안내에서 확인하세요" | 위와 같음 | 위와 같음 |
| freeLimit | (비움) | 확인 못 함. 2023년 공지의 옛 숫자(Web Dynamic Map 월 1,000만 건)는 지금 상품과 다를 수 있어 쓰지 않음 | https://www.ncloud-forums.com/topic/99/ |
| prep "결제 수단 등록" | 네이버 클라우드 가입과 결제 수단 등록 | (검색, 간접) 계정 가이드에 가입→결제 수단 등록 순서가 있음. Maps에 결제 수단이 꼭 필요하다는 원문 문장은 확인 못 함 | https://www.ncloud.com/support/faq/bill?categoryCode2=PAUP |
| publicKey | true | (원문 직접) `<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID">` — 화면 스크립트에 넣는 클라이언트 아이디. 콘솔 Service > Application Services > Maps > Application에서 등록 | https://github.com/navermaps/maps.js.ncp/blob/master/docs/tutorial-2-Getting-Started.html |
| stuck "Dynamic Map 안 고르면 429" | 그대로 | (원문 직접) "Dynamic Map이 선택되어 있지 않으면 429 오류(Quota Exceed)가 발생" | https://github.com/navermaps/maps.js.ncp/blob/master/docs/tutorial-1-Getting-Client-ID.html |
| stuck "ncpClientId → ncpKeyId" | 그대로 | (원문 직접) 변경 전 `ncpClientId`, 변경 후 `ncpKeyId` | 위 Getting-Started |
| stuck "도메인만 등록, localhost 따로" | 그대로 | (검색) 서비스 URL은 포트·URI 빼고 호스트만 (예: http://localhost:8080 → http://localhost) | https://guide.ncloud-docs.com/docs/maps-troubleshoot |
| stuck "이용 한도 설정" | 그대로 | (검색) 일별·월별 이용 한도를 직접 설정 가능 | https://guide.ncloud-docs.com/docs/application-maps-overview |
| promptFragment "인증 실패 안내" | 그대로 | (원문 직접) 전역 함수 `navermap_authFailure`로 인증 실패를 확인 | 위 Getting-Started |
| serverRegion | kr | 확인 못 함 (국내 클라우드라 kr로 적음) | — |

## 3. google-maps-js — 구글 지도 JavaScript API

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | **false** | (검색) "you must include an API key and enable billing for your project", "You must enable billing on each of your projects". 결제 계정이 없으면 하루 1번으로 제한. 무료 데모 키는 시험용일 뿐 실제 서비스용 아님 | https://developers.google.com/maps/documentation/javascript/troubleshooting · https://developers.google.com/maps/get-started · https://developers.google.com/maps/demo-key |
| cost.note | "결제 계정(카드)을 연결해야 써요. 매달 무료 사용량을 넘으면 요금이 자동으로 나가요" | (검색) 사용량만큼 내는 방식. 결제 수단(신용카드 만료 예시) 언급 | https://developers.google.com/maps/billing-and-pricing/overview |
| freeLimit | "지도 불러오기는 매달 1만 건까지 무료예요. 매달 1일(미국 태평양 시간)에 다시 채워져요." | (검색) Essentials SKU는 매달 10,000건 무료, Dynamic Maps(지도 불러오기) 10,000. 매달 1일 미국 태평양 시간 자정에 초기화. 2025-03-01부터 월 200달러 크레딧 대신 이 방식 | https://developers.google.com/maps/billing-and-pricing/pricing-categories · https://developers.google.com/maps/billing-and-pricing/pricing · https://developers.google.com/maps/billing-and-pricing/march-2025 |
| publicKey | true | (검색) 브라우저용 키는 웹사이트(HTTP 리퍼러) 제한과 Maps JavaScript API만 쓰게 하는 API 제한을 권장. 주소는 scheme·host·포트까지 | https://developers.google.com/maps/api-security-best-practices |
| stuck "어둡게, 개발용 표시" | 그대로 | (검색) 결제 문제 시 지도가 어두워지고 "for development purposes only" 표시, BillingNotEnabledMapError | https://developers.google.com/maps/documentation/javascript/troubleshooting |
| stuck "하루 사용량 한도" | 콘솔에서 한도 정하기 권함 | 확인 못 함 (구글 클라우드 할당량 기능, 일반 지식). 사람 확인 필요 | — |
| serverRegion | unknown | 확인 못 함 | — |

## 4. deepl-api — DeepL API (번역)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | true | (검색) 예전 API Free(월 50만 자)는 더는 새로 살 수 없음. 지금 무료 요금제는 Developer: "Test out the API for free", 가입 시 "no credit card required" | https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans · https://www.deepl.com/en/developers |
| cost.note | "무료 시험 요금제로 시작해요. 무료 글자 수를 다 쓰면 유료 요금제로 바꿔야 해요" | (검색) Developer 한도에 닿으면 Growth로 올려야 함 | 위 요금제 안내 |
| freeLimit | (비움) | 검색 결과에 Developer 요금제 "총 100만 자, 다시 채워지지 않음"이 나왔지만, 다른 요금 페이지에 5만 자라는 숫자도 있어 서로 어긋남 → 쓰지 않음. 사람이 요금제 안내에서 확인 | https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans |
| keyExposureRisk | true | (검색) 브라우저에서 부르면 CORS로 403. 키가 드러나므로 자기 서버를 거치라고 안내 | https://developers.deepl.com/docs/best-practices/cors-requests |
| stuck "요청 주소에 키 붙이면 403" | 그대로 | (검색) 쿼리·본문 auth_key 인증은 2025-11-01에 끝남, `Authorization: DeepL-Auth-Key` 머리글만 | https://developers.deepl.com/docs/resources/breaking-changes-change-notices/november-2025-deprecation-of-legacy-auth-methods |
| stuck "개인정보 보내지 말 것" | 그대로 | (검색) 약관: "If Customer uses DeepL API Developer, Customer shall not process any personal data with the API" | https://www.deepl.com/en/pro-license |
| serverRegion | overseas | (검색) 기본 지역 엔드포인트는 EU. 지금은 AWS를 함께 써서 전 세계 AWS 지역에서 처리할 수 있다고 함 | https://developers.deepl.com/docs/getting-started/regional-endpoints · https://support.deepl.com/hc/en-us/articles/26380849099932-DeepL-infrastructure-and-data-protection |
| prep 링크 | https://www.deepl.com/en/products/api | 검색 결과에 나온 공식 API 상품 페이지 | — |

## 5. papago-translation — 파파고 번역 API (네이버 클라우드)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | **false** | (검색) 가이드: "Papago Translation은 유료 서비스로, 요청된 글자 수를 기준으로 1,000,000자 단위로 부과". 무료 이용량 문장은 찾지 못함 | https://guide.ncloud-docs.com/docs/papagotranslation-spec |
| cost.note | "유료예요. 번역한 글자 100만 자마다 2만 원(부가세 별도)이 나가요" | (검색) 공식 요금: 텍스트 번역 100만 글자당 20,000원(VAT 별도), 문서 번역 30,000원 | https://www.ncloud.com/product/aiService/papagoTranslation |
| stuck "100만 자 단위 올림" | 조금만 써도 한 달 2만 원 | (검색) 글자 수는 1,000,000글자 단위로 올림. 월 단위 집계, 이월 없음 | https://guide.ncloud-docs.com/docs/papagotranslation-spec |
| stuck "사용 한도 설정" | 그대로 | (검색) Application마다 월·일 사용 한도 설정 가능 (최대 월 10억 자, 일 3억 자 안에서) | 같은 곳 |
| keyExposureRisk | true | (검색) 콘솔에서 Application을 등록해 Client ID·Client Secret을 받는 방식. Secret을 화면에 넣으면 안 된다는 원문 문장은 확인 못 함 (이름이 비밀 키라 true) | https://api.ncloud-docs.com/docs/ai-naver-papagonmt |
| 지금 제공 방식 | 네이버 클라우드 콘솔 Application 등록 | (검색) 텍스트 번역 주소는 papago.apigw.ntruss.com 아래 /nmt/v1. 네이버 개발자센터 쪽 옛 무료 API의 종료 공지는 찾지 못함 | 같은 곳 |
| prep "결제 수단 등록" | 그대로 | 네이버 지도와 같음 (간접 확인) | — |
| serverRegion | kr | 확인 못 함 (국내 클라우드라 kr로 적음) | — |

## 6. unsplash-api — Unsplash API (사진)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | true | (검색) "Every app that meets our API terms can sign up and use the Unsplash API for free" | https://help.unsplash.com/en/articles/3887917-when-should-i-apply-for-a-higher-rate-limit |
| freeLimit | "시험 단계는 한 시간에 50번까지 부를 수 있어요. 심사를 받으면 늘어나요." | (검색) Demo 시간당 50번. 실서비스 승인 뒤 늘어남 (옛 문서는 1,000번, 도움말은 건마다 심사) → 늘어난 숫자는 쓰지 않음 | https://unsplash.com/documentation · 위 도움말 |
| keyExposureRisk | true | (검색) "Your application's Access Key and Secret Key must remain confidential. This may require using a proxy if accessing the API client-side." | https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines |
| 출처 표시 의무 (promptFragment·stuck) | 사진마다 사진가 이름과 Unsplash 링크 | (검색) Unsplash와 사진가를 밝히고 사진가 프로필 링크(utm 붙임). 못 지키면 한도 늘리기 심사에서 거절 | 위 가이드라인 |
| 핫링크 의무 (promptFragment·stuck) | API가 준 주소로 바로 띄우기 | (검색) photo.urls의 핫링크 주소를 써야 함 | 위 가이드라인 |
| 다운로드 확인 (promptFragment) | 다운로드 확인 주소 부르기 | (검색) 이용자가 내려받거나 고르면 photo.links.download_location을 불러야 함 | 위 가이드라인 |
| stuck "사진 주소는 횟수에 안 셈" | 그대로 | (검색) images.unsplash.com 그림 요청은 한도에 세지 않고 api.unsplash.com JSON 요청만 셈 | https://unsplash.com/documentation |
| license | Unsplash 라이선스 | (검색) 상업용 가능, 출처 표시는 권장. 고치지 않은 사진 판매 금지, 비슷한 경쟁 서비스 만들기 금지 | https://unsplash.com/license · https://help.unsplash.com/en/articles/2612315-can-i-use-unsplash-images-for-personal-or-commercial-projects |
| serverRegion | unknown | 확인 못 함 | — |

## 7. bok-ecos — 한국은행 경제통계 API (ECOS)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free / note | true / "무료 (출처를 밝히면 한국은행 통계는 상업용으로도 쓸 수 있어요)" | (검색) "한국은행 작성 통계는 출처를 명시하는 한 상업적 용도를 포함하여 무료로 자유롭게 사용, 가공 및 재배포". 통계를 바꾸거나 왜곡하면 안 됨 | https://ecos.bok.or.kr/ |
| stuck "다른 기관 통계" | 상업용은 그 기관 허락 | (검색) ECOS 속 타 기관 작성 통계는 출처 명시 시 비상업 이용, 상업적 이용은 작성기관 승인 | https://ecos.bok.or.kr/mobile/ |
| freeLimit | (비움) | 확인 못 함. 제3자 글에 하루 약 1,000번이라는 말이 있으나 공식 원문 아님 | — |
| prep | 가입(만 14세 이상, 본인인증) 후 인증키 신청, lead hours | (검색) 일반 이용자 만 14세 이상, 회원가입 시 본인인증. 키가 바로 동작하는지는 확인 못 함 (블로그는 가입과 동시에 부여·1일 안 호출 가능) → hours로 보수적으로 | https://ecos.bok.or.kr/api/ |
| stuck "샘플 키 10건" | 그대로 | (검색) "sample은 최대 10건 이내에서 호출이 가능" | https://ecos.bok.or.kr/api/KeyStatisticList/sample/xml/kr/1/100 |
| stuck "INFO-100" | 그대로 | (검색) "INFO-100 인증키가 유효하지 않습니다" | https://ecos.bok.or.kr/api/ |
| stuck "통계표 코드·항목 코드" | 그대로 | (검색) stat_code·item_code로 찾음 (R 패키지 문서 근거, 공식 명세서는 열지 못함) | https://ecos.bok.or.kr/api/ |
| summary "금리, 환율, GDP" | 그대로 | (검색) ECOS 공식 모바일 페이지 제목에 금리·GDP·환율·기준금리·국고채 | https://ecos.bok.or.kr/mobile/ |
| serverRegion | kr | 확인 못 함 (국내 공공기관, 기존 카드 관례) | — |

## 8. koreaexim-exchange — 한국수출입은행 환율 API

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free / note | true / "무료" | (검색) 공공데이터포털 등록 정보: 비용 무료, 이용허락범위 제한 없음, 개발·운영 자동승인. 은행 누리집에서는 이용료 문장을 확인 못 함 | https://www.data.go.kr/data/3068846/openapi.do |
| freeLimit | "하루 1,000번까지 부를 수 있어요." | (검색) 명세: 일일 호출 가능 횟수 1000회 (2025-06-25 적용) | https://www.koreaexim.go.kr/ir/HPHKIR020M01?apino=2&viewtype=C |
| realtime | daily | (검색) 일환율, 영업일 11시 전후 갱신 (포털은 '실시간'으로 적었지만 은행 명세를 따름) | 위 은행 페이지 |
| stuck "주말·11시 전 빈 값" | 그대로 | (검색) 비영업일 데이터나 영업당일 11시 이전 요청은 null | 위 은행 페이지 |
| stuck·promptFragment "새 주소" | oapi.koreaexim.go.kr | (검색) 요청 도메인 www → oapi.koreaexim.go.kr, 기존 도메인 병행 가동 2026-04-30 종료 | 위 은행 페이지 · 포털 페이지 |
| stuck "RESULT 3" | 인증키 파기 | (검색) 개인정보 보유기간 만료로 인증키 파기 시 RESULT 3. 본문 일부가 잘려 다시 받는 절차는 확인 못 함 | 위 은행 페이지 |
| prep lead | hours | 확인 못 함 (발급 절차 시간). 보수적으로 hours | — |
| serverRegion | kr | 확인 못 함 (국내 공공기관, 기존 카드 관례) | — |

## 9. airkorea-air — 에어코리아 대기오염정보

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free / note | true / "무료" | (검색) 비용 무료, 개발단계 자동승인, 운영단계 심의승인. 측정소별 실시간 측정정보, 시도별 실시간, 대기질 예보통보, 초미세먼지 주간예보 등 | https://www.data.go.kr/data/15073861/openapi.do |
| freeLimit | "개발계정은 하루 호출 수가 적어요. 운영계정으로 바꾸면 늘릴 수 있어요." | (검색) 에어코리아 '사용자 지원' 항목: 개발계정 일 500건, 운영계정 일 10,000건 가능. 영문 서비스 항목은 개발 10,000으로 달라 숫자는 쓰지 않음 | https://www.data.go.kr/data/15075624/openapi.do |
| license | 공공누리 제3유형 (출처표시, 변경금지) | (검색) 포털 표기 "공공저작물 : 출처표시, 변경금지 (제 3유형)". 에어코리아도 실시간자료 저작물은 공공누리(출처표시, 변경금지) | https://www.data.go.kr/data/15073861/openapi.do |
| 출처 표시 의무 (promptFragment) | "출처: 한국환경공단 에어코리아" | 위 공공누리 조건 | 위와 같음 |
| stuck "확정 전 자료" | 그대로 | (검색) "최종확정 자료는 국립환경과학원의 최종확정 자료이며 확정이전 측정자료는 '실시간 자료조회' 메뉴에서 조회" | https://www.airkorea.or.kr/web/pastSearch?pMENU_NO=123 |
| stuck "측정소 이름으로 찾기" | 측정소정보 API로 가까운 측정소 | (검색) 측정소별 조회 기능 이름, 별도 '에어코리아_측정소정보' API 있음. 근접 측정소 조회 방법은 원문으로 확인 못 함 | https://www.data.go.kr/data/15073877/openapi.do |
| stuck "점검 중 빈 값" | 그대로 | (검색) 빈 칸은 측정소 점검 등으로 미수신된 자료일 수 있음 (확정 자료 안내). API 응답 모양은 확인 못 함 | https://www.airkorea.or.kr/web/pastSearch?pMENU_NO=123 |
| realtime | frequent | (검색) 갱신 주기 '실시간'(측정은 시간 단위로 알려짐). '몇 초~몇 분'은 아니어서 frequent | https://www.data.go.kr/data/15073861/openapi.do |
| domains | domain.weather | 분류표에 대기 태그가 없어 날씨로 넣음 (판단) | — |
| serverRegion | kr | 확인 못 함 (국내 공공기관, 기존 카드 관례) | — |

## 10. open-meteo — Open-Meteo 날씨 API

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free / note | true / "상업용이 아니면 무료 (상업용은 따로 문의)" | (원문 직접) "free access for non-commercial use", "For commercial use of Open-Meteo APIs, please contact us." | https://github.com/open-meteo/open-meteo/blob/main/README.md |
| freeLimit | "정해진 한도 대신 적당히 쓰기를 요청해요. 하루 1만 번을 넘으면 연락해 달라고 해요." | (원문 직접) "We do not restrict access, but ask for fair use. If your application exceeds 10'000 requests per day, please contact us." | 같은 곳 |
| access | none | (원문 직접) "No API key is required", "CORS supported" | 같은 곳 |
| serverRegion | overseas | (원문 직접) "Servers located in Europe and North America", 개인정보를 모으지 않음 | 같은 곳 |
| license · 출처 표시 의무 | CC BY 4.0, 날씨 옆 Open-Meteo 링크 | (원문 직접) "API data is offered under ... CC BY 4.0", "Include an attribution link next to any location where Open-Meteo data is displayed" | 같은 곳 |
| realtime | frequent | (원문 직접) 유럽·북미는 매시간 갱신, 전 세계 모델도 자주 갱신. 한국 지역 갱신 주기는 확인 못 함 | 같은 곳 |
| stuck "지오코딩 API" | 그대로 | (원문 직접) Geocoding API가 있음. 한국어 지명 검색 지원은 확인 못 함 | 같은 곳 |
| provider | official "Open-Meteo" | API 운영처 자체 | 같은 곳 |

## 사람이 특히 볼 것

1. **naver-maps의 cost.free**: 새 Maps 상품에 대표 계정 무료 이용량이 있다면 true로 바꾸고 freeLimit을 채운다. 지금은 확인 못 해 false.
2. **deepl-api의 무료 글자 수**: Developer 요금제 한도(검색 결과는 총 100만 자, 다시 안 채워짐)를 요금제 안내에서 확인한 뒤 freeLimit에 넣는다.
3. **google-maps-js·papago-translation·naver-maps는 cost.free false**: 엔진의 '0원만 쓰기 + 유료 상품' 충돌(`conflict.paid-on-free`)을 시험할 수 있다.
4. prep의 `lead`(ECOS, 수출입은행)와 serverRegion `kr`·`unknown`은 원문 확인 전 값이다.
