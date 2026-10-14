// 디자인 > 폰트·한글 폰트 가져오기.
//   node scripts/import/design-fonts.ts                 전부
//   node scripts/import/design-fonts.ts --only=google   하나만 (google, fontsource, fontshare, korean)
// 출처: Google Fonts 메타데이터(전체, 설명·라이선스·30일 사용량), Fontsource API(Google 밖 글꼴 + 설치 명령),
// Fontshare API(전체), 공식 출처로 라이선스를 확인한 공개 한글 글꼴(design-fonts-ko.ts).
import {
  type Item, clip, fetchJson, main, makeItem, mapLimit, progress, repoMeta, slugify, stripHtml, writeCatalog,
} from './design-lib.ts';
import { KOREAN_FONTS } from './design-fonts-ko.ts';

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const want = (k: string) => !only || only.includes(k);

// ---------- Google Fonts ----------

interface GfAxis { tag: string; min: number; max: number; defaultValue: number }
interface GfFamily {
  family: string; displayName: string | null; category: string; subsets: string[];
  fonts: Record<string, unknown>; axes: GfAxis[]; designers: string[]; lastModified: string;
  dateAdded: string; popularity: number; isNoto: boolean; colorCapabilities: string[]; primaryScript: string;
  classifications: string[];
}
interface GfDetail { description?: string; license?: string; designers?: { name: string }[] }
interface GfStat { family: string; viewsByDateRange: { '30day': { views: number } } }
interface FontsourceFont {
  id: string; family: string; subsets: string[]; weights: number[]; styles: string[]; defSubset: string;
  variable: boolean; lastModified: string; category: string; license: string; type: 'google' | 'other';
}

const GF_LICENSE: Record<string, string> = { ofl: 'OFL-1.1', apache: 'Apache-2.0', apache2: 'Apache-2.0', ufl: 'UFL-1.0' };
const CATEGORY_TAG: Record<string, string> = {
  'Sans Serif': 'sans-serif', Serif: 'serif', Display: 'display', Handwriting: 'handwriting', Monospace: 'monospace',
};
const GENERIC: Record<string, string> = {
  'sans-serif': 'sans-serif', serif: 'serif', display: 'sans-serif', handwriting: 'cursive', monospace: 'monospace',
};

function gfWeights(f: GfFamily): number[] {
  return Object.keys(f.fonts).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
}

function gfCssFamily(f: GfFamily): string {
  const fam = f.family.replace(/ /g, '+');
  const wght = f.axes.find((a) => a.tag === 'wght');
  if (wght) return `${fam}:wght@${wght.min}..${wght.max}`;
  const ws = gfWeights(f);
  if (ws.length === 1 && ws[0] === 400) return fam;
  return `${fam}:wght@${ws.join(';')}`;
}

async function importGoogle(fontsource: Map<string, FontsourceFont>): Promise<void> {
  console.log('Google Fonts');
  const meta = await fetchJson<{ familyMetadataList: GfFamily[] }>('https://fonts.google.com/metadata/fonts');
  const stats = await fetchJson<GfStat[]>('https://fonts.google.com/metadata/stats');
  const views = new Map(stats.map((s) => [s.family, s.viewsByDateRange['30day'].views]));
  const families = meta.familyMetadataList;
  let done = 0;
  const details = await mapLimit(families, 8, async (f) => {
    const d = await fetchJson<GfDetail>(`https://fonts.google.com/metadata/fonts/${encodeURIComponent(f.family)}`).catch(() => ({}) as GfDetail);
    progress('설명', ++done, families.length);
    return d;
  });
  const items: Item[] = families.map((f, i) => {
    const d = details[i] ?? {};
    const slug = slugify(f.family);
    const cat = CATEGORY_TAG[f.category] ?? slugify(f.category);
    const weights = gfWeights(f);
    const korean = f.subsets.includes('korean');
    const desc = d.description ? stripHtml(d.description) : '';
    const designers = f.designers.join(', ');
    // 설명이 없는 글꼴만 출처의 사실(분류·디자이너·굵기)로 한 줄을 짓는다.
    const summary = desc || `${f.category} typeface${designers ? ` by ${designers}` : ''}. Weights ${weights.join(', ')}.`;
    const css = `https://fonts.googleapis.com/css2?family=${gfCssFamily(f)}&display=swap`;
    const fsFont = fontsource.get(slug);
    const install = fsFont ? `npm install @fontsource${fsFont.variable ? '-variable' : ''}/${slug}` : undefined;
    const subsets = f.subsets.filter((s) => s !== 'menu');
    return makeItem({
      id: `google-fonts:${slug}`,
      name: f.family,
      kind: korean ? 'fonts-ko' : 'fonts',
      summary,
      url: `https://fonts.google.com/specimen/${f.family.replace(/ /g, '+')}`,
      source: { name: 'Google Fonts', url: 'https://fonts.google.com' },
      license: d.license ? (GF_LICENSE[d.license] ?? d.license) : undefined,
      metrics: { downloads: views.get(f.family), updatedAt: f.lastModified },
      tags: [
        cat, ...subsets, ...(f.axes.length ? ['variable'] : []), ...(f.isNoto ? ['noto'] : []),
        ...(f.colorCapabilities.length ? ['color-font'] : []), ...f.classifications.map((c) => slugify(c)),
      ],
      preview: {
        type: 'font',
        family: f.family,
        cssUrl: css,
        weights,
        axes: f.axes.map((a) => ({ tag: a.tag, min: a.min, max: a.max })),
        italic: Object.keys(f.fonts).some((k) => k.endsWith('i')),
        subsets,
        generic: GENERIC[cat] ?? 'sans-serif',
        designers: f.designers,
        popularityRank: f.popularity,
        ...(korean ? { sample: 'ko' } : {}),
      },
      use: {
        install,
        snippet: `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="${css}" rel="stylesheet">\n\nfont-family: "${f.family}", ${GENERIC[cat] ?? 'sans-serif'};`,
        docs: `https://fonts.google.com/specimen/${f.family.replace(/ /g, '+')}`,
      },
    });
  });
  writeCatalog(
    {
      id: 'google-fonts',
      name: 'Google Fonts',
      url: 'https://fonts.google.com',
      license: 'Fonts: OFL-1.1 / Apache-2.0 / UFL-1.0 per family. Catalog metadata from the public metadata endpoints (fonts.google.com/metadata/fonts, /metadata/stats); descriptions © their authors, quoted.',
      note: 'metrics.downloads = Google Fonts API views in the last 30 days (fonts.google.com/metadata/stats). preview.popularityRank = Google Fonts popularity order (1 = most popular).',
    },
    items,
  );
}

// ---------- Fontsource (Google 밖 글꼴) ----------

interface FsStats { total: { npmDownloadMonthly: number } }
interface FsDetail { source?: string; version?: string }

async function importFontsource(all: FontsourceFont[], skip: Set<string>): Promise<void> {
  console.log('Fontsource (Google 밖 글꼴)');
  const others = all.filter((f) => f.type === 'other' && !skip.has(f.id));
  let done = 0;
  const rows = await mapLimit(others, 6, async (f) => {
    const [stats, detail] = await Promise.all([
      fetchJson<FsStats>(`https://api.fontsource.org/v1/stats/${f.id}`).catch(() => undefined),
      fetchJson<FsDetail>(`https://api.fontsource.org/v1/fonts/${f.id}`).catch(() => undefined),
    ]);
    const gh = detail?.source?.match(/github\.com\/([^/]+\/[^/#?]+)/)?.[1]?.replace(/\.git$/, '');
    const repo = gh ? await repoMeta(gh).catch(() => undefined) : undefined;
    progress('Fontsource', ++done, others.length);
    return { f, stats, detail, repo };
  });
  const items: Item[] = rows.map(({ f, stats, detail, repo }) => {
    const korean = f.subsets.includes('korean') || /-kr$/.test(f.id);
    const w = f.weights.includes(400) ? 400 : (f.weights[0] ?? 400);
    const summary = repo?.description
      ? repo.description
      : `${f.category} font family on Fontsource. Weights ${f.weights.join(', ')}. Subsets: ${f.subsets.slice(0, 6).join(', ')}.`;
    return makeItem({
      id: `fontsource:${f.id}`,
      name: f.family,
      kind: korean ? 'fonts-ko' : 'fonts',
      summary,
      url: `https://fontsource.org/fonts/${f.id}`,
      source: { name: 'Fontsource', url: 'https://fontsource.org' },
      license: f.license === 'mit' ? 'MIT' : f.license,
      metrics: { downloads: stats?.total.npmDownloadMonthly, stars: repo?.stars, updatedAt: f.lastModified },
      tags: [f.category, ...f.subsets.filter((s) => !/^\[\d+\]$/.test(s)), ...(f.variable ? ['variable'] : [])],
      preview: {
        type: 'font',
        family: f.family,
        fileUrl: `https://cdn.jsdelivr.net/fontsource/fonts/${f.id}@latest/${f.defSubset}-${w}-normal.woff2`,
        weights: f.weights,
        italic: f.styles.includes('italic'),
        subsets: f.subsets,
        generic: GENERIC[f.category] ?? 'sans-serif',
        ...(korean ? { sample: 'ko' } : {}),
      },
      use: {
        install: `npm install @fontsource/${f.id}`,
        snippet: `import '@fontsource/${f.id}';\n\nfont-family: '${f.family}', ${GENERIC[f.category] ?? 'sans-serif'};`,
        docs: detail?.source ?? `https://fontsource.org/fonts/${f.id}/install`,
      },
    });
  });
  writeCatalog(
    {
      id: 'fontsource',
      name: 'Fontsource',
      url: 'https://fontsource.org',
      license: 'Fontsource catalog (MIT); each font keeps its own license (field license). Google-hosted families are listed under google-fonts and only lend their npm install command.',
      note: 'metrics.downloads = npm downloads in the last month (api.fontsource.org/v1/stats). Summaries come from the font\'s source repository description when available.',
    },
    items,
  );
}

// ---------- Fontshare ----------

interface FontshareFont {
  name: string; slug: string; category: string; story: string | null; views: number; license_type: string;
  publisher: { name: string }; designers: { name: string }[]; font_tags: { name: string }[]; inserted_at: string;
  styles: { weight: { number: number }; is_italic: boolean; is_variable: boolean }[]; script: string;
}

async function importFontshare(): Promise<void> {
  console.log('Fontshare');
  const fonts: FontshareFont[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await fetchJson<{ fonts: FontshareFont[]; has_more: boolean }>(`https://api.fontshare.com/v2/fonts?offset=${offset}&limit=100`);
    fonts.push(...page.fonts);
    if (!page.has_more || page.fonts.length === 0) break;
  }
  const LICENSE: Record<string, string> = { itf_ffl: 'ITF Free Font License', sil_ofl: 'OFL-1.1' };
  const items = fonts.map((f) => {
    const weights = [...new Set(f.styles.filter((s) => !s.is_variable && !s.is_italic).map((s) => s.weight.number))].sort((a, b) => a - b);
    const cssWeights = weights.length ? weights.join(',') : '400';
    const css = `https://api.fontshare.com/v2/css?f[]=${f.slug}@${cssWeights}&display=swap`;
    const designers = f.designers.map((d) => d.name).join(', ');
    const story = f.story ? stripHtml(f.story) : '';
    const generic = /serif/i.test(f.category) && !/sans/i.test(f.category) ? 'serif' : 'sans-serif';
    return makeItem({
      id: `fontshare:${f.slug}`,
      name: f.name,
      kind: 'fonts',
      summary: story || `${f.category} typeface by ${designers || f.publisher.name} (Fontshare).`,
      url: `https://www.fontshare.com/fonts/${f.slug}`,
      source: { name: 'Fontshare', url: 'https://www.fontshare.com' },
      license: LICENSE[f.license_type] ?? f.license_type,
      metrics: { downloads: undefined, updatedAt: f.inserted_at.slice(0, 10) },
      tags: [slugify(f.category), f.script, ...f.font_tags.map((t) => slugify(t.name)), ...(f.styles.some((s) => s.is_variable) ? ['variable'] : [])],
      preview: { type: 'font', family: f.name, cssUrl: css, weights, italic: f.styles.some((s) => s.is_italic), generic, designers: f.designers.map((d) => d.name), views: f.views },
      use: {
        snippet: `<link href="${css}" rel="stylesheet">\n\nfont-family: '${f.name}', ${generic};`,
        docs: `https://www.fontshare.com/fonts/${f.slug}`,
      },
    });
  });
  writeCatalog(
    {
      id: 'fontshare',
      name: 'Fontshare (Indian Type Foundry)',
      url: 'https://www.fontshare.com',
      license: 'Fonts free for personal and commercial use under the ITF Free Font License (some OFL). Metadata from the public api.fontshare.com/v2/fonts endpoint.',
      note: 'preview.views = Fontshare page views (all time), not downloads.',
    },
    items,
  );
}

// ---------- 공개 한글 글꼴 (손으로 확인) ----------

async function importKorean(): Promise<void> {
  console.log('공개 한글 글꼴');
  const items = await mapLimit(KOREAN_FONTS, 4, async (k) => {
    const repo = k.repo ? await repoMeta(k.repo).catch(() => undefined) : undefined;
    return makeItem({
      id: `korean-fonts:${k.slug}`,
      name: k.name,
      kind: 'fonts-ko',
      summary: clip(k.summary),
      summaryKo: k.summaryKo,
      ...(k.written ? { written: 'codeshopper' as const } : {}),
      url: k.url,
      source: { name: k.sourceName, url: k.sourceUrl },
      license: k.license,
      metrics: repo ? { stars: repo.stars, updatedAt: repo.pushedAt } : undefined,
      tags: ['korean', ...k.tags],
      preview: {
        type: 'font', family: k.family, ...(k.cssUrl ? { cssUrl: k.cssUrl } : {}), ...(k.fileUrl ? { fileUrl: k.fileUrl } : {}),
        weights: k.weights, generic: k.generic, sample: 'ko', licenseUrl: k.licenseUrl,
      },
      use: { install: k.install, snippet: k.snippet, docs: k.docs ?? k.url },
    });
  });
  writeCatalog(
    {
      id: 'korean-fonts',
      name: '공개 한글 글꼴 (공식 출처 확인)',
      url: 'https://github.com/yoorrard/code-chauffeur',
      license: 'Hand-picked list; each font license was read on the official source (licenseUrl in preview). Google Fonts Korean families are in google-fonts (kind fonts-ko).',
      note: 'summary = official source wording; summaryKo written by 코드쇼퍼 where marked written:codeshopper.',
    },
    items,
  );
}

await main('design-fonts', async () => {
  const fontsource = await fetchJson<FontsourceFont[]>('https://api.fontsource.org/v1/fonts');
  const fsMap = new Map(fontsource.map((f) => [f.id, f]));
  // 손으로 고른 한글 글꼴과 같은 것은 Fontsource 쪽에서 뺀다 (예: Fontsource의 pretendard는 라틴 글자만 있다).
  const skip = new Set(KOREAN_FONTS.flatMap((k) => k.fontsourceDuplicate ?? []));
  if (want('google')) await importGoogle(fsMap);
  if (want('fontsource')) await importFontsource(fontsource, skip);
  if (want('fontshare')) await importFontshare();
  if (want('korean')) await importKorean();
});
