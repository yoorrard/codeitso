// 한국 공개 API 목록 yybmion/public-apis-4Kr (MIT) README의 모든 줄을 받아 쓴다.
//   node scripts/import/api-kr-4kr.ts
// 공공기관 주소(.go.kr·.or.kr·.re.kr …)나 공공 분야 절의 줄은 '한국 공공데이터', 회사 API는 '한국 개발자 API'에 둔다.
// 손 목록(api-curated-data.ts)에 같은 상품이 있으면(이름 별칭·같은 주소) 이 목록의 줄은 건너뛴다.
import { ALL_CURATED } from './api-curated-data.ts';
import { type Item, type Kind, fetchText, hostOf, main, makeItem, normUrl, writeCatalog } from './api-lib.ts';
import { readPublicApiRows } from './api-public-apis.ts';

const REPO = 'yybmion/public-apis-4Kr';
const README = `https://raw.githubusercontent.com/${REPO}/main/README.md`;

// 공공 분야 절: 주소가 회사 것이 아니면 공공데이터로 본다.
const PUBLIC_SECTIONS = new Set([
  '정부 & 공공기관', '지역별 공공데이터', '날씨 & 환경', '의료 & 보건', '공공안전', '법률', '재정 & 예산', '통계 & 지표',
  '데이터셋 & 데이터 포털', '농수산', '과학 & 연구', '생활경제', '에너지 & 전력', '항공', '물류 인프라 & 통관', '교육',
  '부동산', '문화 & 관광', '교통', '지도 & 위치',
]);

// 공공기관 주소. 공기업은 .co.kr·.com도 쓴다 (한국전력·도로공사·코레일·공항공사·석유공사·거래소).
const PUBLIC_HOST = /\.(go|or|re|ac|mil)\.kr$|(^|\.)(kosis\.kr|data4library\.kr|riss\.kr|opinet\.co\.kr|kepco\.co\.kr|ex\.co\.kr|korail\.com|airport\.kr|airport\.co\.kr|krx\.co\.kr|kric\.go\.kr|seoul\.go\.kr|juso\.go\.kr|vworld\.kr|kdata\.or\.kr|nl\.go\.kr|safekorea\.go\.kr|bigkinds\.or\.kr)$/;

// 공공 분야 절에 있어도 회사·외국 서비스인 주소.
const COMPANY_HOST = /(^|\.)(airbnb\.com|kakaomobility\.com|kakao\.com|naver\.com|ncloud\.com|odsay\.com|kia\.com|hyundai\.com|class101\.net|huggingface\.co|dbpia\.co\.kr|github\.com|tmap\.co\.kr|tmapmobility\.com|oopy\.io|logi-spot\.com)$/;

export function krKind(section: string, url: string): Kind {
  const host = hostOf(url);
  if (PUBLIC_HOST.test(host)) return 'kr-public';
  if (COMPANY_HOST.test(host)) return 'kr-dev';
  return PUBLIC_SECTIONS.has(section) ? 'kr-public' : 'kr-dev';
}

const koTag = (s: string) => s.toLowerCase().replace(/\s*&\s*/g, '-').replace(/[\s/·]+/g, '-').replace(/^-+|-+$/g, '');

function slugFromUrl(url: string): string {
  return normUrl(url)
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/[-.]+$/g, '');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main('api-kr-4kr', async () => {
    const md = await fetchText(README);
    const rows = readPublicApiRows(md);
    const aliases = new Set(ALL_CURATED.flatMap((c) => [c.name, ...(c.aliases ?? [])]));
    const curatedUrls = new Set(ALL_CURATED.flatMap((c) => [normUrl(c.url), normUrl(c.docs)]));
    const seen = new Set<string>();
    const used = new Map<string, number>();
    const skipped: string[] = [];
    const items: Item[] = [];
    for (const r of rows) {
      const key = normUrl(r.url);
      if (aliases.has(r.name) || curatedUrls.has(key)) {
        skipped.push(r.name);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      const base = slugFromUrl(r.url) || 'api';
      const n = (used.get(base) ?? 0) + 1;
      used.set(base, n);
      items.push(
        makeItem({
          id: `public-apis-4kr:${n === 1 ? base : `${base}-${n}`}`,
          name: r.name,
          kind: krKind(r.section, r.url),
          summary: r.description,
          url: r.url,
          source: { name: 'public-apis-4Kr', url: `https://github.com/${REPO}` },
          tags: ['korea', koTag(r.section), r.auth ? `auth-${r.auth.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined].filter(
            (t): t is string => Boolean(t),
          ),
          preview: { type: 'api', auth: r.auth, listCategory: r.section },
        }),
      );
    }
    console.log(`  표 ${rows.length}줄 → ${items.length}개 (손 목록과 겹쳐 건너뜀: ${skipped.join(', ') || '없음'})`);
    writeCatalog(
      {
        id: 'public-apis-4kr',
        name: 'public-apis-4Kr (한국 공개 API 목록)',
        url: `https://github.com/${REPO}`,
        license: 'MIT (list text); each API has its own terms',
        note: 'Every row of the Korean README tables. Rows that duplicate an entry of the hand-checked list (official.json) are skipped.',
      },
      items,
    );
  });
}
