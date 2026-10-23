// 쓰지 않는 말 (scripts/lib/words.ts, D108·D119): 옛 세계의 말과 다체 끝맺음을 잡고, 쇼핑몰 말과 해요체·합니다체는 통과한다.
import { describe, expect, it } from 'vitest';
import { collectStrings, findBanned } from '../scripts/lib/words.ts';

describe('쓰지 않는 말', () => {
  it('옛 세계의 말을 잡는다', () => {
    expect(findBanned('설계도를 받아요.').map((h) => h.word)).toEqual(['설계도']);
    expect(findBanned('목적지만 말하세요.').length).toBeGreaterThan(0);
    expect(findBanned('막힌 곳을 풀어요.').map((h) => h.word)).toEqual(['막힌 곳']);
  });

  it('다체 끝맺음을 잡고, 합니다체와 낱말 끝은 잡지 않는다', () => {
    expect(findBanned('장바구니에 담았다.')).toHaveLength(1);
    expect(findBanned('첫 문장이에요. 둘째는 이다.')).toHaveLength(1);
    expect(findBanned('검토 중인 초안입니다.')).toEqual([]);
    expect(findBanned('로그인 필요')).toEqual([]);
    expect(findBanned('가나다 Aa')).toEqual([]);
    expect(findBanned('담았다.', false)).toEqual([]);
  });

  it('영수증·계산하기는 잡고, 바뀐 것을 알리는 문장은 통과한다', () => {
    expect(findBanned('영수증 받기').map((h) => h.word)).toEqual(['영수증']);
    expect(findBanned('영수증은 프롬프트로 바뀌었어요.')).toEqual([]);
  });

  it('쇼핑몰 말과 해요체는 통과한다', () => {
    for (const t of ['담았어요: Roboto', '장바구니가 비어 있어요.', '상품 1,912개', '담기', '프롬프트 뽑기', '인기순', '찾아보세요']) expect(findBanned(t), t).toEqual([]);
  });

  it('문장 모으기는 건너뛸 칸을 뺀다', () => {
    expect(collectStrings({ id: 'x', a: ['가', { b: '나', aliases: ['다'] }] }, new Set(['id', 'aliases']))).toEqual([
      { path: 'a[0]', text: '가' },
      { path: 'a[1].b', text: '나' },
    ]);
  });
});
