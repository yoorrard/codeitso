// 자료로 만드는 한국어 한 줄 (D143). 번역하지 않은 모든 상품이 한국어로 먼저 읽히게, 출처 자료의 정해진 칸
// (소분류·에이전트·연결 방식·언어·작업·형식·인증·꼬리표…)만으로 '무엇인지'를 한두 문장으로 쓴다. AI를 부르지 않는다.
// - 지어내지 않는다: 칸에 없는 것은 쓰지 않고, 꼬리표는 아래 사전에 있는 것만 옮긴다(사전에 없으면 뺀다).
// - 매일 흔들리는 수(스타·내려받기·개수)는 넣지 않는다. 문장이 날마다 바뀌지 않게.
// - 다체(상품 설명, .claude/rules/copy.md). 영어 이름 뒤에는 받침에 따라 갈리는 조사를 되도록 붙이지 않는다.
// - 첫 문장(머리)은 카드에, 전체는 상세에 보인다. 출처 원문은 그대로 함께 보인다(카드는 이어서, 상세는 펼쳐서).
// 모양이 정해진 상품(글꼴·색·아이콘…)은 ko-template.ts가 더 자세히 쓴다. 이 파일은 그 밖의 모든 소분류를 맡는다.
// 부작용 없는 순수 함수라 시험이 그대로 부른다. 진열대 빌드(scripts/catalog/load.ts)가 쓴다.
import { headSentence } from '../../src/lib/catalog/core.ts';
import type { CatalogItem } from '../../src/lib/catalog/types.ts';
import { KO_MAX, TEMPLATE_KINDS, commas, joinSentences, templateKo } from './ko-template.ts';

type Preview = CatalogItem['preview'];

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : []);
const uniq = <T>(xs: readonly T[]): T[] => [...new Set(xs)];
/** 사전 찾기: 자기 칸만 본다 ('constructor' 같은 꼬리표가 Object 원형을 꺼내지 않게) */
const look = (dict: Readonly<Record<string, string>>, key: string | undefined): string | undefined =>
  key !== undefined && Object.hasOwn(dict, key) ? dict[key] : undefined;

/** 글이 이미 한국어인가 (출처가 한국어로 준 설명: 공공데이터포털 등). 글자 가운데 한글이 30% 넘으면 그렇다 */
export function isKoreanText(s: string): boolean {
  const letters = s.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return false;
  const hangul = letters.filter((c) => /[가-힣ㄱ-ㆎ]/.test(c)).length;
  return hangul / letters.length > 0.3;
}

// ---------- 조사 ----------
// 영어 이름은 읽는 소리로 받침이 갈린다. 자주 나오는 이름 가운데 받침이 있는(ㄹ 받침 제외) 것만 적는다. 나머지는 '로'.
const RO_EU = new Set([
  'python', 'c#', 'kotlin', 'jupyter notebook', 'nim', 'erlang', 'f#', 'tex', 'elm', 'npm', 'pip', 'pub', 'streamlit', 'zig', 'webassembly',
  'objective-c++', 'scheme', 'common lisp', 'powershell', 'mdx', 'gleam', 'vim script', 'vim', 'pascal', 'apex', 'qml', 'cython', 'jsonnet', 'hcl',
]);
/** '…으로'/'…로' (영어 이름은 읽는 소리 기준, 한글은 받침 기준) */
export function ro(word: string): string {
  const w = word.trim();
  const last = w.slice(-1);
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    return `${w}${jong === 0 || jong === 8 ? '로' : '으로'}`;
  }
  if (/[0-9]$/.test(w)) return `${w}${/[0136780]$/.test(w) ? '으로' : '로'}`;
  return `${w}${RO_EU.has(w.toLowerCase()) ? '으로' : '로'}`;
}

/** '…이다'/'…다' (한글 낱말 뒤에만 쓴다) */
const ida = (noun: string): string => {
  const code = noun.trim().slice(-1).charCodeAt(0);
  const batchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return `${noun}${batchim ? '이다' : '다'}`;
};

const list = (xs: readonly string[], max = 2): string => uniq(xs).slice(0, max).join('·');

// ---------- 사전 ----------
/** 꼬리표·분야 → 한국어 주제 말. 여기 없는 꼬리표는 문장에 넣지 않는다 */
export const TOPIC_KO: Readonly<Record<string, string>> = {
  // 일·업무
  productivity: '생산성', 'workplace-and-productivity': '업무 생산성', collaboration: '협업', 'project-management': '프로젝트 관리',
  'product-management': '제품 관리', crm: 'CRM', erp: 'ERP', hr: '인사 관리', marketing: '마케팅', sales: '영업', seo: 'SEO',
  'business-marketing': '마케팅', business: '비즈니스', email: '이메일', calendar: '일정', notes: '메모', 'note-taking': '메모',
  documentation: '문서', forms: '설문·폼', 'customer-support': '고객 지원', 'support-and-service-management': '고객 지원', legal: '법률',
  compliance: '규정 준수', accounting: '회계', invoicing: '청구서',
  // 개발
  'developer-tools': '개발 도구', 'dev-tools': '개발 도구', devtools: '개발 도구', development: '개발', 'software-development': '개발',
  testing: '테스트', debugging: '디버깅', 'version-control': '버전 관리', 'code-execution': '코드 실행', 'code-review': '코드 리뷰',
  devops: 'DevOps', 'ci-cd': 'CI/CD', monitoring: '모니터링', observability: '관측', logs: '로그', logging: '로그', infrastructure: '인프라',
  'cloud-platforms': '클라우드', cloud: '클라우드', serverless: '서버리스',
  'command-line': '명령줄', cli: '명령줄', terminal: '터미널', 'file-systems': '파일 시스템', 'system-tools': '시스템 도구',
  'os-automation': '운영체제 자동화', automation: '자동화', 'browser-automation': '브라우저 자동화', 'web-scraping': '웹 수집',
  scraping: '웹 수집', 'search-and-data-extraction': '검색·데이터 추출', search: '검색',
  database: '데이터베이스', databases: '데이터베이스', sql: '데이터베이스', 'data-platforms': '데이터 플랫폼', 'data-science-tools': '데이터 과학',
  'data-visualization': '데이터 시각화', analytics: '분석', 'data-analytics': '데이터 분석', markdown: '문서 작성',
  security: '보안', authentication: '인증', auth: '인증', authorization: '권한 관리', oauth: '인증', oauth2: '인증', jwt: '인증',
  privacy: '개인정보 보호', 'architecture-and-design': '설계', design: '디자인', performance: '성능', accessibility: '접근성', i18n: '다국어',
  frontend: '프론트엔드', backend: '백엔드', 'static-site-generator': '정적 사이트 생성', 'static-site': '정적 사이트',
  'headless-cms': '헤드리스 CMS', cms: 'CMS', ecommerce: '쇼핑몰', 'e-commerce': '쇼핑몰', payments: '결제',
  'admin-dashboard': '관리자 대시보드', dashboard: '대시보드', 'admin-panel': '관리자 화면', admin: '관리자 화면', 'admin-template': '관리자 화면',
  embedded: '임베디드', 'embedded-system': '임베디드', iot: 'IoT', 'home-automation': '홈 자동화', robotics: '로봇', '3d': '3D',
  'game-engine': '게임 엔진', game: '게임', games: '게임', gaming: '게임', gamedev: '게임 개발', 'game-development': '게임 개발', 'video-games': '비디오 게임',
  // AI
  ai: 'AI', 'artificial-intelligence': 'AI', 'generative-ai': '생성형 AI', llm: 'LLM', llms: 'LLM', 'large-language-models': 'LLM',
  'ai-agents': 'AI 에이전트', 'ai-agent': 'AI 에이전트', agents: 'AI 에이전트', 'agentic-ai': 'AI 에이전트', 'autonomous-agents': 'AI 에이전트',
  'coding-agents': '코딩 에이전트', 'coding-agent': '코딩 에이전트', 'ai-coding': 'AI 코딩', rag: 'RAG', chatbot: '챗봇', chat: '채팅',
  'machine-learning': '머신러닝', 'deep-learning': '딥러닝', nlp: '자연어 처리', 'natural-language-processing': '자연어 처리',
  'computer-vision': '컴퓨터 비전', 'knowledge-and-memory': '지식·기억', memory: '기억', 'knowledge-base': '지식 베이스', embeddings: '임베딩',
  'text-to-speech': '음성 합성', 'speech-recognition': '음성 인식', translation: '번역', 'prompt-engineering': '프롬프트',
  // 생활·분야
  'finance-and-fintech': '금융', finance: '금융', fintech: '금융', banking: '은행', investing: '투자', trading: '트레이딩', crypto: '암호화폐',
  cryptocurrency: '암호화폐', blockchain: '블록체인', 'smart-contracts': '스마트 계약', web3: 'Web3', economics: '경제', economy: '경제',
  communication: '커뮤니케이션', messaging: '메시지', 'social-media': '소셜 미디어', social: '소셜', 'social-networks': '소셜 네트워크',
  news: '뉴스', 'art-and-culture': '예술·문화', 'arts-and-entertainment': '예술·엔터테인먼트', music: '음악', video: '동영상', audio: '오디오',
  image: '이미지', images: '이미지', photo: '사진', multimedia: '멀티미디어', 'multimedia-process': '멀티미디어', 'media-creation': '미디어 제작',
  'location-services': '위치 서비스', maps: '지도', gis: 'GIS', geospatial: '지리 공간', 'travel-and-transportation': '여행·교통',
  travel: '여행', transportation: '교통', flights: '항공편', weather: '날씨', climate: '기후', 'climate-change': '기후 변화',
  environment: '환경', environmental: '환경', 'environment-and-nature': '환경·자연', 'earth-and-nature': '지구·자연', energy: '에너지',
  agriculture: '농업', food: '음식', health: '건강', healthcare: '의료', 'health-and-medicine': '의료', medicine: '의학', 'mental-health': '정신 건강',
  'biology-medicine-and-bioinformatics': '생명과학·의료', biology: '생물학', bioinformatics: '생물정보학', 'life-sciences': '생명과학',
  genomic: '유전체', neuroscience: '신경과학', cancer: '암', 'public-health': '공중 보건', covid19: '코로나19',
  education: '교육', research: '연구', academic: '학술', science: '과학', astronomy: '천문학', physics: '물리', chemistry: '화학', math: '수학',
  sports: '스포츠', football: '축구', 'movies-and-tv-shows': '영화·TV', movies: '영화', books: '책', 'retail-and-shopping': '쇼핑',
  'automobiles-and-vehicles': '자동차', government: '정부', 'public-sector': '공공', law: '법률', crime: '범죄', demographics: '인구',
  'social-science': '사회과학', 'social-sciences': '사회과학', trade: '무역', 'real-estate': '부동산', 'disaster-response': '재난 대응',
  'satellite-imagery': '위성 영상', 'earth-observation': '지구 관측', 'computer-science': '컴퓨터 과학', internet: '인터넷',
  // 데이터 작업
  classification: '분류', regression: '회귀', clustering: '군집화', 'time-series': '시계열', timeseries: '시계열', 'text-classification': '텍스트 분류',
  'image-classification': '이미지 분류', 'object-detection': '객체 탐지', 'image-segmentation': '이미지 분할', 'question-answering': '질의응답',
  'exploratory-data-analysis': '탐색적 분석', 'data-cleaning': '데이터 정리', tabular: '표',
};

/** 기술 이름 꼬리표 → 쓰는 이름 (템플릿·저장소의 '무엇으로 만들었나') */
export const TECH_NAME: Readonly<Record<string, string>> = {
  react: 'React', reactjs: 'React', nextjs: 'Next.js', 'next.js': 'Next.js', next: 'Next.js', vue: 'Vue', vuejs: 'Vue', nuxt: 'Nuxt',
  svelte: 'Svelte', sveltekit: 'SvelteKit', angular: 'Angular', astro: 'Astro', astrojs: 'Astro', hugo: 'Hugo', '11ty': 'Eleventy',
  eleventy: 'Eleventy', gatsby: 'Gatsby', jekyll: 'Jekyll', remix: 'Remix', vite: 'Vite', solidjs: 'Solid', qwik: 'Qwik',
  tailwind: 'Tailwind CSS', tailwindcss: 'Tailwind CSS', bootstrap: 'Bootstrap', bootstrap4: 'Bootstrap', bootstrap5: 'Bootstrap',
  'shadcn-ui': 'shadcn/ui', shadcn: 'shadcn/ui', flutter: 'Flutter', 'react-native': 'React Native', expo: 'Expo', electron: 'Electron',
  tauri: 'Tauri', laravel: 'Laravel', django: 'Django', fastapi: 'FastAPI', flask: 'Flask', express: 'Express', nestjs: 'NestJS',
  nodejs: 'Node.js', node: 'Node.js', deno: 'Deno', bun: 'Bun', supabase: 'Supabase', firebase: 'Firebase', prisma: 'Prisma',
  drizzle: 'Drizzle', stripe: 'Stripe', wordpress: 'WordPress', langchain: 'LangChain', openai: 'OpenAI', 'spring-boot': 'Spring Boot',
  rails: 'Rails', 'ruby-on-rails': 'Rails', dotnet: '.NET', blazor: 'Blazor', unity: 'Unity', godot: 'Godot', threejs: 'Three.js',
  'three.js': 'Three.js', 't3-stack': 'T3 Stack', htmx: 'htmx', alpinejs: 'Alpine.js',
};

/** 소분류 → 머리 문장의 이름 (무엇인지) */
const KIND_NOUN: Readonly<Record<string, string>> = {
  // 오픈소스
  apps: '오픈소스 앱', 'ai-apps': '오픈소스 AI 도구', games: '오픈소스 게임', bots: '오픈소스 봇', auth: '오픈소스 인증 도구',
  extensions: '오픈소스 브라우저 확장', cli: '오픈소스 명령줄 도구', cms: '오픈소스 CMS', ecommerce: '오픈소스 쇼핑몰 솔루션',
  projects: '오픈소스 프로젝트', awesome: 'awesome 추천 목록', 'js-libraries': 'JavaScript 라이브러리',
  'py-libraries': 'Python 라이브러리', 'dart-libraries': 'Dart·Flutter 패키지', models: 'AI 모델', 'ai-demos': 'AI 데모 앱',
  // 템플릿
  'blog-portfolio': '블로그·포트폴리오 템플릿', 'web-starter': '웹 스타터 템플릿', admin: '관리자 화면 템플릿', landing: '랜딩 페이지 템플릿',
  saas: 'SaaS 스타터 템플릿', 'ai-app': 'AI 앱 템플릿', backend: '백엔드 템플릿', mobile: '모바일 앱 템플릿', html: 'HTML 템플릿',
  'docs-site': '문서 사이트 템플릿', desktop: '데스크톱 앱 템플릿', game: '게임 템플릿', extension: '브라우저 확장 템플릿', bot: '봇 템플릿',
  // 디자인
  'ui-libraries': 'UI 컴포넌트 라이브러리', charts: '차트 라이브러리', animation: '애니메이션 라이브러리', 'css-frameworks': 'CSS 프레임워크',
  'ui-registries': 'shadcn/ui 레지스트리', 'ui-blocks': 'UI 블록', 'design-systems': '디자인 시스템', 'design-md': 'DESIGN.md 디자인 가이드',
  // AI 확장
  mcp: 'MCP 서버', plugin: '플러그인', skill: '에이전트 스킬', subagent: '서브에이전트', hook: '훅', prompt: '프롬프트', rules: '규칙 파일',
  workflow: '자동화 워크플로 템플릿', framework: '에이전트 프레임워크·SDK',
  // 데이터셋
  kaggle: 'Kaggle 데이터셋', 'ai-training': 'AI 학습용 데이터셋', 'world-stats': '세계 통계 지표', 'open-data': '공개 데이터셋',
  'ml-classic': '머신러닝 연습용 데이터셋', 'kr-public': '공공데이터', 'kr-language': '한국어 데이터셋', 'sample-data': '예제 데이터',
};

/** API 소분류 → 분야 이름 */
const API_FIELD: Readonly<Record<string, string>> = {
  cloud: '클라우드', dev: '개발 도구', 'open-data': '공개 데이터', media: '미디어', finance: '금융', business: '비즈니스', maps: '지도·위치',
  life: '생활 정보', payments: '결제', entertainment: '엔터테인먼트', 'ai-other': 'AI', messaging: '메시지', 'news-social': '뉴스·소셜',
  weather: '날씨', 'ai-inference': 'AI 추론', 'auth-security': '인증·보안', text: '텍스트', 'ai-llm': 'LLM', 'ai-image': 'AI 이미지',
  'kr-dev': '한국 개발', 'ai-audio': 'AI 음성', 'ai-vision': 'AI 비전', 'ai-search': 'AI 검색', 'ai-embeddings': '임베딩', 'kr-public': '공공',
};

/** 에이전트·도구 이름 */
const AGENT_NAME: Readonly<Record<string, string>> = {
  'claude-code': 'Claude Code', 'claude-ai': 'Claude 앱', 'claude-api': 'Claude API', codex: 'Codex', 'github-copilot': 'GitHub Copilot',
  copilot: 'GitHub Copilot', 'gemini-cli': 'Gemini CLI', dify: 'Dify', cursor: 'Cursor', windsurf: 'Windsurf', kiro: 'Kiro', opencode: 'OpenCode',
};

/** Hugging Face 작업(pipeline tag) → 한국어 */
export const TASK_KO: Readonly<Record<string, string>> = {
  'text-generation': '텍스트 생성', 'text2text-generation': '텍스트 변환', 'image-text-to-text': '이미지·텍스트 이해',
  'token-classification': '개체명 인식(토큰 분류)', 'text-to-image': '이미지 생성', 'automatic-speech-recognition': '음성 인식',
  'image-classification': '이미지 분류', 'feature-extraction': '임베딩', 'text-classification': '텍스트 분류', 'sentence-similarity': '문장 유사도',
  'fill-mask': '빈칸 채우기', 'text-to-speech': '음성 합성', 'image-to-image': '이미지 변환', 'image-to-video': '이미지로 동영상 생성',
  'zero-shot-image-classification': '제로샷 이미지 분류', 'image-feature-extraction': '이미지 임베딩', 'any-to-any': '멀티모달',
  'text-to-video': '동영상 생성', translation: '번역', 'image-to-text': '이미지 설명', 'image-segmentation': '이미지 분할',
  'text-ranking': '검색 결과 순위 매기기', 'zero-shot-classification': '제로샷 분류', 'audio-classification': '오디오 분류',
  'object-detection': '객체 탐지', 'image-to-3d': '3D 모델 생성', 'depth-estimation': '깊이 추정', 'video-to-video': '동영상 변환',
  'question-answering': '질의응답', 'audio-to-audio': '오디오 변환', 'visual-document-retrieval': '문서 이미지 검색',
  'document-question-answering': '문서 질의응답', 'text-to-3d': '3D 모델 생성', 'audio-text-to-text': '음성 이해',
  'unconditional-image-generation': '이미지 생성', 'image-text-to-image': '이미지 편집', 'video-classification': '동영상 분류',
  'keypoint-detection': '키포인트 탐지', 'tabular-classification': '표 데이터 분류', 'tabular-regression': '표 데이터 회귀',
  summarization: '요약', 'visual-question-answering': '시각 질의응답', 'video-text-to-text': '동영상 이해', 'reinforcement-learning': '강화학습',
  'mask-generation': '마스크 생성', 'zero-shot-object-detection': '제로샷 객체 탐지', 'table-question-answering': '표 질의응답',
  'image-text-to-video': '동영상 생성', 'text-to-audio': '오디오 생성', 'time-series-forecasting': '시계열 예측', robotics: '로봇 제어',
  'voice-activity-detection': '음성 구간 탐지', 'text-retrieval': '문서 검색', 'multiple-choice': '객관식 문제', conversational: '대화',
  classification: '분류', regression: '회귀', clustering: '군집화',
};

const LANG_KO: Readonly<Record<string, string>> = {
  en: '영어', eng: '영어', zh: '중국어', ko: '한국어', ja: '일본어', fr: '프랑스어', de: '독일어', es: '스페인어', ru: '러시아어', ar: '아랍어',
  pt: '포르투갈어', it: '이탈리아어', hi: '힌디어', vi: '베트남어', id: '인도네시아어', tr: '튀르키예어', nl: '네덜란드어', pl: '폴란드어',
  uk: '우크라이나어', th: '태국어', fa: '페르시아어', multilingual: '여러 언어', code: '프로그래밍 코드',
};

const MODALITY_KO: Readonly<Record<string, string>> = {
  text: '텍스트', image: '이미지', audio: '오디오', video: '동영상', tabular: '표', timeseries: '시계열', '3d': '3D', geospatial: '지리 공간', document: '문서',
};

/** 두 말이 낱말을 나눠 갖는가 (주제가 이름을 되풀이하지 않게: '관리자 화면 분야의 관리자 화면 템플릿') */
const overlaps = (a: string, b: string): boolean => a.split(/[\s·]+/).some((w) => w.length >= 2 && b.includes(w));

/** 꼬리표에서 사전에 있는 주제 말 (앞에서부터 n개). noun과 낱말이 겹치는 주제는 뺀다. '·'가 든 주제가 먼저 오면 하나만 */
function topics(tags: readonly string[], n = 2, noun = ''): string[] {
  const out: string[] = [];
  for (const t of tags) {
    const k = look(TOPIC_KO, t.toLowerCase());
    // '·'가 든 주제(예: 지식·기억)는 첫 자리에만 둔다: 둘째로 붙으면 '클라우드·지식·기억'처럼 셋으로 읽힌다
    if (k && !(out.length > 0 && k.includes('·')) && !out.some((o) => o === k || overlaps(o, k)) && !(noun && overlaps(k, noun))) out.push(k);
    if (out.length >= n || out[0]?.includes('·')) break;
  }
  return out;
}

function techs(tags: readonly string[], extra: readonly string[] = [], n = 2): string[] {
  const out: string[] = [];
  for (const t of [...extra, ...tags]) {
    const k = look(TECH_NAME, t.toLowerCase()) ?? (extra.includes(t) ? t : undefined);
    if (k && !out.includes(k)) out.push(k);
    if (out.length >= n) break;
  }
  return out;
}

const topicHead = (ts: readonly string[], noun: string): string => (ts.length ? `${list(ts)} 분야의 ${ida(noun)}.` : `${ida(noun)}.`);

// ---------- 갈래마다 ----------

function mcpKo(item: CatalogItem, p: Preview): string {
  const remotes = Array.isArray(p['remotes']) ? (p['remotes'] as { type?: string; headers?: { isRequired?: boolean; isSecret?: boolean }[] }[]) : [];
  const transports = strs(p['transports']);
  const pkgs = Array.isArray(p['packages']) ? (p['packages'] as { registry?: string }[]) : [];
  const regs = uniq(pkgs.map((x) => str(x.registry)?.toLowerCase()).filter((x): x is string => !!x));
  const remote = remotes.length > 0 || transports.some((t) => t === 'remote' || t === 'sse' || t === 'streamable-http') || item.tags.includes('remote');
  const local = regs.length > 0 || transports.includes('stdio') || item.tags.includes('local');
  const ts = topics([str(p['category']) ?? '', ...item.tags], 2);
  const head = topicHead(ts, 'MCP 서버');
  const run: string[] = [];
  if (regs.includes('npm')) run.push('npx');
  if (regs.includes('pypi')) run.push('uvx');
  if (regs.includes('oci') || regs.includes('docker')) run.push('Docker');
  let how: string | undefined;
  if (remote && local) how = run.length ? `원격 주소로 붙이거나 ${ro(list(run, 3))} 내 컴퓨터에서 돌린다.` : '원격 주소로 붙이거나 내 컴퓨터에서 돌린다.';
  else if (remote) how = '설치 없이 원격 주소로 붙여 쓴다.';
  else if (run.length) how = `${ro(list(run, 3))} 내 컴퓨터에서 돌린다.`;
  else if (local) how = '내 컴퓨터에서 돌리는 로컬 서버다.';
  const needsKey = p['requiresKey'] === true || remotes.some((r) => r.headers?.some((h) => h.isRequired && h.isSecret));
  const auth = str(p['auth']);
  const key = needsKey ? 'API 키가 필요하다.' : auth && /oauth/i.test(auth) ? 'OAuth 로그인으로 연결한다.' : undefined;
  return joinSentences(head, how, key);
}

function agentNames(p: Preview): string[] {
  const names = [str(p['agent']), ...strs(p['agents']), str(p['tool'])].filter((x): x is string => !!x).map((a) => look(AGENT_NAME, a.toLowerCase()) ?? '');
  return uniq(names.filter(Boolean));
}

function pluginKo(item: CatalogItem, p: Preview): string {
  const agents = agentNames(p);
  const ts = topics([str(p['category']) ?? '', ...item.tags], 2);
  const comp = str(p['component']);
  // Gemini CLI는 '확장'이라 부른다
  const noun = item.kind === 'plugin' && comp === 'tool' ? '도구 플러그인' : agents[0] === 'Gemini CLI' ? '확장' : (look(KIND_NOUN, item.kind) ?? '플러그인');
  const who = agents.length ? `${list(agents)} ` : '';
  const head = ts.length ? `${list(ts)} 분야의 ${who}${ida(noun)}.` : `${who}${ida(noun)}.`;
  const official = /^(claude-plugins-official|claude-code-plugins|knowledge-work-plugins)$/.test(str(p['marketplace']) ?? '') ? 'Anthropic 공식 마켓에 실려 있다.'
    : str(p['marketplace']) === 'openai-curated' ? 'OpenAI가 고른 플러그인 목록에 있다.' : undefined;
  return joinSentences(head, official);
}

function skillKo(item: CatalogItem, p: Preview): string {
  const agents = agentNames(p);
  const ts = topics([str(p['category']) ?? '', ...item.tags], 2);
  const file = str(p['file']);
  const isSkillFile = file?.endsWith('SKILL.md');
  const who = agents.length ? `${list(agents)}에서 쓰는 ` : '코딩 에이전트가 읽는 ';
  const head = ts.length ? `${list(ts)} 분야의 에이전트 스킬이다.` : `${who}에이전트 스킬이다.`;
  return joinSentences(head, isSkillFile ? 'SKILL.md 파일로 정의된다.' : undefined, ts.length && agents.length ? `${list(agents)}에서 쓴다.` : undefined);
}

const MODEL_KO: Readonly<Record<string, string>> = { sonnet: 'Sonnet', haiku: 'Haiku', opus: 'Opus', inherit: '' };

function subagentKo(item: CatalogItem, p: Preview): string {
  const agents = agentNames(p);
  const ts = topics([str(p['category']) ?? '', ...item.tags], 2);
  const who = agents.length ? `${list(agents)} ` : '';
  const head = ts.length ? `${list(ts)} 분야의 ${who}서브에이전트다.` : `${who}서브에이전트 정의 파일이다.`;
  const rawModel = str(p['model']);
  // 'sonnet'·'claude-sonnet-4-…' → Sonnet, 'inherit' → (부르는 쪽 모델이라 적지 않음), 그 밖의 이름(GPT-4.1 등)은 그대로
  const family = rawModel ? (/^(?:claude-)?(sonnet|opus|haiku|inherit)\b/i.exec(rawModel)?.[1]?.toLowerCase() ?? undefined) : undefined;
  const model = family !== undefined ? (look(MODEL_KO, family) ?? '') : rawModel && rawModel.length <= 24 ? rawModel : '';
  const tools = strs(p['tools']).length;
  return joinSentences(
    head,
    model ? `${model} 모델로 돌도록 정해져 있다.` : undefined,
    tools ? `쓸 수 있는 도구 ${tools}가지가 정해져 있다.` : undefined,
  );
}

function hookKo(item: CatalogItem, p: Preview): string {
  const agents = agentNames(p);
  const who = agents.length ? `${list(agents)} ` : '';
  const comp = str(p['component']);
  // 설정·훅 묶음의 분류 이름(environment, api…)은 낱말 뜻이 달라 옮기지 않는다
  if (comp === 'setting') return `${who}설정 조각이다.`;
  return joinSentences(`${who}훅이다.`, '정해진 때에 명령을 저절로 실행한다.');
}

function promptKo(item: CatalogItem, p: Preview): string {
  const agents = agentNames(p);
  const comp = str(p['component']);
  const ts = topics([str(p['category']) ?? '', ...item.tags], 2);
  if (item.kind === 'rules') {
    const tool = agents[0];
    const file = str(p['file']) ?? '';
    const what = /\.mdc$/.test(file) ? `${tool ?? 'Cursor'} 규칙 파일(.mdc)이다.` : tool === 'GitHub Copilot' ? 'GitHub Copilot 지침 파일이다.'
      : comp === 'template' ? `${tool ?? 'Claude Code'} 프로젝트 설정 템플릿이다.` : `${tool ? `${tool} ` : '코딩 에이전트 '}규칙 파일이다.`;
    const apply = str(p['applyTo']);
    const where = apply && apply.length <= 30 && !/^\*\*(\/\*)?$/.test(apply) ? `${apply} 파일에 적용된다.` : undefined;
    return joinSentences(ts.length ? `${list(ts)} 분야의 ${what}` : what, where);
  }
  if (comp === 'command') return joinSentences(`${agents[0] ?? 'Claude Code'} 슬래시 명령이다.`, ts.length ? `${list(ts)} 분야에 쓴다.` : undefined);
  const format = str(p['format']);
  const src = item.source.name;
  const head = /fabric/i.test(src) ? 'Fabric 프롬프트 패턴이다.' : format === 'system' ? 'AI의 역할을 정하는 시스템 프롬프트다.' : 'AI에게 붙여 쓰는 프롬프트다.';
  return joinSentences(ts.length ? `${list(ts)} 분야의 ${head.replace(/^AI에게 붙여 쓰는 /, '')}` : head);
}

const PLATFORM_NAME: Readonly<Record<string, string>> = {
  n8n: 'n8n', activepieces: 'Activepieces', flowise: 'Flowise', langflow: 'Langflow', 'github-agentic-workflows': 'GitHub Agentic Workflows',
};
const GENERIC_NODES = new Set([
  'schedule', 'data-mapper', 'date-helper', 'text-helper', 'utility-ai', 'store', 'http', 'delay', 'loop', 'branch', 'code', 'math-helper',
  'manual trigger', 'sticky note', 'set', 'if', 'merge', 'code', 'switch', 'no operation, do nothing', 'wait', 'split out', 'aggregate',
  'filter', 'edit fields (set)', 'schedule trigger', 'webhook', 'respond to webhook', 'execute workflow trigger', 'split in batches', 'loop over items',
]);
const humanize = (s: string): string => (/[A-Z ]/.test(s) ? s : s.split('-').map((w) => (w.length <= 3 && /^(ai|api|ssh|ftp|sql|aws|crm)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' '));

function workflowKo(item: CatalogItem, p: Preview): string {
  const platform = look(PLATFORM_NAME, str(p['platform']) ?? '') ?? str(p['platform']);
  const head = `${platform ? `${platform} ` : ''}자동화 워크플로 템플릿이다.`;
  const nodes = uniq(strs(p['nodes']).filter((n) => !GENERIC_NODES.has(n.toLowerCase())).map(humanize)).filter((n) => n.length <= 30).slice(0, 3);
  return joinSentences(head, nodes.length ? `${nodes.join('·')} 노드를 쓴다.` : undefined);
}

function modelKo(item: CatalogItem, p: Preview): string {
  if (str(p['host']) === 'ollama') {
    const caps = strs(p['capabilities']).map((c) => ({ tools: '도구 호출', vision: '이미지 이해', thinking: '추론', embedding: '임베딩', cloud: '클라우드 실행' })[c]).filter(Boolean) as string[];
    return joinSentences('Ollama로 내 컴퓨터에서 돌리는 AI 모델이다.', caps.length ? `${caps.join('·')} 기능이 있다.` : undefined);
  }
  const task = look(TASK_KO, str(p['task']) ?? '');
  const lib = str(p['library']);
  const head = task ? `${task} AI 모델이다.` : 'AI 모델이다.';
  const libLine = lib && /^[\w.\- ]{2,24}$/.test(lib) ? `${lib} 라이브러리로 불러 쓴다.` : undefined;
  const gated = p['gated'] === true || (typeof p['gated'] === 'string' && p['gated'] !== 'false') ? '내려받으려면 약관에 동의해야 한다.' : undefined;
  return joinSentences(head, libLine, gated);
}

const SDK_KO: Readonly<Record<string, string>> = { gradio: 'Gradio', streamlit: 'Streamlit', docker: 'Docker' };

/** 세계은행 지표 코드의 앞 두 글자 → 주제 (WDI 코드 체계: SH 보건, SE 교육 …) */
const WDI_TOPIC: Readonly<Record<string, string>> = {
  ag: '농업', bg: '국제수지', bm: '국제수지', bn: '국제수지', bx: '국제수지', cm: '자본시장', dc: '부채', dt: '대외 부채', eg: '에너지', en: '환경',
  ep: '경제 정책', er: '환경', fb: '금융', fd: '금융', fi: '금융', fm: '금융', fp: '물가', fr: '금리', fs: '금융', gb: '정부 재정', gc: '정부 재정',
  ic: '기업 환경', ie: '인프라', ip: '지식재산', iq: '통계 역량', is: '인프라', it: '정보통신', lp: '물류', ms: '군사', ne: '국민계정', nv: '국민계정',
  ny: '국민계정', pa: '물가', px: '무역', se: '교육', sg: '성평등', sh: '보건', si: '빈곤·불평등', sl: '노동', sm: '이주', sn: '영양',
  sp: '인구', st: '관광', tg: '무역', tm: '무역', tx: '무역', vc: '분쟁·폭력',
};

function spaceKo(item: CatalogItem, p: Preview): string {
  const sdk = str(p['sdk']);
  const tool = look(SDK_KO, sdk);
  const how = sdk === 'static' ? '정적 웹페이지로 만든 AI 데모다.' : tool ? `${ro(tool)} 만든 AI 데모 앱이다.` : 'AI 데모 앱이다.';
  const models = strs(p['models']);
  return joinSentences(how, 'Hugging Face Spaces에서 브라우저로 바로 써 본다.', models.length === 1 ? `${models[0]} 모델을 쓴다.` : undefined);
}

function datasetKo(item: CatalogItem, p: Preview): string | undefined {
  const host = str(p['host']);
  const id = item.id;
  if (id.startsWith('owid:')) {
    const span = str(p['timespan']);
    const years = span ? /^(\d{3,4})\D+(\d{3,4})$/.exec(span) : null;
    return joinSentences('Our World in Data의 세계 통계 지표다.', years ? `${years[1]}~${years[2]}년 자료를 CSV로 받는다.` : 'CSV로 받는다.');
  }
  if (id.startsWith('worldbank-wdi:')) {
    const topic = look(WDI_TOPIC, id.slice('worldbank-wdi:'.length).split('.')[0] ?? '');
    return joinSentences(`세계은행 세계개발지표(WDI)의 ${topic ? `${topic} ` : ''}나라별 지표다.`, 'CSV·API로 받는다.');
  }
  if (host === 'huggingface' || id.startsWith('hf-datasets:')) {
    const tasks = uniq(strs(p['tasks']).map((t) => look(TASK_KO, t)).filter((x): x is string => !!x)).slice(0, 2);
    const mods = uniq(strs(p['modalities']).map((m) => look(MODALITY_KO, m)).filter((x): x is string => !!x)).slice(0, 2);
    const langs = uniq(strs(p['languages']).map((l) => look(LANG_KO, l)).filter((x): x is string => !!x)).slice(0, 3);
    const head = tasks.length ? `${tasks.join('·')} 학습용 데이터셋이다.` : mods.length ? `${mods.join('·')} 데이터셋이다.` : 'AI 학습용 데이터셋이다.';
    const formats = strs(p['formats']).map((f) => ({ parquet: 'Parquet', json: 'JSON', csv: 'CSV', imagefolder: '이미지 폴더', audiofolder: '오디오 폴더', webdataset: 'WebDataset', arrow: 'Arrow', text: '텍스트' })[f]).filter(Boolean) as string[];
    return joinSentences(
      head,
      langs.length ? `${langs.join('·')} 자료다.` : undefined,
      formats.length ? `${list(formats)} 형식으로 받는다.` : undefined,
      p['gated'] === true || (typeof p['gated'] === 'string' && p['gated'] !== 'false') ? '내려받으려면 약관에 동의해야 한다.' : undefined,
    );
  }
  if (host === 'kaggle' || id.startsWith('kaggle:')) {
    const ts = topics(item.tags, 2);
    const size = str(p['size']);
    return joinSentences(topicHead(ts, 'Kaggle 데이터셋'), size && /^[\d.]+ ?[KMGT]?B$/i.test(size) ? `파일 크기는 ${size}다.` : undefined);
  }
  if (id.startsWith('uci:')) {
    const tasks = uniq(strs(p['tasks']).map((t) => look(TASK_KO, t.toLowerCase())).filter((x): x is string => !!x)).slice(0, 2);
    const rows = typeof p['rows'] === 'number' ? p['rows'] : undefined;
    const feats = typeof p['features'] === 'number' ? p['features'] : undefined;
    const size = rows && feats ? `행 ${commas(rows)}개, 특성 ${commas(feats)}개다.` : undefined;
    return joinSentences(tasks.length ? `${tasks.join('·')} 연습용 머신러닝 데이터셋이다.` : '머신러닝 연습용 데이터셋이다.', 'UCI 머신러닝 저장소에 있다.', size);
  }
  if (id.startsWith('aws-open-data:')) {
    const freq = str(p['updateFrequency'])?.toLowerCase();
    const how = freq ? ({ daily: '날마다', weekly: '주마다', monthly: '달마다', yearly: '해마다', annually: '해마다', quarterly: '분기마다', hourly: '시간마다' } as Record<string, string>)[freq] : undefined;
    return joinSentences('AWS 오픈 데이터 레지스트리에 공개된 데이터셋이다.', how ? `${how} 새로 올라온다.` : freq?.startsWith('not updated') ? '더 이상 새로 올리지 않는다.' : undefined);
  }
  if (id.startsWith('awesome-public-datasets:')) {
    const field = str(p['field'])?.toLowerCase().replace(/\s+/g, '-');
    const f = field ? look(TOPIC_KO, field) : undefined;
    return topicHead(f ? [f] : topics(item.tags, 1), item.kind === 'ml-classic' ? '머신러닝 연습용 데이터셋' : '공개 데이터셋');
  }
  const noun = look(KIND_NOUN, item.kind);
  return noun ? topicHead(topics(item.tags, 2), noun) : undefined;
}

function repoKo(item: CatalogItem, p: Preview): string {
  const noun = look(KIND_NOUN, item.kind) ?? '오픈소스 프로젝트';
  const lang = str(p['language']);
  const tech = techs(item.tags, [], 2).filter((t) => t !== lang);
  const ts = topics(item.tags, 2, noun);
  const baseNoun = tech.length && ['js-libraries', 'py-libraries', 'dart-libraries'].indexOf(item.kind) < 0 ? `${list(tech)} 기반 ${noun}` : noun;
  const head = topicHead(ts, baseNoun);
  let made: string | undefined;
  if (item.kind === 'js-libraries') made = 'npm으로 설치한다.';
  else if (item.kind === 'py-libraries') made = 'pip으로 설치한다.';
  else if (item.kind === 'dart-libraries') made = 'pub으로 설치한다.';
  else if (lang && /^[\w#+.\- ]{1,24}$/.test(lang)) made = `주로 ${ro(lang)} 작성됐다.`;
  const platforms = strs(p['platforms']).filter((x) => /^[\w.\- ]{1,20}$/.test(x)).slice(0, 2);
  const selfhost = item.id.startsWith('selfhosted:') ? (platforms.length ? `${ro(list(platforms))} 직접 설치해 운영한다.` : '직접 설치해 운영하는 셀프 호스팅용이다.') : undefined;
  const archived = p['archived'] === true || item.tags.includes('archived') ? '보관된 저장소라 더 이상 고치지 않는다.' : undefined;
  const template = p['template'] === true ? 'GitHub 템플릿 저장소라 복제해 바로 시작한다.' : undefined;
  return joinSentences(head, archived, selfhost, made, template);
}

function templateKo2(item: CatalogItem, p: Preview): string {
  const noun = look(KIND_NOUN, item.kind) ?? '템플릿';
  const stack = strs(p['stack']).filter((s) => s.length <= 20);
  const tech = techs(item.tags, stack, 2);
  const module = str(p['module']);
  const head = tech.length ? `${list(tech)} 기반 ${ida(noun)}.` : module ? `Hugo ${ida(noun)}.` : `${ida(noun)}.`;
  const demo = str(p['demo']) ? '데모 사이트에서 미리 본다.' : undefined;
  const services = strs(p['services']).filter((s) => s.length <= 20).slice(0, 2);
  const lang = str(p['language']);
  return joinSentences(
    head,
    services.length ? `${list(services)} 서비스와 함께 쓴다.` : undefined,
    demo,
    !tech.length && lang && /^[\w#+.\- ]{1,24}$/.test(lang) ? `주로 ${ro(lang)} 작성됐다.` : undefined,
  );
}

function designRepoKo(item: CatalogItem, p: Preview): string {
  const noun = look(KIND_NOUN, item.kind) ?? '라이브러리';
  const topicTags = [...item.tags, ...strs(p['topics'])];
  const tech = techs(topicTags, [], 2).filter((t) => !noun.includes(t));
  const lang = str(p['language']);
  return joinSentences(tech.length ? `${list(tech)}용 ${ida(noun)}.` : `${ida(noun)}.`, lang && /^[\w#+.\- ]{1,24}$/.test(lang) ? `주로 ${ro(lang)} 작성됐다.` : undefined);
}

function siteKo(item: CatalogItem, p: Preview): string {
  if (item.kind === 'ui-registries') return joinSentences('shadcn/ui 방식으로 컴포넌트를 받아 쓰는 레지스트리다.', 'shadcn CLI로 원하는 컴포넌트만 내 프로젝트에 넣는다.');
  if (item.kind === 'ui-blocks') return 'shadcn/ui 공식 컴포넌트다.';
  return `${ida(look(KIND_NOUN, item.kind) ?? '사이트')}.`;
}

function apiKo(item: CatalogItem, p: Preview): string {
  const field = look(API_FIELD, item.kind);
  const proto = str(p['protocol'])?.toLowerCase() === 'graphql' || item.tags.includes('graphql') ? 'GraphQL API' : 'API';
  const head = field ? `${field} 분야의 ${proto}다.` : `${proto}다.`;
  const auth = (str(p['auth']) ?? '').toLowerCase();
  const key = /^(apikey|api key|key|x-mashape-key|token)$/.test(auth) || auth === 'apikey' ? 'API 키를 받아 부른다.'
    : /oauth/.test(auth) ? 'OAuth 로그인으로 부른다.'
      : auth === 'none' || auth === 'no' ? 'API 키 없이 바로 부른다.' : undefined;
  const cors = p['cors'] === 'yes' ? 'CORS를 지원해 브라우저에서 바로 부른다.' : undefined;
  const spec = str(p['openapiVersion']) ? 'OpenAPI 명세가 공개돼 있다.' : undefined;
  const play = str(p['playground']) ? '브라우저에서 시험해 보는 플레이그라운드가 있다.' : undefined;
  const sdk = str(p['aiSdk']) ? 'Vercel AI SDK 패키지로 부른다.' : undefined;
  return joinSentences(head, key, cors, spec, play, sdk);
}

function frameworkKo(item: CatalogItem, p: Preview): string {
  const lang = str(p['language']);
  const group = str(p['group']);
  const what = ({
    'agent-framework': 'AI 에이전트를 만드는 프레임워크', rag: 'RAG(검색 증강 생성) 도구', 'provider-sdk': 'AI 모델 제공자의 공식 SDK',
    'structured-output': 'LLM 출력을 정해진 모양으로 받는 도구', 'local-runtime': '모델을 내 컴퓨터에서 돌리는 도구', 'protocol-sdk': '에이전트 프로토콜 SDK',
    eval: 'LLM 평가 도구', observability: 'LLM 관측 도구', memory: '에이전트 기억 도구', 'browser-agent': '브라우저를 다루는 에이전트 도구', 'voice-agent': '음성 에이전트 도구',
  } as Record<string, string>)[group ?? ''] ?? '에이전트 프레임워크·SDK';
  return joinSentences(`${ida(what)}.`, lang && /^[\w#+.\- ]{1,24}$/.test(lang) ? `주로 ${ro(lang)} 작성됐다.` : undefined, p['archived'] === true ? '보관된 저장소라 더 이상 고치지 않는다.' : undefined);
}

/**
 * 상품 하나의 한국어 한 줄 (D143). 출처가 한국어를 주었거나 원문이 이미 한국어면 undefined.
 * 첫 문장은 카드 머리말로 쓰므로 짧게, 전체는 KO_MAX자 안.
 */
export function ruleKo(item: CatalogItem): string | undefined {
  if (item.summaryKo?.trim() || isKoreanText(item.summary)) return undefined;
  const p = item.preview;
  let out: string | undefined;
  switch (p.type) {
    case 'mcp':
      out = mcpKo(item, p);
      break;
    case 'skill':
      out = item.kind === 'subagent' ? subagentKo(item, p) : item.kind === 'hook' ? hookKo(item, p) : item.kind === 'skill' ? skillKo(item, p) : pluginKo(item, p);
      break;
    case 'prompt':
      out = promptKo(item, p);
      break;
    case 'model':
      out = modelKo(item, p);
      break;
    case 'dataset':
      out = datasetKo(item, p);
      break;
    case 'api':
      out = apiKo(item, p);
      break;
    case 'template':
      out = item.kind === 'workflow' ? workflowKo(item, p) : templateKo2(item, p);
      break;
    case 'repo':
      out = item.kind === 'framework' ? frameworkKo(item, p)
        : ['ui-libraries', 'charts', 'animation', 'css-frameworks'].includes(item.kind) ? designRepoKo(item, p) : repoKo(item, p);
      break;
    case 'site':
      out = item.kind === 'ai-demos' ? spaceKo(item, p) : siteKo(item, p);
      break;
    default: {
      const noun = look(KIND_NOUN, item.kind);
      out = noun ? `${ida(noun)}.` : undefined;
    }
  }
  const t = out?.replace(/\s+/g, ' ').trim();
  if (!t) return undefined;
  return [...t].length <= KO_MAX ? t : headSentence(t);
}

const TEMPLATED = new Set<string>(TEMPLATE_KINDS);

/**
 * 진열대 빌드가 붙이는 한국어 한 줄 (D143). 출처·번역(data/catalog-ko)에 없을 때만 부른다.
 * 모양이 정해진 상품은 자세한 자료 문장(ko-template, 'codeshopper'), 그 밖은 '무엇인지' 한 줄(이 파일, 'rule').
 */
export function koLineFor(item: CatalogItem): { text: string; by: 'codeshopper' | 'rule' } | undefined {
  if (item.summaryKo?.trim()) return undefined;
  if (TEMPLATED.has(item.kind)) {
    const t = templateKo(item);
    if (t) return { text: t, by: 'codeshopper' };
  }
  const r = ruleKo(item);
  return r ? { text: r, by: 'rule' } : undefined;
}
