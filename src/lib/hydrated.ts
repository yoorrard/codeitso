// 섬이 브라우저에서 처음 그려진 뒤인지. 빌드 때 그린 HTML(처음 온 사람 기준)과 첫 그림을 맞춰,
// 저장된 진행을 읽은 값은 그다음에 보여 준다 (Preact는 붙일 때 속성 차이를 고치지 않는다).
import { useEffect, useState } from 'preact/hooks';

export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
