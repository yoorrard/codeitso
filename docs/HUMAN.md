# 사람 확인 대기열

Claude Code가 대신할 수 없는 일만 모았다. 에이전트는 여기 적고 **기다리지 않고** 다른 작업을 계속한다. 사람은 편할 때 처리하고 `[x]`로 바꾸거나 답을 적는다. 오래 걸리는 것(승인·심사)을 위에 둔다.

형식: `- [ ] 무엇을 — 왜 필요한가 — 막히는 작업 — (적은 날)`

## 계정·배포

- [ ] H01 Cloudflare 계정 만들기(무료 플랜) — 미리 보기 배포(T21)에 필요 — T21 — (2026-10-12). 순서는 `docs/DEPLOY.md` 1~6단계 (계정 → API 토큰·Secrets → D1과 database_id → 저장소 변수 → 방문 통계(선택) → 첫 배포 확인)
- [ ] H01b Cloudflare API 토큰을 GitHub 저장소 Secrets에 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`로 넣기 — 권한 범위는 `docs/DEPLOY.md` 2단계 — T21 — (2026-10-12)
- [ ] H11 D1 `code-chauffeur-events`를 만들고 database_id를 알려 주기(또는 `wrangler.jsonc`에 직접 넣기), 저장소 변수 `SITE_URL`·(선택) `CF_BEACON_TOKEN` 넣기 — `docs/DEPLOY.md` 3~5단계 — T21 — (2026-10-12)
- [x] H02 GitHub 저장소 만들고 이 폴더 올리기 — yoorrard/code-chauffeur (2026-10-12)
- [ ] H08 공공데이터포털(data.go.kr) 회원가입·약관 동의, '공공데이터활용지원센터_목록조회서비스'(15077093, 자동승인) 활용신청, 받은 일반 인증키를 GitHub Secrets `DATA_GO_KR_SERVICE_KEY`에 넣기(인코딩·디코딩 키 중 어느 쪽인지도 적어 주세요) — 색인 수집(T19) — T19 — (2026-10-12)
- [ ] H09 브라우저로 직접 확인: `https://www.data.go.kr/robots.txt` 내용, 이용정책(https://www.data.go.kr/ugs/selectPortalPolicyView.do)의 "센터의 사전 승인 없이 포털 서비스의 지식재산을 이용하거나 제3자가 이용하게 해서는 안 된다" 조항이 목록(이름·기관·링크)을 우리 사이트에 싣는 일에 걸리는지. 괜찮으면 `data/sources.json`의 `redistribution`을 정해 주세요(지금 `metadata-only`, 확인 전에는 `link-only`로 다룬다) — T19 수집 시작 — T19 — (2026-10-12). 조사 내용은 D51
- [ ] H10 (선택) 에이전트가 data.go.kr을 직접 확인하게 하려면 클라우드 환경 설정 Network access의 Allowed domains에 `www.data.go.kr`, `api.odcloud.kr`, `infuser.odcloud.kr`를 더하기 — 지금 이 환경에서는 막혀 있어 공식 원문을 검색 색인으로만 확인했다 — T19 — (2026-10-12)

## 이름·법·학교

- [ ] H03 KIPRIS 상표 검색, 도메인(codechauffeur.com 등) 확인과 결정 — 정식 출시 전 — T22
- [ ] H04 교원 겸직 신고, '학원' 명칭, 국외 이전(Cloudflare) 고지, 개인정보 처리방침·이용 안내 최종 문구 — 정식 출시 전 — T22. 초안은 `/legal/privacy`·`/legal/notice`(`src/copy/ko.ts`의 legal 묶음)에 있고 '검토 중' 표시가 붙어 있다. 문의 방법도 정해 주세요.
- [ ] H07 소개 페이지의 저장소 링크(https://github.com/yoorrard/code-chauffeur)가 공개 저장소인지 확인 — 비공개면 정식 출시 전 공개하거나 링크를 바꾼다 — T22 — (2026-10-12)
- [ ] H06 설명문 초안에 AI를 쓸지 결정 — C02~C04 자료 채우기 방식 — 막지 않음 (지금은 에이전트가 초안을 쓰고 needsReview로 둔다)

## 자료 사실 확인

- [ ] C01 진열 상품 16개를 공식 문서와 대조해 `needsReview: false`로 — 정식 배포(`npm run validate:release`) — T22. 대조표는 이 파일 아래 'C01 대조표'에 에이전트가 채운다.

## 기사님(마스코트)

- [ ] M01 기사님 그림 권리 확인 — 이 그림을 만든 도구의 약관상 공개 웹 서비스에 써도 되는지, 그림의 라이선스(데이터처럼 CC BY 4.0으로 열지, 권리 유보할지) — 정식 출시 전 — (2026-10-12)
- [ ] M02 기사님 자세·표정 추가 그림 (아래 'M02 요청서') — 게임 연출의 완성도. 없어도 진행은 된다 (지금은 한 장 + CSS 연출) — T07·T16 다듬기 — (2026-10-12)
- [ ] M03 기사님 이름 정하기 (지금 화면에서는 '기사님'으로 부른다) — 막지 않음

## 관찰 시험

- [ ] H05 교사 5명 관찰 시험, 처음 써 본 10명의 첫 결과물 확인 — 2단계로 넘어가는 기준 — T22 뒤

---

## M02 요청서: 기사님 추가 그림

지금 그림(`src/assets/mascot/chauffeur-wave.webp`)을 **참고 이미지로 첨부**하고, 같은 도구로 아래 그림을 만들어 주세요. 모든 그림을 같은 크기(1254×1254 정사각), 같은 비율, 발끝이 같은 높이, **배경 투명 PNG**로 받으면 바로 끼울 수 있습니다.

모든 요청 앞에 붙일 문장:

> Use the attached character as the exact reference. Same chibi chauffeur boy: navy peaked cap with gold band and round gold '</>' badge, short dark-brown hair, big navy eyes, rosy cheeks, navy jacket with gold cuff stripes and gold buttons, white shirt, blue tie, teal map-pin lapel pin, white cartoon gloves, black shoes, dark tablet with glowing '</>'. Same art style: thick dark-navy outline, soft cel shading, 2.5-head proportions. Full body, centered, same scale and feet baseline as the reference, square 1254×1254, transparent background, no ground shadow, no text or letters except the existing '</>' marks.

| 순서 | 자세 | 쓰는 곳 | 요청 문장 |
|---|---|---|---|
| 1 | 안내(가리키기) | 정류장 안내, 다음 정류장 | Standing three-quarter view, free hand stretched out pointing to the viewer's right with index finger, tablet held at his side, confident friendly smile, both eyes open. |
| 2 | 축하 | 영수증 발행, 도장 완성 | Small jump with both arms raised overhead cheering, tablet held up high, eyes happily squeezed shut, wide open-mouth smile. No confetti. |
| 3 | 운전 | 노선도의 차, 홈 출발 장면 | Side view facing right, seated in a small rounded toy-like car (navy body, gold trim, round headlights), both gloved hands on the steering wheel, cheerful smile, visible from chest up; whole car visible, wheels resting near the bottom edge. (가능하면 같은 차, 운전자 없이 한 장 더) |
| 4 | 생각 | 인터뷰 | Tablet held at chest, free gloved hand on chin, head slightly tilted, eyes looking up, small closed-mouth smile. No thought bubbles or question marks. |
| 5 | 걱정·주의 | 재확인 충돌 | Both hands holding the tablet in front of chest, eyebrows raised in concern, small sweat drop at temple, slight frown, eyes open: gentle 'be careful' mood, not scared. |
| 6 | 도장 찍기 | 계산대 | Three-quarter view, gripping a large wooden rubber stamp with both hands and pressing it onto a blank white paper receipt at the bottom of the frame, determined happy face. Receipt and stamp face completely blank. |
| 7 | 눈 뜬/감은 같은 그림 (선택) | 눈 깜빡임 연출 | Exactly the same image as the reference, identical pose and position, but both eyes open. → 그다음 같은 요청에서 "but both eyes closed in relaxed arcs." |

우선순위는 1·2·3이 먼저입니다. 받은 그림은 `src/assets/mascot/`에 올려 주시거나 대화에 첨부해 주시면 에이전트가 알파 정리·자르기·크기별 변환을 합니다.

---

## C01 대조표

(에이전트가 상품별로 확인할 사실과 원문 링크를 채운다.)
