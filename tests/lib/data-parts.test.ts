// 화면 자료 나누기 (D82, 설계서 L-08): 단계 화면이 싣는 가벼운 자료(src/lib/data.ts)로도 엔진 결과가 모든 칸을 실은 자료와 같아야 한다.
import { describe, expect, it } from 'vitest';
import { catalog as stageCatalog, data as stageData } from '../../src/lib/data.ts';
import { catalog as fullCatalog, data as fullData } from '../../src/lib/data-full.ts';
import { ALIAS_TOOL_PART, CONCEPT_CORE, CONCEPT_DETAIL, PRODUCT_CHECK_ONLY, conceptPart, guardMissing, joinConcepts, screenProducts, toolAliases } from '../../src/lib/data-parts.ts';
import { conversationCards, evaluate, makeCatalog, receiptModel, renderPack, renderReceiptText } from '../../src/lib/engine/index.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, loadData, readJson } from '../../scripts/lib/load-data.ts';
import { ROOT } from '../../scripts/lib/load-data.ts';

const nodeData = loadData();
const nodeCatalog = makeCatalog(nodeData);
const ISSUED = '2026-10-14 09:00';

describe('용어 카드 칸 나누기', () => {
  it('스키마의 칸은 모두 core나 detail 한쪽에만 있다 (새 칸을 더하면 어느 쪽인지 정한다)', () => {
    const schema = readJson<{ properties: { concepts: { items: { properties: Record<string, unknown> } } } }>(`${ROOT}/schemas/concepts.schema.json`);
    const fields = Object.keys(schema.properties.concepts.items.properties).sort();
    const core: readonly string[] = CONCEPT_CORE;
    const detail: readonly string[] = CONCEPT_DETAIL;
    expect([...core, ...detail].sort()).toEqual(fields);
    expect(core.filter((k) => detail.includes(k))).toEqual([]);
  });

  it('나눈 두 쪽을 다시 붙이면 원래 파일과 같다', () => {
    const file = nodeData.concepts;
    const back = joinConcepts(conceptPart(file, 'core').concepts, conceptPart(file, 'detail').concepts);
    expect(back).toEqual(file.concepts);
  });

  it('풀이 칸이 빠진 id가 있으면 멈춘다', () => {
    const core = conceptPart(nodeData.concepts, 'core').concepts;
    expect(() => joinConcepts(core, [])).toThrow();
  });

  it('싣지 않은 칸을 읽으면 조용히 비지 않고 멈춘다. 펼치기에는 끼지 않는다', () => {
    const o = guardMissing({ id: 'a' }, ['summary'], 'x');
    expect(() => (o as { summary?: string }).summary).toThrow(/data-full/);
    expect({ ...o }).toEqual({ id: 'a' });
    expect(JSON.stringify(o)).toBe('{"id":"a"}');
  });
});

describe('진열 상품 출처 칸', () => {
  it('화면에 싣는 진열 상품은 출처 칸만 빠지고 나머지는 같다', () => {
    const screen = screenProducts(nodeData.products).products;
    expect(screen.map((p) => p.id)).toEqual(nodeData.products.products.map((p) => p.id));
    for (const p of screen) expect(PRODUCT_CHECK_ONLY.some((k) => k in p)).toBe(false);
    const withoutSources = nodeData.products.products.map(({ sources: _s, ...rest }) => rest);
    expect(screen).toEqual(withoutSources);
  });
});

describe('도구 이름 찾기 묶음의 낱말표 (virtual:cc-data/tool-aliases, T37)', () => {
  it('도구 짐작 말과 빈틈만 싣고 값은 원본 그대로', () => {
    const full = readJson<import('../../src/lib/aliases.ts').Aliases>(`${ROOT}/data/aliases.json`);
    const part = toolAliases(full);
    expect(Object.keys(part).sort()).toEqual([...ALIAS_TOOL_PART].sort());
    expect(part.toolHints).toEqual(full.toolHints);
    expect(part.gaps).toEqual(full.gaps);
  });
});

describe('단계 화면 자료 (src/lib/data.ts)', () => {
  it('용어 카드는 core 칸만, 에러 안내와 출처 칸은 싣지 않는다', () => {
    for (const c of stageData.concepts.concepts) expect(Object.keys(c).every((k) => (CONCEPT_CORE as readonly string[]).includes(k))).toBe(true);
    expect(() => stageData.errors).toThrow(/data-full/);
    expect(() => stageCatalog.concept.get('api')?.summary).toThrow(/data-full/);
    expect(stageCatalog.product.get('vercel')).not.toHaveProperty('sources');
    expect(stageData.products.products.length).toBe(nodeData.products.products.length);
  });

  it('data-full.ts는 Node로 읽은 자료와 같다 (모든 칸)', () => {
    expect(fullData.concepts).toEqual(nodeData.concepts);
    expect(fullData.errors).toEqual(nodeData.errors);
    expect(fullCatalog.concept.get('api')?.quiz.length).toBe(nodeCatalog.concept.get('api')?.quiz.length);
  });

  for (const file of goldenFiles()) {
    const g = readJson<Golden>(file);
    it(`${g.id}: 가벼운 자료로도 결과·영수증·설계도·AI에게 할 말이 같다`, () => {
      const session = goldenSession(g);
      const a = evaluate(stageCatalog, session);
      const b = evaluate(nodeCatalog, session);
      // 결과에 실린 상품은 출처 칸만 다르다 (화면에는 싣지 않는다)
      expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b, (k, v: unknown) => (k === 'sources' ? undefined : v))));
      expect(renderReceiptText(receiptModel(stageCatalog, a, ISSUED))).toBe(renderReceiptText(receiptModel(nodeCatalog, b, ISSUED)));
      expect(renderPack(stageCatalog, a, { siteUrl: 'https://example.com', issuedAt: ISSUED })).toBe(renderPack(nodeCatalog, b, { siteUrl: 'https://example.com', issuedAt: ISSUED }));
      expect(conversationCards(stageCatalog, a)).toEqual(conversationCards(nodeCatalog, b));
    });
  }
});
