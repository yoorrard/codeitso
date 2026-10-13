// 화면 낭독기 알림: 알림 자리는 하나라서, 같은 순간에 두 번 알리면 앞의 글이 덮여 읽히지 않는다.
// 잠깐(GATHER_MS) 사이에 온 알림은 이어 붙여 한 번에 알린다.
import { afterEach, describe, expect, it } from 'vitest';
import { announce, GATHER_MS, LIVE_ID } from '../../src/lib/announce.ts';

interface FakeEl {
  textContent: string;
  attrs: Record<string, string>;
  className: string;
  setAttribute: (k: string, v: string) => void;
}
const fakeEl = (): FakeEl => {
  const el: FakeEl = { textContent: '', attrs: {}, className: '', setAttribute: (k, v) => (el.attrs[k] = v) };
  return el;
};
/** 열린 모달 대화 상자 흉내: 초점이 그 안에 있다. live가 없으면 append로 받은 것을 [data-live]로 돌려준다 */
interface FakeDialog {
  open: boolean;
  live: FakeEl | null;
  matches: (s: string) => boolean;
  querySelector: (s: string) => FakeEl | null;
  append: (el: FakeEl) => void;
}
function fakeDialog(live: FakeEl | null): FakeDialog {
  const d: FakeDialog = {
    open: true,
    live,
    matches: (s) => s === ':modal' && d.open,
    querySelector: (s) => (s === '[data-live]' ? d.live : null),
    append: (el) => (d.live = el),
  };
  return d;
}

function fakeBrowser(dialog: FakeDialog | null = null): { live: { textContent: string }; flush: () => void } {
  const live = { textContent: '' };
  const frames: (() => void)[] = [];
  const g = globalThis as Record<string, unknown>;
  g['document'] = {
    getElementById: (id: string) => (id === LIVE_ID ? live : null),
    createElement: () => fakeEl(),
    activeElement: { closest: () => dialog },
  };
  g['window'] = {
    setTimeout: (cb: () => void, ms: number) => {
      expect(ms).toBe(GATHER_MS);
      return frames.push(cb);
    },
  };
  return {
    live,
    flush: () => {
      for (const cb of frames.splice(0)) cb();
    },
  };
}

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g['document'];
  delete g['window'];
});

describe('알림', () => {
  it('비웠다가 잠시 뒤에 넣는다 (같은 글도 다시 읽히게)', () => {
    const b = fakeBrowser();
    b.live.textContent = '복사했어요.';
    announce('복사했어요.');
    expect(b.live.textContent).toBe('');
    b.flush();
    expect(b.live.textContent).toBe('복사했어요.');
  });

  it('잠깐 사이의 알림 둘은 이어 붙여 한 번에', () => {
    const b = fakeBrowser();
    announce('급식 API를 담았어요.');
    announce('장보기 도장을 받았어요.');
    b.flush();
    expect(b.live.textContent).toBe('급식 API를 담았어요. 장보기 도장을 받았어요.');
  });

  it('넣은 뒤에 온 알림은 새로 시작한다', () => {
    const b = fakeBrowser();
    announce('하나.');
    b.flush();
    announce('둘.');
    b.flush();
    expect(b.live.textContent).toBe('둘.');
  });

  it('같은 글이 잠깐 사이에 두 번 오면 한 번만', () => {
    const b = fakeBrowser();
    announce('복사했어요.');
    announce('복사했어요.');
    b.flush();
    expect(b.live.textContent).toBe('복사했어요.');
  });

  it('모달 대화 상자가 열려 있으면 그 안의 알림 자리에 (바깥 #cc-live는 접근성 트리에서 빠진다)', () => {
    const inside = fakeEl();
    const d = fakeDialog(inside);
    const b = fakeBrowser(d);
    announce('21개를 찾았어요.');
    b.flush();
    expect(inside.textContent).toBe('21개를 찾았어요.');
    expect(b.live.textContent).toBe('');
  });

  it('알림 자리가 없는 모달이면 처음 알릴 때 만들어 둔다', () => {
    const d = fakeDialog(null);
    const b = fakeBrowser(d);
    announce('복사했어요.');
    expect(d.live?.attrs['aria-live']).toBe('polite');
    b.flush();
    expect(d.live?.textContent).toBe('복사했어요.');
  });

  it('알리기 전에 대화 상자가 닫혔으면 기본 틀의 자리에 (고르고 바로 닫는 시트)', () => {
    const d = fakeDialog(fakeEl());
    const b = fakeBrowser(d);
    announce('도구 12개를 보여 드려요.');
    d.open = false;
    b.flush();
    expect(b.live.textContent).toBe('도구 12개를 보여 드려요.');
  });
});
