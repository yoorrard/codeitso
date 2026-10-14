// 도구 고르기 아래 막대 (brief 2.1·6.6·5.6, D70): 상태 한 줄(기본 틀의 StatusLine) 아래 주 버튼 하나.
//   [{도구}로 정하기] 미리 눌린 줄을 저장하고 다음 남은 꼭 고를 것으로 간다 (추천대로 가면 칸마다 한 번)
//   [{도구}로 바꾸기] 이미 정한 칸에서 다른 줄을 눌렀을 때 · [도구끼리 맞춰 보러 가기] 꼭 고를 것을 다 골랐을 때
//   꺼짐 + 옆 글 버튼 [이번엔 건너뛰기] 눌린 줄이 없을 때(있으면 좋은 것) · [만들 앱 정하러 가기] 잠겼을 때
// 이름은 괄호 안을 빼고, 14자를 넘으면 '고른 도구로 정하기' + 낭독 이름 '고른 도구로 정하기: {온전한 이름}'(보이는 글로 시작, WCAG 2.5.3). 조사는 josa.ts.
// 저장은 장바구니(cart)뿐이다. '고를 예정'과 여는 칸은 pick-nav.ts의 화면 상태로 도구 섬(Shop)과 나눠 쓴다.
// 정하면(S3, D71) 누른 줄의 그림을 떠 두고 지도 섬에 신호($mapCue)를 남긴다: 지도 섬이 그 그림을 마디로 날리고 마디를 채운다.
import { useStore } from '@nanostores/preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';
import type { Product } from '../lib/engine/types.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { josa } from '../lib/josa.ts';
import { $mapCue } from '../lib/map/focus.ts';
import { capture } from '../lib/motion.ts';
import {
  $openSlot,
  $pending,
  $slotMoves,
  barState,
  cartAfterPick,
  clearPending,
  nextOpenSlot,
  pickableSlots,
  plainName,
  pressedFor,
  rankingOf,
  removableFor,
  shortName,
  slotTitle,
} from '../lib/pick-nav.ts';
import { $result, updateSession } from '../lib/result.ts';
import { ROUTES } from '../lib/routes.ts';
import { sfx } from '../lib/sfx.ts';

/** 다음 칸을 열고 그 칸 제목(과 미리 눌린 추천 이름)을 알림 끝에 붙인다 (칩을 화면 안으로 굴리는 것은 도구 섬).
 *  초점은 주 버튼에 남고 버튼 이름이 다음 추천으로 바뀌므로, Enter만 이어 누르는 낭독기 이용자도 무엇을 고르는지 듣는다 */
function moveTo(next: string | null): string[] {
  if (next === null) return [];
  $openSlot.set(next);
  $slotMoves.set($slotMoves.get() + 1);
  const r = $result.get();
  const ranking = rankingOf(r, next);
  if (!ranking) return [];
  const pressed = pressedFor(r, ranking, $pending.get());
  const product = ranking.shelf.find((s) => s.product.id === pressed)?.product;
  return [fill(ko.shop.nextSlot, { title: slotTitle(ranking.slot.label) }), ...(product ? [fill(ko.shop.nextPick, { cop: josa(plainName(product.name), 'cop') })] : [])];
}

export default function WaypointsAction() {
  const ready = useHydrated();
  const r = useStore($result);
  const open = useStore($openSlot);
  const pending = useStore($pending);
  const primary = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  // 누른 뒤 버튼이 바뀌면(정하기 → 맞춰 보러 가기, 건너뛰기가 사라짐) 초점이 길을 잃지 않게 주 버튼으로 돌려놓는다
  const refocus = useRef(false);
  // 아래 막대는 sticky라 그냥 focus()하면 브라우저가 막대가 흐름상 놓일 자리(페이지 끝)로 굴린다: 굴리지 않는다
  useLayoutEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    primary.current?.focus({ preventScroll: true });
  });

  // 빌드 때(처음 온 사람)는 잠김: [만들 앱 정하러 가기]. 다시 온 손님에게는 붙을 때까지 감춘다 (waypoints.css)
  const b = ready ? barState(r, open, pending) : ({ kind: 'locked' } as const);

  const save = (product: Product, change: boolean): void => {
    const slotId = $openSlot.get();
    if (slotId === null) return;
    // 누른 줄은 정하자마자 다음 칸으로 다시 그려져 사라지므로, 그 그림의 자리와 겉모습을 먼저 떠 둔다
    const tile = document.querySelector(`#w-slot .w-row[data-product="${product.id}"] .list-tile`);
    $mapCue.set({ slot: slotId, from: tile ? capture(tile) : null });
    updateSession((s) => ({ ...s, cart: cartAfterPick($result.get(), slotId, product.id) }));
    clearPending(slotId);
    const after = $result.get();
    const left = pickableSlots(after).length;
    // 같은 동작은 같은 이름: [바꾸기]를 눌렀으면 '바꿨어요', 남은 수는 상태 한 줄과 같은 말
    const said = [fill(change ? ko.shop.changedAs : ko.shop.pickedAs, { dir: josa(plainName(product.name), 'dir') }), left > 0 ? fill(ko.shop.requiredLeft, { n: left }) : ko.shop.allRequired];
    announce([...said, ...moveTo(nextOpenSlot(after, slotId))].join(' '));
    void sfx('confirm');
    refocus.current = true;
  };

  // 누른 때의 상태로 정한다: 그린 때의 도구(닫힌 값)를 쓰면, 앞서 정한 뒤 이 버튼이 다시 그려지기 전에 Enter가 오면
  // (느린 기기·빠르게 두 번 누르기) 앞 칸의 도구로 다음 칸을 채운다. 그사이 정할 것이 없어졌으면 아무것도 하지 않는다
  const press = (): void => {
    const now = barState($result.get(), $openSlot.get(), $pending.get());
    if (now.kind === 'save') save(now.product, now.change);
  };

  const skip = (): void => {
    const slotId = $openSlot.get();
    if (slotId === null) return;
    clearPending(slotId);
    const next = moveTo(nextOpenSlot($result.get(), slotId));
    if (next.length > 0) announce(next.join(' '));
    refocus.current = true;
  };

  // 꺼진 주 버튼을 누르면(Enter): 까닭(#w-why)을 읽고 첫 도구 줄로 초점을 옮긴다 (도구끼리 맞춰 보기의 꺼진 주 버튼과 같은 방식).
  // 줄이 없으면 빌더 칸의 [다른 곳에 공개하기] 또는 [목록에 없는 도구 쓰기]로 (T37)
  const why = (): void => {
    const text = document.getElementById('w-why')?.textContent;
    if (text) announce(text);
    document.querySelector<HTMLElement>('#w-slot :is(.w-row, .w-builder-other, .custom-row)')?.focus();
  };

  const remove = (): void => {
    const now = $result.get();
    const ranking = rankingOf(now, $openSlot.get());
    const id = ranking ? removableFor(now, ranking) : null;
    const p = id === null ? undefined : now.cart.find((x) => x.id === id);
    if (!p) return;
    updateSession((s) => ({ ...s, cart: s.cart.filter((x) => x !== p.id) }));
    announce(fill(ko.shop.removed, { obj: josa(plainName(p.name), 'obj') }));
    refocus.current = true;
  };

  const removeName = (): string => {
    const ranking = rankingOf(r, open);
    const id = ranking ? removableFor(r, ranking) : null;
    return r.cart.find((x) => x.id === id)?.name ?? '';
  };

  let main;
  switch (b.kind) {
    case 'locked':
      main = (
        <a ref={primary} class="btn btn-primary" href={ROUTES.destination}>
          {ko.shop.toInterview}
        </a>
      );
      break;
    case 'go':
      main = (
        <a ref={primary} class="btn btn-primary w-go" href={ROUTES.check}>
          {ko.shop.goCheck}
        </a>
      );
      break;
    case 'wait':
      main = (
        // 까닭 글(#w-why '쓸 도구를 누르면 정할 수 있어요.')은 도구 섬이 칸 설명 아래에 보인다
        <button ref={primary} type="button" class="btn btn-primary w-save" aria-disabled="true" aria-describedby="w-why" onClick={why}>
          {ko.shop.pickGeneric}
        </button>
      );
      break;
    case 'save': {
      const short = shortName(b.product.name);
      const text = (name: string): string => fill(b.change ? ko.shop.changeAs : ko.shop.pickAs, { dir: josa(name, 'dir') });
      const { product, change } = b;
      main = (
        <button
          ref={primary}
          type="button"
          class="btn btn-primary w-save"
          aria-label={short === null ? fill(change ? ko.shop.changeLongLabel : ko.shop.pickLongLabel, { name: product.name }) : undefined}
          onClick={press}
        >
          {short === null ? (b.change ? ko.shop.changeGeneric : ko.shop.pickGeneric) : text(short)}
        </button>
      );
      break;
    }
  }

  const extra = b.kind === 'locked' ? null : b.extra;
  return (
    <div class="w-action" data-ready={ready ? '' : undefined}>
      {extra === 'skip' && (
        <button type="button" class="btn btn-text w-extra" onClick={skip}>
          {ko.shop.skip}
        </button>
      )}
      {extra === 'remove' && (
        <button type="button" class="btn btn-text w-extra" aria-label={fill(ko.shop.removeLabel, { name: removeName() })} onClick={remove}>
          {ko.shop.remove}
        </button>
      )}
      {main}
    </div>
  );
}
