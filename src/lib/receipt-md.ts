// 재료 목록 .md 만들기 (brief 3절 '계산 → 영수증'): 영수증 사본에서 내 AI에게 줄 Markdown 글을 만든다. 부작용 없음, 시험 있음.
// 머리말(이 재료로 만들어 달라는 안내, 라이선스·비밀 값 주의) → 만들 앱(프로젝트 메모) → 대분류별 재료(이름·주소·라이선스·쓰는 법·내 메모)
// → 라이선스 주의 한 줄. 문장은 src/copy/ko.ts의 ko.md (AI에게 하는 말이라 반말 '~해 줘'). 재료 사실은 출처 자료 그대로만.
import { ko } from '../copy/ko.ts';
import { CATEGORY_ORDER } from './catalog/types.ts';
import type { DetailRecord, NavCategory } from './catalog/types.ts';
import { issuedNow } from './clock.ts';
import { receiptNo } from './receipt-no.ts';
import type { CartLine, Receipt, ReceiptLine } from './saved.ts';
import { RECEIPT_FIELD_MAX, cleanText, receiptNumber, stamp } from './saved.ts';
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

/** .md 파일 이름: codeshopper-<yyyymmdd-hhmm>.md (이용자 기기 시각) */
export function mdFileName(at: number): string {
  return `codeshopper-${stamp(at)}.md`;
}

/** 줄바꿈·겹친 공백을 한 칸으로 (목록 한 줄 안에 넣을 글) */
function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** 코드 울타리: 글 안의 가장 긴 ` 줄보다 하나 더 길게 (조각에 ```가 있어도 깨지지 않게) */
export function fence(text: string, lang = ''): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const bar = '`'.repeat(Math.max(3, longest + 1));
  return `${bar}${lang}\n${text.replace(/\s+$/, '')}\n${bar}`;
}

function item(l: ReceiptLine, names: Names): string[] {
  const md = ko.md;
  const out = [fill(md.itemTitle, { name: oneLine(l.name) }), ''];
  const bullets = [fill(md.kind, { cat: names.cat(l.cat), sub: names.sub(l.cat, l.sub) })];
  if (l.url) bullets.push(fill(md.url, { url: l.url }));
  bullets.push(l.license ? fill(md.license, { license: oneLine(l.license) }) : md.licenseNone);
  if (l.source) bullets.push(fill(md.source, { source: oneLine(l.source) }));
  if (l.docs && l.docs !== l.url) bullets.push(fill(md.docs, { url: l.docs }));
  if (l.memo) bullets.push(fill(md.memo, { memo: oneLine(l.memo) }));
  out.push(...bullets.map((b) => `- ${b}`));
  if (l.install) out.push('', md.install, '', fence(l.install, 'sh'));
  if (l.snippet) out.push('', md.snippet, '', fence(l.snippet));
  out.push('');
  return out;
}

/** 영수증 사본 → 재료 목록 Markdown. site는 사이트 첫 주소(끝에 한 줄로 남긴다) */
export function receiptMarkdown(r: Receipt, names: Names, site: string): string {
  const md = ko.md;
  const date = issuedNow(new Date(r.at));
  const out: string[] = [md.title, '', fill(md.meta, { no: r.no, date, n: r.lines.length }), '', md.aiTitle, '', md.aiLead, '', ...md.aiRules.map((x) => `- ${x}`), ''];
  if (r.project) out.push(md.projectTitle, '', oneLine(r.project), '');
  out.push(md.listTitle, '');
  for (const g of groupByCategory(r.lines)) {
    out.push(fill(md.catTitle, { name: names.cat(g.cat), n: g.lines.length }), '');
    for (const l of g.lines) out.push(...item(l, names));
  }
  out.push(md.noteTitle, '', fill(md.note, { date: date.slice(0, 10) }), '', '---', '', fill(md.footer, { site }), '');
  return out.join('\n');
}

/** [설치 명령 한꺼번에 복사]: 설치 명령이 있는 재료만, 재료마다 '# 이름' 한 줄을 붙여 빈 줄로 나눈다 */
export function installBundle(items: readonly { name: string; install?: string }[]): { text: string; count: number } {
  const withCmd = items.filter((x): x is { name: string; install: string } => typeof x.install === 'string' && x.install.trim() !== '');
  return { text: withCmd.map((x) => `# ${oneLine(x.name)}\n${x.install.trim()}`).join('\n\n'), count: withCmd.length };
}

/** 상세 자료에서 영수증 한 줄 사본을 만든다 (출처 자료 그대로). 상세를 못 찾았으면 장바구니 줄의 이름·자리만 */
export function receiptLineOf(line: CartLine, d?: DetailRecord): ReceiptLine {
  const out: ReceiptLine = { id: line.id, name: line.name, cat: line.cat, sub: line.sub };
  if (line.memo) out.memo = line.memo;
  if (!d) return out;
  const pick = (k: keyof typeof RECEIPT_FIELD_MAX, v: string | undefined): void => {
    const t = cleanText(v, RECEIPT_FIELD_MAX[k]);
    if (t) out[k] = t;
  };
  pick('url', d.url);
  pick('license', d.license);
  pick('source', d.source?.name);
  pick('install', d.use?.install);
  pick('snippet', d.use?.snippet);
  pick('docs', d.use?.docs);
  return out;
}

/** 장바구니 → 영수증 (번호·때·프로젝트 메모·줄 사본). 상세 자료는 화면이 받아 넘긴다 */
export function buildReceipt(lines: readonly CartLine[], details: ReadonlyMap<string, DetailRecord>, project: string, now: number, salt = ''): Receipt {
  const ids = lines.map((l) => l.id);
  const r: Receipt = {
    id: `${now.toString(36)}${salt}`,
    no: receiptNumber(now, receiptNo(`${ids.join(',')}@${now}`)),
    at: now,
    lines: lines.map((l) => receiptLineOf(l, details.get(l.id))),
  };
  const p = project.trim();
  if (p) r.project = p;
  return r;
}
