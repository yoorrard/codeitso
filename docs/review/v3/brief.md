# v3 설계서: 처음부터 공개한 뒤까지 모시는 코드쇼퍼 (docs/review/v3/brief.md)

> 쓴 날 2026-10-14 · 역할: 제품·디자인 총괄 · **2판**(같은 날 출시 검토 비평 46개 항목 반영, 받은 것·고친 것·뺀 것은 맨 끝 '비평 기록').
> 같은 폴더의 조사 여섯을 하나로 묶었다: `design.md`(디자인 정하기), `aitools.md`(AI 도구 안내·AI 설정 파일), `services.md`(가입·배포·키 안내), `input.md`(직접 쓰기), `launch.md`(출시 점검), `companions.md`(전 과정 구조).
> **이 문서가 짝 문서와 다르면 이 문서를 따른다.** 짝 문서는 세부 값(대비 표, 명령 원문, 문구 견본, 골든 입력)의 정본으로 남는다. 어긋난 곳을 어떻게 정했는지는 3.9절에 모았다.
> 문서 순위(PRD > CONCEPT > …)는 그대로다. 그래서 묶음마다 **시작할 때** 이 문서의 결정을 `docs/DECISIONS.md`(D73부터, 14절)와 `docs/CONCEPT.md`·`docs/PRD.md`에 먼저 옮긴다.
> 이미 끝난 것:
> - 소유자 요청 (1): 파일을 `code-chauffeur/` 폴더 밖 저장소 맨 위로 옮겼다(PR #1, 커밋 3916f0d). `origin/main` 맨 위에 `package.json`·`src/`·`data/`가 있다 [잼].
> - 소유자 요청 (3): 비공개 저장소, MIT·CC BY 철회, 모든 권리 보유(D72, `LICENSE`, `package.json` `UNLICENSED`). 저장소를 실제로 비공개로 돌리는 일은 소유자 몫이다(H12).
>
> 표시: **[원문]** 공식 페이지를 직접 읽음 · **[저장소]** 공식 문서 저장소 원본 · **[레지스트리]** npm·nodejs.org 조회 · **[잼]** 이 저장소에서 직접 재거나 실행 · **[검색 요약]** 검색 결과 요약만 봄(원문을 열지 못함) · **[기억·미확인]** 확인하지 못함. 확인한 날은 모두 **2026-10-14**다.

---

## 0. 한눈에: 결정 열여덟 줄

1. **코드쇼퍼는 '설계도를 주는 곳'에서 '처음부터 공개한 뒤까지 모시는 곳'이 된다.** 그래도 AI를 부르지 않고, 코드를 만들지 않고, 계정을 받지 않는다.
2. **단계는 다섯 그대로다(D64).** 디자인·준비·만들기를 새 번호 단계로 세우지 않는다. 주소도 하나도 바꾸지 않는다.
3. **4단계 칸은 '영수증 · 설계도 · 다음 할 일 · AI에게 할 말'.** 지금의 '용어' 칸은 '다음 할 일' 안의 한 줄로 들어간다. **주 버튼은 지금처럼 아래 막대에 하나뿐이고, 고른 AI 종류에 따라 바뀐다**(칸 안에는 주 버튼을 두지 않는다, UX.md 3.4).
4. **둘러보는 곳에 둘을 더한다.** 만들기 안내 `/guides`(때 다섯, 갈래 열하나)와 디자인 둘러보기 `/looks`다. 머리줄(로고 · 사전 · 설정)은 바꾸지 않는다.
5. **때 이름 다섯을 한 벌로 쓴다:** 오늘 신청해 둘 것 · 만들기 전에 · 만들면서 · 공개하기 · 공개한 뒤. 만들기 안내의 머리, 다음 할 일의 묶음, 자료의 `when`이 모두 이 이름이다. 배포는 화면에서 '공개하기'로만 쓰고, '배포'는 사전에서 풀이한다.
6. **디자인 정하기는 느낌 타일 하나로 끝나는 길이 기본이다.** 더 정할 사람만 시트를 연다(줄 12개, 글 버튼 "색·글꼴 더 정하기"). 느낌은 여섯이고 대비는 엔진이 지킨다(견본은 4.6:1 이상으로 여유를 둔다). 설계도 6번은 11묶음 + CSS 값으로 커지고, DESIGN.md를 따로 받는다.
7. **고르는 곳마다 '직접 쓰기'가 있다.** 사이트는 AI 없이 낱말표로 가까운 보기를 보일 뿐이고, 고르는 것은 이용자다. 쓴 말은 설계도에 "내 말 그대로"로 들어가고, 영수증 링크와 집계에는 들어가지 않는다. 보기만 있는 줄(밝기·모서리 등)에도 '바라는 점'으로 가는 길을 단다.
8. **AI 고르기를 넓힌다.** '어떤 AI로 만드나요?'에 '웹에서 만드는 도구'를 더하고, 그 뒤에 '쓰는 AI' 질문 하나를 둔다(종류에 맞는 이름 + 직접 쓰기). 코딩 에이전트는 세 무리다: **앱 안에서(터미널 없이)** · 편집기 안 · 터미널. 웹에서 만드는 도구를 고르면 공개는 '빌더의 게시 기능'으로 계산한다(P0 최소안). 컴퓨터 종류(윈도우·맥)는 질문이 아니라 설정 값이다.
9. **만들기 안내 자료는 `data/guides.json` 하나다.** 명령과 메뉴 경로는 공식 문서와 공식 저장소에서 그대로 옮긴 것만 쓴다. 원문을 못 읽은 곳은 '공식 안내 열기' 카드로만 낸다. 설치·첫 실행만이 아니라 **업데이트·훅·MCP**까지 같은 규칙으로 싣는다. 가입 카드에는 **나이 조건** 한 줄이 붙는다.
10. **'최신'은 날짜로 지킨다.** 안내마다 `checkedAt`과 `reviewEveryDays`를 둔다. 화면에 확인한 날을 보이고, 기한이 지나면 알리고, 기한의 두 배가 지나면 명령을 감추고 카드로 바꾼다. 매주 CI가 기한 지난 안내와 새 버전을 이슈로 올린다.
11. **AI 설정 파일은 AGENTS.md가 원본이다.** 도구마다 AGENTS.md를 가리키는 얇은 연결 파일을 더한다. 설계도 전문은 가져오기(`@`)로 싣지 않고, 단계마다 읽게 한다. 건네는 첫 방법은 **묶음 파일 하나 + 짧은 메시지**다. 기본 훅·MCP는 넣지 않는다(맥·윈도우 알림 훅 하나만 선택).
12. **영수증의 숫자(준비물 n개 등)는 바꾸지 않는다.** 늘어난 할 일은 '다음 할 일'이 맡는다. 기존 골든 23개의 기대값은 그대로 두고, 새 골든 8개(case-24~31)를 더한다.
13. **출시를 막는 것(P0)은 스물이다.** 사람 몫은 다섯이다: 허용 주소 더하기(H14, 5분, 가장 먼저), 도구 사실 확인(C01), 법 문구·연락처, 사이트 주소, 실기기 시험. 나머지는 에이전트가 한다. C01은 에이전트가 증거를 미리 채워 사람은 확인만 한다.
14. **이용 허락을 둘로 나눈다.** 사이트와 자료는 모든 권리를 보유한다. 이용자가 받은 설계도·AI 설정 파일·DESIGN.md·CSS 값은 자기 앱에 자유롭게 쓴다. 이 내용을 이용 안내에 한 묶음으로 적는다. 옛 MIT·CC BY는 2026-10-14 이후 판에만 적용하지 않는다(이미 받은 사본은 그때 조건).
15. **호스팅은 소유자가 고른다.** 기본은 D72 그대로 Cloudflare Workers다. 빌드는 `PUBLIC_BASE_PATH`·`PUBLIC_HOST`로 하위 주소(GitHub Pages 프로젝트 사이트 같은 곳)에도 낼 수 있게 한다.
16. **예산을 먼저 덜고 얹는다.** v3를 얹기 전에 단계 화면 JS를 130KB 이하로 줄인다(지금 129.5~135.6KB / 140KB). 새 기능은 모두 누를 때 싣는 지연 묶음이다. `/guides`는 엔진을 싣지 않는다.
17. **집계는 이벤트 다섯 그대로, `card_copy`의 구간만 늘린다.** 늘리지 않으면 새 장의 복사가 조용히 버려진다(`parseEvent`가 null) [잼].
18. **작업 묶음은 여덟이다(T35~T42).** 맨 끝 T42가 실제 브라우저로 실측하는 검수다.

---

## 1. 컨셉

**한 문단.** 코드쇼퍼 v3는 바이브코딩의 처음부터 공개한 뒤까지 곁에 있는 기사다. 손님은 여전히 운전하지 않는다. 사이트 안에서는 다섯 단계로 세 가지를 정한다: 무엇을 만들지, 어떤 도구로 만들지, 어떤 모습으로 만들지. 모습은 1단계의 느낌 질문에서 정하고, 원하면 색·글꼴까지 더 정한다. 도착하면 설계도와 함께 두 가지를 더 받는다. 내 AI가 바로 읽을 **AI 설정 파일**과 화면 모습을 값으로 적은 **DESIGN.md**다. 사이트 밖의 일은 4단계의 **다음 할 일**과 둘러보는 곳의 **만들기 안내**가 공식 문서대로, 확인한 날짜를 달고 이끈다: AI 도구 설치, 계정 만들기, 키 받기, 한 단계씩 만들기, 공개하기, 공개한 뒤 돌보기. 고르는 곳마다 **직접 쓰기**가 있어 보기에 없는 바람도 설계도에 그대로 실린다. 사이트는 여전히 AI를 부르지 않는다. 직접 쓴 말은 낱말표로 가까운 보기를 보여 줄 뿐이고, 고르는 것은 손님이다. 해석과 코드는 손님의 AI가 맡는다. 요금은 0원이고, 영수증은 그대로다.

| v2에서 그대로 남는 것 | v3에서 바뀌거나 더해지는 것 |
|---|---|
| 다섯 단계와 주소, 단계 줄, 상태 한 줄, '약 n분'(D64) | 1단계: 모든 질문에 직접 쓰기, 느낌 여섯 + 디자인 정하기 시트, '쓰는 AI' 질문 |
| 로고, 색 문법(남색 내 것 · 파랑 지금 · 청록 빛), 부품, 지도, 장면 S1~S9 | 2단계: 목록에 없는 도구 쓰기, 꼬리표(승인 기다림 · 결제 카드 필요) |
| 영수증과 그 숫자, 영수증 링크 형식(`v: 1`), 지난 영수증 30장 | 3단계: 직접 쓴 도구는 처음부터 서행, '바꾸기' 끝에 목록에 없는 도구 쓰기 길 |
| 설계도 12개 항목(R-35), AI를 부르지 않음(R-01), 이벤트 다섯(R-60, `card_copy` 구간만 늘림), 아래 막대의 주 버튼 하나 | 4단계: 칸 하나 바뀜('용어' → '다음 할 일'), 설계도 안 항목들이 커짐, DESIGN.md·AI 설정 파일, 주 버튼이 AI 종류를 따름 |
| 어려운 말 풀이 2판, 사전, 도구 모음, 용어 카드 | 둘러보는 곳: 만들기 안내, 디자인 둘러보기, 자주 묻는 것, 접근성 안내, 바뀐 점 |
| 쿠키·추적·회원가입 없음, 상태는 브라우저에만 | 출시 준비: 공유 미리 보기, 사이트맵, 앱 안 브라우저, 의견 보내기, 설정, 인쇄 |

---

## 2. 소유자 요청과 맡는 곳

| 요청 | 맡는 곳 | 상태 |
|---|---|---|
| (1) `code-chauffeur` 폴더에서 꺼내 GitHub Pages 404 풀기 | 폴더는 이미 꺼냈다(PR #1). Pages는 9.3·9.5절: 비공개 저장소이면 무료 요금제에서 Pages를 쓸 수 없고, Astro 원본은 빌드가 있어야 열린다 | 끝 + 소유자 선택(H13) |
| (2) 디자인 전부(화면·부품·색·글꼴·테마)를 한곳에서 | 4절, T38 | 이 문서 |
| (3) 비공개, MIT 철회 | D72 + 9.1절 문구 정리(바닥글·소개·README·결과물 이용 허락) | 끝 + 문구는 T35·T41 |
| (4) 설치·가입·설정·스킬·규칙·훅까지 전 과정 안내 | 5절(만들기 안내·다음 할 일: 설치 · 첫 실행 · **업데이트 · 훅 · MCP** · 가입 나이), 6절(AI 설정 파일), 7.7절(터미널 없는 에이전트 무리), T39·T40 | 이 문서 |
| (5) 고르는 곳마다 직접 쓰기 | 7절(디자인 시트의 보기만 있는 줄 · 3단계 막힌 곳 · 쓰는 AI를 안 정했을 때까지), T36·T37·T38·T40 | 이 문서 |
| (6) 놓친 것까지 출시 완성도로 | 8절, T35·T41 | 이 문서 |
| (7) 직접 브라우저로 실측 검수 | T42(10절): Claude in Chrome·내장 브라우저·컴퓨터 사용이 붙어 있으면 그것으로, 없으면 헤드리스 Chromium + 사람 몫 표(H19) | 이 문서 |

**참고 사이트 두 곳은 끝내 열지 못했다.**
- https://vibe-design-one.vercel.app/ : 이번 세션의 WebFetch가 `getaddrinfo ENOTFOUND`로 실패했다 [잼]. 정확한 이름 검색도 0건이다 [검색 요약].
- lucianlabs.dev : 검색 결과가 없다. 비슷한 이름은 GitHub 조직 'Lucian Labs'뿐인데, 그 조직이 적은 주소는 `lucianlabs.ca`다 [검색 요약].
- **주의:** 분명히 있는 주소도 같은 식으로 막혔다: `firebase.google.com`은 WebFetch `getaddrinfo ENOTFOUND`, `docs.github.com`은 비평 세션에서 같은 오류, 2판을 쓰며 `curl`로 다시 열었을 때 응답 코드 000 [잼, 2026-10-14]. 그러니 이 오류는 '주소가 없다'가 아니라 '이 환경의 허용 목록 밖'일 수 있다. 두 주소를 H14 허용 목록에 넣는다.
- 단서 하나 [검색 요약, 제작사 소개 글만]: 'VibeDesigner'라는 도구가 페이지 종류 10 × 스타일 18 × 색 조합 106으로 Cursor·Bolt·Lovable·v0에 넣을 디자인 명세와 CSS 값을 만든다고 소개한다(https://www.hunted.space/product/vibedesigner). vibe-design-one.vercel.app과 같은 곳인지는 확인하지 못했다. 꼴(스타일 고르기 → AI에 붙여 넣을 명세)은 4절과 같다.
- 두 곳은 H15로 소유자에게 넘긴다. 그동안 '스타일 모음 + AI에게 줄 프롬프트' 꼴은 4절(느낌 여섯 + 설계도 6번 + DESIGN.md)이 맡는다.

---

## 3. 정보 구조

### 3.1 단계: 다섯 그대로

| 후보 | 좋은 점 | 걸리는 점 | 판정 |
|---|---|---|---|
| **디자인 정하기**를 번호 단계로(1과 2 사이) | 디자인이 눈에 띈다 | 디자인은 도구 추천·막힌 곳 계산과 상관없다. 타일 하나로 끝나는 길이 단계 하나보다 빠르다. 단계 줄·상태 한 줄·주소·영수증 링크가 다 바뀌어 이미 나간 링크가 깨진다 | **아니요.** 1단계 느낌 질문 + 시트 + 4단계에서 다시 열기 + `/looks` |
| **준비하기**를 1 앞에 | 설치를 먼저 끝낸다 | 무엇을 깔지는 고른 AI·도구가 정한다. 앞에 두면 필요 없는 것까지 시킨다 | **아니요.** '다음 할 일'의 앞 묶음 둘(오늘 신청해 둘 것 · 만들기 전에) |
| **내 AI와 만들기**를 다섯째로 | '전 과정'이 단계 줄에 보인다 | 사이트가 확인할 수 없는 일을 단계로 센다. 며칠씩 '지금'에 멈춘다. '도착했습니다. 요금은 0원입니다.'의 끝맺음이 흐려진다 | **아니요.** '다음 할 일' 칸 + 홈 '이렇게 가요' 다섯째 줄(번호 없음, 점선 원) |

원칙 셋(`companions.md` 6.1):
- 판단은 규칙이 하고, 실행은 내 AI가 한다.
- 사이트 안의 진행은 다섯 단계가 센다. 사이트 밖의 진행은 '다음 할 일'의 확인란이 센다.
- 길도 하나, 자료도 하나다. '다음 할 일'의 줄과 만들기 안내의 안내는 같은 `data/guides.json`에서 나온다.

### 3.2 단계마다 바뀌는 것

| 자리 | 더하거나 바꾸는 것 | 절 |
|---|---|---|
| 내 AI 써 보기 `/test-drive` | 맨 앞 칩 "어떤 AI 채팅을 쓰세요?": Claude · ChatGPT · Gemini · 다른 AI(직접 쓰기) · 아직 없어요. '아직 없어요'는 공식 가입 안내 카드 셋(카드마다 나이 조건 한 줄, 5.2절 `minAge`). 고른 값은 1단계 '쓰는 AI'의 기본값. 연습 3 끝에 "내 컴퓨터에서 해 보려면: 만들기 안내 › 만들기 전에" 한 줄 | 5.6 |
| 1 만들 앱 정하기 `/destination` | 질문 17개 모두 직접 쓰기 · q.ai에 '웹에서 만드는 도구' · '쓰는 AI' 질문(연습에서 고른 값이 있으면 채워 둠) · 느낌 여섯 + "색·글꼴 더 정하기" 시트 | 4, 7 |
| 2 도구 고르기 `/waypoints` | 기능마다 "목록에 없는 도구 쓰기" · 도구 카드 꼬리표(승인 기다림 · 며칠 / 결제 카드 필요, 표시만, 점수 그대로) | 7.5, 5.6 |
| 3 도구끼리 맞춰 보기 `/check` | 직접 쓴 도구는 처음부터 서행 · 막힌 곳 '바꾸기' 보기 끝에 [목록에 없는 도구 쓰기 ›](2단계 그 칸으로) · `services.md` 13.2절의 새 규칙 후보(Pages + 비공개 저장소, Vite 하위 주소, Supabase RLS 등)는 `engine-guardian` 검토와 골든을 함께 | 7.1, 7.5 |
| 4 설계도 받기 `/arrival` | 칸 넷: 영수증 · 설계도 · 다음 할 일 · AI에게 할 말. 아래 막대의 주 버튼이 AI 종류를 따름 | 3.3 |

### 3.3 4단계 칸

- **칸 고르개:** 영수증 · 설계도 · 다음 할 일 · AI에게 할 말. 처음 칸은 지금처럼 영수증이다. 좁거나 글자가 커서 넷이 한 줄에 들어가지 않으면 지금 규칙대로 세로 줄 목록(`aria-orientation="vertical"`)으로 바꾼다(UX.md 3.4). 360px + 글자 125%·200%에서 '다음 할 일'·'AI에게 할 말' 라벨이 잘리거나 넘치지 않는지 사진으로 본다(T40).
- **'건네드릴 것' 카드:** "설계도 1부 · 영수증 1장 · 다음 할 일 {n}개 · AI에게 할 말 {m}장". 읽어 둘 용어 개수는 영수증 줄에 그대로 남는다(R-34).
- **아래 막대의 주 버튼(하나):** `src/lib/arrival-view.ts`가 고른 AI 종류(`q.ai`)와 앱 안 브라우저 여부로 정한다. 칸 안에는 주 버튼을 두지 않는다(UX.md 3.4, CONCEPT '주 버튼은 화면마다 하나').

  | 경우 | 주 버튼 | 늘 남는 보조(설계도 칸 안, 중립·글 버튼) |
  |---|---|---|
  | 무료 AI 채팅 · 유료 AI 구독 · 쓰는 AI를 아직 안 정했어요 | [설계도 내려받기 (.md)] (지금 그대로) | [설계도 복사] |
  | 웹에서 만드는 도구 | [붙여 넣을 글 복사] | [설계도 내려받기 (.md)] · [설계도 복사] |
  | 코딩 에이전트 | [AI 설정 묶음 내려받기] (6.3절 1번) | [설계도 내려받기 (.md)] · [짧은 메시지 복사] · [전체 메시지 복사] |
  | 앱 안 브라우저(L-05) | [설계도 복사] (위 셋보다 앞섬) | [다른 브라우저로 열기] |
  | 잠김(만들 앱 전 · 막힌 곳 남음 · 깨진 링크) | 지금 그대로 | — |

- **설계도 칸:** 위에서 아래로 놓는다.
  1. 한 줄 + 고른 AI에 맞는 저장 안내(`saveAs`) + 중립 [설계도 복사] · 글 버튼 [설계도 내려받기 (.md)](주 버튼이 따로 있을 때만) + 접기 '설계도 미리 보기'
  2. 디자인 묶음: 작은 미리 보기 96×170, 세 줄(느낌·색·글꼴), 글 버튼 [디자인 바꾸기] [DESIGN.md 따로 받기]
  3. **AI 종류에 맞춘 묶음**(6.3절). 묶음 이름도 AI 종류를 따른다: 코딩 에이전트 "AI 설정 파일" · 웹에서 만드는 도구 "프로젝트 지식에 붙여 넣을 글" · AI 채팅 "프로젝트 지시 글". 쓰는 AI를 '아직 안 정했어요'로 두었으면 '쓰는 AI' 고르개(같은 목록 + 직접 쓰기)를 먼저 보인다(7.1절).
- **다음 할 일 칸:** 5.8절. '만들기 전에' 묶음 안에 "먼저 읽어 둘 용어 {n}개 (10분)" 줄이 있다. 펼치면 지금의 용어 목록(`StudyList`)이 열린다. '먼저 읽어 둘 용어 완료' 이벤트(R-60)는 그대로 센다.
- **AI에게 할 말 칸:** 기본 9장을 묶음 넷으로 나눈다. 묶음 이름과 장 이름이 겹치지 않게 하고, 장 이름은 "~할 때" 꼴로 맞춘다. '다음 단계'는 새 칸 '다음 할 일'과 헷갈려서 쓰지 않는다. 아래는 제안이고 최종 문구는 ko-copy-editor가 정한다.

  | 묶음 | 장 (`card_copy` 구간 id) |
  |---|---|
  | 시작할 때 | 처음 말을 걸 때 (`first`) · 다음 단계로 갈 때 (`next`) |
  | 잘 안 될 때 | 확인이 안 될 때 (`verify`) · 에러가 났을 때 (`error`) |
  | 바꿀 때 | 고치고 싶을 때 (`change`) · 디자인을 지키며 고칠 때 (`design-keep`) · 디자인이 맞는지 볼 때 (`design-check`) |
  | 이어 갈 때 | 새 대화로 이어 갈 때 (`new-chat`) · 기능을 더할 때 (`add-feature`) |

  - 직접 쓴 도구가 있으면 한 장이 더 붙는다: 규칙 파일 위치를 물을 때 (`custom-tool`, 6.1절).
  - 다음 할 일의 [시작하는 말 복사]는 구간 `step`으로 센다.
  - 괄호 자리는 입력 칸으로 바꾼다(7.1절, `companions.md` 7.5절).
- **집계 구간(E-01, T40):** `src/lib/event-spec.ts`의 `card_copy` 구간은 지금 `['first','next','verify','error','change']` 다섯뿐이다 [잼]. 여기에 `design-keep` · `design-check` · `new-chat` · `add-feature` · `custom-tool` · `step`을 더한다. 더하지 않으면 Worker의 `parseEvent`가 null을 돌려 조용히 버린다. 이벤트 종류는 다섯 그대로다.
- **PRD 고칠 곳:**
  - R-33: 건네는 넷 = 영수증, 설계도, 다음 할 일, AI에게 할 말
  - R-35: 설계도 저장 안내에서 "CLAUDE.md, AGENTS.md라는 이름으로 저장"을 뺀다. 코딩 에이전트는 설계도를 `docs/codechauffeur-plan.md`로 저장하고, 규칙 파일은 AI 설정 파일이 만든다(6.1절). 같은 문장이 `data/templates.json` `aiTools["ai.agent"].saveAs`·`packRef`에 있다 [잼, 205~206줄]. 그대로 두면 v3가 만든 AGENTS.md를 이용자가 설계도로 덮어쓴다.
  - R-36: 읽어 둘 용어는 다음 할 일 안의 '먼저 읽어 둘 용어'와 단계 줄의 '이 단계에서 볼 용어'
  - R-37: AI에게 할 말 기본 9장, 묶음 넷(위 표). 단계마다의 말은 다음 할 일 단계 줄에
  - R-60 주석: `card_copy`의 장 종류 구간 목록(위). 처리방침의 '종류' 문장도 같이 고친다.

### 3.4 둘러보는 곳

| 주소 | 이름 (`<title>`) | 무엇 | 절 |
|---|---|---|---|
| `/guides` | 만들기 안내 · 코드쇼퍼 | 때 다섯(오늘 신청해 둘 것 · 만들기 전에 · 만들면서 · 공개하기 · 공개한 뒤) › 갈래 열하나 › 안내 한 장. 내 다음 할 일 띠 한 줄(설계도를 받았을 때만), 거르기(컴퓨터 · 갈래 · 기다림 · 비용), 맨 아래 '다른 서비스(직접 쓰기)' | 5 |
| `/guides/[id]` | {안내 제목} · 만들기 안내 · 코드쇼퍼 | 안내 한 장. OS 탭은 주소 조각 `#windows` `#mac` `#linux` | 5.5 |
| `/looks` | 디자인 둘러보기 · 코드쇼퍼 | 느낌 여섯을 앱 종류별 첫 화면에 칠한 미리 보기, 화면 부품 이름, 화면 상태 다섯, AI가 자주 만드는 뻔한 모습 다섯, 다른 앱 둘러보기 링크 | 4.9 |
| `/help` | 자주 묻는 것 · 코드쇼퍼 | `launch.md` L-13 | 8.2 |
| `/about/accessibility` | 접근성 안내 · 코드쇼퍼 | L-14 | 8.2 |
| `/about/changes` | 바뀐 점 · 코드쇼퍼 | L-15. 판 번호 | 8.2 |

- 이름 '만들기 안내'는 도착 메시지 "여기부터는 내 AI가 만들어요." 다음에 바로 이어진다. 준비·만들기·공개·공개한 뒤를 다 품는다.
- 버린 이름: '준비 안내'(공개 뒤를 못 품는다), 'AI 도구 안내'(갈래 이름으로 쓴다), 길잡이·가이드·튜토리얼(쓰지 않는 말).
- 관찰 시험에서 다섯 명 중 넷 미만이 알아들으면 둘째 후보 '준비 안내'로 바꾼다(13절).

### 3.5 홈·머리줄·바닥글·설정·사전

- **머리줄:** 바꾸지 않는다(로고 · 사전 · ⚙). 360px에서 로고 B(142px)와 단추 둘이 이미 빠듯하다. 안내는 홈·4단계·바닥글·사전 검색에서 찾는다.
- **홈:**
  - '이렇게 가요' 네 줄 아래에 다섯째 줄을 둔다. 번호 원 대신 점선 원이고, 제목은 "그다음", 둘째 줄은 "다음 할 일을 보며 내 AI와 만들고 공개해요"다.
  - 묶음 목록에 두 줄을 더한다: "만들기 안내 / 가입·설치·공개를 공식 문서대로 모았어요", "디자인 둘러보기 / 느낌 여섯을 내 앱 첫 화면에 칠해 봐요".
  - 홈 시트의 '시험판이에요' 줄은 뺀다(바닥글과 겹친다, `launch.md` L-40).
- **바닥글:** 두 줄로 바꾼다(L-21·L-06).
  - 첫 줄(둘러보기): 만들기 안내 · 디자인 둘러보기 · 도구 모음 · 용어 카드 · 자주 묻는 것
  - 둘째 줄(정보): 의견 보내기 · 소개 · 추천 기준 · 크레딧 · 접근성 · 개인정보 처리방침 · 이용 안내
  - 그 아래 "© 2026 코드쇼퍼"(9.1절).
  - '의견 보내기'는 화면마다 같은 순서 자리에 둔다(WCAG 3.2.6).
- **설정 시트:** 묶음 셋으로 나눈다(L-41).
  - 화면: 화면 밝기(기기 따라 · 밝게 · 어둡게, L-16) · 글자 크기(보통 · 크게 · 더 크게, L-17) · 동작 줄이기(지금 이름 그대로, `ko.ts` `settings.motion`) · 조용히 모시기
  - 어두운 화면을 가리키는 말은 셋으로 나눠 쓴다: 사이트 설정은 "화면 밝기", 디자인 시트(이용자 앱)는 "밝기: 밝게만 · 어둡게만 · 둘 다", 사전 표제어는 "어두운 화면"(같은 말: 다크 모드). 지도 그림의 '낮 지도·밤 지도'는 그림 이름으로만 남는다.
  - 풀이: 어려운 말 풀이 · 점선 밑줄(풀이가 켜졌을 때만)
  - 기록과 도움: 내 기록 내려받기·불러오기(L-18) · 만들다 만 앱(L-19) · 저장한 기록 지우기 · 자주 묻는 것 · 의견 보내기
- **사전:** 결과 묶음 '안내'를 '에러가 났을 때' 바로 다음에 둔다. 예를 들어 "github pages 404"를 넣으면 에러 카드(`pages-404-entry`)와 안내 한 장이 함께 나온다. 검색 색인(`search-index.json`)에 안내 제목·갈래와 `/looks`의 부품 이름을 더한다(색인 상한 100KB 안).
  - 화면 문구에서 막는 말(테마 · 다크 모드 · 폰트 · 가이드 등, T35)은 **검색어로는 받는다.** `data/aliases.json`의 `searchSynonyms`(예: 테마 → 디자인 정하기·디자인 둘러보기, 다크모드·다크 모드 → 어두운 화면, 폰트 → 글꼴, 가이드·튜토리얼 → 만들기 안내, 배포 → 공개하기)를 색인을 만들 때 펼친다. `npm run words`는 `aliases.json`을 보지 않는다.

### 3.6 주소

**그대로 두는 주소(바꾸지 않는다):**
- 단계: `/` `/test-drive` `/destination` `/waypoints` `/check` `/arrival`
- 둘러보는 곳: `/tools` `/tools/[id]` `/terms` `/terms/[id]` `/courses` `/receipts` `/dictionary`
- 정보: `/about` `/about/criteria` `/about/credits` `/legal/privacy` `/legal/notice`
- 끝점: `/robots.txt` `/search-index.json` `/glossary.json` `/glossary-tools.json` `/api/event`

**새 주소:**

| 주소 | 종류 | 색인 |
|---|---|---|
| `/guides`, `/guides/[id]` (약 50쪽) | 정적 페이지 | 사이트맵에 넣음 |
| `/looks` | 정적 페이지 + 작은 섬 | 넣음 |
| `/help`, `/about/accessibility`, `/about/changes` | 정적 페이지 | 넣음 |
| `/sitemap.xml` | 정적 끝점(의존성 없음, L-03) | — |
| `/manifest.webmanifest` | 같은 주소를 정적 파일 → 끝점으로(9.4절, 주소 바탕을 넣으려고) | — |
| `/og/default.png` | 공유 그림 1200×630(L-02) | — |
| `/look/*.svg` | 제목 글꼴 견본(4.6절, P1) | — |

- **색인에서 빼는 화면(`noindex`, 사이트맵에서도 뺌):** `/waypoints` `/check` `/arrival` `/receipts` `/404`. 로봇에게는 잠긴 화면만 보이기 때문이다(L-03).
- **주소 규칙:** 끝 빗금 없이 쓴다(D50). 주소는 `src/lib/routes.ts` 한 곳에서 정하고(지금 16개 [잼]), 새 주소도 여기에 더한다.
- **옛 주소 301(`public/_redirects` 10줄):** 사이트를 공개 배포한 적이 없어 옛 주소를 가진 사람이 없다. 그래서 T35에서 지운다(`launch.md` 4절). 시험 `REDIRECTS`도 함께 지운다.

### 3.7 저장 키 (저장 코드는 `src/lib/store.ts` 한 곳)

| 키 | 모양 | 지우기 |
|---|---|---|
| `cc:session:v1` (있음) | 넓힌다: `notes: Record<질문 id, string>`, `customTools: CustomTool[]`(최대 5), `gaps: string[]`, `look: LookChoice` | 지움 |
| `cc:receipts:v1` (있음) | 그대로(링크 조각만, 직접 쓴 글은 없음) | 지움 |
| `cc:prep:v1` (새) | `{ [stateKey]: { done: string[], mine: { id, text, when }[], guideIds: string[] } }`, 최근 30장. `done`에는 **안내가 걸리지 않은 줄**(설계도 10번 단계 줄, 내가 더한 줄)만 둔다. `guideIds`는 이 설계도의 다음 할 일에 걸린 안내 id 목록(`/guides` 띠가 읽는다) | 지움 |
| `cc:guides:v1` (새) | `{ done: { [guideId]: string[] }, finished: string[] }`, 다 마친 안내 최근 200. **안내가 걸린 줄의 마침은 여기만 진실이다** | 지움 |
| `cc:prefs:v1` (새) | `{ os: 'windows'\|'mac'\|'linux'\|'other'\|'mobile', osText?: string, scheme: 'auto'\|'light'\|'dark', text: 100\|112.5\|125 }`. `'mobile'`(휴대폰·태블릿만 있어요)은 P1 | 설정 값은 **남김**, `osText`(직접 쓴 글)는 **지움** |
| `cc:drafts:v1` (새, L-19) | 만들다 만 앱 최대 5개(세션 통째) | 지움 |

- **진행은 한 곳에서만 센다(D79).** `guideId`가 걸린 다음 할 일 줄은 `cc:guides:v1.finished`(또는 그 안내의 단계 전부 마침)로 마침을 정하고, `cc:prep:v1`에는 적지 않는다. 다음 할 일에서 그 줄의 확인란을 누르면 `cc:guides:v1`에 쓴다. 그래서 만들기 안내 한 장에서 마친 것이 다음 할 일에도, 그 반대도 같게 보인다.
- 이 규칙은 순수 함수 `src/lib/progress.ts`의 `lineDone(line, prep, guides)`·`progressCount(lines, prep, guides)`로 고정하고 단위 시험을 붙인다. 엔진(`src/lib/engine/`)은 저장소를 모르므로 여기에 두지 않는다. 읽고 쓰는 코드는 지금처럼 `store.ts` 한 곳이다.

### 3.8 기능이 사는 곳

| 기능 | 자리 | 지연 묶음(누를 때 `import()`) | 묶음 |
|---|---|---|---|
| 직접 쓰기 부품 `CustomAnswer` | 1단계 질문 17 + '쓰는 AI', 2단계 기능마다, 시트, 연습 칩, 안내 거르기, 다음 할 일 | 낱말표 + 찾기 8KB | T36·T37 |
| 디자인 정하기 시트 `LookSheet` + `LookPreview` | 1단계 느낌 질문 아래 글 버튼, 4단계 설계도 칸 | 14KB | T38 |
| 디자인 둘러보기 | `/looks` | 섬 4KB | T38 |
| 만들기 안내 | `/guides`, `/guides/[id]`, 도구 상세 '시작하기' 칸, 사전 결과 | 섬 각 5KB. 엔진·자료 묶음을 싣지 않는다 | T39 |
| 다음 할 일 | 4단계 칸 | 12KB | T40 |
| AI 설정 파일 | 4단계 설계도 칸 | 10KB (zip 포함) | T40 |
| 공유 미리 보기·사이트맵·앱 안 브라우저·의견·설정·인쇄 | 모든 쪽 머리, 설계도 받기 아래 막대, 바닥글, 설정 시트 | 설정의 기록 기능만 지연 | T41 |

### 3.9 짝 문서와 어긋난 것을 정한 표

| 어긋난 것 | 정한 것 | 까닭 |
|---|---|---|
| 둘러보는 곳 이름: '준비 안내'(services) / 'AI 도구 안내'(aitools) / '만들기 안내'(companions) | **만들기 안내**. 나머지 둘은 갈래·묶음 이름으로 쓴다 | 전 과정을 품는 이름 |
| 갈래 열(companions) | **열하나**: 만들면서에 **디자인** 갈래를 더한다 | 소유자 요청 (2). 디자인 안내 넷을 둘 곳 |
| 4단계: '내 AI 준비' 새 칸(aitools) / '준비물'을 다음 할 일로(services) / 칸 넷(companions) | **칸 넷**. '내 AI 준비'는 '만들기 전에' 묶음의 줄과 설계도 칸의 AI 설정 파일 묶음으로 나눈다 | 360px에서 칸 다섯은 버티지 못한다 |
| AI 고르기 두 칸 + OS 질문(aitools) | q.ai에 보기 하나를 더하고, '쓰는 AI' 질문 하나를 둔다. **OS는 설정 값** | 질문이 둘 늘면 지친다. OS는 추천을 바꾸지 않고 안내만 바꾼다 |
| 영수증 '준비물 n개'를 늘리고 골든을 고침(aitools·services) | **영수증 숫자는 그대로.** 늘어난 것은 '다음 할 일'에만 | 영수증 링크를 다른 기기에서 열어도 같은 숫자여야 한다(OS가 다르면 안내가 다르다). 골든도 흔들리지 않는다 |
| 느낌 직접 쓰기 저장: `LookChoice.moodText`(design) / `notes["q.style"]`(input) | **`notes["q.style"]` 한 곳** | 같은 글을 두 곳에 두지 않는다 |
| 서비스 이름 낱말표: `guides.json` `aliases`(services) / `aliases.json` `toolHints`(input) | **`data/aliases.json` 하나**. 느낌·색 낱말만 `looks.json` `keywords`에 둔다 | 찾기 함수 `findAliases` 하나, 표는 쓰임별 |
| `launch.md` L-07의 직접 쓰기 안 | **`input.md`를 정본으로** 따른다(예·아니요 질문에도 넣음, 도구 이름 40자, 링크에 이름 넣지 않음 등 여섯 가지) | `input.md` 12절의 까닭 |
| 제목 글꼴 견본 SVG 112장(design) | **P1로 미룬다.** 그동안 미리 보기 제목은 Pretendard로 그리고 "미리 보기에는 기본 글꼴로 보여요"를 붙인다 | 출시를 막지 않게. 새 개발 의존성(`opentype.js`)도 그때 더한다 |
| '느낌 둘러보기'를 BACKLOG로(design 5.1) | **`/looks`를 P1로 올린다** | 소유자 요청 (2)의 '부품 디자인'과 '참고 사례'를 받을 자리. 바깥 그림 없이 우리 미리 보기로 |
| HUMAN 번호: H12(aitools) / H14(services) / H-C1(companions)이 같은 '허용 도메인' 요청 | **H14 하나**로 합친다(12절). H12는 이미 비공개 전환에 씀 | 번호 충돌 |
| zip을 세 번째 방법으로(aitools) | **P1**, PC 브라우저에서만 보인다 | 앱 안 브라우저는 내려받기가 안 될 수 있다(L-05) |
| 1판의 설계도 칸 주 버튼 [메시지 복사] / UX.md 3.4 "칸 안에 주 버튼을 두지 않는다" · CONCEPT "주 버튼은 화면마다 하나" | **v2 규칙을 따른다.** 주 버튼은 아래 막대 하나, AI 종류에 따라 바뀐다(3.3절) | 문서 순위(CONCEPT > 이 문서). 고칠 곳이 `arrival-view.ts` 한 곳 |
| 1판 "새 이벤트는 없다" / `event-spec.ts`는 `card_copy` 구간 다섯만 받음 | **구간을 늘린다**(3.3절 E-01). 이벤트 종류는 다섯 그대로 | 늘리지 않으면 새 장의 복사가 조용히 버려진다 |
| `templates.aiTools["ai.agent"].saveAs`(설계도를 CLAUDE.md·AGENTS.md로 저장) / v3 AI 설정 파일의 AGENTS.md | **설계도는 `docs/codechauffeur-plan.md`로.** R-35·`saveAs`·`packRef`를 고친다 | 이용자가 규칙 파일을 설계도로 덮어쓰지 않게 |
| 때 이름: 준비하기(안내) / 오늘 신청해 둘 것·만들기 전에(다음 할 일), 공개하기 / 공개하기 전에 / 화면 올리기 / 배포 | **다섯 한 벌:** 오늘 신청해 둘 것 · 만들기 전에 · 만들면서 · 공개하기 · 공개한 뒤(5.1절) | 같은 자료(`when`)를 두 화면이 다른 이름으로 부르지 않게 |
| `aitools.md`의 "Codex 앱은 ChatGPT 앱으로 합쳐지는 중" | **이미 지난 일**로 적는다(2026-07-09, 5.7절) | [검색 요약] 여러 곳이 같은 날짜 |

---

## 4. 디자인 정하기

정본은 `design.md`다(값·대비·견본). 여기에는 정한 것과 바꾼 것만 적는다.

### 4.1 길 셋

1. **한 번 누르는 길(기본):** 1단계 느낌 질문에서 타일 하나를 고르면 색·글꼴·모서리·간격·움직임·아이콘·그림이 모두 정해진다. 지금처럼 바로 다음 질문으로 간다(D19).
2. **더 정하는 길:** 타일 아래 글 버튼 **"색·글꼴 더 정하기"**를 누르면 모달 시트 '디자인 정하기'가 열린다. ('직접'은 자유 입력 [직접 쓰기]에만 쓴다. 같은 줄에 둘이 있으면 헷갈린다.)
   - 위에 폰 미리 보기 146×260이 있고, 그 아래 줄 12개를 묶음 셋으로 나눈다.
   - 줄을 누르면 시트 안에서 화면이 넘어간다(뒤로 ‹).
   - 고르는 즉시 저장된다. 주 버튼은 [다 정했어요] 하나다.
   - 768px 이상은 가운데 최대 폭 640, 미리 보기를 왼쪽 240 열에 붙여 둔다.
3. **나중에 고치는 길:** 4단계 설계도 칸의 [디자인 바꾸기]로 같은 시트를 연다. 디자인은 추천·막힌 곳 계산과 상관없어서 영수증과 도구는 그대로이고, 설계도 6번과 DESIGN.md만 다시 만든다.

### 4.2 고를 것 열둘

모든 줄에 기본값이 있다. 직접 쓰기 규칙은 7절과 같다(한 줄, 글자 수 표시, 영수증 링크에 넣지 않음).

| 묶음 | 줄 | 보기 | 기본값 | 직접 쓰기 |
|---|---|---|---|---|
| 모습 | 느낌 | 깔끔하게 · 귀엽게 · 차분하고 믿음직하게 · 강렬하게 · 포근하게 · 오락실처럼 | 앱 종류별 추천 첫째(4.3절) | 한 줄 40자 → 낱말표로 느낌·색 반영. 글은 `notes["q.style"]` |
| 모습 | 대표 색 | 파랑 · 남색 · 청록 · 초록 · 주황 · 빨강 · 분홍 · 보라 · 갈색 · 먹색 (원 44) | 느낌의 기본 색 | 색 고르개 + `#코드` 글 칸 + 색 이름 20자 |
| 모습 | 밝기 | 밝게만 · 어둡게만 · 둘 다(기기 설정 따라) | 밝게만 | 바라는 점으로 가는 줄 ※ |
| 모습 | 글꼴 | 기본 고딕 · 단정한 고딕 · 부드러운 고딕 · 명조 제목 · 동글동글 제목 · 굵은 제목 · 손글씨 제목 · 도트 제목 | 느낌의 짝 | 글꼴 이름 30자 → 설계도 9번에 '글꼴 라이선스' 알아볼 것 |
| 모습 | 모서리 | 각지게 · 살짝 둥글게 · 둥글게 · 아주 둥글게 | 느낌별 | 바라는 점으로 가는 줄 ※ |
| 모습 | 촘촘함 | 넉넉하게 · 보통 · 촘촘하게 | 앱 종류별(현황판 촘촘, 안내 페이지 넉넉) | 바라는 점으로 가는 줄 ※ |
| 더 보기 | 움직임 | 거의 없이 · 살짝 · 생기 있게 | 살짝 | 바라는 점으로 가는 줄 ※ |
| 더 보기 | 아이콘 | 선 아이콘(Lucide) · 둥근 아이콘(Phosphor) · 굵은 선(Tabler) · 아이콘 적게 | 느낌별 | 아이콘 묶음 이름 30자 |
| 더 보기 | 그림·사진 | 그림 없이 · 단순한 도형 그림 · 직접 찍은 사진 · 손그림 느낌 | 앱 종류별 | 한 줄 40자 |
| 더 보기 | 첫 화면 배치 | 앱 종류마다 둘(`design.md` 5.5절) | 앞의 것 | 한 줄 40자 |
| 내 말로 | 바라는 점 | — | 비어 있음 | 80자 |
| 내 말로 | 닮고 싶은 앱 | — + '다른 앱 둘러보기' 접기(4.9절과 같은 링크) | 비어 있음 | 60자 |

- **※ 보기만 있는 네 줄(밝기·모서리·촘촘함·움직임):** 보기 아래에 같은 글 링크 한 줄 "원하는 게 없나요? 바라는 점에 써 주세요 ›". 누르면 시트 안에서 '바라는 점' 칸으로 가고 초점이 칸에 놓인다. 값 칸을 따로 만들지 않는 까닭: 이 넷은 CSS 값 묶음에 그대로 들어가는 정해진 단계라, 자유 글은 설계도 6-1의 '내 말 그대로'로 넘기는 편이 정직하다.
- **P1 '내 말로' 묶음 넓히기(소유자 요청 (2)의 UI/UX·기능 쪽):** 앱 이름(20자) · 앱 말투(해요체 · 합쇼체 · 반말 · 직접 쓰기 20자) · 더하고 싶은 화면(40자, 3개까지). 앱 이름은 설계도 1번과 DESIGN.md 머리, 말투는 6-1, 더하고 싶은 화면은 설계도 3번에 "(내가 더함)"으로 들어간다. 모두 영수증 링크·집계에 넣지 않는다. 묶음 이름은 "내 말로 (이름·말투·화면)".

시트 맨 아래 상태 한 줄은 둘 중 하나다: "디자인 정하기 · 느낌만 골랐어요" / "디자인 정하기 · {n}가지를 더 정했어요".

### 4.3 느낌 여섯

| 느낌 (id) | 대표 색 밝음 / 어두움 | 글꼴 짝 (제목 / 본문) | 모서리 작은·보통·큰 | 깊이 | 아이콘 | 움직임 | 내 지도 색 |
|---|---|---|---|---|---|---|---|
| 깔끔하게 `clean` | 파랑 #1D63D6 / #7AB0FF | Pretendard / Pretendard | 6·8·12 | 선으로 나눔 | Lucide | 살짝 | clean |
| 귀엽게 `cute` | 분홍 #B8236F / #FF8CC8 | 주아 / Pretendard | 알약·20·24 | 부드러운 그림자 | Phosphor | 생기 있게 | cute |
| 차분하고 믿음직하게 `serious` | 남색 #2A3B8F / #A3B3FF | Pretendard(숫자 `tabular-nums`) | 4·4·6 | 선만 | Lucide | 거의 없이 | serious |
| 강렬하게 `bold` | 빨강 #C42B36 / #FF8E8E | 검은고딕 / Pretendard | 0·2·4 | 2px 먹 테두리 | Tabler | 살짝(짧게) | bold |
| 포근하게 `warm` (새) | 초록 #1B7A4A / #6FD69C | 고운돋움 / Pretendard | 10·14·20 | 아주 옅은 그림자 | Phosphor | 살짝 | cute에 이음 |
| 오락실처럼 `retro` (새) | 보라 #6A45D1 / #B9A6FF | 갈무리 / Pretendard | 0·0·0 | 2px 테두리 + 어긋난 그림자 | Tabler | 살짝(`steps()`) | bold에 이음 |

- **바꾼 것과 까닭:** 지금의 '귀엽게'(크림 #FFF8F0 + 주황)와 '강렬하게'(먹색 바탕 + 노랑)는 AI가 흔히 만드는 모습 ①·②와 겹친다(저장소 `frontend-design` 스킬의 다섯 무리). 그래서 흰 바탕 + 분홍, 흰 바탕 + 굵은 먹 글자 + 빨강 면으로 바꾼다. 이 값은 이용자 앱의 디자인 값이다. 우리 사이트의 지도 색(`data-palette`)은 바꾸지 않는다.
- **'모르겠어요'와 추천 순서**(앞 셋을 타일 앞줄에 놓고, 첫째에 '추천' 꼬리표):

| 앱 종류 | 추천 셋 | 촘촘함 | 그림 |
|---|---|---|---|
| 기록장 | 포근하게 · 깔끔하게 · 귀엽게 | 보통 | 손그림 느낌 |
| 신청서·설문 | 차분하고 믿음직하게 · 깔끔하게 · 포근하게 | 보통 | 그림 없이 |
| 안내 페이지 | 깔끔하게 · 포근하게 · 강렬하게 | 넉넉하게 | 단순한 도형 그림 |
| 퀴즈 | 귀엽게 · 오락실처럼 · 강렬하게 | 보통 | 단순한 도형 그림 |
| 계산기·도우미 | 깔끔하게 · 차분하고 믿음직하게 · 오락실처럼 | 보통 | 그림 없이 |
| 현황판·알림 | 차분하고 믿음직하게 · 깔끔하게 · 강렬하게 | 촘촘하게 | 그림 없이 |
| 직접 쓴 앱 `type.custom`·못 정함 | 깔끔하게 · 귀엽게 · 차분하고 믿음직하게 | 보통 | 그림 없이 |

- 바탕 묶음 넷(차가운 회색 · 분홍 기운 · 먹 · 따뜻한 회색)의 밝음·어두움 값과 잰 대비는 `design.md` 5.4절 표를 그대로 `data/looks.json`에 옮긴다.

### 4.4 대비와 직접 고른 색

- **견본은 여유를 두고 통과한다.** 대표 색 10 × 바탕 4묶음 × 밝기 2 = 80쌍이 모두 4.5:1 이상이고, 가장 낮은 값은 4.52다 [잼, `design.md`]. 도구마다 반올림과 sRGB 계산 문턱이 조금씩 달라 4.52는 다른 검사기에서 4.5 밑으로 읽힐 수 있다. 그래서 **견본은 4.6:1 이상**으로 검사하고, 4.6 밑인 쌍은 L을 0.01씩 낮춰 다시 잰다. 이 조건을 `npm run validate`가 지킨다. 테두리는 3:1 이상(견본은 3.1 이상)이어야 한다.
- **직접 고른 색은 엔진이 맞춘다.** `src/lib/engine/look.ts`의 `deriveAccent()`가 하고, 순수 함수 OKLCH 계산이라 새 의존성이 없다. 엔진 안의 목표값은 견본과 같은 4.6이고, 화면과 설계도에는 기준(4.5:1, WCAG 2.2 AA)을 적는다.
  1. 버튼 바탕은 고른 색 그대로 둔다. 버튼 글자는 흰색과 #111111 중 4.6:1을 넘는 쪽이고, 둘 다 넘으면 흰색이다.
  2. 글자·링크로 쓸 색은 바탕과 옅은 면 둘 다에서 4.6:1이 될 때까지 L을 0.01씩 낮춘다.
  3. 어두운 화면 색은 어두운 면 위에서 4.6:1이 될 때까지 L을 올린다.
  4. 옅은 면은 L 0.96, C ≤ 0.03이다.
- **결과는 쉬운 말을 먼저 보인다:** "버튼 글자를 검게 했어요. 흰 글자는 잘 안 보여서요." 숫자(예: "흰 글자 3.0대 1, 검은 글자 7.0대 1")는 그 아래 접기 '숫자로 보기' 안에 둔다. [흰 글자로 두기]를 누르면 기준을 넘을 때까지 진하게 바꾼 바탕을 보여 주고 고르게 한다.
- **노랑은 견본에 넣지 않는다**(흰 글자 1.64:1). 오류 색(빨강)과 성공 색(초록)은 고정이다. 대표 색이 빨강이면 6-8에 "오류에는 경고 그림과 글을 꼭 붙인다"를 더한다.

### 4.5 직접 쓴 말 반영

- 순서는 셋이다: 직접 고른 값 > 직접 쓴 말에서 찾은 값 > 앱 종류 기본값.
- 낱말표는 `looks.json`의 `keywords`이고, 찾는 함수는 직접 쓰기와 같은 `findAliases`다(7.3절). 예:
  - 바다·하늘·시원 → 청록 / 숲·풀·초록 → 초록
  - 레트로·도트·오락실·게임 → 오락실처럼
  - 어둡·다크·밤 → 밝기 '둘 다'. '어둡게만'으로 두지 않는다.
- 상태 줄과 `aria-live`로 결과를 말한다:
  - 찾았을 때: "‘바다처럼 시원하게’에서 ‘바다’를 찾아 청록으로 맞췄어요."
  - 못 찾았을 때: "고른 값은 그대로 두고, 이 말은 설계도에 그대로 넣을게요."
  - 조사는 `josa.ts`로 고른다.
- 설계도 6-1에는 원문을 늘 넣는다. 이 원문은 지시가 아니라 따옴표 안의 인용이다.

### 4.6 미리 보기 (`LookPreview`)

- **우리 HTML·CSS로 그린다.** 고른 앱 종류의 첫 화면(`templates.types.*.screens[0]`)과 첫 화면 배치를 폰 틀 146×260 안에 실제 요소로 놓는다: 머리줄 → 주요 내용 → 주 버튼 → 아래 메뉴.
- **남의 화면 캡처를 쓰지 않는다.** 견본 문장은 `ko.ts`의 `look.sample.*`에 둔다. 이용자가 쓴 '한 줄'이 있으면 그 앞 12자를 미리 보기 제목으로 쓴다.
- **값은 `lookSpec()`이 만든다.** 인라인 CSS 변수 `--pv-*`로 넣고, `src/styles/look.css`는 `var(--pv-*)`만 쓴다. 품질 바닥선에는 예외를 하나 더한다: `.look-preview` 안에서만 `--pv-*`를 허용한다.
- **전체가 `role="img"` 하나다.** 이름표는 엔진이 만든 요약이다(예: "깔끔하게, 파랑, 기본 고딕으로 꾸민 ‘이번 주 급식’ 첫 화면 미리 보기"). 안의 요소는 `aria-hidden`·`inert`다.
- **바뀔 때는 150ms 색 전환만 쓴다.** 동작 줄이기면 0이다.
- **시트 맨 아래 14px 글:** "실제 화면은 내 AI가 만들어서 조금 다를 수 있어요."
- **제목 글꼴 견본(P1):**
  - 빌드 때 `scripts/looks/specimens.ts`(`npm run looks`, 개발 의존성 `opentype.js`)가 OFL 글꼴에서 견본 문장을 SVG 윤곽선으로 뽑아 `public/look/`에 둔다.
  - 장 수: 앱 종류 6 × 글꼴 짝 8 × 밝음·어두움 2 = 96장 + 글꼴 줄 견본 16장 = 112장. 한 번에 2장만 받는다.
  - 그 전까지는 제목을 Pretendard로 그린다.
  - 아이콘은 고른 묶음의 넷(홈·추가·검색·설정)만 빌드 때 인라인 SVG로 넣는다(3묶음 × 4 = 12개). `THIRD_PARTY_NOTICES.md`에 Lucide(ISC)·Phosphor(MIT)·Tabler(MIT)와 글꼴 OFL 고지를 더한다.

### 4.7 접근성

- 색 견본은 `role="radiogroup"`의 라디오 10개다(원 44, 이름 14/600을 아래에, 화살표 키).
- 색 고르개(`input type="color"`) 옆에 `#코드` 글 칸을 함께 둔다. 키보드와 낭독기로도 고를 수 있어야 한다. 틀리면 "#과 여섯 자리로 써 주세요. 예: #00A651".
- 대비 줄은 `role="status"`이고 바뀔 때만 쉬운 말만 읽는다: "글자가 잘 보여요." / "버튼 글자를 검게 했어요." 숫자("버튼 5.5대 1, 본문 16.4대 1")는 접기 '숫자로 보기' 안에만 둔다.
- 시트는 `<dialog>`다. 열면 초점이 제목으로, 닫으면 연 버튼으로 돌아간다. Esc는 시트 안 화면이 하위 화면일 때 ‹와 같다.
- 글자 200%이면 미리 보기를 줄 목록 아래로 내리고 96×170으로 줄인다. 가로 밀림은 0이어야 한다.

### 4.8 설계도 6번 · CSS 값 · DESIGN.md

- **6번 '디자인 지시'를 7줄에서 11묶음 + 둘로 키운다.** 순서는 Google DESIGN.md를 따른다.
  - 11묶음: 6-1 전체 느낌 · 6-2 색(역할 표 + 잰 대비) · 6-3 글자(글꼴 받는 한 줄, 크기 표, 한글 규칙) · 6-4 배치와 간격(360px 한 줄 → 768px 이상 최대 폭 720) · 6-5 깊이 · 6-6 모양 · 6-7 부품(화면마다 부품과 상태, 버튼 셋) · 6-8 움직임 · 6-9 아이콘·그림 · 6-10 접근성(WCAG 2.2 AA에서 고른 것) · 6-11 해도 되는 것·하지 말 것(공통 + 느낌별 + AI가 자주 만드는 뻔한 모습 다섯)
  - 둘: 디자인 값(CSS) 묶음과 AI에게 줄 예시 요청 하나
- **채팅 AI에는 짧은 판을 준다.** 무료 AI 채팅을 고르면 6번을 색·글꼴·모서리·주 버튼·접근성·하지 말 것·CSS 묶음으로 줄인다. 웹 빌더·유료 AI·코딩 에이전트는 전체 판이다.
- **CSS 값 묶음(`renderLookCss`):**
  - 이름은 Tailwind CSS v4 4.3.3 이름표에 맞춘다(`--color-*` `--font-*` `--text-*` `--text-*--line-height` `--radius-*`) [확인: `tailwindcss/theme.css`].
  - '둘 다'일 때만 `color-scheme: light dark`와 `@media (prefers-color-scheme: dark)`를 낸다. 늘 `@media (prefers-reduced-motion: reduce)`를 붙인다.
  - 넣는 곳 지시는 고른 화면 도구에 맞춘다: HTML 한 장은 `<style>`의 `:root`, React + Vite는 `src/index.css`(Tailwind v4면 `@theme { … }` 안), 그 밖은 HTML 한 장과 같다.
  - Tailwind용 묶음을 따로 만들지 않는다. `@google/design.md export --format css-tailwind`는 줄 높이를 빼먹는다 [잼].
- **DESIGN.md (`renderDesignMd`):**
  - 형식은 `@google/design.md` **0.4.0**(형식판 alpha)이다: 맨 위 YAML(colors · typography · rounded · spacing · components) + 마크다운.
  - `##` 제목은 영어 이름 그대로 쓰고(Overview · Colors · Typography · Layout · Elevation & Depth · Shapes · Components · Motion · Iconography · Accessibility · Do's and Don'ts), 내용은 한국어다.
  - 밤 색도 부품에서 써야 `orphaned-tokens` 경고가 나지 않는다. 테두리처럼 글자가 아닌 색은 `backgroundColor`만 있는 1px 부품으로 적는다.
  - 견본을 린터로 돌려 오류 0 · 경고 0 · 정보 1을 확인했다 [잼, `design.md` 4.2절].
  - 파일 이름은 늘 `DESIGN.md`다(에이전트가 이 이름을 찾는다). 발행 시각은 YAML `description`에 넣는다.
- **AI 종류별 안내:**

| AI | 6번 | DESIGN.md | 저장 안내 |
|---|---|---|---|
| 무료 AI 채팅 | 짧은 판 | 선택(글 버튼만) | "설계도 하나만 첨부하면 돼요." |
| 유료 AI 구독 | 전체 판 | 권함 | "프로젝트 지시 글에 짧은 글을 넣고, 설계도와 DESIGN.md를 파일로 함께 올리세요." 넣는 곳 이름은 확인 전 표시(`needsReview`) |
| 웹에서 만드는 도구 | 전체 판 | 권함 | "프로젝트 지식(Knowledge)에 붙여 넣을 글과 DESIGN.md를 함께 넣으세요." 넣는 곳 이름은 확인 전 표시 |
| 코딩 에이전트 | 전체 판 | 권함 | "DESIGN.md를 프로젝트 맨 위 폴더에 두세요. AGENTS.md가 이 파일을 가리켜요." |

- **AI에게 할 말 두 장을 더한다:** '디자인을 지키며 고칠 때'(`design-keep`), '디자인이 맞는지 볼 때'(`design-check`)(`design.md` 7.5절). 복사는 `card_copy`로 세고, 이 두 구간을 `event-spec.ts`에 더한다(3.3절 E-01). 새 이벤트 종류는 없다.

### 4.9 디자인 둘러보기 `/looks` (P1)

소유자 요청 (2)의 '부품 디자인'과 '참고 사례'를 받는 정적 페이지다. 바깥 그림은 하나도 싣지 않는다.

360px에서 위에서 아래로 놓는다.
1. **H1 "디자인 둘러보기" + 한 줄:** "느낌 여섯을 앱 첫 화면에 칠해 봤어요. 마음에 드는 느낌은 만들 앱 정하기에서 골라요."
2. **앱 종류 칸 고르개(6):** 기본은 안내 페이지다. 섬 하나(4KB 이하)가 미리 보기의 `data-type`만 바꾼다. JS가 없으면 안내 페이지만 보인다.
3. **느낌 여섯:** 미리 보기 146×260(2열, 768px 이상 3열), 느낌 이름, 낱말 셋, "파랑 · 기본 고딕 · 살짝 둥글게" 한 줄.
4. **화면 부품 이름(17):** 머리줄 · 주 버튼 · 보조 버튼 · 글 버튼 · 입력 칸 · 고르기 · 목록 줄 · 카드 · 칩 · 아래 메뉴 · 진행 표시 · 알림 상자 · 토스트 · 확인 대화 상자 · 표 · 숫자 카드 · 그래프.
   - 부품마다 작은 CSS 그림, 쉬운 이름, 영어 이름(AI와 참고 사이트가 쓰는 말), 규칙 한 줄을 둔다.
   - 한 줄 안내: "AI에게 말할 때 이 이름을 쓰면 잘 알아들어요."
   - 자료는 `looks.json` `components`다.
5. **화면 상태 다섯:** 불러오는 중 · 비어 있음 · 오류 · 저장됨 · 꺼진 버튼과 그 이유. "모든 화면에 이 다섯을 만들어 달라고 하세요."
6. **AI가 자주 만드는 뻔한 모습 다섯:** 이름과 함께 "이렇게 말하면 피해요" 한 줄씩. 설계도 6-11과 같은 문장이다.
7. **다른 앱 둘러보기:** Mobbin · Refero · Nicely Done · Lazyweb · InspoAI(`https://inspoai.io/`, 소유자가 이름을 댄 곳)를 새 창으로 연다.
   - 첫 화면 주소만 쓰고, 제휴·추적 매개변수를 붙이지 않는다.
   - 줄마다 "가입이 필요할 수 있어요 · 일부 유료"를 적는다. 화면 수나 요금 같은 정확한 숫자는 쓰지 않는다.
   - 앱 종류별 영어 찾을 낱말 칩을 두고, 누르면 복사한다.
   - 맨 아래: "그림은 참고만 하고, 그대로 가져오지 마세요."
   - 자료는 `looks.json` `references`(`checkedAt`, `needsReview: true`)이고, 검색 주소 꼴은 H16 뒤에 바꾼다.
8. **맨 아래 [만들 앱 정하기로 가기].**

### 4.10 자료·엔진·화면 파일

- **자료:**
  - `data/looks.json` + `schemas/looks.schema.json`: moods · neutrals · accents · fonts(판·라이선스·받는 법·`checkedAt`·`sources`) · radius · density · motion · iconSets · imagery · layouts · defaultsByType · components · keywords · references · referenceKeywords
  - `templates.json`에 `look` 묶음(6번 문장)을 더하고, 지금의 `styles` 넷은 옮긴 뒤 지운다.
  - `questions.json` `q.style`에 `warm`·`retro` 보기와 직접 쓰기를 더하고 alt를 고친다. `templates.types.*.screens[].components`(부품 id 목록)를 더한다.
- **엔진** `src/lib/engine/look.ts`(순수): `lookSpec` · `lookChecks` · `deriveAccent` · `renderLookSection` · `renderLookCss` · `renderDesignMd` · `LOOK_FILE_NAME = 'DESIGN.md'`.
  - `evaluate()`는 `session.look`을 결과에 실어 둘 뿐이다. 추천·점수·막힌 곳은 그대로다.
  - 그래서 골든 기대값도 그대로다. `docs/ENGINE.md`에 look 절을 더한다.
- **화면:** `Interview.tsx`(추천 순서·직접 쓰기·글 버튼) · `LookSheet.tsx`(지연) · `LookPreview.tsx` · `src/styles/look.css` · 설계도 칸 디자인 묶음 · `map/model.ts` `PALETTE_OF`에 `warm: 'cute'`, `retro: 'bold'` · `store.ts` `Session.look` · `ko.ts` `look` · `src/pages/looks.astro`
- **영수증 링크:** 보기 id와 직접 고른 색 코드(`#RRGGBB`)만 싣는다. 직접 쓴 글은 싣지 않는다. 모르는 id는 `fromShareState`가 버린다.

### 4.11 예산·시험

- **예산:** 디자인 시트 묶음 14KB(gzip, 지연), `/looks` 섬 4KB, 견본 SVG 한 번에 2장(약 6KB). `qa:budget`에 줄로 더한다.
- **시험:**
  - 단위 시험:
    - 앱 종류별 기본값 7종
    - 낱말표: ‘바다처럼 시원하게’ → teal, ‘레트로 게임’ → retro, ‘다크’ → both
    - 직접 고른 색 6개(#00A651 · #FFD400 · #808080 · #E4007F · #7B3FE4 · #FFFFFF)의 글자색과 대비(모두 4.6 이상)
    - 80쌍 대비(4.6 이상), 테두리(3.1 이상)
    - 짧은 판·전체 판의 줄 수
    - '둘 다'일 때만 어두운 미디어 쿼리가 나오는지
  - `npm run check`에 `docs/examples/*.design.md` 린트를 더한다(개발 의존성 `@google/design.md@0.4.0`, 판 고정, 오류·경고 0).
  - e2e `tests/e2e/look.spec.ts`: 키보드만으로 느낌 질문 → 글 버튼 → 대표 색 → `#00A651` 입력 → 대비 알림 → [다 정했어요] → … → 설계도 받기 → DESIGN.md 내려받기. axe와 동작 줄이기도 본다.

---

## 5. 만들기 안내

정본: 도구는 `aitools.md`, 서비스는 `services.md`, 일하는 법·돌보기는 `companions.md` 8절이다.

### 5.1 때 다섯, 갈래 열하나

때 이름 다섯은 만들기 안내의 머리, 다음 할 일(5.8절)의 묶음, 자료의 `when`이 함께 쓰는 한 벌이다. 안내 한 장이 어느 때에 놓이는지는 그 안내의 `when`이 정하고, 갈래는 그 안의 주제다.

| 때 (`when`) | 갈래 (`kind`) |
|---|---|
| **오늘 신청해 둘 것** (`today`) | 데이터 키 `data-key` (승인에 몇 시간~며칠 걸리는 신청) |
| **만들기 전에** (`before-build`) | 컴퓨터 준비 `basics` · AI 도구 `ai-tool` · GitHub `github` |
| **만들면서** (`during`) | AI와 일하는 법 `work` · **디자인 `design`(새)** · 저장과 로그인 `backend` |
| **공개하기** (`before-launch`) | 공개할 곳 `deploy` · 공개 전 안전 확인 `security` |
| **공개한 뒤** (`after-launch`) | 돌보기 `care` · 고치고 늘리기 `grow` |

- 비평은 넷째 이름을 '공개하기 전에'로 제안했지만 **'공개하기'로 정한다.** 이 묶음에는 공개 전 확인과 실제로 올리는 일이 함께 들어 있어서다(5.8절의 고정 순서: 키 → 문 → 저장소 공개 범위 → 올리기).
- 배포를 가리키는 말은 화면에서 **'공개하기'** 하나만 쓴다. '화면 올리기'는 버리고, '배포'는 사전 표제어로 풀이한다(같은 말: 공개하기, 디플로이).
- 표는 갈래가 주로 놓이는 때다. 허브는 `when` → `kind` 순으로 묶으므로, 같은 갈래가 두 때에 나올 수 있다(예: 업데이트 안내는 `kind: 'ai-tool'`, `when: 'during'`이라 '만들면서 › AI 도구'에 나온다).
- 업데이트·훅·MCP 안내는 갈래를 새로 만들지 않는다. 업데이트는 'AI 도구', 훅·MCP·스킬은 'AI와 일하는 법'에 두고 꼬리표 **'익숙해진 뒤'**를 단다(`level: 'later'`). '처음이면 이 세 장'과 다음 할 일 기본 줄에는 나오지 않는다.

### 5.2 자료 모델: `data/guides.json` + `schemas/guides.schema.json`

`aitools.md` 6.1절의 모양을 쓰고, `services.md` 12절의 칸을 더한다. 핵심만 적는다.

```ts
type Guides = { version: 1; tools: Tool[]; services: Service[]; guides: Guide[] };

type Tool = {            // AI 도구 15개. '앱 안에서(터미널 없이)' 무리는 새 도구가 아니라 기존 도구의 'desktop' 쓰는 곳이다(7.7절)
  id: string; name: string; vendor: string;
  family: 'chat' | 'builder' | 'editor' | 'terminal';
  aiTag: 'ai.chat-free' | 'ai.chat-paid' | 'ai.builder' | 'ai.agent';
  tier: 1 | 2;            // 1 = 단계 안내, 2 = 공식 안내 카드
  surfaces: { kind: 'cli' | 'desktop' | 'ide-extension' | 'editor' | 'web' | 'mobile'; label?: string; paidOnly?: boolean; needsReview: boolean }[];   // aitools.md 6.1에서 되살림. label 예: "ChatGPT 앱의 Codex", "Claude 앱의 Code 탭"
  os: ('windows' | 'mac' | 'linux' | 'web')[];
  requires?: { node?: string };   // '>=22' 같은 꼴. 공식 문서 값만. node-install의 기대 결과 문장을 여기서 만든다
  minAge?: MinAge;        // 가입 나이 조건(아래)
  suits: string;          // "-요"체 한 줄
  price: { start: 'free' | 'free-limited' | 'paid-only' | 'unknown'; note?: string };
  account: ('google' | 'github' | 'chatgpt' | 'claude' | 'email')[];
  instructionFiles: { path: string; scope: 'project' | 'user' | 'scoped' | 'ui'; where?: string[]; limitChars?: number }[];
  skillDirs: string[];
  setupTarget: 'claude-code' | 'agents-md' | 'gemini-cli' | 'builder-text' | 'replit' | 'chat';   // 'copilot'은 v3.0에서 뺌(6.1절)
  latest?: { version: string; from: string; checkedAt: string };   // 'npm:@google/gemini-cli'
  officialDocs: string; changelog?: string; guideIds: string[];
  checkedAt: string; reviewEveryDays: number; needsReview: boolean; sources: SourceRef[];
};

type Service = {         // 가입·키·배포 서비스. products.json과 productId로 잇는다
  id: string; productId?: string; name: string; kind: Guide['kind'];
  lead: 'now' | 'hours' | 'days'; paymentCard: boolean; keyPublic: 'ok' | 'never' | 'limited';
  minAge?: MinAge;
  guideIds: string[]; checkedAt: string; reviewEveryDays: number; needsReview: boolean; sources: SourceRef[];
};

// 나이 조건. 숫자는 page·repo 출처가 있을 때만 화면에 낸다(5.3절 규칙 7)
type MinAge = { years: number; guardianUnder?: number; note?: string; needsReview: boolean; sources: SourceRef[] };

type Guide = {
  id: string; kind: 'basics' | 'ai-tool' | 'github' | 'data-key' | 'work' | 'design' | 'backend' | 'deploy' | 'security' | 'care' | 'grow';
  task: 'signup' | 'install' | 'first-run' | 'rules' | 'skills' | 'hooks' | 'mcp' | 'update' | 'uninstall' | 'key' | 'deploy' | 'check' | 'howto' | 'fix';   // aitools.md 6.1의 다섯을 되살림
  when: 'today' | 'before-build' | 'during' | 'before-launch' | 'after-launch';   // 화면 이름은 5.1절 다섯
  level?: 'start' | 'later';   // 'later' = '익숙해진 뒤' 꼬리표. 없으면 'start'
  title: string;          // 동사로: "윈도우에 Claude Code 설치하기"
  useWhen?: string;       // '이럴 때 보세요'
  answer?: string;        // '한 줄 답'
  minutes: number; needs: string[];
  variants: { os: 'windows' | 'mac' | 'linux' | 'any'; steps: Step[]; verify?: Step; fixes: Fix[] }[];
  testedVersion?: string;
  checkedAt: string; reviewEveryDays: number; needsReview: boolean; sources: SourceRef[];
};
type Step = { id: string; say: string; where?: string[]; command?: { shell: 'bash' | 'zsh' | 'powershell' | 'cmd' | 'any'; code: string }; expect?: string; terms?: string[]; admin?: boolean; sourceRef: number };
type Fix = { match: string; errorId?: string; say: string; steps: Step[] };
type SourceRef = { url: string; label: string; via: 'page' | 'repo' | 'registry' | 'docs-tool' | 'search-summary'; checkedAt: string };
```

- **OS 하나 = 페이지 하나가 아니다.** 안내 한 장이 OS별 `variants`를 품고, 화면은 OS 탭으로 보인다. 그래서 `aitools.md`의 `{tool}-install-{os}` id는 `{tool}-install` 하나로 합친다.
- **경계:**
  - 안내는 사실이라 `data/guides.json`에 둔다.
  - 화면 고정 문구는 `ko.ts`, 설계도·설정 파일 문장 틀은 `templates.json`에 둔다.
  - 어떤 안내를 보일지는 엔진(`selectGuides`, `nextSteps`)이 정한다. 화면은 보여 주기만 한다.

### 5.3 검사 규칙 (`scripts/lib/validate.ts`에 더함)

1. id가 겹치지 않는다. `guideIds` · `needs` · `errorId` · `terms` · `productId`가 가리키는 것이 실제로 있다.
2. **`command`가 있는 단계의 출처는 `via`가 `page`·`repo`·`docs-tool`이어야 한다.** 아니면 그 안내는 `needsReview: true`여야 하고, 화면은 단계를 보이지 않는다.
3. `price.note`에 숫자가 있으면 `page`나 `repo` 출처가 있어야 한다.
4. `checkedAt`이 오늘보다 뒤면 오류다. 기한(`checkedAt + reviewEveryDays`)이 지나면 `check`에서는 경고, `validate:release`에서는 1순위 도구·안내일 때 오류다.
5. `say`·`expect`·`title`은 `npm run words` 검사를 받는다. 한 문장이 40자를 넘으면 경고한다.
6. `command.code`는 원문 글자 그대로 둔다. 판 번호가 박힌 명령은 쓰지 않는다(공식 명령 자체에 박힌 경우는 예외로 `pinned: true`). `@latest`·`@preview` 같은 채널 이름은 판 번호가 아니다.
7. **`minAge`의 숫자는 `via`가 `page`·`repo`인 출처가 있을 때만 화면에 낸다.** 아니면(`needsReview: true`) 가입 카드에는 숫자 없이 "가입할 수 있는 나이가 정해져 있어요. 공식 약관에서 확인해 주세요." + 약관 링크만 보인다. `minAge`가 아예 없는 가입 서비스는 `validate`가 경고한다.
8. `node-install`의 기대 결과 문장과 '다시 설치' 기준은 `tools[].requires.node`에서 만든다. 문장에 판 번호를 손으로 쓰지 않는다.

### 5.4 첫 안내 목록 (모두 checkedAt 2026-10-14)

'단계'는 명령·메뉴까지 보인다는 뜻이다. '카드'는 `needsReview: true` 상태로, '공식 안내 열기'와 무엇을 고르면 되는지만 보인다.

| 때 › 갈래 | 안내 id (OS 탭) | 낼 꼴 | 출처 (via) |
|---|---|---|---|
| 만들기 전에 › 컴퓨터 준비 | `terminal-open` (윈도우 · 맥) | 윈도우 단계 / 맥 카드 | MicrosoftDocs/terminal [저장소] · support.apple.com [검색 요약] |
| | `node-install` (윈도우 · 맥, '다른 길'은 접기) | 단계. 기대 결과와 '다시 설치' 기준은 고른 도구의 `requires.node`에서 만든다(5.3절 규칙 8). 예: "`node --version`이 v22 이상이면 돼요. 새로 깔 때는 LTS라고 적힌 판을 고르세요." **Claude Code 기본 설치는 Node가 필요 없으므로 `claude-code-install`의 `needs`에 넣지 않는다**(npm 설치만 Node 22 이상 [원문]). 오늘 사실: v24가 지금 LTS이고 2026-10-20 유지보수로, v26이 2026-10-28 LTS가 된다. v22 지원은 2027-04-30까지다 [저장소, nodejs/Release `schedule.json`] | nodejs.org/dist/index.json [레지스트리] · nodejs.org snippets · nodejs/Release [저장소] |
| | `git-install` (윈도우 · 맥) | 윈도우 단계(설치 파일) / 맥 카드 | git-for-windows 릴리스 [원문] · git-scm.com/install/mac [검색 요약] |
| | `vscode-install` (윈도우 · 맥) | 단계 | microsoft/vscode-docs `setup/*` [저장소] |
| | `ps-execution-policy` (윈도우) | 단계: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` | PowerShell-Docs about_Execution_Policies [저장소] |
| 만들기 전에 › AI 도구 | `claude-code-install` (윈도우 · 맥 · 리눅스) · `claude-code-first-run` | 단계 | code.claude.com/docs/en/setup · /overview · /memory [원문] |
| | `codex-install` (맥·리눅스 / 윈도우) | 맥·리눅스 단계 / 윈도우 카드(README와 install.md가 어긋남) | github.com/openai/codex README · docs/install.md [저장소] |
| | `gemini-cli-install` (모든 OS, npm) · `gemini-cli-first-run` | 단계 | github.com/google-gemini/gemini-cli docs [저장소] |
| | `copilot-vscode-setup` · `copilot-cli-install` | 단계 | microsoft/vscode-docs `setup/copilot.md` · github/docs `install-copilot-cli.md` [저장소] |
| | `cursor-start` · `devin-desktop-start` · `antigravity-start` | 카드 | cursor.com/docs · docs.devin.ai · antigravity.google/docs [검색 요약] |
| | **`codex-app-start`**(ChatGPT 앱의 Codex) · **`claude-desktop-code-start`**(Claude 앱의 Code 탭, 유료) — 앱 안에서(터미널 없이) | 카드. Codex 쪽은 무료 요금제에서 되는지 확인 전(`needsReview`) | ChatGPT 앱 합치기 [검색 요약, 아래 5.7절] · code.claude.com setup·desktop [원문: 데스크톱 앱 Code 탭은 유료 구독 필요] |
| | `lovable-start` · `bolt-start` · `v0-start` · `replit-start` · `ai-studio-start` | 카드 + '설계도를 넣는 곳' 이름만(확인 전 표시) | docs.lovable.dev · support.bolt.new · v0.app/docs · docs.replit.com · ai.google.dev [검색 요약] |
| | `claude-chat-start` · `chatgpt-start` · `gemini-app-start` | 카드 + 나이 조건 한 줄(5.3절 규칙 7) | claude.com/pricing · help.openai.com · gemini.google [검색 요약] |
| | `agents-md` (규칙 파일 하나로 여러 도구 쓰기) | 단계(설명, 명령 없음) | agentsmd/agents.md · agentskills/agentskills [저장소] · `aitools.md` 4·5절 |
| 만들면서 › AI 도구 (익숙해진 뒤) | **`claude-code-update`**: `claude update`(기본 설치, 평소엔 자동) · `brew upgrade claude-code`(Homebrew) · `winget upgrade Anthropic.ClaudeCode`(WinGet) | 단계(설치한 길마다 OS 탭 안 갈래) | code.claude.com/docs/en/setup [원문] |
| | **`gemini-cli-update`**: `npm install -g @google/gemini-cli@latest`(stable 채널, 매주 화요일 UTC 20:00 배포) | 단계 | google-gemini/gemini-cli README 'Release Channels' [저장소, 2026-10-14] |
| 만들기 전에 › GitHub | `github-signup` · `github-2fa` · `github-repo-web` · `github-desktop` (윈도우 · 맥) · `github-visibility` | 단계 | github/docs [저장소] |
| 오늘 신청해 둘 것 › 데이터 키 | `data-go-kr-apply` · `neis-key` · `kakao-app-key` · `naver-ncp-app` | 카드 | data.go.kr · open.neis.go.kr · developers.kakao.com · ncloud.com [검색 요약] |
| | `other-service` (직접 쓰기 → 공통 다섯 단계) | 단계(조언, 명령 없음) | `services.md` 10.6 |
| 만들면서 › AI와 일하는 법 | `work-one-step` · `work-verify` · `work-save-undo` · `work-new-chat` · `work-stuck` · `work-rules-skills` · `work-install-extras` | 단계(말 견본) | code.claude.com best practices [원문] 외 `companions.md` 8절 |
| | **`claude-code-hooks`** (익숙해진 뒤): 공식 예 두 개만. ① AI가 기다릴 때 알림(`Notification`, macOS `osascript`, Windows는 공식 문서의 `powershell.exe` 예. 윈도우는 알림이 아니라 대화 상자가 열리고 터미널 뒤에 열릴 수 있다고 원문이 적었다) ② `.env` 같은 파일 고치기 막기(`PreToolUse` + `.claude/hooks/protect-files.sh`, `jq` 필요, macOS·리눅스는 `chmod +x`. 셸 명령으로 고치는 것까지는 막지 못한다고 원문이 적었다). 확인은 `/hooks` | 단계 | code.claude.com/docs/en/hooks-guide [원문, 2026-10-14] |
| | **`gemini-cli-hooks`** (익숙해진 뒤): `docs/hooks/writing-hooks.md`의 예만. "stdout에는 JSON 하나만" 경고를 함께 | 단계(원문에 그대로 쓸 예가 없으면 카드) | google-gemini/gemini-cli `docs/hooks/` [저장소] |
| | `work-builder-exit` | 카드 | Lovable GitHub 내보내기 [검색 요약] |
| 만들면서 › 디자인 (새) | `design-apply` (CSS 값 넣기) · `design-md` (DESIGN.md 쓰는 법) · `design-check` (6-10·6-11로 확인) · `design-references` (다른 앱 둘러보기 → `/looks`) | 단계(말 견본) | 이 문서 4절 · `@google/design.md` 0.4.0 [확인] |
| 만들면서 › 저장과 로그인 | `supabase-project` · `supabase-keys` · `supabase-rls` | 단계 | Supabase 문서 [문서 도구 · 저장소] |
| | `firebase-project` · `firestore-create` · `firebase-auth-domains` | 카드. **Firebase Studio로 가는 길은 어디에도 내지 않는다**(5.7절) | firebase.google.com [검색 요약] |
| 공개하기 › 공개할 곳 | `pages-branch` · `pages-actions-vite` · `pages-actions-astro` | 단계 | github/docs · vitejs/vite `static-deploy.md` · withastro/docs `deploy/github.mdx` [저장소] |
| | `cf-workers-connect` · `cf-workers-secret` · `cf-workers-domain` | 단계 | cloudflare/cloudflare-docs [저장소] |
| | `vercel-import` · `netlify-import` · `firebase-hosting-cli` | 카드(Firebase는 CLI 명령만 [저장소]) | [검색 요약] |
| | `builder-publish` (웹에서 만드는 도구의 게시 기능) | 카드. 빌더마다 '공식 안내 열기' | 각 빌더 문서 [검색 요약] |
| 공개하기 › 공개 전 안전 확인 | `before-launch-keys` · `before-launch-rls` · `before-launch-rules` · `before-launch-limits` | 단계(확인 목록) | `services.md` 8절 출처 |
| 공개한 뒤 › 돌보기 | `care-after-launch` | 단계 | `services.md` 11.1 |
| 공개한 뒤 › 고치고 늘리기 | `grow-fix-scope` · `grow-add-feature` | 단계 | `companions.md` 8절 |

- **P1로 더할 안내:**
  - `mcp-what-and-how` (만들면서 › AI와 일하는 법, 익숙해진 뒤): MCP가 무엇인지, `claude mcp add` 명령의 **꼴**만 보인다(`claude mcp add --transport <방식> <이름> …`). 서버 이름·목록은 싣지 않는다(R-06). 출처 code.claude.com/docs/en/mcp [원문].
  - `work-limit` (만들면서 › AI와 일하는 법): 사용 한도에 걸렸을 때. 숫자 없이 "새 대화로 이어 갈 때" 장으로 정리 → 설계도 파일과 `docs/progress.md`로 다른 AI에서 이어 가기. 무료 등급 이용자가 가장 자주 부딪치는 곳이다.
  - `codex-update` · `*-uninstall`: 원문·원본에 명령이 있는 도구만.
- **합계:** 안내 약 56장(그중 카드 약 23장), 도구 15개(쓰는 곳 `surfaces` 포함), 서비스 약 15개다. JSON은 약 150~200KB이고, 쪽마다 그 안내 몫만 구워 넣는다.
- **에러 안내에 더할 카드:** `ps-and-token` · `irm-not-recognized` · `npm-ebadengine` · `settings-json-error` · `ps-execution-policy` · `pages-404-entry`. 앞의 넷은 [원문]이고 나머지 둘은 `services.md` 13.3절이다.
- **어려운 말 풀이에 더할 말:** PATH · WSL · PowerShell · CMD · Homebrew · WinGet · 설치 스크립트 · AGENTS.md · CLAUDE.md · 규칙 파일 · 스킬 · 권한 모드 · 계획 모드 · LTS · 숨김 폴더 · 디자인 값 · DESIGN.md · 명도 대비 · 어두운 화면 · 글꼴 라이선스 · 아이콘 묶음 · RLS(이미 있으면 뺌)

### 5.5 화면

- **`/guides` 첫 화면** (`services.md` 10.2 + `companions.md` 6.7):
  1. H1 "만들기 안내" + 한 줄 "내 AI와 만들 때 필요한 가입·설치·공개 방법을 공식 문서대로 모았어요." + "가장 오래된 확인: {가장 이른 checkedAt}"
  2. **내 다음 할 일 띠 한 줄**(설계도를 받은 적이 있을 때만): "내 다음 할 일 {n}개 중 {m}개 마침 › [다음 할 일 보기]"(→ `/arrival#next`). 4단계가 `cc:prep:v1`에 남긴 `guideIds`와 `cc:guides:v1`만 읽는다(3.7절 `progressCount`). **'내 설계도에 필요한 것만' 스위치는 두지 않는다:** 스위치는 `nextSteps()`를 불러 엔진·자료 묶음(약 59KB)을 `/guides`에 싣게 되고(섬 5KB 상한을 넘음), 같은 할 일 목록을 두 화면에 만든다.
  3. **거르기**(접힌 단추 "거르기 (n)"): 컴퓨터(윈도우 · 맥 · 리눅스 · 다른 컴퓨터(직접 쓰기)) · 갈래 · 기다림(바로 · 몇 시간 · 며칠) · 비용(결제 카드 없이 · 결제 카드 필요). P1: '학교·회사 컴퓨터(관리자 권한 없음)'(`Step.admin`이 있는 안내를 뒤로 보내고 꼬리표를 단다). 거른 상태는 `?os=mac&k=deploy`로 남는다. 서버로 가지 않고, 공유와 뒤로 가기가 된다.
  4. **"처음이면 이 세 장"**: 한 단계씩 맡기기 · 저장하고 되돌리기 · 막혔을 때. ('익숙해진 뒤' 꼬리표 안내는 여기에 넣지 않는다.)
  5. 때 다섯 아래 갈래 줄(56): "갈래 이름 + 안내 {n}장 ›". 누르면 그 자리에서 안내 줄이 펼쳐진다(`<details>`). `#work`처럼 주소 조각으로 바로 연다.
  6. 맨 아래 **다른 서비스(직접 쓰기)**(7.5절과 같은 부품).
- **`/guides/[id]` 한 장** (`services.md` 10.3):
  - 칸 순서: 머리(제목 · 걸리는 시간 · 꼬리표 · **"2026-10-14 공식 문서로 확인"**) → 이걸 하면 → 먼저 할 것 → OS 탭(`role="tablist"`, 고른 값은 `cc:prefs:v1.os`) → 단계 → 막혔을 때 → 조심할 것 → 공식 안내 → 다음. '확인한 버전'(`testedVersion`)은 맨 아래 접기 '확인한 환경' 안에 둔다(매주 바뀌는 번호가 머리에 있으면 초심자가 오히려 의심한다).
  - 단계마다: 할 일 한 문장 · 메뉴 경로(굵게, 화면 글 그대로) · 명령(복사 단추, 원문 그대로) · **"이게 보이면 맞아요"** · 확인란 "이 단계 마침"(`cc:guides:v1`)
  - **명령 블록(360px):** 화면 전체가 가로로 밀리지 않게 블록 안에서만 가로로 굴린다(예: `install.cmd` 줄). 블록은 `tabindex="0"` + `role="region"` + `aria-label="명령"`(axe `scrollable-region-focusable`). 복사는 원문 그대로. 줄을 접어 보이지 않는다(복사한 글과 화면 글이 달라 보이면 안 된다).
  - **스크립트가 없을 때와 인쇄할 때:** OS 탭 대신 OS별 판을 모두 펼쳐 각각 `<h2>`(예: "윈도우에서")를 단다.
  - 출처 표시는 화면에서 "공식 문서" / "공식 문서 원본" / "검색으로만 확인"으로 바꿔 쓴다.
  - 맨 아래 문장: "코드쇼퍼가 공식 문서를 읽고 정리했어요. 각 회사와 관계없어요." 제품 로고는 쓰지 않는다.
  - 기한이 지났으면 머리에 "확인한 지 {n}일 지났어요. 화면이 다르면 공식 안내를 따라 주세요."를 붙인다. 날짜는 빌드 때 박고, 날 수는 이용자 기기 날짜로 센다(외부 호출 없음).
  - **기한의 두 배가 지나면(P1):** 기기 날짜가 `checkedAt + 2 × reviewEveryDays`를 넘으면 단계 칸을 카드 모양으로 바꾸고 명령을 감춘다. 판단은 순수 함수 `guideFreshness(checkedAt, reviewEveryDays, today)` → `'fresh' | 'stale' | 'expired'`(단위 시험). 정적 HTML에는 단계가 들어 있고, 섬이 'expired'일 때만 감춘다.
  - `needsReview` 안내는 단계 칸 대신 "이 안내는 아직 공식 화면과 대조하지 못했어요."와 무엇을 고르는지만 보인다(예: "지역은 Seoul").
- **섬:** 둘뿐이다. 허브는 거르기 + 다음 할 일 띠, 한 장은 OS 탭 + 확인란 + 복사 + 기한 판단이다. 각각 5KB 이하이고 엔진을 불러오지 않는다. 나머지는 정적 HTML이다.

### 5.6 놓이는 자리 (최신 버전 안내를 '알맞은 자리에 기능으로')

| 자리 | 무엇이 나오나 |
|---|---|
| 내 AI 써 보기 | AI 채팅 칩 → '아직 없어요'면 `*-chat-start` 카드 셋(나이 조건 한 줄 포함). 연습 3 끝에 '만들기 안내 › 만들기 전에' 링크 |
| 1단계 '쓰는 AI' 질문 | 타일 아래 작은 글 "설치 안내 있음"(1순위 도구만, 표시만) |
| 2단계 도구 카드 | 꼬리표 "승인 기다림 · 며칠"(또는 "· 몇 시간") · "결제 카드 필요"(`services` 자료의 `lead`·`paymentCard`) |
| 도구 상세 `/tools/[id]` | '쓰기 전에' 아래 **'시작하기'** 칸: 핵심 단계 3~5줄 + [전체 안내 보기 ›]. 카드 상태면 '공식 안내 열기' + 무엇을 고를지 한 줄 |
| 4단계 다음 할 일 | 5.8절 |
| 4단계 설계도 칸 | AI 설정 파일(6절). 받은 뒤 "AI가 읽었는지 확인하는 첫 메시지"와 도구별 확인 명령(Claude Code `/memory`, Gemini CLI `/memory show`) |
| 사전 | '안내' 결과 묶음, 에러 카드의 `fixes`로 이어진 안내 |
| 소개 · 추천 기준 | "안내는 공식 문서만 옮기고 확인한 날을 적어요. 확인하지 못한 단계는 공식 안내로 보내요." 한 문단 |

### 5.7 최신 지키기

- **기한:** 터미널·편집기 30일, 웹 빌더 45일, 채팅 90일, 서비스 60일. 이름이 바뀌거나 합쳐졌다는 소식이 들리면 기한과 관계없이 바로 다시 본다. 예: Windsurf → Devin Desktop, Codex 앱 → ChatGPT 앱.
- **`scripts/check-guides.ts`(`npm run guides`):** 안내마다 지난 날 수, 기한, `needsReview`, 검색 요약 출처 수를 표로 낸다. `--today=`(시험용)와 `--strict`(1순위가 기한을 넘기거나 `needsReview`면 실패)를 받는다. `check`에는 경고로, `validate:release`에는 `--strict`로 넣는다.
- **`scripts/check-guide-versions.ts`(`npm run guides:versions`, CI 전용):** `latest.from`이 `npm:`인 도구의 `npm view <패키지> version`을 기록과 견준다. 달라도 '틀림'이 아니라 "변경 기록을 읽어 볼 것"으로 올린다. Claude Code는 패치 번호만 올라가도 동작이 바뀐다(2.1.277 AGENTS.md 읽기, 2.1.283 auto 모드 기본) [원문].
- **`.github/workflows/guides-watch.yml`:** 매주 월요일 `cron: '17 0 * * 1'`(한국 시각 09:17)에 돈다. 결과로 이슈 하나("AI 도구 안내 확인 필요 YYYY-MM-DD", 꼬리표 `guides`)를 만들거나 고친다.
  - 권한은 `permissions: issues: write`뿐이고, 비밀 값은 없다.
  - 비공개 저장소의 Actions 무료 시간(GitHub Free 월 2,000분 [저장소: github/docs 'GitHub's plans'·'GitHub Actions billing', `services.md` 2.2절])에서 한 번에 1~2분이다.
- **`npm run guides -- --coverage`(소유자 요청 (4)의 확인 기준):** 미리 짠 코스 다섯을 각 코스의 기본 AI로 돌려, 다음 할 일 '만들기 전에' 줄마다 단계 안내인지 카드인지 낸다. **목표: 코스 길 위의 줄 80% 이상이 단계 안내.** 못 미치면 모자란 안내 id를 H14·H21 줄에 적는다. 출시 전 확인표(8.4절)에 들어간다.
- **사이트 화면은 이 스크립트와 관계없다.** 화면에서 버전을 조회하지 않는다(꼭 지킬 것 1).
- **에이전트가 다시 확인하는 차례:** `/next-task`가 이슈를 보고 원문을 읽을 수 있는 출처(code.claude.com, GitHub 저장소, npm)를 다시 읽고 `checkedAt`을 올린다. 새 스킬 `/add-guide`(`/add-product`와 같은 방식)를 둔다. 막힌 사이트는 H14·H21로 넘긴다.
- **이미 알려진 날짜**(TASKS에 날짜 줄로 넣는다):

| 날짜 | 무엇 | 고칠 안내 | 근거 |
|---|---|---|---|
| 2026-06-02 (지남) | Windsurf → **Devin Desktop**으로 이름 바뀜. Cascade는 2026-07-01에 끝남 | `devin-desktop-start` (Windsurf 이름은 '예전 이름' 한 줄만) | [검색 요약] docs.devin.ai FAQ · tech-insider.org |
| 2026-06-22 (지남) | **Firebase Studio 새 가입·새 작업 공간 만들기 막힘.** 있던 작업 공간만 쓸 수 있음. Firestore·Authentication·Hosting은 영향 없음 | 어디에서도 Firebase Studio로 시작하는 길을 내지 않는다. `firebase-*` 카드는 그대로 | [검색 요약] firebase.google.com/docs/studio/migrating-project(원문은 이 환경에서 `ENOTFOUND`) · en.wikipedia.org/wiki/Firebase_Studio |
| 2026-07-09 (지남) | **Codex 앱이 새 ChatGPT 데스크톱 앱에 합쳐짐**(Chat · Work · Codex 세 모드). 옛 ChatGPT 앱은 'ChatGPT Classic'. `codex app` 명령이 엉뚱한 앱을 연다는 신고가 있음 | `codex-app-start` 카드, `codex-install`의 '조심할 것'. `aitools.md`의 "합쳐지는 중"은 낡은 말 | [검색 요약, 2차 자료만] en.wikipedia.org/wiki/OpenAI_Codex_(AI_agent) · support.addigy.com(53439709931155) · codex.danielvaughan.com(2026-07-17) |
| 2026-10-19 | Antigravity 옛 워크플로(`.agents/workflows/`) 멈춤 | `antigravity-start` | [검색 요약] |
| 2026-10-20 | Node 24가 유지보수 LTS로 | — | [저장소] nodejs/Release `schedule.json` |
| 2026-10-28 | Node 26이 LTS로 (같은 날 v27 알파) | `requires.node`는 그대로(최소 판). 안내 문장의 'LTS를 고르세요'는 판 번호가 없어 고칠 것 없음 | [저장소] |
| 2026년 말 | Supabase 옛 키 이름(`anon`·`service_role`) 지원 끝 | `supabase-keys` | [문서 도구] (`services.md`) |
| 2027-03-22 | Firebase Studio 종료(남은 자료 지움) | 위 줄과 같음 | [검색 요약] |
| 2027-04-30 | Node 22 지원 끝 | `requires.node`가 22인 도구의 안내 | [저장소] |

### 5.8 다음 할 일 (`nextSteps`)

- **엔진 함수:** `nextSteps(evaluation, { os, prefsOsText? })` → `NextStepGroup[]`. 순수 함수다.
  - 문장은 `templates.json` `nextSteps.*`, 연결은 `guides.json`에서 가져온다.
  - 어느 고름에서 왔는지 `why` 한 줄을 단다("고른 도구 Supabase 때문").
- **때 다섯** (`services.md` 11.1, 이름은 5.1절 한 벌):

| 때 | 들어가는 것 |
|---|---|
| 오늘 신청해 둘 것 | 기다림이 며칠·몇 시간인 신청 |
| 만들기 전에 | 계정(가입 카드에 나이 조건 한 줄), 컴퓨터 준비(`services.md` 3.5절 표로 필요한 것만), AI 도구 설치·첫 실행, **AI 설정 파일 넣기**(코딩 에이전트) 또는 **설계도를 넣을 곳**(웹 빌더·채팅), **먼저 읽어 둘 용어 {n}개 (10분)** |
| 만들면서 | 설계도 10번 단계가 그대로 줄이 된다. 줄마다 [시작하는 말 복사] · 완성 확인 · 내가 해 볼 확인 1~3줄 · 이 단계에서 볼 용어 · 그 도구의 하위 줄(키를 Worker 비밀 값으로, RLS 켜기 등) |
| 공개하기 | 고른 도구에 걸린 확인과 올리기. 고정 순서: 키 → 문(RLS·규칙) → 저장소 공개 범위 → 올리기. 7줄 안쪽. 웹에서 만드는 도구면 마지막 줄은 '빌더의 게시 기능으로 공개하기'(`builder-publish`, 7.7절) |
| 공개한 뒤 | 한도 · 키 기한 · 일시 정지 · "나중에 붙일 것이 {n}개 있어요"(→ `grow-add-feature`) |

- **머리 줄:** "설계도를 받은 뒤 할 일이에요. 하나씩 마치면 표시해 두세요." + `<progress>`와 같은 글 "{n}개 중 {m}개 마침" + 컴퓨터 칩 "윈도우 기준 · 바꾸기"(`cc:prefs:v1.os`). 이 칸은 주소 조각 `/arrival#next`로 바로 연다(`/guides` 띠가 쓴다).
- **진행 세기:** 3.7절의 규칙대로 `progressCount()`가 센다. 안내가 걸린 줄은 `cc:guides:v1`, 나머지는 `cc:prep:v1`.
- **P1 `os: 'mobile'`:** "휴대폰·태블릿만 있어요"를 고르면 다음 할 일은 웹에서 만드는 도구·AI 채팅 길만 보이고, 1단계 '어떤 AI로 만드나요?'의 코딩 에이전트 타일에 "컴퓨터가 필요해요" 꼬리표를 붙인다(고르는 것은 막지 않는다).
- **맨 아래 '할 일 직접 더하기'(40자):** 이 브라우저에만 저장한다. 설계도 8번에 "(내가 더함)"으로 들어가고, 영수증 링크에는 넣지 않는다.
- **접근성:**
  - 묶음 머리는 `<h3>`다. **줄 하나는 확인란 + 보이는 라벨, 그 옆에 펼치기 버튼 "자세히"**(`aria-expanded`·`aria-controls`)다. 확인란을 `<summary>` 안에 두지 않는다(겹친 조작 요소, axe `nested-interactive`). 확인란은 진짜 `<input type="checkbox">`다.
  - 표시하면 `aria-live="polite"`로 "{n}개 중 {m}개 마쳤어요."를 한 번 알린다. 한 묶음을 다 마치면 접고, 초점을 다음 묶음 머리로 옮긴다.
- **영수증과의 관계:** 영수증 '준비물 n개'는 지금처럼 상품의 `prep`만 센다(3.9절). 설계도 8번은 두 머리로 나눠 숫자가 어긋나지 않게 한다: **"가입하고 받을 것 ({n}개)"**(= 영수증 숫자) · **"내 AI와 컴퓨터 준비"**.
- **집계:** 새 이벤트를 만들지 않는다. [시작하는 말 복사]는 'AI에게 할 말 복사'(`card_copy`)에 구간 `step`으로 센다. 이 구간을 `event-spec.ts`에 더해야 버려지지 않는다(3.3절 E-01).

---

## 6. AI 설정 파일

정본: `aitools.md` 5·7절. 원칙은 **내용은 AGENTS.md에만 쓰고, 다른 파일은 AGENTS.md를 가리키기만 한다**는 것이다.

### 6.1 도구별로 만드는 파일 (`renderAiSetup(evaluation, { toolId, customToolName?, os, notify? })`, 순수)

| `setupTarget` | 고른 AI | 파일 |
|---|---|---|
| `claude-code` | Claude Code(터미널 · VS Code 확장 · Claude 앱의 Code 탭) | `AGENTS.md` · `CLAUDE.md`(`@AGENTS.md` 한 줄 + Claude Code 전용 두 줄, 20줄 이하) · `docs/codechauffeur-plan.md` · `docs/progress.md` · `.claude/settings.json`(권한 규칙만) · (선택) `.claude/settings.local.json`(알림 훅, 맥·윈도우만) · `.claude/skills/check-step/SKILL.md` · `.claude/skills/fix-error/SKILL.md` · `.gitignore` 추가 줄 · `DESIGN.md` |
| `agents-md` | Codex(터미널 · ChatGPT 앱의 Codex) · Cursor · Devin Desktop · Antigravity · Copilot CLI · **VS Code + Copilot** · **직접 쓴 도구** | `AGENTS.md` · `docs/codechauffeur-plan.md` · `docs/progress.md` · `.agents/skills/check-step/SKILL.md` · `.agents/skills/fix-error/SKILL.md` · `.gitignore` 추가 줄 · `DESIGN.md` |
| `gemini-cli` | Gemini CLI | `agents-md` + `GEMINI.md`(`@./AGENTS.md` 한 줄) |
| `builder-text` | Lovable · Bolt.new · v0 · Google AI Studio | 파일 없음. **'프로젝트 지식에 붙여 넣을 글'**(1만 자 이하) + 넣는 곳 이름(확인 전 표시) + DESIGN.md 내용 |
| `replit` | Replit | `replit.md` 내용(위 글과 같음) |
| `chat` | Claude · ChatGPT · Gemini 앱 · 유료 구독 | **'프로젝트 지시 글'**(짧게) + "설계도 파일을 첨부하세요". 넣는 곳 이름은 확인 전 표시(`needsReview`) |

- **설계도 전문은 가져오기(`@`)로 싣지 않는다.** Claude Code 공식 문서: "target under 200 lines per CLAUDE.md file", 가져오기는 "don't reduce its context cost, because imported files also load at launch" [원문, code.claude.com/docs/en/memory, 2026-10-14]. 12,000자 설계도를 늘 싣지 않고, AGENTS.md '진행 순서' 첫 줄에 **"단계를 시작할 때 `docs/codechauffeur-plan.md`에서 그 단계 절을 읽는다."**를 둔다. Codex는 가져오기를 모르므로 이렇게 해야 모든 도구가 같은 방식으로 움직인다.
- **CLAUDE.md를 두는 까닭:** Claude Code는 2.1.277부터 CLAUDE.md가 없으면 AGENTS.md를 직접 읽지만, 그보다 낮은 판이나 일부 세션은 읽지 못하고, `CLAUDE.local.md`가 하나라도 있으면 AGENTS.md를 읽지 않는다 [원문, 같은 쪽]. 공식 문서가 권하는 대로 `@AGENTS.md`를 가져오는 CLAUDE.md를 둔다.
- **`copilot` 대상은 v3.0에서 뺀다.** VS Code의 Copilot은 AGENTS.md를 읽는다 [저장소: vscode-docs custom-instructions, `aitools.md` 5절 표]. `.github/copilot-instructions.md`와 `design.instructions.md`(`applyTo` 글롭 확인이 남음)는 실패할 곳만 늘린다. 필요하면 P2.
- **`.claude/settings.json` 권한 규칙:**
  - `ask`: `Bash(rm *)` · `Bash(git push *)` · `Bash(npm install *)` + **`PowerShell(Remove-Item *)` · `PowerShell(git push *)` · `PowerShell(npm install *)`**. 윈도우에서 Git이 없으면 Claude Code는 PowerShell 도구로 명령을 돌린다 [원문, `aitools.md` 3.1]. PowerShell 규칙은 Bash 규칙과 같은 꼴이고, 흔한 별칭은 맞추기 전에 바뀐다(`PowerShell(Get-ChildItem *)`이 `gci`·`ls`·`dir`에 걸림). 그래서 `rm`도 `Remove-Item` 규칙에 걸린다 [원문, code.claude.com/docs/en/permissions]. 맥에서 늘 넣어도 해가 없다.
  - `deny`: `Read(./.env)` · `Read(./.env.local)` · `Edit(./.env)` · `Edit(./.env.local)`. 셸 명령으로 읽는 것까지 막지는 못하므로 AGENTS.md '안전'에도 같은 말을 둔다.
  - 규칙은 deny → ask → allow 순으로 보고, 더 좁은 allow가 넓은 ask를 넘지 못한다 [원문].
- **훅:** **기본 훅은 넣지 않는다.** 도구마다 형식이 달라 옮겨 쓸 수 없다(VS Code 문서가 경고한다 [저장소]). 예외 하나: AI 설정 파일 묶음의 확인란 **"AI가 기다릴 때 알려 줘"**를 켠 맥·윈도우 이용자에게만 `.claude/settings.local.json`에 공식 예(`Notification`, 맥 `osascript` · 윈도우 `powershell.exe` 대화 상자)를 그대로 넣는다 [원문, hooks-guide]. 꺼 둔 것이 기본이다. 훅을 더 쓰려면 만들기 안내 `claude-code-hooks`(익숙해진 뒤)로 보낸다.
- **넣지 않는 것:**
  - MCP: 설정 위치가 도구마다 다르고, R-06이 막는다. 안내는 P1 `mcp-what-and-how`가 맡는다.
  - 남의 스킬·플러그인
- **쓰는 AI를 '아직 안 정했어요'로 두었을 때:** 묶음 맨 위에 '쓰는 AI' 고르개(1단계와 같은 목록 + 직접 쓰기)를 보이고, 고르면 그 자리에서 파일 목록을 다시 만든다. 고른 값은 세션의 `answers`에 넣는다(추천·영수증은 바뀌지 않는다, 태그 `aitool.*`는 점수에 쓰지 않음).
- **직접 쓴 도구:**
  - `agents-md`로 내고, 안내 한 줄을 붙인다: "규칙 파일을 어디서 읽는지는 그 도구의 공식 안내에서 확인해 주세요. 내가 쓰는 AI: {{customToolName}}". 자리 표시 뒤에는 조사를 붙이지 않는다.
  - AI에게 할 말 카드를 하나 더한다(`custom-tool`): "너는 프로젝트 규칙을 어떤 파일에서 읽어? 이 AGENTS.md 내용을 네가 읽는 곳에 맞게 저장해 줘."

### 6.2 틀

- **어디에 두나:** 문장은 `templates.json` `aiSetup.*`, 파일 위치는 `guides.json` `tools[].instructionFiles`에 둔다. 도구가 위치를 바꾸면 자료 한 곳만 고친다.
- **AGENTS.md 짜임:** 머리 두 줄(코드쇼퍼가 만든 작업 규칙 · 설계도 전문 위치) → 만들 것 → 쓰는 도구 → 진행 순서(첫 줄: "단계를 시작할 때 `docs/codechauffeur-plan.md`에서 그 단계 절을 읽는다.") → 안전 → 일하는 방식. 내용은 `aitools.md` 7.3절 견본 그대로이고, 목록은 "-ㄴ다"체다. **200줄 이하**(Claude Code가 가져와 늘 싣는 크기이므로 CLAUDE.md 권장 줄 수를 따른다).
- **영어는 꼭 필요한 곳에만:** 파일 이름, 머리말 키, 스킬 `name`(ASCII 소문자·하이픈), 글롭, JSON. 스킬 `description`은 한국어 한 문장 뒤에 영어 한 문장을 붙인다. 도구가 설명을 보고 스킬을 고르기 때문이다.
- **`docs/progress.md` 첫 파일:** 단계 표(단계 · 상태 · 바꾼 파일 · 메모) + '다음에 할 일'(`companions.md` 7.3). 설계도 12번 세 줄이 이 파일을 쓰게 한다.
- **연결은 늘 가져오기 줄로 한다.** 심볼릭 링크는 쓰지 않는다. Windows에서 문제가 된다고 Claude 문서가 적었다 [원문].

### 6.3 건네는 법 (설계도 칸의 AI 종류별 묶음)

**코딩 에이전트 ('AI 설정 파일' 묶음):**

1. **묶음 파일 + 짧은 메시지(첫 방법, 아래 막대의 주 버튼):** [AI 설정 묶음 내려받기]로 묶음 파일 `codechauffeur-ai-setup-YYYYMMDD-HHmm.md` 하나를 받는다. 모든 파일을 '경로 제목 + 코드 블록'으로 이은 한 파일이다.
   - 화면 안내 두 줄: "① 받은 파일을 내 프로젝트 폴더에 옮겨 두세요. ② 아래 짧은 메시지를 내 AI에게 보내세요."
   - [짧은 메시지 복사](중립): "이 폴더의 codechauffeur-ai-setup 파일을 읽고, 안에 적힌 파일들을 경로 그대로 만들어 줘. 내용은 바꾸지 마. 다 만들면 만든 파일 목록만 보여 주고, 묶음 파일을 지워도 되는지 물어 줘."
   - 숨김 폴더(`.claude/`, `.agents/`)를 손으로 만들 일이 없고, 터미널에 수만 자를 붙여 넣지 않아도 된다.
   - **까닭:** AGENTS.md(1만 자) + 설계도(12,000자) + 스킬 둘 + DESIGN.md를 이으면 3만 자 안팎이다. 한글은 UTF-8로 3바이트라 클립보드로 약 90KB다. 터미널에 이만큼 붙여 넣으면 터미널에 따라 큰 붙여 넣기 경고가 뜨거나 느려질 수 있다 [기억·미확인, H20에서 실측].
2. **전체 메시지 복사(대안, 중립 버튼):** [전체 메시지 복사]는 묶음 파일과 같은 글 맨 앞에 "아래 파일들을 이 프로젝트 폴더에 그대로 만들어 줘. 내용은 바꾸지 마. 다 만들면 만든 파일 목록만 보여 줘."를 붙여 복사한다. 내려받기가 안 되는 앱 안 브라우저와, 묶음 파일을 옮기기 어려운 경우를 위한 길이다.
   - **길이 상한:** 묶음 파일·전체 메시지는 32,000자 이하. 넘으면 6번 짧은 판, 7번 '막히기 쉬운 곳'만으로 줄인다. 단위 시험과 `npm run examples`가 지킨다.
3. **파일마다 보기:** 목록에 경로와 [복사]를 둔다. **맨 위 폴더 파일**(`AGENTS.md` · `CLAUDE.md` · `GEMINI.md` · `DESIGN.md`)만 [내려받기]를 단다. 폴더 안 파일(스킬의 `SKILL.md` 둘 등)은 이름이 겹치고 폴더를 손으로 만들어야 해서 복사와 1·2·4번 방법으로만 준다.
4. **zip으로 한 번에(P1):** 압축하지 않는 zip을 직접 만든다(CRC32 + 머리, 약 80줄, 의존성 없음).
   - 지연 묶음 안에 둔다. PC 브라우저에서만 보이고, 앱 안 브라우저에서는 숨긴다(L-05).
5. **확인 첫 메시지:** "이 폴더의 규칙 파일을 읽었으면, 만들 것과 지킬 것을 다섯 줄로 요약해 줘." 그리고 도구별 확인법을 보인다(Claude Code `/memory`, Gemini CLI `/memory show`).
6. **확인란 "AI가 기다릴 때 알려 줘"**(Claude Code · 맥·윈도우만, 기본 꺼짐): 켜면 묶음에 `.claude/settings.local.json`이 더해진다(6.1절 훅).

**웹에서 만드는 도구 ('프로젝트 지식에 붙여 넣을 글' 묶음):** 아래 막대 주 버튼 [붙여 넣을 글 복사](1만 자 이하) + 넣는 곳 이름(확인 전 표시) + [DESIGN.md 내용 복사].

**AI 채팅 ('프로젝트 지시 글' 묶음):** 짧은 지시 글 [복사] + "설계도 파일을 첨부하세요." 주 버튼은 [설계도 내려받기 (.md)] 그대로.

**앱 안 브라우저(카카오톡 등):** 주 버튼은 [설계도 복사]가 되고, 내려받기 버튼은 모두 [복사]로 바뀐다(코딩 에이전트는 2번 [전체 메시지 복사]가 앞에 온다). 위에 "{앱 이름} 안에서는 파일 저장이 안 될 수 있어요." + [다른 브라우저로 열기](L-05)를 둔다.

### 6.4 크기·말·시험

- **크기:**
  - AGENTS.md 1만 자 이하 · 200줄 이하. Lovable 지식 칸 1만 자, Devin 규칙 1만 2천 자, Codex 합계 32KiB 가운데 가장 빡빡한 한도에 맞춘다.
  - CLAUDE.md · GEMINI.md 20줄 이하(가져오기 한 줄 + 도구 전용 줄).
  - 웹 빌더에 붙여 넣을 글 1만 자 이하. 설계도 본문 12,000자 이하(넘으면 6번은 짧은 판, 7번 도구 메모는 '막히기 쉬운 곳'만).
  - 묶음 파일·전체 메시지 32,000자 이하(6.3절).
- **단위 시험:**
  - 목표마다 나오는 파일 목록(`copilot` 대상 없음)
  - 위 길이 상한
  - CLAUDE.md·GEMINI.md에 `codechauffeur-plan`을 가져오는 줄이 없음. AGENTS.md에 '그 단계 절을 읽는다' 줄이 있음
  - `.claude/settings.json`의 `ask`에 Bash·PowerShell 규칙이 짝으로 있음
  - `templates.aiTools["ai.agent"].saveAs`·`packRef`에 "CLAUDE.md 또는 AGENTS.md라는 이름으로" 같은 저장 안내가 없음(R-35)
  - 스킬 `name`이 `^[a-z0-9]+(-[a-z0-9]+)*$`에 맞고 64자 이하, `description`은 1024자 이하
  - 머리말이 첫 줄 `---`로 시작
  - JSON이 `JSON.parse`되고 주석·끝 쉼표가 없음
  - `.claude/settings.json`이 schemastore 스키마 사본(`tests/fixtures/`, 확인한 날 적음)을 통과. 시험 때 인터넷을 부르지 않는다.
- **예시:** `npm run examples`가 `docs/examples/ai-setup/<코스>-<목표>/`에 파일을 만든다. 손으로 고치지 않는다.
- **실제 도구로 읽히는지:** 사람이 `aitools.md` 9.5절 실측표로 본다(H20). 확인 전에는 화면에 "실제 도구에서 확인 중이에요"를 적지 않는다. 대신 확인 첫 메시지를 늘 함께 준다.

---

## 7. 직접 쓰기

정본: `input.md`. 여기에는 범위와 정한 것만 적는다.

### 7.1 고르는 곳 전부

| 자리 | 직접 쓰기 | 길이 | 반영 |
|---|---|---|---|
| 1단계 질문 17개 | 질문마다 `custom` 보기 | 40자 | 낱말표로 가까운 보기 1~3개를 보이고, 고르거나 [내 말 그대로 두기] |
| 1단계 '쓰는 AI' (새) | 도구 이름 | 40자 | `notes["q.aiTool"]` = `customToolName` → 설계도 1번 '만드는 AI', AGENTS.md 머리 |
| 1단계 마지막 한 줄 (R-18) | 있음. 다듬기만(예시는 도움말로, `maxlength` 없앰) | 80자 | 그대로 |
| 1단계 느낌 · 디자인 시트 | 느낌 · 색(#코드·이름) · 글꼴 · 아이콘 · 그림 · 배치 · 바라는 점 · 닮고 싶은 앱. 보기만 있는 네 줄(밝기·모서리·촘촘함·움직임)은 "원하는 게 없나요? 바라는 점에 써 주세요 ›"로 '바라는 점' 칸에 초점 | 4.2절 표 | 4.5절 |
| 2단계 기능마다 | "목록에 없는 도구 쓰기" | 40자 | 7.5절 |
| 3단계 막힌 곳 '바꾸기' | 보기 끝에 [목록에 없는 도구 쓰기 ›] → 2단계 그 기능 칸으로 가서 직접 쓰기 칸을 펼침 | 40자(2단계와 같음) | 7.5절. 직접 쓴 도구는 서행이라 막힘이 풀린다. 다만 서버 위치를 몰라 남는 개인정보 막힌 곳처럼 직접 써도 안 풀리는 막힌 곳에는 달지 않는다(엔진 `customToolClears`, D95) |
| 4단계 AI 설정 파일 | 쓰는 AI를 '아직 안 정했어요'로 두었으면 '쓰는 AI' 고르개(같은 목록 + 직접 쓰기) | 40자 | 6.1절 |
| 내 AI 써 보기 칩 | 다른 AI | 40자 | '쓰는 AI' 기본값 |
| 만들기 안내 거르기 | 다른 컴퓨터 | 40자 | `cc:prefs:v1.osText`, 웹 길을 먼저 보임 |
| 만들기 안내 · 2단계 | 다른 서비스 | 40자 | 공통 다섯 단계 + 설계도 9번 다섯 질문 + 내 AI에게 붙여 넣을 말 |
| 다음 할 일 | 할 일 직접 더하기 | 40자 | "(내가 더함)" |
| AI에게 할 말의 괄호 자리 | 지금 보이는 것 · 에러 문장 · 바꿀 것 · 화면 이름 · 진행 기록 | 한 줄 80자, 여러 줄 2,000자 | 복사할 때 채워 넣음. **저장하지 않음.** 에러 문장은 사전의 에러 안내와 맞춰 "이 에러 안내가 있어요: {제목} ›" |
| 도구 모음 · 사전 | 검색 칸(있음) | — | 도구 모음 0건일 때 "찾는 도구가 없으면 도구를 고를 때 직접 쓸 수 있어요." ('-하기' 단계 이름에 조사를 붙이지 않는다, D95) |

**빼는 곳 넷과 까닭:** 설정 켜고 끄기(두 값뿐), 확인 문제(정답이 있어 채점할 수 없음), 단계·칸 이동(값이 아니라 갈 곳), 막힌 곳의 행동 버튼 자체(값이 아니라 행동. 대신 '바꾸기' 끝에 직접 쓰기로 가는 길을 단다).

**'모름' 계열 말 셋**(CONCEPT 3절에 적는다, D83): **모르겠어요**(알지 못함, 1단계 보기·직접 쓰기 부품) · **아직 안 정했어요**(정하지 않음, `q.type`의 지금 '아직 못 정했어요'도 이것으로 · '쓰는 AI') · **아직 없어요**(가진 것 없음, 연습 칩 "어떤 AI 채팅을 쓰세요?"). '아직'만 쓰지 않는다.

### 7.2 부품 `src/components/CustomAnswer.tsx`

- **모양:** 보기 → [연필 아이콘 + 직접 쓰기] → '또는' → [모르겠어요]. 이것은 GOV.UK의 "Any other … + 펼친 칸 + or + Prefer not to say" 꼴이다.
  - 연필은 ✎ 글자가 아니라 SVG 아이콘(`aria-hidden`)이다. 글꼴에 없는 글자는 기기 글꼴로 대신 그려진다(T25에서 그림 문자를 SVG로 바꾼 것과 같은 까닭).
  - 예·아니요 2×2 질문은 그 아래 전체 폭 줄로 둔다. 나란한 보기 안에서 펼치지 않는다.
  - 콤보박스 팝업과 `<datalist>`는 쓰지 않는다.
- **흐름:** [확인]이나 Enter를 누르면 찾은 결과가 넷 중 하나로 나온다(하나 · 여럿 · 못 찾음 · 빈틈 알림). 저절로 고르지 않는다. 고르거나 그대로 두면 다음 질문으로 간다(D19).
- **검사:**
  - 길이는 `oneLine` 뒤 코드 포인트로 센다. `maxlength`로 자르지 않는다.
  - 빈 글은 받지 않는다. 연락처처럼 보이는 글은 막지 않고 경고한다.
  - 한글 조합 중 Enter는 무시한다(`e.isComposing || e.keyCode === 229`).
- **접근성:**
  - 줄은 `<button aria-expanded aria-controls>`이고, 펼치면 초점이 글 칸으로 간다. 칸은 `<label>` + `aria-describedby`(도움말·글자 수·오류)다.
  - 결과가 나오면 초점이 결과 첫 문장(`tabindex="-1"`)으로 간다. Esc는 접고 초점을 줄로 돌린다.
  - 누르는 곳은 44 이상이다. 펼침은 `--dur-fast`이고, 동작 줄이기면 0이다.
- **모든 도움말 끝에 같은 한 줄:** "사람 이름·연락처는 쓰지 마세요." ('도구 이름'을 묻는 칸과 부딪치지 않게 '사람', D95)

### 7.3 낱말 찾기 `src/lib/engine/match.ts` (순수, AI 아님)

- **규칙:**
  - 공백을 뺀 글로 견주고, 긴 말을 먼저 찾는다.
  - `=`가 붙은 말은 어절 전체가 같을 때만 맞는다. 점수는 찾은 말의 개수다.
  - 부정어는 6글자 안을 본다. 예·아니요는 순서로 본다.
  - 돈은 한 달 기준으로 바꿔 견준다. 영문 자판으로 친 한글은 되돌린다.
- **낱말표 `data/aliases.json` + 스키마:**
  - 질문별 보기 낱말, `toolHints`(서비스·도구 이름 → 진열 상품 id 또는 갈래), `gaps`(코드쇼퍼가 아직 못 하는 바람: AI 기능 · 스토어 앱 · 채팅 · 파일 올리기)
  - 충돌 검사를 `validate`에 넣는다.
- **함수:** `findAliases(text, table)` 하나를 직접 쓰기와 디자인 낱말(`looks.json` `keywords`)이 함께 쓴다.
- **지연 묶음 8KB(gzip):** 원형은 6.2KB였다 [잼, `input.md`]. 처음 직접 쓰기를 열 때 받는다.
- **원형 성적 [잼, `input.md` 6.10]:** 맞춘 묶음 73/73, 맞추지 않은 묶음 24/27, 찾으면 안 되는 글 0건 오답, 도구 이름 12/12.

### 7.4 계산 (찾은 결과는 `evaluate()`에 들어가지 않는다)

- 엔진은 이용자가 확정한 `answers`·`notes`·`customTools`·`gaps`만 본다.
- **그대로 둔 답은 '모르겠어요'와 같게 계산한다**(`like`). 예외는 셋이다.
  - `q.type` → 새 종류 `type.custom`. 이때 `q.notify`도 묻는다. 지도 빈 터 이름표는 '내 말' 앞 12자다.
  - `q.domain` → `need.data`만
  - `q.audience` → '몇 명이 같이'
  - 까닭: 예·아니요를 '아마'(= 네)로 계산하면 퀴즈의 고를 것이 2개에서 4개로, 알아볼 것이 1개에서 3개로 커졌다 [잼].
- **화면은 그대로 둘 때의 계산을 한 줄로 밝힌다:** "‘모르겠어요’와 같게 계산하고, 내 말은 설계도에 그대로 넣을게요."
- **설계도 1번에 '내 말 그대로' 줄:** "고른 답보다 이 말이 내 뜻에 가까워. 2~10번은 고른 답(그대로 둔 말은 괄호 안 기준)으로 골랐으니, 9번을 정리할 때 7번 도구로 이 말대로 할 수 있는지도 함께 확인해 줘. 2번에 없는 기능이나 7번에 없는 도구·키가 필요하면 만들기 전에 나에게 물어 줘." (T37 reader-tester 검토, D95) 지금 1번은 "만들 것: 직접 쓰기"라고 찍히는 문제가 있어 `answerChips`를 고친다 [잼].
- **빈틈:** 바람이 `gaps`에 걸리면 알아볼 것 카드 `research.gap-*` 1장을 더하고 숨기지 않고 말한다. 예: "AI 기능은 아직 코드쇼퍼가 도구를 골라 드리지 못해요. 설계도의 ‘알아볼 것’에 넣어 둘게요."

### 7.5 목록에 없는 도구 (2단계)

- **모양:** 기능마다 맨 아래 줄 "목록에 없는 도구 쓰기"(이름 40자). 진열 상품 이름을 쓰면 알려 준다("수파베이스" → Supabase). 갈래를 짐작하면 확인된 도구를 옆에 보인다("OpenWeather" → 날씨 도구).
- **엔진의 '모름' 도구:** `custom: true`, id `custom-1`~`custom-5`.
  - 쓴 칸을 채우지만 추천·점수는 없다.
  - 처음부터 서행(`conflict.custom-tool:*`, kept)이라 출발을 막지 않는다.
  - 알아볼 것 `research.custom:*`(가입·키 받는 곳 / 무료 한도와 넘으면 / 카드 / 키를 화면에 넣어도 되나 / 서버 위치)과 안전 규칙 `safety.custom-tool`이 붙는다.
  - 영수증 비용은 '모름', 합계는 "0원 + 확인 필요"다.
- **사실 조건:** 모르는 사실은 규칙 조건에서 '맞지 않음'으로 본다. 서버 위치만 `unknown`이라 개인정보 막힌 곳이 그대로 켜진다.

### 7.6 저장·링크·집계

| | 직접 쓴 글 | 보기 id `custom` | 직접 쓴 도구 |
|---|---|---|---|
| `cc:session:v1` | 넣음(`notes`) | 넣음 | 넣음(`customTools`) |
| 영수증 링크 `#r=` | **안 넣음** | 넣음 | 이름 **안 넣음**, 맡은 기능만(`x`), 빈틈 id(`g`). 판 번호는 `v: 1` 그대로 |
| 설계도 .md | 넣음("내 말 그대로") | — | 이름 넣음 |
| 익명 집계 | 안 보냄 | 안 보냄 | 안 보냄 |

링크에 이름을 넣지 않는 까닭: 받은 사람의 화면(우리 주소)에 남이 지은 글이 그대로 보인다(예: "공식: 여기로 입금하세요 010-…"). 링크로 연 영수증에서는 이름 자리에 "직접 쓴 도구"가 보인다.

### 7.7 자료·골든

- **자료:**
  - `questions.json`: 17개 질문에 `custom` 보기(`isCustom` · `like` · `field` · `hint` · `keep`)
  - `taxonomy.json`: `type.custom` 태그
  - `templates.json`: `types["type.custom"]`, `customTool.*`, `pack.mine`
  - `rules.json`: `safety.custom-tool`
  - `research-cards.json`: 빈틈 넷, 직접 쓴 도구
  - `scoring.json`: `unknownDifficulty: 2`
  - `ko.ts`: `input.md` 9.6절 문구
- **'쓰는 AI' 질문(새):** 셋으로 나눠 `showIf`로 하나만 보인다. 지금 엔진 그대로 된다.
  - `q.aiTool-chat`: Claude · ChatGPT · Gemini · 직접 쓰기 · 아직 안 정했어요
  - `q.aiTool-builder`: Lovable · Bolt.new · v0 · Replit · Google AI Studio · 직접 쓰기 · 아직 안 정했어요
  - `q.aiTool-agent`: **세 무리 목록 줄** · 직접 쓰기 · 아직 안 정했어요
    1. **앱 안에서(터미널 없이):** ChatGPT 앱의 Codex · Claude 앱의 Code 탭(유료). 맨 위에 둔다. 초심자가 가장 많이 멈추는 곳이 터미널이고, 이 무리가 가장 쉬운 에이전트 길이다.
    2. **편집기 안:** VS Code + Copilot · Cursor · Devin Desktop · Antigravity
    3. **터미널:** Claude Code · Codex · Gemini CLI · Copilot CLI
  - 보기마다 `{ tool, surface }`를 단다(예: ChatGPT 앱의 Codex = `{ tool: 'codex', surface: 'desktop' }`). 그래서 AI 설정 파일은 도구(`setupTarget`)로, 설치 안내는 쓰는 곳으로 고른다(5.2절 `surfaces`).
  - 사실 표시: Codex 앱은 2026-07-09 새 ChatGPT 데스크톱 앱(Chat · Work · Codex)에 합쳐졌다 [검색 요약, 2차 자료]. Codex 모드가 무료 요금제에도 있다는 글이 있지만 확인하지 못했다(`needsReview`, 꼬리표를 달지 않음). Claude 앱의 Code 탭은 유료 구독이 필요하다 [원문, `aitools.md` 3.1].
  - 태그는 `aitool.<id>`이고 점수에는 쓰지 않는다. 답하지 않으면 '아직 안 정했어요'로 본다.
  - **P1 다시 묻지 않기(WCAG 3.3.7):** 연습 칩에서 Claude·ChatGPT·Gemini를 골랐고 `q.ai`가 AI 채팅(무료·유료)이면, `q.aiTool-chat`은 그 값으로 채운 채 건너뛰고 한 줄을 남긴다: "연습에서 고른 {이름}으로 넣어 뒀어요 · 바꾸기". `q.ai` 자체는 무료·유료를 칩으로 알 수 없어 그대로 묻는다.
  - **P1 `q.ai` 타일 둘째 줄에 아는 이름:** 사람은 범주보다 제품 이름을 먼저 알아본다. 예: "무료 AI 채팅 · ChatGPT·Gemini·Claude 무료", "웹에서 만드는 도구 · Lovable·Bolt·v0", "코딩 에이전트 · Claude Code·Codex·Cursor". 이름만 쓰고 로고는 쓰지 않는다.
- **`q.ai`에 보기 `builder` '웹에서 만드는 도구'**(태그 `ai.builder`, 새):
  - `scoring.userLevelByAi`에 `ai.builder: 1`을 넣고, `goodFor`에 `ai.chat-paid`가 있는 상품에 `ai.builder`를 더한다(`engine-guardian` 검토).
  - `templates.aiTools["ai.builder"]`에 건네는 법(프로젝트 지식에 붙여 넣기)을 적는다.
  - **배포 칸 계산은 P0 최소안으로 한다(B-02).** 계산 없이 내보내면 Lovable·Bolt 이용자의 영수증과 '공개하기' 할 일에 GitHub Pages나 Cloudflare가 추천되어, 빌더의 게시 기능과 겹치는 틀린 안내가 된다.
    - `ai.builder`면 배포 칸을 가짜 상품 **'빌더의 게시 기능'**(`builder-publish`, `products.json`에 넣지 않고 엔진 상수 + `templates.json` 문장)으로 채운다. 점수·추천 순위가 없고, 고를 수도 없다(2단계 그 칸은 "쓰는 웹 빌더가 공개를 맡아요." 한 줄 + [다른 곳에 공개하기](직접 쓰기), D95).
    - 비용은 '모름'과 같게 다룬다(영수증 "0원 + 확인 필요"). 알아볼 것 카드 `research.builder-publish` 1장: "무료 요금제로 공개할 수 있나 · 내 주소를 붙일 수 있나 · 공개 범위". 숫자는 싣지 않는다.
    - 배포 칸에 걸린 막힌 곳 규칙(Pages + 비공개 저장소 등)은 켜지지 않는다. 다른 칸(저장·로그인)은 지금 계산 그대로다(빌더 자체 저장소 계산은 BACKLOG).
    - 골든 case-31(웹에서 만드는 도구 + 안내 페이지)의 기대값에 넣는다. `engine-guardian`이 검토한다.
- **골든:**
  - 기존 23개는 기대값이 그대로여야 한다. `npm run golden`이 증명한다.
  - 새로 case-24~30(`input.md` 11.3절)과 case-31(웹에서 만드는 도구 + 안내 페이지, 배포 칸 = `builder-publish`)을 더한다.
  - 기대값을 손으로 고치면 커밋 메시지에 `골든: case-NN 이유`를 쓴다.
- **문서:** PRD R-18a(`input.md` 13절 문장), CONCEPT 3절 낱말('직접 쓰기', '직접 쓴 도구', 비용 '모름'), UX.md, RECEIPT.md, ARCHITECTURE 4·5절, ENGINE.md 새 절 "직접 쓴 답과 도구".

---

## 8. 출시 준비

심각도: **P0** 출시 전에 꼭 · **P1** 출시 때 있으면 좋고 늦어도 출시 뒤 2주 안에 · **P2** 나중에. 세부 명세는 `launch.md` 3절의 같은 id를 따른다.

### 8.1 P0 (스물)

| id | 무엇 | 누가 | 명세 요점 | 묶음 |
|---|---|---|---|---|
| H14 | 허용 주소 더하기(H10 합침) | **사람**, 5분 | 12절. 가장 먼저 한다. 카드 약 23장과 C01 증거가 막힌 근본 원인이다 | — |
| E-01 | 집계 구간 | 에이전트 | 3.3절. `event-spec.ts` `card_copy` 구간에 `design-keep` · `design-check` · `new-chat` · `add-feature` · `custom-tool` · `step`. Worker 시험(새 구간 받음, 모르는 구간 버림), PRD R-60 주석, 처리방침 '종류' 문장 | T40 |
| G-03 | 업데이트·훅 안내와 터미널 없는 에이전트 | 에이전트 | 5.4절 `claude-code-update` · `gemini-cli-update` · `claude-code-hooks` · `gemini-cli-hooks`(원문·원본 명령만), 7.7절 '앱 안에서' 무리와 `codex-app-start` · `claude-desktop-code-start` 카드, `surfaces` | T39·T36 |
| G-04 | 가입 나이 조건 | 에이전트 + 문구 확인(H23) | 5.2절 `minAge`, 5.3절 규칙 7. 학교 정보·급식 앱을 만드는 학생과 교사가 실제 이용자다 | T39 |
| B-02 | 웹에서 만드는 도구의 배포 칸 | 에이전트 | 7.7절 `builder-publish`, case-31, `engine-guardian` | T36 |
| L-01 | 소개 '자료는 누구나 고칠 수 있어요 … 공개 저장소' 문단 | 에이전트 | 제목 "틀린 곳을 알려 주세요" + [의견 보내기]. 연락처가 없으면 묶음을 그리지 않는다. `npm run words`에 `공개 저장소` · `누구나 고칠`을 더한다 | T35 |
| L-04 | 정식 빌드 지킴 | 에이전트 | `PUBLIC_STAGE=release`이면 셋을 막는다: `PUBLIC_SITE_URL`이 비었거나 `example`을 품음 / `PUBLIC_CONTACT_EMAIL`이 빔 / `dist/`에 `codechauffeur.example`·`(초안)`·`검토 중인 초안`이 남음. `PUBLIC_BASE_PATH` 꼴 검사(9.4절)도 여기서 한다 | T35 |
| L-08 | 단계 화면 JS 덜기 | 에이전트 | 지금 `/arrival` 135.6 · `/check` 133.3 · `/waypoints` 130.5 · `/destination` 129.5 / 140KB [잼]. 4단계 칸 내용은 칸을 처음 열 때 `import()`(영수증 칸만 먼저). 엔진·자료 묶음(약 59KB)은 화면별로 나눌 수 있는지 잰다. **목표: v3를 다 얹은 뒤에도 단계 화면 130KB 이하** | T35 |
| B-01 | 주소 바탕(base path)과 호스트 종류 | 에이전트 | 9.4절 | T35 |
| L-07 | 고르는 곳마다 직접 쓰기 | 에이전트 | 7절 | T36·T37 |
| L-02 | 공유 미리 보기 | 에이전트 | `og:*` · `twitter:card`(`summary_large_image`), `public/og/default.png` 1200×630 PNG 100KB 이하(중요한 것은 가운데 1100×550 안). `npm run og`(Playwright로 HTML 틀을 찍음, 의존성 없음). 그림 주소에 `?v=1`. `/arrival`의 OG는 고정 문장 | T41 |
| L-03 | 사이트맵·robots·색인 제외 | 에이전트 | `src/pages/sitemap.xml.ts`(새 주소 포함), 정식 `robots.txt`에 Sitemap 줄, 3.6절 다섯 화면 `noindex`, 404는 대표 주소 없이 `noindex` | T41 |
| L-05 | 앱 안 브라우저에서 설계도 받기 | 에이전트 + 기기 확인 | `src/lib/inapp.ts`(순수, 시험). 지금 `Receipt.tsx`의 정규식(`KAKAOTALK` · `NAVER` · `Instagram` · `FBAN` · `FBAV` · `Line/`) [잼]을 옮기고, P1로 `DaumApps` · `everytimeApp`을 더한다(두 토큰은 [기억·미확인], H19 실기기에서 사용자 에이전트를 받아 시험 자료로). 앱 안이면 주 버튼을 [설계도 복사]로 바꾸고 [다른 브라우저로 열기]를 둔다. 카카오톡 안드로이드는 `kakaotalk://web/openExternal?url=`(누르는 동작 안에서만, [검색 요약]), 그 밖은 메뉴 안내 시트. 6.3절 내려받기도 같은 규칙. 홈 첫 방문이 앱 안이면 닫을 수 있는 한 줄 | T41 |
| L-06 | 의견 보내기와 문의 | 에이전트 + 주소(H22) | 빌드 변수 `PUBLIC_CONTACT_EMAIL`. `src/lib/feedback.ts` `mailtoFor({ topic, page, build })`: 본문에 경로(`#r=`·검색어 없이)와 판 번호만 넣는다. 바닥글 · 설정 · 도구 상세 [정보가 달라요] · 용어 카드 [풀이가 어려워요] · 안내 한 장 [안내가 달라요] · 404. **[메일 주소 복사]를 늘 옆에 둔다**(메일 앱이 없는 휴대폰에서는 `mailto`가 아무 일도 하지 않을 수 있다). 주소가 없으면 둘 다 그리지 않는다 | T41 |
| G-01 | 만들기 안내의 정직함 | 에이전트 | 1순위 안내가 모두 기한 안이거나 카드 상태다. `npm run guides -- --strict`가 `validate:release`에 들어간다(5.7절). 코스 길 위 '만들기 전에' 줄의 80% 이상이 단계 안내(`--coverage`) | T39 |
| G-02 | 결과물 길이와 꼴 | 에이전트 | 설계도 12,000자, AGENTS.md 1만 자, 빌더 글 1만 자 이하. DESIGN.md 린트 0/0. 예시 다섯 코스로 `npm run examples`가 확인한다 | T38·T40 |
| L-09 | 도구 사실 확인(C01) | **사람** + 에이전트(증거 채우기) | 49개 중 47개가 `needsReview: true` → `validate:release` 오류 46개 [잼]. **에이전트 몫 'C01 증거 채우기'(H14 뒤):** 상품마다 공식 원문을 인용하고 확인한 날을 `docs/HUMAN.md` 'C01 대조표'에 미리 채운다. 사람은 확인란만 누른다. 원문을 못 연 줄은 '원문 못 엶'으로 남기고 지어내지 않는다. 나눠 열기(확인 안 된 도구를 추천에서 빼기)는 엔진이 바뀌므로 권하지 않는다 | T39(자료 쪽) |
| L-10 | 법 문서 마무리 | **사람** + 에이전트 초안 | 시행일, 운영자 표시, 문의(메일), 맡기는 곳(Cloudflare, Inc., 미국), 개정 이력, 결과물 이용 허락 묶음(9.1절), 새 저장 키(3.7절). 정식 빌드에서 '(초안)'·'검토 중' 띠를 막는다(L-04) | T41 + H04 |
| L-11 | 사이트 주소 | **사람** | `*.workers.dev`로 갈지 산 도메인으로 갈지(H03). 영수증 링크가 주소째 퍼지므로 출시 뒤에 바꾸면 301을 끝까지 지켜야 한다 | — |
| L-12 | 실기기·화면 낭독기 | **사람** + 에이전트(PC 줄) | `launch.md` 3.12절 표 + 한글 입력 두 줄(아이폰 Safari · 갤럭시 Chrome에서 "가계부 앱" + 완료) | T42 + H19 |

### 8.2 P1

- **도움·정보 (T41):** 자주 묻는 것 `/help`(L-13), 접근성 안내 `/about/accessibility`(L-14, 시험한 환경 표), 바뀐 점과 판 번호 `/about/changes` + `data/changes.json`(L-15), 바닥글 두 줄(L-21), 404에 사전 검색·홈·만들기 안내(L-22), 페이지마다 다른 설명(L-23, 지금 85쪽 중 14쪽이 기본 문장 [잼]).
- **설정 (T41):** 화면 밝기 기기 따라·밝게·어둡게(L-16: `light-dark()` + `color-scheme`. `light-dark()`는 Safari 17.5부터라 iOS 17.4 이하는 밝게만 보임 [검색 요약: MDN, `launch.md` 3.4절]), 글자 크기 112.5%·125%(L-17), 설정 묶음(L-41), '저장한 기록 지우기'가 `cc:prefs:v1.osText`도 지움(3.7절).
- **기록 (T41):** 내 기록 내려받기·불러오기(L-18, 세션 통째 JSON, 지연), 만들다 만 앱 5개와 시간 제한 없는 되돌리기 띠(L-19), 저장이 지워질 수 있는 환경 알림(L-24).
- **인쇄 (T41):** `print.css`, 설계도 받기 네 칸 인쇄, 아래 막대 숨김(L-20). A4 2~4쪽.
- **운영 (T41):** HSTS `max-age=31536000`(L-26. `includeSubDomains; preload`는 도메인을 산 뒤 사람이 정함), `npm run launch:check`(L-29), 실제 배포 뒤 PageSpeed 모바일 LCP 2.5초 이하(L-28. 로컬 `/destination` 4.2초는 압축 없는 첫 CSS 탓으로 보임), 검색 등록 준비(L-25), 문서 어긋남(L-30, ARCHITECTURE 1·9·12절).
- **v3 쪽 P1:**
  - `/looks`(4.9, InspoAI 포함), 제목 글꼴 견본 SVG(4.6), AI 설정 파일 zip(6.3), 2순위 안내를 원문 확인 뒤 1순위로(H14·H21 뒤)
  - 디자인 시트 '내 말로' 넓히기: 앱 이름 · 앱 말투 · 더하고 싶은 화면(4.2)
  - 만들기 안내: `mcp-what-and-how` · `work-limit` · `codex-update` · 지우기 안내(5.4), 기한 두 배 지난 안내 감추기(5.5), '학교·회사 컴퓨터' 거르기(5.5)
  - `os: 'mobile'`(3.7·5.8), `q.ai` 타일 둘째 줄의 아는 이름과 '쓰는 AI' 다시 묻지 않기(7.7)
  - 앱 안 브라우저 토큰 `DaumApps` · `everytimeApp`(L-05)

### 8.3 P2

- 오프라인 화면 `public/sw.js`(`/api/*`는 캐시하지 않음) · Ctrl/⌘+K 사전(`aria-keyshortcuts`, 한 글자 단축키 금지)
- 구조화 자료 · `llms.txt`(빌드 때 `data/`에서) · `security.txt`(연락처가 정해진 뒤) · `<noscript>` 한 줄
- 빈 터가 지어지는 지도 그림(`companions.md` 11절) · 앞 답으로 뒤 보기에 "쓴 말과 맞아요" 꼬리표(`input.md` I5)

### 8.4 출시 전 확인표 (위에서부터, 하나라도 아니면 출시하지 않는다)

1. [ ] `npm run validate:release` 통과 (C01 · 안내 `--strict` · 가입 서비스 `minAge` 빠짐 없음)
   - [ ] `npm run guides -- --coverage`: 코스 길 위 '만들기 전에' 줄의 80% 이상이 단계 안내
2. [ ] `npm run check` · `npm run build` · `npm run qa:budget` · `npm run e2e` 통과 (Worker 시험이 새 `card_copy` 구간 여섯을 받음)
3. [ ] `npm run launch:check` 통과: OG · 설명 중복 0 · 사이트맵 모든 주소 200 · `noindex` 다섯 · 바닥글 의견 보내기 · 소개에 '공개 저장소' 없음 · 판 번호 · 인쇄 때 아래 막대 숨김
4. [ ] 빌드 변수: `PUBLIC_STAGE=release`, `PUBLIC_SITE_URL`(최종 주소), `PUBLIC_CONTACT_EMAIL`, `PUBLIC_BASE_PATH`(호스트에 맞게, 기본 `/`), `PUBLIC_HOST`(기본 `cloudflare`), (선택) `PUBLIC_CF_BEACON_TOKEN` · `PUBLIC_VERIFY_GOOGLE` · `PUBLIC_VERIFY_NAVER`, `NODE_VERSION=22`
5. [ ] 법 문서 최종 문구 · 시행일 · 운영자 표시 · 결과물 이용 허락(H04)
6. [ ] 실기기 표(L-12) 중 카카오톡 두 줄 · 아이폰 Safari 줄 · 한글 입력 두 줄 통과
7. [ ] 배포 뒤 확인: `/robots.txt` Sitemap 줄 · `/sitemap.xml` 200 · `/arrival` 소스에 방문 통계 스크립트 없음(R-04) · 카카오 공유 디버거로 대표 주소 셋 캐시 지우고 미리 보기
8. [ ] PageSpeed 모바일 LCP 2.5초 이하
9. [ ] 구글·네이버·다음에 사이트맵 제출
10. [ ] `data/changes.json`에 출시 줄, 판 번호 확인

---

## 9. 라이선스·개인정보·호스팅

### 9.1 문구 (MIT 없음)

| 자리 | 문구 | 상태 |
|---|---|---|
| `LICENSE` | "Copyright (c) 2026 yoorrard (코드쇼퍼, Code Chauffeur). All rights reserved." + 한국어·영어 두 문단 + 제3자 라이선스는 `THIRD_PARTY_NOTICES.md`는 그대로. **옛 허락 문장만 고친다.** 지금 "공개 이용 허락은 2026-10-14부터 거둡니다" / "withdrawn as of 2026-10-14"는 이미 MIT·CC BY로 받아 간 사본의 권리까지 거두는 것처럼 읽힌다. 고칠 문장: "예전에 MIT(코드)와 CC BY 4.0(자료)으로 안내했던 공개 이용 허락은 2026-10-14 이후 판에는 적용하지 않습니다. 그 전에 받은 사본은 당시 조건을 따릅니다." / "The earlier MIT (code) and CC BY 4.0 (data) grants do not apply to versions published on or after 2026-10-14. Copies obtained before that date remain under the terms they were received with." | 고침 T35 + 법 확인 H04 |
| `package.json` | `"license": "UNLICENSED"`, `"private": true`(없으면 더함) | 확인 |
| 바닥글 | **"© 2026 코드쇼퍼"** 한 줄. 지금의 긴 권리 문장("모든 권리를 가져요. 허락 없이 복제·배포할 수 없어요.")은 이용 안내 '라이선스' 묶음으로 옮긴다. 화면마다 경고문이 두 줄씩 있으면 초심자에게 딱딱하다(L-40). 운영자 표시가 정해지면 "© 2026 {운영자}"(H04) | T35 |
| 소개 `/about` | '누구나 고칠 수 있어요' 묶음 → "틀린 곳을 알려 주세요" + [의견 보내기](L-01). 저장소 링크 없음 | T35 |
| 이용 안내 `/legal/notice` '라이선스' 묶음 | 둘로 나눈다. **사이트:** "코드쇼퍼 사이트의 코드·자료·글·그림은 모두 저작권자에게 있어요. 허락 없이 복제·배포할 수 없어요. 각 도구와 출처의 이용 조건은 그 출처를 따라요." **받아 간 결과물:** "코드쇼퍼가 만들어 드린 설계도, AI 설정 파일, DESIGN.md, 디자인 값(CSS)은 받은 사람이 자기 앱을 만들고 고치고 나누는 데 자유롭게 쓸 수 있어요. 돈을 받는 앱에 써도 돼요. 다만 코드쇼퍼 사이트나 자료를 베껴 비슷한 서비스를 만드는 것은 안 돼요." | T41 + H04(법 확인) |
| README | 소개 문단의 옛 단계 이름(시운전·목적지·경유지·점검·도착)과 옛 표 상태를 고친다. '라이선스'는 지금 문단 + "비공개 저장소예요. 외부 기여는 받지 않아요." | T35 |
| `THIRD_PARTY_NOTICES.md` | 미리 보기 아이콘(Lucide ISC · Phosphor MIT · Tabler MIT)과 견본 글꼴(OFL 1.1, 글꼴마다 저작권자) 고지를 더한다 | T38 |
| 크레딧 `/about/credits` | 위와 같은 줄 | T38 |

**결과물 이용 허락이 꼭 필요한 까닭:** 모든 권리를 보유한다고만 적으면, 이용자는 받아 간 설계도와 AGENTS.md를 자기 앱 저장소에 넣어도 되는지 알 수 없다. 서비스의 목적이 그 일이므로, 이용 안내에 허락을 분명히 적는다.

### 9.2 개인정보

- **v3는 브라우저 밖으로 보내는 것을 늘리지 않는다.**
  - 이벤트는 여전히 다섯(R-60)이다. 'AI에게 할 말 복사'의 장 종류 구간만 늘어난다(3.3절 E-01). 처리방침의 "어떤 종류의 말을 복사했는지" 문장에 새 종류가 들어가도록 고친다. 직접 쓴 글, 도구 이름, 안내 진행, 디자인 값은 서버로 가지 않는다.
  - '만들기 안내'의 날 수 계산은 기기 날짜로 한다. 화면에서 버전을 조회하지 않는다.
- **처리방침에 더할 것:**
  - 새 저장 키(3.7절)와 지우는 법
  - 바깥 링크(공식 문서·참고 사이트)는 새 창으로 열리고 그 사이트의 처리방침을 따른다는 것
  - [의견 보내기]는 이용자의 메일 앱을 연다는 것과 메일에 들어가는 것(경로·판 번호)
- **설계도와 AI 설정 파일:** 직접 쓴 글이 들어간다. 내려받은 파일은 이용자 기기와 이용자 AI에만 간다. 입력 칸마다 "이름·연락처는 쓰지 마세요"를 적는다.
- **괄호 자리 입력(에러 문장·진행 기록):** 저장하지 않는다. 키가 섞일 수 있어서다.

### 9.3 호스팅 (소유자가 고른다, H13)

| 안 | 비공개 저장소 | 비용 | 익명 집계 `/api/event` | 보안 머리글 `_headers` | 주소 바탕 | 근거 |
|---|---|---|---|---|---|---|
| **Cloudflare Workers + Workers Builds (지금 기본, D72)** | 된다. Cloudflare GitHub 앱을 설치할 때 고른 저장소에 접근한다 | 0원. 정적 파일 요청은 무료·무제한, Worker는 `/api/*`만, 하루 10만 요청 | 됨 | 됨 | `/` | `docs/DEPLOY.md` 0·4절 · [검색 요약] developers.cloudflare.com/workers/ci-cd/builds/git-integration (비공개 저장소를 따로 적지는 않았고 GitHub 앱 권한으로 된다는 설명) |
| Cloudflare Pages | 된다 [기억·미확인] | 0원 | Pages Functions로 옮겨야 함 | 됨 | `/` | Cloudflare 문서가 새 프로젝트는 Workers로 시작하라고 권한다 [저장소: `services.md` 1절] |
| **GitHub Pages (Free)** | **안 된다.** 공개 저장소만. 비공개로 바꾸면 사이트가 내려간다 | 0원 | 안 됨(서버 없음) → `PUBLIC_HOST=static` | 안 됨(`<meta>` CSP만 남음, `frame-ancestors` 없음) | 프로젝트 사이트면 `/code-chauffeur` | [저장소] github/docs `gated-features/pages.md` · [검색 요약] docs.github.com githubs-plans |
| GitHub Pages (Pro·Team) | 된다. 사이트는 인터넷에 공개된다(접근 제한 게시는 Enterprise Cloud 조직만) | 유료 요금제 | 안 됨 | 안 됨 | 같음 | [검색 요약] docs.github.com githubs-plans, pages limits |
| Vercel Hobby | 개인 계정 저장소는 된다. **GitHub 조직 소유 비공개 저장소는 안 된다** | 0원, 개인·비상업 용도만(`data/products.json` `vercel`의 문장과 같음. 그 카드도 `needsReview: true`라 C01에서 확인) | Vercel Functions로 다시 짜야 함 | `vercel.json` | `/` | [검색 요약] community.vercel.com 직원 답변이 인용한 문서 |
| Netlify Free | 된다 [검색 요약] | 크레딧 방식. 배포마다 15 크레딧, 바닥나면 팀의 모든 사이트가 다음 달까지 멈춤 [검색 요약] | Functions로 다시 짜야 함 | `_headers` | `/` | `services.md` 5.4 |

- **권하는 것: D72 그대로(Cloudflare Workers).** 비공개 저장소, 0원, 집계·보안 머리글이 모두 된다.
- **GitHub Pages를 원하면** 둘 중 하나다: ① 저장소를 다시 공개로(요청 (3)과 어긋남), ② GitHub Pro 이상 + Actions로 빌드해 올리기. 어느 쪽이든 익명 집계와 보안 머리글이 빠진다.

### 9.4 주소 바탕(base path) 명세 (T35, P0)

- **빌드 변수:**
  - `PUBLIC_BASE_PATH`: 기본 `/`. 예 `/code-chauffeur`. 검사: `/`로 시작하고 끝 빗금이 없다(루트는 예외). 영문 소문자·숫자·`-`만 쓴다.
  - `PUBLIC_HOST`: `cloudflare`(기본) | `static`. `static`이면 `track.ts`가 아무것도 보내지 않고, 방문 통계 비콘을 넣지 않고, 개인정보 처리방침의 '익명 집계' 묶음을 "이 주소에서는 세지 않아요"로 바꾼다.
- **`astro.config.mjs`:** `base: process.env.PUBLIC_BASE_PATH || '/'`.
- **`src/lib/routes.ts`:** `withBase(path)`를 더한다(값은 `import.meta.env.BASE_URL`). `ROUTES`·`toolPath`·`termPath`·`waypointPath`와 새 주소가 모두 이것을 거친다. 화면 코드는 지금도 주소를 이 파일에서만 가져온다(27개 파일 [잼]).
- **고칠 곳 [잼, 오늘 grep]:**
  - `Base.astro`의 `href="/favicon.ico"` · `"/icon.svg"` · `"/apple-touch-icon.png"` · `"/manifest.webmanifest"` 4곳
  - `search-client.ts`의 `fetch('/search-index.json')`, `term-engine.ts`의 풀이 자료 주소, `track.ts`의 `EVENT_URL`
  - `Receipt.tsx`·`ArrivalAction.tsx`의 `siteUrl: window.location.origin` → `siteRoot()` = origin + 바탕. 영수증 링크·설계도 속 용어·안내 주소가 바탕을 품게 한다.
  - `public/manifest.webmanifest`(`start_url: "/"`, 아이콘 `/icon-*.png`) → 끝점 `src/pages/manifest.webmanifest.ts`로 바꿔 `start_url`·`scope`·아이콘에 바탕을 넣는다.
  - `robots.txt.ts`·`sitemap.xml.ts`·OG 그림 주소는 `site` + 바탕으로 쓴다.
- **CSS의 `url('/fonts/…')`는 고치지 않는다.** Vite 8.3.4는 CSS 안의 `public` 파일 주소에 `config.base`를 붙여 다시 쓴다 [잼: `node_modules/vite/dist/node/chunks/node.js` CSS `urlResolver`의 `checkPublicFile` → `joinUrlSegments(config.base, url)`]. 빌드 결과로 한 번 더 확인한다.
- **`public/_headers`·`_redirects`는 Cloudflare 전용으로 둔다.** `_redirects`의 옛 주소 10줄은 3.6절대로 지운다.
- **품질 바닥선에 규칙 하나:** `src/components`·`src/lib`(시험·`routes.ts` 빼고)에서 `'/`·`"/`·`` `/ ``로 시작하는 사이트 안 자원 주소 글자(`/fonts`·`/og`·`/look`·`/guides` 등 정해진 목록)를 쓰면 실패한다.
- **시험:**
  - 단위 시험: `withBase('/arrival')` → `/code-chauffeur/arrival`, 루트면 그대로. `siteRoot()`.
  - 빌드 시험: `PUBLIC_BASE_PATH=/code-chauffeur PUBLIC_HOST=static npm run build`. 이어서 `dist`의 모든 HTML에서 `href`·`src`가 `/code-chauffeur/`로 시작하는지 본다(바깥 링크·`#`·`mailto:` 빼고).
  - e2e 하나 `tests/e2e/base-path.spec.ts`: 정적 서버에 `--base /code-chauffeur`를 더해 하위 주소로 띄운다. 홈 → 만들 앱 정하기 한 문항 → 사전 검색 → 용어 풀이 → 도구 상세에서 네트워크 404가 0이고 `/api/event` 요청이 0인지 본다.

### 9.5 GitHub Pages를 고르면 (H13에서 고를 때만)

- `.github/workflows/pages.yml`을 **그때** 만든다. 손 실행(`workflow_dispatch`)과 `main` 푸시에서 돈다.
  - `withastro/action@v6`으로 빌드하고 `actions/deploy-pages`로 올린다 [저장소: withastro/docs `deploy/github.mdx`].
  - 빌드 변수는 `PUBLIC_BASE_PATH=/<저장소 이름>`(내 도메인이나 `<사용자>.github.io` 저장소면 `/`), `PUBLIC_HOST=static`이다.
- 저장소 Settings → Pages → Source를 **GitHub Actions**로 고른다. 브랜치 + `/(root)`·`/docs`로는 열리지 않는다. Astro 원본에는 맨 위 `index.html`이 없어서, 폴더를 꺼낸 뒤에도 README만 보이거나 404가 난다 [저장소: `services.md` 2.1절].
- 미리 만들어 두지 않는 까닭: 비공개 저장소 + Free에서는 돌지 않고, Actions 시간만 쓴다.

---

## 10. 작업 묶음 (에이전트 하나가 한 묶음, `docs/TASKS.md` T35~T42)

**순서:**

```text
T35 기반 ──┬─▶ T36 직접 쓰기 자료·엔진 ─▶ T37 직접 쓰기 화면 ─┐
           ├─▶ T38 디자인 정하기 (자료·엔진은 바로, 화면은 T37 부품 뒤) ─┤
           ├─▶ T39 만들기 안내 ─────────────────────────────────────────┤
           └─▶ T41 출시 준비 (T40과 겹치는 4단계 아래 막대는 T40 뒤) ──┤
                                         T36 + T38 + T39 ─▶ T40 다음 할 일·AI 설정 파일
                                                         모두 ─▶ T42 실측 검수와 마무리
```

**모든 묶음에 공통인 규칙:**
- 시작할 때 이 문서의 해당 절을 DECISIONS(`(자동 결정)`, 14절)·CONCEPT·PRD에 먼저 옮긴다. 끝나면 TASKS 맨 아래에 한 줄을 적는다.
- `data/questions.json`·`data/templates.json`·`src/copy/ko.ts`는 여러 묶음이 함께 고친다. 그래서 **한 번에 한 묶음만 이 셋을 커밋**하고, 다음 묶음은 그 뒤에 이어서 받는다.
- 화면을 바꾼 묶음은 `/visual-qa`(360·768·1280, 밤, 동작 줄이기, 글자 200%)를 돌리고 사진을 직접 본다. 키보드만으로 끝까지 간다.
- 바뀐 것에 맞는 검토자를 나란히 부른다.
- 새 지연 묶음은 만들 때 `qa:budget`에 줄을 더한다(빌드에 없으면 실패하는 규칙이라 미리 넣지 않는다).
- 지금 진행 중인 T34(마지막 점검·PRD·DESIGN 정리)는 T42에 합친다.

### T35 기반: 덜기 · 주소 바탕 · 바로 고칠 것 (P0, M)
- **할 일:**
  - 문서 옮기기: D73~D84(14절), PRD R-18a·R-33·R-35·R-36·R-37·R-60 주석·R-75 주석, CONCEPT 3절 새 낱말('모름' 계열 셋, 때 이름 다섯, 공개하기, 결제 카드, 화면 밝기), HUMAN H13~H23(12절, H14를 맨 위로·H10 합침), TASKS T35~T42와 5.7절 날짜 줄
  - `npm run words`에 쓰지 않는 말을 더한다: 공개 저장소 · 누구나 고칠 · 테마 · 프리뷰 · 팔레트 · 커스텀 · 폰트 · 가이드 · 튜토리얼 · 체크리스트 · 온보딩 · 길잡이 · 다크 모드 · 화면 올리기. 화면 문구만 대상이고, 낱말표(`aliases.json`·`looks.json` `keywords`)는 뺀다.
  - 같은 말들을 `data/aliases.json` `searchSynonyms`(+ 스키마)에 넣어 사전 검색이 받게 한다(3.5절). 이용자가 "테마", "다크모드", "폰트", "가이드"를 치면 디자인 정하기·`/looks`·`/guides`가 나온다.
  - L-08 덜기: 4단계 칸 지연. 엔진·자료 묶음 쪼개기를 재 보고 효과 있는 것만 한다. 잰 값은 DECISIONS에 적는다.
  - 9.4절 주소 바탕과 호스트 종류, `manifest` 끝점, 바닥선 규칙
  - L-01 소개 문구, L-04 정식 빌드 지킴, 바닥글 한 줄(9.1), README 고침, `_redirects` 옛 주소와 시험 지우기, L-30 문서 어긋남
  - `LICENSE` 옛 허락 문장 고침(9.1절, 한국어·영어 둘 다)
  - CLAUDE.md '지금 상태'의 낡은 숫자를 바로 고친다: 진열 상품 48 → 49, 골든 21 → 23 [잼]. (T42까지 미루지 않는다. 다음 묶음의 에이전트가 이 숫자를 읽는다.)
- **확인:**
  - `npm run qa:budget`: 단계 화면 넷이 모두 **130KB 이하**, 홈 100KB 이하(지금 41.1)
  - `npm run check` · `npm run build` · `npm run e2e` 통과
  - 9.4절 빌드 시험과 `base-path.spec.ts` 통과
  - `PUBLIC_STAGE=release`인데 `PUBLIC_SITE_URL`이 없으면 빌드가 한국어 한 줄로 실패한다
  - `grep -rn "공개 저장소\|누구나 고칠" src dist`가 0줄
  - 사전 검색 단위 시험: "테마" · "다크모드" · "폰트" · "가이드"가 각각 결과를 낸다(새 화면이 없는 지금은 기존 결과만, T38·T39 뒤 새 화면이 들어온다)
- **검토:** a11y-perf-auditor, ko-copy-editor

### T36 직접 쓰기: 자료와 엔진 (P0, L) — `input.md` I1·I2
- **할 일:**
  - 자료: 7.7절 전부 + '쓰는 AI' 세 질문(에이전트는 세 무리, 보기마다 `{ tool, surface }`) + q.ai `builder` 보기 + `ai.builder` 자료 + `q.type`의 '아직 못 정했어요' → '아직 안 정했어요'
  - `aliases.json` + 스키마 + 충돌 검사(T35가 만든 `searchSynonyms`와 같은 파일)
  - 엔진: `match.ts` · `custom.ts`, 세션 타입(`notes` · `customTools` · `gaps`), `normalizeSession` 한도, `answerChips` · `findConflicts` · `collectResearch` · `rankSlot` · `receiptModel` · `renderPack` · `projectName` · 링크(`x`·`g`)
  - **B-02:** `ai.builder`의 배포 칸 = `builder-publish`(7.7절), `research.builder-publish`, 배포 칸 막힌 곳 규칙 끄기
  - 골든 case-24~31, ENGINE.md 새 절("직접 쓴 답과 도구", "웹에서 만드는 도구의 공개"), `/about/criteria` 한 줄("직접 쓴 도구는 점수를 매기지 않아요")
- **확인:**
  - `npm run golden`: 기존 23개 그대로 + 새 8개 통과
  - 단위 시험: 찾기 표(맞춘 묶음 73개 모두, 맞추지 않은 묶음 27개 중 24개 이상, 찾으면 안 되는 글 오답 0), 돈 읽기(1년 10,000원 → 몇천 원, 하루 500원 → 필요하면 더), 영문 자판 되돌리기, 부정어, 직접 쓴 도구의 서행·알아볼 것·'0원 + 확인 필요', 링크에 직접 쓴 글이 없음, `ai.builder`면 배포 칸에 GitHub Pages·Cloudflare가 추천되지 않음
  - `npm run test:coverage` 엔진 90% 이상 유지
  - `npm run examples`: 다시 만든 예시의 1번이 "직접 쓰기"를 찍지 않는다
- **검토:** engine-guardian, ko-copy-editor

### T37 직접 쓰기: 화면 (P0, L) — `input.md` I3·I4
- **할 일:**
  - `CustomAnswer.tsx`(부품은 섬에, 찾기 + 낱말표는 `import()`), `Interview.tsx`(`layoutOf`가 `custom` 보기를 세지 않음, '내 말' 줄, 마지막 한 줄 다듬기)
  - 연필 SVG 아이콘(✎ 글자 쓰지 않음), '모름' 계열 말 셋(7.1절)
  - 2단계 '목록에 없는 도구 쓰기'(`Shop.tsx` · `pick-nav.ts` · `WaypointsAction.tsx`), 3단계 서행 줄과 막힌 곳 '바꾸기' 끝의 [목록에 없는 도구 쓰기 ›](`Check.tsx` → 2단계 그 칸, 직접 쓰기 칸을 펼친 채), `ReceiptsList.tsx` 이름, 지도 이름표, 도구 모음 0건 한 줄
  - 2단계 꼬리표 이름: "승인 기다림 · 며칠" · "결제 카드 필요"
  - 문서: UX.md 6.5~6.7과 고정 문구 표, RECEIPT.md
- **확인:**
  - e2e `tests/e2e/custom-input.spec.ts`: 키보드만으로 "가계부"를 써서 기록장 고르기 · 못 찾는 글을 그대로 두기 · 40자를 넘긴 오류 · 조합 중 Enter 무시(합성 `compositionstart`/`keydown 229`) · 2단계 직접 쓴 도구 → 3단계 서행 → 설계도 1·7·9번 · 3단계 막힌 곳 '바꾸기' → [목록에 없는 도구 쓰기 ›] → 2단계 칸에서 초점이 글 칸 · 링크로 연 영수증에 이름이 없음
  - axe 심각·치명 0, 360px 가로 스크롤 0, 44px 미만 버튼 0
  - `qa:budget` 찾기 묶음 8KB 이하, 단계 화면 130KB 이하 유지
  - 사진: `/destination` 펼친 칸 · 찾은 결과 · 2×2 아래 줄, 360 밝게·어둡게, 글자 200%
- **검토:** game-ux-designer(펼침·서행 연출), a11y-perf-auditor, ko-copy-editor, reader-tester(설계도 1·7·9번)

### T38 디자인 정하기 (P0 + P1 `/looks`·견본, L) — `design.md`
- **할 일:**
  - 자료·엔진(T35 뒤 바로): `looks.json` + 스키마 + 80쌍 대비 검사(**4.6 이상**, 4.6 밑인 쌍은 L을 낮춰 다시 잼) + 라이선스 허용 목록(OFL-1.1 · MIT · ISC), `look.ts`(엔진 목표 4.6), `templates.look`, `q.style` 보기 둘 · alt, `styles` 지우기
  - 화면(T37 뒤): 1단계 추천 순서 · 직접 쓰기(`notes["q.style"]`) · 글 버튼 "색·글꼴 더 정하기", `LookSheet`(지연, 보기만 있는 네 줄의 '바라는 점' 링크) · `LookPreview` · `look.css` · 바닥선 `--pv-*` 예외, 대비 결과는 쉬운 말 + 접기 '숫자로 보기', 4단계 디자인 묶음과 DESIGN.md 내려받기, `PALETTE_OF`
  - 설계도 6번 11묶음 + CSS + 예시 요청, 짧은 판, AI에게 할 말 두 장(`design-keep`·`design-check`)
  - P1: `/looks`(4.9, InspoAI 포함), 견본 SVG(`npm run looks`, `opentype.js` 크기·이유는 DECISIONS), '내 말로' 넓히기(4.2), THIRD_PARTY_NOTICES · 크레딧
- **확인:**
  - `npm run validate`(80쌍 4.6:1 이상, 테두리 3.1:1 이상)
  - e2e: 밝기 줄의 "원하는 게 없나요? …" 링크를 누르면 초점이 '바라는 점' 칸
  - DESIGN.md 린트: `docs/examples/*.design.md` 다섯 모두 오류 0 · 경고 0
  - 4.11절 단위 시험
  - e2e `look.spec.ts`(키보드만, axe, 동작 줄이기)
  - `qa:budget`: 디자인 묶음 14KB 이하, `/looks` 섬 4KB 이하
  - 사진: 시트 360·768·1280 밝게·어둡게, 글자 200%, `/looks` 360·1280
  - 대비 줄 낭독 문장 확인
- **검토:** game-ux-designer, a11y-perf-auditor, ko-copy-editor, svg-illustrator(미리 보기 아이콘·부품 그림)

### T39 만들기 안내 (P0 자료·화면, P1 2순위 승격, L) — `aitools.md` X1·X4 + `services.md` + `companions.md` 8
- **할 일:**
  - 5.2절 스키마(`surfaces` · `requires` · `minAge` · `level` · `task` 다섯 되살림 · `paymentCard`)와 자료(5.4절 목록, G-03의 업데이트·훅 안내와 앱 안 에이전트 카드), 5.3절 검사(규칙 여덟), `check-guides.ts`(`--coverage` 포함) · `check-guide-versions.ts` · `guides-watch.yml`, `/add-guide` 스킬
  - G-04 나이 조건: 가입 서비스와 채팅 AI마다 `minAge`. 오늘 찾은 것은 모두 [검색 요약]이라 `needsReview: true`로 넣고 숫자를 내지 않는다(Claude 18세 이상 · ChatGPT 13세 이상, 18세 미만은 보호자 동의 · Gemini는 자료마다 다름). H14 뒤 원문을 읽으면 숫자를 낸다.
  - `/guides` · `/guides/[id]`(명령 블록 굴림 영역, 스크립트 없을 때·인쇄 때 OS별 `<h2>`, 확인한 버전은 접기 안, 다음 할 일 띠), 도구 상세 '시작하기' 칸, 사전 '안내' 묶음과 색인
  - 에러 카드 여섯, 어려운 말 새 말(+ 배포 · 어두운 화면의 같은 말), 홈 묶음 목록 줄, 바닥글 링크
  - `cc:guides:v1` · `cc:prefs:v1.os`(UA로 미리 고름: `navigator.userAgentData?.platform ?? navigator.platform`), `src/lib/progress.ts`(3.7절, T40과 같이 씀)
  - **C01 증거 채우기(H14 뒤, 막혀도 이 묶음을 멈추지 않는다):** 8.1절 L-09. 원문을 열 수 있는 상품부터 인용·날짜를 `docs/HUMAN.md` 'C01 대조표'에 채운다.
- **확인:**
  - `npm run validate`(5.3절 규칙 여덟)
  - `npm run guides -- --today=2026-11-20`이 30일 기한 넘은 안내를 경고로 내는지(시험), `guideFreshness`의 세 값
  - `npm run guides -- --strict`가 지금 자료에서 통과(1순위가 모두 기한 안 + 확인됨, 아니면 카드)
  - `npm run guides -- --coverage` 표가 나온다(80% 목표는 8.4절 출시 확인표에서 따진다)
  - 단위 시험 `selectGuides`, `progressCount`(안내가 걸린 줄은 `cc:guides:v1`만 봄), `minAge` 표시 규칙(확인 전이면 숫자 없음)
  - e2e `guides.spec.ts`: OS 탭 `#mac`로 바로 열기 · 복사 알림 · 확인란이 새로 고침 뒤 남음 · 거르기 결과 개수 알림 · `needsReview` 안내에 명령이 없음 · 360px에서 `claude-code-install#windows`의 가로 스크롤 0(명령 블록 안에서만 굴림) · axe `scrollable-region-focusable` 0 · 자바스크립트를 끈 쪽에 OS별 `<h2>`
  - 사이트맵에 `/guides/*`가 들어감(T41 뒤)
  - 사진: `/guides` 360·1280, `/guides/claude-code-install#windows` 360 밝게·어둡게, 인쇄 미리 보기 한 장
  - 섬 각 5KB 이하, `/guides`에 엔진 묶음이 실리지 않음(`qa:budget` 줄)
- **검토:** ko-copy-editor(안내 문장 전부), reader-tester(초심자가 Gemini CLI 설치 안내를 따라 할 수 있나), a11y-perf-auditor

### T40 다음 할 일 · AI 설정 파일 · 설계도 넓히기 (P0, L) — `aitools.md` X2·X3 + `services.md` 11 + `companions.md` 6.6·7
- **할 일:**
  - 엔진: `nextSteps()` · `stepChecks()` · `renderAiSetup()`, 템플릿 `nextSteps.*` · `aiSetup.*` · `pack.receiptLine` · `pack.stepStart` · `checks.*`
  - **R-35:** `templates.aiTools["ai.agent"].saveAs`·`packRef`를 "설계도는 `docs/codechauffeur-plan.md`로 저장하세요"로 고친다. PRD R-35도 같이.
  - **AI 설정 파일(6.1절):** CLAUDE.md·GEMINI.md는 `@AGENTS.md` 한 줄 + 전용 줄(설계도 가져오기 없음), AGENTS.md '그 단계 절을 읽는다' 줄, `.claude/settings.json`에 Bash·PowerShell `ask` 짝과 `.env` `deny`, '알려 줘' 확인란과 `settings.local.json`, `copilot` 대상 빼기, 쓰는 AI를 안 정했을 때의 고르개
  - 설계도: 머리말 영수증 링크 · 8번 두 머리 · 10번 단계마다 두 줄 + '공개하기' · 11번 도구별 공개 전 확인 · 12번 세 줄
  - 4단계 칸 넷(3.3절), **아래 막대 주 버튼을 AI 종류별로**(`arrival-view.ts`), '다음 할 일' 섬(지연, `#next`), AI 종류별 묶음과 이름(6.3절 1·2·3·5·6), 묶음 파일 내려받기 + 짧은 메시지·전체 메시지 복사
  - AI에게 할 말 9장 묶음 넷(3.3절 표의 이름)과 괄호 입력 칸, 연습 단계 AI 채팅 칩과 가입 카드
  - **E-01:** `event-spec.ts` `card_copy` 구간 여섯 더하기 + Worker 시험 + PRD R-60 주석 + 처리방침 '종류' 문장
  - `cc:prep:v1`(안내 없는 줄만 + `guideIds`), `progress.ts` 쓰기, PRD·RECEIPT·UX 고침
- **확인:**
  - 단위 시험: 6.4절 전부, `nextSteps` 미리 짠 코스 다섯의 묶음·줄 수(`services.md` 11.2 견본과 같음), 영수증 '준비물 n개'가 바뀌지 않음, 링크로 연 영수증에 '할 일 직접 더하기'가 없음, `arrival-view.ts`가 경우 다섯(3.3절 표)마다 주 버튼 하나, `parseEvent`가 새 구간 여섯을 받고 모르는 구간은 버림, 같은 안내를 만들기 안내에서 마치면 다음 할 일에서도 마침
  - `npm run golden` 그대로(바뀌면 이유 한 줄)
  - `npm run examples`: 설계도 12,000자 이하 · AGENTS.md 1만 자·200줄 이하 · 묶음 파일 32,000자 이하 · `docs/examples/ai-setup/*` 생성
  - e2e `arrival-v3.spec.ts`: 칸 넷 키보드 이동 · 다음 할 일 확인란(요약 밖)과 '자세히' 펼치기·진행 알림 · [시작하는 말 복사] · 코딩 에이전트면 주 버튼이 [AI 설정 묶음 내려받기]이고 칸 안에 주 버튼이 없음 · 웹 빌더면 [붙여 넣을 글 복사] · 사용자 에이전트 `KAKAOTALK`이면 주 버튼 [설계도 복사]와 내려받기가 모두 복사로 바뀜 · 에러 문장 칸에서 에러 안내 연결 · axe `nested-interactive` 0
  - `qa:budget`: 다음 할 일 12KB 이하 · AI 설정 파일 10KB 이하 · `/arrival` 130KB 이하
  - 사진: `/arrival` 칸 넷 360 밝게·어둡게, 1280, **360 + 글자 125%·200%에서 칸 고르개 라벨**(잘림·넘침 없음, 넘치면 세로 줄 목록)
- **검토:** engine-guardian, reader-tester(설계도 전체와 AGENTS.md를 초심자 눈으로), ko-copy-editor, a11y-perf-auditor

### T41 출시 준비 (P0 + P1, L) — `launch.md` R3~R8
- **할 일:**
  - P0: L-02 · L-03 · L-05 · L-06([메일 주소 복사] 포함)
  - P1: 8.2절 전부(도움·정보 · 설정(화면 밝기 · 동작 줄이기 이름, `osText` 지우기) · 기록 · 인쇄 · 운영 · 앱 안 브라우저 토큰 둘)
  - 처리방침·이용 안내 초안 고침(9.1·9.2절, 운영자·시행일은 자리 표시)
  - `launch:check`
- **확인:**
  - `npm run launch:check` 통과(정식 빌드 변수를 가짜 값으로 넣고)
  - e2e: 앱 안 사용자 에이전트(KAKAOTALK · NAVER · Instagram) 세 가지, 의견 메일 주소의 본문에 `#r=`가 없음과 [메일 주소 복사] 알림, 화면 밝기 '어둡게' 고정 · 글자 125%에서 가로 스크롤 0, 기록 내려받기 → 지우기 → 불러오기 왕복('지우기' 뒤 `osText`가 없고 설정 값은 남음), 만들다 만 앱 둘 오가기와 되돌리기 띠
  - 인쇄: Playwright `page.pdf()`로 `/arrival` A4 2~4쪽, 아래 막대 없음
  - Lighthouse 모바일 `/` `/destination` `/arrival` `/guides` 접근성 100 유지
  - `/og/default.png` 1200×630 · 100KB 이하
- **검토:** a11y-perf-auditor, ko-copy-editor, game-ux-designer(앱 안 안내 시트), reader-tester(자주 묻는 것)

### T42 실측 검수와 마무리 (P0, M) — 소유자 요청 (7)
- **할 일:**
  1. **브라우저 도구 고르기:**
     - 세션에 Claude in Chrome(`mcp__claude-in-chrome__*`)이 있으면 `anthropic-skills:chrome-browser` 스킬을 먼저 읽고 쓴다.
     - 내장 브라우저(`mcp__Claude_Browser__*`)가 있으면 `anthropic-skills:built-in-browser`, 컴퓨터 사용이 있으면 `anthropic-skills:computer-use` 스킬을 먼저 읽는다.
     - 셋 다 없으면 Playwright 헤드리스 Chromium으로 하고, 그 사실을 보고서 첫 줄에 적는다.
  2. **흐름 실측:** 미리 짠 코스 다섯 + 직접 쓴 앱 하나 + 직접 쓴 도구 하나 + 웹에서 만드는 도구 하나(배포 칸이 '빌더의 게시 기능'인지)로 홈부터 설계도 받기까지 간다. 디자인 시트에서 `#00A651`을 넣는다. 만들기 안내에서 Gemini CLI 설치 안내를 열고 한 단계를 마친 뒤, 다음 할 일에서 같은 줄이 마침으로 보이는지 본다. AI 설정 묶음 파일을 받고 짧은 메시지를 복사한다. 다음 할 일을 셋 표시한다. 영수증 링크를 새 창에서 다시 연다. 의견 보내기의 [메일 주소 복사]를 누른다.
  3. **매번 볼 것:** 360·768·1280, 밝게·어둡게, 동작 줄이기, 글자 200%, 키보드만, 콘솔 오류 0, 바깥 요청 0(바깥 링크를 누를 때 빼고), 내려받은 파일 이름과 내용
  4. **받은 AGENTS.md·설계도를 직접 읽는다.** reader-tester가 초심자 눈으로 읽는다.
  5. **결과 기록:** `docs/OBSERVATION.md`에 표로 남긴다. 사람만 할 수 있는 줄(휴대폰·카카오톡·낭독기·한글 키보드)은 H19로 넘긴다.
  6. **T34를 합친다:** PRD·DESIGN·UX를 CONCEPT와 이 문서에 맞추고, CLAUDE.md '지금 상태'를 v3가 끝난 상태로 고치고(숫자는 T35에서 이미 고침), 마지막 보고를 쓴다.
- **확인:**
  - 2·3번의 표가 모두 채워진다(사람 줄은 'H19 대기')
  - `npm run check` · `build` · `qa:budget` · `e2e` · `launch:check` · `validate:release`(C01이 남았으면 그 오류만 남는지)
  - 사진 묶음 `.qa/v3/`를 직접 본다
- **검토:** reader-tester, a11y-perf-auditor, game-ux-designer, ko-copy-editor를 나란히

---

## 11. 하지 말 것

**원칙을 어기는 것**
- 사이트에서 AI를 부르거나, 직접 쓴 말을 AI로 해석하기. 낱말표가 못 찾으면 못 찾았다고 말한다.
- 직접 쓴 말로 보기를 **저절로** 고르기. 늘 이용자가 고른다.
- 직접 쓴 글·도구 이름을 영수증 링크나 집계에 넣기. 새 이벤트 종류를 더하기(R-60. `card_copy`의 장 종류 구간을 늘리는 것은 된다). 서버로 의견 받는 폼, 외부 설문 폼, 외부 오류 수집, 카카오 SDK 같은 외부 스크립트.
- 화면에서 도구 버전을 조회하거나 바깥 사이트를 불러오기. 참고 사이트의 화면 캡처·그림·글을 싣기. 미리 보기에 바깥 글꼴을 부르기.
- 제휴·추적 매개변수(`utm_*`, `ref=`), 제품 로고, 남의 브랜드를 흉내 낸 느낌 프리셋("○○처럼").

**정직하지 않은 것**
- 원문을 못 읽은 안내에 명령과 메뉴 경로를 쓰기. 공식 문서 문단을 통째로 옮기기(사실 몇 줄 + 출처 링크만).
- 버전을 박은 설치 명령. 화면에 요금·한도·나이 숫자를 원문 출처 없이 쓰기. 참고 사이트의 화면 수를 쓰기.
- '확인함' 표시를 사람 실측 없이 달기(H20).
- 새 가입을 막은 도구(Firebase Studio)나 이름이 바뀐 도구(Windsurf)로 시작하는 길을 내기.

**구조를 흔드는 것**
- 번호 단계를 늘리거나 단계 주소를 바꾸기. 머리줄에 단추를 더하기. 4단계 칸을 다섯으로. 칸 안에 주 버튼을 두거나 한 화면에 주 버튼을 둘 두기.
- 같은 할 일의 진행을 두 저장 키에 따로 세기(3.7절). 같은 자료의 때를 화면마다 다른 이름으로 부르기(5.1절).
- 설계도 저장 안내로 규칙 파일 이름(CLAUDE.md·AGENTS.md)을 쓰게 하기(R-35).
- 영수증 숫자를 OS·설정에 따라 바꾸기. 이유 없이 골든 기대값 고치기.
- `PUBLIC_BASE_PATH`를 우회해 주소를 글자로 박기. GitHub Pages 작업 흐름을 미리 만들기.

**초심자를 지치게 하는 것**
- 처음 주는 AI 설정 파일에 기본으로 훅·MCP·하위 에이전트·남의 스킬 넣기(이용자가 켠 알림 훅 하나만 예외). 스킬·플러그인·MCP 목록을 복제하거나 순위 매기기.
- 설계도 전문을 가져오기(`@`)로 규칙 파일에 늘 싣기. 터미널에 수만 자를 붙여 넣는 길을 첫 방법으로 내기.
- 디자인을 처음부터 시트로 열기. 기본 길은 타일 하나다. 12단 색 척도나 1~10 다이얼을 보이기.
- 고르는 곳마다 팝업 자동 완성. 직접 쓰기 칸에 `maxlength`. 영어를 섞은 화면 문구(테마·프리뷰·폰트·가이드·체크리스트·다크 모드). 다만 검색어로는 받는다(`searchSynonyms`).
- 화면 문구에 ✎ 같은 글꼴 밖 글자, 대비 숫자를 먼저 보이기.
- 기본 밝기를 '어둡게만'으로 하기. 형광 강조, 크림 + 테라코타, 같은 카드 줄줄이 늘어놓기.

**무거운 것**
- 새 런타임 의존성: zip 라이브러리, 색 라이브러리(`material-color-utilities`), `es-hangul`, `@astrojs/sitemap`, 화면용 글꼴 파일. `opentype.js`·`@google/design.md`는 빌드·검사 때만 쓴다.
- 새 기능을 첫 묶음에 싣기. 모두 누를 때 `import()`한다. `/guides`에서 엔진을 부르기.

---

## 12. 사람에게 넘길 것 (`docs/HUMAN.md`, 오래 걸리는 것 먼저)

| id | 할 일 | 왜 사람이 | 막는 것 |
|---|---|---|---|
| **H14 (맨 먼저, 5분)** | 클라우드 환경 Network access의 Allowed domains에 더하기: `docs.github.com` `cursor.com` `developers.openai.com` `docs.devin.ai` `docs.windsurf.com` `antigravity.google` `docs.lovable.dev` `support.bolt.new` `v0.app` `docs.replit.com` `ai.google.dev` `help.openai.com` `openai.com` `support.claude.com` `www.anthropic.com` `policies.google.com` `support.google.com` `nodejs.org` `git-scm.com` `support.apple.com` `vercel.com` `docs.netlify.com` `firebase.google.com` `www.data.go.kr` `api.odcloud.kr` `infuser.odcloud.kr` `open.neis.go.kr` `developers.kakao.com` `www.ncloud.com` `mobbin.com` `refero.design` `nicelydone.club` `www.lazyweb.com` `inspoai.io` `vibe-design-one.vercel.app` `lucianlabs.dev` (aitools H12 · services H14 · companions H-C1 · **H10을 합침**) | 환경 설정 | **출시**: 카드 약 23장(약 40%)과 C01 증거·나이 조건 숫자가 이것 때문에 막혀 있다. 이번 세션에서도 `docs.github.com`·`firebase.google.com`이 열리지 않았다 [잼] |
| C01 (있음) | 진열 상품 사실 대조(`needsReview` 47개, `validate:release` 오류 46개). **에이전트가 H14 뒤 'C01 대조표'에 원문 인용과 확인한 날을 미리 채운다(T39). 사람은 확인란만 누른다** | 상품 사실의 최종 확인 | 출시 |
| H03 (있음) | 사이트 주소(도메인)와 상표 | 돈·상표 | 출시(L-11) |
| H04 (있음, 넓힘) | 법 문서 최종 문구, 운영자 표시, 국외 이전 고지, **결과물 이용 허락 문구(9.1)**, **`LICENSE`의 옛 허락 문장("2026-10-14 이후 판에는 적용하지 않습니다. 그 전에 받은 사본은 당시 조건을 따릅니다.")이 법적으로 맞는지** | 법 | 출시(L-10) |
| H12 (있음, 한 줄 더함) | 저장소 비공개로 돌리기. **이미 만들어진 포크와 받아 간 사본은 비공개로 돌려도 그대로 남는다**(되돌릴 수 없음) | 계정 | 막지 않음 |
| **H13** | 호스팅 고르기: Cloudflare Workers 그대로(권함) / GitHub Pages(공개 저장소 또는 Pro + `PUBLIC_BASE_PATH`) / 그 밖. 9.3절 표 | 계정·돈 | T21 배포 |
| **H15** | https://vibe-design-one.vercel.app/ 과 lucianlabs.dev를 열어 보고 무엇을 참고하라는 것인지 두세 줄이나 캡처를 남기기. 이 세션에서는 `ENOTFOUND`(허용 목록 밖일 수 있음, 2절), lucianlabs.dev는 검색 0건. 단서: 'VibeDesigner'(페이지 종류 10 × 스타일 18 × 색 조합 106 → Cursor·Bolt·Lovable·v0에 넣을 명세, https://www.hunted.space/product/vibedesigner [검색 요약]). 같은 곳인지 확인해 주기 | 열 수 없었음 | 막지 않음 |
| **H16** | Mobbin · Refero · Nicely Done · Lazyweb의 검색 주소 꼴, 무료로 볼 수 있는 범위, 이름 표기·링크를 막는 약관이 없는지 | 약관 판단 | `/looks` 링크를 검색 주소로 바꾸기 |
| **H17** | 글꼴 견본 SVG 배포가 OFL에 맞는지, 아이콘 라이선스 | 라이선스 최종 확인 | 견본 SVG(P1) |
| **H18** | KWCAG 2.2 원문의 검사 항목과 WCAG 2.2 AA와 다른 점 | 원문을 찾지 못함 | 접근성 안내(P1) |
| **H19** | 실기기·낭독기 표(`launch.md` 3.12) + 한글 키보드 두 줄(아이폰 Safari · 갤럭시 Chrome에서 "가계부 앱" + 완료) | 실제 기기 | 출시(L-12) |
| **H20** | AI 설정 파일 실측표(`aitools.md` 9.5): Claude Code `/memory`, Gemini CLI `/memory show`, Codex 규칙 요약, 스킬 목록, 웹 빌더 지식 칸 1만 자. 윈도우(Git 없음)에서 `PowerShell(...)` 규칙이 걸리는지(문서로는 확인함 [원문], 실기 확인만 남음). **묶음 파일 방법**(묶음 파일을 폴더에 두고 짧은 메시지)이 Claude Code · Codex · Gemini CLI · ChatGPT 앱의 Codex에서 되는지, **전체 메시지(약 3만 자) 붙여 넣기**가 맥 터미널 · 윈도우 터미널 · VS Code 터미널에서 잘리거나 경고가 뜨는지. 알림 훅이 맥·윈도우에서 뜨는지 | 내 컴퓨터·계정 | '확인함' 표시 |
| **H21** | 서비스 화면 대조(`services.md` G03 여덟 줄) + 웹 빌더 다섯의 '설계도를 넣는 곳' 메뉴 이름 + 채팅 AI 셋의 '프로젝트 지시 글' 넣는 곳 이름 + 빌더 다섯의 게시(공개) 메뉴 이름 | 로그인한 화면 | 2순위 안내 승격 |
| **H22** | 연락 메일 주소(`PUBLIC_CONTACT_EMAIL`) 정하기 | 운영자 | 출시(L-06) |
| **H23** | 안내에 Claude·Copilot·Codex 같은 제품 이름을 쓰는 것과 "각 회사와 관계없어요" 문구. 나이 조건은 자료 칸(`minAge`, T39)이 맡으므로 **가입 카드의 나이 문구만 확인**(`services.md` G04) | 상표·법 | 출시 |

---

## 13. 관찰 시험 (`docs/OBSERVATION.md`에 더함, H05와 함께)

1. **만들기 안내 이름:** "가입이나 설치 방법은 어디서 볼까요?" 다섯 명 중 넷 이상이 '만들기 안내'를 찾으면 통과. 아니면 '준비 안내'로 바꾼다.
2. **느낌 고르기:** "우리 학교 급식 안내 페이지"의 느낌을 20초 안에 고르고, 넷 이상이 미리 보기가 도움이 됐다고 하면 통과.
3. **학교 색:** "#00A651로 바꿔 보세요"를 60초 안에 넷 이상이 해내면 통과. 버튼 글자가 검어진 까닭도 묻는다.
4. **직접 쓰기:** 보기에 없는 앱("반려식물 물 주기 알림")을 쓰고, 화면이 말한 계산("‘모르겠어요’와 같게…")을 넷 이상이 설명하면 통과. 그대로 둔 글은 낱말표 후보로 모은다(동의 아래).
5. **AI 설정 파일:** 코딩 에이전트를 쓰는 둘에게 [AI 설정 묶음 내려받기]와 [짧은 메시지 복사]만으로 파일을 만들게 한다. 둘 다 숨김 폴더를 손대지 않고 끝나면 통과. 받은 파일을 프로젝트 폴더로 옮기는 데서 막히면 그 자리를 적는다.
6. **다음 할 일:** "설계도를 받은 뒤 오늘 할 일은?"에 넷 이상이 '오늘 신청해 둘 것'을 가리키면 통과.
7. **참고 사이트:** "이 사이트 그림을 내 앱에 써도 될까요?"에 넷 이상이 "참고만"이라고 하면 통과.
8. **디자인 따르기:** 설계도를 각자 AI에 주고 첫 화면을 만들게 한다. 색·글꼴·모서리 중 따른 개수가 평균 2.5 이상이면 통과(채팅 AI와 코딩 에이전트를 나눠 적음).

---

## 14. 옮길 결정 (`docs/DECISIONS.md`, 모두 자동 결정, 형식: 결정 — 이유 — 틀렸을 때 비용)

- **D73 v3 정보 구조:** 단계 다섯 그대로, 4단계 칸 넷(용어 → 다음 할 일), 둘러보는 곳 만들기 안내 `/guides`·디자인 둘러보기 `/looks`, 머리줄 그대로, 때 이름 다섯 한 벌(오늘 신청해 둘 것 · 만들기 전에 · 만들면서 · 공개하기 · 공개한 뒤)을 만들기 안내와 다음 할 일이 함께 씀 — 사이트 밖의 일을 단계로 세지 않고, 주소·링크가 이미 나가 있다. 같은 자료를 두 이름으로 부르지 않는다 — 낮음, 칸 이름과 묶음 순서만 바꾸면 된다.
- **D74 직접 쓰기:** `input.md` 14절 열세 줄 그대로. 질문 17개 전부 + 도구 칸마다, 저절로 고르지 않음, 그대로 둔 답 = '모르겠어요'(예외 셋), 링크·집계에 글 없음, `aliases.json` 하나, 지연 8KB — 소유자 요청 "반드시"와 R-01·R-18 — 낮음~중간.
- **D75 AI 고르기:** q.ai에 `builder`, '쓰는 AI' 세 조건 질문(에이전트는 앱 안에서 · 편집기 안 · 터미널 세 무리, 보기마다 `{ tool, surface }`), OS는 설정 값, `ai.builder`의 배포 칸은 '빌더의 게시 기능'(점수 없는 가짜 상품, 비용 '모름', case-31) — 질문 수와 추천 안정성, 빌더 이용자에게 틀린 배포처를 추천하지 않기 — 중간, 빌더별 게시 조건이 확인되면 알아볼 것 카드만 고친다.
- **D76 디자인 정하기:** `design.md` 10절 + 이 문서의 바꿈(느낌 글은 `notes["q.style"]`, 견본 SVG는 P1, `/looks`는 P1로 앞당김, 대비는 4.6:1로 여유, 결과는 쉬운 말 먼저, 보기만 있는 줄에 '바라는 점' 길) — 한 번 누르는 길, 대비는 엔진, 외부 자원 없음 — 중간(견본 다시 굽기).
- **D77 만들기 안내 자료와 최신:** `guides.json` 하나(OS는 `variants`, 쓰는 곳은 `surfaces`), 명령은 원문·원본만, 카드 상태, 업데이트·훅·MCP도 같은 규칙('익숙해진 뒤' 꼬리표), 가입 나이 `minAge`(원문 없으면 숫자 없이), `checkedAt` + 기한(두 배 지나면 카드로), 매주 CI 이슈, 코스 길 80% 단계 안내 목표 — 틀린 명령이 초심자에게 가장 비싸다 — 낮음.
- **D78 AI 설정 파일:** AGENTS.md 원본 + 가져오기 연결(CLAUDE.md·GEMINI.md는 `@AGENTS.md`만, 설계도 전문은 가져오지 않고 단계마다 읽게), `copilot` 대상 뺌, **기본 훅 없음. 'AI가 기다릴 때 알려 줘' 확인란을 켠 맥·윈도우만 공식 예 그대로**, MCP 없음, 권한 규칙은 Bash·PowerShell 짝, 첫 방법은 묶음 파일 + 짧은 메시지(전체 메시지 복사는 대안), 맨 위 파일만 내려받기, zip은 P1·PC만 — 숨김 폴더를 손으로 만들지 않고, 터미널에 수만 자를 붙여 넣지 않게. 공식 문서의 CLAUDE.md 200줄 권장 — 낮음.
- **D79 다음 할 일과 영수증:** 때 다섯, 진행은 한 곳에서만(안내가 걸린 줄은 `cc:guides:v1`, 나머지는 `cc:prep:v1`, `progress.ts`), **영수증 숫자는 그대로**, 설계도 8번 두 머리, `/guides`는 스위치 대신 다음 할 일 띠 — 링크를 다른 기기에서 열어도 같은 숫자, 골든 안정, 같은 진행이 두 화면에서 어긋나지 않게 — 낮음.
- **D80 출시 준비:** 의견은 `mailto` + [메일 주소 복사] + 빌드 변수, 사이트맵은 의존성 없는 끝점, 상태 화면 `noindex`, 공유 그림 PNG 한 장 `?v=`, **4단계 주 버튼은 아래 막대 하나로 AI 종류를 따름**(채팅 내려받기 · 빌더 글 복사 · 에이전트 묶음 내려받기 · 앱 안은 설계도 복사), 결과물 이용 허락 묶음, `LICENSE` 옛 허락은 이후 판에만 적용 안 함 — 원칙(R-01·R-03·R-60), v2의 '주 버튼 하나', 한국의 공유 환경 — 낮음.
- **D81 주소 바탕과 호스트:** `PUBLIC_BASE_PATH` · `PUBLIC_HOST`, `withBase`, manifest 끝점, 옛 주소 301 지움, 기본 호스트는 D72 그대로 — 호스트를 소유자가 고르게 하되 기본 길은 흔들지 않는다 — 낮음.
- **D82 예산:** 단계 화면 130KB 목표, 지연 묶음 상한(찾기 8 · 디자인 14 · 다음 할 일 12 · AI 설정 파일 10 · 안내 섬 5 · `/looks` 섬 4KB), `/guides`에는 엔진을 싣지 않음 — L-08 — 낮음.
- **D83 낱말 맞추기:** '직접'은 자유 입력에만("색·글꼴 더 정하기"), '모름' 계열 셋(모르겠어요 · 아직 안 정했어요 · 아직 없어요), 동작 줄이기(이름 그대로), 화면 밝기(사이트) / 밝기: 밝게만·어둡게만·둘 다(이용자 앱), 공개하기(배포는 사전에서), 결제 카드 필요 · 승인 기다림, AI에게 할 말 장 이름은 "~할 때" 꼴이고 묶음 이름과 겹치지 않음, 막는 영어 말은 검색어로만 받음(`searchSynonyms`) — 같은 것을 여러 이름으로 부르면 초심자가 다른 것으로 안다 — 낮음, 문구만 바꾸면 된다.
- **D84 집계 구간:** `card_copy` 구간에 `design-keep` · `design-check` · `new-chat` · `add-feature` · `custom-tool` · `step`을 더함, 이벤트 종류는 다섯 그대로 — 더하지 않으면 새 장의 복사가 Worker에서 조용히 버려진다 — 낮음, D1에 날짜별 횟수만 있어 되돌리기 쉽다.

---

## 15. 출처

**오늘 이 문서를 쓰며 직접 확인한 것 (2026-10-14)**
- 저장소 [잼]:
  - `git ls-tree origin/main`: 맨 위에 파일이 있음(요청 1 끝)
  - `LICENSE` · `package.json` `UNLICENSED`
  - `src/lib/routes.ts`(주소 16개), `Base.astro`의 `href="/…"` 4곳, `fetch` 주소 3곳, `siteUrl: window.location.origin` 2곳, `public/manifest.webmanifest`의 `start_url: "/"`
  - `data/golden` 23개, `products.json` 49개 중 `needsReview` 47개, 질문 17개(`q.style` 보기 5, `q.ai` 보기 4)
  - `scripts/qa/budget.ts` 상한(홈 100KB · 그 밖 140KB · CSS 30KB · 그림 300KB · 지연 200KB)
  - `src/copy/ko.ts` 603줄(바닥글 권리 문장) · 635~636줄(소개 '공개 저장소' 문단)
- Vite 8.3.4가 CSS의 `public` 파일 주소에 `base`를 붙임 [잼: `node_modules/vite/dist/node/chunks/node.js` CSS 변환의 `urlResolver`]. Astro 7.3.8.
- https://vibe-design-one.vercel.app/ — WebFetch `getaddrinfo ENOTFOUND` [잼]. 이름 검색 0건 [검색 요약].
- lucianlabs.dev — 검색 결과 없음. 가까운 것은 GitHub 조직 'Lucian Labs'(주소 lucianlabs.ca) [검색 요약].
- GitHub Pages 요금제별 사용 범위 [검색 요약]:
  - https://docs.github.com/en/get-started/learning-about-github/githubs-plans
  - https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
  - https://docs.github.com/en/billing/managing-billing-for-your-github-account/downgrading-your-github-subscription
  - 본문 근거는 `services.md` 2.2절 [저장소]
- Cloudflare Workers Builds 저장소 연결: https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/ [검색 요약]. 비공개 저장소를 따로 적지는 않음. `docs/DEPLOY.md` 4절.
- Vercel Hobby와 조직 소유 비공개 저장소: https://community.vercel.com/t/unable-to-deploy-from-organizational-private-repository/16334 · https://community.vercel.com/t/why-cant-hobby-accounts-deploy-from-organizations/10015 [검색 요약: 직원 답변이 인용한 공식 문서 문장]
- Astro `base`와 내부 링크 앞붙이기: https://docs.astro.build/en/guides/deploy/github/ · https://docs.astro.build/en/reference/configuration-reference/ [검색 요약]

**2판을 쓰며 다시 확인한 것 (2026-10-14)**
- [원문] https://code.claude.com/docs/en/memory — "target under 200 lines per CLAUDE.md file"; 가져오기는 "don't reduce its context cost, because imported files also load at launch"; AGENTS.md를 직접 읽으려면 v2.1.277 이상; `CLAUDE.md`나 `CLAUDE.local.md`가 있으면 "Your `CLAUDE.md` files only"; AGENTS.md를 쓰는 프로젝트는 CLAUDE.md에 `@AGENTS.md`를 두라는 예.
- [원문] https://code.claude.com/docs/en/permissions — "PowerShell permission rules use the same shape as Bash rules"; "`PowerShell(Get-ChildItem *)` matches `gci`, `ls`, and `dir`"; "Rules are evaluated in order: deny, then ask, then allow."
- [원문] https://code.claude.com/docs/en/hooks-guide — 알림 훅(macOS `osascript`, Linux `notify-send`, Windows `powershell.exe` 대화 상자, "the dialog can open behind your terminal window"), `.claude/hooks/protect-files.sh`(`jq`, `chmod +x`), 셸 명령으로 바꾸는 파일은 따로 다뤄야 한다는 문장.
- [저장소] https://github.com/nodejs/Release `schedule.json` — v22 끝 2027-04-30 · v24 유지보수 2026-10-20 · v26 LTS 2026-10-28 · v27 알파 2026-10-28.
- [저장소] https://github.com/google-gemini/gemini-cli README 'Release Channels' — stable `npm install -g @google/gemini-cli@latest`(매주 화요일 UTC 20:00), preview `@preview`. `docs/hooks/index.md`·`writing-hooks.md` 있음.
- [레지스트리] npm `view … version`: `@google/gemini-cli` 0.64.0 · `@openai/codex` 0.162.1 · `@anthropic-ai/claude-code` **2.1.299**(비평 때 2.1.296, 같은 날 올라감) · `@google/design.md` 0.4.0.
- [잼] `src/lib/event-spec.ts` 7줄(`card_copy` 구간 다섯) · `data/templates.json` 205~206줄(`saveAs`·`packRef`) · `docs/UX.md` 121줄 · `docs/CONCEPT.md` 406줄 · `src/copy/ko.ts` `settings.motion: '동작 줄이기'` · `data/questions.json` `q.type` '아직 못 정했어요' · `src/components/Receipt.tsx` 82줄 앱 안 정규식 · `data/products.json` `vercel`(개인·비상업 무료, `needsReview: true`) · `docs/HUMAN.md` H10·'C01 대조표' · `docs/PRD.md` R-35 · `LICENSE` 문장.
- [검색 요약] Codex·ChatGPT 데스크톱 앱 합치기 2026-07-09: https://en.wikipedia.org/wiki/OpenAI_Codex_(AI_agent) · https://support.addigy.com/hc/en-us/articles/53439709931155-ChatGPT-and-Codex-Desktop-App-Merger-What-This-Means-for-Your-Fleet · https://codex.danielvaughan.com/2026/07/17/codex-chatgpt-unified-desktop-app-cli-migration-codex-app-detection-workarounds/ · https://developersdigest.tech/blog/chatgpt-work-codex-desktop-app (OpenAI 원문은 열지 못함).
- [검색 요약] Firebase Studio: 2026-03-19 종료 발표, 2026-06-22 새 가입·작업 공간 막힘, 2027-03-22 종료, Firestore·Auth·Hosting 영향 없음 — https://firebase.google.com/docs/studio/migrating-project (WebFetch `ENOTFOUND`) · https://en.wikipedia.org/wiki/Firebase_Studio.
- [검색 요약] 나이 조건: https://help.openai.com/sr-rs/articles/8313401-is-chatgpt-safe-for-all-ages · https://conductatlas.com/platform/anthropic/claudeai-terms-of-service/minimum-age-and-coppa-compliance/ · https://www.educatorstechnology.com/2025/08/ai-tools-chatbots-age-limits-and-data-policies-every-teacher-should-know.html (Gemini는 자료마다 다르고 2025년 글).
- [검색 요약] Windsurf → Devin Desktop(2026-06-02), Cascade 끝(2026-07-01): https://docs.devin.ai/pt-BR/desktop/devin-desktop-faq.md · https://tech-insider.org/windsurf-devin-desktop-vs-cursor-2026/ (비평이 찾은 것, 2판에서 다시 열지 않음).
- [검색 요약] InspoAI: https://inspoai.io/ (디자인 검색·무드보드, 새 화면 만들기 기능도 소개. 요금 숫자는 싣지 않음). VibeDesigner: https://www.hunted.space/product/vibedesigner (제작사 소개 글만).
- [못 봄] `vibe-design-one.vercel.app` · `firebase.google.com`: WebFetch `getaddrinfo ENOTFOUND`. `docs.github.com`: `curl` 응답 000. lucianlabs.dev: 검색 0건.

**짝 문서의 출처(모두 2026-10-14 확인, 표시 그대로)**
- `design.md` 14절: `@google/design.md` 0.4.0 · `tailwindcss` 4.3.3 · `shadcn` 4.21.4 · Radix Colors 3.0.0 · Open Props 1.7.23 · 한글 글꼴 15종 · 아이콘 패키지 [확인], Mobbin · Refero · Nicely Done · Lazyweb · InspoAI · Stitch · Lovable · Figma Make · Claude Design [검색 요약]
- `aitools.md` 12절: code.claude.com 12쪽 [원문], openai/codex · google-gemini/gemini-cli · github/docs · microsoft/vscode-docs · agentskills · agents.md [저장소], npm 레지스트리 [레지스트리], Cursor · Devin · Antigravity · 웹 빌더 · 채팅 AI [검색 요약]
- `services.md` 16절: github/docs · cloudflare-docs · Supabase · nodejs · vscode-docs · vite · withastro [저장소·문서 도구·레지스트리], Vercel · Netlify · Firebase · data.go.kr · NEIS · Kakao · Naver · OpenWeather [검색 요약]
- `input.md` 16절: GOV.UK Design System · W3C APG · React Aria · MDN · WCAG 2.2 · KRDS 코드 · `es-hangul` [저장소], Google Forms · Kakao · Baymard · 브라우저 IME 버그 [검색 요약]
- `launch.md` 10절: Front-End Checklist [저장소], Lighthouse 13.5.0 실측 [잼], Open Graph · 카카오 데브톡 · 개인정보 처리방침 작성지침 · Cloudflare HSTS [검색 요약]
- `companions.md` 14절: code.claude.com 모범 사례 · MCP 공식 등록소 API · npm [원문·레지스트리], awesome 목록들 · Vibe Workflow · EnzeD [저장소], Lovable · Bolt · Replit · 인프런 · skills.sh · MS Learn · DeepLearning.AI [검색 요약]

---

## 비평 기록 (Critique log, 2판 2026-10-14)

같은 날 받은 출시 검토 비평 46개 항목을 저장소와 원문으로 다시 대조했다. **통째로 버린 항목은 없다.** 아래 '고쳐 받음'은 뜻은 받되 방법을 바꾼 것이고, 까닭을 적었다. 번호는 비평의 번호다.

| # | 비평 | 판정 | 반영한 곳 · 까닭 |
|---|---|---|---|
| 1 | `card_copy` 구간 늘리기 | 받음 | 3.3절 E-01, 4.8, 5.8, 8.1, T40, D84. `event-spec.ts` 7줄 확인 [잼] |
| 2 | [메시지 복사]를 주 버튼에서 내림 | **고쳐 받음** | 3.3절 표, 6.3, D80. UX.md 121줄·CONCEPT 406줄 확인 [잼]. 다만 코딩 에이전트의 주 버튼은 비평이 제안한 [설정 메시지 복사]가 아니라 **[AI 설정 묶음 내려받기]**다. 33번을 받아 첫 방법이 묶음 파일로 바뀌었기 때문이다 |
| 3 | R-35·`saveAs`·`packRef` | 받음 | 3.3 PRD 고칠 곳, 3.9, 6.4 시험, T40. `templates.json` 205~206줄·PRD R-35 확인 [잼] |
| 4 | 훅 문장 어긋남 | 받음 | 6.1 '훅', 6.3-6, D78 |
| 5 | PowerShell 규칙 | 받음 | 6.1. 원문 확인 [원문, permissions]. H20은 실기 확인만 남김 |
| 6 | 설계도 전문 `@` 가져오기 안 함 | 받음 | 6.1, 6.2, 6.4. 원문 문장 확인 [원문, memory] |
| 7 | 업데이트·훅·MCP 안내 되살림 | 받음 | 5.1, 5.2 `task`, 5.4 표, 8.1 G-03. `brew upgrade claude-code`·`winget upgrade Anthropic.ClaudeCode`·`claude update`는 `aitools.md` 3.1 [원문], Gemini CLI는 README [저장소]로 다시 확인. 윈도우 알림은 대화 상자라는 원문 단서를 더함 |
| 8 | 빌더 배포 칸 계산 P0 | 받음(P0 최소안) | 7.7, 8.1 B-02, T36, D75. 보기를 빼는 쪽은 소유자 요청 (4)(5)와 어긋나서 고르지 않음 |
| 9 | '앱 안에서(터미널 없이)' 무리, `surfaces` | **고쳐 받음** | 5.2, 5.4, 7.7. 새 도구 둘을 만들지 않고 **기존 도구(Codex·Claude Code)의 `desktop` 쓰는 곳**으로 모델링했다. 같은 도구가 자료에 두 번 있으면 AI 설정 파일·최신 확인이 갈라진다 |
| 10 | 나이 조건 `minAge` P0 | **고쳐 받음** | 5.2, 5.3 규칙 7, T39, 8.1 G-04. 숫자는 page·repo 출처가 있을 때만 낸다. 오늘 찾은 나이는 모두 [검색 요약]이라 출시 화면에는 "공식 약관에서 확인해 주세요" + 링크만 나간다(꼭 지킬 것 6: 상품 사실을 지어내지 않음) |
| 11 | 진행을 한 곳에서만 | **고쳐 받음** | 3.7, 5.8, D79. 순수 함수는 엔진이 아니라 `src/lib/progress.ts`에 둔다. 엔진은 추천·점수 계산만 하고 저장 키를 모른다(꼭 지킬 것 3) |
| 12 | `/guides` 스위치 빼기 | 받음 | 3.4, 5.5, 3.8, D82 |
| 13 | 때 이름 한 벌 | **고쳐 받음** | 5.1, 5.8, 0절 5, D73. 넷째는 '공개하기 전에'가 아니라 **'공개하기'**(그 묶음에 올리기까지 들어 있음), 첫째는 관찰 시험 6번과 맞춰 '오늘 신청해 둘 것'을 그대로 씀 |
| 14 | 직접 쓰기 빈 곳 셋 | 받음 | 4.2 ※, 7.1 표, 3.2, 3.3, 6.1 |
| 15 | H14 출시 막음 · H10 합침 · C01 증거 | 받음 | 12절 맨 위, 8.1 H14·L-09, T39. 더해서 `vibe-design-one.vercel.app`·`lucianlabs.dev`도 H14에 넣음(2절: `ENOTFOUND`가 허용 목록 탓일 수 있음) |
| 16 | `node-install` 기준 | 받음 | 5.2 `requires`, 5.3 규칙 8, 5.4. `schedule.json` 다시 확인 [저장소] |
| 17 | Firebase Studio 줄 | 받음 | 5.7 날짜 표, 5.4, 11절. 원문은 이 환경에서 열리지 않아 [검색 요약] 그대로 |
| 18 | "색·글꼴 더 정하기" | 받음 | 4.1, 3.2, D83 |
| 19 | 동작 줄이기 · 밝기 말 | 받음 | 3.5, 8.2, D83. `ko.ts` 99줄 확인 [잼] |
| 20 | '모름' 계열 셋 | 받음 | 7.1, 7.7, T36, D83. `q.type` '아직 못 정했어요' 확인 [잼] |
| 21 | 묶음·장 이름 겹침 | 받음(제안만) | 3.3 표. 최종 문구는 ko-copy-editor. '막힘'은 교통 정보 말이라 묶음 이름에 쓰지 않음 |
| 22 | '결제 카드 필요' · '승인 기다림' | 받음 | 3.2, 5.2 `paymentCard`, 5.5, 5.6, T37 |
| 23 | 묶음 이름을 AI 종류에 맞춤 | 받음 | 3.3, 4.8 표, 6.1, 6.3 |
| 24 | 막는 말을 검색어로 받기 | 받음 | 3.5, T35, 11절 |
| 25 | 확인란을 `<summary>` 밖으로 | 받음 | 5.8 접근성, T40 시험 |
| 26 | 명령 블록 굴림 영역 | 받음 | 5.5, T39 시험 |
| 27 | 칸 라벨 확인 | **고쳐 받음** | 3.3, T40 사진. 넘칠 때는 2×2가 아니라 **지금 규칙(세로 줄 목록, UX.md 3.4)**을 쓴다. 2×2 칸 고르개는 화살표 키 순서가 헷갈리고 이미 정한 규칙이 있다 |
| 28 | 대비 여유 4.6 | 받음 | 4.4, 4.7, 4.11, T38, D76 |
| 29 | ✎ → SVG | 받음 | 7.2, T37, 11절 |
| 30 | '내 말로' 넓히기 | 받음(P1) | 4.2, 8.2 |
| 31 | InspoAI · VibeDesigner 단서 | 받음 | 4.9, 2절, H15. VibeDesigner는 다시 검색해 같은 소개 글을 확인 [검색 요약] |
| 32 | 기한 두 배면 명령 감춤 · 버전 접기 | 받음(P1) | 5.5 `guideFreshness` |
| 33 | 메시지 길이 상한 · 묶음 파일 우선 | 받음 | 6.3, 6.4, H20. 큰 붙여 넣기 경고는 [기억·미확인]이라 H20 실측 줄로 넘김 |
| 34 | [메일 주소 복사] | 받음 | 8.1 L-06, T41 |
| 35 | `osText` 지우기 | 받음 | 3.7, 8.2, T41 |
| 36 | `os: 'mobile'` · 관리자 권한 없는 컴퓨터 | 받음(P1) | 3.7, 5.5, 5.8 |
| 37 | `work-limit` | 받음(P1) | 5.4 |
| 38 | 타일에 아는 이름 · 다시 묻지 않기 | **고쳐 받음(P1)** | 7.7. 연습 칩으로는 무료·유료를 알 수 없어 `q.ai`는 그대로 묻고, 건너뛰는 것은 `q.aiTool-chat`만이다 |
| 39 | 앱 안 사용자 에이전트 넓히기 | **일부 받음** | 8.1 L-05. `Line/`·`FBAN`·`FBAV`는 이미 `Receipt.tsx` 82줄에 있다 [잼]. `DaumApps`·`everytimeApp`만 더하고, 두 토큰은 [기억·미확인]이라 H19 실기기 값으로 시험 자료를 만든다 |
| 40 | `copilot` 대상 줄이기 | 받음 | 5.2, 6.1, 6.4 |
| 41 | 코스별 확인 기준 80% | 받음 | 5.7 `--coverage`, 8.1 G-01, 8.4 |
| 42 | `LICENSE` 문장 · H04 · H12 | 받음 | 9.1, 12절, T35, D80. 문장은 법 확인(H04) 전 초안 |
| 43 | CLAUDE.md 숫자를 T35에서 | 받음 | T35. 상품 49 · 골든 23 확인 [잼] |
| 44 | Vercel 줄 | 받음 | 9.3. 그 카드도 `needsReview: true`임을 같이 적음 |
| 45 | 출처 표시 둘 | 받음 | 5.7(Actions 2,000분 [저장소]), 8.2(`light-dark()` Safari 17.5 [검색 요약]) |
| 46 | 설계서가 커밋되지 않음 | 받음 | 2판을 이 파일 하나만 커밋한다(푸시는 작업 흐름이 정한다) |

**비평 밖에서 더 고친 것:**
- P0 개수: 비평이 더한 P0(H14 · E-01 · G-03 · G-04 · B-02)를 세면 열다섯 + 다섯 = **스물**이다(0절 13, 8.1).
- `@anthropic-ai/claude-code`는 같은 날 2.1.296 → 2.1.299로 올라갔다 [레지스트리]. 판 번호를 화면에 박지 않는 규칙(5.3절 6, 5.5절 '확인한 버전' 접기)이 맞다는 증거로 15절에 적었다.
- 공식 알림 훅의 윈도우 판은 알림이 아니라 대화 상자이고 터미널 뒤에 열릴 수 있다는 원문 문장, `protect-files.sh`가 셸 명령으로 바꾸는 파일은 막지 못한다는 문장을 5.4·6.1에 더했다(초심자에게 과장하지 않기).
- `.env` `deny` 규칙도 셸로 읽는 것은 막지 못하므로 AGENTS.md '안전'에 같은 말을 둔다(6.1).
