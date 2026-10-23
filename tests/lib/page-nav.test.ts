// 뒤로 (src/lib/page-nav.ts, N1 D137): 이전 화면이 이 사이트 안일 때만 history.back, 아니면 위 단계 링크.
import { describe, expect, it } from 'vitest';
import { cameFromSite } from '../../src/lib/page-nav.ts';

describe('이전 화면이 이 사이트인가', () => {
  const here = 'https://codeitso.example/item?id=a';

  it('같은 출처에서 왔고 이 탭에 앞 기록이 있으면 그렇다', () => {
    expect(cameFromSite('https://codeitso.example/c/design/fonts?page=2', here, '', 3)).toBe(true);
  });

  it('바깥에서 왔거나, 출처를 모르거나, 새 탭(앞 기록 없음)이면 아니다', () => {
    expect(cameFromSite('https://www.google.com/', here, '', 3)).toBe(false);
    expect(cameFromSite('', here, '', 3)).toBe(false);
    expect(cameFromSite('https://codeitso.example/c', here, '', 1)).toBe(false);
    expect(cameFromSite('이상한 주소', here, '', 3)).toBe(false);
  });

  it('하위 주소 사이트면 바탕 안에서 왔을 때만', () => {
    const sub = 'https://user.github.io/code-chauffeur/item?id=a';
    expect(cameFromSite('https://user.github.io/code-chauffeur/c/api', sub, '/code-chauffeur', 2)).toBe(true);
    expect(cameFromSite('https://user.github.io/code-chauffeur', sub, '/code-chauffeur', 2)).toBe(true);
    expect(cameFromSite('https://user.github.io/other-project/', sub, '/code-chauffeur', 2)).toBe(false);
  });
});
