// Worker 타입 검사용 이름 두 개 (D154): MCP가 쓰는 src/lib/routes.ts는 Vite·브라우저에서도 돈다.
// 실행 때는 import.meta.env?.BASE_URL과 typeof window로 있는지 확인하므로 Worker에서는 둘 다 없다고 보고 루트 주소를 쓴다.
interface ImportMeta {
  readonly env?: { readonly BASE_URL?: string };
}
declare const window: { readonly location: { readonly origin: string } } | undefined;
