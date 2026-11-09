// MCP 도구 결과를 마크다운으로 (D154): 모델이 읽기 쉽고 토큰을 적게 쓰는 짧은 글. 목록은 한 재료에 두세 줄, 자세히는 재료 하나에 한 묶음.
// 출처가 쓴 글은 '제3자 글' 이름표를 달고 인용(>)이나 코드 울타리 안에 넣어 지시처럼 읽히지 않게 한다.
// 순수 함수, 시험: tests/lib/mcp-tools.test.ts
import { MCP_TEXT } from '../../copy/mcp.ts';
import { tokens, usd } from '../catalog/models.ts';
import { commas, fenceFor, fillText, inline, inlineCode, line } from './text.ts';
import type {
  CartResult,
  CategoryOverview,
  CategoryResult,
  DetailsResult,
  KitList,
  KitResult,
  MaterialDetail,
  MaterialLine,
  Page,
  SearchResult,
  SubListResult,
} from './tools.ts';

const T = MCP_TEXT;

/** id·모델 id 같은 짧은 값을 한 줄 코드로 (` 가 섞여도 코드 칸을 끊지 못한다) */
const code = (v: string): string => inlineCode(line(v, 200));

function pageLines(p: Page): string[] {
  if (p.count === 0) return [];
  const out = [fillText(T.showing, { from: p.offset + 1, to: p.offset + p.count })];
  if (p.has_more && p.next_offset !== undefined) out.push(fillText(T.more, { next: p.next_offset }));
  return out;
}

/** 목록 한 재료: 이름·id·자리·라이선스·인기 → 한 줄 설명 → (원문) */
function itemLines(m: MaterialLine, n: number): string[] {
  const meta = [`${m.category_name} > ${m.subcategory_name}`, `${T.license}: ${m.license ? inline(m.license, 60) : T.licenseNone}`];
  if (m.popularity) meta.push(m.popularity);
  if (m.updated) meta.push(`${T.updated} ${m.updated}`);
  const out = [`${n}. **${inline(m.name, 120)}** ${code(m.id)} · ${meta.join(' · ')}`];
  if (m.summary) out.push(`   ${inline(m.summary, 240)}`);
  if (m.source_summary) out.push(`   (${inline(m.source_summary, 200)})`);
  const extra = [`source: ${inline(m.source, 80)}`, ...(m.facts ?? []).map((f) => inline(f, 80))];
  out.push(`   ${extra.join(' · ')}`);
  return out;
}

export function renderSearch(r: SearchResult): string {
  const loose = r.unmatched_words && r.unmatched_words.length > 0 ? fillText(T.unmatched, { words: r.unmatched_words.map((w) => inline(w, 40)).join(', ') }) : r.loose ? T.looseNote : '';
  const out = [`## ${fillText(T.searchHead, { q: inline(r.query, 200), total: commas(r.total), loose })}`];
  if (r.ignored_words && r.ignored_words.length > 0) out.push(fillText(T.ignored, { words: r.ignored_words.map((w) => inline(w, 40)).join(', ') }));
  if (r.items.length === 0) out.push('', T.noResults);
  else {
    out.push('');
    r.items.forEach((m, i) => out.push(...itemLines(m, r.offset + i + 1)));
  }
  if (r.related_subcategories.length > 0) {
    out.push('', `${T.relatedSubs}: ${r.related_subcategories.map((s) => `${inline(s.name, 40)} (${code(s.category)}/${code(s.subcategory)}, ${commas(s.count)})`).join(' · ')}`);
  }
  const p = pageLines(r);
  if (p.length > 0) out.push('', ...p);
  return out.join('\n');
}

function detailBlock(d: MaterialDetail): string[] {
  const meta = [`${d.category_name} > ${d.subcategory_name}`, `${T.license}: ${d.license ? inline(d.license, 60) : T.licenseNone}`];
  if (d.requires) meta.push(`${T.requires}: ${d.requires === 'oauth' ? T.oauth : T.apiKey}`);
  const m = d.metrics ?? {};
  for (const k of ['stars', 'downloads', 'likes'] as const) {
    const v = m[k];
    if (typeof v === 'number') meta.push(`${commas(v)} ${k}`);
  }
  if (typeof m['updated_at'] === 'string') meta.push(`${T.updated} ${m['updated_at']}`);
  const out = [`## ${inline(d.name, 120)} ${code(d.id)}`, meta.join(' · ')];
  if (d.summary_ko) out.push(`${inline(d.summary_ko, 240)} _(${d.summary_ko_by === 'codeitso_rule' ? T.koRule : T.koWritten})_`);
  const links = [
    d.official_url ? `${T.official}: ${d.official_url}` : '',
    d.docs_url ? `${T.docs}: ${d.docs_url}` : '',
    `${T.page}: ${d.page_url}`,
  ].filter(Boolean);
  out.push(links.join(' · '));
  if (d.source_text) out.push('', `${T.sourceText} — ${inline(d.source.name, 80)}:`, `> ${inline(d.source_text, 1_200)}`);
  if (d.install) {
    const f = fenceFor(d.install);
    out.push('', `${T.install}:`, `${f}sh`, d.install, f);
  }
  if (d.snippet) {
    const f = fenceFor(d.snippet);
    out.push('', `${T.snippet}:`, f, d.snippet, f);
  }
  if (d.facts) out.push('', `${T.facts}: ${Object.entries(d.facts).map(([k, v]) => `${inline(k, 40)}: ${inline(String(v), 120)}`).join(' · ')}`);
  if (d.tags) out.push(`${T.tags}: ${d.tags.map((t) => inline(t, 40)).join(', ')}`);
  if (d.related) out.push(`${T.related}: ${d.related.map((r) => `${inline(r.name, 80)} ${code(r.id)}`).join(' · ')}`);
  if (d.models && d.models.items.length > 0) {
    out.push('', `${fillText(T.models, { date: d.models.fetched })}:`);
    for (const x of d.models.items) {
      const parts = [
        x.input_usd_per_mtok !== undefined ? `in ${usd(x.input_usd_per_mtok)}` : '',
        x.output_usd_per_mtok !== undefined ? `out ${usd(x.output_usd_per_mtok)}` : '',
        x.context_tokens !== undefined ? `ctx ${tokens(x.context_tokens)}` : '',
      ].filter(Boolean);
      out.push(`- ${inline(x.name, 80)} ${code(x.id)}${parts.length > 0 ? ` · ${parts.join(' · ')}` : ''}`);
    }
  }
  return out;
}

export function renderDetails(r: DetailsResult): string {
  const parts = r.items.map((d) => detailBlock(d).join('\n'));
  if (r.not_found.length > 0) parts.push(fillText(T.notFound, { ids: r.not_found.map((x) => `${code(x)}`).join(', ') }));
  return parts.join('\n\n---\n\n');
}

export function renderOverview(r: CategoryOverview): string {
  const out = [`## ${fillText(T.categories, { total: commas(r.total), date: r.fetched })}`, ''];
  for (const c of r.categories) {
    out.push(`- **${inline(c.name, 40)}** ${code(c.id)} (${commas(c.total)}): ${c.subcategories.map((s) => `${inline(s.name, 40)} ${code(s.id)} ${commas(s.count)}`).join(' · ')}`);
  }
  out.push('', `Starter kits: ${r.kits} (codeitso_get_kits)`);
  return out.join('\n');
}

export function renderCategory(r: CategoryResult): string {
  const out = [`## ${fillText(T.categoryHead, { name: inline(r.name, 40), id: r.id, total: commas(r.total) })}`, ''];
  for (const s of r.subcategories) {
    out.push(`- **${inline(s.name, 40)}** ${code(s.id)} (${commas(s.count)}; sort: ${s.sorts.join('/')})${s.desc ? `: ${inline(s.desc, 200)}` : ''}`);
  }
  return out.join('\n');
}

export function renderSubList(r: SubListResult): string {
  const out = [`## ${fillText(T.subHead, { cat: inline(r.category_name, 40), name: inline(r.subcategory_name, 40), id: r.subcategory, total: commas(r.total), sort: r.sort })}`, ''];
  r.items.forEach((m, i) => out.push(...itemLines(m, r.offset + i + 1)));
  const p = pageLines(r);
  if (p.length > 0) out.push('', ...p);
  return out.join('\n');
}

export function renderKits(r: KitList): string {
  const out = [`## ${fillText(T.kitsHead, { n: r.kits.length })}`, ''];
  for (const k of r.kits) out.push(`- **${inline(k.name, 80)}** ${code(k.id)} (${k.theme}, ${k.item_count}): ${inline(k.desc, 200)}`);
  return out.join('\n');
}

export function renderKit(r: KitResult): string {
  const out = [`## ${fillText(T.kitHead, { name: inline(r.name, 80), id: r.id })}`, inline(r.desc, 300), `${T.page}: ${r.page_url}`, '', `${T.outline}:`];
  r.outline.forEach((o, i) => out.push(`${i + 1}. ${inline(o, 300)}`));
  out.push('', `${T.materials}:`);
  for (const m of r.items) {
    out.push(`- **${inline(m.name, 120)}** ${code(m.id)} · ${inline(m.subcategory_name, 40)} · ${T.license}: ${m.license ? inline(m.license, 60) : T.licenseNone}`, `  ${inline(m.summary, 240)}`);
  }
  out.push('', T.detailsHint);
  return out.join('\n');
}

export function renderCart(r: CartResult): string {
  const out = [`## ${fillText(T.cartHead, { total: r.total })}`, ''];
  r.items.forEach((m, i) => {
    const n = r.offset + i + 1;
    if (m.missing) {
      out.push(`${n}. ${code(m.id)}: ${T.missingInCart}`);
      return;
    }
    const meta = [m.subcategory_name ? inline(m.subcategory_name, 40) : '', `${T.license}: ${m.license ? inline(m.license, 60) : T.licenseNone}`];
    if (m.requires) meta.push(`${T.requires}: ${m.requires === 'oauth' ? T.oauth : T.apiKey}`);
    if (m.chosen_model) meta.push(`${T.model}: ${code(m.chosen_model)}`);
    out.push(`${n}. **${inline(m.name, 120)}** ${code(m.id)} · ${meta.filter(Boolean).join(' · ')}`);
    if (m.official_url) out.push(`   ${T.official}: ${m.official_url}`);
    if (m.install) out.push(`   ${T.install}: ${inlineCode(m.install)}`);
  });
  const p = pageLines(r);
  if (p.length > 0) out.push('', ...p);
  out.push('', T.detailsHint);
  return out.join('\n');
}
