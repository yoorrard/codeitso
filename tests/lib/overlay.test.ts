// 바깥 누르기 닫기 (D127, src/lib/overlay.ts): 누르기 시작과 끝이 모두 바깥일 때만 닫고, 위 겹이 쓴 누르기로는 닫지 않는다
import { describe, expect, it } from 'vitest';
import { claimPress, outsidePress, pressClaimed } from '../../src/lib/overlay.ts';

/** 시험용 가짜 누르기: 안(in)인지 바깥(out)인지만 가진다 */
type Fake = { where: 'in' | 'out' };
const ev = (where: Fake['where']): PointerEvent => ({ where }) as unknown as PointerEvent;

function setup(): { press: ReturnType<typeof outsidePress>; closed: () => number } {
  let n = 0;
  const press = outsidePress(
    (e) => (e as unknown as Fake).where === 'in',
    () => {
      n += 1;
    },
  );
  return { press, closed: () => n };
}

describe('outsidePress', () => {
  it('바깥에서 누르고 바깥에서 떼면 닫는다', () => {
    const { press, closed } = setup();
    press.down(ev('out'));
    press.click(ev('out'));
    expect(closed()).toBe(1);
  });

  it('안에서 누르기 시작해 바깥에서 떼면(글을 끌어 고르다 놓음) 닫지 않는다', () => {
    const { press, closed } = setup();
    press.down(ev('in'));
    press.click(ev('out'));
    expect(closed()).toBe(0);
  });

  it('바깥에서 누르기 시작해 안에서 떼면 닫지 않는다', () => {
    const { press, closed } = setup();
    press.down(ev('out'));
    press.click(ev('in'));
    expect(closed()).toBe(0);
  });

  it('앞선 pointerdown이 없는 click(키보드)은 click 자리만 본다', () => {
    const { press, closed } = setup();
    press.down(ev('in'));
    press.click(ev('in'));
    press.click(ev('out'));
    expect(closed()).toBe(1);
  });

  it('위 겹이 쓴 누르기로는 닫지 않는다 (pointerdown이든 click이든)', () => {
    const { press, closed } = setup();
    const down = ev('out');
    claimPress(down);
    expect(pressClaimed(down)).toBe(true);
    press.down(down);
    press.click(ev('out'));
    expect(closed()).toBe(0);
    press.down(ev('out'));
    const click = ev('out');
    claimPress(click);
    press.click(click);
    expect(closed()).toBe(0);
    expect(pressClaimed(ev('out'))).toBe(false);
  });
});
