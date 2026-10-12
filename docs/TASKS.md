# 작업 목록

`/next-task`가 이 파일을 읽고, '먼저:'에 적힌 작업이 끝난 것 중 첫 번째 빈 칸(`[ ]`)을 고른다. 작업이 끝나면 `[ ]`를 `[x]`로 바꾸고 맨 아래 '진행 기록'에 한 줄 남긴다.

- **T**: Claude Code가 하는 개발 작업
- **C**: 자료 채우기 (Claude Code가 초안, 사람이 원문 확인)
- **H**: 사람만 할 수 있는 일 (계정, 법, 결정)

모든 T 작업의 공통 완성 조건: `npm run check` 통과, (T03 이후) `npm test` 통과, (T01 이후) `npm run build` 통과, 바꾼 동작이 문서와 맞음, 커밋 하나 이상. 화면 작업은 여기에 더해: `/visual-qa`로 360·768·1280px와 동작 줄이기 스크린샷을 직접 봄, axe 심각·치명 0, `npm run qa:budget` 통과, 바뀐 것에 맞는 전문가 검토(`/next-task` 4절)와 `polish` 마감 점검.

진행 방식: `/next-task`가 이 순서대로 하나씩 끝까지 하고 다음으로 넘어간다. 사람 일(H)·자료 확인(C)에 막히면 `docs/HUMAN.md`에 적고 다른 작업을 한다.

## 1단계 개발

### [x] T01 프로젝트 뼈대
- 요구: R-02, R-09 · 읽을 것: `docs/ARCHITECTURE.md` 1~3절, 10절
- 할 일:
  - Astro 최신 안정판, `@astrojs/preact`, `preact`, `@astrojs/check`를 설치한다. 이 폴더는 비어 있지 않으므로 `create-astro`를 쓰려면 임시 폴더에서 만든 뒤 필요한 파일만 옮긴다.
  - `astro.config.mjs`: 정적 출력, Preact 통합, `site`는 환경 변수 `PUBLIC_SITE_URL`(없으면 `https://codechauffeur.example`).
  - `tsconfig.json`을 `docs/ARCHITECTURE.md` 10절 모양으로 바꾸고, `typecheck`를 `astro check && tsc -p tsconfig.json`으로 바꾼다.
  - npm 스크립트 `dev`, `build`, `preview`를 더한다. 기존 스크립트는 그대로. `node scripts/*.ts`가 계속 돌아야 한다.
  - 빈 홈 페이지에서 `src/lib/engine`과 `data/*.json`을 import해 레시피 하나로 `evaluate`를 돌려 결과 수를 보여 준다 (빌드 때 엔진이 도는지 확인용, T07에서 지운다).
  - 페이지 전환은 Astro `<ClientRouter />`를 쓰지 않고 CSS `@view-transition { navigation: auto }`로 한다 (D25). `@astrojs/preact`가 지원하는 Preact 판을 확인해 고정한다.
- 완성 확인: `npm run build` 성공, `npm run check` 성공, 정한 버전을 `docs/DECISIONS.md`에 적음.

### [x] T02 디자인 토큰·글꼴·기본 스타일
- 요구: R-09, R-51 · 읽을 것: `docs/DESIGN.md` 3~5절, `docs/UX.md` 5~6절, `src/styles/tokens.css`, 결정 D29~D31
- 할 일:
  - `tokens.css`를 `docs/DESIGN.md` 3절 색 체계(남색·금색·지도 종이)로 바꾸고, 모션 토큰을 더한다: `--dur-fade`(150ms, 동작 줄이기에서도 유지), 강한 곡선 `--ease-out`·`--ease-in-out`·`--ease-drawer`, 스프링 `--ease-spring`(`linear()`), 손맛 `--juice-s|m|l`, 붙박이 막대 높이 `--bar-top`·`--bar-bottom`. 동작 줄이기(기기·`data-motion`)에서 이동 길이는 0, `--dur-fade`는 유지 (D30).
  - 기본 스타일: 초기화, 본문 글꼴·크기, `word-break: keep-all`, 초점 테두리, 링크, 버튼 최소 44px, `::selection`·`caret-color`·`scrollbar-color` 토큰, `scroll-padding-block`.
  - 글꼴 (D29): Pretendard는 npm `pretendard`의 굵기별 동적 하위 집합(쓰는 굵기만)을 `public/fonts/pretendard/`에. 영수증 글꼴은 `scripts/fonts/build-receipt-font.ts`(npm `subset-font`)로 D2Coding에서 ASCII·숫자·자주 쓰는 한글을 유니코드 범위 조각으로 나눠 `CC Receipt` 이름으로 `public/fonts/receipt/`에. 둘 다 OFL 원문을 함께 둔다. 외부 글꼴 서버를 부르지 않는다.
  - `scripts/check-tokens.ts`: `tokens.css`의 글자/바탕 쌍(주석에 적힌 짝)을 `scripts/lib/contrast.ts`로 검사한다. `npm run check`에 더한다.
- 완성 확인: 빌드 결과에 외부 글꼴 요청이 없음, 토큰 대비 검사 통과, 동작 줄이기에서 `--dur-fade`만 남음.

### [x] T02b 그림 자산: 기사님·3D 그림 문자·아이콘
- 요구: R-50~R-52 · 읽을 것: `docs/DESIGN.md` 6·8절, 결정 D27 · 먼저: T01
- 할 일:
  - 기사님: 원본(`src/assets/mascot/chauffeur-wave.webp`)의 알파를 정리하고(거의 투명한 점 지우기, 거의 불투명한 점 채우기) 그림 테두리에 맞게 잘라 `chauffeur-wave.png`(정리본)를 만든다. 화면에는 `Mascot` 컴포넌트(Astro `<Picture>`)로 보이는 폭의 1배·2배 avif·webp를 싣는다. 그림 자체는 고치지 않는다.
  - Fluent Emoji 3D: `scripts/assets/fetch-emoji.ts`가 microsoft/fluentui-emoji의 **고정 커밋**에서 쓸 그림(`docs/DESIGN.md` 8절)만 받아 128px webp로 줄여 `public/emoji/`에 두고 `LICENSE`(MIT)를 함께 둔다. 받을 목록과 커밋은 스크립트 안에 적는다.
  - UI 아이콘: Phosphor(`@phosphor-icons/core`) SVG를 빌드 때 인라인하는 `Icon` 컴포넌트 (쓰는 아이콘만).
  - `THIRD_PARTY_NOTICES.md`의 '사이트에 실리는 자료' 표를 실제 파일과 맞춘다.
- 완성 확인: 페이지 그림 합계 예산 안, 외부 요청 없음, 라이선스 파일이 각 폴더에 있음.

### [x] T03 시험과 CI
- 요구: R-56, R-57 · 읽을 것: `docs/ARCHITECTURE.md` 12절
- 할 일:
  - Vitest와 `@vitest/coverage-v8`를 설치하고 `npm test`를 만든다.
  - `tests/golden.test.ts`: `scripts/lib/golden.ts`의 `compareGolden`으로 골든 사례마다 시험 하나.
  - `tests/data.test.ts`: 자료 검사를 시험으로 (검사 로직을 부작용 없는 `scripts/lib/validate.ts`로 옮기고 `validate-data.ts`는 그걸 부르게 바꾼다).
  - `.github/workflows/check.yml`(하네스가 만든 것)이 `npm test`·`npm run build`·`npm run qa:budget`을 실제로 돌리는지 확인한다.
- 완성 확인: 일부러 골든 기대값 하나를 바꾸면 `npm test`가 실패하고, 되돌리면 통과.

### [x] T04 엔진 단위 시험 보강
- 요구: R-07 · 읽을 것: `docs/ENGINE.md` · 먼저: T03
- 할 일: `tests/fixtures/`의 작은 가짜 자료로 시험한다. 조건 모양 전부(`deferred` 포함), 질문 숨김·되살림, 가중치 항목 하나하나, 같은 점수 순서 정하기, `shared`가 앞 칸에서만 붙는지, `conflict.paid-on-free`(유료 상품이 든 가짜 자료), 비워 둘 수 없는 칸, 2차로 미루기와 나누기 제안·더 쉬운 상품, 중간 서버 준비 단계 위치, 개념 순환 오류, 글자 폭 계산과 자르기, 예상 시간 반올림, 공유 상태 왕복과 잘못된 입력.
- 완성 확인: `src/lib/engine` 줄 기준 시험 범위 90% 이상. 엔진 동작은 바꾸지 않는다 (바꿔야 하면 멈추고 사람에게 묻는다).

### [x] T05 자료 싣기·문구 파일·기본 틀
- 요구: R-10, R-43, R-50 · 읽을 것: `docs/ARCHITECTURE.md` 2·6절, `docs/UX.md` 2·7절
- 할 일:
  - `src/lib/data.ts`: JSON을 import해 `Data`로 묶고 `catalog`를 내보낸다.
  - `src/copy/ko.ts`: 화면 고정 문구 (UX.md 7절 표부터).
  - 기본 틀(layout): 본문 바로 가기 링크, 머리말(노선 띠 자리, 행선지 전광판, 주행 거리 계기판 자리, 설정 메뉴: 동작 줄이기·효과음·내 여행 기록·기록 지우기), 본문(무대), 기사님 자리, 사전 버튼 자리, 아래 진행 막대 자리, 처음부터 있는 `aria-live` 알림 자리, `<title>`과 언어(`lang="ko"`), View Transitions 이름(머리말·노선 띠).
- 완성 확인: 모든 라우트가 같은 틀을 쓰고, 키보드로 바로 가기·머리말·본문·사전 버튼 순서로 이동된다. 360px에서 붙박이 막대가 초점 받은 요소를 가리지 않는다.

### [x] T06 상태 저장·공유 링크·정류장 규칙
- 요구: R-04, R-38, R-41 · 읽을 것: `docs/ARCHITECTURE.md` 4~5절, `docs/UX.md` 2.1절
- 할 일:
  - nanostores + @nanostores/persistent로 `src/lib/store.ts`: 세션, 공부 기록, 메타, 설정. localStorage를 못 쓰면 메모리로. 저장은 `evaluate()`가 돌려준 `r.session`으로.
  - `src/lib/share.ts`: lz-string으로 `#r=` 만들기·읽기. 받은 값은 `fromShareState` → `evaluate`. 읽은 뒤 주소에서 지우기.
  - 엔진 결과는 저장하지 않고 매번 `evaluate`로 계산하는 `result` 파생 store.
  - `src/lib/stations.ts`: 정류장마다 열리는 조건과 보낼 곳 (UX.md 2.1절), '이어서 하기' 판단, 두 상태가 같은지 비교.
  - `src/lib/progress.ts` (D32): 주행 거리와 도장(정류장 다섯, 공부)을 `Session`·`evaluate` 결과·공부 기록에서 계산하는 순수 함수. `cc:trip:v1`에 장면을 이미 본 도장 id만 둔다.
- 완성 확인: 단위 시험(저장·복원, 깨진 링크, 모르는 id 버림, 자유 입력이 링크에 없음, 정류장 규칙, 주행 거리·도장 계산과 같은 상태면 같은 값).

### [x] T06b 모션·효과음 기반
- 요구: R-08, R-51, R-53 · 읽을 것: `docs/UX.md` 4절, `game-motion` 스킬, 결정 D25·D28·D30 · 먼저: T02, T05
- 할 일:
  - `src/lib/motion.ts`: `reduced()`(기기 설정 또는 `html[data-motion=reduce]`), `dur()`(토큰 읽기), `play()`, `skipAll()`(누르기·Esc·건너뛰기 버튼), `flip()`, `followPath()`. 사이트 설정의 동작 줄이기를 `html[data-motion]`과 저장소에 잇는다.
  - `src/lib/sfx.ts`: 효과음 켜기·끄기(기본 꺼짐), 켰을 때만 합성기를 동적 import, 사용자 행동 뒤에 `AudioContext` 하나. 소리 일곱 가지.
  - View Transitions CSS: `@view-transition { navigation: auto }`, 이름 붙이기, 동작 줄이기에서 `::view-transition-*` 애니메이션 끄기 (기기·사이트 둘 다).
  - 시험: `reduced()`·`dur()`·`skipAll()`·효과음 기본 꺼짐.
- 완성 확인: 동작 줄이기에서 이동 없이 끝 상태, 효과음 기본 꺼짐, 첫 화면 JS 예산 안.

### [x] T07 홈과 첫 수업
- 요구: R-11, R-12, R-47, R-51(M2) · 읽을 것: `docs/UX.md` 3.1~3.2, 4절
- 할 일: 홈(두 입구, 레시피 3개, 이어서 하기와 내 여행 기록 미리 보기), 첫 수업(문장 3개, 복사, PC 권장, 끝 정리, '첫 수업' 도장), 출발 장면 M8과 차 문 열기·기사님 등장 M2 (합쳐 3초 이하, 다시 온 사람은 M2만). T01의 확인용 내용은 지운다.
- 완성 확인: 동작 줄이기에서 M8·M2가 정지 그림으로 바뀜, 누르면 장면이 끝남, 복사 결과를 화면 낭독기가 알림.

### [x] T08 인터뷰
- 요구: R-13~R-19 · 읽을 것: `docs/UX.md` 3.3, `docs/ENGINE.md` 1절
- 할 일:
  - `runInterview`로 다음 질문을 보여 주는 섬. 보기는 하나하나 버튼(누르면 다음 질문, 라디오 버튼은 쓰지 않음). 그림 보기의 그림은 단순한 SVG로 직접 그리고 `alt`는 자료 값. 예·아니요는 네 버튼.
  - 이전으로 돌아가 바꾸기, 진행 표시("n번째 질문"), 좁혀지는 중 상자(칩, 칸, 레시피, 바뀐 후보 카드 뒤집기 M5), 마지막 한 줄 입력, "일단 구경만 할게요", 기사님 첫 질문 안내, 답할 때마다 주행 거리, 끝나면 '인터뷰' 도장.
  - 답이 하나도 없던 상태에서 첫 답을 고르면 `interview_start` 이벤트를 보낼 자리를 만든다 (실제 전송은 T18).
- 완성 확인: 레시피 5개의 답으로 끝까지 가면 각각 레시피와 같은 질문 순서가 나온다 (e2e는 T20에서).

### [x] T09 장보기
- 요구: R-20~R-26, R-51(M3) · 읽을 것: `docs/UX.md` 3.4, `docs/ENGINE.md` 3절
- 할 일: 칸 목록(인벤토리처럼, 칸 아이콘은 3D 그림 문자), 칸 펼치기(칸 설명 한 줄), 추천(이유 칩, 2위 비교), 진열·색인 구분, 상품 카드(기본 5항목 + 펼치기), 배지, 담기·빼기, 여러 칸을 맡는 상품 표시, 맞는 상품이 없는 칸 안내, 담기 모션 M3와 주행 거리, 필수 칸을 다 채우면 '장보기' 도장.
- 완성 확인: 골든 case-01의 장바구니를 화면에서 담으면 칸별 추천·점수·이유가 `npm run explain -- case-01`과 같다.

### [x] T10 재확인
- 요구: R-28~R-32 · 읽을 것: `docs/UX.md` 3.5, `docs/ENGINE.md` 4절
- 할 일: 이해한 내용 요약, 코딩 없이 되는 방법 한 줄, 충돌 목록과 신호등 M6(바꾸기 → 장보기 그 칸 / 그대로 두기, `keepable`이 false면 그대로 두기 없음), 1차/2차 나누기(미룰 칸, 더 쉬운 상품으로 바꾸기, 둘 다 없을 때 안내), 칸 밖 상품 알림, "영수증 뽑기" 켜짐 조건(꺼져 있으면 `aria-disabled`와 이유 글), 모두 초록이면 기사님 한마디와 '재확인' 도장.
- 완성 확인: case-04는 발행 버튼이 꺼지고 이유가 보이며, 충돌을 그대로 두면 켜진다. case-03에서 알림을 미루면 case-08과 같이 나누기 제안이 사라진다. 장바구니를 비우면 화면 칸 충돌은 그대로 둘 수 없다.

### [x] T11 계산대
- 요구: R-33~R-39, R-51(M4) · 읽을 것: `docs/RECEIPT.md`, `docs/UX.md` 3.6
- 할 일: 탭 네 개(영수증·설계 꾸러미·공부할 것·대화 카드), 영수증 종이(모델로 그림, 영수증 글꼴) + 텍스트 복사, 꾸러미 미리 보기·복사·내려받기, 대화 카드 복사, 공유 링크·PC로 보내기(Web Share가 안 되거나 인앱 브라우저면 링크 복사), 링크로 다시 열기(읽기 전용 → 이어 하기), 발행할 수 없을 때 재확인으로 보내기, 준비물·예상 막힘, 면책 한 줄, 영수증 출력과 도장 M4(누르면 건너뜀), 처음 보는 영수증이면 색종이(지연 로드)·기사님 축하·'계산대' 도장. 이 화면에는 Web Analytics를 싣지 않는다.
- 완성 확인: 레시피 5개로 뽑은 꾸러미가 `docs/examples/*.md`의 꾸러미와 같다 (발행 시각·사이트 주소 제외). 내려받은 파일 이름이 `design-pack-YYYYMMDD-HHmm.md`.

### [x] T12 공부할 것과 개념 카드
- 요구: R-36, R-40~R-42 · 읽을 것: `docs/UX.md` 3.7
- 할 일: `/study`(필수 → 단계별), `/concepts/[id]` 정적 페이지(설명, 그림 자리, 확인 문제 섬, 내 AI에게 배우기 복사, 관련 상품), 해 보기 모형 5개, 진행 기록 저장, 확인 문제 정답 도장(M7), 필수 개념을 다 읽으면 '공부' 도장과 `required_done` 자리.
- 완성 확인: 개념 페이지가 자바스크립트 없이도 설명과 문제 글을 보여 준다 (문제 풀기만 섬).

### [x] T13 진열대와 상품 상세
- 요구: R-46, R-23, R-24 · 읽을 것: `docs/UX.md` 3.8
- 할 일: `/shelf`(분야·기능 거르기. 검색창은 T15에서), `/products/[id]`(진열 상품만 정적 생성, 카드 전체 항목, 들어간 레시피).
- 완성 확인: 색인 상품은 상세 페이지가 없고 목록에 주의 배지와 원문 링크만 보인다.

### [x] T14 레시피
- 요구: R-47 · 읽을 것: `docs/UX.md` 3.9
- 할 일: `/recipes` 카드 목록, "이 레시피로 출발"(답·장바구니·그대로 둔 충돌·`freeText`를 채움, 기존 진행이 다르면 덮어쓰기 확인 → `/check`).
- 완성 확인: 레시피 5개 모두 재확인에서 "영수증 뽑기"가 켜지고, 꾸러미 제목이 레시피의 `freeText`다.

### [x] T15 사전과 검색
- 요구: R-43~R-45 · 읽을 것: `docs/ARCHITECTURE.md` 7절, `docs/UX.md` 3.10
- 할 일: `scripts/build-search.ts`(빌드 전에 MiniSearch 색인 생성, 7절의 낱말 나누기), 옆 창 섬(어느 화면에서나), `/dictionary`, 에러 붙여 넣기(`matchErrors`) + 못 찾을 때 질문 틀, 진열대(`/shelf`) 검색창.
- 완성 확인: "환경변수", "API키는", "CORS 에러가 났어요", "zsh: command not found: npm"이 각각 맞는 항목을 맨 위에 보여 준다.

### [x] T16 노선도와 모션 마무리
- 요구: R-08, R-50~R-53 · 읽을 것: `docs/UX.md` 2·4절, `docs/DESIGN.md` 7절
- 할 일: 노선 띠 M1(차가 길을 따라 이동, 지나온 구간 칠하기, 정류장 열림 M7, 갈 수 있는 정류장만 누를 수 있게), '내 여행 기록' 도장판 화면, 설정의 '동작 줄이기'·'효과음', 모든 장면 건너뛰기, `aria-live` 알림 점검, `game-ux-designer` 검토로 화면마다 '게임 순간'이 하나씩 있는지 확인.
- 완성 확인: 기기 설정과 사이트 설정 둘 다에서 모든 이동이 멈추고 끝 상태가 바로 보이며, 모션 없이도 흐름이 끝까지 된다.

### [x] T16b (선택) 홈 3D 시험 장면 — 만들지 않고 보류 (D54)
- 요구: R-51 · 읽을 것: 결정 D26 · 먼저: T16
- 할 일: `ogl`로 홈 출발 장면을 진짜 3D(코드로 만든 단순한 차·도로, 모델 파일 없음)로 만든 시험판. 정지 그림이 먼저 보이고, 유휴 시간 뒤 지연 로드, 동작 줄이기·데이터 절약·WebGL 없음이면 띄우지 않음, 3초 이하, 누르면 끝.
- 완성 확인: 첫 화면 JS 예산 그대로, 지연 묶음 200KB 이하, 360px에서 끊김 없이 보임, `game-ux-designer`가 CSS 3D판보다 낫다고 판단. 하나라도 못 맞추면 넣지 않고 결과를 `docs/DECISIONS.md`에 적는다.

### [x] T17 소개·추천 공식·법 문서 초안
- 요구: R-07, R-73~R-75 · 읽을 것: `docs/PRD.md` 8절
- 할 일: `/about`, `/about/scoring`(`scoring.json` 값으로 표 자동 생성), `/about/credits`(글꼴·아이콘·그림 문자·라이브러리 라이선스, `THIRD_PARTY_NOTICES.md`와 같은 내용), `/legal/privacy`·`/legal/notice` 초안(맨 위 "검토 중"), `/404`(길을 잘못 든 차 그림), 모든 화면 바닥글에 라이선스 안내(코드 MIT는 `LICENSE`, 자료 CC BY 4.0은 `data/README.md`에 이미 있음).
- 완성 확인: 가중치를 바꾸면 추천 공식 페이지가 빌드 때 따라 바뀐다. 법 문서는 H04 전까지 "검토 중" 표시.

### [x] T18 익명 집계
- 요구: R-60, R-61 · 읽을 것: `docs/ARCHITECTURE.md` 8절
- 할 일: wrangler를 개발 의존성으로 설치, 로컬용 `wrangler.jsonc` 뼈대(9절, `database_id` 비움), `worker/index.ts`(`/api/event`: 이벤트·구간 목록 검사, 같은 사이트 요청만, 204)와 `worker/tsconfig.json`, `migrations/0001_events.sql`, 화면 쪽 `src/lib/track.ts`(sendBeacon, 같은 열쇠는 한 번만), 개인정보 처리방침 초안에 수집 항목 반영.
- 완성 확인: `npx wrangler d1 migrations apply code-chauffeur-events --local` 뒤 `npx wrangler dev`로 로컬 D1에 횟수가 쌓인다. 목록에 없는 이벤트·구간, 다른 사이트에서 온 요청, 200바이트 넘는 본문은 버린다.

### [ ] T19 색인 수집 (공공데이터포털)
- 요구: R-54, R-58, R-71 · 읽을 것: `docs/DATA.md` 11절, `data/sources.json`
- 할 일:
  - 먼저 공식 목록 조회 API(또는 메타데이터 내려받기)가 있는지, 서비스 키가 필요한지, 이용 조건과 robots.txt가 무엇인지 원문으로 조사해 `docs/DECISIONS.md`에 적고 사람에게 보여 준다. 화면 긁기는 하지 않는다.
  - 사람이 승인하면 `scripts/collect-index.ts`: 오픈 API 목록 → 분류 대응표로 분야 태그 → 색인 상품 모양(DATA.md 11절의 정해진 값)으로 `data/index/분야.json`. 키가 필요하면 GitHub Secrets의 `DATA_GO_KR_SERVICE_KEY`로만 읽는다.
  - 수집이 성공하면 GitHub Release 첨부 파일 `index-latest.tar.gz`를 덮어쓰고, 실패하면 빌드가 그 파일을 내려받아 쓴다.
  - 빌드 때 `public/index/`로 내보내고 장보기·진열대의 색인 묶음에서 쓴다.
- 완성 확인: 수집이 실패해도 빌드가 마지막 정상 색인으로 끝난다. 저장소 기록에 색인 파일이 올라가지 않는다.

### [x] T20 접근성·성능 점검
- 요구: R-09, `docs/ARCHITECTURE.md` 11절 · 읽을 것: `docs/UX.md` 6절
- 할 일: Playwright e2e(레시피 5개로 홈 → 영수증, 인터뷰 처음부터 끝까지, 공유 링크 다시 열기, 사전 검색, 키보드만으로 인터뷰, 장면 중간에 누르면 끝 상태, 동작 줄이기로 흐름 끝까지), axe 검사, 360px 화면 캡처, 성능 예산 확인. `npm run e2e`를 만든다 (Playwright·axe는 하네스가 이미 설치, D33). CI에 e2e를 더하고 `npx playwright install --with-deps chromium`을 넣는다.
- 완성 확인: axe 심각·치명 0개, 주요 흐름 e2e 통과, 첫 화면 JS 100KB(gzip) 이하.

### [ ] T21 미리 보기 배포
- 요구: R-02 · 읽을 것: `docs/ARCHITECTURE.md` 9절 · 먼저: H01, H02, T18
- 할 일: D1 만들기와 `database_id` 채우기 안내, GitHub Actions 미리 보기 배포(main, `npm run validate` 통과 시), "검토 중인 시험판" 띠와 `noindex`, 보안 헤더 방법 확인·적용, Web Analytics 붙이기(`/receipt` 제외).
- 완성 확인: 사람이 계정을 연결한 뒤 `workers.dev` 주소에서 홈 → 영수증이 되고 띠가 보인다. 비밀 값이 저장소에 없다.

### [ ] T22 정식 출시 준비
- 요구: PRD 9절 · 먼저: C01~C05, H03, H04, T21
- 할 일: `npm run validate:release` 통과 확인, 정식 배포 작업(띠·`noindex` 떼기, release 검사 통과 시에만), 관찰 시험용 안내서(`docs/OBSERVATION.md`: 과제 3개, 관찰할 것, 기록 양식) 작성, 남은 위험 목록 정리.
- 완성 확인: 사람이 관찰 시험을 시작할 수 있고, 정식 배포가 release 검사에 묶여 있다.

## 자료 채우기 (C)

### [ ] C01 씨앗 상품 원문 확인
`needsReview: true`인 진열 상품 16개를 사람이 공식 문서와 대조한다. 틀린 곳을 고치고 `needsReview: false`, `checkedAt`을 그달로. Claude Code는 확인할 항목 목록(상품별 확인할 사실과 링크)을 표로 만들어 준다.

### [ ] C02 진열 상품 60~80개
교육 분야 중심으로 늘린다 (학교 공공 API, 무료 배포, 저장, 폼·설문, 지도, 번역, 이미지 등). `/add-product`로 초안을 만들고 사람이 확인한다. 새 분야가 생기면 골든 사례를 함께 만든다.

### [x] C03 개념 카드 20장
지금 10장. 후보: 프론트엔드·백엔드, 서버, 데이터베이스, 로컬호스트, npm·패키지, Git 커밋, 도메인, HTTPS, 로그 보기, 브라우저 개발자 도구. 해 보기 모형 5개는 이미 정해졌다.

### [x] C04 에러 안내 20개
지금 6개. 후보: EADDRINUSE(포트 사용 중), permission denied, git push rejected, 빌드 실패(타입 오류), 빈 화면(콘솔 에러), 500, 403, 키 만료, npm ERR! ERESOLVE, 공공데이터포털 오류 코드.

### [x] C05 골든 사례 20개
지금 15개. 새 상품·규칙·분야마다 최소 하나. 기대 결과는 손으로 따져 본 뒤 쓴다.

## 사람이 할 일 (H)

- [ ] H01 Cloudflare 계정 만들기 (무료 플랜). API 토큰 발급은 T21에서 안내를 받아 진행
- [x] H02 GitHub 공개 저장소 만들고 이 폴더를 올리기 (yoorrard/code-chauffeur)
- [ ] H03 KIPRIS 상표 검색, 도메인(codechauffeur.com 등) 확인과 결정
- [ ] H04 법·학교 확인: 교원 겸직 신고, '학원' 명칭, 국외 이전 고지, 개인정보 처리방침·이용 안내 최종 문구
- [ ] H05 관찰 시험 (교사 5명), 처음 써 본 10명의 첫 결과물 확인
- [ ] H06 설명문 초안에 AI를 쓸지 결정
- [ ] M01~M03 기사님 그림 권리·추가 자세·이름 (`docs/HUMAN.md`)

사람 일의 자세한 내용과 진행은 `docs/HUMAN.md`가 정본이다.

## 진행 기록

<!-- 형식: YYYY-MM-DD 작업 번호 한 줄 요약 (커밋 해시) -->
2026-10-12 준비 저장소를 루트로 정리 (ab992c3)
2026-10-12 준비 자율 개발 하네스: 스킬 13개(가져온 8개 포함), 전문가 에이전트 6명, 훅, 품질 바닥선, 시각 점검·예산 (9490b0a)
2026-10-12 준비 기획 개선: 게임 연출을 1단계로(R-50~R-53, UX 4절, T02b·T06b·T16b), 결정 D22~D34, 자료 논리 수정(D34)
2026-10-12 T01 Astro 7.3.8 + Preact 10 정적 뼈대, astro check 포함 타입 검사, 빌드 때 엔진 확인용 임시 홈 (D35)
2026-10-12 T02 남색·금색·지도 종이 토큰과 모션 토큰(스프링·손맛·동작 줄이기 페이드), 대비·동작 줄이기 검사(npm run tokens), Pretendard 3굵기·CC Receipt 직접 싣기(npm run fonts, D37), 기본 스타일
2026-10-12 T02b 기사님 정리본과 `Mascot`(avif·webp 1배·2배), Fluent 3D 그림 문자 30개(`Emoji`), Phosphor duotone `Icon`(Astro·Preact), Pretendard 가변 글꼴로 바꿈·CSS 예산 30KB·`<picture>` 예산 셈 고침 (D38)
2026-10-12 T03 Vitest 5.0.3(npm peer 버그는 overrides로), 골든·자료 검사(망가뜨린 자료 11가지)·명도 대비·글꼴 이름 시험 38개, 자료 검사를 `scripts/lib/validate.ts`로, check에 시험 포함, CI에 시험 범위·빌드·예산 (D39). 엔진 시험 범위 55% → T04
2026-10-12 T06 (T05보다 먼저) nanostores 저장소(store·saved·result), lz-string 공유 링크(#r=, 읽고 바로 지움), 정류장 규칙·이어서 하기·상태 비교(stations), 주행 거리·도장(progress), 단위 시험 52개 (D40)
2026-10-12 T05 기본 틀(Base.astro): 노선 띠·전광판·주행 거리·설정 메뉴(popover)·여행 기록과 기록 지우기(dialog)를 담은 머리말 섬, 붙박이 아래 막대(주 버튼·사전), 기사님 자리, aria-live 자리, 문서 간 View Transitions, 기사님 얼굴 자르기, 문구 묶음 (D41)
2026-10-12 T06b motion.ts(reduced·dur·play·skipAll·skippable·flip·followPath), sfx.ts(기본 꺼짐, 켜면 합성기 동적 import, 소리 일곱 가지), 시험 12개
2026-10-12 하네스 보강 (D42): 훅 구멍 메우기, 멈춤 검사 3번, 원격 측정 끄기, 사이트 설정 동작 줄이기 스크린샷
2026-10-12 T04 엔진 단위 시험 6개 파일(조건·인터뷰·장보기·재확인·계산대·출력·빈틈) 370여 개, 가짜 자료 도우미로 규칙 하나씩. 엔진 줄 시험 범위 100%(가지 97.5%), vitest 문턱 90%. 명세가 비어 있던 곳은 ENGINE.md에 적고, 고칠 일은 BACKLOG로 (동작 변경 없음)
2026-10-12 T07 홈(출발 장면 M8→M2 약 1.5초·다시 온 사람 0.7초, 두 입구, 레시피 3개와 덮어쓰기 확인, 이어서 하기·여행 기록 미리 보기)과 첫 수업(문장 3개·복사·단계별 막힘 안내·첫 수업 도장). 차 SVG(svg-illustrator). T05 검토 15건·문장 검토 19건·연출 검토 11건 반영 (D41·D43)
2026-10-12 T08 인터뷰 섬: 질문 하나씩, 보기 버튼(aria-pressed, 누르면 다음·제목으로 초점), 이전, n번째 질문, 첫 질문 기사님 안내, 좁혀지는 중(답 칩·생긴 칸·혹시 이 레시피 M5), 한 줄 입력(80자, 링크에 안 들어감), 인터뷰 도장, interview_start 자리, 노선 띠 차 M1(View Transitions). 레시피 5개 답으로 끝까지 가서 질문 순서가 같음을 확인 (D44)
2026-10-12 T09 장보기 섬: 칸 목록(3D 칸 그림, 채우면 ✓), 칸 하나씩 펼치기(설명 한 줄), 추천 카드(이유 칩·2위보다 앞선 점), 다른 진열 상품, 색인 접힘(주의), 상품 카드 5항목+자세히, 배지, 담기·빼기(M3 상자 비행·알림·효과음), 여러 칸을 맡는 상품 표시, 맞는 상품 없는 칸 안내, 장보기 도장. case-01 장바구니를 화면에서 담아 칸별 추천·점수·이유가 골든과 같음을 확인. 인터뷰를 마치지 않았으면 잠김 안내
2026-10-12 T10 재확인 섬: 이렇게 이해했어요(답 칩·칸별 상품·칸 밖 상품·난이도와 예상 시간), 코딩 없이 되는 방법, 충돌 신호등 M6(빨강→노랑→초록, 각 350ms, 바꾸기는 장보기 그 칸으로 ?slot=, keepable이 false면 그대로 두기 없음), 1차/2차 나누기(미루기·되돌리기·더 쉬운 상품으로 바꾸기·둘 다 없을 때 안내), 아래 막대 '영수증 뽑기' 섬(aria-disabled와 이유 글), 모두 초록이면 기사님 한마디와 재확인 도장. case-04·case-03→08·빈 장바구니 확인
2026-10-12 T11 계산대 섬: 영수증 출력 M4(종이가 덜컥덜컥 뽑히고 도장 쾅, 누르기·Esc·건너뛰기), 처음 뽑은 영수증이면 색종이(canvas-confetti 1.9.4 지연 로드 4.3KB, 1.2초)·기사님 축하·계산대 도장, 탭 네 개(키보드 화살표), 영수증·공유 링크 복사, PC로 보내기(Web Share, 인앱 브라우저면 링크 복사)와 메일, 꾸러미 미리 보기·복사·.md 내려받기, 공부할 것, 대화 카드, 준비물·예상 막힘, 면책, 공유 링크는 읽자마자 지우고 읽기 전용 → 이어 하기(다르면 묻기), 깨진 링크·발행 불가 안내. 레시피 5개 꾸러미가 docs/examples와 같음(시각·주소 제외)
2026-10-12 T12 공부할 것(/study: 필수 → 단계별, 읽음·맞힌 문제 수, 인터뷰 전이면 모든 개념)과 개념 카드(/concepts/[id] 정적 10장: 설명·다른 이름·그림 설명·먼저 알면 좋은 개념·관련 상품, 섬은 확인 문제·내 AI에게 배우기·다 읽었어요·해 보기). 해 보기 모형 5개(환경 변수 칸, API 키 위치, JSON 읽기, 가짜 터미널, 배포 3단계), 문제 정답 작은 도장, 필수를 다 읽으면 공부 도장과 required_done 자리. 자바스크립트 없이도 설명·문제 글이 HTML에 있음 (D46)
2026-10-12 T15 (진열대 검색창 빼고) MiniSearch 색인(정적 끝점 /search-index.json, 81문서, gzip 21KB), 낱말 나누기(영문·한글 분리, 조사 떼기, 두 글자 조각, 이름 가중), 사전 옆 창(dialog, 처음 열 때 색인 불러옴)과 /dictionary, 에러 붙여 넣기(matchErrors)와 질문 틀. '환경변수'·'API키는'·'CORS 에러가 났어요'·'zsh: command not found: npm' 시험 통과 (D47)
2026-10-12 T17 /about(하는 것·하지 않는 것·AI를 안 쓰는 이유·자료 공개), /about/scoring(scoring.json에서 빌드 때 표 생성), /about/credits(THIRD_PARTY_NOTICES.md 표를 빌드 때 읽음), /legal/privacy·/legal/notice 초안('검토 중' 표시, H04), 404(길 잃은 차), 모든 화면 바닥글 라이선스 안내. 저장소 공개 여부는 H07
2026-10-12 T13 /shelf(상품의 첫 기능별 코너, 분야·기능 거르기 섬: aria-pressed 단추, 정적 목록의 hidden만 바꿈, 0개면 '모두 보기'), 색인 상품은 맨 아래 '색인에서 찾은 것'에 주의 배지·원문 링크만(상세 없음), /products/[id] 진열 상품 18개 정적 생성(카드 전체 항목과 들어간 레시피). 하위 에이전트 작업 공간에서 만들고 합침 (D48)
2026-10-12 T14 /recipes 카드 5개(누구에게, 담긴 상품, 난이도·예상 시간은 빌드 때 evaluate → receiptModel, '이 레시피로 출발'). 레시피 5개 모두 /check에서 '영수증 뽑기'가 켜지고 freeText가 저장됨 (D48)
2026-10-12 T15 마무리: 진열대 검색창(사전과 같은 색인을 처음 칠 때 불러옴, 상품·상품 예상 막힘만 남겨 거르기와 함께 적용, 입력을 멈추면 보이는 수 알림). '날씨'·'급식'·'지도'·'배포'·'저장' 확인, /shelf 시각 점검 통과 (D47)
2026-10-12 T13~T15 검토 반영: 문장 9건(ko-copy-editor), 접근성 9건(a11y-perf-auditor: 진열대 검색의 늦은 결과·늦은 알림, 색인 실패 안내와 다시 받기, 붙기 전 검색어 이어받기, 수·빈 안내를 검색창 아래로, 고대비 눌림 표시, 링크 목록 44px, 새 창 아이콘, /recipes 금색 버튼 하나 규칙), 파비콘
2026-10-12 T16 노선 띠 M1(앞 정류장·출발점에서 차가 달려오고 지나온 길이 같이 칠해진 뒤 핀 톡, 세 칸 이상이면 900ms), M7(화면 안의 정류장 열림·작은 도장·주행 거리 굴리기, 열림 알림과 '딩동'), 모든 장면 건너뛰기(화면 어디든 누르기·Esc, cc:skip), 알림 120ms 모으기, 효과음 한 순간에 하나, 붙기 전 머리말 감추기, 진열대·사전·공부의 게임 순간. 기기·사이트 동작 줄이기 모두 첫 수업부터 영수증까지 150ms 넘는 애니메이션 없이 흐름이 끝까지 됨 (D49, game-ux 검토 꼭 2·권함 6 반영)
2026-10-12 T18 wrangler 4.141.0, wrangler.jsonc 뼈대(database_id 비움, 끝 빗금 없는 주소, 로그 끔), worker/index.ts(/api/event: 같은 사이트·200바이트·이벤트 다섯 개와 구간만, 204), migrations/0001_events.sql, src/lib/event-spec.ts(화면과 Worker가 같이 씀)·track.ts(sendBeacon, 같은 열쇠 한 번만). 로컬 D1에 화면이 보낸 횟수가 쌓이고 다른 사이트·목록 밖·큰 본문은 버려짐 확인, 시험 17개 (D50)
2026-10-12 T19 사전 조사만: 공식 목록 수단(목록조회서비스 15077093, 목록개방현황 CSV 15062804)·분류 16개·이용 조건을 D51에 적고, 계정·키·약관·robots 확인을 H08·H09(선택 H10)로 넘김. 수집기는 사람 확인 뒤에 만든다
2026-10-12 T20 npm run e2e (Playwright 1.56.1, 360px, dist를 scripts/qa/serve.ts로): 레시피 5개로 영수증·꾸러미 제목, 키보드만으로 인터뷰부터 영수증까지, 공유 링크 다시 열기(읽기 전용·조각 지움·이어 하기), 사전 질문 4개·옆 창 Esc·진열대 검색, 차 이동·영수증 출력 중 누르면 끝, 기기·사이트 동작 줄이기 흐름, axe 18개 화면(처음 온 사람)+6개(진행 있음) 심각·치명 0 — 41개 통과. CI에 e2e와 실패 기록 올리기를 더함. 첫 화면 JS 67.9KB/100KB (D52)
2026-10-12 T21 준비(사람 단계 남음): 배포 작업(deploy.yml: main·수동, 검사·validate·빌드·예산, 비밀 값 없으면 건너뜀, database_id 확인, 원격 D1 표, wrangler deploy), CSP(Astro 해시)·_headers, '검토 중인 시험판' 띠·noindex·robots, Web Analytics 자리(/receipt 제외), docs/DEPLOY.md, HUMAN H11. 완성 확인은 사람이 계정을 연결한 뒤 (D53)
2026-10-12 T22 준비(사람 단계 남음): 관찰 시험 안내서 docs/OBSERVATION.md(과제 3개, 관찰할 것 9가지, 기록 양식), 남은 위험 목록 docs/RISKS.md, 정식 배포는 deploy.yml에서 SITE_STAGE=release일 때 validate:release에 묶임(D53). C01 대조표를 HUMAN.md에 채움(진열 상품 16개)
2026-10-12 C05 골든 사례 16 → 20: case-17 학사일정 알림판(알림 '아마도' → 2차 제안), case-18 나만 보는 시간표(브라우저 저장, local-key 안전 지시), case-19 반 도서 기록장(로그인 '아마도', Supabase가 두 칸, Workers로 키 충돌 해결), case-20 동네 문화 행사(분야 상품 없음, 결제 조사, 충돌 둘로 발행 막힘). 골든에 안 쓰이던 상품 4개와 답 14개를 처음 씀. conflict.paid-on-free는 유료 상품이 생기는 C02 뒤에 사례를 만든다
2026-10-12 T16b 보류: 첫 그림부터 도는 CSS 장면을 늦게 불러온 WebGL이 낫게 하기 어렵고(두 번 도착 또는 늦은 시작), 2D 기사님 그림과 그림체가 어긋나 시험판을 만들지 않음. 다시 볼 조건은 D54
2026-10-12 C03 개념 카드 10 → 20장: server, frontend-backend, localhost(필수), npm-package, domain, https, git-commit, database, devtools, logs. 퀴즈 정답 위치 최대 37%, 아직 어떤 상품에도 연결하지 않아 추천·예시 결과 그대로. 문장·초심자 읽기 검토는 이어서 반영
2026-10-12 C04 에러 안내 6 → 20개: git 인증·push 거절, 키 만료, 공공데이터포털 오류 코드, 403, 500, JSON이 아님, 네트워크 실패, 빈 화면, 빌드 타입 오류, ERESOLVE, 포트 사용 중, 파일 없음, 권한 거부. 예시 54개가 모두 자기 항목에만 걸림(시험), 위험한 해결 권하지 않음, 새 개념과 연결. 검색 색인 gzip 21 → 36KB(처음 검색할 때만)
2026-10-12 C02 (진행 중) 진열 상품 18 → 48: 기반 도구 10(Netlify, Vercel, Firebase 셋, 구글 설문지, Airtable, Slack, EmailJS, Heroku), 한국 공공 데이터 11(학교 기본정보, 커리어넷, 국어사전 셋, 관광, 특일, 에어코리아, 버스 도착, 서울 열린데이터, 문화 행사), 지도·번역·그림·금융·날씨 9. 주제 6개·갈래 질문 2개, 동점이면 열린 칸을 더 맡는 상품, case-21(유료 충돌). 사실은 검색 결과로만 확인해 모두 확인 중(C01 대조표 46개, 근거 docs/review/) (D55)
2026-10-12 C02 엔진 검토 반영: 동점 규칙을 '아직 비었고 그 칸에서도 1등인 칸'만 세도록 좁힘, 동점 이유를 2위 줄에 표시(tieBy), 금융 갈래 질문(주식·환율·경제 통계), '모르겠어요' 답은 레시피 맞추기에서 뺌, 키 자리를 단정하던 promptFragment 4개 고침, 골든 case-22·23 (D55 고침). 이름 순 동점 남은 곳은 BACKLOG
