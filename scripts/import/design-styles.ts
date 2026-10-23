// 디자인 > 디자인 스타일(톤) 쓰기. 코드잇소가 직접 쓴 정의와 미리 보기용 토큰 묶음이다 (네트워크 없이 돈다).
//   node scripts/import/design-styles.ts
// preview.tokens는 사이트가 로컬 CSS로 작은 화면을 칠할 때 쓴다. 글꼴은 시스템 글꼴 계열 이름만 쓴다(외부 글꼴 없음).
// use.snippet은 같은 토큰을 CSS 변수로 옮긴 것, preview.keywords는 AI에게 스타일을 설명할 때 쓰는 영어 낱말이다.
import { CURATED_AT, type Item, main, makeItem, writeCatalog } from './design-lib.ts';

interface Tokens {
  bg: string; surface: string; text: string; muted: string; primary: string; onPrimary: string; accent: string;
  border: string; radius: number; borderWidth: number; shadow: string; font: 'sans' | 'serif' | 'mono' | 'rounded' | 'display';
  headingWeight: number; letterSpacing?: string; backdrop?: string; background?: string; textTransform?: 'uppercase' | 'none';
}

interface Style {
  slug: string; name: string; nameKo: string; summary: string; summaryKo: string; keywords: string[]; tags: string[];
  goodFor: string; tokens: Tokens;
}

const STYLES: Style[] = [
  {
    slug: 'minimal', name: 'Minimal', nameKo: '미니멀',
    summary: 'Few elements, generous whitespace, a restrained palette and clear typography; every element has to earn its place.',
    summaryKo: '요소를 줄이고 여백을 넉넉히 둔다. 색은 한두 가지, 글자 위계로 정리한다.',
    keywords: ['minimal', 'whitespace', 'clean', 'restrained palette', 'clear hierarchy'], tags: ['clean', 'light'],
    goodFor: '포트폴리오, 블로그, 생산성 도구',
    tokens: { bg: '#ffffff', surface: '#fafafa', text: '#111111', muted: '#6b6b6b', primary: '#111111', onPrimary: '#ffffff', accent: '#2f6fed', border: '#e6e6e6', radius: 6, borderWidth: 1, shadow: 'none', font: 'sans', headingWeight: 600 },
  },
  {
    slug: 'flat', name: 'Flat design', nameKo: '플랫 디자인',
    summary: 'Solid colours, no gradients or realistic shadows, simple shapes and icons; the look popularised by iOS 7 and Windows Metro.',
    summaryKo: '그라디언트와 그림자 없이 단색 면과 단순한 도형으로 만든다.',
    keywords: ['flat design', 'solid colors', 'no shadows', 'simple icons', 'bold color blocks'], tags: ['colorful', 'simple'],
    goodFor: '앱 아이콘, 교육용 서비스, 인포그래픽',
    tokens: { bg: '#ecf0f1', surface: '#ffffff', text: '#2c3e50', muted: '#5d6d7e', primary: '#2980b9', onPrimary: '#ffffff', accent: '#e67e22', border: '#d5dbdb', radius: 4, borderWidth: 0, shadow: 'none', font: 'sans', headingWeight: 700 },
  },
  {
    slug: 'material', name: 'Material Design', nameKo: '머티리얼 디자인',
    summary: "Google's design language: surfaces with elevation, a primary/secondary colour scheme, rounded containers and motion that follows touch.",
    summaryKo: '구글식 화면. 높이가 다른 면(그림자), 주색·보조색 체계, 둥근 버튼을 쓴다.',
    keywords: ['material design 3', 'elevation', 'tonal surfaces', 'rounded containers', 'FAB'], tags: ['google', 'app'],
    goodFor: '안드로이드풍 앱, 관리 화면',
    tokens: { bg: '#fef7ff', surface: '#f3edf7', text: '#1d1b20', muted: '#49454f', primary: '#6750a4', onPrimary: '#ffffff', accent: '#7d5260', border: '#cac4d0', radius: 16, borderWidth: 0, shadow: '0 1px 3px rgba(0,0,0,.2), 0 1px 2px rgba(0,0,0,.12)', font: 'rounded', headingWeight: 500 },
  },
  {
    slug: 'neumorphism', name: 'Neumorphism', nameKo: '뉴모피즘',
    summary: 'Soft UI: elements extruded from or pressed into a same-coloured background using a light and a dark shadow; low contrast, so use with care for accessibility.',
    summaryKo: '바탕과 같은 색 면에 밝은 그림자와 어두운 그림자를 함께 줘서 볼록·오목하게 보이게 한다. 대비가 낮아 글자는 진하게 둔다.',
    keywords: ['neumorphism', 'soft UI', 'extruded', 'dual shadows', 'monochrome background'], tags: ['soft', 'light'],
    goodFor: '스마트홈 조작판, 계산기, 음악 앱',
    tokens: { bg: '#e0e5ec', surface: '#e0e5ec', text: '#2d3748', muted: '#5a6577', primary: '#4a6cf7', onPrimary: '#ffffff', accent: '#ff6b6b', border: 'transparent', radius: 20, borderWidth: 0, shadow: '8px 8px 16px #b8bec7, -8px -8px 16px #ffffff', font: 'rounded', headingWeight: 600 },
  },
  {
    slug: 'glassmorphism', name: 'Glassmorphism', nameKo: '글래스모피즘',
    summary: 'Frosted-glass panels: translucent surfaces with background blur, a thin light border and colourful shapes behind them.',
    summaryKo: '반투명 유리판 위에 뒤가 흐리게 비친다. 뒤에 화사한 색 덩어리를 두어야 효과가 산다.',
    keywords: ['glassmorphism', 'frosted glass', 'backdrop blur', 'translucent panels', 'vivid gradient background'], tags: ['translucent', 'gradient'],
    goodFor: '랜딩 페이지, 대시보드 카드, 음악·날씨 앱',
    tokens: { bg: '#1e1b4b', surface: 'rgba(255,255,255,0.14)', text: '#ffffff', muted: '#d4d4f5', primary: '#ffffff', onPrimary: '#1e1b4b', accent: '#f472b6', border: 'rgba(255,255,255,0.35)', radius: 18, borderWidth: 1, shadow: '0 8px 32px rgba(15,10,60,.35)', font: 'sans', headingWeight: 600, backdrop: 'blur(16px)', background: 'radial-gradient(circle at 20% 20%, #7c3aed 0, transparent 45%), radial-gradient(circle at 80% 70%, #ec4899 0, transparent 45%), #1e1b4b' },
  },
  {
    slug: 'liquid-glass', name: 'Liquid Glass', nameKo: '리퀴드 글래스',
    summary: 'Apple-style liquid glass (2025): highly translucent, rounded controls that refract and reflect the content behind them, with bright specular edges.',
    summaryKo: '애플이 2025년에 내놓은 물방울 같은 유리 질감. 아주 둥글고 투명한 조작부가 뒤 화면을 굴절시켜 비춘다.',
    keywords: ['liquid glass', 'refraction', 'specular highlight', 'capsule controls', 'translucent'], tags: ['translucent', 'apple'],
    goodFor: '모바일 앱 탭 바, 미디어 플레이어',
    tokens: { bg: '#dbe7f5', surface: 'rgba(255,255,255,0.45)', text: '#0b1220', muted: '#3c4a5e', primary: '#0a84ff', onPrimary: '#ffffff', accent: '#ff375f', border: 'rgba(255,255,255,0.8)', radius: 28, borderWidth: 1, shadow: 'inset 0 1px 0 rgba(255,255,255,.9), 0 10px 30px rgba(20,40,80,.18)', font: 'sans', headingWeight: 600, backdrop: 'blur(20px) saturate(180%)', background: 'linear-gradient(135deg, #c3d9f3 0%, #f2d7e8 100%)' },
  },
  {
    slug: 'brutalism', name: 'Brutalism', nameKo: '브루탈리즘',
    summary: 'Raw, unpolished web: default-looking fonts, visible structure, harsh contrast and little decoration, often deliberately uncomfortable.',
    summaryKo: '다듬지 않은 날것 같은 웹. 기본 글꼴, 드러난 격자, 거친 대비로 일부러 투박하게 만든다.',
    keywords: ['web brutalism', 'raw HTML', 'system fonts', 'harsh contrast', 'visible grid'], tags: ['bold', 'experimental'],
    goodFor: '예술·실험 사이트, 개인 홈페이지',
    tokens: { bg: '#ffffff', surface: '#ffffff', text: '#000000', muted: '#333333', primary: '#0000ee', onPrimary: '#ffffff', accent: '#ff0000', border: '#000000', radius: 0, borderWidth: 2, shadow: 'none', font: 'mono', headingWeight: 700 },
  },
  {
    slug: 'neo-brutalism', name: 'Neo-brutalism', nameKo: '네오 브루탈리즘',
    summary: 'Playful brutalism: thick black outlines, hard offset shadows, flat saturated colours and chunky type (Gumroad, Figma community style).',
    summaryKo: '두꺼운 검은 테두리, 어긋나게 찍힌 딱딱한 그림자, 쨍한 단색. 장난스럽고 눈에 띈다.',
    keywords: ['neo-brutalism', 'thick black borders', 'hard offset shadow', 'saturated flat colors', 'chunky type'], tags: ['bold', 'playful'],
    goodFor: '스타트업 랜딩, 크리에이터 도구, 이벤트 페이지',
    tokens: { bg: '#fffbe6', surface: '#ffffff', text: '#000000', muted: '#333333', primary: '#ff6b6b', onPrimary: '#000000', accent: '#4ecdc4', border: '#000000', radius: 8, borderWidth: 3, shadow: '4px 4px 0 #000000', font: 'sans', headingWeight: 800 },
  },
  {
    slug: 'swiss', name: 'Swiss / International Typographic Style', nameKo: '스위스 스타일',
    summary: 'Grid-based layout, asymmetric composition, sans-serif type (Helvetica-like), objective photography and lots of white space.',
    summaryKo: '엄격한 격자, 비대칭 배치, 산세리프 큰 글자. 1950년대 스위스 그래픽 디자인 방식이다.',
    keywords: ['swiss style', 'international typographic style', 'strict grid', 'asymmetric layout', 'helvetica', 'red accent'], tags: ['typography', 'grid'],
    goodFor: '에이전시·포트폴리오, 행사 포스터형 페이지',
    tokens: { bg: '#f4f1ea', surface: '#ffffff', text: '#111111', muted: '#555555', primary: '#e30613', onPrimary: '#ffffff', accent: '#111111', border: '#111111', radius: 0, borderWidth: 1, shadow: 'none', font: 'sans', headingWeight: 700, letterSpacing: '-0.02em' },
  },
  {
    slug: 'bauhaus', name: 'Bauhaus', nameKo: '바우하우스',
    summary: 'Primary colours (red, yellow, blue), basic geometric shapes (circle, square, triangle) and functional sans-serif type.',
    summaryKo: '빨강·노랑·파랑 원색과 원·네모·세모. 기능을 앞세운 독일 바우하우스 학교의 조형이다.',
    keywords: ['bauhaus', 'primary colors', 'geometric shapes', 'circle square triangle', 'functional typography'], tags: ['geometric', 'colorful'],
    goodFor: '문화·전시 사이트, 브랜드 소개',
    tokens: { bg: '#f2ead3', surface: '#ffffff', text: '#1a1a1a', muted: '#4a4a4a', primary: '#d92b2b', onPrimary: '#ffffff', accent: '#1f4fa3', border: '#1a1a1a', radius: 0, borderWidth: 2, shadow: 'none', font: 'sans', headingWeight: 800, textTransform: 'uppercase' },
  },
  {
    slug: 'memphis', name: 'Memphis', nameKo: '멤피스',
    summary: '1980s Memphis Group: clashing bright colours, squiggles, confetti dots, zigzags and bold geometric patterns.',
    summaryKo: '1980년대 멤피스 그룹풍. 꼬불꼬불한 선, 땡땡이, 지그재그와 부딪치는 원색.',
    keywords: ['memphis design', 'squiggles', 'confetti pattern', 'zigzag', 'clashing bright colors'], tags: ['playful', 'retro', 'pattern'],
    goodFor: '어린이·이벤트·패션 페이지',
    tokens: { bg: '#fff3e0', surface: '#ffffff', text: '#1b1b3a', muted: '#4a4a6a', primary: '#ff4f9a', onPrimary: '#ffffff', accent: '#00b8d9', border: '#1b1b3a', radius: 12, borderWidth: 2, shadow: '6px 6px 0 #ffd23f', font: 'rounded', headingWeight: 800 },
  },
  {
    slug: 'synthwave', name: 'Synthwave / Retro 80s', nameKo: '신스웨이브 (레트로 80년대)',
    summary: 'Neon pink and cyan on dark purple, sunset gradients, chrome text and perspective grids inspired by 1980s sci-fi.',
    summaryKo: '어두운 보라 바탕에 네온 분홍·하늘색, 노을 그라디언트와 원근 격자. 80년대 공상과학 감성.',
    keywords: ['synthwave', 'outrun', 'neon glow', 'sunset gradient', 'perspective grid', 'chrome text'], tags: ['dark', 'neon', 'retro'],
    goodFor: '게임, 음악, 이벤트 페이지',
    tokens: { bg: '#1a0b2e', surface: '#2b1150', text: '#fdf2ff', muted: '#c9a8e8', primary: '#ff2e97', onPrimary: '#1a0b2e', accent: '#2de2e6', border: '#ff2e97', radius: 4, borderWidth: 1, shadow: '0 0 16px rgba(255,46,151,.6)', font: 'display', headingWeight: 800, textTransform: 'uppercase', background: 'linear-gradient(180deg, #1a0b2e 0%, #3d1263 60%, #ff6a3d 100%)' },
  },
  {
    slug: 'y2k', name: 'Y2K', nameKo: 'Y2K',
    summary: 'Turn-of-the-millennium optimism: chrome and iridescent gradients, bubbly shapes, metallic type, stars and early-web gloss.',
    summaryKo: '2000년 전후 감성. 크롬·무지갯빛 광택, 말랑한 거품 모양, 반짝이는 별.',
    keywords: ['Y2K aesthetic', 'chrome', 'iridescent', 'bubble shapes', 'glossy', 'sparkles'], tags: ['retro', 'shiny'],
    goodFor: '패션·음악·Z세대 대상 서비스',
    tokens: { bg: '#e8f0ff', surface: '#ffffff', text: '#1c1c3c', muted: '#4b4b7a', primary: '#7b5cff', onPrimary: '#ffffff', accent: '#00e0ff', border: '#b9c4ff', radius: 999, borderWidth: 2, shadow: '0 6px 20px rgba(123,92,255,.35)', font: 'rounded', headingWeight: 800, background: 'linear-gradient(135deg, #e0f7ff 0%, #f3e1ff 50%, #ffe6f2 100%)' },
  },
  {
    slug: 'vaporwave', name: 'Vaporwave', nameKo: '베이퍼웨이브',
    summary: 'Pastel pink and teal, 90s computer graphics, Greek statues, glitch and nostalgic consumer-culture imagery.',
    summaryKo: '분홍·청록 파스텔, 90년대 컴퓨터 그래픽, 글리치. 아련하고 몽환적인 향수.',
    keywords: ['vaporwave', 'pastel pink teal', '90s computer graphics', 'glitch', 'retro windows'], tags: ['retro', 'pastel'],
    goodFor: '음악, 아트 프로젝트',
    tokens: { bg: '#ffd6f5', surface: '#c4f5fc', text: '#2d1b4e', muted: '#5b3f80', primary: '#ff71ce', onPrimary: '#2d1b4e', accent: '#01cdfe', border: '#2d1b4e', radius: 0, borderWidth: 2, shadow: '4px 4px 0 #b967ff', font: 'mono', headingWeight: 700 },
  },
  {
    slug: 'skeuomorphism', name: 'Skeuomorphism', nameKo: '스큐어모피즘',
    summary: 'Interfaces that imitate real materials and objects (leather, paper, metal knobs) with textures, highlights and realistic shadows.',
    summaryKo: '가죽·종이·금속 단추처럼 실제 물건을 흉내 낸 질감과 그림자. 옛 아이폰 화면 같다.',
    keywords: ['skeuomorphism', 'realistic textures', 'glossy buttons', 'leather and paper', 'realistic shadows'], tags: ['realistic', 'retro'],
    goodFor: '악기·카메라 앱, 레트로 콘셉트',
    tokens: { bg: '#d9d4c7', surface: '#f5f1e6', text: '#2b2418', muted: '#5c5140', primary: '#3a6ea5', onPrimary: '#ffffff', accent: '#a5462d', border: '#9c9179', radius: 10, borderWidth: 1, shadow: 'inset 0 1px 0 rgba(255,255,255,.8), 0 2px 4px rgba(0,0,0,.35)', font: 'serif', headingWeight: 700, background: 'linear-gradient(180deg, #e3ded2, #cfc8b8)' },
  },
  {
    slug: 'claymorphism', name: 'Claymorphism', nameKo: '클레이모피즘',
    summary: 'Soft, inflated clay-like 3D shapes: big radii, pastel colours, inner highlights and outer shadows.',
    summaryKo: '찰흙으로 빚은 듯 통통한 입체. 아주 둥근 모서리, 파스텔색, 안쪽 빛과 바깥 그림자.',
    keywords: ['claymorphism', 'clay 3D', 'inflated shapes', 'pastel', 'inner shadow'], tags: ['soft', '3d', 'pastel'],
    goodFor: '어린이·핀테크·게임화 서비스',
    tokens: { bg: '#f1ecff', surface: '#ffffff', text: '#2e2a4f', muted: '#5d5885', primary: '#8b7cf6', onPrimary: '#ffffff', accent: '#ffb86c', border: 'transparent', radius: 28, borderWidth: 0, shadow: 'inset -6px -6px 12px rgba(139,124,246,.25), inset 6px 6px 12px rgba(255,255,255,.9), 10px 14px 24px rgba(139,124,246,.3)', font: 'rounded', headingWeight: 800 },
  },
  {
    slug: 'dark-oled', name: 'Dark mode (OLED)', nameKo: '다크 모드 (OLED)',
    summary: 'True-black or near-black backgrounds, light text with reduced brightness, accents used sparingly; saves power on OLED screens.',
    summaryKo: '아주 어두운 바탕에 너무 밝지 않은 글자. 강조색은 아껴 쓴다.',
    keywords: ['dark mode', 'true black', 'OLED', 'low glare', 'subtle accents'], tags: ['dark'],
    goodFor: '개발자 도구, 영상·음악 앱',
    tokens: { bg: '#000000', surface: '#121212', text: '#e8e8e8', muted: '#a0a0a0', primary: '#8ab4f8', onPrimary: '#0b1a33', accent: '#f28b82', border: '#2a2a2a', radius: 10, borderWidth: 1, shadow: 'none', font: 'sans', headingWeight: 600 },
  },
  {
    slug: 'cyberpunk', name: 'Cyberpunk', nameKo: '사이버펑크',
    summary: 'High-tech dystopia: black backgrounds, acid yellow and neon accents, glitch effects, angular cut corners and HUD-like details.',
    summaryKo: '검은 바탕에 형광 노랑·네온, 글리치와 깎인 모서리, 게임 계기판(HUD) 같은 장식.',
    keywords: ['cyberpunk', 'neon', 'glitch', 'HUD', 'angular clipped corners', 'acid yellow'], tags: ['dark', 'neon', 'game'],
    goodFor: '게임, 테크 이벤트',
    tokens: { bg: '#0a0a0f', surface: '#14141f', text: '#f0f0f0', muted: '#9a9ab0', primary: '#fcee0a', onPrimary: '#0a0a0f', accent: '#00f0ff', border: '#fcee0a', radius: 0, borderWidth: 1, shadow: '0 0 12px rgba(0,240,255,.45)', font: 'mono', headingWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' },
  },
  {
    slug: 'saas-clean', name: 'Clean SaaS', nameKo: '깔끔한 SaaS',
    summary: 'The modern startup look: neutral greys, one confident brand colour, soft shadows, rounded cards, product screenshots and clear CTAs.',
    summaryKo: '요즘 스타트업 표준. 회색 바탕에 브랜드색 하나, 부드러운 그림자와 둥근 카드.',
    keywords: ['modern SaaS', 'clean UI', 'soft shadows', 'rounded cards', 'single brand color', 'linear-style'], tags: ['clean', 'light', 'business'],
    goodFor: 'B2B 도구, 대시보드, 랜딩 페이지',
    tokens: { bg: '#f8fafc', surface: '#ffffff', text: '#0f172a', muted: '#64748b', primary: '#4f46e5', onPrimary: '#ffffff', accent: '#06b6d4', border: '#e2e8f0', radius: 12, borderWidth: 1, shadow: '0 1px 2px rgba(15,23,42,.06), 0 4px 12px rgba(15,23,42,.06)', font: 'sans', headingWeight: 650 },
  },
  {
    slug: 'editorial', name: 'Editorial / Magazine', nameKo: '에디토리얼 (잡지)',
    summary: 'Magazine-like layouts: large serif headlines, multi-column text, pull quotes, strong photography and careful typographic rhythm.',
    summaryKo: '잡지처럼 큰 명조 제목, 여러 단 본문, 인용구, 큰 사진. 글이 주인공이다.',
    keywords: ['editorial design', 'magazine layout', 'serif headlines', 'pull quotes', 'columns'], tags: ['typography', 'serif'],
    goodFor: '블로그, 뉴스레터, 브랜드 이야기',
    tokens: { bg: '#fbf8f3', surface: '#ffffff', text: '#1d1a16', muted: '#6b6257', primary: '#1d1a16', onPrimary: '#fbf8f3', accent: '#b5452c', border: '#d9d1c4', radius: 0, borderWidth: 1, shadow: 'none', font: 'serif', headingWeight: 700, letterSpacing: '-0.01em' },
  },
  {
    slug: 'bento', name: 'Bento grid', nameKo: '벤토 그리드',
    summary: 'Content arranged in rounded tiles of different sizes, like a bento box; popular for feature overviews and personal pages.',
    summaryKo: '도시락 칸처럼 크기가 다른 둥근 칸에 내용을 나눠 담는다. 기능 소개에 많이 쓴다.',
    keywords: ['bento grid', 'rounded tiles', 'modular cards', 'feature grid', 'apple-style'], tags: ['layout', 'clean'],
    goodFor: '기능 소개, 개인 소개 페이지',
    tokens: { bg: '#f2f2f7', surface: '#ffffff', text: '#111114', muted: '#6e6e73', primary: '#0071e3', onPrimary: '#ffffff', accent: '#ff9f0a', border: '#e5e5ea', radius: 24, borderWidth: 0, shadow: '0 2px 10px rgba(0,0,0,.05)', font: 'sans', headingWeight: 700 },
  },
  {
    slug: 'aurora', name: 'Aurora gradients', nameKo: '오로라 그라디언트',
    summary: 'Large blurred colour blobs and mesh gradients flowing behind content, often on dark backgrounds (Stripe, Linear-style hero sections).',
    summaryKo: '흐릿하게 번진 색 덩어리가 내용 뒤로 흐른다. 어두운 바탕의 첫 화면에 자주 쓴다.',
    keywords: ['aurora background', 'mesh gradient', 'blurred blobs', 'glow', 'dark hero'], tags: ['gradient', 'dark'],
    goodFor: 'AI·테크 랜딩 페이지 첫 화면',
    tokens: { bg: '#05060f', surface: 'rgba(255,255,255,0.06)', text: '#f5f7ff', muted: '#a4abc8', primary: '#a78bfa', onPrimary: '#05060f', accent: '#22d3ee', border: 'rgba(255,255,255,0.12)', radius: 14, borderWidth: 1, shadow: 'none', font: 'sans', headingWeight: 700, background: 'radial-gradient(60% 50% at 25% 20%, rgba(124,58,237,.55), transparent), radial-gradient(50% 40% at 80% 30%, rgba(34,211,238,.45), transparent), #05060f' },
  },
  {
    slug: 'monochrome', name: 'Monochrome', nameKo: '모노크롬',
    summary: 'A single hue (often black and white) with tints and shades only; relies on type, spacing and contrast instead of colour.',
    summaryKo: '흑백이나 한 가지 색의 명암만 쓴다. 색 대신 글자와 여백으로 승부한다.',
    keywords: ['monochrome', 'black and white', 'single hue', 'high contrast typography'], tags: ['clean', 'typography'],
    goodFor: '사진·패션 포트폴리오, 문서형 서비스',
    tokens: { bg: '#f5f5f5', surface: '#ffffff', text: '#0a0a0a', muted: '#5c5c5c', primary: '#0a0a0a', onPrimary: '#ffffff', accent: '#5c5c5c', border: '#d4d4d4', radius: 2, borderWidth: 1, shadow: 'none', font: 'sans', headingWeight: 700 },
  },
  {
    slug: 'pastel', name: 'Pastel', nameKo: '파스텔',
    summary: 'Soft, low-saturation colours, gentle rounded shapes and friendly type; calm and approachable.',
    summaryKo: '채도 낮은 연한 색과 둥근 모양. 부드럽고 다가가기 쉬운 느낌.',
    keywords: ['pastel colors', 'soft', 'friendly', 'rounded', 'calm'], tags: ['soft', 'light'],
    goodFor: '육아·건강·습관 앱',
    tokens: { bg: '#fdf6f0', surface: '#ffffff', text: '#3b3355', muted: '#6f6890', primary: '#7c6ccf', onPrimary: '#ffffff', accent: '#f4a6b7', border: '#ece3f7', radius: 16, borderWidth: 1, shadow: '0 4px 14px rgba(124,108,207,.12)', font: 'rounded', headingWeight: 700 },
  },
  {
    slug: 'kawaii', name: 'Kawaii / Cute', nameKo: '귀여움 (카와이)',
    summary: 'Cute aesthetic: bubbly rounded type, mascots, stickers, candy colours and bouncy micro-interactions.',
    summaryKo: '말랑한 둥근 글자, 캐릭터와 스티커, 사탕 같은 색, 통통 튀는 움직임.',
    keywords: ['kawaii', 'cute', 'stickers', 'candy colors', 'bubbly rounded font', 'mascot'], tags: ['playful', 'pastel'],
    goodFor: '어린이, 캐릭터 상품, 커뮤니티',
    tokens: { bg: '#fff0f6', surface: '#ffffff', text: '#4a2545', muted: '#80577b', primary: '#ff6fae', onPrimary: '#ffffff', accent: '#7ad7f0', border: '#ffc6df', radius: 24, borderWidth: 2, shadow: '0 4px 0 #ffc6df', font: 'rounded', headingWeight: 800 },
  },
  {
    slug: 'terminal', name: 'Terminal / Hacker', nameKo: '터미널 (해커)',
    summary: 'Command-line look: monospace text, green or amber on black, blinking cursor, ASCII boxes and minimal chrome.',
    summaryKo: '검은 화면에 초록·호박색 고정폭 글자, 깜빡이는 커서, 글자로 그린 상자.',
    keywords: ['terminal UI', 'monospace', 'green on black', 'CRT', 'ASCII art', 'command line'], tags: ['dark', 'developer', 'mono'],
    goodFor: '개발자 도구, 포트폴리오, CLI 소개',
    tokens: { bg: '#0c0f0a', surface: '#11160f', text: '#33ff66', muted: '#1fa847', primary: '#33ff66', onPrimary: '#0c0f0a', accent: '#ffb000', border: '#1fa847', radius: 0, borderWidth: 1, shadow: '0 0 8px rgba(51,255,102,.25)', font: 'mono', headingWeight: 700 },
  },
  {
    slug: 'pixel-art', name: 'Pixel art / 8-bit', nameKo: '픽셀 아트 (8비트)',
    summary: 'Retro game look: pixel fonts, chunky stepped borders, limited palettes and sprite-like icons.',
    summaryKo: '옛날 게임기 화면처럼 픽셀 글꼴, 계단 같은 테두리, 몇 가지 색만 쓴다.',
    keywords: ['pixel art', '8-bit', 'retro game UI', 'pixel font', 'limited palette', 'NES.css'], tags: ['retro', 'game'],
    goodFor: '게임, 이벤트, 개인 프로젝트',
    tokens: { bg: '#212529', surface: '#ffffff', text: '#212529', muted: '#4a4f55', primary: '#209cee', onPrimary: '#ffffff', accent: '#e76e55', border: '#212529', radius: 0, borderWidth: 4, shadow: '4px 4px 0 #212529', font: 'mono', headingWeight: 700, textTransform: 'uppercase' },
  },
  {
    slug: 'hand-drawn', name: 'Hand-drawn / Sketch', nameKo: '손그림 (스케치)',
    summary: 'Wobbly hand-drawn lines, marker highlights, doodles and handwritten type; feels human and informal (Excalidraw style).',
    summaryKo: '삐뚤빼뚤한 손그림 선과 형광펜, 낙서, 손글씨. 사람 냄새 나고 편안하다.',
    keywords: ['hand-drawn', 'sketchy lines', 'doodles', 'handwriting font', 'marker highlight', 'rough.js'], tags: ['playful', 'informal'],
    goodFor: '교육, 메모·기획 도구, 개인 블로그',
    tokens: { bg: '#fffdf7', surface: '#ffffff', text: '#1e1e1e', muted: '#555555', primary: '#1971c2', onPrimary: '#ffffff', accent: '#ffd43b', border: '#1e1e1e', radius: 4, borderWidth: 2, shadow: '2px 3px 0 #1e1e1e', font: 'rounded', headingWeight: 700 },
  },
  {
    slug: 'paper', name: 'Paper / Craft', nameKo: '종이·크래프트',
    summary: 'Warm paper textures, torn edges, kraft browns, stamps and tape; tactile and analogue.',
    summaryKo: '누런 종이 질감, 찢긴 가장자리, 갈색 크라프트지와 도장·테이프. 아날로그 감성.',
    keywords: ['paper texture', 'kraft paper', 'torn edges', 'stamps', 'washi tape', 'analog'], tags: ['warm', 'texture'],
    goodFor: '수공예·카페·문구 브랜드',
    tokens: { bg: '#efe6d2', surface: '#fbf6ea', text: '#3b2f22', muted: '#6e5d48', primary: '#8c5a2b', onPrimary: '#fbf6ea', accent: '#c4443a', border: '#c9b48f', radius: 2, borderWidth: 1, shadow: '0 2px 6px rgba(80,60,30,.2)', font: 'serif', headingWeight: 700 },
  },
  {
    slug: 'organic', name: 'Organic / Earthy', nameKo: '자연·어스톤',
    summary: 'Natural, earthy palette (sage, clay, sand), soft organic shapes, plenty of air and photography of materials and plants.',
    summaryKo: '세이지 초록·흙색·모래색, 부드러운 곡선, 넉넉한 여백. 자연스럽고 차분하다.',
    keywords: ['organic design', 'earth tones', 'sage green', 'terracotta', 'soft curves', 'natural materials'], tags: ['warm', 'calm'],
    goodFor: '웰니스, 식품, 친환경 브랜드',
    tokens: { bg: '#f4f1ea', surface: '#fbfaf6', text: '#2f3a2f', muted: '#5f6b5c', primary: '#5a7d5a', onPrimary: '#ffffff', accent: '#c46a45', border: '#ddd6c6', radius: 20, borderWidth: 1, shadow: '0 6px 18px rgba(47,58,47,.08)', font: 'serif', headingWeight: 600 },
  },
  {
    slug: 'luxury', name: 'Luxury / Black and gold', nameKo: '럭셔리 (블랙 앤 골드)',
    summary: 'Black or deep backgrounds, gold or champagne accents, elegant serif type with wide letter spacing and slow, refined motion.',
    summaryKo: '깊은 검정 바탕에 금색, 자간 넓은 우아한 명조. 느리고 절제된 움직임.',
    keywords: ['luxury', 'black and gold', 'elegant serif', 'wide letter spacing', 'premium'], tags: ['dark', 'premium', 'serif'],
    goodFor: '호텔·뷰티·고급 상품',
    tokens: { bg: '#0d0d0d', surface: '#171717', text: '#f2ede4', muted: '#b3a998', primary: '#c9a85c', onPrimary: '#0d0d0d', accent: '#e8d9b5', border: '#3a3326', radius: 0, borderWidth: 1, shadow: 'none', font: 'serif', headingWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' },
  },
  {
    slug: 'playful', name: 'Playful', nameKo: '플레이풀',
    summary: 'Bright friendly colours, rounded shapes, bouncy animation, illustrations and casual copy (Duolingo-like).',
    summaryKo: '밝은 색, 둥근 모양, 통통 튀는 움직임과 일러스트. 친구처럼 말을 거는 화면.',
    keywords: ['playful UI', 'bright friendly colors', 'rounded', 'bouncy animation', 'illustrations', 'gamified'], tags: ['playful', 'colorful'],
    goodFor: '학습·습관·게임화 서비스',
    tokens: { bg: '#ffffff', surface: '#f7f7f7', text: '#3c3c3c', muted: '#777777', primary: '#58cc02', onPrimary: '#ffffff', accent: '#1cb0f6', border: '#e5e5e5', radius: 16, borderWidth: 2, shadow: '0 4px 0 #46a302', font: 'rounded', headingWeight: 800 },
  },
  {
    slug: 'scandinavian', name: 'Scandinavian', nameKo: '스칸디나비아',
    summary: 'Light, airy and functional: off-white backgrounds, muted blues and wood tones, simple sans-serif type.',
    summaryKo: '밝고 담백한 북유럽풍. 미색 바탕, 차분한 파랑과 나무색, 단순한 산세리프.',
    keywords: ['scandinavian design', 'nordic', 'airy', 'muted colors', 'functional', 'light wood'], tags: ['calm', 'light'],
    goodFor: '가구·인테리어·라이프스타일',
    tokens: { bg: '#f7f5f0', surface: '#ffffff', text: '#2a2f33', muted: '#6a7178', primary: '#3d5a73', onPrimary: '#ffffff', accent: '#c8a27a', border: '#e3dfd6', radius: 8, borderWidth: 1, shadow: '0 2px 8px rgba(42,47,51,.06)', font: 'sans', headingWeight: 600 },
  },
  {
    slug: 'japandi', name: 'Japandi / Wabi-sabi', nameKo: '재팬디 (와비사비)',
    summary: 'Japanese minimalism meets Scandinavian warmth: natural textures, muted earth colours, asymmetry and quiet space.',
    summaryKo: '일본식 절제와 북유럽 온기를 섞었다. 흙빛·먹색, 비대칭, 고요한 여백.',
    keywords: ['japandi', 'wabi-sabi', 'zen', 'muted earth colors', 'asymmetry', 'natural texture'], tags: ['calm', 'warm'],
    goodFor: '공예·차·숙소 브랜드',
    tokens: { bg: '#efebe4', surface: '#f8f6f1', text: '#2b2724', muted: '#6b635a', primary: '#2b2724', onPrimary: '#f8f6f1', accent: '#9a6b4a', border: '#d6cfc3', radius: 4, borderWidth: 1, shadow: 'none', font: 'serif', headingWeight: 500, letterSpacing: '0.04em' },
  },
  {
    slug: 'retro-os', name: 'Retro OS (Windows 95)', nameKo: '레트로 OS (윈도 95)',
    summary: 'Classic desktop UI: grey bevelled windows, title bars, pixel icons and system fonts from 90s operating systems.',
    summaryKo: '90년대 윈도 화면. 회색 입체 창, 파란 제목 막대, 픽셀 아이콘.',
    keywords: ['windows 95', 'retro OS', 'bevelled buttons', 'title bar', '98.css'], tags: ['retro', 'nostalgia'],
    goodFor: '장난스러운 포트폴리오, 이벤트',
    tokens: { bg: '#008080', surface: '#c0c0c0', text: '#000000', muted: '#404040', primary: '#000080', onPrimary: '#ffffff', accent: '#800080', border: '#808080', radius: 0, borderWidth: 2, shadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf', font: 'sans', headingWeight: 700 },
  },
  {
    slug: 'newspaper', name: 'Newspaper', nameKo: '신문',
    summary: 'Broadsheet look: off-white newsprint, black serif headlines, rules between columns, dense but orderly text.',
    summaryKo: '누런 신문지에 굵은 명조 제목, 단 사이 괘선, 빽빽하지만 질서 있는 글.',
    keywords: ['newspaper layout', 'broadsheet', 'serif headlines', 'column rules', 'newsprint'], tags: ['serif', 'typography'],
    goodFor: '뉴스레터, 기록·아카이브 사이트',
    tokens: { bg: '#f4f0e6', surface: '#f9f6ee', text: '#111111', muted: '#444444', primary: '#111111', onPrimary: '#f4f0e6', accent: '#8b0000', border: '#111111', radius: 0, borderWidth: 1, shadow: 'none', font: 'serif', headingWeight: 900, letterSpacing: '-0.01em' },
  },
  {
    slug: 'blueprint', name: 'Blueprint', nameKo: '청사진',
    summary: 'Technical drawing on blue: white line work, grid paper, measurement marks and monospace annotations.',
    summaryKo: '파란 바탕에 흰 선, 모눈 격자, 치수 표시. 설계도 같은 기술 느낌.',
    keywords: ['blueprint', 'technical drawing', 'grid paper', 'white line art', 'annotations'], tags: ['technical', 'dark'],
    goodFor: '하드웨어·건축·개발 도구 소개',
    tokens: { bg: '#123c69', surface: '#164a80', text: '#eaf3ff', muted: '#a9c7ea', primary: '#ffffff', onPrimary: '#123c69', accent: '#ffd166', border: '#a9c7ea', radius: 0, borderWidth: 1, shadow: 'none', font: 'mono', headingWeight: 600, background: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px) 0 0/24px 24px, #123c69' },
  },
  {
    slug: 'duotone', name: 'Duotone', nameKo: '듀오톤',
    summary: 'Two bold colours do all the work: images and graphics mapped to a two-colour gradient (Spotify-style campaigns).',
    summaryKo: '강한 두 색만으로 사진과 그래픽을 칠한다. 포스터처럼 강렬하다.',
    keywords: ['duotone', 'two-color', 'bold contrast', 'gradient map', 'poster'], tags: ['bold', 'colorful'],
    goodFor: '캠페인, 음악, 이벤트',
    tokens: { bg: '#1e0a3c', surface: '#2a1257', text: '#f8f0ff', muted: '#cdb6ee', primary: '#ff5ea0', onPrimary: '#1e0a3c', accent: '#5ef1ff', border: '#ff5ea0', radius: 6, borderWidth: 0, shadow: 'none', font: 'sans', headingWeight: 900 },
  },
  {
    slug: 'high-contrast', name: 'High-contrast accessible', nameKo: '고대비 (접근성 우선)',
    summary: 'Built for legibility first: strong text contrast (WCAG AAA where possible), large targets, clear focus rings and no colour-only signals.',
    summaryKo: '읽기 쉬움이 먼저. 글자 대비를 아주 높이고, 누르는 곳을 크게, 초점 테두리를 뚜렷하게 한다.',
    keywords: ['high contrast', 'accessible', 'WCAG AAA', 'large touch targets', 'visible focus ring'], tags: ['accessibility', 'clean'],
    goodFor: '공공·의료·어르신 대상 서비스',
    tokens: { bg: '#ffffff', surface: '#ffffff', text: '#000000', muted: '#333333', primary: '#0040a0', onPrimary: '#ffffff', accent: '#b00020', border: '#000000', radius: 6, borderWidth: 2, shadow: 'none', font: 'sans', headingWeight: 800 },
  },
  {
    slug: 'gradient-modern', name: 'Vibrant gradients', nameKo: '선명한 그라디언트',
    summary: 'Saturated multi-colour gradients on buttons, text and backgrounds; energetic and contemporary (Instagram-era branding).',
    summaryKo: '버튼·글자·바탕에 쨍한 여러 색 그라디언트. 활기차고 요즘스럽다.',
    keywords: ['vibrant gradient', 'gradient text', 'colorful buttons', 'energetic', 'modern branding'], tags: ['gradient', 'colorful'],
    goodFor: 'SNS·크리에이터·이벤트 서비스',
    tokens: { bg: '#ffffff', surface: '#fafaff', text: '#1a1033', muted: '#5f5a7a', primary: '#8a3ffc', onPrimary: '#ffffff', accent: '#ff7a59', border: '#ece8ff', radius: 14, borderWidth: 1, shadow: '0 10px 30px rgba(138,63,252,.18)', font: 'sans', headingWeight: 800, background: 'linear-gradient(120deg, #fdf2ff 0%, #fff4ec 100%)' },
  },
];

const FONT_STACK: Record<Tokens['font'], string> = {
  sans: 'system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  serif: 'ui-serif, Georgia, "Nanum Myeongjo", "Batang", serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  rounded: 'ui-rounded, "SF Pro Rounded", system-ui, "Apple SD Gothic Neo", sans-serif',
  display: 'system-ui, "Arial Black", "Apple SD Gothic Neo", sans-serif',
};

function cssVars(s: Style): string {
  const t = s.tokens;
  const lines = [
    `/* ${s.name} (${s.nameKo}) — 코드잇소 스타일 견본 */`,
    ':root {',
    `  --bg: ${t.bg};`, `  --surface: ${t.surface};`, `  --text: ${t.text};`, `  --muted: ${t.muted};`,
    `  --primary: ${t.primary};`, `  --on-primary: ${t.onPrimary};`, `  --accent: ${t.accent};`, `  --border: ${t.border};`,
    `  --radius: ${t.radius}px;`, `  --border-width: ${t.borderWidth}px;`, `  --shadow: ${t.shadow};`,
    `  --font: ${FONT_STACK[t.font]};`, `  --heading-weight: ${t.headingWeight};`,
    ...(t.letterSpacing ? [`  --letter-spacing: ${t.letterSpacing};`] : []),
    ...(t.backdrop ? [`  --backdrop: ${t.backdrop};`] : []),
    ...(t.background ? [`  --page-background: ${t.background};`] : []),
    '}',
  ];
  return lines.join('\n');
}

await main('design-styles', async () => {
  const items: Item[] = STYLES.map((s) =>
    makeItem({
      id: `styles:${s.slug}`,
      name: `${s.nameKo} (${s.name})`,
      kind: 'styles',
      summary: s.summary,
      summaryKo: s.summaryKo,
      written: 'codeshopper',
      url: `https://dribbble.com/search/${encodeURIComponent(s.keywords[0] as string)}`,
      source: { name: '코드잇소 (직접 정의)', url: 'https://github.com/yoorrard/codeitso' },
      tags: ['style', ...s.tags],
      preview: { type: 'style', tokens: { ...s.tokens, fontStack: FONT_STACK[s.tokens.font] }, keywords: s.keywords, goodFor: s.goodFor },
      use: {
        snippet: `${cssVars(s)}\n\n/* AI에게: "${s.name} style — ${s.keywords.join(', ')}" */`,
        docs: `https://dribbble.com/search/${encodeURIComponent(s.keywords[0] as string)}`,
      },
      fetchedAt: CURATED_AT,
    }),
  );
  writeCatalog(
    {
      id: 'styles',
      name: 'Design styles (tone presets written by 코드잇소)',
      url: 'https://github.com/yoorrard/codeitso',
      license: 'Written by 코드잇소 for this catalog. Token values are our own presets for local previews, not taken from any design system. url points to a Dribbble search for real-world examples.',
    },
    items,
  );
});
