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

/** 효과음을 낸다. 꺼져 있으면 아무것도 불러오지 않는다. 사용자 행동(누르기) 뒤에만 부른다 */
export async function sfx(name: Sound): Promise<void> {
  if (!soundOn()) return;
  engine ??= import('./sfx-engine.ts');
  try {
    (await engine).playSound(name);
  } catch {
    // 소리를 못 내도 화면은 그대로 쓴다
  }
}
