import { useState } from 'react'

// 국번은 010으로 고정하고, 나머지 8자리만 입력받는다.
const REST_DIGITS = 8

// 뒤 8자리를 "1234 - 5678" 형태로 보여준다.
function formatRest(digits: string): string {
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)} - ${digits.slice(4)}`
}

// 포장(togo) QR로 진입했을 때 메뉴 화면 위에 뜨는 전화번호 입력 모달.
// 입력한 번호(뒷자리)로 픽업 주문을 구분한다. (Figma node 20:362)
export default function PhoneEntryModal({ onSubmit }: { onSubmit: (phone: string) => void }) {
  const [rest, setRest] = useState('')

  const isValid = rest.length === REST_DIGITS
  const handleChange = (value: string) =>
    setRest(value.replace(/\D/g, '').slice(0, REST_DIGITS))
  const submit = () => {
    if (isValid) onSubmit(`010${rest}`)
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(28,28,28,0.3)] px-[36px]">
      <div className="w-[330px] max-w-full rounded-[16px] bg-[#fafbfc] px-[20px] pb-[26px] pt-[26px]">
        <h2 className="text-center text-[20px] font-extrabold leading-none text-[#ff6000]">
          전화번호 입력
        </h2>
        <p className="mt-[18px] text-center text-[14px] font-semibold leading-[1.35] text-[#1c1c1c]">
          픽업을 위한 전화번호로 사용되며,
          <br />
          금일 주점 종료 후 자동 파기됩니다.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <label className="mx-auto mt-[20px] flex h-[46px] w-[250px] max-w-full items-center rounded-[16px] bg-[#ededed] px-[20px]">
            <span className="text-[16px] font-medium text-[#969ca3]">010</span>
            <span className="mx-[8px] text-[16px] font-medium text-[#c9cdd2]">|</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={formatRest(rest)}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="1234 - 5678"
              className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-[#1c1c1c] outline-none placeholder:text-[#969ca3]"
            />
          </label>

          <button
            type="submit"
            disabled={!isValid}
            className={`mx-auto mt-[24px] flex h-[26px] w-[90px] items-center justify-center rounded-[16px] text-[13px] font-bold text-white transition-colors ${
              isValid ? 'bg-[#ff6000]' : 'bg-[#ffc9a8]'
            }`}
          >
            확인
          </button>
        </form>
      </div>
    </div>
  )
}
