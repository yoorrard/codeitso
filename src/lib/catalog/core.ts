// 진열대 계산 (순수 함수, 시험: tests/lib/catalog.test.ts): 정렬·인기 점수·쪽 나누기·상세 조각 번호·카드 모양·관련 상품.
// 빌드(load.ts)와 화면(섬)이 함께 쓴다. DOM·Node API·시각·난수를 쓰지 않는다. 정렬에 localeCompare를 쓰지 않는다 (CLAUDE.md 코드 규칙).
import type { Card, CatalogItem, CategoryId, Fact, Metric, SortKey, Thumb } from './types.ts';
import { CHUNK_PAGES, PAGE_SIZE, RELATED_MAX, SHARDS } from './types.ts';
import { FONT_CSS_HOSTS, FONT_FILE_HOSTS, allowedUrl } from './hosts.ts';

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

/** 글자(코드 포인트) 수로 자르고 말줄임표를 붙인다 */
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
  const host = u.slice(8).split('/')[0] ?? '';
  return /(^|\.)(google\.com|gstatic\.com|googleusercontent\.com)$/.test(host) ? null : u;
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

/** 카드 미리 보기 판. iconMax = 아이콘 묶음 견본 수 (카드 4, 상세 8) */
export function thumbOf(item: CatalogItem, iconMax = 4): Thumb {
  const p = item.preview;
  const label = monogram(item.name);
  const mono: Thumb = { t: 'mono', label };
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
      return mono;
    }
    case 'template':
    case 'repo': {
      const img = previewImage(p['image']) ?? previewImage(p['icon']);
      if (img) return { t: 'img', src: img, fit: p['image'] ? 'cover' : 'contain', label };
      return mono;
    }
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

const POP_KEYS = ['downloads', 'stars', 'likes'] as const;

/**
 * 출처 파일 하나 안의 인기 점수 0~1 (D105): 그 파일에서 가장 많이 채워진 지표(내려받기 → 별 → 좋아요)의 순위 백분위.
 * 출처마다 지표의 뜻(한 달·전체 내려받기, 별)이 달라 값끼리 견주지 않고 순위로 섞는다. 같은 값은 같은 점수.
 * 지표가 없는 파일(손으로 고른 목록)은 모두 0.5, 지표가 있는 파일에서 값이 빠진 항목은 코드쇼퍼가 쓴 것이면 0.5, 아니면 0.
 */
export function filePopularity(items: readonly CatalogItem[]): number[] {
  let key: (typeof POP_KEYS)[number] | null = null;
  let best = 0;
  for (const k of POP_KEYS) {
    const n = items.filter((i) => typeof i.metrics?.[k] === 'number').length;
    if (n > best) {
      best = n;
      key = k;
    }
  }
  if (key === null) return items.map(() => 0.5);
  const k = key;
  const values = items.map((i) => i.metrics?.[k]).filter((v): v is number => typeof v === 'number');
  const distinct = [...new Set(values)].sort((a, b) => b - a);
  const rank = new Map(distinct.map((v, i) => [v, i]));
  const n = distinct.length;
  return items.map((i) => {
    const v = i.metrics?.[k];
    if (typeof v !== 'number') return i.written ? 0.5 : 0;
    return 1 - (rank.get(v) ?? n) / n;
  });
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
