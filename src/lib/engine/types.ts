// 데이터 파일(data/*.json)의 모양. 스키마(schemas/*.schema.json)와 같이 고친다.
// 이 폴더의 코드는 화면·브라우저·Node API를 쓰지 않는 순수 함수만 둔다.

export type Capability = 'screen' | 'store' | 'auth' | 'data' | 'host' | 'proxy' | 'notify';
export type Access = 'none' | 'signup' | 'key' | 'approval' | 'account-or-business';
export type Lead = 'instant' | 'hours' | 'days';
export type Scalar = string | number | boolean;

export type ProductField =
  | 'provider.type'
  | 'access'
  | 'realtime'
  | 'serverRegion'
  | 'layer'
  | 'cost.free'
  | 'keyExposureRisk'
  | 'publicKey'
  | 'recommendable'
  /** 이용자가 직접 쓴 도구(목록에 없는 도구, D74)면 참. 진열·색인 도구는 늘 거짓 */
  | 'custom';

export interface ProductPredicate {
  capability?: Capability;
  field?: ProductField;
  is?: Scalar;
  in?: Scalar[];
}

export type Condition =
  | { always: true }
  | { answer: string; is: string }
  | { answer: string; in: string[] }
  | { tag: string; gte: number }
  | { cartHas: string }
  | { cartAny: ProductPredicate }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { deferred: string };

export interface Tag {
  id: string;
  label: string;
  phase?: 1 | 2 | 3;
}

/** '쓰는 AI' 보기가 가리키는 도구와 쓰는 곳 (설계서 7.7절, 스키마 questions.schema.json $defs.aiTool) */
export type AiSurface = 'cli' | 'desktop' | 'ide-extension' | 'editor' | 'web' | 'mobile';
export interface AiToolRef {
  /** 도구 id. 태그 aitool.<tool>, data/guides.json tools[].id(T39)와 같다 */
  tool: string;
  surface: AiSurface;
  /** 유료 구독이 있어야 쓰는 곳 (출처가 있을 때만) */
  paidOnly?: true;
  /** 공식 원문으로 확인하지 못한 사실이 있으면 true. 화면은 무료·유료 꼬리표를 달지 않는다 */
  needsReview?: boolean;
  sources?: string[];
}

export interface Option {
  id: string;
  label: string;
  alt?: string;
  /** 보기 둘째 줄: 아는 이름 몇 개 (설계서 7.7절 P1) */
  sub?: string;
  isUnknown?: boolean;
  /** '직접 쓰기' 보기 (D74). 질문마다 하나, id는 'custom', '모르겠어요' 바로 앞 */
  isCustom?: true;
  /** 직접 쓴 말을 그대로 둘 때 같게 계산할 보기 id (tags가 그 보기와 같다) */
  like?: string;
  /** 직접 쓰기 칸의 라벨 (40자 안) */
  field?: string;
  /** 직접 쓰기 칸의 도움말 (예시) */
  hint?: string;
  /** like가 없을 때 그대로 두면 어떻게 계산하는지 말하는 한 줄 */
  keep?: string;
  /** 질문의 groups 가운데 이 보기가 든 무리 */
  group?: string;
  /** '쓰는 AI' 보기의 도구와 쓰는 곳 */
  aiTool?: AiToolRef;
  tags: Record<string, number>;
}

export interface OptionGroup {
  id: string;
  label: string;
  help?: string;
}

export interface Question {
  id: string;
  text: string;
  help?: string;
  chip?: string;
  picture: boolean;
  /**
   * 고르지 않아도 되는 질문 ('쓰는 AI'). 차례가 오면 묻지만, 답하지 않은 채 다른 질문을 다 마치면
   * 보이는 질문에서 빠지고 '모르겠어요' 보기('아직 안 정했어요')와 같게 본다. 태그는 점수에 쓰지 않는다 (runInterview)
   */
  optional?: true;
  /** 보기를 무리로 나눠 보일 때 무리 이름 (적힌 순서) */
  groups?: OptionGroup[];
  showIf?: Condition;
  options: Option[];
}

export interface PrepItem {
  label: string;
  url?: string;
  lead: Lead;
}

export interface Link {
  label: string;
  url: string;
}

export interface Product {
  id: string;
  name: string;
  layer: 'shelf' | 'index';
  summary: string;
  useWhen?: string;
  capabilities: Capability[];
  domains?: string[];
  topics?: string[];
  goodFor?: string[];
  provider: { type: 'official' | 'community' | 'unofficial' | 'generic'; name: string };
  access: Access;
  cost: { free: boolean; note: string };
  freeLimit?: string;
  realtime?: 'realtime' | 'frequent' | 'daily' | 'static';
  serverRegion: 'none' | 'local' | 'kr' | 'overseas' | 'selectable' | 'unknown';
  difficulty: 1 | 2 | 3;
  setupMinutes?: number;
  keyExposureRisk: boolean;
  /** 화면 코드에 넣도록 만든 공개 키 (제공처 설정에서 사이트 주소로 사용을 제한) */
  publicKey?: boolean;
  /** 이용자가 직접 쓴 도구(D74). 엔진이 만들고 products.json에는 없다 (규칙 조건 field 'custom') */
  custom?: true;
  /**
   * 웹에서 만드는 도구(ai.builder)의 '빌더의 게시 기능'(B-02, D89). 엔진이 배포 칸에 채우는 가짜 상품이고 products.json에는 없다.
   * 점수·추천·규칙 조건에 끼지 않고 비용은 '모름'이다
   */
  builderPublish?: true;
  recommendable: boolean;
  license?: { name: string; plain: string; url?: string };
  prep?: PrepItem[];
  promptFragment?: string;
  needsConcepts?: string[];
  stuck?: string[];
  related?: string[];
  links: Link[];
  checkedAt: string;
  needsReview: boolean;
  sources?: string[];
}

export interface SlotDef {
  id: string;
  label: string;
  capability: Capability;
  required: boolean;
  order: number;
  matchDomain?: boolean;
  deferrable?: boolean;
  /** true면 비워 둔 채로 출발할 수 없다 ('그대로 가기' 불가, 화면: 통행 불가) */
  mustFill?: boolean;
  /** 도구 고르기에서 칸 제목 아래 한 줄 설명 */
  help?: string;
  emptyMessage?: string;
  emptyFix?: string;
}

interface RuleBase {
  id: string;
  when: Condition;
  note?: string;
}
export interface SlotRule extends RuleBase {
  type: 'slot';
  slot: SlotDef;
}
export interface ConflictRule extends RuleBase {
  type: 'conflict';
  message: string;
  fixHint: string;
  researchCard: string;
  /** 지도에서 이 막힌 곳을 붙일 칸 id. 없으면 길 전체 (예: 유료 도구) */
  anchorSlot?: string;
}
export interface ResearchRule extends RuleBase {
  type: 'research';
  card: string;
}
export interface SafetyRule extends RuleBase {
  type: 'safety';
  line: string;
}
export interface StuckRule extends RuleBase {
  type: 'stuck';
  text: string;
  concepts?: string[];
}
export type Rule = SlotRule | ConflictRule | ResearchRule | SafetyRule | StuckRule;

export interface Weights {
  domainMatch: number;
  topicMatch: number;
  topicMissed: number;
  aiToolMatch: number;
  freeProduct: number;
  paidWhenBudgetFree: number;
  realtimeMet: number;
  realtimeMissed: number;
  difficultyGap: number;
  providerOfficial: number;
  proxyNeeded: number;
  sharedTool: number;
  localForMe: number;
  localForShared: number;
  accessPenalty: Record<Access, number>;
}

export interface Scoring {
  version: 1;
  weights: Weights;
  recommendThreshold: number;
  userLevelByAi: Record<string, 1 | 2 | 3>;
  defaultUserLevel: 1 | 2 | 3;
  phaseSplitDifficulty: number;
  studyRequiredMax: number;
  baseMinutes: number;
  unknownSetupMinutes: number;
  /** 난이도를 모르는 도구(직접 쓴 도구)에 쓰는 값. 진열 상품 점수에는 쓰지 않는다 */
  unknownDifficulty: 1 | 2 | 3;
  reasonsMax: number;
}

export interface QuizItem {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface Concept {
  id: string;
  title: string;
  aliases?: string[];
  level: 'must' | 'good';
  order: number;
  summary: string;
  figure?: string;
  tryIt?: { kind: 'env-var-form' | 'api-key-form' | 'json-reader' | 'terminal-sim' | 'deploy-sim'; instruction: string };
  quiz: QuizItem[];
  askAI: string;
  prerequisites: string[];
  /** 진행 순서에서 이 개념을 붙일 칸의 기능 (예: deploy → host) */
  stepHint?: Capability;
  relatedProducts?: string[];
}

export interface ResearchText {
  area: string;
  what: string;
  why: string;
  where: string[];
  doneWhen: string;
}

export interface ResearchCard extends ResearchText {
  id: string;
}

export interface Recipe {
  id: string;
  title: string;
  summary: string;
  forWho: string;
  answers: Record<string, string>;
  cart: string[];
  kept?: string[];
  freeText?: string;
}

export interface ErrorEntry {
  id: string;
  title: string;
  patterns: string[];
  examples: string[];
  meaning: string;
  causes: string[];
  tryFirst: string[];
  askAI: string;
  concepts?: string[];
}

export type ScoreKey =
  | 'domain'
  | 'topic'
  | 'aiTool'
  | 'budget'
  | 'realtime'
  | 'difficulty'
  | 'official'
  | 'access'
  | 'proxy'
  | 'shared'
  | 'local';

export type ConKey = 'topic' | 'budget' | 'realtime' | 'difficulty' | 'access' | 'local';

export type PackLabel =
  | 'oneLine'
  | 'kind'
  | 'audience'
  | 'ai'
  | 'answers'
  | 'firstPhase'
  | 'build'
  | 'notBuild'
  | 'deferred'
  | 'feature'
  | 'doneWhen'
  | 'styleFeel'
  | 'colors'
  | 'font'
  | 'fontSize'
  | 'radius'
  | 'screenSize'
  | 'a11y'
  | 'colorBackground'
  | 'colorSurface'
  | 'colorText'
  | 'colorAccent'
  | 'colorAccentText'
  | 'toolSlot'
  | 'toolName'
  | 'toolProvider'
  | 'toolAccess'
  | 'toolCost'
  | 'toolLicense'
  | 'toolChecked'
  | 'toolOther'
  | 'memo'
  | 'instruction'
  | 'stuck'
  | 'together'
  | 'what'
  | 'why'
  | 'where'
  | 'researchDone'
  | 'check'
  | 'concepts'
  | 'issued'
  | 'format';

export interface TypeTemplate {
  label: string;
  goal: string;
  screens: { name: string; parts: string[] }[];
  features: { name: string; doneWhen: string }[];
  dataModel?: { entity: string; fields: string[] }[];
  alternative?: string;
}

export interface StyleTemplate {
  label: string;
  palette: { background: string; surface: string; text: string; accent: string; accentText: string };
  radius: string;
  fontFamily: string;
  baseFontSize: string;
  note: string;
}

export interface Templates {
  version: 1;
  types: Record<string, TypeTemplate>;
  slotSteps: Record<string, { title: string; doneWhen: string; screen?: { name: string; parts: string[] } }>;
  styles: Record<string, StyleTemplate>;
  devices: Record<string, string>;
  audiences: Record<string, string>;
  aiTools: Record<string, { label: string; saveAs: string; packRef: string; workStyle: string[] }>;
  accessLabels: Record<Access, string>;
  leadLabels: Record<Lead, string>;
  reasonLabels: Record<ScoreKey, string>;
  conLabels: Record<ConKey, string>;
  badges: { free: string; easy: string; official: string; realtime: string; frequent: string; caution: string };
  notBuildRules: { when: Condition; text: string }[];
  receipt: {
    title: string;
    destination: string;
    unnamed: string;
    free: string;
    paid: string;
    paidIncluded: string;
    /** 나중에 붙일 것 품목 표시 */
    later: string;
    count: string;
    more: string;
    levels: { easy: string; normal: string; hard: string };
    timeFormat: { minutes: string; hours: string; hoursHalf: string };
    total: string;
    /** 모든 도구가 0원으로 시작할 수 있을 때의 도구 비용 합계 */
    totalFree: string;
    time: string;
    difficulty: string;
    prep: string;
    study: string;
    research: string;
    stamp: string;
    footer: string;
    /** 비용을 모르는 품목(직접 쓴 도구)의 비용 칸 */
    unknown: string;
    /** 유료 도구는 없고 비용을 모르는 도구가 있을 때의 합계 값 */
    totalUnchecked: string;
  };
  pack: {
    title: string;
    intro: string[];
    headings: {
      what: string;
      scope: string;
      screens: string;
      features: string;
      data: string;
      design: string;
      tools: string;
      prep: string;
      research: string;
      steps: string;
      safety: string;
      work: string;
    };
    scopeRule: string;
    researchIntro: string;
    noResearch: string;
    stepRule: string;
    conceptLink: string;
    deferredNote: string;
    a11yLine: string;
    indexMemo: string;
    noPrep: string;
    prepIntro: string;
    noToolStep: string;
    dataLines: { none: string; decideLater: string; personal: string; external: string };
    labels: Record<PackLabel, string>;
    /** 설계도 1번 '내 말 그대로' (D74): {{chip}} 질문 이름, {{text}} 내 말, {{label}} 고른 보기, {{as}} 같게 계산한 것 */
    /** keptName: 계산에 쓰지 않는 이름 질문('쓰는 AI')을 그대로 뒀을 때 */
    mine: { label: string; rule: string; picked: string; kept: string; keptName: string; customType: string };
  };
  safetyDefaults: string[];
  conversationCards: { id: string; title: string; when: string; text: string }[];
  proxyStep: { title: string; doneWhen: string };
  emptySlot: {
    message: string;
    fixHint: string;
    research: ResearchText;
    /** 가져올 정보를 직접 썼을 때 빈 외부 데이터 칸의 '무엇을 확인' ({{note}}에 내 말) */
    researchWithNote: { what: string };
  };
  indexResearch: ResearchText;
  errorFallback: string;
  disclaimer: string;
  /** 직접 쓴 답 (D74): 영수증 링크로 받아 내 말이 없을 때 고른 답 칩에 쓰는 이름 */
  customAnswer: { hidden: string };
  /** 목록에 없는 도구 (직접 쓴 도구, D74). {{name}}에 쓴 이름 */
  customTool: {
    provider: string;
    hiddenName: string;
    summary: string;
    cost: string;
    memo: string;
    mark: string;
    unchecked: string;
    message: string;
    /** 이름이 없을 때(영수증 링크로 받음): 이름 꼬리 없는 문장 */
    messageHidden: string;
    fixHint: string;
    researchArea: string;
    researchAreaHidden: string;
    /** 직접 쓴 도구마다 붙일 조사 카드 id */
    researchCard: string;
  };
  /** 빌더의 게시 기능 (B-02, D89): 웹에서 만드는 도구를 고르면 배포 칸을 채우는 가짜 상품의 문장 */
  builderPublish: {
    name: string;
    provider: string;
    summary: string;
    /** 설계도 7번 도구별 메모 */
    memo: string;
    /** 이 상품이 배포 칸을 채우면 붙일 조사 카드 id */
    researchCard: string;
  };
}

/** data 폴더의 JSON을 한데 모은 것 */
export interface Data {
  taxonomy: { version: 1; tags: Tag[] };
  scoring: Scoring;
  questions: { version: 1; questions: Question[] };
  rules: { version: 1; rules: Rule[] };
  products: { version: 1; products: Product[] };
  concepts: { version: 1; concepts: Concept[] };
  researchCards: { version: 1; cards: ResearchCard[] };
  templates: Templates;
  recipes: { version: 1; recipes: Recipe[] };
  errors: { version: 1; errors: ErrorEntry[] };
}

/** 목록에 없는 도구 (직접 쓴 도구, D74·input.md 7.1절). 엔진이 customProduct()로 '모름' 도구를 만든다 */
export interface CustomTool {
  /** 'custom-1' ~ 'custom-5'. 진열·색인 도구 id와 겹치지 않는다 (검사가 custom- 접두어를 막는다) */
  id: string;
  /** 이용자가 쓴 이름 (한 줄, 40자). 영수증 링크로 받은 세션에서는 빈 글 → templates.customTool.hiddenName */
  name: string;
  /** 맡는 기능 = 쓴 칸의 기능 */
  capability: Capability;
}

/** 이용자 한 명의 진행 상태. 브라우저 저장소와 영수증 링크에 들어가는 것 */
export interface Session {
  /** 질문 id → 보기 id */
  answers: Record<string, string>;
  /** 고른 도구(상품) id (고른 순서) */
  cart: string[];
  /** 도구끼리 맞춰 보기에서 '그대로 가기'를 고른 충돌(막힌 곳) id */
  kept: string[];
  /** 도구끼리 맞춰 보기에서 '나중으로 미루기'를 고른 칸 id (나중에 붙일 것) */
  deferred: string[];
  /** "만들고 싶은 걸 한 줄로" (한 줄, 80자). 영수증 링크에는 넣지 않는다 */
  freeText?: string;
  /** 질문 id → 직접 쓴 글 (한 줄, 40자). 보기를 골랐어도 남는다(설계도 1번 '내 말 그대로'). 영수증 링크에는 넣지 않는다 */
  notes?: Record<string, string>;
  /** 목록에 없는 도구 (최대 5개). 장바구니에는 id(custom-n)로 들어간다. 이름은 영수증 링크에 넣지 않는다 */
  customTools?: CustomTool[];
  /** 직접 쓴 글에서 화면이 찾은 빈틈 id (aliases.json gaps). 엔진은 조사 카드 research.gap-<id>를 더한다 */
  gaps?: string[];
}
