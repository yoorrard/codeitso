// AI 모델 자료 받기 (D141, 브라우저): 진열대 빌드가 만든 제공자 모델 파일(/catalog/models/p/<제공자>.json)과 비교 묶음(direct·hosts).
// 상세 '모델·요금' 표·담기 창의 모델 고르기·장바구니·프롬프트 뽑기·/models가 같이 쓰고, 한 번 받은 것은 기억한다(실패한 것은 잊어 다시 받는다).
import type { ModelPrice } from './prompt.ts';
import type { ModelsBundle, ProviderModels } from './catalog/models.ts';
import { modelProviderOf } from './catalog/models.ts';
import { modelDataPath, modelsBundlePath } from './routes.ts';
import type { CartLine } from './saved.ts';

const files = new Map<string, Promise<unknown>>();

function getJson<T>(url: string): Promise<T> {
  let p = files.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<T>;
    });
    p.catch(() => files.delete(url));
    files.set(url, p);
  }
  return p;
}

/** 제공자 하나의 모델 (새것부터) */
export function providerModels(provider: string): Promise<ProviderModels> {
  return getJson<ProviderModels>(modelDataPath(provider));
}

/** 비교 묶음: direct = 모델을 직접 만드는 회사, hosts = 호스팅·라우터 */
export function modelsBundle(kind: 'direct' | 'hosts'): Promise<ModelsBundle> {
  return getJson<ModelsBundle>(modelsBundlePath(kind));
}

/** 모델을 고른 장바구니 줄마다 그날 가격 (줄 id → 가격). 받지 못한 제공자는 빠진다 (프롬프트는 가격 없이 모델만 적는다) */
export async function modelPrices(lines: readonly CartLine[]): Promise<Map<string, ModelPrice>> {
  const out = new Map<string, ModelPrice>();
  await Promise.all(
    lines.map(async (l) => {
      const provider = modelProviderOf(l.id);
      if (!provider || !l.model) return;
      try {
        const f = await providerModels(provider);
        const row = f.rows.find((r) => r.id === l.model?.id);
        if (row) out.set(l.id, { row, fetched: f.fetched });
      } catch {
        // 가격 없이 뽑는다
      }
    }),
  );
  return out;
}
