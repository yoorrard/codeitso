// 공개 데이터셋 모음(색인) 여러 곳을 받아 데이터셋 진열대에 쓴다 (모음마다 파일 하나).
//   node scripts/import/data-collections.ts            (전부)
//   node scripts/import/data-collections.ts uci        (하나만)
// - awesome-public-datasets: 기계가 읽는 원본 awesomedata/apd-core의 core/<분류>/<이름>.yml 전부 (분야별 공개 데이터)
// - aws-open-data: Registry of Open Data on AWS(awslabs/open-data-registry의 datasets/*.yaml). 폐기(Deprecated) 항목은 뺀다.
// - uci: UCI Machine Learning Repository 공개 API(목록 + 데이터셋마다 상세). 파이썬 불러오기 조각은 UCI가 쪽마다 보여 주는 그대로.
// - korean-data: songys/AwesomeKorean_Data(한국어 데이터셋 목록, awesome.ecosyste.ms 색인)
import { join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import {
  type Item, type SourceInfo, awesomeEntries, cached, cmp, fetchJson, gitCheckout, gitFiles, hostOf, int, isHttpUrl, main,
  makeId, makeItem, mapLimit, ownerRepos, parseSimpleYaml, progress, repoMeta, repoPreview, summaryOf, tagify, toDate, writeCatalog,
} from './oss-lib.ts';

type Run = () => Promise<{ info: SourceInfo; items: Item[] }>;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

const apdCore: Run = async () => {
  const dir = gitCheckout('awesomedata/apd-core', ['/core/**/*.yml'], 'master');
  const files = gitFiles(dir, 'core').filter((f) => f.endsWith('.yml')).sort(cmp);
  const items: Item[] = [];
  for (const f of files) {
    const y = parseSimpleYaml(readFileSync(join(dir, f), 'utf8'));
    const title = str(y.title);
    const home = str(y.homepage);
    if (!title || !home || !isHttpUrl(home)) continue;
    if (y.status === 'BROKEN' || y.status === 'broken') continue;
    const category = str(y.category) ?? f.split('/')[1] ?? '';
    items.push(makeItem({
      id: makeId('awesome-public-datasets', `${category}-${f.split('/').pop()?.replace(/\.yml$/, '')}`),
      name: title,
      kind: /^MachineLearning|^NaturalLanguage|^ImageProcessing|^DataChallenges/.test(category) ? 'ml-classic' : 'open-data',
      category: 'datasets',
      summary: summaryOf(str(y.description)) ?? title,
      url: home,
      source: { name: 'awesome-public-datasets', url: 'https://github.com/awesomedata/awesome-public-datasets' },
      license: str(y.license) && (str(y.license) as string).length <= 60 ? str(y.license) : undefined,
      tags: tagify([category.replace(/\+/g, '-').toLowerCase(), ...strs(y.keywords).slice(0, 5)]),
      preview: { type: 'dataset', host: hostOf(home) || 'web', field: category, ...(str(y.publisher) ? { publisher: str(y.publisher) } : {}) },
    }));
  }
  return {
    info: {
      id: 'awesome-public-datasets', name: 'Awesome Public Datasets (분야별)', url: 'https://github.com/awesomedata/awesome-public-datasets',
      license: 'Dataset list from awesomedata/apd-core (GPL-3.0 list repository; names, links and one-line descriptions). Each dataset keeps its own terms.',
      note: '원본 저장소가 깨진 링크로 표시한 항목은 뺀다.',
    },
    items,
  };
};

const awsOpenData: Run = async () => {
  const dir = gitCheckout('awslabs/open-data-registry', ['/datasets/*.yaml'], 'main');
  const files = readdirSync(join(dir, 'datasets')).filter((f) => f.endsWith('.yaml')).sort(cmp);
  const items: Item[] = [];
  let deprecated = 0;
  for (const f of files) {
    const y = parseSimpleYaml(readFileSync(join(dir, 'datasets', f), 'utf8'));
    if (y.Deprecated === true) {
      deprecated++;
      continue;
    }
    const name = str(y.Name);
    if (!name) continue;
    const slug = f.replace(/\.yaml$/, '');
    const license = str(y.License);
    const managed = str(y.ManagedBy)?.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    items.push(makeItem({
      id: makeId('aws-open-data', slug),
      name,
      kind: 'open-data',
      category: 'datasets',
      summary: summaryOf(str(y.Description)) ?? name,
      url: `https://registry.opendata.aws/${slug}/`,
      source: { name: 'Registry of Open Data on AWS', url: 'https://registry.opendata.aws/' },
      license: license && license.length <= 60 && !/\s{2,}|\. /.test(license) ? license : undefined,
      tags: tagify(['aws', ...strs(y.Tags).slice(0, 8)]),
      preview: {
        type: 'dataset',
        host: 'aws',
        ...(managed ? { managedBy: managed } : {}),
        ...(str(y.UpdateFrequency) ? { updateFrequency: str(y.UpdateFrequency) } : {}),
        ...(license && license.length > 60 ? { licenseText: summaryOf(license) } : {}),
      },
      use: { docs: str(y.Documentation) && isHttpUrl(str(y.Documentation)) ? str(y.Documentation) : undefined },
    }));
  }
  return {
    info: {
      id: 'aws-open-data', name: 'Registry of Open Data on AWS', url: 'https://registry.opendata.aws/',
      license: 'Registry entries from awslabs/open-data-registry (Apache-2.0 registry repository); each dataset keeps the license named by its provider.',
      total: files.length, cut: `폐기(Deprecated) ${deprecated}개 제외`,
    },
    items,
  };
};

interface UciList {
  data: { id: number; name: string }[];
}

interface UciDetail {
  uci_id: number;
  name: string;
  repository_url?: string;
  data_url?: string | null;
  abstract?: string;
  area?: string;
  tasks?: string[];
  characteristics?: string[];
  num_instances?: number | null;
  num_features?: number | null;
  last_updated?: string | null;
  year_of_dataset_creation?: number | null;
}

const uci: Run = async () => {
  const list = await fetchJson<UciList>('https://archive.ics.uci.edu/api/datasets/list');
  let done = 0;
  const details = await cached('uci-details', async () => {
    const out = await mapLimit(list.data, 4, async (d) => {
      try {
        const j = await fetchJson<{ data: UciDetail }>(`https://archive.ics.uci.edu/api/dataset?id=${d.id}`, { retries: 3 });
        return j.data;
      } catch {
        return null;
      } finally {
        progress('UCI', ++done, list.data.length, 200);
      }
    });
    return out.filter((x): x is UciDetail => !!x);
  }, 7);
  const items = details.map((d) => makeItem({
    id: makeId('uci', `${d.uci_id}-${d.name}`),
    name: d.name,
    kind: 'ml-classic',
    category: 'datasets',
    summary: summaryOf(d.abstract) ?? d.name,
    url: d.repository_url && isHttpUrl(d.repository_url) ? d.repository_url : `https://archive.ics.uci.edu/dataset/${d.uci_id}`,
    source: { name: 'UCI Machine Learning Repository', url: 'https://archive.ics.uci.edu/' },
    metrics: { updatedAt: toDate(d.last_updated ?? undefined) },
    tags: tagify(['uci', d.area, ...(d.tasks ?? []), ...(d.characteristics ?? [])]),
    preview: {
      type: 'dataset',
      host: 'uci',
      ...(d.area ? { field: d.area } : {}),
      ...(d.tasks?.length ? { tasks: d.tasks } : {}),
      ...(int(d.num_instances) !== undefined ? { rows: d.num_instances } : {}),
      ...(int(d.num_features) !== undefined ? { features: d.num_features } : {}),
      ...(d.data_url && isHttpUrl(d.data_url) ? { csv: d.data_url } : {}),
      ...(d.year_of_dataset_creation ? { year: d.year_of_dataset_creation } : {}),
    },
    use: { install: 'pip install ucimlrepo', snippet: `from ucimlrepo import fetch_ucirepo\ndataset = fetch_ucirepo(id=${d.uci_id})` },
  }));
  return {
    info: {
      id: 'uci', name: 'UCI Machine Learning Repository', url: 'https://archive.ics.uci.edu/',
      license: 'Dataset metadata from the public UCI ML Repository API. UCI states its donated datasets are licensed CC BY 4.0 unless noted on the dataset page.',
      total: list.data.length,
    },
    items,
  };
};

const koreanData: Run = async () => {
  const entries = await awesomeEntries('songys/AwesomeKorean_Data');
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const e of entries) {
    if (!isHttpUrl(e.url) || !e.name || seen.has(e.url)) continue;
    seen.add(e.url);
    items.push(makeItem({
      id: makeId('korean-data', `${e.name}-${hostOf(e.url)}`),
      name: e.name,
      kind: 'kr-language',
      category: 'datasets',
      summary: summaryOf(e.description) ?? e.name,
      url: e.url,
      source: { name: 'AwesomeKorean_Data', url: 'https://github.com/songys/AwesomeKorean_Data' },
      tags: tagify(['korean', e.category, e.subCategory]),
      preview: { type: 'dataset', host: hostOf(e.url) || 'web', ...(e.category ? { field: e.category } : {}) },
    }));
  }
  return {
    info: {
      id: 'korean-data', name: '한국어 데이터셋 모음 (AwesomeKorean_Data)', url: 'https://github.com/songys/AwesomeKorean_Data',
      license: 'List entries (name, link, description) from songys/AwesomeKorean_Data as indexed by awesome.ecosyste.ms (CC BY-SA 4.0). Each dataset keeps its own terms.',
    },
    items,
  };
};

// 앱에 바로 넣는 기본 데이터(국가·통화·도시·지도 경계 등). DataHub 'datasets' 조직 전체 + 널리 쓰는 참조 데이터 저장소 몇 개(손으로 고름).
const REFERENCE_REPOS = [
  'dr5hn/countries-states-cities-database', 'mledoze/countries', 'umpirsky/country-list', 'annexare/Countries',
  'lukes/ISO-3166-Countries-with-Regional-Codes', 'datasets/country-codes', 'southkorea/southkorea-maps', 'vuski/admdongkor',
  'johan/world.geo.json', 'nvkelso/natural-earth-vector', 'unicode-org/cldr-json', 'samayo/country-json',
];

const coreDatasets: Run = async () => {
  const org = (await ownerRepos('datasets')).filter((r) => !r.fork && r.description && r.stars >= 5);
  const picked = new Map(org.map((r) => [r.fullName.toLowerCase(), r]));
  for (const slug of REFERENCE_REPOS) {
    if (picked.has(slug.toLowerCase())) continue;
    const m = await repoMeta(slug);
    if (m && !m.fork && m.description) picked.set(slug.toLowerCase(), m);
  }
  const items = [...picked.values()].map((r) => makeItem({
    id: makeId('reference-data', r.fullName),
    name: r.fullName.split('/')[1] ?? r.fullName,
    kind: 'sample-data',
    category: 'datasets',
    summary: summaryOf(r.description) ?? r.fullName,
    url: `https://github.com/${r.fullName}`,
    source: r.fullName.startsWith('datasets/') ? { name: 'DataHub core datasets (GitHub datasets)', url: 'https://github.com/datasets' } : { name: 'GitHub', url: 'https://github.com' },
    license: r.license,
    metrics: { stars: r.stars, updatedAt: r.pushedAt },
    tags: tagify(['reference-data', ...r.topics.slice(0, 6), r.archived ? 'archived' : undefined]),
    preview: { ...repoPreview(r), ...(r.homepage ? { homepage: r.homepage } : {}) },
    use: { install: `git clone https://github.com/${r.fullName}.git` },
  }));
  return {
    info: {
      id: 'reference-data', name: '앱에 넣는 기본 데이터 (국가·통화·도시·지도 경계)', url: 'https://github.com/datasets',
      license: 'Repository metadata via repos.ecosyste.ms (CC BY-SA 4.0). DataHub core datasets are mostly ODC-PDDL; each repository keeps its own license (field license).',
      note: `GitHub 'datasets' 조직(DataHub core datasets) 전체(별 5개 이상) + 널리 쓰는 참조 데이터 저장소: ${REFERENCE_REPOS.join(', ')} (고른 목록은 코드잇소).`,
    },
    items,
  };
};

const RUNS: [string, Run][] = [
  ['awesome-public-datasets', apdCore],
  ['aws-open-data', awsOpenData],
  ['uci', uci],
  ['korean-data', koreanData],
  ['reference-data', coreDatasets],
];

main(async () => {
  const only = process.argv[2];
  for (const [id, run] of RUNS) {
    if (only && only !== id) continue;
    try {
      const { info, items } = await run();
      writeCatalog('datasets', info, items);
    } catch (err) {
      console.error(`✘ ${id}: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  }
});
