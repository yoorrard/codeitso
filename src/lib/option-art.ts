// 인터뷰 그림 보기의 그림 (D43): 보기 id → public/emoji/의 Fluent 3D 그림. '느낌' 질문은 자료의 색으로 화면 견본을 그린다.
// 그림은 보기 이름과 함께 나오는 장식이라 버튼 안에서는 alt를 비운다 (이름은 보기 글자가 전한다).
export const OPTION_ART: Record<string, Record<string, string>> = {
  'q.type': {
    record: 'notebook',
    form: 'clipboard',
    page: 'newspaper',
    quiz: 'ballot-check',
    tool: 'abacus',
    board: 'bar-chart',
    unknown: 'thinking-face',
  },
  'q.audience': { me: 'mobile-phone', few: 'busts', anyone: 'globe', unknown: 'thinking-face' },
  'q.ai': { 'chat-free': 'speech-balloon', 'chat-paid': 'glowing-star', agent: 'desktop', unknown: 'thinking-face' },
  'q.domain': {
    none: 'package',
    education: 'school',
    finance: 'chart-up',
    weather: 'sun-cloud',
    map: 'station-interview',
    transport: 'bus',
    book: 'books',
    language: 'latin-letters',
    image: 'framed-picture',
    culture: 'performing-arts',
    public: 'classical-building',
    unknown: 'thinking-face',
  },
  'q.style': { unknown: 'artist-palette' },
};

/** 칸의 기능(capability) → 칸 그림 */
export const SLOT_ART: Record<string, string> = {
  screen: 'slot-screen',
  store: 'slot-store',
  auth: 'slot-auth',
  data: 'slot-data',
  notify: 'slot-notify',
  host: 'slot-host',
  proxy: 'tools',
};

export function optionArt(questionId: string, optionId: string): string | null {
  return OPTION_ART[questionId]?.[optionId] ?? null;
}
