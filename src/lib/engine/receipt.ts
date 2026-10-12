import type { Catalog } from './catalog.ts';
import { tagsWithPrefix } from './conditions.ts';
import type { EngineResult } from './evaluate.ts';
import { firstPhaseProducts } from './recheck.ts';
import { displayWidth, fill, formatMinutes, oneLine, padEndWidth, padStartWidth, truncateWidth } from './text.ts';

export interface ReceiptItem {
  /** 이 상품이 맡은 칸 이름 (여럿이면 ', '로 잇는다) */
  slot: string;
  productId: string;
  name: string;
  free: boolean;
  price: string;
  /** 2차로 미룬 칸에만 쓰이는 상품 */
  later: boolean;
}

export interface ReceiptModel {
  title: string;
  issuedAt: string;
  destinationLabel: string;
  destination: string;
  items: ReceiptItem[];
  totalLabel: string;
  total: string;
  minutes: number;
  timeLabel: string;
  timeText: string;
  difficultyLabel: string;
  difficulty: number;
  difficultyText: string;
  counts: { prep: number; study: number; research: number };
  countLabels: { prep: string; study: string; research: string };
  stamp: string;
  footer: string;
  /** 2차 품목 표시 */
  laterMark: string;
}

/** 꾸러미 제목과 영수증 목적지에 쓰는 이름: 한 줄 입력 → 유형 이름 → '내 앱' */
export function projectName(cat: Catalog, r: EngineResult): string {
  const free = oneLine(r.session.freeText ?? '', 30);
  if (free) return free;
  const typeTag = tagsWithPrefix(r.interview.tags, 'type.')[0];
  const t = typeTag ? cat.data.templates.types[typeTag] : undefined;
  return t?.label ?? cat.data.templates.receipt.unnamed;
}

/** 난이도 말: 기준의 절반 이하 쉬움, 기준 이하 보통, 넘으면 어려움 */
export function difficultyWord(cat: Catalog, n: number): string {
  const split = cat.data.scoring.phaseSplitDifficulty;
  const words = cat.data.templates.receipt.levels;
  if (n <= Math.floor(split / 2)) return words.easy;
  if (n <= split) return words.normal;
  return words.hard;
}

/** 상품이 맡은 칸 이름: '저장, 배포·공유'처럼 잇고, width를 넘으면 '저장 외 1칸' */
export function slotLabelFor(cat: Catalog, labels: string[], width: number): string {
  if (labels.length === 0) return cat.data.templates.pack.labels.toolOther;
  const joined = labels.join(', ');
  if (displayWidth(joined) <= width || labels.length === 1) return joined;
  return `${labels[0]} ${fill(cat.data.templates.receipt.more, { n: labels.length - 1 })}`;
}

export function receiptModel(cat: Catalog, r: EngineResult, issuedAt: string): ReceiptModel {
  const t = cat.data.templates.receipt;
  const slotDefs = r.slots.map((s) => s.slot);
  const first = new Set(firstPhaseProducts(r.cart, slotDefs, r.session.deferred).map((p) => p.id));
  const items: ReceiptItem[] = r.cart.map((p) => {
    const labels = slotDefs.filter((s) => p.capabilities.includes(s.capability)).map((s) => s.label);
    return {
      slot: slotLabelFor(cat, labels, 11),
      productId: p.id,
      name: p.name,
      free: p.cost.free,
      price: p.cost.free ? t.free : t.paid,
      later: !first.has(p.id),
    };
  });
  const allFree = items.every((i) => i.free);
  const difficulty = r.split.difficultyFirst;
  return {
    title: t.title,
    issuedAt,
    destinationLabel: t.destination,
    destination: projectName(cat, r),
    items,
    totalLabel: t.total,
    total: allFree ? t.free : t.paidIncluded,
    minutes: r.minutes,
    timeLabel: t.time,
    timeText: formatMinutes(r.minutes, t.timeFormat),
    difficultyLabel: t.difficulty,
    difficulty,
    difficultyText: `${difficulty} ${difficultyWord(cat, difficulty)}`,
    counts: { prep: r.prep.length, study: r.study.all.length, research: r.research.length },
    countLabels: { prep: t.prep, study: t.study, research: t.research },
    stamp: t.stamp,
    footer: t.footer,
    laterMark: t.later,
  };
}

const WIDTH = 36;

function center(s: string): string {
  const pad = Math.max(0, Math.floor((WIDTH - displayWidth(s)) / 2));
  return ' '.repeat(pad) + s;
}

function row(left: string, right: string): string {
  const room = WIDTH - displayWidth(right) - 1;
  return padEndWidth(truncateWidth(left, room), room) + ' ' + right;
}

/** 복사·공유용 고정폭 텍스트 영수증 (D2Coding 같은 고정폭 글꼴 기준 36칸) */
export function renderReceiptText(m: ReceiptModel): string {
  const line = '-'.repeat(WIDTH);
  const out: string[] = [center(m.title), center(m.issuedAt), line];
  out.push(`${m.destinationLabel}  ${truncateWidth(m.destination, WIDTH - displayWidth(m.destinationLabel) - 2)}`);
  out.push(line);
  const slotW = 12;
  const priceW = 4;
  const nameW = WIDTH - slotW - priceW - 1;
  for (const i of m.items) {
    const slot = padEndWidth(truncateWidth(i.later ? `${i.slot}${m.laterMark}` : i.slot, slotW - 1), slotW);
    const name = padEndWidth(truncateWidth(i.name, nameW), nameW);
    out.push(`${slot}${name} ${padStartWidth(i.price, priceW)}`);
  }
  out.push(line);
  out.push(row(m.totalLabel, m.total));
  out.push(row(m.timeLabel, m.timeText));
  out.push(row(m.difficultyLabel, m.difficultyText));
  out.push(`${m.countLabels.prep} ${m.counts.prep} · ${m.countLabels.study} ${m.counts.study} · ${m.countLabels.research} ${m.counts.research}`);
  out.push(line);
  out.push(center(`[ ${m.stamp} ]`));
  out.push(center(m.footer));
  return out.join('\n');
}
