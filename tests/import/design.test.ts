// 디자인 진열대 자료(data/catalog/design/*.json)가 스키마와 약속을 지키는지, 가져오기 도우미가 맞게 도는지.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import {
  clip, cmp, decodeEntities, normHex, oklchToHex, rgbToHex, safeId, slugify, stripHtml,
} from '../../scripts/import/design-lib.ts';

const DIR = join(import.meta.dirname, '..', '..', 'data', 'catalog', 'design');
const SCHEMA = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'schemas', 'catalog-design.json'), 'utf8'));

interface ItemLike { id: string; kind: string; summary: string; summaryKo?: string; written?: string; tags: string[] }
interface FileLike { source: { id: string }; count: number; items: ItemLike[] }

const files = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json' && f !== 'github-topics-snapshot.json').sort();
const catalogs = files.map((f) => ({ file: f, data: JSON.parse(readFileSync(join(DIR, f), 'utf8')) as FileLike }));
const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) as {
  total: number; subcategories: { id: string; count: number; sources: { id: string; count: number }[] }[];
};

describe('디자인 자료 파일', () => {
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

  it('id는 진열대 전체에서 하나뿐이다', () => {
    const all = catalogs.flatMap((c) => c.data.items.map((i) => i.id));
    expect(new Set(all).size).toBe(all.length);
  });

  it('직접 쓴 한국어 설명에는 written 표시가 있다', () => {
    const missing = catalogs.flatMap((c) => c.data.items.filter((i) => i.summaryKo && i.written !== 'codeshopper').map((i) => i.id));
    expect(missing).toEqual([]);
  });

  it('목차(index.json)의 개수가 파일과 맞는다', () => {
    const total = catalogs.reduce((n, c) => n + c.data.items.length, 0);
    expect(index.total).toBe(total);
    for (const sub of index.subcategories) {
      const real = catalogs.reduce((n, c) => n + c.data.items.filter((i) => i.kind === sub.id).length, 0);
      expect(sub.count, sub.id).toBe(real);
      expect(sub.sources.reduce((n, s) => n + s.count, 0), sub.id).toBe(real);
    }
  });

  it('소분류마다 상품이 있고 큰 출처는 끝까지 받았다', () => {
    const counts = Object.fromEntries(index.subcategories.map((s) => [s.id, s.count]));
    expect(counts['fonts']).toBeGreaterThan(1500); // Google Fonts 전체
    expect(counts['icons']).toBeGreaterThan(200); // Iconify 공개 묶음 전체
    expect(counts['styles']).toBeGreaterThanOrEqual(30);
    expect(counts['fonts-ko']).toBeGreaterThan(30);
  });
});

describe('가져오기 도우미', () => {
  it('clip은 300자 안으로 문장이나 낱말 끝에서 자른다', () => {
    expect(clip('짧다')).toBe('짧다');
    const long = `${'word '.repeat(80)}end.`;
    const out = clip(long);
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out.endsWith('…')).toBe(true);
    expect(clip(`${'a'.repeat(200)}. ${'b'.repeat(200)}`)).toBe(`${'a'.repeat(200)}.`);
  });

  it('safeId는 주소에 넣을 수 있는 슬러그를 만든다', () => {
    expect(safeId('github:Shadcn-UI/ui')).toBe('github:shadcn-ui--ui');
    expect(safeId('polyhaven:Arm_Chair_01')).toBe('polyhaven:arm-chair-01');
    expect(safeId('google-fonts:noto-sans-kr')).toBe('google-fonts:noto-sans-kr');
    expect(() => safeId('no-source')).toThrow();
  });

  it('slugify·stripHtml·decodeEntities', () => {
    expect(slugify('Noto Sans KR')).toBe('noto-sans-kr');
    expect(slugify('Café Déjà')).toBe('cafe-deja');
    expect(stripHtml('<p>Roboto &amp; friends</p><p>two</p>')).toBe('Roboto & friends two');
    expect(decodeEntities('&#39;a&#x27;&quot;')).toBe('\'a\'"');
  });

  it('색 바꾸기: hex 정리, rgb, OKLCH', () => {
    expect(normHex('#ABC')).toBe('#aabbcc');
    expect(normHex('#112233ff')).toBe('#112233');
    expect(normHex('nope')).toBeUndefined();
    expect(rgbToHex('rgb(59, 99, 251)')).toBe('#3b63fb');
    expect(rgbToHex('rgba(255, 255, 255, 0.5)')).toBe('#ffffff80');
    // Tailwind v4 blue-500, white, black
    expect(oklchToHex('oklch(62.3% 0.214 259.815)')).toBe('#2b7fff');
    expect(oklchToHex('oklch(100% 0 0)')).toBe('#ffffff');
    expect(oklchToHex('oklch(0% 0 0)')).toBe('#000000');
  });
});
