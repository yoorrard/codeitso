// 공유 링크: #r=<압축> 만들기·읽기, 깨진 링크, 자유 입력이 링크에 없음
import LZString from 'lz-string';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/lib/engine/index.ts';
import type { Session } from '../../src/lib/engine/types.ts';
import { consumeShareHash, readShareHash, shareHash, shareUrl } from '../../src/lib/share.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const recipe = cat.data.recipes.recipes[0];
if (!recipe) throw new Error('레시피가 없습니다');
const session: Session = evaluate(cat, { answers: recipe.answers, cart: recipe.cart, kept: recipe.kept ?? [], deferred: [], freeText: '우리 반 급식 비밀 메모' }).session;

const pack = (v: unknown): string => '#r=' + LZString.compressToEncodedURIComponent(JSON.stringify(v));

describe('공유 링크', () => {
  it('왕복하면 같은 상태 (자유 입력 빼고)', () => {
    const read = readShareHash(shareHash(session));
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    const back = evaluate(cat, read.session).session;
    const { freeText: _f, ...rest } = session;
    expect(back).toEqual(rest);
  });

  it('자유 입력은 링크 안에 없다', () => {
    const text = LZString.decompressFromEncodedURIComponent(shareHash(session).slice(3));
    expect(text).not.toContain('비밀 메모');
    expect(JSON.parse(text)).toEqual({ v: 1, a: session.answers, c: session.cart, k: session.kept, d: session.deferred });
  });

  it('주소는 사이트/receipt#r= 모양 (끝 빗금은 하나로)', () => {
    expect(shareUrl('https://codechauffeur.example/', session).startsWith('https://codechauffeur.example/receipt#r=')).toBe(true);
  });

  it('#r=가 없으면 none', () => {
    expect(readShareHash('')).toEqual({ status: 'none' });
    expect(readShareHash('#top')).toEqual({ status: 'none' });
  });

  it('깨진 링크는 broken', () => {
    for (const hash of ['#r=', '#r=%%%', '#r=' + 'A'.repeat(9000), pack({ v: 2, a: {} }), pack('문자열'), '#r=' + LZString.compressToEncodedURIComponent('{깨진 JSON')]) {
      expect(readShareHash(hash).status).toBe('broken');
    }
  });

  it('모르는 id는 evaluate가 버린다', () => {
    const read = readShareHash(pack({ v: 1, a: { 'q.nothing': 'x', ...session.answers }, c: ['no-such-product', ...session.cart], k: ['conflict.none'], d: ['nowhere'] }));
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    const r = evaluate(cat, read.session);
    expect(r.session.cart).toEqual(session.cart);
    expect(r.session.answers).toEqual(session.answers);
    expect(r.session.kept).toEqual([]);
    expect(r.session.deferred).toEqual([]);
  });

  it('읽은 뒤 주소에서 #r=를 지운다', () => {
    let replaced = '';
    const win = {
      location: { hash: shareHash(session), pathname: '/receipt', search: '?a=1' },
      history: { state: null, replaceState: (_s: unknown, _t: string, url: string) => (replaced = url) },
    } as unknown as Pick<Window, 'location' | 'history'>;
    expect(consumeShareHash(win).status).toBe('ok');
    expect(replaced).toBe('/receipt?a=1');
  });

  it('#r=가 없으면 주소를 건드리지 않는다', () => {
    let called = false;
    const win = {
      location: { hash: '', pathname: '/receipt', search: '' },
      history: { state: null, replaceState: () => (called = true) },
    } as unknown as Pick<Window, 'location' | 'history'>;
    expect(consumeShareHash(win).status).toBe('none');
    expect(called).toBe(false);
  });
});
