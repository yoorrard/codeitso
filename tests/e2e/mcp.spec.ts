// AI 에이전트 연결 (D154): ① 공식 MCP 클라이언트로 빌드한 진짜 진열대(dist/)를 Worker 처리기에 물려 도구를 모두 불러 본다.
// ② /connect 쪽: MCP 주소·복사·앱별 설정·한 번에 설치 링크·처리방침 항목, 장바구니의 연결 안내, 바닥글 링크.
import { readFile } from 'node:fs/promises';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { MCP_TOOLS } from '../../src/copy/mcp.ts';
import { handleMcp } from '../../worker/mcp.ts';
import { blockExternal, islandsReady } from './helpers.ts';

const DIST = new URL('../../dist/', import.meta.url);

test.describe('MCP 서버 (빌드한 진열대)', () => {
  test('공식 클라이언트: 도구 일곱을 실제 자료로 부르면 오류 없이 답하고, 장바구니 링크의 재료를 가져온다', async () => {
    const env = {
      ASSETS: {
        fetch: async (req: Request): Promise<Response> => {
          try {
            return new Response(await readFile(new URL(`.${new URL(req.url).pathname}`, DIST)));
          } catch {
            return new Response('not found', { status: 404 });
          }
        },
      },
    };
    const fetchLike = async (input: string | URL | Request, init?: RequestInit): Promise<Response> =>
      // 시험용 가짜 정적 파일 묶음은 fetch만 흉내 낸다
      handleMcp(new Request(input, init), env as unknown as Parameters<typeof handleMcp>[1], () => {}, Date.now());
    const client = new Client({ name: 'e2e', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL('https://codeitso.example/mcp'), { fetch: fetchLike }));
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(Object.values(MCP_TOOLS).map((t) => t.name).sort());

    const text = async (name: string, args: Record<string, unknown>): Promise<string> => {
      const r = await client.callTool({ name, arguments: args });
      expect(r.isError, `${name} ${JSON.stringify(args)}`).toBeFalsy();
      return (r.content as { type: string; text: string }[]).map((c) => c.text).join('\n');
    };
    expect(await text('codeitso_search', { query: '급식 API', limit: 3 })).toContain('급식');
    expect(await text('codeitso_search', { query: 'weather', category: 'api', limit: 3 })).toContain('API >');
    const roboto = await text('codeitso_get_materials', { ids: ['google-fonts:roboto'] });
    expect(roboto).toContain('fonts.google.com');
    // 폰트 정보 (굵기·한글 글자 묶음, D157)
    expect(roboto).toContain('Font: weights 100, 200');
    expect(roboto).toContain('Korean glyphs: no');
    expect(await text('codeitso_browse', {})).toContain('`design`');
    expect(await text('codeitso_browse', { category: 'ai', subcategory: 'mcp', limit: 3 })).toContain('sorted by popular');
    expect(await text('codeitso_get_kits', {})).toContain('starter kits');
    const cart = await text('codeitso_open_cart', { share: 'https://codeitso.yoorrard.workers.dev/cart#s=google-fonts%3Aroboto' });
    expect(cart).toContain('Roboto');
    // AI 모델 찾기: 실제 models.dev 자료로 이미지 입력·싼 순 (D156)
    const models = await text('codeitso_find_models', { inputs: ['image'], sort: 'input_price', limit: 3 });
    expect(models).toContain('models.dev');
    expect(models).toContain('/models?in=image&sort=in');
    expect(await text('codeitso_find_models', { provider: 'anthropic', limit: 2 })).toContain('models-dev:anthropic');
    // 장바구니 링크 만들기 → 그 링크를 다시 불러오면 같은 재료
    const link = await text('codeitso_make_cart_link', { items: [{ id: 'google-fonts:roboto' }] });
    const url = /https:\/\/\S+\/cart#s=\S+/.exec(link)?.[0] ?? '';
    expect(await text('codeitso_open_cart', { share: url })).toContain('Roboto');
    await client.close();
  });
});

test.describe('AI에 연결 쪽', () => {
  test.beforeEach(async ({ page }) => blockExternal(page));

  test('/connect: MCP 주소와 복사, 앱별 설정, 한 번에 설치 링크, 처리방침 항목으로 가는 링크', async ({ page }) => {
    await page.goto('/connect');
    await islandsReady(page);
    await expect(page.getByRole('heading', { level: 1, name: ko.connect.title })).toBeVisible();
    const url = page.locator('.connect-url pre');
    await expect(url).toHaveText(/\/mcp$/);
    await expect(page.locator('.connect-url').getByRole('button', { name: ko.connect.copyUrl })).toBeVisible();
    for (const c of Object.values(ko.connect.clients)) await expect(page.getByRole('heading', { level: 3, name: c.name })).toBeVisible();
    await expect(page.getByText('claude mcp add --transport http codeitso', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: /Cursor에서 바로 설치/ })).toHaveAttribute('href', /^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=codeitso&config=/);
    await expect(page.getByRole('link', { name: /VS Code .*바로 설치/ })).toHaveAttribute('href', /^vscode:mcp\/install\?/);
    await expect(page.getByText('/plugin install codeitso@codeitso')).toBeVisible();
    await page.getByRole('link', { name: ko.connect.privacyLink }).click();
    await expect(page).toHaveURL(/\/legal\/privacy#mcp$/);
    await expect(page.locator('#mcp')).toContainText('AI 에이전트 연결(MCP)');
  });

  test('바닥글과 메뉴에서 연결 쪽으로 간다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.site-footer').getByRole('link', { name: ko.footer.connect })).toHaveAttribute('href', /\/connect$/);
  });
});
