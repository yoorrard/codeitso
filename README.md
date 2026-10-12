# 코드쇼퍼 (Code Chauffeur)

> 어디로 모실까요? 요금은 0원입니다.
> 코드는 몰라도 됩니다. 목적지만 말하세요.

바이브코딩 초심자가 질문에 답하고 필요한 재료를 골라 담으면, 자기 AI에 넘길 **설계 꾸러미**와 **대화 카드**, 먼저 알아 둘 **공부할 것**, 직접 확인할 **조사할 것**을 영수증처럼 받아 가는 무료 웹 서비스입니다. 사이트는 AI를 쓰지 않고 공개된 규칙으로 판단하며, 운영비는 월 0원으로 시작합니다.

이 저장소는 Claude Code가 사람 개입을 최소로 하고 바로 구현을 이어 갈 수 있게 만든 **개발 꾸러미**입니다. 화면은 기사님(마스코트)이 모는 차가 정류장을 도는 게임처럼 움직입니다.

## 이 저장소에 든 것

| 경로 | 내용 | 상태 |
|---|---|---|
| `CLAUDE.md` | Claude Code가 매번 읽는 규칙 (자율 진행 원칙 포함) | 완성 |
| `.claude/rules/` | 파일 종류별 규칙 (자료, 엔진, 화면, 문장) | 완성 |
| `.claude/skills/` | `/next-task`, `/verify`, `/visual-qa`, `/add-product`, `game-motion` + 검증해 가져온 스킬 8개 (출처는 `THIRD_PARTY_NOTICES.md`) | 완성 |
| `.claude/agents/` | 전문가 에이전트 6명: 엔진 수문장, 접근성·성능 감사, 한국어 편집, 게임 연출, 초심자 읽기 시험, SVG 그림 | 완성 |
| `.claude/hooks/`, `.claude/settings.json` | 세션 시작 설치·상황 알림, 위험 명령 차단, 고친 파일 즉시 검사, 실패한 채 멈추지 않기 | 완성 |
| `docs/` | 요구사항, 디자인 의뢰서, 작업 목록, 구조, 엔진 명세, 자료 안내, 화면 설계, 영수증 형식, 결정 기록, 사람 확인 대기열 | 완성 |
| `src/lib/engine/` | 판단 엔진: 인터뷰 → 장보기 추천 → 재확인 충돌 → 영수증·설계 꾸러미 | 완성, 검사 통과 |
| `data/` | 씨앗 자료: 질문 14개, 상품 19개, 규칙 38개, 개념 카드 10장, 조사 카드 13장, 레시피 5개, 에러 안내 6개, 골든 사례 16개 | 완성 (진열 상품 16개는 사람 확인 필요) |
| `schemas/`, `scripts/` | 자료 스키마, 자료·골든·품질 바닥선·하네스 검사, 시각 점검·성능 예산 | 완성 |
| `docs/examples/` | 엔진이 레시피로 만든 실제 영수증과 설계 꾸러미 | 완성 |
| `src/styles/tokens.css`, `src/assets/mascot/` | 색·글꼴·모션 토큰, 기사님 그림 원본 | 완성 |
| 화면, 배포, 집계 | Astro 화면, Cloudflare 배포, 익명 집계 | `docs/TASKS.md` 순서대로 구현 |

결과물이 어떻게 생겼는지 먼저 보려면 `docs/examples/lunch-page.md`를 여세요.

## 시작하기

1. 준비물: [Node.js](https://nodejs.org/ko) 22.18 이상 (24 LTS 권장), Git, Claude Code.
2. 저장소를 받아 폴더로 이동한 뒤 설치하고 검사합니다. '자료 검사 통과', '모든 골든 사례 통과', '품질 바닥선 통과', '하네스 검사 통과'가 보이고 오류 없이 끝나면 정상입니다.

   ```bash
   git clone https://github.com/yoorrard/code-chauffeur.git
   cd code-chauffeur
   npm install
   npm run check
   ```

3. `claude`를 실행하고 `/next-task`를 입력합니다. Claude Code가 작업 하나를 계획 → 구현 → 검사 → 전문가 검토 → 커밋까지 끝내고 다음 작업으로 넘어갑니다. 사람이 해야 할 일은 `docs/HUMAN.md`에 쌓입니다. 클라우드 세션(claude.ai/code)에서도 같은 설정이 그대로 적용됩니다.

## 사람이 해야 할 일

Claude Code가 대신할 수 없는 일(계정, 비용, 법·약관, 상표·도메인, 상품 사실의 최종 확인, 기사님 추가 그림)은 `docs/HUMAN.md`에 쌓입니다. 에이전트는 이 일을 기다리지 않고 다른 작업을 계속합니다. 편할 때 확인해 `[x]`로 바꾸거나 답을 적어 주세요.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run check` | 자료 검사 + 골든 사례 + 품질 바닥선 + 하네스 검사 + 타입 검사 |
| `npm run validate:release` | 배포용 자료 검사 |
| `npm run golden` | 추천 회귀 검사 |
| `npm run explain -- case-01` | 사례 하나의 칸별 점수 풀이 |
| `npm run examples` | 영수증·꾸러미 예시 다시 만들기 |
| `npm run qa:shots` / `npm run qa:budget` | 빌드한 화면 스크린샷·접근성 점검 / 성능 예산 (빌드 뒤) |

## 라이선스

코드는 MIT, `data/`의 자료는 CC BY 4.0입니다. 상품 카드가 가리키는 외부 자료의 조건은 각 출처를 따릅니다. 가져온 스킬·글꼴·아이콘의 라이선스는 `THIRD_PARTY_NOTICES.md`에 있습니다.
