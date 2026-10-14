# 안 C: 한 바퀴 섬 드라이브

## 1. 컨셉 한 줄 + 세계관

**한 줄**: 남색 쇼퍼 카를 타고 장난감 섬을 한 바퀴 돕니다. 시운전으로 몸을 풀고, 목적지를 말하고, 장을 보고, 신호를 지나 도착하면, 손님은 내 AI에게 줄 **설계도**와 **요금 0원 영수증**을 받아 내립니다.

| 누구·무엇 | 세계 안에서 | 화면에서 |
|---|---|---|
| 이용자 | **손님**. 목적지(만들고 싶은 앱)가 있는 승객입니다. 직접 핸들을 잡는 곳은 시운전 한 곳뿐입니다. | 해요체 존댓말을 받는 사람 |
| 쇼퍼(기사) | **코드쇼퍼 자체**. 사람 그림은 없습니다. 남색 장난감 차 한 대와, 운전석에서 오는 짧은 안내 말로만 나옵니다. | 지도 위 차, 차에 붙은 말풍선 칩(진짜 글, 화면 낭독기가 읽음), 말투 "모실게요" |
| 섬 | 바다 위 장난감 섬 하나입니다. 해안을 도는 순환 도로 위에 들를 곳 다섯 곳이 있습니다. | 홈이 곧 섬 지도입니다 |
| 목적지 | 손님이 만들 앱입니다. 도착 게이트 너머의 빈 **공터**가 그 앱을 지을 자리입니다. | 영수증의 '목적지' 줄, 도착 장면의 공터 |
| 내 AI | 공터에서 실제로 짓는 사람입니다. 코드쇼퍼는 짓지 않습니다. 장을 봐서 공사 현장 앞까지 모셔다 드릴 뿐입니다. | "설계도를 내 AI에게 넘기세요" |
| 받아 가는 것 | **영수증**: 택시 요금(0원)과 장 본 목록이 한 장에 찍힙니다. '쇼퍼'의 두 뜻(chauffeur·shopper)이 만나는 물건입니다. **트렁크 짐**: 설계도, 대화 카드, 읽어 둘 용어. '알아볼 것'은 설계도와 영수증 안에 들어 있습니다. | 도착 화면의 네 탭 |
| 한 바퀴 | 도착 게이트는 출발선 바로 옆에 있습니다. 영수증 한 장이 섬 한 바퀴입니다. 새 목적지를 말하면 다음 바퀴가 시작됩니다. | 여행 수첩의 '바퀴 수', 섬에 늘어나는 집 |

- 이 세계관은 원칙 R-01("사이트는 AI를 부르지 않는다")을 따로 설명할 필요가 없게 만듭니다. **기사는 장을 봐서 모셔다 드리고, 짓는 일은 내 AI가 합니다.** 초심자가 "여기서 앱을 만들어 주나요?"라고 오해할 자리가 없어집니다.
- 슬로건 두 줄은 **그대로 둡니다**. "어디로 모실까요?"는 홈 제목이자 목적지의 첫 질문입니다. "요금은 0원입니다"는 미터기에 찍힙니다. "목적지만 말하세요"는 둘째 단계의 이름이 됩니다. 이렇게 세 문장 모두 화면에 자리가 생기므로 바꿀 이유가 없습니다.
- 캐릭터 없이도 세계가 섭니다. 나중에 소유자가 캐릭터를 만들면 쇼퍼 카의 **빈 운전석**에 앉히기만 하면 됩니다. 지금 디자인에는 아무것도 기대지 않습니다.

## 2. 여정 단계 표

| 순서 | 지금 | 새 이름 | 주소 | 손님이 하는 일 | 다른 곳과 이어지는 까닭 |
|---|---|---|---|---|---|
| 1 (선택) | 첫 수업 | **시운전** | `/test-drive` | 내 AI 채팅에 문장 3개를 붙여 넣어 웹페이지 한 장을 만들어 봅니다(만들기 → 고치기 → 저장해서 열기). | 출발선 옆의 짧은 연습 코스입니다. 손님이 직접 핸들을 잡아 보는 유일한 곳이고, 바이브코딩을 손으로 알고 나면 목적지 질문에 답하기 쉬워집니다. 건너뛰면 지도에 '건너뜀'이라고 흐리게 남습니다. |
| 2 | 인터뷰 | **목적지** | `/destination` | 그림·버튼 질문 10~17개에 답해 만들 앱을 정합니다. 첫 질문은 "어디로 모실까요?". 답할 때마다 '경로 찾는 중' 미리 보기가 바뀝니다. | 목적지가 정해져야 장볼 칸(무엇을 사야 하는지)이 생깁니다. 마치면 장보기와 신호등 가는 길이 함께 열립니다. |
| 3 | 장보기 | **장보기** (유지) | `/shop` (유지) | 칸(화면·저장·로그인·외부 데이터·알림·배포·공유·중간 서버)마다 도구 하나를 장바구니에 담습니다. 추천과 다음 후보를 비교합니다. | 쇼퍼(shopper)의 장보기라 이름을 바꾸지 않습니다. 담은 도구들이 다음 신호등에서 서로 맞는지 검사받습니다. |
| 4 | 재확인 | **신호등** | `/signal` | 어긋나는 곳이 빨간불로 켜집니다. '바꾸기'(초록불)나 '알아보고 가기'(노란불)로 빨간불을 모두 끕니다. 오늘 하기에 길면 일부 칸을 '다음에'로 미룹니다. | 빨간불이 하나도 없어야 도착할 수 있습니다. 고른 길들이 만나는 곳에서 엇갈림이 생기니, 사거리 신호등이 맞는 은유입니다. |
| 5 | 계산대 | **도착** | `/arrival` | 미터기에서 요금 0원 영수증이 뽑혀 나옵니다. 트렁크에서 설계도·대화 카드·읽어 둘 용어를 꺼내 갑니다. | 2번에서 말한 바로 그 목적지의 공사 현장 앞입니다. 여기서부터는 내 AI가 짓습니다. 출발선 옆이라 '새 목적지'로 다음 바퀴를 시작합니다. |

**소리 내어 읽기**: "시운전, 목적지, 장보기, 신호등, 도착."
한 문장으로 하면 이렇습니다: **"시운전으로 몸을 풀고, 목적지를 말하고, 장을 보고, 신호를 지나, 도착해서 영수증을 받는다."** 다섯 이름은 차 한 대가 한 번 달리면서 겪는 다섯 순간입니다. 한국 어른이면 누구나 쓰는 내비게이션의 말(목적지, 신호, 도착)과 쇼퍼의 말(시운전, 장보기)만 썼습니다.

- 열리는 조건은 엔진 그대로입니다. 시운전과 목적지는 늘 열려 있습니다. 장보기와 신호등은 목적지를 마치면 열리고, 도착은 `canIssue`일 때 열립니다. 닫힌 곳의 안내 문구: "목적지를 정하면 열려요." / "빨간불이 남아 있어요."
- 옛 주소는 아직 배포 전이지만, `public/_redirects`에 옛 → 새 주소를 적어 둡니다(비용 0).

## 3. 용어 사전

원칙은 하나입니다. **장소·진행·보상은 세계관의 말(◆)로, 결정·돈·안전·AI에게 넘길 것은 평이한 말(○)로 씁니다.** 초심자가 실제 도구와 AI 앞에서 다시 만날 말은 테마로 덮지 않습니다.

| 지금 | 새 말 | 이유 | 구분 |
|---|---|---|---|
| 정류장 | **들를 곳** (화면 글: "지금 여기", "다음 갈 곳", "5곳 중 2곳 다녀옴") | 쇼퍼 카는 정해진 노선을 도는 버스가 아닙니다. 손님을 모시고 들르는 곳입니다. | ◆ |
| 노선도·노선 띠 | **섬 지도**(홈) / **길 띠**(안쪽 화면 위) | 홈이 실제 지도가 되었고, 안쪽 화면 위의 띠는 그 지도를 줄인 것입니다. | ◆ |
| 행선지 전광판 "이번 정류장: ○○" | **안내 줄** "지금 여기 · 장보기 › 다음 · 신호등" | 버스 전광판 대신 내비게이션처럼 지금과 다음을 함께 보여 줍니다. | ◆ |
| 첫 수업 / 인터뷰 / 장보기 / 재확인 / 계산대 | **시운전 / 목적지 / 장보기 / 신호등 / 도착** | 2절. 학교·방송·마트·감사·마트로 흩어진 말을 드라이브 한 번으로 묶었습니다. | ◆ |
| 주행 거리 계기판 (km) | **미터기**: "12km · 요금 0원" | 택시 미터기처럼 거리는 오르는데 요금은 늘 0원입니다. 그 자체로 브랜드 농담이 됩니다. 단위 km는 그대로 둡니다. | ◆ |
| 도장 | **도장** (유지): "장보기 도장", "도착 도장" | 스탬프 투어 문화로 이미 익숙합니다. 바꿀 이유가 없습니다. | ◆ |
| 도장판 / 내 여행 기록 | **여행 수첩** | 도장·용어 도감·바퀴 수를 모아 두는 수첩입니다. | ◆ |
| 공부 도장 / 확인 문제 도장 | **용어 도장** / **정답 도장** | 무엇을 해서 받는지가 이름에 드러납니다. | ◆ |
| 잠김 (자물쇠) | **닫힘**, 이유 한 줄 ("목적지를 정하면 열려요"). 열리면 "장보기 가는 길이 열렸어요" | 지도에서는 자물쇠 대신 구름이 가리고 있다가 걷힙니다. 글은 평이하게 둡니다. | ○ |
| 지남 | **다녀옴** | 들를 곳에 맞는 동사입니다. | ◆ |
| 기사님(마스코트), 기사님 말풍선 | **운전석 안내** (그림 없음, 차에 붙은 말풍선 칩) | 캐릭터를 없앴습니다. 목소리는 남기고 몸은 차가 맡습니다. | ◆ |
| 장바구니 | **장바구니** (유지) | 쇼퍼(shopper)의 핵심 소품이고 뜻이 바로 통합니다. | ◆ |
| 칸 (slot) | **칸** (유지): "저장 칸" | 게임 인벤토리 칸과 같은 감각이고 짧습니다. 칸 이름(화면·저장·로그인·외부 데이터·알림·배포·공유·중간 서버)은 내 AI가 같은 말을 쓰므로 그대로 둡니다. | ○ |
| 장보기 목록 / 지금 생긴 칸 | **장볼 칸** | 무엇을 사야 하는지가 드러납니다. | ◆ |
| 상품 / 진열 상품 | **도구** | '상품'이라고 하면 돈을 내야 할 것처럼 들립니다. 꾸러미 7번도 이미 '쓸 도구'라고 씁니다. | ○ |
| 색인 상품 / 색인에서 찾은 것 | **원문만 있는 도구** | '색인'은 운영자의 말이고, 손님에게는 "쉬운 설명이 없다"는 사실이 중요합니다. | ○ |
| 추천 | **추천** (유지) | 가장 중요한 결정 신호이므로 바꾸지 않습니다. | ○ |
| 2위 | **다음 후보** | 순위표 느낌을 빼고, 무엇과 비교하는지만 말합니다. | ○ |
| 추천 이유 | **추천 이유** (유지) | — | ○ |
| 난이도 (★ 3단계) | **난이도** (유지) | 별 세 개는 게임 무대 판의 문법과도 맞습니다. | ○ |
| 무료 / 유료 | **0원으로 시작** / **유료** | 무료 한도가 있는 도구가 많습니다. "평생 무료"로 오해하지 않게 하고, 요금 0원과도 운이 맞습니다. | ○ |
| 예상 막힘 | **막히기 쉬운 곳** | '예상 막힘'은 명사를 늘어놓은 딱딱한 말입니다. "길이 막힌다"는 드라이브 말이기도 합니다. | ○ |
| 충돌 | **빨간불** | 차 세계에서 '충돌'은 사고처럼 들려 겁을 줍니다. 신호등의 빨간불은 "멈춰서 고칠 곳"이라는 뜻만 전합니다. | ◆ |
| 해결(바꾸기) | **바꾸기** → **초록불** | — | ◆ |
| 그대로 두고 조사할 것에 추가 (kept) | **알아보고 가기** → **노란불** | 지금은 그대로 둔 것도 초록불이 되는데, 이는 사실과 다릅니다. "조심해서 지나가요"가 맞습니다. 엔진은 그대로이고(kept = 발행 가능) 화면 색만 바꿉니다. | ◆ |
| 신호등(재확인 화면 안의 판) | 단계 이름 자체가 **신호등** | — | ◆ |
| 영수증 뽑기 | **영수증 받기** | '뽑기'는 뽑기 게임(확률)을 떠올리게 합니다. 0원 서비스에 그런 냄새를 남기지 않습니다. | ○ |
| 영수증 | **영수증** (유지) | 택시 요금과 장 본 목록을 함께 뜻하는 브랜드의 핵심 소품입니다. | ◆ |
| 설계 꾸러미 (.md) | **설계도** (풀어 쓸 때 "내 AI에게 줄 설계도"). 파일 이름 `codechauffeur-plan-YYYYMMDD-HHmm.md` | 가장 중요한 결과물이므로 이름만 보고 뜻을 알아야 합니다. '꾸러미'는 무엇에 쓰는지 말해 주지 않습니다. | ○ |
| 공부할 것 | **읽어 둘 용어** ("3개, 10분이면 돼요") | '공부'는 숙제처럼 들립니다. 실제로 하는 일은 용어 몇 개를 읽는 것입니다. | ○ |
| 조사할 것 | **알아볼 것** | '조사'보다 쉬운 말입니다. 노란불과 짝을 이룹니다("알아보고 가기"). | ○ |
| 대화 카드 | **대화 카드** (유지), 보조 글 "내 AI에게 보낼 말" | 이미 뜻이 분명합니다. 테마로 바꾸면 흐려집니다. | ○ |
| 준비물 | **준비물** (유지) | 여행 짐 챙기기와도 맞습니다. | ◆ |
| 진열대 (`/shelf`) | **장터** (`/market`), 도구 상세는 `/market/[id]` | 장보기가 일어나는 곳입니다. 인터뷰 없이 둘러볼 수 있는 섬의 시장입니다. | ◆ |
| 개념 사전·개념 카드 (`/concepts`) | **용어 도감**·**용어 카드** (`/terms`, `/terms/[id]`) | '도감'은 모으는 게임의 말이고(읽음 → 정답까지 → 금테), '용어'가 '개념'보다 쉽습니다. 설계도 안의 링크도 `/terms/…`가 됩니다. | ◆ |
| 에러 사전 | 지도의 건물 이름은 **정비소**, 화면 제목은 **"에러가 났을 때"** | 고장 나면 정비소에 갑니다. 다만 에러 문장을 들고 온 사람은 '에러'라는 말을 찾으므로, 제목은 평이하게 둡니다. | ◆+○ |
| 사전 (어디서나 여는 검색 창) | **사전** (유지) | 막혔을 때 누르는 단추라 가장 평이해야 합니다. | ○ |
| 레시피 (`/recipes`) | **추천 코스** (`/courses`), "이 코스로 출발" | 요리 은유가 이 세계에 맞지 않습니다. '드라이브 코스'는 한국어로 굳은 말입니다. | ◆ |
| 2차 (미룬 칸) / 1차 | **다음에** / **이번에** ("다음에 붙이기", 영수증 표시 "(다음)") | '1차·2차'는 회식 차수처럼 들리고, 무엇을 뜻하는지도 바로 오지 않습니다. | ○ |
| 공유 링크 | **영수증 링크** | 무엇이 열리는지가 이름에 들어 있습니다. | ○ |
| PC로 보내기 | **PC로 보내기** (유지) | — | ○ |
| 이어서 하기 | **이어 가기**, 카드 제목 "지난번 장보기에서 멈췄어요" | 단추는 짧게, 테마는 문장에 둡니다. | ○ |
| '아마도' 답 | **아마 그럴 거예요** (보조 글 "'네'로 보고 챙겨 둘게요") | 엔진은 이 답을 '네'로 셉니다(`maybe` 태그 = yes). 손님이 그 사실을 알아야 합니다. | ○ |
| '모르겠어요' | **모르겠어요** (유지) | — | ○ |
| 좁혀지는 중 | **경로 찾는 중** | 내비게이션의 "경로 탐색 중"입니다. 답할수록 길이 정해집니다. | ◆ |
| 일단 구경만 할게요 | **장터부터 구경할게요** | 나가서 어디로 가는지가 보입니다. | ◆ |
| 홈 "만들러 왔어요" | **목적지 말하기** | 제목 "어디로 모실까요?"에 단추가 바로 답합니다. | ◆ |
| 홈 "구경하러 왔어요" | **장터 구경하기** | 같은 이유입니다. | ◆ |
| "10분 첫 수업부터 타 보세요" | **"처음이세요? 10분 시운전부터"** | — | ◆ |
| 설정 / 동작 줄이기 / 효과음 / 저장한 기록 지우기 | **모두 유지** | '동작 줄이기'는 휴대폰 설정에 쓰는 말과 같습니다. 설정은 테마로 덮지 않습니다. | ○ |
| 소개 / 추천 공식 | **유지** ("추천은 이렇게 정해요") | — | ○ |
| 404 "길을 잘못 들었어요" | **유지** | 이미 세계관에 맞습니다. | ◆ |
| 영수증 도장 "코드쇼퍼 · 요금 0원" | **유지** | — | ◆ |

운전석 안내 문구(해요체, 두 문장 이하):
- 홈: "어디로 모실까요?"
- 목적지 첫 질문: "천천히 골라도 돼요. 모르면 '모르겠어요'를 누르세요."
- 장보기 처음 도착: "필수 칸부터 하나씩 담아요. 맨 위가 추천이에요."
- 신호등 빨간불이 없을 때: "신호가 다 바뀌었어요. 도착지로 모실게요."
- 도착: "도착했습니다! 영수증 챙겨 가세요."

## 4. 아트 디렉션

### 4.1 참고 제품 네 개

| 참고 | 가져올 것 | 가져오지 않을 것 |
|---|---|---|
| **슈퍼 마리오브라더스 원더** (월드맵) | ① 섬 하나를 3/4 높은 각도에서 내려다보는 디오라마. ② 무대마다 랜드마크가 서 있는 길. ③ 칸의 세 상태: 지나온 길은 칠해지고, 열린 곳은 반짝이고, 닫힌 곳은 구름에 가려져 흐립니다. ④ 아래쪽 그림자가 두꺼운 둥근 이름표. ⑤ 무대를 마치면 길이 그려지며 다음 곳이 드러나는 연출. | 캐릭터, 토관, 물음표 블록, 꽃 같은 닌텐도 고유 모양 일체 |
| **마리오 카트 8 디럭스** (카트 꾸미기) | ① 부품 칸(차체·타이어·글라이더)마다 하나씩 고르면 능력치 막대가 바로 움직이는 화면 → 장보기의 '맞춤·비용·난이도' 막대와 추천·다음 후보 비교. ② 한 바퀴(랩)와 결승선 체크무늬. 체크무늬는 도착에서 딱 한 번만 씁니다. | 아이템 룰렛(확률 연출), 출발 전 카운트다운(기다리게 함) |
| **모여봐요 동물의 숲** | ① 핸드폰 앱 화면 같은 둥근 사각 타일 + 큰 3D 아이콘 → 홈의 '섬 둘러보기' 타일. ② 도감: 모으기 전에는 실루엣, 모으면 색이 찬 카드 → 용어 도감. ③ 평소 할 일을 하면 쌓이는 도장(마일 여권 느낌). ④ 둥근 나무와 부드러운 햇빛. | 매일 할 일(마일+ 같은 일일 과제), 놓치면 아쉬운 시간 한정 보상 |
| **토스** | ① 한 화면에 한 가지 일, 26~28px 굵은 제목, 아래에 붙은 주 단추 하나. ② 목록 줄마다 왼쪽에 40px 3D 아이콘 → 큰 플랫폼 같은 밀도. ③ 손잡이가 있는 아래 창(바텀 시트). ④ 크고 고정폭으로 맞춘 숫자("0원"). ⑤ 흰색·회색 면에 강조색 하나. | 토스 파랑, 토스 글꼴, 토스페이스 그림 문자 |

플랫폼 패턴 하나를 더 가져옵니다. 카카오 T·우버 같은 차 부르기 앱의 **"지도는 뒤에 깔리고, 할 일은 아래 창에"** 배치입니다. 한국 어른이면 이미 손에 익은 구조라 큰 플랫폼처럼 느껴집니다. 노란색과 상표는 쓰지 않습니다.

### 4.2 색

낮 지도가 기본이고, 기기가 다크 모드면 밤 지도("밤 드라이브")를 씁니다. 브랜드 남색·금색은 모범택시의 검정·금줄 이미지로 그대로 이어 갑니다(기사님 그림이 없어도 성립합니다).

| 토큰 (새로 추가 ★) | 낮 | 밤 | 쓰임 |
|---|---|---|---|
| `--navy` | #1E2C58 | #1E2C58 | 쇼퍼 카, 위쪽 막대, 미터기 |
| `--taxi` (금색) | #F5B700 | #F5B700 | 주 단추 채움(위 글자 `--ink`), 미터기 숫자, 지나온 길 |
| `--teal` | #0A7568 | #3FC1AE | "지금 여기" 핀과 테두리 |
| `--paper` / `--card` | #F4F7FB / #FFFFFF | #0D1430 / #161F3F | 바탕 / 카드·아래 창 |
| `--ink` / `--ink-soft` | #16213F / #4B5674 | #EEF2FA / #A9B4D0 | 글자 |
| ★`--sky-top` / `--sky-bottom` | #CFE6FF / #F4F9FF | #0B1230 / #1B2A55 | 지도 하늘(지도에만 그라데이션 허용) |
| ★`--sea` / `--sand` / `--grass` | #6FCDE9 / #F1D9A6 / #8FD27A | #10325A / #6D6247 / #2E5B4A | 렌더 색 기준(렌더 장치가 같은 값을 씀) |
| ★`--asphalt` / `--lane` | #3A4566 / #F5D76E | #1B2340 / #F5B700 | 길과 가운데 선(SVG 덧칠) |
| `--go` / `--caution` / `--stop` | 기존 값 | 대비 다시 계산 | 초록불·노란불·빨간불 (늘 아이콘 + 글과 함께) |

- 밝은 바탕 위 금색 채움은 지금처럼 한 화면에 하나만 씁니다.
- 지도 렌더는 낮과 밤을 따로 굽고, `<picture>`의 `media="(prefers-color-scheme: dark)"`로 하나만 내려받습니다.

### 4.3 글꼴

- **Pretendard Variable 하나**로 갑니다. 홈 제목 30/900, 화면 제목 26/800, 소제목 20/700, 본문 16/400(줄 간격 1.6), 보조 14. 지도 이름표는 15/800입니다.
- 미터기·영수증·숫자는 **CC Receipt**(D2Coding 부분 집합)를 씁니다. 전광판이 없어지므로 이 글꼴에 넣을 글자는 숫자, 'km', '원', 영수증 문구만 남습니다.
- 둥근 게임용 제목 글꼴은 더하지 않습니다. 장난감 느낌은 이름표 모양과 3D가 내고, 글꼴은 토스처럼 단정하게 둡니다. 장난감 글꼴은 어른 사용자에게 싸 보입니다.

### 4.4 모양

- **장난감 블록 문법**: 아래 창은 반지름 24, 카드는 16, 이름표·칩은 알약 모양입니다.
- **게임 단추**: 주 단추 아래에 4px짜리 더 진한 금색 턱이 있고, 누르면 2px 내려가며 턱이 줄어듭니다(150ms). 보조 단추는 흰 바탕 + 2px 남색 테두리 + 같은 턱입니다.
- **아이콘 동전**: 모든 3D 아이콘은 흰 원판(또는 둥근 사각) 위에 놓습니다. 크기는 32/40/56px 세 단계입니다.
- 선 그림(SVG)은 굵기 4에 둥근 끝입니다. UI 테두리는 2px. 그림자는 남색 기반 한 가지에 턱을 더하는 식이고, 카드마다 같은 회색 그림자를 깔지 않습니다.

### 4.5 깊이와 3D: "구운 3D"

- **3D는 모두 미리 구워(렌더해) 그림으로 싣습니다.** 사이트에서 WebGL은 쓰지 않습니다. 렌더 장치 하나가 섬, 랜드마크, 쇼퍼 카, 아이콘을 **같은 카메라, 같은 해, 같은 색**으로 굽기 때문에 출처가 달라도 한 세계로 보입니다.
  - 카메라: 원근 26°, 내려다보는 각도 약 50°, 정면에서 오른쪽으로 30° 돌린 위치.
  - 빛: 왼쪽 위에서 오는 따뜻한 해(그림자가 오른쪽 아래로 떨어져 UI 그림자와 방향이 같음), 하늘색 반구광, three 내장 RoomEnvironment(외부 HDRI 없음).
  - 마감: GTAO(틈새 그늘), 위아래 가장자리 12%를 흐리게 하는 틸트 시프트로 미니어처 느낌을 냅니다.
  - 색 맞추기: Kenney 자산은 팔레트 텍스처 한 장을 공유하므로, 그 한 장을 우리 팔레트로 바꿔 칠하면 키트 전체 색이 바뀝니다. 소유자가 준 Tripo3D 모델은 렌더 때 채도와 대비를 같은 기준으로 맞춥니다.
- **이 컨테이너에서 확인한 것**: three 0.186.1(npm) + Playwright Chromium(SwiftShader WebGL2)으로, 직접 만든 섬·순환 도로·둥근 나무·장난감 차와 Kenney CC0 모델을 720×960으로 약 6초에 렌더했습니다. 들를 곳 5곳의 화면 좌표도 JSON으로 뽑았습니다. 시험 그림의 크기는 AVIF 18KB, WebP 33KB였습니다.
- **상태가 바뀌는 것은 모두 그림 위에 얹은 SVG·CSS로 그립니다**: 칠해지는 길, 구름, 이름표, 핀, 차의 위치. 렌더 장치가 `world-map.json`에 들를 곳 좌표, 길 SVG 경로(`d`), 16방향 차 그림 번호표, 구름 자리를 함께 써 줍니다. 그래서 그림을 다시 구워도 코드는 고치지 않습니다.

### 4.6 아이콘 체계

| 층 | 무엇 | 출처 |
|---|---|---|
| A. 주인공 3D | 섬, 들를 곳 5곳 랜드마크, 쇼퍼 카, 섬의 건물 3채(정비소·도서관·코스 안내소) | 렌더 장치. 처음에는 직접 만든 것 + Kenney CC0, 나중에는 소유자의 Tripo3D 모델 |
| B. 3D 아이콘 (32~56px) | 칸 7종, 목적지 그림 보기, 도착의 트렁크 짐, 섬 둘러보기 타일 | Fluent Emoji 3D(MIT). 칸 7종은 나중에 소유자 모델(A11)로 바꿀 수 있음 |
| C. UI 아이콘 | 닫기, 복사, 뒤로, 설정, 소리, 핸들(운전석 안내) | Phosphor duotone(MIT, `SteeringWheel` 포함) |
| D. 도장 | 들를 곳 5개 + 용어·정답 도장 | 직접 그린 SVG(둥근 고무 도장, 원을 따라 도는 글자, 가운데 그림, 날짜) |

안쪽 화면 위쪽 길 띠의 아이콘은 지도 랜드마크를 64px로 구운 것이라, 지도와 띠가 같은 물건으로 보입니다.

### 4.7 배치와 플랫폼 패턴

- **홈 = 지도 + 스크롤로 올라오는 아래 창.** 지도는 `position: sticky`로 고정하고, 아래 창은 보통 흐름 안에서 지도 위로 스크롤되어 올라옵니다. 끄는 동작을 처리하는 JS가 없고, 키보드와 화면 낭독기로도 자연스럽게 쓸 수 있습니다.
- **안쪽 화면 = 위쪽 막대 + 장소 머리 + 무대 + 엄지 막대.**
  - 위쪽 막대(남색, 56px): 지도 단추, 길 띠, 미터기, 설정.
  - 장소 머리: 56px 랜드마크 동전 + 제목 + 한 줄 설명 + 진행("필수 3칸 중 1칸").
  - 엄지 막대: 주 단추와 사전.
- 자세한 내용은 아래 창으로 엽니다: 도구 '자세히', 여행 수첩, 설정, 사전(이미 있음).
- 장터는 지금처럼 48장을 길게 늘어놓지 않습니다. 칸 칩 줄(3D 아이콘이 든 가로 칩) + 검색 + 토스식 목록 줄(40px 아이콘, 이름, 한 줄 설명, 0원·난이도)로 바꿉니다. 지금 360px 진열대는 19,000px 길이입니다.
- 결과 알림은 엄지 막대 위에 2초 동안 뜨는 짧은 줄로 보여 주고, 같은 글을 `aria-live`로도 알립니다.

### 4.8 홈, 360px

```text
y=0   ┌──────────────────────────────────┐
      │ 코드쇼퍼            [수첩 ③][⚙]  │ 56px. 하늘 위에 투명하게. 워드마크 Pretendard 900 20px 남색
      │  ☁   ┌────────┐                  │ 지도 캔버스 360×480 (그림은 720×960 AVIF)
      │      │ 신호등 │ ☁☁ (닫힘, 반투명)  │ 이름표: 흰 알약 15/800 + 상태 글자, 누르는 곳 44px 이상
      │  ┌──────┐   ╭─────────╮           │ 순환 도로: 지나온 구간은 금빛 SVG 덧칠
      │  │장보기│ ☁☁│ 섬 렌더  │  ┌────┐   │
      │  └──────┘   │ (나무·바다)│  │도착│   │ 도착 게이트 옆 공터(받은 설계도만큼 집이 늘어남)
      │ ┌──────────┐╰─────────╯  └────┘   │
      │ │목적지 ◉  │  ╭"어디로 모실까요?"╮  │ 지금 여기: 청록 테두리. 쇼퍼 카 48px + 말풍선 칩
      │ └──────────┘   🚗━━━▦▦━━ 시운전    │ 출발선(체크무늬) = 도착선 옆
y=440 ├╌╌╌╌╌╌╌╌╌╌╌ ▬ 손잡이 ╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤ 아래 창: 지도를 40px 덮고 올라옴, 위 모서리 24
      │ [ 0.0km · 요금 0원 ]               │ 미터기 칩: 남색 알약, 금색 CC Receipt 숫자
      │ 어디로 모실까요?                    │ 30/900
      │ 코드는 몰라도 됩니다.               │ 16/400 ink-soft
      │ 목적지만 말하세요.                  │
      │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │ 주 단추 56px, 금색 + 턱
      │ ┃          목적지 말하기          ┃ │
      │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
      │ ┌──────────────────────────────┐ │ 보조 단추 52px
      │ │          장터 구경하기          │ │
      │ └──────────────────────────────┘ │
      │ 처음이세요? 10분 시운전부터 ›       │ 링크 줄 44px
      ├──────────────────────────────────┤ ── 스크롤하면 보이는 것 ──
      │ 추천 코스  [카드 240×176] [카드] → │ 가로 스크롤. 3D 아이콘, 제목, 누구에게, "이 코스로 출발"
      │ 섬 둘러보기                         │ 2×2 타일(동물의 숲 앱 화면처럼)
      │ [장터 48] [정비소 20]               │ 둥근 사각 56px 3D 아이콘 + 이름 + 개수
      │ [용어 도감 3/20] [여행 수첩]        │
      │ 소개 · 추천 공식 · 크레딧 · …       │
      └──────────────────────────────────┘
```

- **다시 온 손님**: 아래 창 맨 위에 "지난번 장보기에서 멈췄어요" 카드(작은 길 띠 + **이어 가기** 금색 단추)가 놓입니다. '목적지 말하기'는 보조 단추 "새 목적지"로 내려갑니다. 차는 마지막에 있던 곳에 서 있습니다.
- **DOM 순서**: 본문 바로 가기 → 위쪽 막대 → h1·미터기·단추(아래 창 내용) → `<nav aria-label="섬 지도">` 안의 `<ol>` 다섯 링크 → 추천 코스 → 섬 둘러보기.
  - 이름표 링크는 "장보기, 닫힘. 목적지를 정하면 열려요"처럼 상태까지 읽힙니다. 지금 있는 곳에는 `aria-current="step"`을 답니다.
  - 지도 그림은 장식(`alt=""`)입니다. 구름과 차는 `aria-hidden`이고, 말풍선 칩은 진짜 글입니다.
- **첫 그림 속도**: 섬 렌더 `fetchpriority="high"`, 크기 속성 지정, 렌더 장치가 뽑은 섬 윤곽 SVG(약 1KB)를 하늘 그라데이션 위에 인라인으로 먼저 그립니다.

### 4.9 장보기, 360px

```text
┌ 위쪽 막대(남색 56) ───────────────┐  [지도] ●─●─◉─○─○ [12km·0원] [⚙]
│ 🛒(56px 동전) 장보기              │  제목 26/800
│ 칸마다 도구를 하나씩 담아요        │  필수 3칸 중 1칸
├ 장바구니 칸 줄 (가로, 붙박이) ─────┤  [💻화면 ✓][🗃저장 ◌][🔑로그인 ◌][📡외부 데이터 ◌]…
│                                  │  칸 판 64×72: 빈 칸은 점선, 채운 칸은 아이콘 + 초록 ✓
│ 저장 · 필수                       │  칸 도움말 한 줄
│ ┌ 추천 ─────────────────────────┐ │  금빛 옅은 바탕(--gold-soft)
│ │ 구글 시트                      │ │  이름 20/700, 한 줄 설명
│ │ 분야 일치 · 0원으로 시작 · 쉬움 │ │  추천 이유 칩
│ │ 맞춤  ██████████░░             │ │  마리오 카트식 막대 3개
│ │ 비용  0원으로 시작              │ │
│ │ 난이도 ★☆☆                     │ │
│ │ [ 담기 ]          자세히 ›      │ │  담기 = 금색 턱 단추(화면의 금색 하나)
│ └────────────────────────────────┘ │
│ 다음 후보: 노션 — 추천보다 덜한 점: 주제가 달라요 │ 비교 막대 차이(＋초록/－빨강 글)
│ 다른 도구 3개 ›  원문만 있는 도구 5개 › │  목록 줄(토스식)
├ 엄지 막대 ───────────────────────┤
│ [ 신호등으로 가기 ]        [사전] │  흰 보조 단추(금색은 '담기'에 씀)
└──────────────────────────────────┘
```

- 칸 판을 누르면 그 칸으로 갑니다.
- '자세히'는 아래 창으로 엽니다: 제공, 자격, 갱신, 키 노출, 라이선스, 확인한 때, 공식 문서.

### 4.10 넓은 화면

- 1024px 이상에서는 왼쪽에 480px 지도를 붙박이로 두고(차가 지금 있는 곳에 서 있음), 오른쪽에 600px 무대를 둡니다. 이때 위쪽 길 띠는 숨깁니다(지도가 보이므로).
- 768px에서는 360px 배치를 720px 안쪽에 둡니다.

## 5. 대표 장면

모든 장면은 누르기, Esc, '건너뛰기'로 끝 상태로 건너뜁니다. 장면 중에도 단추를 누를 수 있습니다. 바뀐 내용은 `aria-live`로 글로도 알립니다. 동작 줄이기(기기·사이트)에서는 이동·확대·흔들림·색종이를 없애고 150ms 페이드만 남깁니다. 길이는 모두 토큰으로 정합니다.

| # | 장면 | 무엇이 일어나나 | 기법 | 동작 줄이기일 때 |
|---|---|---|---|---|
| 1 | **섬 도착** (홈 첫 방문, 1.6초 이하) | 하늘에서 섬이 1.04배에서 1배로 내려앉고(400ms), 닫힌 곳의 구름이 자리를 잡습니다(300ms). 쇼퍼 카가 바다 쪽 길에서 출발선까지 굴러와 서고(700ms), 말풍선 "어디로 모실까요?"가 톡 뜹니다(200ms 스프링). 다시 온 손님에게는 차가 마지막 자리에 서 있고 이름표만 한 번 빛납니다(300ms). | 그림 묶음에 CSS keyframes. 차는 WAAPI `offset-distance`로 길 경로를 따라가고, `motion.ts`가 `world-map.json`의 접선 표로 16방향 그림 칸을 고릅니다. | 끝 그림, 말풍선이 바로 보임 |
| 2 | **길이 열리는 순간** (목적지를 마칠 때, 1초 이하) | 목적지에서 장보기·신호등까지 금빛 페인트가 길을 따라 칠해지고(600ms), 그 위의 구름이 양쪽으로 갈라지며 사라집니다(400ms). 이름표가 '닫힘'에서 '열림'으로 뒤집힙니다(250ms). 알림: "장보기와 신호등 가는 길이 열렸어요." | SVG `stroke-dashoffset`, 구름은 같은 그림 하나를 여러 번 쓴 조각의 transform·opacity, 이름표는 CSS `rotateX` | 길은 칠해진 채로, 구름 없음, 이름표 페이드 |
| 3 | **경로 찾는 중** (목적지 질문마다) | 답할 때마다 미리 보기의 작은 길 위로 장볼 칸 아이콘이 들어오거나 빠지며 자리를 바꿉니다(FLIP 300ms). 맞는 추천 코스 카드가 뒤집힙니다(400ms). | FLIP(WAAPI), CSS 3D 카드 뒤집기 | 바뀐 결과만 페이드 |
| 4 | **담기** (장보기, 850ms 이하) | 도구의 3D 아이콘이 호를 그리며 위쪽 칸 줄의 판으로 날아갑니다(550ms). 판이 '툭' 눌렸다 튀고(300ms 스프링), 능력치 막대가 새 값으로 움직이며, 미터기 숫자가 굴러갑니다(600ms, 함께). | 두 위치 사이로 `offset-path`를 계산해 WAAPI로 움직이고, 스프링은 `linear()` 토큰 | 판이 바로 채워지고 막대는 최종값 |
| 5 | **신호가 바뀌는 순간** (신호등) | '바꾸기'를 마치면 빨간 렌즈가 초록으로 바뀌며 한 번 빛납니다(350ms). '알아보고 가기'는 노란 렌즈가 됩니다. 빨간불이 하나도 남지 않으면 건널목 차단봉이 올라가고(400ms), 엄지 막대의 '영수증 받기'가 금색으로 차오릅니다(300ms). | SVG 신호등 부품(렌즈는 방사형 그라데이션, 빛은 opacity), 차단봉은 SVG `rotate` | 색·아이콘·글만 바뀌고 차단봉은 올라간 채로 |
| 6 | **도착** (3초 이하, 처음 한 번만 전체) | 차가 결승 게이트로 들어와 서고(500ms), 미터기가 넘김판처럼 "요금 0원"으로 넘어갑니다(500ms). 영수증이 미터기 투입구에서 아래로 뽑혀 나오고(1.5초 이하), 도장이 '쾅' 찍힙니다(250ms). 처음 받은 영수증이면 색종이가 한 번 터집니다(1.2초, 겹쳐 진행). 다시 볼 때는 다 나온 영수증만 보입니다. | 결승 장면 렌더 한 장(지연 로드) + CSS `clip-path`·translate로 종이 출력, 넘김판 숫자는 CC Receipt + CSS 3D, 색종이는 canvas-confetti(지연) | 다 나온 영수증과 도장, 색종이 없음 |
| 7 | **도장과 도감** (여행 수첩·용어 카드, 600ms 이하) | 도장이 1.35배에서 내려와 -6°로 찍히고(250ms 스프링) 잉크 테두리가 번집니다(200ms). 용어 카드는 실루엣이 왼쪽부터 색으로 차오릅니다(400ms 마스크). 정답까지 맞히면 금테가 한 바퀴 그려집니다(400ms). | CSS transform, SVG 마스크, `stroke-dashoffset` | 최종 상태 바로 |

효과음은 기본 꺼짐이고, 켜면 짧은 합성음(ZzFX)을 냅니다: 담기 '뿅', 길 열림 '딩동', 초록불 '삐빅', 도장 '쿵', 영수증 '드르륵', 첫 도착 '빰빠밤'(1초 안쪽).

## 6. 게임 층

**진행**
- 한 바퀴는 들를 곳 5곳입니다. 열리는 조건은 엔진(`done`, `canIssue`)만 따릅니다.
- 지금 있는 곳은 지도·길 띠·안내 줄 세 군데에서 같은 이름으로 보입니다.
- 미터기는 저장된 상태에서 다시 계산하는 '얼마나 왔나'입니다. 지금 있는 `KM` 표를 그대로 쓰고, 요금은 늘 0원입니다.
- 영수증을 받으면 한 바퀴를 돈 것입니다. **새 목적지**로 다음 바퀴를 시작합니다.

**보상**
- 들를 곳 도장 5개: 각자 다른 SVG 도장(깃발·핀·장바구니·신호등·영수증)이고, 처음 한 번만 찍히는 장면이 나옵니다.
- 용어 도장(필수 용어를 다 읽음), 정답 도장(문제마다 작은 도장).
- 추천 코스 완주 표시: 그 코스로 영수증을 받으면 코스 카드에 도장이 찍힙니다.
- **섬이 자란다**: 영수증을 받을 때마다 도착 옆 공터에 작은 집이 하나 늘어납니다(최대 6채, 미리 구운 그림 4종을 돌려 씀). 수첩에는 "받은 설계도 2장"으로 적힙니다. 저장하는 값은 바퀴 수 정수 하나뿐입니다.

**모으기**
- 용어 도감 20장은 세 상태입니다: 아직(실루엣) → 읽음(색) → 정답까지(금테). 모은 수는 홈 타일에 "3/20"으로 보입니다.
- 여행 수첩은 쪽 세 개입니다: 도장, 도감, 바퀴 수와 미터기 합계.

**되돌려 주기**
- 누르면 150ms 안에 턱이 내려가고, 결과는 300ms 안에 보입니다.
- 모든 결과를 글 한 줄로 알립니다("구글 시트를 담았어요. 저장 칸이 채워졌어요.").
- 소리 없이도 모든 것을 알 수 있습니다.

**지키는 선 (어둡게 만들지 않기)**
- 시간 제한, 연속 출석, 일일 과제, 벌점, 잃는 것, 순위표, 다른 사람과 비교가 없습니다.
- 보상에 운(확률)이 끼지 않습니다. 그래서 '뽑기'라는 말도 지웠습니다.
- 연출이 끝나야 누를 수 있는 단추는 없습니다. 닫힌 곳은 늘 이유와 여는 방법을 글로 보여 줍니다.
- 시운전은 건너뛸 수 있고, '모르겠어요'는 언제나 고를 수 있으며, 장터는 언제든 들어갈 수 있습니다.
- 모든 기록은 이 브라우저에만 있고 설정에서 지울 수 있습니다.

## 7. 자산 계획

### (a) 직접 만드는 것 (SVG·CSS·렌더 장치)

1. **렌더 장치** `scripts/assets/render-world.ts` (개발 때만 씀)
   - three 0.186.1 + Playwright Chromium(SwiftShader) + sharp 조합입니다.
   - 결과물: `src/assets/world/*.avif|webp`(낮·밤) + `src/data/world-map.json`(들를 곳 좌표, 길 경로 `d`, 16방향 접선 표, 구름 자리, 섬 윤곽).
   - 명령: `npm run world`. 소유자 모델이 오면 `assets-src/3d/owner/`에 넣고 이 명령만 다시 돌립니다.
   - 검사(guard)를 하나 더합니다: `src/` 안에서 `three`를 import하면 막습니다.
2. **섬**: 물방울 모양 윤곽을 두께 있게 뽑은 모래 절벽 + 잔디 + 원형 바다 + 닫힌 CatmullRom 곡선으로 만든 순환 도로 리본 + 가운데 점선 + 기본 도형으로 만든 둥근 나무·울타리·가로등. 시험 렌더로 이미 확인했습니다.
3. **임시 쇼퍼 카**: 둥근 상자(RoundedBoxGeometry)로 만든 장난감 차입니다. 남색 몸체, 금줄, 금색 지붕등, 금색 바퀴 휠. 16방향 그림판으로 굽습니다(시험 렌더 확인).
4. **임시 랜드마크**: 직접 만든 기본 도형 + Kenney 조각(아래 (b)).
5. **SVG·CSS**: 길 띠, 지도 덧칠(지나온 길, 이름표, 핀, 출발·결승 체크무늬), 구름(같은 그림 하나를 돌려 씀), 신호등 부품과 차단봉, 넘김판 미터기, 영수증 종이(이미 있음), 턱 단추, 아래 창, 아이콘 동전, 능력치 막대, 도장 7종(원을 따라 도는 글자 + 가운데 그림 + 고정 `feTurbulence` 잉크 결), 도감 실루엣 마스크.
6. **길 띠 동전**: 랜드마크를 64px@2x로 구운 것(5 × 8KB 이하).

이미지 예산(홈, AVIF 기준):

| 자산 | 크기 | 예산 |
|---|---|---|
| 섬(랜드마크까지 구운 것) | 720×960 | ≤ 90KB (WebP 대체 ≤ 140KB) |
| 차 그림판 | 16칸 × 192px | ≤ 35KB |
| 길 띠 동전 5개 | — | ≤ 40KB |
| 구름 | — | ≤ 8KB |
| 합계 | | **≤ 175KB** (예산 300KB) |

도착 장면 렌더(720×480, ≤ 60KB)는 `/arrival`에서만 늦게 불러옵니다.

### (b) 쓸 수 있는 공개 자료 (이 컨테이너의 네트워크로 받음, 확인함)

| 이름 | 라이선스 | 받는 법 | 쓰는 곳 |
|---|---|---|---|
| Kenney Starter Kit **City Builder** | 모델 CC0(README), 저장소 코드 MIT | `raw.githubusercontent.com/KenneyNL/Starter-Kit-City-Builder/main/models/<이름>.glb` + `Textures/colormap.png`. 확인한 것: road-straight·corner·intersection·split·straight-lightposts, pavement, grass-trees(-tall), building-small-a~d, building-garage | 신호등 사거리 바닥과 가로등, 정비소 임시(building-garage), 섬에 늘어나는 집(building-small-a~d) |
| Kenney Starter Kit **Racing** | 모델 CC0 | 같은 방법(`…/Starter-Kit-Racing/main/models/`). 확인한 것: vehicle-truck-yellow·green·purple·red, track-straight·corner·bump·finish, decoration-tents·empty·forest | 시운전 트랙 임시, 도착 게이트 임시(track-finish), 장터 천막 임시(decoration-tents), 예비 차 |
| Kenney Starter Kit **3D Platformer** | 모델 CC0 | `…/Starter-Kit-3D-Platformer/main/models/`. 확인한 것: flag, coin, cloud, platform(-medium), brick, grass(-small) | 목적지 깃발, 구름 그림 굽기 |
| three.js 0.186.1 | MIT | npm, **devDependency만** | 렌더 장치(사이트에 싣지 않음, 0KB) |
| Microsoft Fluent Emoji 3D | MIT | 지금 쓰는 고정 커밋 1ffb34c, raw.githubusercontent | 칸·그림 보기·섬 둘러보기·트렁크 짐. 더할 것(확인함): Desert island, Motorway, Shopping bags, Convenience store, Hammer and wrench, Open book, Card index, Scroll(설계도), Luggage, Compass, Racing car, Construction |
| Phosphor, canvas-confetti(ISC), ZzFX, Pretendard·D2Coding(OFL), sharp(Apache-2.0) | 이미 씀 | — | 변화 없음 |

- 저장소 `main`은 바뀔 수 있습니다. 그래서 받은 GLB(합쳐 약 600KB, 개발용 원본)를 `assets-src/3d/kenney/`에 넣고, 파일마다 sha256을 `SOURCE.md`에 적어 고정합니다. 크레딧 화면에는 Kenney(CC0)를 적습니다.
- kenney.nl, Quaternius, Poly Pizza, Poly Haven은 막혀 있어 쓰지 않습니다. HDRI 대신 three 내장 RoomEnvironment를 씁니다.

### (c) 소유자에게 부탁할 것

**공통 납품 규격 (Tripo3D)**
- GLB, Y축 위, 원점은 바닥 가운데, 앞면은 +Z.
- 삼각형 2만 개 이하(차는 2만 5천), 텍스처 1024px 이하, 바닥판 없음, 물체 하나.
- **글자·숫자·로고·사람 없음.**
- 원본 파일은 10MB 이하이고 사이트에 싣지 않습니다. 사이트에는 우리 렌더만 실리고, 예산은 (a) 표를 따릅니다.
- 방법: Tripo3D Text-to-3D, 또는 Image-to-3D(아래 참고 그림 문장을 붙여 이미지 생성 AI로 먼저 그린 뒤 넣기). 텍스처 켬, PBR 켬, 가능하면 저면수(low-poly) 옵션 켬.
- Negative prompt(넣을 칸이 있으면): `text, letters, numbers, logo, watermark, people, character, face, ground plane, realistic photo texture, noisy texture, dirt, broken geometry, floating parts`
- 참고 그림용 꼬리 문장 (Image-to-3D로 갈 때, 각 프롬프트 끝에 그대로 붙임): `, isolated on a plain white background, three-quarter view from the front-left at 30 degrees elevation, soft even studio lighting, full object visible`

| id | 순위 | 도구 | 정확한 영어 프롬프트 | 한국어 설명 | 쓰는 곳 | 받기 전 대신 |
|---|---|---|---|---|---|---|
| A01 쇼퍼 카 | P1 | Tripo3D | `A small toy chauffeur car for a board-game world map: compact rounded two-door sedan with a short hood and a tall rounded cabin, big round friendly headlights, deep navy blue glossy body (#1E2C58), one thin gold pinstripe along both sides (#F5B700), a small gold rounded-rectangle roof lamp with no writing, light blue tinted windows, cream seats visible inside, empty driver seat, chunky black tires with gold hubcaps, soft bevelled edges, chunky toy proportions, matte clay-like plastic materials, clean flat colors, no text, no letters, no numbers, no logos, no license plate characters, no people, single object, centered, wheels on the ground` | 보드게임 지도 위를 달리는 작은 장난감 쇼퍼 카. 남색 몸체에 금줄, 글자 없는 금색 지붕등, 빈 운전석. | 지도 위 차(16방향 그림판 3072×192, ≤ 35KB), 길 띠, 도착 장면, 공유 그림(1200×630) | 둥근 상자로 만든 장난감 차(시험 렌더 확인) |
| A02 시운전 트랙 | P1 | Tripo3D | `A tiny toy practice race track diorama on a rounded square grass tile: a short closed loop of dark asphalt road with white edge lines, a small checkered start gate arch over the road with no writing, four orange traffic cones, two round bushes, a little pennant flag on a pole, smooth rounded bevelled shapes, matte clay-like plastic materials, clean flat colors in navy, gold, white and grass green, no text, no letters, no numbers, no logos, no people, no cars, single object, centered` | 둥근 잔디 판 위의 작은 연습 트랙. 체크무늬 출발 문, 고깔 네 개. | 섬 렌더, 길 띠 동전, 시운전 머리 | Kenney track-corner·straight·finish + 기본 도형 고깔 |
| A03 목적지 광장 | P1 | Tripo3D | `A small toy town plaza diorama on a rounded round tile: a tall wooden signpost with five blank arrow boards pointing in different directions, a big glossy teal map pin floating above the signpost, light paved stone floor, one bench, two round trees, three flower pots, smooth rounded bevelled shapes, matte clay-like plastic materials, clean flat colors, the arrow boards are completely blank, no text, no letters, no numbers, no logos, no people, single object, centered` | 화살표 판 다섯 개(빈 판)가 달린 이정표와 그 위에 뜬 청록 지도 핀이 있는 작은 광장. | 섬 렌더, 길 띠 동전, 목적지 머리 | 기본 도형 이정표 + Kenney flag + 기본 도형 핀 |
| A04 장터 | P1 | Tripo3D | `A small toy market street corner diorama on a rounded square tile: three small market stalls with striped awnings in navy and white, gold and white, teal and white, wooden crates stacked with plain colorful boxes, a small empty shopping cart, a string of round paper lanterns, light paved floor, blank signboards, smooth rounded bevelled shapes, matte clay-like plastic materials, clean flat colors, no text, no letters, no numbers, no logos, no brands, no people, single object, centered` | 줄무늬 차양 노점 셋, 상자 더미, 빈 장바구니 수레가 있는 장터 골목. | 섬 렌더, 길 띠 동전, 장보기 머리, 장터 타일 | Kenney decoration-tents(줄무늬로 색 바꿈) + 기본 도형 상자 |
| A05 신호등 사거리 | P1 | Tripo3D | `A small toy crossroads diorama on a rounded square tile: two dark asphalt roads crossing with white zebra crossings, one big friendly vertical traffic light on a pole with three round glossy lamps in red, yellow and green, all lamps unlit, two short street lamps, small grass corners with round bushes, smooth rounded bevelled shapes, matte clay-like plastic materials, clean flat colors, no text, no letters, no numbers, no logos, no people, no cars, single object, centered` | 건널목이 있는 사거리와 큰 세로 신호등 하나(불은 모두 꺼진 상태). | 섬 렌더, 길 띠 동전, 신호등 머리 | Kenney road-intersection·straight-lightposts + 기본 도형 신호등 |
| A06 도착 게이트와 공터 | P1 | Tripo3D | `A small toy finish area diorama on a rounded square tile: a road ending at a rounded arch gate with a black and white checkered banner with no writing, next to it a chunky navy taxi-meter kiosk with a blank glowing screen and a receipt slot with a short curl of white paper, behind the gate an empty flat lot of light sand with four small wooden stakes and string marking a building plot, a rolled blueprint on a little stand, smooth rounded bevelled shapes, matte clay-like plastic materials, clean flat colors, no text, no letters, no numbers, no logos, no people, no cars, single object, centered` | 체크무늬 결승 문, 영수증 투입구가 있는 남색 미터기 부스, 말뚝과 줄로 표시한 빈 공터, 말아 둔 설계도. | 섬 렌더, 도착 장면(720×480, ≤ 60KB), 길 띠 동전 | Kenney track-finish + 기본 도형 미터기 + 모래 공터 |
| A07 정비소 | P2 | Tripo3D | `A small toy car repair garage building: one-story rounded building with a wide open roll-up door, navy roof with gold trim, an empty car lift inside, a red toolbox, two stacked tires, an oil can, a giant wrench-shaped sign on the roof with no writing, smooth rounded bevelled shapes, matte clay-like plastic materials, clean flat colors, no text, no letters, no numbers, no logos, no people, no cars, single object, centered` | 문이 열린 단층 정비소, 지붕 위 큰 스패너 모양 간판. | 섬 렌더(옆 건물), 홈 타일 '정비소' | Kenney building-garage |
| A08 용어 도감 도서관 | P2 | Tripo3D | `A small toy library building shaped like a stack of three giant closed books with navy, teal and gold covers and blank spines, a round window, a small arched door, a reading bench outside, two round trees, smooth rounded bevelled shapes, matte clay-like plastic materials, clean flat colors, no text, no letters, no numbers, no logos, no people, single object, centered` | 큰 책 세 권을 쌓은 모양의 작은 도서관. | 섬 렌더, 홈 타일 '용어 도감' | 둥근 상자 세 개로 만든 책 더미 |
| A09 코스 안내소 | P2 | Tripo3D | `A small toy tourist information kiosk with a rounded roof, a big folded paper map board showing abstract colored route lines with no writing, a rack of leaflets with blank covers, a small coin-operated telescope on a stand, smooth rounded bevelled shapes, matte clay-like plastic materials, clean flat colors, no text, no letters, no numbers, no logos, no people, single object, centered` | 글자 없는 노선 지도판과 망원경이 있는 관광 안내소. | 섬 렌더, 추천 코스 머리 | 기본 도형 부스 + Fluent Compass |
| A10 섬에 늘어나는 집 4채 | P3 | Tripo3D (4번) | 기본 문장: `A tiny toy cottage for a board-game island, smooth rounded bevelled shapes, matte clay-like plastic materials, clean flat colors, no text, no letters, no numbers, no logos, no people, single object, centered, ` 뒤에 하나씩: ① `navy roof, white walls, round window` ② `teal roof, two floors, small balcony` ③ `gold roof, small shop awning, flower boxes` ④ `white roof with solar panels, small garden fence` | 바퀴 수만큼 공터에 늘어나는 작은 집 네 종류. | 도착 옆 공터(각 128px@2x, ≤ 8KB) | Kenney building-small-a~d |
| A11 칸 아이콘 7종 | P3 | Tripo3D (7번) | 물체 문장 + `, small toy prop, smooth rounded bevelled shapes, matte clay-like plastic materials, clean flat colors, no text, no letters, no numbers, no logos, single object, centered`. 물체 문장: 화면 `a rounded toy laptop with a blank light blue screen` / 저장 `a chunky filing box with three drawers` / 로그인 `a big chunky gold key` / 외부 데이터 `a small satellite dish antenna on a round base` / 알림 `a round bell with a small clapper` / 배포·공유 `a small toy rocket on a launch pad` / 중간 서버 `a small toy safe box with a round dial` | 장볼 칸 일곱 가지를 같은 조명으로 구운 아이콘. | 칸 줄, 장터 칩, 경로 미리 보기(각 128px@2x, ≤ 8KB) | Fluent 3D(지금 쓰는 slot-* 그림) |
| I01 스타일 기준 그림 | P1 (먼저) | 이미지 생성 | `Art direction reference: a three-quarter top-down view of a small toy island floating in a calm light blue sea, one dark navy toy car with a thin gold stripe on a looping coastal road, five small landmarks around the loop (a mini race track with a checkered gate, a plaza with a blank signpost and a teal map pin, a market corner with striped awnings, a crossroads with a big traffic light, a finish arch next to an empty building lot), round soft trees, sandy beach edge, soft morning sunlight from the top left, gentle ambient occlusion, miniature tilt-shift depth of field, matte clay-like plastic toy materials, calm saturated palette of navy, gold, grass green, sand and sky blue, clean and premium like a console game world map, no text, no letters, no numbers, no logos, no people, no characters, 3:4 portrait` | 소유자와 에이전트가 같은 그림을 보고 취향을 맞추는 기준 그림. A01~A06의 참고 그림을 오려 낼 출처이기도 합니다. | **사이트에 싣지 않음**(1536×2048 PNG, `docs/art/`에만 둠) | 이 문서의 시험 렌더 |

받는 순서는 I01 → A01 → A06 → A04 → A05 → A03 → A02 → P2 → P3입니다. A01·A06·A04가 홈과 도착의 인상을 가장 크게 바꿉니다.

## 8. 위험과 비용

**싸 보이게 만들 수 있는 것과 막는 법**

1. **'하이퍼캐주얼 광고 게임' 느낌.** 시험 렌더에서 실제로 보였습니다: 원색 하늘, 너무 큰 차, 네모난 잔디 조각.
   - 막는 법: 차는 섬 폭의 1/8 이하로 둡니다. 채도는 팔레트 기준으로 누르고, GTAO와 틸트 시프트를 씁니다. 소품 밀도 기준(한 화면 나무 30~50그루)을 정합니다. Kenney의 네모 잔디 조각은 쓰지 않고, 둥근 나무는 직접 만듭니다.
2. **세 가지 그림체가 섞이는 것**(Kenney 저폴리, Fluent 반짝이 아이콘, Tripo3D 질감 모델).
   - 막는 법: 주인공 3D는 전부 렌더 장치 한 곳을 거칩니다. Fluent는 56px 이하의 작은 아이콘에만 씁니다(그 크기에서는 차이가 보이지 않음). A11이 오면 칸 아이콘도 같은 장치로 바꿉니다.
3. **Tripo3D 결과의 흠**(녹은 모양, 지저분한 질감, 글자처럼 보이는 낙서).
   - 막는 법: 프롬프트에서 글자를 금지하고, 960·480·64px 세 크기로 확인합니다. 한 자산에 3~5번 다시 뽑는 것을 기본으로 잡습니다. 끝내 기준에 못 미치면 **임시 자산을 그대로 정식으로 씁니다.** 임시판은 그 자체로 출시할 수 있게 만듭니다.
4. **교사가 보기에 유치함.**
   - 막는 법: 장난감은 지도와 대표 장면에만 둡니다. 서류 화면(장보기 표, 신호등 목록, 영수증, 설계도)은 토스 수준으로 단정하게 만듭니다. 원칙: **"장난감은 지도에, 서류는 진지하게."**
5. **구름이 길을 너무 가림.**
   - 막는 법: 구름은 반투명으로 두고 랜드마크 윤곽과 이름표를 늘 보이게 합니다. 처음 온 손님도 다섯 곳 전체를 볼 수 있습니다.
6. **글자 200% 확대 때 이름표가 넘침.**
   - 막는 법: 이름표는 줄을 바꿔도 되게 만들고, 같은 내용을 지도 아래 `<ol>` 글 목록으로 늘 둡니다.

**깨지는 것**

- **주소**: `/lesson /interview /check /receipt /shelf /products /concepts /recipes`가 바뀝니다.
  - 고칠 곳: e2e 41개, `ko.ts` 링크, ARCHITECTURE, 검색 색인, `robots`, 템플릿의 `conceptLink`(`/concepts/` → `/terms/`).
  - 덜어 주는 것: `_redirects`로 옛 주소를 새 주소로 보냅니다.
- **문장**: `ko.ts` 약 120줄과 `templates.json`(조사할 것 → 알아볼 것, (2차) → (다음), 설계 꾸러미 → 설계도, 레시피 → 코스)을 고친 뒤 `npm run examples`로 예시를 다시 만들고, 36칸 영수증 폭을 다시 확인합니다. **골든 기대값은 id만 비교하므로 바뀌지 않습니다.**
- **글꼴**: 전광판이 없어지므로 `npm run fonts`로 CC Receipt를 다시 자릅니다(더 작아짐).
- **저장 상태**: 엔진 id와 저장 키를 그대로 두므로 이미 저장된 진행은 살아남습니다. 도장 id(lesson·interview·shop·check·receipt)도 안쪽 값은 그대로 두고 보이는 이름만 바꿉니다.
- **기사님 제거**:
  - 지울 것: `src/assets/mascot/*`, 기사님 대체 텍스트와 말풍선 위치, M2(차 문·기사님) 모션, DESIGN 6절.
  - 바꿀 것: 말풍선은 운전석 안내 칩으로 옮깁니다.
  - 닫을 것: HUMAN.md의 M02 요청.
- **화면 색 하나**: 그대로 둔 빨간불을 노란불로 보여 주는 것은 화면만 바뀌고 엔진은 그대로입니다.

**옮기는 비용 (에이전트 작업일)**

| 일 | 날 |
|---|---|
| 용어·문장·문서(PRD·DESIGN·UX·RECEIPT·ARCHITECTURE·TASKS)·크레딧 | 1.0 |
| 주소·`_redirects`·e2e 고치기 | 0.5 |
| 렌더 장치 + 임시 섬·차·랜드마크(낮·밤) + guard 규칙 | 2.0 |
| 홈 지도 + 아래 창 + 장면 1·2 | 1.5 |
| 위쪽 막대·길 띠·장소 머리 | 1.0 |
| 장보기 칸 줄·능력치 막대·장면 4, 장터 목록 줄 | 1.0 |
| 신호등 부품·노란불·장면 5 | 0.5 |
| 도착 장면 6, 트렁크 탭 | 1.0 |
| 도장·여행 수첩·도감·섬이 자라는 집(장면 7) | 0.75 |
| 다크 토큰과 대비 검사 | 0.75 |
| 시각 점검·접근성·예산 확인 | 1.0 |
| **합계** | **약 11일** |

- 소유자 쪽: P1 자산 6개 + I01에 약 3~4시간(다시 뽑기 포함)과 Tripo3D 크레딧이 듭니다.
- 받은 뒤 바꾸는 비용은 `npm run world` 한 번입니다. 좌표가 JSON에서 오므로 코드는 고치지 않습니다.

**사람이 정해야 할 것 (HUMAN.md에 올림)**
- Tripo3D와 이미지 생성 도구의 이용 약관이 공개 사이트에서 결과물 사용(요금제별 상업·공개 조건, 무료 요금제 결과물의 공개 라이선스 여부)을 허락하는지.
- 화면이 닌텐도·카카오 T와 모양이 아니라 패턴만 닮았는지 마지막으로 한 번 보기.
