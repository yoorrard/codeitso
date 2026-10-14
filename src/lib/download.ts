// 글을 파일로 내려받게 한다 (재료 목록 .md). 서버를 거치지 않고 브라우저 안에서 Blob 주소를 만들어 바로 지운다.
export function downloadText(fileName: string, text: string, type = 'text/markdown;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
