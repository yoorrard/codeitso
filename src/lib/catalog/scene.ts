// 그림이 없는 상품의 '만들면 이런 모양' 그림 (v5.1 D126, 소유자 요청 3). 순수 함수: 장면 고르기(sceneOf)와 도형 목록(sceneShapes).
// 저장소·템플릿은 소분류·주제(태그)로, 모델·데이터셋은 작업(task)으로 장면을 고르고, 상품 이름·언어·노드 이름을 그림에 넣어 상품마다 다르게 그린다.
// 실제 화면이 아니라 코드쇼퍼가 그린 예시다 (상세에 그렇게 적는다, ko.pv.scene). 색은 CSS 클래스(sc-<색>)로만 칠한다 (shop.css, 토큰).
import type { CatalogItem } from './types.ts';

export const SCENES = [
  'dashboard', 'chat', 'landing', 'blog', 'shop', 'admin', 'mobile', 'cli', 'bot', 'game', 'extension', 'docs', 'desktop', 'login', 'api', 'code', 'list', 'flow',
  'image', 'audio', 'labels', 'translate', 'detect', 'scatter', 'table', 'chart',
] as const;
export type SceneId = (typeof SCENES)[number];

/** 소분류 → 장면 (대분류/소분류) */
const BY_KIND: Record<string, SceneId> = {
  'opensource/apps': 'dashboard',
  'opensource/ai-apps': 'chat',
  'opensource/cli': 'cli',
  'opensource/cms': 'blog',
  'opensource/auth': 'login',
  'opensource/games': 'game',
  'opensource/bots': 'bot',
  'opensource/extensions': 'extension',
  'opensource/ecommerce': 'shop',
  'opensource/awesome': 'list',
  'opensource/projects': 'code',
  'opensource/js-libraries': 'code',
  'opensource/py-libraries': 'code',
  'opensource/dart-libraries': 'code',
  'opensource/models': 'chat',
  'opensource/ai-demos': 'chat',
  'templates/backend': 'api',
  'templates/web-starter': 'landing',
  'templates/blog-portfolio': 'blog',
  'templates/landing': 'landing',
  'templates/ai-app': 'chat',
  'templates/docs-site': 'docs',
  'templates/ecommerce': 'shop',
  'templates/saas': 'dashboard',
  'templates/admin': 'admin',
  'templates/game': 'game',
  'templates/extension': 'extension',
  'templates/mobile': 'mobile',
  'templates/desktop': 'desktop',
  'templates/bot': 'bot',
  'templates/html': 'landing',
  'ai/framework': 'chat',
  'ai/workflow': 'flow',
  'datasets/sample-data': 'table',
  'datasets/world-stats': 'chart',
  'design/charts': 'chart',
  'design/ui-libraries': 'landing',
  'design/css-frameworks': 'landing',
  'design/animation': 'landing',
};

/** 주제(태그·이름) → 장면: 소분류가 넓은 곳(앱·프로젝트·라이브러리)에서 먼저 본다 */
const BY_TOPIC: [RegExp, SceneId][] = [
  [/dashboard|analytics|monitor|observab|metrics|grafana/, 'dashboard'],
  [/admin/, 'admin'],
  [/chatbot|chat-?gpt|\bllm|\brag\b|ai-agent|assistant|\bagents?\b/, 'chat'],
  [/discord|telegram|slack|\bbot\b|bots/, 'bot'],
  [/e-?commerce|\bshop|store|storefront|cart/, 'shop'],
  [/\bblog|\bcms\b|static-site|portfolio|newsletter/, 'blog'],
  [/\bauth|oauth|login|\bsso\b|passkey|webauthn|identity/, 'login'],
  [/android|\bios\b|flutter|react-native|expo|mobile/, 'mobile'],
  [/\bgame|gamedev|phaser|pixel/, 'game'],
  [/chrome-extension|browser-extension|web-extension|extension/, 'extension'],
  [/\bdocs?\b|documentation/, 'docs'],
  [/\bcli\b|terminal|command-line|shell|tui/, 'cli'],
  [/electron|tauri|desktop/, 'desktop'],
  [/\bapi\b|backend|rest|graphql|server/, 'api'],
  [/chart|visuali[sz]ation|plot/, 'chart'],
  [/landing|website|tailwind|\bui\b|components/, 'landing'],
];

/** 모델·데이터셋 작업 → 장면 */
const BY_TASK: [RegExp, SceneId][] = [
  [/translat/, 'translate'],
  [/object-detection|segmentation|mask-generation|keypoint/, 'detect'],
  [/feature-extraction|sentence-similarity|embedding|retriev/, 'scatter'],
  [/speech|audio|text-to-audio|voice|asr/, 'audio'],
  [/classification|sentiment|ner\b|token-classification/, 'labels'],
  [/text-to-image|image-to-image|image-generation|unconditional|depth|video|text-to-video|image-to-video|image-feature|image/, 'image'],
  [/tabular|time-series|regression|forecast/, 'table'],
  [/text-generation|text2text|conversational|question-answering|summari|fill-mask|chat|instruct|code/, 'chat'],
];

const lower = (v: unknown): string => (typeof v === 'string' ? v.toLowerCase() : Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(' ').toLowerCase() : '');

function fromTask(text: string): SceneId | null {
  for (const [re, s] of BY_TASK) if (re.test(text)) return s;
  return null;
}

/** 상품의 장면. 장면을 그리지 않는 종류(폰트·색·아이콘·API·MCP·스킬·프롬프트·에셋·사이트)는 null */
export function sceneOf(item: CatalogItem): SceneId | null {
  const p = item.preview;
  const key = `${item.category}/${item.kind}`;
  if (p.type === 'model') return fromTask(`${lower(p['task'])} ${lower(p['taskLabel'])} ${item.tags.join(' ')}`.toLowerCase()) ?? 'chat';
  if (p.type === 'dataset') {
    const kindScene = BY_KIND[key];
    if (kindScene) return kindScene;
    return fromTask(`${lower(p['tasks'])} ${lower(p['modalities'])} ${item.tags.join(' ')}`) ?? 'table';
  }
  if (p.type !== 'repo' && p.type !== 'template' && !(p.type === 'site' && item.category === 'opensource')) return null;
  const topics = ` ${item.tags.join(' ')} ${lower(p['topics'])} ${item.name.toLowerCase()} `;
  const kindScene = BY_KIND[key];
  // 넓은 소분류(앱·프로젝트·라이브러리·웹 시작 틀)와 소분류가 없는 곳만 주제로 다시 고른다
  const broad = !kindScene || /\/(apps|projects|js-libraries|py-libraries|dart-libraries|web-starter|html|ui-libraries)$/.test(key);
  if (broad) for (const [re, s] of BY_TOPIC) if (re.test(topics)) return s;
  return kindScene ?? 'code';
}

/** 장면에 넣을 말: 워크플로 노드 이름, 라이브러리 언어 (4개까지, 짧게) */
export function sceneWords(item: CatalogItem, scene: SceneId): string[] {
  const p = item.preview;
  const short = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  if (scene === 'flow' && Array.isArray(p['nodes'])) {
    const nodes = [...new Set((p['nodes'] as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== ''))];
    return nodes.slice(0, 4).map((x) => short(x, 9));
  }
  if (scene === 'code' && typeof p['language'] === 'string') return [short(p['language'], 14)];
  return [];
}

// ── 도형 ─────────────────────────────────────────────────────────────

/** 칠할 색 이름 (shop.css의 .sc-<이름>) */
export type Tone = 'page' | 'chrome' | 'line' | 'fill' | 'ink' | 'mute' | 'cat' | 'soft' | 'pri' | 'term' | 'tink' | 'neon' | 'cyan' | 'dim' | 'ok' | 'hot';

export type Shape =
  | { k: 'r'; x: number; y: number; w: number; h: number; r: number; c: Tone; o?: Tone }
  | { k: 'c'; x: number; y: number; r: number; c: Tone }
  | { k: 'p'; d: string; c: Tone; fill?: boolean; sw?: number }
  | { k: 't'; x: number; y: number; s: string; z: number; c: Tone; mono?: boolean; mid?: boolean; bold?: boolean };

export const SCENE_W = 320;
export const SCENE_H = 200;

/** 이름에서 따온 씨앗으로 도는 작은 난수 (같은 상품은 늘 같은 그림) */
function rng(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 그림에 넣는 이름: 저장소 이름 부분, 18자까지 */
export function sceneLabel(name: string): string {
  const base = (name.split('/').pop() ?? name).trim() || name;
  return base.length > 18 ? `${base.slice(0, 17)}…` : base;
}

const round = (n: number): number => Math.round(n * 10) / 10;

export function sceneShapes(scene: SceneId, label: string, words: readonly string[] = []): Shape[] {
  const out: Shape[] = [];
  const rand = rng(`${scene}:${label}`);
  const between = (a: number, b: number): number => round(a + (b - a) * rand());
  const r = (x: number, y: number, w: number, h: number, c: Tone, rr = 0, o?: Tone): void => {
    out.push(o ? { k: 'r', x, y, w, h, r: rr, c, o } : { k: 'r', x, y, w, h, r: rr, c });
  };
  const c = (x: number, y: number, rad: number, tone: Tone): void => {
    out.push({ k: 'c', x, y, r: rad, c: tone });
  };
  const t = (x: number, y: number, s: string, z: number, tone: Tone, opt: { mono?: boolean; mid?: boolean; bold?: boolean } = {}): void => {
    out.push({ k: 't', x, y, s, z, c: tone, ...opt });
  };
  const p = (d: string, tone: Tone, fill = false, sw = 2): void => {
    out.push(fill ? { k: 'p', d, c: tone, fill: true } : { k: 'p', d, c: tone, sw });
  };
  /** 글자 대신 쓰는 줄 (길이는 씨앗으로) */
  const bars = (x: number, y: number, n: number, max: number, tone: Tone, gap = 9, h = 4): void => {
    for (let i = 0; i < n; i += 1) r(x, y + i * gap, between(max * 0.45, max), h, tone, 2);
  };
  const browser = (): void => {
    r(16, 14, 288, 172, 'page', 10, 'line');
    r(16, 14, 288, 22, 'chrome', 10);
    r(16, 28, 288, 8, 'chrome');
    c(29, 25, 3, 'hot');
    c(39, 25, 3, 'cat');
    c(49, 25, 3, 'ok');
    r(66, 19, 170, 12, 'page', 6);
  };
  const darkWindow = (title: string): void => {
    r(16, 14, 288, 172, 'term', 10);
    c(29, 26, 3, 'hot');
    c(39, 26, 3, 'cat');
    c(49, 26, 3, 'ok');
    t(160, 29, title, 8, 'dim', { mono: true, mid: true });
  };
  const line = (pts: number[][]): string => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x ?? 0)} ${round(y ?? 0)}`).join(' ');

  switch (scene) {
    case 'dashboard': {
      browser();
      r(16, 36, 58, 150, 'fill');
      t(26, 52, label, 7, 'ink', { bold: true });
      bars(26, 64, 6, 38, 'line', 12);
      r(26, 62, 40, 8, 'soft', 3);
      for (let i = 0; i < 3; i += 1) {
        r(84 + i * 72, 46, 64, 34, 'soft', 6);
        r(92 + i * 72, 54, 26, 4, 'mute', 2);
        r(92 + i * 72, 64, between(24, 44), 8, 'cat', 3);
      }
      r(84, 90, 208, 88, 'page', 6, 'line');
      const pts: number[][] = [];
      for (let i = 0; i < 9; i += 1) pts.push([94 + i * 24, between(110, 166)]);
      p(`${line(pts)} L286 172 L94 172 Z`, 'soft', true);
      p(line(pts), 'pri');
      break;
    }
    case 'chat': {
      browser();
      t(30, 52, label, 9, 'ink', { bold: true });
      r(16, 60, 288, 1, 'line');
      r(30, 70, between(120, 170), 26, 'fill', 10);
      bars(40, 77, 2, 110, 'mute', 9);
      const w = between(90, 130);
      r(290 - w, 104, w, 22, 'pri', 10);
      r(300 - w, 113, w - 20, 4, 'page', 2);
      r(30, 134, between(140, 190), 18, 'fill', 9);
      bars(40, 141, 1, 120, 'mute');
      r(28, 160, 264, 20, 'page', 10, 'line');
      r(38, 168, 90, 4, 'line', 2);
      c(281, 170, 7, 'pri');
      break;
    }
    case 'landing': {
      browser();
      t(30, 52, label, 8, 'ink', { bold: true });
      for (let i = 0; i < 3; i += 1) r(200 + i * 26, 48, 18, 4, 'mute', 2);
      r(272, 44, 22, 12, 'pri', 6);
      t(160, 92, label, 17, 'ink', { mid: true, bold: true });
      r(96, 102, 128, 5, 'mute', 2);
      r(116, 112, 88, 5, 'mute', 2);
      r(124, 124, 72, 16, 'pri', 8);
      for (let i = 0; i < 3; i += 1) {
        r(32 + i * 88, 150, 80, 30, 'fill', 6);
        c(46 + i * 88, 165, 6, i === 1 ? 'cat' : 'soft');
        r(58 + i * 88, 160, 44, 4, 'mute', 2);
        r(58 + i * 88, 168, 30, 4, 'line', 2);
      }
      break;
    }
    case 'blog': {
      browser();
      t(30, 52, label, 9, 'ink', { bold: true });
      for (let i = 0; i < 3; i += 1) r(210 + i * 28, 48, 20, 4, 'mute', 2);
      r(30, 64, 170, 66, 'soft', 6);
      c(between(60, 170), between(80, 92), 8, 'cat');
      p('M30 130 L80 96 L112 118 L146 88 L200 130 Z', 'cat', true);
      r(30, 140, 150, 7, 'ink', 3);
      bars(30, 154, 3, 170, 'mute', 9);
      for (let i = 0; i < 3; i += 1) {
        r(214, 66 + i * 38, 76, 30, 'fill', 5);
        r(220, 72 + i * 38, 52, 4, 'mute', 2);
        r(220, 80 + i * 38, 40, 4, 'line', 2);
      }
      break;
    }
    case 'shop': {
      browser();
      t(30, 52, label, 9, 'ink', { bold: true });
      r(214, 44, 52, 12, 'fill', 6);
      c(284, 50, 7, 'pri');
      for (let i = 0; i < 4; i += 1) {
        const x = 30 + i * 68;
        r(x, 64, 60, 112, 'page', 6, 'line');
        r(x + 4, 68, 52, 48, 'soft', 4);
        if (i % 2 === 0) c(x + 30, 92, 12, 'cat');
        else r(x + 18, 80, 24, 24, 'cat', 4);
        r(x + 6, 124, 40, 4, 'mute', 2);
        r(x + 6, 134, between(16, 30), 6, 'ink', 2);
        r(x + 6, 150, 48, 14, 'pri', 7);
      }
      break;
    }
    case 'admin': {
      browser();
      r(16, 36, 62, 150, 'term');
      t(26, 54, label, 7, 'tink', { bold: true });
      for (let i = 0; i < 6; i += 1) r(26, 66 + i * 14, between(24, 42), 4, i === 1 ? 'neon' : 'dim', 2);
      r(88, 46, 120, 12, 'page', 6, 'line');
      r(254, 46, 40, 12, 'pri', 6);
      r(88, 66, 206, 14, 'fill', 3);
      for (let i = 0; i < 6; i += 1) {
        const y = 86 + i * 15;
        r(96, y + 4, between(30, 50), 4, 'mute', 2);
        r(160, y + 4, between(30, 50), 4, 'line', 2);
        r(224, y + 1, 30, 9, i % 3 === 1 ? 'hot' : 'ok', 5);
        r(88, y + 13, 206, 1, 'line');
      }
      break;
    }
    case 'mobile': {
      r(106, 4, 108, 192, 'page', 18, 'line');
      r(146, 10, 28, 6, 'line', 3);
      t(118, 34, label, 8, 'ink', { bold: true });
      c(198, 31, 5, 'soft');
      r(116, 42, 88, 44, 'soft', 8);
      c(between(130, 190), 64, 10, 'cat');
      for (let i = 0; i < 3; i += 1) {
        r(116, 94 + i * 26, 88, 20, 'fill', 6);
        c(126, 104 + i * 26, 5, i === 0 ? 'pri' : 'line');
        r(136, 101 + i * 26, between(30, 60), 4, 'mute', 2);
      }
      r(106, 172, 108, 1, 'line');
      for (let i = 0; i < 4; i += 1) c(124 + i * 24, 183, 4, i === 0 ? 'pri' : 'line');
      break;
    }
    case 'cli': {
      darkWindow('zsh');
      const cmd = label.toLowerCase().replace(/\s+/g, '-');
      t(30, 54, `$ ${cmd} --help`, 9, 'neon', { mono: true });
      t(30, 72, `Usage: ${cmd} [options]`, 8, 'tink', { mono: true });
      for (let i = 0; i < 4; i += 1) {
        r(42, 82 + i * 12, between(30, 50), 4, 'cyan', 2);
        r(106, 82 + i * 12, between(60, 150), 4, 'dim', 2);
      }
      t(30, 146, `$ ${cmd}`, 9, 'neon', { mono: true });
      r(30, 154, between(120, 220), 6, 'term', 3, 'dim');
      r(30, 154, between(40, 110), 6, 'neon', 3);
      r(30, 168, 7, 11, 'tink');
      break;
    }
    case 'bot': {
      r(16, 14, 288, 172, 'term', 10);
      for (let i = 0; i < 5; i += 1) c(32, 36 + i * 26, 9, i === 0 ? 'pri' : 'dim');
      r(50, 14, 1, 172, 'term', 0, 'dim');
      bars(62, 34, 6, 40, 'dim', 14);
      r(116, 14, 1, 172, 'term', 0, 'dim');
      c(136, 44, 9, 'soft');
      t(152, 42, label, 8, 'tink', { bold: true });
      r(152, 48, between(80, 130), 4, 'dim', 2);
      c(136, 82, 9, 'cyan');
      t(152, 80, 'bot', 8, 'cyan', { bold: true });
      r(152, 88, 136, 50, 'term', 4, 'dim');
      r(152, 88, 4, 50, 'neon', 2);
      bars(164, 98, 3, 100, 'tink', 11);
      r(130, 154, 160, 18, 'term', 9, 'dim');
      t(140, 166, '/help', 8, 'neon', { mono: true });
      break;
    }
    case 'game': {
      r(16, 14, 288, 172, 'soft', 10);
      c(between(220, 280), 44, 14, 'cat');
      for (let i = 0; i < 3; i += 1) c(28 + i * 14, 28, 4, 'hot');
      t(292, 32, 'SCORE 0120', 8, 'ink', { mono: true, bold: true });
      const ground = 156;
      r(16, ground, 288, 30, 'ok');
      for (let i = 0; i < 12; i += 1) r(16 + i * 24, ground, 22, 6, 'page');
      const plats = [between(40, 90), between(130, 170), between(200, 250)];
      plats.forEach((x, i) => {
        const y = 120 - i * 18;
        r(x, y, 52, 10, 'ink', 2);
        c(x + 26, y - 12, 5, 'cat');
      });
      r(56, ground - 22, 16, 22, 'pri', 3);
      c(64, ground - 26, 6, 'pri');
      r(between(240, 270), ground - 14, 16, 14, 'hot', 4);
      break;
    }
    case 'extension': {
      browser();
      c(252, 25, 5, 'pri');
      c(268, 25, 5, 'mute');
      c(284, 25, 5, 'mute');
      bars(30, 52, 4, 140, 'line', 12);
      r(30, 104, 150, 70, 'fill', 6);
      r(176, 34, 120, 140, 'page', 8, 'line');
      c(190, 50, 6, 'pri');
      t(202, 53, label, 8, 'ink', { bold: true });
      for (let i = 0; i < 3; i += 1) {
        const y = 70 + i * 22;
        r(188, y + 4, between(40, 60), 4, 'mute', 2);
        r(262, y, 22, 12, i === 1 ? 'line' : 'pri', 6);
        c(i === 1 ? 268 : 278, y + 6, 4, 'page');
      }
      r(188, 142, 96, 18, 'pri', 9);
      break;
    }
    case 'docs': {
      browser();
      t(30, 52, label, 8, 'ink', { bold: true });
      r(16, 60, 288, 1, 'line');
      for (let i = 0; i < 7; i += 1) r(i === 2 ? 34 : 28, 72 + i * 14, between(30, 52), 4, i === 2 ? 'pri' : 'mute', 2);
      r(96, 68, 120, 9, 'ink', 3);
      bars(96, 86, 3, 160, 'mute', 9);
      r(96, 116, 160, 42, 'term', 5);
      t(104, 130, '$ npm install', 7, 'neon', { mono: true });
      r(104, 140, between(60, 120), 4, 'dim', 2);
      bars(96, 166, 2, 140, 'mute', 9);
      bars(268, 72, 5, 26, 'line', 10, 3);
      break;
    }
    case 'desktop': {
      r(16, 14, 288, 172, 'page', 10, 'line');
      r(16, 14, 288, 22, 'chrome', 10);
      r(16, 28, 288, 8, 'chrome');
      c(29, 25, 3, 'hot');
      c(39, 25, 3, 'cat');
      c(49, 25, 3, 'ok');
      t(160, 28, label, 8, 'ink', { mid: true, bold: true });
      r(16, 36, 70, 150, 'fill');
      for (let i = 0; i < 6; i += 1) {
        c(28, 50 + i * 18, 4, i === 0 ? 'pri' : 'line');
        r(36, 48 + i * 18, between(26, 42), 4, 'mute', 2);
      }
      r(98, 48, 140, 9, 'ink', 3);
      bars(98, 66, 4, 190, 'mute', 10);
      r(98, 110, 194, 64, 'soft', 6);
      p(line([[108, 160], [140, 138], [170, 150], [210, 122], [282, 132]]), 'cat');
      break;
    }
    case 'login': {
      browser();
      r(96, 46, 128, 132, 'page', 10, 'line');
      c(160, 64, 9, 'pri');
      t(160, 88, label, 9, 'ink', { mid: true, bold: true });
      r(110, 96, 100, 16, 'page', 5, 'line');
      r(118, 102, 40, 4, 'line', 2);
      r(110, 118, 100, 16, 'page', 5, 'line');
      for (let i = 0; i < 6; i += 1) c(120 + i * 8, 126, 2, 'mute');
      r(110, 140, 100, 16, 'pri', 8);
      r(110, 164, 46, 9, 'fill', 4);
      r(164, 164, 46, 9, 'fill', 4);
      break;
    }
    case 'api': {
      darkWindow('api');
      const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'items';
      r(28, 44, 30, 13, 'neon', 3);
      t(43, 53, 'GET', 7, 'term', { mono: true, mid: true, bold: true });
      t(64, 53, `/api/${slug}`, 8, 'tink', { mono: true }); // floor-guard-ignore: 그림 속 예시 글자다. 사이트 주소가 아니다
      t(30, 76, '{', 9, 'tink', { mono: true });
      const keys = ['"id"', '"name"', '"status"', '"items"'];
      keys.forEach((k, i) => {
        t(44, 92 + i * 16, `${k}:`, 8, 'cyan', { mono: true });
        r(110, 86 + i * 16, between(40, 120), 5, i === 2 ? 'neon' : 'dim', 2);
      });
      t(30, 160, '}', 9, 'tink', { mono: true });
      r(234, 44, 56, 13, 'term', 6, 'neon');
      t(262, 53, '200 OK', 7, 'neon', { mono: true, mid: true });
      break;
    }
    case 'code': {
      const lang = (words[0] ?? '').toLowerCase();
      const pkg = label.toLowerCase().replace(/\s+/g, '-');
      const py = /python/.test(lang);
      const dart = /dart/.test(lang);
      const file = py ? 'main.py' : dart ? 'main.dart' : /rust/.test(lang) ? 'main.rs' : /go\b|golang/.test(lang) ? 'main.go' : 'index.ts';
      darkWindow(file);
      const first = py ? `import ${pkg.replace(/-/g, '_')}` : dart ? `import 'package:${pkg}/${pkg}.dart';` : `import { } from '${pkg}';`;
      t(30, 54, '1', 8, 'dim', { mono: true });
      t(44, 54, first, 8, 'cyan', { mono: true });
      for (let i = 0; i < 7; i += 1) {
        const y = 66 + i * 14;
        t(30, y + 4, String(i + 2), 8, 'dim', { mono: true });
        const indent = i % 3 === 0 ? 0 : 14;
        const w1 = between(20, 50);
        r(44 + indent, y, w1, 5, i % 2 === 0 ? 'neon' : 'tink', 2);
        r(50 + indent + w1, y, between(30, 120), 5, 'dim', 2);
      }
      r(44, 168, 7, 10, 'tink');
      break;
    }
    case 'list': {
      r(40, 10, 240, 180, 'page', 8, 'line');
      t(160, 36, `Awesome ${label}`, 11, 'ink', { mid: true, bold: true });
      r(130, 44, 60, 4, 'mute', 2);
      for (let s = 0; s < 2; s += 1) {
        const y0 = 60 + s * 64;
        r(56, y0, 70, 7, 'ink', 3);
        for (let i = 0; i < 4; i += 1) {
          c(60, y0 + 17 + i * 11, 2, 'cat');
          r(66, y0 + 15 + i * 11, between(30, 60), 4, 'pri', 2);
          r(140, y0 + 15 + i * 11, between(40, 110), 4, 'line', 2);
        }
      }
      break;
    }
    case 'flow': {
      r(16, 14, 288, 172, 'fill', 10);
      for (let x = 28; x < 300; x += 16) for (let y = 26; y < 180; y += 16) c(x, y, 0.8, 'line');
      const names = words.length > 0 ? words : ['Trigger', 'AI', 'Sheets'];
      const n = Math.min(names.length, 4);
      const step = n > 1 ? 196 / (n - 1) : 0;
      const pos = Array.from({ length: n }, (_, i) => [28 + i * step, i % 2 === 0 ? 70 : 118]);
      pos.forEach(([x = 0, y = 0], i) => {
        const next = pos[i + 1];
        if (next) {
          const [nx = 0, ny = 0] = next;
          p(`M${round(x + 68)} ${y + 18} C${round(x + 90)} ${y + 18} ${round(nx - 22)} ${ny + 18} ${round(nx)} ${ny + 18}`, 'mute');
        }
      });
      pos.forEach(([x = 0, y = 0], i) => {
        r(x, y, 68, 36, 'page', 8, i === 0 ? 'pri' : 'line');
        r(x + 6, y + 8, 20, 20, i === 0 ? 'pri' : 'soft', 5);
        t(x + 30, y + 22, names[i] ?? '', 7, 'ink', { bold: true });
      });
      break;
    }
    case 'image': {
      r(16, 14, 288, 22, 'page', 11, 'line');
      r(28, 23, 150, 4, 'mute', 2);
      r(250, 18, 48, 14, 'pri', 7);
      for (let i = 0; i < 6; i += 1) {
        const x = 16 + (i % 3) * 98;
        const y = 44 + Math.floor(i / 3) * 74;
        r(x, y, 92, 68, i % 2 === 0 ? 'soft' : 'fill', 6);
        c(x + between(20, 72), y + between(16, 30), between(5, 10), 'cat');
        p(`M${x} ${y + 68} L${x + between(15, 35)} ${y + between(30, 46)} L${x + 50} ${y + between(44, 56)} L${x + between(62, 78)} ${y + between(28, 42)} L${x + 92} ${y + 68} Z`, i % 3 === 1 ? 'pri' : 'ok', true);
      }
      break;
    }
    case 'audio': {
      r(16, 34, 288, 132, 'page', 12, 'line');
      t(34, 58, label, 9, 'ink', { bold: true });
      for (let i = 0; i < 46; i += 1) {
        const h = between(6, 46) * (0.5 + 0.5 * Math.sin(i / 5));
        r(34 + i * 5.6, 104 - h / 2, 3, Math.max(4, round(h)), i < 18 ? 'pri' : 'line', 1.5);
      }
      c(44, 146, 10, 'pri');
      p('M41 140 L50 146 L41 152 Z', 'page', true);
      r(64, 145, 220, 3, 'line', 1.5);
      r(64, 145, 88, 3, 'pri', 1.5);
      break;
    }
    case 'labels': {
      r(16, 22, 110, 156, 'soft', 10);
      c(70, 82, 22, 'cat');
      p('M16 178 L50 128 L80 150 L104 120 L126 150 L126 178 Z', 'ok', true);
      const ws = [between(120, 150), between(60, 90), between(26, 50), between(10, 22)].sort((a, b) => b - a);
      ws.forEach((w, i) => {
        const y = 40 + i * 34;
        r(140, y, between(40, 70), 5, 'mute', 2);
        r(140, y + 11, 160, 10, 'fill', 5);
        r(140, y + 11, w, 10, i === 0 ? 'pri' : 'line', 5);
      });
      break;
    }
    case 'translate': {
      r(16, 26, 132, 148, 'page', 10, 'line');
      r(172, 26, 132, 148, 'page', 10, 'line');
      r(28, 36, 30, 14, 'fill', 7);
      t(43, 46, 'EN', 7, 'ink', { mid: true, bold: true });
      r(184, 36, 30, 14, 'soft', 7);
      t(199, 46, 'KO', 7, 'ink', { mid: true, bold: true });
      bars(28, 62, 8, 108, 'mute', 12);
      bars(184, 62, 8, 108, 'cat', 12);
      c(160, 100, 11, 'pri');
      p('M154 100 L166 100 M161 95 L166 100 L161 105', 'page', false, 2);
      break;
    }
    case 'detect': {
      r(16, 14, 288, 172, 'soft', 10);
      c(between(240, 280), 40, 12, 'cat');
      p('M16 186 L80 110 L120 150 L170 90 L240 160 L304 120 L304 186 Z', 'ok', true);
      const boxes = [
        [between(40, 70), 96, 70, 64, 'hot'],
        [between(150, 175), 66, 56, 60, 'pri'],
        [between(220, 240), 120, 50, 44, 'cat'],
      ] as const;
      for (const [x, y, w, h, tone] of boxes) {
        p(`M${x} ${y} h${w} v${h} h${-w} Z`, tone, false, 2.5);
        r(x, y - 12, 40, 12, tone, 2);
      }
      break;
    }
    case 'scatter': {
      r(16, 14, 288, 172, 'page', 10, 'line');
      p('M36 30 L36 166 L292 166', 'line', false, 1.5);
      const centers: [number, number, Tone][] = [
        [between(80, 120), between(60, 90), 'pri'],
        [between(170, 210), between(110, 140), 'cat'],
        [between(230, 270), between(50, 80), 'ok'],
      ];
      for (const [cx, cy, tone] of centers) for (let i = 0; i < 14; i += 1) c(round(cx + (rand() - 0.5) * 60), round(cy + (rand() - 0.5) * 44), 3, tone);
      break;
    }
    case 'table': {
      r(16, 14, 288, 172, 'page', 8, 'line');
      r(16, 14, 288, 20, 'fill', 8);
      r(16, 26, 288, 8, 'fill');
      ['A', 'B', 'C', 'D'].forEach((h, i) => t(60 + i * 64, 28, h, 8, 'mute', { mid: true, bold: true }));
      r(16, 34, 288, 16, 'soft');
      for (let i = 0; i < 4; i += 1) r(36 + i * 64, 40, between(24, 44), 5, 'ink', 2);
      for (let row = 0; row < 8; row += 1) {
        const y = 50 + row * 17;
        t(26, y + 11, String(row + 1), 7, 'mute', { mid: true, mono: true });
        for (let i = 0; i < 4; i += 1) r(36 + i * 64, y + 6, between(14, 46), 4, i === 0 ? 'mute' : 'line', 2);
        r(16, y + 16, 288, 1, 'line');
      }
      for (let i = 1; i < 5; i += 1) r(28 + i * 64, 34, 1, 152, 'line');
      break;
    }
    case 'chart': {
      r(16, 14, 288, 172, 'page', 10, 'line');
      t(30, 36, label, 9, 'ink', { bold: true });
      r(30, 42, 80, 4, 'mute', 2);
      for (let i = 0; i < 4; i += 1) r(40, 64 + i * 28, 252, 1, 'line');
      const a: number[][] = [];
      const b: number[][] = [];
      let ya = between(130, 150);
      let yb = between(100, 130);
      for (let i = 0; i < 12; i += 1) {
        ya = Math.max(60, Math.min(150, ya + between(-14, 8)));
        yb = Math.max(60, Math.min(150, yb + between(-10, 12)));
        a.push([40 + i * 23, ya]);
        b.push([40 + i * 23, yb]);
      }
      p(`${line(a)} L293 160 L40 160 Z`, 'soft', true);
      p(line(a), 'pri', false, 2.5);
      p(line(b), 'cat', false, 2);
      r(40, 160, 253, 1.5, 'mute');
      break;
    }
  }
  return out;
}
