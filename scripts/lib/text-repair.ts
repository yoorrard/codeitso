// 출처 글자 되돌리기 (D146): 출처 API가 UTF-8 바이트를 Latin-1로 읽어 넘긴 글자('æ\u0099º' 꼴)를 원래 글자('智')로 되돌린다.
// 뜻을 바꾸지 않고 인코딩만 바로잡는다. 진열대 빌드(scripts/catalog/load.ts)가 이름·설명에 쓴다. 부작용 없는 순수 함수.

// UTF-8 첫 바이트(C2~F4) 다음에 이어지는 바이트(80~BF)가 Latin-1 글자로 보이는 꼴
const SUSPECT = /[Â-ô][\u0080-¿]/;
// 한 바이트로 나타낼 수 있는 글자(U+0000~U+00FF)가 이어진 토막
const LATIN1_RUN = /[\u0000-ÿ]+/g;
const decoder = new TextDecoder('utf-8', { fatal: true });

function decodeRun(run: string): string {
  if (!SUSPECT.test(run)) return run;
  const bytes = Uint8Array.from(run, (c) => c.charCodeAt(0));
  try {
    return decoder.decode(bytes);
  } catch {
    // UTF-8로 읽히지 않으면 원래 Latin-1 글자였다(예: 'café»')
    return run;
  }
}

/** 깨진 토막만 되돌린다. 바른 글자·이모지·한글은 그대로 */
export function repairMojibake(text: string): string {
  if (!SUSPECT.test(text)) return text;
  return text.replace(LATIN1_RUN, decodeRun);
}

const SUSPECT_ALL = /[Â-ô][\u0080-¿]/g;

/** 되돌린 뒤에도 깨진 꼴이 세 군데 넘게 남으면(출처가 바이트를 잃음) 읽을 수 없는 글로 본다 */
export function isGarbled(text: string): boolean {
  return (text.match(SUSPECT_ALL)?.length ?? 0) >= 3;
}
