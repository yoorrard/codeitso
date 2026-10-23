// 스타터 키트 (brief 7절 '묶음 기획전', K1 D131): 한 번에 담는 재료 묶음. 묶음 내용은 data/kits.json(손으로 고른 진열대 id·구현안)이고,
// 진열대 빌드가 카드로 바꿔 홈(다섯 장)과 /kits(모두)에 싣는다 (SiteData.kits). 여기는 화면과 집계(event-spec.ts)가 같이 쓰는 id 목록만 둔다.
// data/kits.json의 id 순서·주제와 같아야 한다 (tests/lib/kits.test.ts가 본다).

/** 키트 주제 (/kits의 묶음 순서): 교육 · 게임 · 업무·행정 · 가게·생활 · 요즘 인기 AI */
export const KIT_THEMES = ['edu', 'game', 'work', 'biz', 'trend'] as const;
export type KitTheme = (typeof KIT_THEMES)[number];

export const KIT_IDS = [
  // 교육
  'school',
  'class-quiz',
  'class-tools',
  'class-manage',
  'reading-log',
  'word-study',
  'sim-lab',
  'coding-class',
  'career',
  'study-bot',
  'feedback',
  'notice-translate',
  // 게임
  'game',
  'game-3d',
  'asset-3d',
  'edu-game',
  'multiplayer',
  'rhythm-puzzle',
  'webxr',
  // 업무·행정
  'office-docs',
  'meeting-notes',
  'booking',
  'dashboard',
  'public-data',
  'faq-bot',
  'forms',
  'automation',
  // 가게·생활
  'landing',
  'shop-order',
  'store-map',
  'weather',
  'transit',
  'real-estate',
  'health',
  // 요즘 인기 AI
  'ai-chatbot',
  'mcp-agent',
  'voice-assistant',
  'browser-ext',
  'local-llm',
  'saas-starter',
  'ai-image',
  'portfolio-blog',
] as const;
export type KitId = (typeof KIT_IDS)[number];

export function isKitId(x: unknown): x is KitId {
  return typeof x === 'string' && (KIT_IDS as readonly string[]).includes(x);
}

export function isKitTheme(x: unknown): x is KitTheme {
  return typeof x === 'string' && (KIT_THEMES as readonly string[]).includes(x);
}
