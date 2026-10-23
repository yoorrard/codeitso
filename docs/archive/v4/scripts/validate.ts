// 자료 검사 로직: 스키마 검사 + 파일끼리 맞물리는지 검사. 부작용 없음 (파일을 읽지 않고 출력·종료도 하지 않는다).
// node scripts/validate-data.ts와 tests/data.test.ts가 함께 쓴다. 파일 읽기는 load-data.ts의 loadValidationInput.
import Ajv2020 from 'ajv/dist/2020.js';
import type { Catalog, Condition, Data, Question } from '../../src/lib/engine/index.ts';
import { BUILDER_PUBLISH_ID, evaluate, makeCatalog } from '../../src/lib/engine/index.ts';
import { contrast as ratio, ratio2, shiftUntil } from '../../src/lib/engine/color.ts';
import { darkSoftOf, LOOK_TYPE_OF_TAG } from '../../src/lib/engine/look.ts';
import type { Looks } from '../../src/lib/engine/types.ts';
import { usesCart } from '../../src/lib/engine/conditions.ts';
import { LOOK_FONT_CARD } from '../../src/lib/engine/checkout.ts';
import type { Aliases } from '../../src/lib/aliases.ts';
import { aliasKey, nameKey, STYLE_QUESTION } from '../../src/lib/aliases.ts';
import type { Glossary } from '../../src/lib/glossary.ts';
import { DATA_FILES } from './data-files.ts';

export interface Sources {
  sources: { id: string; categoryMap: Record<string, string>; fallbackDomain?: string }[];
}

export interface ValidationInput {
  data: Data;
  sources: Sources;
  /** data/glossary.json (어려운 말 풀이). 엔진은 쓰지 않아 data와 따로 둔다 */
  glossary: Glossary;
  /** data/aliases.json (낱말표: 검색 동의어, T36부터 직접 쓰기 낱말). 엔진 계산(evaluate)은 쓰지 않아 data와 따로 둔다 */
  aliases: Aliases;
  /** data/looks.json (디자인 정하기 값, T38). 엔진 계산(evaluate)은 쓰지 않아 data와 따로 둔다 */
  looks: Looks;
  /** schemas/*.schema.json 내용 */
  schemas: object[];
  goldens: { name: string; value: unknown }[];
  /** 배포용: 진열 상품에 needsReview가 남으면 오류 */
  release: boolean;
  /** 확인한 때(checkedAt)가 미래인지 볼 기준 달 'YYYY-MM' */
  thisMonth: string;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateAll(input: ValidationInput): ValidationResult {
  const release = input.release;
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string): void => {
    errors.push(m);
  };
  const warn = (m: string): void => {
    warnings.push(m);
  };

  // ── 1. 스키마 검사 ────────────────────────────────────────────
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false, strictRequired: false, allowUnionTypes: true });
  for (const s of input.schemas) ajv.addSchema(s);
  const schemaFor: Record<string, string> = {
    'taxonomy.json': 'taxonomy.schema.json',
    'scoring.json': 'scoring.schema.json',
    'questions.json': 'questions.schema.json',
    'rules.json': 'rules.schema.json',
    'products.json': 'products.schema.json',
    'concepts.json': 'concepts.schema.json',
    'research-cards.json': 'research-cards.schema.json',
    'templates.json': 'templates.schema.json',
    'recipes.json': 'recipes.schema.json',
    'errors.json': 'errors.schema.json',
    'sources.json': 'sources.schema.json',
    'glossary.json': 'glossary.schema.json',
    'aliases.json': 'aliases.schema.json',
    'looks.json': 'looks.schema.json',
  };
  const validateValue = (name: string, value: unknown, schemaId: string): void => {
    const validate = ajv.getSchema(schemaId);
    if (!validate) {
      err(`${schemaId} 스키마를 찾을 수 없습니다`);
      return;
    }
    if (!validate(value)) {
      for (const e of validate.errors ?? []) err(`${name} ${e.instancePath || '/'} ${e.message ?? ''} ${JSON.stringify(e.params)}`);
    }
  };
  const fileValue = (file: string): unknown => {
    if (file === 'sources.json') return input.sources;
    if (file === 'glossary.json') return input.glossary;
    if (file === 'aliases.json') return input.aliases;
    if (file === 'looks.json') return input.looks;
    const key = (Object.keys(DATA_FILES) as (keyof typeof DATA_FILES)[]).find((k) => DATA_FILES[k] === file);
    return key ? input.data[key] : undefined;
  };
  for (const [file, schemaId] of Object.entries(schemaFor)) validateValue(file, fileValue(file), schemaId);
  for (const g of input.goldens) validateValue(g.name, g.value, 'golden.schema.json');
  for (const file of Object.values(DATA_FILES)) if (!(file in schemaFor)) err(`${file}에 맞는 스키마가 없습니다`);

  if (errors.length > 0) return { errors, warnings };

  // ── 2. 파일끼리 맞물리는지 ─────────────────────────────────────
  const data: Data = input.data;
  const cat: Catalog = makeCatalog(data);
  const tagIds = new Set(data.taxonomy.tags.map((t) => t.id));
  const questionIds = data.questions.questions.map((q) => q.id);
  const productIds = new Set(data.products.products.map((p) => p.id));
  const conceptIds = new Set(data.concepts.concepts.map((c) => c.id));
  const cardIds = new Set(data.researchCards.cards.map((c) => c.id));
  const thisMonth = input.thisMonth;

  function dupes(where: string, ids: string[]): void {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err(`${where}: id가 겹칩니다 → ${id}`);
      seen.add(id);
    }
  }

  /** 조건 안의 태그·질문·보기·상품 id가 모두 있는지 */
  function checkCondition(where: string, c: Condition): void {
    if ('always' in c) return;
    if ('answer' in c) {
      const q = cat.question.get(c.answer);
      if (!q) return err(`${where}: 없는 질문 ${c.answer}`);
      const opts = 'is' in c ? [c.is] : c.in;
      for (const o of opts) if (!q.options.some((x) => x.id === o)) err(`${where}: ${c.answer}에 없는 보기 ${o}`);
      return;
    }
    if ('tag' in c) {
      if (!tagIds.has(c.tag)) err(`${where}: 분류표에 없는 태그 ${c.tag}`);
      return;
    }
    if ('cartHas' in c) {
      if (!productIds.has(c.cartHas)) err(`${where}: 없는 상품 ${c.cartHas}`);
      return;
    }
    if ('cartAny' in c) return;
    if ('all' in c) return c.all.forEach((x) => checkCondition(where, x));
    if ('any' in c) return c.any.forEach((x) => checkCondition(where, x));
    if ('deferred' in c) {
      if (!slotIdsAll.has(c.deferred)) err(`${where}: 어떤 규칙도 만들지 않는 칸 ${c.deferred}`);
      return;
    }
    checkCondition(where, c.not);
  }

  /** 조건이 쓰는 태그 목록 */
  function conditionTags(c: Condition): string[] {
    if ('tag' in c) return [c.tag];
    if ('all' in c) return c.all.flatMap(conditionTags);
    if ('any' in c) return c.any.flatMap(conditionTags);
    if ('not' in c) return conditionTags(c.not);
    return [];
  }

  /** 조건이 답을 보는 질문 목록 */
  function conditionAnswers(c: Condition): string[] {
    if ('answer' in c) return [c.answer];
    if ('all' in c) return c.all.flatMap(conditionAnswers);
    if ('any' in c) return c.any.flatMap(conditionAnswers);
    if ('not' in c) return conditionAnswers(c.not);
    return [];
  }

  /** 태그 묶음 둘이 같은지 (순서 무관) */
  const sameTags = (a: Record<string, number>, b: Record<string, number>): boolean =>
    JSON.stringify(Object.entries(a).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))) ===
    JSON.stringify(Object.entries(b).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)));

  /** 고르지 않아도 되는 질문('쓰는 AI')의 태그 접두어: 점수·규칙·노출 조건에 쓰지 않는다 (D87) */
  const OPTIONAL_TAG = 'aitool.';
  const optionalIds = new Set(data.questions.questions.filter((q) => q.optional === true).map((q) => q.id));
  /** 조건이 고르지 않아도 되는 질문이나 그 태그를 보면 오류 (답하지 않아도 끝나는 질문이라 계산을 바꾸면 안 된다) */
  function noOptionalRefs(where: string, c: Condition): void {
    for (const t of conditionTags(c)) if (t.startsWith(OPTIONAL_TAG)) err(`${where}: ${t}처럼 고르지 않아도 되는 질문의 태그는 조건에 쓰지 않습니다`);
    for (const qid of conditionAnswers(c)) if (optionalIds.has(qid)) err(`${where}: 고르지 않아도 되는 질문 ${qid}의 답은 조건에 쓰지 않습니다`);
  }

  /** 모든 칸 규칙이 만드는 칸 id (조건의 deferred 검사용) */
  const slotIdsAll = new Set(data.rules.rules.flatMap((r) => (r.type === 'slot' ? [r.slot.id] : [])));

  // 분류표
  dupes('taxonomy', data.taxonomy.tags.map((t) => t.id));

  // 질문
  dupes('questions', questionIds);
  const producedSoFar = new Set<string>();
  data.questions.questions.forEach((q, i) => {
    dupes(`${q.id} 보기`, q.options.map((o) => o.id));
    if (q.options.filter((o) => o.isUnknown).length > 1) err(`${q.id}: '모르겠어요' 보기는 하나만 둡니다`);
    checkCustomOption(q);
    checkOptionalQuestion(q);
    checkGroups(q);
    if (q.showIf) {
      noOptionalRefs(`${q.id}.showIf`, q.showIf);
      checkCondition(`${q.id}.showIf`, q.showIf);
      if (usesCart(q.showIf)) err(`${q.id}.showIf: 질문 노출 조건에 장바구니를 쓸 수 없습니다`);
      for (const t of conditionTags(q.showIf)) {
        if (!producedSoFar.has(t)) err(`${q.id}.showIf: 태그 ${t}를 앞선 질문이 만들지 않습니다`);
      }
      const refs = JSON.stringify(q.showIf).match(/"answer":"(q\.[a-z0-9-]+)"/g) ?? [];
      for (const ref of refs) {
        const qid = ref.slice(10, -1);
        if (questionIds.indexOf(qid) >= i) err(`${q.id}.showIf: 뒤에 있는 질문 ${qid}의 답을 볼 수 없습니다`);
      }
    }
    for (const o of q.options) {
      for (const t of Object.keys(o.tags)) {
        if (!tagIds.has(t)) err(`${q.id}.${o.id}: 분류표에 없는 태그 ${t}`);
        producedSoFar.add(t);
      }
    }
  });
  for (const t of tagIds) {
    const tag = data.taxonomy.tags.find((x) => x.id === t);
    if (!producedSoFar.has(t) && (tag?.phase ?? 1) === 1) warn(`taxonomy: 어떤 질문도 만들지 않는 태그 ${t}`);
  }

  /** '직접 쓰기' 보기 (D74, input.md 9.1절): 질문마다 하나, id custom, '모르겠어요' 바로 앞, like면 tags가 같고 아니면 keep */
  function checkCustomOption(q: Question): void {
    const customs = q.options.filter((o) => o.isCustom === true);
    if (customs.length !== 1) err(`${q.id}: '직접 쓰기' 보기(isCustom)는 질문마다 하나 둡니다 (지금 ${customs.length}개)`);
    const unknownAt = q.options.findIndex((o) => o.isUnknown === true);
    const wantAt = unknownAt >= 0 ? unknownAt - 1 : q.options.length - 1;
    for (const c of customs) {
      const where = `${q.id}.${c.id}`;
      if (c.id !== 'custom') err(`${where}: '직접 쓰기' 보기의 id는 custom입니다`);
      if (q.options.indexOf(c) !== wantAt) err(`${where}: '직접 쓰기' 보기는 '모르겠어요' 바로 앞(없으면 맨 끝)에 둡니다`);
      if (c.like !== undefined) {
        const like = q.options.find((o) => o.id === c.like);
        if (!like || like.isCustom === true) err(`${where}: like(${c.like})는 같은 질문의 다른 보기여야 합니다`);
        else if (!sameTags(like.tags, c.tags)) err(`${where}: like로 정한 보기(${c.like})와 tags가 같아야 합니다 (그대로 둔 답은 그 보기와 같게 계산한다)`);
        if (c.keep !== undefined) err(`${where}: like가 있으면 keep을 두지 않습니다 (화면이 like 보기 이름으로 말한다)`);
      } else if (c.keep === undefined) err(`${where}: like가 없으면 그대로 둘 때의 계산을 말하는 keep이 있어야 합니다`);
    }
  }

  /** 고르지 않아도 되는 질문 (D87): 태그 없는 '모르겠어요' 하나, 보기 태그는 aitool.*만, 도구 보기마다 aiTool */
  function checkOptionalQuestion(q: Question): void {
    for (const o of q.options) {
      const where = `${q.id}.${o.id}`;
      for (const t of Object.keys(o.tags)) {
        if (q.optional === true && !t.startsWith(OPTIONAL_TAG)) err(`${where}: 고르지 않아도 되는 질문의 보기는 ${OPTIONAL_TAG}* 태그만 답니다 (${t})`);
        if (q.optional !== true && t.startsWith(OPTIONAL_TAG)) err(`${where}: ${OPTIONAL_TAG}* 태그는 고르지 않아도 되는 질문(optional)에만 답니다`);
      }
      if (o.aiTool === undefined) {
        if (q.optional === true && o.isCustom !== true && o.isUnknown !== true) err(`${where}: '쓰는 AI' 보기에는 도구와 쓰는 곳(aiTool)이 있어야 합니다`);
        continue;
      }
      if (q.optional !== true) err(`${where}: aiTool은 고르지 않아도 되는 질문('쓰는 AI')의 보기에만 답니다`);
      if (o.tags[`${OPTIONAL_TAG}${o.aiTool.tool}`] === undefined) err(`${where}: 태그 ${OPTIONAL_TAG}${o.aiTool.tool}을 답니다 (aiTool.tool과 같게)`);
      if ((o.aiTool.paidOnly === true || o.aiTool.needsReview === true) && (o.aiTool.sources ?? []).length === 0) {
        err(`${where}: 유료 표시(paidOnly)나 확인 필요(needsReview)에는 출처(sources)가 있어야 합니다`);
      }
    }
    if (q.optional !== true) return;
    const unknowns = q.options.filter((o) => o.isUnknown === true);
    if (unknowns.length !== 1 || Object.keys(unknowns[0]?.tags ?? {}).length > 0) {
      err(`${q.id}: 고르지 않아도 되는 질문에는 태그 없는 '모르겠어요' 보기가 하나 있어야 합니다 (답하지 않으면 그 보기로 본다)`);
    }
  }

  /** 보기 무리 (groups): 무리마다 보기가 있고, 보기는 무리 순서대로, 직접 쓰기·모르겠어요는 무리 밖 */
  function checkGroups(q: Question): void {
    if (q.groups === undefined) {
      for (const o of q.options) if (o.group !== undefined) err(`${q.id}.${o.id}: 질문에 groups가 없는데 group(${o.group})이 있습니다`);
      return;
    }
    const order = q.groups.map((g) => g.id);
    dupes(`${q.id} 무리`, order);
    let last = -1;
    for (const o of q.options) {
      if (o.isCustom === true || o.isUnknown === true) {
        if (o.group !== undefined) err(`${q.id}.${o.id}: '직접 쓰기'·'모르겠어요' 보기는 무리에 넣지 않습니다`);
        continue;
      }
      const at = o.group === undefined ? -1 : order.indexOf(o.group);
      if (at < 0) err(`${q.id}.${o.id}: 무리(group)가 없거나 groups에 없는 무리입니다`);
      else if (at < last) err(`${q.id}.${o.id}: 보기는 무리 순서대로 둡니다`);
      last = Math.max(last, at);
    }
    for (const g of order) if (!q.options.some((o) => o.group === g)) err(`${q.id}: 무리 ${g}에 보기가 없습니다`);
  }

  // 상품
  dupes('products', data.products.products.map((p) => p.id));
  let reviewCount = 0;
  let reviewIndexCount = 0;
  for (const p of data.products.products) {
    const where = `products/${p.id}`;
    if (p.id.startsWith('custom-')) err(`${where}: custom-으로 시작하는 id는 직접 쓴 도구(custom-1~custom-5) 몫입니다`);
    if (p.id === BUILDER_PUBLISH_ID) err(`${where}: ${BUILDER_PUBLISH_ID}는 엔진이 만드는 빌더의 게시 기능 몫입니다 (products.json에 넣지 않는다)`);
    for (const t of [...(p.domains ?? []), ...(p.topics ?? []), ...(p.goodFor ?? [])]) {
      if (!tagIds.has(t)) err(`${where}: 분류표에 없는 태그 ${t}`);
    }
    for (const c of p.needsConcepts ?? []) if (!conceptIds.has(c)) err(`${where}: 없는 개념 ${c}`);
    for (const r of p.related ?? []) if (!productIds.has(r)) err(`${where}: 없는 관련 상품 ${r}`);
    if (p.keyExposureRisk && !(p.needsConcepts ?? []).includes('env-var')) err(`${where}: 키 노출 위험 상품은 필요 개념에 env-var를 넣습니다`);
    if (p.layer === 'index' && p.recommendable) err(`${where}: 색인 상품은 추천하지 않습니다 (recommendable: false)`);
    if (p.publicKey && p.keyExposureRisk) err(`${where}: 공개 키(publicKey)와 키 노출 위험(keyExposureRisk)을 함께 켤 수 없습니다`);
    if ((p.provider.type === 'unofficial' || p.provider.type === 'community') && p.layer === 'index' && p.recommendable) {
      err(`${where}: 비공식·커뮤니티 색인 상품은 추천할 수 없습니다`);
    }
    if (p.checkedAt > thisMonth) err(`${where}: 확인한 때(${p.checkedAt})가 미래입니다`);
    if (p.capabilities.includes('data') && !p.realtime) err(`${where}: 데이터 상품은 realtime이 필요합니다`);
    if (p.needsReview) {
      if (p.layer === 'shelf') reviewCount += 1;
      else reviewIndexCount += 1;
      if (release && p.layer === 'shelf') err(`${where}: 사람 확인이 남았습니다 (needsReview: true)`);
    }
  }
  if (reviewCount > 0 && !release) warn(`사람 확인이 남은 진열 상품 ${reviewCount}개 (배포용 검사 npm run validate:release가 막는다. 색인 상품 ${reviewIndexCount}개는 막지 않음)`);

  // 규칙
  dupes('rules', data.rules.rules.map((r) => r.id));
  const slotShape = new Map<string, string>();
  const slotIds = new Set<string>();
  const usedCards = new Set<string>();
  for (const r of data.rules.rules) {
    const where = `rules/${r.id}`;
    checkCondition(where, r.when);
    noOptionalRefs(where, r.when);
    if (r.type === 'slot') {
      if (usesCart(r.when)) err(`${where}: 칸 규칙에는 장바구니 조건을 쓸 수 없습니다`);
      const { required: _required, ...shape } = r.slot;
      const key = JSON.stringify(shape);
      const prev = slotShape.get(r.slot.id);
      if (prev && prev !== key) err(`${where}: 같은 칸(${r.slot.id})을 만드는 규칙끼리 required 말고는 같아야 합니다`);
      slotShape.set(r.slot.id, key);
      slotIds.add(r.slot.id);
      if (r.slot.mustFill && !r.slot.required) err(`${where}: mustFill은 필수 칸에만 씁니다`);
      if (!data.templates.slotSteps[r.slot.id]) warn(`${where}: templates.slotSteps에 ${r.slot.id} 단계 문장이 없습니다`);
    }
    if (r.type === 'conflict') {
      if (!r.id.startsWith('conflict.')) err(`${where}: 충돌 규칙 id는 conflict.로 시작합니다`);
      if (!cardIds.has(r.researchCard)) err(`${where}: 없는 조사 카드 ${r.researchCard}`);
      usedCards.add(r.researchCard);
    }
    if (r.type === 'research') {
      if (!cardIds.has(r.card)) err(`${where}: 없는 조사 카드 ${r.card}`);
      usedCards.add(r.card);
    }
    if (r.type === 'stuck') for (const c of r.concepts ?? []) if (!conceptIds.has(c)) err(`${where}: 없는 개념 ${c}`);
  }
  for (const s of Object.keys(data.templates.slotSteps)) if (!slotIds.has(s)) warn(`templates.slotSteps: 어떤 규칙도 만들지 않는 칸 ${s}`);
  for (const r of data.rules.rules) {
    if (r.type === 'conflict' && r.anchorSlot !== undefined && !slotIds.has(r.anchorSlot)) {
      err(`rules/${r.id}: 어떤 칸 규칙도 만들지 않는 anchorSlot (${r.anchorSlot})`);
    }
  }

  // 조사 카드: 규칙이 쓰는 것 + 낱말표 빈틈(research.gap-<id>, 엔진이 session.gaps로 더함) + 직접 쓴 도구 카드(templates.customTool.researchCard)
  for (const g of input.aliases.gaps) {
    const card = `research.gap-${g.id}`;
    if (!cardIds.has(card)) err(`aliases/gaps/${g.id}: 조사 카드 ${card}가 없습니다`);
    usedCards.add(card);
  }
  if (!cardIds.has(data.templates.customTool.researchCard)) err(`templates.customTool.researchCard: 없는 조사 카드 ${data.templates.customTool.researchCard}`);
  usedCards.add(data.templates.customTool.researchCard);
  // 빌더의 게시 기능 카드 (B-02): 웹에서 만드는 도구의 공개 칸을 엔진이 채울 때 붙는다
  if (!cardIds.has(data.templates.builderPublish.researchCard)) err(`templates.builderPublish.researchCard: 없는 조사 카드 ${data.templates.builderPublish.researchCard}`);
  usedCards.add(data.templates.builderPublish.researchCard);
  // 직접 고른 글꼴의 라이선스 카드 (T38): 디자인 정하기에서 글꼴을 직접 쓰면 엔진이 붙인다
  if (!cardIds.has(LOOK_FONT_CARD)) err(`engine/checkout.ts LOOK_FONT_CARD: 없는 조사 카드 ${LOOK_FONT_CARD}`);
  usedCards.add(LOOK_FONT_CARD);
  dupes('research-cards', data.researchCards.cards.map((c) => c.id));
  for (const c of data.researchCards.cards) if (!usedCards.has(c.id)) warn(`research-cards/${c.id}: 어떤 규칙도 쓰지 않습니다`);

  // 개념
  dupes('concepts', data.concepts.concepts.map((c) => c.id));
  for (const c of data.concepts.concepts) {
    const where = `concepts/${c.id}`;
    for (const pre of c.prerequisites) if (!conceptIds.has(pre)) err(`${where}: 없는 선수 개념 ${pre}`);
    for (const p of c.relatedProducts ?? []) if (!productIds.has(p)) err(`${where}: 없는 관련 상품 ${p}`);
    c.quiz.forEach((q, i) => {
      if (q.answer >= q.options.length) err(`${where}: 확인 문제 ${i + 1}의 정답 번호가 보기 수를 넘습니다`);
    });
    if (!c.askAI.includes('{{project}}')) warn(`${where}: askAI에 {{project}} 자리가 없습니다`);
    if (/\{\{project\}\}[을를이가은는과와로]/.test(c.askAI)) err(`${where}: {{project}} 바로 뒤에 조사를 붙이면 받침에 따라 틀립니다`);
  }
  {
    // 확인 문제 정답 위치가 한쪽에 몰리면 찍어도 맞는다
    const answers = data.concepts.concepts.flatMap((c) => c.quiz.map((q) => q.answer));
    const counts = new Map<number, number>();
    for (const a of answers) counts.set(a, (counts.get(a) ?? 0) + 1);
    const top = Math.max(...counts.values());
    if (answers.length >= 6 && top / answers.length > 0.6) warn(`concepts: 확인 문제 정답의 ${Math.round((top / answers.length) * 100)}%가 같은 자리에 있습니다. 정답 위치를 섞으세요`);
  }
  {
    // 순환 검사
    const state = new Map<string, 0 | 1 | 2>();
    const visit = (id: string, path: string[]): void => {
      if (state.get(id) === 2) return;
      if (state.get(id) === 1) return err(`concepts: 선후 관계가 돕니다 → ${[...path, id].join(' → ')}`);
      state.set(id, 1);
      for (const pre of cat.concept.get(id)?.prerequisites ?? []) visit(pre, [...path, id]);
      state.set(id, 2);
    };
    for (const id of conceptIds) visit(id, []);
  }

  // 문장 틀
  const T = data.templates;
  const expectKeys = (where: string, keys: string[], prefix: string): void => {
    for (const k of keys) if (!tagIds.has(k)) err(`templates.${where}: 분류표에 없는 태그 ${k}`);
    for (const t of tagIds) if (t.startsWith(prefix) && !keys.includes(t)) err(`templates.${where}: ${t}의 문장이 없습니다`);
  };
  expectKeys('types', Object.keys(T.types), 'type.');
  expectKeys('devices', Object.keys(T.devices), 'device.');
  expectKeys('audiences', Object.keys(T.audiences), 'audience.');
  expectKeys('aiTools', Object.keys(T.aiTools), 'ai.');
  T.notBuildRules.forEach((r, i) => {
    checkCondition(`templates.notBuildRules[${i}]`, r.when);
    noOptionalRefs(`templates.notBuildRules[${i}]`, r.when);
  });
  dupes('templates.conversationCards', T.conversationCards.map((c) => c.id));

  expectKeys('look.focus', Object.keys(T.look.focus), 'type.');
  for (const t of tagIds) if (t.startsWith('type.') && !(t in LOOK_TYPE_OF_TAG)) err(`look.ts LOOK_TYPE_OF_TAG: 앱 종류 태그 ${t}의 열쇠가 없습니다`);
  checkLooks(input.looks);

  // 자리 표시({{이름}})가 정해진 이름만 쓰는지
  const allowed: Record<string, string[]> = {
    'pack.title': ['project'],
    'pack.intro': ['saveAs'],
    'pack.conceptLink': ['site', 'id'],
    'pack.dataLines.external': ['names'],
    'emptySlot': ['label', 'note'],
    'indexResearch': ['name', 'link'],
    'customTool': ['name'],
    'pack.mine': ['chip', 'text', 'label', 'as'],
    'conversationCards': ['packRef'],
    'receipt': ['n', 'm', 'h'],
    'look': [
      'label', 'ko', 'en', 'focus', 'text', 'word', 'standard', 'nonText', 'v', 'hex', 'heading', 'body', 'name', 'line', 'install',
      'import', 'home', 'list', 'title', 'subtitle', 'bodyLg', 'caption', 'gutter', 'section', 'row', 'tap', 'shadow', 'n', 'sm', 'md',
      'lg', 'screen', 'parts', 'states', 'press', 'celebrate', 'easing', 'mood', 'accent', 'theme', 'issued', 'font', 'license', 'react',
    ],
  };
  const placeholders = (s: unknown): string[] => (JSON.stringify(s).match(/\{\{([a-zA-Z0-9_]+)\}\}/g) ?? []).map((m) => m.slice(2, -2));
  const checkPlaceholders = (where: string, value: unknown, ok: string[]): void => {
    for (const p of placeholders(value)) if (!ok.includes(p)) err(`templates.${where}: 쓸 수 없는 자리 표시 {{${p}}}`);
  };
  checkPlaceholders('pack.title', T.pack.title, allowed['pack.title'] ?? []);
  checkPlaceholders('pack.intro', T.pack.intro, allowed['pack.intro'] ?? []);
  checkPlaceholders('pack.conceptLink', T.pack.conceptLink, allowed['pack.conceptLink'] ?? []);
  checkPlaceholders('pack.dataLines', T.pack.dataLines, allowed['pack.dataLines.external'] ?? []);
  checkPlaceholders('emptySlot', T.emptySlot, allowed['emptySlot'] ?? []);
  checkPlaceholders('indexResearch', T.indexResearch, allowed['indexResearch'] ?? []);
  checkPlaceholders('conversationCards', T.conversationCards, allowed['conversationCards'] ?? []);
  checkPlaceholders('receipt', T.receipt, allowed['receipt'] ?? []);
  checkPlaceholders('customTool', T.customTool, allowed['customTool'] ?? []);
  checkPlaceholders('pack.mine', T.pack.mine, allowed['pack.mine'] ?? []);
  checkPlaceholders('look', T.look, allowed['look'] ?? []);
  checkPlaceholders('lookSummary', T.lookSummary, ['title', 'mood', 'accent', 'font']);
  const { pack: _p, emptySlot: _e, indexResearch: _i, conversationCards: _c, receipt: _r, customTool: _t, look: _l, lookSummary: _s, ...rest } = T;
  checkPlaceholders('나머지', rest, []);
  for (const c of data.concepts.concepts) checkPlaceholders(`concepts/${c.id}.askAI`, c.askAI, ['project']);

  // 에러 안내
  dupes('errors', data.errors.errors.map((e) => e.id));
  for (const e of data.errors.errors) {
    const where = `errors/${e.id}`;
    const regs: RegExp[] = [];
    for (const p of e.patterns) {
      try {
        regs.push(new RegExp(p, 'i'));
      } catch {
        err(`${where}: 정규식이 틀렸습니다 → ${p}`);
      }
    }
    for (const ex of e.examples) {
      if (!regs.some((r) => r.test(ex))) err(`${where}: 예시가 패턴에 맞지 않습니다 → ${ex}`);
      for (const other of data.errors.errors) {
        if (other.id === e.id) continue;
        if (other.patterns.some((p) => new RegExp(p, 'i').test(ex))) warn(`${where}: 예시가 ${other.id}에도 걸립니다 → ${ex}`);
      }
    }
    for (const c of e.concepts ?? []) if (!conceptIds.has(c)) err(`${where}: 없는 개념 ${c}`);
  }

  // 어려운 말 풀이: 잇는 카드·도구·에러·상위 용어가 있는지 (문장 규칙과 이름 겹침은 tests/lib/glossary.test.ts가 매처로 본다)
  const glossaryIds = new Set(input.glossary.terms.map((t) => t.id));
  const errorIds = new Set(data.errors.errors.map((e) => e.id));
  dupes('glossary', input.glossary.terms.map((t) => t.id));
  for (const t of input.glossary.terms) {
    const where = `glossary/${t.id}`;
    if (t.concept && !conceptIds.has(t.concept)) err(`${where}: 없는 용어 카드 ${t.concept}`);
    if (t.tool && !productIds.has(t.tool)) err(`${where}: 없는 도구 ${t.tool}`);
    if (t.error && !errorIds.has(t.error)) err(`${where}: 없는 에러 안내 ${t.error}`);
    if (t.see && (t.see === t.id || !glossaryIds.has(t.see))) err(`${where}: 상위 용어 ${t.see}가 없거나 자기 자신입니다`);
  }

  // 낱말표의 검색 동의어 (docs/review/v3/brief.md 3.5절): 한 검색어는 한 줄에만, 띄어쓰기·대소문자를 뺀 꼴도 2자 이상.
  // 대상 이름(to)은 아직 없는 화면(만들기 안내 등)을 미리 적어 두므로 지금 색인에 있는지는 보지 않는다 (scripts/build-search.ts가 붙은 수를 찍는다)
  dupes('aliases/searchSynonyms', input.aliases.searchSynonyms.map((s) => s.id));
  const synonymOwner = new Map<string, string>();
  for (const s of input.aliases.searchSynonyms) {
    const where = `aliases/searchSynonyms/${s.id}`;
    for (const a of s.aliases) {
      const k = nameKey(a);
      if ([...k].length < 2) err(`${where}: '${a}'는 띄어쓰기를 빼면 2자보다 짧습니다`);
      const owner = synonymOwner.get(k);
      if (owner !== undefined) err(`${where}: '${a}'가 ${owner === s.id ? '같은 줄에 두 번' : `${owner} 줄과 겹칩니다`} 있습니다 (띄어 쓴 말은 붙여 쓴 꼴도 함께 찾히니 하나만 적어요)`);
      else synonymOwner.set(k, s.id);
    }
    for (const t of s.to) if (nameKey(t) === '') err(`${where}: 빈 대상 이름`);
  }

  checkWordTables(input.aliases);

  /**
   * 직접 쓰기 낱말표 (input.md 9.2절 검사): 대상이 있는지, 열쇠 모양(정규화 뒤 2자 이상, 1자는 '='),
   * 그리고 한 칸에서 함께 찾는 말끼리 겹치지 않는지. 함께 찾는 말 = 그 질문의 보기 낱말 + 그 자리의 빈틈 말,
   * 예·아니요 질문이면 주제어 + 공통 말 넷, q.ai면 AI 이름 다섯 무리, 도구 칸이면 도구 이름 짐작 + 빈틈 말.
   * 다른 질문끼리는 겹쳐도 된다('알림'은 q.type 현황판과 q.notify 주제어에 다 있다)
   */
  function checkWordTables(A: Aliases): void {
    const AI_QUESTION = 'q.ai';
    const keyOf = (where: string, word: string): string | null => {
      const { key, whole } = aliasKey(word);
      const n = [...key].length;
      if (n === 0) err(`${where}: '${word}'는 정규화하면 빈 말입니다`);
      else if (n < 2 && !whole) err(`${where}: '${word}'처럼 한 글자 말은 앞에 '='를 붙여 어절 하나 전체가 같을 때만 찾게 합니다`);
      return n === 0 ? null : key;
    };
    /** 한 칸에서 함께 찾는 표: 같은 열쇠는 한 대상만 가리킨다 (띄어쓰기·대소문자·'='를 빼고 견줌) */
    const field = (where: string, entries: { target: string; aliases: string[] }[]): void => {
      const owner = new Map<string, string>();
      for (const e of entries) {
        for (const w of e.aliases) {
          const key = keyOf(`${where}/${e.target}`, w);
          if (key === null) continue;
          const prev = owner.get(key);
          if (prev === undefined) owner.set(key, e.target);
          else err(`${where}: '${w}'가 ${prev === e.target ? `${e.target}에 두 번` : `${prev}와 ${e.target}에 함께`} 있습니다 (한 칸에서 같은 말은 한 대상만 가리킨다)`);
        }
      }
    };
    const gapsAt = (place: string): { target: string; aliases: string[] }[] =>
      A.gaps.filter((g) => g.where.includes(place)).map((g) => ({ target: `빈틈 ${g.id}`, aliases: g.aliases }));
    const yesNoIds = new Set(Object.keys(A.yesNo.topics));

    // 보기 낱말
    for (const [qid, entries] of Object.entries(A.options)) {
      const where = `aliases/options/${qid}`;
      const q = cat.question.get(qid);
      if (!q) {
        err(`${where}: 없는 질문`);
        continue;
      }
      if (yesNoIds.has(qid)) err(`${where}: 예·아니요 질문은 yesNo.topics에만 둡니다`);
      if (qid === AI_QUESTION) err(`${where}: ${AI_QUESTION}는 aiNames로 읽습니다`);
      dupes(where, entries.map((e) => e.id));
      for (const e of entries) {
        const o = q.options.find((x) => x.id === e.id);
        if (!o) err(`${where}: 없는 보기 ${e.id}`);
        else if (o.isUnknown === true || o.isCustom === true) err(`${where}: '모르겠어요'·'직접 쓰기' 보기(${e.id})에는 낱말을 두지 않습니다`);
      }
      for (const o of q.options) {
        if (o.isUnknown !== true && o.isCustom !== true && !entries.some((e) => e.id === o.id)) warn(`${where}: 보기 ${o.id}를 가리키는 낱말이 없습니다`);
      }
      field(where, [...entries.map((e) => ({ target: e.id, aliases: e.aliases })), ...gapsAt(qid)]);
    }

    // 예·아니요
    const answerOrder = A.yesNo.answers.map((a) => a.id).join(',');
    if (answerOrder !== 'no,unknown,maybe,yes') err(`aliases/yesNo/answers: 공통 말은 no → unknown → maybe → yes 순서로 하나씩 둡니다 (지금 ${answerOrder})`);
    for (const [qid, topics] of Object.entries(A.yesNo.topics)) {
      const where = `aliases/yesNo/${qid}`;
      const q = cat.question.get(qid);
      if (!q) {
        err(`${where}: 없는 질문`);
        continue;
      }
      const ids = q.options.filter((o) => o.isCustom !== true).map((o) => o.id).sort();
      if (ids.join(',') !== 'maybe,no,unknown,yes') err(`${where}: 보기가 네·아니요·아마·모르겠어요인 질문만 둡니다`);
      field(where, [{ target: '주제어', aliases: topics }, ...A.yesNo.answers.map((a) => ({ target: a.id, aliases: a.aliases })), ...gapsAt(qid)]);
    }

    // q.ai
    dupes('aliases/aiNames', A.aiNames.map((a) => a.id));
    for (const kind of ['agent', 'builder', 'chat', 'paid', 'free']) if (!A.aiNames.some((a) => a.id === kind)) err(`aliases/aiNames: ${kind} 무리가 없습니다`);
    const aiQ = cat.question.get(AI_QUESTION);
    if (!aiQ) err(`aliases/aiNames: 질문 ${AI_QUESTION}가 없습니다`);
    else for (const o of ['chat-free', 'chat-paid', 'builder', 'agent']) if (!aiQ.options.some((x) => x.id === o)) err(`aliases/aiNames: ${AI_QUESTION}에 보기 ${o}가 없습니다`);
    field('aliases/aiNames', A.aiNames.map((a) => ({ target: a.id, aliases: a.aliases })));

    // 직접 쓰기가 있는 질문은 모두 읽을 낱말이 있다. 느낌 질문은 looks.json keywords.mood가 읽는다 (설계서 3.9절, T38)
    for (const q of data.questions.questions) {
      if (!q.options.some((o) => o.isCustom === true)) continue;
      if (q.id === STYLE_QUESTION) continue;
      if (!(q.id in A.options) && !yesNoIds.has(q.id) && q.id !== AI_QUESTION) err(`aliases: ${q.id}의 직접 쓰기를 읽을 낱말이 없습니다 (options나 yesNo.topics에 더합니다)`);
    }
    if (STYLE_QUESTION in A.options) err(`aliases/options/${STYLE_QUESTION}: 느낌 낱말은 data/looks.json keywords.mood에 둡니다 (설계서 3.9절)`);

    // 디자인 정하기 낱말 (looks.json keywords): 칸마다 같은 말은 한 대상만. 느낌은 q.style 보기와 그 자리의 빈틈 말과 함께 본다
    const K = input.looks.keywords;
    const styleQ = cat.question.get(STYLE_QUESTION);
    for (const e of K.mood) {
      const o = styleQ?.options.find((x) => x.id === e.id);
      if (!o || o.isUnknown === true || o.isCustom === true) err(`looks/keywords/mood: q.style에 없는 느낌 ${e.id}`);
    }
    for (const o of styleQ?.options ?? []) {
      if (o.isUnknown !== true && o.isCustom !== true && !K.mood.some((e) => e.id === o.id)) warn(`looks/keywords/mood: 느낌 ${o.id}를 가리키는 낱말이 없습니다`);
    }
    field('looks/keywords/mood', [...K.mood.map((e) => ({ target: e.id, aliases: e.aliases })), ...gapsAt(STYLE_QUESTION)]);
    for (const e of K.accent) if (!input.looks.accents.some((a) => a.id === e.id)) err(`looks/keywords/accent: 없는 대표 색 ${e.id}`);
    field('looks/keywords/accent', K.accent.map((e) => ({ target: e.id, aliases: e.aliases })));
    for (const e of K.theme) if (e.id !== 'both') err(`looks/keywords/theme: 어두운 말은 '둘 다'(both)로만 둡니다 (${e.id})`);
    field('looks/keywords/theme', K.theme.map((e) => ({ target: e.id, aliases: e.aliases })));

    // 도구 이름 짐작 + 도구 칸의 빈틈
    dupes('aliases/toolHints', A.toolHints.map((h) => h.id));
    for (const h of A.toolHints) {
      const where = `aliases/toolHints/${h.id}`;
      if (h.product !== undefined && !productIds.has(h.product)) err(`${where}: 없는 도구 ${h.product}`);
      if (h.domain !== undefined && !tagIds.has(h.domain)) err(`${where}: 분류표에 없는 분야 ${h.domain}`);
    }
    // matchTool은 상품 이름(p:<id>)·짐작 말·빈틈을 한 번에 찾으므로 셋을 함께 견준다. 짐작 말이 가리키는 상품은 같은 대상이다
    field('aliases/toolHints', [
      ...data.products.products.map((p) => ({ target: `상품 ${p.id}`, aliases: [p.name] })),
      ...A.toolHints.map((h) => ({ target: h.product !== undefined ? `상품 ${h.product}` : h.id, aliases: h.aliases })),
      ...gapsAt('tool'),
    ]);

    // 빈틈
    dupes('aliases/gaps', A.gaps.map((g) => g.id));
    for (const g of A.gaps) {
      for (const place of g.where) {
        if (place === 'line' || place === 'tool') continue;
        const q = cat.question.get(place);
        if (!q) err(`aliases/gaps/${g.id}: 없는 질문 ${place}`);
        else if (place === AI_QUESTION || optionalIds.has(place)) err(`aliases/gaps/${g.id}: AI 이름을 쓰는 질문(${place})에서는 빈틈을 찾지 않습니다`);
        else if (!q.options.some((o) => o.isCustom === true)) err(`aliases/gaps/${g.id}: ${place}에는 직접 쓰기가 없습니다`);
      }
    }
    field('aliases/gaps(line)', gapsAt('line'));
  }

  /**
   * 디자인 정하기 자료 (data/looks.json, 설계서 4.3·4.4·4.10절): 느낌 = q.style 보기, 참조 id, 라이선스 허용 목록(OFL-1.1 · MIT · ISC),
   * 앱 종류 열쇠, 화면 부품, 그리고 대비. 대표 색 10 × 바탕 4 × 밝기 2 = 80쌍(대표 색 글자 / 면·바탕)이 4.6:1 이상, 버튼 글자·옅은 면 위 글자도
   * 4.6:1 이상, 바탕 묶음의 글자·약한 글자 4.6:1 이상, 입력 테두리 3.1:1 이상. 모자라면 L을 0.01씩 옮긴 값을 알려 준다
   */
  function checkLooks(L: Looks): void {
    const T = L.contrast.target;
    const idSet = (where: string, list: { id: string }[]): Set<string> => {
      dupes(where, list.map((x) => x.id));
      return new Set(list.map((x) => x.id));
    };
    const neutrals = idSet('looks/neutrals', L.neutrals);
    const accents = idSet('looks/accents', L.accents);
    const families = idSet('looks/families', L.families);
    const fonts = idSet('looks/fonts', L.fonts);
    const radius = idSet('looks/radius', L.radius);
    const density = idSet('looks/density', L.density);
    const motion = idSet('looks/motion', L.motion);
    const depths = idSet('looks/depths', L.depths);
    const icons = idSet('looks/iconSets', L.iconSets);
    const imagery = idSet('looks/imagery', L.imagery);
    idSet('looks/tones', L.tones);
    const comps = idSet('looks/components', L.components);
    idSet('looks/references', L.references);
    idSet('looks/moods', L.moods);

    // 느낌 여섯 = q.style 보기 (직접 쓰기·모르겠어요 빼고), 이름도 같게
    const styleOpts = (cat.question.get(STYLE_QUESTION)?.options ?? []).filter((o) => o.isUnknown !== true && o.isCustom !== true);
    for (const o of styleOpts) {
      const m = L.moods.find((x) => x.id === o.id);
      if (!m) err(`looks/moods: q.style 보기 ${o.id}의 느낌이 없습니다`);
      else if (m.label !== o.label) err(`looks/moods/${m.id}: 이름이 q.style 보기와 다릅니다 (${m.label} ≠ ${o.label})`);
    }
    for (const m of L.moods) {
      const where = `looks/moods/${m.id}`;
      if (!styleOpts.some((o) => o.id === m.id)) err(`${where}: q.style에 없는 느낌`);
      if (!tagIds.has(`style.${m.id}`)) err(`${where}: 분류표에 style.${m.id} 태그가 없습니다`);
      const ref = (set: Set<string>, v: string, what: string): void => {
        if (!set.has(v)) err(`${where}: 없는 ${what} ${v}`);
      };
      ref(neutrals, m.neutral, '바탕 묶음');
      ref(accents, m.accent, '대표 색');
      ref(fonts, m.font, '글꼴 짝');
      ref(radius, m.radius, '모서리');
      ref(depths, m.depth, '깊이');
      ref(icons, m.icons, '아이콘 묶음');
      ref(motion, m.motion, '움직임');
    }
    for (const f of L.fonts) {
      if (!families.has(f.heading)) err(`looks/fonts/${f.id}: 없는 제목 글꼴 ${f.heading}`);
      if (!families.has(f.body)) err(`looks/fonts/${f.id}: 없는 본문 글꼴 ${f.body}`);
    }

    // 라이선스 허용 목록과 확인
    const LICENSES = ['OFL-1.1', 'MIT', 'ISC'];
    for (const f of L.families) {
      const where = `looks/families/${f.id}`;
      if (!LICENSES.includes(f.license)) err(`${where}: 허용하지 않는 라이선스 ${f.license} (OFL-1.1 · MIT · ISC만)`);
      if (f.needsReview && (f.html !== undefined || f.npm !== undefined)) err(`${where}: 원문으로 확인하지 못한 글꼴(needsReview)에는 받는 줄(html·npm)을 두지 않습니다`);
      if (f.checkedAt.slice(0, 7) > thisMonth) err(`${where}: 확인한 때(${f.checkedAt})가 미래입니다`);
    }
    for (const i of L.iconSets) if (i.license !== undefined && !LICENSES.includes(i.license)) err(`looks/iconSets/${i.id}: 허용하지 않는 라이선스 ${i.license} (OFL-1.1 · MIT · ISC만)`);
    for (const r of L.references) if (/[?#]|utm_|ref=/.test(r.url)) err(`looks/references/${r.id}: 첫 화면 주소만 씁니다 (매개변수 없이)`);

    // 앱 종류 열쇠 (look.ts LOOK_TYPE_OF_TAG의 값)
    for (const k of new Set(Object.values(LOOK_TYPE_OF_TAG))) {
      if (!L.layouts[k]) err(`looks/layouts: 앱 종류 ${k}의 첫 화면 배치가 없습니다`);
      if (!L.defaultsByType[k]) err(`looks/defaultsByType: 앱 종류 ${k}의 기본값이 없습니다`);
      if (!L.referenceKeywords[k]) err(`looks/referenceKeywords: 앱 종류 ${k}의 찾을 낱말이 없습니다`);
    }
    dupes('looks/layouts', Object.values(L.layouts).flat().map((x) => x.id));
    for (const [k, d] of Object.entries(L.defaultsByType)) {
      for (const m of d.moods) if (!L.moods.some((x) => x.id === m)) err(`looks/defaultsByType/${k}: 없는 느낌 ${m}`);
      if (!density.has(d.density)) err(`looks/defaultsByType/${k}: 없는 촘촘함 ${d.density}`);
      if (!imagery.has(d.imagery)) err(`looks/defaultsByType/${k}: 없는 그림 ${d.imagery}`);
    }

    // 화면 부품: 설계도 3번 화면마다 부품 id, 모든 화면의 상태 셋
    for (const [tid, tt] of Object.entries(data.templates.types)) {
      for (const sc of tt.screens) for (const c of sc.components) if (!comps.has(c)) err(`templates.types.${tid}: 화면 '${sc.name}'에 없는 부품 ${c} (looks.json components)`);
    }
    for (const st of ['loading', 'empty', 'error']) if (!comps.has(st)) err(`looks/components: 모든 화면의 상태 ${st}가 없습니다`);
    const browseParts = L.components.filter((c) => c.browse === true && c.kind === 'part').length;
    const browseStates = L.components.filter((c) => c.browse === true && c.kind === 'state').length;
    if (browseParts !== 17) warn(`looks/components: 둘러보기 부품이 ${browseParts}개입니다 (설계서 4.9절은 17)`);
    if (browseStates !== 5) warn(`looks/components: 둘러보기 상태가 ${browseStates}개입니다 (설계서 4.9절은 다섯)`);

    // 대비 (설계서 4.4절): 견본은 4.6:1 이상으로 여유를 둔다
    const [white, ink] = L.fixed.onLight;
    for (const a of L.accents) {
      const where = `looks/accents/${a.id}`;
      for (const n of L.neutrals) {
        for (const side of ['light', 'dark'] as const) {
          const fg = a[side];
          for (const bg of [n[side].surface, n[side].bg]) {
            const r = ratio(fg, bg);
            if (r >= T) continue;
            const down = side === 'light';
            const fix = shiftUntil(fg, down ? -0.01 : 0.01, (x) => ratio(x, bg) >= T).hex;
            err(`${where}: ${down ? '밝은' : '어두운'} 화면 ${n.id} ${bg} 위 ${fg}가 ${ratio2(r)}:1 (${T}:1 이상). L을 0.01씩 ${down ? '낮춘' : '올린'} ${fix}로 바꿔 다시 잽니다`);
          }
        }
      }
      if (ratio(white, a.light) < T) err(`${where}: 밝은 화면 버튼의 흰 글자가 ${ratio2(ratio(white, a.light))}:1 (${T}:1 이상)`);
      if (ratio(a.light, a.soft) < T) err(`${where}: 옅은 면 ${a.soft} 위 글자가 ${ratio2(ratio(a.light, a.soft))}:1 (${T}:1 이상)`);
      if (ratio(L.fixed.onDark, a.dark) < T) err(`${where}: 어두운 화면 버튼 글자가 ${ratio2(ratio(L.fixed.onDark, a.dark))}:1 (${T}:1 이상)`);
      const ds = darkSoftOf(a.dark);
      if (ratio(a.dark, ds) < T) err(`${where}: 어두운 옅은 면 ${ds} 위 글자가 ${ratio2(ratio(a.dark, ds))}:1 (${T}:1 이상)`);
    }
    if (ratio(ink, white) < T) err('looks/fixed/onLight: 두 버튼 글자 색의 대비가 모자랍니다');
    for (const n of L.neutrals) {
      for (const side of ['light', 'dark'] as const) {
        const c = n[side];
        const where = `looks/neutrals/${n.id}.${side}`;
        for (const [fg, name] of [
          [c.text, '글자'],
          [c.muted, '약한 글자'],
          [L.fixed.error[side], '오류'],
          [L.fixed.success[side], '성공'],
        ] as const) {
          const r = Math.min(ratio(fg, c.bg), ratio(fg, c.surface));
          if (r < T) err(`${where}: ${name} ${fg}가 바탕·면 위 ${ratio2(r)}:1 (${T}:1 이상)`);
        }
        const b = Math.min(ratio(c.border, c.bg), ratio(c.border, c.surface));
        if (b < L.contrast.border) err(`${where}: 입력 테두리 ${c.border}가 ${ratio2(b)}:1 (${L.contrast.border}:1 이상)`);
      }
    }
  }

  // 출처 대응표
  const sources = input.sources;
  for (const s of sources.sources) {
    for (const [from, to] of Object.entries(s.categoryMap)) {
      if (!tagIds.has(to) || !to.startsWith('domain.')) err(`sources/${s.id}: '${from}' → ${to}는 분류표의 domain 태그가 아닙니다`);
    }
    if (s.fallbackDomain && !tagIds.has(s.fallbackDomain)) err(`sources/${s.id}: 분류표에 없는 fallbackDomain ${s.fallbackDomain}`);
  }

  // 레시피: 엔진으로 끝까지 돌려 본다
  dupes('recipes', data.recipes.recipes.map((r) => r.id));
  for (const recipe of data.recipes.recipes) {
    const where = `recipes/${recipe.id}`;
    for (const id of recipe.cart) if (!productIds.has(id)) err(`${where}: 없는 상품 ${id}`);
    for (const [qid, oid] of Object.entries(recipe.answers)) {
      const q = cat.question.get(qid);
      if (!q) err(`${where}: 없는 질문 ${qid}`);
      else if (!q.options.some((o) => o.id === oid)) err(`${where}: ${qid}에 없는 보기 ${oid}`);
    }
    try {
      const r = evaluate(cat, { answers: recipe.answers, cart: recipe.cart, kept: recipe.kept ?? [], deferred: [] });
      if (!r.done) err(`${where}: 답하지 않은 질문이 있습니다 → ${r.interview.next?.id}`);
      for (const qid of Object.keys(recipe.answers)) {
        if (!r.interview.visible.some((q) => q.id === qid)) warn(`${where}: 보이지 않는 질문의 답 ${qid}`);
      }
      const open = r.conflicts.filter((c) => !c.kept).map((c) => c.id);
      if (open.length > 0) err(`${where}: 해결하지 않은 충돌 → ${open.join(', ')}`);
      for (const k of recipe.kept ?? []) if (!r.conflicts.some((c) => c.id === k)) err(`${where}: 생기지 않는 충돌을 그대로 두었습니다 → ${k}`);
    } catch (e) {
      err(`${where}: 엔진 실행 실패 → ${(e as Error).message}`);
    }
  }

  return { errors, warnings };
}
