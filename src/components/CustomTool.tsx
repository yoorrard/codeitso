// 목록에 없는 도구 쓰기 (T37, 설계서 7.5절, input.md 8.1절): 도구 고르기의 기능마다 목록 끝 줄 [연필 + 목록에 없는 도구 쓰기].
// 1단계 직접 쓰기와 같은 껍데기(CustomShell)에 도구 이름 40자를 쓰고 [확인]하면 결과 넷 중 하나:
//   이미 목록에 있는 도구(이 칸 → [이 도구로 고르기], 다른 칸 → [{기능} 열기]) · 같은 갈래의 확인된 도구([확인된 도구 보기] 또는 상세 링크)
//   · 못 찾음 · 빈틈 알림(함께). 저절로 고르지 않는다. [직접 쓴 도구로 두기]를 누르면 세션의 customTools에 더하고(5개까지, 같은 이름 안 됨)
//   그 칸 목록 맨 위의 줄이 '고를 예정'으로 눌린다. 정하는 것은 지금처럼 아래 막대 [{도구}로 정하기]다 (장바구니에 custom-n).
// 찾기(engine/match.ts matchTool)와 도구 짐작 낱말표는 칸을 처음 펼칠 때 import()로 받는다 (custom-input.ts loadToolMatcher).
// 빈틈은 세션의 직접 쓴 글 전부에서 다시 찾는다 (1단계 찾기 묶음의 sessionGaps, 도구를 두거나 지울 때).
import type { ComponentChildren } from 'preact';
import { Fragment } from 'preact';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { loadMatcher, loadToolMatcher, toolMatcherNow, toolNameProblem, withCustomTool } from '../lib/custom-input.ts';
import { catalog } from '../lib/data.ts';
import type { EngineResult, SlotRanking } from '../lib/engine/index.ts';
import { NOTE_MAX, fill } from '../lib/engine/index.ts';
import type { ToolMatch } from '../lib/engine/match.ts';
import { $openSlot, $pending, rankingOf } from '../lib/pick-nav.ts';
import { $result, updateSession } from '../lib/result.ts';
import { toolPath } from '../lib/routes.ts';
import type { ShellControl, ShellLook } from './CustomAnswer.tsx';
import { CustomShell, GapLines } from './CustomAnswer.tsx';

/** 그림이 바뀐 뒤 그 요소에 초점 (다시 그려질 때까지 그림마다 기다린다, 길어야 20번) */
export function focusWhenReady(selector: string): void {
  let frames = 20;
  const step = (): void => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) el.focus();
    else if (frames-- > 0) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** 세션의 직접 쓴 글 전부에서 빈틈을 다시 찾는다 (지운 도구 이름의 빈틈이 '알아볼 것'에 남지 않게). 못 받으면 그대로 둔다 */
export function refreshGaps(): void {
  loadMatcher()
    .then((m) => updateSession((s) => ({ gaps: m.sessionGaps(catalog, s) })))
    .catch(() => undefined);
}

const rowSelector = (id: string): string => `#w-slot .w-row[data-product="${id}"]`;
const nameOf = (id: string): string => catalog.product.get(id)?.name ?? id;

interface Props {
  r: EngineResult;
  ranking: SlotRanking;
  /** 바뀌면 칸을 펼치고 글 칸에 초점 (막힌 곳의 [목록에 없는 도구 쓰기 ›], [다른 곳에 공개하기]) */
  openSignal: number;
}

export function CustomTool({ r, ranking, openSignal }: Props) {
  const slotId = ranking.slot.id;
  const capability = ranking.slot.capability;

  const problem = (text: string): string | null => {
    const p = toolNameProblem($result.get().session.customTools ?? [], text);
    return p === 'limit' ? ko.shop.customLimit : p === 'duplicate' ? ko.shop.customDuplicate : null;
  };

  /** 이 칸에서 줄 하나를 '고를 예정'으로 누르고 그 줄로 초점 */
  const pressHere = (c: ShellControl, productId: string, at: string = slotId): void => {
    $pending.set({ ...$pending.get(), [at]: productId });
    c.close();
    if (at !== slotId) $openSlot.set(at);
    focusWhenReady(rowSelector(productId));
  };

  const keep = (c: ShellControl): void => {
    const add = withCustomTool($result.get().session, c.text, capability);
    if (!add) {
      // [확인] 뒤 다른 탭에서 같은 이름을 쓰거나 5개를 채운 경우: 같은 오류 문장을 알린다
      announce(problem(c.text) ?? ko.shop.customLimit);
      return;
    }
    updateSession(() => ({ customTools: add.customTools }));
    $pending.set({ ...$pending.get(), [slotId]: add.id });
    c.close();
    announce(fill(ko.shop.customKept, { name: c.text }));
    focusWhenReady(rowSelector(add.id));
    refreshGaps();
  };

  const body = (m: ToolMatch, gapLines: string[]) => (c: ShellControl) => {
    const keepButton = (
      <button type="button" class="btn btn-neutral" onClick={() => keep(c)}>
        {ko.shop.customKeep}
      </button>
    );
    const retry = (
      <button type="button" class="btn btn-text" onClick={c.retry}>
        {ko.custom.retry}
      </button>
    );
    let head: ComponentChildren;
    let lines: string[] = [];
    let first: ComponentChildren = null;
    if (m.same) {
      const { productId, inSlot, slots } = m.same;
      head = fill(ko.shop.customSame, { name: nameOf(productId) });
      const there = slots[0] === undefined ? undefined : rankingOf(r, slots[0]);
      if (inSlot) {
        first = (
          <button type="button" class="btn btn-soft" onClick={() => pressHere(c, productId)}>
            {ko.shop.customSamePick}
          </button>
        );
      } else if (there) {
        lines = [fill(ko.shop.customSameElsewhere, { slot: there.slot.label })];
        first = (
          <button type="button" class="btn btn-soft" onClick={() => pressHere(c, productId, there.slot.id)}>
            {fill(ko.shop.customOpenSlot, { slot: there.slot.label })}
          </button>
        );
      }
    } else if (m.near) {
      const { productIds, inSlot } = m.near;
      const [before = '', after = ''] = ko.shop.customNear.split('{{names}}');
      // 이 칸에 없으면 이름을 도구 상세로 잇는다. 같은 기능인데 분야가 달라서 없으면 '가져올 정보 답을 바꾸면' 한 줄
      head = (
        <>
          {before}
          {productIds.map((id, i) => (
            <Fragment key={id}>
              {i > 0 && ', '}
              {inSlot ? nameOf(id) : <a href={toolPath(id)}>{nameOf(id)}</a>}
            </Fragment>
          ))}
          {after}
        </>
      );
      const sameKind = productIds.every((id) => catalog.product.get(id)?.capabilities.includes(capability) === true);
      if (!inSlot && sameKind) lines = [ko.shop.customNearElsewhere];
      const top = productIds[0];
      if (inSlot && top !== undefined) {
        first = (
          <button
            type="button"
            class="btn btn-soft"
            onClick={() => {
              c.close();
              focusWhenReady(rowSelector(top));
            }}
          >
            {ko.shop.customNearShow}
          </button>
        );
      }
    } else {
      head = ko.shop.customNone;
      lines = [ko.shop.customKeepNote];
    }
    return (
      <>
        <p id={c.foundId} class="custom-found" tabIndex={-1}>
          {head}
        </p>
        {lines.map((line) => (
          <p key={line} class="custom-line">
            {line}
          </p>
        ))}
        <div class="custom-actions">
          {first}
          {keepButton}
          {retry}
        </div>
        <GapLines lines={gapLines} />
      </>
    );
  };

  const look = async (text: string): Promise<ShellLook> => {
    let match: ToolMatch = { same: null, near: null, gaps: [] };
    let gapLines: string[] = [];
    let contact = false;
    try {
      const m = await loadToolMatcher();
      match = m.toolMatch(catalog, $result.get(), slotId, text);
      gapLines = match.gaps.map((id) => m.gapMessage(id)).filter((x) => x !== '');
      contact = m.looksLikeContact(text);
    } catch {
      // 찾기 묶음을 못 받으면 '못 찾음'으로 보인다: 직접 쓴 도구로 둘 수 있다
    }
    return { contact, body: body(match, gapLines) };
  };

  return (
    <CustomShell
      base={`ct-${slotId.replace(/[^a-z0-9-]/g, '-')}`}
      variant="row"
      tile
      label={ko.shop.customRow}
      chosen={false}
      field={ko.shop.customField}
      hint={ko.shop.customHint}
      name
      initial=""
      max={NOTE_MAX}
      openSignal={openSignal}
      preload={() => void loadToolMatcher().catch(() => undefined)}
      loaded={() => toolMatcherNow() !== null}
      problem={problem}
      look={look}
    />
  );
}
