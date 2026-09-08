import cartIcon from '../assets/cart.svg'

// 화면 하단에 고정되는 알약 버튼 (장바구니 보기 / 결제하기).
export default function BottomButton({
  label,
  active,
  showCartIcon = false,
  disabled = false,
  onClick,
}: {
  label: string
  active: boolean
  showCartIcon?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] left-1/2 z-30 flex h-[58px] w-[70%] max-w-[280px] -translate-x-1/2 items-center justify-center gap-[16px] rounded-[100px] transition-colors disabled:cursor-default ${
        active
          ? 'bg-[#ff6000] shadow-[0px_0px_55px_-15px_#ff6000]'
          : 'bg-[#bebebe] shadow-[0px_0px_55px_-15px_#3b3b3b]'
      }`}
    >
      {showCartIcon && <img alt="" className="size-[25px]" src={cartIcon} />}
      <span className="text-[16px] font-bold leading-none text-[#f9f9f9]">{label}</span>
    </button>
  )
}
