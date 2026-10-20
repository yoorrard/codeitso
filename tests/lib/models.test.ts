// AI 모델·요금 순수 계산 (src/lib/catalog/models.ts, D141): 줄 만들기·새것 먼저·값 쓰기·거르기·정렬·/models 주소.
import { describe, expect, it } from 'vitest';
import type { BundleRow, ModelFacts, ModelProvider, ModelRow } from '../../src/lib/catalog/models.ts';
import {
  DEFAULT_QUERY,
  MAJOR_PROVIDERS,
  filterOf,
  filterRows,
  matchesModel,
  modelProviderOf,
  needsHosts,
  pickList,
  readModelQuery,
  rowOf,
  scopeProviders,
  slimRow,
  sortNewest,
  sortRows,
  tokens,
  usd,
  writeModelQuery,
} from '../../src/lib/catalog/models.ts';

const facts = (over: Partial<ModelFacts> = {}): ModelFacts => ({
  id: 'm',
  name: 'M',
  limit: {},
  modalities: { input: ['text'], output: ['text'] },
  reasoning: false,
  tool_call: false,
  attachment: false,
  open_weights: false,
  ...over,
});

const row = (id: string, over: Partial<BundleRow> = {}): BundleRow => ({ id, name: id.toUpperCase(), mi: ['text'], mo: ['text'], p: 'openai', ...over });

describe('모델 줄', () => {
  it('models.dev 값을 짧은 칸으로 옮기고 빈 칸은 뺀다', () => {
    const r = rowOf(
      facts({
        id: 'claude-x',
        name: 'Claude X',
        cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75, context_over_200k: { input: 6, output: 22.5 } },
        limit: { context: 200000, output: 64000 },
        modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
        reasoning: true,
        tool_call: true,
        knowledge: '2025-03',
        release_date: '2026-01-02',
        status: 'beta',
      }),
    );
    expect(r).toEqual({
      id: 'claude-x',
      name: 'Claude X',
      in: 3,
      out: 15,
      cr: 0.3,
      cw: 3.75,
      big: { in: 6, out: 22.5 },
      ctx: 200000,
      max: 64000,
      mi: ['text', 'image', 'pdf'],
      mo: ['text'],
      reason: true,
      tools: true,
      knowledge: '2025-03',
      release: '2026-01-02',
      status: 'beta',
    });
    expect(rowOf(facts({ cost: { input: 0, output: 0 } }))).toMatchObject({ in: 0, out: 0 });
    expect(Object.keys(rowOf(facts()))).toEqual(['id', 'name', 'mi', 'mo']);
  });

  it('비교 묶음 줄은 비교 표에 쓰는 칸만 싣는다', () => {
    const r: ModelRow = { id: 'a', name: 'A', mi: ['text'], mo: ['text'], in: 1, cw: 2, big: { in: 3 }, au: { in: 4 }, knowledge: '2025', updated: '2026-01-01', files: true, release: '2026-01-01' };
    expect(slimRow(r, 'x')).toEqual({ id: 'a', name: 'A', mi: ['text'], mo: ['text'], in: 1, release: '2026-01-01', p: 'x' });
  });

  it('새 모델이 앞 (출시일 → 고친 날 → 이름), 달만 있는 날짜도 견준다', () => {
    const rows = [row('a', { release: '2025-01-01' }), row('b', { release: '2026-02' }), row('c', { release: '2026-02-03' }), row('d'), row('e', { release: '2025-01-01', updated: '2025-05-01' })];
    expect(sortNewest(rows).map((r) => r.id)).toEqual(['c', 'b', 'e', 'a', 'd']);
  });

  it('담기 창 목록은 지원이 끝난 모델을 빼되, 지금 고른 것은 남긴다', () => {
    const rows = [row('old', { status: 'deprecated', release: '2026-09-01' }), row('new', { release: '2026-01-01' })];
    expect(pickList(rows).map((r) => r.id)).toEqual(['new']);
    expect(pickList(rows, 'old').map((r) => r.id)).toEqual(['old', 'new']);
  });

  it('상품 id에서 models.dev 제공자를 꺼낸다', () => {
    expect(modelProviderOf('models-dev:anthropic')).toBe('anthropic');
    expect(modelProviderOf('models-dev:wafer.ai')).toBe('wafer.ai');
    expect(modelProviderOf('official:reka')).toBeNull();
    expect(modelProviderOf('models-dev:')).toBeNull();
    expect(modelProviderOf('models-dev:../x')).toBeNull();
  });
});

describe('값 쓰기', () => {
  it('달러: 1 이상은 둘째 자리, 1 아래는 넷째 자리까지, 끝 0은 뗀다', () => {
    expect(usd(3)).toBe('$3');
    expect(usd(12.5)).toBe('$12.5');
    expect(usd(1.254)).toBe('$1.25');
    expect(usd(0.075)).toBe('$0.075');
    expect(usd(0.0375)).toBe('$0.0375');
    expect(usd(0)).toBe('$0');
    expect(usd(120)).toBe('$120');
  });

  it('토큰: 10진 K·M', () => {
    expect(tokens(200000)).toBe('200K');
    expect(tokens(131072)).toBe('131K');
    expect(tokens(1000000)).toBe('1M');
    expect(tokens(1048576)).toBe('1.05M');
    expect(tokens(950)).toBe('950');
  });
});

describe('비교 거르기·정렬', () => {
  const rows = [
    row('gpt-a', { name: 'GPT-5.1 mini', in: 0.25, out: 2, ctx: 400000, mi: ['text', 'image'], tools: true, reason: true, release: '2026-03-01' }),
    row('claude-b', { name: 'Claude B', p: 'anthropic', in: 3, out: 15, ctx: 200000, mi: ['text', 'image', 'pdf'], tools: true, release: '2026-05-01' }),
    row('llama-c', { name: 'Llama C', p: 'groq', in: 0.05, ctx: 128000, open: true, release: '2025-01-01' }),
    row('old-d', { name: 'Old D', in: 1, out: 1, status: 'deprecated', release: '2024-01-01' }),
    row('free-e', { name: 'No price E', release: '2026-06-01' }),
  ];
  const ids = (r: readonly BundleRow[]) => r.map((x) => x.id);

  it('지원이 끝난 모델은 켤 때만, 나머지는 모두 그리고', () => {
    expect(ids(filterRows(rows, {}))).toEqual(['gpt-a', 'claude-b', 'llama-c', 'free-e']);
    expect(ids(filterRows(rows, { deprecated: true }))).toContain('old-d');
    expect(ids(filterRows(rows, { inputs: ['image', 'pdf'] }))).toEqual(['claude-b']);
    expect(ids(filterRows(rows, { tools: true, reason: true }))).toEqual(['gpt-a']);
    expect(ids(filterRows(rows, { open: true }))).toEqual(['llama-c']);
    expect(ids(filterRows(rows, { maxIn: 1 }))).toEqual(['gpt-a', 'llama-c']);
    expect(ids(filterRows(rows, { minCtx: 200000 }))).toEqual(['gpt-a', 'claude-b']);
    expect(ids(filterRows(rows, { providers: new Set(['anthropic', 'groq']) }))).toEqual(['claude-b', 'llama-c']);
  });

  it('이름·id 찾기는 띄어쓰기·기호를 무시하고 낱말마다 본다', () => {
    expect(matchesModel(rows[0] as BundleRow, 'gpt 5.1')).toBe(true);
    expect(matchesModel(rows[0] as BundleRow, 'gpt51mini')).toBe(true);
    expect(matchesModel(rows[0] as BundleRow, 'claude')).toBe(false);
    expect(ids(filterRows(rows, { q: 'llama' }))).toEqual(['llama-c']);
  });

  it('정렬: 값이 없는 모델은 방향과 상관없이 끝에', () => {
    const live = filterRows(rows, {});
    expect(ids(sortRows(live, 'in', 'asc'))).toEqual(['llama-c', 'gpt-a', 'claude-b', 'free-e']);
    expect(ids(sortRows(live, 'in', 'desc'))).toEqual(['claude-b', 'gpt-a', 'llama-c', 'free-e']);
    expect(ids(sortRows(live, 'out', 'asc'))).toEqual(['gpt-a', 'claude-b', 'free-e', 'llama-c']);
    expect(ids(sortRows(live, 'ctx', 'desc'))).toEqual(['gpt-a', 'claude-b', 'llama-c', 'free-e']);
    expect(ids(sortRows(live, 'release', 'desc'))).toEqual(['free-e', 'claude-b', 'gpt-a', 'llama-c']);
  });
});

describe('/models 주소와 회사 고르기', () => {
  const providers: ModelProvider[] = [
    { id: 'openai', item: 'models-dev:openai', name: 'OpenAI', sub: 'ai-llm', direct: true, n: 3, live: 2 },
    { id: 'anthropic', item: 'models-dev:anthropic', name: 'Anthropic', sub: 'ai-llm', direct: true, n: 2, live: 2 },
    { id: 'sakana', item: 'models-dev:sakana', name: 'Sakana', sub: 'ai-llm', direct: true, n: 1, live: 1 },
    { id: 'groq', item: 'models-dev:groq', name: 'Groq', sub: 'ai-inference', direct: false, n: 5, live: 5 },
  ];

  it('기본값은 주소에 싣지 않고, 읽으면 같은 상태가 된다', () => {
    expect(writeModelQuery(DEFAULT_QUERY)).toBe('');
    expect(readModelQuery('')).toEqual(DEFAULT_QUERY);
    const q = { ...DEFAULT_QUERY, scope: { one: 'groq' }, inputs: ['image' as const, 'pdf' as const], tools: true, maxIn: 3, minCtx: 200000, deprecated: true, q: 'llama 3', sort: 'in' as const, dir: 'desc' as const };
    const s = writeModelQuery(q);
    expect(s).toBe('p=groq&in=image%2Cpdf&f=tools&max=3&ctx=200000&old=1&q=llama%203&sort=in&dir=desc');
    expect(readModelQuery(`?${s}`)).toEqual(q);
  });

  it('모르는 값은 버린다', () => {
    expect(readModelQuery('?p=../x&in=text,smell&max=7&ctx=5&sort=price&dir=up')).toEqual(DEFAULT_QUERY);
    expect(readModelQuery('?sort=in').dir).toBe('asc');
  });

  it('회사 고르기 → 보일 제공자, 호스팅 묶음이 필요한지', () => {
    expect([...scopeProviders('major', providers)]).toEqual(MAJOR_PROVIDERS.filter((p) => p === 'openai' || p === 'anthropic'));
    expect([...scopeProviders('direct', providers)]).toEqual(['openai', 'anthropic', 'sakana']);
    expect(scopeProviders('all', providers).size).toBe(4);
    expect([...scopeProviders({ one: 'groq' }, providers)]).toEqual(['groq']);
    expect(scopeProviders({ one: 'nope' }, providers).size).toBe(0);
    expect(needsHosts(scopeProviders('direct', providers), providers)).toBe(false);
    expect(needsHosts(scopeProviders('all', providers), providers)).toBe(true);
    expect(filterOf({ ...DEFAULT_QUERY, maxIn: 1 }, providers).maxIn).toBe(1);
  });
});
