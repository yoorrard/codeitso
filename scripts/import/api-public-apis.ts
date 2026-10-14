// 공개 API 목록 셋을 받아 API 진열대 파일로 쓴다. 표의 모든 줄을 끝까지 읽는다.
//   node scripts/import/api-public-apis.ts
// 1) public-apis/public-apis (MIT)                → data/catalog/api/public-apis.json
// 2) public-api-lists/public-api-lists (MIT)      → public-api-lists.json  (1에 없는 주소만)
// 3) marcelscruz/public-apis (MIT)                → marcelscruz.json       (1·2에 없는 주소만)
// 4) APIs-guru/graphql-apis (MIT)                 → graphql-apis.json      (공개 GraphQL API)
// 한국어 한 줄(summaryKo)은 yybmion/public-apis-4Kr(MIT)의 '글로벌 public API' 번역에서 주소가 같은 줄만 붙인다.
import { ALL_CURATED, PROVIDER_OVERLAY } from './api-curated-data.ts';
import {
  type Item, type Kind, type MdRow, cmp, fetchText, firstLink, hostOf, kindByKeywords, kindForPublicApis, main, makeItem,
  normUrl, parseMarkdownTables, slugify, stripMarkdown, writeCatalog,
} from './api-lib.ts';

const RAW = 'https://raw.githubusercontent.com';

interface ListSource {
  id: string;
  name: string;
  repo: string; // owner/repo
  branch: string;
}

const LISTS: ListSource[] = [
  { id: 'public-apis', name: 'public-apis', repo: 'public-apis/public-apis', branch: 'master' },
  { id: 'public-api-lists', name: 'Public API Lists', repo: 'public-api-lists/public-api-lists', branch: 'master' },
  { id: 'marcelscruz', name: 'Public APIs (marcelscruz)', repo: 'marcelscruz/public-apis', branch: 'main' },
];

const KO_SOURCE = { repo: 'yybmion/public-apis-4Kr', branch: 'main', file: 'GLOBAL_PUBLIC_APIS_KR.md' };

export interface PublicApiRow {
  section: string;
  name: string;
  url: string;
  description: string;
  auth?: string;
  https?: boolean;
  cors?: 'yes' | 'no' | 'unknown';
}

function cell(row: MdRow, ...names: string[]): string | undefined {
  for (const n of names) {
    const i = row.header.indexOf(n);
    if (i >= 0) return row.cells[i];
  }
  return undefined;
}

export function normAuth(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const t = stripMarkdown(raw).replace(/`/g, '').trim();
  if (!t) return undefined;
  if (/^no(ne)?$/i.test(t)) return 'none';
  if (/^[✕x×-]$/i.test(t)) return 'website'; // API 없이 사이트에서 보거나 내려받는 자료
  if (/^api ?key$/i.test(t)) return 'apiKey';
  if (/^oauth/i.test(t)) return 'OAuth';
  if (/^x-mashape-key$/i.test(t)) return 'X-Mashape-Key';
  if (/^user-agent$/i.test(t)) return 'User-Agent';
  return t.length <= 20 ? t : undefined; // 칸이 밀린 줄은 비운다
}

function yesNo(raw: string | undefined): 'yes' | 'no' | 'unknown' | undefined {
  if (raw === undefined) return undefined;
  const t = stripMarkdown(raw).toLowerCase();
  if (t.startsWith('yes')) return 'yes';
  if (t.startsWith('no')) return 'no';
  if (t.startsWith('unk')) return 'unknown';
  return undefined;
}

// 표 줄 → 공개 API 줄. 분류를 모르는 표(광고·MCP 소개 표)는 버린다.
export function readPublicApiRows(md: string): PublicApiRow[] {
  const out: PublicApiRow[] = [];
  for (const row of parseMarkdownTables(md)) {
    if (!(row.header.includes('api') || row.header.includes('리소스')) || !(row.header.includes('description') || row.header.includes('설명'))) continue;
    if (!row.header.includes('auth') && !row.header.includes('인증') && !row.header.includes('이용 방식')) continue;
    const link = firstLink(row.cells[0] ?? '');
    if (!link || !/^https?:\/\//i.test(link.url)) continue;
    const description = stripMarkdown(cell(row, 'description', '설명') ?? '');
    if (!description) continue;
    const https = yesNo(cell(row, 'https'));
    out.push({
      section: row.section.replace(/\s*\[.*$/, '').trim(),
      name: link.text,
      url: link.url,
      description,
      auth: normAuth(cell(row, 'auth', '인증', '이용 방식')),
      https: https === undefined ? undefined : https === 'yes',
      cors: yesNo(cell(row, 'cors')),
    });
  }
  return out;
}

function authTag(auth: string | undefined): string | undefined {
  if (!auth) return undefined;
  return `auth-${auth.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function toItem(src: ListSource, row: PublicApiRow, kind: Kind, slug: string, ko: Map<string, string>): Item {
  const summaryKo = ko.get(normUrl(row.url));
  return makeItem({
    id: `${src.id}:${slug}`,
    name: row.name,
    kind,
    summary: row.description,
    ...(summaryKo ? { summaryKo } : {}),
    url: row.url,
    source: { name: src.name, url: `https://github.com/${src.repo}` },
    tags: [slugify(row.section), authTag(row.auth), row.https ? 'https' : undefined, row.cors === 'yes' ? 'cors' : undefined].filter(
      (t): t is string => Boolean(t),
    ),
    preview: {
      type: 'api',
      auth: row.auth,
      https: row.https,
      cors: row.cors,
      listCategory: row.section,
    },
  });
}

// 이름 슬러그가 겹치면 주소의 호스트를 붙인다 (입력 순서와 무관하게 같은 id).
function slugFor(rows: PublicApiRow[]): Map<PublicApiRow, string> {
  const byName = new Map<string, PublicApiRow[]>();
  for (const r of rows) {
    const s = slugify(r.name) || slugify(hostOf(r.url)) || 'api';
    byName.set(s, [...(byName.get(s) ?? []), r]);
  }
  const out = new Map<PublicApiRow, string>();
  for (const [s, group] of byName) {
    if (group.length === 1) {
      out.set(group[0] as PublicApiRow, s);
      continue;
    }
    const used = new Map<string, number>();
    for (const r of [...group].sort((a, b) => cmp(normUrl(a.url), normUrl(b.url)))) {
      const base = `${s}-${slugify(hostOf(r.url)) || 'x'}`;
      const n = (used.get(base) ?? 0) + 1;
      used.set(base, n);
      out.set(r, n === 1 ? base : `${base}-${n}`);
    }
  }
  return out;
}

async function koreanSummaries(): Promise<Map<string, string>> {
  const md = await fetchText(`${RAW}/${KO_SOURCE.repo}/${KO_SOURCE.branch}/${KO_SOURCE.file}`);
  const map = new Map<string, string>();
  for (const r of readPublicApiRows(md)) if (!map.has(normUrl(r.url))) map.set(normUrl(r.url), r.description);
  console.log(`  한국어 한 줄 ${map.size}개 (${KO_SOURCE.repo})`);
  return map;
}

// 손 목록·models.dev 덧씌우기에 이미 있는 상품인가.
// 주소가 같거나, 호스트가 같고 그 호스트에 상품이 하나뿐일 때(양쪽 모두) 같은 상품으로 본다.
function curatedMatcher(): (url: string, hostCountInList: number) => boolean {
  const urls = new Set<string>();
  const hostCount = new Map<string, number>();
  const add = (u: string | undefined) => {
    if (!u) return;
    urls.add(normUrl(u));
  };
  for (const c of ALL_CURATED) {
    add(c.url);
    add(c.docs);
    for (const h of new Set([hostOf(c.url), hostOf(c.docs)])) hostCount.set(h, (hostCount.get(h) ?? 0) + 1);
  }
  for (const o of Object.values(PROVIDER_OVERLAY)) {
    add(o.url);
    add(o.docs);
    for (const h of new Set([o.url ? hostOf(o.url) : '', o.docs ? hostOf(o.docs) : ''].filter(Boolean))) hostCount.set(h, (hostCount.get(h) ?? 0) + 1);
  }
  const GENERIC = /(^|\.)(github\.com|github\.io|rapidapi\.com|google\.com|googleapis\.com|microsoft\.com|amazon\.com|aws\.amazon\.com|azure\.microsoft\.com|learn\.microsoft\.com|developers\.google\.com|cloud\.google\.com|developer\.apple\.com|docs\.github\.com|developers\.facebook\.com|developers\.kakao\.com|developers\.line\.biz|mailchimp\.com|razorpay\.com)$/;
  return (url, hostCountInList) => {
    if (urls.has(normUrl(url))) return true;
    const h = hostOf(url);
    return !GENERIC.test(h) && hostCount.get(h) === 1 && hostCountInList === 1;
  };
}

async function importLists(): Promise<void> {
  const ko = await koreanSummaries();
  const isCurated = curatedMatcher();
  const seen = new Set<string>();
  for (const src of LISTS) {
    const md = await fetchText(`${RAW}/${src.repo}/${src.branch}/README.md`);
    const rows = readPublicApiRows(md);
    const hostsInList = new Map<string, number>();
    for (const r of rows) hostsInList.set(hostOf(r.url), (hostsInList.get(hostOf(r.url)) ?? 0) + 1);
    const dropped: string[] = [];
    const fresh: { row: PublicApiRow; kind: Kind }[] = [];
    const unknown = new Set<string>();
    const inThisList = new Set<string>();
    for (const row of rows) {
      const kind = kindForPublicApis(row.section);
      if (!kind) {
        unknown.add(row.section);
        continue;
      }
      const key = normUrl(row.url);
      if (seen.has(key) || inThisList.has(key)) continue; // 앞 목록에 이미 있거나 같은 목록 안에서 겹침
      if (isCurated(row.url, hostsInList.get(hostOf(row.url)) ?? 0)) {
        dropped.push(row.name);
        continue;
      }
      inThisList.add(key);
      fresh.push({ row, kind });
    }
    for (const k of inThisList) seen.add(k);
    const slugs = slugFor(fresh.map((f) => f.row));
    const items = fresh.map(({ row, kind }) => toItem(src, row, kind, slugs.get(row) as string, ko));
    console.log(`  ${src.repo}: 표 ${rows.length}줄, 새 주소 ${items.length}개${unknown.size ? `, 모르는 분류 버림: ${[...unknown].join(', ')}` : ''}`);
    if (dropped.length) console.log(`    손 목록과 같은 상품이라 뺌 ${dropped.length}개: ${dropped.sort(cmp).join(', ')}`);
    writeCatalog(
      {
        id: src.id,
        name: src.name,
        url: `https://github.com/${src.repo}`,
        license: 'MIT (list text); each API has its own terms',
        note:
          (src.id === 'public-apis' ? 'All rows of the README tables' : 'Only rows whose URL is not already in the lists above (public-apis first)') +
          ', minus products already in the hand-checked list (official.json, models-dev.json).' +
          ' Korean one-liners (summaryKo) come from yybmion/public-apis-4Kr (MIT), matched by URL.',
      },
      items,
    );
  }
}

// ---------- 공개 GraphQL API ----------

async function importGraphql(): Promise<void> {
  const repo = 'APIs-guru/graphql-apis';
  const md = await fetchText(`${RAW}/${repo}/master/README.md`);
  const rows = parseMarkdownTables(md).filter((r) => r.header[0] === 'api' && r.header.includes('description'));
  const items: Item[] = [];
  const used = new Map<string, number>();
  for (const r of rows) {
    const name = stripMarkdown(r.cells[0] ?? '');
    const description = stripMarkdown(r.cells[1] ?? '');
    const tryIt = firstLink(r.cells[2] ?? '')?.url;
    const docs = firstLink(r.cells[3] ?? '')?.url;
    const url = docs ?? tryIt;
    if (!name || !description || !url) continue;
    const base = slugify(name);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    items.push(
      makeItem({
        id: `graphql-apis:${n === 1 ? base : `${base}-${n}`}`,
        name,
        kind: kindByKeywords(`${name} ${description}`),
        summary: description,
        url,
        source: { name: 'Public GraphQL APIs (APIs.guru)', url: `https://github.com/${repo}` },
        tags: ['graphql', r.section ? slugify(r.section) : 'graphql'],
        preview: { type: 'api', protocol: 'GraphQL', playground: tryIt && /^https?:/.test(tryIt) ? tryIt : undefined, listCategory: r.section },
        ...(docs ? { use: { docs } } : {}),
      }),
    );
  }
  writeCatalog(
    {
      id: 'graphql-apis',
      name: 'Public GraphQL APIs (APIs.guru)',
      url: `https://github.com/${repo}`,
      license: 'MIT (list text); each API has its own terms',
      note: 'Every row of the README tables. The list has no categories, so the shelf is picked from words in the description.',
    },
    items,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main('api-public-apis', async () => {
    await importLists();
    await importGraphql();
  });
}
