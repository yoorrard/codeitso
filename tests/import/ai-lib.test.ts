// AI 확장 가져오기 도우미 시험: 머리말·CSV 읽기, 글 자르기, 주소 다루기, 상품 모양, 중복 정리, 목록 파싱.
import { describe, expect, it } from 'vitest';
import {
  clip, dedupeAcross, dedupeKey, githubSlug, makeItem, normalizeLicense, parseCsv, parseYaml, splitFrontMatter, textKey, uniqTags, uniqueIds,
} from '../../scripts/import/ai-lib.ts';
import { dockerItem, installFor, officialItem, parseAwesomeMcp, snippetFor } from '../../scripts/import/ai-mcp.ts';
import { licenseFromText, parseAwesomeSkills } from '../../scripts/import/ai-skills.ts';
import { cursorrulesNames, FORMATS } from '../../scripts/import/ai-rules.ts';
import { pluginUrl } from '../../scripts/import/ai-plugins.ts';
import { buildIndex } from '../../scripts/import/ai-index.ts';
import { promptsChatItem } from '../../scripts/import/ai-prompts.ts';

const src = { name: 'Test', url: 'https://example.com' };

describe('머리말(YAML) 읽기', () => {
  it('SKILL.md 머리말의 따옴표·블록 글·목록을 읽는다', () => {
    const md = [
      '---',
      'name: claude-api',
      'description: |-',
      '  Reference for the Claude API.',
      '  TRIGGER — read BEFORE opening.',
      'license: "Apache-2.0"',
      'tags: [api, "sdk"]',
      'metadata:',
      '  version: 1.2',
      '  authors:',
      '    - a',
      '    - b',
      '---',
      '# body',
    ].join('\n');
    const { data, body } = splitFrontMatter(md);
    expect(data.name).toBe('claude-api');
    expect(data.description).toBe('Reference for the Claude API.\nTRIGGER — read BEFORE opening.');
    expect(data.license).toBe('Apache-2.0');
    expect(data.tags).toEqual(['api', 'sdk']);
    expect(data.metadata).toEqual({ version: 1.2, authors: ['a', 'b'] });
    expect(body.trim()).toBe('# body');
  });

  it('접힌 블록(>)과 여러 줄 평문을 한 줄로 잇는다', () => {
    const y = parseYaml('a: >\n  one\n  two\nb: plain\n  continued\nc: "x: y"\n') as Record<string, unknown>;
    expect(y.a).toBe('one two');
    expect(y.b).toBe('plain continued');
    expect(y.c).toBe('x: y');
  });

  it('"- 키: 값" 꼴 목록 항목을 맵으로 읽는다 (server.yaml의 secrets)', () => {
    const y = parseYaml('config:\n  secrets:\n    - name: k.api\n      env: API_KEY\n    - name: k.two\n      env: TWO\n') as { config: { secrets: { env: string }[] } };
    expect(y.config.secrets.map((s) => s.env)).toEqual(['API_KEY', 'TWO']);
  });

  it('머리말이 없으면 빈 값과 본문 전체를 돌려준다', () => {
    expect(splitFrontMatter('# hi').data).toEqual({});
  });
});

describe('CSV', () => {
  it('따옴표 안의 쉼표·줄바꿈·이중 따옴표를 지킨다', () => {
    const rows = parseCsv('act,prompt\nA,"one, two\nthree ""q"""\nB,plain\n');
    expect(rows).toEqual([{ act: 'A', prompt: 'one, two\nthree "q"' }, { act: 'B', prompt: 'plain' }]);
  });
});

describe('글 다듬기', () => {
  it('300자 안으로 자르고 링크·그림·강조 표시를 지운다', () => {
    const long = `**Bold** [link](https://x.y) ![img](a.png) ${'word '.repeat(100)}`;
    const out = clip(long);
    expect([...out].length).toBeLessThanOrEqual(300);
    expect(out.startsWith('Bold link')).toBe(true);
    expect(out.endsWith('…')).toBe(true);
  });

  it('태그를 소문자 하이픈 꼴로 맞추고 겹침을 없앤다', () => {
    expect(uniqTags(['Developer Tools', 'developer-tools', null, 'C#', ''])).toEqual(['c#', 'developer-tools']);
  });
});

describe('주소와 라이선스', () => {
  it('GitHub 주소에서 owner/repo를 뽑는다', () => {
    expect(githubSlug('https://github.com/a/b/tree/main/x')).toBe('a/b');
    expect(githubSlug('git+https://github.com/a/b.git')).toBe('a/b');
    expect(githubSlug('https://gitlab.com/a/b')).toBeUndefined();
  });

  it('중복 열쇠는 저장소와 하위 경로를 소문자로 묶는다', () => {
    expect(dedupeKey('https://github.com/A/B', 'src/X/')).toBe('gh:a/b/src/x');
    expect(dedupeKey('https://Example.com/x/')).toBe('example.com/x');
  });

  it('라이선스 이름을 SPDX로 맞추고 모르는 것은 비운다', () => {
    expect(normalizeLicense('mit')).toBe('MIT');
    expect(normalizeLicense('MIT License')).toBe('MIT');
    expect(normalizeLicense('Apache License 2.0')).toBe('Apache-2.0');
    expect(normalizeLicense('other')).toBeUndefined();
    expect(normalizeLicense('Complete terms in LICENSE.txt')).toBeUndefined();
    expect(licenseFromText('                                 Apache License\n                           Version 2.0, January 2004')).toBe('Apache-2.0');
    expect(licenseFromText('© Anthropic. All rights reserved.')).toBeUndefined();
  });
});

describe('상품 모양', () => {
  it('정해진 모양으로 만들고 빈 값은 뺀다', () => {
    const it = makeItem({
      sourceId: 'mcp-test', slug: 'Io.GitHub/Foo Bar', name: 'Foo', kind: 'mcp', summary: 'x', url: 'https://x', source: src,
      license: 'mit', metrics: { stars: 3, downloads: Number.NaN }, tags: ['B', 'a'], preview: { type: 'mcp', tools: [], version: '' },
      use: { install: undefined },
    });
    expect(it).toEqual({
      id: 'mcp-test:io-github-foo-bar', name: 'Foo', kind: 'mcp', category: 'ai', summary: 'x', url: 'https://x', source: src,
      license: 'MIT', metrics: { stars: 3 }, tags: ['a', 'b'], preview: { type: 'mcp' }, fetchedAt: it.fetchedAt,
    });
  });

  it('겹치는 id에는 번호를 붙인다', () => {
    const a = makeItem({ sourceId: 's', slug: 'x', name: 'x', kind: 'skill', summary: '', url: 'https://x', source: src });
    const b = makeItem({ sourceId: 's', slug: 'x', name: 'x', kind: 'skill', summary: '', url: 'https://y', source: src });
    expect(uniqueIds([a, b]).map((i) => i.id)).toEqual(['s:x', 's:x-2']);
  });

  it('앞 출처가 이기고, 뒤 출처의 인기 지표는 빈 칸만 채운다', () => {
    const a = makeItem({ sourceId: 'a', slug: 'x', name: 'x', kind: 'mcp', summary: '', url: 'https://github.com/o/r', source: src, metrics: { updatedAt: '2026-01-01' } });
    const b = makeItem({ sourceId: 'b', slug: 'x', name: 'x', kind: 'mcp', summary: '', url: 'https://github.com/O/R', source: src, metrics: { stars: 9, updatedAt: '2025-01-01' } });
    const c = makeItem({ sourceId: 'b', slug: 'y', name: 'y', kind: 'mcp', summary: '', url: 'https://github.com/o/other', source: src });
    const key = (i: { url: string }) => dedupeKey(i.url);
    const [ka, kb] = dedupeAcross([{ key, items: [a] }, { key, items: [b, c] }]);
    expect(ka?.map((i) => i.id)).toEqual(['a:x']);
    expect(kb?.map((i) => i.id)).toEqual(['b:y']);
    expect(a.metrics).toEqual({ stars: 9, updatedAt: '2026-01-01' });
  });

  it('모음 출처끼리는 별을 옮기지 않고, 열쇠가 여러 개면 하나만 겹쳐도 같은 재료다', () => {
    const a = makeItem({ sourceId: 'a', slug: 'x', name: 'x', kind: 'skill', summary: 'Same text that is long enough to make a key for matching.', url: 'https://a', source: src });
    const b = makeItem({ sourceId: 'b', slug: 'x', name: 'x', kind: 'skill', summary: 'Same text that is long enough to make a key for matching.', url: 'https://b', source: src, metrics: { stars: 99, downloads: 5 } });
    const [, kb] = dedupeAcross([{ key: (i) => [i.url, textKey(i)], items: [a] }, { key: (i) => [i.url, textKey(i)], items: [b] }], { mergeStars: false });
    expect(kb).toEqual([]);
    expect(a.metrics).toEqual({ downloads: 5 });
  });
});

describe('MCP 출처 읽기', () => {
  it('공식 등록소 server.json에서 설치 명령과 설정 조각을 만든다', () => {
    const it = officialItem({
      server: {
        name: 'io.github.acme/weather', title: 'Weather', description: 'Weather tools', version: '1.0.0',
        repository: { url: 'https://github.com/acme/weather', source: 'github' },
        packages: [{ registryType: 'npm', identifier: '@acme/weather-mcp', version: '1.0.0', transport: { type: 'stdio' }, environmentVariables: [{ name: 'API_KEY', isSecret: true }, { name: 'OPTIONAL' }] }],
      },
      _meta: { 'io.modelcontextprotocol.registry/official': { status: 'active', updatedAt: '2026-05-01T00:00:00Z' } },
    });
    expect(it?.url).toBe('https://github.com/acme/weather');
    expect(it?.use?.install).toBe('npx -y @acme/weather-mcp');
    expect(JSON.parse(it?.use?.snippet ?? '{}')).toEqual({ mcpServers: { weather: { command: 'npx', args: ['-y', '@acme/weather-mcp'], env: { API_KEY: '' } } } });
    expect(it?.metrics?.updatedAt).toBe('2026-05-01');
  });

  it('지워진(deleted) 서버는 싣지 않는다', () => {
    expect(officialItem({ server: { name: 'x/y' }, _meta: { 'io.modelcontextprotocol.registry/official': { status: 'deleted' } } })).toBeUndefined();
  });

  it('원격 서버는 주소로 설정 조각을 만든다', () => {
    expect(JSON.parse(snippetFor('com.acme/mcp', undefined, 'https://mcp.acme.com', 'streamable-http') ?? '')).toEqual({ mcpServers: { mcp: { type: 'http', url: 'https://mcp.acme.com' } } });
    expect(installFor({ registry: 'pypi', name: 'mcp-server-time' })).toBe('uvx mcp-server-time');
  });

  it('Docker server.yaml을 읽고, 보관된 서버는 뺀다', () => {
    const y = parseYaml('name: airtable\nimage: mcp/airtable\ntype: server\nmeta:\n  category: productivity\n  tags:\n    - productivity\nabout:\n  title: Airtable\n  description: Access Airtable.\nsource:\n  project: https://github.com/d/airtable-mcp-server\nconfig:\n  secrets:\n    - name: a.key\n      env: AIRTABLE_API_KEY\n') as Record<string, never>;
    const it = dockerItem(y, 'airtable');
    expect(it?.use?.install).toBe('docker run -i --rm mcp/airtable');
    expect(it?.preview?.requiresKey).toBe(true);
    const archived = parseYaml('name: s\ntype: server\nabout:\n  title: SQLite (Archived)\n') as Record<string, never>;
    expect(dockerItem(archived, 's')).toBeUndefined();
  });

  it('awesome-mcp-servers 줄에서 이름·주소·설명·표시를 읽는다', () => {
    const readme = [
      '## Server Implementations',
      '### 🔗 <a name="aggregators"></a>Aggregators',
      '- [a/b](https://github.com/a/b) [![badge](https://glama.ai/x.svg)](https://glama.ai/x) 📇 ☁️ 🏠 - Does things - well.',
      '## Frameworks',
      '- [c/d](https://github.com/c/d) - not a server',
    ].join('\n');
    expect(parseAwesomeMcp(readme)).toEqual([{ name: 'a/b', url: 'https://github.com/a/b', desc: 'Does things - well.', section: 'Aggregators', tags: ['typescript', 'cloud', 'local'] }]);
  });
});

describe('스킬·규칙·플러그인 목록 읽기', () => {
  it('awesome-agent-skills 줄에서 저장소와 스킬 이름을 읽는다', () => {
    const rows = parseAwesomeSkills('### Official Skills by Anthropic\n- **[anthropics/docx](https://officialskills.sh/anthropics/skills/docx)** - Create Word documents\n');
    expect(rows).toEqual([{ owner: 'anthropics', repo: 'skills', skill: 'docx', name: 'anthropics/docx', url: 'https://officialskills.sh/anthropics/skills/docx', desc: 'Create Word documents', section: 'Official Skills by Anthropic' }]);
  });

  it('awesome-cursorrules README에서 이름과 설명을 짝짓는다', () => {
    const m = cursorrulesNames('- [Angular (TypeScript)](https://github.com/PatrickJS/awesome-cursorrules/blob/main/rules/angular-typescript-cursorrules-prompt-file.mdc) - Angular with TS.');
    expect(m.get('rules/angular-typescript-cursorrules-prompt-file.mdc')).toEqual({ name: 'Angular (TypeScript)', desc: 'Angular with TS.' });
  });

  it('형식 안내는 공식 문서 주소(https)와 한국어 설명을 갖는다', () => {
    for (const f of FORMATS) {
      expect(f.docs.startsWith('https://')).toBe(true);
      expect(f.ko.endsWith('다.')).toBe(true);
    }
  });

  it('marketplace.json의 source 꼴마다 열어 볼 주소를 만든다', () => {
    expect(pluginUrl('o/r', 'main', { name: 'p', source: './plugins/p' }).url).toBe('https://github.com/o/r/tree/main/plugins/p');
    expect(pluginUrl('o/r', 'main', { name: 'p', source: { source: 'github', repo: 'x/y' } }).url).toBe('https://github.com/x/y');
    expect(pluginUrl('o/r', 'main', { name: 'p', source: { source: 'git-subdir', url: 'https://github.com/x/y.git', path: 'plugins/z', ref: 'v1' } }).url).toBe('https://github.com/x/y/tree/v1/plugins/z');
  });

  it('prompts.chat에서 내려진 프롬프트는 뺀다', () => {
    expect(promptsChatItem({ id: '1', title: 'T', content: 'c', delistReason: 'spam' })).toBeUndefined();
    expect(promptsChatItem({ id: '2', title: 'T', content: 'c', voteCount: 4 })?.metrics?.likes).toBe(4);
  });
});

describe('색인', () => {
  it('소분류마다 출처 파일의 개수를 더한다', () => {
    const file = (id: string, kind: string, n: number) => ({
      file: `${id}.json`,
      data: { source: { id, name: id, url: 'https://x', kind, license: 'MIT' }, fetchedAt: '2026-10-14', count: n, available: n + 1, items: Array.from({ length: n }, () => ({}) as never) },
    });
    const idx = buildIndex([file('mcp-a', 'mcp', 2), file('mcp-b', 'mcp', 3), file('skill-a', 'skill', 1)], '2026-10-14');
    expect(idx.count).toBe(6);
    const mcp = idx.subcategories.find((s) => s.id === 'mcp');
    expect(mcp?.count).toBe(5);
    expect(mcp?.sources.map((s) => s.id)).toEqual(['mcp-b', 'mcp-a']);
  });
});
