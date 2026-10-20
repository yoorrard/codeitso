// 매일 번역(scripts/i18n/translate.ts)의 순수 도우미 (v5.1 P4, D128): 고를 상품, 요청 글, 답 읽기, 한국어 검사, 쓸 파일.
// 네트워크·파일을 만지지 않아 시험이 그대로 부른다.
import { cmpText, sortRanked } from '../../src/lib/catalog/core.ts';
import type { Ranked } from '../../src/lib/catalog/core.ts';

export const KO_LIMIT = 100;
/** auto-<n>.json 한 파일에 담는 최대 수. 넘으면 다음 번호로 */
export const AUTO_FILE_MAX = 5000;
/** 요청에 싣는 원문 길이 (토큰을 아낀다) */
const SUMMARY_CHARS = 280;

export interface Candidate {
  id: string;
  name: string;
  kind: string;
  summary: string;
  /** 소분류 안 인기 순위 (0부터) */
  rank: number;
  /** template.json에 자료로 만든 한 줄이 이미 있는지 (있으면 뒤로 미룬다) */
  templated: boolean;
}

/**
 * 번역할 상품을 고른다: 출처 한국어도, 코드쇼퍼 한국어(agent·auto)도 없는 상품.
 * 순서: 자료로 만든 한 줄도 없는 것 먼저 → 소분류 안 인기 순위 → 원문 있는 것 → id. 이렇게 하면 모든 목록의 첫 쪽부터 고르게 채워진다.
 */
export function pickCandidates(all: readonly Ranked[], have: ReadonlySet<string>, templated: ReadonlySet<string>, budget: number): Candidate[] {
  const byKind = new Map<string, Ranked[]>();
  for (const r of all) {
    const key = `${r.item.category}/${r.item.kind}`;
    const list = byKind.get(key);
    if (list) list.push(r);
    else byKind.set(key, [r]);
  }
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const [key, list] of byKind) {
    sortRanked(list, 'popular').forEach((r, rank) => {
      const { item } = r;
      if (seen.has(item.id) || have.has(item.id) || item.summaryKo?.trim()) return;
      seen.add(item.id);
      out.push({ id: item.id, name: item.name, kind: key, summary: item.summary.trim(), rank, templated: templated.has(item.id) });
    });
  }
  out.sort((a, b) =>
    Number(a.templated) - Number(b.templated) || a.rank - b.rank || Number(!a.summary) - Number(!b.summary) || cmpText(a.id, b.id));
  return out.slice(0, Math.max(0, budget));
}

export const SYSTEM_PROMPT = [
  'You write one-line Korean product descriptions for a Korean shop that lists free building materials for app makers',
  '(fonts, icons, UI kits, APIs, MCP servers, agent skills, open-source repos, templates, datasets).',
  'Rules:',
  '1. Natural Korean in plain written style (다체): every line ends with "~다." Example: "PDF에서 표와 글을 뽑아 주는 MCP 서버다."',
  '2. At most 100 characters. One sentence, two short ones at most. No padding, no marketing words.',
  '3. Keep product names, brand names and technical terms in English as they are (MCP, API, SDK, CLI, React, Next.js, LLM, RAG, OAuth).',
  '4. Use only facts in the given name, kind and summary. Never invent features, numbers, licenses or prices.',
  '5. If the summary is empty or meaningless, write a neutral line from the name and kind only.',
  '6. Never include URLs or e-mail addresses.',
  'Reply with ONLY a JSON object mapping each input "i" to its Korean line, e.g. {"1":"…다.","2":"…다."}.',
].join('\n');

export function userPrompt(batch: readonly Candidate[]): string {
  const rows = batch.map((c, i) => ({ i: i + 1, name: c.name, kind: c.kind, summary: c.summary.slice(0, SUMMARY_CHARS) }));
  return `Describe these ${batch.length} items:\n${JSON.stringify(rows)}`;
}

/** 모델 답에서 { "1": "…" } 모양을 꺼낸다. 코드 울타리·앞뒤 말이 붙어 있어도 된다 */
export function parseReply(text: string): Map<number, unknown> {
  const out = new Map<number, unknown>();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return out;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return out;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(k);
    if (Number.isInteger(n) && n > 0) out.set(n, v);
  }
  return out;
}

/** 쓸 만한 한국어 한 줄이면 다듬어 돌려주고, 아니면 undefined (다음 번에 다시 번역한다) */
export function cleanKo(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.replace(/\s+/g, ' ').trim().replace(/^["'“‘]+|["'”’]+$/g, '').trim();
  if (!t || [...t].length > KO_LIMIT) return undefined;
  if (!/[가-힣]/.test(t)) return undefined;
  if (/https?:\/\/|www\.|[\w.+-]+@[\w-]+\.[\w.]+/.test(t)) return undefined;
  if (!/다(\([^)]*\))?\.?$/.test(t)) return undefined;
  return t;
}

/** 새 번역을 쓸 파일 이름: 마지막 auto-<n>.json이 차지 않았으면 그것, 찼으면 다음 번호 */
export function autoFileName(existing: ReadonlyMap<string, number>): string {
  let last = 0;
  for (const name of existing.keys()) {
    const m = /^auto-(\d+)\.json$/.exec(name);
    if (m) last = Math.max(last, Number(m[1]));
  }
  if (last === 0) return 'auto-1.json';
  const lastName = `auto-${last}.json`;
  return (existing.get(lastName) ?? 0) < AUTO_FILE_MAX ? lastName : `auto-${last + 1}.json`;
}
