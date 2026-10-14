// awesome-selfhosted(직접 띄워 쓰는 오픈소스 앱 목록) 전체를 받아 오픈소스 진열대에 쓴다.
//   node scripts/import/oss-selfhosted.ts
// 원본은 기계가 읽는 자료 저장소 awesome-selfhosted/awesome-selfhosted-data(CC BY-SA 3.0)의 software/*.yml이다.
// 별 수·갱신일·보관 여부는 그 저장소가 매일 GitHub에서 받아 적어 두는 값을 그대로 쓴다.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type Item, type OssKind, cmp, gitCheckout, githubSlug, isHttpUrl, main, makeId, makeItem, parseSimpleYaml, summaryOf,
  tagify, toDate, writeCatalog,
} from './oss-lib.ts';

const REPO = 'awesome-selfhosted/awesome-selfhosted-data';

// awesome-selfhosted 꼬리표 → 소분류. 나머지는 바로 쓰는 앱(apps).
export function kindForTags(tags: string[]): OssKind {
  const t = tags.join(' | ').toLowerCase();
  if (/content management|blogging|static site generators|wikis/.test(t)) return 'cms';
  if (/e-commerce/.test(t)) return 'ecommerce';
  if (/identity management|federated identity|authentication/.test(t)) return 'auth';
  if (/generative artificial intelligence/.test(t)) return 'ai-apps';
  if (/^games|\| games/.test(t)) return 'games';
  return 'apps';
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

main(async () => {
  const dir = gitCheckout(REPO, ['/software/*.yml'], 'master');
  const files = readdirSync(join(dir, 'software')).filter((f) => f.endsWith('.yml')).sort(cmp);
  const items: Item[] = [];
  for (const f of files) {
    const y = parseSimpleYaml(readFileSync(join(dir, 'software', f), 'utf8'));
    const name = typeof y.name === 'string' ? y.name : f.replace(/\.yml$/, '');
    const website = typeof y.website_url === 'string' && isHttpUrl(y.website_url) ? y.website_url : undefined;
    const source = typeof y.source_code_url === 'string' && isHttpUrl(y.source_code_url) ? y.source_code_url : undefined;
    const url = website ?? source;
    const summary = summaryOf(typeof y.description === 'string' ? y.description : undefined);
    if (!url || !summary) continue;
    const tags = strs(y.tags);
    const platforms = strs(y.platforms);
    const licenses = strs(y.licenses);
    const archived = y.archived === true;
    const repo = source ? githubSlug(source) : undefined;
    const release = y.current_release && typeof y.current_release === 'object' && !Array.isArray(y.current_release)
      ? (y.current_release as Record<string, unknown>) : undefined;
    items.push(makeItem({
      id: makeId('selfhosted', f.replace(/\.yml$/, '')),
      name,
      kind: kindForTags(tags),
      category: 'opensource',
      summary,
      url,
      source: { name: 'awesome-selfhosted', url: 'https://awesome-selfhosted.net/' },
      license: licenses.length ? licenses.join(' OR ') : undefined,
      metrics: {
        stars: typeof y.stargazers_count === 'number' ? y.stargazers_count : undefined,
        updatedAt: toDate(typeof y.updated_at === 'string' ? y.updated_at : undefined),
      },
      tags: tagify([...tags, ...platforms, archived ? 'archived' : undefined, y.depends_3rdparty === true ? 'depends-3rdparty' : undefined]),
      preview: {
        type: 'repo',
        host: repo ? 'github' : 'other',
        ...(repo ? { repo } : {}),
        ...(source ? { source } : {}),
        ...(platforms.length ? { platforms } : {}),
        ...(typeof y.demo_url === 'string' && isHttpUrl(y.demo_url) ? { demo: y.demo_url } : {}),
        ...(typeof y.icon_url === 'string' && isHttpUrl(y.icon_url) ? { icon: y.icon_url } : {}),
        ...(release && typeof release.tag === 'string' ? { release: release.tag } : {}),
        ...(archived ? { archived: true } : {}),
      },
      use: { docs: website && source ? source : undefined },
    }));
  }
  writeCatalog('opensource', {
    id: 'selfhosted',
    name: 'awesome-selfhosted',
    url: 'https://github.com/awesome-selfhosted/awesome-selfhosted-data',
    license: 'CC BY-SA 3.0 (awesome-selfhosted-data); each app keeps its own license (field license).',
    note: '직접 서버에 띄워 쓰는 자유 소프트웨어 목록. 별 수·갱신일은 원본 저장소가 매일 GitHub에서 받아 둔 값이다.',
  }, items);
});
