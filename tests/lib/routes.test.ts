// 주소 (CONCEPT 2.2절): 옛 주소 10개가 public/_redirects에서 301로 새 주소로 넘어가는지
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT } from '../../scripts/lib/load-data.ts';
import { REDIRECTS, ROUTES, termPath, toolPath, waypointPath } from '../../src/lib/routes.ts';

const lines = readFileSync(join(ROOT, 'public', '_redirects'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))
  .map((l) => l.split(/\s+/));

describe('옛 주소 넘기기', () => {
  it('열 개 모두, 301로, 같은 순서로', () => {
    expect(REDIRECTS).toHaveLength(10);
    expect(lines).toEqual(REDIRECTS.map(([from, to]) => [from, to, '301']));
  });

  it('넘겨받는 곳은 모두 지금 있는 주소다', () => {
    const live = new Set<string>(Object.values(ROUTES));
    for (const [, to] of REDIRECTS) expect(live.has(to) || to === `${ROUTES.tools}/:id` || to === `${ROUTES.terms}/:id`).toBe(true);
  });
});

describe('주소 만들기', () => {
  it('도구·용어·경유지', () => {
    expect(toolPath('github-pages')).toBe('/tools/github-pages');
    expect(termPath('api-key')).toBe('/terms/api-key');
    expect(waypointPath()).toBe('/waypoints');
    expect(waypointPath('slot.store')).toBe('/waypoints?slot=slot.store');
  });
});
