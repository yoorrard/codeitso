// MCP 결과에 싣는 글 다듬기 (D154): 출처가 쓴 글을 AI 에이전트에게 넘기기 전에 보이지 않는 글자와 제어 문자를 빼고 길이를 묶는다.
// 숨은 지시(보이지 않는 글자·방향 바꾸기 문자·HTML 주석)로 에이전트를 속이는 길을 줄이려는 것이다. 뜻은 바꾸지 않는다.
// 순수 함수, 시험: tests/lib/mcp-text.test.ts

/** 제어 문자(줄바꿈·탭 빼고), 보이지 않는 폭 0 글자, 방향 바꾸기 문자, BOM, 태그 글자(U+E0000대) */
const HIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­​-‏‪-‮⁠-⁤⁦-⁯﻿]|[\u{E0000}-\u{E007F}]/gu;

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
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((r) => r.replace(/\s+$/, ''));
  while (rows.length > 0 && rows[0] === '') rows.shift();
  while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();
  const kept = rows.length > maxLines ? [...rows.slice(0, maxLines), '…'] : rows;
  return cut(kept.join('\n'), max);
}

/** 이름처럼 마크다운 안에 넣는 짧은 글: 한 줄로 만들고 마크다운 강조·링크 기호가 글 모양을 깨지 않게 막는다 */
export function inline(raw: unknown, max: number): string {
  return line(raw, max).replace(/([\\`*_[\]<>|])/g, '\\$1');
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
