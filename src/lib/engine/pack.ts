import type { Catalog } from './catalog.ts';
import { hasTag, tagsWithPrefix } from './conditions.ts';
import type { EngineResult } from './evaluate.ts';
import { answerChips } from './interview.ts';
import { projectName, slotLabelFor } from './receipt.ts';
import { firstPhaseProducts } from './recheck.ts';
import { cell, fill, oneLine } from './text.ts';
import type { StyleTemplate, TypeTemplate } from './types.ts';

export interface PackOptions {
  /** 용어 카드 링크(/terms/아이디)에 쓸 사이트 주소 (끝에 / 없이). 화면에서는 location.origin */
  siteUrl: string;
  /** 발행 시각 (이용자 기기 시간, 예: 2026-10-12 14:05) */
  issuedAt: string;
}

function pick<T>(record: Record<string, T>, tag: string | undefined, fallback: string): T {
  const v = (tag !== undefined ? record[tag] : undefined) ?? record[fallback];
  if (v === undefined) throw new Error(`문장 틀이 없습니다: ${tag ?? fallback}`);
  return v;
}

/** 이용자 AI에게 넘길 설계도(.md, 내부 이름 pack). 문장은 모두 data/templates.json과 상품 카드에서 온다. */
export function renderPack(cat: Catalog, r: EngineResult, opts: PackOptions): string {
  const T = cat.data.templates;
  const P = T.pack;
  const L = P.labels;
  const tags = r.interview.tags;
  const site = opts.siteUrl.replace(/\/+$/, '');
  const project = projectName(cat, r);
  const typeTpl: TypeTemplate = pick(T.types, tagsWithPrefix(tags, 'type.')[0], 'type.page');
  const aiTpl = pick(T.aiTools, tagsWithPrefix(tags, 'ai.')[0], 'ai.chat-free');
  const style: StyleTemplate = pick(T.styles, tagsWithPrefix(tags, 'style.')[0], 'style.clean');
  const device = pick(T.devices, tagsWithPrefix(tags, 'device.')[0], 'device.both');
  const audienceTag = tagsWithPrefix(tags, 'audience.')[0];
  const audience = audienceTag ? (T.audiences[audienceTag] ?? '') : '';
  const slotLabel = new Map(r.slots.map((s) => [s.slot.id, s.slot.label]));
  const conceptTitle = (id: string): string => cat.concept.get(id)?.title ?? id;
  const productName = (id: string): string => cat.product.get(id)?.name ?? id;
  const deferred = r.session.deferred;

  const out: string[] = [];
  const h2 = (s: string): void => {
    out.push('', `## ${s}`, '');
  };

  // 머리말
  out.push(`# ${fill(P.title, { project })}`, '');
  for (const line of P.intro) out.push(`> ${fill(line, { saveAs: aiTpl.saveAs })}`);
  out.push('', `${L.issued}: ${opts.issuedAt} · ${L.format} 1`);

  // 1. 만들 것 (목적지)
  h2(P.headings.what);
  const chips = answerChips(cat, r.interview).map((c) => `${c.chip}: ${c.label}`);
  out.push(`- ${L.oneLine}: ${oneLine(r.session.freeText ?? '') || typeTpl.goal}`);
  out.push(`- ${L.kind}: ${typeTpl.label}`);
  if (audience) out.push(`- ${L.audience}: ${audience}`);
  out.push(`- ${L.ai}: ${aiTpl.label}`);
  out.push(`- ${L.answers}: ${chips.join(' · ')}`);

  // 2. 범위
  h2(P.headings.scope);
  out.push(P.scopeRule, '', `### ${L.firstPhase}`, '');
  for (const f of typeTpl.features) out.push(`- ${f.name}`);
  for (const s of r.steps) {
    if (s.slotId === 'slot.screen') continue;
    const names = s.products.map(productName).join(', ');
    out.push(`- ${s.title}${names ? `: ${names}` : ''}`);
  }
  out.push('', `### ${L.notBuild}`, '');
  for (const n of r.notBuild) out.push(`- ${n}`);
  if (deferred.length > 0) {
    out.push('', `### ${L.deferred}`, '');
    for (const id of deferred) out.push(`- ${slotLabel.get(id) ?? id}: ${P.deferredNote}`);
  }

  // 3. 화면 목록
  h2(P.headings.screens);
  const screens = [...typeTpl.screens];
  for (const s of r.steps) {
    const extra = T.slotSteps[s.slotId]?.screen;
    if (extra) screens.push(extra);
  }
  screens.forEach((s, i) => out.push(`${i + 1}. **${s.name}**: ${s.parts.join(', ')}`));

  // 4. 기능과 완성 확인 기준
  h2(P.headings.features);
  out.push(`| ${L.feature} | ${L.doneWhen} |`, '|---|---|');
  for (const f of typeTpl.features) out.push(`| ${cell(f.name)} | ${cell(f.doneWhen)} |`);

  // 5. 데이터 구조 초안
  h2(P.headings.data);
  const dataLines: string[] = [];
  if (hasTag(tags, 'need.save')) {
    if (typeTpl.dataModel && typeTpl.dataModel.length > 0) {
      for (const d of typeTpl.dataModel) dataLines.push(`- **${d.entity}**: ${d.fields.join(', ')}`);
    } else {
      dataLines.push(`- ${P.dataLines.decideLater}`);
    }
    if (hasTag(tags, 'sensitive.personal')) dataLines.push(`- ${P.dataLines.personal}`);
  }
  const dataStep = r.steps.find((s) => s.slotId === 'slot.data' && s.products.length > 0);
  if (dataStep) dataLines.push(`- ${fill(P.dataLines.external, { names: dataStep.products.map(productName).join(', ') })}`);
  if (dataLines.length === 0) dataLines.push(`- ${P.dataLines.none}`);
  out.push(...dataLines);

  // 6. 디자인 지시
  h2(P.headings.design);
  const c = style.palette;
  out.push(`- ${L.styleFeel}: ${style.label}. ${style.note}`);
  out.push(
    `- ${L.colors}: ${L.colorBackground} ${c.background}, ${L.colorSurface} ${c.surface}, ${L.colorText} ${c.text}, ${L.colorAccent} ${c.accent} (${L.colorAccentText} ${c.accentText})`,
  );
  out.push(`- ${L.font}: ${style.fontFamily}, ${L.fontSize} ${style.baseFontSize}`);
  out.push(`- ${L.radius}: ${style.radius}`);
  out.push(`- ${L.screenSize}: ${device}`);
  out.push(`- ${L.a11y}: ${P.a11yLine}`);

  // 7. 쓸 도구
  h2(P.headings.tools);
  out.push(
    `| ${L.toolSlot} | ${L.toolName} | ${L.toolProvider} | ${L.toolAccess} | ${L.toolCost} | ${L.toolLicense} | ${L.toolChecked} |`,
    '|---|---|---|---|---|---|---|',
  );
  const firstIds = new Set(firstPhaseProducts(r.cart, r.slots.map((s) => s.slot), deferred).map((p) => p.id));
  const later = (id: string): string => (firstIds.has(id) ? '' : ` ${T.receipt.later}`);
  for (const p of r.cart) {
    const labels = r.slots.filter((s) => p.capabilities.includes(s.slot.capability)).map((s) => s.slot.label);
    const link = p.links[0];
    const name = link ? `[${cell(p.name)}](${link.url})` : cell(p.name);
    out.push(
      `| ${cell(slotLabelFor(cat, labels, 999))}${later(p.id)} | ${name} | ${cell(p.provider.name)} | ${T.accessLabels[p.access]} | ${cell(p.cost.note)} | ${cell(p.license?.name ?? '-')} | ${p.checkedAt} |`,
    );
  }
  out.push('', `### ${L.memo}`);
  for (const p of r.cart) {
    out.push('', `**${p.name}**${later(p.id)}`, '');
    if (p.layer === 'index') {
      out.push(`- ${P.indexMemo}`);
      continue;
    }
    if (p.promptFragment) out.push(`- ${L.instruction}: ${p.promptFragment}`);
    for (const s of p.stuck ?? []) out.push(`- ${L.stuck}: ${s}`);
  }
  const ruleStuck = r.stuck.filter((s) => !cat.product.has(s.from));
  if (ruleStuck.length > 0) {
    out.push('', `**${L.together}**`, '');
    for (const s of ruleStuck) out.push(`- ${s.text}`);
  }

  // 8. 준비물
  h2(P.headings.prep);
  if (r.prep.length === 0) {
    out.push(P.noPrep);
  } else {
    out.push(P.prepIntro, '');
    for (const item of r.prep) {
      out.push(`- [ ] ${item.label} (${T.leadLabels[item.lead]})${item.url ? ` ${item.url}` : ''}`);
    }
  }

  // 9. 만들기 전에 알아볼 것
  h2(P.headings.research);
  if (r.research.length === 0) {
    out.push(P.noResearch);
  } else {
    out.push(P.researchIntro);
    r.research.forEach((item, i) => {
      out.push('', `### 9-${i + 1}. ${item.area}`, '');
      out.push(`- ${L.what}: ${item.what}`);
      out.push(`- ${L.why}: ${item.why}`);
      out.push(`- ${L.where}: ${item.where.join(' / ')}`);
      out.push(`- ${L.researchDone}: ${item.doneWhen}`);
    });
  }

  // 10. 진행 순서
  h2(P.headings.steps);
  out.push(P.stepRule, '');
  r.steps.forEach((s, i) => {
    const names = s.products.map(productName).join(', ');
    out.push(`${i + 1}. **${s.title}**: ${names || P.noToolStep}`);
    if (s.doneWhen) out.push(`   - ${L.check}: ${s.doneWhen}`);
    if (s.concepts.length > 0) {
      const links = s.concepts.map((id) => `[${conceptTitle(id)}](${fill(P.conceptLink, { site, id })})`);
      out.push(`   - ${L.concepts}: ${links.join(', ')}`);
    }
  });

  // 11. 안전 기본 지시
  h2(P.headings.safety);
  for (const line of r.safety.lines) out.push(`- ${line}`);

  // 12. AI 작업 방식
  h2(P.headings.work);
  for (const line of aiTpl.workStyle) out.push(`- ${line}`);

  out.push('', '---', '', T.disclaimer, '');
  return out.join('\n');
}

/** 대화 카드(화면: AI에게 할 말): 고른 AI에 맞게 설계도를 가리키는 말을 채운다 */
export function conversationCards(cat: Catalog, r: EngineResult): { id: string; title: string; when: string; text: string }[] {
  const T = cat.data.templates;
  const aiTpl = pick(T.aiTools, tagsWithPrefix(r.interview.tags, 'ai.')[0], 'ai.chat-free');
  return T.conversationCards.map((c) => ({ ...c, text: fill(c.text, { packRef: aiTpl.packRef }) }));
}

/** 설계도 파일 이름: codechauffeur-plan-YYYYMMDD-HHmm.md (이용자 기기 시간) */
export function packFileName(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `codechauffeur-plan-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}.md`;
}
