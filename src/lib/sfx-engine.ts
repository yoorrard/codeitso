// 효과음 합성기 (D28): WebAudio 발진기로 짧은 소리 일곱 가지를 만든다. sfx.ts가 효과음을 켰을 때만 불러온다.
// AudioContext는 하나만, 처음 소리를 낼 때(사용자가 누른 뒤) 만든다. 기본 음량 0.3.
import type { Sound } from './sfx.ts';

/** 음 하나: 주파수(Hz), 시작(초), 길이(초), 파형, 끝 주파수(미끄러짐) */
interface Note {
  f: number;
  at: number;
  s: number;
  wave?: OscillatorType;
  to?: number;
}

const VOLUME = 0.3;

const SOUNDS: Record<Sound, Note[]> = {
  tap: [{ f: 880, at: 0, s: 0.04, wave: 'triangle' }],
  add: [{ f: 520, at: 0, s: 0.12, wave: 'sine', to: 1040 }],
  arrive: [
    { f: 784, at: 0, s: 0.16, wave: 'sine' },
    { f: 523, at: 0.16, s: 0.24, wave: 'sine' },
  ],
  green: [
    { f: 1320, at: 0, s: 0.06, wave: 'square' },
    { f: 1760, at: 0.08, s: 0.08, wave: 'square' },
  ],
  stamp: [{ f: 140, at: 0, s: 0.14, wave: 'triangle', to: 60 }],
  print: [
    { f: 220, at: 0, s: 0.05, wave: 'sawtooth' },
    { f: 240, at: 0.07, s: 0.05, wave: 'sawtooth' },
    { f: 220, at: 0.14, s: 0.05, wave: 'sawtooth' },
  ],
  cheer: [
    { f: 523, at: 0, s: 0.12, wave: 'triangle' },
    { f: 659, at: 0.12, s: 0.12, wave: 'triangle' },
    { f: 784, at: 0.24, s: 0.12, wave: 'triangle' },
    { f: 1047, at: 0.36, s: 0.4, wave: 'triangle' },
  ],
};

let ctx: AudioContext | null = null;

function context(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function playSound(name: Sound): void {
  const ac = context();
  const now = ac.currentTime;
  for (const n of SOUNDS[name]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = n.wave ?? 'sine';
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

/** 시험용: 소리 목록과 길이(초) */
export function soundLength(name: Sound): number {
  return Math.max(...SOUNDS[name].map((n) => n.at + n.s));
}
