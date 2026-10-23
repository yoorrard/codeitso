// 골든 사례마다 시험 하나: 엔진 결과가 data/golden/의 기대값과 같아야 한다 (npm run golden과 같은 비교).
import { basename } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluate, makeCatalog } from '../src/lib/engine/index.ts';
import type { Golden } from '../scripts/lib/golden.ts';
import { compareGolden, goldenSession } from '../scripts/lib/golden.ts';
import { goldenFiles, loadData, readJson } from '../scripts/lib/load-data.ts';

const cat = makeCatalog(loadData());
const files = goldenFiles();

describe('골든 사례', () => {
  it('사례가 있다', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const g = readJson<Golden>(file);
    it(`${basename(file)} ${g.title}`, () => {
      expect(compareGolden(evaluate(cat, goldenSession(g)), g.expect)).toEqual([]);
    });
  }
});
