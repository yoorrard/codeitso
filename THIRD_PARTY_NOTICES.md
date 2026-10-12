# 제3자 고지 (Third-party notices)

코드쇼퍼 저장소에 들어 있거나 빌드 결과에 실리는 외부 자료와 그 라이선스다. 각 라이선스 원문은 표의 위치에 함께 둔다. 사이트의 `/about/credits` 페이지가 이 표를 이용자에게 보여 준다.

## 개발 하네스: Claude Code 스킬 (`.claude/skills/`)

빌드 결과에는 실리지 않는다. 고친 파일은 머리말에 출처·커밋·고친 곳을 적었다.

| 폴더 | 출처 (커밋) | 라이선스 | 고침 |
|---|---|---|---|
| `frontend-design` | anthropics/skills `skills/frontend-design` (dbd4588f9e1033efb41dad4bef2f7947c8993d44) | Apache-2.0 (`LICENSE.txt`) | 머리말 상자 추가, 한 문장 수정 (Apache-2.0 4조 b항 고지) |
| `verification-before-completion` | obra/superpowers v7.0.0 (bb92a77741419a4ab5f06e711a283343f1ada0c3) | MIT (`LICENSE`) | 머리말, 프로젝트 증거 명령 표 추가 |
| `test-driven-development` | obra/superpowers v7.0.0 | MIT | 경로 제한, 사람에게 묻는 대목을 기록 후 진행으로, 기존 엔진 예외 |
| `systematic-debugging` | obra/superpowers v7.0.0 | MIT | 사람과 상의하는 대목을 결정 기록으로, find-polluter.sh 제외 |
| `web-interface-guidelines` | vercel-labs/web-interface-guidelines `command.md` (434b7f91364665f2f733b310ec54809bf8f37937) | MIT (`LICENSE`) | 규칙 고정(원격 불러오기 제거), Astro·Preact·한국어에 맞게 고침 |
| `animate` | emilkowalski/skills `skills/animate`, `skills/review-animations/STANDARDS.md` (2d228630ba1446365f614a108cb8252f1feda202) | MIT (`LICENSE`) | 대기 절 제거, 라이브러리 대신 CSS/WAAPI·토큰, 프로젝트 절 추가 |
| `accessibility` | addyosmani/web-quality-skills `skills/accessibility` (afa8da942115f2961fdbfa80807ea0b232ff6c00) | MIT (`LICENSE`) | WCAG 2.2·한국어·Preact 예시, 시험 방법을 프로젝트 도구로, 축약 |
| `polish` | pbakaus/impeccable v4.5.2 `reference/craft-floor.md`, `polish.md`, `audit.md` (919dbeba520df760a157fe635be62faae88d58da) | Apache-2.0 (`LICENSE`, `NOTICE.md`) | 실행 파일·감지기 제거, 프로젝트 규칙에 맞춤 (Apache-2.0 4조 b항 고지는 파일 머리말) |

`next-task`, `verify`, `add-product`, `visual-qa`, `game-motion`과 `.claude/agents/`, `.claude/rules/`, `.claude/hooks/`는 이 저장소에서 쓴 것이다 (MIT).

## 사이트에 실리는 자료

| 자료 | 출처 | 라이선스 | 위치 |
|---|---|---|---|
| Pretendard 1.3.9 (400·700·800 동적 하위 집합, 고치지 않음) | orioncactus/pretendard (npm `pretendard`) | SIL OFL 1.1 | `public/fonts/pretendard/` + `OFL.txt` |
| 영수증 글꼴 `CC Receipt` | naver/d2-coding-font VER1.4.0 (D2Coding)에서 글자를 골라 이름을 바꾼 수정본 (`scripts/fonts/build-fonts.ts`) | SIL OFL 1.1 | `public/fonts/receipt/` + `OFL.txt` |
| 3D 그림 문자 | microsoft/fluentui-emoji (고정 커밋) | MIT | `public/emoji/` + `LICENSE` |
| UI 아이콘 | phosphor-icons/core | MIT | 빌드 때 인라인 |
| 색종이 효과 | catdad/canvas-confetti | ISC | npm 의존성 |
| 효과음 합성 | KilledByAPixel/ZzFX (쓸 경우) | MIT | npm 의존성 |
| 기사님 그림 | 프로젝트 소유자 제공 | 권리 확인 중 (`docs/HUMAN.md` M01) | `src/assets/mascot/` |
