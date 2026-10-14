import type { Catalog } from './catalog.ts';
import { hasTag, tagsWithPrefix } from './conditions.ts';
import { nameHidden, productOf } from './custom.ts';
import type { EngineResult } from './evaluate.ts';
import { answerChips } from './interview.ts';
import { projectName, slotLabelFor } from './receipt.ts';
import { firstPhaseProducts } from './recheck.ts';
import { cell, fill, oneLine, pickTemplate } from './text.ts';
import type { Option, Product, TypeTemplate } from './types.ts';

export interface PackOptions {
  /** 용어 카드 링크(/terms/아이디)에 쓸 사이트 첫 주소 (끝에 / 없이). 화면에서는 siteRoot() = origin + 주소 바탕 (src/lib/routes.ts) */
  siteUrl: string;
  /** 발행 시각 (이용자 기기 시간, 예: 2026-10-12 14:05) */
  issuedAt: string;
  /**
   * 6번 '디자인 지시' 본문 (engine/look.ts renderLookSection). 디자인 값(data/looks.json)과 색 계산은 단계 화면 첫 묶음에
   * 싣지 않아서 부르는 쪽이 디자인 묶음으로 만들어 넘긴다 (T38). 없으면 느낌·화면 크기·접근성 줄과 templates.pack.designPending 한 줄
   */
  design?: string[];
}

/** 이용자 AI에게 넘길 설계도(.md, 내부 이름 pack). 문장은 모두 data/templates.json과 상품 카드에서 온다. */
export function renderPack(cat: Catalog, r: EngineResult, opts: PackOptions): string {
  const T = cat.data.templates;
  const P = T.pack;
  const L = P.labels;
  const tags = r.interview.tags;
  const site = opts.siteUrl.replace(/\/+$/, '');
  const project = projectName(cat, r);
  const typeTpl: TypeTemplate = pickTemplate(T.types, tagsWithPrefix(tags, 'type.')[0], 'type.page');
  const aiTpl = pickTemplate(T.aiTools, tagsWithPrefix(tags, 'ai.')[0], 'ai.chat-free');
  const device = pickTemplate(T.devices, tagsWithPrefix(tags, 'device.')[0], 'device.both');
  const audienceTag = tagsWithPrefix(tags, 'audience.')[0];
  const audience = audienceTag ? (T.audiences[audienceTag] ?? '') : '';
  const slotLabel = new Map(r.slots.map((s) => [s.slot.id, s.slot.label]));
  const conceptTitle = (id: string): string => cat.concept.get(id)?.title ?? id;
  const productName = (id: string): string => productOf(cat, r, id)?.name ?? id;
  const notes = r.session.notes ?? {};
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
  const chipList = answerChips(cat, r.interview, notes);
  const chips = chipList.map((c) => `${c.chip}: ${c.label}`);
  out.push(`- ${L.oneLine}: ${oneLine(r.session.freeText ?? '') || oneLine(notes[TYPE_Q] ?? '') || typeTpl.goal}`);
  out.push(`- ${L.kind}: ${typeTpl.label}`);
  if (audience) out.push(`- ${L.audience}: ${audience}`);
  // 앱 이름 (T38 P1 '내 말로'): 직접 쓴 글이라 따옴표 안에 둔다 (영수증 링크에는 없다)
  const appName = r.session.look?.appName;
  if (appName) out.push(`- ${L.appName}: “${appName}”`);
  const aiName = usedAiName(r, notes);
  out.push(`- ${L.ai}: ${aiTpl.label}${aiName ? ` (${aiName})` : ''}`);
  out.push(`- ${L.answers}: ${chips.join(' · ')}`);
  // 내 말 그대로 (D74): 내 말이 하나라도 있을 때만, 질문 순서로. 쓴 글은 한 줄 40자라 새 제목을 만들 수 없다
  const mine = chipList.filter((c) => notes[c.questionId]);
  if (mine.length > 0) {
    out.push(`- ${P.mine.label}: ${P.mine.rule}`);
    for (const c of mine) {
      const q = cat.question.get(c.questionId);
      const opt = q?.options.find((o) => o.id === r.interview.answers[c.questionId]);
      const text = notes[c.questionId] ?? '';
      // '쓰는 AI'(보기마다 aiTool)는 계산에 쓰지 않는 이름 질문이라 '계산은 … 기준' 꼬리를 붙이지 않는다
      // 만들 것(q.type)은 아래 customType 줄이 따로 붙으므로 '도구는 … 기준' 꼬리를 붙이지 않는다
      const line = !opt?.isCustom
        ? fill(P.mine.picked, { chip: c.chip, text, label: opt?.label ?? '' })
        : isNameQuestion(q?.options ?? [])
          ? fill(P.mine.keptName, { chip: c.chip, text })
          : c.questionId === TYPE_Q
            ? fill(P.mine.keptType, { chip: c.chip, text })
            : fill(P.mine.kept, { chip: c.chip, text, as: keptAs(cat, q?.options ?? [], opt) });
      out.push(`  - ${line}`);
    }
  }
  // 직접 쓴 답이 있는데 내 말이 없다(영수증 링크로 받음): AI가 '직접 쓴 답'이 무엇인지 묻게
  const blank = chipList.some((c) => !notes[c.questionId] && cat.question.get(c.questionId)?.options.find((o) => o.id === r.interview.answers[c.questionId])?.isCustom === true);
  if (blank) out.push(`- ${P.mine.label}: ${P.mine.hidden}`);
  if (hasTag(tags, CUSTOM_TYPE)) out.push(`- ${P.mine.customType}`);

  // 2. 범위
  h2(P.headings.scope);
  // 나중에 붙일 것이 없으면 '먼저'가 가리킬 다음이 없으므로 그냥 '만들 것'
  out.push(P.scopeRule, '', `### ${deferred.length > 0 ? L.firstPhase : L.build}`, '');
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
  const screens: { name: string; parts: string[] }[] = [...typeTpl.screens];
  for (const s of r.steps) {
    const extra = T.slotSteps[s.slotId]?.screen;
    if (extra) screens.push(extra);
  }
  screens.forEach((s, i) => out.push(`${i + 1}. **${s.name}**: ${s.parts.join(', ')}`));
  // 더하고 싶은 화면 (T38 P1 '내 말로'): 내 말 그대로 + '(내가 더함)'
  (r.session.look?.screens ?? []).forEach((s, i) => out.push(`${screens.length + i + 1}. **“${s}”** ${P.screenAdded}`));

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

  // 6. 디자인 지시 (T38): 디자인 묶음이 만든 본문. 못 받았으면 느낌·화면 크기·접근성과 다시 받으라는 한 줄
  h2(P.headings.design);
  if (opts.design && opts.design.length > 0) out.push(...opts.design);
  else {
    const mood = cat.question.get(STYLE_Q)?.options.find((o) => o.id === r.interview.answers[STYLE_Q] && o.isUnknown !== true && o.isCustom !== true);
    if (mood) out.push(`- ${L.styleFeel}: ${mood.label}`);
    out.push(`- ${P.designPending}`);
    out.push(`- ${L.screenSize}: ${device}`);
    out.push(`- ${L.a11y}: ${P.a11yLine}`);
  }

  // 7. 쓸 도구
  h2(P.headings.tools);
  out.push(
    `| ${L.toolSlot} | ${L.toolName} | ${L.toolProvider} | ${L.toolAccess} | ${L.toolCost} | ${L.toolLicense} | ${L.toolChecked} |`,
    '|---|---|---|---|---|---|---|',
  );
  const firstIds = new Set(firstPhaseProducts(r.cart, r.slots.map((s) => s.slot), deferred).map((p) => p.id));
  const later = (id: string): string => (firstIds.has(id) ? '' : ` ${T.receipt.later}`);
  const CT = T.customTool;
  // 직접 쓴 도구: 이름 + '(직접 씀)'. 이름 없이 받았으면(영수증 링크) '직접 쓴 도구'만
  const customName = (p: Product): string => (nameHidden(cat, p) ? cell(p.name) : `${cell(p.name)} ${CT.mark}`);
  for (const p of r.cart) {
    const labels = r.slots.filter((s) => p.capabilities.includes(s.slot.capability)).map((s) => s.slot.label);
    if (p.custom === true) {
      // 직접 쓴 도구: 이름 + '(직접 씀)', 링크 없음, 확인하지 않은 칸은 '확인 필요' (D74)
      const u = CT.unchecked;
      out.push(`| ${cell(slotLabelFor(cat, labels, 999))}${later(p.id)} | ${customName(p)} | ${u} | ${u} | ${u} | ${u} | ${u} |`);
      continue;
    }
    if (p.builderPublish === true) {
      // 빌더의 게시 기능 (B-02): 제공은 고른 웹 빌더, 자격·비용·라이선스·확인한 때는 '확인 필요'
      const u = CT.unchecked;
      out.push(`| ${cell(slotLabelFor(cat, labels, 999))}${later(p.id)} | ${cell(p.name)} | ${cell(p.provider.name)} | ${u} | ${u} | ${u} | ${u} |`);
      continue;
    }
    const link = p.links[0];
    const name = link ? `[${cell(p.name)}](${link.url})` : cell(p.name);
    out.push(
      `| ${cell(slotLabelFor(cat, labels, 999))}${later(p.id)} | ${name} | ${cell(p.provider.name)} | ${T.accessLabels[p.access]} | ${cell(p.cost.note)} | ${cell(p.license?.name ?? '-')} | ${p.checkedAt} |`,
    );
  }
  out.push('', `### ${L.memo}`);
  for (const p of r.cart) {
    if (p.custom === true) {
      out.push('', `**${customName(p)}**${later(p.id)}`, '', `- ${nameHidden(cat, p) ? CT.memoHidden : CT.memo}`);
      continue;
    }
    if (p.builderPublish === true) {
      out.push('', `**${p.name}**${later(p.id)}`, '', `- ${T.builderPublish.memo}`);
      continue;
    }
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

const TYPE_Q = 'q.type';
const STYLE_Q = 'q.style';
const CUSTOM_TYPE = 'type.custom';

/** 그대로 둔 답을 무엇과 같게 계산했는지: like 보기의 이름, 없으면 그 보기 태그의 이름 ('직접 쓴 앱', '외부 데이터') */
/** '쓰는 AI'처럼 보기가 도구 이름인 질문 (보기에 aiTool). 태그가 점수에 쓰이지 않는다 (D87) */
function isNameQuestion(options: Option[]): boolean {
  return options.some((o) => o.aiTool !== undefined);
}

/** 쓰는 AI 이름 (설계서 7.1절, 1번 '만드는 AI' 줄): 목록에서 골랐으면 보기 이름, 직접 썼으면 “내 말”, 안 정했으면 빈 글 */
function usedAiName(r: EngineResult, notes: Record<string, string>): string {
  for (const q of r.interview.visible) {
    if (!isNameQuestion(q.options)) continue;
    const opt = q.options.find((o) => o.id === r.interview.answers[q.id]);
    if (!opt || opt.isUnknown === true) continue;
    if (opt.isCustom !== true) return opt.label;
    const note = notes[q.id];
    if (note) return `“${note}”`;
  }
  return '';
}

function keptAs(cat: Catalog, options: Option[], opt: Option): string {
  const like = options.find((o) => o.id === opt.like);
  if (like) return like.label;
  return Object.keys(opt.tags)
    .map((t) => cat.tagLabel.get(t) ?? t)
    .join(', ');
}

/** 설계도 파일 이름: codechauffeur-plan-YYYYMMDD-HHmm.md (이용자 기기 시간) */
export function packFileName(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `codechauffeur-plan-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}.md`;
}
