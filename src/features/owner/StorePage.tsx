import { MapPin, Save } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError, errorMessage } from '../../api/errors'
import { useOwnerStores, useUpdateStore } from '../../api/queries'
import type { OwnerStore, StoreCategory, StoreUpdate, Weekday } from '../../api/types'
import { Button } from '../../ui/Button'
import { Card, Skeleton } from '../../ui/Surfaces'
import { BenefitPreview } from './BenefitPreview'

const BENEFIT_MAX = 40
const RADII = [100, 150, 300] as const
const CATEGORIES: { value: StoreCategory; label: string }[] = [
  { value: 'CAFE', label: '카페' },
  { value: 'FOOD', label: '음식점' },
  { value: 'BAKERY', label: '베이커리' },
  { value: 'ETC', label: '기타' },
]
const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: '월' }, { key: 'tue', label: '화' }, { key: 'wed', label: '수' }, { key: 'thu', label: '목' },
  { key: 'fri', label: '금' }, { key: 'sat', label: '토' }, { key: 'sun', label: '일' },
]

const input =
  'h-12 w-full rounded-btn border border-line bg-surface px-4 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand'

/** 매장 정보·혜택·반경·영업시간·PIN·일시중지 (Spec REQ-P11) */
export function StorePage() {
  const stores = useOwnerStores()
  const store = stores.data?.[0]
  if (stores.isPending || !store) return <Skeleton className="h-96" />
  return <StoreForm key={store.id} store={store} />
}

function StoreForm({ store }: { store: OwnerStore }) {
  const update = useUpdateStore(store.id)
  const [form, setForm] = useState<OwnerStore>(store)
  const [pin, setPin] = useState('')
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof OwnerStore>(key: K, value: OwnerStore[K]) => {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  const fieldError = (field: string) =>
    update.error instanceof ApiError && update.error.details.field === field ? update.error.message : null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const { id: _id, ...rest } = form
    const body: StoreUpdate = { ...rest, ...(pin ? { pinCode: pin } : {}) }
    update.mutate(body, {
      onSuccess: () => {
        setPin('')
        setSaved(true)
      },
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-ink-3">매장 정보</p>
          <h1 className="text-2xl font-extrabold">{store.name}</h1>
        </div>

        <Card className="flex flex-col gap-4">
          <Field label="매장 이름" htmlFor="name">
            <input id="name" className={input} value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </Field>
          <Field label="카테고리" htmlFor="category">
            <select id="category" className={input} value={form.category} onChange={(e) => set('category', e.target.value as StoreCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="주소" htmlFor="address">
            <input id="address" className={input} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="위도" htmlFor="lat">
              <input id="lat" type="number" step="0.000001" className={input} value={form.lat} onChange={(e) => set('lat', Number(e.target.value))} />
            </Field>
            <Field label="경도" htmlFor="lng">
              <input id="lng" type="number" step="0.000001" className={input} value={form.lng} onChange={(e) => set('lng', Number(e.target.value))} />
            </Field>
          </div>
          <a
            href={`https://map.kakao.com/link/map/${encodeURIComponent(form.name)},${form.lat},${form.lng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-bold text-brand-strong"
          >
            <MapPin size={16} /> 지도에서 위치 확인
          </a>
        </Card>

        <Card className="flex flex-col gap-4">
          <Field label={`혜택 문구 (${form.benefitText.length}/${BENEFIT_MAX})`} htmlFor="benefit" error={fieldError('benefitText')}>
            <input
              id="benefit"
              className={input}
              maxLength={BENEFIT_MAX}
              value={form.benefitText}
              onChange={(e) => set('benefitText', e.target.value)}
              placeholder="예: 아메리카노 1잔 무료"
              required
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-2">방문 인증 반경</legend>
            <div className="grid grid-cols-3 gap-2">
              {RADII.map((r) => (
                <button
                  type="button"
                  key={r}
                  aria-pressed={form.radiusM === r}
                  onClick={() => set('radiusM', r)}
                  className={`h-12 rounded-btn border font-bold ${form.radiusM === r ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line'}`}
                >
                  {r}m
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-ink-3">주차장이 넓거나 건물 안쪽이면 넓게 잡아주세요</p>
          </fieldset>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-semibold text-ink-2">영업시간 · 영업시간에만 추천돼요</p>
          <div className="flex flex-col gap-2">
            {WEEKDAYS.map(({ key, label }) => {
              const hours = form.openHours[key]
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-6 font-bold">{label}</span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hours === null}
                      onChange={(e) =>
                        set('openHours', { ...form.openHours, [key]: e.target.checked ? null : { open: '09:00', close: '21:00' } })
                      }
                    />
                    휴무
                  </label>
                  {hours && (
                    <>
                      <input
                        type="time"
                        aria-label={`${label} 여는 시간`}
                        className="h-10 rounded-sm border border-line px-2"
                        value={hours.open}
                        onChange={(e) => set('openHours', { ...form.openHours, [key]: { ...hours, open: e.target.value } })}
                      />
                      <span>~</span>
                      <input
                        type="time"
                        aria-label={`${label} 닫는 시간`}
                        className="h-10 rounded-sm border border-line px-2"
                        value={hours.close}
                        onChange={(e) => set('openHours', { ...form.openHours, [key]: { ...hours, close: e.target.value } })}
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <Field label="쿠폰 사용 PIN 변경 (숫자 4자리, 바꿀 때만)" htmlFor="pin" error={fieldError('pin')}>
            <input
              id="pin"
              inputMode="numeric"
              maxLength={4}
              className={`${input} font-mono tracking-[0.4em]`}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
            />
          </Field>
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="font-bold">추천 일시중지</span>
              <span className="block text-sm text-ink-3">재료 소진·휴가 때 잠시 멈춰요</span>
            </span>
            <input type="checkbox" className="size-6 accent-[#2FD8A3]" checked={form.paused} onChange={(e) => set('paused', e.target.checked)} />
          </label>
        </Card>
      </div>

      <aside className="flex flex-col gap-4 md:sticky md:top-20 md:self-start">
        <BenefitPreview name={form.name} category={form.category} benefit={form.benefitText} />
        {update.isError && !fieldError('benefitText') && !fieldError('pin') && (
          <p role="alert" className="font-semibold text-rose">
            {errorMessage(update.error)}
          </p>
        )}
        {saved && (
          <p role="status" className="font-semibold text-brand-strong">
            저장했어요. 다음 추천부터 반영돼요
          </p>
        )}
        <Button type="submit" size="lg" block icon={<Save size={20} />} disabled={update.isPending}>
          저장
        </Button>
      </aside>
    </form>
  )
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {error && <p className="text-sm font-semibold text-rose">{error}</p>}
    </div>
  )
}
