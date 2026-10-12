// 화면 낭독기 알림: 알림 자리는 하나라서, 같은 순간에 두 번 알리면 앞의 글이 덮여 읽히지 않는다.
// 잠깐(GATHER_MS) 사이에 온 알림은 이어 붙여 한 번에 알린다.
import { afterEach, describe, expect, it } from 'vitest';
import { announce, GATHER_MS, LIVE_ID } from '../../src/lib/announce.ts';

function fakeBrowser(): { live: { textContent: string }; flush: () => void } {
  const live = { textContent: '' };
  const frames: (() => void)[] = [];
  const g = globalThis as Record<string, unknown>;
  g['document'] = { getElementById: (id: string) => (id === LIVE_ID ? live : null) };
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
});
