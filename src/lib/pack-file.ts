// 설계도(.md) 글 만들기와 내려받기 (4단계 설계도 받기). 이 모듈과 엔진의 설계도 쪽(engine/pack.ts, 함께 약 2KB)은 `/arrival`에서만
// 아래 막대 [설계도 내려받기 (.md)] 섬의 첫 묶음에 싣는다: 이 단계의 주 버튼이 망과 상관없이 같은 누름 안에서 내려받게 (D82 T35 확인 검토).
// 다른 단계 화면에는 싣지 않는다. 설계도 칸(src/components/ReceiptTabs.tsx)은 같은 모듈을 함께 쓴다.
// 설계도 6번 '디자인 지시'는 설계도 6번 묶음(src/lib/look-render-data.ts, 지연)이 만든다 (T38): 이 모듈이 깨어날 때 미리 받아 두고,
// 받기 전이거나 받지 못했으면 renderPack이 6번에 다시 받으라는 한 줄(templates.pack.designPending)을 남긴다. 누름은 그대로 같은 누름 안에서 내려받는다.
import type { Catalog, EngineResult } from './engine/index.ts';
import { packFileName, renderPack } from './engine/index.ts';
import { siteRoot } from './routes.ts';

type LookData = typeof import('./look-render-data.ts');
let lookData: LookData | null = null;
let lookLoading: Promise<LookData | null> | null = null;

/** 설계도 6번 묶음을 받는다 (한 번만). 실패하면 null: 설계도는 디자인 값 없이 만든다 */
export function loadLookData(): Promise<LookData | null> {
  lookLoading ??= import('./look-render-data.ts').then(
    (m) => (lookData = m),
    () => null,
  );
  return lookLoading;
}
if (typeof window !== 'undefined') void loadLookData();

/** 설계도 글. 사이트 첫 주소 = origin + 주소 바탕 (설계서 9.4절): 설계도 속 용어 주소가 바탕을 품는다 */
export function packText(cat: Catalog, r: EngineResult, issuedAt: string): string {
  const design = lookData?.designLines(cat, r);
  return renderPack(cat, r, { siteUrl: siteRoot(), issuedAt, ...(design ? { design } : {}) });
}

/** 설계도를 .md 파일로 내려받고 파일 이름을 돌려준다 (이름은 이용자 기기 시간) */
export function downloadPack(cat: Catalog, r: EngineResult, issuedAt: string, now: Date): string {
  const file = packFileName(now);
  const blob = new Blob([packText(cat, r, issuedAt)], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  return file;
}
