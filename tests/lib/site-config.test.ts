// 사이트 설정 (D136): 빌드 변수가 먼저, 비었으면 저장소 설정. 단계는 하나라도 release면 정식
import { describe, expect, it } from 'vitest';
import { contactEmail } from '../../src/lib/feedback.ts';
import { SITE_CONFIG, effectiveEnv, resolveEmail, resolveSiteUrl, resolveStage } from '../../src/lib/site-config.ts';

describe('사이트 설정', () => {
  it('저장소 설정의 문의 메일은 메일 주소 꼴이고 대표 주소는 https', () => {
    expect(contactEmail(SITE_CONFIG.email)).toBe(SITE_CONFIG.email);
    expect(SITE_CONFIG.url).toMatch(/^https:\/\/[a-z0-9.-]+[a-z]$/);
    expect(SITE_CONFIG.operator.length).toBeGreaterThan(0);
  });

  it('단계: 빌드 변수나 설정 중 하나라도 release면 정식', () => {
    expect(resolveStage(undefined, 'preview')).toBe('preview');
    expect(resolveStage('preview', 'preview')).toBe('preview');
    expect(resolveStage('release', 'preview')).toBe('release');
    expect(resolveStage(undefined, 'release')).toBe('release');
    expect(resolveStage('preview', 'release')).toBe('release');
    expect(resolveStage('anything', 'preview')).toBe('preview');
  });

  it('주소·메일: 빌드 변수에 값이 있으면 그것, 비었으면 설정 (주소 끝 빗금은 뗀다)', () => {
    expect(resolveSiteUrl(undefined, 'https://a.dev')).toBe('https://a.dev');
    expect(resolveSiteUrl('  ', 'https://a.dev/')).toBe('https://a.dev');
    expect(resolveSiteUrl('https://b.dev/', 'https://a.dev')).toBe('https://b.dev');
    expect(resolveEmail('', 'a@b.kr')).toBe('a@b.kr');
    expect(resolveEmail(' c@d.kr ', 'a@b.kr')).toBe('c@d.kr');
  });

  it('effectiveEnv는 다른 빌드 변수를 그대로 두고 세 값을 채운다', () => {
    const cfg = { ...SITE_CONFIG, stage: 'preview' as const, url: 'https://a.dev', email: 'a@b.kr' };
    const loaded: Record<string, string> = { PUBLIC_HOST: 'static' };
    expect(effectiveEnv(loaded, cfg)).toEqual({ PUBLIC_HOST: 'static', PUBLIC_STAGE: 'preview', PUBLIC_SITE_URL: 'https://a.dev', PUBLIC_CONTACT_EMAIL: 'a@b.kr' });
    expect(effectiveEnv({ PUBLIC_STAGE: 'preview' }, { ...cfg, stage: 'release' }).PUBLIC_STAGE).toBe('release');
  });
});
