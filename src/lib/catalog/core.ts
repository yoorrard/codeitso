// 진열대 계산 (순수 함수, 시험: tests/lib/catalog.test.ts): 정렬·인기 점수·쪽 나누기·상세 조각 번호·카드 모양·관련 상품.
// 빌드(load.ts)와 화면(섬)이 함께 쓴다. DOM·Node API·시각·난수를 쓰지 않는다. 정렬에 localeCompare를 쓰지 않는다 (CLAUDE.md 코드 규칙).
import type { Card, CatalogItem, CategoryId, Fact, Metric, SortKey, Thumb } from './types.ts';
import { CHUNK_PAGES, PAGE_SIZE, RELATED_MAX, SHARDS } from './types.ts';
import { FONT_CSS_HOSTS, FONT_FILE_HOSTS, allowedUrl, blockedImage } from './hosts.ts';
import { sceneLabel, sceneOf, sceneWords } from './scene.ts';

/** 이름 견주기: NFKC + 소문자의 코드 단위 순서 (로캘과 무관해 빌드마다 같다) */
export function cmpText(a: string, b: string): number {
  const x = a.normalize('NFKC').toLowerCase();
  const y = b.normalize('NFKC').toLowerCase();
  if (x !== y) return x < y ? -1 : 1;
  return a === b ? 0 : a < b ? -1 : 1;
}

/** FNV-1a 32비트 (UTF-16 코드 단위). 상세 조각 번호를 빌드와 브라우저가 같게 셈한다 */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function shardOf(id: string, shards: number = SHARDS): number {
  return fnv1a(id) % shards;
}

export function pageCount(total: number, size: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

export function pageSlice<T>(list: readonly T[], page: number, size: number = PAGE_SIZE): T[] {
  const p = Math.min(Math.max(1, Math.floor(page)), pageCount(list.length, size));
  return list.slice((p - 1) * size, p * size);
}

/** 쪽 번호 → 목록 자료 파일 번호(0부터)와 그 파일 안의 첫 카드 자리 */
export function chunkOf(page: number, size: number = PAGE_SIZE, per: number = CHUNK_PAGES): { chunk: number; offset: number } {
  const p = Math.max(1, Math.floor(page)) - 1;
  return { chunk: Math.floor(p / per), offset: (p % per) * size };
}

/** 소분류 하나의 목록 자료 파일 수 (정렬 하나당) */
export function chunkCount(total: number, size: number = PAGE_SIZE, per: number = CHUNK_PAGES): number {
  return Math.ceil(pageCount(total, size) / per);
}

/**
 * 쪽 번호 줄: 처음·끝·지금 앞뒤 span쪽은 늘 보이고, 사이가 2쪽 넘게 비면 null(…)로 줄인다.
 * 예: (7, 20) → [1, null, 5, 6, 7, 8, 9, null, 20]
 */
export function pageWindow(current: number, total: number, span = 2): (number | null)[] {
  const keep = new Set<number>([1, total]);
  for (let p = current - span; p <= current + span; p += 1) if (p >= 1 && p <= total) keep.add(p);
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev === 2) out.push(p - 1);
    else if (p - prev > 2) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}

/** 카드에 보일 인기 지표 하나: 별 → 좋아요 → 내려받기 */
export function metricOf(item: CatalogItem): Metric | undefined {
  const m = item.metrics;
  if (!m) return undefined;
  if (typeof m.stars === 'number') return { kind: 'stars', value: m.stars };
  if (typeof m.likes === 'number') return { kind: 'likes', value: m.likes };
  if (typeof m.downloads === 'number') return { kind: 'downloads', value: m.downloads };
  return undefined;
}

/** 세 자리 쉼표 (로캘과 무관) */
export function withCommas(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  const out = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `-${out}` : out;
}

/** 큰 수를 한국식 단위로 짧게: 9,999 · 1.2만 · 35만 · 1.2억 */
export function formatCount(n: number): string {
  const a = Math.abs(n);
  const short = (v: number, unit: string): string => {
    const d = v < 10 ? Math.round(v * 10) / 10 : Math.round(v);
    return `${String(d).replace(/\.0$/, '')}${unit}`;
  };
  if (a < 10_000) return withCommas(n);
  if (a < 100_000_000) return short(n / 10_000, '만');
  return short(n / 100_000_000, '억');
}

/** 갱신일이 YYYY-MM-DD 꼴이면 그 앞 10자, 아니면 없음 */
export function dateOf(item: CatalogItem): string | undefined {
  const d = item.metrics?.updatedAt;
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : undefined;
}

/** 카드·상세의 한 줄 설명: 한국어 한 줄이 있으면 그것, 없으면 출처 원문 */
export function pickSummary(item: Pick<CatalogItem, 'summary' | 'summaryKo'>): string {
  return item.summaryKo?.trim() || item.summary.trim();
}

/**
 * 코드잇소가 쓴 한국어 설명(data/catalog-ko, id → 한국어)을 붙인다 (v5.1 D122). 출처가 준 한국어 한 줄이 있으면 그것을 둔다.
 * 원문(summary)은 그대로라 상세의 '원문'에서 볼 수 있다. 빈 글이면 붙이지 않는다.
 */
export function withKo(item: CatalogItem, ko: string | undefined): CatalogItem {
  const t = ko?.replace(/\s+/g, ' ').trim();
  if (!t || item.summaryKo?.trim()) return item;
  return { ...item, summaryKo: t, koBy: 'codeshopper' };
}

/** README 첫 그림 (v5.1 D126, data/catalog-media): 진열대 빌드가 미리 보기 자료에 readmeImage·readmeStill로 붙인다. 출처 그림이 따로 있으면 그쪽이 먼저다 */
export function withMedia(item: CatalogItem, image: string | undefined, still?: string): CatalogItem {
  if (!image) return item;
  const preview: CatalogItem['preview'] = { ...item.preview, readmeImage: image };
  if (still) preview['readmeStill'] = still;
  return { ...item, preview };
}

const isGif = (u: string): boolean => /\.gif([?#]|$)/i.test(u);

/** 글자(코드 포인트) 수로 자르고 말줄임표를 붙인다 */
/** 좁은 자리(키트 카드)의 짧은 이름. 공공데이터포털 이름은 '기관_…_데이터 이름' 꼴이라 앞이 같아 잘리면 구별되지 않는다:
 *  마지막 '_' 뒤만 보인다. 온 이름은 부르는 쪽이 title에 둔다. 자료는 고치지 않는다 */
export function shortName(id: string, name: string): string {
  if (!id.startsWith('data-go-kr')) return name;
  const tail = name.slice(name.lastIndexOf('_') + 1).trim();
  return tail.length >= 2 ? tail : name;
}

export function truncate(s: string, max: number): string {
  const chars = [...s];
  return chars.length <= max ? s : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

const HEX = /^#[0-9a-f]{3,8}$/i;
const CSS_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/deg]+\))$/i;
/** 자료 속 SVG 조각은 그림만 허락한다: 스크립트·이벤트·바깥 참조가 있으면 쓰지 않는다 */
const UNSAFE_SVG = /<script|<foreignobject|<iframe|<image|<use|\son[a-z]+\s*=|javascript:|href\s*=|url\(/i;

export function safeSvg(s: unknown, max = 4000): string | null {
  return typeof s === 'string' && s.length > 0 && s.length <= max && !UNSAFE_SVG.test(s) ? s : null;
}

/** 자료의 색 목록(글자 또는 {hex})에서 #RRGGBB만 */
function hexes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const c of raw) {
    const v = typeof c === 'string' ? c : typeof c === 'object' && c !== null ? (c as Record<string, unknown>)['hex'] : undefined;
    if (typeof v === 'string' && HEX.test(v)) out.push(v);
  }
  return out;
}

/** 상세 미리 보기의 색 목록 (이름이 있으면 같이), 32개까지 */
export function paletteColors(item: CatalogItem): { name?: string; hex: string }[] {
  const raw = item.preview['colors'];
  if (!Array.isArray(raw)) return [];
  const out: { name?: string; hex: string }[] = [];
  for (const c of raw) {
    if (typeof c === 'string' && HEX.test(c)) out.push({ hex: c });
    else if (typeof c === 'object' && c !== null) {
      const o = c as Record<string, unknown>;
      const hex = o['hex'];
      if (typeof hex === 'string' && HEX.test(hex)) out.push(typeof o['name'] === 'string' ? { name: o['name'], hex } : { hex });
    }
    if (out.length === 32) break;
  }
  return out;
}

/** 출처 그림 주소: https만 */
function httpsUrl(v: unknown): string | null {
  return typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v) ? v : null;
}

/** 미리 보기 그림으로 부를 수 있는 호스트 (출처의 공식 CDN, brief 5절). 검색 엔진의 파비콘 서비스처럼 출처가 아닌 곳은 부르지 않는다 */
function previewImage(v: unknown): string | null {
  const u = httpsUrl(v);
  if (!u) return null;
  return blockedImage(u) ? null : u;
}

/** 이름 머리글자 두 자 (그림이 없는 카드) */
export function monogram(name: string): string {
  const base = (name.split('/').pop() ?? name).trim();
  if (/^[가-힣]/.test(base)) return [...base].slice(0, 2).join('');
  const words = base.split(/[\s\-_.:]+/).filter((w) => /[A-Za-z0-9]/.test(w));
  const first = (w: string | undefined): string => (w ?? '').replace(/[^A-Za-z0-9]/g, '').charAt(0);
  const label = `${first(words[0])}${first(words[1])}`.toUpperCase();
  return label || [...base].slice(0, 2).join('').toUpperCase();
}

/**
 * 카드 미리 보기 판. iconMax = 아이콘 묶음 견본 수 (카드 4, 상세 8), detail = 상세(README의 움직이는 GIF를 그대로 쓴다.
 * 카드는 목록 60장이 한꺼번에 받지 않게 멈춘 그림이 있으면 그것, 없으면 그린 장면).
 */
export function thumbOf(item: CatalogItem, iconMax = 4, detail = false): Thumb {
  const p = item.preview;
  const label = monogram(item.name);
  const mono: Thumb = { t: 'mono', label };
  const scene = sceneOf(item);
  const drawn: Thumb = scene ? sceneThumb(item, scene) : mono;
  /** README 첫 그림: 못 받으면 장면이 대신 보인다 */
  const readme = (): Thumb | null => {
    const img = previewImage(p['readmeImage']);
    if (!img) return null;
    const src = detail || !isGif(img) ? img : previewImage(p['readmeStill']);
    if (!src) return null;
    const out: Thumb = { t: 'img', src, fit: 'contain', label };
    if (drawn.t === 'scene') {
      // 그림을 못 받으면 장면이 대신 보이므로 이름표도 장면의 것을 쓴다
      out.label = drawn.label;
      out.scene = drawn.scene;
      if (drawn.words) out.words = drawn.words;
    }
    return out;
  };
  switch (p.type) {
    case 'palette': {
      const all = hexes(p['colors']);
      if (p['mode'] === 'gradient' && all.length >= 2) {
        const angle = typeof p['angle'] === 'number' ? p['angle'] : 90;
        return { t: 'gradient', colors: all.slice(0, 6), angle };
      }
      // Base16·Base24: 바탕(00) + 강조 8색(08~0F)
      const colors = (p['mode'] === 'base16' || p['mode'] === 'base24') && all.length >= 16 ? [all[0] ?? '', ...all.slice(8, 16)] : all.slice(0, 10);
      return colors.length > 0 ? { t: 'colors', colors } : mono;
    }
    case 'font': {
      const family = typeof p['family'] === 'string' ? p['family'] : item.name;
      const generic = typeof p['generic'] === 'string' ? p['generic'] : 'sans-serif';
      const font: Thumb = { t: 'font', family, generic, ko: item.kind === 'fonts-ko' || p['sample'] === 'ko' };
      // 사이트 글꼴(Pretendard Variable)과 이름이 같으면 부르지 않는다: 같은 이름의 글꼴 규칙이 화면 글꼴을 바꿔 버린다
      if (/^pretendard/i.test(family)) return font;
      const css = allowedUrl(p['cssUrl'], FONT_CSS_HOSTS);
      const file = css ? null : allowedUrl(p['fileUrl'], FONT_FILE_HOSTS);
      if (css) font.css = css;
      if (file) font.file = file;
      return font;
    }
    case 'icons': {
      const images = p['images'];
      if (typeof images === 'object' && images !== null) {
        const im = images as Record<string, unknown>;
        const light = previewImage(im['light']);
        if (light) {
          const dark = previewImage(im['dark']);
          return dark && dark !== light ? { t: 'img', src: light, dark, fit: 'contain', label } : { t: 'img', src: light, fit: 'contain', label };
        }
      }
      const icons = Array.isArray(p['icons']) ? (p['icons'] as unknown[]) : [];
      const bodies = icons
        .map((x) => safeSvg(typeof x === 'object' && x !== null ? (x as Record<string, unknown>)['body'] : undefined, 3000))
        .filter((x): x is string => x !== null)
        .slice(0, iconMax);
      const w = typeof p['width'] === 'number' ? p['width'] : 24;
      const h = typeof p['height'] === 'number' ? p['height'] : 24;
      return bodies.length > 0 ? { t: 'icons', w, h, bodies } : mono;
    }
    case 'asset': {
      const img = previewImage(p['image']);
      if (img) return { t: 'img', src: img, fit: 'cover', label };
      const svg = safeSvg(p['svg']);
      if (svg) {
        const w = Number(svg.match(/\bwidth="(\d+(\.\d+)?)"/)?.[1] ?? 0);
        const h = Number(svg.match(/\bheight="(\d+(\.\d+)?)"/)?.[1] ?? 0);
        const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
        if (w > 0 && h > 0 && body) return { t: 'pattern', w, h, body, stroke: false };
      }
      const paths = Array.isArray(p['paths']) ? p['paths'].map((x) => safeSvg(x)).filter((x): x is string => x !== null) : [];
      if (paths.length > 0 && typeof p['width'] === 'number' && typeof p['height'] === 'number') {
        return { t: 'pattern', w: p['width'], h: p['height'], body: paths.join(''), stroke: p['mode'] === 'stroke' };
      }
      return mono;
    }
    case 'style': {
      const tokens = typeof p['tokens'] === 'object' && p['tokens'] !== null ? (p['tokens'] as Record<string, unknown>) : {};
      const colors = ['bg', 'surface', 'primary', 'accent', 'text']
        .map((k) => tokens[k])
        .filter((v): v is string => typeof v === 'string' && CSS_COLOR.test(v));
      return colors.length > 0 ? { t: 'style', colors } : mono;
    }
    case 'site': {
      const emoji = p['emoji'];
      if (typeof emoji === 'string' && emoji.length > 0 && emoji.length <= 8) return { t: 'emoji', emoji };
      return drawn;
    }
    case 'template':
    case 'repo': {
      // 갤러리의 화면 갈무리 → README 첫 그림 → 아이콘 → 그린 장면. 주인 아바타·저장소 소개 카드는 previewImage가 뺀다
      const shot = previewImage(p['image']);
      if (shot) return { t: 'img', src: shot, fit: 'cover', label };
      const icon = previewImage(p['icon']);
      return readme() ?? (icon ? { t: 'img', src: icon, fit: 'contain', label } : drawn);
    }
    case 'model':
    case 'dataset':
      return readme() ?? drawn;
    case 'skill': {
      const icon = previewImage(p['icon']);
      return icon ? { t: 'img', src: icon, fit: 'contain', label } : mono;
    }
    case 'api': {
      const logo = previewImage(p['logo']);
      return logo ? { t: 'img', src: logo, fit: 'contain', label } : mono;
    }
    default:
      return mono;
  }
}

/** 그린 장면 판: 상품 이름(짧게)과 장면에 넣을 말 */
function sceneThumb(item: CatalogItem, scene: NonNullable<ReturnType<typeof sceneOf>>): Thumb {
  const words = sceneWords(item, scene);
  const out: Thumb = { t: 'scene', scene, label: sceneLabel(item.name) };
  if (words.length > 0) out.words = words;
  return out;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' && v.length <= 60 ? v.trim() : undefined);

/** 카드의 짧은 사실 (4개까지: API는 인증·HTTPS·CORS·무료 한도) */
export function factsOf(item: CatalogItem): Fact[] {
  const p = item.preview;
  const out: Fact[] = [];
  const add = (f: Fact): void => {
    if (out.length < 4) out.push(f);
  };
  switch (p.type) {
    case 'api': {
      const auth = str(p['auth']);
      if (auth) add({ k: 'auth', v: auth });
      if (p['https'] === true) add({ k: 'https' });
      if (p['cors'] === 'yes') add({ k: 'cors' });
      if (typeof p['freeTierQuote'] === 'string' && p['freeTierQuote'].trim() !== '') add({ k: 'free' });
      const formats = Array.isArray(p['formats']) ? str(p['formats'][0]) : undefined;
      if (formats) add({ k: 'format', v: formats });
      break;
    }
    case 'mcp': {
      const transports = Array.isArray(p['transports']) ? p['transports'] : [];
      if (transports.includes('stdio')) add({ k: 'transport', v: 'stdio' });
      if (Array.isArray(p['remotes']) && p['remotes'].length > 0) add({ k: 'transport', v: 'remote' });
      break;
    }
    case 'model': {
      const task = str(p['taskLabel']) ?? str(p['task']);
      if (task) add({ k: 'task', v: task });
      const lib = str(p['library']);
      if (lib) add({ k: 'lang', v: lib });
      break;
    }
    case 'repo':
    case 'template': {
      const lang = str(p['language']);
      if (lang) add({ k: 'lang', v: lang });
      const platform = str(p['platform']);
      if (platform) add({ k: 'host', v: platform });
      break;
    }
    case 'dataset': {
      const size = str(p['size']);
      if (size) add({ k: 'size', v: size });
      const format = Array.isArray(p['formats']) ? str(p['formats'][0]) : undefined;
      if (format) add({ k: 'format', v: format });
      break;
    }
    case 'skill':
    case 'prompt': {
      const agent = str(p['agent']) ?? str(p['tool']);
      if (agent) add({ k: 'agent', v: agent });
      break;
    }
    default:
      break;
  }
  return out;
}

export const CARD_SUMMARY_MAX = 110;

export function cardOf(item: CatalogItem): Card {
  const card: Card = {
    id: item.id,
    name: item.name,
    cat: item.category as CategoryId,
    sub: item.kind,
    summary: truncate(pickSummary(item).replace(/\s+/g, ' '), CARD_SUMMARY_MAX),
    source: item.source.name,
    thumb: thumbOf(item),
    facts: factsOf(item),
  };
  if (item.license) card.license = item.license;
  const metric = metricOf(item);
  if (metric) card.metric = metric;
  const date = dateOf(item);
  if (date) card.updatedAt = date;
  return card;
}

/** 인기 점수에 쓰는 지표 (D133). 앞이 같은 수일 때 이긴다. siteRank = Chrome UX Report 순위 묶음(작을수록 인기) */
const POP_KINDS = ['downloads', 'stars', 'likes', 'views', 'siteRank'] as const;
type PopKind = (typeof POP_KINDS)[number];

/** 인기 점수 규칙 (D133). 값을 바꾸면 docs/review/v5/popularity-audit.md의 표를 다시 본다 */
export const POP_RULES = {
  /** 소분류에서 가장 많이 채워진 지표가 아닌 지표로만 잰 상품의 몫 (지표끼리 단위가 달라 한쪽 맨 위가 다른 쪽 맨 위와 같아지지 않게) */
  secondary: 0.85,
  /** 누적 지표(스타·좋아요)는 오래 갱신되지 않으면 이만큼까지 깎는다: freshDays까지는 그대로, staleDays에서 다 깎는다 */
  staleMax: 0.2,
  freshDays: 365,
  staleDays: 1095,
  /** 최근 뜨는 정도(metrics.trend, 예: Hugging Face trendingScore)에 얹는 최대 몫 */
  trendBonus: 0.3,
  /** 같은 신호(같은 저장소의 스타·같은 사이트의 순위·같은 SDK의 내려받기)나 같은 이름을 나눠 가진 두 번째부터 곱하는 값.
   *  열쇠가 여럿 겹치면 열쇠마다 곱한다(이름과 저장소가 다 같으면 거의 같은 상품) */
  dup: 0.8,
  /** 같은 저장소 안의 서로 다른 폴더(모노레포의 서버·예제 하나하나)는 덜 줄인다 */
  dupSubpath: 0.9,
  /** 손으로 고른 상품(written)의 바닥: 손으로 고르지 않은 잰 상품 이만큼 바로 뒤 (그런 상품이 더 적으면 지표 없는 상품 바로 앞) */
  curatedAfter: 24,
} as const;

/** 사이트 순위의 크기 기준: 1천 위 안(가장 높은 묶음) = log10(1천만/1천) = 4 */
const SITE_RANK_TOP = 4;

/** 지표 값을 크기로: 수는 log10(1+값), 사이트 순위는 log10(1천만/순위) (1천 위 → 4, 100만 위 → 1) */
function popMagnitude(item: CatalogItem, k: PopKind): number | undefined {
  const v = item.metrics?.[k];
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return undefined;
  if (k === 'siteRank') return v >= 1 ? Math.max(0, Math.log10(10_000_000 / v)) : undefined;
  return Math.log10(1 + v);
}

/** YYYY-MM-DD 두 날의 차이(일). 날짜가 아니면 없음 */
function daysBetween(from: string, to: string): number | undefined {
  const day = (s: string): number | undefined => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000 : undefined;
  };
  const a = day(from);
  const b = day(to);
  return a === undefined || b === undefined ? undefined : b - a;
}

/** 주소의 호스트 (www. 뗌). 사이트 순위를 나눠 가진 상품을 알아보는 데 쓴다 */
function hostKey(url: string): string | undefined {
  const host = /^https?:\/\/([^/:?#]+)/i.exec(url)?.[1]?.toLowerCase();
  return host ? `site:${host.replace(/^www\./, '')}` : undefined;
}

/** 저장소 주소의 '주인/이름' (GitHub·GitLab·Codeberg), 아니면 없음. 저장소 안 폴더를 가리키면 '주인/이름|폴더' */
function repoKey(item: CatalogItem): string | undefined {
  const raw = [item.preview['repo'], item.url].find((v): v is string => typeof v === 'string' && v !== '');
  if (!raw) return undefined;
  const m = /(?:github\.com|gitlab\.com|codeberg\.org)\/([^/#?\s]+)\/([^/#?\s]+)(\/(?:tree|blob)\/[^/#?\s]+\/\S+)?/i.exec(raw) ?? /^([\w.-]+)\/([\w.-]+)$/.exec(raw);
  if (!m) return undefined;
  const folder = m[3]?.replace(/^\/(?:tree|blob)\/[^/]+\//i, '').replace(/\/+$/, '').toLowerCase();
  return `repo:${(m[1] ?? '').toLowerCase()}/${(m[2] ?? '').toLowerCase().replace(/\.git$/, '')}${folder ? `|${folder}` : ''}`;
}

/**
 * 소분류 하나 안의 인기 점수 (D133, D105를 바꿈). 같은 소분류의 모든 상품을 한꺼번에 받는다.
 * 1) 지표마다 log 크기를 그 소분류의 가장 큰 값으로 나눈다(0~1). 출처가 달라도 같은 지표면 값끼리 견준다.
 *    사이트 순위는 세계 순위라 소분류와 상관없이 1천 위 안 = 1로 나눈다(작은 무리의 맨 위가 1이 되지 않게).
 * 2) 소분류에서 가장 많이 채워진 지표가 으뜸(사이트 순위는 다른 지표가 없을 때만). 으뜸 지표가 있는 상품은 그것으로만 재고,
 *    없는 상품은 가진 다른 지표 가운데 큰 값에 secondary를 곱한다.
 * 3) 누적 지표(스타·좋아요)로 잰 상품은 오래 갱신되지 않았으면 깎고(기준일 = 소분류에서 가장 늦은 fetchedAt), trend가 있으면 얹는다.
 * 4) 손으로 고른 상품(written)은 지표가 없거나 약해도 출처 목록에서 잰 상품 curatedAfter개 바로 뒤에는 선다. 그 밖의 지표 없는 상품은 0.
 * 5) 같은 신호나 같은 이름을 나눠 가진 상품, 다른 지표로 잰 같은 출처의 상품은 두 번째부터 dup을 거듭 곱해 한 쪽에 몰리지 않게 한다.
 */
export function rankScores(items: readonly CatalogItem[]): number[] {
  const mags = items.map((it) => POP_KINDS.map((k) => popMagnitude(it, k)));
  const max = POP_KINDS.map(() => 0);
  const count = POP_KINDS.map(() => 0);
  let trendMax = 0;
  let ref = '';
  items.forEach((it, i) => {
    (mags[i] ?? []).forEach((m, j) => {
      if (m === undefined) return;
      count[j] = (count[j] ?? 0) + 1;
      if (m > (max[j] ?? 0)) max[j] = m;
    });
    const t = it.metrics?.trend;
    if (typeof t === 'number' && t > 0) trendMax = Math.max(trendMax, Math.log10(1 + t));
    if (it.fetchedAt > ref) ref = it.fetchedAt;
  });
  // 으뜸 지표: 가장 많이 채워진 것. 사이트 순위는 다른 지표가 하나도 없을 때만 으뜸이 된다(상품 자체가 아니라 사이트의 인기라서).
  let primary = 0;
  count.forEach((c, j) => {
    const site = POP_KINDS[j] === 'siteRank';
    const realElsewhere = count.some((x, k) => POP_KINDS[k] !== 'siteRank' && x > 0);
    if (c > (count[primary] ?? 0) && !(site && realElsewhere)) primary = j;
  });

  const signal: (string | undefined)[] = items.map(() => undefined);
  const viaSecondary: (string | undefined)[] = items.map(() => undefined);
  const measured: boolean[] = items.map(() => false);
  const scores = items.map((it, i) => {
    let best = -1;
    let bestKind: PopKind | undefined;
    const hasPrimary = mags[i]?.[primary] !== undefined;
    (mags[i] ?? []).forEach((m, j) => {
      // 으뜸 지표가 있는 상품은 으뜸 지표로만 잰다 (작은 무리의 다른 지표로 앞서지 않게)
      if (m === undefined || (hasPrimary && j !== primary)) return;
      const top = POP_KINDS[j] === 'siteRank' ? SITE_RANK_TOP : (max[j] ?? 0);
      const v = (top > 0 ? Math.min(1, m / top) : 0) * (j === primary ? 1 : POP_RULES.secondary);
      if (v > best) {
        best = v;
        bestKind = POP_KINDS[j];
      }
    });
    if (bestKind === undefined) return 0;
    measured[i] = true;
    let score = best;
    if (bestKind === 'stars' || bestKind === 'likes') {
      const age = it.metrics?.updatedAt ? daysBetween(it.metrics.updatedAt, ref) : undefined;
      if (age !== undefined) {
        const stale = Math.min(1, Math.max(0, (age - POP_RULES.freshDays) / (POP_RULES.staleDays - POP_RULES.freshDays)));
        score *= 1 - POP_RULES.staleMax * stale;
      }
    }
    const t = it.metrics?.trend;
    if (typeof t === 'number' && t > 0 && trendMax > 0) score += (POP_RULES.trendBonus * Math.log10(1 + t)) / trendMax;
    if (bestKind === 'stars') signal[i] = repoKey(it);
    else if (bestKind === 'siteRank') signal[i] = hostKey(it.url);
    else if (bestKind === 'downloads' && typeof it.preview['downloadsOf'] === 'string') signal[i] = `dl:${it.preview['downloadsOf']}`;
    // 다른 지표로 잰 상품은 그 출처 안의 잣대라 같은 출처끼리도 두 번째부터 줄인다 (한 출처가 첫 쪽을 채우지 않게)
    if (bestKind !== POP_KINDS[primary]) viaSecondary[i] = `via:${it.source.name}:${bestKind}`;
    return score;
  });

  // 손으로 고른 상품의 바닥: 출처 목록에서 잰 상품(손으로 고르지 않은 것)의 curatedAfter번째 바로 뒤. 바닥 아래 상품끼리는 원래 순서를 지킨다.
  const ranked = scores.filter((_, i) => measured[i] && !items[i]?.written).sort((a, b) => b - a);
  const after = ranked[POP_RULES.curatedAfter - 1];
  const floor = after !== undefined && after > 0 ? after * (1 - 1e-5) : 1e-6;
  items.forEach((it, i) => {
    const s = scores[i] ?? 0;
    if (it.written && s < floor) scores[i] = floor * (1 + s * 1e-6);
  });

  // 같은 점수(같은 신호를 나눠 가진 상품)끼리는 그 상품만의 지표(내려받기 → 좋아요)가 큰 것이 먼저 대표가 된다
  const own = (i: number): number => items[i]?.metrics?.downloads ?? items[i]?.metrics?.likes ?? -1;
  const order = items.map((_, i) => i).filter((i) => (scores[i] ?? 0) > 0);
  order.sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0) || own(b) - own(a) || cmpText(items[a]?.name ?? '', items[b]?.name ?? '') || cmpText(items[a]?.id ?? '', items[b]?.id ?? ''));
  const seen = new Map<string, number>();
  for (const i of order) {
    const it = items[i];
    if (!it) continue;
    const keys = [`name:${it.name.normalize('NFKC').toLowerCase().trim()}`, signal[i], viaSecondary[i]].filter((k): k is string => k !== undefined);
    // 같은 저장소의 다른 폴더끼리는 '주인/이름' 열쇠로 묶되 덜 줄인다
    const repoBase = signal[i]?.startsWith('repo:') && signal[i]?.includes('|') ? signal[i]?.split('|')[0] : undefined;
    if (repoBase) keys.push(repoBase);
    let factor = 1;
    for (const k of keys) factor *= (k === repoBase ? POP_RULES.dupSubpath : POP_RULES.dup) ** (seen.get(k) ?? 0);
    if (factor < 1) scores[i] = (scores[i] ?? 0) * factor;
    for (const k of keys) seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return scores;
}

export interface Ranked {
  item: CatalogItem;
  pop: number;
}

/** 목록 정렬. popular = 점수 → 지표 값 → 이름, name = 이름, recent = 갱신일(없으면 뒤) → 점수 */
export function sortRanked(list: readonly Ranked[], sort: SortKey): Ranked[] {
  const out = [...list];
  const metricValue = (r: Ranked): number => metricOf(r.item)?.value ?? -1;
  if (sort === 'name') out.sort((a, b) => cmpText(a.item.name, b.item.name) || cmpText(a.item.id, b.item.id));
  else if (sort === 'recent') {
    out.sort((a, b) => {
      const x = dateOf(a.item) ?? '';
      const y = dateOf(b.item) ?? '';
      if (x !== y) return x < y ? 1 : -1;
      return b.pop - a.pop || cmpText(a.item.name, b.item.name);
    });
  } else out.sort((a, b) => b.pop - a.pop || metricValue(b) - metricValue(a) || cmpText(a.item.name, b.item.name) || cmpText(a.item.id, b.item.id));
  return out;
}

/**
 * 관련 상품 (D103): 같은 소분류 안에서 태그를 가장 많이 함께 가진 것 → 모자라면 인기 순위가 가까운 것.
 * items는 인기순이라 같은 태그 안에서는 인기 많은 것부터 본다. 너무 흔한 태그(소분류의 30% 넘게)는 보지 않는다.
 */
export function relatedIndex(items: readonly { tags: readonly string[] }[], max: number = RELATED_MAX, postingCap = 40): number[][] {
  const n = items.length;
  const postings = new Map<string, number[]>();
  items.forEach((it, i) => {
    for (const t of new Set(it.tags)) {
      let l = postings.get(t);
      if (!l) {
        l = [];
        postings.set(t, l);
      }
      l.push(i);
    }
  });
  const common = Math.max(50, n * 0.3);
  return items.map((it, i) => {
    const score = new Map<number, number>();
    for (const t of new Set(it.tags)) {
      const l = postings.get(t) ?? [];
      if (l.length < 2 || l.length > common) continue;
      let seen = 0;
      for (const j of l) {
        if (j === i) continue;
        score.set(j, (score.get(j) ?? 0) + 1);
        seen += 1;
        if (seen >= postingCap) break;
      }
    }
    const picked = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, max).map((e) => e[0]);
    for (let d = 1; picked.length < max && (i - d >= 0 || i + d < n); d += 1) {
      for (const j of [i - d, i + d]) if (j >= 0 && j < n && j !== i && !picked.includes(j) && picked.length < max) picked.push(j);
    }
    return picked;
  });
}
