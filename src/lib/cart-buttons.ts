// 카드의 [담기]와 홈 스타터 키트의 [키트 담기]를 한 곳에서 맡는다 (Base.astro가 모든 쪽에서 한 번 부른다).
// 정적 카드(홈·카테고리)와 목록 섬이 다시 그린 카드 모두 data-add 버튼이라, 문서에 누름 하나를 걸고
// 장바구니가 바뀌거나 섬이 카드를 새로 그렸을 때(CARDS_EVENT) 모든 버튼의 상태(data-in)·글을 맞춘다.
// - 아직 안 담은 카드 [담기]: 담고, 그 카드 안에 작은 창(메모 선택 · 장바구니 보기)을 버튼 바로 뒤에 띄운다. 초점은 버튼에 남고 Tab이면 창으로 간다.
// - 이미 담은 카드 [담음]: 다시 담지 않고 장바구니 서랍을 열어 그 재료 줄로 초점을 옮긴다 (빼기·메모 고치기는 거기서).
import { ko } from '../copy/ko.ts';
import { announce } from './announce.ts';
import { CARDS_EVENT, openCart } from './cart-ui.ts';
import { isKitId } from './kits.ts';
import { MEMO_MAX } from './saved.ts';
import { $cart, addManyToCart, addToCart, setCartMemo } from './store.ts';
import { fill } from './text.ts';
import { track, trackAdd } from './track.ts';

type KitItem = [string, string, string, string];

function kitItems(b: HTMLElement): KitItem[] {
  try {
    const raw: unknown = JSON.parse(b.dataset['items'] ?? '[]');
    return Array.isArray(raw) ? raw.filter((x): x is KitItem => Array.isArray(x) && x.length === 4 && x.every((v) => typeof v === 'string')) : [];
  } catch {
    return [];
  }
}

function sync(root: ParentNode): void {
  const ids = new Set($cart.get().map((x) => x.id));
  for (const b of root.querySelectorAll<HTMLButtonElement>('button[data-add]')) {
    const on = ids.has(b.dataset['add'] ?? '');
    if (b.dataset['in'] === String(on)) continue;
    b.dataset['in'] = String(on);
    const name = b.dataset['name'] ?? '';
    b.setAttribute('aria-label', fill(on ? ko.card.inCartLabel : ko.card.addLabel, { name }));
    const label = b.querySelector('.add-label');
    if (label) label.textContent = on ? ko.card.added : ko.card.add;
  }
  for (const b of root.querySelectorAll<HTMLButtonElement>('button[data-kit]')) {
    const all = kitItems(b).every(([id]) => ids.has(id));
    b.dataset['in'] = String(all);
  }
}

// ── 담은 뒤 작은 창 ────────────────────────────────────────────────
let pop: { el: HTMLElement; btn: HTMLButtonElement } | null = null;
let popSeq = 0;

function closePop(focusButton: boolean): void {
  if (!pop) return;
  const { el, btn } = pop;
  pop = null;
  el.remove();
  if (focusButton && btn.isConnected) btn.focus();
}

function button(text: string, cls: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = text;
  return b;
}

function showPop(btn: HTMLButtonElement, id: string, name: string): void {
  closePop(false);
  popSeq += 1;
  const fieldId = `add-pop-memo-${popSeq}`;
  const el = document.createElement('div');
  el.className = 'add-pop';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', fill(ko.pop.label, { name }));

  const title = document.createElement('p');
  title.className = 'add-pop-title';
  title.textContent = ko.pop.title;
  const label = document.createElement('label');
  label.className = 'add-pop-label';
  label.htmlFor = fieldId;
  label.textContent = ko.pop.memoLabel;
  const input = document.createElement('input');
  input.id = fieldId;
  input.type = 'text';
  input.className = 'add-pop-input';
  input.maxLength = MEMO_MAX;
  input.placeholder = ko.pop.memoPlaceholder;
  input.autocomplete = 'off';
  const acts = document.createElement('div');
  acts.className = 'add-pop-acts';
  const save = button(ko.pop.save, 'btn btn-sm btn-soft');
  const view = button(ko.pop.view, 'btn btn-sm btn-text');
  const x = button('', 'add-pop-x');
  x.setAttribute('aria-label', ko.pop.close);
  x.innerHTML = '<span aria-hidden="true">×</span>'; // floor-guard-ignore: 닫기 표시 글자(곱하기 기호), 문장이 아니다
  acts.append(save, view);
  el.append(title, x, label, input, acts);

  const doSave = (): void => {
    setCartMemo(id, input.value);
    if (input.value.trim() !== '') announce(fill(ko.pop.savedLive, { name }));
    closePop(true);
  };
  save.addEventListener('click', doSave);
  view.addEventListener('click', () => {
    // 서랍을 닫으면 돌아올 자리가 [담음] 버튼이 되게, 창을 닫고 버튼에 초점을 둔 뒤 연다
    closePop(true);
    openCart(id);
  });
  x.addEventListener('click', () => closePop(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      doSave();
    }
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closePop(true);
    }
  });
  btn.after(el);
  pop = { el, btn };
}

export function wireAddButtons(doc: Document = document): void {
  doc.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (pop && t && !pop.el.contains(t) && t !== pop.btn) closePop(false);
    const b = t?.closest<HTMLButtonElement>('button[data-add]');
    if (b) {
      const { add: id, name, cat, sub } = b.dataset;
      if (!id || !name || !cat || !sub) return;
      if (b.dataset['in'] === 'true') {
        closePop(false);
        openCart(id);
        return;
      }
      const r = addToCart({ id, name, cat, sub }, Date.now());
      if (r === 'full') {
        announce(ko.card.full);
        return;
      }
      if (r === 'added') trackAdd(cat);
      announce(fill(ko.card.addedLive, { name }));
      showPop(b, id, name);
      return;
    }
    const k = t?.closest<HTMLButtonElement>('button[data-kit]');
    if (k) {
      const kit = k.dataset['kit'] ?? '';
      const name = k.dataset['name'] ?? '';
      const items = kitItems(k);
      if (k.dataset['in'] === 'true') {
        announce(fill(ko.kits.allIn, { name }));
        openCart();
        return;
      }
      const r = addManyToCart(
        items.map(([id, n, cat, sub]) => ({ id, name: n, cat, sub })),
        Date.now(),
      );
      if (r.full && r.added === 0) {
        announce(ko.card.full);
        return;
      }
      if (isKitId(kit)) track('bundle_add', kit);
      announce(r.skipped > 0 ? fill(ko.kits.addedSkip, { name, added: r.added, skipped: r.skipped }) : fill(ko.kits.addedLive, { name, added: r.added }));
    }
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pop && !pop.el.contains(doc.activeElement)) closePop(doc.activeElement === pop.btn);
  });
  $cart.subscribe(() => sync(doc));
  doc.addEventListener(CARDS_EVENT, () => sync(doc));
}
