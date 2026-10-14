// 디자인 > 손으로 고른 사이트(레퍼런스·도구·일러스트·사진·3D·움직임·목업·소리·UI 조각 사이트) 확인하고 쓰기.
//   node scripts/import/design-curated.ts
// 목록은 design-curated-data.ts. 돌릴 때마다 주소가 살아 있는지 보고, 사이트가 스스로 쓴 설명(meta description)을 summary로 가져온다.
import { type Item, main, makeItem, mapLimit, progress, siteMeta, siteSummary, writeCatalog } from './design-lib.ts';
import { CURATED, type CuratedKind } from './design-curated-data.ts';

const FILES: { id: string; name: string; kinds: CuratedKind[] }[] = [
  { id: 'references', name: 'UI/UX reference sites (hand-picked)', kinds: ['references'] },
  { id: 'design-tools', name: 'Design tools and generators (hand-picked)', kinds: ['design-tools'] },
  { id: 'ui-block-sites', name: 'Copy-paste UI block sites (hand-picked)', kinds: ['ui-blocks'] },
  { id: 'asset-sources', name: 'Illustration, photo, 3D, motion, mockup and sound sources (hand-picked)', kinds: ['illustrations', 'photos', '3d', 'motion', 'mockups', 'sounds'] },
];

await main('design-curated', async () => {
  let done = 0;
  const failed: string[] = [];
  const rows = await mapLimit(CURATED, 6, async (c) => {
    const [meta, lic] = await Promise.all([siteMeta(c.url), c.licenseUrl ? siteMeta(c.licenseUrl) : Promise.resolve(undefined)]);
    if (!meta.ok) failed.push(`${meta.status} ${c.url}`);
    if (lic && !lic.ok) failed.push(`${lic.status} ${c.licenseUrl} (license page)`);
    progress('사이트', ++done, CURATED.length);
    return { c, meta, lic };
  });
  for (const f of FILES) {
    const items: Item[] = rows
      .filter(({ c }) => f.kinds.includes(c.kind))
      .map(({ c, meta, lic }) =>
        makeItem({
          id: `curated:${c.slug}`,
          name: c.name,
          kind: c.kind,
          summary: siteSummary(c.name, c.url, meta),
          summaryKo: c.summaryKo,
          written: 'codeshopper',
          url: c.url,
          source: { name: c.name, url: c.url },
          license: c.license,
          tags: [...c.tags, ...(c.pricing ? [c.pricing] : []), ...(meta.ok ? [] : ['link-check-failed'])],
          preview: {
            type: 'site',
            url: c.url,
            linkStatus: meta.status,
            ...(c.pricing ? { pricing: c.pricing } : {}),
            ...(c.licenseUrl && (!lic || lic.ok) ? { licenseUrl: c.licenseUrl } : {}),
          },
          use: { docs: c.licenseUrl && (!lic || lic.ok) ? c.licenseUrl : c.url },
        }),
      );
    writeCatalog(
      {
        id: f.id,
        name: f.name,
        url: 'https://github.com/yoorrard/code-chauffeur',
        license: 'Hand-written list of public sites (name, link, Korean one-liner by 코드쇼퍼). summary = the site\'s own meta description fetched on the date above. license is filled only where the site\'s license page was read; otherwise follow preview.licenseUrl.',
        note: 'Sites behind bot protection answer 403/429/503 to scripts; they are kept (linkStatus shows the code). Tag link-check-failed marks links that did not answer at all.',
      },
      items,
    );
  }
  if (failed.length) console.log(`  ! 확인 실패 ${failed.length}개:\n    ${failed.join('\n    ')}`);
});
