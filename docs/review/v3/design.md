# v3 조사·설계: 디자인 정하기 (docs/review/v3/design.md)

> 쓴 날 2026-10-14 · 역할: 디자인 조사와 기능 설계. 소유자 요청 (2) "UI/UX·부품·색·글꼴·테마까지 올인원 설계"와 (5) "고르는 곳마다 직접 쓰기"를 코드쇼퍼의 컨셉에 맞게 정한다.
> 먼저 읽은 것: `docs/review/v2/brief.md`, `docs/CONCEPT.md`, `docs/RECEIPT.md`, `data/templates.json`(`styles`·`types`), `data/questions.json`(`q.style`), `src/lib/map/model.ts`(`paletteOf`), `docs/DECISIONS.md` D44·D70·D71.
> 문서 순위(PRD > CONCEPT > …)는 그대로다. 이 문서의 결정은 작업을 시작할 때 `docs/DECISIONS.md`와 `docs/CONCEPT.md`에 먼저 옮긴다(10절).
> 표시: **[확인]** 원본(패키지 파일·공식 문서 본문)에서 직접 봄 · **[잼]** 이 저장소에서 직접 계산하거나 실행함 · **[검색 요약]** 검색 결과 요약으로만 봄(원문을 열지 못함) · **[못 봄]** 열지 못함.

---

## 0. 한눈에: 결정 열네 줄

1. **새 단계를 만들지 않는다.** 디자인은 1단계 '만들 앱 정하기'의 느낌 질문(`q.style`)에서 시작하고, 같은 '디자인 정하기' 시트를 4단계 '설계도 받기'에서도 연다. 다섯 단계와 주소는 그대로다(D64).
2. **한 번 누르면 끝나는 길을 먼저 둔다.** 느낌 타일 하나만 고르면 색·글꼴·모서리·간격·움직임·아이콘·그림이 모두 정해진다. 더 고르고 싶은 사람만 글 버튼 "색·글꼴까지 직접 정하기"로 시트를 연다(Lovable의 '방향 셋', shadcn의 '한 묶음 프리셋'과 같은 생각).
3. **느낌은 여섯이다:** 깔끔하게 · 귀엽게 · 차분하고 믿음직하게 · 강렬하게 · 포근하게 · 오락실처럼. 앞의 넷은 지금 id(`clean` `cute` `serious` `bold`)를 그대로 쓴다. 앱 종류에 맞는 셋을 앞에 놓고 첫 타일에만 '추천' 꼬리표를 단다.
4. **지금 느낌 둘은 AI 기본값 무리에 빠져 있어 고친다.** '귀엽게'(크림 바탕 #FFF8F0 + 주황 #C2410C)와 '강렬하게'(먹색 바탕 #0F0F0F + 노랑 #FACC15)가 저장소의 `frontend-design` 스킬이 꼽은 '생성된 디자인 티' 1번·2번과 겹친다.
5. **고르는 곳마다 직접 쓰기가 있다.** 느낌(한 줄), 대표 색(색 고르개 + #코드 + 이름), 글꼴(이름), 바라는 점(한 줄), 닮고 싶은 앱(한 줄). 직접 쓴 말은 **AI 없이** 낱말표로 읽어 색·느낌에 반영하고, 반영한 결과를 화면에 그대로 말한다("'바다처럼' → 청록으로 맞췄어요"). 원문은 설계도에 "내 말 그대로" 줄로 넣는다.
6. **대비는 엔진이 지킨다.** 대표 색 10개 × 바탕 4묶음 × 밝기 2 = 80쌍이 모두 4.5:1 이상이다(가장 낮은 값 4.52 [잼]). 직접 고른 색은 버튼 글자색(흰색·검정)을 자동으로 고르고, 글자로 쓸 색은 OKLCH 밝기를 낮춰 4.5:1을 맞춘다.
7. **미리 보기는 우리 손으로 그린다.** 고른 앱 종류의 첫 화면을 HTML·CSS로 작게 그린 '폰 미리 보기'다. 남의 화면 캡처는 쓰지 않는다. 제목 글꼴 견본만 빌드 때 글꼴에서 뽑은 SVG 윤곽선으로 싣는다(우리 사이트는 글꼴 파일을 바깥에서 불러오지 않는다).
8. **설계도 6번 '디자인 지시'를 7줄에서 11묶음으로 키운다.** 순서는 Google의 DESIGN.md 형식을 따른다: 전체 느낌 → 색 → 글자 → 배치 → 깊이 → 모양 → 부품 → 움직임 → 아이콘·그림 → 접근성 → 하지 말 것, 그리고 바로 붙여 쓸 CSS 변수 묶음.
9. **DESIGN.md를 따로 내려받게 한다.** `@google/design.md` 0.4.0(alpha)의 형식(YAML 디자인 값 + 마크다운 설명)이고, 이 문서의 견본을 그 린터로 돌려 오류 0·경고 0을 확인했다 [잼]. 코딩 에이전트를 쓰는 사람에게 특히 권한다.
10. **링크는 내보내기만 한다.** Mobbin·Refero·Nicely Done·Lazyweb은 "다른 앱은 어떻게 했나 보기" 목록의 바깥 링크(새 창)와 영어 검색 낱말 칩으로만 잇는다. 그림을 가져오지 않고, 그 사이트의 글을 설계도에 넣지 않는다. 제휴·추적 매개변수를 붙이지 않는다.
11. **설계도의 디자인 값은 지금 고른 화면 도구에 맞춘다.** HTML 한 장이면 `<style>`의 `:root`, React + Vite면 `src/index.css`. Tailwind CSS v4를 쓰면 같은 값을 `@theme`에 넣는 묶음을 준다(이름을 `--color-*` `--text-*` `--radius-*`로 맞춰 둔다).
12. **무료 AI 채팅을 쓰는 사람에게는 짧은 판을 준다.** 6번을 색·글꼴·모서리·주 버튼·접근성·CSS 묶음으로 줄이고 DESIGN.md는 선택으로 둔다. 코딩 에이전트에는 전체 판과 DESIGN.md를 함께 준다.
13. **예산을 넘기지 않는다.** 설계도 받기는 지금 135.4KB/140KB다(D71). 디자인 시트·미리 보기·DESIGN.md 렌더는 한 묶음으로 떼어 누를 때 `import()`로 싣는다.
14. **열지 못한 두 곳은 사람에게 넘긴다.** https://vibe-design-one.vercel.app/ 과 lucianlabs.dev는 이 세션에서 열리지 않았고 검색 색인에도 없었다(1.2절). `docs/HUMAN.md`에 올린다.

---

## 1. 조사 방법과 한계

### 1.1 어떻게 봤나 (2026-10-14)

| 방법 | 쓴 것 | 믿을 수 있는 정도 |
|---|---|---|
| npm 패키지를 내려받아 파일을 직접 읽음 | `@google/design.md` 0.4.0, `tailwindcss` 4.3.3, `shadcn` 4.21.4, `@shadcn/registry` 0.1.3, `@radix-ui/colors` 3.0.0, `open-props` 1.7.23, `pretendard` 1.3.9, `@material/material-color-utilities` 0.4.0, `remixicon` 4.9.1, `oh-my-opencode` 4.18.2(공개 DESIGN.md 묶음과 taste-skill 사본이 들어 있음), `@flipdish/ui-library`(Untitled UI 기반) | [확인] |
| npm 등록 정보(`npm view`) | 한글 글꼴 17종·아이콘 8종의 판과 라이선스 칸 | [확인] (라이선스 칸과 파일이 다른 경우가 있었다, 3.9절) |
| 이 저장소에서 실행 | `@google/design.md lint`·`export`를 견본에 돌림, 대비 계산(`scripts/lib/contrast.ts`와 같은 WCAG 2.x 공식) | [잼] |
| 웹 검색 | 서비스 소개, 보도 자료, 공식 문서 요약 | [검색 요약] |

### 1.2 열지 못한 것

- 이 세션의 WebFetch는 모든 주소에서 `getaddrinfo ENOTFOUND`로 실패했고, curl은 프록시가 `403 CONNECT`로 막았다(`mobbin.com`, `refero.design`, `nicelydone.club`, `www.lazyweb.com`, `inspoai.io`, `lucianlabs.dev`, `vibe-design-one.vercel.app`, `tweakcn.com`, `ui.shadcn.com`, `www.radix-ui.com`, `open-props.style`, `www.realtimecolors.com`, `huemint.com`, `material-foundation.github.io`, `stitch.withgoogle.com`). GitHub MCP도 이 저장소 밖은 막혀 있다. 그래서 서비스 화면 자체는 하나도 보지 못했다. 서비스 설명은 모두 [검색 요약]이다.
- **https://vibe-design-one.vercel.app/** [못 봄]: 정확한 이름으로 검색해도 결과가 없다("vibe-design-one" 일치 0건). 비슷한 이름의 다른 것(Figma 플러그인 'Vibe Design', monday.com의 Vibe 디자인 시스템, 웹 디자인 스타일 30여 개와 프롬프트를 모은 'Design Prompts' 사이트)만 나왔다. 소유자가 뜻한 곳이 '스타일 갤러리 + 프롬프트' 형태라면 이 문서의 5·7절(느낌 프리셋과 설계도 지시)이 그 역할을 맡는다. 확인은 HUMAN.md로 넘긴다(11절).
- **lucianlabs.dev** [못 봄]: 검색 결과가 없다("Lucian Labs" 일치 0건, 비슷한 이름은 모두 다른 회사).
- **InspoAI**: 공식 사이트를 열지 못해 [검색 요약]만 있다.
- **한국형 웹 콘텐츠 접근성 지침(KWCAG) 2.2**: 검사 항목 수와 원문을 찾지 못했다. 이 문서는 WCAG 2.2 AA를 기준으로 하고, KWCAG는 HUMAN.md에서 확인한다.

---

## 2. 참고 서비스에서 본 것

### 2.1 화면 모음 (실제 앱 화면을 모아 둔 곳)

| 서비스 | 무엇 | 나눔(분류) | AI와 잇는 법 | 코드쇼퍼가 가져갈 것 | 근거 |
|---|---|---|---|---|---|
| **Mobbin** mobbin.com | iOS·Android·웹 앱 화면. 보도 자료 기준 화면 621,500장 이상, 흐름 142,200개 이상 | 맨 위 묶음: Apps · Sites · Screens · Flows · Animations · UI Elements. 앱 분야, 화면 종류, UI 요소, 흐름으로 거른다. 흐름 묶음 예: Account Management, Commerce & Finance, Content(Filtering & Sorting). 2025-07 겹쳐 거르기, 2025-02 캡처 올려 비슷한 화면 찾기 | 2026-05-12 MCP 서버 공개(베타, 유료 요금제). 화면·흐름·섹션 검색 도구 셋(제3자 안내서 기준) | '앱 종류 × 화면 종류 × 부품 × 흐름' 네 축. 링크 내보내기 대상 | [검색 요약] 보도 자료(BusinessWire, 2026-05-12), mobbin.com 첫 화면 요약, alternativeto 기사 |
| **Refero** refero.design | 웹·iOS 제품 화면, 흐름, 스타일 | 화면마다 페이지 종류(45개 남짓: 대시보드·상품·결제 벽·가입·프로필 …), UX 패턴(Billing & Plans, Empty State, Dark Mode …), UI 요소(Button, Table, Modal, Switch & Toggle …), 글꼴. 흐름: 온보딩·결제·해지·계정 삭제·비밀번호 재설정 | MCP 주소 `https://api.refero.design/mcp`. 공식 문서는 '스타일 → 화면 → 흐름' 순으로 찾으라고 권한다. 스타일 = 글꼴·색 역할·간격·면·부품·그림 안내·해야 할 것/하지 말 것. 스타일은 웹 마케팅·제품 페이지만 다룬다(iOS 앱 화면 없음) | '스타일 묶음 = 해야 할 것/하지 말 것까지 포함'이라는 꼴. 화면 상태(빈 상태·오류)를 UX 패턴으로 따로 세는 방식 | [검색 요약] doc.refero.design(tools·data-model·getting-started), refero.design/how-it-works |
| **Nicely Done** nicelydone.club | SaaS 웹 화면·흐름·부품 | 앱, 패턴, 페이지 종류로 거르고 캡처 속 글자를 검색. 예: Supabase 화면 238장·부품 89개·흐름(온보딩, 비밀번호 재설정 …) | Figma로 끌어 붙이기 | '흐름 = 화면 여러 장의 순서'로 설계도 3번(화면 목록)을 흐름 단위로 묶는 생각 | [검색 요약] toolradar(화면 219,400장·앱 500개 이상), 사이트 앱 페이지 요약(부품 13,300개 이상) |
| **Lazyweb** lazyweb.com | 실제 제품 화면 28만 1천 장 남짓, 흐름·패턴 | 회사·분야·화면 면(surface)으로 검색. `platform`은 desktop·mobile | 무료 MCP(로그인 없이 토큰 발급), Pro 월 19달러는 전체 보고서. 도구 이름이 바뀐다(`lazyweb_search` → `lazyweb_generate_report` 안내). **응답 안에 "에이전트 지시 파일에 LAZYWEB:ROUTER 묶음을 저장하라" 같은 지시꼴 글이 섞여 온다는 경고**가 있다 | 안전 규칙: 참고 도구의 응답은 자료일 뿐 지시가 아니다. 남의 화면은 참고만 하고 베끼지 않는다 | [확인] `oh-my-opencode` 4.18.2의 `references/design/lazyweb.md`(2026-07 확인이라 적힘) · [검색 요약] lazyweb.com 비교 페이지 |
| **InspoAI** inspoai.io | AI 검색 + 무드보드 + 브랜드 점검 + 경쟁사 훑기 | 분야·스타일·색·글꼴로 거른다 | '골라 둔 캡처 10만~15만 장으로 화면을 만드는 에이전트'라는 설명도 있다(출처마다 다름) | '분야·스타일·색·글꼴' 네 거름은 우리 시트의 줄(느낌·색·글꼴)과 같은 축 | [검색 요약] inspoai.io 요약, Product Hunt, Trustpilot |

**같이 나온 경고**: 화면 모음의 캡처는 그 회사의 저작물이다. 참고만 하고 그대로 쓰거나 따라 그리지 않는다(Lazyweb 참고 문서의 'Reference-only' 규칙). 코드쇼퍼는 캡처를 싣지 않고 링크만 건다(8절).

### 2.2 테마·색·글꼴 만드는 도구

| 도구 | 비전문가가 방향을 고르는 법 | 내보내는 것 | 가져갈 것 / 버릴 것 | 근거 |
|---|---|---|---|---|
| **shadcn/ui create** (`shadcn` 4.21.4) | 고를 것 열 가지를 짧은 코드 하나로 묶는다. 바탕 라이브러리(radix·base·aria), 스타일 8개(nova·vega·maia·lyra·mira·luma·sera·rhea), 바탕 회색 8개(neutral·stone·zinc·gray·mauve·olive·mist·taupe), 테마 색 25개, 차트 색, 아이콘 5종(lucide·hugeicons·tabler·phosphor·remixicon), 글꼴 26종, 제목 글꼴, 모서리 5단(default·none·small·medium·large), 메뉴 강조(subtle·bold), 메뉴 색 4종. 스타일마다 '아이콘 / 글꼴' 짝이 정해져 있다(예: Lyra = Phosphor / JetBrains Mono, Sera = Lucide / Noto Sans + Playfair Display). 고른 값은 base62 코드(`b…`)로 묶여 `--preset`으로 넘긴다 | CSS 변수(Tailwind v4) | **가져감**: 느낌 하나가 아이콘·글꼴·모서리를 함께 정하는 '묶음 프리셋', 모서리를 낱단계로, 고른 값을 짧은 코드로(우리 영수증 링크 `#r=`에 실음). **버림**: 글꼴 26종(한글이 없다) | [확인] `@shadcn/registry` 0.1.3의 `PRESET_*` 상수, `shadcn` 4.21.4 `index.js` |
| **tweakcn** | 슬라이더·색 고르개·실시간 미리 보기, 밝은·어두운 프리셋에서 시작해 다듬기 | shadcn용 CSS 변수(Tailwind v3·v4, OKLCH·HSL), 공유 주소 | 실시간 미리 보기, 프리셋에서 출발 | [검색 요약] tailkits·webcatalog 소개 |
| **Realtime Colors** | 글자·바탕(중립 둘) → 주색·보조색 → 강조색 순으로 다섯 색을 고르면 **실제 웹 페이지 모양**에 바로 칠해진다. 무작위 + 잠그기, 대비 검사 | CSS·SCSS·Tailwind·zip·png, OKLCH 값(2023-12부터) | **가져감**: 역할 순서(바탕·글자 먼저, 강조는 하나), 그럴듯한 화면 위에서 고르기, 대비 숫자를 바로 보이기 | [검색 요약] realtimecolors.com 첫 화면·릴리스 노트 |
| **Huemint** | 색을 '역할(바탕·글자·강조)'로 만든다. 틀(로고·웹사이트·그라데이션)을 고르고, 지키고 싶은 색을 잠근 채 나머지를 만든다. 모드 셋(AI 둘, 무작위 하나) | 색 목록 | **가져감**: '학교 상징색처럼 정해진 색을 잠그고 나머지를 맞춘다' → 우리 '직접 고르기'가 정한 색을 지키고 글자색·옅은 면·밤 색을 만든다 | [검색 요약] huemint.com/about, Gigazine 리뷰 |
| **Radix Colors** 3.0.0 | 색마다 12단, 밝은·어두운·투명·P3판. 단마다 쓰임이 정해져 있다(1~2 바탕, 3~5 부품 바탕, 6~8 테두리, 9~10 꽉 찬 면, 11~12 글자) | CSS 변수 | **가져감**: '단마다 쓰임' 생각. **버림**: 9단 그대로 버튼에 흰 글자를 얹는 것. 잰 값: blue 9단 #0090FF + 흰 글자 3.26:1, green 9단 3.16:1, orange 9단 2.97:1로 4.5:1에 못 미친다. 유채색 25개 가운데 흰 글자가 4.5:1을 넘는 9단은 indigo·plum·violet·iris·purple 다섯뿐이다 [잼] | [확인] 패키지 CSS 31색 · [검색 요약] 단 쓰임은 radix-ui.com 문서와 Unkey·Moon 문서 |
| **Open Props** 1.7.23 | 글꼴을 '분류'로 고른다(system-ui, transitional, old-style, humanist, geometric-humanist, neo-grotesque, rounded-sans, slab-serif, industrial, handwritten, didone …, 기기에 깔린 글꼴만 씀). 움직임 곡선(spring·elastic·squish …), 모서리(blob·drawn) | CSS 변수 | **가져감**: '분류로 고르기'(우리 글꼴 줄은 '기본 고딕·부드러운 고딕·명조 제목 …'). **버림**: 글꼴 목록(한글 글꼴이 없다) | [확인] `src/props.fonts.css`, `props.easing.css`, `props.borders.css` |
| **Tailwind CSS** 4.3.3 | `@theme`의 변수 이름표(namespace)가 곧 유틸리티 이름 | `--color-*`(26색 × 50~950, OKLCH. 새로 mauve·olive·mist·taupe), `--font-*`, `--text-*`(+`--text-*--line-height`), `--font-weight-*`, `--tracking-*`, `--leading-*`, `--breakpoint-*`(sm 40rem ~ 2xl 96rem), `--container-*`, `--spacing`(0.25rem), `--radius-*`(xs~4xl), `--shadow-*`·`--inset-shadow-*`·`--drop-shadow-*`, `--blur-*`, `--perspective-*`, `--aspect-*`, `--ease-*`, `--animate-*` | **가져감**: 우리가 내보내는 CSS 변수 이름을 이 이름표에 맞춘다. 그러면 Tailwind를 쓰는 사람은 그대로 `@theme`에 옮기면 된다 | [확인] `tailwindcss/theme.css` |
| **Material Theme Builder** (`material-color-utilities` 0.4.0) | 씨앗 색 하나 → 색 체계. 변형 9가지(MONOCHROME·NEUTRAL·TONAL_SPOT·VIBRANT·EXPRESSIVE·FIDELITY·CONTENT·RAINBOW·FRUIT_SALAD), 대비 단계(표준 0, 중간 0.5, 높음 1.0) | 색 역할 전체, CSS(밝음·어두움, 높은 대비) | **가져감**: 씨앗 색 하나에서 역할 색을 만드는 방식(우리 '직접 고르기'). **버림**: 변형 9가지(초심자에게 차이가 안 보인다), 라이브러리 자체(우리 계산은 엔진 안 60줄이면 된다) | [확인] 패키지 `Variant` · [검색 요약] 대비 단계(Flutter 문서) |
| **Untitled UI** 이름 붙이기 | 뜻으로 이름을 붙인다: `--color-text-primary`·`--color-text-quaternary`, `--color-bg-primary`·`--color-bg-secondary`·`--color-bg-brand-solid`, `--color-border-secondary` | Tailwind v4 변수 | **가져감**: '역할-단계' 이름(글자 1~4단, 바탕 1~2단, 브랜드 꽉 찬 면) | [확인] Untitled UI 기반 패키지 `@flipdish/ui-library`에서 본 이름 6개. Untitled UI 공식 문서는 못 봄 |
| **Pretendard·한글 글꼴** | 아래 3.4절 | — | — | [확인] npm |

### 2.3 AI로 디자인하는 곳 ('바이브 디자인')

| 서비스 | 방향을 고르는 법 | AI에게 넘기는 형식 | 가져갈 것 | 근거 |
|---|---|---|---|---|
| **Google Stitch** | 2026-03 업데이트에서 'vibe design': 사업 목표와 바라는 느낌을 말하면 배치와 부품을 정한다. 주소나 프로젝트에서 디자인 체계를 뽑는다 | **DESIGN.md**를 내보내고 다른 프로젝트에 들인다. 형식 초안을 공개했다. MCP 서버와 SDK | DESIGN.md를 우리 내보내기 형식으로 | [검색 요약] Stitch 공지(X), nervegna 글 · [확인] `@google/design.md` 0.4.0 |
| **Lovable** 디자인 안내 | 요청에 따라 ① 가벼운 디자인 방향 **셋**을 HTML + Tailwind 미리 보기로 보이거나, ② 짧은 디자인 질문을 묻거나, ③ 바로 만든다. 글꼴·색·브랜드를 말했거나, 다른 제품·주소·이름 있는 디자인 체계를 댔거나, 대시보드·관리 화면·게임이면 묻지 않는다 | 프로젝트 코드 | **가져감**: 추천 셋을 앞에 + 작게 그린 미리 보기, '이미 정한 사람에게는 묻지 않기' | [검색 요약] docs.lovable.dev/features/design-guidance |
| **Figma Make** | `guidelines/Guidelines.md`에 일반 규칙과 디자인 체계 규칙을 적는다. 짧게, 구체적으로 | Guidelines.md(하위 폴더로 부품·토큰별 나눔 가능) | '짧고 구체적인 규칙 문장'(막연한 말 대신 값) | [검색 요약] developers.figma.com "Write design system guidelines", help.figma.com |
| **Claude Design** (Anthropic Labs, 2026-04) | 처음에 코드와 디자인 파일을 읽어 색·글자·부품으로 디자인 체계를 만들고 이후 작업에 쓴다. 디자인 체계가 없으면 결과가 "쓸 만하지만 흔하다"고 스스로 말한다. 고칠 때 즉석에서 만든 조절 막대 | PDF·PPTX·HTML·Canva | '디자인 체계를 먼저 정해 두면 결과가 덜 흔해진다' → 설계도 6번을 먼저 읽게 한다 | [검색 요약] anthropic.com/news/claude-design-anthropic-labs, Unite.ai |
| **Anthropic 'frontend aesthetics' 요리책과 `frontend-design` 스킬** | 글자·색·움직임·바탕을 따로 짚고, 영감을 대고, 흔한 기본값을 이름으로 막는다 | 시스템 프롬프트나 CLAUDE.md에 넣는 지시 묶음 | **AI 기본값 무리 다섯**(저장소의 스킬 본문): ① 따뜻한 크림 바탕(#F4F1EA 근처) + 큰 명조 제목 + 테라코타 강조(#D97757 근처) ② 먹색 바탕 + 형광 초록이나 주홍 강조 하나 ③ 신문 같은 가는 선·모서리 0·빽빽한 단 ④ 똑같은 둥근 카드에 같은 회색 그림자·그라데이션 ⑤ 모든 제목 위 대문자 꼬리표, 가운뎃점 이음, 작은 고정폭 글꼴, 버튼 끝 '→'. **설계도의 '하지 말 것'에 넣는다** | [확인] `.claude/skills/frontend-design/SKILL.md`(Apache-2.0) · [검색 요약] platform.claude.com 요리책(2025-10-21) |
| **awesome-design-md** (VoltAgent) | 유명 사이트 디자인을 DESIGN.md로 옮긴 모음(73편 남짓, 2026-09 기준이라는 요약) | 9묶음: 분위기 · 색과 역할 · 글자 규칙 · 부품 · 배치 · 깊이 · 해야/하지 말 것 · **화면 크기별 동작** · **AI에게 주는 예시 요청** | **가져감**: '화면 크기별'과 'AI에게 줄 예시 요청'을 설계도에 넣는다. **버림**: 남의 브랜드를 흉내 낸 프리셋(코드쇼퍼는 실제 회사를 흉내 내는 것을 내지 않는다) | [확인] `oh-my-opencode` 4.18.2 안의 `linear.app.md` 등 70편 사본 · [검색 요약] 저장소 규모 |
| **taste-skill** (공개 스킬) | 다이얼 셋: DESIGN_VARIANCE(1 대칭 ~ 10 비대칭), MOTION_INTENSITY(1 정지 ~ 10 영화 같은), VISUAL_DENSITY(1 미술관 ~ 10 조종석). 4 이상이면 휴대폰에서 한 줄로 접고, 3 넘는 움직임은 동작 줄이기를 반드시 따른다 | 스킬 문서 | **가져감**: 촘촘함·움직임을 '단계'로 고르기. 단, 1~10 대신 3단(초심자가 차이를 볼 수 있는 만큼) | [확인] `oh-my-opencode` 4.18.2의 `taste-skill.md` 7절 |

---

## 3. 공통 패턴: 비전문가가 방향을 정하는 법

### 3.1 방향 고르기

- **한 번에 하나의 큰 결정**: 느낌(무드)을 먼저 고르면 나머지가 따라온다(shadcn 스타일, Lovable 방향 셋, Stitch의 '느낌 말하기'). 세부는 나중에 고친다(tweakcn 슬라이더, Claude Design 조절 막대).
- **고르는 순간 그럴듯한 화면에 칠해 보인다**(Realtime Colors, tweakcn, Lovable). 색 견본 칸만 보여 주는 도구는 없다.
- **이미 정한 사람에게는 묻지 않는다**(Lovable). 코드쇼퍼에서는 '직접 쓰기'에 색 이름이 있으면 대표 색 줄을 그 색으로 채워 둔다.
- **추천은 셋**(Lovable). 여섯을 다 보이되 앱 종류에 맞는 셋을 앞에 둔다.

### 3.2 색

- 역할로 고른다: 바탕·면·글자·약한 글자·선·강조·강조 위 글자·성공·주의·오류(Realtime Colors 다섯 역할, Huemint 세 역할, DESIGN.md 권장 이름 `primary` `secondary` `tertiary` `neutral` `surface` `on-surface` `error`, Untitled UI `text-primary` …).
- 강조색은 하나(Realtime Colors '주색은 주된 행동에만', DESIGN.md 예시 'Do use the primary color only for the single most important action per screen').
- 12단 척도는 개발자용이다. 비전문가에게는 **이름 있는 견본 + 직접 고르기**를 주고, 척도와 짝(글자색·밤 색)은 기계가 만든다(Material 씨앗 색, Huemint 잠금).
- 대비 숫자를 바로 보인다(Realtime Colors, DESIGN.md 린터의 `contrast-ratio`).

### 3.3 글꼴

- 짝으로 고른다: 제목 글꼴 + 본문 글꼴(shadcn `font` + `fontHeading`, Open Props 분류). 많아야 두 가족, 굵기 셋(DESIGN.md 예시 'Don't use more than two font weights on a single screen', 우리 규칙 400·600·700).
- 한글: 영어 도구의 글꼴 목록은 한글이 없다. 한글 글꼴은 따로 골라야 한다(3.4절).

### 3.4 한글 글꼴 후보 (모두 SIL OFL 1.1 [확인] npm `license` 칸)

| 이름 | npm 패키지(판) | 어디서 받나 | 쓰임 |
|---|---|---|---|
| Pretendard | `pretendard` 1.3.9 | jsDelivr·cdnjs·UNPKG, 동적 서브셋 있음. 가변 동적 서브셋 `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`, 가족 이름 `"Pretendard Variable"` | 기본 본문·제목 |
| SUIT | `@sun-typeface/suit` 2.0.5 | npm·공식 사이트 sun.fo/suit | 단정한 UI 본문 |
| Wanted Sans | `wanted-sans` 1.0.3 | npm·GitHub wanteddev | 단정한 UI 본문 |
| 고운돋움 Gowun Dodum | `@fontsource/gowun-dodum` 5.3.0 | Google Fonts·Fontsource | 부드러운 제목·본문 |
| 고운바탕 Gowun Batang | `@fontsource/gowun-batang` 5.3.0 | Google Fonts·Fontsource | 명조 제목 |
| Noto Serif KR | `@fontsource/noto-serif-kr` 5.3.1 | Google Fonts·Fontsource | 명조 제목 |
| 주아 Jua | `@fontsource/jua` 5.3.0 | Google Fonts·Fontsource | 동글동글한 제목 |
| 검은고딕 Black Han Sans | `@fontsource/black-han-sans` 5.3.0 | Google Fonts·Fontsource | 굵은 포스터 제목 |
| 도현 Do Hyeon | `@fontsource/do-hyeon` 5.3.0 | Google Fonts·Fontsource | 굵은 제목 |
| 개구 Gaegu | `@fontsource/gaegu` 5.3.0 | Google Fonts·Fontsource | 손글씨 제목 |
| 나눔손글씨 펜 | `@fontsource/nanum-pen-script` 5.3.0 | Google Fonts·Fontsource | 손글씨 제목 |
| 갈무리 Galmuri | `galmuri` 2.40.3 | npm·galmuri.quiple.dev | 도트(픽셀) 제목 |
| IBM Plex Sans KR | `@fontsource/ibm-plex-sans-kr` 5.3.0 | Google Fonts·Fontsource | 차분한 본문, 숫자 |
| 나눔고딕코딩 | `@fontsource/nanum-gothic-coding` 5.3.0 | Google Fonts·Fontsource | 숫자·코드 |
| Noto Sans KR | `@fontsource/noto-sans-kr` 5.3.1 (가변 `@fontsource-variable/noto-sans-kr`) | Google Fonts·Fontsource | 대체 글꼴 |

- 거른 것: Spoqa Han Sans(npm 라이선스 칸 'SEE LICENSE IN LICENSE', 이번에 원문 확인 못 함), 지마켓 산스·배민 글꼴 같은 회사 무료 글꼴(각자 약관이 있어 OFL 목록과 섞지 않는다).
- 한글 글꼴은 무겁다(`@fontsource/noto-sans-kr` 묶음 풀린 크기 51.6MB [확인] — 글자 범위별로 잘린 파일들의 합이다). 그래서 설계도는 **동적 서브셋(Pretendard)이나 Google Fonts 주소처럼 쓰는 글자만 받는 방식**을 지시하고, 가족은 둘까지로 막는다.

### 3.5 모양·간격·깊이·밝기

- 모서리는 4~5단(shadcn none·small·medium·large, DESIGN.md `rounded` sm·md·lg·xl·full).
- 촘촘함과 움직임은 다이얼(taste-skill). 초심자에게는 3단이면 차이가 보인다.
- 깊이는 '그림자로 띄우기'와 '선·면 색으로 나누기' 중 하나(DESIGN.md Elevation & Depth 설명).
- 밝기: shadcn·Material은 밝음·어두움을 늘 함께 낸다. DESIGN.md 0.4.0 형식에는 **밝음·어두움 개념이 없다**(4.3절).

### 3.6 나눔(분류) 정리 → 코드쇼퍼의 말로

| 축 | 바깥 서비스의 말 | 코드쇼퍼에서 쓰는 말과 범위 |
|---|---|---|
| 앱 종류 | App category(Mobbin), industry(InspoAI) | 이미 있는 6종: 기록장 · 신청서·설문 · 안내 페이지 · 퀴즈 · 계산기·도우미 · 현황판·알림 (`q.type`) |
| 화면 종류 | Screens, page types | 첫 화면 · 목록 · 쓰기(입력) · 자세히 보기 · 결과 · 완료 · 설정 · 로그인 · 사용법 (`types.*.screens`의 `name`) |
| 상태 | UX patterns(Empty State …) | 불러오는 중 · 비어 있음 · 오류 · 저장됨 · 꺼진 버튼과 그 이유 (모든 앱에 공통으로 넣는다) |
| 부품 | UI elements | 머리줄 · 주 버튼 · 보조 버튼 · 글 버튼 · 입력 칸 · 고르기(하나·여러 개) · 목록 줄 · 카드 · 칩·꼬리표 · 아래 메뉴·탭 · 진행 표시 · 알림 상자 · 토스트 · 확인 대화 상자 · 표 · 숫자 카드 · 그래프 |
| 흐름 | Flows | 쓰기 → 저장 → 목록 / 작성 → 제출 → 완료 / 시작 → 문제 → 결과 / 입력 → 결과 / 목록 → 자세히 → 고치기·지우기 |

---

## 4. AI 코딩 도구가 잘 따르는 형식

### 4.1 DESIGN.md (Google, `@google/design.md` 0.4.0, 형식판 alpha) [확인]

- 두 겹이다: 맨 위 YAML(`---`로 감쌈)에 **디자인 값**, 아래 마크다운에 **이유와 쓰는 법**. "값이 기준이고, 글은 값을 어떻게 쓰는지 알려 준다."
- YAML 칸: `version`, `name`, `description`, `omitted`, `colors`, `typography`(fontFamily·fontSize·fontWeight·lineHeight·letterSpacing·fontFeature·fontVariation), `rounded`, `spacing`, `components`(backgroundColor·textColor·typography·rounded·padding·size·height·width). 참조는 `{colors.primary}`.
- 마크다운 묶음 순서(`##`, 영어 이름이 정확히 같아야 순서 검사가 알아본다): Overview(Brand & Style) → Colors → Typography → Layout(Layout & Spacing) → Elevation & Depth(Elevation) → Shapes → Components → Do's and Don'ts. 모르는 제목(`## Motion` 같은)은 지우지 않고 둔다. 같은 제목이 둘이면 파일을 거부한다.
- 명령: `npx @google/design.md lint DESIGN.md`(JSON, 오류 있으면 종료 코드 1), `diff 옛.md 새.md`, `export --format css-tailwind|json-tailwind|dtcg`, `spec --rules`.
- 린터 규칙: `broken-ref`(오류), `missing-primary`, `contrast-ratio`(부품의 글자·바탕이 4.5:1 미만), `orphaned-tokens`(어떤 부품도 안 쓰는 색), `missing-typography`, `section-order`(경고), `token-summary`, `missing-sections`(정보).

### 4.2 이 저장소에서 돌려 본 결과 [잼]

7.2절의 견본(급식 안내 페이지, 깔끔하게·파랑·밝음+어두움)을 돌렸다.

| 시도 | 결과 | 배운 것 |
|---|---|---|
| 한글 이름·한글 설명, 영어 `##` 제목 | 오류 0 | 한글은 문제없다. 제목만 영어 이름 그대로 둔다 |
| 밤 색(`primary-dark` …)을 색으로만 둠 | `orphaned-tokens` 경고 5개 | 밤 색도 `button-primary-dark` 같은 부품에서 써야 한다 |
| 입력 칸 테두리(#7B8494, 흰 바탕 3.77:1)를 `textColor`로 둠 | `contrast-ratio` 경고(4.5:1 미만) | 테두리처럼 **글자가 아닌 색**(기준 3:1)은 `backgroundColor`만 있는 1px 부품으로 적는다 |
| 위 둘을 고친 최종본 | **오류 0 · 경고 0 · 정보 1**, 색 16 · 글자 6 · 모서리 4 · 간격 7 · 부품 11. 파일 3.8KB(gzip 1.5KB) | 이 꼴로 낸다 |
| `export --format css-tailwind` | `@theme { --color-primary: #1d63d6; … --text-body-md: 16px; --radius-md: 8px; --spacing-gutter: 16px; … }` 45줄 | **줄 높이(`--text-*--line-height`)가 빠진다.** 그래서 설계도의 CSS 묶음은 우리가 직접 만든다(7.3절) |

### 4.3 AI에게 디자인을 넘길 때 잘 되는 것과 안 되는 것

| 잘 되는 것 | 근거 |
|---|---|
| 숫자 값(색 코드, px, 굵기)과 그 값을 쓰는 곳을 함께 적기 | DESIGN.md '값이 기준', Figma Make '구체적인 규칙' |
| 하지 말 것을 이름으로 막기(크림+테라코타, 같은 카드 반복, 버튼 끝 '→' …) | Anthropic 요리책·스킬 |
| 화면마다 부품 목록과 상태(빈·오류·불러오는 중) | Refero 패턴, awesome-design-md '부품' |
| 화면 크기별 동작(360px 한 줄, 넓으면 최대 폭) | awesome-design-md 'Responsive Behavior' |
| AI에게 그대로 줄 예시 요청 문장 | awesome-design-md 'Agent Prompt Guide' |
| 짧게(맥락이 넘치면 헷갈린다) | Figma Make 안내 |

| 안 되는 것 | 이유 |
|---|---|
| "예쁘게", "모던하게"만 쓰기 | 값이 없으면 AI 기본값 무리로 간다(요리책) |
| 남의 앱 캡처를 붙여 "이렇게" | 저작물이고, 무료 채팅 AI는 그림을 못 받을 수 있고, 그대로 베끼게 된다 |
| 남의 브랜드 이름으로 "○○처럼" | 흉내가 된다. 코드쇼퍼는 실제 회사를 흉내 내는 결과물을 내지 않는다 |
| 밝음·어두움을 DESIGN.md에만 맡기기 | 형식에 밝기 개념이 없다(4.2절). CSS 묶음에서 `prefers-color-scheme`으로 따로 준다 |

---

## 5. 코드쇼퍼의 '디자인 정하기'

### 5.1 어디에 두나

| 자리 | 무엇 | 주 버튼 |
|---|---|---|
| 1단계 느낌 질문(`q.style`) | 느낌 타일 6 + '직접 쓰기' 줄 + '모르겠어요' 줄. 그 아래 글 버튼 **"색·글꼴까지 직접 정하기"** | 없음. 타일을 누르면 지금처럼 바로 다음 질문(D19). 끝 질문이면 아래 막대 [도구 고르러 가기] |
| 디자인 정하기 시트 (`LookSheet`, 모달 시트) | 미리 보기 + 줄 12개. 줄을 누르면 시트 안에서 화면이 넘어간다(뒤로 ‹) | [다 정했어요] (시트를 닫는다. 느낌 질문에서 열었으면 다음 질문으로) |
| 4단계 '설계도' 칸 | '디자인' 묶음: 작은 미리 보기 96×170 + 세 줄(느낌·색·글꼴) + 글 버튼 [디자인 바꾸기] [DESIGN.md 따로 받기] | 그대로 [설계도 내려받기 (.md)] |
| 지도 | 느낌을 고르면 내 지도의 땅·물·공원 색이 바뀐다(지금 동작, `data-palette`). 새 느낌 둘은 있는 팔레트에 잇는다: 포근하게 → `cute`, 오락실처럼 → `bold` | — |
| 도착 장면 S6 '건네드릴 것' | 청사진 카드 귀퉁이에 고른 색 세 점과 제목 글꼴의 '가' 한 글자를 정지 그림으로 찍는다. 새 움직임은 없다(장면 3.0초 상한 그대로) | — |

- 디자인은 도구 추천·막힌 곳 계산에 영향을 주지 않는다. 그래서 4단계에서 바꿔도 영수증·도구는 그대로다. 설계도 6번과 DESIGN.md만 다시 만든다.
- 둘러보는 곳에 '느낌 둘러보기' 페이지를 두는 것은 BACKLOG로 미룬다(여섯 느낌 × 여섯 앱 종류 미리 보기, 검색 유입용).

### 5.2 화면 (360px)

**1단계 느낌 질문**

```text
1/4 · 만들 앱 정하기
어떤 느낌이면 좋을까요?                        H1 22/700
고르면 내 지도가 그 느낌으로 칠해져요.           17/27 --text-2
┌───────────────┐ ┌───────────────┐
│ [미리 보기 판]  │ │ [미리 보기 판]  │   타일 156×132 (D70 꼴). 위 72 판:
│ 깔끔하게  추천  │ │ 차분하고 믿음직하게│   느낌 팔레트로 칠한 지도 땅 위에
└───────────────┘ └───────────────┘   그 느낌의 폰 실루엣 44×72(머리줄·
┌───────────────┐ ┌───────────────┐   카드 하나·주 버튼)을 세운 그림
│ 포근하게        │ │ 귀엽게          │
└───────────────┘ └───────────────┘   앞 셋 = 앱 종류 추천 순서(5.4절)
┌───────────────┐ ┌───────────────┐
│ 강렬하게        │ │ 오락실처럼       │
└───────────────┘ └───────────────┘
│ ✎ 직접 쓰기                      › │ 줄 56 → 누르면 한 줄 입력 칸이 그 자리에 열림
│ 모르겠어요 (앱에 맞춰 골라 드려요)   │ 줄 56
  색·글꼴까지 직접 정하기               글 버튼 (누르는 곳 44)
```

- '직접 쓰기'를 열면: 라벨 "원하는 느낌을 한 줄로", 도움말 "예: 바다처럼 시원하게, 우리 학교 초록색으로", 40자, [이대로 정하기] 보통 버튼 48. 정하면 아래에 반영한 결과를 한 줄로 알린다(5.6절).

**디자인 정하기 시트**

```text
╭ 디자인 정하기                              ✕ ╮  머리 56
│        ┌──────────────┐                     │
│        │  폰 미리 보기  │  146×260            │  role="img", 요약 글
│        │  (6장 참고)   │                     │
│        └──────────────┘                     │
│   [ 밝게 | 어둡게 ]  ← '둘 다'일 때만         │  칸 고르개 2칸
│   ✓ 글자가 잘 보여요 · 버튼 5.5:1 · 본문 16.4:1│  14/600, role="status"
├─ 모습 ─────────────────────────────────────┤
│ 느낌        깔끔하게                       › │  목록 줄 56
│ 대표 색     ● 파랑                         › │
│ 밝기        밝게만                         › │
│ 글꼴        기본 고딕 (Pretendard)          › │
│ 모서리      살짝 둥글게                     › │
│ 촘촘함      보통                           › │
├─ 더 보기 ──────────────────────────────────┤
│ 움직임      살짝                           › │
│ 아이콘      선 아이콘 (Lucide)              › │
│ 그림·사진   그림 없이                       › │
│ 첫 화면 배치 오늘 정보 크게                  › │
├─ 내 말로 ──────────────────────────────────┤
│ 바라는 점   (비어 있음)                     › │
│ 닮고 싶은 앱 (비어 있음)                    › │
│   처음 값으로 되돌리기                         │  글 버튼
├─────────────────────────────────────────────┤
│ 디자인 정하기 · 느낌만 골랐어요                 │  상태 한 줄
│ [              다 정했어요              ]    │  56
╰─────────────────────────────────────────────╯
```

- 줄을 누르면 시트 안 화면이 바뀐다: 제목(예: "대표 색") + 작은 미리 보기 120×214 + 보기 + 직접 쓰기. 왼쪽 위 ‹ 뒤로. 고르는 즉시 미리 보기와 대비 줄이 바뀌고 저장된다(만들 앱 정하기 답과 같은 방식). 시트를 닫아도 고른 것은 남는다.
- 시트 안 묶음은 셋(모습·더 보기·내 말로), 줄은 12개다. 묶음 사이 32, 제목 19/600(brief 5.2·5.6 그대로).
- 768px 이상: 시트를 가운데 최대 폭 640으로 열고, 미리 보기를 왼쪽 240 열에 붙박이로 둔다(오른쪽 줄 목록만 넘긴다).
- 글자 200%: 미리 보기를 줄 목록 아래로 내리고 96×170으로 줄인다.

### 5.3 고를 것 (기본값과 직접 쓰기)

| 줄 | 묻는 말 (H, 해요체) | 보기 | 기본값 | 직접 쓰기 | 설계도에 들어가는 곳 |
|---|---|---|---|---|---|
| 느낌 | 어떤 느낌이면 좋을까요? | 깔끔하게 · 귀엽게 · 차분하고 믿음직하게 · 강렬하게 · 포근하게 · 오락실처럼 | '모르겠어요'면 앱 종류 표(5.4절) | 한 줄 40자 → 낱말표로 느낌·색 반영 | 6-1 전체 느낌 |
| 대표 색 | 어떤 색을 주로 쓸까요? | 파랑 · 남색 · 청록 · 초록 · 주황 · 빨강 · 분홍 · 보라 · 갈색 · 먹색 (원 44, 이름 아래) | 느낌의 기본 색 | 색 고르개(`<input type="color">`) + `#코드` 칸 + 색 이름(예: 학교 상징색) 20자 | 6-2 색, CSS 묶음 |
| 밝기 | 밝은 화면만 만들까요? | 밝게만 · 어둡게만 · 둘 다(기기 설정 따라) | 밝게만 | — | 6-2, CSS `@media (prefers-color-scheme: dark)` |
| 글꼴 | 글자 모양을 골라 볼까요? | 기본 고딕 · 단정한 고딕 · 부드러운 고딕 · 명조 제목 · 동글동글 제목 · 굵은 제목 · 손글씨 제목 · 도트 제목 (견본 SVG) | 느낌의 짝 | 글꼴 이름 30자 | 6-3 글자. 직접 쓴 글꼴은 9번 '알아볼 것'에 라이선스 확인을 더함 |
| 모서리 | 모서리를 얼마나 둥글게 할까요? | 각지게 · 살짝 둥글게 · 둥글게 · 아주 둥글게 | 느낌별 | — | 6-6 모양 |
| 촘촘함 | 한 화면에 얼마나 담을까요? | 넉넉하게 · 보통 · 촘촘하게 | 앱 종류별(현황판 촘촘, 안내 페이지 넉넉, 나머지 보통) | — | 6-4 배치, 글자 크기 표 |
| 움직임 | 움직임은 얼마나 넣을까요? | 거의 없이 · 살짝 · 생기 있게 | 살짝 | — | 6-8 움직임 |
| 아이콘 | 아이콘은 어떤 모양으로 할까요? | 선 아이콘(Lucide) · 둥근 아이콘(Phosphor) · 굵은 선(Tabler) · 아이콘 적게 | 느낌별 | 아이콘 묶음 이름 30자 | 6-9 아이콘·그림 |
| 그림·사진 | 그림이나 사진을 넣을까요? | 그림 없이 · 단순한 도형 그림 · 직접 찍은 사진 · 손그림 느낌 | 앱 종류별 | 한 줄 40자 | 6-9 |
| 첫 화면 배치 | 첫 화면을 어떻게 놓을까요? | 앱 종류마다 둘(5.5절) | 앞의 것 | 한 줄 40자 | 3번 화면 목록, 6-4 |
| 바라는 점 | 디자인에서 꼭 바라는 게 있나요? | — | 비어 있음 | 80자 | 6-1 "내 말 그대로" |
| 닮고 싶은 앱 | 닮고 싶은 앱이나 사이트가 있나요? | — + "다른 앱 둘러보기" 링크 목록(8절) | 비어 있음 | 60자 | 6-1 "참고: … 배치와 흐름만 참고" |

- 모든 직접 쓰기 칸: 한 줄로 정리(`oneLine`), 글자 수 표시, `<label>` + 도움말을 `aria-describedby`로 잇는다. **영수증 링크(`#r=`)에는 넣지 않는다**(지금 `freeText`와 같은 규칙). 고른 보기 id와 직접 고른 색 코드(#RRGGBB)는 링크에 넣는다.
- '어둡게만'이나 '둘 다'를 고르면 6-10 접근성에 "어두운 화면에서도 대비를 다시 잰다"를 더한다.

### 5.4 느낌 여섯 (값은 `data/looks.json`, 대비는 모두 [잼])

| | 깔끔하게 `clean` | 귀엽게 `cute` | 차분하고 믿음직하게 `serious` | 강렬하게 `bold` | 포근하게 `warm` (새) | 오락실처럼 `retro` (새) |
|---|---|---|---|---|---|---|
| AI에게 줄 느낌 낱말 | 깔끔한·여백이 넉넉한·정돈된 / clean, airy, orderly | 말랑한·밝은·둥근 / playful, soft, rounded | 단정한·믿음직한·또렷한 / calm, trustworthy, structured | 굵은·또렷한·포스터 같은 / bold, high-contrast, poster-like | 포근한·손편지 같은·느긋한 / warm, gentle, cozy | 도트·오락실·딱딱 끊기는 / retro, pixel, arcade |
| 바탕 묶음 (밝음) | 차가운 회색: 바탕 #FFFFFF, 면 #F5F7FA, 글자 #18202B, 약한 글자 #586272, 입력 테두리 #7B8494, 나눔 선 #E1E5EA | 분홍 기운: #FFFFFF, #FFF1F6, #2B2130, #6B5A68, #8E7C8B, #F2DCE5 | 차가운 회색(깔끔하게와 같음) | 먹: #FFFFFF, #F1F1F1, #0A0A0A, #4A4A4A, 테두리 #0A0A0A **2px**, #D4D4D4 | 따뜻한 회색: #FFFFFF, #F7F4F0, #2A2420, #6A5F57, #8C8178, #E8E1DA | 차가운 회색 |
| 바탕 묶음 (어두움) | #111418, #1A1E24, #ECEEF1, #A9B0BA, #737C88, #2A3038 | #161216, #211A20, #F5ECF1, #BCA9B5, #86727F, #33282F | 차가운 회색 | #0D0D0D, #1A1A1A, #F5F5F5, #B5B5B5, #F5F5F5, #333333 | #15120F, #1F1B17, #F1ECE6, #B3A99F, #857A70, #312B25 | 차가운 회색 |
| 기본 대표 색 | 파랑 #1D63D6 | 분홍 #B8236F | 남색 #2A3B8F | 빨강 #C42B36 | 초록 #1B7A4A | 보라 #6A45D1 |
| 글꼴 짝 | 기본 고딕 | 동글동글 제목(주아) + Pretendard | 기본 고딕(숫자 `tabular-nums`) | 굵은 제목(검은고딕) + Pretendard | 부드러운 고딕(고운돋움 제목) + Pretendard | 도트 제목(갈무리) + Pretendard |
| 모서리 (작은·보통·큰) | 살짝 둥글게 6·8·12 | 아주 둥글게 버튼 알약·카드 20 | 각지게 4·4·6 | 각지게 0·2·4 | 둥글게 10·14·20 | 각지게 0·0·0 |
| 깊이 | 선으로 나눔, 떠 있는 것만 그림자 | 부드러운 그림자 | 선만 | 2px 먹 테두리, 그림자 없음 | 아주 옅은 그림자 + 따뜻한 면 | 2px 테두리 + 어긋난 그림자 `4px 4px 0` 글자색 |
| 아이콘 | Lucide | Phosphor | Lucide | Tabler(선 2) | Phosphor | Tabler |
| 그림 | 그림 없이 | 단순한 도형 그림 | 그림 없이 | 큰 색 면(도형) | 손그림 느낌 | 도트 그림 |
| 움직임 기본 | 살짝 | 생기 있게 | 거의 없이 | 살짝(짧고 빠르게) | 살짝 | 살짝(`steps()`로 끊어서) |
| 잰 대비 (밝음) 글자/바탕 · 약한 글자/면 · 테두리/바탕 · 버튼 흰 글자 · 강조/면 | 16.40 · 5.75 · 3.77 · 5.51 · 5.14 | 15.41 · 5.83 · 3.88 · 5.99 · 5.46 | 16.40 · 5.75 · 3.77 · 9.90 · 9.23 | 19.80 · 7.85 · 19.80 · 5.61 · 4.96 | 15.31 · 5.65 · 3.80 · 5.34 · 4.87 | 16.40 · 5.75 · 3.77 · 6.20 · 5.78 |
| 잰 대비 (어두움) 글자/바탕 · 약한 글자/면 · 테두리/바탕 · 버튼(진한 글자) · 강조/면 | 15.89 · 7.65 · 4.37 · 8.45 · 7.55 | 16.03 · 7.69 · 4.18 · 8.77 · 7.98 | 15.89 · 7.65 · 4.37 · 9.32 · 8.33 | 17.83 · 8.49 · 17.83 · 8.48 · 7.88 | 15.89 · 7.41 · 4.46 · 10.50 · 9.59 | 15.89 · 7.65 · 4.37 · 8.88 · 7.94 |

- **AI 기본값 무리를 피한 방법**: '귀엽게'는 크림 바탕 대신 흰 바탕 + 분홍 기운 면, 주황 대신 분홍(①을 피함). '강렬하게'는 먹색 바탕 + 형광 강조 대신 흰 바탕 + 굵은 먹 글자 + 빨강 면(②를 피함, 어둡게를 골라도 강조는 형광이 아닌 #FF8E8E). '포근하게'는 따뜻한 면을 쓰되 명조 제목·테라코타를 쓰지 않는다(①). 같은 카드를 늘어놓는 SaaS 꼴(④)은 '하지 말 것'으로 막는다.
- **'모르겠어요'와 추천 순서** (앞 셋이 타일 앞줄, 첫째에 '추천'):

| 앱 종류 | 추천 셋 (순서대로) | 촘촘함 | 그림 |
|---|---|---|---|
| 기록장 `record` | 포근하게 · 깔끔하게 · 귀엽게 | 보통 | 손그림 느낌 |
| 신청서·설문 `form` | 차분하고 믿음직하게 · 깔끔하게 · 포근하게 | 보통 | 그림 없이 |
| 안내 페이지 `page` | 깔끔하게 · 포근하게 · 강렬하게 | 넉넉하게 | 단순한 도형 그림 |
| 퀴즈 `quiz` | 귀엽게 · 오락실처럼 · 강렬하게 | 보통 | 단순한 도형 그림 |
| 계산기·도우미 `tool` | 깔끔하게 · 차분하고 믿음직하게 · 오락실처럼 | 보통 | 그림 없이 |
| 현황판·알림 `board` | 차분하고 믿음직하게 · 깔끔하게 · 강렬하게 | 촘촘하게 | 그림 없이 |
| 못 정함 `unknown` | 깔끔하게 · 귀엽게 · 차분하고 믿음직하게 | 보통 | 그림 없이 |

### 5.5 나머지 보기의 값

**대표 색 10** (밝은 화면 버튼 / 어두운 화면 버튼 / 옅은 면). 버튼 글자는 밝은 화면에서 흰색, 어두운 화면에서 #0B1220이다. 10색 × 바탕 4묶음 × 밝기 2 = 80쌍에서 '강조색 글자 / 면'이 모두 4.5:1 이상이다(가장 낮은 값 4.52) [잼].

| 색 | 밝음 | 흰 글자 | 어두움 | 진한 글자 | 옅은 면 |
|---|---|---|---|---|---|
| 파랑 | #1D63D6 | 5.51 | #7AB0FF | 8.45 | #EAF2FF |
| 남색 | #2A3B8F | 9.90 | #A3B3FF | 9.32 | #ECEFFC |
| 청록 | #0B7A80 | 5.11 | #5FD3D6 | 10.50 | #E3F6F6 |
| 초록 | #1B7A4A | 5.34 | #6FD69C | 10.50 | #E6F5EC |
| 주황 | #B9470B | 5.29 | #FFA066 | 9.34 | #FDEEE4 |
| 빨강 | #C42B36 | 5.61 | #FF8E8E | 8.48 | #FDECEC |
| 분홍 | #B8236F | 5.99 | #FF8CC8 | 8.77 | #FCEAF3 |
| 보라 | #6A45D1 | 6.20 | #B9A6FF | 8.88 | #F0ECFC |
| 갈색 | #8A5634 | 6.07 | #E0B48F | 9.89 | #F5EDE6 |
| 먹색 | #1F2937 | 14.68 | #E5E7EB | 15.12 | #ECEEF1 |

- 노랑은 견본에 넣지 않는다(흰 글자 1.64:1). 직접 고르면 아래 규칙대로 검은 글자를 쓴다.
- '오류'는 빨강 #C42B36 / #FF8E8E, '성공'은 초록 #1B7A4A / #6FD69C로 고정한다. 대표 색이 빨강이면 오류에 경고 그림과 글을 꼭 붙이라고 6-8에 적는다(색만으로 뜻을 전하지 않기).

**직접 고른 색 규칙** (엔진, 순수 함수, OKLCH, 새 의존성 없음):
1. 버튼 바탕은 고른 색 그대로 둔다. 버튼 글자는 흰색과 #111111 중 4.5:1을 넘는 쪽(둘 다 넘으면 흰색). 어떤 색이든 둘 중 하나는 4.5:1을 넘는다(회색 256단에서 가장 불리한 #757575도 4.61:1 [잼]).
2. 글자·링크로 쓸 색은 바탕과 옅은 면 **둘 다**에서 4.5:1이 될 때까지 OKLCH 밝기 L을 0.01씩 낮춘다(색상 H 유지, 채도 C는 색 범위 안으로 줄임).
3. 어두운 화면 색은 어두운 면에서 4.5:1이 될 때까지 L을 올리고, 버튼 글자는 #0B1220.
4. 옅은 면은 L 0.96, C는 0.03 이하.
- 예 [잼]: 흔한 학교 초록 #00A651 → 흰 글자 3.0:1이라 버튼 글자 #111111(5.91:1), 글자색 #068641(흰 바탕 4.67:1), 어두운 화면은 그대로 #00A651(#1A1E24 위 5.24:1). 노랑 #FFD400 → 버튼 글자 #111111(13.19:1), 글자색 #8B7301(4.61:1).
- 시트에는 결과를 말로 보인다: "버튼 글자를 검게 했어요. 흰 글자는 3.0:1이라 잘 안 보여요." [흰 글자로 두기]를 누르면 버튼 바탕을 4.5:1이 될 때까지 진하게 바꾼 색을 보이고 고르게 한다.

**글꼴 짝 8** (제목 / 본문). 제목 글꼴은 20px 이상 제목에만, 본문은 늘 읽기 쉬운 고딕 16px 이상.

| 짝 | 제목 | 본문 | 숫자 |
|---|---|---|---|
| 기본 고딕 | Pretendard 700 | Pretendard 400 | Pretendard `tabular-nums` |
| 단정한 고딕 | SUIT 700 | SUIT 400 | 같음 |
| 부드러운 고딕 | 고운돋움 | Pretendard | Pretendard |
| 명조 제목 | 고운바탕 700 | Pretendard | Pretendard |
| 동글동글 제목 | 주아 | Pretendard | Pretendard |
| 굵은 제목 | 검은고딕 | Pretendard | Pretendard |
| 손글씨 제목 | 개구 700 | Pretendard | Pretendard |
| 도트 제목 | 갈무리 | Pretendard | 갈무리(작은 숫자 판에만) |

- 글꼴 받는 법(설계도에 적음): Pretendard는 위 jsDelivr 가변 동적 서브셋 한 줄, 나머지는 Google Fonts 주소 한 줄이나 React + Vite면 `npm i @fontsource/jua` → `import '@fontsource/jua';`. SUIT·갈무리는 각 공식 안내의 CSS 한 줄. 판 번호는 `data/looks.json`의 `checkedAt`과 함께 둔다.

**모서리 4단**: 각지게(작은 2 · 보통 4 · 큰 6) · 살짝 둥글게(6 · 8 · 12) · 둥글게(10 · 14 · 20) · 아주 둥글게(버튼 알약 9999 · 카드 20 · 큰 판 24). 느낌이 정한 값이 있으면 그 값이 기본이다.

**촘촘함 3단** (간격 바탕 4px):

| | 화면 양옆 | 묶음 사이 | 줄 높이 | 본문 | 제목 | 누르는 곳 |
|---|---|---|---|---|---|---|
| 넉넉하게 | 20 | 40 | 64 | 17/1.65 | 28/1.3 | 48 |
| 보통 | 16 | 32 | 56 | 16/1.6 | 26/1.35 | 48 |
| 촘촘하게 | 16 | 24 | 48 | 16/1.5 | 22/1.35 | 44 |

- 촘촘하게도 누르는 곳은 44 아래로 내리지 않는다(WCAG 2.2의 2.5.8은 최소 24×24 CSS px, 우리는 44를 권한다). 표 줄만 40까지.

**움직임 3단** (모두 `prefers-reduced-motion: reduce`면 끈다. 끝없이 도는 움직임과 스크롤을 가로채는 움직임은 금지):
- 거의 없이: 누를 때 100ms 눌림(0.98)만.
- 살짝: 눌림 + 화면 바뀔 때 200ms 흐려졌다 나타나기 + 목록에 더해질 때 150ms.
- 생기 있게: 위에 더해, 정답·완료처럼 사건이 있을 때만 한 번 600ms 이하의 짧은 축하. 튀는 곡선 `cubic-bezier(0.34, 1.56, 0.64, 1)`.

**아이콘 4** [확인 npm]: 선 아이콘 Lucide(`lucide-static` 1.56.0, ISC) · 둥근 아이콘 Phosphor(`@phosphor-icons/core` 2.1.1, MIT) · 굵은 선 Tabler(`@tabler/icons` 3.49.0, MIT) · 아이콘 적게(글자 버튼 위주). 공통 규칙: 한 묶음만, 크기 20·24, 이모지를 아이콘으로 쓰지 않기, 아이콘만 있는 버튼에는 이름표(`aria-label`).
- 넣지 않은 것: Remix Icon — npm `license` 칸은 'Apache-2.0'인데 패키지 안 `License` 파일은 "Remix Icon License v1.0 – January 2026"이다 [확인]. 칸과 원문이 달라 목록에서 뺀다. Hugeicons 무료판(MIT)은 유료판과 이름이 섞여 초심자가 헷갈릴 수 있어 뺀다.

**그림·사진 4**: 그림 없이 · 단순한 도형 그림(AI가 SVG로 직접 그림) · 직접 찍은 사진 · 손그림 느낌(SVG 선을 일부러 조금 흔들기). 공통 규칙: 다른 사이트의 그림·사진·로고를 가져오지 않는다. 학생 얼굴 사진을 넣지 않는다. 사진에는 대체 글을 단다.

**첫 화면 배치** (앱 종류마다 둘, 앞의 것이 기본. 화면 이름은 `types.*.screens[0].name`):

| 앱 종류 | 기본 | 다른 하나 |
|---|---|---|
| 안내 페이지 | 오늘 정보 크게 + 날짜 넘기기(‹ 오늘 ›) | 한 주를 목록으로 한눈에 |
| 신청서·설문 | 한 화면에 모든 칸 (칸 6개 이하) | 한 번에 한 질문 + 진행 표시 |
| 기록장 | 최근 기록 목록 + 아래에 [쓰기] 버튼 | 달력에서 날짜 고르기 |
| 퀴즈 | 한 문제씩 + 진행 막대 | 한 화면에 모든 문제 |
| 계산기·도우미 | 입력 위, 결과 아래 한 화면 | 입력 → 결과 두 화면 |
| 현황판·알림 | 숫자 카드 셋 + 아래 목록 | 그래프 먼저 |

### 5.6 직접 쓴 말을 반영하는 법 (AI 없이)

- `data/looks.json`의 `keywords` 표로 **찾기만** 한다. 순서: 직접 고른 값 > 직접 쓴 말에서 찾은 값 > 앱 종류 기본값.
  - 색 낱말 → 대표 색: 바다·하늘·시원 → 청록, 숲·풀·초록·녹색 → 초록, 파랑·파란 → 파랑, 남색·네이비 → 남색, 빨강·빨간 → 빨강, 분홍·핑크 → 분홍, 보라 → 보라, 주황·오렌지 → 주황, 갈색·커피·나무 → 갈색, 검정·까만·흑백 → 먹색.
  - 느낌 낱말 → 느낌: 깔끔·심플·단순 → 깔끔하게, 귀엽·아기자기·말랑 → 귀엽게, 차분·믿음·공식·고급 → 차분하고 믿음직하게, 강렬·힙·눈에 띄 → 강렬하게, 포근·따뜻·편안 → 포근하게, 레트로·도트·오락실·게임 → 오락실처럼.
  - 밝기 낱말: 어둡·다크·밤 → 둘 다(어둡게만이 아니라 둘 다로 둔다. 낮에도 읽혀야 한다).
- 찾은 결과를 상태 줄과 `aria-live`로 말한다: "‘바다처럼 시원하게’에서 ‘바다’를 찾아 청록으로 맞췄어요. 바꾸려면 대표 색을 누르세요." 아무것도 못 찾으면: "고른 값은 그대로 두고, 이 말은 설계도에 그대로 넣을게요."
- 설계도 6-1에는 늘 원문을 넣는다: `내가 바란 느낌 (내 말 그대로): "바다처럼 시원하게"` + 지시 "아래 값은 출발점이야. 이 말에 더 맞게 바꿔도 되지만 대비 4.5:1과 6-11 하지 말 것은 지켜 줘."
- 글꼴 이름을 직접 쓰면 9번 '만들기 전에 알아볼 것'에 조사 카드 하나를 더한다: "글꼴 라이선스 — 무엇을: 이 글꼴을 웹에서 무료로 써도 되는지 / 어디서: 글꼴을 만든 곳의 라이선스 원문 / 확인됐다고 볼 기준: SIL OFL이거나 '웹 사용 허용'이 원문에 있음. 확인이 안 되면 Pretendard로 한다."

---

## 6. 미리 보기를 그리는 법

### 6.1 폰 미리 보기 (`LookPreview`)

- **우리 HTML·CSS로 그린다.** 앱 종류의 첫 화면(`types.*.screens[0]`)과 고른 첫 화면 배치를 작은 폰 틀(146×260, 테두리 1px `--hairline`, 모서리 20) 안에 실제 요소로 놓는다: 머리줄(제목) → 주요 내용(목록 줄 둘·카드 하나·숫자 카드 셋 중 배치에 맞는 것) → 주 버튼 → 아래 메뉴(있을 때만).
- 글은 앱 종류별 견본 문장을 `src/copy/ko.ts`의 `look.sample.*`에 둔다: 안내 페이지 "이번 주 급식" / 신청서 "체험학습 신청" / 기록장 "오늘의 기록" / 퀴즈 "우리 반 퀴즈" / 계산기 "용돈 계산기" / 현황판 "미세먼지 현황". 사용자가 쓴 '한 줄'(freeText)이 있으면 제목에 그 앞 12자를 쓴다(미리 보기에서만).
- 색·모서리·간격은 미리 보기 뿌리 요소에 인라인 CSS 변수로 넣는다: `--pv-bg` `--pv-surface` `--pv-text` `--pv-muted` `--pv-line` `--pv-primary` `--pv-on-primary` `--pv-radius-sm|md|lg` `--pv-gap` `--pv-border-w` `--pv-shadow`. 값은 엔진의 `lookSpec()`이 자료에서 만든다. `look.css`는 `var(--pv-*)`만 쓴다. **품질 바닥선(`npm run guard`)에 예외를 하나 더한다**: `.look-preview` 안에서만 `--pv-*`를 허용하고, 코드에 색 값을 직접 쓰는 것은 그대로 막는다.
- **제목 글꼴**: 우리 사이트는 바깥 글꼴을 부르지 않으므로, 빌드 때 `scripts/looks/specimens.ts`가 OFL 글꼴 파일(`@fontsource/*`의 .woff, `pretendard`·`galmuri` 패키지의 파일)에서 견본 문장을 SVG 윤곽선으로 뽑아 `public/look/` 에 둔다. 앱 종류 6 × 글꼴 짝 8 = 제목 48장(장당 gzip 3KB 이하 목표) + 글꼴 줄 견본 8장("가나다 오늘의 앱 123"). 고른 조합 한 장만 `fetch`가 아닌 `<img src>`로 우리 사이트에서 읽는다. 윤곽선은 `fill="currentColor"`가 아니라 `--pv-text`를 쓸 수 없으므로, 밝음·어두움 두 벌을 굽는다(합계 112장, 약 300KB 이하, 한 번에 2장만 받음).
  - 개발 의존성: `opentype.js`(빌드 때만, 화면 JS 0). 크기와 이유를 DECISIONS에 적는다. 견본 SVG에 쓴 글꼴 이름과 OFL 고지를 `THIRD_PARTY_NOTICES.md`에 더한다.
  - 직접 쓴 글꼴은 견본이 없다: 제목을 Pretendard로 그리고 "미리 보기에는 기본 글꼴로 보여요" 한 줄을 붙인다.
- 아이콘: 고른 묶음에서 쓰는 아이콘 넷(홈·추가·검색·설정)만 빌드 때 인라인 SVG로 넣는다(묶음 3 × 4 = 12개).

### 6.2 접근성과 움직임

- 미리 보기 전체가 `role="img"` 하나다. 이름표는 엔진이 만든 요약: "깔끔하게, 파랑, 기본 고딕으로 꾸민 '이번 주 급식' 첫 화면 미리 보기". 안의 요소는 `aria-hidden="true"`·`inert`라 초점이 들어가지 않는다.
- 대비 줄(`role="status"`)은 바뀔 때만 읽는다: "글자가 잘 보여요. 버튼 5.5대 1, 본문 16.4대 1."
- 색 견본은 `role="radiogroup"`의 라디오 10개(원 44, 이름 글자 14/600 아래). 화살표 키로 움직인다. 색 고르개(`input type="color"`)는 기기 창이 뜨므로 **`#코드` 글 칸을 함께 둔다**(키보드·화면 낭독기로도 고를 수 있게). 칸은 `inputmode="text"`, 틀리면 "#과 여섯 자리로 써 주세요. 예: #00A651".
- 미리 보기의 바뀜은 150ms 색 전환만. 동작 줄이기면 0.
- 미리 보기는 '그럴듯한 모습'이지 약속이 아니다. 시트 맨 아래 14px 글: "실제 화면은 내 AI가 만들어서 조금 다를 수 있어요."

### 6.3 예산

| 화면 | 지금 (D70·D71) | 더하는 것 | 싣는 법 |
|---|---|---|---|
| 만들 앱 정하기 | 122.0KB / 140 | 느낌 타일 2개, 낱말표 반영(엔진 약 1KB) | 바로 |
| 디자인 정하기 시트 | — | 시트·미리 보기·OKLCH·DESIGN.md 렌더 약 12KB(gzip, 어림) | 글 버튼을 누를 때 `import()` |
| 설계도 받기 | 135.4KB / 140 | 디자인 묶음 표시, 6번 렌더 | '설계도' 칸을 열 때나 브라우저가 한가할 때 `import()`. [설계도 내려받기]도 같은 묶음을 기다린 뒤 만든다 |
| 견본 SVG | — | 한 번에 2장(약 6KB) | 우리 사이트의 정적 파일 |

`npm run qa:budget`에 디자인 묶음 상한 14KB를 새로 둔다.

---

## 7. 설계도에 들어가는 것

### 7.1 6번 '디자인 지시'의 새 모양 (`pack.headings.design` 그대로)

| 묶음 | 들어가는 것 | 무료 AI 채팅(짧은 판) |
|---|---|---|
| 6-1 전체 느낌 | 느낌 이름, 느낌 낱말(한국어 + 영어 셋), 쓰는 사람, 이 앱에서 하나만 눈에 띄게 할 것(앱 종류별 문장), 내 말 그대로(바라는 점·직접 쓴 느낌), 참고(닮고 싶은 앱 + "배치와 흐름만") | 넣음 |
| 6-2 색 | 역할 표: 바탕·면·글자·약한 글자·입력 테두리·나눔 선·주색·주색 위 글자·옅은 주색·성공·오류 × 밝음(·어두움). 잰 대비. "주색은 화면마다 주 버튼 하나와 링크에만" | 넣음(밝음만, 어두움은 '둘 다'일 때) |
| 6-3 글자 | 글꼴 짝과 받는 법 한 줄, 글자 크기 표(제목 크게·제목·작은 제목·본문 크게·본문·버튼 글·작은 글), 한글 규칙(`word-break: keep-all`, 기울임 쓰지 않기, 본문 16px 이상, 굵기 400·600·700) | 넣음 |
| 6-4 배치와 간격 | 촘촘함 표, 화면 크기별(360px 한 줄 → 768px 이상 최대 폭 720 가운데), 첫 화면 배치, 안전 영역(아래 고정 버튼은 `env(safe-area-inset-bottom)`) | 한 줄로 줄임 |
| 6-5 깊이 | 선으로 나눌지 그림자로 띄울지, 그림자 값 | 뺌 |
| 6-6 모양 | 모서리 작은·보통·큰·알약 | 넣음 |
| 6-7 부품 | 화면마다 부품 목록과 상태(아래 표), 버튼 셋(주·보조·글)의 크기·색·상태(누름·초점·꺼짐) | 주 버튼만 |
| 6-8 움직임 | 고른 단계의 규칙 + 동작 줄이기 | 한 줄 |
| 6-9 아이콘·그림 | 아이콘 묶음과 받는 법, 그림 규칙 | 한 줄 |
| 6-10 접근성 | WCAG 2.2 AA 목록(7.4절) | 넣음 |
| 6-11 해도 되는 것·하지 말 것 | 공통 + 느낌별 + AI 기본값 무리 다섯 | 넣음 |
| 디자인 값 (CSS) | 화면 도구에 맞춘 CSS 변수 묶음(7.3절) + Tailwind v4 쓰는 경우 | 넣음 |
| AI에게 줄 예시 요청 | 첫 화면 하나를 만드는 요청 문장 1개 | 넣음 |

**6-7 부품 표의 출처**: `data/templates.json`의 `types.*.screens[].parts`(지금 한국어 문장)에 부품 id 목록 `components`를 더한다. 예: 안내 페이지 첫 화면 `["header", "date-switcher", "info-card", "source-note", "empty", "error", "loading"]`. id → 이름·규칙 문장은 `data/looks.json`의 `components`에 둔다. 모든 앱에 늘 붙는 상태 셋(불러오는 중·비어 있음·오류)은 공통으로 넣는다.

### 7.2 견본: 급식 안내 페이지 · 깔끔하게 · 파랑 · 둘 다 (코딩 에이전트 판에서 발췌)

```markdown
## 6. 디자인 지시

### 6-1. 전체 느낌
- 느낌: 깔끔하게 (깔끔한, 여백이 넉넉한, 정돈된 / clean, airy, orderly)
- 쓰는 사람: 아무나. 대부분 휴대폰으로 연다.
- 눈에 띄게 할 것 하나: 오늘 급식 메뉴. 나머지는 조용하게 둔다.
- 내가 바란 느낌 (내 말 그대로): "우리 학교 파란색으로"
- 아래 값은 출발점이야. 내 말에 더 맞게 바꿔도 되지만, 대비 4.5:1과 6-11의 하지 말 것은 지켜 줘.

### 6-2. 색
| 역할 | 밝은 화면 | 어두운 화면 | 대비 |
|---|---|---|---|
| 바탕 | #FFFFFF | #111418 | — |
| 면(카드·묶음) | #F5F7FA | #1A1E24 | — |
| 글자 | #18202B | #ECEEF1 | 16.40 / 15.89 |
| 약한 글자 | #586272 | #A9B0BA | 면 위 5.75 / 7.65 |
| 입력 테두리 | #7B8494 | #737C88 | 바탕 위 3.77 / 4.37 (글자가 아닌 것은 3:1 이상) |
| 주색(주 버튼·링크) | #1D63D6 | #7AB0FF | — |
| 주색 위 글자 | #FFFFFF | #0B1220 | 5.51 / 8.45 |
| 오류 | #C42B36 | #FF8E8E | — |
| 성공 | #1B7A4A | #6FD69C | — |
- 주색은 화면마다 주 버튼 하나와 링크에만 쓴다.

### 6-3. 글자
- 글꼴: Pretendard 한 가족. `<head>`에 넣어 줘:
  `<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />`
- 크기: 제목 26/1.35/700 · 작은 제목 20/1.4/700 · 본문 크게 17/1.6 · 본문 16/1.5 · 버튼 글 15/1.4/600 · 작은 글 14/1.45
- 한글: `word-break: keep-all`, 기울임 글꼴을 쓰지 않는다, 본문은 16px 아래로 내리지 않는다.
…
### 6-11. 해도 되는 것·하지 말 것
- 화면마다 주 버튼은 하나만 둔다.
- 똑같은 둥근 카드를 줄줄이 늘어놓고 같은 회색 그림자를 다는 꼴은 쓰지 않는다.
- 모든 제목 위에 영어 대문자 꼬리표를 달거나 버튼 글 끝에 '→'를 붙이지 않는다.
- 이모지를 아이콘으로 쓰지 않는다.
- 참고한 앱의 그림·로고·글을 그대로 가져오지 않는다.
```

**DESIGN.md (따로 받기, 위 견본과 같은 값)** — 이 저장소에서 린터로 오류 0·경고 0을 확인한 꼴이다 [잼]. YAML 부분:

```yaml
---
version: alpha
name: 우리 학교 급식 안내 페이지
description: 코드쇼퍼 설계도 6번에서 만든 디자인 지시. 깔끔하게 · 파랑 · 밝게와 어둡게 둘 다.
colors:
  primary: "#1D63D6"
  on-primary: "#FFFFFF"
  primary-soft: "#EAF2FF"
  neutral: "#F5F7FA"
  surface: "#FFFFFF"
  on-surface: "#18202B"
  on-surface-muted: "#586272"
  outline: "#7B8494"
  error: "#C42B36"
  success: "#1B7A4A"
  primary-dark: "#7AB0FF"
  on-primary-dark: "#0B1220"
  surface-dark: "#111418"
  neutral-dark: "#1A1E24"
  on-surface-dark: "#ECEEF1"
  on-surface-muted-dark: "#A9B0BA"
typography:
  headline-lg: { fontFamily: Pretendard, fontSize: 26px, fontWeight: 700, lineHeight: 1.35, letterSpacing: -0.02em }
  headline-md: { fontFamily: Pretendard, fontSize: 20px, fontWeight: 700, lineHeight: 1.4, letterSpacing: -0.01em }
  body-lg: { fontFamily: Pretendard, fontSize: 17px, fontWeight: 400, lineHeight: 1.6 }
  body-md: { fontFamily: Pretendard, fontSize: 16px, fontWeight: 400, lineHeight: 1.5 }
  label-md: { fontFamily: Pretendard, fontSize: 15px, fontWeight: 600, lineHeight: 1.4 }
  caption: { fontFamily: Pretendard, fontSize: 14px, fontWeight: 400, lineHeight: 1.45 }
rounded: { sm: 6px, md: 8px, lg: 12px, full: 9999px }
spacing: { xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, gutter: 16px, max-width: 720px }
components:
  button-primary: { backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", typography: "{typography.label-md}", rounded: "{rounded.md}", height: 48px, padding: 16px }
  button-secondary: { backgroundColor: "{colors.primary-soft}", textColor: "{colors.primary}", rounded: "{rounded.md}", height: 48px }
  input: { backgroundColor: "{colors.surface}", textColor: "{colors.on-surface}", rounded: "{rounded.md}", height: 48px }
  input-outline: { backgroundColor: "{colors.outline}", height: 1px }
  card: { backgroundColor: "{colors.neutral}", textColor: "{colors.on-surface}", rounded: "{rounded.lg}", padding: 16px }
  helper-text: { backgroundColor: "{colors.surface}", textColor: "{colors.on-surface-muted}", typography: "{typography.caption}" }
  error-text: { backgroundColor: "{colors.surface}", textColor: "{colors.error}" }
  success-text: { backgroundColor: "{colors.surface}", textColor: "{colors.success}" }
  button-primary-dark: { backgroundColor: "{colors.primary-dark}", textColor: "{colors.on-primary-dark}", rounded: "{rounded.md}", height: 48px }
  page-dark: { backgroundColor: "{colors.surface-dark}", textColor: "{colors.on-surface-dark}" }
  card-dark: { backgroundColor: "{colors.neutral-dark}", textColor: "{colors.on-surface-muted-dark}", rounded: "{rounded.lg}" }
---
```

- 본문 `##` 제목은 Overview · Colors · Typography · Layout · Elevation & Depth · Shapes · Components · Motion · Iconography · Accessibility · Do's and Don'ts 순서로, **제목만 영어 이름 그대로**, 내용은 한국어다(린터의 순서 검사가 영어 제목을 정확히 맞춰 본다. Motion·Iconography·Accessibility는 형식 밖 제목이라 그대로 남는다).
- 위 YAML 묶음을 글자 그대로 떼어 본문 제목 11개(Motion·Iconography·Accessibility 포함)와 함께 린터에 넣었다: 오류 0 · 경고 0 · 정보 1 [잼]. 펼친 꼴로 쓴 같은 값도 결과가 같다.

### 7.3 디자인 값 (CSS) 묶음

화면 도구와 밝기에 따라 엔진이 만든다. 이름은 Tailwind v4 이름표(`--color-*` `--font-*` `--text-*` `--text-*--line-height` `--radius-*`)에 맞춘다.

```css
/* 코드쇼퍼 디자인 값 · 깔끔하게 · 파랑 */
:root {
  color-scheme: light dark;            /* '둘 다'일 때만 */
  --color-bg: #FFFFFF;
  --color-surface: #F5F7FA;
  --color-text: #18202B;
  --color-text-muted: #586272;
  --color-border: #7B8494;
  --color-line: #E1E5EA;
  --color-primary: #1D63D6;
  --color-on-primary: #FFFFFF;
  --color-primary-soft: #EAF2FF;
  --color-success: #1B7A4A;
  --color-error: #C42B36;
  --font-sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
  --text-title: 26px;   --text-title--line-height: 1.35;
  --text-subtitle: 20px; --text-subtitle--line-height: 1.4;
  --text-body: 16px;    --text-body--line-height: 1.5;
  --text-label: 15px;   --text-label--line-height: 1.4;
  --text-caption: 14px; --text-caption--line-height: 1.45;
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-full: 9999px;
  --space-gutter: 16px; --space-section: 32px; --tap: 48px; --content-max: 720px;
  --duration-press: 100ms; --duration-screen: 200ms;
}
@media (prefers-color-scheme: dark) {  /* '둘 다'일 때만 */
  :root {
    --color-bg: #111418; --color-surface: #1A1E24; --color-text: #ECEEF1; --color-text-muted: #A9B0BA;
    --color-border: #737C88; --color-line: #2A3038;
    --color-primary: #7AB0FF; --color-on-primary: #0B1220; --color-primary-soft: #16263F;
    --color-success: #6FD69C; --color-error: #FF8E8E;
  }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

| 화면 도구 (2단계에서 고른 것) | 넣는 곳 지시 |
|---|---|
| HTML 파일 한 장 `html-single` | "index.html의 `<style>` 맨 위에 넣고, 모든 색·크기는 이 변수로만 써 줘." |
| React + Vite `react-vite` | "`src/index.css` 맨 위에 넣어 줘. Tailwind CSS v4를 쓰면 `:root` 대신 `@theme { … }` 안에 같은 줄을 넣어 줘(이름이 그대로 `bg-primary`, `text-title`, `rounded-md`가 된다)." |
| 구글 시트 + 앱스 스크립트(화면을 HtmlService로 그릴 때) | HTML 한 장과 같음 |
| 고른 화면 도구가 없을 때 | HTML 한 장과 같음 |

- 어두운 화면의 옅은 주색(#16263F)도 엔진이 OKLCH로 만든다(L 0.26 안팎, C ≤ 0.05). 잰 값: 그 위의 주색 글자 #7AB0FF 6.86:1, 본문 글자 #ECEEF1 13.06:1 [잼]. 바탕 #111418과는 1.22:1이라 면으로만 쓰고 경계는 선이나 글자로 보인다.
- Tailwind 묶음을 따로 만들지 않는 까닭: `@google/design.md export --format css-tailwind`는 줄 높이를 빼먹는다(4.2절). 우리 이름이 이미 Tailwind 이름표와 같으니 한 묶음으로 충분하다.

### 7.4 6-10 접근성 (WCAG 2.2 AA에서 고른 것)

- 글자와 바탕 4.5:1 이상, 큰 글자(24px 이상 또는 굵은 18.66px 이상) 3:1 이상(1.4.3).
- 입력 칸 테두리·아이콘·초점 고리처럼 글자가 아닌 것 3:1 이상(1.4.11).
- 색만으로 뜻을 전하지 않는다. 오류는 색 + 그림 + 글(1.4.1).
- 키보드로 모든 기능을 쓰고, 초점이 보이고(2.1.1, 2.4.7), 고정된 아래 버튼이 초점을 다 가리지 않게 한다(2.4.11).
- 누르는 곳은 최소 24×24 CSS px(2.5.8). 이 설계도는 44 이상을 권한다.
- 끌어서만 되는 동작에는 누르는 방법도 둔다(2.5.7).
- 입력 칸마다 보이는 이름표, 오류는 무엇이 틀렸는지 글로(3.3.1, 3.3.2). 이미 넣은 정보를 다시 묻지 않는다(3.3.7).
- 로그인이 있으면 붙여 넣기와 비밀번호 관리자를 막지 않는다(3.3.8).
- `<html lang="ko">`(3.1.1), 그림에 대체 글(1.1.1), 320px 폭과 글자 200%에서 가로로 밀리지 않게(1.4.10, 1.4.4).
- 움직임은 동작 줄이기 설정을 따른다(2.3.3은 AAA지만 지킨다).
- 국내 기준 KWCAG 2.2는 이번에 원문을 확인하지 못했다(11절). 확인 뒤 다른 점만 한 줄로 더한다.

### 7.5 AI에게 할 말 (대화 카드 둘을 더함, `conversationCards`)

| 카드 | 언제 | 문장 (~해 줘체) |
|---|---|---|
| 디자인 지키며 고치기 | 모양을 바꿀 때 | 설계도 6번(또는 DESIGN.md)의 색·글꼴·모서리 값은 지키면서 (화면 이름)의 (바꿀 것)만 고쳐 줘. 새 색이나 새 글꼴을 더하지 마. |
| 디자인 확인 | 화면을 다 만든 뒤 | 지금 화면을 설계도 6-10 접근성과 6-11 하지 말 것에 하나씩 맞춰 보고, 어긋난 곳을 목록으로 알려 줘. 고치기 전에 나에게 먼저 보여 줘. |

- 카드 복사는 이미 세는 `card_copy` 이벤트(카드 id)를 그대로 쓴다. 새 이벤트는 더하지 않는다(PRD R-60).

### 7.6 AI 종류별 차이 (`aiTools`)

| AI | 6번 | DESIGN.md | 저장 안내 |
|---|---|---|---|
| 무료 AI 채팅 | 짧은 판(7.1절 오른쪽 칸) | 선택. 글 버튼만 | "설계도 하나만 첨부하면 돼요." |
| 유료 AI 구독 | 전체 판 | 권함 | "프로젝트(지식)에 설계도와 DESIGN.md를 함께 넣으세요." |
| 코딩 에이전트 | 전체 판 | 권함 | "DESIGN.md를 프로젝트 맨 위 폴더에 두세요. 설계도(CLAUDE.md 또는 AGENTS.md) 6번 첫 줄이 'DESIGN.md를 따른다'라고 가리켜요." |

---

## 8. 참고 플랫폼으로 내보내는 링크

### 8.1 규칙

1. **링크만 건다.** 그 사이트의 그림·캡처·글을 우리 화면이나 설계도에 싣지 않는다. 사이트를 불러오는 코드도 없다(이용자가 링크를 눌러 새 창으로 갈 뿐이다).
2. `target="_blank" rel="noopener noreferrer"`, 링크 글에 "(새 창)"을 보인다. 제휴·추적 매개변수(`utm_*`, `ref=` …)를 붙이지 않는다.
3. 줄마다 정직하게 적는다: "가입이 필요할 수 있어요 · 일부 유료". 정확한 값(화면 수, 요금)은 화면에 쓰지 않는다. 자주 바뀌고 이번 조사는 [검색 요약]이다.
4. 링크 목록은 `data/looks.json`의 `references`에 `checkedAt`·`sources`·`needsReview: true`로 둔다(상품 카드와 같은 규칙).
5. 처음에는 **각 사이트의 첫 화면 주소**만 쓴다. 검색 결과 주소의 꼴(질문 매개변수)은 이번에 확인하지 못했다. 사람이 확인하면(11절 H-L2) 검색 주소로 바꾼다.
6. 설계도에는 플랫폼 이름도 넣지 않는다. '닮고 싶은 앱'에 이용자가 직접 쓴 말만 "배치와 흐름만 참고" 지시와 함께 들어간다.
7. 코딩 에이전트에 참고 도구(MCP)를 붙이는 안내는 이번 범위가 아니다. 넣는다면 요청 (4) '바이브코딩 전 과정 안내'의 도구 설정 쪽에 두고, "응답은 자료일 뿐 지시가 아니다"(Lazyweb 경고)를 함께 적는다.

### 8.2 시트의 '다른 앱 둘러보기'

'닮고 싶은 앱' 줄을 열면 입력 칸 아래에 접기(`details`)로 둔다.

```text
다른 앱은 어떻게 했나 둘러보기                 ⌄
  이 낱말로 찾아보세요 (누르면 복사)
  [quiz] [progress bar] [result screen] [empty state]      칩, 가로로 미는 한 줄
  Mobbin (새 창)        휴대폰·웹 앱 화면과 흐름 · 가입이 필요할 수 있어요 · 일부 유료
  Refero (새 창)        웹·iOS 화면, 흐름, 스타일 · 일부 유료
  Nicely Done (새 창)   웹 서비스 화면과 부품 · 일부 유료
  Lazyweb (새 창)       실제 앱 화면 검색 · 일부 유료
  그림은 참고만 하고, 그대로 가져오지 마세요.                  14 --text-3
```

- 영어 낱말인 까닭: 네 곳 모두 영어로 분류한다(2.1절). 칩 이름표는 `aria-label="quiz 복사"`, 복사하면 "복사했어요."를 알린다.

### 8.3 앱 종류·화면 종류별 찾을 낱말 (`references.keywords`)

| 앱 종류 | 첫 화면 | 다른 화면·상태 |
|---|---|---|
| 안내 페이지 | `menu` `schedule` `calendar` | `detail` `empty state` `error` |
| 신청서·설문 | `form` `sign up` `survey` | `success` `validation` `stepper` |
| 기록장 | `journal` `notes` `list` | `editor` `empty state` `search` |
| 퀴즈 | `quiz` `progress bar` | `result screen` `onboarding` |
| 계산기·도우미 | `calculator` `converter` | `input` `result` |
| 현황판·알림 | `dashboard` `stats` `chart` | `notifications` `settings` |

---

## 9. 자료·엔진·화면 구현

### 9.1 자료 (`data/looks.json` 새로, 스키마 `schemas/looks.schema.json`)

```jsonc
{
  "version": 1,
  "moods": [{ "id": "clean", "label": "깔끔하게", "keywordsKo": ["깔끔한", "여백이 넉넉한", "정돈된"], "keywordsEn": ["clean", "airy", "orderly"],
              "neutral": "cool", "accent": "blue", "font": "pretendard", "radius": "slight", "depth": "line",
              "icons": "lucide", "imagery": "none", "motion": "subtle", "mapPalette": "clean", "dont": ["…"] }],
  "neutrals": { "cool": { "light": { "bg": "#FFFFFF", "surface": "#F5F7FA", "text": "#18202B", "muted": "#586272", "border": "#7B8494", "line": "#E1E5EA" }, "dark": { … } } },
  "accents": [{ "id": "blue", "label": "파랑", "light": "#1D63D6", "dark": "#7AB0FF", "soft": "#EAF2FF" }],
  "fonts": [{ "id": "jua", "label": "동글동글 제목", "heading": "Jua", "body": "pretendard", "license": "OFL-1.1",
              "load": { "html": "…", "npm": "@fontsource/jua" }, "version": "5.3.0", "checkedAt": "2026-10-14", "sources": ["https://fontsource.org/fonts/jua"] }],
  "radius": { "square": [2, 4, 6], "slight": [6, 8, 12], "round": [10, 14, 20], "pill": [9999, 20, 24] },
  "density": { "airy": { … }, "normal": { … }, "compact": { … } },
  "motion": { "none": { … }, "subtle": { … }, "lively": { … } },
  "iconSets": [{ "id": "lucide", "label": "선 아이콘", "package": "lucide-static", "version": "1.56.0", "license": "ISC", … }],
  "imagery": [ … ],
  "layouts": { "page": [{ "id": "today-big", "label": "오늘 정보 크게" }, { "id": "week-list", "label": "한 주를 목록으로" }], … },
  "defaultsByType": { "record": { "moods": ["warm", "clean", "cute"], "density": "normal", "imagery": "sketch" }, … },
  "components": { "date-switcher": { "label": "날짜 바꾸는 버튼", "rule": "‹ 오늘 › 꼴, 양쪽 버튼 44px, 오늘로 돌아오는 글 버튼" }, … },
  "keywords": { "accent": { "teal": ["바다", "하늘", "시원"], … }, "mood": { "retro": ["레트로", "도트", "오락실", "게임"], … }, "theme": { "both": ["어둡", "다크", "밤"] } },
  "references": [{ "id": "mobbin", "name": "Mobbin", "url": "https://mobbin.com/", "what": "휴대폰·웹 앱 화면과 흐름", "note": "가입이 필요할 수 있어요 · 일부 유료",
                   "checkedAt": "2026-10-14", "needsReview": true, "sources": ["…"] }],
  "referenceKeywords": { "quiz": { "first": ["quiz", "progress bar"], "more": ["result screen", "onboarding"] }, … }
}
```

- 사람이 읽는 문장(느낌 설명·규칙 문장·지시)은 `data/templates.json`의 새 묶음 `look`(설계도 6번 문장)과 `src/copy/ko.ts`의 `look`(화면 문구)에 둔다. `looks.json`에는 값과 이름표만 둔다.
- `npm run validate`에 더한다: 느낌·색·바탕 조합 80쌍 대비 4.5:1, 테두리 3:1, 모든 참조 id가 있는지, 글꼴·아이콘의 `license`가 허용 목록(OFL-1.1·MIT·ISC)인지.
- `questions.json`의 `q.style`에 `warm`·`retro` 보기를 더하고 `alt`를 새 그림에 맞게 고친다('강렬하게' alt "검은 바탕에 노란 글자" → "흰 바탕에 굵은 검은 제목과 빨간 면이 있는 화면 그림"). `unknown`의 `tags`는 `style.clean` 대신 엔진의 앱 종류 기본값으로 푼다.
- `templates.json`의 `styles`(지금 네 개)는 `looks.json`이 대신한다. 옮긴 뒤 지운다.

### 9.2 엔진 (`src/lib/engine/look.ts`, 순수 함수)

```ts
export interface LookChoice {          // Session.look (cc:session:v1에 더함)
  mood?: string; accent?: string;      // accent: 견본 id 또는 '#RRGGBB'
  theme?: 'light' | 'dark' | 'both'; font?: string; radius?: string; density?: string;
  motion?: string; icons?: string; imagery?: string; layout?: string;
  moodText?: string; accentName?: string; fontName?: string; iconsText?: string;   // 직접 쓰기. 영수증 링크에 넣지 않는다
  imageryText?: string; layoutText?: string; note?: string; refs?: string;
}
export function lookSpec(cat: Catalog, r: EngineResult): LookSpec;          // 기본값 풀기 + 낱말표 반영 + 색 역할 + 대비
export function lookChecks(spec: LookSpec): LookCheck[];                    // 대비 미달, 직접 쓴 글꼴 라이선스 확인 필요 등
export function deriveAccent(hex: string, neutral: NeutralSet): AccentSet;  // 5.5절 규칙, OKLCH
export function renderLookSection(spec: LookSpec, ai: string): string[];    // 설계도 6번 (짧은 판·전체 판)
export function renderLookCss(spec: LookSpec, screenTool: string): string; // 7.3절
export function renderDesignMd(spec: LookSpec): string;                     // 7.2절
export const LOOK_FILE_NAME = 'DESIGN.md';                                  // 에이전트가 찾는 이름이라 시각을 붙이지 않는다. 발행 시각은 YAML description에
```

- `evaluate()`는 그대로 `session.look`을 결과에 실어 둔다. 추천·점수·막힌 곳 계산은 바뀌지 않는다. 그래서 **골든 기대값은 바뀌지 않는다.** `docs/ENGINE.md`에 look 절을 더하고, `npm run examples`로 `docs/examples/*.md`를 다시 만들고, 같은 곳에 `*.design.md`를 함께 만든다.
- 시험(`tests/`): 앱 종류별 기본값 7종, 낱말표(‘바다처럼 시원하게’ → teal, ‘레트로 게임’ → retro, ‘다크’ → both), 직접 고른 색 6개(#00A651 · #FFD400 · #808080 · #E4007F · #7B3FE4 · #FFFFFF)의 글자색·대비, 80쌍 대비, 짧은 판·전체 판 줄 수, CSS 묶음이 `@media (prefers-color-scheme: dark)`를 '둘 다'일 때만 내는지, 직접 쓰기 원문이 한 줄·글자 수 제한으로 들어가는지.
- `npm run check`에 더한다: `docs/examples/*.design.md`를 `@google/design.md lint`로 돌려 오류·경고 0(개발 의존성 `@google/design.md` 0.4.0을 판 고정, alpha라 바뀌면 시험이 알려 준다).
- 영수증 링크(`shareHash`): `look`의 보기 id와 색 코드만 싣는다. `fromShareState`가 모르는 id를 버린다. 직접 쓰기 칸은 싣지 않는다.

### 9.3 화면

| 파일 | 할 일 |
|---|---|
| `src/components/Interview.tsx` | `q.style` 타일 순서를 `lookSpec`의 추천 순서로, '직접 쓰기' 줄, 글 버튼 "색·글꼴까지 직접 정하기" |
| `src/components/LookSheet.tsx` (새, 지연 로드) | 5.2절 시트, 시트 안 화면 넘기기, 대비 줄, 처음 값으로 되돌리기 |
| `src/components/LookPreview.tsx` (새) | 6.1절 |
| `src/styles/look.css` (새) | `var(--pv-*)`만 |
| `src/components/ArrivalAction.tsx`·`Receipt.tsx` 근처 '설계도' 칸 | 디자인 묶음, [디자인 바꾸기], [DESIGN.md 따로 받기] |
| `src/lib/map/model.ts` | `PALETTE_OF`에 `warm: 'cute'`, `retro: 'bold'` |
| `src/lib/store.ts` | `Session.look` 읽기·쓰기(저장 코드는 여기 한 곳) |
| `src/copy/ko.ts` | `look` 묶음(줄 이름·묻는 말·도움말·상태 줄·대비 문장·링크 안내) |
| `scripts/looks/specimens.ts` (새) | 6.1절 견본 SVG, `npm run looks` |
| `scripts/guard/*` | `.look-preview` 안 `--pv-*` 예외 |
| `tests/e2e/look.spec.ts` (새) | 키보드만으로: 느낌 질문 → 글 버튼 → 대표 색 → `#00A651` 입력 → 대비 알림 → 다 정했어요 → … → 설계도 받기에서 DESIGN.md 내려받기. axe. 동작 줄이기 |

### 9.4 문구 견본 (`src/copy/ko.ts`)

- 글 버튼: "색·글꼴까지 직접 정하기" · 시트 제목: "디자인 정하기" · 주 버튼: "다 정했어요" · 글 버튼: "처음 값으로 되돌리기"
- 상태 줄: "디자인 정하기 · 느낌만 골랐어요" / "디자인 정하기 · {n}가지를 직접 정했어요"
- 대비: "글자가 잘 보여요. 버튼 {a}대 1, 본문 {b}대 1." / "버튼 글자를 검게 했어요. 흰 글자는 {a}대 1이라 잘 안 보여요." / "이 색은 글자로 쓰기엔 흐려서, 글자에는 조금 더 진한 {hex}를 써요."
- 직접 쓰기 반영: "‘{text}’에서 ‘{word}’를 찾아 {label}(으)로 맞췄어요." → 조사는 `josa.ts`로 고른다. 못 찾으면 "고른 값은 그대로 두고, 이 말은 설계도에 그대로 넣을게요."
- 설계도 받기: "디자인 바꾸기" · "DESIGN.md 따로 받기" · 도움말 "코딩 에이전트를 쓰면 같이 받아 두세요."
- 쓰지 않는 말: 테마(→ 디자인), 프리뷰(→ 미리 보기), 팔레트(화면 문구에서는 → 색), 커스텀(→ 직접), 폰트(→ 글꼴). `npm run words`에 더한다.
- 새 용어(어려운 말 풀이·사전에 더함): 디자인 값(디자인 토큰), DESIGN.md, 명도 대비, 어두운 화면(다크 모드), 글꼴 라이선스(OFL), 모서리 둥글기, 아이콘 묶음.

---

## 10. 결정 후보 (`docs/DECISIONS.md`에 옮길 것, 모두 자동 결정)

| 결정 | 이유 | 틀렸을 때 비용 |
|---|---|---|
| 디자인은 새 단계가 아니라 느낌 질문 + 시트로 | 단계·주소·영수증 링크가 이미 퍼져 있고(D64), 디자인은 도구 계산과 무관하다 | 낮음. 시트를 단계로 옮겨도 엔진은 그대로 |
| 느낌 여섯, 그중 둘(`cute`·`bold`) 색을 바꿈 | AI 기본값 무리 ①②와 겹친다(저장소 `frontend-design` 스킬) | 낮음. `looks.json` 값만 되돌리면 된다 |
| 직접 쓴 말은 낱말표로만 반영 | 사이트는 AI를 부르지 않는다. 반영한 결과를 말로 보여 정직하다 | 낮음. 낱말표만 고친다 |
| 직접 고른 색은 OKLCH로 짝을 만들고 라이브러리를 쓰지 않는다 | 계산이 60줄이면 되고 엔진은 순수해야 한다. `material-color-utilities`는 변형 9가지가 초심자에게 쓸모없다 | 중간. 색이 이상하면 계산식 시험을 고친다 |
| 미리 보기는 HTML·CSS, 제목 글꼴만 빌드 때 SVG 윤곽선 | 바깥 글꼴·그림을 부르지 않는다는 규칙. 글꼴 파일을 싣는 것보다 가볍다 | 중간. 견본 112장 다시 굽기 |
| DESIGN.md를 따로 내려받기, 형식은 `@google/design.md` 0.4.0 | 형식 명세·린터·내보내기가 공개되어 있고 Stitch·여러 에이전트가 읽는다 | 중간. alpha라 바뀌면 렌더를 고친다. 린터가 `check`에서 알려 준다 |
| 디자인 값 이름을 Tailwind v4 이름표에 맞춤 | Tailwind를 쓰는 사람은 그대로 옮기고, 아니면 보통 CSS 변수로 쓴다 | 낮음 |
| 참고 플랫폼은 첫 화면 링크만, 정확한 숫자는 화면에 안 씀 | 저작물·요금·주소 꼴을 확인하지 못했다 | 낮음 |
| 아이콘 후보에서 Remix Icon 제외 | npm 라이선스 칸과 파일 원문이 다르다 | 낮음 |
| 디자인 묶음은 지연 로드, 상한 14KB | 설계도 받기 135.4/140KB | 낮음 |
| 새 느낌의 지도 팔레트는 있는 것에 잇는다(warm→cute, retro→bold) | 새 토큰과 대비 검사를 늘리지 않는다 | 낮음. 나중에 팔레트를 더하면 된다 |
| 새 개발 의존성: `opentype.js`(견본 굽기), `@google/design.md`(린트) | 둘 다 빌드·검사 때만. 화면 JS 0 | 낮음. 크기(gzip)는 설치할 때 재서 적는다 |

---

## 11. 사람 확인 (`docs/HUMAN.md`에 올릴 것)

| id | 할 일 | 왜 사람이 |
|---|---|---|
| H-L1 | https://vibe-design-one.vercel.app/ 과 lucianlabs.dev를 열어 보고, 무엇을 참고하라는 것인지 두세 줄이나 화면 캡처를 남겨 주세요 | 이 세션에서 두 곳 다 열리지 않았고 검색 색인에도 없다(1.2절) |
| H-L2 | Mobbin·Refero·Nicely Done·Lazyweb의 검색 결과 주소 꼴(예: 낱말을 넣은 주소)과 무료로 볼 수 있는 범위를 확인해 주세요. 이용약관에 링크·이름 표기를 막는 조항이 없는지도 | 사이트를 열 수 없었다. 약관 판단은 사람 몫 |
| H-L3 | 글꼴 견본 SVG 배포가 OFL에 맞는지 마지막으로 봐 주세요(글꼴 15종, 3.4절) | 법·라이선스 최종 확인 |
| H-L4 | KWCAG 2.2(한국형 웹 콘텐츠 접근성 지침) 원문의 검사 항목과 WCAG 2.2 AA와 다른 점 | 원문을 찾지 못했다 |
| H-L5 | (선택) 느낌 여섯의 미리 보기 판(타일 위 72px)을 렌더로 원하면 그림 요청서에 더하기. 그동안은 HTML 미리 보기 | 그림 생성은 사람 몫(D56) |

---

## 12. 관찰 시험 (`docs/OBSERVATION.md`에 더함)

1. 다섯 명에게 "우리 학교 급식 안내 페이지"를 정해 준 뒤 느낌 질문을 보인다. 20초 안에 고르고, 4명 이상이 "미리 보기가 고르는 데 도움이 됐다"고 하면 통과.
2. "학교 상징색 #00A651로 바꿔 보세요" 과제. 60초 안에 4명 이상 성공. 버튼 글자가 검게 바뀐 까닭을 말로 설명할 수 있는지 묻는다.
3. '직접 쓰기'에 "바다처럼 시원하게"를 넣고 결과 문장을 읽게 한다. 4명 이상이 "청록으로 바뀌었다"를 이해해야 통과.
4. 설계도(6번 포함)를 각자 AI에 주고 첫 화면을 만들게 한다. 색·글꼴·모서리 세 가지 중 따른 개수를 센다. 평균 2.5 이상이면 통과. 무료 채팅 AI와 코딩 에이전트를 나눠 적는다.
5. '다른 앱 둘러보기' 링크를 보이고 "이 사이트 그림을 내 앱에 써도 될 것 같아요?"라고 묻는다. 4명 이상이 "아니요, 참고만"이라고 해야 통과.

---

## 13. 위험

| 위험 | 줄이는 법 |
|---|---|
| 고를 것이 많아 지친다 | 기본 길은 타일 하나. 시트는 글 버튼으로만 열고 줄 12개를 세 묶음으로 나눈다. 관찰 시험 1 |
| 미리 보기와 AI가 만든 화면이 다르다 | "실제 화면은 내 AI가 만들어서 조금 다를 수 있어요"를 적고, 설계도에 숫자 값과 CSS 묶음, 디자인 확인 카드를 준다. 관찰 시험 4 |
| '둘 다'를 고르면 초심자의 확인 일이 두 배 | 기본을 '밝게만'으로. '둘 다'에는 "어두운 화면도 확인할 방법을 알려 줘"를 10번 진행 순서의 완성 확인에 더한다 |
| 사용자 앱의 한글 글꼴이 무겁다 | 동적 서브셋·Google Fonts만 지시, 가족 둘까지 |
| DESIGN.md 형식이 alpha라 바뀐다 | 판 고정 + `check`의 린트가 알려 준다 |
| 설계도 받기 예산 초과 | 지연 로드 + 묶음 상한 14KB, `qa:budget`에서 센다 |
| 직접 쓴 말에 AI를 부추기는 문장이 섞인다 | 한 줄·글자 수 제한, "내 말 그대로" 따옴표 줄로만 넣고 지시로 쓰지 않는다. 영수증 링크에 넣지 않는다 |
| 참고 사이트에서 베껴 온다 | 링크 옆과 설계도 6-11에 "참고만" 규칙. 관찰 시험 5 |
| 남의 브랜드처럼 꾸며 달라는 요청 | 우리 프리셋에 브랜드 이름을 쓰지 않는다. '닮고 싶은 앱'은 배치와 흐름만 참고한다고 적는다 |

---

## 14. 출처 (확인한 날 모두 2026-10-14)

**직접 확인 (npm 패키지 파일, 이 저장소)**
- `@google/design.md` 0.4.0 — `dist/spec.md`, `README.md`, `dist/linter/index.js`(제목 이름 정확히 맞추기, `SECTION_ALIASES`), 이 저장소에서 `lint`·`export` 실행. 저장소 주소(패키지에 적힌 것): https://github.com/google-labs-code/design.md
- `tailwindcss` 4.3.3 — `theme.css`
- `shadcn` 4.21.4, `@shadcn/registry` 0.1.3 — `dist/index.js`의 스타일 정의, `dist/chunk-JSGATXUP.js`의 `PRESET_*`
- `@radix-ui/colors` 3.0.0 — 색별 CSS
- `open-props` 1.7.23 — `src/props.fonts.css`, `props.easing.css`, `props.borders.css`
- `@material/material-color-utilities` 0.4.0 — `dynamiccolor/variant`, `scheme/*`
- `pretendard` 1.3.9 — `README.md`(동적 서브셋 주소), `package.json`(OFL-1.1)
- `remixicon` 4.9.1 — `License`(Remix Icon License v1.0, 2026-01)
- `oh-my-opencode` 4.18.2 — `dist/skills/frontend/references/design/`(`lazyweb.md`, `taste-skill.md`, `_INDEX.md`, `linear.app.md` 등 awesome-design-md 사본)
- `@flipdish/ui-library` — Untitled UI 기반 변수 이름
- npm `view`: `@sun-typeface/suit` 2.0.5, `wanted-sans` 1.0.3, `galmuri` 2.40.3, `@fontsource/*` 5.3.x, `lucide-static` 1.56.0, `@phosphor-icons/core` 2.1.1, `@tabler/icons` 3.49.0, `heroicons` 2.2.0, `@hugeicons/core-free-icons` 4.3.5, `material-symbols` 0.48.0, `bootstrap-icons` 1.13.2, `spoqa-han-sans` 3.3.0
- 이 저장소: `.claude/skills/frontend-design/SKILL.md`(anthropics/skills 사본, Apache-2.0), `data/templates.json`, `data/questions.json`, `src/lib/map/model.ts`, `docs/DECISIONS.md` D44·D70·D71, `scripts/lib/contrast.ts`

**검색 요약만 (원문을 열지 못함)**
- Mobbin: https://mobbin.com/ · https://mobbin.com/changelog · https://mobbin.com/explore/mobile/flows · 보도 자료 "Mobbin Launches MCP Server, Giving AI Tools 621,500 Real App Screens to Reference"(BusinessWire 2026-05-12) https://www.rutlandherald.com/news/business/mobbin-launches-mcp-server-giving-ai-tools-621-500-real-app-screens-to-reference/article_27c6b6bb-5bac-57cb-9e47-c620b2307a49.html · https://developertoolkit.ai/en/ecosystem/mcp/mobbin-mcp/ · https://alternativeto.net/news/2025/7/new-mobbin-update-adds-layered-filters-and-sticky-tabs · https://alternativeto.net/news/2025/2/mobbin-s-new-visual-search-discover-design-inspiration-with-screenshot-uploads
- Refero: https://refero.design/mcp · https://doc.refero.design/mcp/tools · https://doc.refero.design/mcp/data-model · https://doc.refero.design/mcp/getting-started · https://refero.design/how-it-works · https://notes.nicolasdeville.com/ai/refero-styles/
- Nicely Done: https://nicelydone.club/apps/supabase/components · https://toolradar.com/companies/nicelydone-club
- Lazyweb: https://www.lazyweb.com/ · https://experiments.lazyweb.com/vs/refero · https://lazylanding-labs.onrender.com/vs/ui-sources.md
- InspoAI: https://inspoai.io/ · https://www.producthunt.com/products/inspoai/launches/inspoai · https://trustmrr.com/startup/inspoai
- tweakcn: https://tailkits.com/tools/tweakcn/ · https://webcatalog.io/apps/tweakcn
- Realtime Colors: https://realtimecolors.com/ · https://www.realtimecolors.com/docs/releases
- Huemint: https://huemint.com/about/ · https://gigazine.net/gsc_news/en/20220304-ai-color-palette-huemint
- Radix Colors 단 쓰임: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale · https://design.unkey.com/colors
- Material 대비 단계: https://api.flutter.dev/flutter/material/ColorScheme/ColorScheme.fromSeed.html
- Google Stitch·DESIGN.md: https://x.com/stitchbygoogle/status/2046624729403142320 · https://nervegna.substack.com/p/vibe-design-is-real-inside-google
- awesome-design-md: https://blog.brightcoding.dev/2026/09/16/voltagentawesome-design-md-designmd-files-for-ai-ui-generation
- Lovable: https://docs.lovable.dev/features/design-guidance
- Figma Make: https://developers.figma.com/docs/code/write-design-system-guidelines/ · https://help.figma.com/hc/en-us/articles/33665861260823
- Anthropic: https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics · https://www.anthropic.com/news/claude-design-anthropic-labs
- WCAG 2.2: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- 'Design Prompts'(스타일 30여 개 모음, 주소 확인 못 함): https://brianciou.substack.com/p/vibe-coding-prompt

**열지 못함**: https://vibe-design-one.vercel.app/ (WebFetch DNS 실패, 프록시 403, 검색 0건) · https://lucianlabs.dev/ (같음) · KWCAG 2.2 원문.
