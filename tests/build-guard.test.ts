// 빌드 지킴 (설계서 8.1 L-04·9.4절): 주소 바탕·호스트 꼴은 늘, 정식 빌드는 빌드 변수와 결과에 남은 예시 주소·초안 표시를 막는다.
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { basePathProblem, envProblems, forbiddenHits, hitProblem, hostProblem, oneLine, releaseEnvProblems, scanBuild } from '../scripts/lib/build-guard.ts';

const RELEASE_OK = { PUBLIC_STAGE: 'release', PUBLIC_SITE_URL: 'https://code-chauffeur.pages.workers.dev', PUBLIC_CONTACT_EMAIL: 'hello@code.kr' };

describe('주소 바탕 꼴', () => {
  it('비었거나 루트, /이름 꼴은 통과', () => {
    for (const v of [undefined, '', '/', '/code-chauffeur', '/a/b-2']) expect(basePathProblem(v)).toBeNull();
  });

  it('앞 빗금 없음·끝 빗금·대문자·밑줄·점은 막는다', () => {
    expect(basePathProblem('code-chauffeur')).toMatch(/\/로 시작/);
    expect(basePathProblem('/code-chauffeur/')).toMatch(/끝에 \//);
    for (const v of ['/Code', '/code_chauffeur', '/a.b', '/a//b']) expect(basePathProblem(v)).toMatch(/영문 소문자/);
  });
});

describe('호스트 종류', () => {
  it('cloudflare·static·빈 값만', () => {
    for (const v of [undefined, '', 'cloudflare', 'static']) expect(hostProblem(v)).toBeNull();
    expect(hostProblem('github')).toMatch(/cloudflare나 static/);
  });
});

describe('정식 빌드의 빌드 변수', () => {
  it('미리 보기는 보지 않는다', () => {
    expect(releaseEnvProblems({})).toEqual([]);
    expect(releaseEnvProblems({ PUBLIC_STAGE: 'preview' })).toEqual([]);
  });

  it('사이트 주소가 없으면 한국어 한 줄로 멈춘다', () => {
    const problems = envProblems({ PUBLIC_STAGE: 'release', PUBLIC_CONTACT_EMAIL: 'a@b.kr' });
    expect(problems).toHaveLength(1);
    const line = oneLine(problems);
    expect(line).toMatch(/^빌드를 멈췄어요: 정식 빌드인데 PUBLIC_SITE_URL/);
    expect(line).not.toContain('\n');
  });

  it('예시 주소, 빈 연락처를 막는다', () => {
    expect(releaseEnvProblems({ ...RELEASE_OK, PUBLIC_SITE_URL: 'https://codechauffeur.example' })[0]).toMatch(/예시 주소/);
    expect(releaseEnvProblems({ ...RELEASE_OK, PUBLIC_SITE_URL: 'https://Example.org' })[0]).toMatch(/예시 주소/);
    expect(releaseEnvProblems({ ...RELEASE_OK, PUBLIC_CONTACT_EMAIL: ' ' })[0]).toMatch(/PUBLIC_CONTACT_EMAIL/);
    expect(envProblems(RELEASE_OK)).toEqual([]);
  });

  it('바탕·호스트 꼴은 미리 보기에서도 본다', () => {
    expect(envProblems({ PUBLIC_BASE_PATH: '/x/', PUBLIC_HOST: 'gh' })).toHaveLength(2);
  });
});

describe('정식 빌드 결과에 남은 글자', () => {
  it('예시 주소·초안 표시를 파일과 함께 찾고, 화면(HTML)을 먼저 보여 준다', () => {
    const files = [
      { path: '_astro/a.js', text: 'x(초안)y' },
      { path: 'legal/privacy/index.html', text: '<h1>개인정보 처리방침 (초안)</h1><p>검토 중인 초안이에요.</p>' },
      { path: 'index.html', text: '<link rel="canonical" href="https://codechauffeur.example/">' },
      { path: 'tools/index.html', text: '깨끗함' },
    ];
    const hits = forbiddenHits(files);
    expect(hits.map((h) => [h.word, h.files])).toEqual([
      ['codechauffeur.example', ['index.html']],
      ['(초안)', ['_astro/a.js', 'legal/privacy/index.html']],
      ['검토 중인 초안', ['legal/privacy/index.html']],
    ]);
    const second = hits[1];
    if (!second) throw new Error('찾은 것이 없다');
    expect(hitProblem(second)).toBe("정식 빌드 결과에 '(초안)' 글자가 남았어요 (legal/privacy/index.html 외 1곳). 법 문서 최종 문구를 넣으세요 (HUMAN H04)");
  });

  it('빌드 폴더를 읽어 정식이면 한 줄, 미리 보기면 null', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cc-guard-'));
    mkdirSync(join(dir, 'legal'));
    writeFileSync(join(dir, 'legal', 'index.html'), '<p>검토 중인 초안이에요.</p>');
    writeFileSync(join(dir, 'icon.png'), '(초안)');
    expect(scanBuild(dir, {})).toBeNull();
    const line = scanBuild(dir, RELEASE_OK);
    expect(line).toMatch(/^빌드를 멈췄어요: 정식 빌드 결과에 '검토 중인 초안' 글자가 남았어요 \(legal\/index\.html\)/);
    // 그림 파일은 읽지 않는다
    expect(line).not.toContain("'(초안)'");
  });
});
