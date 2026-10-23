// 상세 종류별 미리 보기 자료 (src/lib/catalog/preview.ts) + 폰트 견본 주소(core.ts thumbOf, hosts.ts).
import { describe, expect, it } from 'vitest';
import { thumbOf } from '../../src/lib/catalog/core.ts';
import { allowedUrl, FONT_CSS_HOSTS } from '../../src/lib/catalog/hosts.ts';
import { apiInfo, colorScales, fontInfo, mcpInfo, safeCssValue, statsOf, styleSample, wcagGrade } from '../../src/lib/catalog/preview.ts';
import type { CatalogItem } from '../../src/lib/catalog/types.ts';

function item(preview: CatalogItem['preview'], extra: Partial<CatalogItem> = {}): CatalogItem {
  return { id: 'x:y', name: 'X', kind: 'k', category: 'design', summary: '', url: 'https://example.org', source: { name: 's', url: 'https://example.org' }, tags: [], preview, fetchedAt: '2026-10-14', ...extra };
}

describe('색 대비 등급과 스타일 값', () => {
  it('WCAG 등급: 7 AAA · 4.5 AA · 3 큰 글자 · 그 밑 부족', () => {
    expect([7, 6.99, 4.5, 3, 2.99].map(wcagGrade)).toEqual(['aaa', 'aa', 'aa', 'large', 'fail']);
  });

  it('스타일 견본에 칠할 값은 바깥 주소·여러 속성 끼워 넣기를 막는다', () => {
    expect(safeCssValue('radial-gradient(60% 50% at 25% 20%, rgba(124,58,237,.55), transparent), #05060f')).toBeDefined();
    expect(safeCssValue('system-ui, "Segoe UI", sans-serif')).toBeDefined();
    expect(safeCssValue('url(https://evil.example/x.png)')).toBeUndefined();
    expect(safeCssValue('red; position: fixed')).toBeUndefined();
    expect(safeCssValue('}body{display:none')).toBeUndefined();
    const s = styleSample(item({ type: 'style', tokens: { bg: '#05060f', text: '#f5f7ff', primary: '#a78bfa', radius: 14, background: 'url(x)' } }));
    expect(s).toMatchObject({ bg: '#05060f', text: '#f5f7ff', primary: '#a78bfa', radius: '14px', surface: '#05060f' });
    expect(s?.background).toBeUndefined();
    expect(styleSample(item({ type: 'style', tokens: { bg: '#000' } }))).toBeNull();
  });
});

describe('폰트', () => {
  it('견본 글꼴 주소는 허락한 CDN만, 사이트 글꼴과 같은 이름은 부르지 않는다', () => {
    const g = thumbOf(item({ type: 'font', family: 'Roboto', cssUrl: 'https://fonts.googleapis.com/css2?family=Roboto' }));
    expect(g).toMatchObject({ t: 'font', css: 'https://fonts.googleapis.com/css2?family=Roboto' });
    const bad = thumbOf(item({ type: 'font', family: 'X', cssUrl: 'https://evil.example/x.css', fileUrl: 'https://evil.example/x.woff2' }));
    expect(bad).toEqual({ t: 'font', family: 'X', generic: 'sans-serif', ko: false });
    const file = thumbOf(item({ type: 'font', family: 'Geist', fileUrl: 'https://cdn.jsdelivr.net/fontsource/fonts/geist@latest/latin-400-normal.woff2' }));
    expect(file).toMatchObject({ file: 'https://cdn.jsdelivr.net/fontsource/fonts/geist@latest/latin-400-normal.woff2' });
    expect(thumbOf(item({ type: 'font', family: 'Pretendard Variable', cssUrl: 'https://cdn.jsdelivr.net/x.css' }))).not.toHaveProperty('css');
    expect(allowedUrl('http://fonts.googleapis.com/x', FONT_CSS_HOSTS)).toBeNull();
  });

  it('굵기·가변 축·글자·디자이너', () => {
    const f = fontInfo(item({ type: 'font', weights: [400, 700], axes: [{ tag: 'wght', min: 100, max: 900 }], italic: true, subsets: ['latin', 'korean'], designers: ['A'] }));
    expect(f).toEqual({ weights: [400, 700], axes: [{ tag: 'wght', min: 100, max: 900 }], italic: true, subsets: ['latin', 'korean'], designers: ['A'] });
    expect(fontInfo(item({ type: 'api' }))).toBeNull();
  });
});

describe('API·MCP·한눈에 칸', () => {
  it('API: 있는 값만, 무료 한도 원문과 확인한 날, https 주소만', () => {
    const a = apiInfo(item({ type: 'api', auth: 'apiKey', https: true, cors: 'no', freeTierQuote: 'Free 5M chars.', freeTierCheckedAt: '2026-10-14', pricingUrl: 'javascript:alert(1)', keyServerSide: true, env: ['X_KEY'] }));
    expect(a).toMatchObject({ auth: 'apiKey', https: true, cors: 'no', freeQuote: 'Free 5M chars.', freeCheckedAt: '2026-10-14', keyServerSide: true, env: ['X_KEY'] });
    expect(a?.pricingUrl).toBeUndefined();
  });

  it('MCP: 원격 주소·패키지·등록 이름', () => {
    const m = mcpInfo(item({ type: 'mcp', transports: ['stdio'], packages: [{ name: 'pretrip-mcp', registry: 'npm' }], remotes: [{ url: 'https://x.example/mcp' }], registryName: 'a.b/c', requiresKey: true }));
    expect(m).toEqual({ transports: ['stdio'], remotes: ['https://x.example/mcp'], packages: ['npm: pretrip-mcp'], registry: 'a.b/c', requiresKey: true });
  });

  it('MCP: 보일 연결 정보가 하나도 없으면 null (빈 칸을 그리지 않는다)', () => {
    expect(mcpInfo(item({ type: 'mcp', agent: 'claude-code', category: 'audio', component: 'mcp' }))).toBeNull();
    expect(mcpInfo(item({ type: 'mcp', requiresKey: true }))).not.toBeNull();
  });

  it('저장소·데이터셋·에셋 한눈에 칸은 있는 값만', () => {
    expect(statsOf(item({ type: 'repo', language: 'TypeScript', version: '1.2.0' }))).toEqual([
      ['language', 'TypeScript'],
      ['version', '1.2.0'],
    ]);
    expect(statsOf(item({ type: 'dataset', rows: 12000, usability: 0.876 }))).toEqual([
      ['rows', '12,000'],
      ['usability', '0.88'],
    ]);
    expect(statsOf(item({ type: 'asset', format: 'hdri', maxResolution: [24576, 12288] }))).toEqual([
      ['format', 'hdri'],
      ['resolution', '24576×12288'],
    ]);
  });

  it('색 단계표는 #RRGGBB만', () => {
    const s = colorScales(item({ type: 'palette', scales: [{ name: 'red', steps: [{ step: '1', hex: '#fff1f0' }, { step: '2', hex: 'red' }] }, { name: 'none', steps: [] }] }));
    expect(s).toEqual([{ name: 'red', steps: [{ step: '1', hex: '#fff1f0' }] }]);
  });
});
