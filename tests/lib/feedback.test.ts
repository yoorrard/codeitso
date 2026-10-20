// 의견 보내기 도우미 (v3 설계서 8.1 L-01·L-06): 연락 주소 다듬기, 보던 화면의 경로만, mailto 인코딩
import { describe, expect, it } from 'vitest';
import { contactEmail, mailtoFor, pagePath } from '../../src/lib/feedback.ts';

describe('연락 주소 (PUBLIC_CONTACT_EMAIL)', () => {
  it('메일 주소처럼 보이면 앞뒤 공백을 떼고 돌려준다', () => {
    expect(contactEmail('  hello@example.org ')).toBe('hello@example.org');
  });

  it('비었거나 메일 주소가 아니면 빈 글 (의견 묶음을 그리지 않음)', () => {
    expect(contactEmail(undefined)).toBe('');
    expect(contactEmail('')).toBe('');
    expect(contactEmail('   ')).toBe('');
    expect(contactEmail('example.org')).toBe('');
    expect(contactEmail('a b@example.org')).toBe('');
    expect(contactEmail('a@b')).toBe('');
    expect(contactEmail('a@example.org?bcc=x@y.z')).toBe('');
    expect(contactEmail('a?cc=b@example.org')).toBe('');
    expect(contactEmail('a@example.org#x')).toBe('');
  });
});

describe('보던 화면의 경로', () => {
  it('영수증 링크 조각(#r=)과 검색어(?…)를 뗀다', () => {
    expect(pagePath('/arrival#r=N4Ig')).toBe('/arrival');
    expect(pagePath('/tools?q=급식#top')).toBe('/tools');
    expect(pagePath('https://codechauffeur.example/about?x=1')).toBe('/about');
    expect(pagePath('/about')).toBe('/about');
    expect(pagePath('/about/')).toBe('/about');
    expect(pagePath('/')).toBe('/');
    expect(pagePath('')).toBe('/');
  });
});

describe('mailto 주소', () => {
  it('제목과 본문을 % 인코딩한다 (공백은 %20, 줄바꿈은 CRLF)', () => {
    expect(mailtoFor({ email: 'hello@example.org', subject: '코드잇소 의견', lines: ['보던 화면: /about', '판 1'] })).toBe(
      `mailto:hello@example.org?subject=${encodeURIComponent('코드잇소 의견')}&body=${encodeURIComponent('보던 화면: /about\r\n판 1')}`,
    );
  });

  it('본문 줄이 없으면 제목만', () => {
    const url = mailtoFor({ email: 'a@example.org', subject: 'x y', lines: [] });
    expect(url).toBe('mailto:a@example.org?subject=x%20y');
  });
});
