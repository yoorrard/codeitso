// 오픈소스·데이터셋·템플릿 진열대 자료(data/catalog/{opensource,datasets,templates}/*.json)가 스키마와 약속을 지키는지.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, type CategoryId, cmp } from '../../scripts/import/oss-lib.ts';

const ROOT = join(import.meta.dirname, '..', '..');

interface ItemLike {
  id: string;
  kind: string;
  category: string;
  summary: string;
  summaryKo?: string;
  written?: string;
  url: string;
  tags: string[];
  license?: string;
  use?: { install?: string; snippet?: string; docs?: string };
}
interface FileLike { source: { id: string; total?: number }; count: number; items: ItemLike[] }
interface IndexLike {
  total: number;
  subcategories: { id: string; count: number; sources: { id: string; count: number }[] }[];
  sources: { id: string; count: number }[];
}

const CATS: CategoryId[] = ['opensource', 'datasets', 'templates'];

for (const cat of CATS) {
  const dir = join(ROOT, 'data', 'catalog', cat);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json').sort() : [];
  const catalogs = files.map((f) => ({ file: f, data: JSON.parse(readFileSync(join(dir, f), 'utf8')) as FileLike }));
  const schema = JSON.parse(readFileSync(join(ROOT, 'schemas', `catalog-${cat}.json`), 'utf8')) as { $defs: { item: { properties: { kind: { enum: string[] } } } } };
  const indexSchema = JSON.parse(readFileSync(join(ROOT, 'schemas', `catalog-${cat}-index.json`), 'utf8')) as object;
  const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as IndexLike;

  describe(`${cat} 진열대`, () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const validateIndex = ajv.compile(indexSchema);

    it('자료 파일이 있다', () => {
      expect(catalogs.length).toBeGreaterThan(2);
    });

    it('스키마의 소분류가 가져오기 도우미(CATEGORIES)와 같다', () => {
      expect(schema.$defs.item.properties.kind.enum).toEqual(CATEGORIES[cat].kinds.map((k) => k.id));
    });

    it.each(catalogs.map((c) => [c.file, c.data] as const))('%s 는 스키마를 지킨다', (_file, data) => {
      const ok = validate(data);
      expect(ok ? [] : (validate.errors ?? []).slice(0, 5)).toEqual([]);
    });

    it.each(catalogs.map((c) => [c.file, c.data] as const))('%s 의 count·파일 이름·정렬이 맞다', (file, data) => {
      expect(data.count).toBe(data.items.length);
      expect(`${data.source.id}.json`).toBe(file);
      const ids = data.items.map((i) => i.id);
      expect(ids).toEqual([...ids].sort(cmp));
      for (const it of data.items) expect(it.id.startsWith(`${data.source.id}:`), it.id).toBe(true);
    });

    it('id는 진열대 전체에서 하나뿐이다', () => {
      const all = catalogs.flatMap((c) => c.data.items.map((i) => i.id));
      expect(new Set(all).size).toBe(all.length);
    });

    it('직접 쓴 한국어 설명에는 written 표시가 있다', () => {
      const missing = catalogs.flatMap((c) => c.data.items.filter((i) => i.summaryKo && i.written !== 'codeshopper').map((i) => i.id));
      expect(missing).toEqual([]);
    });

    it('설명·주소에 성인물 낱말이 없다', () => {
      const bad = catalogs.flatMap((c) => c.data.items.filter((i) => /nsfw|porn|hentai|\bnude\b/i.test(`${i.id} ${i.summary}`)).map((i) => i.id));
      expect(bad).toEqual([]);
    });

    it('목차(index.json)는 스키마를 지키고 개수가 파일과 맞는다', () => {
      const ok = validateIndex(index);
      expect(ok ? [] : (validateIndex.errors ?? []).slice(0, 5)).toEqual([]);
      const total = catalogs.reduce((n, c) => n + c.data.items.length, 0);
      expect(index.total).toBe(total);
      for (const sub of index.subcategories) {
        const real = catalogs.reduce((n, c) => n + c.data.items.filter((i) => i.kind === sub.id).length, 0);
        expect(sub.count, sub.id).toBe(real);
        expect(sub.sources.reduce((n, s) => n + s.count, 0), sub.id).toBe(real);
      }
      expect(index.sources.map((s) => s.id).sort(cmp)).toEqual(catalogs.map((c) => c.data.source.id).sort(cmp));
    });

    it('소분류마다 상품이 있다', () => {
      const empty = index.subcategories.filter((s) => s.count === 0).map((s) => s.id);
      expect(empty).toEqual([]);
    });
  });
}

describe('큰 출처는 끝까지(또는 적은 기준까지) 받았다', () => {
  const count = (cat: string, id: string) => {
    const p = join(ROOT, 'data', 'catalog', cat, `${id}.json`);
    return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as FileLike).items.length : 0;
  };
  it('오픈소스', () => {
    expect(count('opensource', 'hf-models')).toBeGreaterThan(5000);
    expect(count('opensource', 'hf-spaces')).toBeGreaterThan(1000);
    expect(count('opensource', 'selfhosted')).toBeGreaterThan(1000);
    expect(count('opensource', 'npm')).toBe(2000);
    expect(count('opensource', 'ollama')).toBeGreaterThan(150);
  });
  it('데이터셋', () => {
    expect(count('datasets', 'kaggle')).toBeGreaterThan(2000);
    expect(count('datasets', 'owid')).toBeGreaterThan(3000);
    expect(count('datasets', 'data-go-kr-files')).toBeGreaterThan(1000);
    expect(count('datasets', 'uci')).toBeGreaterThan(500);
  });
  it('템플릿', () => {
    expect(count('templates', 'vercel')).toBeGreaterThan(300);
    expect(count('templates', 'nextjs-examples')).toBeGreaterThan(150);
    expect(count('templates', 'astro-themes')).toBeGreaterThan(300);
  });
});
