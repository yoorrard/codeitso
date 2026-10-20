// 스타터 키트 (brief 7절 '묶음 기획전'): 한 번에 담는 재료 묶음. 묶음 내용은 data/kits.json(손으로 고른 진열대 id)이고,
// 진열대 빌드가 카드로 바꿔 홈에 싣는다 (SiteData.kits). 여기는 화면과 집계(event-spec.ts)가 같이 쓰는 키트 id 목록만 둔다.
// data/kits.json의 id 목록과 같아야 한다 (tests/lib/kits.test.ts가 본다).

export const KIT_IDS = ['ai-chatbot', 'landing', 'dashboard', 'school', 'game'] as const;
export type KitId = (typeof KIT_IDS)[number];

export function isKitId(x: unknown): x is KitId {
  return typeof x === 'string' && (KIT_IDS as readonly string[]).includes(x);
}
