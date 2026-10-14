// 디자인 > 그라디언트·배경 패턴 가져오기.
//   node scripts/import/design-gradients.ts
// 출처: uiGradients(MIT), WebGradients(MIT), Hero Patterns(CC BY 4.0, hero-patterns npm 꾸러미의 SVG),
// Pattern Monster(MIT, 저장소의 패턴 자료).
import {
  type Item, fetchJson, fetchText, main, makeItem, npmFile, npmLatest, siteMeta, siteSummary, slugify, writeCatalog,
} from './design-lib.ts';

const hex = (c: string) => c.toLowerCase();

function uniqueSlug(used: Map<string, number>, base: string): string {
  const n = (used.get(base) ?? 0) + 1;
  used.set(base, n);
  return n > 1 ? `${base}-${n}` : base;
}

async function importUiGradients(): Promise<void> {
  console.log('uiGradients');
  const list = await fetchJson<{ name: string; colors: string[] }[]>('https://raw.githubusercontent.com/Ghosh/uiGradients/master/gradients.json');
  const meta = await siteMeta('https://uigradients.com');
  const used = new Map<string, number>();
  const items: Item[] = list.map((g) => {
    const slug = uniqueSlug(used, slugify(g.name) || 'gradient');
    const colors = g.colors.map(hex);
    const css = `background: linear-gradient(to right, ${colors.join(', ')});`;
    return makeItem({
      id: `uigradients:${slug}`,
      name: g.name,
      kind: 'gradients',
      summary: `${g.name}: ${colors.length}-color linear gradient (${colors.join(' → ')}) from uiGradients. ${siteSummary('uiGradients', 'https://uigradients.com', meta)}`,
      url: `https://uigradients.com/#${g.name.replace(/\s+/g, '')}`,
      source: { name: 'uiGradients', url: 'https://github.com/Ghosh/uiGradients' },
      license: 'MIT',
      tags: ['gradient', 'linear', `${colors.length}-colors`],
      preview: { type: 'palette', mode: 'gradient', angle: 90, colors, css },
      use: { snippet: css, docs: 'https://uigradients.com' },
    });
  });
  writeCatalog({ id: 'uigradients', name: 'uiGradients', url: 'https://uigradients.com', license: 'MIT (Ghosh/uiGradients gradients.json).' }, items);
}

interface WebGradient { name: string; deg: number; gradient: { color: string; pos: number }[]; index: string }

async function importWebGradients(): Promise<void> {
  console.log('WebGradients');
  const list = await fetchJson<WebGradient[]>('https://raw.githubusercontent.com/itmeo/webgradients/master/gradients.json');
  const meta = await siteMeta('https://webgradients.com');
  const used = new Map<string, number>();
  const items: Item[] = list.map((g) => {
    const slug = uniqueSlug(used, slugify(g.name) || `gradient-${g.index}`);
    const stops = g.gradient.map((s) => `${hex(s.color)} ${s.pos}%`);
    const css = `background-image: linear-gradient(${g.deg}deg, ${stops.join(', ')});`;
    return makeItem({
      id: `webgradients:${slug}`,
      name: g.name,
      kind: 'gradients',
      summary: `${g.name} (#${g.index}): ${g.deg}° linear gradient from WebGradients. ${siteSummary('WebGradients', 'https://webgradients.com', meta)}`,
      url: 'https://webgradients.com',
      source: { name: 'WebGradients (itmeo)', url: 'https://github.com/itmeo/webgradients' },
      license: 'MIT',
      tags: ['gradient', 'linear'],
      preview: { type: 'palette', mode: 'gradient', angle: g.deg, colors: g.gradient.map((s) => hex(s.color)), stops: g.gradient.map((s) => s.pos), css },
      use: { snippet: css, docs: 'https://webgradients.com' },
    });
  });
  writeCatalog({ id: 'webgradients', name: 'WebGradients', url: 'https://webgradients.com', license: 'MIT (itmeo/webgradients gradients.json).' }, items);
}

async function importHeroPatterns(): Promise<void> {
  console.log('Hero Patterns');
  const latest = await npmLatest('hero-patterns');
  const js = await npmFile('hero-patterns', latest.version, 'dist/hero-patterns.es.js');
  // 내보낸 이름 ↔ 안쪽 변수 이름
  const exportBlock = js.match(/export\s*\{([^}]*)\}/)?.[1] ?? '';
  const exported = new Map<string, string>();
  for (const m of exportBlock.matchAll(/([\w$]+) as ([\w$]+)/g)) exported.set(m[1] as string, m[2] as string);
  const re = /([\w$]+)=\(([\w$]+)="#000000",([\w$]+)=1\)=>"((?:[^"\\]|\\.)*)"\.concat\([\w$]+\(\2\),"((?:[^"\\]|\\.)*)"\)\.concat\(\3,"((?:[^"\\]|\\.)*)"\)/g;
  const meta = await siteMeta('https://heropatterns.com');
  const items: Item[] = [];
  for (const m of js.matchAll(re)) {
    const fn = exported.get(m[1] as string);
    if (!fn) continue;
    const dataUrl = `${m[4]}000000${m[5]}1${m[6]}`;
    const encoded = dataUrl.replace(/^url\('data:image\/svg\+xml,/, '').replace(/'\)$/, '');
    const svg = decodeURIComponent(encoded);
    const name = fn.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
    items.push(makeItem({
      id: `hero-patterns:${slugify(name)}`,
      name,
      kind: 'patterns',
      summary: `${name} — repeatable SVG background pattern by Steve Schoger. ${siteSummary('Hero Patterns', 'https://heropatterns.com', meta)}`,
      url: 'https://heropatterns.com',
      source: { name: 'Hero Patterns (via hero-patterns npm)', url: 'https://heropatterns.com' },
      license: 'CC-BY-4.0',
      tags: ['pattern', 'svg', 'background'],
      preview: { type: 'asset', format: 'svg-pattern', svg },
      use: {
        install: 'npm install hero-patterns',
        snippet: `import { ${fn} } from 'hero-patterns';\nel.style.backgroundImage = ${fn}('#9C92AC', 0.4);`,
        docs: 'https://heropatterns.com',
      },
    }));
  }
  if (!items.length) throw new Error('Hero Patterns: 패턴을 못 읽었다 (꾸러미 형식이 바뀌었는지 본다)');
  writeCatalog(
    {
      id: 'hero-patterns',
      name: 'Hero Patterns',
      url: 'https://heropatterns.com',
      license: 'Patterns CC BY 4.0 by Steve Schoger (credit required); SVG strings read from the hero-patterns npm package (MIT code).',
    },
    items,
  );
}

interface MonsterPattern {
  title: string; slug: string; mode: string; colors: number; width: number; height: number; tags: string[]; path: string; creationDate: string;
}

async function importPatternMonster(): Promise<void> {
  console.log('Pattern Monster');
  const js = await fetchText('https://raw.githubusercontent.com/catchspider2002/svelte-svg-patterns/master/src/routes/_index.js');
  const start = js.indexOf('[');
  const end = js.lastIndexOf('];');
  const list = JSON.parse(js.slice(start, end + 1)) as MonsterPattern[];
  const meta = await siteMeta('https://pattern.monster');
  const items: Item[] = list.map((p) =>
    makeItem({
      id: `pattern-monster:${p.slug}`,
      name: p.title,
      kind: 'patterns',
      summary: `${p.title}: seamless SVG pattern (${p.mode}, up to ${p.colors} colors). ${siteSummary('Pattern Monster', 'https://pattern.monster', meta)}`,
      url: `https://pattern.monster/${p.slug}/`,
      source: { name: 'Pattern Monster', url: 'https://github.com/catchspider2002/svelte-svg-patterns' },
      license: 'MIT',
      metrics: { updatedAt: p.creationDate.slice(0, 10) },
      tags: ['pattern', 'svg', 'background', ...p.tags.map(slugify)],
      preview: { type: 'asset', format: 'pattern-paths', mode: p.mode, width: p.width, height: p.height, paths: p.path.split('~') },
      use: { docs: `https://pattern.monster/${p.slug}/` },
    }),
  );
  writeCatalog({ id: 'pattern-monster', name: 'Pattern Monster', url: 'https://pattern.monster', license: 'MIT (catchspider2002/svelte-svg-patterns).' }, items);
}

await main('design-gradients', async () => {
  await importUiGradients();
  await importWebGradients();
  await importHeroPatterns();
  await importPatternMonster();
});
