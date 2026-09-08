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
    <div className="absolute bottom-[-3px] right-0 flex h-[26px] w-[78px] items-center justify-between rounded-[60px] bg-[#ff6000] px-[6px] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.25)]">
      <button
        type="button"
        onClick={onDecrement}
        aria-label="수량 감소"
        className="flex size-[16px] items-center justify-center"
      >
        <img alt="" className="h-[2px] w-[11px]" src={minusWhite} />
      </button>
      <span className="text-[13px] font-bold leading-none text-white">{quantity}</span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="수량 증가"
        className="flex size-[16px] items-center justify-center"
      >
        <img alt="" className="size-[13px]" src={plusWhite} />
      </button>
    </div>
  )
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="담기"
      className="absolute bottom-[-3px] right-0 flex size-[26px] items-center justify-center rounded-full bg-[#fafbfc] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.25)]"
    >
      <img alt="" className="size-[14px]" src={plusOrange} />
    </button>
  )
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
  return (
    <div className="relative flex min-h-[123px] shrink-0 gap-[16px] overflow-hidden rounded-[16px] bg-[#fafbfc] p-[20px] shadow-[0px_1px_4.9px_-1px_rgba(0,0,0,0.25)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[16px] font-bold leading-[normal] text-black">{item.name}</h3>
        <p className="mt-[8px] text-[16px] font-bold leading-[normal] text-black">
          {item.price.toLocaleString()}원
        </p>
        <p className="mt-[6px] line-clamp-2 text-[10px] font-semibold leading-[normal] text-[#969ca3]">
          {item.description}
        </p>
      </div>

      <div className="relative size-[87px] shrink-0 self-start">
        <img
          alt={item.name}
          className={`size-full rounded-[16px] object-cover ${item.soldOut ? 'opacity-40' : ''}`}
          src={item.image}
        />
        {item.soldOut ? (
          <span className="absolute bottom-[-3px] right-0 rounded-[60px] bg-[#bebebe] px-[10px] py-[4px] text-[12px] font-bold leading-none text-white">
            품절
          </span>
        ) : quantity > 0 ? (
          <QuantityCounter
            quantity={quantity}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
          />
        ) : (
          <AddButton onClick={onIncrement} />
        )}
      </div>
    </div>
  )
}
