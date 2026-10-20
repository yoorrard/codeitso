// 프롬프트 뽑기 (v5.1 D121, 영수증 대신): 장바구니 → 내 AI에게 바로 붙여 넣을 짧은 프롬프트. 부작용 없음, 시험 있음.
// 재료와 용도만 쓴다: 첫 줄(적힌 용도대로 써 달라, 구현은 따로 설명한다) → 만들 앱(있으면) → 대분류 순서로 재료 한 줄씩
// '- [소분류] 이름 — 내 메모 · 공식 주소 · 설치 명령 또는 API 키 필요' → 라이선스 확인 한 줄. 문장은 ko.prompt.text.
// 재료 사실(주소·설치 명령·인증)은 출처 자료 그대로만.
import { ko } from '../copy/ko.ts';
import { CATEGORY_ORDER } from './catalog/types.ts';
import type { DetailRecord, NavCategory } from './catalog/types.ts';
import type { CartLine, PromptEntry, PromptLine } from './saved.ts';
import { PROMPT_FIELD_MAX, cleanText, stamp } from './saved.ts';
import { fill } from './text.ts';

/** 대분류·소분류 이름표 (머리줄 메뉴 자료에서) */
export interface Names {
  cat: (cat: string) => string;
  sub: (cat: string, sub: string) => string;
}

export function namesOf(nav: readonly NavCategory[]): Names {
  const cats = new Map(nav.map((c) => [c.id as string, c]));
  return {
    cat: (cat) => cats.get(cat)?.name ?? cat,
    sub: (cat, sub) => cats.get(cat)?.subs.find((s) => s.id === sub)?.name ?? sub,
  };
}

/** 대분류 순서(머리줄 메뉴 순)로 묶는다. 모르는 대분류는 끝에, 묶음 안은 담은 순서 그대로 */
export function groupByCategory<T extends { cat: string }>(lines: readonly T[]): { cat: string; lines: T[] }[] {
  const order: string[] = [...CATEGORY_ORDER];
  for (const l of lines) if (!order.includes(l.cat)) order.push(l.cat);
  return order.map((cat) => ({ cat, lines: lines.filter((l) => l.cat === cat) })).filter((g) => g.lines.length > 0);
}

/** .md 파일 이름: codeitso-prompt-<yyyymmdd-hhmm>.md (이용자 기기 시각) */
export function promptFileName(at: number): string {
  return `codeitso-prompt-${stamp(at)}.md`;
}

/** 줄바꿈·겹친 공백을 한 칸으로 (한 줄 안에 넣을 글) */
function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** 쓰려면 필요한 인증 (출처 자료 그대로): API 미리 보기의 auth, MCP의 requiresKey. 인증 없음·모름이면 없음 */
export function authOf(d: Pick<DetailRecord, 'preview'>): PromptLine['auth'] {
  const p = d.preview;
  if (p['requiresKey'] === true) return 'key';
  const a = typeof p['auth'] === 'string' ? p['auth'].trim() : '';
  if (a === '' || /^(none|no)$/i.test(a)) return undefined;
  return /oauth/i.test(a) && !/key/i.test(a) ? 'oauth' : 'key';
}

/** 설치 명령을 한 줄로: 여러 줄이면 ' && '로 잇고, 너무 길면 첫 줄만 */
export function installLine(install: string | undefined): string | undefined {
  const rows = (install ?? '')
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r !== '' && !r.startsWith('#'));
  if (rows.length === 0) return undefined;
  const all = rows.join(' && ');
  return cleanText([...all].length <= PROMPT_FIELD_MAX.install ? all : rows[0], PROMPT_FIELD_MAX.install);
}

/** 상세 자료에서 프롬프트 한 줄 사본을 만든다. 상세를 못 찾았으면 장바구니 줄의 이름·자리만 */
export function promptLineOf(line: CartLine, d?: DetailRecord): PromptLine {
  const out: PromptLine = { id: line.id, name: line.name, cat: line.cat, sub: line.sub };
  if (line.memo) out.memo = line.memo;
  if (!d) return out;
  const url = cleanText(d.url, PROMPT_FIELD_MAX.url);
  if (url && /^https?:\/\//.test(url)) out.url = url;
  const install = installLine(d.use?.install);
  if (install) out.install = install;
  const auth = authOf(d);
  if (auth) out.auth = auth;
  return out;
}

/** 장바구니 → 프롬프트 사본 (때·만들 앱·줄 사본). 상세 자료는 화면이 받아 넘긴다 */
export function buildPrompt(lines: readonly CartLine[], details: ReadonlyMap<string, DetailRecord>, project: string, now: number, salt = ''): PromptEntry {
  const p: PromptEntry = { id: `${now.toString(36)}${salt}`, at: now, lines: lines.map((l) => promptLineOf(l, details.get(l.id))) };
  const proj = project.trim();
  if (proj) p.project = proj;
  return p;
}

/** 재료 한 줄: '- [소분류] 이름 — 내 메모 · 주소 · 설치: … | API 키 필요' */
function itemLine(l: PromptLine, names: Names): string {
  const t = ko.prompt.text;
  let s = fill(t.item, { sub: names.sub(l.cat, l.sub), name: oneLine(l.name) });
  if (l.memo) s += fill(t.use, { memo: oneLine(l.memo) });
  if (l.url) s += fill(t.url, { url: l.url });
  if (l.install) s += fill(t.install, { cmd: l.install });
  if (l.auth === 'key') s += t.key;
  if (l.auth === 'oauth') s += t.oauth;
  return s;
}

/** 프롬프트 사본 → 붙여 넣을 글 (.md로 받아도 같은 글) */
export function promptText(p: PromptEntry, names: Names): string {
  const t = ko.prompt.text;
  const out: string[] = [t.lead];
  if (p.project) out.push(fill(t.project, { project: oneLine(p.project) }));
  out.push('');
  for (const g of groupByCategory(p.lines)) for (const l of g.lines) out.push(itemLine(l, names));
  out.push('', t.license, '');
  return out.join('\n');
}

/** [설치 명령 한꺼번에 복사]: 설치 명령이 있는 재료만, 재료마다 '# 이름' 한 줄을 붙여 빈 줄로 나눈다 */
export function installBundle(items: readonly { name: string; install?: string }[]): { text: string; count: number } {
  const withCmd = items.filter((x): x is { name: string; install: string } => typeof x.install === 'string' && x.install.trim() !== '');
  return { text: withCmd.map((x) => `# ${oneLine(x.name)}\n${x.install.trim()}`).join('\n\n'), count: withCmd.length };
}
