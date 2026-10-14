// Node 전용: data 폴더의 JSON을 읽어 엔진에 넘길 모양으로 묶는다.
// 화면(Astro)에서는 JSON을 직접 import해서 같은 모양을 만든다.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Aliases } from '../../src/lib/aliases.ts';
import type { Data } from '../../src/lib/engine/types.ts';
import type { Glossary } from '../../src/lib/glossary.ts';
import { DATA_FILES } from './data-files.ts';
import type { Sources, ValidationInput } from './validate.ts';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA_DIR = join(ROOT, 'data');

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export { DATA_FILES } from './data-files.ts';

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

/** 자료 검사에 넘길 것을 모두 읽는다 (data, sources, glossary, aliases, schemas, 골든) */
export function loadValidationInput(release: boolean, now: Date = new Date()): ValidationInput {
  const schemaDir = join(ROOT, 'schemas');
  return {
    data: loadData(),
    sources: readJson<Sources>(join(DATA_DIR, 'sources.json')),
    glossary: readJson<Glossary>(join(DATA_DIR, 'glossary.json')),
    aliases: readJson<Aliases>(join(DATA_DIR, 'aliases.json')),
    schemas: readdirSync(schemaDir)
      .filter((x) => x.endsWith('.schema.json'))
      .sort()
      .map((f) => readJson<object>(join(schemaDir, f))),
    goldens: goldenFiles().map((f) => ({ name: basename(f), value: readJson(f) })),
    release,
    thisMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  };
}
