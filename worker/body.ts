// 요청 본문을 limit 바이트까지만 읽는다 (집계 /api/event와 MCP /mcp가 같이 쓴다). 넘으면 null:
// 길이를 밝히지 않은(chunked) 큰 본문도 끝까지 읽지 않고 멈춰 isolate 메모리(128MB)를 지킨다.
export async function readLimited(request: Request, limit: number): Promise<string | null> {
  if (Number(request.headers.get('Content-Length') ?? '0') > limit) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}
