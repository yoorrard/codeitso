// 주행 거리와 도장 (D32): 저장된 상태에서 매번 계산한다. 따로 쌓는 점수가 아니라 '얼마나 왔나'.
// 같은 상태면 늘 같은 값이고, 같은 일을 되풀이해도 늘지 않는다 (부작용 없음, 시험 있음).
import type { EngineResult } from './engine/index.ts';
import type { Meta, StudyRecord } from './saved.ts';
import type { StationId } from './stations.ts';
import { STATIONS } from './stations.ts';

/** 한 가지 일을 마칠 때마다 늘어나는 거리(km) */
export const KM = {
  lesson: 5,
  answer: 2,
  slot: 5,
  check: 10,
  receipt: 10,
  conceptRead: 3,
  quizCorrect: 1,
} as const;

export interface Progress {
  /** 정류장마다 마쳤는가 */
  stations: Record<StationId, boolean>;
  /** 마친 정류장 수 (0~5) */
  passed: number;
  km: number;
  /** 받은 도장 id: station.<정류장>, study.required, quiz.<개념>.<번호> */
  stamps: string[];
}

export function progress(r: EngineResult, study: StudyRecord, meta: Pick<Meta, 'lessonDone' | 'issued'>): Progress {
  const answered = r.interview.answered;
  const required = r.slots.filter((s) => s.slot.required);
  const filled = r.slots.filter((s) => s.filledBy.length > 0).length;
  const stations: Record<StationId, boolean> = {
    lesson: meta.lessonDone === true,
    interview: r.done,
    shop: r.done && r.session.cart.length > 0 && required.every((s) => s.filledBy.length > 0),
    check: r.canIssue,
    receipt: meta.issued === true && r.canIssue,
  };

  const reads = Object.entries(study).filter(([, v]) => v.read).map(([id]) => id);
  const quizzes = Object.entries(study)
    .flatMap(([id, v]) => v.quiz.map((n) => `quiz.${id}.${n}`))
    .sort();
  const studyDone = r.study.required.length > 0 && r.study.required.every((id) => study[id]?.read === true);

  const stamps = [
    ...STATIONS.filter((s) => stations[s.id]).map((s) => `station.${s.id}`),
    ...(studyDone ? ['study.required'] : []),
    ...quizzes,
  ];

  const km =
    (stations.lesson ? KM.lesson : 0) +
    answered * KM.answer +
    filled * KM.slot +
    (stations.check ? KM.check : 0) +
    (stations.receipt ? KM.receipt : 0) +
    reads.length * KM.conceptRead +
    quizzes.length * KM.quizCorrect;

  return { stations, passed: STATIONS.filter((s) => stations[s.id]).length, km, stamps };
}

/** 장면을 아직 보지 않은 새 도장 (도장 장면은 처음 한 번만) */
export function unseenStamps(p: Progress, seen: string[]): string[] {
  const s = new Set(seen);
  return p.stamps.filter((id) => !s.has(id));
}
