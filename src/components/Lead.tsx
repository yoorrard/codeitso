// 단계 화면 H1 아래 한 줄 (D64, brief 2.1). 문장마다 묶어(parts.css .lead-s), 좁은 화면에서 어구 중간이 아니라
// 문장 사이에서 줄을 바꾼다. 문장 사이에는 빈칸을 두어 한 줄에 들어가면 그대로 이어 읽힌다.
import { sentences } from '../lib/sentences.ts';

interface Props {
  text: string;
  class?: string;
}

export function Lead({ text, class: cls }: Props) {
  return (
    <p class={cls ? `lead ${cls}` : 'lead'}>
      {sentences(text).map((t, i) => (
        <>
          {i > 0 && ' '}
          <span class="lead-s">{t}</span>
        </>
      ))}
    </p>
  );
}
