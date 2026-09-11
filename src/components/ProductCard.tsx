import type { Product } from '../data'
import plusOrange from '../assets/plus-orange.svg'
import plusWhite from '../assets/plus-white.svg'
import minusWhite from '../assets/minus-white.svg'

function QuantityCounter({
  quantity,
  onIncrement,
  onDecrement,
}: {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
}) {
  return (
    <div
      // 카드 전체가 "담기"이므로, 이 안의 -/+ 클릭이 카드 클릭으로 겹쳐 발동하지 않게 막는다.
      className="flex h-[32px] w-[88px] items-center justify-between rounded-[60px] bg-[#ff6000] px-[6px] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.25)]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label="수량 감소"
        className="flex size-[22px] items-center justify-center"
      >
        <img alt="" className="h-[2px] w-[13px]" src={minusWhite} />
      </button>
      <span className="text-[14px] font-bold leading-none text-white">{quantity}</span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="수량 증가"
        className="flex size-[22px] items-center justify-center"
      >
        <img alt="" className="size-[16px]" src={plusWhite} />
      </button>
    </div>
  )
}

// 카드 전체를 눌러도 담기가 동작하므로, 이 원형 버튼은 그 동작을 보여주는 장식용 표시일 뿐이다.
function AddButtonMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-[26px] items-center justify-center rounded-full bg-[#fafbfc] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.25)]"
    >
      <img alt="" className="size-[14px]" src={plusOrange} />
    </span>
  )
}

function SoldOutBadge() {
  return (
    <span className="rounded-[60px] bg-[#bebebe] px-[10px] py-[4px] text-[12px] font-bold leading-none text-white">
      품절
    </span>
  )
}

// 품절 배지 / 수량 조절 / 담기 표시 — 위치는 감싸는 쪽(사진 박스 모서리 vs 카드 하단)에서 정한다.
function CardControls({
  item,
  quantity,
  onIncrement,
  onDecrement,
}: {
  item: Product
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
}) {
  if (item.soldOut) return <SoldOutBadge />
  if (quantity > 0) {
    return <QuantityCounter quantity={quantity} onIncrement={onIncrement} onDecrement={onDecrement} />
  }
  return <AddButtonMark />
}

export default function ProductCard({
  item,
  quantity,
  onIncrement,
  onDecrement,
}: {
  item: Product
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
}) {
  const controls = (
    <CardControls item={item} quantity={quantity} onIncrement={onIncrement} onDecrement={onDecrement} />
  )

  // 카드 아무 데나 눌러도 담긴다(품절 제외). 안의 -/+ 버튼은 자체 stopPropagation으로 따로 동작한다.
  const handleActivate = () => {
    if (!item.soldOut) onIncrement()
  }

  return (
    <div
      role="button"
      tabIndex={item.soldOut ? -1 : 0}
      aria-label={`${item.name} 담기`}
      aria-disabled={item.soldOut}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        handleActivate()
      }}
      className={`relative flex min-h-[123px] shrink-0 gap-[16px] overflow-hidden rounded-[16px] bg-[#fafbfc] p-[20px] shadow-[0px_1px_4.9px_-1px_rgba(0,0,0,0.25)] ${
        item.soldOut ? '' : 'cursor-pointer'
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[16px] font-bold leading-[normal] text-black">{item.name}</h3>
        <p className="mt-[8px] text-[16px] font-bold leading-[normal] text-black">
          {item.price.toLocaleString()}원
        </p>
        <p className="mt-[6px] line-clamp-2 text-[10px] font-semibold leading-[normal] text-[#969ca3]">
          {item.description}
        </p>

        {/* 서버가 imageUrl 을 안 줄 때만 — 사진 박스가 없으니 컨트롤을 카드 하단에 인라인으로 둔다. */}
        {!item.image && <div className="mt-auto flex justify-end pt-[14px]">{controls}</div>}
      </div>

      {/* imageUrl 이 있을 때만 사진 박스를 그린다 — 없으면 플레이스홀더 없이 통째로 생략. */}
      {item.image && (
        <div className="relative size-[87px] shrink-0 self-start">
          <img
            alt={item.name}
            className={`size-full rounded-[16px] object-cover ${item.soldOut ? 'opacity-40' : ''}`}
            src={item.image}
          />
          <div className="absolute bottom-[-3px] right-0">{controls}</div>
        </div>
      )}
    </div>
  )
}
