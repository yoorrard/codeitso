// 매일 갱신의 변동 문턱 (D143, scripts/lib/catalog-stable.ts): 뜻 있는 변화만 자료에 올리고, 나머지는 지난 스냅숏을 그대로 둔다.
import { describe, expect, it } from 'vitest';
import {
  STABLE_RULES, changedKeys, dateChanged, logChanged, meaningfulChange, numberChanged, sameHead, snapshotExpired, stabilizeItems, type StableItem,
} from '../../scripts/lib/catalog-stable.ts';

type TItem = StableItem & Record<string, unknown>;
const base = (over: Partial<TItem> = {}): TItem => ({
  id: 'src:a',
  name: 'A',
  summary: 'An example library',
  url: 'https://example.com/a',
  tags: ['ui'],
  metrics: { stars: 1000, updatedAt: '2026-10-01' },
  preview: { type: 'repo', repoStars: 1000 },
  fetchedAt: '2026-10-20',
  ...over,
});

describe('numberChanged', () => {
  it('10% 안쪽의 흔들림은 무시한다', () => {
    expect(numberChanged(1000, 1099, 50)).toBe(false);
    expect(numberChanged(1000, 901, 50)).toBe(false);
  });
  it('10% 넘게 바뀌면 올린다', () => {
    expect(numberChanged(1000, 1100, 50)).toBe(true);
    expect(numberChanged(1000, 899, 50)).toBe(true);
  });
  it('작은 수는 바닥값(50)을 기준으로 잰다: 5 넘게 바뀌어야', () => {
    expect(numberChanged(3, 7, 50)).toBe(false);
    expect(numberChanged(3, 8, 50)).toBe(true);
    expect(numberChanged(0, 4, 50)).toBe(false);
  });
  it('바닥값 0이면 순수한 상대 변화 (점수·비율)', () => {
    expect(numberChanged(86.13, 86.131, 0)).toBe(false);
    expect(numberChanged(0.5, 0.56, 0)).toBe(true);
  });
  it('값이 생기거나 사라지면 늘 올린다', () => {
    expect(numberChanged(undefined, 3, 50)).toBe(true);
    expect(numberChanged(3, undefined, 50)).toBe(true);
    expect(numberChanged(undefined, undefined, 50)).toBe(false);
  });
});

describe('logChanged (뜨는 정도: 작은 정수로 오르내린다)', () => {
  it('두 배 안쪽의 오르내림은 무시한다', () => {
    expect(logChanged(2, 3, 0.3)).toBe(false);
    expect(logChanged(25, 40, 0.3)).toBe(false);
  });
  it('두 배 넘게 바뀌면 올린다', () => {
    expect(logChanged(2, 5, 0.3)).toBe(true);
    expect(logChanged(500, 5, 0.3)).toBe(true);
  });
  it('meaningfulChange가 metrics.trend에 로그 문턱을 쓴다', () => {
    const a = base({ metrics: { stars: 1000, updatedAt: '2026-10-01', trend: 2 } });
    expect(meaningfulChange(a, base({ metrics: { stars: 1000, updatedAt: '2026-10-01', trend: 3 } }))).toBe(false);
    expect(meaningfulChange(a, base({ metrics: { stars: 1000, updatedAt: '2026-10-01', trend: 12 } }))).toBe(true);
  });
});

describe('dateChanged', () => {
  it('7일 안쪽 차이는 무시한다', () => {
    expect(dateChanged('2026-10-01', '2026-10-07')).toBe(false);
    expect(dateChanged('2026-10-01T10:00:00Z', '2026-10-07T23:00:00Z')).toBe(false);
  });
  it('7일 이상이면 올린다', () => {
    expect(dateChanged('2026-10-01', '2026-10-08')).toBe(true);
    expect(dateChanged('2025-01-01', '2026-10-20')).toBe(true);
  });
  it('날짜가 아니거나 한쪽이 없으면 같을 때만 같다고 본다', () => {
    expect(dateChanged(undefined, '2026-10-08')).toBe(true);
    expect(dateChanged('soon', 'soon')).toBe(false);
    expect(dateChanged('soon', 'later')).toBe(true);
  });
});

describe('meaningfulChange', () => {
  it('받은 날만 바뀌면 뜻 있는 변화가 아니다', () => {
    expect(meaningfulChange(base(), base({ fetchedAt: '2026-10-23' }))).toBe(false);
  });
  it('문턱 아래 지표·날짜 흔들림은 무시한다', () => {
    const next = base({ fetchedAt: '2026-10-23', metrics: { stars: 1050, updatedAt: '2026-10-04' }, preview: { type: 'repo', repoStars: 1050 } });
    expect(meaningfulChange(base(), next)).toBe(false);
  });
  it('지표가 문턱을 넘으면 올린다', () => {
    expect(meaningfulChange(base(), base({ metrics: { stars: 1200, updatedAt: '2026-10-01' } }))).toBe(true);
    expect(meaningfulChange(base(), base({ preview: { type: 'repo', repoStars: 2000 } }))).toBe(true);
  });
  it('글·주소·라이선스·꼬리표·쓰는 법이 바뀌면 늘 올린다', () => {
    expect(meaningfulChange(base(), base({ summary: 'An example library.' }))).toBe(true);
    expect(meaningfulChange(base(), base({ url: 'https://example.com/b' }))).toBe(true);
    expect(meaningfulChange(base(), base({ license: 'MIT' }))).toBe(true);
    expect(meaningfulChange(base(), base({ tags: ['ui', 'react'] }))).toBe(true);
    expect(meaningfulChange(base(), base({ use: { install: 'npm i a' } }))).toBe(true);
    expect(meaningfulChange(base(), base({ preview: { type: 'repo', repoStars: 1000, version: '1.0.1' } }))).toBe(true);
  });
  it('모르는 숫자 칸(연도·크기)은 문턱 없이 같아야 같다', () => {
    const a = base({ preview: { type: 'dataset', year: 2019 } });
    expect(meaningfulChange(a, base({ preview: { type: 'dataset', year: 2020 } }))).toBe(true);
  });
  it('지난 확인 날짜 칸(freeTierCheckedAt)은 혼자서는 올리지 않는다', () => {
    const a = base({ preview: { type: 'api', freeTierCheckedAt: '2026-10-20' } });
    expect(meaningfulChange(a, base({ preview: { type: 'api', freeTierCheckedAt: '2026-10-30' } }))).toBe(false);
  });
  it('칸의 차례만 다르면 같다 (배열 속 객체도)', () => {
    const a = base({ metrics: { updatedAt: '2026-10-01', stars: 1000 } });
    expect(meaningfulChange(base(), a)).toBe(false);
    const r1 = base({ preview: { type: 'mcp', remotes: [{ type: 'sse', url: 'u' }] } });
    const r2 = base({ preview: { type: 'mcp', remotes: [{ url: 'u', type: 'sse' }] } });
    expect(meaningfulChange(r1, r2)).toBe(false);
  });
  it('changedKeys는 문턱을 넘은 칸만 알린다', () => {
    const next = base({ summary: 'x', fetchedAt: '2026-10-23', metrics: { stars: 1010, updatedAt: '2026-10-30' } });
    expect(changedKeys(base(), next).sort()).toEqual(['metrics.updatedAt', 'summary']);
  });
});

describe('snapshotExpired', () => {
  it('오래된 스냅숏은 상품마다 엇갈린 날에 새로 받는다', () => {
    const { maxAgeDays, spreadDays } = STABLE_RULES;
    const item = base({ fetchedAt: '2026-01-01' });
    // maxAge 안쪽은 그대로
    expect(snapshotExpired(item, '2026-02-01')).toBe(false);
    // maxAge + spread를 넘기면 반드시 새로
    const late = new Date(Date.UTC(2026, 0, 1) + (maxAgeDays + spreadDays) * 86_400_000).toISOString().slice(0, 10);
    expect(snapshotExpired(item, late)).toBe(true);
  });
  it('엇갈림: 같은 날 받은 상품도 새로 받는 날이 여럿으로 퍼진다', () => {
    const { maxAgeDays, spreadDays } = STABLE_RULES;
    const day = new Date(Date.UTC(2026, 0, 1) + (maxAgeDays + Math.floor(spreadDays / 2)) * 86_400_000).toISOString().slice(0, 10);
    const items = Array.from({ length: 400 }, (_, i) => base({ id: `src:i${i}`, fetchedAt: '2026-01-01' }));
    const expired = items.filter((it) => snapshotExpired(it, day)).length;
    expect(expired).toBeGreaterThan(100);
    expect(expired).toBeLessThan(300);
  });
});

describe('stabilizeItems', () => {
  it('새 상품은 더하고 빠진 상품은 뺀다', () => {
    const prev = [base({ id: 'src:a' }), base({ id: 'src:b' })];
    const next = [base({ id: 'src:b', fetchedAt: '2026-10-23' }), base({ id: 'src:c', fetchedAt: '2026-10-23' })];
    const r = stabilizeItems(prev, next, '2026-10-23');
    expect(r.items.map((x) => x.id)).toEqual(['src:b', 'src:c']);
    expect(r.stats).toMatchObject({ added: 1, removed: 1, updated: 0, kept: 1 });
    expect(r.changed).toBe(true);
    // 그대로 둔 상품은 지난 스냅숏 그대로 (받은 날 포함)
    expect(r.items[0]?.fetchedAt).toBe('2026-10-20');
  });
  it('뜻 있는 변화가 없으면 바뀐 것이 없다', () => {
    const prev = [base()];
    const next = [base({ fetchedAt: '2026-10-23', metrics: { stars: 1010, updatedAt: '2026-10-02' } })];
    const r = stabilizeItems(prev, next, '2026-10-23');
    expect(r.changed).toBe(false);
    expect(r.items[0]).toEqual(prev[0]);
  });
  it('바뀐 상품은 새 스냅숏을 통째로 쓴다 (값을 섞지 않는다)', () => {
    const prev = [base()];
    const next = [base({ fetchedAt: '2026-10-23', summary: 'New text', metrics: { stars: 1010, updatedAt: '2026-10-02' } })];
    const r = stabilizeItems(prev, next, '2026-10-23');
    expect(r.items[0]).toEqual(next[0]);
    expect(r.stats.updated).toBe(1);
  });
  it('순서는 새 목록을 따른다', () => {
    const prev = [base({ id: 'src:a' }), base({ id: 'src:b' })];
    const next = [base({ id: 'src:b' }), base({ id: 'src:a' })];
    expect(stabilizeItems(prev, next, '2026-10-23').items.map((x) => x.id)).toEqual(['src:b', 'src:a']);
  });
  it('지난 자료가 없으면 새 목록 그대로', () => {
    const next = [base()];
    const r = stabilizeItems(undefined, next, '2026-10-23');
    expect(r.items).toEqual(next);
    expect(r.stats.added).toBe(1);
    expect(r.changed).toBe(true);
  });
});

describe('sameHead', () => {
  it('받은 날·개수·글 속 숫자만 다르면 같다', () => {
    const a = { source: { id: 's', note: '479 registries listed; 107585 in total' }, fetchedAt: '2026-10-20', count: 3, available: 10 };
    const b = { source: { id: 's', note: '480 registries listed; 107608 in total' }, fetchedAt: '2026-10-23', count: 3, available: 12 };
    expect(sameHead(a, b)).toBe(true);
  });
  it('글이 바뀌면 다르다', () => {
    const a = { source: { id: 's', license: 'MIT' }, fetchedAt: '2026-10-20' };
    const b = { source: { id: 's', license: 'CC BY 4.0' }, fetchedAt: '2026-10-20' };
    expect(sameHead(a, b)).toBe(false);
  });
});
