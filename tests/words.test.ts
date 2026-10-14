// 쓰지 않는 말 (scripts/lib/words.ts, D108): 옛 세계의 말과 해요체 끝맺음을 잡고, 쇼핑몰 말과 다체는 통과한다.
import { describe, expect, it } from 'vitest';
import { collectStrings, findBanned } from '../scripts/lib/words.ts';

describe('쓰지 않는 말', () => {
  it('옛 세계의 말을 잡는다', () => {
    expect(findBanned('설계도를 받는다.').map((h) => h.word)).toEqual(['설계도']);
    expect(findBanned('목적지만 말하세요.').length).toBeGreaterThan(0);
    expect(findBanned('막힌 곳을 푼다.').map((h) => h.word)).toEqual(['막힌 곳']);
  });

  it('해요체 끝맺음을 잡고, 낱말 끝 요는 잡지 않는다', () => {
    expect(findBanned('장바구니에 담았어요.')).toHaveLength(1);
    expect(findBanned('검색해 보세요')).toHaveLength(1);
    expect(findBanned('첫 문장이다. 둘째는 돼요.')).toHaveLength(1);
    expect(findBanned('로그인 필요')).toEqual([]);
    expect(findBanned('중요')).toEqual([]);
  });

  it('쇼핑몰 말과 다체는 통과한다', () => {
    for (const t of ['장바구니에 담았다: Roboto', '재료 목록(.md)을 받는다.', '상품 1,912개', '담기', '인기순']) expect(findBanned(t), t).toEqual([]);
  });

  it('문장 모으기는 건너뛸 칸을 뺀다', () => {
    expect(collectStrings({ id: 'x', a: ['가', { b: '나', aliases: ['다'] }] }, new Set(['id', 'aliases']))).toEqual([
      { path: 'a[0]', text: '가' },
      { path: 'a[1].b', text: '나' },
    ]);
  });
});
