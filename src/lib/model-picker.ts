// 담기 창의 '모델 고르기' (D141, 쇼핑몰의 옵션 선택): 모델 자료가 있는 AI API를 담을 때만 담기 창(cart-buttons.ts)이 이 파일을 늦게 불러 붙인다
// (첫 화면 JS를 늘리지 않으려고). 기본은 '아직 안 정했어요', 그 아래 지원이 끝나지 않은 모델을 새것부터 (입력·출력 가격, 컨텍스트).
// 모델이 8개를 넘으면 찾기 칸을 둔다. 라디오 단추 묶음(fieldset)이라 화살표로 고르고, 찾기는 맞지 않는 것을 숨기기만 한다(고른 값은 그대로).
// 목록을 받기 전·못 받았을 때는 처음 값(장바구니 줄이나 누른 줄의 모델)을 그대로 돌려준다.
import { ko } from '../copy/ko.ts';
import type { ModelRow } from './catalog/models.ts';
import { matchesModel, pickList, tokens, usd } from './catalog/models.ts';
import { providerModels } from './model-data.ts';
import type { ModelChoice } from './saved.ts';
import { fill } from './text.ts';

/** 찾기 칸을 보이는 모델 수 */
const FIND_FROM = 8;

export interface Picker {
  /** 지금 고른 모델 (없으면 아직 안 정함) */
  value(): ModelChoice | undefined;
  /** 고른 라디오 단추에 초점 (목록을 받은 뒤) */
  focus(): void;
}

let seq = 0;

function el<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] {
  const e = doc.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function subLine(r: ModelRow): string {
  const t = ko.models.pick;
  const parts: string[] = [];
  if (r.in !== undefined || r.out !== undefined) parts.push(fill(t.price, { in: r.in !== undefined ? usd(r.in) : '—', out: r.out !== undefined ? usd(r.out) : '—' }));
  if (r.ctx !== undefined) parts.push(fill(t.context, { v: tokens(r.ctx) }));
  if (r.status) parts.push(ko.models.status[r.status]);
  return parts.join(' · ');
}

function option(doc: Document, name: string, value: string, label: string, sub: string, checked: boolean): HTMLLabelElement {
  const opt = el(doc, 'label', 'mp-opt');
  const input = el(doc, 'input', 'mp-radio');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.checked = checked;
  const text = el(doc, 'span', 'mp-text');
  text.append(el(doc, 'span', 'mp-name', label));
  if (sub) text.append(el(doc, 'span', 'mp-sub', sub));
  opt.append(input, text);
  return opt;
}

/** host 안에 고르기를 그린다 (host의 옛 내용은 지운다). onChange는 고른 값이 바뀔 때, onReady는 목록을 그린 뒤 (창 자리를 다시 잡으려고) */
export function mountPicker(host: HTMLElement, provider: string, initial: ModelChoice | undefined, onReady: () => void): Picker {
  const doc = host.ownerDocument;
  const t = ko.models.pick;
  seq += 1;
  const name = `mp-${seq}`;
  host.replaceChildren();
  const box = el(doc, 'fieldset', 'mp');
  const legend = el(doc, 'legend', 'add-sheet-label', t.legend);
  const status = el(doc, 'p', 'mp-status', t.loading);
  status.setAttribute('role', 'status');
  box.append(legend, status);
  host.append(box);

  let rows: ModelRow[] | null = null;
  let list: HTMLElement | null = null;

  const picker: Picker = {
    value() {
      if (!list) return initial;
      const on = list.querySelector<HTMLInputElement>('input.mp-radio:checked');
      const id = on?.value ?? '';
      if (id === '') return undefined;
      const r = rows?.find((x) => x.id === id);
      return r ? { id: r.id, name: r.name } : undefined;
    },
    focus() {
      list?.querySelector<HTMLInputElement>('input.mp-radio:checked')?.focus();
    },
  };

  providerModels(provider)
    .then((file) => {
      if (!host.isConnected || !box.isConnected) return;
      const chosen = initial?.id;
      rows = pickList(file.rows, chosen);
      // 자료에서 빠진 모델을 골라 두었으면 그 이름 그대로 맨 위에 둔다 (모르게 지우지 않는다)
      if (initial && !rows.some((r) => r.id === initial.id)) rows.unshift({ id: initial.id, name: initial.name, mi: [], mo: [] });
      list = el(doc, 'div', 'mp-list');
      list.append(option(doc, name, '', t.none, '', chosen === undefined));
      for (const r of rows) list.append(option(doc, name, r.id, r.name, subLine(r), r.id === chosen));
      const empty = el(doc, 'p', 'mp-empty', t.noMatch);
      empty.hidden = true;
      status.remove();
      if (rows.length > FIND_FROM) {
        const findId = `${name}-find`;
        const label = el(doc, 'label', 'visually-hidden', t.find);
        label.htmlFor = findId;
        const find = el(doc, 'input', 'mp-find');
        find.id = findId;
        find.type = 'search';
        find.placeholder = t.findPlaceholder;
        find.autocomplete = 'off';
        find.spellcheck = false;
        find.enterKeyHint = 'search';
        find.addEventListener('keydown', (e) => {
          // 찾기 칸의 Enter는 담기가 아니다
          if (e.key === 'Enter') e.preventDefault();
        });
        find.addEventListener('input', () => {
          const q = find.value;
          let shown = 0;
          for (const opt of list?.querySelectorAll<HTMLLabelElement>('.mp-opt') ?? []) {
            const input = opt.querySelector<HTMLInputElement>('input');
            const r = rows?.find((x) => x.id === input?.value);
            const ok = !r || input?.checked === true || matchesModel(r, q);
            opt.hidden = !ok;
            if (ok && r) shown += 1;
          }
          empty.hidden = shown > 0 || q.trim() === '';
        });
        box.append(label, find);
      }
      box.append(list, empty, el(doc, 'p', 'mp-note', fill(t.source, { date: file.fetched })));
      onReady();
    })
    .catch(() => {
      if (!box.isConnected) return;
      status.textContent = t.failed;
      status.setAttribute('role', 'alert');
      onReady();
    });

  return picker;
}
