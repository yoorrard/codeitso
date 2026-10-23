// 자료 검사(scripts/lib/validate.ts): 지금 자료가 통과하는지, 그리고 일부러 망가뜨린 자료를 잡는지.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadValidationInput } from '../scripts/lib/load-data.ts';
import type { ValidationInput } from '../scripts/lib/validate.ts';
import { validateAll } from '../scripts/lib/validate.ts';

let base: ValidationInput;
beforeAll(() => {
  base = loadValidationInput(false, new Date(2026, 9, 12));
});

/** 자료 사본을 고쳐서 검사한다 (원본은 그대로) */
function broken(change: (input: ValidationInput) => void): string[] {
  const input = structuredClone(base);
  change(input);
  return validateAll(input).errors;
}

function first<T>(list: T[]): T {
  const x = list[0];
  if (x === undefined) throw new Error('자료가 비어 있습니다');
  return x;
}

describe('지금 자료', () => {
  it('개발용 검사를 통과한다', () => {
    expect(validateAll(base).errors).toEqual([]);
  });

  it('배포용 검사는 사람 확인이 남은 진열 상품마다 오류를 낸다', () => {
    const pending = base.data.products.products.filter((p) => p.layer === 'shelf' && p.needsReview).length;
    const errors = validateAll({ ...base, release: true }).errors;
    expect(errors.filter((e) => e.includes('needsReview'))).toHaveLength(pending);
  });
});

describe('망가뜨린 자료를 잡는다', () => {
  it('스키마: 상품의 필수 항목이 빠짐', () => {
    const errors = broken((x) => {
      delete (first(x.data.products.products) as unknown as Record<string, unknown>)['summary'];
    });
    expect(errors.some((e) => e.startsWith('products.json'))).toBe(true);
  });

  it('스키마: 골든 사례 모양이 틀림', () => {
    const errors = broken((x) => {
      first(x.goldens).value = { id: 'case-x' };
    });
    expect(errors.some((e) => e.includes(first(base.goldens).name))).toBe(true);
  });

  it('낱말표: 검색 동의어의 말이 두 줄에 겹치거나 스키마에 없는 칸', () => {
    const overlap = broken((x) => {
      first(x.aliases.searchSynonyms).aliases.push('폰 트');
    });
    expect(overlap.some((e) => e.startsWith('aliases/searchSynonyms/') && e.includes('겹칩니다'))).toBe(true);
    const shape = broken((x) => {
      (first(x.aliases.searchSynonyms) as unknown as Record<string, unknown>)['words'] = ['테마'];
    });
    expect(shape.some((e) => e.startsWith('aliases.json'))).toBe(true);
  });

  it('id 겹침', () => {
    const errors = broken((x) => {
      x.data.products.products.push(structuredClone(first(x.data.products.products)));
    });
    expect(errors.some((e) => e.includes('id가 겹칩니다'))).toBe(true);
  });

  it('분류표에 없는 태그', () => {
    const errors = broken((x) => {
      const p = first(x.data.products.products);
      p.goodFor = [...(p.goodFor ?? []), 'ai.nowhere'];
    });
    expect(errors.some((e) => e.includes('분류표에 없는 태그 ai.nowhere'))).toBe(true);
  });

  it('확인한 때가 미래', () => {
    const errors = broken((x) => {
      x.thisMonth = '2000-01';
    });
    expect(errors.some((e) => e.includes('미래'))).toBe(true);
  });

  it('{{project}} 바로 뒤 조사', () => {
    const errors = broken((x) => {
      first(x.data.concepts.concepts).askAI = '{{project}}를 만들 때 이 개념을 설명해 줘.';
    });
    expect(errors.some((e) => e.includes('조사를 붙이면'))).toBe(true);
  });

  it('개념 선후 관계 순환', () => {
    const errors = broken((x) => {
      const concepts = x.data.concepts.concepts;
      const a = first(concepts);
      const b = concepts.find((c) => c.prerequisites.includes(a.id));
      if (!b) throw new Error('선수 개념으로 쓰이는 개념이 없습니다');
      a.prerequisites = [...a.prerequisites, b.id];
    });
    expect(errors.some((e) => e.includes('선후 관계가 돕니다'))).toBe(true);
  });

  it('디자인 대표 색 대비 부족 (견본 4.6:1, 고칠 값을 알려 준다)', () => {
    const errors = broken((x) => {
      const a = x.looks.accents[0];
      if (!a) throw new Error('대표 색이 없습니다');
      a.light = '#5B8EE6';
    });
    expect(errors.some((e) => e.startsWith('looks/accents/') && e.includes('4.6:1') && e.includes('L을 0.01씩'))).toBe(true);
  });

  it('디자인 입력 테두리 대비 부족 (3.1:1)', () => {
    const errors = broken((x) => {
      const n = x.looks.neutrals[0];
      if (!n) throw new Error('바탕 묶음이 없습니다');
      n.light.border = '#C8CDD5';
    });
    expect(errors.some((e) => e.startsWith('looks/neutrals/') && e.includes('3.1:1'))).toBe(true);
  });

  it('허용하지 않는 글꼴 라이선스', () => {
    const errors = broken((x) => {
      const f = x.looks.families[0];
      if (!f) throw new Error('글꼴이 없습니다');
      f.license = 'Apache-2.0';
    });
    expect(errors.some((e) => e.includes('license') || e.includes('라이선스'))).toBe(true);
  });

  it('에러 안내 예시가 패턴에 맞지 않음', () => {
    const errors = broken((x) => {
      first(x.data.errors.errors).examples.push('전혀 관계없는 문장');
    });
    expect(errors.some((e) => e.includes('예시가 패턴에 맞지 않습니다'))).toBe(true);
  });

  it('레시피에 없는 상품', () => {
    const errors = broken((x) => {
      first(x.data.recipes.recipes).cart.push('no-such-product');
    });
    expect(errors.some((e) => e.includes('없는 상품 no-such-product'))).toBe(true);
  });

  it('충돌 규칙의 anchorSlot이 어떤 칸 규칙도 만들지 않는 칸', () => {
    const errors = broken((x) => {
      const c = x.data.rules.rules.find((r) => r.type === 'conflict');
      if (!c || c.type !== 'conflict') throw new Error('충돌 규칙이 없습니다');
      c.anchorSlot = 'slot.nowhere';
    });
    expect(errors.some((e) => e.includes('anchorSlot (slot.nowhere)'))).toBe(true);
  });

  it('출처 대응표가 domain 태그가 아닌 곳을 가리킴', () => {
    const errors = broken((x) => {
      const s = first(x.sources.sources);
      s.categoryMap['아무거나'] = 'type.page';
    });
    expect(errors.some((e) => e.includes('domain 태그가 아닙니다'))).toBe(true);
  });
});

// ── 직접 쓰기·'쓰는 AI' (T36, D74·D75·D87, input.md 9.1·9.2절) ─────────────
describe('직접 쓰기 보기와 고르지 않아도 되는 질문', () => {
  const q = (x: ValidationInput, id: string) => {
    const found = x.data.questions.questions.find((y) => y.id === id);
    if (!found) throw new Error(`질문 ${id}가 없습니다`);
    return found;
  };

  it('지금 자료: 질문마다 직접 쓰기 하나, 모르겠어요 바로 앞', () => {
    for (const x of base.data.questions.questions) {
      const at = x.options.findIndex((o) => o.isCustom === true);
      expect(x.options.filter((o) => o.isCustom === true), x.id).toHaveLength(1);
      expect(x.options[at + 1]?.isUnknown, x.id).toBe(true);
    }
    expect(base.data.questions.questions.filter((x) => x.optional === true).map((x) => x.id)).toEqual(['q.aitool-chat', 'q.aitool-builder', 'q.aitool-agent']);
  });

  it('직접 쓰기 보기가 없거나 둘', () => {
    const none = broken((x) => {
      const t = q(x, 'q.budget');
      t.options = t.options.filter((o) => o.isCustom !== true);
    });
    expect(none.some((e) => e.includes('q.budget') && e.includes('질문마다 하나'))).toBe(true);
  });

  it('like로 정한 보기와 tags가 다름', () => {
    const errors = broken((x) => {
      const c = q(x, 'q.budget').options.find((o) => o.isCustom === true);
      if (!c) throw new Error('직접 쓰기 보기가 없습니다');
      c.tags = { 'budget.flex': 1 };
    });
    expect(errors.some((e) => e.includes('q.budget.custom') && e.includes('tags가 같아야'))).toBe(true);
  });

  it('like가 없는데 keep도 없음, 자리가 모르겠어요 앞이 아님', () => {
    const errors = broken((x) => {
      const t = q(x, 'q.type');
      const c = t.options.find((o) => o.isCustom === true);
      if (!c) throw new Error('직접 쓰기 보기가 없습니다');
      delete c.keep;
      t.options = [c, ...t.options.filter((o) => o !== c)];
    });
    expect(errors.some((e) => e.includes('q.type.custom') && e.includes('keep'))).toBe(true);
    expect(errors.some((e) => e.includes('q.type.custom') && e.includes('바로 앞'))).toBe(true);
  });

  it('스키마: 직접 쓰기가 아닌 보기에 field', () => {
    const errors = broken((x) => {
      first(q(x, 'q.budget').options).field = '라벨';
    });
    expect(errors.some((e) => e.startsWith('questions.json'))).toBe(true);
  });

  it('aitool.* 태그를 보통 질문에 달거나, 규칙·노출 조건이 쓰는 질문을 봄', () => {
    const tag = broken((x) => {
      first(q(x, 'q.budget').options).tags['aitool.claude'] = 1;
    });
    expect(tag.some((e) => e.includes('q.budget') && e.includes('aitool'))).toBe(true);
    const rule = broken((x) => {
      const r = x.data.rules.rules.find((y) => y.type === 'safety');
      if (!r) throw new Error('안전 규칙이 없습니다');
      r.when = { answer: 'q.aitool-chat', is: 'claude' };
    });
    expect(rule.some((e) => e.includes('고르지 않아도 되는 질문 q.aitool-chat'))).toBe(true);
  });

  it('유료 표시(paidOnly)에 출처가 없음, 무리 순서가 섞임', () => {
    const errors = broken((x) => {
      const agent = q(x, 'q.aitool-agent');
      const app = agent.options.find((o) => o.aiTool?.paidOnly === true);
      if (!app?.aiTool) throw new Error('유료 표시 보기가 없습니다');
      delete app.aiTool.sources;
      const term = agent.options.find((o) => o.group === 'terminal');
      if (!term) throw new Error('터미널 무리 보기가 없습니다');
      agent.options = [term, ...agent.options.filter((o) => o !== term)];
    });
    expect(errors.some((e) => e.includes('출처(sources)'))).toBe(true);
    expect(errors.some((e) => e.includes('무리 순서'))).toBe(true);
  });

  it('진열 상품 id가 custom-으로 시작', () => {
    const errors = broken((x) => {
      first(x.data.products.products).id = 'custom-1';
    });
    expect(errors.some((e) => e.includes('custom-1') && e.includes('직접 쓴 도구'))).toBe(true);
  });
});

describe('낱말표 (aliases.json 직접 쓰기 낱말)', () => {
  it('한 질문에서 같은 말이 두 보기를 가리킴 (띄어쓰기·대소문자·= 무시)', () => {
    const errors = broken((x) => {
      const t = x.aliases.options['q.type'];
      if (!t) throw new Error('q.type 낱말이 없습니다');
      first(t).aliases.push('퀴 즈');
    });
    expect(errors.some((e) => e.startsWith('aliases/options/q.type') && e.includes('함께'))).toBe(true);
  });

  it('다른 질문끼리는 같은 말이 있어도 된다', () => {
    expect(base.aliases.options['q.type']?.some((e) => e.aliases.includes('알림'))).toBe(true);
    expect(base.aliases.yesNo.topics['q.notify']).toContain('알림');
  });

  it('보기 낱말과 그 자리의 빈틈 말이 겹침, 도구 이름 짐작과 빈틈 말이 겹침', () => {
    const errors = broken((x) => {
      const t = x.aliases.options['q.type'];
      if (!t) throw new Error('q.type 낱말이 없습니다');
      first(t).aliases.push('챗봇');
      first(x.aliases.toolHints).aliases.push('채팅');
    });
    expect(errors.some((e) => e.startsWith('aliases/options/q.type') && e.includes('빈틈 ai-feature'))).toBe(true);
    expect(errors.some((e) => e.startsWith('aliases/toolHints') && e.includes('빈틈 chat'))).toBe(true);
  });

  it('도구 칸: 상품 이름과 다른 대상을 가리키는 짐작 말·빈틈 말이 겹침 (matchTool은 셋을 함께 찾는다)', () => {
    const errors = broken((x) => {
      const other = x.aliases.toolHints.find((h) => h.product !== 'github-pages');
      if (!other) throw new Error('짐작 말이 없습니다');
      other.aliases.push('GitHub Pages');
      const gap = x.aliases.gaps.find((g) => g.where.includes('tool'));
      if (!gap) throw new Error('도구 칸 빈틈이 없습니다');
      gap.aliases.push('Supabase');
    });
    expect(errors.some((e) => e.startsWith('aliases/toolHints') && e.includes('상품 github-pages'))).toBe(true);
    expect(errors.some((e) => e.startsWith('aliases/toolHints') && e.includes('상품 supabase'))).toBe(true);
  });

  it('한 글자 말은 =가 있어야 함', () => {
    const errors = broken((x) => {
      const t = x.aliases.options['q.domain'];
      if (!t) throw new Error('q.domain 낱말이 없습니다');
      first(t).aliases.push('비');
    });
    expect(errors.some((e) => e.includes("'비'처럼 한 글자"))).toBe(true);
  });

  it('예·아니요 질문을 보기 낱말에 둠, 없는 보기, 모르겠어요 보기에 낱말', () => {
    const errors = broken((x) => {
      x.aliases.options['q.save'] = [{ id: 'yes', aliases: ['남겨'] }];
      x.aliases.options['q.device'] = [{ id: 'tablet', aliases: ['태블릿'] }, { id: 'unknown', aliases: ['몰라'] }];
    });
    expect(errors.some((e) => e.startsWith('aliases/options/q.save') && e.includes('yesNo'))).toBe(true);
    expect(errors.some((e) => e.includes('없는 보기 tablet'))).toBe(true);
    expect(errors.some((e) => e.includes("'모르겠어요'·'직접 쓰기' 보기(unknown)"))).toBe(true);
  });

  it('직접 쓰기를 읽을 낱말이 없는 질문', () => {
    const errors = broken((x) => {
      delete x.aliases.options['q.device'];
    });
    expect(errors.some((e) => e.includes('q.device의 직접 쓰기를 읽을 낱말이 없습니다'))).toBe(true);
  });

  it('빈틈에 조사 카드가 없음, 도구 이름 짐작이 없는 도구를 가리킴, q.ai에서 빈틈 찾기', () => {
    const errors = broken((x) => {
      x.aliases.gaps.push({ id: 'game', aliases: ['게임'], where: ['line', 'q.ai'], message: '게임은 아직 도구를 확인하지 않았어요.' });
      first(x.aliases.toolHints).product = 'no-such-tool';
    });
    expect(errors.some((e) => e.includes('research.gap-game'))).toBe(true);
    expect(errors.some((e) => e.includes('없는 도구 no-such-tool'))).toBe(true);
    expect(errors.some((e) => e.includes('빈틈을 찾지 않습니다'))).toBe(true);
  });

  it('스키마: 도구 이름 짐작에 도구와 갈래를 함께 둠', () => {
    const errors = broken((x) => {
      first(x.aliases.toolHints).capability = 'store';
    });
    expect(errors.some((e) => e.startsWith('aliases.json'))).toBe(true);
  });
});
