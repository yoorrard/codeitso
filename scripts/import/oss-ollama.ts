// Ollama 모델 라이브러리(ollama.com/library, 내 컴퓨터에서 돌리는 공개 모델) 전체를 받아 오픈소스 진열대(AI 모델)에 쓴다.
//   node scripts/import/oss-ollama.ts
// 목록 API가 없어 공식 목록 쪽(한 쪽에 전체가 나온다)의 이름·설명·기능 꼬리표·크기·내려받기(pull) 수를 읽는다.
// 실행 명령은 Ollama가 모델 쪽마다 보여 주는 'ollama run <이름>' 그대로다.
import { type Item, decodeEntities, fetchText, main, makeId, makeItem, summaryOf, tagify, writeCatalog } from './oss-lib.ts';

interface OllamaModel {
  name: string;
  description: string;
  capabilities: string[];
  sizes: string[];
  pulls?: number;
  tags?: number;
  updated?: string;
}

// '120.3M' → 120300000
export function parseCount(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.trim().match(/^([\d.,]+)\s*([KMB])?$/i);
  if (!m) return undefined;
  const n = Number((m[1] as string).replace(/,/g, ''));
  const mul = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] ?? '').toUpperCase() as 'K' | 'M' | 'B'] ?? 1;
  return Number.isFinite(n) ? Math.round(n * mul) : undefined;
}

export function parseLibrary(html: string): OllamaModel[] {
  const out: OllamaModel[] = [];
  for (const block of html.split(/<li\s+class="flex items-baseline/).slice(1)) {
    const name = block.match(/href="\/library\/([^"]+)"/)?.[1];
    if (!name) continue;
    const description = decodeEntities(block.match(/<p class="max-w-lg[^"]*">([\s\S]*?)<\/p>/)?.[1]?.replace(/<[^>]+>/g, '') ?? '').trim();
    const badges = [...block.matchAll(/<span class="inline-flex items-center rounded-md ([^"]*)">([^<]+)<\/span>/g)];
    const capabilities = badges.filter((b) => !(b[1] as string).includes('blue')).map((b) => (b[2] as string).trim());
    const sizes = badges.filter((b) => (b[1] as string).includes('blue')).map((b) => (b[2] as string).trim());
    const pulls = parseCount(block.match(/<span\s*>([\d.,]+[KMB]?)<\/span>\s*<span class="hidden sm:flex">&nbsp;Pulls/)?.[1]);
    const tags = parseCount(block.match(/<span\s*>([\d.,]+)<\/span>\s*<span class="hidden sm:flex">&nbsp;Tags/)?.[1]);
    const updated = block.match(/title="([A-Z][a-z]{2} \d{1,2}, \d{4})[^"]*UTC"/)?.[1];
    out.push({ name, description, capabilities, sizes, pulls, tags, updated });
  }
  return out;
}

main(async () => {
  const html = await fetchText('https://ollama.com/library?sort=popular', { headers: { 'user-agent': 'Mozilla/5.0 (compatible; codeshopper-catalog-import/1.0)' } });
  const models = parseLibrary(html);
  console.log(`  모델 ${models.length}`);
  const items: Item[] = models.map((m) => {
    const d = m.updated ? new Date(`${m.updated} UTC`) : undefined;
    return makeItem({
      id: makeId('ollama', m.name),
      name: m.name,
      kind: 'models',
      category: 'opensource',
      summary: summaryOf(m.description) ?? m.name,
      url: `https://ollama.com/library/${m.name}`,
      source: { name: 'Ollama Library', url: 'https://ollama.com/library' },
      metrics: { downloads: m.pulls, updatedAt: d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : undefined },
      tags: tagify(['ollama', 'local', ...m.capabilities]),
      preview: { type: 'model', host: 'ollama', ...(m.capabilities.length ? { capabilities: m.capabilities } : {}), ...(m.sizes.length ? { sizes: m.sizes } : {}), ...(m.tags ? { variants: m.tags } : {}) },
      use: { install: `ollama run ${m.name}`, docs: 'https://github.com/ollama/ollama/blob/main/docs/api.md' },
    });
  });
  writeCatalog('opensource', {
    id: 'ollama',
    name: 'Ollama 모델 라이브러리',
    url: 'https://ollama.com/library',
    license: 'Model names, descriptions, capability tags and pull counts as published on ollama.com/library; each model keeps the license of its original publisher (shown on the model page).',
    note: 'downloads는 Ollama가 보여 주는 누적 pull 수(반올림된 표시값)다.',
  }, items);
});
