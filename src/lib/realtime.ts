/**
 * 실시간(STOMP) 연동 — 손님(내 주문 상태).
 *
 * STOMP /ws (native WebSocket, SockJS 아님) 에 진입 토큰(entry-token 헤더)으로 연결하고
 *  - SUB /topic/orders/{orderId}   (STATUS_CHANGED)
 * 를 구독한다. 그 주문이 토큰의 테이블/매장 소유일 때만 서버가 구독을 허용한다.
 * 결제 확정(RECEIVED) → 조리중 → 완료 → 서빙/픽업, 취소, 청산까지 전부 이 이벤트로 온다.
 */
import { Client, type IMessage } from '@stomp/stompjs'
import { WS_BASE_URL } from './config'
import type { OrderResponse, OrderStatusEvent } from './dto'

/**
 * 특정 주문의 상태 변화를 구독한다. 반환된 함수를 호출하면 해제한다.
 * @param entryToken 세션의 진입 토큰(qrToken 또는 pickupToken)
 * @param orderId 구독할 주문 ID
 * @param onUpdate 상태가 바뀔 때마다(전화번호는 마스킹된 채) 호출된다
 */
export function subscribeOrderStatus(
  entryToken: string,
  orderId: number,
  onUpdate: (order: OrderResponse) => void,
): () => void {
  const client = new Client({
    brokerURL: WS_BASE_URL,
    connectHeaders: { 'entry-token': entryToken },
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  })

  client.onConnect = () => {
    client.subscribe(`/topic/orders/${orderId}`, (msg: IMessage) => {
      try {
        const ev = JSON.parse(msg.body) as OrderStatusEvent
        if (ev?.order) onUpdate(ev.order)
      } catch {
        /* 잘못된 메시지는 무시 */
      }
    })
  }

  client.activate()

  return () => {
    void client.deactivate()
  }
}
