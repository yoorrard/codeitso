// e2e 도우미: 섬이 붙기를 기다리기, 자료 읽기, 사례 하나로 만들 앱 정하기·도구 고르기를 걷기.
import { readFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export interface Question {
  id: string;
  text: string;
  help?: string;
  chip?: string;
  options?: { id: string; label: string }[];
}
export const questions = json<{ questions: Question[] }>('data/questions.json').questions;
export const products = json<{ products: { id: string; name: string; layer: string }[] }>('data/products.json').products;
export const recipes = json<{ recipes: { id: string; title: string; freeText?: string }[] }>('data/recipes.json').recipes;
export const receiptWords = json<{ receipt: { destination: string } }>('data/templates.json').receipt;
export function golden(id: string): { answers: Record<string, string>; cart: string[] } {
  return json(`data/golden/${id}.json`);
}

/** 바로 붙는 섬(client:load·idle)이 다 붙을 때까지 */
export async function islandsReady(page: Page): Promise<void> {
  await page.waitForFunction(() => [...document.querySelectorAll('astro-island[client="load"], astro-island[client="idle"]')].every((i) => !i.hasAttribute('ssr')));
}

/** 보일 때 붙는 섬(client:visible) 안의 요소: 보이게 굴리고 그 섬이 붙을 때까지 */
export async function hydrated(target: Locator): Promise<Locator> {
  await target.scrollIntoViewIfNeeded();
  await target.evaluate(
    (el) =>
      new Promise<void>((ok) => {
        const check = (): void => {
          if (!el.closest('astro-island')?.hasAttribute('ssr')) ok();
          else setTimeout(check, 30);
        };
        check();
      }),
  );
  return target;
}

/**
 * 보이는 질문 제목으로 사례의 답을 골라 만들 앱 정하기 질문을 끝까지 (brief 6.5: 보기를 누르면 바로 다음 질문).
 * 마지막 한 줄 쓰기(선택)에 닿으면 freeText를 쓰고 돌아온다. 주 버튼 [도구 고르러 가기]는 아래 막대(.q-go)에 있다.
 * keyboard면 Tab·Enter·글자 치기만 쓴다
 */
export async function answerInterview(page: Page, answers: Record<string, string>, opts: { keyboard?: boolean; freeText?: string } = {}): Promise<void> {
  for (let step = 0; step < 30; step++) {
    const title = ((await page.locator('#q-title').textContent()) ?? '').trim();
    const q = questions.find((x) => title.endsWith(x.text));
    if (!q) {
      // 마지막 한 줄 쓰기 (선택): 질문 제목에서 Tab 한 번이면 입력 칸이다
      const line = page.locator('#free-line');
      await expect(line).toBeVisible();
      if (opts.freeText) {
        if (opts.keyboard) {
          await expect(page.locator('#q-title')).toBeFocused();
          await page.keyboard.press('Tab');
          await expect(line).toBeFocused();
          await page.keyboard.type(opts.freeText);
        } else await line.fill(opts.freeText);
      }
      return;
    }
    const answer = answers[q.id];
    const label = q.options?.find((o) => o.id === answer)?.label;
    expect(label, `${q.id}의 답 ${answer}`).toBeTruthy();
    const option = page.locator('.q').getByRole('button', { name: label ?? '', exact: true });
    if (opts.keyboard) {
      await option.focus();
      await expect(option).toBeFocused();
      await page.keyboard.press('Enter');
    } else await option.click();
    await expect(page.locator('#q-title')).not.toHaveText(title);
  }
  throw new Error('만들 앱 정하기 질문이 끝나지 않았다');
}

/**
 * 도구 고르기에서 도구를 정한다 (brief 6.6): 그 도구 줄이 있는 칸을 칩으로 열고, 줄을 눌러 '고를 예정'으로 옮긴 뒤
 * 아래 막대의 [{도구}로 정하기]를 누른다. 정하면 다음 남은 꼭 고를 것이 열린다. 정한 도구는 칩이 남색 ✓(.is-chosen)이 된다
 */
export async function addToCart(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) {
    const row = page.locator(`#w-slot button.w-row[data-product="${id}"]`);
    const chips = page.locator('.w-chips .w-chip');
    for (let k = 0; k < (await chips.count()) && (await row.count()) === 0; k++) await chips.nth(k).click();
    // 원문만 있는 도구는 접기 안에 있다
    if (!(await row.isVisible())) await page.locator('#w-slot .w-index > summary').click();
    if ((await row.getAttribute('aria-pressed')) !== 'true') await row.click();
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    const save = page.locator('.action-bar button.w-save');
    await expect(save).toBeVisible();
    await save.click();
    await expect.poll(async () => page.evaluate(() => (JSON.parse(localStorage.getItem('cc:session:v1') ?? '{}') as { cart?: string[] }).cart ?? [])).toContain(id);
  }
}

/** 지금 도는 애니메이션 중 길이가 limit(ms)보다 긴 것 */
export async function longAnimations(page: Page, limit = 150): Promise<string[]> {
  return page.evaluate(
    (max) =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running' && Number(a.effect?.getComputedTiming().duration ?? 0) > max)
        .map((a) => (a as CSSAnimation).animationName ?? 'waapi'),
    limit,
  );
}
