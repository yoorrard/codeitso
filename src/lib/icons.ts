// UI 아이콘 (Phosphor Icons, MIT). 쓰는 것만 빌드 때 SVG 글자로 넣는다 (D27). 새 아이콘은 여기 더한다.
// 스타일은 Regular 한 가지. 색은 currentColor라 글자색 토큰을 따른다.
import closeSvg from '@phosphor-icons/core/assets/regular/x.svg?raw';
import copySvg from '@phosphor-icons/core/assets/regular/copy.svg?raw';
import backSvg from '@phosphor-icons/core/assets/regular/arrow-left.svg?raw';
import nextSvg from '@phosphor-icons/core/assets/regular/arrow-right.svg?raw';
import checkSvg from '@phosphor-icons/core/assets/regular/check.svg?raw';
import warningSvg from '@phosphor-icons/core/assets/regular/warning-circle.svg?raw';
import downloadSvg from '@phosphor-icons/core/assets/regular/download-simple.svg?raw';
import expandSvg from '@phosphor-icons/core/assets/regular/caret-down.svg?raw';
import externalSvg from '@phosphor-icons/core/assets/regular/arrow-square-out.svg?raw';
import searchSvg from '@phosphor-icons/core/assets/regular/magnifying-glass.svg?raw';
import cartSvg from '@phosphor-icons/core/assets/regular/shopping-cart-simple.svg?raw';
import menuSvg from '@phosphor-icons/core/assets/regular/list.svg?raw';
import prevSvg from '@phosphor-icons/core/assets/regular/caret-left.svg?raw';
import chevronSvg from '@phosphor-icons/core/assets/regular/caret-right.svg?raw';
import starSvg from '@phosphor-icons/core/assets/regular/star.svg?raw';
import heartSvg from '@phosphor-icons/core/assets/regular/heart.svg?raw';
import plusSvg from '@phosphor-icons/core/assets/regular/plus.svg?raw';
import paletteSvg from '@phosphor-icons/core/assets/regular/palette.svg?raw';
import sparkleSvg from '@phosphor-icons/core/assets/regular/sparkle.svg?raw';
import plugsSvg from '@phosphor-icons/core/assets/regular/plugs-connected.svg?raw';
import branchSvg from '@phosphor-icons/core/assets/regular/git-branch.svg?raw';
import layoutSvg from '@phosphor-icons/core/assets/regular/layout.svg?raw';
import databaseSvg from '@phosphor-icons/core/assets/regular/database.svg?raw';
import tagSvg from '@phosphor-icons/core/assets/regular/tag.svg?raw';
import infoSvg from '@phosphor-icons/core/assets/regular/info.svg?raw';

export const icons = {
  close: closeSvg,
  copy: copySvg,
  back: backSvg,
  next: nextSvg,
  check: checkSvg,
  warning: warningSvg,
  download: downloadSvg,
  expand: expandSvg,
  external: externalSvg,
  search: searchSvg,
  cart: cartSvg,
  menu: menuSvg,
  prev: prevSvg,
  chevron: chevronSvg,
  star: starSvg,
  heart: heartSvg,
  plus: plusSvg,
  tag: tagSvg,
  info: infoSvg,
  /** 대분류 아이콘 (CATEGORY_ICON) */
  palette: paletteSvg,
  sparkle: sparkleSvg,
  plugs: plugsSvg,
  branch: branchSvg,
  layout: layoutSvg,
  database: databaseSvg,
} as const;

export type IconName = keyof typeof icons;

/** 대분류마다 아이콘 하나 */
export const CATEGORY_ICON = {
  design: 'palette',
  ai: 'sparkle',
  api: 'plugs',
  opensource: 'branch',
  templates: 'layout',
  datasets: 'database',
} as const satisfies Record<string, IconName>;

/** 크기와 접근성 속성을 붙인 SVG 글자. label이 없으면 장식(aria-hidden) */
export function iconSvg(name: IconName, size = '1.5em', label?: string): string {
  const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"';
  return icons[name].replace('<svg ', `<svg width="${size}" height="${size}" class="icon" ${a11y} `);
}
