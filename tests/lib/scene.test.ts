// 그림 없는 상품의 장면 (src/lib/catalog/scene.ts)과 README 첫 그림·아바타 빼기 (core.ts thumbOf, hosts.ts) — v5.1 D126.
import { describe, expect, it } from 'vitest';
import { thumbOf, withMedia } from '../../src/lib/catalog/core.ts';
import { blockedImage } from '../../src/lib/catalog/hosts.ts';
import { SCENES, sceneLabel, sceneOf, sceneShapes, sceneWords } from '../../src/lib/catalog/scene.ts';
import type { CatalogItem } from '../../src/lib/catalog/types.ts';

function item(extra: Partial<CatalogItem> & { preview: CatalogItem['preview'] }): CatalogItem {
  return { id: 'x:a', name: 'owner/cool-app', kind: 'apps', category: 'opensource', summary: '', url: 'https://github.com/owner/cool-app', source: { name: 's', url: 'https://example.org' }, tags: [], fetchedAt: '2026-10-20', ...extra };
}

describe('장면 고르기', () => {
  it('소분류로 고르고, 넓은 소분류는 주제(태그)로 다시 고른다', () => {
    expect(sceneOf(item({ kind: 'cli', preview: { type: 'repo' } }))).toBe('cli');
    expect(sceneOf(item({ category: 'templates', kind: 'blog-portfolio', preview: { type: 'template' } }))).toBe('blog');
    expect(sceneOf(item({ kind: 'apps', tags: ['discord', 'bot'], preview: { type: 'repo' } }))).toBe('bot');
    expect(sceneOf(item({ kind: 'apps', tags: ['grafana'], preview: { type: 'repo' } }))).toBe('dashboard');
    expect(sceneOf(item({ kind: 'apps', preview: { type: 'repo' } }))).toBe('dashboard');
    expect(sceneOf(item({ category: 'ai', kind: 'workflow', preview: { type: 'template', nodes: ['Schedule', 'Google Sheets'] } }))).toBe('flow');
  });

  it('모델·데이터셋은 작업으로: 번역·탐지·임베딩·음성·분류·그림·표, 모르면 대화·표', () => {
    const model = (task: string): string | null => sceneOf(item({ kind: 'models', preview: { type: 'model', task } }));
    expect(model('translation')).toBe('translate');
    expect(model('object-detection')).toBe('detect');
    expect(model('sentence-similarity')).toBe('scatter');
    expect(model('automatic-speech-recognition')).toBe('audio');
    expect(model('text-classification')).toBe('labels');
    expect(model('text-to-image')).toBe('image');
    expect(model('text-generation')).toBe('chat');
    expect(model('')).toBe('chat');
    expect(sceneOf(item({ category: 'datasets', kind: 'ai-training', preview: { type: 'dataset', tasks: ['image-classification'] } }))).toBe('labels');
    expect(sceneOf(item({ category: 'datasets', kind: 'kr-public', preview: { type: 'dataset' } }))).toBe('table');
    expect(sceneOf(item({ category: 'datasets', kind: 'world-stats', preview: { type: 'dataset' } }))).toBe('chart');
  });

  it('폰트·API·MCP·스킬처럼 자기 견본이 있는 종류는 장면을 그리지 않는다', () => {
    for (const type of ['font', 'api', 'mcp', 'skill', 'prompt', 'palette']) expect(sceneOf(item({ category: 'ai', kind: 'mcp', preview: { type } }))).toBeNull();
  });

  it('장면에 이름·노드·언어를 넣고, 같은 상품은 늘 같은 도형, 모든 장면이 그려진다', () => {
    expect(sceneLabel('owner/a-very-long-repository-name')).toBe('a-very-long-repos…');
    expect(sceneWords(item({ category: 'ai', kind: 'workflow', preview: { type: 'template', nodes: ['Schedule', 'Schedule', 'Google Sheets'] } }), 'flow')).toEqual(['Schedule', 'Google S…']);
    for (const s of SCENES) {
      const a = sceneShapes(s, 'demo', ['Python']);
      expect(a.length).toBeGreaterThan(5);
      expect(sceneShapes(s, 'demo', ['Python'])).toEqual(a);
      for (const x of a) if (x.k !== 'p' && x.k !== 't') expect(Number.isFinite(x.x) && Number.isFinite(x.y)).toBe(true);
    }
    expect(JSON.stringify(sceneShapes('cli', 'ripgrep'))).toContain('$ ripgrep --help');
  });
});

describe('저장소 그림', () => {
  it('주인 아바타·저장소 소개 카드·배지·방문 수 세기는 부르지 않는다', () => {
    expect(blockedImage('https://avatars.githubusercontent.com/u/1?v=4')).toBe(true);
    expect(blockedImage('https://opengraph.githubassets.com/1/a/b')).toBe(true);
    expect(blockedImage('https://img.shields.io/badge/x-y-blue')).toBe(true);
    expect(blockedImage('https://github.com/a/b/actions/workflows/ci.yml/badge.svg')).toBe(true);
    expect(blockedImage('https://komarev.com/ghpvc/?username=x')).toBe(true);
    expect(blockedImage('https://raw.githubusercontent.com/a/b/HEAD/shot.png')).toBe(false);
    const repo = thumbOf(item({ preview: { type: 'repo', image: 'https://opengraph.githubassets.com/1/owner/cool-app' } }));
    expect(repo).toEqual({ t: 'scene', scene: 'dashboard', label: 'cool-app' });
  });

  it('README 첫 그림을 쓰고, 못 받으면 장면이 대신 보인다. 카드는 GIF 대신 멈춘 그림(없으면 장면), 상세는 GIF', () => {
    const png = withMedia(item({ preview: { type: 'repo' } }), 'https://raw.githubusercontent.com/o/r/HEAD/shot.png');
    expect(thumbOf(png)).toEqual({ t: 'img', src: 'https://raw.githubusercontent.com/o/r/HEAD/shot.png', fit: 'contain', label: 'cool-app', scene: 'dashboard' });
    const gif = withMedia(item({ preview: { type: 'repo' } }), 'https://x.example/demo.gif', 'https://x.example/still.png');
    expect(thumbOf(gif)).toMatchObject({ t: 'img', src: 'https://x.example/still.png' });
    expect(thumbOf(gif, 8, true)).toMatchObject({ t: 'img', src: 'https://x.example/demo.gif' });
    expect(thumbOf(withMedia(item({ preview: { type: 'repo' } }), 'https://x.example/demo.gif')).t).toBe('scene');
    // 갤러리의 화면 갈무리가 README 그림보다 먼저다
    const shot = withMedia(item({ category: 'templates', kind: 'landing', preview: { type: 'template', image: 'https://cdn.example.org/a.png' } }), 'https://x.example/r.png');
    expect(thumbOf(shot)).toMatchObject({ t: 'img', src: 'https://cdn.example.org/a.png', fit: 'cover' });
  });
});
