// 페이앱 결제창으로 이동하기 직전에, "결제 도중 뒤로가기로 돌아왔을 때" 복구할 수 있도록
// 최소한의 상태를 sessionStorage에 남겨둔다. 정상적으로 결제를 마치고 돌아오면(?orderId=)
// 곧바로 지운다 — 남아있다는 건 결제를 끝내지 않고 돌아왔다는 뜻이다.
const KEY_PREFIX = 'qrto:pendingPayment:'

export type PendingPayment = {
  orderId: number
  /** 뒤로가기로 돌아왔을 때 장바구니를 그대로 복원하기 위한 스냅샷 */
  quantities: Record<string, number>
}

export function readPendingPayment(token: string): PendingPayment | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + token)
    return raw ? (JSON.parse(raw) as PendingPayment) : null
  } catch {
    return null
  }
}

export function writePendingPayment(token: string, value: PendingPayment | null): void {
  try {
    if (value) sessionStorage.setItem(KEY_PREFIX + token, JSON.stringify(value))
    else sessionStorage.removeItem(KEY_PREFIX + token)
  } catch {
    /* 저장 실패는 무시 — 뒤로가기 복구가 안 될 뿐 결제 자체엔 지장 없음 */
  }
}
