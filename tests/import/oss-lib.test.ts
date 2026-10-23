// 오픈소스·데이터셋·템플릿 가져오기 도우미와 출처별 읽기 함수 (네트워크 없이 작은 글로 확인).
import { describe, expect, it } from 'vitest';
import {
  clip, cleanLicense, githubSlug, isAdult, makeId, makeItem, parseSimpleYaml, readmeFirstParagraph, readmeTitle, slugify,
  summaryOf, tagify, templateKindByText,
} from '../../scripts/import/oss-lib.ts';
import { datasetSummary } from '../../scripts/import/data-hf.ts';
import { parseFileListPage } from '../../scripts/import/data-go-kr.ts';
import { parseCount, parseLibrary } from '../../scripts/import/oss-ollama.ts';
import { forgeKind } from '../../scripts/import/oss-forges.ts';
import { kindForTags } from '../../scripts/import/oss-selfhosted.ts';
import { parseThemeLinks } from '../../scripts/import/tpl-astro.ts';
import { kindFor, parseTemplatePage } from '../../scripts/import/tpl-vercel.ts';

describe('글 다듬기', () => {
  it('slugify와 makeId는 소문자·숫자·점·하이픈만 남기고 owner/repo를 owner--repo로 바꾼다', () => {
    expect(slugify('Hello_World v2.0!')).toBe('hello-world-v2.0');
    expect(makeId('hf-models', 'Qwen/Qwen3-0.6B')).toBe('hf-models:qwen--qwen3-0.6b');
    expect(makeId('npm', 'scope/pkg')).toBe('npm:scope--pkg');
    expect(makeId('x', '...')).toBe('x:item');
  });

  it('clip은 300자 안에서 문장이나 낱말 끝에서 자른다', () => {
    const long = `${'word '.repeat(80)}end.`;
    const out = clip(long);
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out.endsWith('…')).toBe(true);
  });

  it('summaryOf는 마크다운·이모지 단축어를 벗긴다', () => {
    expect(summaryOf(':rocket: **Fast** [docs](https://x.y) `code`')).toBe('Fast docs code');
    expect(summaryOf('')).toBeUndefined();
  });

  it('tagify는 소문자·하이픈으로 맞추고 겹침을 없앤다', () => {
    expect(tagify(['Next.js', 'next.js', 'Web App', undefined, ''])).toEqual(['next.js', 'web-app']);
  });

  it('cleanLicense는 SPDX 표기로 맞추고 의미 없는 값은 버린다', () => {
    expect(cleanLicense('mit')).toBe('MIT');
    expect(cleanLicense('apache-2.0')).toBe('Apache-2.0');
    expect(cleanLicense('other')).toBeUndefined();
    expect(cleanLicense('NOASSERTION')).toBeUndefined();
  });

  it('githubSlug는 저장소 주소만 owner/repo로 읽는다', () => {
    expect(githubSlug('https://github.com/vercel/next.js')).toBe('vercel/next.js');
    expect(githubSlug('https://github.com/a/b.git')).toBe('a/b');
    expect(githubSlug('https://github.com/a/b/tree/main/x')).toBe('a/b');
    expect(githubSlug('https://github.com/topics/react')).toBeUndefined();
    expect(githubSlug('https://gitlab.com/a/b')).toBeUndefined();
  });

  it('isAdult는 성인물 표시와 낱말을 잡는다', () => {
    expect(isAdult(['some/flux-nsfw-model'])).toBe(true);
    expect(isAdult(['clean'], ['not-for-all-audiences'])).toBe(true);
    expect(isAdult(['Essex county data', 'Sussex'])).toBe(false);
    expect(isAdult(['lynansfw/model'])).toBe(true);
    expect(isAdult(['check the eval_results-xxx folder'])).toBe(false);
  });
});

describe('README 읽기', () => {
  const md = [
    '---', 'license: mit', '---', '', '# My Model', '', '[![badge](x)](y)', '',
    '> note', '', 'Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference', '',
    'This model turns plain text into short summaries for news articles.', '', 'More text.',
  ].join('\n');
  it('제목·배지·틀 문장을 건너뛰고 첫 글 문단을 고른다', () => {
    expect(readmeFirstParagraph(md)).toBe('This model turns plain text into short summaries for news articles.');
    expect(readmeTitle(md)).toBe('My Model');
  });
  it('목록을 여는 문장(:로 끝남)은 건너뛴다', () => {
    expect(readmeFirstParagraph("Inside your project, you'll see the following files:\n\nA small starter for building blogs with Astro.")).toBe('A small starter for building blogs with Astro.');
  });
  it('짧거나 목록뿐이면 undefined', () => {
    expect(readmeFirstParagraph('# T\n\n- a\n- b\n')).toBeUndefined();
  });
});

describe('작은 YAML 읽기', () => {
  it('키·목록·한 단계 지도를 읽는다', () => {
    const y = parseSimpleYaml([
      'name: Nextcloud', "updated_at: '2026-10-13'", 'stargazers_count: 37081', 'archived: false',
      'tags:', '  - Groupware', '  - File Transfer', 'current_release:', '  tag: v35', 'Resources:', '  - Type: S3 Bucket', '    Region: us-east-1',
    ].join('\n'));
    expect(y.name).toBe('Nextcloud');
    expect(y.updated_at).toBe('2026-10-13');
    expect(y.stargazers_count).toBe(37081);
    expect(y.archived).toBe(false);
    expect(y.tags).toEqual(['Groupware', 'File Transfer']);
    expect(y.current_release).toEqual({ tag: 'v35' });
    expect(y.Resources).toEqual([{ Type: 'S3 Bucket', Region: 'us-east-1' }]);
  });
  it('맨 위 키의 여러 줄 글(|, >)을 읽는다', () => {
    const y = parseSimpleYaml(['Name: X', 'Description: |', '  First line.', '  Second line.', 'License: >', '  CC BY', '  4.0', 'Tags:', '  - a'].join('\n'));
    expect(y.Description).toBe('First line.\nSecond line.');
    expect(y.License).toBe('CC BY 4.0');
    expect(y.Tags).toEqual(['a']);
  });
});

describe('소분류 고르기', () => {
  it('템플릿: 좁은 쓰임을 먼저 본다', () => {
    expect(templateKindByText('Discord bot starter in TypeScript')).toBe('bot');
    expect(templateKindByText('Chrome extension boilerplate with React')).toBe('extension');
    expect(templateKindByText('Admin dashboard template with charts')).toBe('admin');
    expect(templateKindByText('SaaS starter with Stripe subscriptions')).toBe('saas');
    expect(templateKindByText('A minimal blog theme')).toBe('blog-portfolio');
    expect(templateKindByText('Expo app with tabs')).toBe('mobile');
    expect(templateKindByText('Plain starter')).toBeUndefined();
    expect(templateKindByText('Documentation site built with Docusaurus')).toBe('docs-site');
    expect(templateKindByText('A Next.js app. See the documentation to learn more.')).toBeUndefined();
  });
  it('템플릿: AI는 뚜렷한 말이나 이름에 있을 때만', () => {
    expect(templateKindByText('An AI chatbot built with the Vercel AI SDK')).toBe('ai-app');
    expect(templateKindByText('Starter with dark mode, AI-ready, Tailwind')).toBeUndefined();
    expect(templateKindByText('Nova starter for agencies', 'Nova AI')).toBe('ai-app');
  });
  it('오픈소스(GitLab·Codeberg): 낱말로 고른다', () => {
    expect(forgeKind('A Telegram bot for reminders')).toBe('bots');
    expect(forgeKind('Godot game about cats')).toBe('games');
    expect(forgeKind('Command-line tool for notes')).toBe('cli');
    expect(forgeKind('A library for parsing')).toBe('projects');
  });
  it('awesome-selfhosted 꼬리표 → 소분류', () => {
    expect(kindForTags(['Blogging Platforms'])).toBe('cms');
    expect(kindForTags(['E-commerce'])).toBe('ecommerce');
    expect(kindForTags(['Generative Artificial Intelligence (GenAI)'])).toBe('ai-apps');
    expect(kindForTags(['Games'])).toBe('games');
    expect(kindForTags(['Analytics'])).toBe('apps');
  });
});

describe('출처별 읽기', () => {
  it('Hugging Face 데이터셋 설명: 링크·제목 줄을 건너뛴 첫 문장 줄', () => {
    const d = '\n\t\n\t\tFineWeb\n\t\nPaper: https://x\nFineWeb is a large dataset of cleaned English web pages for pretraining.\nmore';
    expect(datasetSummary(d)).toBe('FineWeb is a large dataset of cleaned English web pages for pretraining.');
    expect(datasetSummary(undefined)).toBeUndefined();
  });

  it('공공데이터포털 파일데이터 목록 쪽', () => {
    const html = `파일데이터 <span>87,325건</span>
      <div class="apply-result-item"><div class="apply-result-category"><span class="b">산업고용</span><span class="b">공공기관</span></div>
      <span class="krds-badge file-ext-css" data-ext="CSV"> CSV </span>
      <a href="/data/3072637/fileData.do"> 장애인 구인 정보 </a>
      <span class="apply-result-summary"> 구인 데이터 </span>
      <ul><li><strong>제공기관</strong> 한국장애인고용공단 </li><li><strong>수정일</strong> 2026-08-10 </li>
      <li><strong>조회수</strong> 36,663건 </li><li><strong>다운로드</strong> 73,264건 </li><li><strong>키워드</strong> 장애인,구인 </li></ul></div>`;
    const p = parseFileListPage(html);
    expect(p.total).toBe(87325);
    expect(p.items[0]).toMatchObject({ pk: '3072637', title: '장애인 구인 정보', downloads: 73264, views: 36663, formats: ['CSV'], keywords: ['장애인', '구인'], updatedAt: '2026-08-10' });
  });

  it('Ollama 목록 쪽과 수 읽기', () => {
    expect(parseCount('120.3M')).toBe(120_300_000);
    expect(parseCount('93')).toBe(93);
    const html = `<li  class="flex items-baseline border-b"><a href="/library/llama3.1"><p class="max-w-lg text-md">Llama 3.1 from Meta.</p>
      <span class="inline-flex items-center rounded-md bg-indigo-50 text-indigo-600">tools</span>
      <span class="inline-flex items-center rounded-md bg-[#ddf4ff] text-blue-600">8b</span>
      <span >120.3M</span> <span class="hidden sm:flex">&nbsp;Pulls</span><span >93</span> <span class="hidden sm:flex">&nbsp;Tags</span>
      <span class="flex items-center" title="Nov 30, 2024 10:34 PM UTC"></span></a></li>`;
    expect(parseLibrary(html)).toEqual([{ name: 'llama3.1', description: 'Llama 3.1 from Meta.', capabilities: ['tools'], sizes: ['8b'], pulls: 120_300_000, tags: 93, updated: 'Nov 30, 2024' }]);
  });

  it('Astro 테마 쪽의 저장소·데모 링크', () => {
    const html = '<a href="https://github.com/withastro/astro">x</a><a href="https://demo.example/">Live demo</a><a href="https://github.com/me/theme">Get started</a>';
    expect(parseThemeLinks(html)).toEqual({ repo: 'https://github.com/me/theme', demo: 'https://demo.example/' });
  });

  it('Vercel 템플릿 쪽의 fields·꼬리표와 소분류', () => {
    const html = String.raw`<meta name="description" content="d"/>\"fields\":{\"cdnRoutingRuleHref\":\"\",\"demoUrl\":\"https://demo\",\"description\":\"A Slack bot agent built with Bolt.\",\"githubUrl\":\"https://github.com/a/b\",\"name\":\"Slack Agent\",\"slug\":\"slack-agent\",\"thumbnailUrl\":\"//img/x.png\"}`
      + '<span class="text-gray-1000 text-md shrink-0 font-medium">Use Cases</span><a href="../ai">AI</a><span class="text-gray-1000 text-md shrink-0 font-medium">Stack</span><a href="../nitro">Nitro</a>';
    const t = parseTemplatePage(html, 'https://vercel.com/templates/ai/slack-agent', 'ai/slack-agent');
    expect(t).toMatchObject({ name: 'Slack Agent', githubUrl: 'https://github.com/a/b', demoUrl: 'https://demo', thumbnailUrl: 'https://img/x.png', useCases: ['ai'], stack: ['nitro'] });
    expect(t && kindFor(t)).toBe('bot');
  });
});

describe('상품 모양', () => {
  it('makeItem은 키 순서를 고정하고 빈 값을 버린다', () => {
    const it1 = makeItem({
      id: 'x:a', name: ' A ', kind: 'models', category: 'opensource', summary: 's', url: 'https://a', source: { name: 'X', url: 'https://x' },
      tags: ['b', 'a', 'a'], metrics: { stars: 1, downloads: undefined }, use: { install: undefined },
    });
    expect(Object.keys(it1)).toEqual(['id', 'name', 'kind', 'category', 'summary', 'url', 'source', 'metrics', 'tags', 'fetchedAt']);
    expect(it1.name).toBe('A');
    expect(it1.tags).toEqual(['a', 'b']);
    expect(it1.metrics).toEqual({ stars: 1 });
  });
});
