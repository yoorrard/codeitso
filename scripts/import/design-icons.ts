// 디자인 > 아이콘 묶음·브랜드 로고 가져오기.
//   node scripts/import/design-icons.ts                 전부
//   node scripts/import/design-icons.ts --only=iconify  하나만 (iconify, svgl, extra)
// 출처: Iconify API(모든 공개 묶음 + 묶음마다 대표 아이콘 8개의 SVG 본문), npm 내려받기 수(@iconify-json/*),
// svgl API(브랜드 로고 전체), Iconify 밖 아이콘 묶음(손으로 고름, design-icons-extra 부분).
import {
  type Item, CURATED_AT, fetchJson, fetchRaw, main, makeItem, mapLimit, npmMonthlyDownloads, progress, repoMeta, siteMeta, siteSummary, slugify, writeCatalog,
} from './design-lib.ts';
import { cruxList, npmDownloads, siteRankNote, withSiteRank } from './signals.ts';

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const want = (k: string) => !only || only.includes(k);

interface IconifyInfo {
  name: string; total: number; version?: string; author: { name: string; url?: string };
  license: { title: string; spdx?: string; url?: string }; samples?: string[]; height?: number | number[];
  displayHeight?: number; category?: string; tags?: string[]; palette?: boolean; hidden?: boolean;
}
interface IconifyCollection { uncategorized?: string[]; categories?: Record<string, string[]>; hidden?: string[] }
interface IconifyIcons {
  width?: number; height?: number;
  icons: Record<string, { body: string; width?: number; height?: number; left?: number; top?: number }>;
  aliases?: Record<string, { parent: string }>;
}

// Iconify 공개 API는 서버 여러 대가 나눠 받는데, 일부가 한 시간짜리 429를 준다.
// 한 시간을 기다리지 않고 잠깐 쉬었다가 다른 서버에 걸리기를 바라며 다시 묻는다.
async function iconifyJson<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const res = await fetchRaw(`https://api.iconify.design${path}`, { allowStatus: [429, 404], retries: 3 });
    if (res.status === 200) return (await res.json()) as T;
    await res.body?.cancel();
    if (res.status === 404) throw new Error(`404 ${path}`);
    await new Promise((r) => setTimeout(r, 1500 + attempt * 1000));
  }
  throw new Error(`Iconify API가 계속 429: ${path}`);
}

// 인기 신호 (D133): 아이콘 묶음을 앱에서 쓰는 사람은 보통 Iconify 꾸러미가 아니라 그 묶음의 공식 npm 꾸러미를 깐다.
// 공식 꾸러미가 있는 묶음은 그 꾸러미의 지난 한 달 내려받기를 쓰고(preview.downloadsOf), 없으면 @iconify-json/<prefix>.
// 꾸러미 이름만 손으로 적는다. 숫자는 npm이 준 값 그대로이고, 꾸러미가 없으면(404) Iconify 꾸러미로 돌아간다.
export const OFFICIAL_ICON_PACKAGES: Record<string, string> = {
  lucide: 'lucide-react', heroicons: '@heroicons/react', tabler: '@tabler/icons-react', mdi: '@mdi/js', ph: '@phosphor-icons/react',
  bi: 'bootstrap-icons', ri: 'remixicon', 'simple-icons': 'simple-icons', carbon: '@carbon/icons-react', ion: 'ionicons',
  octicon: '@primer/octicons-react', 'radix-icons': '@radix-ui/react-icons', iconoir: 'iconoir-react', fluent: '@fluentui/react-icons',
  'ant-design': '@ant-design/icons', 'fa7-solid': '@fortawesome/free-solid-svg-icons', 'fa7-regular': '@fortawesome/free-regular-svg-icons',
  'fa7-brands': '@fortawesome/free-brands-svg-icons', boxicons: 'boxicons', devicon: 'devicon', codicon: '@vscode/codicons', eva: 'eva-icons',
  gg: 'css.gg', 'grommet-icons': 'grommet-icons', pixelarticons: 'pixelarticons', hugeicons: '@hugeicons/react', uil: '@iconscout/react-unicons',
};

const SAMPLE_COUNT = 8;
const MAX_BODY = 6000; // 미리 보기 자료가 너무 커지지 않게 긴 본문은 건너뛴다

async function importIconify(): Promise<void> {
  console.log('Iconify');
  const all = await iconifyJson<Record<string, IconifyInfo>>('/collections?hidden=true');
  const prefixes = Object.keys(all).sort();
  const hidden = prefixes.filter((p) => all[p]?.hidden);
  const visible = prefixes.filter((p) => !all[p]?.hidden);
  console.log(`  묶음 ${prefixes.length}개 (숨김 ${hidden.length}개는 뺀다: Iconify가 목록에서 감춘 옛 묶음)`);
  const official = await npmDownloads(Object.values(OFFICIAL_ICON_PACKAGES), 'last-month');
  let done = 0;
  const rows = await mapLimit(visible, 3, async (prefix) => {
    const info = all[prefix] as IconifyInfo;
    const coll = await iconifyJson<IconifyCollection>(`/collection?prefix=${prefix}`).catch(() => ({}) as IconifyCollection);
    const pool = [
      ...(info.samples ?? []),
      ...(coll.uncategorized ?? []),
      ...Object.values(coll.categories ?? {}).flat(),
    ];
    const hiddenSet = new Set(coll.hidden ?? []);
    const names = [...new Set(pool)].filter((n) => !hiddenSet.has(n)).slice(0, 40);
    const data = names.length
      ? await iconifyJson<IconifyIcons>(`/${prefix}.json?icons=${names.join(',')}`).catch(() => undefined)
      : undefined;
    const picked: { name: string; body: string; width?: number; height?: number }[] = [];
    for (const n of names) {
      if (picked.length >= SAMPLE_COUNT) break;
      const ic = data?.icons[n];
      if (!ic || ic.body.length > MAX_BODY) continue;
      picked.push({
        name: n,
        body: ic.body,
        ...(ic.width && ic.width !== data?.width ? { width: ic.width } : {}),
        ...(ic.height && ic.height !== data?.height ? { height: ic.height } : {}),
      });
    }
    const gh = info.author.url?.match(/github\.com\/([^/]+\/[^/#?]+)/)?.[1];
    const [iconifyDownloads, repo] = await Promise.all([
      npmMonthlyDownloads(`@iconify-json/${prefix}`),
      gh ? repoMeta(gh).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    const pkg = OFFICIAL_ICON_PACKAGES[prefix];
    const officialDownloads = pkg ? official.get(pkg) : undefined;
    const downloads = officialDownloads ?? iconifyDownloads;
    const downloadsOf = officialDownloads !== undefined ? `npm:${pkg}` : iconifyDownloads !== undefined ? `npm:@iconify-json/${prefix}` : undefined;
    if (picked.length < SAMPLE_COUNT) console.log(`  · ${prefix}: 대표 아이콘 ${picked.length}개`);
    progress('묶음', ++done, visible.length);
    return { prefix, info, picked, width: data?.width ?? 16, height: data?.height ?? 16, downloads, downloadsOf, repo };
  });

  const items: Item[] = rows.map(({ prefix, info, picked, width, height, downloads, downloadsOf, repo }) => {
    const cat = info.category ?? 'Other';
    const archived = cat.startsWith('Archive');
    const firstSample = picked[0]?.name ?? info.samples?.[0] ?? 'icon';
    return makeItem({
      id: `iconify:${prefix}`,
      name: info.name,
      kind: 'icons',
      summary: `${info.name}: ${info.total.toLocaleString('en-US')} icons by ${info.author.name}. License: ${info.license.title}. Iconify category: ${cat}${info.tags?.length ? ` (${info.tags.join(', ')})` : ''}.`,
      url: `https://icon-sets.iconify.design/${prefix}/`,
      source: { name: 'Iconify', url: 'https://iconify.design' },
      license: info.license.spdx ?? info.license.title,
      metrics: { downloads, stars: repo?.stars, updatedAt: repo?.pushedAt },
      tags: [
        slugify(cat), ...(info.tags ?? []).map(slugify), ...(info.palette ? ['multicolor'] : ['monotone']),
        ...(archived ? ['archived'] : []),
      ],
      preview: {
        type: 'icons',
        prefix,
        total: info.total,
        author: info.author.name,
        ...(info.author.url ? { authorUrl: info.author.url } : {}),
        ...(info.license.url ? { licenseUrl: info.license.url } : {}),
        palette: info.palette ?? false,
        width,
        height,
        icons: picked,
        ...(downloadsOf ? { downloadsOf } : {}),
      },
      use: {
        install: `npm install -D @iconify-json/${prefix}`,
        snippet: `<script src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>\n<iconify-icon icon="${prefix}:${firstSample}"></iconify-icon>`,
        docs: `https://icon-sets.iconify.design/${prefix}/`,
      },
    });
  });
  writeCatalog(
    {
      id: 'iconify',
      name: 'Iconify',
      url: 'https://iconify.design',
      license: 'Collection metadata from the public Iconify API (api.iconify.design). Each icon set keeps its own license (field license, preview.licenseUrl); the 8 sample SVG bodies per set are redistributed under that set\'s license with its author credited.',
      note: `metrics.downloads = npm downloads last month of the set's official package when it has one (preview.downloadsOf, e.g. npm:lucide-react), otherwise of @iconify-json/<prefix>; metrics.stars = stars of the set's source repository (GitHub, via repos.ecosyste.ms when no GitHub token). ${hidden.length} hidden legacy sets skipped: ${hidden.join(', ')}.`,
    },
    items,
  );
}

// ---------- svgl (브랜드 로고) ----------

interface SvglLogo {
  id: number; title: string; category: string | string[]; route: string | { light: string; dark: string };
  wordmark?: string | { light: string; dark: string }; url: string; brandUrl?: string;
}

async function importSvgl(): Promise<void> {
  console.log('svgl');
  const logos = await fetchJson<SvglLogo[]>('https://api.svgl.app');
  const crux = await cruxList();
  const used = new Map<string, number>();
  const items = logos.map((l) => {
    let slug = slugify(l.title) || `logo-${l.id}`;
    const n = (used.get(slug) ?? 0) + 1;
    used.set(slug, n);
    if (n > 1) slug = `${slug}-${n}`;
    const cats = Array.isArray(l.category) ? l.category : [l.category];
    const route = typeof l.route === 'string' ? { light: l.route, dark: l.route } : l.route;
    const wordmark = l.wordmark ? (typeof l.wordmark === 'string' ? { light: l.wordmark, dark: l.wordmark } : l.wordmark) : undefined;
    return withSiteRank(makeItem({
      id: `svgl:${slug}`,
      name: l.title,
      kind: 'logos',
      summary: `${l.title} logo (SVG) from svgl. Category: ${cats.join(', ')}.${l.brandUrl ? ` Brand guidelines: ${l.brandUrl}` : ''}`,
      url: l.url,
      source: { name: 'svgl', url: 'https://svgl.app' },
      tags: cats.map(slugify),
      preview: {
        type: 'icons',
        images: { light: route.light, dark: route.dark },
        ...(wordmark ? { wordmark } : {}),
        ...(l.brandUrl ? { brandUrl: l.brandUrl } : {}),
      },
      use: { snippet: `<img src="${route.light}" alt="${l.title}" width="32" height="32">`, docs: l.brandUrl ?? 'https://svgl.app' },
    }), crux);
  });
  writeCatalog(
    {
      id: 'svgl',
      name: 'svgl',
      url: 'https://svgl.app',
      license: 'Listing from the public svgl API (api.svgl.app, repository MIT). Logos are trademarks of their owners: follow each brand\'s guidelines (preview.brandUrl).',
      note: siteRankNote(),
    },
    items,
  );
}

// ---------- Iconify 밖 아이콘 묶음 (손으로 고름) ----------

interface ExtraIcons {
  slug: string; name: string; summaryKo: string; url: string; license: string; tags: string[];
  repo?: string; install?: string; docs?: string;
}

// summary는 돌릴 때 각 사이트의 meta description 원문을 가져온다. summaryKo는 코드잇소가 쓴 한 줄.
const EXTRA: ExtraIcons[] = [
  { slug: 'lordicon', name: 'Lordicon', summaryKo: '움직이는 아이콘 묶음. 무료 아이콘은 출처를 밝히면 쓸 수 있다(유료 요금제 따로).', url: 'https://lordicon.com', license: 'Lordicon Free License (attribution required) / paid plans', tags: ['animated', 'lottie', 'freemium'], docs: 'https://lordicon.com/licenses' },
  { slug: 'useanimations', name: 'useAnimations', summaryKo: '리액트에서 바로 쓰는 작은 움직이는 아이콘 묶음.', url: 'https://react.useanimations.com', license: 'MIT', tags: ['animated', 'react', 'lottie'], repo: 'useAnimations/react-useanimations', install: 'npm install react-useanimations' },
  { slug: 'lucide-animated', name: 'lucide-animated', summaryKo: 'Lucide 아이콘에 움직임을 넣은 리액트 아이콘 묶음(shadcn 방식으로 복사해 쓴다).', url: 'https://lucide-animated.com', license: 'MIT', tags: ['animated', 'react', 'shadcn', 'lucide'], repo: 'pqoqubbw/icons' },
  { slug: 'noun-project', name: 'The Noun Project', summaryKo: '수백만 개 아이콘 장터. 무료로 쓰려면 출처를 밝혀야 한다(CC BY), 유료 이용권 따로.', url: 'https://thenounproject.com', license: 'CC BY 3.0 (free with attribution) / royalty-free paid', tags: ['marketplace', 'freemium'] },
  { slug: 'flaticon-uicons', name: 'Flaticon Uicons', summaryKo: 'Flaticon이 내는 UI 아이콘 글꼴. 무료로 쓰려면 출처 표기가 필요하다.', url: 'https://www.flaticon.com/uicons', license: 'Flaticon license (free with attribution) / Premium', tags: ['icon-font', 'freemium'], install: 'npm install @flaticon/flaticon-uicons' },
  { slug: 'streamline', name: 'Streamline', summaryKo: '스타일을 맞춘 아이콘·일러스트 대형 묶음. 일부 무료(출처 표기), 대부분 유료.', url: 'https://www.streamlinehq.com', license: 'Free (attribution) / paid', tags: ['marketplace', 'freemium', 'illustrations'] },
  { slug: 'icons8', name: 'Icons8', summaryKo: '같은 화풍의 아이콘·일러스트를 내는 곳. 무료는 링크로 출처를 밝혀야 한다.', url: 'https://icons8.com', license: 'Free with link attribution / paid', tags: ['marketplace', 'freemium'] },
  { slug: 'iconscout', name: 'IconScout', summaryKo: '아이콘·일러스트·3D·로티 장터. 무료 자료는 이용 조건을 각각 확인한다.', url: 'https://iconscout.com', license: 'IconScout Simple License (free items) / paid', tags: ['marketplace', 'freemium', 'lottie', '3d'] },
  { slug: 'svgrepo', name: 'SVG Repo', summaryKo: '오픈 라이선스 SVG 아이콘 50만 개 이상을 모은 검색 사이트. 아이콘마다 라이선스가 다르다.', url: 'https://www.svgrepo.com', license: 'Per icon (open licenses, shown on each page)', tags: ['search', 'svg'] },
  { slug: 'react-icons', name: 'react-icons', summaryKo: '유명 아이콘 묶음을 리액트 컴포넌트 하나로 모아 쓰는 꾸러미.', url: 'https://react-icons.github.io/react-icons/', license: 'MIT (each pack keeps its license)', tags: ['react', 'library'], repo: 'react-icons/react-icons', install: 'npm install react-icons' },
  { slug: 'unplugin-icons', name: 'unplugin-icons', summaryKo: 'Iconify 아이콘을 쓰는 만큼만 컴포넌트로 불러오는 빌드 도구 플러그인(Vite·Next 등).', url: 'https://github.com/unplugin/unplugin-icons', license: 'MIT', tags: ['vite', 'build-tool', 'iconify'], repo: 'unplugin/unplugin-icons', install: 'npm install -D unplugin-icons' },
  { slug: 'icones', name: 'Icônes', summaryKo: 'Iconify의 모든 아이콘을 빠르게 찾아 SVG·컴포넌트 코드로 복사하는 사이트.', url: 'https://icones.js.org', license: 'MIT (site); icons keep their set licenses', tags: ['search', 'iconify', 'tool'], repo: 'antfu-collective/icones' },
];

const installPkg = (install: string | undefined): string | undefined => /^npm install (?:-D )?(\S+)$/.exec(install ?? '')?.[1];

async function importExtra(): Promise<void> {
  console.log('Iconify 밖 아이콘');
  const crux = await cruxList();
  const pkgDownloads = await npmDownloads(EXTRA.map((e) => installPkg(e.install)).filter((x): x is string => Boolean(x)), 'last-month');
  const items = await mapLimit(EXTRA, 4, async (e) => {
    const [repo, meta] = await Promise.all([
      e.repo ? repoMeta(e.repo).catch(() => undefined) : Promise.resolve(undefined),
      siteMeta(e.url),
    ]);
    if (!meta.ok) console.log(`  ! 주소 확인 실패 ${meta.status} ${e.url}`);
    const pkg = installPkg(e.install);
    const downloads = pkg ? pkgDownloads.get(pkg) : undefined;
    return withSiteRank(makeItem({
      id: `icons-extra:${e.slug}`,
      name: e.name,
      kind: 'icons',
      summary: repo?.description || siteSummary(e.name, e.url, meta),
      summaryKo: e.summaryKo,
      written: 'codeshopper',
      url: e.url,
      source: { name: e.name, url: e.url },
      license: e.license,
      metrics: repo || downloads !== undefined ? { stars: repo?.stars, downloads, updatedAt: repo?.pushedAt } : undefined,
      tags: e.tags,
      preview: { type: 'site', url: e.url, ...(downloads !== undefined && pkg ? { downloadsOf: `npm:${pkg}` } : {}) },
      use: { install: e.install, docs: e.docs ?? e.url },
      fetchedAt: CURATED_AT,
    }), crux);
  });
  writeCatalog(
    {
      id: 'icons-extra',
      name: 'Icon sources outside Iconify (hand-picked)',
      url: 'https://github.com/yoorrard/code-chauffeur',
      license: 'Hand-written listing of public sites (names, links, the site\'s own one-line description). Licenses summarised from each site\'s license page; check the page before use.',
      note: `metrics.downloads = npm downloads last month of the install package (preview.downloadsOf); metrics.stars = repository stars. ${siteRankNote()}`,
    },
    items,
  );
}

await main('design-icons', async () => {
  if (want('iconify')) await importIconify();
  if (want('svgl')) await importSvgl();
  if (want('extra')) await importExtra();
});
