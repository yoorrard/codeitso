// 숫자 굴리기 (S3 상태 한 줄, S9 '20장 중 n장'): 바뀐 숫자만 옛 숫자는 위로 빠지고 새 숫자가 아래에서 올라온다(--dur-roll).
// 숫자는 화면이 따로 감싸 둔다(<span class="sl-n"><span>7</span></span>, numberParts로 나눈다. 칠은 frame.css).
import { dur, ease, reduced } from './motion.ts';

/** 글을 숫자와 나머지로 나눈다. 숫자는 굴릴 수 있게 따로 감싼다 */
export const numberParts = (text: string): string[] => text.split(/(\d+)/).filter((x) => x !== '');

/** 바뀐 숫자만 굴린다 (몇째 숫자인지로 짝짓는다. 숫자 수가 달라지면 굴리지 않는다). wait는 시작을 늦출 길이(ms) */
export function rollNumbers(box: HTMLElement, before: string, after: string, wait = 0): Animation[] {
  const a = before.match(/\d+/g) ?? [];
  const b = after.match(/\d+/g) ?? [];
  if (a.length !== b.length || reduced()) return [];
  const t = { duration: dur('--dur-roll'), delay: wait, easing: ease('--ease-out'), fill: 'backwards' as const };
  const out: Animation[] = [];
  box.querySelectorAll<HTMLElement>('.sl-n').forEach((n, i) => {
    if (a[i] === undefined || a[i] === b[i]) return;
    const old = document.createElement('span');
    old.className = 'sl-old';
    old.setAttribute('aria-hidden', 'true');
    old.textContent = a[i] ?? '';
    n.append(old);
    const up = n.firstElementChild?.animate([{ transform: 'translateY(0.6em)', opacity: 0 }, { transform: 'none', opacity: 1 }], t);
    const leave = old.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-0.6em)', opacity: 0 }], { ...t, fill: 'both' });
    void leave.finished.catch(() => undefined).then(() => old.remove());
    if (up) out.push(up);
    out.push(leave);
  });
  return out;
}
