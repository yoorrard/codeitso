import { describe, expect, it } from 'vitest';
import { isGarbled, repairMojibake } from '../../scripts/lib/text-repair.ts';

// UTF-8 바이트를 Latin-1로 읽은 꼴을 만든다 (출처 API가 이렇게 준 사례: claude-plugins.dev 스킬 설명)
const garble = (s: string): string => String.fromCharCode(...new TextEncoder().encode(s));

describe('repairMojibake', () => {
  it('통째로 깨진 중국어 설명을 되돌린다', () => {
    const src = '智能化 Godot 项目创建与场景管理技能';
    expect(repairMojibake(garble(src))).toBe(src);
  });

  it('바른 글자와 섞여 있어도 깨진 토막만 되돌린다', () => {
    expect(repairMojibake(`🚀 ${garble('한국어 설명')} ok`)).toBe('🚀 한국어 설명 ok');
  });

  it('바른 라틴 문자와 기호는 건드리지 않는다', () => {
    for (const s of ['Café «crème» à 20°C', 'Ångström · naïve résumé', 'plain ASCII', '이미 바른 한국어', '']) {
      expect(repairMojibake(s)).toBe(s);
    }
  });

  it('UTF-8로 읽히지 않는 토막은 그대로 둔다', () => {
    const s = 'Ã broken Â';
    expect(repairMojibake(s)).toBe(s);
  });

  it('바이트가 빠져 되돌릴 수 없는 글은 깨진 글로 본다 (빌드가 설명을 비운다)', () => {
    // '查询'의 UTF-8 바이트 가운데 0x9F가 빠진 꼴 (claude-plugins.dev 일부 설명)
    const lossy = garble('查询 ChatGPT 用量').replace('\u009f', '');
    expect(repairMojibake(lossy)).toBe(lossy);
    expect(isGarbled(lossy)).toBe(true);
    for (const s of ['Café «crème» à 20°C', 'élève «à» côté', '智能化 Godot', 'plain', '']) expect(isGarbled(s)).toBe(false);
  });
});
