// 디자인 > 3D·재질·HDRI·게임 에셋 하나하나 가져오기 (모두 CC0).
//   node scripts/import/design-assets.ts                 전부
//   node scripts/import/design-assets.ts --only=polyhaven  하나만 (polyhaven, ambientcg, kenney)
// Poly Haven 공개 API(이용 조건: 고유 User-Agent, 화면에 Poly Haven 이름 밝히기), ambientCG 공개 API v2(끝까지 쪽 넘김),
// Kenney 에셋 쪽(목록 쪽을 끝까지 넘기고 꾸러미 쪽의 og 정보를 읽는다).
import {
  type Item, clip, decodeEntities, fetchJson, fetchText, main, makeItem, mapLimit, progress, slugify, writeCatalog,
} from './design-lib.ts';

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const want = (k: string) => !only || only.includes(k);

// ---------- Poly Haven ----------

interface PolyHavenAsset {
  name: string; type: number; categories: string[]; tags: string[]; authors: Record<string, string>; description?: string;
  date_published: number; download_count: number; thumbnail_url?: string; max_resolution?: number[]; polycount?: number;
}

const PH_TYPES: Record<number, { tag: string; label: string }> = { 0: { tag: 'hdri', label: 'HDRI' }, 1: { tag: 'texture', label: 'texture' }, 2: { tag: 'model', label: '3D model' } };

async function importPolyHaven(): Promise<void> {
  console.log('Poly Haven');
  const all = await fetchJson<Record<string, PolyHavenAsset>>('https://api.polyhaven.com/assets');
  const items: Item[] = Object.entries(all).map(([id, a]) => {
    const t = PH_TYPES[a.type] ?? { tag: 'asset', label: 'asset' };
    const authors = Object.keys(a.authors).join(', ');
    return makeItem({
      id: `polyhaven:${id.toLowerCase()}`,
      name: a.name,
      kind: '3d',
      summary: a.description?.trim() || `${a.name}: free CC0 ${t.label} by ${authors} on Poly Haven.`,
      url: `https://polyhaven.com/a/${id}`,
      source: { name: 'Poly Haven', url: 'https://polyhaven.com' },
      license: 'CC0-1.0',
      metrics: { downloads: a.download_count, updatedAt: new Date(a.date_published * 1000).toISOString().slice(0, 10) },
      tags: [t.tag, ...a.categories.map(slugify), ...a.tags.slice(0, 10).map(slugify)],
      preview: {
        type: 'asset', format: t.tag, ...(a.thumbnail_url ? { image: a.thumbnail_url } : {}), authors: Object.keys(a.authors),
        ...(a.max_resolution ? { maxResolution: a.max_resolution } : {}), ...(a.polycount ? { polycount: a.polycount } : {}),
      },
      use: { docs: `https://polyhaven.com/a/${id}` },
    });
  });
  writeCatalog(
    {
      id: 'polyhaven',
      name: 'Poly Haven (HDRIs, textures, 3D models)',
      url: 'https://polyhaven.com',
      license: 'All assets CC0. Listing from the public Poly Haven API (api.polyhaven.com, free for any use; requires a unique User-Agent and naming Poly Haven where the data is shown — keep the source badge).',
      note: 'metrics.downloads = all-time download count reported by the API.',
    },
    items,
  );
}

// ---------- ambientCG ----------

interface AcgAsset {
  assetId: string; displayName: string; description?: string; releaseDate: string; dataTypeName: string; dataTypeDescription?: string;
  displayCategory?: string; downloadCount?: number; tags?: string[]; shortLink?: string; previewImage?: Record<string, string>;
}

async function importAmbientCg(): Promise<void> {
  console.log('ambientCG');
  const assets: AcgAsset[] = [];
  let url: string | null = 'https://ambientcg.com/api/v2/full_json?type=Material,Atlas,Decal,HDRI,3DModel,Terrain,Brush,Substance,PlainTexture&sort=popular&limit=250&offset=0&include=imageData,tagData,displayData,statisticsData';
  let total = 0;
  while (url) {
    const page: { foundAssets: AcgAsset[]; numberOfResults: number; nextPageHttp?: string | null } = await fetchJson(url);
    total = page.numberOfResults;
    assets.push(...page.foundAssets);
    progress('ambientCG', assets.length, total);
    if (!page.foundAssets.length || assets.length >= total) break;
    // API가 돌려주는 다음 쪽 주소는 include를 바꾸므로 offset만 올려 같은 조건으로 묻는다.
    url = url.replace(/offset=\d+/, `offset=${assets.length}`);
  }
  const items: Item[] = assets.map((a) =>
    makeItem({
      id: `ambientcg:${a.assetId.toLowerCase()}`,
      name: a.displayName,
      kind: '3d',
      summary: a.description?.trim() || `${a.displayName}: ${a.dataTypeName}${a.dataTypeDescription ? ` — ${a.dataTypeDescription}` : ''} (ambientCG, CC0).`,
      url: a.shortLink ?? `https://ambientcg.com/view?id=${a.assetId}`,
      source: { name: 'ambientCG', url: 'https://ambientcg.com' },
      license: 'CC0-1.0',
      metrics: { downloads: a.downloadCount, updatedAt: a.releaseDate?.slice(0, 10) },
      tags: [slugify(a.dataTypeName), ...(a.displayCategory ? [slugify(a.displayCategory)] : []), ...(a.tags ?? []).slice(0, 10).map(slugify)],
      preview: { type: 'asset', format: slugify(a.dataTypeName), ...(a.previewImage?.['256-PNG'] ? { image: a.previewImage['256-PNG'] } : {}) },
      use: { docs: a.shortLink ?? 'https://ambientcg.com' },
    }),
  );
  writeCatalog(
    {
      id: 'ambientcg',
      name: 'ambientCG (PBR materials, HDRIs, 3D models)',
      url: 'https://ambientcg.com',
      license: 'All assets CC0 1.0 (ambientcg.com/license). Listing from the public ambientCG API v2, paginated to the end.',
      note: `numberOfResults reported by the API: ${total}. metrics.downloads = downloadCount from the API.`,
    },
    items,
  );
}

// ---------- Kenney ----------

async function importKenney(): Promise<void> {
  console.log('Kenney');
  const slugs = new Set<string>();
  for (let page = 1; page < 100; page++) {
    const html = await fetchText(page === 1 ? 'https://kenney.nl/assets' : `https://kenney.nl/assets/page:${page}`).catch(() => '');
    const found = [...html.matchAll(/href='https:\/\/kenney\.nl\/assets\/([a-z0-9-]+)'/g)].map((m) => m[1] as string);
    const before = slugs.size;
    for (const s of found) slugs.add(s);
    if (!found.length || slugs.size === before) break;
  }
  const list = [...slugs].sort();
  let done = 0;
  const rows = await mapLimit(list, 3, async (slug) => {
    const html = await fetchText(`https://kenney.nl/assets/${slug}`).catch(() => '');
    progress('꾸러미', ++done, list.length);
    const meta = (p: string) => html.match(new RegExp(`<meta[^>]+property=['"]${p}['"][^>]*content=['"]([^'"]*)['"]`, 'i'))?.[1];
    const rawTitle = html.match(/<title>([^<]*)<\/title>/i)?.[1];
    const title = rawTitle ? decodeEntities(rawTitle).replace(/\s*·.*$/, '').trim() : undefined;
    const cats = [...html.matchAll(/assets\/category:([A-Za-z0-9]+)/g)].map((m) => (m[1] as string).toLowerCase());
    return { slug, title, desc: meta('og:description'), image: meta('og:image'), cats: [...new Set(cats)] };
  });
  const items: Item[] = rows
    .filter((r) => r.title && r.title !== 'Error')
    .map((r) =>
      makeItem({
        id: `kenney:${r.slug}`,
        name: r.title as string,
        kind: 'game-assets',
        summary: clip(`${r.title}: ${decodeEntities(r.desc ?? 'Free game asset pack, CC0 licensed.')}`),
        url: `https://kenney.nl/assets/${r.slug}`,
        source: { name: 'Kenney', url: 'https://kenney.nl' },
        license: 'CC0-1.0',
        tags: ['game', ...r.cats],
        preview: { type: 'asset', format: 'pack', ...(r.image ? { image: r.image } : {}) },
        use: { docs: `https://kenney.nl/assets/${r.slug}` },
      }),
    );
  writeCatalog(
    {
      id: 'kenney',
      name: 'Kenney game asset packs',
      url: 'https://kenney.nl/assets',
      license: 'All Kenney asset packs are public domain (CC0) per kenney.nl/support. Listing read from the public asset pages (title, og:description, og:image).',
    },
    items,
  );
}

await main('design-assets', async () => {
  if (want('polyhaven')) await importPolyHaven();
  if (want('ambientcg')) await importAmbientCg();
  if (want('kenney')) await importKenney();
});
