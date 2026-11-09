// MCP 결과에 싣는 글 다듬기 (D154): 출처가 쓴 글을 AI 에이전트에게 넘기기 전에 보이지 않는 글자와 제어 문자를 빼고 길이를 묶는다.
// 숨은 지시(보이지 않는 글자·방향 바꾸기 문자·HTML 주석)로 에이전트를 속이는 길을 줄이려는 것이다. 뜻은 바꾸지 않는다.
// 순수 함수, 시험: tests/lib/mcp-text.test.ts

/**
 * 보이지 않거나 글 모양을 몰래 바꾸는 글자 (소스에는 \u 꼴로만 적는다):
 * 제어 문자(줄바꿈·탭 빼고) · 소프트 하이픈 · 결합 문자 막기(034F) · 아랍 글자 방향(061C) · 한글 채움 문자(115F·1160·3164·FFA0) ·
 * 크메르 모음 숨김(17B4·17B5) · 몽골 글자 바꿈(180B~180E) · 폭 0 글자·방향 바꾸기(200B~200F·202A~202E·2060~206F) ·
 * 이체자 고르기(FE00~FE0F, E0100~E01EF) · BOM(FEFF) · 주석 고정 문자(FFF9~FFFB) · 태그 글자(E0000~E007F, 숨은 ASCII)
 */
const HIDDEN = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180B-\\u180E' +
    '\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u206F\\u3164\\uFE00-\\uFE0F\\uFEFF\\uFFA0\\uFFF9-\\uFFFB]|[\\u{E0000}-\\u{E007F}\\u{E0100}-\\u{E01EF}]',
  'gu',
);

/** 줄·문단 나눔 문자 (2028·2029): 여러 줄 글에서는 줄바꿈으로 */
const LINE_SEP = /[\u2028\u2029]/g;

/** HTML 주석과 태그 (출처 설명에 섞여 오는 것) */
const TAGS = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^<>]{0,200}>/g;

/** 글자 수(코드 포인트)로 자르고 끝에 …를 붙인다 */
function cut(s: string, max: number): string {
  const chars = [...s];
  return chars.length <= max ? s : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

/** 한 줄 글: 숨은 글자·태그를 빼고, 공백을 한 칸으로, max자까지 */
export function line(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return cut(raw.replace(HIDDEN, '').replace(TAGS, ' ').replace(/\s+/g, ' ').trim(), max);
}

/** 여러 줄 글(설치 명령·코드 조각): 숨은 글자만 빼고 줄은 지킨다. maxLines줄·max자까지 */
export function block(raw: unknown, max: number, maxLines = 40): string {
  if (typeof raw !== 'string') return '';
  const rows = raw
    .replace(HIDDEN, '')
    .replace(LINE_SEP, '\n')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((r) => r.replace(/\s+$/, ''));
  while (rows.length > 0 && rows[0] === '') rows.shift();
  while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();
  const kept = rows.length > maxLines ? [...rows.slice(0, maxLines), '…'] : rows;
  return cut(kept.join('\n'), max);
}

/** 이름처럼 마크다운 안에 넣는 짧은 글: 한 줄로 만들고 마크다운 강조·링크·그림 기호와 줄 첫머리의 제목·목록·구분선 표시가 글 모양을 깨지 않게 막는다 */
export function inline(raw: unknown, max: number): string {
  const t = line(raw, max).replace(/([\\`*_[\]<>|!])/g, '\\$1');
  // 번호 목록(1. · 1))은 숫자 뒤 기호를 막는다 (숫자 앞 \ 는 마크다운에서 그대로 보인다)
  const num = /^\d+(?=[.)])/.exec(t);
  if (num) return `${num[0]}\\${t.slice(num[0].length)}`;
  return /^[#+=-]/.test(t) ? `\\${t}` : t;
}

/** 코드 울타리: 글 안의 가장 긴 ` 줄보다 하나 길게 (최소 3개). 글이 울타리를 끊지 못한다 */
export function fenceFor(raw: string): string {
  const longest = (raw.match(/`+/g) ?? []).reduce((n, run) => Math.max(n, run.length), 0);
  return '`'.repeat(Math.max(3, longest + 1));
}

/** 한 줄 코드: 글 안의 가장 긴 ` 줄보다 하나 긴 ` 로 감싼다 (명령의 글자를 바꾸지 않는다) */
export function inlineCode(raw: string): string {
  const longest = (raw.match(/`+/g) ?? []).reduce((n, run) => Math.max(n, run.length), 0);
  const tick = '`'.repeat(longest + 1);
  const pad = raw.startsWith('`') || raw.endsWith('`') ? ' ' : '';
  return `${tick}${pad}${raw}${pad}${tick}`;
}

/** http·https 주소만 (그 밖은 빈 글) */
export function webUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const s = raw.trim();
  if (!/^https?:\/\/[^\s<>"]+$/i.test(s) || s.length > 500) return '';
  return s;
}

/** 숫자를 1,234 꼴로 */
export function commas(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** {{이름}} 자리 채우기 */
export function fillText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}
