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
  | 'recommendable';

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

export interface Option {
  id: string;
  label: string;
  alt?: string;
  isUnknown?: boolean;
  tags: Record<string, number>;
}

export interface Question {
  id: string;
  text: string;
  help?: string;
  chip?: string;
  picture: boolean;
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
  /** 경유지에서 칸 제목 아래 한 줄 설명 */
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
  };
  safetyDefaults: string[];
  conversationCards: { id: string; title: string; when: string; text: string }[];
  proxyStep: { title: string; doneWhen: string };
  emptySlot: { message: string; fixHint: string; research: ResearchText };
  indexResearch: ResearchText;
  errorFallback: string;
  disclaimer: string;
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

/** 이용자 한 명의 진행 상태. 브라우저 저장소와 영수증 링크에 들어가는 것 */
export interface Session {
  /** 질문 id → 보기 id */
  answers: Record<string, string>;
  /** 고른 도구(상품) id (고른 순서) */
  cart: string[];
  /** 점검에서 '그대로 가기'를 고른 충돌(막힌 곳) id */
  kept: string[];
  /** 점검에서 '나중으로 미루기'를 고른 칸 id (나중에 붙일 것) */
  deferred: string[];
  /** "만들고 싶은 걸 한 줄로". 영수증 링크에는 넣지 않는다 */
  freeText?: string;
}
