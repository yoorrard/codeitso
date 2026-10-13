// 풀이 묶음(term-engine.ts + /glossary.json)을 페이지에서 한 번만 불러온다. 풀이 섬과 섬 쪽 밑줄(TermMarks.tsx)이 같이 쓴다.
import type { TermEngine } from './term-engine.ts';

let engine: Promise<TermEngine> | null = null;

export function termEngine(): Promise<TermEngine> {
  engine ??= import('./term-engine.ts')
    .then((m) => m.loadTermEngine())
    .catch((e: unknown) => {
      // 망이 돌아오면 다시 받게 비운다
      engine = null;
      throw e;
    });
  return engine;
}
