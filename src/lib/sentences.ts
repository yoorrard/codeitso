// 말풍선 글을 문장마다 나눈다: 좁은 말풍선에서 문장 중간이 아니라 문장 사이에서 줄을 바꾸려고.
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((t) => t.trim())
    .filter((t) => t !== '');
}
