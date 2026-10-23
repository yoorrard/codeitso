// AI 모델 사실 자료(data/catalog-models/models-dev.json, D141)가 스키마와 약속을 지키는지, 가져오기가 models.dev 값을 그대로 옮기는지.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { RATE_LIMIT_DOCS } from '../../scripts/import/api-curated-data.ts';
import { modelFacts, modelsByProvider, modelsFileText } from '../../scripts/import/api-curated.ts';
import { cmp } from '../../scripts/import/api-lib.ts';
import type { ModelsFile } from '../../src/lib/catalog/models.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const text = readFileSync(join(ROOT, 'data', 'catalog-models', 'models-dev.json'), 'utf8');
const file = JSON.parse(text) as ModelsFile;
const SCHEMA = JSON.parse(readFileSync(join(ROOT, 'schemas', 'catalog-models.json'), 'utf8'));
const providers = JSON.parse(readFileSync(join(ROOT, 'data', 'catalog', 'api', 'models-dev.json'), 'utf8')) as {
  items: { id: string; preview: { modelCount?: number; limitsUrl?: string; limitsCheckedAt?: string } }[];
};

describe('AI 모델 사실 자료', () => {
  it('스키마를 지킨다', () => {
    const validate = new Ajv2020({ allErrors: true, strict: false }).compile(SCHEMA);
    const ok = validate(file);
    expect(ok ? [] : (validate.errors ?? []).slice(0, 5)).toEqual([]);
  });

  it('개수·정렬이 맞고, 쓰는 모양 그대로다 (같은 날 다시 쓰면 같은 바이트)', () => {
    const ids = Object.keys(file.models);
    expect(ids).toEqual([...ids].sort(cmp));
    expect(file.providers).toBe(ids.length);
    expect(file.count).toBe(Object.values(file.models).reduce((n, l) => n + l.length, 0));
    for (const [p, list] of Object.entries(file.models)) {
      const mids = list.map((m) => m.id);
      expect(mids, p).toEqual([...mids].sort(cmp));
      expect(new Set(mids).size, p).toBe(mids.length);
    }
    expect(modelsFileText(file)).toBe(text);
  });

  it('큰 회사의 모델이 있고, 진열대 상품과 제공자가 맞는다', () => {
    expect(file.count).toBeGreaterThan(3000);
    for (const p of ['openai', 'anthropic', 'google', 'mistral', 'xai', 'deepseek']) expect(file.models[p]?.length ?? 0, p).toBeGreaterThan(2);
    const items = new Map(providers.items.map((i) => [i.id, i]));
    for (const [p, list] of Object.entries(file.models)) {
      const it = items.get(`models-dev:${p}`);
      expect(it, p).toBeDefined();
      expect(it?.preview.modelCount, p).toBe(list.length);
    }
  });

  it('사용 한도 문서는 손으로 확인한 주소·날짜와 같을 때만 실린다', () => {
    const withLimits = providers.items.filter((i) => i.preview.limitsUrl);
    expect(withLimits.length).toBeGreaterThan(10);
    for (const it of withLimits) {
      const doc = RATE_LIMIT_DOCS[it.id.slice('models-dev:'.length)];
      expect(doc?.url, it.id).toBe(it.preview.limitsUrl);
      expect(doc?.checked, it.id).toBe(it.preview.limitsCheckedAt);
    }
  });
});

describe('models.dev 모델 → 싣는 사실', () => {
  it('값을 그대로 옮기고, 모양이 틀린 값은 버린다 (고치거나 지어내지 않는다)', () => {
    const m = modelFacts({
      id: 'claude-x',
      name: ' Claude X ',
      cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75, reasoning: 9, tiers: [], context_over_200k: { input: 6, output: 22.5 }, input_audio: 'x' },
      limit: { context: 200000, output: 64000, input: -1 },
      modalities: { input: ['text', 'image', 'pdf', 'Bad Value'], output: ['text'] },
      reasoning: true,
      tool_call: true,
      open_weights: false,
      knowledge: '2025-03',
      release_date: '2026-01-02',
      last_updated: 'soon',
      status: 'deprecated',
    });
    expect(m).toEqual({
      id: 'claude-x',
      name: 'Claude X',
      cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75, context_over_200k: { input: 6, output: 22.5 } },
      limit: { context: 200000, output: 64000 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
      reasoning: true,
      tool_call: true,
      attachment: false,
      open_weights: false,
      knowledge: '2025-03',
      release_date: '2026-01-02',
      status: 'deprecated',
    });
    expect(modelFacts({ id: '', name: 'x' })).toBeNull();
    expect(modelFacts({ id: 'a', name: 'A', status: 'retired' })?.status).toBeUndefined();
  });

  it('제공자마다 id 순, 모델이 없는 제공자는 뺀다', () => {
    const out = modelsByProvider([
      { id: 'b', name: 'B', models: { z: { id: 'z', name: 'Z' }, a: { id: 'a', name: 'A' } } },
      { id: 'a', name: 'A', models: {} },
    ]);
    expect(Object.keys(out)).toEqual(['b']);
    expect(out['b']?.map((m) => m.id)).toEqual(['a', 'z']);
  });
});
