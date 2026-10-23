// API 진열대 자료(data/catalog/api/*.json)가 스키마와 약속을 지키는지, 가져오기 도우미가 맞게 도는지.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { QUOTE_REJECT, ALL_CURATED, PROVIDER_OVERLAY } from '../../scripts/import/api-curated-data.ts';
import { isFirstParty, providerKind } from '../../scripts/import/api-curated.ts';
import { parseListPage } from '../../scripts/import/api-data-go-kr.ts';
import { humanUrl } from '../../scripts/import/api-apis-guru.ts';
import { krKind } from '../../scripts/import/api-kr-4kr.ts';
import {
  KINDS, clip, cmp, freeSentence, kindByKeywords, kindForGuru, kindForPublicApis, normUrl, safeId, usableDescription,
} from '../../scripts/import/api-lib.ts';
import { normAuth, readPublicApiRows } from '../../scripts/import/api-public-apis.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const DIR = join(ROOT, 'data', 'catalog', 'api');
const SCHEMA = JSON.parse(readFileSync(join(ROOT, 'schemas', 'catalog-api.json'), 'utf8'));
const INDEX_SCHEMA = JSON.parse(readFileSync(join(ROOT, 'schemas', 'catalog-api-index.json'), 'utf8'));

interface ItemLike {
  id: string; kind: string; summary: string; summaryKo?: string; written?: string; url: string; tags: string[];
  preview?: { type: string; freeTierQuote?: string; freeTierCheckedAt?: string; pricingUrl?: string; keyServerSide?: boolean };
}
interface FileLike { source: { id: string }; count: number; items: ItemLike[] }

const files = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
const catalogs = files.map((f) => ({ file: f, data: JSON.parse(readFileSync(join(DIR, f), 'utf8')) as FileLike }));
const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) as {
  total: number; subcategories: { id: string; count: number; sources: { id: string; count: number }[] }[];
};
const all = catalogs.flatMap((c) => c.data.items);

describe('API 자료 파일', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(SCHEMA);

  it.each(catalogs.map((c) => [c.file, c.data] as const))('%s 는 스키마를 지킨다', (_file, data) => {
    const ok = validate(data);
    expect(ok ? [] : (validate.errors ?? []).slice(0, 5)).toEqual([]);
  });

  it.each(catalogs.map((c) => [c.file, c.data] as const))('%s 의 count·파일 이름·정렬이 맞다', (file, data) => {
    expect(data.count).toBe(data.items.length);
    expect(`${data.source.id}.json`).toBe(file);
    const ids = data.items.map((i) => i.id);
    expect(ids).toEqual([...ids].sort(cmp));
  });

  it('id는 진열대 전체에서 하나뿐이고 출처 파일 이름으로 시작한다', () => {
    const ids = all.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of catalogs) for (const it of c.data.items) expect(it.id.startsWith(`${c.data.source.id}:`), it.id).toBe(true);
  });

  it('무료 문장은 공식 요금 쪽 주소·확인 날짜와 함께만 있고, 손으로 뺀 것은 없다', () => {
    for (const it of all) {
      const p = it.preview;
      if (!p?.freeTierQuote) continue;
      expect(p.pricingUrl, it.id).toMatch(/^https:\/\//);
      expect(p.freeTierCheckedAt, it.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.freeTierQuote).not.toMatch(/\?/);
      const key = it.id.slice(it.id.indexOf(':') + 1);
      expect(QUOTE_REJECT[key], it.id).toBeUndefined();
    }
  });

  it('AI API는 모두 비밀 키를 서버에만 두라는 표시가 있다', () => {
    const ai = all.filter((i) => i.kind.startsWith('ai-') && (i.id.startsWith('official:') || i.id.startsWith('models-dev:')));
    expect(ai.length).toBeGreaterThan(300);
    for (const it of ai) expect(it.preview?.keyServerSide, it.id).toBe(true);
  });

  it('손 목록의 한국어 한 줄에는 written 표시가 있다', () => {
    const bad = all.filter((i) => (i.id.startsWith('official:') || i.id.startsWith('models-dev:')) && i.summaryKo && i.written !== 'codeshopper');
    expect(bad.map((i) => i.id)).toEqual([]);
  });

  it('목차(index.json)는 스키마를 지키고 개수가 파일과 맞는다', () => {
    const v = new Ajv2020({ allErrors: true, strict: false }).compile(INDEX_SCHEMA);
    expect(v(index) ? [] : v.errors).toEqual([]);
    expect(index.total).toBe(all.length);
    for (const sub of index.subcategories) {
      const real = all.filter((i) => i.kind === sub.id).length;
      expect(sub.count, sub.id).toBe(real);
      expect(sub.sources.reduce((n, s) => n + s.count, 0), sub.id).toBe(real);
    }
  });

  it('큰 출처는 끝까지 받았고 소분류마다 상품이 있다', () => {
    const count = (id: string) => catalogs.find((c) => c.data.source.id === id)?.data.count ?? 0;
    expect(count('public-apis')).toBeGreaterThan(1900);
    expect(count('apis-guru')).toBeGreaterThan(2400);
    expect(count('models-dev')).toBeGreaterThan(150);
    expect(count('official')).toBeGreaterThan(180);
    expect(count('public-apis-4kr')).toBeGreaterThan(250);
    expect(count('data-go-kr')).toBeGreaterThan(3000);
    const counts = Object.fromEntries(index.subcategories.map((s) => [s.id, s.count]));
    for (const k of KINDS) expect(counts[k], k).toBeGreaterThan(0);
  });

  it('AI 언어 모델 진열대에 큰 회사가 빠지지 않았다', () => {
    const ids = new Set(all.map((i) => i.id));
    for (const id of ['openai', 'anthropic', 'google', 'mistral', 'cohere', 'xai', 'deepseek', 'groq', 'openrouter', 'upstage', 'perplexity'])
      expect(ids.has(`models-dev:${id}`), id).toBe(true);
    for (const id of ['clova-studio', 'replicate', 'elevenlabs', 'stability-ai', 'deepl', 'exa', 'voyage', 'stripe', 'portone'])
      expect(ids.has(`official:${id}`), id).toBe(true);
  });
});

describe('API 가져오기 도우미', () => {
  it('손 목록 슬러그는 겹치지 않고 덧씌우기는 모두 소분류를 안다', () => {
    const slugs = ALL_CURATED.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of ALL_CURATED) expect(KINDS, c.slug).toContain(c.kind);
    for (const o of Object.values(PROVIDER_OVERLAY)) if (o.kind) expect(KINDS).toContain(o.kind);
  });

  it('주소 비교는 스킴·www·끝 빗금·추적 쿼리를 무시한다', () => {
    expect(normUrl('https://www.Example.com/docs/?utm_source=x')).toBe('example.com/docs');
    expect(normUrl('http://example.com/a#top')).toBe('example.com/a');
  });

  it('id 슬러그는 주소 한 칸에 들어가는 글자만 남긴다', () => {
    expect(safeId('apis-guru:azure.com:network-applicationGateway')).toBe('apis-guru:azure.com-network-applicationgateway');
    expect(safeId('x:Owner/Repo')).toBe('x:owner--repo');
    expect(() => safeId('nosource')).toThrow();
  });

  it('300자를 넘는 원문은 문장 끝에서 자른다', () => {
    const long = `${'A sentence here. '.repeat(30)}`;
    expect(clip(long).length).toBeLessThanOrEqual(300);
    expect(clip(long).endsWith('.')).toBe(true);
  });

  it('사이트 소개 칸의 봇 막기·코드 조각은 쓰지 않는다', () => {
    expect(usableDescription('Just a moment...')).toBeUndefined();
    expect(usableDescription('const router = useRouter()...')).toBeUndefined();
    expect(usableDescription('/ Hide breadcrumb / .fern-breadcrumb-item |')).toBeUndefined();
    expect(usableDescription('Run open-source machine learning models with a cloud API')).toBe('Run open-source machine learning models with a cloud API');
  });

  it('요금 쪽에서 구체적인 무료 문장만 고르고 질문·다른 상품 이야기는 버린다', () => {
    expect(freeSentence('Pricing. What is included in the $200 free credit? Free $200 Credit then pay-as-you-go. Contact us.')).toBe(
      'Free $200 Credit then pay-as-you-go.',
    );
    expect(freeSentence('We offer ChatGPT for Teachers, a free plan for verified U.S. teachers. Buy now.')).toBeUndefined();
    expect(freeSentence('Feel free to contact our sales team for 10 seats.')).toBeUndefined();
    expect(freeSentence(undefined)).toBeUndefined();
  });

  it('public-apis 계열 표를 읽는다 (광고 표·분류 없는 줄은 버린다)', () => {
    const md = [
      '### Animals',
      'API | Description | Auth | HTTPS | CORS',
      '|:---|:---|:---|:---|:---|',
      '| [Cat Facts](https://catfact.ninja/) | Daily cat facts | No | Yes | No |',
      '| [Dogs](https://dog.ceo/dog-api/) | Based on the Stanford Dogs Dataset | `apiKey` | Yes | Unknown |',
      '',
      '### Sponsors',
      '| API | Description | Call this API |',
      '|---|---|---|',
      '| [Ad](https://ad.example) | Buy now | [call](https://x) |',
    ].join('\n');
    const rows = readPublicApiRows(md);
    expect(rows.map((r) => [r.name, r.auth, r.https, r.cors])).toEqual([
      ['Cat Facts', 'none', true, 'no'],
      ['Dogs', 'apiKey', true, 'unknown'],
    ]);
    expect(normAuth('✕')).toBe('website');
  });

  it('분류를 소분류로 옮긴다', () => {
    expect(kindForPublicApis('Machine Learning')).toBe('ai-other');
    expect(kindForPublicApis('Geocoding')).toBe('maps');
    expect(kindForPublicApis('Sponsors')).toBeUndefined();
    expect(kindForGuru(['analytics', 'media'])).toBe('media');
    expect(kindForGuru(['analytics'])).toBe('business');
    expect(kindForGuru([])).toBeUndefined();
    expect(kindByKeywords('Payment platform')).toBe('payments');
    expect(kindByKeywords('Something else')).toBe('dev');
  });

  it('한국 목록은 공공기관 주소와 회사 주소를 나눈다', () => {
    expect(krKind('카카오', 'https://www.data.go.kr/x')).toBe('kr-public');
    expect(krKind('교통', 'https://lab.odsay.com/')).toBe('kr-dev');
    expect(krKind('교통', 'https://www.its.go.kr/opendata/')).toBe('kr-public');
    expect(krKind('금융 & 결제', 'https://developers.tosspayments.com')).toBe('kr-dev');
  });

  it('models.dev 제공자는 자기 모델 회사와 호스팅을 나눈다', () => {
    expect(isFirstParty('openai')).toBe(true);
    expect(isFirstParty('kimi-code-plan-cn')).toBe(true);
    expect(isFirstParty('novita-ai')).toBe(false);
    expect(providerKind('google-vertex', PROVIDER_OVERLAY['google-vertex'])).toBe('ai-inference');
    expect(providerKind('openrouter', PROVIDER_OVERLAY['openrouter'])).toBe('ai-inference');
    expect(providerKind('deepseek', undefined)).toBe('ai-llm');
  });

  it('APIs.guru 사람용 주소는 문서 → 연락처 → 명세 원본(GitHub 보기) 순', () => {
    const base = { added: '', updated: '', swaggerUrl: '', openapiVer: '3.0.0' };
    expect(humanUrl({ ...base, externalDocs: { url: 'https://docs.x.com' }, info: { title: 't', 'x-providerName': 'x.com' } })).toBe('https://docs.x.com');
    expect(
      humanUrl({ ...base, info: { title: 't', 'x-providerName': 'azure.com', 'x-origin': [{ url: 'https://raw.githubusercontent.com/Azure/specs/main/a.json' }] } }),
    ).toBe('https://github.com/Azure/specs/blob/main/a.json');
    expect(humanUrl({ ...base, info: { title: 't', 'x-providerName': 'y.com' } })).toBe('https://y.com');
  });

  it('공공데이터포털 목록 쪽을 읽는다', () => {
    const html = `<p class="tit">오픈API <span> (12,002건) </span></p>
      <div class="apply-result-item"><div class="in-result-item"><div class="apply-result-category">
      <span class="krds-badge">환경기상</span><span class="krds-badge">공공기관</span></div>
      <div class="apply-result-link"><span class="krds-badge" data-ext="XML">XML</span><span data-ext="JSON">JSON</span>
      <a href="/data/15073861/openapi.do"> 한국환경공단_에어코리아_대기오염정보 </a></div>
      <span class="apply-result-summary"> 대기오염정보 조회 서비스 </span>
      <ul><li><strong>제공기관</strong> 한국환경공단 </li><li><strong>수정일</strong> 2026-06-30 </li>
      <li><strong>조회수</strong> 369,808회 </li><li><strong>활용신청</strong> 58,841건 </li>
      <li><strong>키워드</strong> 미세먼지,오존 </li></ul></div></div>`;
    const page = parseListPage(html);
    expect(page.total).toBe(12002);
    expect(page.items).toEqual([
      {
        pk: '15073861', title: '한국환경공단_에어코리아_대기오염정보', summary: '대기오염정보 조회 서비스', category: '환경기상', orgType: '공공기관',
        formats: ['XML', 'JSON'], provider: '한국환경공단', updatedAt: '2026-06-30', views: 369808, applications: 58841, keywords: ['미세먼지', '오존'],
      },
    ]);
  });
});
