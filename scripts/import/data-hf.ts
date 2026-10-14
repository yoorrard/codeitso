// Hugging Face 데이터셋을 받아 데이터셋 진열대(AI 학습 데이터셋)에 쓴다.
//   node scripts/import/data-hf.ts
// 허브에 데이터셋이 50만 개 넘게 있어 인기 기준으로 자른다:
//   최근 30일 내려받기 MIN_DOWNLOADS 이상 + 좋아요 MIN_LIKES 이상 (둘 중 하나라도).
//   카드 설명이 없는 데이터셋은 좋아요 NO_CARD_MIN_LIKES 이상만 (자동 업로드·임시 저장소가 내려받기 순 위쪽을 채우기 때문).
// 설명은 허브가 카드에서 뽑아 주는 description의 첫 글 줄(제목이 아닌 문장)을 쓴다.
import {
  HF, type Item, type Preview, asStrings, cached, hfLicense, hfList, int, isAdult, main, makeId, makeItem, summaryOf, tagify,
  toDate, writeCatalog,
} from './oss-lib.ts';

export const MIN_DOWNLOADS = 10_000;
export const MIN_LIKES = 100;
export const NO_CARD_MIN_LIKES = 20;

interface HfDataset {
  id: string;
  author?: string;
  downloads?: number;
  likes?: number;
  lastModified?: string;
  gated?: boolean | string;
  tags?: string[];
  description?: string;
  cardData?: Record<string, unknown>;
}

const EXPAND = ['downloads', 'likes', 'lastModified', 'cardData', 'tags', 'description', 'gated', 'author']
  .map((e) => `expand[]=${e}`)
  .join('&');

// description은 카드 본문을 줄바꿈·탭으로 펼친 글이다. 링크 줄·표 머리·짧은 제목 줄을 건너뛰고 첫 문장 줄을 고른다.
export function datasetSummary(description: string | undefined): string | undefined {
  if (!description) return undefined;
  const lines = description
    .replace(/… See the full description on the dataset page: \S+/, '')
    .split(/\n+/)
    .map((l) => l.replace(/\t+/g, ' ').trim())
    .filter(Boolean);
  const good = (l: string) =>
    l.length >= 40 &&
    /\s/.test(l) &&
    !/^(arxiv|paper|project page|blog|homepage|repository|code|github|website|license|citation|leaderboard|point of contact)\s*:/i.test(l) &&
    !/^https?:\/\//.test(l) &&
    !/(more information needed|this dataset card aims to be a base template|has been automatically generated)/i.test(l);
  const pick = lines.find(good) ?? lines.find((l) => l.length >= 12 && /\s/.test(l));
  return pick ? summaryOf(pick) : undefined;
}

function sizeOf(tags: string[] | undefined): string | undefined {
  return tags?.find((t) => t.startsWith('size_categories:'))?.slice('size_categories:'.length);
}

function tagValues(tags: string[] | undefined, prefix: string): string[] {
  return (tags ?? []).filter((t) => t.startsWith(prefix)).map((t) => t.slice(prefix.length));
}

main(async () => {
  const byDownloads = await cached('hf-datasets-downloads', () =>
    hfList<HfDataset>('datasets', `sort=downloads&direction=-1&${EXPAND}`, (d) => (d.downloads ?? 0) >= MIN_DOWNLOADS),
  );
  const byLikes = await cached('hf-datasets-likes', () =>
    hfList<HfDataset>('datasets', `sort=likes&direction=-1&${EXPAND}`, (d) => (d.likes ?? 0) >= MIN_LIKES),
  );
  const picked = new Map<string, HfDataset>();
  for (const d of [...byDownloads, ...byLikes]) if (!picked.has(d.id)) picked.set(d.id, d);
  console.log(`  내려받기 ${byDownloads.length}, 좋아요 ${byLikes.length}, 합계 ${picked.size}`);

  const kept = [...picked.values()].filter((d) => (datasetSummary(d.description) || (d.likes ?? 0) >= NO_CARD_MIN_LIKES) && !isAdult([d.id, datasetSummary(d.description)], d.tags ?? []));
  console.log(`  카드 설명이 없고 좋아요가 적거나 성인물 표시인 ${picked.size - kept.length}개를 뺀다`);
  const items: Item[] = kept.map((d) => {
    const author = d.author ?? d.id.split('/')[0];
    const tasks = asStrings(d.cardData?.task_categories);
    const modalities = tagValues(d.tags, 'modality:');
    const formats = tagValues(d.tags, 'format:');
    const langs = asStrings(d.cardData?.language).map((l) => l.toLowerCase());
    const gated = d.gated === true || d.gated === 'auto' || d.gated === 'manual';
    const size = sizeOf(d.tags);
    const preview: Preview = {
      type: 'dataset',
      host: 'huggingface',
      author,
      ...(tasks.length ? { tasks: tasks.slice(0, 5) } : {}),
      ...(modalities.length ? { modalities } : {}),
      ...(formats.length ? { formats } : {}),
      ...(size ? { size } : {}),
      ...(langs.length && langs.length <= 6 ? { languages: langs } : langs.length ? { languages: ['multilingual'] } : {}),
      ...(gated ? { gated: true } : {}),
    };
    return makeItem({
      id: makeId('hf-datasets', d.id),
      name: d.id,
      kind: 'ai-training',
      category: 'datasets',
      summary: datasetSummary(d.description) ?? `${d.id.split('/')[1] ?? d.id} dataset by ${author} on Hugging Face.`,
      url: `${HF}/datasets/${d.id}`,
      source: { name: 'Hugging Face Datasets', url: `${HF}/datasets` },
      license: hfLicense(d.cardData?.license),
      metrics: { downloads: int(d.downloads), likes: int(d.likes), updatedAt: toDate(d.lastModified) },
      tags: tagify([...tasks.slice(0, 4), ...modalities, ...(langs.length > 6 ? ['multilingual'] : langs), gated ? 'gated' : undefined]),
      preview,
    });
  });
  writeCatalog('datasets', {
    id: 'hf-datasets',
    name: 'Hugging Face 데이터셋',
    url: `${HF}/datasets`,
    license: 'Hugging Face Hub public API metadata (dataset id, card description, tasks, downloads, likes, license tag); each dataset keeps its own license (field license).',
    cut: `최근 30일 내려받기 ${MIN_DOWNLOADS.toLocaleString('en-US')}회 이상 또는 좋아요 ${MIN_LIKES}개 이상. 카드 설명이 없으면 좋아요 ${NO_CARD_MIN_LIKES}개 이상만`,
    note: 'Hub에는 공개 데이터셋이 50만 개 넘게 있다. 설명이 없는 데이터셋은 이름과 만든 곳으로 짧게 적는다.',
  }, items);
});
