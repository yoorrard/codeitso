// 효과음 합성기 (D28, brief 7절 '효과음', D71 W5b): WebAudio 발진기 하나의 음색(삼각파)에 C장조 음(523·587·659·784·880·1047Hz)만 쓴다.
// sfx.ts가 효과음을 켰을 때만 불러온다. AudioContext는 하나만, 처음 소리를 낼 때(사용자가 누른 뒤) 만든다. 음량 0.12.
// 브라우저가 아직 소리를 막고 있으면(누르기 전에 연 페이지) 그 소리는 버린다: 막힌 동안 쌓였다가 나중에 한꺼번에 나지 않게.
import type { Sound } from './sfx.ts';

/** 음 하나: 주파수(Hz), 시작(초), 길이(초), 끝 주파수(도장의 '쿵'만 아래로 미끄러진다) */
interface Note {
  f: number;
  at: number;
  s: number;
  to?: number;
}

/** C장조 다섯 음 + 한 옥타브 위 도 */
export const SCALE = [523, 587, 659, 784, 880, 1047] as const;
export const VOLUME = 0.12;

const SOUNDS: Record<Sound, Note[]> = {
  // 답함: 한 음 60ms
  answer: [{ f: 659, at: 0, s: 0.06 }],
  // 정함: 두 음 120ms
  confirm: [
    { f: 659, at: 0, s: 0.06 },
    { f: 784, at: 0.06, s: 0.06 },
  ],
  // 다 풀림: 올라가는 두 음 240ms
  clear: [
    { f: 784, at: 0, s: 0.12 },
    { f: 1047, at: 0.12, s: 0.12 },
  ],
  // 도착: 세 음 차임 600ms
  arrive: [
    { f: 523, at: 0, s: 0.2 },
    { f: 659, at: 0.2, s: 0.2 },
    { f: 784, at: 0.4, s: 0.2 },
  ],
  // 도장: 낮은 도(523의 두 옥타브 아래)에서 한 옥타브 미끄러지는 '쿵' 90ms
  stamp: [{ f: 523 / 4, at: 0, s: 0.09, to: 523 / 8 }],
};

let ctx: AudioContext | null = null;

/** 막힌 소리를 이만큼 안에 풀리면 낸다 (처음 만든 AudioContext가 켜지는 데 잠깐 걸리는 브라우저가 있다) */
const RESUME_WAIT_MS = 200;

function schedule(ac: AudioContext, name: Sound, after: number): void {
  const now = ac.currentTime + after / 1000;
  for (const n of SOUNDS[name]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.f, now + n.at);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, now + n.at + n.s);
    // 딸깍 소리 없게 짧게 키우고 줄인다
    gain.gain.setValueAtTime(0.0001, now + n.at);
    gain.gain.exponentialRampToValueAtTime(VOLUME, now + n.at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.s);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + n.at);
    osc.stop(now + n.at + n.s + 0.02);
  }
}

/** after(ms)만큼 뒤에 소리를 낸다 */
export function playSound(name: Sound, after = 0): void {
  ctx ??= new AudioContext();
  const ac = ctx;
  if (ac.state === 'running') {
    schedule(ac, name, after);
    return;
  }
  const asked = performance.now();
  void ac
    .resume()
    .then(() => {
      if (performance.now() - asked < RESUME_WAIT_MS) schedule(ac, name, after);
    })
    .catch(() => undefined);
}

/** 시험용: 소리 길이(초) */
export function soundLength(name: Sound): number {
  return Math.max(...SOUNDS[name].map((n) => n.at + n.s));
}

/** 시험용: 소리의 음 (주파수 목록) */
export function soundNotes(name: Sound): number[] {
  return SOUNDS[name].map((n) => n.f);
}
