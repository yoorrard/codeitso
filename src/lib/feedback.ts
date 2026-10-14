// 의견 보내기 (docs/review/v3/brief.md 8.1 L-01·L-06, D80): 서버로 받는 폼 없이 이용자의 메일 앱을 연다.
// 연락 주소는 빌드 변수 PUBLIC_CONTACT_EMAIL 하나뿐이고, 비어 있으면 의견 묶음을 그리지 않는다(H22).
// 메일 본문에 보던 화면을 넣을 때는 경로만 넣는다: 영수증 링크 조각(#r=)과 검색어(?…)는 빼서 고른 답·직접 쓴 글이 메일로 새지 않게 한다.
// 소개 화면은 늘 /about이라 보던 화면 줄 대신 빈칸 줄(ko.feedback.reportLine)을 넣는다 (D85).
// T41이 주제·판 번호·[메일 주소 복사]를 더해 넓힌다. 문장은 화면이 src/copy/ko.ts에서 채워 넘긴다.

/** 메일 주소처럼 보이면 다듬어 돌려주고, 아니면 빈 글 (빈 글 = 의견 묶음을 그리지 않음) */
export function contactEmail(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  // mailto 주소 안에 그대로 들어가므로 ?·&·#·/ 같은 글자가 섞인 값은 받지 않는다
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v) ? v : '';
}

/** 빌드 때 정해지는 연락 주소 */
export const CONTACT_EMAIL: string = contactEmail(import.meta.env.PUBLIC_CONTACT_EMAIL);

/** 보던 화면의 경로만: 주소 조각 #… 과 검색어 ?… 를 떼고, 사이트 주소 규칙대로 끝 빗금도 뗀다 (D50) */
export function pagePath(pathOrUrl: string): string {
  const path = pathOrUrl.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '');
  const cut = path.search(/[?#]/);
  const out = (cut === -1 ? path : path.slice(0, cut)).replace(/\/+$/, '');
  return out === '' ? '/' : out;
}

export interface FeedbackMail {
  email: string;
  subject: string;
  /** 본문 줄 (이미 채운 문장) */
  lines: readonly string[];
}

/** mailto: 주소. 제목과 본문은 RFC 6068대로 % 인코딩한다 (공백은 + 가 아니라 %20) */
export function mailtoFor({ email, subject, lines }: FeedbackMail): string {
  const q = [`subject=${encodeURIComponent(subject)}`];
  if (lines.length > 0) q.push(`body=${encodeURIComponent(lines.join('\r\n'))}`);
  return `mailto:${email}?${q.join('&')}`;
}
