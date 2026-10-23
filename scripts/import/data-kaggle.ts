// Kaggle 공개 데이터셋 목록을 '추천(투표) 많은 순'으로 받아 데이터셋 진열대에 쓴다.
//   node scripts/import/data-kaggle.ts
// Kaggle 공개 API(https://github.com/Kaggle/kaggle-api의 datasets/list)는 로그인 없이 목록을 준다.
// 공개 데이터셋이 50만 개가 넘고 API도 깊은 쪽(약 500쪽)을 주지 않아, 투표 MIN_VOTES개 이상만 싣는다.
// 쪽마다 1초 쉰다. 설명은 데이터셋의 부제목(subtitle)이다.
import { type Item, cached, cleanLicense, fetchJson, int, isAdult, main, makeId, makeItem, sleep, summaryOf, tagify, toDate, writeCatalog } from './oss-lib.ts';

export const MIN_VOTES = 100;

interface KaggleTag {
  ref?: string;
  name?: string;
}

interface KaggleDataset {
  ref: string;
  title?: string;
  subtitle?: string;
  url?: string;
  licenseName?: string;
  lastUpdated?: string;
  downloadCount?: number;
  voteCount?: number;
  viewCount?: number;
  usabilityRating?: number;
  totalBytes?: number;
  ownerName?: string;
  tags?: KaggleTag[];
  isPrivate?: boolean;
}

const LICENSES: Record<string, string> = {
  'CC0: Public Domain': 'CC0-1.0',
  'CC BY 4.0': 'CC-BY-4.0',
  'Attribution 4.0 International (CC BY 4.0)': 'CC-BY-4.0',
  'CC BY-SA 4.0': 'CC-BY-SA-4.0',
  'CC BY-NC-SA 4.0': 'CC-BY-NC-SA-4.0',
  'Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)': 'CC-BY-NC-SA-4.0',
  'Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)': 'CC-BY-NC-4.0',
  'Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)': 'CC-BY-SA-4.0',
  'Database: Open Database, Contents: © Original Authors': 'ODbL-1.0 (database)',
  'Database: Open Database, Contents: Database Contents': 'ODbL-1.0',
  'Open Data Commons Open Database License (ODbL) v1.0': 'ODbL-1.0',
  'Apache 2.0': 'Apache-2.0',
  'MIT': 'MIT',
  'GPL 2': 'GPL-2.0',
  'Community Data License Agreement – Permissive – Version 1.0': 'CDLA-Permissive-1.0',
  'Community Data License Agreement - Permissive - Version 1.0': 'CDLA-Permissive-1.0',
  'U.S. Government Works': 'U.S. Government Works',
  'World Bank Dataset Terms of Use': 'World Bank Dataset Terms of Use',
};

function license(name: string | undefined): string | undefined {
  if (!name || /^(unknown|other)/i.test(name) || /specified in description/i.test(name)) return undefined;
  return LICENSES[name] ?? cleanLicense(name);
}

function humanBytes(n: number | undefined): string | undefined {
  if (!n) return undefined;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

main(async () => {
  const rows = await cached('kaggle-votes', async () => {
    const out: KaggleDataset[] = [];
    for (let page = 1; ; page++) {
      const list = await fetchJson<KaggleDataset[]>(`https://www.kaggle.com/api/v1/datasets/list?sortBy=votes&page=${page}`);
      if (!list.length) break;
      out.push(...list);
      const last = list.at(-1)?.voteCount ?? 0;
      if (page % 20 === 0) console.log(`  쪽 ${page}: 투표 ${last}`);
      if (last < MIN_VOTES) break;
      await sleep(1000);
    }
    return out;
  });
  const kept = rows.filter((d) => !d.isPrivate && (d.voteCount ?? 0) >= MIN_VOTES && !isAdult([d.title, d.subtitle, d.ref]));
  console.log(`  받은 ${rows.length}, 투표 ${MIN_VOTES}+ ${kept.length}`);
  const items: Item[] = kept.map((d) => {
    const url = d.url ?? `https://www.kaggle.com/datasets/${d.ref}`;
    const title = (d.title ?? d.ref).trim();
    const size = humanBytes(d.totalBytes);
    return makeItem({
      id: makeId('kaggle', d.ref),
      name: title,
      kind: 'kaggle',
      category: 'datasets',
      summary: summaryOf(d.subtitle) ?? title,
      url,
      source: { name: 'Kaggle', url: 'https://www.kaggle.com/datasets' },
      license: license(d.licenseName),
      metrics: { downloads: int(d.downloadCount), likes: int(d.voteCount), updatedAt: toDate(d.lastUpdated) },
      tags: tagify((d.tags ?? []).map((t) => t.name).slice(0, 8)),
      preview: {
        type: 'dataset',
        host: 'kaggle',
        ref: d.ref,
        ...(d.ownerName ? { author: d.ownerName } : {}),
        ...(size ? { size } : {}),
        ...(d.usabilityRating !== undefined ? { usability: Math.round(d.usabilityRating * 100) / 100 } : {}),
      },
      use: { install: `kaggle datasets download -d ${d.ref}` },
    });
  });
  writeCatalog('datasets', {
    id: 'kaggle',
    name: 'Kaggle 데이터셋',
    url: 'https://www.kaggle.com/datasets',
    license: 'Kaggle public API listing metadata (title, subtitle, owner, license name, votes, downloads); each dataset keeps its own license (field license). Downloading needs a Kaggle account.',
    cut: `투표 ${MIN_VOTES}개 이상 (투표 많은 순으로 넘겨 받다가 기준 밑에서 멈춘다)`,
    note: 'Kaggle에는 공개 데이터셋이 50만 개 넘게 있고, 목록 API는 깊은 쪽을 주지 않는다. 설치 명령은 Kaggle 공식 명령줄 도구(kaggle) 형식이다.',
  }, items);
});
