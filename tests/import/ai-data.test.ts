// 커밋된 AI 확장 진열대 자료(data/catalog/ai/*.json)가 스키마와 색인에 맞는지 본다. 네트워크를 쓰지 않는다.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const DIR = join(ROOT, 'data', 'catalog', 'ai');
const read = (p: string): unknown => JSON.parse(readFileSync(p, 'utf8'));

interface File {
  source: { id: string; kind: string };
  count: number;
  available: number;
  items: { id: string; kind: string; url: string; summary: string; summaryKo?: string; written?: string }[];
}

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json').sort() : [];

describe.skipIf(files.length === 0)('data/catalog/ai', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validateFile = ajv.compile(read(join(ROOT, 'schemas', 'catalog-ai.schema.json')) as object);
  const validateIndex = ajv.compile(read(join(ROOT, 'schemas', 'catalog-ai-index.schema.json')) as object);
  const data = files.map((f) => ({ file: f, json: read(join(DIR, f)) as File }));

  it.each(data.map((d) => [d.file, d.json] as const))('%s는 스키마에 맞고 개수가 맞다', (file, json) => {
    const ok = validateFile(json);
    expect(ok, `${file}: ${ajv.errorsText(validateFile.errors, { separator: '\n' }).slice(0, 2000)}`).toBe(true);
    expect(json.count).toBe(json.items.length);
    expect(json.items.length).toBeLessThanOrEqual(json.available);
    expect(file).toBe(`${json.source.id}.json`);
    for (const it of json.items) expect(it.kind).toBe(json.source.kind);
  });

  it('상품 id는 모든 출처를 통틀어 겹치지 않는다', () => {
    const seen = new Map<string, string>();
    for (const d of data) {
      for (const it of d.json.items) {
        expect(seen.has(it.id), `${it.id}: ${seen.get(it.id)}와 ${d.file}`).toBe(false);
        seen.set(it.id, d.file);
      }
    }
  });

  it('한국어 설명은 출처가 준 것이거나 코드쇼퍼가 썼다고 표시한 것만 있다', () => {
    const allowed = new Set(['prompt-lobehub', 'rules-format']);
    for (const d of data) {
      for (const it of d.json.items) {
        if (it.summaryKo) expect(allowed.has(d.json.source.id) || it.written === 'codeshopper', `${it.id}`).toBe(true);
      }
    }
  });

  it('index.json은 스키마에 맞고 파일들의 개수와 같다', () => {
    const index = read(join(DIR, 'index.json')) as { count: number; subcategories: { id: string; count: number; sources: { file: string; count: number }[] }[] };
    expect(validateIndex(index), ajv.errorsText(validateIndex.errors)).toBe(true);
    const byFile = new Map(data.map((d) => [d.file, d.json]));
    let total = 0;
    for (const sub of index.subcategories) {
      for (const s of sub.sources) {
        const f = byFile.get(s.file);
        expect(f, s.file).toBeDefined();
        expect(s.count).toBe(f?.items.length);
        expect(f?.source.kind).toBe(sub.id);
      }
      expect(sub.count).toBe(sub.sources.reduce((n, s) => n + s.count, 0));
      total += sub.count;
    }
    expect(index.count).toBe(total);
    expect(index.subcategories.flatMap((s) => s.sources).length).toBe(data.length);
  });
});
