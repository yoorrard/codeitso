// 효과음 (D28): 기본 꺼짐. 설정에서 켰을 때만 합성기(sfx-engine.ts)를 동적으로 불러온다 (소리 파일 0KB).
// 소리는 뜻을 전하는 유일한 수단이 아니다: 같은 일을 늘 글·아이콘·aria-live로도 알린다.
import { $prefs } from './store.ts';

export type Sound = 'tap' | 'add' | 'arrive' | 'green' | 'stamp' | 'print' | 'cheer';

interface Engine {
  playSound(name: Sound): void;
}

let engine: Promise<Engine> | null = null;

export function soundOn(): boolean {
  return $prefs.get().sound;
}

/** 합성기를 이미 불러왔는가 (시험용) */
export function engineLoaded(): boolean {
  return engine !== null;
}

/** 이만큼 안에 난 소리는 한 순간으로 본다 (마지막 충돌 해결 = 신호 초록 + 도장 + 정류장 열림) */
export const SFX_GATHER_MS = 150;

/** 한 순간에 하나만: 더 중요한 소리가 이긴다 */
const PRIORITY: Record<Sound, number> = { tap: 0, add: 1, green: 2, arrive: 3, print: 4, stamp: 5, cheer: 6 };

let lastPlayed: { name: Sound; at: number } | null = null;

/** 앞서 낸 소리와 같은 순간이면, 그보다 더 중요한 소리만 낸다 */
export function shouldPlay(name: Sound, now: number, last: { name: Sound; at: number } | null): boolean {
  if (!last || now - last.at >= SFX_GATHER_MS) return true;
  return PRIORITY[name] > PRIORITY[last.name];
}

/** 효과음을 낸다. 꺼져 있으면 아무것도 불러오지 않는다. 사용자 행동(누르기) 뒤에만 부른다 */
export async function sfx(name: Sound): Promise<void> {
  if (!soundOn()) return;
  const now = performance.now();
  if (!shouldPlay(name, now, lastPlayed)) return;
  lastPlayed = { name, at: now };
  engine ??= import('./sfx-engine.ts');
  try {
    (await engine).playSound(name);
  } catch {
    // 소리를 못 내도 화면은 그대로 쓴다
  }
}
