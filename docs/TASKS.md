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

## 컨셉 적용 (D56)

`docs/CONCEPT.md`가 정본이다. 작업마다 10절 표의 '고칠 파일'과 '다 됐다고 볼 기준'을 따른다. 소유자 그림을 기다리지 않는다 (청사진 자리 표시로 낸다).

### [x] T23 결정 기록
- 읽을 것: `docs/CONCEPT.md` 0·10절
- 할 일: CONCEPT.md를 싣고 D56, HUMAN(기사님 항목 닫기, 그림 요청 A01~A05), TASKS, BACKLOG, CLAUDE.md(문서 순위, 꼭 지킬 것 12)를 고친다. 네 안과 심사 원문은 `docs/review/concept/`.

### [x] T24 용어와 주소
- 읽을 것: CONCEPT 2·3절 · 먼저: T23
- 할 일: 3절의 모든 말 바꾸기(`ko.ts`, `templates.json`, 질문·규칙 문장), 페이지 옮기기(/test-drive, /destination, /waypoints, /check, /arrival, /tools, /terms, /courses, /about/criteria, /receipts는 T32), `stations.ts` → `stages.ts`, 설계도 파일 이름, `public/_redirects` 301, 금지어 검사(3.9절), copy.md 세계관 낱말(3.8절), e2e, UX 7절·RECEIPT·ARCHITECTURE 라우트.
- 완성 확인: `npm run check`, 금지어 0, 골든 그대로(바뀌면 `골든:`), `npm run examples`, 영수증 36칸, 옛 주소 10개 시험, `ko-copy-editor`·`engine-guardian` 검토.

### [x] T25 걷어 내기
- 읽을 것: CONCEPT 9절 '빼는 것' · 먼저: T24
- 할 일: 기사님 그림·Mascot·Car·Emoji·`public/emoji/`·색종이·전광판·주행 거리·단계 도장을 걷어 내고, `progress.ts`는 단계 상태와 남은 개수만, 저장 키 `cc:seen:v1`·`cc:receipts:v1`. 크레딧·THIRD_PARTY·rules·agents의 기사님 줄.
- 완성 확인: `rg "mascot|Mascot|Emoji|confetti" src` 0, 빌드, 깨진 그림 0, 지연 묶음 줄어듦.

### [x] T26 토큰과 바탕
- 읽을 것: CONCEPT 5.3~5.5절, 7절 길이 토큰 · 먼저: T25
- 할 일: 낮·밤 색, 지도·교통·느낌 팔레트, 크기, 모양, 길이 토큰. 대비 검사를 두 모드로.
- 완성 확인: 대비 두 모드 통과, 토큰 밖 값 0, 360 낮·밤 스크린샷을 직접 봄.

### [x] T27 틀
- 읽을 것: CONCEPT 5.8·6절 머리 · 먼저: T26
- 할 일: 머리줄, 단계 줄(좁으면 버튼으로 접힘), 시트, 아래 막대와 상태 한 줄, 기사 메시지, 브랜드 마크, Phosphor Regular.
- 완성 확인: 360·768·1280·글자 200% 잘림 없음, 키보드 단계 이동, 44px, axe 심각·치명 0.

### [x] T28 지도 (D63·D68, v2 설계서 W3·W5로 마무리)
- 읽을 것: CONCEPT 5.5~5.6·9(a)절 · 먼저: T26 (T27과 나란히 가능)
- 할 일: 땅 판 만들기 스크립트, 지도 표지 묶음, `src/lib/map/model.ts`(순수 함수, 시험), `MapBoard.tsx`, 충돌 규칙 `anchorSlot`(스키마·ENGINE.md).
- 완성 확인: 기능 조합 32·골든·코스 전부에서 이름표 겹침 0, 넘침 0, 기호 12개 이하, 크기 예산, 동작 줄이기에서 같은 정보, `role="img"` 요약.

### [x] T29 홈 (v2 설계서 6.3, W4a·D70)
- 읽을 것: CONCEPT 6.1절 · 먼저: T27, T28
- 완성 확인: 360×640 첫 화면에 제목·주 버튼·믿음 줄, 다시 온 손님 카드, 첫 화면 JS 100KB 이하.

### [x] T30 단계 화면 다섯 (v2 설계서 6.4~6.8, W4b~d·D70)
- 읽을 것: CONCEPT 6.2~6.6절 · 먼저: T29
- 완성 확인: 코스 5개 e2e, 키보드만으로 목적지 끝까지, 영수증 링크·이어서 가기, 그대로 간 막힌 곳은 노랑, 설계도 파일 이름.

### [x] T31 장면 (v2 설계서 7절, W5·D71. S5+S6은 3.0초로 바뀜, 문서 간 전환은 끔)
- 읽을 것: CONCEPT 7절 · 먼저: T30
- 완성 확인: 모션마다 1초 안쪽, S5 2.8초 이하, 누르기·Esc·건너뛰기, 동작 줄이기 e2e, `game-ux-designer` 검토.

### [x] T32 둘러보는 곳 (v2 설계서 6.9~6.12, W3b·D67)
- 읽을 것: CONCEPT 6.7~6.12절 · 먼저: T30
- 완성 확인: 검색 e2e, 360 도구 모음 길이 절반 이하, 지난 영수증 30장 넘침 시험.

### [x] T33 그림 넣기
- 읽을 것: CONCEPT 9절 · 먼저: T26 (장치 시험은 일찍)
- 할 일: 렌더 장치 `npm run art`(three는 devDependency만), `Art.astro`, 청사진 자리 표시. 소유자 그림이 오면 굽는다.
- 완성 확인: GLB 하나를 구워 투명 PNG가 나옴, 예산, `art:sheet` 견본을 직접 봄.

### [ ] T34 점검과 문서 (v3에서 T42에 합침)
- 읽을 것: CONCEPT 10절 · 먼저: T24~T33
- 완성 확인: check·build·e2e·qa:shots(밤 포함)·qa:budget, `a11y-perf-auditor`·`ko-copy-editor`·`reader-tester` 검토, PRD·DESIGN·UX·OBSERVATION 정리.

## v3: 처음부터 공개한 뒤까지 (D73~D84)

정본은 `docs/review/v3/brief.md`(2판). 짝 문서(`docs/review/v3/` design·aitools·services·input·launch·companions)는 세부 값의 정본이고, 어긋나면 설계서를 따른다. 에이전트 하나가 한 묶음을 맡는다.

```text
T35 기반 ──┬─▶ T36 직접 쓰기 자료·엔진 ─▶ T37 직접 쓰기 화면 ─┐
           ├─▶ T38 디자인 정하기 (자료·엔진은 바로, 화면은 T37 부품 뒤) ─┤
           ├─▶ T39 만들기 안내 ─────────────────────────────────────────┤
           └─▶ T41 출시 준비 (T40과 겹치는 4단계 아래 막대는 T40 뒤) ──┤
                                         T36 + T38 + T39 ─▶ T40 다음 할 일·AI 설정 파일
                                                         모두 ─▶ T42 실측 검수와 마무리
```

모든 묶음에 공통: 시작할 때 설계서의 해당 절을 DECISIONS·CONCEPT·PRD에 먼저 옮기고, 끝나면 맨 아래 진행 기록에 한 줄. `data/questions.json`·`data/templates.json`·`src/copy/ko.ts`는 한 번에 한 묶음만 커밋한다. 화면을 바꾼 묶음은 `/visual-qa`(360·768·1280, 밤, 동작 줄이기, 글자 200%)와 키보드만으로 끝까지. 새 지연 묶음은 만들 때 `qa:budget`에 줄을 더한다.

### [ ] T35 기반: 덜기 · 주소 바탕 · 바로 고칠 것 (P0, M)
- 읽을 것: 설계서 3.5·3.6·8.1·9·10·12·14절, `launch.md` L-01·L-04·L-08·L-30 · 먼저: 없음
- 할 일:
  - 문서 옮기기: D73~D84, PRD R-18a·R-33·R-35·R-36·R-37·R-60 주석·R-75 주석, CONCEPT 3절 새 낱말('모름' 계열 셋, 때 이름 다섯, 공개하기, 결제 카드, 화면 밝기), HUMAN H13~H23(H14를 맨 위로, H10 합침), 이 묶음 목록과 아래 날짜 줄
  - `npm run words`에 쓰지 않는 말: 공개 저장소 · 누구나 고칠 · 테마 · 프리뷰 · 팔레트 · 커스텀 · 폰트 · 가이드 · 튜토리얼 · 체크리스트 · 온보딩 · 길잡이 · 다크 모드 · 화면 올리기('가이드'만 화면·설계도 문장, 나머지는 모든 자료 문장, D85). 낱말표(`aliases.json`·`looks.json` `keywords`)는 뺀다
  - 같은 말들을 `data/aliases.json` `searchSynonyms`(+ 스키마)에 넣어 사전 검색이 받게 한다(3.5절)
  - L-08 덜기: 4단계 칸 지연, 엔진·자료 묶음 쪼개기를 재 보고 효과 있는 것만(잰 값은 DECISIONS)
  - 9.4절 주소 바탕(`PUBLIC_BASE_PATH`)과 호스트 종류(`PUBLIC_HOST`), `manifest` 끝점, 바닥선 규칙
  - L-01 소개 문구, L-04 정식 빌드 지킴, 바닥글 한 줄(9.1), README, `_redirects` 옛 주소와 시험 지우기, L-30 문서 어긋남, `LICENSE` 옛 허락 문장(한국어·영어), CLAUDE.md '지금 상태' 숫자
- 완성 확인: `qa:budget` 단계 화면 넷 모두 130KB 이하·홈 100KB 이하, `check`·`build`·`e2e`, 9.4절 빌드 시험과 `base-path.spec.ts`, `PUBLIC_STAGE=release`인데 `PUBLIC_SITE_URL`이 없으면 한국어 한 줄로 빌드 실패, `grep -rn "공개 저장소\|누구나 고칠" src dist`가 0줄, 사전 검색 단위 시험("테마"·"다크모드"·"폰트"·"가이드"가 결과를 냄)
- 검토: a11y-perf-auditor, ko-copy-editor

### [ ] T36 직접 쓰기: 자료와 엔진 (P0, L) — `input.md` I1·I2
- 먼저: T35
- 할 일: 설계서 7.7절 자료 전부 + '쓰는 AI' 세 질문(에이전트는 세 무리, 보기마다 `{ tool, surface }`) + `q.ai` `builder` 보기·`ai.builder` 자료 + `q.type` '아직 못 정했어요' → '아직 안 정했어요'. `aliases.json`(T35의 `searchSynonyms`와 같은 파일) 질문별 낱말·`toolHints`·`gaps` + 스키마 + 충돌 검사. 엔진 `match.ts`·`custom.ts`, 세션 `notes`·`customTools`·`gaps`, `normalizeSession` 한도, 영수증 링크 `x`·`g`. B-02: `ai.builder`의 배포 칸 = `builder-publish`, `research.builder-publish`, 배포 칸 막힌 곳 규칙 끄기. 골든 case-24~31, ENGINE.md 새 절 둘, `/about/criteria` 한 줄
- 완성 확인: `golden` 기존 23개 그대로 + 새 8개, 찾기 표 단위 시험(맞춘 묶음 73 모두, 맞추지 않은 27 중 24 이상, 오답 0), 돈 읽기·영문 자판·부정어·직접 쓴 도구의 서행·'0원 + 확인 필요'·링크에 글 없음·`ai.builder`면 배포 칸에 GitHub Pages·Cloudflare 추천 없음, 엔진 시험 범위 90% 이상, `examples`의 1번이 "직접 쓰기"를 찍지 않음
- 검토: engine-guardian, ko-copy-editor

### [ ] T37 직접 쓰기: 화면 (P0, L) — `input.md` I3·I4
- 먼저: T36
- 할 일: `CustomAnswer.tsx`(찾기 + 낱말표는 `import()`), `Interview.tsx`, 연필 SVG 아이콘, '모름' 계열 셋, 2단계 '목록에 없는 도구 쓰기', 3단계 서행 줄과 막힌 곳 '바꾸기' 끝의 [목록에 없는 도구 쓰기 ›], 지난 영수증 이름, 지도 이름표, 도구 모음 0건 한 줄, 2단계 꼬리표 "승인 기다림 · 며칠"·"결제 카드 필요", UX.md 6.5~6.7·RECEIPT.md
- 완성 확인: e2e `custom-input.spec.ts`, axe 심각·치명 0, 360px 가로 스크롤 0, 44px 미만 버튼 0, 찾기 묶음 8KB 이하·단계 화면 130KB 이하, 사진(360 밝게·어둡게, 글자 200%)
- 이어받을 것(T36 검토, D90): '쓰는 AI' 무리 제목(`groups`)과 '유료 구독 필요' 꼬리표(`aiTool.paidOnly`)를 그린다(지금은 그리지 않아 Claude 앱의 Code 탭이 유료 표시 없이 보인다). '쓰는 AI' 직접 쓰기는 '계산은 … 기준' 안내 대신 "내 말은 설계도에 그대로 넣을게요."만. 배포 칸의 빌더 줄(`ko.shop.builderLine`)은 `SlotRanking.builder`로 그리되, 나만 쓰는 앱의 선택 칸은 엔진이 채우지 않는다(`filledBy` 빈 칸). `qa:budget`에 찾기 묶음 줄을 더하고 8KB 안으로 줄인다(지금 한 묶음 셈 약 8.7KB).
- 검토: game-ux-designer, a11y-perf-auditor, ko-copy-editor, reader-tester

### [ ] T38 디자인 정하기 (P0 + P1 `/looks`·견본, L) — `design.md`
- 먼저: T35 (화면은 T37 부품 뒤)
- 할 일: `looks.json` + 스키마 + 80쌍 대비 검사(4.6 이상) + 라이선스 허용 목록, `look.ts`, `templates.look`, `q.style` 보기 둘 · alt, 1단계 "색·글꼴 더 정하기" 시트(`LookSheet` 지연)·`LookPreview`·`look.css`, 4단계 디자인 묶음과 DESIGN.md 내려받기, 설계도 6번 11묶음 + CSS, AI에게 할 말 두 장. P1: `/looks`, 견본 SVG, '내 말로' 넓히기, THIRD_PARTY_NOTICES·크레딧
- 완성 확인: `validate`(80쌍 4.6:1·테두리 3.1:1), DESIGN.md 린트 0/0, e2e `look.spec.ts`와 '바라는 점' 초점, 디자인 묶음 14KB·`/looks` 섬 4KB 이하, 사진
- 검토: game-ux-designer, a11y-perf-auditor, ko-copy-editor, svg-illustrator

### [ ] T39 만들기 안내 (P0 자료·화면, P1 2순위 승격, L) — `aitools.md` X1·X4 + `services.md` + `companions.md` 8
- 먼저: T35
- 할 일: `guides.json` + 스키마(5.2절) + 검사 여덟(5.3절), 5.4절 첫 안내 목록(업데이트·훅 안내와 앱 안 에이전트 카드 포함), `check-guides.ts`(`--strict`·`--coverage`)·`check-guide-versions.ts`·`guides-watch.yml`·`/add-guide` 스킬, 가입 나이 `minAge`(원문 없으면 숫자 없이), `/guides`·`/guides/[id]`, 도구 상세 '시작하기' 칸, 사전 '안내' 묶음과 색인, 에러 카드 여섯, 어려운 말 새 말(배포·어두운 화면의 같은 말), `cc:guides:v1`·`cc:prefs:v1.os`, `src/lib/progress.ts`의 `lineDone`·`progressCount`. C01 증거 채우기(H14 뒤, 막혀도 멈추지 않음)
- 주의: 공식 메뉴·설정 이름에 쓰지 않는 말이 들어 있으면(VS Code '색 테마', 기기 설정 '다크 모드' 같은 것) 원문 그대로 `guides.json`의 따로 둔 칸(예: `menuPath`·`uiName`)에만 쓰고 `scripts/guard/check-words.ts` `SKIP`에 그 칸을 더한다. 설명 문장은 '어두운 화면'·'글꼴'로 쓴다 (D85). 새 화면 문장의 '배포'는 '공개하기'로 쓴다 (CONCEPT 3.10절)
- 완성 확인: `validate`, `guides --today=2026-11-20` 경고·`--strict` 통과·`--coverage` 표, 단위 시험(`selectGuides`, `progressCount`, `minAge` 표시), e2e `guides.spec.ts`, 섬 5KB 이하·`/guides`에 엔진 없음, 사진
- 검토: ko-copy-editor, reader-tester, a11y-perf-auditor

### [ ] T40 다음 할 일 · AI 설정 파일 · 설계도 넓히기 (P0, L) — `aitools.md` X2·X3 + `services.md` 11 + `companions.md` 6.6·7
- 먼저: T36, T38, T39
- 할 일: 엔진 `nextSteps()`·`stepChecks()`·`renderAiSetup()`, 템플릿, R-35 `saveAs`·`packRef`를 `docs/codechauffeur-plan.md`로, AI 설정 파일(6.1절), 설계도 머리말·8·10·11·12번, 4단계 칸 넷과 아래 막대 주 버튼을 AI 종류별로(`arrival-view.ts`), '다음 할 일' 섬(지연), AI에게 할 말 9장 묶음 넷과 괄호 입력 칸, 연습 단계 AI 채팅 칩과 가입 카드, E-01 `card_copy` 구간 여섯 + Worker 시험 + 처리방침 문장, `cc:prep:v1`
- 완성 확인: 6.4절 단위 시험, 영수증 '준비물 n개' 그대로, `golden` 그대로, `examples` 길이 상한, e2e `arrival-v3.spec.ts`, 다음 할 일 12KB·AI 설정 파일 10KB·`/arrival` 130KB 이하, 사진(360 + 글자 125%·200% 칸 고르개 라벨)
- 검토: engine-guardian, reader-tester, ko-copy-editor, a11y-perf-auditor

### [ ] T41 출시 준비 (P0 + P1, L) — `launch.md` R3~R8
- 먼저: T35 (4단계 아래 막대는 T40 뒤)
- 할 일: P0 L-02 공유 미리 보기 · L-03 사이트맵·robots·`noindex` · L-05 앱 안 브라우저 · L-06 의견 보내기([메일 주소 복사] 포함, `src/lib/feedback.ts`를 넓힘). P1 설계서 8.2절 전부(도움·정보, 설정의 화면 밝기·글자 크기·묶음, 기록, 인쇄, 운영, 앱 안 토큰 둘). 처리방침·이용 안내 초안(9.1·9.2절, 이용 안내 '라이선스'는 사이트 · 받아 간 결과물 두 문단), `launch:check`
- 완성 확인: `launch:check`, e2e(앱 안 사용자 에이전트 셋, 의견 메일에 `#r=` 없음, 화면 밝기·글자 125%, 기록 왕복, 만들다 만 앱), 인쇄 A4 2~4쪽, Lighthouse 모바일 접근성 100, `/og/default.png` 1200×630·100KB 이하
- 검토: a11y-perf-auditor, ko-copy-editor, game-ux-designer, reader-tester

### [ ] T42 실측 검수와 마무리 (P0, M) — 소유자 요청 (7), T34를 합침
- 먼저: T35~T41
- 할 일: 브라우저 도구 고르기(Claude in Chrome · 내장 브라우저 · 컴퓨터 사용, 없으면 헤드리스 Chromium이라고 보고서 첫 줄에), 미리 짠 코스 다섯 + 직접 쓴 앱·도구 + 웹에서 만드는 도구로 홈부터 설계도 받기까지 실측, 360·768·1280·밝게·어둡게·동작 줄이기·글자 200%·키보드만·콘솔 오류 0·바깥 요청 0, 받은 AGENTS.md·설계도 직접 읽기, `docs/OBSERVATION.md` 표(사람 줄은 H19), PRD·DESIGN·UX를 CONCEPT와 설계서에 맞추고 CLAUDE.md '지금 상태'를 v3 끝으로
- 완성 확인: 표가 모두 채워짐, `check`·`build`·`qa:budget`·`e2e`·`launch:check`·`validate:release`(C01만 남는지), `.qa/v3/` 사진을 직접 봄
- 검토: reader-tester, a11y-perf-auditor, game-ux-designer, ko-copy-editor를 나란히

### 날짜가 정해진 일 (설계서 5.7절)

안내 자료(`data/guides.json`, T39)를 그날에 맞춰 다시 본다. '지남'은 안내를 처음 쓸 때 반영한다.

- [x] 2026-06-02 (지남) Windsurf → Devin Desktop 이름 바뀜, Cascade는 2026-07-01에 끝남 → `devin-desktop-start` (Windsurf는 '예전 이름' 한 줄만) [검색 요약]
- [x] 2026-06-22 (지남) Firebase Studio 새 가입·새 작업 공간 막힘(Firestore·Authentication·Hosting은 영향 없음) → 어디에서도 Firebase Studio로 시작하는 길을 내지 않는다, `firebase-*` 카드는 그대로 [검색 요약]
- [x] 2026-07-09 (지남) Codex 앱이 새 ChatGPT 데스크톱 앱(Chat · Work · Codex)에 합쳐짐, 옛 앱은 'ChatGPT Classic' → `codex-app-start` 카드, `codex-install`의 '조심할 것' [검색 요약, 2차 자료]
- [ ] 2026-10-19 Antigravity 옛 워크플로(`.agents/workflows/`) 멈춤 → `antigravity-start` [검색 요약]
- [ ] 2026-10-20 Node 24가 유지보수 LTS로 [저장소: nodejs/Release `schedule.json`]
- [ ] 2026-10-28 Node 26이 LTS로(같은 날 v27 알파) → `requires.node`는 그대로(최소 판), 'LTS를 고르세요' 문장은 판 번호가 없어 고칠 것 없음 [저장소]
- [ ] 2026년 말 Supabase 옛 키 이름(`anon`·`service_role`) 지원 끝 → `supabase-keys` [문서 도구]
- [ ] 2027-03-22 Firebase Studio 종료(남은 자료 지움) → 위 2026-06-22 줄과 같음 [검색 요약]
- [ ] 2027-04-30 Node 22 지원 끝 → `requires.node`가 22인 도구의 안내 [저장소]

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
- [x] M01~M03 기사님 그림 — 쓰지 않기로 해서 닫음 (D56)
- [ ] A01~A05 그림 요청(기준판·차·빈 터·건물 여섯)과 약관 확인 (`docs/HUMAN.md`, `docs/CONCEPT.md` 9절)

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
2026-10-13 T23 컨셉 확정(D56): 네 안(호출 플랫폼·길 지도·월드맵·퍼스널 쇼퍼)을 세 시선(초심자 이해·플랫폼과 게임 품질·브랜드)으로 심사해 '길 지도'를 뼈대로 정함. 단계는 시운전 → 목적지 → 경유지 → 점검 → 도착. docs/CONCEPT.md, 기사님 그림 항목 닫고 그림 요청 A01~A05, 작업 T24~T34
2026-10-13 T24 용어와 주소: 화면 문구·자료 문장·엔진 문장·문서를 CONCEPT 3절 용어로(설계도, 고른 도구, 막힌 곳 막힘·서행·원활, 읽어 둘 용어, 알아볼 것, AI에게 할 말, 도구 모음, 미리 짠 코스…), 주소 /test-drive·/destination·/waypoints·/check·/arrival·/tools·/terms·/courses·/about/criteria와 옛 주소 10개 301(public/_redirects, src/lib/routes.ts), 쓰지 않는 말 검사(npm run words, check에 포함), 단계 줄 섬(진행 단계, 못 가는 이유), 영수증 '도구 비용 합계'·'(나중)', 설계도 파일 이름 codechauffeur-plan-…md, 충돌 규칙 anchorSlot, 그대로 간 막힌 곳은 서행(노랑). T25 일부: 기사님 그림·택시 장면·색종이(canvas-confetti 뺌)·도장·주행 거리·전광판을 걷어 냄. 그림 문자는 SVG 그림이 오면 바꾼다
2026-10-13 T26 토큰과 바탕: CONCEPT 5.3~5.5·7절 값으로 tokens.css를 다시 씀(낮 지도·밤 지도, 지도·교통·청사진 색, 크기 7단, 모서리·버튼 높이·높이 네 층, 모션 길이 S1~S9용). 대비 검사를 낮·밤 두 모드로(106쌍), qa:shots에 360-dark와 그 axe. 주 버튼 먹색, 금색 위 글자 --on-gold, 영수증 종이 전용 글자색, 단계 밖 화면의 아래 막대는 붙박이를 풂, 개념 그림 20장의 색 변수도 새 이름으로 (D57)
2026-10-13 T27 틀: 머리줄(브랜드 마크·글자 상표, 사전, 설정), 단계 줄(지금 단계 먹색 알약, 마친 단계 ✓, 못 가는 단계는 누르면 여는 방법을 알림, 폭이 모자라면 '경유지 · 3/5' 단추로 접히고 다섯 단계 창이 열림), 아래 막대 위 줄의 상태 한 줄과 미니 길(src/lib/status-line.ts, 시험), 기사 메시지(브랜드 마크 + 두 문장 이하, 닫기), 직접 그린 SVG를 HTML에 바로 넣는 그림 체계(src/lib/glyphs.ts, Glyph), Phosphor Regular. 글자 200%에서는 '사전' 글자를 숨기고 그림 단추로. e2e 43개, qa:shots 낮·밤·동작 줄이기 axe 0
2026-10-13 T24 검토 반영(D58): 막힌 곳 자리는 열린 칸일 때만(key-in-static-page → 배포·공유, shared-without-login → 길 전체), '꼭 고를 것 남음'에서 미룬 칸·그대로 둔 빈 칸 뺌, 빈 칸 막힌 곳에 '도구 고르기'·'나중으로 미루기', 난이도는 말로(영수증 '보통', 도구 '쉬움'), 영수증 개수 '2개', 설계도 2번 '만들 것'(미룬 것 없을 때)·10번 '이 단계에서 볼 용어', '(나중)'이 잘리지 않게, 그림 문자 2칸, 옛 키 cc:trip:v1 지움, 문구 26건. 예시 다시 만듦
2026-10-13 T25 걷어 내기: Fluent 3D 그림 문자 53개(public/emoji, Emoji.astro, fetch-emoji.ts, THIRD_PARTY 줄)를 빼고 직접 그린 SVG로: 앱 종류는 청사진 자리 표시(L00~L06), 누가·AI·분야는 질문 그림(q-*), 기능은 기능 그림(fn-*), 모두 남색 타일에 밝은 선(ArtTile, Glyph tile). 별 난이도(★)를 빼고 '쉬움·보통·어려움' 글로. 옛 키 cc:trip:v1 지움(T24 검토 반영 커밋). 영수증 보관 키 cc:receipts:v1은 지난 영수증 화면과 함께 T32에서. 깨진 그림 0, e2e 43, 예산 통과
2026-10-13 T33 그림 넣기(D59): 렌더 장치 npm run art(three 0.186.1 개발용만, Playwright SwiftShader, 직교 카메라·왼쪽 위 열쇠 빛·ACES·접지 그림자, 2배로 그려 줄임), 참고 PNG만 있을 때의 흰 바탕 지우기, art:sheet 견본, --self-test(절차로 만든 차를 GLB로 내보내 다시 구움: 모서리 투명·가운데 물체 확인 통과), Art.astro(구운 그림 → AVIF·WebP, 없으면 청사진 자리 표시), 품질 바닥선 no-three. 소유자 그림(HUMAN A01~A05)이 오면 굽는다. SVG 검토 반영: 떠돌던 그림 2개 지움, L01 숨은 선 정리, 학교 그림 단순화, 청사진 치수선은 작은 타일에서 숨김
2026-10-13 T30 (진행 중) 목적지 보기: 앱 종류는 2열 140px 청사진 타일(치수선 보임), 그림 보기의 '모르겠어요'는 아래 전체 폭 줄, 네·아니요·아마·모르겠어요는 2×2
2026-10-13 T30 (진행 중) 경유지 도구 목록: 추천은 2px 먹색 테두리 카드(금색 '추천', 무료 한도 한 줄, 추천 이유, 다른 후보 비교), 다른 도구는 가는 선으로 나눈 줄 목록, 고르기는 머리줄 오른쪽(고르면 먹색 '고름 ✓'), 난이도는 칸 셋 막대와 말, 고른 칸 알약은 금색 바탕 대신 옅은 회색
2026-10-13 T30 (진행 중) 점검: 신호등 그림을 교통 정보 알약(막힘 빨강+경고, 서행 노랑+물음표, 원활 초록+✓)과 막힌 곳 자리(칸 이름 또는 '길 전체')로, '고치는 법:' 머리, '이렇게 이해했어요'는 접힘. 시트 안 카드·질문 카드·연습 카드의 그림자를 가는 선으로 (CONCEPT 5.5)
2026-10-13 T30 (진행 중) 도착: '건네드릴 것' 카드(빈 터 청사진 96px, 768px 이상 140px + 설계도 1부 · 영수증 1장 · AI에게 할 말 n장 · 읽어 둘 용어 n개)
2026-10-13 T32 (진행 중) 지난 영수증 /receipts: 받은 영수증을 cc:receipts:v1에 최근 것부터 30장(링크 조각·앱 종류·받은 때만), 넘치면 가장 오래된 장을 빼고 알림, 줄을 누르면 /arrival#r=…, 지우기, 빈 상태(빈 터 청사진 + 목적지 말하기), 설정의 '지난 영수증 보기', 기록 지우기에 포함. 시험(읽기·더하기·30장 넘침·지우기)과 e2e. 미니 지도는 T28 뒤에
2026-10-13 T32 (진행 중) 도구 모음 /tools: 카드 격자 대신 줄 목록(48px 기능 타일 + 이름 + 한 줄 설명, '0원으로 시작'/'유료'와 난이도 막대, 줄 어디를 눌러도 상세로). 360px 길이 19,000px 넘던 것 → 8,416px
2026-10-13 v2 토큰 1단계(D61): 로고 색 토큰(회색·파랑 12단, 남색·파랑·청록, 뜻 색), 금색 없앰, 주 버튼 행동 파랑, 외곽선 버튼·2px 테두리 없앰, 옛 이름은 별명. 대비 118쌍, axe 0, e2e 46
2026-10-13 T28 (1차) 길 지도: 땅 판(npm run map)·표지 묶음 37개·지도 모형(순수, 시험 85개: 32조합×8상태, 골든·코스 전부, 겹침·안전 구역·45/90도·결정성)·MapBoard 섬(gzip 7.2KB)·팔레트 4종 낮·밤, 목적지·경유지·점검·도착에 지도 띠. e2e 46, axe 0. 검토의 고칠 것 13건은 2차에서 (D63)
2026-10-13 v2 W1 단계 이름과 단계 줄(D64): 내 AI 써 보기(선택) → 1 만들 앱 정하기 → 2 도구 고르기 → 3 도구끼리 맞춰 보기 → 4 설계도 받기. ko.ts(STAGE 상수 한 곳, H1은 묻는 말 + 아래 한 줄, 다음 버튼, <title> '(2/4)', 단계별 기사 카드 없앰)·templates·rules·questions('어떤 앱을 만들까요?')·RECEIPT.md. 상태 한 줄 '{이름} · {남은 것} · 약 {m}분'(15초·30초 추정, 시험 12개), 미니 길 없앰. StageRail: 40rem 미만 '2/4 · 이름' + 4칸 막대 + 단계 시트(<dialog>), 이상은 연습 링크 | 원 넷. 쓰지 않는 말 8개 더함. e2e 51(단계 줄 5개 새로), axe 0. CONCEPT 0·2·3·4·5.8, UX, PRD, OBSERVATION 시작 질문 4개
2026-10-13 v2 W2a 벡터 로고(D65): assets-src/logo/logo.svg·badge.svg·mono.svg를 원본 좌표에서 다시 그림(왼쪽 반 + 뒤집기, 괄호 #0082FA 하나, 'ㅍ' 곧게·수평으로). logo-diff.ts 겹침 투명 0.997·남색 0.987·파랑 0.975·청록 0.976·흰색 0.982(기준 0.97), 견본 .qa/logo-sheet.png. src/lib/logo-paths.ts(다섯 벌 + emblem·monoMark, gzip 그림 1.7KB·글자 0.65KB). npm run logo가 favicon.ico·icon.svg·apple-touch-icon·icon-192/512·maskable·manifest를 굽는다. 화면 연결은 W2b
2026-10-13 v2 W6a 어려운 말 풀이 자료·매처(D66): data/glossary.json v2 손으로 쓴 212개(key 34·money 19·data 48·code 85·ai 6·law 11·site 9, 풀이 평균 33자, gzip 14.6KB) + 새 필드 kind·say·see·tool·error·noMark·risk, schemas/glossary.schema.json을 npm run validate에 이음. 매처 v2: NFKC·어절 첫머리·조사 꼬리·문맥 48자·감싸는 가장 긴 용어 + 칩 2개, looksLikeError·missAction·findTerms. 코드쇼퍼 말 8개는 새 단계 이름에 맞춤. 시험 58개(5.2절 표, 거짓 양성 10개, '키를' → API 키, 자료 약속, 0.03ms)
2026-10-13 v2 W2b 브랜드 연결(D65): 다섯 벌 모두 벡터(Logo.astro·Logo.tsx·src/lib/logo.ts, 경로는 logo-paths.ts를 벌마다 풀어 써 섬은 쓰는 벌만 묶임). tokens --brand-white·--logo-* 다섯(밤 #4A6699·#EEF0F4·#3496F8·#8FE3FF), --seal = 남색, 종이 막힘 표시 --receipt-bad. 머리줄 가로 묶음 142×44 + 숨은 '코드쇼퍼', 사전 알약 36/누르는 곳 44, theme-color #FFFFFF·#0F1724, favicon.ico·icon.svg·manifest 링크. 기사 메시지 머리 모자 배지 원 32, 영수증 머리 단색 마크 24·남색 도장(마크 20), 요금 칩 남색 알약 32 + 청록 점, 바닥글 글자 상표 16. 옛 WebP·PNG·BrandMark·Wordmark·brand.ts 지움(216KB). 페이지 그림 20.1KB → 3.0KB, 홈 JS 96.2KB 그대로. CONCEPT 금색·V01 쿠페 요청문, D60 #F6F8FA, HUMAN A06·A07 확인만
2026-10-13 v2 phase A 검토 반영(D64·D65·D66 덧붙임): 접힌 막대 마침 남색·지금 파랑, 단계 시트의 못 가는 줄은 이유를 적은 누를 수 없는 줄·지금 줄은 시트만 닫음·뒤 막 누르면 닫힘·원과 줄 높이 rem(글자 200%), StageRail·StatusLine client:load + 다시 온 손님은 붙을 때까지 진행 표시 감춤, 단계 H1 22·한 줄 17(문장마다 묶음 Lead.tsx), 도장 fit-content·−6° 누르기, 기사 메시지 --fill 면 두 줄. 문구: 그대로 가요·받은 설계도를·홈 '2/4 · 도구 고르기'·고치는 법·로그인 질문, 풀이 11개(위험 5개 risk). e2e 51, axe 0, 예산 통과
2026-10-13 v2 W3a 부품·토큰·틀(D67): tokens --tile·--plate·--map-flag·--route-halo·--dur-blink·--ease-drive, --dur-scene 3000, 옛 별명 지움(개념 그림 SVG용 열둘만 남김), 화면 코드 옛 이름 256곳 옮김. 부품: 버튼 다섯·세 크기, 줄 목록, 칩 한 줄, 꼬리표, 상태 알약, 칸 고르개, 모달 시트·확인 대화 상자(320/200, 동작 줄이기 150ms), 아래 막대 104, 알림·붙여 넣을 말·토스트·접기·입력·빈 상태·스위치, 글자 단계(h1 26·h2 19/600·본문 16/24·balance), 초점 2px. 시험판 띠 걷고 바닥글 한 줄, 설정은 모달 시트(스위치 다섯 + quiet·glossary·marks 저장). 품질 바닥선 no-gold·old-token·brand-color-text·heavy-border(시험 18개), qa:shots 주 버튼 수(둘러보는 곳 7곳 1개 넘으면 실패). e2e 53, axe 0
2026-10-13 v2 지도 2차 그림(D68): 땅 판 고리 길 걷음(격자 길은 빈 땅 가장자리에서 저마다 다르게 둥근 끝, 위 모서리는 한 줄만 따라 들어옴, 옅은 오솔길 둘, 이음매에 큰길·45° 큰길 없음 + 검사), gzip 2.85KB. 표지 묶음 v2 이름만(옛 별명 0), 사고 표시 18px용(차단봉·끊긴 길·지구본), 물음표 --warn, 빗금 고리 mk-hatch-ring(--text-3), 차 36×18 쿠페(mk-car-top + mk-car-lights + mk-car-shadow), 청사진 선 2, 박공지붕 집, 맨땅 빈 터(--map-lot 제안), 깃발 말뚝 밑동, 굴 둔덕 가로·세로 + mk-tunnel-sign, gzip 3.1KB. 견본 .qa/map-sprite-sheet.html·.qa/land-shot.ts. MAP.md 2·3절
2026-10-13 v2 W3b 둘러보는 곳(D67 덧붙임): 도구 모음 칩 한 줄 + [분야 ⌄] 모달 시트·줄 72·원문만 있는 도구 접기(360px 8,416 → 4,896px), 도구 상세 타일 64 + 이름 26 + 꼬리표 둘·한눈에 보기 키-값·붙여 넣을 말 상자·공식 문서 줄·아래 막대 한 줄 + [만들 앱 정하기]. 용어 카드 개념 그림 20장을 옅은 판 색으로(별명 열둘 지움), 20장 중 n장 읽음·읽어 둘 용어 줄·2열/4열 타일, 상세 확인 문제 중립 56 + 정답/오답 글·[다 읽었어요] 아래 막대(ConceptRead). 지난 영수증 줄 72 미니 지도(MapSvg mini)·'받은 날 · 영수증 0427'(receipt-no.ts)·지우기 확인 대화 상자·빈 상태. 사전 modal dict-sheet(90%·640·옆 창 400)·줄 목록 묶음·유일한 에러 카드·예 칩, 낱말 검색은 에러 줄을 뒤로. CSS를 tools·terms·receipts·try-it로 나눔(첫 화면 CSS 최대 28.9KB), parts.css 옛 조각 지움. e2e 53, qa:shots 6곳 통과, 상태별 axe 28장면 0
2026-10-13 v2 지도 2차 모형(D68 덧붙임): 이름표가 길(바깥 선 반쪽 4 + 2)을 비킴, 차 자리를 모형이 계산(routeD 거리 → 점·방향, 마디 앞 38·좁으면 뒤, 출발 44, 도착은 빈 터 앞 4, 돌린 36×18로 4 띄움, 고를수록 뒤로 안 감, car.box), '길 전체' 표지는 출발 고리 오른쪽 위(+12, −12), 요약 글은 상태 한 줄과 같은 progress() 수와 말(처음엔 '목적지를 아직 정하지 않았어요.'만), focus 고리·굴 sign·countAt·빈 터 bare/outline/drawn을 냄. 배치 다시 고름(왼쪽 세로 비움, 가운데 세로 가지는 왼쪽, 깃발 말뚝·집 깃발 옆), 굴 → 차 → 이름표 → 표지 차례. 시험 93개(이름표 ↔ 길, 차 ↔ 마디·굴, routeD 따로 걷기, 마디 1~6개 차 자리, six·case-04·case-09), 모형 gzip 6.4KB(목표 6.5KB 이하로 바꾸자고 넘김)
2026-10-13 v2 지도 2차 통합(D68 덧붙임): MapBoard가 모형 값만 그림(차 mk-car-top·전조등 + 돌지 않는 부모의 필터 그림자, 굴 mk-tunnel/-v + 똑바른 표지, 빗금 고리 44, 개수 반지름 10·글자 15, 빈 터 bare/outline/drawn, 빈 터 그림자 뺌). 내 길 8/4 + 밤 빛 한 줄(교통 정보엔 없음), 회색조로도 나뉘는 교통 길(원활 실선·막힘 대시 3 3·서행 점 0 5) + 토큰 여섯(--map-lot, --route-smooth/slow/jam, --route-traffic-core, --route-slow-core). 지금 여는 곳 고리(Shop → src/lib/map/focus.ts → MapBoard, 만들 앱을 정한 뒤만), 도착 그림은 r.canIssue일 때만, 붙기 전엔 땅 판만 두고 --dur-fade로 비침. 지도 CSS는 MapBoard가 불러와 지도 페이지에만(다른 페이지 CSS 27.3 → 26.4KB), 표지 묶음은 지도 단계에만, 키 700 밑 화면은 띠 160, 1944px 넘는 화면은 넓은 땅색. npm run tokens가 [data-palette] 낮·밤을 읽음(3벌 60쌍), qa:budget에 지도 예산(땅 2.8/24 · 표지 3.1/10 · 섬 2.1/8 · 모형 6.3/6.5 · 묶음 7.7/14.5KB), ARCHITECTURE 11절. check(800 시험)·build·e2e 53·qa:shots·.qa/map-states.ts(골든 01·02·04·08·09·20·21 + 여섯 마디, 360 낮·밤·1280·360×640·2200·회색조·스크립트 꺼짐) 통과.
2026-10-13 v2 W6b 어려운 말 풀이 2판 동작(D69): 들어오는 길 다섯(마우스 0ms·손가락 400ms·키보드 500ms·점선 밑줄 말·사전), visualViewport 자리(아래 8·손가락 아래 40/위에 붙임·꼬리 12×6), 모달 <dialog> 안으로 옮겨 그려 맨 위 + Esc는 풀이만, 스크롤에 안 닫히고 따라감, 2겹 겹 풀이·칩·버튼 둘, 모르는 말 규칙(한글만 → 없음), 빌드 때 밑줄(TermText.astro: 도구·용어 카드, 페이지 8·칸 2·처음 한 번) + 섬 밑줄 훅(useTermMarks, W4가 씀), termsSeen 300·설정 두 줄·처음 한 번 기사 메시지, /glossary.json(13.4KB)·/glossary-tools.json(3.0KB)·사전 색인 term 종류, /about·개인정보 한 줄. 섬 4.3KB·자료+매처 16.4KB gz. check·build·qa:budget·e2e 61(풀이 10) 통과, qa:shots axe 0(작은 누르는 곳으로 잡힌 것은 문장 속 밑줄 말: WCAG 2.5.8 예외, shots.ts 예외 줄 제안)
2026-10-13 v2 2단계 검토 반영(D67·D68·D69 덧붙임): 모달 안 알림 자리(announce가 초점 든 모달의 [data-live]로, 사전 시트에 처음부터), 처음 한 번 풀이 안내를 본문 흐름 안의 role=status 칸으로(떠서 초점을 가리던 것), 기사 메시지 접으면 다음 누를 것으로 초점, qa:shots에서 .term-mark 예외(2.5.8 Inline), 밑줄 말은 빌드 때 span → 스크립트가 버튼으로(JS 꺼짐에 죽은 버튼 없음), 밑줄 풀이는 초점이 떠나면 닫힘·source 모르는 브라우저는 제목으로 초점, 그림 aria-hidden + figcaption 밑줄 뺌, ConceptRead client:visible, qa:budget에 풀이 섬 5·자료+매처 17·도구 이름 4·검색 색인 100KB와 ARCHITECTURE 맞춤, 사전 제목 단계 prop, 칩 줄 이름 '분야와 기능', 용어 타일 '아직' → 숨은 글, 글자 200%에 하는 일 두 줄, 검색 칸 보이는 라벨·짧은 자리 표시·직접 둔 지우기 단추, 시트 다시 열면 검색 칸 초점, 설정 기기 동작 줄이기면 켜짐+잠김+둘째 줄. 차 앞 유리 판(찡그린 얼굴 없앰)·밤 테두리 --map-car-edge, 집 지붕 --map-roof·각진 용마루, 원활 길 한 줄 실선(--route-smooth-core), 자료 세모 모서리 6, 지도 섬 client:load. 개념 그림 셋의 사람 모양 지움(그림 설명 둘 맞춤), api-key 문틀 윤곽만, 도구 상세 '확인 중' 정보 알림 + '공식 문서를 보고 적었어요', 바닥글 링크 왼쪽 맞춤, H1 아래 한 줄 balance, 풀이 EDGE 20, 칩 줄 끝 흐림(768+), '0원' 낮춤. check(825 시험)·build·qa:budget·e2e 66·qa:shots 11곳 통과
2026-10-13 v2 W4a 홈·내 AI 써 보기(D70): 홈은 지도 띠 240(정적 MapSvg 본보기 코스, 차는 출발 — 지도 모형 parked) + 16 겹친 내용 시트(남색 요금 칩·display H1·소개·풀이·주 버튼 하나·묶음 목록 72 둘·믿음/시험판 줄·'이렇게 가요' 네 줄·미리 짠 코스 줄 72 셋 + 미리 보기 모달 시트 [이 코스로 출발]), 다시 온 손님 [이어서 가기] + '2/4 · 도구 고르기'·'새로 만들 앱 정하기'(확인 후 비움), 1024px+ 전체 지도 + 왼쪽 440 패널(로고 A 160). continueTarget 고침(꼭 고를 것이 남으면 도구 고르기). 홈 첫 화면 JS 98.3 → 39.2KB(엔진·자료를 continue.ts·course.ts로 늦게 불러옴, HomeContinue·RecipeStart 섬 걷음). 내 AI 써 보기는 시트 안 H1 + 한 줄 + 글 버튼 건너뛰기, 세로 번호 단계 셋(.num-dot + 2px 선, 붙여 넣을 말 상자, 접기), 끝 한 줄, 아래 막대 [다 했어요] → [만들 앱 정하러 가기]. 옛 연습·카드·도장 CSS 걷음, dialog 흐름 간격 고침. 지도 띠 160·S8은 W5. check(831 시험)·build·qa:budget·e2e 73(홈·연습 7 새로)·qa:shots / /test-drive(주 버튼 1, axe 0) 통과
2026-10-13 v2 W4b 만들 앱 정하기(D70): 지도 띠 176 + 16 겹친 시트, H1 = 질문(22/700), 단계 한 줄은 첫 질문 위에만, 앱 종류·느낌 타일 156×132(72 옅은 판 그림, 고름 = 안쪽 2px --chosen 고리 + ✓ 20) + '아직 못 정했어요' 전체 폭 줄 56, 네·아니요 2×2 중립 버튼 56(고름 = --chosen), 그 밖 목록 줄 56, 느낌 = 내 지도 미니를 네 팔레트로 칠한 견본(paletteOf), 아래 막대 [이전] 56 + 상태 한 줄 → 다 정하면 [도구 고르러 가기] 하나(interview-nav atom, 상태 한 줄이 보는 질문을 따름), 시트 첫 줄 '고를 것 n개' 칩(지도 왼쪽 위는 휴대폰에서 첫 마디를 가려 옮김), 낭독 '지도에 저장이 생겼어요.', 맨 아래 접기 '지금까지 정한 것'(답 줄 → 그 질문, 고를 것 글, 혹시 이 코스) + 글 버튼 '도구 먼저 둘러볼게요', 풀이 글 점선 밑줄. 옛 카드·n번째 질문 글·140 남색 타일·점선 줄·[다 정했어요]·옅은 파랑 접기 CSS 걷음(destination.css로 이 페이지만), qa:budget이 export…from 섬 입구를 따라가게 고침. check(836 시험)·build·qa:budget·e2e 78(만들 앱 정하기 5 새로)·qa:shots /destination(주 버튼 1 이하, axe 0) 통과
2026-10-13 v2 W4c 도구 고르기(D70): 지도 띠 200(지금 여는 마디 --you 고리) + 16 겹친 시트(지도 띠 위 시트 규칙을 parts.css .content-sheet.on-map으로 옮겨 만들 앱 정하기와 함께 씀), H1 '어떤 도구로 만들까요?' + 한 줄, 기능 칩 한 줄(가로로 밀기, 앞에 지도 마디 모양 16, 고름 = 남색 + 이름 뒤 ✓, 지금 여는 칩 = 파랑 밑 막대), 칸 제목 '○○을 맡을 도구' 19/600 + 꼬리표 + 설명(점선 밑줄), 도구 줄 72 = aria-pressed 버튼(타일 40 + 이름 + '추천' + 오른쪽 비용 0원/유료, 둘째 줄 '0원으로 시작 · 보통', 추천 줄만 '추천 이유'), 눌린 줄 아래에만 따로 된 글 버튼 '자세히 ⌄' → 한눈에 보기, 접기 '원문만 있는 도구 n개', 도구가 없으면 알림 상자. 새 고르는 방식(pick-nav.ts 화면 상태, 엔진 그대로): 꼭 고를 것은 추천 줄을 '고를 예정'으로 미리 누름(저장 안 함), 다른 줄을 누르면 옮김, 아래 막대 [{도구}로 정하기]/[{도구}로 바꾸기](괄호 뺀 이름, 빈칸 뺀 14자 넘으면 '고른 도구로' + aria-label)가 저장하고 다음 남은 꼭 고를 것으로, 다 고르면 [도구끼리 맞춰 보러 가기], 있으면 좋은 것은 미리 누르지 않고 꺼짐 + [이번엔 건너뛰기](정했으면 [도구 빼기]), 바꿀 때 다른 칸을 혼자 맡는 도구는 남김, 잠기면 빈 상태(빈 터 96) + 주 버튼 하나. 옛 추천 카드·줄마다 [고르기]·72px 칩 상자·48 타일 제목·난이도 막대·색 꼬리표 줄·점선 상자·잠김 카드 CSS 걷음(waypoints.css로 이 페이지만), 고른 칩 올림 색 고침. check(865 시험, pick-nav 29 새로)·build·qa:budget(도구 고르기 JS 122.5KB, 가장 큰 CSS 28.1KB)·e2e 86(도구 고르기 8 새로: 추천대로 꼭 고를 것 3개에 정확히 3번, 있으면 좋은 것 미리 안 누름, 잠김 주 버튼 하나, 키보드만으로 Enter 3번 → 맞춰 보러 가기)·qa:shots /waypoints(주 버튼 1, axe 0) 통과
2026-10-13 v2 W4d 도구끼리 맞춰 보기·설계도 받기(D70): 두 화면 지도 띠(200·260) + 16 겹친 시트 + 주 버튼 하나(섬 맨 바깥을 버튼으로 해 194px로 줄던 것 고침). 맞춰 보기: 사건 메시지 '막힌 곳이 없어요. 출발할까요?', 막힌 곳 n개(알약 + 기능 이름, 설명, 고치는 법, 같은 크기 중립 버튼 둘 [도구 바꾸기]/[그대로 가기] — 미룰 수 있는 빈 기능은 [나중으로 미루기], 비워 둘 수 없으면 통행 불가 + [도구 고르기]), 그대로 가는 곳 줄 56 + [다시 고르기], 한 번에 가기엔 길이 멀어요 줄 + [나중으로]·더 쉬운 길, 나중에 붙일 것, 지름길 알림 상자, 접기 '원활 n개'·'이렇게 이해했어요'(키-값), 꺼진 까닭은 상태 한 줄(aria-describedby), 사라지는 버튼 뒤 초점 옮김. 설계도 받기: 사건 메시지(도착) → H1 → 건네드릴 것 카드(72, 768px+ 240 + 목록) → 칸 고르개 4칸(.seg, 화살표 키) → 맺음 한 줄, 영수증 종이 36칸 + 번호 4자리, 링크로 열면 꼬리표 + 중립 [이 영수증으로 이어서 가기], 잠김·깨진 링크는 빈 상태 + 상태 한 줄과 같은 주 버튼(arrival-view.ts로 섬 셋이 같은 값). 옛 CSS 약 10KB 지움. 시험: 단위 5개, e2e 13개
2026-10-13 v2 W4 검토 반영(D70): 아래 막대 초점에 preventScroll(정할 때마다 페이지가 355px 굴러 지도가 밀리던 것), 맞춰 보기 다 풀리면 맨 위로, 차는 막힌 마디 앞에서 기다림(모형 시험 1), 설계도 받기 도착 알림을 장면 끝·동작 줄이기면 바로, 출력 한 번만(data-printed), 이어서 가기 뒤 초점 H1, 영수증 링크면 지도도 그 영수증, 칸 고르개 aria-orientation, 도구 고르기 긴 이름 읽는 이름 '고른 도구로 정하기: …'·'도구 빼기: …', '고를 예정' 숨은 글·✓는 정한 줄만, 정한 뒤 알림에 다음 추천·'n개만 더 고르면 돼요'·'바꿨어요', 꺼진 주 버튼 Enter면 까닭 + 첫 줄로, 단계 줄 알림은 바로 다음 단계만(겹침 없앰), 복사 버튼 2초 뒤 돌아감, #mb-shade 한 번만, 꺼진 버튼 글 3:1, josa ng·le·이에요/예요, 문구(되돌리기·나중으로 미루기·처음 화면으로 가기·막힌 곳마다…·면책 해요체), 홈 1024+ 머리줄 로고·바닥글 시험판 줄 감춤, 연습 시트 납작하게. check·build·budget·e2e 103 통과, qa:shots axe 0, 시드 상태 axe는 막대에 반쯤 가린 줄의 target-size 1건(W4c부터 남은 것) 말고 0.
2026-10-13 v2 W5a 지도 장면(D71): 장면 틀(src/lib/scene.ts: 장면 동안만 지도 띠 오른쪽 위 [건너뛰기] 44, 누르기·Esc는 기본 틀), S1 홈 첫 방문 CSS 키프레임 1.5초(data-intro play/still, 지도 1.04 → 1·본보기 길 가림막 그리기·차가 왼쪽 가장자리에서 출발로 offset-path·출발 고리 퍼짐, 본 기록 home), S2 지도가 자라요(앞·새 모형 견주기 src/lib/map/scene.ts: 새 마디 톡·길 이어 그리기·옮긴 마디·이름표 미끄러짐·청사진 비침·@property 느낌 색), S3 정하면 이어져요(줄 그림이 휜 호로 마디로 날아감 → 남색 채움·점선 → 실선·차 이동, 상태 한 줄 숫자 굴리기), S4 교통 정보(교통 색 덮기 → 막힌 길 두 번 진해짐 1초에 2번 --dur-pulse 1000, 그대로 가기 노랑 + 물음표, 풀림 빨강 → 초록, 다 풀림 청록 대시 훑기 → 주 버튼 켜짐, 고치고 돌아오면 meta.checkJams로 뚫림), S8 내 AI 써 보기 지도 띠 176 + 연습 고리(practice.ts·PracticeRing.tsx, 차가 한 바퀴 → 심 채움), 굽는 곳 차는 호 끝으로(rest.ts), 차 이동은 애니메이션 안의 offset-path만, 조용히 모시기(data-quiet·효과음·사건 메시지), 새 토큰 --dur-route·--dur-approach·--dur-pulse·--dur-loop·--ease-linear. 모형 6.4KB 그대로, 지도 섬 + 장면 5.7KB/8, 홈 JS 41.0KB, 단계 최대 132.6KB. check(885 시험, 장면 시간 상한·서 있는 차 새로)·build·qa:budget·e2e 132(장면 29 새로: 장면마다 누르기·Esc·[건너뛰기], 동작 줄이기 기기·사이트, 본 기록, 조용히 모시기)·qa:shots 6 라우트(axe 0, 주 버튼 1) 통과, 프레임 띠 .qa/w5/
2026-10-13 v2 W5b 출발 → 도착·단계 이동·용어 카드·조용히 모시기·효과음(D71): S5+S6 3000(arrival-plan.ts 시간표, 지도는 장면 때만 부르는 map/arrive.ts: 밤 주행 색 넘김·1.2배 기울여 따라가기·마디마다 뛰기와 ✓·전조등 두 번 깜빡임 + 빛·윤곽 실선·두루마리·깃발·시트, 영수증 섬은 같은 장면 시계로 --print-at, 출력 clip-path steps(14)·도장 ease-in, [건너뛰기]는 지도 띠 하나로), 첫 그림 전 html[data-depart](맞춰 보기에서 처음 출발할 때만, still = 동작 줄이기·조용히 모시기), S7 문서 간 전환(map·rail·topbar 제자리, 켜기를 머리 인라인 style로: 바깥 CSS면 크롬이 건너뛰던 것) + 새로 마친 단계 ✓ 톡·막대 채움(본 기록 done:단계), S9 용어 판 읽음 칠·왼쪽부터 채움·'20장 중 n장' 굴리기·'다 맞혔어요 ✓' 고리 빛, 효과음 다섯(삼각파 C장조 0.12), 시간 상한 시험(S5 ≤ 3000, 마디 한 번 ≤ 400·합 ≤ 1200, 번쩍임 2번), e2e scenes-arrival.spec.ts 17개, 프레임 띠 .qa/w5/s5·s6·s7·s9
2026-10-13 v2 W5 검토 반영(D71): [건너뛰기]는 남은 1초 넘는 장면만(--dur-skip-min, 초점은 H1), 누르기 건너뛰기는 click 잡기 단계로, S5 차는 도구끼리 맞춰 보기의 자리에서 떠나 되돌아보기(카메라) → 마지막 접근(--ease-drive 하나) · 장면 동안 띠 아래 자르기 풂(data-driving, 가로는 clip) · 시트 inert · 밤/낮 두 애니메이션 · 애니메이션 시작 시각을 장면 0에 박음 · 모듈 받기 전 건너뛰면 돌지 않음, S6 출력은 종이가 보일 때(data-print=wait, IO, 미루면 cc:print-later로 장면 2300에 끝), S7 문서 간 전환 끔, S3 '전' 마디 통째 사본·날기 그림자, S4 숨쉬기 고르게(토막 곡선) + 마디·표지, S1 차 --ease-out, S8 화면 밖이면 굴리지 않음, 조용히 모시기 낭독은 상태 한 줄, 어두운 밤 한 단 더 어둡게. check 893·e2e 150·qa:budget(설계도 받기 135.4/140)·qa:shots 9라우트 통과, 프레임 띠 .qa/w5/s5d-*·s6d-scroll-*·s3-*·s4-*·end5-sheet.
2026-10-13 v2 정리: 소유자 로고 기반 컨셉(D60~D71) 적용 끝. 단계 이름 '내 AI 써 보기 · 만들 앱 정하기 · 도구 고르기 · 도구끼리 맞춰 보기 · 설계도 받기', 벡터 로고, 색 문법, 공용 부품, 모든 화면, 지도 2차, 장면 S1~S9, 어려운 말 풀이 2판(212개). 단위 시험 893, e2e 150, axe 0, 예산 통과. 남은 것: T34 마지막 점검(reader-tester 검토, PRD·DESIGN 정리), 사람 확인(HUMAN.md)
2026-10-14 T35 (1/3) 문서·말·검색 동의어·라이선스 문장: D73~D84 옮김 + D85(세부), PRD R-18a·R-33·R-35~R-37·R-60·R-75 주석, CONCEPT 3.9·3.10절('모름' 계열 셋·때 이름 다섯·공개하기·결제 카드·화면 밝기), HUMAN H13~H23(H14 맨 위·H10 합침·H12 한 줄), 이 파일 T35~T42와 날짜 줄. npm run words에 쓰지 않는 말 열넷(낱말표는 message만, aliases·keywords 칸은 안 봄), data/aliases.json searchSynonyms + 스키마 + 검사 + 색인 때 펼침('테마'·'다크모드'·'폰트'·'가이드'가 결과를 냄, 시험), 소개 '틀린 곳을 알려 주세요' + [의견 보내기](PUBLIC_CONTACT_EMAIL, src/lib/feedback.ts), 바닥글 '© 2026 코드쇼퍼' 한 줄·홈 시험판 줄 뺌(L-40), 이용 안내 라이선스 사이트 문단, README·LICENSE 옛 허락 문장·CLAUDE.md 숫자(도구 49·골든 23), ARCHITECTURE 1·3·4·7·9·12절(L-30). check·build·qa:budget·e2e 153 통과
2026-10-14 T35 (2/3) 주소 바탕·호스트 종류·정식 빌드 지킴·옛 주소 지우기(D86): PUBLIC_BASE_PATH(astro base)·PUBLIC_HOST(cloudflare|static), routes.ts withBase·siteRoot·absoluteUrl·stripBase와 PATHS·ROUTES·FILES(모든 주소가 바탕을 거침), 기본 틀 아이콘·설명서 4곳·검색 색인·풀이 자료·EVENT_URL·사전 시트·canonical·영수증 링크(siteRoot + PATHS.arrival)·설계도 용어 주소, manifest 끝점(정적 파일·make-logo 쓰기 지움), robots 바탕, 정적 호스트는 집계·방문 통계·CSP 줄을 끄고 처리방침 셋을 '이 주소에서는 세지 않아요'로. 정식 빌드 지킴(scripts/lib/build-guard.ts, astro 통합: 빈·예시 사이트 주소·빈 연락처·dist의 예시 주소·(초안)·검토 중인 초안 → 한국어 한 줄로 실패, 바탕·호스트 꼴은 늘). 품질 바닥선 base-path 규칙. 시험: routes·stage·build-guard·base-scan 단위, npm run qa:base(.qa/dist-base 빌드 + href·src 검사), npm run e2e:base(base-path.spec.ts, 서버 --base·--dist, CI main·PR). public/_redirects 옛 주소 10줄·REDIRECTS 시험 지움. ARCHITECTURE 1·2·3·3.1·5·9·12절, DEPLOY 빌드 변수 표·6·7단계, CONCEPT 2.2, RECEIPT, RISKS, BACKLOG. check(단위 939)·build·qa:budget·e2e 153(한 번은 S5 장면 Tab 시험이 부하로 흔들려 다시 돌려 통과)·qa:base·e2e:base 2 통과. 정식 빌드에 사이트 주소가 없으면 한 줄로 실패함을 확인
2026-10-14 T35 (3/3) 단계 화면 JS 덜기(L-08, D82): 자료 두 판 — src/lib/data.ts(섬: 용어 카드 엔진 칸만·에러 안내 없음·상품 출처 칸 없음, 없는 칸을 읽으면 멈춤)와 src/lib/data-full.ts(사전·용어 화면·색인 끝점), 나누기는 Vite 플러그인 scripts/lib/data-parts-plugin.ts(가상 모듈 셋, 규칙 src/lib/data-parts.ts, 새 의존성 없음). 4단계 칸 셋은 ReceiptTabs.tsx로 떼어 처음 열 때 import()(칸 이름 초점·포인터에 미리, 받는 동안 aria-busy·한 줄), 내려받기는 src/lib/pack-file.ts를 버튼 뒤 미리 받음, conversationCards는 엔진 cards.ts로(동작 같음). qa:budget 단계 화면 130KB + 지연 묶음 줄 셋(첫 묶음에 끼면 실패). /arrival 136.0→115.0 · /check 133.8→114.7 · /waypoints 131.0→111.9 · /destination 130.0→110.8 · /test-drive 106.7→87.6 · 홈 41.7. 시험: data-parts 단위(골든 23개에서 두 판 결과·영수증·설계도·카드 같음), e2e '칸을 열기 전에는 받지 않는다'. check(단위 969, 엔진 줄 99.7%)·build·qa:budget·e2e 154·e2e:base 2 통과 (전체 e2e 한 번은 S2 장면 시험이 부하로 흔들려 실패, 그 spec 단독 3번·전체 다시 돌려 통과)
2026-10-14 T35 확인: check(969)·build·qa:budget(단계 화면 /arrival 115.0·/check 114.7·/waypoints 111.9·/destination 110.8KB, 홈 41.7KB)·e2e 154/154·e2e:base(바탕 검사 85쪽 + base-path 2/2)·정식 빌드 지킴(사이트 주소 없으면 한 줄로 멈춤)·qa:shots 5화면·키보드만으로 걷기(홈·소개·이용 안내·설계도 받기 칸 넷과 내려받기·사전 시트) 통과. 'grep 공개 저장소|누구나 고칠 src dist' 0줄을 글자 그대로 지키도록 자료의 GitHub 용어를 '공개한 저장소'·'비공개로 둔 저장소'로 바꾸고 쓰지 않는 말 규칙을 모든 문장으로 넓힘(D85 고침, 예시 다시 만듦). 골든 바뀜 없음.
2026-10-14 T35 검토 반영(a11y-perf-auditor·ko-copy-editor): 실패한 import()는 브라우저가 기억해 다시 받지 못하므로 — 설계도 묶음(pack-file + pack.ts)을 /arrival 아래 막대 섬 첫 묶음으로 되돌려 주 버튼 내려받기가 망과 상관없이 같은 누름 안에서 끝나게 하고(downloadFailed 지움, 예산 줄은 '/arrival 말고 다른 단계 화면 첫 묶음에 끼면 실패'), 4단계 칸 셋(ReceiptTabs)은 영수증을 그린 뒤 쉬는 시간에 미리 받고 못 받으면 열린 칸에 한 줄 + [새로 고치기](알림 같은 말, 영수증 링크면 #r=를 되돌려 놓고 새로 고침). 정적 호스트의 소개 끝 줄(ko.about.stored/storedStatic, qa:base·base-path.spec이 봄), 소개 의견 메일 본문 = 빈칸 줄 '틀린 곳(도구나 용어 이름): '와 본문 문장, 처리방침 '방문 수도 보지 않아요', 사전 Firebase 풀이, CONCEPT 3.9절(막는 범위·검사 대상)·3.10절('배포' 적용 범위)·copy.md·TASKS T35 확인 줄·T39 주의, D82·D85 보탬. check(969)·build·qa:budget(/arrival 117.1·/check 114.7·/waypoints 111.9·/destination 110.8KB, 홈 41.8KB)·e2e 156/156(실패 길 시험 둘 더함)·e2e:base(85쪽 + 2)·정식 빌드 한 줄 실패·grep 0줄 통과. 골든 바뀐 것 없음
2026-10-14 v3 T35 v3 기반: 문서 옮기기·주소 바탕·호스트 종류·첫 화면 덜기: 문서 옮기기(D73~D86, PRD·CONCEPT 3.10·HUMAN H13~H23·TASKS T35~T42)·쓰지 않는 말 14개·검색 동의어 aliases.json·소개 의견 메일·저작권 줄·README·LICENSE, 주소 바탕(PUBLIC_BASE_PATH·withBase)·호스트 종류(PUBLIC_HOST=static이면 집계 없음)·정식 빌드 지킴·옛 주소 지움·바탕 경로 지킴 규칙, 단계 화면 JS 덜기(자료 두 판·4단계 칸 지연). check 단위 969·골든 23/23·e2e 156/156·e2e:base 85쪽+2·qa:budget /arrival 117.1·/check 114.7·/waypoints 111.9·/destination 110.8KB(모두 130 이하), 홈 41.8KB. 골든 바뀜 없음
2026-10-14 T36 (1/3) 직접 쓰기 자료(D87): questions.json 20문항 모두 직접 쓰기 보기(isCustom·like·field·hint·keep), q.type '아직 안 정했어요', q.notify가 type.custom에도 묻기, q.ai '웹에서 만드는 도구'(ai.builder)와 둘째 줄(sub), '쓰는 AI' 고르지 않아도 되는 질문 셋 q.aitool-chat·builder·agent(optional, 에이전트 세 무리 groups, 보기마다 aiTool { tool, surface }, Claude 앱 Code 탭 paidOnly·ChatGPT 앱 Codex needsReview), 엔진 runInterview optional(다른 질문을 다 마치면 빠짐)·productField custom, taxonomy type.custom·ai.builder·aitool.* 15, scoring ai.builder 1·unknownDifficulty 2, goodFor ai.chat-paid 9개에 ai.builder, templates type.custom·ai.builder·customAnswer·customTool·pack.mine·emptySlot.researchWithNote·receipt.unknown·totalUnchecked, rules safety.custom-tool·personal-server 문장, 조사 카드 research.custom-tool·gap 넷, aliases.json 직접 쓰기 낱말 약 770개(options·yesNo·aiNames·toolHints·gaps) + 스키마 + 충돌 검사(validate), ko.ts input.md 9.6절 문구, Interview는 T37 전까지 직접 쓰기 보기를 그리지 않음, 영수증 글꼴 다시 만듦. check(991)·golden 23 그대로·examples 그대로·build·qa:budget(단계 화면 +4.3KB, /arrival 121.4KB)·e2e 156/156 통과
2026-10-14 T36 (2/3) 직접 쓰기 엔진(D88): 낱말 찾기 src/lib/engine/match.ts(findAliases·matchAnswer·matchTool·gapsIn·looksLikeContact·qwertyToHangul·readMoney, index.ts에서 내보내지 않음), custom.ts(customProduct '모름' 도구·productOf·정리 함수), 세션 notes·customTools·gaps와 normalizeSession·readSession 한도, productField 값 없음(서버 위치만 unknown), rankSlot custom 줄, findConflicts 서행 conflict.custom-tool:*(늘 kept), collectResearch research.custom:*·research.gap-*·내 말로 쓴 빈 데이터 칸, receiptModel 모름·'0원 + 확인 필요', renderPack 1번 '내 말 그대로'·7번 '(직접 씀)', projectName·지도 이름표(내 말 12자), 영수증 링크 x·g(v 1 그대로), answerChips '직접 쓰기' 대신 내 말, matchingRecipes, 골든 모양(notes·customTools·gaps), ENGINE.md 9절, /about/criteria 한 줄. 시험: 문장 표 맞춘 73/73·맞추지 않은 26/27·찾으면 안 되는 글 0, check 전체 통과(단위 시험 1,162), 골든 23개 그대로(safety.custom-tool은 case-28·29 몫으로 아직 안 켜짐), 엔진 시험 범위 99.3%, examples 바뀜 없음, build·qa:budget(/arrival 123.6·/check 120.8·/waypoints 118.0·/destination 116.9KB, 엔진 묶음 +1.6KB)·e2e 156/156. 찾기 묶음(코드 3.1 + 낱말표 5.5, 한 묶음 8.7KB)은 목표 8KB를 넘어 T37이 실제 지연 묶음으로 재고 덜기
2026-10-14 T36 (3/3) 웹 빌더 공개·골든·문서(D89): B-02 빌더의 게시 기능(src/lib/engine/builder.ts, templates.builderPublish, research.builder-publish: products.json 밖, ai.builder면 배포 칸을 채움·추천/2위/비교 없음·SlotRanking.builder, 고른 공개 도구가 이김, 규칙 조건에 안 맞음 → key-on-public-host 안 켜짐, 비용 '모름'·'0원 + 확인 필요', 난이도·시간에 안 더함, 설계도 7번 줄), pick-nav savedFor·Check 도구 이름(productOf), ko.shop.builderLine·builderOther·criteria.builder. 골든 case-24~31 더함(기존 23개 그대로, safety.custom-tool 켜짐), tests/engine/builder.test.ts, 1번에 '직접 쓰기'가 안 찍히는 골든 전체 시험. 문서 ENGINE 10절·RECEIPT·CONCEPT 3.10·ARCHITECTURE 4·5·11·DATA·BACKLOG. check·golden 31/31·test:coverage 엔진 99.8%·examples 그대로·build·qa:budget(/arrival 124.3KB)·e2e 156/156 통과. 검토 에이전트(engine-guardian·ko-copy-editor)는 이 세션에서 부르지 못해 남음
2026-10-14 T36 확인: check(테스트 1211)·build·qa:budget(/arrival 124.3KB)·e2e 156/156·qa:shots(/destination·/about/criteria·/arrival)·키보드만 걷기(빌더 답, 1~4단계) 통과. /about/criteria 점수 칸이 몸의 overflow-wrap: anywhere로 한 글자 폭이 되어 '+3'·'30'이 두 줄로 갈라지던 것을 고침(parts.css .prose .num nowrap, 값 머리 칸에 num).
2026-10-14 T36 검토 반영(D90): 나만 쓰는 빌더 앱은 배포 칸(선택 칸)을 빌더의 게시 기능으로 채우지 않음(공개하라는 지시와 키를 올리지 말라는 지시가 함께 나오던 것), 돈 읽기 '년'·'연'·'월'은 숫자 뒤·따로 선 어절만·한 달 말이 이김, 직접 쓴 도구 기능에서 proxy 버림(조작한 링크), 도구 칸 낱말 겹침 검사에 상품 이름, 이름 없이 받은 직접 쓴 도구는 꼬리 없는 문장(messageHidden·researchAreaHidden·7번 표시 없음), 1번 '만드는 AI' 줄에 쓰는 AI 이름·keptName, 문장 고침(type.custom 한 줄 설명, pack.mine.rule, packRef, 빈틈 안내, readAs, 예시, 도움말, '쓰는 웹 빌더', 한 줄 칸 placeholder 지움), 어려운 말 '웹 빌더'(213개), CLAUDE.md 골든 31. 빌더 키 막힌 곳 고치는 법은 BACKLOG, 찾기 묶음 예산·무리 제목은 T37. check(1218)·golden 31(기존 23 그대로)·coverage 엔진 줄 99.77%·examples 바뀜 없음·build 85쪽·qa:budget(/arrival 124.6KB)·e2e 156/156·qa:shots 통과
2026-10-14 v3 T36 직접 쓰기: 자료와 엔진: 모든 질문에 직접 쓰기·쓰는 AI 질문 3개(optional, D87)·낱말표 aliases.json 약 770개, 엔진 match.ts·custom.ts(D88)·빌더의 게시 기능 builder.ts(D89·D90), 골든 case-24~31 더함(기존 23개 그대로, 31/31). check 단위 시험 1218·엔진 줄 99.77%·examples 바뀜 없음·build 85쪽·qa:budget(/arrival 124.6KB·/check 121.7·/waypoints 118.9·/destination 117.8·홈 43.0)·e2e 156/156 통과. 남은 것: 찾기 묶음 약 8.7KB(8KB 목표, T37)·/waypoints 빌더 줄(T37)·engine-guardian·ko-copy-editor 재검토
2026-10-14 T37 (1/3) 직접 쓰기 부품과 1단계(D91): CustomAnswer.tsx(보기 → [연필 + 직접 쓰기] → '또는' → [모르겠어요], 펼친 판 --fill·--dur-ui, label·도움말 끝 '이름·연락처는 쓰지 마세요.'·n/40자·[확인], maxlength 없음·코드 포인트·빈 글·41자 오류·연락처 경고·한글 조합 Enter 무시, 결과 넷(하나·여럿·못 찾음·빈틈) role=group 첫 문장 초점·저절로 고르지 않음·고르거나 그대로 두면 다음 질문, Esc 접기), 지연 찾기 묶음 custom-match.ts 7.1KB(낱말표 질문 칸만, qa:budget 8KB 줄), 엔진 gapsOfSession, Interview(layoutOf가 직접 쓰기를 세지 않음·타일/2×2/목록 줄 꼴·에이전트 세 무리 제목·유료 꼬리표·답 줄의 '내 말'·보기를 누르면 내 말 지움·마지막 한 줄 maxlength 없음·80자 넘음 알림·직접 쓴 앱으로 채워 보임·빈틈 알림), icons.ts pencil, custom-answer.css, UX.md 3.2·7.2, e2e custom-input.spec.ts 10개, 단위 시험 custom-input·match
2026-10-14 T37 (2/3) 2·3단계·영수증·도구 모음(D92): CustomAnswer를 껍데기 CustomShell(줄·판·검사·초점·Esc·조합)과 결과 판으로 나눔(초점은 실제로 옮겨 간 뒤에만 요청을 지움), 2단계 기능마다 목록 끝 [목록에 없는 도구 쓰기](CustomTool.tsx: 이미 목록에 있음 [이 도구로 고르기]/[○○ 열기] · 같은 갈래 [확인된 도구 보기]/상세 링크 · 못 찾음 · 빈틈, 5개·같은 이름 칸 오류, [직접 쓴 도구로 두기] → customTools + 맨 위 줄 '고를 예정' → 아래 막대 [○○로 정하기], 직접 쓴 도구 줄 '직접 쓴 도구 · 확인 필요'·'모름'·[이 도구 지우기], 빈틈 다시 찾기), 지연 묶음 tool-match.ts 5.1KB(가상 모듈 virtual:cc-data/tool-aliases, qa:budget 줄), pick-nav rowsOf·builderFills, 빌더 공개 칸 '고른 빌더가 공개를 맡아요.' + [다른 곳에 공개하고 싶어요](칩 '고른 빌더가 맡아요'), 도구 줄 꼬리표 '승인 기다림 · 며칠/몇 시간'(엔진 prepWait)·'결제 카드 필요'(products.json paymentCard 넷, needsReview 상품 자료 그대로), 3단계 막힌 곳 끝 [목록에 없는 도구 쓰기 ›](?slot=…&write=1 → 칸 펼침·글 칸 초점·write 뗌)·직접 쓴 도구 서행 줄 [도구 바꾸기], 지난 영수증 직접 쓴 앱 이름(지금 진행과 같은 영수증만 내 말, 아니면 내 앱), 도구 모음 검색 0건 한 줄, UX.md 3.2.1·3.3·3.5·7.2~7.4, ENGINE·DATA·ARCHITECTURE. check(단위 시험 1246)·golden 31/31 그대로·build·qa:budget(/waypoints 119.0 → 124.1KB, CSS 28.4KB, custom-match 7.4KB, tool-match 5.1KB)·e2e custom-input 8개 더함 · 전체 e2e 174/174 · 3단계 줄 56 글자 200% 줄 나눔(check.css) · 사진 .qa/t37b(360 밝게·어둡게·200%) · RECEIPT.md 5절 지난 영수증 이름.
2026-10-14 T37 (3/3) 문서·e2e·예산: UX.md 3.2 찾기가 읽는 꼴(예·아니요·돈과 주기·영문 자판, input.md 6.5~6.7)과 6절 접근성 확인표 '직접 쓰기 칸' 줄, RECEIPT.md 5절 링크로 연 영수증으로 이어서 가면 직접 쓴 도구가 이름 없이 남음. e2e custom-input.spec.ts 22개: 설계도 1번('내 말 그대로'·내 말)·7번('PokeAPI (직접 씀)', 나머지 칸 모두 '확인 필요', 링크 없음)·9번('직접 쓴 도구 확인하기: PokeAPI')을 칸별로, 링크로 연 영수증 → 이어서 가기 → 3단계 서행 줄이 이름 없는 문장, 360px 밝게·어둡게 펼친 상태(1단계 펼친 칸·찾은 결과·다시 보인 보기, 2단계 도구 이름 칸·결과·직접 쓴 도구 자세히, 3단계 '바꾸기' 끝 줄)에서 가로 스크롤·44px 미만·axe 심각·치명 0. check(단위 1246, golden 31/31)·build·qa:budget(단계 화면 최대 /arrival 124.9KB, custom-match 7.4KB·tool-match 5.1KB)·전체 e2e 177/178(scenes-arrival 시간 시험 한 번 실패 → 다시 21/21)·qa:shots /destination /waypoints /check 통과 · 사진 .qa/t37c(360 밝게·어둡게·200%).
2026-10-14 T37 확인(D94): check·build·qa:budget·e2e 178/178·qa:shots 6개 라우트 통과. axe 도우미가 끝이 있는 애니메이션을 기다리게 함(기사 메시지 나타나는 중의 대비 오탐, /tools/neis-meal). 키보드만 1~3단계·도구 모음 걷기와 /destination 펼친 칸·찾은 결과·2×2 사진(360 밝게·어둡게·글자 200%)을 직접 봄.
2026-10-14 T37 검토 반영(D95): 막는 결함(전체 폭 [직접 쓰기] 줄의 긴 내 말이 360px를 넘침) 고침과 휴대폰 흉내 없는 e2e 셋, 판 안 overflow clip, 줄 위 Esc, 넘침은 [확인] 전에 오류·aria-invalid, '찾는 중이에요.', 마지막 한 줄 넘친 채 Enter면 머묾, 결과 문장 화살표 없음·"'○○'로 고르기", 숨은 글 '비용', 화면 따옴표 하나로, '사람 이름·연락처', '-하기' 이름 조사 문장 둘, 빌더·직접 쓴 도구 낭독 문구, josa 영문 끝소리. 엔진: customToolClears(직접 써도 안 풀리는 막힌 곳엔 [목록에 없는 도구 쓰기 ›] 없음), 직접 쓴 도구 준비물 한 줄(lead unknown, 골든: case-28·29 준비물), 설계도 1번 규칙·kept·keptType·hidden, 7번 memo·memoHidden, research.custom-tool 기준·주소 확인법, safety.custom-tool, 예시 custom-app.md·custom-tool.md. 지도: 직접 쓴 앱 청사진 mk-bp-custom(임시 그림), 이름표 11자+…, S2 이름표 글이 바뀌면 톡, 표지 하나 마디의 이름표 다시 놓기(지도 모형 예산 7KB). 상태 한 줄: 직접 쓴 도구가 있는 칸은 고를 수 있는 칸. 확인: check(단위 1,253)·build·qa:budget(단계 화면 최대 /arrival 125.8KB)·e2e 184/184·qa:shots 6개 라우트, 사진 .qa/t37/f-*.png.
2026-10-14 v3 T37 직접 쓰기: 화면: 1단계 [직접 쓰기] 칸(CustomAnswer, 지연 찾기 custom-match 7.4KB)·2단계 '목록에 없는 도구 쓰기'(CustomTool, tool-match 5.1KB)·3단계 서행 줄과 [목록에 없는 도구 쓰기 ›]·영수증·지도 이름표·도구 모음 0건 줄, 설계도 1·7·9번. D91~D95. 단위 1,253·golden 31/31(case-28·29 준비물)·e2e 184/184(custom-input 포함)·qa:budget 단계 화면 최대 /arrival 125.8KB/130KB·qa:shots 6개 라우트 통과.
2026-10-14 T21 준비: 배포 안내(DEPLOY.md)를 Cloudflare 공식 문서 원본(cloudflare-docs 2026-10-14)·wrangler 4.141.0 코드로 다시 확인해 1~11단계로 다시 씀(소유자에게 보낸 설정 안내와 같은 번호·글): 계정 확인·하위 도메인 → D1과 표 → Database ID 보내기(저장소 연결보다 먼저) → 저장소 연결 → 지켜볼 브랜치(정식 공개 전까지 작업 브랜치) → 빌드 변수 다섯 줄 → 빌드 요청 → 확인(`data-cf-beacon`·`"start_url": "/"`·시크릿 창 집계) → 실패 원인 표 → 방문 통계(나중에) → `main`으로 바꾸기·되돌리기(나중에). 0절 비용은 '카드가 없고 유료 플랜이 아니라 청구될 길이 없다'로 고침, 저장소는 이미 비공개(Pages 확인만 남음), 예비 길 Variables에 `CONTACT_EMAIL`, 에이전트 메모(빌드 시간·Referrer-Policy는 10단계 전에 정할 것·빈 커밋으로 빌드·Worker 이름이 다를 때·미리 보기 빌드). HUMAN H01·H01b·H11·H12와 RISKS·DECISIONS·v3 설계서의 옛 단계 번호 고침. 코드 속 옛 번호(build-guard.ts '4단계'·deploy.yml '3단계'와 띠 주석)는 남음. check 통과
