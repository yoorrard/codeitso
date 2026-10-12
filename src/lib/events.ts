// 익명 집계 이벤트 보내기 자리 (R-60). 실제 전송(/api/event, 한 번만 보내기)은 T18에서 채운다.
export type EventName = 'interview_start' | 'interview_done' | 'receipt_issue' | 'pack_copy' | 'share_open';

export function track(name: EventName): void {
  // T18: rememberSent()로 한 번만, navigator.sendBeacon('/api/event', …)
  void name;
}
