// TrueType(sfnt) 글꼴의 name 표를 새로 써서 글꼴 이름을 바꾼다. 부작용 없는 도우미 (시험에서도 import).
// D2Coding은 OFL의 '예약 글꼴 이름'이 있어, 글자를 골라 낸 수정본은 이름을 바꿔야 한다 (D29).

export interface NameRecords {
  copyright: string;
  family: string;
  subfamily: string;
  uniqueId: string;
  fullName: string;
  version: string;
  postScriptName: string;
  license: string;
  licenseUrl: string;
}

const NAME_IDS: [keyof NameRecords, number][] = [
  ['copyright', 0],
  ['family', 1],
  ['subfamily', 2],
  ['uniqueId', 3],
  ['fullName', 4],
  ['version', 5],
  ['postScriptName', 6],
  ['license', 13],
  ['licenseUrl', 14],
];

function utf16be(s: string): Uint8Array {
  const out = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    out[i * 2] = c >> 8;
    out[i * 2 + 1] = c & 0xff;
  }
  return out;
}

/** Windows 유니코드(플랫폼 3, 인코딩 1, 영어 0x0409) 이름만 담은 name 표 (형식 0) */
export function buildNameTable(n: NameRecords): Uint8Array {
  const recs = NAME_IDS.map(([key, id]) => ({ id, bytes: utf16be(n[key]) }));
  const headerLen = 6 + recs.length * 12;
  const storageLen = recs.reduce((a, r) => a + r.bytes.length, 0);
  const buf = new Uint8Array(headerLen + storageLen);
  const dv = new DataView(buf.buffer);
  dv.setUint16(0, 0);
  dv.setUint16(2, recs.length);
  dv.setUint16(4, headerLen);
  let off = 0;
  recs.forEach((r, i) => {
    const p = 6 + i * 12;
    dv.setUint16(p, 3);
    dv.setUint16(p + 2, 1);
    dv.setUint16(p + 4, 0x0409);
    dv.setUint16(p + 6, r.id);
    dv.setUint16(p + 8, r.bytes.length);
    dv.setUint16(p + 10, off);
    buf.set(r.bytes, headerLen + off);
    off += r.bytes.length;
  });
  return buf;
}

function checksum(data: Uint8Array): number {
  const padded = new Uint8Array((data.length + 3) & ~3);
  padded.set(data);
  const dv = new DataView(padded.buffer);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + dv.getUint32(i)) >>> 0;
  return sum;
}

interface Table {
  tag: string;
  data: Uint8Array;
}

export function readTables(font: Uint8Array): { version: number; tables: Table[] } {
  const dv = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const version = dv.getUint32(0);
  const num = dv.getUint16(4);
  const tables: Table[] = [];
  for (let i = 0; i < num; i += 1) {
    const p = 12 + i * 16;
    const tag = String.fromCharCode(font[p] ?? 0, font[p + 1] ?? 0, font[p + 2] ?? 0, font[p + 3] ?? 0);
    const offset = dv.getUint32(p + 8);
    const length = dv.getUint32(p + 12);
    tables.push({ tag, data: font.slice(offset, offset + length) });
  }
  return { version, tables };
}

/** name 표를 바꾼 새 sfnt를 만든다. 표 위치·검사합·head.checkSumAdjustment를 다시 계산한다. */
export function renameFont(font: Uint8Array, names: NameRecords): Uint8Array {
  const { version, tables } = readTables(font);
  const list = tables.filter((t) => t.tag !== 'name').concat([{ tag: 'name', data: buildNameTable(names) }]);
  list.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const head = list.find((t) => t.tag === 'head');
  if (!head) throw new Error('head 표가 없는 글꼴입니다');
  new DataView(head.data.buffer, head.data.byteOffset, head.data.byteLength).setUint32(8, 0);

  const num = list.length;
  let entrySelector = 0;
  while (2 ** (entrySelector + 1) <= num) entrySelector += 1;
  const searchRange = 2 ** entrySelector * 16;
  const dirLen = 12 + num * 16;
  const total = list.reduce((a, t) => a + ((t.data.length + 3) & ~3), dirLen);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, version);
  dv.setUint16(4, num);
  dv.setUint16(6, searchRange);
  dv.setUint16(8, entrySelector);
  dv.setUint16(10, num * 16 - searchRange);
  let offset = dirLen;
  let headOffset = 0;
  list.forEach((t, i) => {
    const p = 12 + i * 16;
    for (let k = 0; k < 4; k += 1) out[p + k] = t.tag.charCodeAt(k);
    dv.setUint32(p + 4, checksum(t.data));
    dv.setUint32(p + 8, offset);
    dv.setUint32(p + 12, t.data.length);
    out.set(t.data, offset);
    if (t.tag === 'head') headOffset = offset;
    offset += (t.data.length + 3) & ~3;
  });
  dv.setUint32(headOffset + 8, (0xb1b0afba - checksum(out)) >>> 0);
  return out;
}

/** name 표에서 Windows 유니코드 이름 하나를 읽는다 (시험·확인용) */
export function readName(font: Uint8Array, nameId: number): string | null {
  const t = readTables(font).tables.find((x) => x.tag === 'name');
  if (!t) return null;
  const dv = new DataView(t.data.buffer, t.data.byteOffset, t.data.byteLength);
  const count = dv.getUint16(2);
  const storage = dv.getUint16(4);
  for (let i = 0; i < count; i += 1) {
    const p = 6 + i * 12;
    if (dv.getUint16(p) !== 3 || dv.getUint16(p + 6) !== nameId) continue;
    const len = dv.getUint16(p + 8);
    const off = storage + dv.getUint16(p + 10);
    let s = '';
    for (let k = 0; k < len; k += 2) s += String.fromCharCode(dv.getUint16(off + k));
    return s;
  }
  return null;
}
