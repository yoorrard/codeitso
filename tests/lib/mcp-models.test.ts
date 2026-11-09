// MCP 새 도구 (D156): AI 모델 찾기(codeitso_find_models)와 장바구니 링크 만들기(codeitso_make_cart_link), 그리고 요약·키트 파일 나누기.
import { describe, expect, it } from 'vitest';
import type { FindModelsArgs } from '../../src/lib/mcp/models.ts';
import { compareQuery, findModels } from '../../src/lib/mcp/models.ts';
import { renderCartLink, renderDetails, renderModels } from '../../src/lib/mcp/render.ts';
import type { CatalogItem } from '../../src/lib/catalog/types.ts';
import type { ToolContext } from '../../src/lib/mcp/tools.ts';
import { LIMITS, ToolError, apiFactsOf, connectionOf, fontFactsOf, getKits, getMaterials, makeCartLink, searchMaterials } from '../../src/lib/mcp/tools.ts';
import { readShareEntries } from '../../src/lib/share.ts';
import { FILES } from '../../src/lib/routes.ts';
import { ITEMS, SITE, fixtureFiles, fixtureLoader } from './mcp-fixture.ts';

function ctx(files = fixtureFiles()): ToolContext & { reads: string[] } {
  const load = fixtureLoader(files);
  return { load, site: SITE, reads: load.reads };
}

const BASE: FindModelsArgs = { scope: 'major', inputs: [], outputs: [], reasoning: false, toolCalling: false, openWeights: false, includeDeprecated: false, sort: 'newest', limit: 10, offset: 0 };
const ids = async (args: Partial<FindModelsArgs>): Promise<string[]> => (await findModels(ctx(), { ...BASE, ...args })).items.map((m) => m.id);

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ToolError) return e.code;
    throw e;
  }
  return 'ok';
}

describe('codeitso_find_models', () => {
  it('기본은 주요 회사의 지원 중인 모델을 새것부터, 직접 만든 회사 모두(direct)는 주요가 아닌 회사도', async () => {
    expect(await ids({})).toEqual(['claude-new', 'gpt-mini', 'gpt-image']);
    expect(await ids({ scope: 'direct' })).toEqual(['tiny-1', 'claude-new', 'gpt-mini', 'gpt-image']);
    expect(await ids({ includeDeprecated: true })).toContain('claude-old');
  });

  it('입력·출력 종류, 추론·도구 호출·공개 가중치, 가격·컨텍스트로 거른다', async () => {
    expect(await ids({ inputs: ['pdf'] })).toEqual(['claude-new']);
    expect(await ids({ outputs: ['image'] })).toEqual(['gpt-image']);
    expect(await ids({ reasoning: true })).toEqual(['claude-new']);
    expect(await ids({ toolCalling: true })).toEqual(['claude-new', 'gpt-mini']);
    expect(await ids({ scope: 'direct', openWeights: true })).toEqual(['tiny-1']);
    expect(await ids({ maxInputPrice: 1 })).toEqual(['gpt-mini']);
    expect(await ids({ maxOutputPrice: 15 })).toEqual(['claude-new', 'gpt-mini']);
    expect(await ids({ minContext: 150_000 })).toEqual(['claude-new']);
    expect(await ids({ query: 'gpt mini' })).toEqual(['gpt-mini']);
  });

  it('가격은 싼 것부터, 컨텍스트는 큰 것부터 (값이 없는 모델은 끝에)', async () => {
    expect(await ids({ sort: 'input_price' })).toEqual(['gpt-mini', 'claude-new', 'gpt-image']);
    expect(await ids({ sort: 'context' })).toEqual(['claude-new', 'gpt-mini', 'gpt-image']);
  });

  it('회사 하나: 그 회사 파일만 읽는다 (호스팅·라우터 포함), 모르는 회사는 오류', async () => {
    const c = ctx();
    const r = await findModels(c, { ...BASE, provider: 'openrouter' });
    expect(r.items.map((m) => [m.id, m.provider, m.material_id])).toEqual([['anthropic/claude-new', 'openrouter', 'models-dev:openrouter']]);
    expect(c.reads.some((p) => p.endsWith('/direct.json'))).toBe(false);
    const err = await findModels(ctx(), { ...BASE, provider: 'nope' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ToolError);
    // 자료에 있는 주요 회사만 권하고, 모든 회사는 scope=direct라고 알린다
    expect((err as ToolError).message).toContain('Major providers: openai, anthropic.');
    expect((err as ToolError).message).toContain('scope=direct');
  });

  it('결과 한 줄: 가격·컨텍스트·입출력·기능·출시, 제공자 재료 id, 같은 조건의 비교 쪽 주소', async () => {
    const r = await findModels(ctx(), { ...BASE, inputs: ['image'], maxInputPrice: 3, minContext: 128_000, sort: 'input_price', limit: 1 });
    expect(r.items[0]).toEqual({
      id: 'gpt-mini',
      name: 'GPT Mini',
      provider: 'openai',
      provider_name: 'OpenAI',
      material_id: 'models-dev:openai',
      input_price: 0.15,
      output_price: 0.6,
      context: 128_000,
      inputs: ['text', 'image'],
      outputs: ['text'],
      tool_calling: true,
      release: '2026-05-01',
    });
    expect(r).toMatchObject({ source: 'models.dev', fetched: '2026-11-08', total: 2, has_more: true, next_offset: 1 });
    expect(r.compare_url).toBe(`${SITE}/models?in=image&max=3&ctx=128000&sort=in`);
    const md = renderModels(r);
    expect(md).toContain('**GPT Mini** `gpt-mini` · OpenAI `models-dev:openai` · in $0.15 / out $0.6 · context 128K');
    expect(md).toContain(`Compare on codeitso: ${r.compare_url}`);
    expect(md).not.toContain('price of $0');
    expect(r.compare_omits).toBeUndefined();
  });

  it('사이트 주소가 받지 않는 값(단계 밖 가격·컨텍스트, 출력 종류·가격)은 비교 쪽 주소에 싣지 않고 알린다', async () => {
    const { query: q, omitted } = compareQuery({ ...BASE, maxInputPrice: 2, maxOutputPrice: 5, minContext: 100_000, outputs: ['image'], provider: 'anthropic', query: 'claude' });
    expect(q.maxIn).toBeUndefined();
    expect(q.minCtx).toBeUndefined();
    expect(q.scope).toEqual({ one: 'anthropic' });
    expect(q.q).toBe('claude');
    // 싣지 못한 거르기는 이름을 돌려주고, 결과 글에 알린다
    expect(omitted).toEqual(['max_input_price=2', 'min_context=100000', 'max_output_price=5', 'outputs=image']);
    expect(compareQuery({ ...BASE, maxInputPrice: 3 }).omitted).toEqual([]);
    const r = await findModels(ctx(), { ...BASE, outputs: ['image'] });
    expect(r.compare_omits).toEqual(['outputs=image']);
    expect(renderModels(r)).toContain('The website link does not carry these filters: outputs=image');
  });

  it('입력 가격 0달러 모델이 보이면 출처 값임을 알리고 확인하라고 적는다 (출력만 0인 임베딩은 아니다)', async () => {
    const files = fixtureFiles();
    const direct = structuredClone(files.get('/catalog/models/direct.json')) as { rows: { id: string; in?: number }[] };
    const tiny = direct.rows.find((r) => r.id === 'tiny-1');
    if (tiny) tiny.in = 0;
    files.set('/catalog/models/direct.json', direct);
    expect(renderModels(await findModels(ctx(files), { ...BASE, scope: 'direct', sort: 'input_price', limit: 1 }))).toContain('price of $0 is the value models.dev lists');
  });

  it('맞는 모델이 없으면 안내, 끝을 넘는 offset은 오류', async () => {
    const r = await findModels(ctx(), { ...BASE, minContext: 10_000_000 });
    expect(r.total).toBe(0);
    expect(renderModels(r)).toContain('No models matched');
    expect(await code(findModels(ctx(), { ...BASE, offset: 5 }))).toBe('offset');
  });
});

describe('codeitso_make_cart_link', () => {
  it('고른 재료와 모델로 사이트 장바구니 링크를 만든다 (같은 id는 한 번, 꼴이 틀린 id는 빼고 알린다)', () => {
    const r = makeCartLink(ctx(), { items: [{ id: 'a:weather' }, { id: 'models-dev:anthropic', model: 'claude-new' }, { id: 'a:weather' }, { id: '<b>x' }, { id: 'd:font', model: 'bad model' }, { id: 'npm:y', model: 'm'.repeat(161) }] });
    expect(r.count).toBe(4);
    expect(r.skipped).toEqual(['x']);
    expect(r.cart_url.startsWith(`${SITE}/cart#s=`)).toBe(true);
    expect(readShareEntries(r.cart_url.slice(r.cart_url.indexOf('#') + 1))).toEqual([{ id: 'a:weather' }, { id: 'models-dev:anthropic', model: 'claude-new' }, { id: 'd:font' }, { id: 'npm:y' }]);
    const md = renderCartLink(r);
    expect(md).toContain('Cart link with 4 materials');
    expect(md).toContain(r.cart_url);
    expect(md).toContain('Skipped');
  });

  it(`${LIMITS.cartLink}개까지, 쓸 수 있는 id가 없으면 오류`, () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `npm:p${i}` }));
    expect(makeCartLink(ctx(), { items: many }).count).toBe(LIMITS.cartLink);
    expect(() => makeCartLink(ctx(), { items: [{ id: '<x>' }] })).toThrow(ToolError);
  });
});

describe('요약·키트 파일 나누기 (첫 요청 CPU)', () => {
  it('검색은 키트 파일을 읽지 않고, 키트 도구만 읽는다', async () => {
    const c = ctx();
    await searchMaterials(c, { query: 'weather', limit: 5, offset: 0 });
    expect(c.reads).toContain(FILES.agentSummary);
    expect(c.reads).not.toContain(FILES.agentKits);
    const k = ctx();
    expect(await getKits(k, 'weather-app')).toMatchObject({ id: 'weather-app' });
    expect(k.reads).toContain(FILES.agentKits);
  });
});

describe('자세히: 연결·API·폰트 정보 (사이트 상세와 같은 자료, D157)', () => {
  const base = { ...(ITEMS[0] as CatalogItem), rel: [] as [string, string][] };
  it('MCP 서버: 원격 주소(https·숨은 글자 없음만)·패키지·전송 방식·레지스트리 이름', () => {
    const d = { ...base, kind: 'mcp', category: 'ai' as const, preview: { type: 'mcp', remotes: [{ type: 'streamable-http', url: 'https://x.example/mcp' }, { url: 'https://bad​.example' }, { url: 'http://plain.example' }], packages: [{ registryType: 'npm', identifier: '@x/server' }], transports: ['stdio'], registryName: 'io.x/server', requiresKey: true } };
    expect(connectionOf(d)).toEqual({ transports: ['stdio'], remote_urls: ['https://x.example/mcp'], packages: ['npm: @x/server'], registry_name: 'io.x/server', requires_key: true });
    expect(connectionOf(base)).toBeUndefined();
  });

  it('API: 기본 주소·환경 변수 이름(꼴이 맞는 것만)·OpenAPI·무료 한도 원문', () => {
    const d = { ...base, preview: { type: 'api', apiBase: 'https://api.x.example/v1', env: ['X_API_KEY', 'bad name'], openapi: 'https://x.example/openapi.json', freeTierQuote: '1,000 calls / day free', freeTierCheckedAt: '2026-10-01', formats: ['JSON'], auth: 'apiKey', keyServerSide: true } };
    expect(apiFactsOf(d)).toEqual({ base_url: 'https://api.x.example/v1', auth: 'apiKey', env_vars: ['X_API_KEY'], key_server_side: true, formats: ['JSON'], openapi_url: 'https://x.example/openapi.json', free_tier: { quote: '1,000 calls / day free', checked_at: '2026-10-01' } });
  });

  it('폰트: 굵기 순서대로, 가변 축, 한글 글자 묶음이 있는가', () => {
    const d = { ...base, kind: 'fonts', category: 'design' as const, preview: { type: 'font', weights: [700, 400], axes: [{ tag: 'wght', min: 100, max: 900 }], subsets: ['latin', 'korean'], designers: ['A'] } };
    expect(fontFactsOf(d)).toEqual({ korean: true, weights: [400, 700], variable_axes: ['wght 100–900'], subsets: ['latin', 'korean'], designers: ['A'] });
  });

  it('마크다운: 연결·API·무료 한도(제3자 글 인용)·폰트 줄, 같은 열쇠는 기타 사실에 두 번 싣지 않는다', async () => {
    const files = fixtureFiles();
    const r = await getMaterials(ctx(files), ['a:weather']);
    const md = renderDetails(r);
    expect(md).toContain('API: auth: apiKey · HTTPS yes · CORS yes');
    expect(md).not.toMatch(/Facts:.*auth:/);
  });
});
