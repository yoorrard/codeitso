// 홈 '무엇을 만들고 싶어요?' 카드 아이콘 (Phosphor Icons, MIT, v5.1 D124). 정적 홈 HTML에만 쓰고 섬은 부르지 않는다:
// src/lib/icons.ts에 더하면 섬 JS(첫 화면 100KB 예산)에 함께 실리기 때문이다. 키트 id는 src/lib/kits.ts KIT_IDS.
import chatSvg from '@phosphor-icons/core/assets/regular/chat-circle-dots.svg?raw';
import rocketSvg from '@phosphor-icons/core/assets/regular/rocket-launch.svg?raw';
import chartSvg from '@phosphor-icons/core/assets/regular/chart-bar.svg?raw';
import schoolSvg from '@phosphor-icons/core/assets/regular/graduation-cap.svg?raw';
import gameSvg from '@phosphor-icons/core/assets/regular/game-controller.svg?raw';
import type { KitId } from './kits.ts';

const KIT_ICON: Record<KitId, string> = {
  'ai-chatbot': chatSvg,
  landing: rocketSvg,
  dashboard: chartSvg,
  school: schoolSvg,
  game: gameSvg,
};

/** 키트 아이콘 SVG 글자 (장식이라 aria-hidden). 모르는 id면 빈 글자 */
export function kitIconSvg(id: string, size = '24px'): string {
  const svg = (KIT_ICON as Record<string, string | undefined>)[id];
  return svg ? svg.replace('<svg ', `<svg width="${size}" height="${size}" class="icon" aria-hidden="true" focusable="false" `) : '';
}
