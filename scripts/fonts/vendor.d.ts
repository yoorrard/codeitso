// 타입이 없는 글꼴 도구의 최소 선언 (scripts/fonts에서만 쓴다)
declare module 'subset-font' {
  interface SubsetOptions {
    targetFormat?: 'sfnt' | 'woff' | 'woff2';
    preserveNameIds?: number[];
    noLayoutClosure?: boolean;
  }
  export default function subsetFont(buffer: Buffer, text: string, options?: SubsetOptions): Promise<Buffer>;
}
declare module 'fontverter' {
  export function convert(buffer: Buffer, toFormat: 'sfnt' | 'truetype' | 'woff' | 'woff2', fromFormat?: string): Promise<Buffer>;
  export function detectFormat(buffer: Buffer): string;
}
