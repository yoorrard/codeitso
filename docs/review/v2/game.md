# v2 조사: 게임 UI·UX → 코드쇼퍼 (docs/review/v2/game.md)

> 조사한 날: 2026-10-13 · 대상: Duolingo, Mini Metro·Mini Motorways, Gran Turismo 7, Forza Horizon 5·6, Mario Kart 8 Deluxe·World, Need for Speed Unbound, Monument Valley, Alto's Odyssey, Pokémon GO, PS5 활동 카드, Apple 게임 앱(iOS 26), Crusader Kings III, 카트라이더: 드리프트, 그리고 NN/g·Material 3 Expressive·게임 접근성 지침·게임 속 어두운 장치 연구·한국 전자상거래법
> 확신도 표시: **[원문]** 회사·개발자 글, 공식 문서 · **[보도]** 언론·리뷰 · **[2차]** 팬 위키·블로그·커뮤니티 · **[관찰 필요]** 게임을 직접 켜 봐야 확정
> 한계: 이 환경에서는 웹 페이지를 직접 열 수 없었다(WebFetch가 DNS에서 막힘: blog.duolingo.com, en.wikipedia.org 모두). 검색 결과의 요약과 인용만 읽었다. 그래서 [원문]도 '검색 결과로 읽은 원문'이다. 대비 값은 이 저장소에서 직접 계산했다(WCAG 상대 휘도 공식).
> 함께 읽을 것: `docs/review/v2/mobility.md`(호출 앱 조사). 단계 이름은 두 보고서가 거의 같은 결론에 닿았다.

---

## 0. 결론 열 줄

1. 고급 게임과 잘된 게임화의 공통점은 **장식이 아니라 시스템이 재미를 낸다**는 것이다. Mini Metro는 3D·물리·경제를 버리고 도형 몇 개로 정보를 준다. GT7은 모든 차를 같은 빛 안에 놓는다. Monument Valley는 화면마다 벽에 걸 포스터처럼 만든다. 코드쇼퍼의 '자라는 지도'는 이미 이 길 위에 있다. 싸 보이게 만든 것은 구조가 아니라 **마감(빛·선·박자·글자)**이다.
2. 게임은 단계 이름을 여섯 방식으로 짓는다: 번호+기술, 같은 꼬리말, 역할 사다리, 할 수 있는 일, 장소, 공식 절차. 처음 쓰는 사람에게 맞는 것은 **번호 + 할 수 있는 일(동사구)**이다 (GT7 'B-1 출발과 정지', Duolingo 단원 'Introduce yourself'). 장소 이름은 그 장소에서 할 일이 이미 뻔할 때만 통한다. '목적지·경유지'가 추상적으로 들린 까닭이 이것이다.
3. 단계 이름 권고: **연습 · AI 써 보기(선택) → 1 만들 앱 정하기 → 2 도구 고르기 → 3 길 확인하기 → 4 설계도 받기.** 모빌리티 보고서와 넷이 같고 하나('목적지 정하기' ↔ '만들 앱 정하기')만 다르다. 본선은 **4단계**로 세고 연습은 번호 밖에 둔다. 건너뛴 사람이 '덜 끝냈다'는 느낌을 받지 않게 하려는 것이다.
4. 세계관은 이름에서 빼서 **사건과 지도**로 옮긴다: 지도의 깃발(목적지)·마디(경유지)·교통 색, 버튼 [출발하기], 한 줄 "도착했습니다. 요금은 0원입니다." Mario Kart World가 메뉴에서 코스를 고르는 대신 다음 코스까지 달려가게 바꾼 것과 같은 방향이다.
5. 보상은 **드문 정점 하나와 깔끔한 끝**(peak-end)으로 짠다: 누르기 120ms, 고르기 0.9초 이하, 단계 마침 0.9초 이하, 도착 장면은 영수증 출력까지 합쳐 **3초 이하**. 지금 CONCEPT의 S5(2.8초) 뒤에 S6(0.95초)가 이어지면 3.75초라서 규칙을 넘는다. 둘을 겹쳐야 한다(3.4절).
6. 로고는 **세 조각으로 나눠 쓴다.** 기사 흉상은 로고 묶음에만 둔다. 차는 지도 위 '위에서 본 차'로 쓰고, 유리 지붕 너머로 모자 윗면(남색 원 + 파란 띠 + 흰 점)만 보이게 한다. 코드 괄호 `< >`는 '골랐어요' 표시가 된다. 헤드라이트 하늘색 #00B4FA는 **빛**(지금 위치, 길의 심, 다 풀림 훑기, 밤 주행 불빛)에만 쓴다. 금색 대신 빛이 보상의 색이 된다.
7. 어려운 말 풀이는 Crusader Kings III의 **겹 풀이**(풀이 안의 말을 또 열기)와 Forza Horizon 5의 **자막 핵심어 강조**를 본뜬다. 사전에 있는 말은 화면마다 처음 나올 때만 점선 밑줄을 긋고(한 화면 5개까지), 풀이 안의 어려운 말도 한 번 더 열 수 있게 한다(2겹까지). "길게 눌러 고르면 풀이가 나와요"는 처음 한 번만 알린다.
8. 남은 시간은 PS5 활동 카드처럼 **설계자가 정한 추정값을 익명 집계로 고쳐서** "약 n분"으로 보인다. 줄어드는 초읽기는 하지 않는다.
9. 하지 말 것: 연속 출석·XP·리그·하트(Duolingo), 룰렛 티켓(GT7), 탈락 타이머(Mario Kart 녹아웃 투어), 기한 있는 등급(카트라이더 PRO 90일), 그래피티·셀 셰이딩(NFS Unbound), 출발 전 3-2-1 초읽기, 마스코트. 한국 전자상거래법이 2025년부터 막는 다크패턴 6유형 가운데 **잘못된 계층구조·특정옵션 사전선택·반복간섭**은 코드쇼퍼에서도 생길 수 있어 점검표에 넣는다.
10. 진동은 넣지 않는다. iOS Safari에는 `navigator.vibrate()`가 없고, 스위치 입력 요소로 진동을 내는 우회는 비표준 꼼수라 언제 막힐지 모른다. 소리(기본 꺼짐)와 화면 변화로 충분하다.

---

## 1. 게임·제품별 관찰

### 1.1 Duolingo

| 항목 | 관찰 | 확신도 |
|---|---|---|
| 한 줄 길 (2022) | 홈을 한 줄 길로 바꿨다. 수업 순서를 간격 반복에 맞춰 섞고, 작은 단원으로 묶고, 팁은 단원마다 '가이드북'으로 옮겼다. 기술마다 5단계였던 것을 3단계로 줄였다 | [원문] Duolingo 블로그 |
| 바꾼 까닭과 반응 | 대표 Luis von Ahn: 목표는 "헷갈림 줄이기와 학습 효과 올리기". 이용자 일부는 Candy Crush 같다며 반발했다. Duolingo는 새 길에서 읽기·듣기 점수가 올랐다고 보고했다 | [보도] NBC News 2022, [원문] Duolingo 효과 연구 글 |
| 이름 짓기 | 큰 묶음(섹션)은 역할 사다리: Rookie → Explorer → Traveler → Trailblazer → … 단원 이름은 '할 수 있는 일': "Introduce yourself", "Pair letters and sounds", "Use basic sentences" | [2차] duolingodata.com |
| 건너뛰기 | 단원 첫 칸의 'Jump here' 시험으로 아는 부분을 건너뛴다. 틀림 4개 미만이면 통과, 다시 볼 수 있다 | [2차] lingoly.io |
| 모션 조직 | 2024년 디자인 스튜디오 Hobbes를 사서 첫 전담 모션 팀을 만들었고, 2026년 8월 런던 Animade도 샀다 | [보도] TechCrunch 2024-07-09, Pulse 2.0 2026-08-14 |
| 모션 원칙 | 다섯 원칙 가운데 둘: **"박자를 찾아라"**(소리 없이도 모든 움직임에 박자가 있게), **"요점으로 가라"**(배우는 사람의 시간을 존중하고 보상을 숨기지 마라). 모션 팀이 맡는 순간은 단원 마침·연속 기록·순위표 변화 | [2차] 디자인 팀원의 LinkedIn 글 |
| 그림이 시선을 끈다 | 움직이는 그림을 넣자 정지 그림보다 끝까지 보는 시간이 늘었다고 보고 | [원문] Duolingo 블로그 'Shape language' |
| 색·버튼 | 핵심 색 Feather Green #58CC02, 글자 Eel #4B4B4B, 바탕 Snow #FFFFFF. 버튼은 모서리 12px, 바닥에 자기 색의 진한 그림자 3~4px를 깔고 누르면 그만큼 내려앉는다 | [원문] design.duolingo.com 색 · [2차] 버튼 수치 |
| 가치 먼저 | 가입보다 짧은 연습을 먼저 하게 하고 가입은 미룬다 (growth.design 사례 'Duolingo's User Retention: 8 Tactics Tested On 300 Million Users') | [2차] Appcues, eChai 목록 |

**코드쇼퍼에.** 가져올 것: 다음 할 일 하나만 빛나는 길, 단원 = 할 수 있는 일이라는 이름 짓기, 건너뛰기 시험(= 미리 짠 코스로 점검에 바로 내리기), "보상을 숨기지 마라". 버릴 것: 연속 기록·XP·리그·하트·마스코트, 바닥 그림자가 두꺼운 거품 버튼(아이 같아 보임), 구불구불한 길 그림 자체(Candy Crush 비교).

### 1.2 Mini Metro · Mini Motorways (Dinosaur Polo Club)

| 항목 | 관찰 | 확신도 |
|---|---|---|
| 시작 | 2013년 Ludum Dare 26(주제: 미니멀리즘)에 낸 'Mind the Gap'. 지하철 노선도 그림체 | [보도] SUPERJUMP |
| 버린 것 | 큰 3D 환경, 물리 시뮬레이션, 복잡한 경제를 버리고 핵심만 남겼다. 정보는 도형으로 준다(세모 손님은 세모 역으로) | [보도] Indie-o-rama의 Robert Curry 인터뷰 |
| 빼기의 어려움 | Robert Curry: 미니멀리즘이 이 게임을 만들기 어렵게 한 것 가운데 하나. GDC 2017 Jamie Churchman 강연 'Mini Metro: When Less Is More'는 빼는 과정으로 아름다움을 설계하는 법을 다뤘다 | [보도] Indie-o-rama, [원문] GDC 소개 |
| 소리 | Disasterpeace(Rich Vreeland): 거의 모든 소리가 플레이어 행동에 맞춰 실시간으로 울리는 샘플이다. 전통적인 곡은 하나도 쓰지 않았다. 정보 주기와 분위기 사이의 균형을 노렸고, 음악이 게임의 긴장을 덜어 준다 | [보도] Designing Sound 2016-02-18 |
| Motorways 그림 | 개발자: '움직이는 Google 지도' 같은 느낌이라 이미 익숙한 시각 언어를 빌릴 수 있었다. 도시마다 팔레트가 있고 색약·밤 모드 팔레트를 따로 고른다. 고가도로 때문에 아이소메트릭 시안을 그렸다가 정리했다 | [보도] Twinfinite·Gfinity, [원문] dinopoloclub 2023 컨셉 아트 글 |
| 시간 | 시계가 흐르며 한 주 단위로 집·목적지가 생기고, 주 끝에 보상 두 묶음 중 하나를 고른다 | [보도] 리뷰 여럿 |

**코드쇼퍼에.** 가져올 것: 도형으로 나누는 마디(이미 함), 행동 하나에 음 하나가 같은 화음 안에서 울리는 소리, 팔레트 = '느낌' 답, 색약·밤 팔레트. 버릴 것: 시계 압박, 지는 판, 무작위로 고르는 보상.

### 1.3 Gran Turismo 7 (Polyphony Digital, 2022~)

| 항목 | 관찰 | 확신도 |
|---|---|---|
| 월드맵 = 홈 | 지어낸 섬 지도가 홈 메뉴다. 건물 하나가 메뉴 하나다(카페, 차고, 브랜드 센트럴, 중고차, 라이선스 센터, 튜닝숍, 월드 서킷 등). 처음엔 중고차만 열려 있고 차를 한 대 사면 차고와 카페가 열린다 | [보도] GTPlanet 2022 |
| 진행 = 메뉴북 | 카페 주인이 주는 '메뉴북' 39권이 이야기 진행표다. 대부분 '주제가 같은 차 3대 모으기'다. 라이선스 센터는 메뉴북 1, 브랜드 센트럴은 메뉴북 4를 마치면 열린다. 39권 '월드 GT 시리즈' 뒤에 엔딩 | [보도] GTPlanet, TheSixthAxis 2022 |
| 라이선스 | 라이선스마다 시험 10개. 이름은 '번호 + 기술': B-1 'Starting & Stopping 1', B-3 'Cornering Basics 1'. 시험마다 금·은·동 기준 시간(B-1 금 0:20.700). 등급은 국내 B부터 슈퍼까지 다섯 | [2차] Diamond Lobby·Samurai Gamers · 등급 수는 [관찰 필요] |
| 빛 한 벌 | Scapes: 실제 장소의 빛 정보를 찍어 3D 이미지 공간으로 만들고 그 안에 차를 놓는다. 사진·리플레이에 레이 트레이싱 | [원문] PlayStation 에디토리얼 2021 |
| 마찰 | 메뉴북 진행과 라이선스 진행을 서로 다른 길로 들어가 봐야 해서 헷갈린다 | [2차] GTPlanet 포럼 |

**코드쇼퍼에.** 가져올 것: 번호+기술 이름, 같은 빛 한 벌(D59 렌더 장치가 이미 같은 생각), 차를 귀하게 보이게 하는 쇼룸 연출, '할 일 한 장'이 곧 진행표인 구조(상태 한 줄). 버릴 것: 룰렛 티켓, 금·은·동 기록, 사람 안내역(카페 주인), 지도를 유일한 메뉴로 쓰기(360px에서 못 읽음).

### 1.4 Forza Horizon 5·6 (Playground Games)

| 항목 | 관찰 | 확신도 |
|---|---|---|
| 접근성 설정 (FH5, 2021) | 자막 켜기·글자 크기·바탕 투명도·**핵심어 강조**, 고대비 모드, 화면 낭독, 메뉴와 게임 글자 크기, 색약 모드(UI와 화면 따로), **움직이는 배경 끄기**, 알림 머무는 시간, 게임 속도. 수어 통역은 나중에 더함 | [원문] Xbox Wire 2021-11-04 |
| 메뉴 비판 | 일시정지 메뉴가 "시각적으로 시끄럽고 위계가 부족하다". 차고·디자인 탭에서 바꾼 것을 받아들이는 데 마찰이 크다 | [2차] GTPlanet 포럼 |
| FH6 (2026-05, 일본) | 메뉴·HUD·알림이 FH5와 거의 같다는 리뷰. 멀티플레이만 'Horizon Play' 한곳으로 묶음 | [보도] GTPlanet 리뷰 2026-05-14 |
| 도움 주행선 | 초록 = 속도 유지, 노랑 = 곧 굽음·줄이기 시작, 빨강 = 브레이크. 색은 지금 속도에 따라 바뀐다 | [2차] ludo.guide, Forza 포럼 |

**코드쇼퍼에.** 가져올 것: 핵심어 강조(→ 어려운 말 풀이), '움직이는 배경 끄기' = 동작 줄이기, 글자 크기 설정, 주행선의 초록·노랑·빨강 순서(원활·서행·막힘과 같은 약속). 버릴 것: 알림이 계속 뜨는 페스티벌 화면, 위계 없는 메뉴.

### 1.5 Mario Kart 8 Deluxe · Mario Kart World (Nintendo)

| 항목 | 관찰 | 확신도 |
|---|---|---|
| 컵 이름 | 버섯·꽃·별·스페셜 컵, 레트로는 등껍질·바나나·나뭇잎·번개 컵. 모두 '○○ 컵'이라 한 계열로 읽힌다. 컵 하나에 코스 넷 | [2차] MarioWiki |
| World (2025) | 그랑프리: 캐릭터·카트 → 컵 → 배기량 → OK. 다음 코스는 메뉴에서 고르지 않고 **도로를 달려서 간다**. 녹아웃 투어는 24명이 체크포인트 5곳을 지나고, 시간 안에 못 닿으면 탈락 | [원문] Nintendo 고객지원, [2차] Sportskeeda |

**코드쇼퍼에.** 가져올 것: 같은 문법으로 한 계열을 만드는 이름, 단계 사이를 '달려서 잇는' 연결(단계를 마치면 차가 지도에서 한 칸 움직임). 버릴 것: 탈락·타이머, 무작위 아이템.

### 1.6 Need for Speed Unbound (Criterion, 2022)

| 항목 | 관찰 | 확신도 |
|---|---|---|
| 그림체 | 실사 차 + 만화풍 '살아 있는 그래피티'. 효과는 드리프트·부스트 피드백에서 나왔고, 알아보기 어려운 버스트 니트로를 보이게 하는 데 썼다 | [보도] Jalopnik 인터뷰(Kieran Crimmings) |
| 반응 | 대담하지만 호불호가 갈림. 움직일 때 무슨 일이 일어나는지 읽기 어렵다 | [2차] TrueTrophies, 포럼 |

**코드쇼퍼에.** '효과는 피드백에서 나와야 한다'는 원칙만 가져온다. 그래피티·셀 셰이딩·스티커 글자·스피드 라인은 쓰지 않는다. 초심자가 읽어야 하는 화면이다.

### 1.7 Monument Valley · Alto's Odyssey (Apple Design Award 수상작)

| 항목 | 관찰 | 확신도 |
|---|---|---|
| MV 장 이름 | 10장. 로마 숫자 + 장소 이름('II. The Garden', 'III. Hidden Temple' 식). 첫 장은 사실상 연습 | [2차] Pocket Gamer·Gamezebo 공략 |
| 화면 기준 | ustwo: 장마다 놀 수 있는 판이면서, 뽑아서 벽에 걸고 싶을 만큼 보기 좋게. 보도자료: 모든 화면을 그래픽 디자인으로 다뤘다 | [원문] Webby Awards Q&A, [보도] TidBITS |
| MV2 시작 화면 | 시작·설정·게임 센터 버튼을 늘어놓지 않고 '떠나라'만 말한다 | [2차] UX Collective |
| Alto 젠 모드 | 점수·동전·파워업을 뺀 모드, 따로 잔잔한 음악. 2018 Apple Design Award | [원문] App Store |

**코드쇼퍼에.** '포스터 시험'(360px 화면을 찍어 포스터로 걸어도 되나), 첫 화면에서 할 일 하나, 점수 없는 진행.

### 1.8 Pokémon GO (Niantic)

| 항목 | 관찰 | 확신도 |
|---|---|---|
| 지도 색 | 거의 흰 세계 → 풀숲 많은 세계 → 둘 사이의 '대부분 초록, 단순한 도형'으로 정했다. 풀숲이 많으면 실제 지도와 어긋나 보였다 | [보도] GamesBeat |
| 낮·밤과 환경 | 낮·밤에 따라 바뀌고, 흐린 날·노을도 시험했다. 2024년 'Rediscover Your World'로 숲·도시·산·바다와 날씨·계절을 반영 | [원문] pokemongo.com 2024, [보도] Yahoo, mein-mmo |

**코드쇼퍼에.** 지도 색은 '단순한 도형 + 낮은 채도'의 균형, 낮·밤 두 벌. 날씨·계절 장식은 하지 않는다.

### 1.9 PS5 활동 카드 · Apple 게임 앱 · Crusader Kings III

| 항목 | 관찰 | 확신도 |
|---|---|---|
| PS5 활동 카드 | 진행률과 남은 시간 추정("약 10분")을 보인다. 개발자가 정한 값으로 시작해 PSN 이용자 평균 완료 시간과 견주고, 내 속도에 맞춰 고친다 | [보도] GameSpot, VGC(Mike Daly) |
| Apple 게임 앱 (iOS 26, 2025) | 홈('이어서 하기'가 맨 위) · 아케이드 · 함께 하기 · 보관함 네 탭 | [보도] MacRumors, 9to5Mac |
| NN/g의 Liquid Glass 평가 | "Liquid Glass Is Cracked, and Usability Suffers in iOS 26": 비치는 겹이 내용을 가리고 읽기 어렵게 한다 | [보도] OSNews 등 (NN/g 원문은 직접 못 읽음) |
| CK3 겹 풀이 | 강조된 말에 마우스를 올리면 풀이가 뜨고, 풀이 안의 강조된 말에서 또 풀이가 뜬다. 풀이를 붙잡아 두는 '잠금'이 있다. 콘솔에서는 왼쪽 스틱을 눌러 '풀이 모드'에 들어간다. Paradox는 이 말들을 'game concepts'라 부르고 **파란색**으로 칠한다. Victoria 3·Europa Universalis V가 같은 방식을 이어받았다 | [원문] Paradox Tinto Talks #77 (2025-08-20), [보도] PCGamesN, wccftech, [2차] WHATWG 이슈 9776 |

**코드쇼퍼에.** 정직한 남은 시간, '이어서 가기'를 맨 위에(이미 CONCEPT 6.1), 유리 흐림 금지의 근거, 겹 풀이.

### 1.10 한국 맥락

| 항목 | 관찰 | 확신도 |
|---|---|---|
| 카트라이더: 드리프트 라이선스 | 초보 → 루키 → L3 → L2 → L1 → PRO, 6단계. 싱글 플레이에서 단계별 미션을 다 하면 받는다. PRO는 90일만 유지되고, 갱신하지 못하면 L1으로 내려간다 | [보도] 게임메카·디스이즈게임 |
| 운전면허 절차 | 교통안전교육 → 신체검사 → 학과시험(40문항, 40분) → 기능시험 → 도로주행시험(5km 이상). 한국 어른 대부분이 아는 '번호 붙은 단계' | [2차] KB Think |
| 다크패턴 규제 | 2025-02-14 개정 전자상거래법: 숨은 갱신, 순차공개 가격책정, 특정옵션 사전선택, 잘못된 계층구조, 취소·탈퇴 방해, 반복간섭 6유형. 계도기간은 2025-08-13까지 | [보도] 노컷뉴스, [원문] 법무법인 율촌 뉴스레터 |

**코드쇼퍼에.** 면허 시험처럼 '짧은 이름이 붙은 순서 있는 단계'는 한국 어른에게 익숙하다. 다만 등급·기한·강등은 잃을 것을 만드는 장치라서 쓰지 않는다.

### 1.11 연구와 지침

| 주제 | 내용 | 확신도 |
|---|---|---|
| NN/g 애니메이션 길이 | 대부분 100~500ms. 체크박스·토글 같은 단순 반응은 약 100ms, 모달 같은 전환은 200~300ms. 500ms부터 질질 끈다고 느낀다. 250ms와 300ms도 차이가 난다 | [원문] nngroup.com/articles/animation-duration |
| Peak-end | 사람은 경험을 정점과 끝으로 기억한다 (Kahneman 외 1993) | [원문] NN/g 영상, Laws of UX |
| 만들어 준 진행 | 세차장 카드 300장: 빈 8칸 카드 vs 10칸 중 2칸을 미리 찍은 카드(둘 다 8번 필요). 다 채운 비율 19% vs 34%. 이유 없이 준 진행은 역효과가 나기도 한다 | [2차] Coglode 등. 원 논문 Nunes & Drèze, JCR 2006 |
| 게임 속 어두운 장치 | Zagal 분류: 시간(갈아 넣기, 정해진 시각에 접속), 돈(돈 내고 건너뛰기, 숨은 비용), 사회(친구 끌어오기) | [원문] arXiv 2412.05039가 정리 |
| FTC 대 Epic | 헷갈리는 버튼 배치로 원치 않은 결제가 생겼다며 2억 4,500만 달러 환불 명령 (2023 확정) | [원문] FTC, [보도] VGC |
| Material 3 Expressive (2025-05) | 연구 46건, 18,000명 넘게 참여. 눈 추적에서 보내기 버튼 같은 핵심 요소를 최대 4배 빨리 찾았다. 요소가 스프링처럼 제자리에 튀어 들어가는 모션 | [보도] Dezeen 2025-05-28 |
| 게임 접근성 지침 | 기본: 깜빡이는 그림·반복 무늬를 피한다. 중급: 정밀한 타이밍을 필수로 만들지 않고, 멈추거나 건너뛸 수 있게 한다 | [원문] gameaccessibilityguidelines.com |
| UI 소리 | 대부분 300ms 안쪽, 누르기 30~150ms, 알림 약 500ms. 한 소리 재료에서 높낮이·길이만 바꿔 한 가족으로 만든다. 올라가는 음 = 확인, 내려가는 음 = 취소. 백 번 들어도 거슬리지 않게 작게 | [2차] Violet Recording, Bugnet, Audiokinetic |
| 웹 진동 | iOS Safari는 `navigator.vibrate()`를 지원하지 않는다. `<input type="checkbox" switch>`를 눌러 진동을 내는 우회는 비표준 부작용이고, 막혔다는 말도 있다 | [2차] Ionic 이슈 29942, azukiazusa, bugnet |
| `linear()` 곡선 | 스프링·튕김을 CSS만으로 가깝게 흉내 낸다. Chrome 113, Firefox 112, Safari 17.2부터 | [원문] developer.chrome.com |
| 문서 간 View Transitions | Chrome 126(2024-06)·Safari 18.2(2024-12)부터. Firefox는 아직이고, Interop 2026 목표에 들어 있다 | [2차] 2026 안내 글, [보도] Simon Willison 2026-02-15 |

---

## 2. 공통 패턴

### 2.1 진행을 보이는 법

| 방식 | 예 | 강점 | 약점 | 코드쇼퍼 자리 |
|---|---|---|---|---|
| 한 줄 길 | Duolingo | 다음 할 일이 늘 하나 | 아이 같아 보이기 쉬움 | 단계 줄(가로 4칸) |
| 허브 지도 | GT7 월드맵, Mario Kart World | 세계가 하나로 이어짐 | 작은 화면에서 메뉴로 쓰기 어려움 | 지도는 '내 결과물'. 메뉴는 HTML 목록 |
| 할 일 한 장 | GT7 메뉴북 | 할 일이 구체적("이 차 3대") | 진행이 흩어지면 헷갈림 | 상태 한 줄("꼭 고를 것 1개 남음") |
| 자라는 시스템 | Mini Motorways | 내 손이 만든 변화가 보임 | 많아지면 읽기 어려움 | 답 하나 = 지도 변화 하나 (S2) |
| 활동 카드 | PS5 | 남은 시간·진행률이 정직 | 자료가 필요 | 상태 한 줄의 '약 n분' |

공통 규칙 셋: (1) 지금 할 일은 하나만 강조한다. (2) 진행은 실제 남은 일로 센다. 미리 찍어 둔 칸은 없다. (3) 끝난 것은 지우지 않고 남겨 쌓인 모습을 보인다.

### 2.2 단계 이름 짓는 법

| 방식 | 예 | 맞는 경우 | 코드쇼퍼 |
|---|---|---|---|
| 번호 + 기술 | GT7 'B-1 출발과 정지', Mario '1-1' | 단계마다 하는 일이 다름 | **씀** (번호) |
| 할 수 있는 일 | Duolingo 'Introduce yourself' | 초심자에게 '끝나면 무엇이 되나'가 중요 | **씀** (이름) |
| 같은 꼬리말 | Mario Kart '○○ 컵' | 하는 일은 같고 판만 다름 | 안 씀 (하는 일이 단계마다 다름). 다만 '같은 문법' 원칙은 가져온다 |
| 역할 사다리 | Duolingo Rookie→Trailblazer, 카트 초보→PRO | 긴 시간 동안 실력이 쌓임 | 안 씀 (20분짜리 흐름, 등급이 생김) |
| 장소 | Monument Valley 'The Garden' | 그곳에서 할 일이 이미 뻔함(퍼즐 풀기) | **지금 이름의 문제.** 목적지·경유지는 장소라서 거기서 할 일을 한 번 더 바꿔 읽어야 한다 |
| 공식 절차 | 운전면허 학과→기능→도로주행 | 모두가 아는 실제 절차 | 말맛만 참고 (짧은 두 어절) |

**이름 공식:** [번호] + [무엇을] + [하다 → -기]. 두 어절, 여섯 자 안팎. 세계관 그림은 이름 옆 그림과 지도가 맡는다.

### 2.3 보상 순간

| 크기 | 게임 예 | 길이 | 얼마나 자주 |
|---|---|---|---|
| 손맛 | Duolingo 버튼이 내려앉음, NN/g 단순 반응 | 약 100ms | 누를 때마다 |
| 작은 보상 | Mini Metro 역을 이으면 음 하나 | 0.3~0.5초 | 행동마다 |
| 마침 | Duolingo 단원 끝, GT7 메뉴북 도장 | 1초 안쪽 | 단계마다 한 번 |
| 정점 | 레이스 결과, 엔딩 | 2~3초, 건너뛰기 가능 | 한 흐름에 한 번 |

박자 원칙: 정점은 드물게, 크기는 해낸 일의 크기에 맞게, 보상은 화면이 바로 쓸 수 있는 상태로 끝난다("보상을 숨기지 마라").

### 2.4 처음 쓰는 사람 안내

- **글보다 배치로 가르친다.** Super Mario Bros. 1-1은 적과 블록의 자리만으로 점프와 버섯을 가르친다 [2차]. 코드쇼퍼의 S1(첫 방문에 본보기 길이 출발에서 빈 터까지 그려짐)이 같은 일을 1.6초에 한다.
- **가치를 먼저.** Duolingo는 가입 전에 연습부터 한다. 코드쇼퍼는 가입이 아예 없으니, 첫 화면에서 첫 질문까지 탭 수를 줄이는 게 다음 일이다.
- **아는 사람은 건너뛰게.** Duolingo 'Jump here' = 미리 짠 코스로 점검에 바로 내리기.
- **연습은 선택.** Alto 젠 모드, Monument Valley 첫 장. 코드쇼퍼의 'AI 써 보기'는 번호 밖에 둔다.
- **어려운 말은 그 자리에서.** CK3 겹 풀이, FH5 핵심어 강조.

### 2.5 고급스러움의 신호 (게임 쪽)

| 고급스럽게 보이는 것 | 싸 보이는 것 |
|---|---|
| 빛 한 벌 (GT7 Scapes) | 그림마다 빛이 다름 |
| 빼기 (Mini Metro, MV2 시작 화면) | 버튼·배지·알림이 한꺼번에 (FH5 일시정지 메뉴 비판) |
| 효과가 피드백에서 나옴 (NFS 인터뷰) | 반짝이·색종이 같은 장식 효과 |
| 소리가 행동의 화음 (Mini Metro) | 매번 같은 큰 효과음 |
| 넉넉한 접근성 설정 (FH5) | 모션을 끌 수 없음 |
| 정직한 남은 시간 (PS5) | "거의 다 왔어요!" |
| 화면마다 포스터감 (Monument Valley) | 모든 것을 같은 카드에 넣고 같은 그림자 |

---

## 3. 코드쇼퍼에 주는 권고

### 3.1 단계 이름 (게임 시선)

| 번호 | 단계 줄 이름 | 화면 제목 | 하는 일 한 줄 (제목 아래) | 지도·사건에 남는 세계관 |
|---|---|---|---|---|
| 연습 (선택, 번호 없음) | AI 써 보기 | AI 써 보기 | 10분 동안 내 AI로 웹페이지 한 장을 만들어 봐요. | 출발 옆 작은 연습 고리 |
| 1 | 만들 앱 | 만들 앱 정하기 | 만들고 싶은 앱을 고르고 몇 가지에 답해요. | 첫 질문 "어디로 모실까요?", 목적지 깃발과 빈 터 |
| 2 | 도구 | 도구 고르기 | 필요한 기능마다 맡길 도구를 하나씩 골라요. | 경유지 마디가 채워지고 길이 이어짐 |
| 3 | 길 확인 | 길 확인하기 | 고른 도구끼리 부딪치는 곳이 없는지 봐요. | 교통 정보(원활·서행·막힘), 버튼 [출발하기] |
| 4 | 설계도 | 설계도 받기 | 내 AI에게 줄 설계도와 영수증을 받아요. | 장면 "도착했습니다. 요금은 0원입니다." |

- **왜 '만들 앱 정하기'인가.** 게임은 단계 이름에 플레이어가 하는 일을 쓰고, 비유는 세계(지도·장면)가 보인다. 첫 질문은 그대로 "어디로 모실까요?"로 두고 바로 위 제목이 "만들 앱 정하기"면, 손님은 '목적지 = 만들 앱'이라는 짝을 이 자리에서 한 번에 배운다. 모빌리티 보고서의 '목적지 정하기'도 문법 시험은 통과한다. 소유자가 '목적지'를 추상적이라고 했으므로 이 보고서는 '만들 앱 정하기'를 먼저 권한다.
- **'길 확인하기'는 그대로 둔다.** 이 화면에는 길이 실제로 그려져 있고 교통 색이 덮인다. 그래서 '길'이 비유가 아니라 눈앞의 그림이다. 버튼 [출발하기]와도 이어진다. 더 쉬운 말이 필요하면 '궁합 보기'("도구끼리 궁합이 맞는지 봐요")를 후보로 둔다. 다만 점(사주)이 떠오를 수 있어 둘째 후보다.
- **'충돌 확인'은 쓰지 않는다.** 탈것 세계에서 '충돌'은 교통사고로 읽힌다.
- **넷으로 센다.** 단계 줄과 낭독은 "4단계 중 2단계"다. 연습은 본선 왼쪽의 작은 고리로 그리고, 건너뛰면 점선으로 남긴다(지금 CONCEPT 5.8과 같음). 세차장 카드 실험이 보여 주듯 진행은 정직하게 세야 힘이 된다.
- **보이는 모양.** 360px에서는 접힌 단계 줄 "2/4 · 도구 고르기" + 4칸 막대(높이 4px, 끝 둥글게, 채움 #0082FA). 막대는 꾸밈이고 뜻은 글 "2/4"가 전한다(WCAG 1.4.11은 글이 맡으므로 막대 대비에 걸리지 않음). 768px 이상에서는 짧은 이름 넷과 연습 고리가 다 보인다.
- **정하는 법.** 사람 개입 없이 위 권고로 정해 `DECISIONS.md`에 적는다. 관찰 시험(`docs/OBSERVATION.md`, T22 준비)에서 5명에게 단계 줄만 보여 주고 "여기서 무엇을 할 것 같아요?"를 묻는다. 4명 이상이 맞히지 못한 이름은 둘째 후보로 바꾼다.

### 3.2 가져올 패턴과 모션 명세

길이는 `src/styles/tokens.css`의 지금 토큰을 쓴다. 새로 필요한 것은 곡선 토큰 넷뿐이다.

| 새 곡선 토큰 | 값 | 쓰임 | 근거 |
|---|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | 들어오기, 내려앉기, 괄호 | Uber Base 감속 곡선 (mobility.md [원문]) |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | 지도 확대·기울기, 색 넘어가기 | Uber Base 잇는 곡선 |
| `--ease-drive` | `cubic-bezier(0.45, 0, 0.25, 1)` | 차 이동: 천천히 출발 → 달림 → 부드럽게 섬 | 우리가 정한 값 (실제 차의 가속·감속 흉내) |
| `--ease-pop` | `linear(0, 0.28 10%, 0.72 25%, 1.04 42%, 1.08 52%, 1.03 66%, 0.995 82%, 1)` | 마디 생기기·채우기 (8% 넘쳤다 돌아옴) | M3 Expressive의 스프링 방향, `linear()` 지원 브라우저만. 아니면 `@supports`로 `--ease-out` |

| # | 패턴 | 출처 | 코드쇼퍼 자리 | 움직임 | 길이·곡선 | 동작 줄이기 |
|---|---|---|---|---|---|---|
| 1 | 다음 할 일 하나만 빛남 | Duolingo 길 | 지금 마디의 고리 | 들어올 때 고리가 한 번 퍼짐(scale 1→1.6, opacity 0.5→0). 반복 없음 | 600ms, `--ease-out`, 1회 | 정지한 3px 고리 |
| 2 | 답 하나 = 지도 변화 하나 | Mini Motorways | S2 | 마디가 scale 0→1.08→1로 생김, 길이 이어 그려짐 | `--dur-pop` 300ms `--ease-pop` + `--dur-draw` 400ms | 150ms 페이드 |
| 3 | 고르면 괄호가 물고 길이 이어짐 | Mini Metro + 로고 | S3 | 괄호 `< >`가 바깥 6px에서 제자리로, 마디가 남색으로 채워지고 점선이 실선으로 | 200ms `--ease-out` → `--dur-pop` → `--dur-draw` (겹쳐서 900ms 안) | 괄호·채움이 바로 보임 |
| 4 | 달려서 다음 단계로 | Mario Kart World | S7 (단계 마침) | 차가 마친 단계의 마지막 마디에서 다음 단계 첫 자리로 한 칸 | `--dur-hop` 400ms 이하 `--ease-drive` | 차가 바로 그 자리 |
| 5 | 주행선 색 약속 | Forza 도움 주행선 | S4 | 길 위에 원활·서행·막힘 색이 덮임 | 300ms `--ease-in-out` | 색·그림·글만 바뀜 |
| 6 | 헤드라이트 훑기 | 로고 헤드라이트 | S4 다 풀림 | 짧은 하늘색 대시 하나가 출발에서 빈 터까지 같은 속도로 훑음 | `--dur-sweep` 700ms `linear` | 없음 (✓와 글만) |
| 7 | 밤 주행 불빛 | Waymo 탑승 화면 + 로고 | S5 | 차 앞 30° 부채꼴 빛 두 겹(#00B4FA 18%, 10%). 흐림 필터 없이 겹친 도형 | 차와 함께 | 없음 |
| 8 | 쇼룸 컷 | GT7 차고·브랜드 센트럴 | 도착의 '건네드릴 것' 머리 | 렌더 카드 scale 0.98→1, opacity 0→1 | `--dur-sheet` 320ms `--ease-out` | 150ms 페이드 |
| 9 | 숫자 굴리기 | 레이스 결과 화면 | 상태 한 줄, 영수증 '도구 비용 합계' | 자리마다 숫자 기둥이 돌아감(tabular-nums) | `--dur-roll` 600ms `--ease-out` | 바로 바뀜 |
| 10 | 보상을 숨기지 않기 | Duolingo 모션 원칙 | S5·S6 | 장면이 시작하는 0ms부터 [설계도 내려받기]·[복사]가 눌리고, 화면 어디를 눌러도 끝 상태로 | — | — |

모든 패턴 공통: `transform`·`opacity`·`stroke-dashoffset`만 움직인다. 한 번에 움직이는 길은 둘까지. 누르면 120ms 안에 무언가 바뀐다(NN/g 0.1초).

### 3.3 로고의 기사와 차를 쓰는 법

**원칙: 기사 흉상은 로고 묶음 밖으로 나오지 않는다.** 표정·자세를 바꾸거나 말풍선을 달지 않는다. 그러면 '사람 캐릭터 그림 금지'(꼭 지킬 것 12)의 예외가 로고 하나로 남는다. 나머지 자리에서는 로고를 조각내어 쓴다.

| 조각 | 어디에 | 명세 |
|---|---|---|
| **로고 묶음** (기사 + 차 + 괄호 + 글자 상표) | 홈 1024px 이상 패널 머리, 소개, 공유 미리 보기(OG), 영수증 위 머리 | 원본 그대로. 128px 아래로 줄이지 않는다(기사 얼굴·괄호가 뭉개짐) |
| **작은 마크** `<` 모자 `>` | 파비콘, 머리줄 32px, 기사 메시지 머리 24px | 모자 앞모습(남색 #001E5A 몸, 파란 띠 #0082FA 3px, 흰 배지 점)을 양쪽 괄호(획 2.5px, #0082FA)가 감싼다. 얼굴은 넣지 않는다. 코드(괄호)와 기사(모자)가 32px에서도 읽힌다 |
| **위에서 본 차** | 지도 위 단 하나의 '지금 위치' | 길이 36 × 폭 18(viewBox 단위, 24px 격자 1.5칸 × 0.75칸). 몸 #001E5A, 앞 유리 흰 1.5px 호, 앞 모서리에 헤드라이트 4×2 두 개 #00B4FA, 유리 지붕 너머로 **모자 윗면**: 지름 8 남색 원 + #0082FA 1.5px 띠 + 흰 점 2. 그림자는 지도 규칙대로 오른쪽 아래 2·3px, 흐림 없음. 낮 땅 #EDF1F5 위 남색 13.88:1 |
| **코드 괄호** | '골랐어요' 표시 (도구 줄, 질문 보기) | 8×16 괄호 두 개, 획 2px. 낮 #0082FA(흰 카드 3.77:1, 그림 기준 3:1 넘음), 밤 #4DB8FF(#0B1020 위 8.67:1). 글 "골랐어요"를 함께 둔다(색·모양만으로 뜻을 전하지 않음). 고를 것 칸마다 하나라서 한 화면에 6개를 넘지 않는다 |
| **헤드라이트 하늘색** #00B4FA | '빛'만: 지금 위치 고리, 내 길의 심, 다 풀림 훑기, 밤 주행 불빛 | 흰 바탕에서 2.36:1이라 **낮에는 혼자 쓰지 않는다.** 남색 위(6.68:1)나 남색 바깥선 안의 심으로만. 밤 바탕 #0B1020 위 8.03:1 |
| **그릴 띠** (차 앞 가로 하늘색 띠) | 접힌 단계 줄의 4칸 막대, 영수증 맨 위 가는 띠 | 높이 4px, 끝 둥글게 |
| **3/4 렌더 차** | 도착 '건네드릴 것'(빈 터 옆에 선 차 + 설계도 두루마리), 1024px 홈 패널 | D59 렌더 장치, 같은 빛 한 벌. **운전석은 짙은 유리로 가리고 사람을 만들지 않는다.** 360px에서 폭 328px → 656×369(2배) AVIF로 굽는다. 페이지 그림 예산 300KB 안에 든다 |

- **쇼룸 회전(360° 돌려 보기)은 하지 않는다.** Apple 제품 페이지식 그림 연속 재생은 보통 60~180장이다(CSS-Tricks). 한 장 25KB만 잡아도 1.5MB가 넘어 예산의 다섯 배다. 실행 중 WebGL도 쓰지 않는다(D26·D54). 각도는 많아야 둘(앞모습 1, 3/4 1)이다.
- **소유자에게 요청할 것** (`docs/HUMAN.md`에 추가): 로고 차와 같은 모양의 차 GLB(남색 몸, 하늘색 헤드라이트와 그릴 띠, 흰 앞 유리 테, 짙은 유리, 사람 없음). 오기 전까지는 위에서 본 차 SVG와 청사진 자리 표시로 낸다.
- **금색은 보상 색에서 뺀다.** 게임에서 금색은 트로피·등급 색이라 남발하면 바로 싸 보인다. 로고에는 금색이 없다. 보상의 색은 '빛'(하늘색)으로 하고, '요금 0원' 칩은 남색 알약에 흰 글자 + 하늘색 점으로 바꾸는 것을 브랜드 쪽 심사에 넘긴다. 영수증 도장(빨강)은 종이 세계 안이라 남긴다.

### 3.4 보상 박자표

| 크기 | 언제 | 화면 | 길이 | 소리 (켰을 때만) | 낭독 | 한 흐름에 |
|---|---|---|---|---|---|---|
| 0 손맛 | 모든 버튼 | 0.97로 들어감 | `--dur-tap` 120ms | 없음 | — | 무제한 |
| 1 답함 | 만들 앱 정하기의 답 | S2 | 700ms 이하 | 음 하나 60ms. 답할 때마다 음계를 한 칸 올림 | "지도에 저장이 생겼어요." | 10~17번 |
| 2 고름 | 도구 고르기 | S3 | 900ms 이하 | 두 음 120ms (그 칸의 순서 음 → 한 칸 위) | "Supabase를 골랐어요. 꼭 고를 것이 1개 남았어요." | 3~6번 |
| 3 마침 | 단계 마침, 다 풀림 | S7 + 차 한 칸, S4 훑기 | 900ms 이하 | 올라가는 두 음 240ms | "2단계 마침. 다음은 길 확인하기예요." | 3번 |
| 4 정점 | 도착 | S5 + S6 | **합쳐서 3초 이하** | 세 음 차임 600ms + 도장 '쿵' 90ms | "도착했습니다. 요금은 0원입니다." | 1번 |

- **S5와 S6을 겹친다.** 지금 CONCEPT 7절은 S5(2.8초)가 끝난 뒤 S6(0.95초)가 이어져 3.75초가 된다. 제안: S5의 2100ms에 시트가 올라오기 시작할 때 S6 출력도 함께 시작하고(700ms, 2100~2800ms), 도장(250ms)은 2750~3000ms에 찍는다. 합계 3.0초.
- **소리 가족 하나.** ZzFX 한 음색(삼각파)에서 높낮이만 바꾼다. 음계는 C장조 5음: C5 523Hz, D5 587Hz, E5 659Hz, G5 784Hz, A5 880Hz, C6 1047Hz. 어떤 순서로 눌러도 어긋나지 않는다(Mini Metro처럼 행동이 화음을 만든다). 전체 음량은 0.12 안팎으로 작게, 기본은 꺼짐. 소리만으로 뜻을 전하지 않는다.
- **진동은 없다.** iOS에서 안 되고 우회는 꼼수다. 안드로이드에서만 되는 기능을 따로 두면 기기마다 경험이 갈린다. BACKLOG에 둔다.

### 3.5 어려운 말 풀이 (게임 시선으로 더할 것)

지금 구현(`src/components/TermPopover.tsx`, D60): 끌어 고르면 고른 글 아래에 한 문장 풀이가 뜨고, 모르는 말이면 '사전에서 찾기'를 보인다. 게임에서 가져와 더할 것:

1. **보이는 표시 (FH5 핵심어 강조, Paradox의 파란 'game concepts').** 끌어 고르기는 아는 사람만 쓴다. 그래서 사전에 있는 말은 화면마다 **처음 나올 때만** 점선 밑줄을 긋는다: 1px 점선, `--link` 색, `text-underline-offset: 3px`. 한 화면에 5개까지. 밑줄 친 말은 눌러도 풀이가 뜨는 작은 단추다(키보드로 닿음. 화면마다 5개 이하라 탭 순서가 크게 늘지 않는다).
2. **겹 풀이 (CK3).** 풀이 문장 안의 어려운 말에도 밑줄을 긋는다. 누르면 같은 상자 안에서 다음 풀이로 바뀌고, 위에 길잡이 "API › API 키"와 [뒤로]가 생긴다. **2겹까지**만. 3겹부터는 [용어 카드 보기]로 넘긴다.
3. **처음 한 번 알림.** 밑줄이 처음 보이는 화면의 기사 메시지 한 번: "밑줄 친 말은 누르면 풀이가 나와요. 다른 말도 길게 눌러 골라 보세요."
4. **분량.** 풀이 한 문장 40자 안쪽 + 예시 한 줄 + [용어 카드 보기]. 지금 문장 규칙(`copy.md`)과 같다.
5. **모션.** 열림 160ms(opacity 0→1, translateY 4px→0, `--ease-out`), 닫힘 120ms. 동작 줄이기에서는 이동 없이 150ms 페이드.
6. **설정.** 설정 대화 상자에 '어려운 말 밑줄' 켜기·끄기(기본 켬). FH5 자막의 핵심어 강조가 켜고 끄는 설정인 것과 같다.
7. **하지 말 것.** 마우스를 올리기만 해도 뜨는 풀이(휴대폰에 없는 동작이고 글을 가린다), 한 문단에 밑줄 여러 개, 풀이 상자 안의 광고성 링크.

### 3.6 정직한 남은 시간 (PS5 방식)

- **처음에는 설계자가 정한 값.** 남은 질문 × 15초 + 남은 꼭 고를 것 × 45초 + 길 확인 1분. 1분 단위로 반올림해 "약 n분", 1분이 안 되면 "1분 안쪽". 이 계수는 추정이라고 `DECISIONS.md`에 적는다.
- **나중에 익명 집계로 고친다.** `/api/event`에 단계별 걸린 시간을 1분 단위 묶음으로만 보내고(사람·세션을 잇지 않음), 중앙값으로 계수를 고친다. 개인정보 안내에 한 줄을 더한다. 사람마다 맞추는 PS5식 개인화는 하지 않는다(브라우저 밖에 개인 기록을 두지 않는다).
- **초읽기·줄어드는 숫자 연출 금지.** 남은 개수가 실제로 줄 때만 숫자가 바뀐다.

### 3.7 하지 말 것 (점검표)

| 장치 | 게임 예 | 왜 안 되나 | 코드쇼퍼에서 대신 |
|---|---|---|---|
| 연속 출석·스트릭 | Duolingo | 잃을 것을 만든다 (Zagal: 시간 장치) | 지난 영수증 모음 |
| XP·리그·순위 | Duolingo, Forza | 남과 비교하게 한다 | 없음 |
| 하트·에너지 | Duolingo | 실수에 벌을 준다 | '모르겠어요'는 늘 안전한 쪽 |
| 룰렛·뽑기 | GT7 룰렛 티켓 | 확률 보상 | 없음 |
| 탈락·타이머 | Mario Kart 녹아웃 투어 | 시간 압박 | 없음 |
| 기한 있는 등급 | 카트라이더 PRO 90일 | 강등이 두려워 돌아오게 함 | 없음 |
| 출발 전 3-2-1 | 레이싱 게임 공통 | 3초를 억지로 기다리게 함 | [출발하기]를 누르면 바로 출발, 장면은 건너뛰기 |
| 마스코트·사람 안내역 | Duo, GT7 카페 주인 | 사람 그림 금지, 아이 같아 보임 | 기사 메시지(작은 마크 + 글) |
| 그래피티·셀 셰이딩·스피드 라인 | NFS Unbound | 움직일 때 읽기 어렵다 | 평면 지도 |
| 시끄러운 메뉴 | FH5 일시정지 메뉴 | 위계가 없다 | 한 화면 한 일 |
| 추천만 크게, 다른 길은 작게 | 법: 잘못된 계층구조 | 한 쪽으로 몰아간다 | [추천대로 정하기]를 더한다면 '다른 후보 보기'도 같은 줄에 48px |
| '있으면 좋은 것'을 미리 골라 둠 | 법: 특정옵션 사전선택 | 동의 없이 담는다 | 추천 표시는 꼭 고를 것에만. 있으면 좋은 것은 비워 둔다. 미리 골라 둔다면 "추천을 골라 뒀어요. 바꿀 수 있어요."라고 밝힌다 |
| 공유·재방문 권유를 거듭 띄움 | 법: 반복간섭 | 결정한 뒤에도 조른다 | 권유는 한 번, 닫으면 다시 띄우지 않는다 |
| 미리 찍어 둔 진행 칸 | 세차장 카드 실험 | 정직하지 않다 | 실제 남은 일만 센다 |
| 헷갈리는 버튼 자리 | FTC 대 Epic | 원치 않는 행동을 하게 한다 | 주 버튼은 늘 아래 막대 같은 자리, 지우기는 확인 한 번 |

### 3.8 우선순위 (지금 작업에 붙이기)

| 급 | 할 일 | 붙일 작업 |
|---|---|---|
| P0 | 단계 이름과 '4단계 + 연습' 세기를 정해 `DECISIONS.md`에 적고 CONCEPT 2·3절, `ko.ts`, 단계 줄·상태 한 줄 고치기 | v2 설계서 → T24식 말 바꾸기 |
| P0 | 위에서 본 차 SVG(로고 차, 모자 윗면), 작은 마크 `<` 모자 `>` | T28 지도 표지 묶음, 브랜드 |
| P0 | 하늘색 = 빛 규칙과 금색 빼기를 토큰에 반영(대비 검사 두 모드) | T26 토큰 고침 |
| P0 | S5와 S6을 겹쳐 합계 3초 이하 | T31 장면 |
| P1 | 괄호 '골랐어요' 표시, `--ease-*` 곡선 토큰 넷, 단계 마침 때 차 한 칸 | T30·T31 |
| P1 | 헤드라이트 훑기, 밤 주행 불빛, 화음 소리(C장조 5음) | T31 |
| P1 | 어려운 말 풀이: 점선 밑줄 5개, 겹 풀이 2겹, 처음 한 번 알림, 설정 켜기·끄기 | 풀이 기능(D60) 이어서 |
| P2 | 쇼룸 렌더(소유자 GLB 요청 → `npm run art`) | T33 이어서, HUMAN 요청 |
| P2 | 남은 시간 계수를 익명 집계로 고치기 | T18 집계 Worker 다음 |
| P2 | 홈에서 첫 질문(앱 종류)을 바로 고르는 실험 (Duolingo·Uber처럼 첫 행동까지 탭 하나) | T29 이후 관찰 시험 |
| 보류 | 진동 | BACKLOG |

---

## 4. 출처

**Duolingo**
- Duolingo 블로그, 새 홈 화면(길) 설계: https://blog.duolingo.com/new-duolingo-home-screen-design/
- Duolingo 블로그, 효과 연구 결과: https://blog.duolingo.com/results-duolingo-efficacy-studies
- NBC News, Luis von Ahn 인터뷰(2022): https://www.nbcnews.com/tech/tech-news/duolingos-update-redesign-luis-von-ahn-interview-rcna44655
- UX Collective, 길 개편 비판: https://uxdesign.cc/down-the-wrong-path-the-disaster-of-the-latest-duolingo-ui-update-a4cdd1e6ea1c
- Duolingo 블로그, Shape language: https://blog.duolingo.com/shape-language-duolingos-art-style/
- Duolingo 블로그, 캐릭터 입 모양(Rive 상태 기계): https://blog.duolingo.com/world-character-visemes
- Duolingo 디자인, 색: https://design.duolingo.com/identity/color
- 섹션·단원 이름 (팬 자료): https://duolingodata.com/dat/arfen46.html , https://lingoly.io/units-each-duolingo-language/
- Jump here: https://lingoly.io/duolingo-jump-here/
- TechCrunch, Hobbes 인수(2024-07-09): https://techcrunch.com/2024/07/09/duolingo-acquires-detroit-based-design-studio-hobbes
- Pulse 2.0, Animade 인수(2026): https://pulse2.com/duolingo-acquires-animade-to-expand-motion-design-and-creative-capabilities
- 모션 원칙 다섯 (디자인 팀원 글): https://co.linkedin.com/in/felipe-quintero-a3487b167
- 가입 전 가치 (Appcues): https://goodux.appcues.com/blog/duolingo-user-onboarding · growth.design 사례 목록: https://echai.ventures/startingup/from/growth-design

**Mini Metro · Mini Motorways**
- SUPERJUMP, 게임 잼에서 모바일 고전으로: https://www.superjumpmagazine.com/from-game-jam-idea-to-mobile-classic/
- Indie-o-rama, Robert Curry 인터뷰: https://www.indieorama.com/mini-metro-and-robert-curry-the-minimalism-was-one-of-the-things-that-made-the-game-hard-to-make
- GDC 2017 'When Less Is More': https://gdconf.com/news/attend-gdc-2017-and-learn-the-value-of-less-is-more-from-a-mini-metro-dev
- GDC Vault, Miniverse 강연: https://gdcvault.com/play/1029197/Independent-Games-Summit-Expanding-the
- Designing Sound, Disasterpeace 인터뷰(2016): https://designingsound.org/2016/02/18/the-programmed-music-of-mini-metro-interview-with-rich-vreeland-disasterpeace
- Dinosaur Polo Club, Mini Motorways 컨셉 아트(2023): https://dinopoloclub.com/2023/07/23/behind-the-scenes-concepting-mini-motorways/
- Twinfinite 인터뷰(2021): https://twinfinite.net/2021/07/mini-motorways-interview-dinosaur-polo-club-talks-aesthetics-traffic-their-name/
- Gfinity, The making of Mini Motorways: https://www.Gfinityesports.Com/features/the-making-of-mini-motorways-steam/

**Gran Turismo 7**
- GTPlanet, 모두 여는 법(월드맵·메뉴북): https://www.gtplanet.net/gt7-how-to-unlock-everything-20220305/
- GTPlanet, State of Play 정리: https://www.gtplanet.net/gt7-state-of-play-everything-new-20220202/
- TheSixthAxis, Extra Menus: https://www.thesixthaxis.com/2022/06/23/gran-turismo-7-extra-menus-guide-what-are-they-and-how-to-complete-them/
- Diamond Lobby, B 라이선스: https://diamondlobby.com/gran-turismo-7/how-to-get-gold-in-all-b-license-tests/
- Samurai Gamers, B 라이선스 기준 시간: https://samurai-gamers.com/?p=238128
- PlayStation, GT7과 PS5(Scapes): https://playstation.com/en-hk/editorial/how-gran-turismo-7-harnesses-the-power-of-ps5
- GTPlanet 포럼, 메뉴북과 라이선스: https://www.gtplanet.net/forum/threads/menu-books-and-licenses.430802/

**Forza Horizon**
- Xbox Wire, FH5 접근성(2021-11-04): https://news.xbox.com/en-us/2021/11/04/gaming-for-everyone-the-accessibility-features-of-forza-horizon-5/
- Can I Play That, FH5 인터뷰: https://caniplaythat.com/2021/11/04/forza-horizon-5-accessibility-interview/
- GTPlanet, FH6 리뷰(2026-05-14): https://www.gtplanet.net/forza-horizon-6-review-ga-ii-desu-ne-20260514/
- GTPlanet 포럼, FH5 메뉴 비판: https://www.gtplanet.net/forum/threads/forza-horizon-5-general-discussion.399481/page-8
- 도움 주행선 색: https://www.ludo.guide/guide/forza-motorsport/racing-line , https://www.ludo.guide/guide/forza-horizon-6/racing-line

**Mario Kart · NFS · Monument Valley · Alto · Pokémon GO**
- Nintendo 고객지원, Mario Kart World 멀티 시작: https://www.nintendo.com/au/support/articles/how-to-start-a-multiplayer-game-mario-kart-world
- Sportskeeda, 그랑프리·녹아웃 투어: https://www.sportskeeda.com/esports/what-is-grand-prix-mario-kart-world , https://www.sportskeeda.com/esports/what-knockout-tour-mario-kart-world
- MarioWiki, 컵 이름: https://www.mariowiki.com/Leaf_Cup , https://www.mariowiki.com/Special_Cup
- Jalopnik, NFS Unbound 그림체: https://jalopnik.com/heres-how-need-for-speed-unbounds-radical-art-style-cam-1849832310
- TrueTrophies, NFS Unbound 그림체: https://i1.truetrophies.com/n22035/need-for-speed-unbound-artstyle
- Webby Awards, ustwo Q&A: https://www.webbyawards.com/qa-ustwo-games-creators-monument-valley-ii/
- TidBITS, Monument Valley: https://tidbits.com/2014/04/25/funbits-monument-valley-for-iphone-and-ipad/
- UX Collective, Monument Valley 2: https://uxdesign.cc/beyond-beauty-best-usability-practices-from-monument-valley-2-fca37ef7c498
- Pocket Gamer 공략(장 이름): https://www.pocketgamer.com/monument-valley/how-to-finish-monument-valley-the-complete-walkthrough-to-ustwos-escher-like-adv/
- App Store, Alto's Odyssey: https://apps.apple.com/app/1182456409
- GamesBeat, Pokémon GO 개발 중 바뀐 셋: https://gamesbeat.com/?p=135805
- Pokémon GO, 2024 시각 시험: https://pokemongo.com/news/visual-testing-2024
- Yahoo, Pokémon GO 개편: https://au.news.yahoo.com/pok-mon-getting-major-overhaul-104343833.html

**PS5 · Apple · Paradox**
- GameSpot, PS5 활동 추정: https://gamespot.com/articles/how-ps5-gives-you-those-game-activity-estimates/1100-6494080/
- VGC, Mike Daly: https://www.videogameschronicle.com/news/ratchet-dev-reveals-ps5s-activity-estimates-are-based-on-real-player-data
- MacRumors, iOS 26 게임 앱: https://www.macrumors.com/guide/ios-26-games-app
- OSNews, NN/g Liquid Glass 평가 소개: https://www.osnews.com/story/143522/liquid-glass-is-cracked-and-usability-suffers-in-ios-26/
- Paradox Tinto Talks #77 (2025-08-20): https://admin-forum.paradoxplaza.com/forum/developer-diary/tinto-talks-77-20th-of-august-2025.1856053
- PCGamesN, 겹 풀이: https://www.pcgamesn.com/victoria-3/nested-tooltip-system
- wccftech, CK3 콘솔 풀이 모드: https://wccftech.com/crusader-kings-iii-console-ps5-xbox-series-x-impressions/amp/
- WHATWG HTML 이슈 9776: https://github.com/whatwg/html/issues/9776

**한국**
- 디스이즈게임 / 게임메카, 카트라이더: 드리프트 라이선스: https://www.thisisgame.com/articles/165705 , https://www.gamemeca.com/view.php?gid=63517
- KB Think, 운전면허 절차: https://kbthink.com/life/card/driving-license.html
- 노컷뉴스, 다크패턴 규제: https://www.nocutnews.co.kr/news/6456984
- 법무법인 율촌 뉴스레터: https://www.yulchon.com/ko/resources/publications/newsletter-view/41332/page.do
- 아임웹, 다크패턴 6유형: https://imweb.me/blog?idx=496

**연구·지침·기술**
- NN/g, 애니메이션 길이: https://nngroup.com/articles/animation-duration
- NN/g, Peak–End Rule: https://www.nngroup.com/videos/peak-end-rule/
- Laws of UX, Peak-End Rule: https://lawsofux.com/peak-end-rule/
- Coglode, 만들어 준 진행(Nunes & Drèze 2006): https://www.coglode.com/nuggets/endowed-progress-effect
- arXiv 2412.05039, 모바일 게임의 어두운 장치: https://arxiv.org/pdf/2412.05039
- Deceptive Patterns, GaaS 게임 분류: https://deceptive.design/articles/designing-for-monetization-a-taxonomy-of-dark-patterns-in-top-grossing-gaas-video-games
- FTC, Epic 명령: https://www.ftc.gov/node/80648 · VGC: https://videogameschronicle.com/news/epic-ordered-to-pay-245m-to-consumers-over-unwanted-fornite-purchases
- Dezeen, Material 3 Expressive(2025-05-28): https://www.dezeen.com/2025/05/28/google-ushers-in-age-of-expressive-interfaces-with-material-design-update/amp/
- 게임 접근성 지침(기본): https://gameaccessibilityguidelines.com/basic/
- Super Mario Bros. 1-1 해설: https://blakecrosley.com/blog/design-philosophy-shigeru-miyamoto
- UI 소리: https://violetrecording.com/how-to-design-ui-sounds/ , https://bugnet.io/blog/ui-sound-design-for-indie-games , https://www.audiokinetic.com/en/blog/approaching-ui-audio-ui-design-perspective-1
- 웹 진동: https://github.com/ionic-team/ionic-framework/issues/29942 , https://azukiazusa.dev/en/blog/ios-safari-web-haptics , https://bugnet.io/blog/fix-web-game-vibrate-api-not-available-ios-safari
- Chrome, `linear()` 곡선: https://developer.chrome.com/docs/css-ui/css-linear-easing-function
- CSS-Tricks, Apple식 그림 연속 재생: https://css-tricks.com/?p=308477
- View Transitions 지원: https://devtoolbox.dedyn.io/blog/css-view-transitions-complete-guide , https://simonwillison.net/2026/Feb/15/interop-2026/
