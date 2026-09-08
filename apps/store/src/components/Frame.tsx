import type { ReactNode } from 'react'

// 기준 기기 아이폰 17 Pro(402×874) 폭의 모바일 프레임.
// 모바일에서는 화면을 가득 채우고, 데스크톱에서는 440px 컬럼으로 가운데 정렬된다.
export default function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[100dvh] w-full min-w-0 max-w-[440px] flex-col overflow-hidden bg-[#f4f5f7]">
      {children}
    </div>
  )
}
