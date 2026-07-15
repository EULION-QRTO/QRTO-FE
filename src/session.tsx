import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

// QR 코드에 담긴 URL로 "어느 매장의 / 어떤 주문 방식"인지 결정한다.
//  - 테이블 주문: 정해진 테이블 번호가 URL에 박혀 있다. (table=4)
//  - 포장(togo) 주문: 손님이 전화번호를 입력하면 그 "뒷 4자리"로 픽업을 구분한다. (togo=5678)
//
// URL 예시(정적 호스팅에서도 안전하도록 쿼리 파라미터로 구분한다):
//   테이블      : https://order.example.com/?store=eulji&table=2
//   포장(초기)  : https://order.example.com/?store=eulji&togo          ← QR에 인쇄되는 값(뒷자리 없음)
//   포장(입력후): https://order.example.com/?store=eulji&togo=5678     ← 입력 후 프론트가 replaceState로 갱신
//
// 개인정보 정책상 URL에는 "뒷 4자리만" 남기고, 백엔드 주문에 필요한 "전체 번호"는
// sessionStorage에 보관한다. (전체 번호는 URL/브라우저 히스토리에 남기지 않는다.)

export type StoreSession =
  | { storeId: string; storeName: string; mode: 'table'; tableNumber: number }
  | { storeId: string; storeName: string; mode: 'togo' }

// 매장 ID → 표시 이름. 새 매장은 여기에 추가한다.
const STORE_NAMES: Record<string, string> = {
  eulji: '을지포차',
}

const DEFAULT_STORE_ID = 'eulji'
const DEFAULT_TABLE = 2

// 포장 전체 전화번호를 매장 단위로 보관하는 sessionStorage 키.
const togoPhoneKey = (storeId: string) => `qrto:togo:phone:${storeId}`

export function getStoreName(storeId: string): string {
  return STORE_NAMES[storeId] ?? STORE_NAMES[DEFAULT_STORE_ID]
}

// 전화번호에서 숫자만 남긴 뒤 마지막 4자리 (포장 주문을 구분하는 값).
export function phoneLast4(phone: string): string {
  return phone.replace(/\D/g, '').slice(-4)
}

// 현재 브라우저 URL을 읽어 매장·주문 방식을 해석한다.
export function parseSession(search = window.location.search): StoreSession {
  const params = new URLSearchParams(search)
  const storeId = params.get('store') ?? DEFAULT_STORE_ID
  const storeName = getStoreName(storeId)

  // ?togo, ?togo=5678, ?mode=togo → 포장 주문
  const isTogo = params.has('togo') || params.get('mode') === 'togo'
  if (isTogo) {
    return { storeId, storeName, mode: 'togo' }
  }

  const raw = params.get('table')
  const parsed = raw != null ? Number.parseInt(raw, 10) : NaN
  const tableNumber = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TABLE
  return { storeId, storeName, mode: 'table', tableNumber }
}

// URL의 togo 값(뒷 4자리)을 읽는다. `?togo`(플래그만)이면 빈 문자열.
export function parseTogoLast4(search = window.location.search): string {
  const params = new URLSearchParams(search)
  return (params.get('togo') ?? '').replace(/\D/g, '').slice(-4)
}

// sessionStorage에 보관된 전체 번호를 읽되, URL 뒷자리와 일치할 때만 신뢰한다.
function readStoredPhone(storeId: string, expectedLast4: string): string {
  if (!expectedLast4) return ''
  try {
    const stored = sessionStorage.getItem(togoPhoneKey(storeId))
    if (stored && phoneLast4(stored) === expectedLast4) return stored
  } catch {
    /* sessionStorage 접근 불가(프라이빗 모드 등) → 복원 생략 */
  }
  return ''
}

type SessionContextValue = {
  session: StoreSession
  // 포장 주문에서 손님이 입력한 "전체" 전화번호(숫자만). 테이블 주문/입력 전에는 빈 문자열.
  phone: string
  setPhone: (phone: string) => void
  // 헤더에 표시할 위치/주문 방식 라벨.
  locationLabel: string
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useMemo(() => parseSession(), [])
  // 초기 URL 기준 뒷자리(라벨/복원용). replaceState로 URL이 바뀌어도 이 값은 유지된다.
  const initialLast4 = useMemo(
    () => (session.mode === 'togo' ? parseTogoLast4() : ''),
    [session],
  )

  // 새로고침/재진입 시: URL 뒷자리 + sessionStorage 전체 번호가 맞으면 전체 번호를 복원한다.
  const [phone, setPhoneState] = useState(() =>
    session.mode === 'togo' ? readStoredPhone(session.storeId, initialLast4) : '',
  )

  const setPhone = useCallback(
    (full: string) => {
      setPhoneState(full)
      const last4 = phoneLast4(full)
      // 전체 번호는 sessionStorage에만 보관(백엔드 주문용). URL엔 남기지 않는다.
      try {
        sessionStorage.setItem(togoPhoneKey(session.storeId), full)
      } catch {
        /* 저장 실패는 무시 — 상태(phone)로는 이번 세션 동안 계속 사용 가능 */
      }
      // URL에는 뒷 4자리만 남긴다: ?...&togo=5678 (히스토리 엔트리는 늘리지 않음)
      const params = new URLSearchParams(window.location.search)
      params.delete('mode')
      params.set('togo', last4)
      const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`
      window.history.replaceState(null, '', next)
    },
    [session],
  )

  const value = useMemo<SessionContextValue>(() => {
    // 포장(픽업) 주문은 전화번호 뒷 4자리로 구분한다.
    // 전체 번호가 있으면 그 뒷자리, 없으면 URL 뒷자리, 둘 다 없으면 NULL로 표시.
    const last4 = phone ? phoneLast4(phone) : initialLast4
    const locationLabel =
      session.mode === 'table'
        ? `홀 ${session.tableNumber}번 테이블`
        : `${last4 || 'NULL'}-픽업`
    return { session, phone, setPhone, locationLabel }
  }, [session, phone, initialLast4, setPhone])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>')
  return ctx
}
