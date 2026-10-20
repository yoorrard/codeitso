// 카드·상세·검색 결과의 [담기]와 홈 스타터 키트의 [키트 담기]를 한 곳에서 맡는다 (Base.astro가 모든 쪽에서 한 번 부른다).
// 정적 카드(홈·카테고리)와 섬이 그린 카드·상세 버튼 모두 data-add 버튼이라, 문서에 누름 하나를 걸고
// 장바구니가 바뀌거나 섬이 카드를 새로 그렸을 때(CARDS_EVENT) 모든 버튼의 상태(data-in)·글을 맞춘다.
// v5.1 (D120): [담기]를 누르면 바로 담지 않고 작은 창(어디에 쓸지 메모(선택) + [담기]·[취소])을 띄운다. 창의 [담기]를 눌러야 담긴다.
// 이미 담긴 재료([담겼어요])를 누르면 같은 창에서 메모를 고치거나([저장]) 뺀다([빼기]). 창은 모달 <dialog>라 Esc·바깥 누르기·[취소]로
// 닫히고 누른 버튼으로 초점이 돌아간다. 휴대폰(<600)은 아래에서 올라오는 시트, 넓은 화면은 버튼 바로 아래(자리가 없으면 위)에 뜬다.
import { ko } from '../copy/ko.ts';
import { announce } from './announce.ts';
import { CARDS_EVENT, openCart } from './cart-ui.ts';
import { isKitId } from './kits.ts';
import { MEMO_MAX } from './saved.ts';
import { $cart, addManyToCart, addToCart, removeFromCart, setCartMemo } from './store.ts';
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

// ── 담기 창 ─────────────────────────────────────────────────────────
interface Sheet {
  dlg: HTMLDialogElement;
  kicker: HTMLElement;
  name: HTMLElement;
  input: HTMLInputElement;
  ok: HTMLButtonElement;
  remove: HTMLButtonElement;
  view: HTMLButtonElement;
  cancel: HTMLButtonElement;
}

interface Target {
  btn: HTMLButtonElement;
  id: string;
  name: string;
  cat: string;
  sub: string;
  inCart: boolean;
}

let sheet: Sheet | null = null;
let current: Target | null = null;
/** 넓은 화면에서 창과 버튼 사이 (px) */
const GAP = 8;

function node<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  el.className = cls;
  if (text) el.textContent = text;
  return el;
}

function button(doc: Document, text: string, cls: string): HTMLButtonElement {
  const b = node(doc, 'button', cls, text);
  b.type = 'button';
  return b;
}

const narrow = (): boolean => window.matchMedia('(max-width: 599px)').matches;

/** 넓은 화면: 누른 버튼 바로 아래, 화면 밖으로 나가면 위로. 오른쪽 끝을 버튼에 맞춘다 */
function place(): void {
  if (!sheet || !current) return;
  const { dlg } = sheet;
  if (narrow()) {
    dlg.style.removeProperty('--sheet-x');
    dlg.style.removeProperty('--sheet-y');
    return;
  }
  const r = current.btn.getBoundingClientRect();
  const w = dlg.offsetWidth;
  const h = dlg.offsetHeight;
  const x = Math.min(Math.max(GAP, r.right - w), window.innerWidth - w - GAP);
  let y = r.bottom + GAP;
  if (y + h > window.innerHeight - GAP) y = Math.max(GAP, r.top - h - GAP);
  dlg.style.setProperty('--sheet-x', `${Math.round(x)}px`);
  dlg.style.setProperty('--sheet-y', `${Math.round(y)}px`);
}

function close(): void {
  if (sheet?.dlg.open) sheet.dlg.close();
}

function confirm(): void {
  const t = current;
  if (!sheet || !t) return;
  const memo = sheet.input.value;
  if (t.inCart) {
    setCartMemo(t.id, memo);
    announce(fill(ko.sheet.savedLive, { name: t.name }));
    close();
    return;
  }
  const r = addToCart({ id: t.id, name: t.name, cat: t.cat, sub: t.sub, memo }, Date.now());
  if (r === 'full') {
    announce(ko.card.full);
    return;
  }
  if (r === 'added') trackAdd(t.cat);
  announce(fill(ko.card.addedLive, { name: t.name }));
  close();
}

function build(doc: Document): Sheet {
  const dlg = node(doc, 'dialog', 'add-sheet');
  dlg.setAttribute('aria-labelledby', 'add-sheet-kicker add-sheet-name');
  const head = node(doc, 'div', 'add-sheet-head');
  const kicker = node(doc, 'p', 'add-sheet-kicker');
  kicker.id = 'add-sheet-kicker';
  const name = node(doc, 'p', 'add-sheet-name');
  name.id = 'add-sheet-name';
  head.append(kicker, name);
  const label = node(doc, 'label', 'add-sheet-label', ko.sheet.memoLabel);
  label.htmlFor = 'add-sheet-memo';
  const input = node(doc, 'input', 'add-sheet-input');
  input.id = 'add-sheet-memo';
  input.type = 'text';
  input.maxLength = MEMO_MAX;
  input.placeholder = ko.sheet.memoPlaceholder;
  input.autocomplete = 'off';
  input.enterKeyHint = 'done';
  input.setAttribute('aria-describedby', 'add-sheet-hint');
  const hint = node(doc, 'p', 'add-sheet-hint', ko.sheet.memoHint);
  hint.id = 'add-sheet-hint';
  const acts = node(doc, 'div', 'add-sheet-acts');
  const ok = button(doc, ko.sheet.add, 'btn btn-primary add-sheet-ok');
  const remove = button(doc, ko.sheet.remove, 'btn');
  const cancel = button(doc, ko.sheet.cancel, 'btn');
  const view = button(doc, ko.sheet.view, 'btn btn-text add-sheet-view');
  acts.append(ok, remove, cancel, view);
  const x = button(doc, '', 'add-sheet-x');
  x.setAttribute('aria-label', ko.sheet.close);
  x.innerHTML = '<span aria-hidden="true">×</span>'; // floor-guard-ignore: 닫기 표시 글자(곱하기 기호), 문장이 아니다
  dlg.append(head, label, input, hint, acts, x);
  doc.body.append(dlg);

  ok.addEventListener('click', confirm);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      confirm();
    }
  });
  cancel.addEventListener('click', close);
  x.addEventListener('click', close);
  remove.addEventListener('click', () => {
    if (!current) return;
    removeFromCart(current.id);
    announce(fill(ko.card.removedLive, { name: current.name }));
    close();
  });
  view.addEventListener('click', () => {
    const t = current;
    if (!t) return;
    // 서랍을 닫으면 돌아올 자리가 누른 버튼이 되게, 창을 닫고 버튼에 초점을 둔 뒤 연다
    current = null;
    close();
    t.btn.focus();
    openCart(t.id);
  });
  // 바깥(어두운 바탕) 누르기: 창 네모 밖이면 닫는다
  dlg.addEventListener('click', (e) => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
  dlg.addEventListener('close', () => {
    window.removeEventListener('scroll', place, true);
    window.removeEventListener('resize', place);
    const t = current;
    current = null;
    if (t?.btn.isConnected) t.btn.focus();
  });
  return { dlg, kicker, name, input, ok, remove, view, cancel };
}

function openSheet(doc: Document, btn: HTMLButtonElement, keyboard: boolean): void {
  const { add: id, name, cat, sub } = btn.dataset;
  if (!id || !name || !cat || !sub) return;
  sheet ??= build(doc);
  const s = sheet;
  const line = $cart.get().find((x) => x.id === id);
  current = { btn, id, name, cat, sub, inCart: line !== undefined };
  s.dlg.dataset['in'] = String(current.inCart);
  s.kicker.textContent = current.inCart ? ko.sheet.kickerIn : ko.sheet.kickerAdd;
  s.name.textContent = name;
  s.input.value = line?.memo ?? '';
  s.ok.textContent = current.inCart ? ko.sheet.save : ko.sheet.add;
  s.remove.hidden = !current.inCart;
  s.view.hidden = !current.inCart;
  s.cancel.hidden = current.inCart;
  if (!s.dlg.open) s.dlg.showModal();
  place();
  window.addEventListener('scroll', place, { capture: true, passive: true });
  window.addEventListener('resize', place, { passive: true });
  // 키보드·마우스면 메모 칸으로 (바로 적거나 Enter로 담기), 손가락이면 자판이 화면을 가리지 않게 [담기]로
  (keyboard || window.matchMedia('(pointer: fine)').matches ? s.input : s.ok).focus();
}

export function wireAddButtons(doc: Document = document): void {
  doc.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    const b = t?.closest<HTMLButtonElement>('button[data-add]');
    if (b) {
      // 키보드(Enter·Space)로 누른 click은 detail이 0이다
      openSheet(doc, b, e.detail === 0);
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
  $cart.subscribe(() => sync(doc));
  doc.addEventListener(CARDS_EVENT, () => sync(doc));
}
