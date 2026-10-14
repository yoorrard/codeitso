// 설계도(.md) 글 만들기와 내려받기 (4단계 설계도 받기). 이 모듈과 엔진의 설계도 쪽(engine/pack.ts, 함께 약 2KB)은 `/arrival`에서만
// 아래 막대 [설계도 내려받기 (.md)] 섬의 첫 묶음에 싣는다: 이 단계의 주 버튼이 망과 상관없이 같은 누름 안에서 내려받게 (D82 T35 확인 검토).
// 다른 단계 화면에는 싣지 않는다. 설계도 칸(src/components/ReceiptTabs.tsx)은 같은 모듈을 함께 쓴다.
import type { Catalog, EngineResult } from './engine/index.ts';
import { packFileName, renderPack } from './engine/index.ts';
import { siteRoot } from './routes.ts';

/** 설계도 글. 사이트 첫 주소 = origin + 주소 바탕 (설계서 9.4절): 설계도 속 용어 주소가 바탕을 품는다 */
export function packText(cat: Catalog, r: EngineResult, issuedAt: string): string {
  return renderPack(cat, r, { siteUrl: siteRoot(), issuedAt });
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
