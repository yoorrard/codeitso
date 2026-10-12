// 영수증 글꼴 이름 바꾸기 (D29·D37): OFL 예약 이름을 쓰지 않도록 name 표를 새로 쓰고, 검사합을 맞춘다.
import { describe, expect, it } from 'vitest';
import type { NameRecords } from '../scripts/fonts/sfnt-name.ts';
import { readName, readTables, renameFont } from '../scripts/fonts/sfnt-name.ts';

const names: NameRecords = {
  copyright: 'Copyright test',
  family: 'CC Receipt',
  subfamily: 'Regular',
  uniqueId: 'CC Receipt Regular; test',
  fullName: 'CC Receipt Regular',
  version: 'Version 1.000',
  postScriptName: 'CCReceipt-Regular',
  license: 'SIL OFL 1.1',
  licenseUrl: 'https://openfontlicense.org',
};

/** 표 몇 개만 든 가짜 sfnt (head 54바이트 + 다른 표 하나 + 옛 name 표) */
function fakeFont(): Uint8Array {
  const head = new Uint8Array(54);
  new DataView(head.buffer).setUint32(12, 0x5f0f3cf5); // head.magicNumber
  const cmap = new Uint8Array([1, 2, 3, 4, 5]); // 길이가 4의 배수가 아닌 표
  const oldName = new Uint8Array([0, 0, 0, 0, 0, 6]); // 이름이 하나도 없는 name 표
  const tables: [string, Uint8Array][] = [
    ['cmap', cmap],
    ['head', head],
    ['name', oldName],
  ];
  const dirLen = 12 + tables.length * 16;
  const total = tables.reduce((a, [, d]) => a + ((d.length + 3) & ~3), dirLen);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x00010000);
  dv.setUint16(4, tables.length);
  let off = dirLen;
  tables.forEach(([tag, d], i) => {
    const p = 12 + i * 16;
    for (let k = 0; k < 4; k += 1) out[p + k] = tag.charCodeAt(k);
    dv.setUint32(p + 8, off);
    dv.setUint32(p + 12, d.length);
    out.set(d, off);
    off += (d.length + 3) & ~3;
  });
  return out;
}

function wholeChecksum(font: Uint8Array): number {
  const padded = new Uint8Array((font.length + 3) & ~3);
  padded.set(font);
  const dv = new DataView(padded.buffer);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + dv.getUint32(i)) >>> 0;
  return sum;
}

describe('글꼴 이름 바꾸기', () => {
  const renamed = renameFont(fakeFont(), names);

  it('새 이름을 읽을 수 있다', () => {
    expect(readName(renamed, 1)).toBe('CC Receipt');
    expect(readName(renamed, 4)).toBe('CC Receipt Regular');
    expect(readName(renamed, 6)).toBe('CCReceipt-Regular');
    expect(readName(renamed, 13)).toBe('SIL OFL 1.1');
  });

  it('다른 표는 그대로 두고 name 표는 하나만', () => {
    const { tables } = readTables(renamed);
    expect(tables.map((t) => t.tag)).toEqual(['cmap', 'head', 'name']);
    expect([...(tables.find((t) => t.tag === 'cmap')?.data ?? [])]).toEqual([1, 2, 3, 4, 5]);
  });

  it('글꼴 전체 검사합이 0xB1B0AFBA (head.checkSumAdjustment가 맞음)', () => {
    expect(wholeChecksum(renamed)).toBe(0xb1b0afba);
  });

  it('표 위치가 4바이트 단위로 맞춰져 있다', () => {
    const dv = new DataView(renamed.buffer, renamed.byteOffset, renamed.byteLength);
    const num = dv.getUint16(4);
    for (let i = 0; i < num; i += 1) expect(dv.getUint32(12 + i * 16 + 8) % 4).toBe(0);
  });

  it('head 표가 없으면 멈춘다', () => {
    const font = fakeFont();
    font[12 + 16] = 'x'.charCodeAt(0); // 'head' → 'xead'
    expect(() => renameFont(font, names)).toThrow();
  });
});
