import { useLayoutEffect, useRef, useState, type ElementType } from 'react'

// 폭 측정 전용 캔버스 — 실제 렌더링에는 안 쓰이고, ctx.measureText로 텍스트 폭만 잰다.
// (모든 FitText 인스턴스가 공유해도 무해 — 매 측정마다 font만 새로 지정하면 됨)
let measureCtx: CanvasRenderingContext2D | null | undefined

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (measureCtx === undefined) {
    measureCtx = document.createElement('canvas').getContext('2d')
  }
  return measureCtx
}

/**
 * 한 줄에 다 안 들어가는 텍스트를 줄바꿈하는 대신, 폰트 크기를 줄여서 한 줄에 맞춘다.
 * (예: 매장명이 길어지면 줄바꿈되던 걸 글자 크기를 줄여 한 줄로 유지)
 * minSize 밑으로는 더 줄이지 않는다 — 그보다 긴 텍스트는 그 크기에서 잘릴 수 있다.
 *
 * 폭은 캔버스(ctx.measureText)로 측정한다 — 실제 렌더링 중인 요소의 style을 측정용으로
 * 직접 건드리면, 계산된 목표 크기가 이전 값과 같을 때 React가 상태 변경이 없다고 보고
 * 리렌더를 건너뛰어(bail out) DOM이 측정 중 값(=maxSize)에 그대로 멈춰버리는 문제가 있었다.
 */
export default function FitText({
  text,
  maxSize,
  minSize,
  className,
  containerClassName,
  as: Container = 'div',
}: {
  text: string
  maxSize: number
  minSize: number
  className?: string
  containerClassName?: string
  /** 바깥 컨테이너 태그 — 시맨틱이 중요하면(예: 제목) 'h1' 등으로 지정 */
  as?: ElementType
}) {
  const containerRef = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(maxSize)

  useLayoutEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return

    const fit = () => {
      const available = container.clientWidth
      if (available <= 0) return

      const ctx = getMeasureCtx()
      let needed: number
      if (ctx) {
        const cs = getComputedStyle(textEl)
        ctx.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${maxSize}px ${cs.fontFamily}`
        needed = ctx.measureText(text).width
      } else {
        needed = 0 // 캔버스를 못 쓰는 환경이면 축소 없이 maxSize 유지
      }

      setFontSize(
        needed <= available ? maxSize : Math.max(minSize, Math.floor((maxSize * available) / needed)),
      )
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [text, maxSize, minSize])

  return (
    <Container ref={containerRef} className={`min-w-0 overflow-hidden ${containerClassName ?? ''}`}>
      <span
        ref={textRef}
        className={className}
        style={{ fontSize, whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '100%' }}
      >
        {text}
      </span>
    </Container>
  )
}
