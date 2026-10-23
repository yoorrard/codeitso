// 바닥글 방문 수 (D134): 서버가 준 값은 0 이상 숫자 둘일 때만 쓴다
import { describe, expect, it } from 'vitest';
import { readStats } from '../../src/lib/visit.ts';

describe('방문 수 읽기', () => {
  it('숫자 둘이면 그대로, 아니면 null', () => {
    expect(readStats({ today: 3, total: 120 })).toEqual({ today: 3, total: 120 });
    expect(readStats({ today: '3', total: 120 })).toBeNull();
    expect(readStats({ today: -1, total: 0 })).toBeNull();
    expect(readStats(null)).toBeNull();
    expect(readStats({ total: 5 })).toBeNull();
  });
});
