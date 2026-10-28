import { useState } from 'react'
import { useOwnerStores, useStoreStats } from '../../api/queries'
import { percent, totals } from '../../lib/stats'
import { Badge, Card, EmptyState, Skeleton } from '../../ui/Surfaces'
import { BarChart3 } from 'lucide-react'

/** 최근 7/30일 노출·수락·인증 방문·쿠폰 사용과 전환율 (Spec REQ-P13) */
export function DashboardPage() {
  const stores = useOwnerStores()
  const store = stores.data?.[0]
  const [days, setDays] = useState<7 | 30>(7)
  const stats = useStoreStats(store?.id, days)

  if (stores.isPending) return <Skeleton className="h-64" />
  if (!store) return <EmptyState icon={<BarChart3 size={32} />} title="등록된 매장이 없어요" />

  const list = stats.data?.days ?? []
  const t = totals(list)
  const max = Math.max(1, ...list.map((d) => d.visits))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-3">대시보드</p>
          <h1 className="text-2xl font-extrabold">{store.name}</h1>
          <div className="mt-2">{store.paused ? <Badge tone="amber">일시중지됨</Badge> : <Badge tone="brand">추천 중</Badge>}</div>
        </div>
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-btn bg-sunken p-1">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={days === d}
              onClick={() => setDays(d)}
              className={`h-10 rounded-sm px-4 text-sm font-bold ${days === d ? 'bg-surface shadow-sm' : 'text-ink-3'}`}
            >
              최근 {d}일
            </button>
          ))}
        </div>
      </div>

      {stats.isPending ? (
        <Skeleton className="h-64" />
      ) : list.length === 0 ? (
        <EmptyState icon={<BarChart3 size={32} />} title="아직 노출 기록이 없어요" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="차량 화면 노출" value={t.impressions} />
            <Metric label="들를게요" value={t.accepts} />
            <Metric label="인증된 방문" value={t.visits} highlight />
            <Metric label="쿠폰 사용" value={t.redemptions} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <p className="text-sm text-ink-2">노출 → 실제 방문</p>
              <p className="text-3xl font-black text-brand-strong">{percent(t.visitRate)}</p>
            </Card>
            <Card>
              <p className="text-sm text-ink-2">방문 → 쿠폰 사용</p>
              <p className="text-3xl font-black">{percent(t.redeemRate)}</p>
            </Card>
          </div>
          <Card>
            <p className="mb-4 font-bold">일자별 인증 방문</p>
            {/* 각 막대 칸이 전체 높이를 가져야 퍼센트 높이가 계산된다 */}
            <div className="flex h-40 gap-1" aria-label="일자별 인증 방문 막대그래프">
              {list.map((d) => (
                <div key={d.date} className="flex h-full flex-1 flex-col justify-end">
                  <div className="w-full rounded-t-sm bg-brand" style={{ height: `${(d.visits / max) * 100}%` }} title={`${d.date} · ${d.visits}회`} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-ink-3">
              <span>{list[0]?.date.slice(5)}</span>
              <span>{list[list.length - 1]?.date.slice(5)}</span>
            </div>
          </Card>
          <p className="text-sm text-ink-3">인증된 방문 = 웨이핏 추천을 보고 매장 반경에 들어와 주차(P단)까지 확인된 손님</p>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-brand bg-brand-soft' : ''}>
      <p className="text-sm text-ink-2">{label}</p>
      <p className={`mt-1 text-3xl font-black ${highlight ? 'text-brand-strong' : ''}`}>{value.toLocaleString()}</p>
    </Card>
  )
}
