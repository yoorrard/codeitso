// 용어 카드 읽음·정답 장면 S9 (brief 7절, D71 W5b). 용어 카드의 옅은 판(.plate)이 상태를 그린다:
//   아직 = 옅은 판(--plate) · 읽음 = 한 단 짙은 판(--plate-read) · 다 맞힘 = 그 위에 2px 고리(--plate-ring, brief 4.8 금테 자리)
// [다 읽었어요]를 누르면 판이 왼쪽부터 채워진다(--dur-draw, terms.css의 data-fill). 판이 화면 밖이면 채운 모습으로 바로 바뀐다
// (S3의 '마디가 화면 밖이면 날지 않는다'와 같다). 확인 문제를 다 맞히면 문제 끝의 '다 맞혔어요 ✓' 고리 위로 청록 빛 하나가
// 한 바퀴 돈다(--dur-sweep, --ease-linear). 판 그림은 정적 HTML이라 섬(ConceptRead·StudyList)이 여기 함수로 칠한다.
import { catalog } from './data-full.ts';
import { dur, ease, reduced } from './motion.ts';
import type { StudyRecord } from './saved.ts';

export type TermState = 'todo' | 'read' | 'solved';

/** 읽음 기록과 맞힌 문제 수로 용어 하나의 상태 */
export function termState(study: StudyRecord, id: string): TermState {
  const rec = study[id];
  const total = catalog.concept.get(id)?.quiz.length ?? 0;
  if (rec && total > 0 && rec.quiz.length >= total) return 'solved';
  return rec?.read ? 'read' : 'todo';
}

/** 판에 상태를 칠한다 (data-state: read · solved) */
export function paintPlate(plate: Element | null, s: TermState): void {
  if (!plate) return;
  if (s === 'todo') plate.removeAttribute('data-state');
  else plate.setAttribute('data-state', s);
}

/** 화면에 보이는가 (머리줄·아래 막대에 가렸거나 굴려서 밖에 있으면 움직이지 않는다) */
function onScreen(el: Element): boolean {
  const b = el.getBoundingClientRect();
  if (b.width === 0) return false;
  const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  return hit !== null && el.contains(hit);
}

/** [다 읽었어요]: 판이 왼쪽부터 채워진다 (동작 줄이기면 길이가 0이라 바로, 화면 밖이면 칠만) */
export function fillPlate(plate: Element | null): void {
  if (plate && onScreen(plate)) plate.setAttribute('data-fill', '');
}

const NS = 'http://www.w3.org/2000/svg';

/** 확인 문제를 다 맞힘: 2px 고리 위로 청록 빛(짧은 대시) 하나가 왼쪽 위에서 시계 방향으로 한 바퀴. 끝나면 지운다 */
export function runRing(ring: HTMLElement | null): Animation | null {
  if (!ring || reduced()) return null;
  const box = ring.getBoundingClientRect();
  if (box.width === 0) return null;
  const radius = Math.min(parseFloat(getComputedStyle(ring).borderTopLeftRadius) || 0, box.height / 2);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'plate-run');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', String(box.width));
  svg.setAttribute('height', String(box.height));
  const rect = document.createElementNS(NS, 'rect');
  // 2px 고리의 한가운데 선 (outline-offset -2라 판 안쪽 1px)
  for (const [k, v] of Object.entries({ x: 1, y: 1, width: box.width - 2, height: box.height - 2, rx: Math.max(0, radius - 1), pathLength: 100 })) rect.setAttribute(k, String(v));
  svg.append(rect);
  ring.append(svg);
  const a = rect.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -100 }], { duration: dur('--dur-sweep'), easing: ease('--ease-linear') });
  void a.finished.catch(() => undefined).then(() => svg.remove());
  return a;
}
