/**
 * 실시간(STOMP) 연동.
 *
 * STOMP /ws (native WebSocket, SockJS 아님) 에 연결하고
 *  - SUB /topic/stores/{storeId}/orders       (NEW_ORDER | STATUS_CHANGED)
 *  - SUB /topic/stores/{storeId}/staff-calls   (CALLED | RESOLVED)
 * 를 구독한다. @stomp/stompjs 사용.
 */
import { Client, type IMessage } from "@stomp/stompjs";
import { WS_BASE_URL } from "./config";
import { getToken } from "./session";
import type { OrderEvent, StaffCallEvent } from "./dto";

export interface RealtimeHandlers {
  onOrder?: (event: OrderEvent) => void;
  onStaffCall?: (event: StaffCallEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * 포스 실시간 구독 시작. 반환된 함수를 호출하면 해제한다.
 */
export function connectRealtime(storeId: string | number, handlers: RealtimeHandlers): () => void {
  const token = getToken();
  const client = new Client({
    brokerURL: WS_BASE_URL,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  });

  const parse = <T>(msg: IMessage): T | null => {
    try {
      return JSON.parse(msg.body) as T;
    } catch {
      return null;
    }
  };

  client.onConnect = () => {
    client.subscribe(`/topic/stores/${storeId}/orders`, (msg) => {
      const ev = parse<OrderEvent>(msg);
      if (ev) handlers.onOrder?.(ev);
    });
    client.subscribe(`/topic/stores/${storeId}/staff-calls`, (msg) => {
      const ev = parse<StaffCallEvent>(msg);
      if (ev) handlers.onStaffCall?.(ev);
    });
    handlers.onConnect?.();
  };

  client.onWebSocketClose = () => handlers.onDisconnect?.();

  client.activate();

  return () => {
    void client.deactivate();
  };
}
