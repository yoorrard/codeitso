// 상세의 종류별 미리 보기 자료 (S3): 상품 자료(preview)에서 화면에 보일 값만 골라 모양을 맞춘다. 출처 자료 그대로이고 지어내지 않는다.
// 순수 함수 (DOM·Node API 없음). 그리기는 src/components/DetailPreview.tsx, 시험은 tests/lib/preview.test.ts.
import { formatCount, withCommas } from './core.ts';
import type { CatalogItem } from './types.ts';

const str = (v: unknown, max = 200): string | undefined => (typeof v === 'string' && v.trim() !== '' && v.length <= max ? v.trim() : undefined);
const strs = (v: unknown, n = 12, max = 60): string[] => (Array.isArray(v) ? v.map((x) => str(x, max)).filter((x): x is string => x !== undefined).slice(0, n) : []);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const https = (v: unknown): string | undefined => (typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v) ? v : undefined);

/** WCAG 대비 등급: 7 이상 AAA, 4.5 이상 AA, 3 이상 큰 글자만 AA, 그 밖은 부족 */
export function wcagGrade(ratio: number): 'aaa' | 'aa' | 'large' | 'fail' {
  if (ratio >= 7) return 'aaa';
  if (ratio >= 4.5) return 'aa';
  if (ratio >= 3) return 'large';
  return 'fail';
}

/** 스타일 견본에 칠해도 되는 CSS 값: 바깥 주소(url)·식·여러 속성 끼워 넣기를 막는다 */
export function safeCssValue(v: unknown, max = 400): string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v !== 'string' || v.length === 0 || v.length > max) return undefined;
  if (/url\(|expression|[;{}<>\\]|@import|javascript:/i.test(v)) return undefined;
  return /^[#(),.%\s\w"'+/-]+$/.test(v) ? v : undefined;
}

export interface StyleSample {
  bg: string;
  background?: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  border: string;
  radius: string;
  borderWidth: string;
  shadow: string;
  font?: string;
  headingWeight?: string;
}

/** 디자인 스타일 견본의 색·모양 값 (preview.tokens). 꼭 있어야 할 값이 없으면 null */
export function styleSample(item: CatalogItem): StyleSample | null {
  const t = item.preview['tokens'];
  if (item.preview.type !== 'style' || typeof t !== 'object' || t === null) return null;
  const o = t as Record<string, unknown>;
  const v = (k: string): string | undefined => safeCssValue(o[k]);
  const bg = v('bg');
  const text = v('text');
  const primary = v('primary');
  if (!bg || !text || !primary) return null;
  const px = (k: string, d: string): string => {
    const n = num(o[k]);
    return n === undefined ? d : `${n}px`;
  };
  const out: StyleSample = {
    bg,
    surface: v('surface') ?? bg,
    text,
    muted: v('muted') ?? text,
    primary,
    onPrimary: v('onPrimary') ?? bg,
    accent: v('accent') ?? primary,
    border: v('border') ?? 'transparent',
    radius: px('radius', '8px'),
    borderWidth: px('borderWidth', '1px'),
    shadow: v('shadow') ?? 'none',
  };
  const background = v('background');
  if (background) out.background = background;
  const font = safeCssValue(o['fontStack']);
  if (font) out.font = font;
  const hw = num(o['headingWeight']);
  if (hw !== undefined) out.headingWeight = String(hw);
  return out;
}

export interface FontInfo {
  weights: number[];
  axes: { tag: string; min: number; max: number }[];
  italic: boolean;
  subsets: string[];
  designers: string[];
}

export function fontInfo(item: CatalogItem): FontInfo | null {
  const p = item.preview;
  if (p.type !== 'font') return null;
  const axes = Array.isArray(p['axes'])
    ? (p['axes'] as unknown[])
        .map((a) => (typeof a === 'object' && a !== null ? (a as Record<string, unknown>) : {}))
        .map((a) => ({ tag: str(a['tag'], 8) ?? '', min: num(a['min']) ?? 0, max: num(a['max']) ?? 0 }))
        .filter((a) => a.tag !== '')
    : [];
  return {
    weights: Array.isArray(p['weights']) ? (p['weights'] as unknown[]).map(num).filter((n): n is number => n !== undefined) : [],
    axes,
    italic: p['italic'] === true,
    subsets: strs(p['subsets'], 20),
    designers: strs(p['designers'], 6),
  };
}

/** 색 체계의 단계표 (preview.scales: [{name, steps:[{step, hex}]}]) */
export function colorScales(item: CatalogItem, maxScales = 14): { name: string; steps: { step: string; hex: string }[] }[] {
  const raw = item.preview['scales'];
  if (!Array.isArray(raw)) return [];
  const out: { name: string; steps: { step: string; hex: string }[] }[] = [];
  for (const s of raw) {
    if (typeof s !== 'object' || s === null) continue;
    const o = s as Record<string, unknown>;
    const steps = Array.isArray(o['steps'])
      ? (o['steps'] as unknown[])
          .map((x) => (typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {}))
          .map((x) => ({ step: String(x['step'] ?? ''), hex: typeof x['hex'] === 'string' && /^#[0-9a-f]{6}$/i.test(x['hex']) ? x['hex'] : '' }))
          .filter((x) => x.hex !== '')
          .slice(0, 14)
      : [];
    if (steps.length > 0) out.push({ name: str(o['name'], 40) ?? '', steps });
    if (out.length === maxScales) break;
  }
  return out;
}

export interface ApiInfo {
  auth?: string;
  https?: boolean;
  cors?: 'yes' | 'no' | 'unknown';
  freeQuote?: string;
  freeCheckedAt?: string;
  pricingUrl?: string;
  keyServerSide: boolean;
  apiBase?: string;
  env: string[];
  modelCount?: number;
  models: string[];
  openapi?: string;
  sdk?: string;
  formats: string[];
  provider?: string;
  category?: string;
}

export function apiInfo(item: CatalogItem): ApiInfo | null {
  const p = item.preview;
  if (p.type !== 'api') return null;
  const out: ApiInfo = { keyServerSide: p['keyServerSide'] === true, env: strs(p['env'], 6), models: strs(p['models'], 8), formats: strs(p['formats'], 6) };
  const auth = str(p['auth'], 60);
  if (auth) out.auth = auth;
  if (typeof p['https'] === 'boolean') out.https = p['https'];
  if (p['cors'] === 'yes' || p['cors'] === 'no' || p['cors'] === 'unknown') out.cors = p['cors'];
  const quote = str(p['freeTierQuote'], 600);
  if (quote) out.freeQuote = quote;
  const checked = str(p['freeTierCheckedAt'], 10);
  if (checked) out.freeCheckedAt = checked;
  const pricing = https(p['pricingUrl']);
  if (pricing) out.pricingUrl = pricing;
  const base = https(p['apiBase']);
  if (base) out.apiBase = base;
  const mc = num(p['modelCount']);
  if (mc !== undefined) out.modelCount = mc;
  const spec = https(p['openapi']);
  if (spec) out.openapi = spec;
  const sdk = str(p['sdk'], 80);
  if (sdk) out.sdk = sdk;
  const provider = str(p['provider'], 80);
  if (provider) out.provider = provider;
  const cat = str(p['portalCategory'], 40) ?? str(p['listCategory'], 40);
  if (cat) out.category = cat;
  return out;
}

export interface McpInfo {
  transports: string[];
  remotes: string[];
  packages: string[];
  registry?: string;
  requiresKey: boolean;
}

export function mcpInfo(item: CatalogItem): McpInfo | null {
  const p = item.preview;
  if (p.type !== 'mcp') return null;
  const remotes = Array.isArray(p['remotes'])
    ? (p['remotes'] as unknown[]).map((r) => (typeof r === 'object' && r !== null ? https((r as Record<string, unknown>)['url']) : undefined)).filter((u): u is string => u !== undefined)
    : [];
  const packages = Array.isArray(p['packages'])
    ? (p['packages'] as unknown[])
        .map((x) => {
          if (typeof x === 'string') return str(x, 120);
          if (typeof x !== 'object' || x === null) return undefined;
          const o = x as Record<string, unknown>;
          const id = str(o['identifier'], 120) ?? str(o['name'], 120);
          const reg = str(o['registry'], 20) ?? str(o['registryType'], 20);
          return id ? (reg ? `${reg}: ${id}` : id) : undefined;
        })
        .filter((x): x is string => x !== undefined)
    : [];
  const out: McpInfo = { transports: strs(p['transports'], 4), remotes: [...new Set(remotes)].slice(0, 3), packages: [...new Set(packages)].slice(0, 4), requiresKey: p['requiresKey'] === true };
  const reg = str(p['registryName'], 120);
  if (reg) out.registry = reg;
  return out;
}

/** 한눈에 보는 칸: [ko.pv.stats 열쇠, 값]. 출처 자료에 있는 것만 (인기 지표는 상세 표가 따로 보인다) */
export type StatKey =
  | 'language'
  | 'task'
  | 'library'
  | 'size'
  | 'rows'
  | 'features'
  | 'formats'
  | 'platform'
  | 'sdk'
  | 'status'
  | 'version'
  | 'author'
  | 'agent'
  | 'nodes'
  | 'views'
  | 'entries'
  | 'models'
  | 'format'
  | 'resolution'
  | 'polycount'
  | 'pricing'
  | 'host'
  | 'usability'
  | 'stack'
  | 'modalities'
  | 'languages'
  | 'field'
  | 'publisher'
  | 'updateFrequency';

export function statsOf(item: CatalogItem, max = 8): [StatKey, string][] {
  const p = item.preview;
  const out: [StatKey, string][] = [];
  const put = (k: StatKey, v: string | number | undefined | string[]): void => {
    if (out.length >= max || v === undefined) return;
    const text = Array.isArray(v) ? v.join(', ') : typeof v === 'number' ? withCommas(v) : v;
    if (text !== '') out.push([k, text]);
  };
  switch (p.type) {
    case 'repo':
    case 'template':
      put('language', str(p['language'], 40));
      put('stack', strs(p['stack'], 6));
      put('platform', str(p['platform'], 40) ?? (strs(p['platforms'], 5).join(', ') || undefined));
      put('version', str(p['version'], 30) ?? str(p['release'], 30));
      put('author', str(p['author'], 60) ?? str(p['owner'], 60));
      put('entries', num(p['entries']));
      put('nodes', num(p['nodes']));
      put('views', num(p['views']));
      put('host', str(p['host'], 30));
      break;
    case 'model':
      put('task', str(p['taskLabel'], 60) ?? str(p['task'], 60));
      put('library', str(p['library'], 40));
      put('author', str(p['author'], 60));
      put('host', str(p['host'], 30));
      break;
    case 'dataset': {
      put('task', strs(p['tasks'], 4));
      put('modalities', strs(p['modalities'], 4));
      put('size', str(p['size'], 30));
      put('rows', num(p['rows']));
      put('features', num(p['features']));
      put('formats', strs(p['formats'], 5));
      put('languages', strs(p['languages'], 5));
      put('field', str(p['field'], 60) ?? str(p['portalCategory'], 40));
      put('publisher', str(p['publisher'], 80) ?? str(p['provider'], 80));
      put('updateFrequency', str(p['updateFrequency'], 40));
      const u = num(p['usability']);
      if (u !== undefined) put('usability', String(Math.round(u * 100) / 100));
      put('author', str(p['author'], 60));
      break;
    }
    case 'skill':
      put('agent', str(p['agent'], 40) ?? (strs(p['agents'], 4).join(', ') || undefined));
      put('version', str(p['version'], 30));
      put('author', str(p['author'], 60) ?? str(p['owner'], 60));
      break;
    case 'site':
      put('sdk', str(p['sdk'], 30));
      put('status', str(p['status'], 30));
      put('models', strs(p['models'], 3));
      put('pricing', str(p['pricing'], 30));
      break;
    case 'asset': {
      put('format', str(p['format'], 30));
      const res = Array.isArray(p['maxResolution']) ? (p['maxResolution'] as unknown[]).map(num).filter((n): n is number => n !== undefined) : [];
      if (res.length === 2) put('resolution', `${res[0]}×${res[1]}`);
      const poly = num(p['polycount']);
      if (poly !== undefined) put('polycount', formatCount(poly));
      put('author', strs(p['authors'], 3));
      break;
    }
    default:
      break;
  }
  return out;
}
