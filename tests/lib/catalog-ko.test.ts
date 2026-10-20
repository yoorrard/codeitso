// 한국어 설명 붙이기 (D122): data/catalog-ko의 id → 한국어를 진열대 빌드가 summaryKo로 붙인다. 출처가 준 한국어가 먼저, 폴더·파일이 없거나 깨져도 빌드는 된다.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readKo } from '../../scripts/catalog/load.ts';
import { cardOf, pickSummary, withKo } from '../../src/lib/catalog/core.ts';
import type { CatalogItem } from '../../src/lib/catalog/types.ts';

const item: CatalogItem = {
  id: 'github:a--b',
  name: 'b',
  kind: 'apps',
  category: 'opensource',
  summary: 'A fast tool for building apps.',
  url: 'https://github.com/a/b',
  source: { name: 'GitHub', url: 'https://github.com' },
  tags: [],
  preview: { type: 'repo' },
  fetchedAt: '2026-10-20',
};

describe('한국어 설명 붙이기', () => {
  it('한국어가 있으면 summaryKo로 붙이고 원문은 그대로, 카드도 한국어를 먼저 보인다', () => {
    const got = withKo(item, '  앱을 빠르게\n만드는 도구예요. ');
    expect(got.summaryKo).toBe('앱을 빠르게 만드는 도구예요.');
    expect(got.koBy).toBe('codeshopper');
    expect(got.summary).toBe(item.summary);
    expect(pickSummary(got)).toBe('앱을 빠르게 만드는 도구예요.');
    expect(cardOf(got).summary).toBe('앱을 빠르게 만드는 도구예요.');
  });

  it('출처가 준 한국어가 있거나 빈 글이면 그대로 둔다', () => {
    const own = { ...item, summaryKo: '출처가 준 한 줄' };
    expect(withKo(own, '다른 설명')).toBe(own);
    expect(withKo(item, ' ')).toBe(item);
    expect(withKo(item, undefined)).toBe(item);
  });

  it('폴더가 없으면 빈 목록, 깨진 파일·문자열 아닌 값은 건너뛴다', () => {
    expect(readKo(join(tmpdir(), 'cc-no-such-dir')).size).toBe(0);
    const dir = mkdtempSync(join(tmpdir(), 'cc-ko-'));
    writeFileSync(join(dir, 'a.json'), JSON.stringify({ 'github:a--b': '도구예요', 'x:y': 3, 'x:z': '' }));
    writeFileSync(join(dir, 'b.json'), '{"쓰는 중');
    writeFileSync(join(dir, 'c.txt'), '{}');
    expect([...readKo(dir)]).toEqual([['github:a--b', '도구예요']]);
  });
});
