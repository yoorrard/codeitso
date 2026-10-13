// 효과음 (D28, brief 7절 '효과음', D71 W5b): 기본 꺼짐. 설정에서 켰을 때만 합성기(sfx-engine.ts)를 동적으로 불러온다 (소리 파일 0KB).
// 소리는 뜻을 전하는 유일한 수단이 아니다: 같은 일을 늘 글·아이콘·aria-live로도 알린다. 진동은 쓰지 않는다.
// 소리 다섯: 답함(answer, 한 음 60ms) · 정함(confirm, 두 음 120ms) · 다 풀림(clear, 올라가는 두 음 240ms)
// · 도착(arrive, 세 음 차임 600ms) · 도장(stamp, '쿵' 90ms).
import { $prefs } from './store.ts';

export type Sound = 'answer' | 'confirm' | 'clear' | 'arrive' | 'stamp';

interface Engine {
  playSound(name: Sound, after?: number): void;
}

let engine: Promise<Engine> | null = null;

/** 효과음을 켰고, 조용히 모시기가 아닐 때 (조용히 모시기는 효과음을 끈다, brief 7절) */
export function soundOn(): boolean {
  const p = $prefs.get();
  return p.sound && !p.quiet;
}

/** 합성기를 이미 불러왔는가 (시험용) */
export function engineLoaded(): boolean {
  return engine !== null;
}

/** 이만큼 안에 난 소리는 한 순간으로 본다 (마지막 막힌 곳을 풂 = 다 풀림 + 단계 열림) */
export const SFX_GATHER_MS = 150;

/** 한 순간에 하나만: 더 중요한 소리가 이긴다 */
const PRIORITY: Record<Sound, number> = { answer: 0, confirm: 1, clear: 2, arrive: 3, stamp: 4 };

let lastPlayed: { name: Sound; at: number } | null = null;

/** 앞서 낸 소리와 같은 순간이면, 그보다 더 중요한 소리만 낸다 */
export function shouldPlay(name: Sound, now: number, last: { name: Sound; at: number } | null): boolean {
  if (!last || now - last.at >= SFX_GATHER_MS) return true;
  return PRIORITY[name] > PRIORITY[last.name];
}

/** 효과음을 낸다. 꺼져 있으면 아무것도 불러오지 않는다. 사용자 행동(누르기) 뒤에만 부른다. after(ms)만큼 뒤에 낼 수도 있다 */
export async function sfx(name: Sound, after = 0): Promise<void> {
  if (!soundOn()) return;
  const now = performance.now() + after;
  if (!shouldPlay(name, now, lastPlayed)) return;
  lastPlayed = { name, at: now };
  engine ??= import('./sfx-engine.ts');
  try {
    (await engine).playSound(name, after);
  } catch {
    // 소리를 못 내도 화면은 그대로 쓴다
  }
}
