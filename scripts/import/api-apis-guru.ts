// APIs.guru OpenAPI Directory 전체(공개 API의 OpenAPI 명세 모음)를 받아 API 진열대 파일로 쓴다.
//   node scripts/import/api-apis-guru.ts
// 출처: https://api.apis.guru/v2/list.json (자료 CC0 1.0). API마다 '우선 판(preferred)' 하나만 싣는다.
import { type Item, fetchJson, hostOf, kindByKeywords, kindForGuru, main, makeItem, stripMarkdown, writeCatalog } from './api-lib.ts';

const LIST_URL = 'https://api.apis.guru/v2/list.json';

interface GuruInfo {
  title: string;
  description?: string;
  version?: string;
  contact?: { url?: string; name?: string };
  license?: { name?: string; url?: string };
  'x-apisguru-categories'?: string[];
  'x-logo'?: { url?: string };
  'x-origin'?: { url?: string; format?: string }[];
  'x-providerName': string;
  'x-serviceName'?: string;
  'x-unofficialSpec'?: boolean;
}

interface GuruVersion {
  added: string;
  updated: string;
  swaggerUrl: string;
  openapiVer: string;
  externalDocs?: { url?: string; description?: string };
  info: GuruInfo;
}

interface GuruApi {
  preferred: string;
  versions: Record<string, GuruVersion>;
}

// 사람이 볼 주소: 공식 문서 → 연락처 주소(명세를 옮긴 사람의 GitHub 등은 빼고) → 명세 원본 → 제공자 도메인.
export function humanUrl(v: GuruVersion): string {
  const ext = v.externalDocs?.url;
  if (ext && /^https?:\/\//.test(ext)) return ext;
  const contact = v.info.contact?.url;
  if (contact && /^https?:\/\//.test(contact) && !/github\.com\/(mermade|APIs-guru)|apis\.guru/i.test(contact)) return contact;
  const origin = v.info['x-origin']?.find((o) => o.url && /^https?:\/\//.test(o.url))?.url;
  if (origin) {
    const m = origin.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
    return m ? `https://github.com/${m[1]}/${m[2]}/blob/${m[3]}/${m[4]}` : origin;
  }
  return `https://${v.info['x-providerName']}`;
}

export function guruItem(key: string, api: GuruApi): Item | undefined {
  const v = api.versions[api.preferred];
  if (!v) return undefined;
  const info = v.info;
  const provider = info['x-providerName'];
  const description = stripMarkdown(info.description ?? '');
  const categories = info['x-apisguru-categories'] ?? [];
  const summary = description.length >= 10 ? description : `${info.title?.trim() || provider} (${provider}) — OpenAPI ${v.openapiVer} definition, version ${info.version ?? api.preferred}.`;
  const url = humanUrl(v);
  // 제목이 빈 명세가 몇 개 있다: 제공자·서비스 이름으로 채운다.
  const name = info.title?.trim() || [provider, info['x-serviceName']].filter(Boolean).join(' ');
  return makeItem({
    id: `apis-guru:${key}`,
    name,
    kind: kindForGuru(categories) ?? kindByKeywords(`${info.title} ${description}`),
    summary,
    url,
    source: { name: 'APIs.guru OpenAPI Directory', url: 'https://apis.guru' },
    metrics: { updatedAt: v.updated.slice(0, 10) },
    tags: ['openapi', ...categories.filter((c) => c.length > 1).map((c) => c.replace(/_/g, '-')), provider],
    preview: {
      type: 'api',
      provider,
      service: info['x-serviceName'],
      version: info.version,
      openapi: v.swaggerUrl,
      openapiVersion: v.openapiVer,
      logo: info['x-logo']?.url,
      specLicense: info.license?.name,
      unofficialSpec: info['x-unofficialSpec'] ? true : undefined,
      host: hostOf(url),
    },
    use: { docs: v.externalDocs?.url && /^https?:\/\//.test(v.externalDocs.url) ? v.externalDocs.url : undefined },
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main('api-apis-guru', async () => {
    const list = await fetchJson<Record<string, GuruApi>>(LIST_URL);
    const keys = Object.keys(list).sort();
    const items = keys.map((k) => guruItem(k, list[k] as GuruApi)).filter((x): x is Item => Boolean(x));
    // 키를 슬러그로 줄이면 드물게 겹친다 (대소문자만 다른 키). 겹치면 뒤쪽에 번호를 붙인다.
    const seen = new Map<string, number>();
    const unique = items.map((it) => {
      const n = (seen.get(it.id) ?? 0) + 1;
      seen.set(it.id, n);
      return n === 1 ? it : { ...it, id: `${it.id}-${n}` };
    });
    console.log(`  APIs.guru: API ${keys.length}개 → ${unique.length}개`);
    writeCatalog(
      {
        id: 'apis-guru',
        name: 'APIs.guru OpenAPI Directory',
        url: 'https://apis.guru',
        license: 'CC0-1.0 (directory data); each API has its own terms',
        note: 'Every API in list.json, preferred version only. Specs for Azure, AWS and Google services are kept and land on the cloud shelf.',
      },
      unique,
    );
  });
}
