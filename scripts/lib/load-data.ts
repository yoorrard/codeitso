// Node 전용: data 폴더의 JSON을 읽어 엔진에 넘길 모양으로 묶는다.
// 화면(Astro)에서는 JSON을 직접 import해서 같은 모양을 만든다.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Data } from '../../src/lib/engine/types.ts';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA_DIR = join(ROOT, 'data');

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** data 폴더 파일 이름 → Data 속성 이름 */
export const DATA_FILES = {
  taxonomy: 'taxonomy.json',
  scoring: 'scoring.json',
  questions: 'questions.json',
  rules: 'rules.json',
  products: 'products.json',
  concepts: 'concepts.json',
  researchCards: 'research-cards.json',
  templates: 'templates.json',
  recipes: 'recipes.json',
  errors: 'errors.json',
} as const;

export function loadData(): Data {
  const out: Record<string, unknown> = {};
  for (const [key, file] of Object.entries(DATA_FILES)) out[key] = readJson(join(DATA_DIR, file));
  return out as unknown as Data;
}

export function goldenFiles(): string[] {
  const dir = join(DATA_DIR, 'golden');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(dir, f));
}
