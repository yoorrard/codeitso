// UI 아이콘 (Phosphor Icons, MIT). 쓰는 것만 빌드 때 SVG 글자로 넣는다 (D27). 새 아이콘은 여기 더한다.
// 스타일은 Regular 한 가지 (CONCEPT 5.7: duotone은 버림). 색은 currentColor라 글자색 토큰을 따른다.
import closeSvg from '@phosphor-icons/core/assets/regular/x.svg?raw';
import copySvg from '@phosphor-icons/core/assets/regular/copy.svg?raw';
import backSvg from '@phosphor-icons/core/assets/regular/arrow-left.svg?raw';
import nextSvg from '@phosphor-icons/core/assets/regular/arrow-right.svg?raw';
import dictionarySvg from '@phosphor-icons/core/assets/regular/book-open-text.svg?raw';
import settingsSvg from '@phosphor-icons/core/assets/regular/gear-six.svg?raw';
import soundOnSvg from '@phosphor-icons/core/assets/regular/speaker-high.svg?raw';
import soundOffSvg from '@phosphor-icons/core/assets/regular/speaker-slash.svg?raw';
import sparkleSvg from '@phosphor-icons/core/assets/regular/sparkle.svg?raw';
import checkSvg from '@phosphor-icons/core/assets/regular/check.svg?raw';
import warningSvg from '@phosphor-icons/core/assets/regular/warning-circle.svg?raw';
import lockSvg from '@phosphor-icons/core/assets/regular/lock-simple.svg?raw';
import shareSvg from '@phosphor-icons/core/assets/regular/share-network.svg?raw';
import downloadSvg from '@phosphor-icons/core/assets/regular/download-simple.svg?raw';
import expandSvg from '@phosphor-icons/core/assets/regular/caret-down.svg?raw';
import helpSvg from '@phosphor-icons/core/assets/regular/question.svg?raw';
import pinSvg from '@phosphor-icons/core/assets/regular/map-pin.svg?raw';
import externalSvg from '@phosphor-icons/core/assets/regular/arrow-square-out.svg?raw';

export const icons = {
  close: closeSvg,
  copy: copySvg,
  back: backSvg,
  next: nextSvg,
  dictionary: dictionarySvg,
  settings: settingsSvg,
  soundOn: soundOnSvg,
  soundOff: soundOffSvg,
  sparkle: sparkleSvg,
  check: checkSvg,
  warning: warningSvg,
  lock: lockSvg,
  share: shareSvg,
  download: downloadSvg,
  expand: expandSvg,
  help: helpSvg,
  pin: pinSvg,
  external: externalSvg,
} as const;

export type IconName = keyof typeof icons;

/** 크기와 접근성 속성을 붙인 SVG 글자. label이 없으면 장식(aria-hidden) */
export function iconSvg(name: IconName, size = '1.5em', label?: string): string {
  const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"';
  return icons[name].replace('<svg ', `<svg width="${size}" height="${size}" class="icon" ${a11y} `);
}
