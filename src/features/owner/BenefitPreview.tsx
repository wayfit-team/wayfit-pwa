import type { StoreCategory } from '../../api/types'

const EMOJI: Record<StoreCategory, string> = { CAFE: '☕', FOOD: '🍜', BAKERY: '🥐', ETC: '🏪' }
const LABEL: Record<StoreCategory, string> = { CAFE: '카페', FOOD: '음식점', BAKERY: '베이커리', ETC: '기타' }

/** 차량 화면 추천 카드와 같은 모양·색(다크)으로 미리보기 (Spec REQ-P12) */
export function BenefitPreview({ name, category, benefit }: { name: string; category: StoreCategory; benefit: string }) {
  return (
    <div className="rounded-card bg-[#0B0D10] p-5">
      <p className="mb-3 text-xs font-semibold text-[#6C7480]">차량 화면 미리보기</p>
      <div className="rounded-card border border-[#2FD8A3]/40 bg-[#1D2128] p-5 shadow-[0_0_24px_rgba(47,216,163,0.25)]">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-sm bg-[#2FD8A3]/15 text-2xl">{EMOJI[category]}</span>
          <div>
            <p className="text-lg font-semibold text-[#F3F5F7]">{name || '매장 이름'}</p>
            <p className="text-sm text-[#6C7480]">{LABEL[category]}</p>
          </div>
        </div>
        <p className="mt-3 text-2xl font-extrabold leading-snug text-[#2FD8A3]">{benefit || '혜택 문구'}</p>
        <div className="mt-3 flex gap-2 text-sm text-[#A4ACB7]">
          <span className="rounded-full bg-[#101318] px-3 py-1">1.2km 앞</span>
          <span className="rounded-full bg-[#101318] px-3 py-1">약 3분 우회</span>
        </div>
      </div>
    </div>
  )
}
