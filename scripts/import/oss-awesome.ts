// 주제별 'awesome 목록'(사람이 고른 자료 모음 저장소)을 별 많은 순으로 받아 오픈소스 진열대에 쓴다.
//   node scripts/import/oss-awesome.ts
// 자료: awesome.ecosyste.ms(GitHub awesome 목록 색인, CC BY-SA 4.0)의 /api/v1/lists?sort=stars.
// 색인된 목록이 1만 개가 넘어 별 MIN_STARS개 이상만 싣는다. 쪽마다 README 전문이 붙어 무거우므로 100개씩 넘기다 기준 밑에서 멈춘다.
import { type Item, cached, cleanLicense, fetchJson, githubSlug, int, isAdult, main, makeId, makeItem, sleep, summaryOf, tagify, toDate, writeCatalog } from './oss-lib.ts';

export const MIN_STARS = 1000;

interface AwesomeList {
  id: number;
  url: string;
  name: string;
  description: string | null;
  projects_count: number | null;
  list_of_lists: boolean | null;
  primary_language?: string | null;
  repository?: {
    full_name?: string;
    stargazers_count?: number;
    pushed_at?: string;
    license?: string | null;
    topics?: string[] | null;
    archived?: boolean;
    homepage?: string | null;
  } | null;
}

interface Slim {
  url: string;
  name: string;
  description: string;
  projects: number;
  listOfLists: boolean;
  fullName?: string;
  stars: number;
  pushedAt?: string;
  license?: string;
  topics: string[];
  archived: boolean;
}

main(async () => {
  const rows = await cached('awesome-lists-by-stars', async () => {
    const out: Slim[] = [];
    for (let page = 1; ; page++) {
      const list = await fetchJson<AwesomeList[]>(`https://awesome.ecosyste.ms/api/v1/lists?per_page=100&page=${page}&sort=stars&order=desc`, { timeoutMs: 180_000 });
      for (const l of list) {
        out.push({
          url: l.url,
          name: l.name,
          description: l.description ?? '',
          projects: l.projects_count ?? 0,
          listOfLists: !!l.list_of_lists,
          fullName: l.repository?.full_name,
          stars: l.repository?.stargazers_count ?? 0,
          pushedAt: l.repository?.pushed_at,
          license: l.repository?.license ?? undefined,
          topics: l.repository?.topics ?? [],
          archived: !!l.repository?.archived,
        });
      }
      const last = out.at(-1)?.stars ?? 0;
      console.log(`  쪽 ${page}: 마지막 별 ${last}`);
      if (list.length < 100 || last < MIN_STARS) break;
      await sleep(500);
    }
    return out;
  }, 7);
  const kept = rows.filter((r) => r.stars >= MIN_STARS && r.description && !isAdult([r.name, r.description], r.topics));
  const items: Item[] = kept.map((r) => {
    const slug = r.fullName ?? githubSlug(r.url) ?? r.name;
    return makeItem({
      id: makeId('awesome-lists', slug),
      name: r.name,
      kind: 'awesome',
      category: 'opensource',
      summary: summaryOf(r.description) ?? r.name,
      url: r.url,
      source: { name: 'awesome.ecosyste.ms', url: 'https://awesome.ecosyste.ms/' },
      license: cleanLicense(r.license),
      metrics: { stars: int(r.stars), updatedAt: toDate(r.pushedAt) },
      tags: tagify(['awesome', r.listOfLists ? 'list-of-lists' : undefined, r.archived ? 'archived' : undefined, ...r.topics.filter((t) => !/^awesome/.test(t)).slice(0, 8)]),
      preview: { type: 'repo', host: 'github', repo: slug, ...(r.projects ? { entries: r.projects } : {}), ...(r.archived ? { archived: true } : {}) },
    });
  });
  writeCatalog('opensource', {
    id: 'awesome-lists',
    name: '어썸 리스트 (주제별 모음 저장소)',
    url: 'https://awesome.ecosyste.ms/',
    license: 'List index and repository metadata from awesome.ecosyste.ms (CC BY-SA 4.0); each list keeps its own license (field license).',
    cut: `별 ${MIN_STARS.toLocaleString('en-US')}개 이상, 설명이 있는 목록`,
    note: 'awesome.ecosyste.ms에 색인된 목록은 1만 개가 넘는다. entries는 그 목록이 가리키는 항목 수다.',
  }, items);
});
