import { describe, expect, it } from 'vitest';
import { makeCatalog, matchErrors } from '../../src/lib/engine/index.ts';
import { loadData } from '../../scripts/lib/load-data.ts';

// 에러 안내 자료(data/errors.json)의 예시가 사전에서 제대로 잡히는지 (C04)
describe('에러 안내 예시', () => {
  const data = loadData();
  const cat = makeCatalog(data);
  const ids = (s: string): string[] => matchErrors(cat, s).map((e) => e.id);
  const cases = data.errors.errors.flatMap((e) => e.examples.map((ex) => [e.id, ex] as const));

  it.each(cases)('%s: 예시가 자기 항목 하나에만 걸린다 → %s', (id, ex) => {
    expect(ids(ex)).toEqual([id]);
  });

  it('여러 항목에 걸리는 글은 자료에 적힌 순서로, 더 좁은 항목이 먼저', () => {
    expect(ids("error TS2307: Cannot find module './x' or its corresponding type declarations.")).toEqual(['module-not-found', 'build-type-error']);
    expect(ids('remote: Permission to me/app.git denied to other.\nfatal: The requested URL returned error: 403')).toEqual(['git-auth-failed', 'http-403']);
  });

  it('SSH 키 거절은 파일 권한이 아니라 GitHub 확인 문제로 잡는다', () => {
    expect(ids('git@github.com: Permission denied (publickey).')).toEqual(['git-auth-failed']);
    expect(ids('bash: ./start.sh: Permission denied')).toEqual(['permission-denied']);
  });

  it('숫자가 섞인 평범한 글은 상태 코드로 잡지 않는다', () => {
    expect(ids('took 500ms')).toEqual([]);
    expect(ids('port 5000')).toEqual([]);
  });
});
