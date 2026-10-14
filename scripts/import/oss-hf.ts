// Hugging Face 모델(작업별 내려받기 순)과 스페이스(좋아요 순)를 받아 오픈소스 진열대에 쓴다.
//   node scripts/import/oss-hf.ts            (모델 + 스페이스)
//   node scripts/import/oss-hf.ts models     (모델만)
//   node scripts/import/oss-hf.ts spaces     (스페이스만)
// 허브에 모델 200만 개·스페이스 100만 개가 넘어 인기 기준으로 자른다 (기준은 source.cut에 적는다).
//   모델: 작업(pipeline_tag)마다 최근 30일 내려받기 MODEL_MIN_DOWNLOADS 이상 + 작업마다 상위 MODEL_MIN_PER_TASK개
//         + 작업과 상관없이 좋아요 MODEL_MIN_LIKES 이상.
//   스페이스: 좋아요 SPACE_MIN_LIKES 이상.
// 설명: 모델은 카드(README) 첫 문단. 카드를 읽을 수 없으면(동의가 필요한 모델 등) 허브 정보(작업·라이브러리·만든 곳)로 짧게 쓴다.
//       스페이스는 카드의 short_description, 없으면 README 첫 문단, 그것도 없으면 제목.
import {
  HF, type Item, type Preview, asStrings, cached, cleanLicense, fetchRaw, fetchJson, hfLicense, hfList, int, isAdult, main,
  makeId, makeItem, mapLimit, progress, readmeFirstParagraph, summaryOf, tagify, toDate, writeCatalog,
} from './oss-lib.ts';

export const MODEL_MIN_DOWNLOADS = 10_000;
export const MODEL_MIN_PER_TASK = 20;
export const MODEL_MIN_LIKES = 300;
export const SPACE_MIN_LIKES = 100;

const SOURCE_MODELS = { name: 'Hugging Face', url: `${HF}/models` };
const SOURCE_SPACES = { name: 'Hugging Face Spaces', url: `${HF}/spaces` };

interface HfModel {
  id: string;
  author?: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string;
  library_name?: string;
  lastModified?: string;
  gated?: boolean | string;
  tags?: string[];
  cardData?: Record<string, unknown>;
}

interface HfSpace {
  id: string;
  author?: string;
  likes?: number;
  sdk?: string;
  lastModified?: string;
  tags?: string[];
  cardData?: Record<string, unknown>;
  runtime?: { stage?: string; hardware?: { current?: string | null } };
}

interface HfTask {
  id: string;
  label: string;
}

const MODEL_EXPAND = ['downloads', 'likes', 'pipeline_tag', 'library_name', 'lastModified', 'cardData', 'gated', 'tags', 'author']
  .map((e) => `expand[]=${e}`)
  .join('&');

async function tasks(): Promise<HfTask[]> {
  const t = await fetchJson<Record<string, { id?: string; label?: string }>>(`${HF}/api/tasks`);
  return Object.entries(t)
    .map(([id, v]) => ({ id, label: v.label ?? id }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// 카드(README) 첫 문단. 401(동의 필요)·404는 undefined.
async function cardParagraph(repoPath: string): Promise<string | undefined> {
  try {
    const res = await fetchRaw(`${HF}/${repoPath}/raw/main/README.md`, { allowStatus: [401, 403, 404], retries: 3 });
    if (!res.ok) {
      await res.body?.cancel();
      return undefined;
    }
    return readmeFirstParagraph(await res.text());
  } catch {
    return undefined;
  }
}

function langTags(card: Record<string, unknown> | undefined): string[] {
  const langs = asStrings(card?.language).map((l) => l.toLowerCase());
  // 언어가 너무 많은 다국어 모델은 'multilingual' 하나로.
  if (langs.length > 6) return ['multilingual', ...(langs.includes('ko') ? ['ko'] : [])];
  return langs;
}

async function importModels(): Promise<void> {
  const taskList = await tasks();
  const label = new Map(taskList.map((t) => [t.id, t.label]));
  const picked = new Map<string, HfModel>();
  for (const t of taskList) {
    const rows = await cached(`hf-models-${t.id}`, () =>
      hfList<HfModel>('models', `pipeline_tag=${t.id}&sort=downloads&direction=-1&${MODEL_EXPAND}`, (m, i) =>
        i < MODEL_MIN_PER_TASK || (m.downloads ?? 0) >= MODEL_MIN_DOWNLOADS),
    );
    for (const m of rows) if (!picked.has(m.id)) picked.set(m.id, m);
    console.log(`  ${t.id}: ${rows.length}`);
  }
  const liked = await cached('hf-models-likes', () =>
    hfList<HfModel>('models', `sort=likes&direction=-1&${MODEL_EXPAND}`, (m) => (m.likes ?? 0) >= MODEL_MIN_LIKES),
  );
  for (const m of liked) if (!picked.has(m.id)) picked.set(m.id, m);
  console.log(`  좋아요 ${MODEL_MIN_LIKES}+: ${liked.length}, 합계 ${picked.size}`);

  const models = [...picked.values()].filter((m) => !isAdult([m.id], m.tags ?? []));
  console.log(`  성인물 표시 ${picked.size - models.length}개를 뺀다`);
  let done = 0;
  const paragraphs = await cached('hf-models-cards', async () => {
    const out: Record<string, string | null> = {};
    await mapLimit(models, 8, async (m) => {
      out[m.id] = m.gated ? null : ((await cardParagraph(m.id)) ?? null);
      progress('카드', ++done, models.length, 500);
    });
    return out;
  }, 7);

  const clean = models.filter((m) => !isAdult([paragraphs[m.id]]));
  console.log(`  카드 첫 문단이 성인물을 알리는 ${models.length - clean.length}개를 더 뺀다`);
  const items: Item[] = clean.map((m) => {
    const task = m.pipeline_tag;
    const taskLabel = task ? (label.get(task) ?? task) : undefined;
    const author = m.author ?? m.id.split('/')[0];
    const fallback = `${taskLabel ?? 'Machine learning'} model${m.library_name ? ` (${m.library_name})` : ''} by ${author} on Hugging Face.`;
    const gated = m.gated === true || m.gated === 'auto' || m.gated === 'manual';
    const preview: Preview = {
      type: 'model',
      host: 'huggingface',
      author,
      ...(task ? { task, taskLabel } : {}),
      ...(m.library_name ? { library: m.library_name } : {}),
      ...(gated ? { gated: true } : {}),
    };
    return makeItem({
      id: makeId('hf-models', m.id),
      name: m.id,
      kind: 'models',
      category: 'opensource',
      summary: paragraphs[m.id] ?? fallback,
      url: `${HF}/${m.id}`,
      source: SOURCE_MODELS,
      license: hfLicense(m.cardData?.license),
      metrics: { downloads: int(m.downloads), likes: int(m.likes), updatedAt: toDate(m.lastModified) },
      tags: tagify([task, m.library_name, ...langTags(m.cardData), gated ? 'gated' : undefined]),
      preview,
    });
  });
  writeCatalog('opensource', {
    id: 'hf-models',
    name: 'Hugging Face 모델',
    url: `${HF}/models`,
    license: 'Hugging Face Hub public API metadata (model id, task, downloads, likes, license tag) and the first paragraph of each public model card; each model keeps its own license (field license).',
    cut: `작업(${taskList.length}개)마다 최근 30일 내려받기 ${MODEL_MIN_DOWNLOADS.toLocaleString('en-US')}회 이상 + 작업마다 상위 ${MODEL_MIN_PER_TASK}개 + 좋아요 ${MODEL_MIN_LIKES}개 이상`,
    note: 'Hub에는 공개 모델이 200만 개 넘게 있다. 카드를 읽을 수 없는 모델(동의가 필요한 모델 등)은 허브 정보(작업·라이브러리·만든 곳)로 설명을 짧게 만든다.',
  }, items);
}

const SPACE_EXPAND = ['likes', 'sdk', 'lastModified', 'cardData', 'tags', 'runtime', 'author'].map((e) => `expand[]=${e}`).join('&');

async function importSpaces(): Promise<void> {
  const all = await cached('hf-spaces', () =>
    hfList<HfSpace>('spaces', `sort=likes&direction=-1&${SPACE_EXPAND}`, (s) => (s.likes ?? 0) >= SPACE_MIN_LIKES),
  );
  const spaces = all.filter((s) => !isAdult([s.id, typeof s.cardData?.title === 'string' ? s.cardData.title : undefined, typeof s.cardData?.short_description === 'string' ? s.cardData.short_description : undefined], [...(s.tags ?? []), ...asStrings(s.cardData?.tags)]));
  console.log(`  성인물 표시 ${all.length - spaces.length}개를 뺀다`);
  console.log(`  스페이스 ${spaces.length}`);
  const need = spaces.filter((s) => typeof s.cardData?.short_description !== 'string');
  let done = 0;
  const paragraphs = await cached('hf-spaces-cards', async () => {
    const out: Record<string, string | null> = {};
    await mapLimit(need, 8, async (s) => {
      out[s.id] = (await cardParagraph(`spaces/${s.id}`)) ?? null;
      progress('카드', ++done, need.length, 200);
    });
    return out;
  }, 7);

  const cleanSpaces = spaces.filter((s) => !isAdult([paragraphs[s.id]]));
  const items: Item[] = cleanSpaces.map((s) => {
    const card = s.cardData ?? {};
    const title = typeof card.title === 'string' && card.title.trim() ? card.title.trim() : (s.id.split('/')[1] ?? s.id);
    const short = typeof card.short_description === 'string' ? summaryOf(card.short_description) : undefined;
    const stage = s.runtime?.stage?.toLowerCase();
    const sdk = s.sdk ?? (typeof card.sdk === 'string' ? card.sdk : undefined);
    const preview: Preview = {
      type: 'site',
      host: 'huggingface-space',
      space: s.id,
      ...(sdk ? { sdk } : {}),
      ...(typeof card.emoji === 'string' ? { emoji: card.emoji } : {}),
      ...(typeof card.colorFrom === 'string' ? { colorFrom: card.colorFrom } : {}),
      ...(typeof card.colorTo === 'string' ? { colorTo: card.colorTo } : {}),
      ...(stage ? { status: stage } : {}),
      ...(asStrings(card.models).length ? { models: asStrings(card.models).slice(0, 5) } : {}),
    };
    return makeItem({
      id: makeId('hf-spaces', s.id),
      name: title,
      kind: 'ai-demos',
      category: 'opensource',
      summary: short ?? paragraphs[s.id] ?? `${title} (${s.id})`,
      url: `${HF}/spaces/${s.id}`,
      source: SOURCE_SPACES,
      license: cleanLicense(typeof card.license === 'string' ? card.license : undefined),
      metrics: { likes: int(s.likes), updatedAt: toDate(s.lastModified) },
      tags: tagify([sdk, ...asStrings(card.tags).slice(0, 6)]),
      preview,
    });
  });
  writeCatalog('opensource', {
    id: 'hf-spaces',
    name: 'Hugging Face 스페이스',
    url: `${HF}/spaces`,
    license: 'Hugging Face Hub public API metadata (space id, title, short description, SDK, likes); each Space keeps its own license (field license).',
    cut: `좋아요 ${SPACE_MIN_LIKES}개 이상`,
    note: 'Hub에는 스페이스가 100만 개 넘게 있다. status는 받은 날의 실행 상태(running·sleeping 등)다.',
  }, items);
}

main(async () => {
  const what = process.argv[2];
  if (!what || what === 'models') await importModels();
  if (!what || what === 'spaces') await importSpaces();
});
