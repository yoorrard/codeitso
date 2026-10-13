// 그림 이름 정하기 (docs/CONCEPT.md 5.7): 질문 보기 → 질문 그림(q-*), 앱 종류 → 청사진 자리 표시(L01~L06, 받기 전),
// 기능 → 기능 그림(fn-*). 그림은 src/assets/의 직접 그린 SVG이고 늘 장식이다 (보기 이름·기능 이름이 뜻을 전한다).
// '느낌' 질문은 그림 대신 내 지도를 그 보기의 팔레트로 칠한 견본을 그린다 (Interview.tsx, D70).
export const OPTION_ART: Record<string, Record<string, string>> = {
  'q.type': {
    record: 'L01',
    form: 'L02',
    page: 'L03',
    quiz: 'L04',
    tool: 'L05',
    board: 'L06',
    unknown: 'L00',
  },
  'q.audience': { me: 'q-audience-me', few: 'q-audience-few', anyone: 'q-audience-anyone', unknown: 'q-unknown' },
  'q.ai': { 'chat-free': 'q-ai-chat-free', 'chat-paid': 'q-ai-chat-paid', agent: 'q-ai-agent', unknown: 'q-unknown' },
  'q.domain': {
    none: 'q-domain-none',
    education: 'q-domain-education',
    finance: 'q-domain-finance',
    weather: 'q-domain-weather',
    map: 'q-domain-map',
    transport: 'q-domain-transport',
    book: 'q-domain-book',
    language: 'q-domain-language',
    image: 'q-domain-image',
    culture: 'q-domain-culture',
    public: 'q-domain-public',
    unknown: 'q-unknown',
  },
  'q.style': { unknown: 'q-style-unknown' },
};

/** 기능(capability) → 기능 그림 */
export const SLOT_ART: Record<string, string> = {
  screen: 'fn-screen',
  store: 'fn-store',
  auth: 'fn-auth',
  data: 'fn-data',
  notify: 'fn-notify',
  host: 'fn-host',
  proxy: 'fn-proxy',
};

/** 기능 그림이 없는 기능의 기본 그림 */
export const DEFAULT_SLOT_ART = 'fn-data';

/** 분야가 없거나 모를 때의 그림 */
export const DEFAULT_DOMAIN_ART = 'q-domain-none';

export function slotArt(capability: string): string {
  return SLOT_ART[capability] ?? DEFAULT_SLOT_ART;
}

export function optionArt(questionId: string, optionId: string): string | null {
  return OPTION_ART[questionId]?.[optionId] ?? null;
}

/** 청사진 자리 표시인지 (남색 판 위에 흰 선으로 그린다) */
export function isBlueprint(name: string): boolean {
  return /^(L0\d|P01)$/.test(name);
}
