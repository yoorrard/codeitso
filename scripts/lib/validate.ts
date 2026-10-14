// 자료 검사 로직: 스키마 검사 + 파일끼리 맞물리는지 검사. 부작용 없음 (파일을 읽지 않고 출력·종료도 하지 않는다).
// node scripts/validate-data.ts와 tests/data.test.ts가 함께 쓴다. 파일 읽기는 load-data.ts의 loadValidationInput.
import Ajv2020 from 'ajv/dist/2020.js';
import type { Catalog, Condition, Data } from '../../src/lib/engine/index.ts';
import { evaluate, makeCatalog } from '../../src/lib/engine/index.ts';
import { usesCart } from '../../src/lib/engine/conditions.ts';
import type { Glossary } from '../../src/lib/glossary.ts';
import { contrast } from './contrast.ts';
import { DATA_FILES } from './data-files.ts';

export interface Sources {
  sources: { id: string; categoryMap: Record<string, string>; fallbackDomain?: string }[];
}

export interface ValidationInput {
  data: Data;
  sources: Sources;
  /** data/glossary.json (어려운 말 풀이). 엔진은 쓰지 않아 data와 따로 둔다 */
  glossary: Glossary;
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
    if (q.showIf) {
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

  // 상품
  dupes('products', data.products.products.map((p) => p.id));
  let reviewCount = 0;
  let reviewIndexCount = 0;
  for (const p of data.products.products) {
    const where = `products/${p.id}`;
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

  // 조사 카드
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
  expectKeys('styles', Object.keys(T.styles), 'style.');
  expectKeys('devices', Object.keys(T.devices), 'device.');
  expectKeys('audiences', Object.keys(T.audiences), 'audience.');
  expectKeys('aiTools', Object.keys(T.aiTools), 'ai.');
  T.notBuildRules.forEach((r, i) => checkCondition(`templates.notBuildRules[${i}]`, r.when));
  dupes('templates.conversationCards', T.conversationCards.map((c) => c.id));

  // 색 대비 (WCAG 2.x)
  for (const [id, s] of Object.entries(T.styles)) {
    const p = s.palette;
    for (const [fg, bg, name] of [
      [p.text, p.background, '글자/배경'],
      [p.text, p.surface, '글자/면'],
      [p.accentText, p.accent, '강조 글자/강조'],
    ] as const) {
      const ratio = contrast(fg, bg);
      if (ratio < 4.5) err(`templates.styles.${id}: ${name} 대비 ${ratio.toFixed(2)}:1 (4.5:1 이상 필요)`);
    }
  }

  // 자리 표시({{이름}})가 정해진 이름만 쓰는지
  const allowed: Record<string, string[]> = {
    'pack.title': ['project'],
    'pack.intro': ['saveAs'],
    'pack.conceptLink': ['site', 'id'],
    'pack.dataLines.external': ['names'],
    'emptySlot': ['label'],
    'indexResearch': ['name', 'link'],
    'conversationCards': ['packRef'],
    'receipt': ['n', 'm', 'h'],
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
  const { pack: _p, emptySlot: _e, indexResearch: _i, conversationCards: _c, receipt: _r, ...rest } = T;
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
