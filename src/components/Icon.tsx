// 섬(Preact) 안에서 쓰는 아이콘. 정적 화면은 Icon.astro.
import { iconSvg } from '../lib/icons.ts';
import type { IconName } from '../lib/icons.ts';

interface Props {
  name: IconName;
  size?: string;
  label?: string;
}

export function Icon({ name, size, label }: Props) {
  return <span class="icon-wrap" dangerouslySetInnerHTML={{ __html: iconSvg(name, size, label) }} />;
}
