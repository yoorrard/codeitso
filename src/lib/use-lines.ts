// 재료의 '쓰는 법' 두 가지 (출처 자료 그대로만): 쓰려면 필요한 인증, 설치 명령 한 줄.
// 프롬프트 뽑기(prompt.ts, D121)와 AI 에이전트용 MCP(src/lib/mcp, D154)가 같이 쓴다. 화면 문구(ko.ts)를 읽지 않아 Worker에도 싣는다.
import type { DetailRecord } from './catalog/types.ts';
import type { PromptLine } from './saved.ts';
import { PROMPT_FIELD_MAX, cleanText } from './saved.ts';

/** 쓰려면 필요한 인증 (출처 자료 그대로): API 미리 보기의 auth, MCP의 requiresKey. 인증 없음·모름이면 없음 */
export function authOf(d: Pick<DetailRecord, 'preview'>): PromptLine['auth'] {
  const p = d.preview;
  if (p['requiresKey'] === true) return 'key';
  const a = typeof p['auth'] === 'string' ? p['auth'].trim() : '';
  if (a === '' || /^(none|no)$/i.test(a)) return undefined;
  return /oauth/i.test(a) && !/key/i.test(a) ? 'oauth' : 'key';
}

/** 설치 명령을 한 줄로: 여러 줄이면 ' && '로 잇고, 너무 길면 첫 줄만 */
export function installLine(install: string | undefined): string | undefined {
  const rows = (install ?? '')
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r !== '' && !r.startsWith('#'));
  if (rows.length === 0) return undefined;
  const all = rows.join(' && ');
  return cleanText([...all].length <= PROMPT_FIELD_MAX.install ? all : rows[0], PROMPT_FIELD_MAX.install);
}
