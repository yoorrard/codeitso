// 겹쳐 뜨는 창(모달 <dialog>·풀이 상자·카테고리 메뉴)의 바깥 누르기 닫기를 한 곳에서 (D127, 2026-10-20 버그 고침).
// 바깥 누르기는 누르기 시작(pointerdown)과 끝(click)이 모두 바깥일 때만이다. 창 안에서 글을 끌어 고르다 바깥에서 손을 떼면
// click이 둘의 공통 조상(<dialog> 자신)에 떨어져 바깥 누르기처럼 보이기 때문이다(서랍·담기 창·시트·프롬프트 창이 그래서 닫혔다).
// 누르기 하나는 맨 위 한 겹만 닫는다: 위 겹(풀이 상자)이 그 누르기로 닫혔으면 claimPress로 적고, 아래 겹은 그 누르기로 닫지 않는다.

const claimed = new WeakSet<Event>();

/** 이 누르기(pointerdown·click)는 위 겹이 닫는 데 썼다 */
export function claimPress(e: Event): void {
  claimed.add(e);
}

export function pressClaimed(e: Event): boolean {
  return claimed.has(e);
}

export interface OutsidePress {
  down(e: PointerEvent): void;
  click(e: MouseEvent): void;
}

/**
 * 바깥 누르기 닫기. inside(e)가 거짓인 곳에서 누르기를 시작하고 끝낸 때만 close를 부른다.
 * 키보드로 일어난 click(앞선 pointerdown이 없다)은 click 자리만 본다.
 */
export function outsidePress(inside: (e: MouseEvent) => boolean, close: () => void): OutsidePress {
  /** 마지막 pointerdown이 바깥에서 시작했는지 (null = click 뒤로 pointerdown이 없었다) */
  let from: boolean | null = null;
  return {
    down(e) {
      from = !pressClaimed(e) && !inside(e);
    },
    click(e) {
      const start = from ?? true;
      from = null;
      if (start && !pressClaimed(e) && !inside(e)) close();
    },
  };
}

/** 모달 <dialog>의 어두운 바탕을 눌렀는지: 누른 것이 dialog 자신이고 그 네모 밖이다 (dialog의 안쪽 여백은 바탕이 아니다) */
export function onBackdrop(e: MouseEvent): boolean {
  const d = e.currentTarget;
  if (!(d instanceof HTMLDialogElement) || e.target !== d) return false;
  const r = d.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

/** 모달 <dialog> 바탕 누르기 닫기: dialog의 pointerdown·click에 down·click을 단다 */
export function backdropPress(close: () => void): OutsidePress {
  return outsidePress((e) => !onBackdrop(e), close);
}
