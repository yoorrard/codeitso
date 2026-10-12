/** "{{이름}}" 자리를 채운다. 빠진 값이 있으면 오류를 내서 문장 틀 실수를 일찍 잡는다. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key: string) => {
    const v = vars[key];
    if (v === undefined) throw new Error(`문장 틀에 '${key}' 값이 없습니다: ${template}`);
    return String(v);
  });
}

/** 고정폭 글꼴에서 차지하는 칸 수. 한글·한자·전각 문자는 2칸으로 센다. */
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    const wide =
      (c >= 0x1100 && c <= 0x115f) ||
      (c >= 0x2e80 && c <= 0xa4cf) ||
      (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0xf900 && c <= 0xfaff) ||
      (c >= 0xfe30 && c <= 0xfe4f) ||
      (c >= 0xff00 && c <= 0xff60) ||
      (c >= 0xffe0 && c <= 0xffe6);
    w += wide ? 2 : 1;
  }
  return w;
}

/** 칸 수 기준으로 자른다. 잘리면 끝에 '…'를 붙인다. */
export function truncateWidth(s: string, max: number): string {
  if (displayWidth(s) <= max) return s;
  let out = '';
  for (const ch of s) {
    if (displayWidth(out + ch) > max - 1) break;
    out += ch;
  }
  return out + '…';
}

export function padEndWidth(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - displayWidth(s)));
}

export function padStartWidth(s: string, width: number): string {
  return ' '.repeat(Math.max(0, width - displayWidth(s))) + s;
}

export interface TimeFormat {
  /** 예: "약 {{m}}분" */
  minutes: string;
  /** 예: "약 {{h}}시간" */
  hours: string;
  /** 예: "약 {{h}}시간 30분" */
  hoursHalf: string;
}

/** 분 → "약 40분", "약 1시간", "약 2시간 30분" (55분 미만은 10분 단위, 그 위는 30분 단위로 반올림) */
export function formatMinutes(min: number, f: TimeFormat): string {
  if (min < 55) return fill(f.minutes, { m: Math.max(10, Math.round(min / 10) * 10) });
  const half = Math.round(min / 30);
  const h = Math.floor(half / 2);
  return fill(half % 2 === 0 ? f.hours : f.hoursHalf, { h });
}

/** 꾸러미에 넣을 한 줄 입력 정리: 줄바꿈 없애고, 앞뒤 공백 없애고, 길이 제한 */
export function oneLine(s: string, max = 80): string {
  const t = s.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return [...t].slice(0, max).join('');
}

/** 마크다운 표 칸 안에 넣을 글자 정리 */
export function cell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}
