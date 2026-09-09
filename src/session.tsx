import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { qrEntry, pickupEntry } from './lib/endpoints'
import { ApiError } from './lib/api'

// QR 코드에 담긴 URL로 "어느 매장의 / 어떤 주문 방식"인지 결정한다.
// 백엔드 QR URL 스킴 (명세서 v2):
//   테이블 : {front}/order?token=<qrToken>     → GET /api/customer/entry/table/{qrToken}   (DINE_IN)
//   픽업   : {front}/pickup?token=<pickupToken> → GET /api/customer/entry/pickup/{token}    (TAKEOUT)
//
// 진입 토큰으로 매장/테이블을 백엔드에서 확인해 세션을 구성한다. storeId/tableId는 v2에서
// 손님 응답에 더 이상 내려오지 않는다 — 메뉴판·주문·직원호출 전부 storeId 없이 토큰만으로 동작한다.
// 픽업 주문은 손님이 전화번호를 입력하고, 전체 번호는 sessionStorage 에만 보관한다.
// (개인정보 정책상 URL/히스토리에는 남기지 않는다.)

export type StoreSession =
  | { storeName: string; mode: 'table'; qrToken: string; tableName: string }
  | { storeName: string; mode: 'togo'; pickupToken: string; takeoutEnabled: boolean }

/** 현재 세션의 진입 토큰(qrToken 또는 pickupToken) — API 호출의 소유 증명/식별자로 쓰인다. */
export function entryToken(session: StoreSession): string {
  return session.mode === 'table' ? session.qrToken : session.pickupToken
}

// 픽업 전체 전화번호를 픽업 토큰 단위로 보관하는 sessionStorage 키.
const phoneKey = (pickupToken: string) => `qrto:phone:${pickupToken}`

// 전화번호에서 숫자만 남긴 뒤 마지막 4자리 (픽업 주문을 구분하는 값).
export function phoneLast4(phone: string): string {
  return phone.replace(/\D/g, '').slice(-4)
}

type Entry =
  | { kind: 'table'; token: string }
  | { kind: 'pickup'; token: string }
  | { kind: 'none' }

// 현재 URL(경로 + ?token)에서 진입 유형과 토큰을 읽는다.
export function parseEntry(loc: Location = window.location): Entry {
  const token = new URLSearchParams(loc.search).get('token') ?? ''
  const path = loc.pathname
  if (path.startsWith('/pickup')) return token ? { kind: 'pickup', token } : { kind: 'none' }
  // '/order' 및 그 외 경로는 테이블 진입으로 간주 (토큰 필수)
  return token ? { kind: 'table', token } : { kind: 'none' }
}

function readStoredPhone(pickupToken: string): string {
  try {
    return sessionStorage.getItem(phoneKey(pickupToken)) ?? ''
  } catch {
    return ''
  }
}

type SessionContextValue = {
  session: StoreSession
  // 픽업 주문에서 손님이 입력한 "전체" 전화번호(숫자만). 테이블 주문/입력 전에는 빈 문자열.
  phone: string
  setPhone: (phone: string) => void
  // 헤더에 표시할 위치/주문 방식 라벨.
  locationLabel: string
}

const SessionContext = createContext<SessionContextValue | null>(null)

// 진입 조회 상태
type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; session: StoreSession }

function CenteredMessage({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex h-[100dvh] w-full max-w-[440px] flex-col items-center justify-center gap-[12px] bg-[#f4f5f7] px-[40px] text-center">
      <p className="text-[20px] font-bold text-[#181a1f]">{title}</p>
      {sub && <p className="text-[14px] font-medium text-[#969ca3]">{sub}</p>}
    </div>
  )
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const entry = useMemo(() => parseEntry(), [])
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [phone, setPhoneState] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (entry.kind === 'none') {
        setLoad({ status: 'error', message: 'QR 코드를 다시 스캔해 주세요.' })
        return
      }
      try {
        if (entry.kind === 'table') {
          const e = await qrEntry(entry.token)
          if (!alive) return
          setLoad({
            status: 'ready',
            session: {
              mode: 'table',
              storeName: e.storeName,
              qrToken: entry.token,
              tableName: e.tableName,
            },
          })
        } else {
          const e = await pickupEntry(entry.token)
          if (!alive) return
          setPhoneState(readStoredPhone(entry.token))
          setLoad({
            status: 'ready',
            session: {
              mode: 'togo',
              storeName: e.storeName,
              pickupToken: entry.token,
              takeoutEnabled: e.takeoutEnabled,
            },
          })
        }
      } catch (err) {
        if (!alive) return
        const msg = err instanceof ApiError ? err.message : '매장 정보를 불러오지 못했습니다.'
        setLoad({ status: 'error', message: msg })
      }
    })()
    return () => {
      alive = false
    }
  }, [entry])

  const setPhone = useCallback(
    (full: string) => {
      setPhoneState(full)
      if (load.status === 'ready' && load.session.mode === 'togo') {
        try {
          sessionStorage.setItem(phoneKey(load.session.pickupToken), full)
        } catch {
          /* 저장 실패는 무시 — 이번 세션 동안 상태(phone)로 계속 사용 가능 */
        }
      }
    },
    [load],
  )

  const value = useMemo<SessionContextValue | null>(() => {
    if (load.status !== 'ready') return null
    const session = load.session
    const locationLabel =
      session.mode === 'table'
        ? `홀 ${session.tableName} 테이블`
        : `${phone ? phoneLast4(phone) : 'NULL'}-픽업`
    return { session, phone, setPhone, locationLabel }
  }, [load, phone, setPhone])

  if (load.status === 'loading') return <CenteredMessage title="매장 정보를 불러오는 중…" />
  if (load.status === 'error')
    return <CenteredMessage title={load.message} sub="테이블의 QR 코드를 다시 스캔하면 돼요." />

  return <SessionContext.Provider value={value!}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>')
  return ctx
}
