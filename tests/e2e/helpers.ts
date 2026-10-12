// e2e 도우미: 섬이 붙기를 기다리기, 자료 읽기, 사례 하나로 인터뷰·장보기를 걷기.
import { readFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export interface Question {
  id: string;
  text: string;
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

/** 보이는 질문 제목으로 사례의 답을 골라 인터뷰를 끝까지. keyboard면 Tab·Enter만 쓴다 */
export async function answerInterview(page: Page, answers: Record<string, string>, opts: { keyboard?: boolean; freeText?: string } = {}): Promise<void> {
  for (let step = 0; step < 30; step++) {
    if ((await page.locator('.q-done').count()) > 0) return;
    const title = ((await page.locator('#q-title').textContent()) ?? '').trim();
    const q = questions.find((x) => title.endsWith(x.text));
    if (!q) {
      // 마지막 한 줄 입력 (선택)
      const line = page.locator('.q-card input.line-input');
      if (opts.freeText) await line.fill(opts.freeText);
      const finish = page.locator('.q-card button[type="submit"]');
      if (opts.keyboard) {
        await finish.focus();
        await page.keyboard.press('Enter');
      } else await finish.click();
      continue;
    }
    const answer = answers[q.id];
    const label = q.options?.find((o) => o.id === answer)?.label;
    expect(label, `${q.id}의 답 ${answer}`).toBeTruthy();
    const option = page.locator('.q-card .option').filter({ hasText: label ?? '' }).first();
    if (opts.keyboard) {
      await option.focus();
      await expect(option).toBeFocused();
      await page.keyboard.press('Enter');
    } else await option.click();
    await expect(page.locator('#q-title')).not.toHaveText(title);
  }
  throw new Error('인터뷰가 끝나지 않았다');
}

/** 장보기에서 상품을 담는다 (다른 칸이면 칸을 하나씩 열어 찾는다) */
export async function addToCart(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) {
    const name = products.find((p) => p.id === id)?.name ?? id;
    const add = page.locator(`button.btn-primary[aria-label="${fill(ko.shop.addLabel, { name })}"]`).first();
    const slots = page.locator('.inventory li button');
    for (let k = 0; k < (await slots.count()) && !(await add.isVisible()); k++) await slots.nth(k).click();
    await add.scrollIntoViewIfNeeded();
    await add.click();
    await expect(page.locator(`button[aria-label="${fill(ko.shop.removeLabel, { name })}"]`).first()).toBeVisible();
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
