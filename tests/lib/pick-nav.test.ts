// 도구 고르기의 화면 상태 (brief 6.6, D70): 미리 누름, 다음 칸, 이름이 박힌 확정 버튼, 장바구니 고치기
import { describe, expect, it } from 'vitest';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import type { EngineResult } from '../../src/lib/engine/index.ts';
import { evaluate } from '../../src/lib/engine/index.ts';
import {
  barState,
  cartAfterPick,
  initialSlot,
  nextOpenSlot,
  pickableSlots,
  pressedFor,
  rankingOf,
  removableFor,
  savedFor,
  plainName,
  shortName,
  slotTitle,
} from '../../src/lib/pick-nav.ts';
import { progress } from '../../src/lib/progress.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const goldens = goldenFiles().map((f) => readJson<Golden>(f));
const kase = (id: string): Golden => {
  const g = goldens.find((x) => x.id === id);
  if (!g) throw new Error(`골든 사례 ${id}가 없습니다`);
  return g;
};
const at = (id: string, cart: string[] = []): EngineResult => evaluate(cat, { answers: kase(id).answers, cart });
const slot = (r: EngineResult, id: string) => {
  const s = rankingOf(r, id);
  if (!s) throw new Error(`${id} 칸이 없습니다`);
  return s;
};

/** 추천대로 따라가기: 주 버튼이 [{도구}로 정하기]인 동안 누른다. 누른 횟수와 마지막 상태 */
function follow(id: string): { presses: number; r: EngineResult; last: ReturnType<typeof barState> } {
  let r = at(id);
  let open = initialSlot(r, null);
  for (let presses = 0; presses < 20; presses++) {
    const b = barState(r, open, {});
    if (b.kind !== 'save' || open === null) return { presses, r, last: b };
    const before = pickableSlots(r).length;
    r = evaluate(cat, { answers: r.session.answers, cart: cartAfterPick(r, open, b.product.id) });
    // 한 번 누를 때마다 고를 것이 적어도 하나 준다 (같은 칸을 두 번 누르게 하지 않는다)
    expect(pickableSlots(r).length).toBeLessThan(before);
    open = nextOpenSlot(r, open) ?? open;
  }
  throw new Error('추천대로 가도 끝나지 않았습니다');
}

describe('pressedFor: 눌린 채로 보이는 줄', () => {
  const r = at('case-03');

  it('꼭 고를 것은 추천 줄이 미리 눌려 있다 (저장은 하지 않는다)', () => {
    const screen = slot(r, 'slot.screen');
    expect(pressedFor(r, screen, {})).toBe(screen.recommended?.product.id);
    expect(r.session.cart).toEqual([]);
  });

  it('있으면 좋은 것은 미리 누르지 않는다 (game 3.7)', () => {
    const host = slot(r, 'slot.host');
    expect(host.slot.required).toBe(false);
    expect(host.recommended).not.toBeNull();
    expect(pressedFor(r, host, {})).toBeNull();
  });

  it('손님이 누른 줄이 앞서고, 이 칸에 없는 상품은 무시한다', () => {
    const screen = slot(r, 'slot.screen');
    const other = screen.shelf.find((s) => s !== screen.recommended)?.product.id ?? '';
    expect(pressedFor(r, screen, { 'slot.screen': other })).toBe(other);
    expect(pressedFor(r, screen, { 'slot.screen': 'no-such-tool' })).toBe(screen.recommended?.product.id);
  });

  it('정한 도구가 있으면 그것이 눌려 있다 (추천과 달라도)', () => {
    const r2 = at('case-03', ['html-single']);
    expect(pressedFor(r2, slot(r2, 'slot.screen'), {})).toBe('html-single');
  });
});

describe('pickableSlots: 지금 고를 수 있는 꼭 고를 것', () => {
  it('상태 한 줄의 수(남은 꼭 고를 것 − 맞는 도구가 없는 것)와 같다', () => {
    for (const g of goldens) {
      for (const cart of [[], g.cart]) {
        const r = at(g.id, cart);
        const p = progress(r, {});
        expect(pickableSlots(r).length, `${g.id} ${cart.join(',')}`).toBe(p.requiredLeft - p.requiredNoTool);
      }
    }
  });

  it('만들 앱을 정하기 전에는 없다', () => {
    expect(pickableSlots(evaluate(cat, {}))).toEqual([]);
  });
});

describe('nextOpenSlot·initialSlot: 다음에 열 칸', () => {
  const r = at('case-03');

  it('처음에는 고를 수 있는 첫 꼭 고를 것', () => {
    expect(initialSlot(r, null)).toBe('slot.screen');
    expect(nextOpenSlot(r)).toBe('slot.screen');
  });

  it('지금 칸 다음부터 찾고, 끝에서 처음으로 돈다. 지금 칸은 빼고, 있으면 좋은 것은 건너뛴다', () => {
    expect(nextOpenSlot(r, 'slot.screen')).toBe('slot.data');
    expect(nextOpenSlot(r, 'slot.notify')).toBe('slot.screen');
    expect(nextOpenSlot(r, 'slot.host')).toBe('slot.screen');
  });

  it('다 골랐으면 null, 처음 칸은 첫 칸', () => {
    const full = at('case-03', ['react-vite', 'kis-open-api', 'discord-webhook']);
    expect(nextOpenSlot(full, 'slot.notify')).toBeNull();
    expect(initialSlot(full, null)).toBe('slot.screen');
  });

  it("주소의 ?slot=이 열린 칸이면 그 칸, 아니면 무시 ('도구 바꾸기')", () => {
    expect(initialSlot(r, 'slot.host')).toBe('slot.host');
    expect(initialSlot(r, 'slot.nowhere')).toBe('slot.screen');
  });
});

describe('cartAfterPick: 정하기·바꾸기', () => {
  it('빈 칸에 정하면 담는다', () => {
    expect(cartAfterPick(at('case-03'), 'slot.screen', 'react-vite')).toEqual(['react-vite']);
  });

  it('바꾸면 이 칸을 맡던 도구를 뺀다', () => {
    const r = at('case-04', ['react-vite', 'airtable']);
    expect(cartAfterPick(r, 'slot.store', 'supabase')).toEqual(['react-vite', 'supabase']);
  });

  it('맡던 도구가 다른 칸도 혼자 맡고 있으면 남긴다 (다른 칸이 몰래 비지 않게). 이 칸에는 새로 고른 것이 정한 도구로 보인다', () => {
    const r = at('case-04', ['react-vite', 'supabase']);
    expect(slot(r, 'slot.auth').filledBy).toEqual(['supabase']);
    const cart = cartAfterPick(r, 'slot.auth', 'firebase-auth');
    expect(cart).toEqual(['react-vite', 'supabase', 'firebase-auth']);
    const after = at('case-04', cart);
    expect(savedFor(after, slot(after, 'slot.auth'))).toBe('firebase-auth');
    expect(savedFor(after, slot(after, 'slot.store'))).toBe('supabase');
  });

  it('이미 정한 도구를 다시 정하면 그대로, 이 칸에 없는 상품은 무시', () => {
    const r = at('case-03', ['react-vite']);
    expect(cartAfterPick(r, 'slot.screen', 'react-vite')).toEqual(['react-vite']);
    expect(cartAfterPick(r, 'slot.screen', 'kis-open-api')).toEqual(['react-vite']);
  });
});

describe('removableFor: 있으면 좋은 것만 뺄 수 있다', () => {
  it('있으면 좋은 것의 정한 도구는 뺄 수 있고, 꼭 고를 것은 빼지 않고 바꾼다', () => {
    const r = at('case-03', ['react-vite', 'cloudflare-workers']);
    expect(removableFor(r, slot(r, 'slot.host'))).toBe('cloudflare-workers');
    expect(removableFor(r, slot(r, 'slot.screen'))).toBeNull();
  });

  it('정한 도구가 없으면 null', () => {
    const r = at('case-03');
    expect(removableFor(r, slot(r, 'slot.host'))).toBeNull();
  });
});

describe('shortName: 버튼에 넣는 이름 (brief 2.1)', () => {
  it('괄호 안을 빼고, 빈칸을 뺀 글자가 14자를 넘으면 null', () => {
    expect(shortName('Cloud Firestore (Firebase)')).toBe('Cloud Firestore');
    expect(shortName('Supabase')).toBe('Supabase');
    expect(shortName('Cloudflare Workers')).toBeNull();
    expect(shortName('Firebase Authentication')).toBeNull();
    expect(shortName('가나다라마바사아자차카타파하')).toBe('가나다라마바사아자차카타파하');
    expect(shortName('가나다라마바사아자차카타파하거')).toBeNull();
  });
});

describe('plainName·slotTitle', () => {
  it('알림에 쓰는 이름은 괄호 안을 뺀다', () => {
    expect(plainName('Cloud Firestore (Firebase)')).toBe('Cloud Firestore');
    expect(plainName('국토교통부(TAGO) 버스도착정보')).toBe('국토교통부 버스도착정보');
  });

  it("칸 제목은 받침에 맞는 조사: '로그인을 맡을 도구', '화면을 맡을 도구', '배포·공유를 맡을 도구'", () => {
    expect(slotTitle('로그인')).toBe('로그인을 맡을 도구');
    expect(slotTitle('배포·공유')).toBe('배포·공유를 맡을 도구');
  });
});

describe('barState: 아래 막대 주 버튼', () => {
  it('만들 앱을 정하기 전에는 [만들 앱 정하러 가기]', () => {
    expect(barState(evaluate(cat, {}), null, {}).kind).toBe('locked');
  });

  it('꼭 고를 것: 추천을 정하는 버튼, 다른 줄을 누르면 그 줄', () => {
    const r = at('case-03');
    const b = barState(r, 'slot.screen', {});
    expect(b).toMatchObject({ kind: 'save', change: false });
    expect(b.kind === 'save' && b.product.id).toBe(slot(r, 'slot.screen').recommended?.product.id);
    const c = barState(r, 'slot.screen', { 'slot.screen': 'html-single' });
    expect(c.kind === 'save' && c.product.id).toBe('html-single');
  });

  it('정한 도구와 다른 줄을 누르면 [바꾸기]', () => {
    const r = at('case-03', ['react-vite']);
    expect(barState(r, 'slot.screen', { 'slot.screen': 'html-single' })).toMatchObject({ kind: 'save', change: true });
  });

  it('있으면 좋은 것: 누를 때까지 꺼짐 + [이번엔 건너뛰기]', () => {
    const r = at('case-03');
    expect(barState(r, 'slot.host', {})).toEqual({ kind: 'wait', extra: 'skip' });
    expect(barState(r, 'slot.host', { 'slot.host': 'github-pages' })).toMatchObject({ kind: 'save', change: false });
  });

  it('꼭 고를 것을 다 고르면 [도구끼리 맞춰 보러 가기]. 있으면 좋은 것을 정했으면 [빼기]도', () => {
    const full = at('case-03', ['react-vite', 'kis-open-api', 'discord-webhook']);
    expect(barState(full, 'slot.notify', {})).toEqual({ kind: 'go', extra: null });
    expect(barState(full, 'slot.host', {})).toEqual({ kind: 'go', extra: null });
    const withHost = at('case-03', ['react-vite', 'kis-open-api', 'discord-webhook', 'github-pages']);
    expect(barState(withHost, 'slot.host', {})).toEqual({ kind: 'go', extra: 'remove' });
  });

  it('추천이 없는 꼭 고를 것은 미리 누르지 않고 꺼짐 + 건너뛰기', () => {
    const r = at('case-05');
    expect(slot(r, 'slot.data').recommended).toBeNull();
    expect(barState(r, 'slot.data', {})).toEqual({ kind: 'wait', extra: 'skip' });
  });

  it('그 칸이 마지막 고를 것이면 건너뛸 곳이 없어 꺼짐만', () => {
    const r = at('case-05', ['react-vite']);
    expect(pickableSlots(r).map((s) => s.slot.id)).toEqual(['slot.data']);
    expect(barState(r, 'slot.data', {})).toEqual({ kind: 'wait', extra: null });
  });
});

describe('추천대로 가면 꼭 고를 것마다 한 번만 누른다 (brief 6.6)', () => {
  it('case-03: 꼭 고를 것 3개 → 3번 누르면 [도구끼리 맞춰 보러 가기]', () => {
    const { presses, r, last } = follow('case-03');
    expect(presses).toBe(3);
    expect(last.kind).toBe('go');
    expect(pickableSlots(r)).toEqual([]);
  });

  it('여러 칸을 맡는 도구를 고르면 그 칸은 저절로 채워져 덜 누른다 (case-02: 구글 시트가 저장·배포를 함께)', () => {
    expect(follow('case-02').presses).toBe(2);
  });

  it('모든 골든 사례: 누른 횟수는 꼭 고를 것 수를 넘지 않는다', () => {
    for (const g of goldens) {
      const { presses } = follow(g.id);
      expect(presses, g.id).toBeLessThanOrEqual(at(g.id).slots.filter((s) => s.slot.required).length);
    }
  });
});
