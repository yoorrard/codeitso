# 인기순 점검 (R1, 2026-10-20)

소유자 요청: "카테고리별 '인기순'이 정확한지 점검하고 업그레이드해. 실제로 많이 쓰이는 인기 있는 것이 먼저 나오게, 최근 트렌드도 반영." (앞서: "대중적이지 않은 건 추천에 있으면 안 되지.")

결정: D133 (`docs/DECISIONS.md`). 계산: `src/lib/catalog/core.ts` `rankScores`·`POP_RULES`(시험 `tests/lib/catalog.test.ts`). 신호 받기: `scripts/import/signals.ts`와 각 가져오기 스크립트.

## 어떻게 봤나

모든 소분류(100개)의 인기순 앞 12개를 바꾸기 전(D105, 출처 파일 안 백분위)과 뒤(D133)로 뽑아, 2026년에 실제로 널리 쓰이는 것(글꼴: Pretendard·Noto Sans KR·Roboto·Inter, 아이콘: Lucide·Material·Heroicons·Tabler·Font Awesome, UI: shadcn/ui·MUI·Ant Design·Chakra, LLM API: OpenAI·Anthropic·Gemini·DeepSeek, MCP: Filesystem·GitHub·Playwright·Context7, 국내 공공 API: 단기예보·나이스·에어코리아 등)과 견줬다. 아래 표는 앞 5개만 줄였다.

## D105에서 틀렸던 것

1. **작은 출처의 1등 = 큰 출처의 1등.** 백분위를 출처 파일 안에서 매겨, 설치 81회짜리 스킬·별 672개 Codeberg 확장이 내려받기 수천만의 1등과 같은 1점이었다(아이콘: react-icons가 Lucide 앞, MCP: 사용 횟수 41만의 이름 모를 게이트웨이가 1등).
2. **지표 없는 목록(0.5)이 지표 있는 상품의 아래 절반보다 앞.** 결제에서 PayPal·Adyen·Paddle(SDK 내려받기 10만+)이 APIs.guru의 'Account API'들 뒤, 임베딩에서 Voyage AI가 지표 없는 상품 뒤였다. 지표 없는 소분류는 이름순이라 공개 API 대부분·디자인 손 목록·워크플로가 'A'로 시작하는 것부터 보였다(업무 API 첫 줄: Adobe Experience Manager·Adzuna·Africa Compliance Data…).
3. **최근 흐름이 없었다.** 오래 멈춘 저장소의 누적 스타도 그대로였고, 새로 뜨는 모델·데이터셋을 볼 길이 없었다.

## D133에서 바꾼 것

- 소분류 안에서 지표마다 log 크기를 가장 큰 값으로 나눠 **출처끼리 견준다**. 가장 많이 채워진 지표가 으뜸이고, 으뜸 지표가 없는 상품만 다른 지표 × 0.85.
- **최근 흐름:** Hugging Face trendingScore를 얹고(최대 +0.3), 1년 넘게 갱신 없는 저장소의 스타는 3년에 걸쳐 20%까지 깎는다.
- **손으로 고른 상품**은 지표가 약해도 출처 목록의 상위 24개 바로 뒤에는 선다(나이스·고용24·국어사전 API가 공공데이터포털 5천여 개 사이에서 25~28위).
- **같은 신호를 나눠 가진 상품**(모노레포 스타, 한 회사 사이트 순위, 같은 SDK, 같은 이름, 한 출처의 다른 지표)은 둘째부터 줄여 첫 쪽이 한 무리로 차지 않게 한다. 같은 신호끼리는 그 상품만의 내려받기가 많은 것이 대표(MCP 참조 서버: Filesystem이 Everything보다 앞).

## 새로 받은 사실 신호 (모두 받은 그대로, 출처는 각 파일 note)

| 소분류 | 신호 | 출처 |
|---|---|---|
| 한글 폰트 | 지난 한 달 요청 수(Google Fonts 30일 조회와 같은 단위) | data.jsdelivr.com |
| 아이콘 묶음 | 공식 npm 꾸러미 한 달 내려받기(lucide-react, @heroicons/react, @tabler/icons-react, Font Awesome, react-icons …, 없으면 @iconify-json) | api.npmjs.org |
| AI 언어 모델·호스팅 | 공식 SDK와 그 회사 AI SDK 꾸러미(@ai-sdk/deepseek 등) 가운데 많은 주간 내려받기 | api.npmjs.org |
| 결제·메시지·로그인·지도 | 손 목록 SDK 넷 더함(Google Maps JS 로더·Firebase·Brevo·OneSignal, 공식 저장소 확인), 이전 실행에서 비던 Resend·Auth0·Replicate 등 값 채움 | api.npmjs.org |
| MCP 서버 | GitHub 저장소 스타 2,498개 더함, 참조 서버는 꾸러미 주간 내려받기 | repos.ecosyste.ms · npm · pypistats.org |
| 워크플로 | n8n 템플릿 조회 수(`metrics.views`) | api.n8n.io |
| AI 모델·데모·데이터셋 | trendingScore(`metrics.trend`)와 요즘 뜨는 순 상위(모델 500·스페이스 300·데이터셋 300) | huggingface.co/api |
| 디자인 시스템 | 소스 저장소 스타 | repos.ecosyste.ms |
| 지표 없는 손 목록·공개 API 목록·로고·shadcn 레지스트리 | 사이트의 Chrome 이용 순위 묶음(`metrics.siteRank`, 1천·5천·1만·5만·10만·50만·100만 위) | Chrome UX Report (CC BY 4.0) |
| UI 라이브러리 | 주제 검색으로 잘못 들어온 어썸 목록·템플릿 25개 뺌 | 가져오기 거르기 |

Smithery의 `useCount`는 내려받기가 아니라 그 플랫폼에서 부른 횟수라 `preview.useCount`로 옮겼다(인기순에는 쓰지 않는다).

## 남은 한계

- 지표를 주는 출처가 없는 소분류는 이름순이다: 그라디언트·패턴·차트 색·스타일·게임 에셋·한국어 데이터·세계 통계·분야별 공개 데이터·머신러닝 기본 데이터(UCI).
- 사이트 순위는 회사 사이트의 인기라 하위 상품에는 거칠다(예: OpenWeatherMap은 사이트 순위가 낮아 날씨 API에서 뒤). 그래서 다른 지표가 없을 때만 쓰고, 다른 지표가 있는 소분류에서는 으뜸이 되지 않는다.
- 공식 MCP 등록소 4만여 개는 저장소마다 요청이 너무 많아 스타를 받지 않았다(지금은 뒤에 이름순). GitHub 토큰이 있는 매일 실행이나 등록소가 인기 값을 주면 더할 수 있다.
- 스타의 '최근 증가'는 기록이 없어 쓰지 못했다(매일 받은 자료를 쌓으면 다음에 가능).
- Material Symbols는 공식 npm 꾸러미가 없어(구글은 글꼴로 낸다) Iconify 꾸러미 내려받기로 잰다(아이콘 21위).

## 소분류별 전·후 (앞 5개)
### design

| 소분류 | 전 (D105, 앞 5) | 후 (D133, 앞 5) | 판단 |
|---|---|---|---|
| 한글 폰트 (68) | Source Han Sans (본고딕) · Noto Sans KR · Nanum Gothic · Sarasa Gothic (사라사 고딕) · Nanum Myeongjo | Pretendard (프리텐다드) · Noto Sans KR · Nanum Gothic · Nanum Myeongjo · Noto Serif KR | ⬆ Pretendard가 맨 앞(jsDelivr 한 달 요청 수, Google Fonts 30일 조회와 같은 단위). 별만 많던 사라사 고딕·본고딕이 앞서던 것 고침 |
| 폰트 (2124) | Roboto · Geist Sans · Open Sans · Google Sans · Inter | Roboto · Open Sans · Google Sans · Inter · Montserrat | ✅ Google Fonts 30일 조회 순 그대로. Fontsource만 있는 글꼴(Geist 등)이 Roboto와 같은 1점이던 것 고침 |
| 색 체계 (13) | Tailwind CSS colors · Bootstrap 5 colors · Ant Design colors · Radix Colors · Mantine colors | Tailwind CSS colors · Bootstrap 5 colors · Ant Design colors · Radix Colors · Mantine colors | ✅ npm 내려받기 순(Tailwind → Bootstrap → Ant → Radix) |
| 테마 팔레트 (453) | 3024 (base16) · 3024 Day (base24) · 3024 Night (base24) · Adventure Time (base24) · Alien Blood (base24) | Catppuccin Frappé · Catppuccin Latte · Catppuccin Macchiato · Catppuccin Mocha · Rosé Pine | △ 신호 없음. 손으로 고른 테마(Catppuccin·Rosé Pine 등)가 먼저, 나머지 base16은 이름순 |
| 차트 색 (42) | ColorBrewer Accent · ColorBrewer Blues · ColorBrewer BrBG · ColorBrewer BuGn · ColorBrewer BuPu | ColorBrewer Accent · ColorBrewer Blues · ColorBrewer BrBG · ColorBrewer BuGn · ColorBrewer BuPu | △ 신호 없음(ColorBrewer·Tableau 표준 묶음, 이름순) |
| 그라디언트 (562) | 50 Shades of Grey · 80's Purple · A Lost Memory · Abbas · Above Clouds | 50 Shades of Grey · 80's Purple · A Lost Memory · Abbas · Above Clouds | △ 신호 없음(이름순). 인기 지표를 주는 출처가 없다 |
| 배경 패턴 (417) | Adjointed Circles · Adjointed Diamonds · African Pattern - 1 · African Pattern - 2 · African Pattern - 3 | Adjointed Circles · Adjointed Diamonds · African Pattern - 1 · African Pattern - 2 · African Pattern - 3 | △ 신호 없음(이름순) |
| 아이콘 묶음 (239) | Simple Icons · react-icons · Lucide · SVG Logos · Phosphor | Lucide · react-icons · Radix Icons · Phosphor · Ant Design Icons | ⬆ 공식 npm 꾸러미 한 달 내려받기로 견줌: Lucide(lucide-react)·react-icons·Radix·Phosphor·Ant Design·Heroicons·Tabler·Font Awesome. 전에는 Simple Icons가 1등이고 react-icons(작은 손 목록의 1등)가 1점. △ Material Symbols는 공식 npm 꾸러미가 없어 Iconify 꾸러미 수로 21위 |
| 브랜드 로고 (670) | 1Password · AbacatePay · Acrobat Reader · Acrobat Reader · Acrobat Scan | Acrobat Reader · Aliexpress · App Store · Bing · C | ⬆ 브랜드 사이트의 Chrome 순위 묶음(같은 회사 로고는 줄임). 전에는 이름순 |
| UI 컴포넌트 라이브러리 (476) | shadcn-ui/ui · ant-design · material-ui · element · ionic-framework | shadcn-ui/ui · ant-design · material-ui · ionic-framework · react-bits | ⬆ 스타 순 + 오래 멈춘 저장소 깎기. 주제 검색으로 잘못 들어온 어썸 목록·템플릿 25개를 뺌(awesome-react-components·full-stack-fastapi-template) |
| shadcn 레지스트리 (439) | @000h-cojeev · @1st-pouf · @23rd · @3d-viewer · @7ovr | @supabase · @000h-cojeev · @1st-pouf · @23rd · @3d-viewer | △ 디렉터리의 rankingScore는 상태 점수라 안 씀. 사이트 순위가 있는 것(@supabase)만 앞, 나머지 이름순 |
| 복사해 쓰는 컴포넌트 (72) | 21st.dev · Accordion (shadcn/ui) · Aceternity UI · Alert (shadcn/ui) · Alert Dialog (shadcn/ui) | 21st.dev · Shadcnblocks · Tailwind Plus (Tailwind UI) · Uiverse · Aceternity UI | ⬆ 손으로 고른 사이트(21st.dev·Shadcnblocks·Tailwind Plus·Aceternity)가 먼저, 사이트 순위 순 |
| CSS 프레임워크 (58) | bootstrap · tailwindcss · normalize.css · Semantic-UI · bulma | bootstrap · tailwindcss · bulma · styled-components · materialize | ✅ bootstrap → tailwindcss → bulma … |
| 애니메이션 라이브러리 (100) | three.js · animate.css · anime · motion · react-three-fiber | three.js · anime · motion · react-three-fiber · GSAP | ✅ three.js → anime → motion → r3f → GSAP |
| 차트 라이브러리 (73) | d3/d3 · Chart.js · echarts · gradio · recharts | d3/d3 · Chart.js · echarts · gradio · recharts | ✅ d3 → Chart.js → ECharts → Recharts |
| 디자인 시스템 (150) | Aalto University · Adjust Atlas · Adobe Spectrum · Alaska Airlines · Alibaba Ant Design | Alibaba Ant Design · MUI: Material UI · daisyUI · Chakra UI · Materialize CSS | ⬆ 소스 저장소 스타(Ant Design·MUI·daisyUI·Chakra·Mantine…), 저장소가 없으면 사이트 순위. 전에는 이름순 |
| DESIGN.md (AI용 디자인 설명서) (83) | 1win DESIGN.md · Airbnb DESIGN.md · Airtable DESIGN.md · Al Jazeera DESIGN.md · Apple DESIGN.md | 1win DESIGN.md · Airbnb DESIGN.md · Airtable DESIGN.md · Al Jazeera DESIGN.md · Apple DESIGN.md | △ 모두 같은 목록 저장소 스타(차이 없음, 이름순) |
| 디자인 스타일 (40) | Y2K (Y2K) · 고대비 (접근성 우선) (High-contrast acces… · 귀여움 (카와이) (Kawaii / Cute) · 글래스모피즘 (Glassmorphism) · 깔끔한 SaaS (Clean SaaS) | Y2K (Y2K) · 고대비 (접근성 우선) (High-contrast acces… · 귀여움 (카와이) (Kawaii / Cute) · 글래스모피즘 (Glassmorphism) · 깔끔한 SaaS (Clean SaaS) | △ 코드잇소가 쓴 견본이라 지표 없음(이름순) |
| UI/UX 레퍼런스 (56) | Admire The Web · Awwwards · Behance · Bento Grids · Brutalist Websites | Pinterest · Behance · Figma Community · Awwwards · Dribbble | ⬆ 사이트 순위(Pinterest·Behance·Figma Community·Awwwards·Dribbble). 전에는 이름순 |
| 디자인 도구 (62) | Adobe Color · Animista · BGJar · Blender · Blobmaker | Figma · Photopea · Blender · Color Hunt · Coolors | ⬆ Figma·Photopea·Blender·Coolors·Framer 순. 전에는 이름순 |
| 일러스트 (17) | 3dicons · Absurd Design · Blush · DiceBear · DrawKit | Ouch! (Icons8) · Storyset · unDraw · 3dicons · Absurd Design | ⬆ 순위가 잡히는 곳(Icons8·Storyset·unDraw)만 앞, 나머지 이름순 |
| 사진·영상 (21) | Art Institute of Chicago · Burst (Shopify) · Coverr · Freepik · Gratisography | Pixabay · Pexels · Wikimedia Commons · Unsplash · Mixkit (영상) | ⬆ Pixabay·Pexels·Wikimedia·Unsplash 순 |
| 3D·재질·HDRI (5257) | Kloofendal 48d Partly Cloudy (Pur… · Road 007 · Marble 012 · Moonless Golf · Plaster 001 | Kloofendal 48d Partly Cloudy (Pur… · Moonless Golf · Brown Photostudio 02 · Lilienstein · Plywood | ✅ Poly Haven·ambientCG 내려받기 순(같은 단위끼리 견줌) |
| 게임 에셋 (217) | 1-Bit Pack · 1-Bit Platformer Pack · 3D Road Tiles · Abstract Platformer · Alien UFO Pack | 1-Bit Pack · 1-Bit Platformer Pack · 3D Road Tiles · Abstract Platformer · Alien UFO Pack | △ Kenney가 내려받기 수를 주지 않아 이름순 |
| 로티·움직임 (4) | IconScout Lottie · Lordicon · LottieFiles · Rive Community | IconScout Lottie · Lordicon · LottieFiles · Rive Community | ⬆ LottieFiles·Lordicon 등 사이트 순위 |
| 목업 (8) | Apple Design Resources · Device Frames · LS Graphics Free · Meta Devices · Mockup World | Apple Design Resources · Unblast · Mockup World · LS Graphics Free · Mockuuups Studio | ⬆ Apple Design Resources 먼저 |
| 소리·음악 (13) | BBC Sound Effects · ccMixter · Free Music Archive · Freesound · Incompetech (Kevin MacLeod) | Pixabay Music & Sound Effects · YouTube Audio Library · Free Music Archive · Freesound · Mixkit (음악·효과음) | ⬆ Pixabay·YouTube Audio Library·Freesound 순 |

### ai

| 소분류 | 전 (D105, 앞 5) | 후 (D133, 앞 5) | 판단 |
|---|---|---|---|
| 에이전트 스킬 (5463) | frontend-design · frontend-design · code-reviewer · pptx-generator · Obsidian Markdown | frontend-design · code-reviewer · senior-frontend · ui-ux-pro-max · senior-backend | ✅ Anthropic frontend-design·skill-creator와 설치 많은 스킬이 앞. 작은 출처의 1등(설치 81회)이 1점이던 것 고침 |
| MCP 서버 (49597) | pipeworx gateway · Markitdown · Filesystem (Reference) · adamamer20-paper-search-mcp-openai · Database Toolbox | Markitdown · storybook · Filesystem · Netdata · Context7 | ⬆ GitHub 스타로 견줌: Markitdown·Filesystem·Context7·Chrome DevTools·Playwright·GitHub·Serena·Blender. Smithery 사용 횟수(내려받기가 아님)로 이름 모를 게이트웨이가 1등이던 것 고침. △ 공식 등록소 4만여 개는 스타를 못 받아 뒤(이름순) |
| 플러그인·확장 (8796) | DeepSeek · superpowers · document-skills · frontend-design · context7 | superpowers · ecc · mattpocock-skills · andrej-karpathy-skills · document-skills | ✅ 출처가 준 스타·설치 수 순(superpowers 등) |
| 서브에이전트 (929) | frontend-developer · ui-ux-designer · Expert React Frontend Engineer · c-pro · backend-architect | frontend-developer · code-reviewer · ui-ux-designer · backend-architect · fullstack-developer | ✅ 설치 많은 순(frontend-developer·code-reviewer…) |
| 규칙·지침 파일 (718) | angular-app · common · django-app · fastapi-app · flask-app | AGENTS.md · Aider CONVENTIONS.md · Augment Rules · CLAUDE.md · Cline Rules | ⬆ 형식 안내(AGENTS.md·CLAUDE.md·.cursorrules)가 먼저. 설치 0회 묶음 14개가 1점이던 것 고침 |
| 프롬프트 (3511) | generate-tests · Comprehensive Repository Analysis… · ultra-think · create-architecture-documentation · code-review | Comprehensive Repository Analysis… · Photorealistic Selfie Portrait De… · generate-tests · Director Variation Grid: One Stil… · American Comic | △ prompts.chat 좋아요가 작아(최대 21) 변별력이 약함 |
| 훅·설정 (148) | context-monitor · simple-notifications · performance-optimization · smart-commit · development-utils | context-monitor · simple-notifications · performance-optimization · development-utils · colorful-statusline | ✅ 설치 많은 순 |
| 프레임워크·SDK (221) | opencode · n8n · firecrawl · markitdown · AutoGPT | opencode · n8n · firecrawl · markitdown · AutoGPT | ✅ 스타 순(opencode·n8n·firecrawl·ollama·transformers·langchain) |
| 워크플로 템플릿 (2379) | #️⃣Nostr #damus AI Powered Report… · (De)activate n8n workflows using … · 3D Product Video Generator from 2… · 5 Ways to Process Images & PDFs w… · A Very Simple "Human in the Loop"… | AI agent chat · Creating an API endpoint · Building Your First WhatsApp Chat… · Angie, personal AI assistant with… · Scrape and summarize webpages wit… | ⬆ n8n 템플릿 조회 수 순(AI agent chat·WhatsApp 챗봇…). 전에는 이름순(#️⃣Nostr…) |

### api

| 소분류 | 전 (D105, 앞 5) | 후 (D133, 앞 5) | 판단 |
|---|---|---|---|
| AI 언어 모델 (68) | Anthropic · OpenAI · Google · Mistral · Cohere | Anthropic · OpenAI · Google · Mistral · xAI | ⬆ SDK·AI SDK 주간 내려받기: Anthropic·OpenAI·Google·Mistral·xAI·DeepSeek·Perplexity·Cohere. 전에는 6위부터 이름순(AI21·AionLabs…) |
| AI 모델 호스팅·라우터 (209) | Amazon Bedrock · AkashML · AtlasCloud · Avian · Azure | Amazon Bedrock · Vertex · OpenRouter · Azure · Groq | ⬆ Bedrock·Vertex·OpenRouter·Azure·Groq·Cerebras·Together·Replicate. 전에는 2위부터 이름순 |
| AI 이미지·영상·3D (35) | OpenAI Image API (GPT Image) · OpenAI Video API (Sora) · Imagen (Gemini API) · Veo (Gemini API) · fal | OpenAI Image API (GPT Image) · Imagen (Gemini API) · Adobe Firefly Services API · fal · OpenAI Video API (Sora) | ⬆ OpenAI·Imagen·Firefly·fal·Sora·Veo 순 |
| AI 음성·음악 (33) | OpenAI Audio API · Deepgram API · ElevenLabs API · Google Cloud Speech-to-Text · Amazon Transcribe | OpenAI Audio API · Deepgram API · ElevenLabs API · Google Cloud Speech-to-Text · Amazon Transcribe | ✅ OpenAI·Deepgram·ElevenLabs·Google STT 순 |
| AI 임베딩·리랭크 (8) | OpenAI Embeddings · Gemini Embedding · Cohere Embed & Rerank · Contextual AI API · Jina AI Search Foundation API | OpenAI Embeddings · Gemini Embedding · Cohere Embed & Rerank · Voyage AI API · Jina AI Search Foundation API | ⬆ OpenAI·Gemini·Cohere·Voyage(전에는 Voyage가 지표 없는 것 뒤) |
| AI용 검색·웹 수집 (25) | Browserbase · Firecrawl · Exa API · Brave Search API · Bright Data APIs | Browserbase · Firecrawl · Exa API · Apify API · Tavily API | ⬆ Browserbase·Firecrawl·Exa·Apify·Tavily |
| AI 비전·문서·번역 (29) | Mistral OCR · Amazon Textract · Amazon Rekognition · Google Cloud Vision API · Google Document AI | Mistral OCR · Amazon Textract · Amazon Rekognition · Google Cloud Vision API · Google Document AI | ✅ Mistral OCR·Textract·Rekognition·Google Vision |
| 그 밖의 AI·머신러닝 (95) | Advanced Multilanguage AI Transla… · AI Economics Tools · AI Engine · AI For Thai · AI Learning Engine | Amazon Comprehend · Google Cloud Natural Language API · Dialogflow · ElevenLabs API Documentation · OpenAI | ⬆ Comprehend·Google NL·Dialogflow |
| 한국 공공데이터 (5385) | 국토교통부_연속지적도 · 기상청_단기예보 조회서비스 · 한국수출입은행 환율 정보 · 한국환경공단_에어코리아_대기오염정보 · 국토교통부_시군구 | 국토교통부_연속지적도 · 기상청_단기예보 조회서비스 · 한국수출입은행 환율 정보 · 한국환경공단_에어코리아_대기오염정보 · 국토교통부_시군구 | ⬆ 활용신청 순(연속지적도·단기예보·환율·에어코리아…), 손으로 고른 나이스·고용24·국어사전 API가 25~28위(전에는 2천 위 밖) |
| 한국 개발자 API (114) | 11번가 Open API · Airbnb API · Cafe24 개발자센터 · CODEF API · CODEF 오픈API | PortOne (포트원) · SOLAPI · 공유하기 · 네이버 CLOVA Face Recognition · 알리고 문자 API | ⬆ PortOne·SOLAPI(SDK 내려받기)·네이버 공유하기 먼저. 전에는 이름순(11번가·Airbnb…) |
| 공공·과학 데이터 (637) | 221 · 49 Gallery Historical Data · Accountants General, Tripura · Acko General Insurance Limited · AcreLens | NCBI E-utilities · arXiv · Boletín Oficial del Estado (BOE) · iNaturalist · Kaggle | ⬆ 사이트 순위(NCBI·arXiv·iNaturalist·Kaggle). 전에는 이름순 |
| 지도·위치·교통 (420) | Account API · Actinia Grass GIS · administrative-divisons-db · adresse.data.gouv.fr · ADS-B Exchange | Google Maps Platform · Bing Maps · Mapbox APIs · Google Earth Engine · Transport for London Unified API | ⬆ Google Maps(공식 JS 로더 내려받기)·Bing·Mapbox. 전에는 이름순 |
| 날씨·환경 (108) | 1ClickImpact · 7Timer! · 7Timer! · AccuWeather · Aemet | AccuWeather · Yandex.Weather · AQICN · IQAir · IPMA | ⬆ AccuWeather·Yandex·AQICN·IQAir. △ OpenWeatherMap은 사이트 순위가 낮아(50만 위) 뒤 |
| 금융·암호화폐·환율 (454) | 0x · 0xArchive · 1Forge · 1Forge Finance APIs · 1inch | Trading View · CoinGecko · MercadoPago · Mexc · Polymarket | ⬆ TradingView·CoinGecko·MercadoPago |
| 결제·쇼핑 (232) | Stripe API · Account API · Account API · Account API · Adyen Balance Control API | Stripe API · eBay · Razorpay API · Polar API · Square APIs | ⬆ Stripe·Razorpay·Polar·Square·Adyen·PayPal. 전에는 2위부터 APIs.guru 'Account API' 등 |
| 이메일·문자·메신저 (185) | Slack API · Twilio API · Amazon SES · Twilio SendGrid API · Postmark API | Resend API · Slack API · Firebase Cloud Messaging · Twilio API · Amazon SES | ✅ Resend·Slack·FCM·Twilio·SES·SendGrid |
| 로그인·보안 (168) | Supabase Auth · Clerk · WorkOS · 1Password Connect · 54ch10 | Supabase Auth · Firebase Authentication · Clerk · WorkOS · Google Identity (Sign in with Goo… | ⬆ Supabase Auth·Firebase Auth·Clerk·WorkOS·Google·Apple 로그인 |
| 개발 도구 (772) | 1pt · 24 Pull Requests · A-Maze · Abacus · Abstract API | App Store Connect API · Azure DevOps · Dropbox · Google Docs · OneDrive | ⬆ App Store Connect·Azure DevOps·Dropbox·Google Docs. 전에는 이름순(1pt·24 Pull Requests) |
| 업무·생산성 (343) | Adobe Experience Manager (AEM) API · Adzuna · Africa Compliance Data · Agentic Engineering Jobs · AgentPay Doc Tools | Gmail · iLovePDF · UK Bank Holidays · JIRA · Trello | ⬆ Gmail·iLovePDF·Jira·Trello·Notion(소유자 지적: 이름 모를 업무 API가 먼저이던 것) |
| 사진·영상·음악 (582) | 1,000,000+ Recipe and Grocery Lis… · 3DTexel · 7digital · Abusive Experience Report API · Accelerated Mobile Pages (AMP) UR… | BBC Nitro API · Dailymotion · Discogs · Genius · Google Photos | ⬆ BBC·Dailymotion·Discogs·Genius·Google Photos·IMDb(사이트 순위). 전에는 이름순 |
| 뉴스·소셜 (147) | 4chan · Adeli · API Direct · APITube News API · Associated Press | Blogger · Facebook · Instagram · LinkedIn · NAVER | ⬆ Facebook·Instagram·LinkedIn·NAVER·NYT |
| 글·사전·언어 (108) | AI Text Moderation, Toxicity & Se… · AI Translate text API · Analyse Keywords API · API v1 · api.clarify.io | Wiktionary · Collins · LanguageTool · Watson Natural Language Understan… · Chinese Text Project | ⬆ Wiktionary·Collins·LanguageTool |
| 게임·애니·책·재미 (355) | A Bíblia Digital · Accounts API · Advice Slip · akshaykumar-rest · Amanah Sunnah | Chess.com · Danbooru Anime · Google Books · Lichess · Board Game Geek | ⬆ Chess.com·Google Books·Lichess·BGG |
| 생활·음식·건강·스포츠 (238) | 5DollarFootball · AcesAPI · Amazing Endemic Species · American Football Highlights API · API-FOOTBALL | Eventbrite · Ticketmaster · Kroger · MedlinePlus Genetics · SeatGeek | ⬆ Eventbrite·Ticketmaster |
| 클라우드 서비스 (976) | Access Analyzer · ACE Provisioning ManagementPartner · ADHybridHealthService · AdvisorManagementClient · Alexa For Business | Vercel API · Netlify's API documentation · Box Platform API · Linode API · Public Api | △ AWS·Azure·Google 하위 API 수백 개는 회사 사이트 순위가 그 API의 인기가 아니라 붙이지 않음(이름순). Vercel·Netlify만 앞 |

### opensource

| 소분류 | 전 (D105, 앞 5) | 후 (D133, 앞 5) | 판단 |
|---|---|---|---|
| AI 모델 (7852) | llama3.1 · sentence-transformers/all-MiniLM-… · cross-encoder/ms-marco-MiniLM-L6-… · BAAI/bge-small-en-v1.5 · sentence-transformers/paraphrase-… | sentence-transformers/all-MiniLM-… · Comfy-Org/MiniMax-H3 · Qwen/Qwen3.8-27B · BAAI/bge-m3 · Comfy-Org/Qwen-Image-2.1 | ⬆ 30일 내려받기 + 요즘 뜨는 모델(Qwen3.8·MiniMax·LTX 등 trendingScore). Ollama 누적 pull과 HF 30일 값이 같은 칸이라 거칠다 |
| AI 데모 앱 (스페이스) (1793) | DeepSite v4 · Open LLM Leaderboard · AI Comic Factory · Kolors Virtual Try-On · FLUX.1 [dev] | Open LLM Leaderboard · MTEB Leaderboard · AI Comic Factory · Kolors Virtual Try-On · Wan2.2 14B Fast | ⬆ 좋아요 + 요즘 뜨는 스페이스 |
| AI 앱·에이전트 프로젝트 (1807) | OpenClaw · Hermes Agent · Ollama · OpenCode · Open-WebUI | OpenClaw · rea · ECC · Hermes Agent · deepseek-harness | ✅ 스타 순(출처 자료 그대로) |
| 바로 쓰는 오픈소스 앱 (1527) | n8n · GitLab · Dify.ai · Immich · Stirling-PDF | n8n · Dify.ai · Immich · Stirling-PDF · uptime-kuma | ✅ n8n·Dify·Immich·Stirling-PDF·Home Assistant |
| JavaScript 라이브러리 (2000) | semver · minimatch · debug · ansi-styles · brace-expansion | semver · minimatch · debug · ansi-styles · brace-expansion | ✅ npm 한 달 내려받기 순(기반 꾸러미가 먼저 서는 것은 사실) |
| Python 라이브러리 (1000) | boto3 · packaging · typing-extensions · idna · urllib3 | boto3 · packaging · typing-extensions · idna · urllib3 | ✅ PyPI 내려받기 순 |
| Flutter·Dart 패키지 (500) | connectivity · connectivity_for_web · device_info · connectivity_macos · device_info_platform_interface | dio · bloc · _fe_analyzer_shared · get · _flutterfire_internals | ⬆ dio·bloc·get·fl_chart(전에는 같은 별을 나눈 옛 플러그인 묶음이 줄지어 섬) |
| 로그인·인증 (998) | Authelia · Passport · Ory Hydra · ZITADEL · Logto | supabase · hackathon-starter · cli · better-auth · Authelia | ⬆ supabase·better-auth·next-auth·Authelia |
| CMS·블로그 엔진 (750) | Strapi · Gatsby · Ghost · Jekyll · frontend-dev-bookmarks | next.js · hugo · Strapi · nuxt · Gatsby | ✅ 스타 순 |
| 쇼핑몰·결제 (489) | MedusaJs · Bagisto · Saleor · Spree Commerce · Magento Open Source | MedusaJs · Bagisto · Saleor · Spree Commerce · commerce | ✅ Medusa·Bagisto·Saleor |
| 봇 (디스코드·텔레그램·슬랙) (1156) | python-telegram-bot · discord.js · monolog · discord.py · wechat-chatgpt | freqtrade · python-telegram-bot · discord.js · TelegramGroup · monolog | ✅ 스타 순 |
| 브라우저 확장 (884) | LocalCDN · Redux Devtools · browser_extension · Buster · Violentmonkey | uBlock · linux-command · refined-github · quasar · nextai-translator | ⬆ uBlock·refined-github(작은 Codeberg 1등이 1점이던 것 고침) |
| 명령줄 도구 (987) | yt-dlp · youtube-dl · foot · neovim · The Fuck | yt-dlp · ohmyzsh · youtube-dl · neovim · Agent-Reach | ⬆ yt-dlp·ohmyzsh·neovim(오래 멈춘 youtube-dl은 조금 깎임) |
| 게임·게임 엔진 (1469) | Vue · Bootstrap · Electron · Godot · Three.js | Bootstrap · Electron · Godot · Three.js · D3.js | ✅ 스타 순 |
| 그 밖의 오픈소스 프로젝트 (704) | zig · vscode · Client · comaps · Gadgetbridge | vscode · Astro · Mark Text · Motrix · slidev | ⬆ vscode·Astro(작은 Codeberg·GitLab 1등이 1점이던 것 고침) |
| 어썸 리스트 (주제별 모음) (1436) | build-your-own-x · awesome · public-apis · awesome-selfhosted · awesome-python | build-your-own-x · awesome · public-apis · awesome-selfhosted · awesome-python | ✅ 스타 순 |

### templates

| 소분류 | 전 (D105, 앞 5) | 후 (D133, 앞 5) | 판단 |
|---|---|---|---|
| 웹앱 기본 스타터 (951) | Image Gallery Starter · Supabase Starter · Docus · cal.diy · Welcome to Astro | Image Gallery Starter · Welcome to Astro · cal.diy · Supabase Starter · Turborepo & Gatsby Starter | ⬆ Next.js 예제(같은 모노레포 스타)를 둘째부터 줄여 create-t3-app·SvelteKit이 첫 줄로 |
| SaaS 스타터 키트 (239) | open-react-template · Hackathon Starter · React Starter Kit · open-saas · Next-js-Boilerplate | Hackathon Starter · React Starter Kit · Next.js SaaS Starter · open-saas · Next-js-Boilerplate | ✅ Hackathon Starter·React Starter Kit·Next.js SaaS Starter·open-saas |
| AI 챗봇·에이전트 앱 (455) | ChatGPT + Enterprise data with Az… · AgentGPT - AI Agents with Langcha… · RAG using Kernel Memory on Azure · Chatbot UI · Agent Landing Zone | Advanced AI Bot Protection · AgentGPT - AI Agents with Langcha… · Chatbot · Express + AI SDK · Chatbot UI | ✅ Vercel AI 템플릿·Chatbot UI |
| 관리자 대시보드 (912) | vue-element-admin · mall · AdminLTE · tabler · appsmith | mall · AdminLTE · tabler · appsmith · ruoyi-vue-pro | ✅ 스타 순 |
| 랜딩 페이지 (205) | blox-tailwind · tailwind-landing-page-template · Astroship · gatsby-starter-portfolio-cara · react-gh-pages | blox-tailwind · astrowind · tailwind-landing-page-template · react-gh-pages · Aerial | ⬆ astrowind·tailwind-landing-page-template, HTML5 UP은 한 출처가 첫 줄을 채우지 않게 줄임 |
| 블로그·포트폴리오 (1614) | Blog (with comments) · Blog Starter Kit · ISR Blog with Next.js and WordPre… · Next.js Blog with Draft Mode · Sitecore XM Cloud Next.js Starter | Blog (with comments) · Astro Blog · Blog Starter Kit · Parallelism · ISR Blog with Next.js and WordPre… | ⬆ 같은 모노레포 Next.js 예제는 둘째부터 줄이고 HTML5 UP은 한 출처가 줄을 채우지 않게. △ Vercel 공식 예제가 여전히 위쪽 |
| 문서 사이트 (90) | book · Monorepo with Turborepo · docsy · hextra · doks | Monorepo with Turborepo · Combining data fetching strategies · book · Docus · autoflow | ✅ Turborepo·Docusaurus·hugo book·docsy |
| 쇼핑몰 (81) | Your Next Store — Commerce with N… · gatsby-ecommerce-theme · Hydrogen v2 · Astro E-commerce · Astro Shopify | Your Next Store — Commerce with N… · Hydrogen v2 · Medusa Next.js Ecommerce Store St… · Next.js Saleor Commerce · WooNuxt | ✅ Next.js Commerce 계열 |
| 모바일 앱 (257) | RustDesk · material-kit · android_guides · Turborepo & React Native Starter · ignite | RustDesk · Turborepo & React Native Starter · android_guides · ignite · flutter_architecture_samples | ✅ 스타 순 |
| 데스크톱 앱 (77) | Electron React Boilerplate · HuLa · electron-vite-vue · Nextron · vite-electron-builder | Electron React Boilerplate · HuLa · electron-vite-vue · Nextron · vite-electron-builder | ✅ Electron React Boilerplate·electron-vite |
| 브라우저 확장 (78) | Extension.js · webextensions-examples · create-chrome-ext · npmhub · browser-extension-template | Extension.js · webextensions-examples · create-chrome-ext · browser-extension-template · extro | ⬆ Extension.js·webextensions-examples (Chrome 샘플은 지표 없어 뒤) |
| 봇 (51) | eve Slack Agent · AnswerOverflow · Python-Discord-Bot-Template · Discord-Bot-TypeScript-Template · telegram-bot-template | eve Slack Agent · AnswerOverflow · Python-Discord-Bot-Template · Discord-Bot-TypeScript-Template · telegram-bot-template | ✅ 스타 순 |
| 백엔드·API 서버 (494) | full-stack-fastapi-template · Elysia on Vercel · Fastify on Vercel · NestJS on Vercel · React Redux Universal Hot Example | full-stack-fastapi-template · Elysia on Vercel · Fastify on Vercel · A/B Testing Simple · nestjs-boilerplate | ✅ full-stack-fastapi-template 먼저 |
| 게임 (35) | template-webpack · godot-game-template · template-react-ts · UnityGameTemplate · template-react | template-webpack · godot-game-template · comedot · TakinGodotTemplate · template-react-ts | ✅ 스타 순 |
| HTML·CSS 무료 템플릿 (180) | Massively · mdb-ui-kit · Dimension · now-ui-kit · Prologue | mdb-ui-kit · BigDataView · Massively · fatfree · email-templates | ⬆ mdb-ui-kit, HTML5 UP 내려받기는 둘째부터 줄여 섞음 |

### datasets

| 소분류 | 전 (D105, 앞 5) | 후 (D133, 앞 5) | 판단 |
|---|---|---|---|
| AI 학습 데이터셋 (2495) | huggingface/documentation-images · m-a-p/FineFineWeb · hallucinations-leaderboard/results · hf-doc-build/doc-build-dev · Salesforce/wikitext | huggingface/documentation-images · m-a-p/FineFineWeb · Lichess/standard-chess-games · openai/gsm8k · XiaomiMiMo/MiMo-V2.6-RL-oss | ⬆ 30일 내려받기 + 요즘 뜨는 데이터셋(gsm8k·fineweb 등) |
| Kaggle 데이터셋 (3018) | Credit Card Fraud Detection · Iris Species · Netflix Movies and TV Shows · Video Game Sales · Chest X-Ray Images (Pneumonia) | Credit Card Fraud Detection · Iris Species · Netflix Movies and TV Shows · Video Game Sales · Chest X-Ray Images (Pneumonia) | ✅ 내려받기 순(신용카드 사기·Iris·Netflix) |
| 머신러닝 기본 데이터셋 (815) | 10k US Adult Faces Database · 181 early modern English plays: T… · 2.4 GHZ Indoor Channel Measuremen… · 2D elastodynamic metamaterials · 2GB of Photos of Cats | 10k US Adult Faces Database · 181 early modern English plays: T… · 2.4 GHZ Indoor Channel Measuremen… · 2D elastodynamic metamaterials · 2GB of Photos of Cats | △ UCI·awesome 목록이 인기 지표를 주지 않아 이름순 |
| 한국 공공데이터 (파일) (3452) | 한국고전번역원_한국문집총간 · 소상공인시장진흥공단_상가(상권)정보 · 한국고전번역원_고전원문 · 한국국제협력단_국별 개발협력동향 · 공공데이터활용지원센터_공공데이터포털 목록개방현황 | 한국고전번역원_한국문집총간 · 소상공인시장진흥공단_상가(상권)정보 · 한국고전번역원_고전원문 · 한국국제협력단_국별 개발협력동향 · 공공데이터활용지원센터_공공데이터포털 목록개방현황 | ✅ 다운로드 순(공공데이터포털) |
| 한국어·한국 데이터 모음 (107) | 3i4K · AIHub · AIR x NAVER NER/SRL · AMR · APEACH | 3i4K · AIHub · AIR x NAVER NER/SRL · AMR · APEACH | △ 신호 없음(이름순) |
| 세계 통계·지표 (5804) | … but so is the quality of their … · … but so is the quality of their … · Above-ground forest biomass · Absolute number of deaths from am… · Academic Freedom Index | … but so is the quality of their … · … but so is the quality of their … · Above-ground forest biomass · Absolute number of deaths from am… · Academic Freedom Index | △ OWID·World Bank가 조회 수를 주지 않아 이름순 |
| 분야별 공개 데이터 (2179) | 'Will Two Do? Varying Dimensions … · (EXPERIMENTAL) NOAA FourCastNet G… · 1000 Genomes · 1000 Genomes · 1000 Genomes Phase 3 Reanalysis w… | 'Will Two Do? Varying Dimensions … · (EXPERIMENTAL) NOAA FourCastNet G… · 1000 Genomes · 1000 Genomes · 1000 Genomes Phase 3 Reanalysis w… | △ 대부분 같은 등록소 주소라 사이트 순위가 의미 없음(이름순) |
| 앱에 넣는 기본 데이터 (국가·통화·지도) (120) | countries-states-cities-database · countries · country-list · ISO-3166-Countries-with-Regional-… · natural-earth-vector | countries-states-cities-database · countries · country-list · covid-19 · country-json | ✅ 스타 순 |
