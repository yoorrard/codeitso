// README 첫 그림 고르기 (scripts/import/media-readme.ts): 저장소 찾기·그림 뽑기·주소 풀기·배지 빼기 (네트워크 없이).
import { describe, expect, it } from 'vitest';
import { extractImages, parseRepoUrl, pickImage, repoRefOf, resolveImage, wantsReadme } from '../../scripts/import/media-readme.ts';

const root = 'https://raw.githubusercontent.com/o/r/HEAD/';

describe('저장소 찾기', () => {
  it('github·gitlab 주소, tree 가지·하위 폴더, 저장소가 아닌 주소', () => {
    expect(parseRepoUrl('https://github.com/withastro/astro')).toEqual({ host: 'github', owner: 'withastro', repo: 'astro', ref: 'HEAD', dir: '' });
    expect(parseRepoUrl('https://github.com/vercel/examples/tree/main/edge-middleware/ab')).toEqual({ host: 'github', owner: 'vercel', repo: 'examples', ref: 'main', dir: 'edge-middleware/ab' });
    expect(parseRepoUrl('https://gitlab.com/a/b.git')).toMatchObject({ host: 'gitlab', repo: 'b' });
    expect(parseRepoUrl('https://github.com/topics/cli')).toBeNull();
    expect(parseRepoUrl('https://github.com/a/b/blob/main/x.md')).toBeNull();
  });

  it('패키지는 repoUrl, 짧은 이름은 host·path와 함께, Codeberg는 뺀다', () => {
    const base = { id: 'x', kind: 'js-libraries', url: 'https://www.npmjs.com/package/x' };
    expect(repoRefOf({ ...base, preview: { type: 'repo', repo: 'a/b', repoUrl: 'https://github.com/a/b', host: 'npm' } })).toMatchObject({ owner: 'a', repo: 'b' });
    expect(repoRefOf({ ...base, preview: { type: 'template', repo: 'expo/examples', path: 'blank', host: 'github' } })).toMatchObject({ dir: 'blank', ref: 'HEAD' });
    expect(repoRefOf({ ...base, preview: { type: 'repo', repo: 'a/b', host: 'gitlab' } })).toMatchObject({ host: 'gitlab' });
    expect(repoRefOf({ ...base, url: 'https://codeberg.org/a/b', preview: { type: 'repo', repo: 'a/b', host: 'codeberg' } })).toBeNull();
    expect(wantsReadme({ ...base, kind: 'workflow', preview: { type: 'template' } })).toBe(false);
    expect(wantsReadme({ ...base, preview: { type: 'mcp' } })).toBe(false);
  });
});

describe('그림 고르기', () => {
  it('마크다운·HTML·참조형 그림을 나온 차례대로, 주석·코드 덩어리 안은 빼고', () => {
    const md = '<!-- ![x](hidden.png) -->\n# T\n<img src="a.png" width="80" alt="A">\n```\n![c](code.png)\n```\n![b](b.png "t")\n![r][ref]\n\n[ref]: https://x.example/r.png\n';
    expect(extractImages(md).map((c) => c.url)).toEqual(['a.png', 'b.png', 'https://x.example/r.png']);
    expect(extractImages(md)[0]).toMatchObject({ width: 80, alt: 'A' });
  });

  it('상대 경로는 README 폴더·저장소 뿌리 기준, GitHub blob 주소는 raw로, http는 https로', () => {
    expect(resolveImage('docs/s.png', `${root}sub/`, root)).toBe(`${root}sub/docs/s.png`);
    expect(resolveImage('/s.png', `${root}sub/`, root)).toBe(`${root}s.png`);
    expect(resolveImage('https://github.com/o/r/blob/main/s.png?raw=true', root, root)).toBe('https://raw.githubusercontent.com/o/r/main/s.png');
    expect(resolveImage('http://x.example/a.png', root, root)).toBe('https://x.example/a.png');
    expect(resolveImage('data:image/png;base64,AA', root, root)).toBeNull();
  });

  it('배지·후원·아바타·작은 아이콘은 건너뛰고, 로고보다 화면 갈무리, GIF면 멈춘 그림도', () => {
    const md = [
      '![build](https://github.com/o/r/actions/workflows/ci.yml/badge.svg)',
      '[![npm version](https://img.shields.io/npm/v/x)](https://npm.im/x)',
      '<img src="https://avatars.githubusercontent.com/u/1" width="200">',
      '<img src="icon.png" width="32">',
      '<p align="center"><img src="media/logo.svg" alt="logo" width="300"></p>',
      '![Demo](media/demo.gif)',
      '![Screenshot](media/screen.png)',
      '![sponsor](https://opencollective.com/x/sponsors.svg)',
    ].join('\n');
    expect(pickImage(md, root, root)).toEqual({ src: `${root}media/demo.gif`, still: `${root}media/screen.png` });
    expect(pickImage('<img src="logo.png" alt="Project logo" width="240">', root, root)).toEqual({ src: `${root}logo.png` });
    expect(pickImage('![badge](https://img.shields.io/x)', root, root)).toBeNull();
  });
});
