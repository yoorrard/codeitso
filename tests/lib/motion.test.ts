// 모션 기반: 동작 줄이기 판단(기기·사이트 둘 다), 토큰 길이 읽기, 건너뛰기
import { afterEach, describe, expect, it } from 'vitest';
import { applyMotionPref, dur, parseDuration, reduced, skipAll } from '../../src/lib/motion.ts';

/** 시험용 가짜 브라우저: html 속성, 기기 설정, CSS 변수 */
function fakeBrowser(opts: { osReduce?: boolean; vars?: Record<string, string> } = {}): { attrs: Map<string, string> } {
  const attrs = new Map<string, string>();
  const html = {
    getAttribute: (k: string) => attrs.get(k) ?? null,
    setAttribute: (k: string, v: string) => attrs.set(k, v),
    removeAttribute: (k: string) => attrs.delete(k),
  };
  const g = globalThis as Record<string, unknown>;
  g['document'] = { documentElement: html, getAnimations: () => [] };
  g['window'] = { matchMedia: (q: string) => ({ matches: q.includes('reduce') && opts.osReduce === true }) };
  g['getComputedStyle'] = () => ({ getPropertyValue: (n: string) => opts.vars?.[n] ?? '' });
  return { attrs };
}

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g['document'];
  delete g['window'];
  delete g['getComputedStyle'];
});

describe('CSS 시간 값 읽기', () => {
  it('ms와 s', () => {
    expect(parseDuration('240ms')).toBe(240);
    expect(parseDuration(' 0.8s ')).toBe(800);
    expect(parseDuration('0')).toBe(0);
  });
  it('읽을 수 없거나 음수면 0', () => {
    expect(parseDuration('')).toBe(0);
    expect(parseDuration('auto')).toBe(0);
    expect(parseDuration('-5ms')).toBe(0);
  });
});

describe('동작 줄이기 판단', () => {
  it('브라우저 밖(빌드)에서는 줄이지 않는다', () => {
    expect(reduced()).toBe(false);
  });

  it('기기 설정', () => {
    fakeBrowser({ osReduce: true });
    expect(reduced()).toBe(true);
  });

  it('사이트 설정 (html[data-motion=reduce])', () => {
    const b = fakeBrowser();
    expect(reduced()).toBe(false);
    applyMotionPref('reduce');
    expect(b.attrs.get('data-motion')).toBe('reduce');
    expect(reduced()).toBe(true);
    applyMotionPref('auto');
    expect(b.attrs.has('data-motion')).toBe(false);
    expect(reduced()).toBe(false);
  });
});

describe('길이 토큰', () => {
  const vars = { '--dur-move': '800ms', '--dur-fade': '150ms' };

  it('토큰 값을 ms로', () => {
    fakeBrowser({ vars });
    expect(dur('--dur-move')).toBe(800);
  });

  it('줄이기면 이동 길이는 0, 페이드는 남는다 (D30)', () => {
    fakeBrowser({ vars, osReduce: true });
    expect(dur('--dur-move')).toBe(0);
    expect(dur('--dur-fade')).toBe(150);
  });

  it('사이트 설정만 켜져도 0', () => {
    fakeBrowser({ vars });
    applyMotionPref('reduce');
    expect(dur('--dur-move')).toBe(0);
  });
});

describe('건너뛰기', () => {
  it('장면 안 애니메이션을 모두 끝내고, 끝없는 반복은 멈춘다', () => {
    const log: string[] = [];
    const finite = { finish: () => log.push('finish'), cancel: () => log.push('cancel') };
    const infinite = {
      finish: () => {
        throw new Error('InvalidStateError');
      },
      cancel: () => log.push('cancel-infinite'),
    };
    let asked: unknown;
    const scene = {
      getAnimations: (o?: unknown) => {
        asked = o;
        return [finite, infinite];
      },
    } as unknown as Element;
    expect(skipAll(scene)).toBe(2);
    expect(asked).toEqual({ subtree: true });
    expect(log).toEqual(['finish', 'cancel-infinite']);
  });

  it('브라우저 밖에서는 아무것도 하지 않는다', () => {
    expect(skipAll()).toBe(0);
  });
});
