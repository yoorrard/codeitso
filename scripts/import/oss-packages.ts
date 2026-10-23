// 앱 만들 때 가장 많이 쓰는 라이브러리(npm·PyPI·pub.dev)를 '쓰는 저장소 많은 순'으로 받아 오픈소스 진열대에 쓴다.
//   node scripts/import/oss-packages.ts            (셋 다)
//   node scripts/import/oss-packages.ts npm        (하나만)
// 자료: packages.ecosyste.ms(각 꾸러미 등록소의 공개 거울, CC BY-SA 4.0). 등록소마다 꾸러미가 수십만~수백만 개라
// '이 꾸러미를 쓰는 공개 저장소 수(dependent_repos_count)' 순으로 상위 N개만 싣는다(기준은 source.cut).
// 타입 정의만 담은 꾸러미(@types/*)와 폐기(deprecated)·삭제된 꾸러미는 뺀다. 설치 명령은 등록소 거울이 주는 그대로.
import { type Item, type OssKind, cached, cleanLicense, fetchJson, githubSlug, int, isAdult, isHttpUrl, main, makeId, makeItem, sleep, summaryOf, tagify, toDate, writeCatalog } from './oss-lib.ts';

interface Registry {
  id: string; // 파일 이름
  registry: string; // ecosyste.ms 등록소 이름
  name: string;
  home: string;
  kind: OssKind;
  top: number;
  exclude?: RegExp;
}

const REGISTRIES: Registry[] = [
  { id: 'npm', registry: 'npmjs.org', name: 'npm', home: 'https://www.npmjs.com/', kind: 'js-libraries', top: 2000, exclude: /^@types\// },
  { id: 'pypi', registry: 'pypi.org', name: 'PyPI', home: 'https://pypi.org/', kind: 'py-libraries', top: 1000, exclude: /^types-/ },
  { id: 'pub-dev', registry: 'pub.dev', name: 'pub.dev', home: 'https://pub.dev/', kind: 'dart-libraries', top: 500 },
];

interface EcoPackage {
  name: string;
  description: string | null;
  homepage: string | null;
  normalized_licenses: string[] | null;
  licenses: string | null;
  repository_url: string | null;
  keywords_array: string[] | null;
  latest_release_published_at: string | null;
  latest_release_number: string | null;
  registry_url: string | null;
  install_command: string | null;
  documentation_url: string | null;
  downloads: number | null;
  downloads_period: string | null;
  dependent_repos_count: number | null;
  dependent_packages_count: number | null;
  status: string | null;
  repo_metadata?: { stargazers_count?: number; language?: string; archived?: boolean } | null;
}

async function topPackages(r: Registry): Promise<{ rows: EcoPackage[]; total?: number }> {
  return cached(`pkgs-${r.id}-${r.top}`, async () => {
    const reg = await fetchJson<{ packages_count?: number }>(`https://packages.ecosyste.ms/api/v1/registries/${r.registry}`);
    const rows: EcoPackage[] = [];
    // 빼는 꾸러미가 있어 넉넉히 넘겨 받는다.
    for (let page = 1; rows.length < r.top * 1.3; page++) {
      const list = await fetchJson<EcoPackage[]>(
        `https://packages.ecosyste.ms/api/v1/registries/${r.registry}/packages?sort=dependent_repos_count&order=desc&per_page=100&page=${page}`,
        { timeoutMs: 180_000 },
      );
      if (!list.length) break;
      rows.push(...list);
      if (page % 5 === 0) console.log(`  ${r.id} 쪽 ${page}: ${rows.length}`);
      await sleep(500);
    }
    return { rows, total: reg.packages_count };
  });
}

async function importRegistry(r: Registry): Promise<void> {
  const { rows, total } = await topPackages(r);
  const kept = rows
    .filter((p) => !(r.exclude?.test(p.name)) && !/deprecated|removed|yanked/i.test(p.status ?? '') && !isAdult([p.name, p.description]))
    .slice(0, r.top);
  const items: Item[] = kept.map((p) => {
    const repo = p.repository_url && isHttpUrl(p.repository_url) ? p.repository_url : undefined;
    const url = p.registry_url && isHttpUrl(p.registry_url) ? p.registry_url : `${r.home}${r.id === 'pypi' ? 'project' : 'package'}/${p.name}`;
    const docs = [p.documentation_url, p.homepage].find((u) => isHttpUrl(u) && u !== url) ?? undefined;
    return makeItem({
      id: makeId(r.id, p.name.replace(/^@/, '')),
      name: p.name,
      kind: r.kind,
      category: 'opensource',
      summary: summaryOf(p.description) ?? p.name,
      url,
      source: { name: r.name, url: r.home },
      license: cleanLicense(p.normalized_licenses?.[0] ?? p.licenses),
      metrics: {
        stars: int(p.repo_metadata?.stargazers_count),
        downloads: p.downloads_period === 'last-month' ? int(p.downloads) : undefined,
        updatedAt: toDate(p.latest_release_published_at),
      },
      tags: tagify([r.id, ...(p.keywords_array ?? []).slice(0, 8), p.repo_metadata?.archived ? 'archived' : undefined]),
      preview: {
        type: 'repo',
        host: r.id,
        package: p.name,
        ...(p.latest_release_number ? { version: p.latest_release_number } : {}),
        ...(repo ? { repoUrl: repo } : {}),
        ...(repo && githubSlug(repo) ? { repo: githubSlug(repo) } : {}),
        ...(p.dependent_repos_count ? { dependentRepos: p.dependent_repos_count } : {}),
        ...(p.repo_metadata?.language ? { language: p.repo_metadata.language } : {}),
      },
      use: { install: p.install_command ?? undefined, docs },
    });
  });
  writeCatalog('opensource', {
    id: r.id,
    name: `${r.name} 인기 라이브러리`,
    url: r.home,
    license: `Package metadata from packages.ecosyste.ms (mirror of the ${r.name} registry, CC BY-SA 4.0); each package keeps its own license (field license).`,
    total,
    cut: `이 꾸러미를 쓰는 공개 저장소 수(dependent_repos_count) 순 상위 ${r.top}개${r.exclude ? `, ${r.exclude.source} 제외` : ''}, 폐기·삭제된 꾸러미 제외`,
    note: '내려받기(downloads)는 지난 한 달 값이다 (등록소가 주는 경우만).',
  }, items);
}

main(async () => {
  const only = process.argv[2];
  for (const r of REGISTRIES) {
    if (only && only !== r.id) continue;
    await importRegistry(r);
  }
});
