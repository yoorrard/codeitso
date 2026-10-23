// 한국어 설명이 아직 없는 상품을 번역해 data/catalog-ko/auto-<n>.json에 더한다 (v5.1 P4, D128). 매일 작업 흐름이 돌린다.
//   node scripts/i18n/translate.ts
// OpenAI 호환 chat/completions 주소라면 어디든 쓴다 (GitHub Models는 2026-07-30에 닫혔다). 환경 변수:
//   TRANSLATE_API_URL   chat/completions 주소 (예: Cloudflare Workers AI https://api.cloudflare.com/client/v4/accounts/<계정 id>/ai/v1/chat/completions)
//   TRANSLATE_API_KEY   그 주소의 키 (저장소 비밀 값). 주소나 키가 없으면 알리고 아무것도 하지 않는다
//   TRANSLATE_MODEL     모델 이름 (필수)
//   TRANSLATE_BUDGET    한 번에 번역할 최대 상품 수 (기본 200) · TRANSLATE_BATCH 요청 하나에 싣는 수 (기본 20)
//   TRANSLATE_RPM       분당 요청 수 (기본 10) · TRANSLATE_MINUTES 이 시간이 지나면 멈춘다 (기본 8)
//   TRANSLATE_JSON_MODE 1이면 response_format json_object를 보낸다 (그것을 받는 모델만)
// 순서·검사는 scripts/lib/ko-translate.ts. 실패한 줄은 버리고 다음 날 다시 시도한다. 받은 것은 멈추기 전에 늘 저장한다.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cmpText } from '../../src/lib/catalog/core.ts';
import { KO_DIR, rawItems, readKo } from '../catalog/load.ts';
import { koLineFor } from '../lib/ko-rule.ts';
import { SYSTEM_PROMPT, autoFileName, cleanKo, parseReply, pickCandidates, userPrompt } from '../lib/ko-translate.ts';
import type { Candidate } from '../lib/ko-translate.ts';

const env = process.env;
const url = env.TRANSLATE_API_URL?.trim();
const key = env.TRANSLATE_API_KEY?.trim();
const model = env.TRANSLATE_MODEL?.trim();
const intEnv = (name: string, def: number): number => {
  const n = Number(env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
};
const budget = intEnv('TRANSLATE_BUDGET', 200);
const batchSize = intEnv('TRANSLATE_BATCH', 20);
const rpm = intEnv('TRANSLATE_RPM', 10);
const deadline = Date.now() + intEnv('TRANSLATE_MINUTES', 8) * 60_000;

if (!url || !key || !model) {
  console.log('번역 건너뜀: TRANSLATE_API_URL·TRANSLATE_API_KEY·TRANSLATE_MODEL이 없다 (선택, docs/DECISIONS.md D143).');
  process.exit(0);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

class FatalError extends Error {}

async function ask(batch: readonly Candidate[]): Promise<string> {
  const body = JSON.stringify({
    model,
    temperature: 0.2,
    max_tokens: 200 + batch.length * 120,
    ...(env.TRANSLATE_JSON_MODE === '1' ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt(batch) },
    ],
  });
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url as string, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body,
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      if (attempt >= 3) throw e;
      await sleep(5_000 * attempt);
      continue;
    }
    if (res.ok) {
      const json = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
      const content = json.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : '';
    }
    const text = (await res.text()).slice(0, 300);
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const wait = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(wait) && wait > 0 ? Math.min(wait, 120) * 1000 : 30_000 * attempt);
      continue;
    }
    // 키·모델·한도 문제는 다음 묶음도 같으므로 멈춘다
    throw new FatalError(`번역 요청 실패 ${res.status}: ${text}`);
  }
}

function readAuto(): Map<string, number> {
  const sizes = new Map<string, number>();
  if (!existsSync(KO_DIR)) return sizes;
  for (const name of readdirSync(KO_DIR).filter((n) => /^auto-\d+\.json$/.test(n))) {
    try {
      sizes.set(name, Object.keys(JSON.parse(readFileSync(join(KO_DIR, name), 'utf8')) as object).length);
    } catch {
      sizes.set(name, Number.POSITIVE_INFINITY); // 깨진 파일에는 더 쓰지 않는다
    }
  }
  return sizes;
}

function save(found: Map<string, string>): void {
  if (found.size === 0) return;
  mkdirSync(KO_DIR, { recursive: true });
  const name = autoFileName(readAuto());
  const path = join(KO_DIR, name);
  const prev = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>) : {};
  const all: Record<string, string> = { ...prev, ...Object.fromEntries(found) };
  const sorted = Object.fromEntries(Object.keys(all).sort(cmpText).map((k) => [k, all[k]]));
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`새 한국어 설명 ${found.size}개 → data/catalog-ko/${name} (파일 안 ${Object.keys(sorted).length}개)`);
  found.clear();
}

const have = readKo(KO_DIR);
const items = rawItems();
// 모양이 정해진 상품(글꼴·색…)은 자료로 만든 자세한 한 줄이 이미 있어 뒤로 미룬다 (D143: 빌드 때 만든다)
const templated = new Set(items.filter((r) => !have.has(r.item.id) && koLineFor(r.item)?.by === 'codeshopper').map((r) => r.item.id));
const candidates = pickCandidates(items, new Set(have.keys()), templated, budget);
console.log(`번역할 상품 ${candidates.length}개 (한 번에 ${batchSize}개, 분당 ${rpm}번, 모델 ${model})`);

const found = new Map<string, string>();
let asked = 0;
let rejected = 0;
let fatal = '';
const gap = Math.ceil(60_000 / rpm);
for (let i = 0; i < candidates.length; i += batchSize) {
  if (Date.now() > deadline) {
    console.log('시간이 다 되어 멈춘다. 나머지는 다음 번에 번역한다.');
    break;
  }
  const batch = candidates.slice(i, i + batchSize);
  const started = Date.now();
  try {
    const reply = parseReply(await ask(batch));
    asked += batch.length;
    batch.forEach((c, j) => {
      const ko = cleanKo(reply.get(j + 1));
      if (ko) found.set(c.id, ko);
      else rejected++;
    });
  } catch (e) {
    fatal = e instanceof Error ? e.message : String(e);
    if (e instanceof FatalError) break;
    console.warn(`묶음 ${i / batchSize + 1} 건너뜀: ${fatal}`);
    fatal = '';
  }
  if (found.size >= 500) save(found);
  const wait = gap - (Date.now() - started);
  if (wait > 0 && i + batchSize < candidates.length) await sleep(wait);
}
save(found);
console.log(`요청한 ${asked}개 가운데 쓸 수 없는 답 ${rejected}개는 버렸다 (다음 번에 다시).`);
if (fatal) {
  console.error(fatal);
  process.exit(1);
}
