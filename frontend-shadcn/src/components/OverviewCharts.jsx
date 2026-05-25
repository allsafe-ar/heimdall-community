import React, { useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

const TYPE_ORDER = ['BRUTE', 'PORTSCAN', 'SCAN', 'BOT', 'RECON', 'HUMAN']

const TYPE_BARS = [
  { key: 'BRUTE',    fill: '#f87171', label: 'BRUTE'    },
  { key: 'PORTSCAN', fill: '#c084fc', label: 'PORTSCAN' },
  { key: 'SCAN',     fill: '#fb923c', label: 'SCAN'     },
  { key: 'BOT',      fill: '#facc15', label: 'BOT'      },
  { key: 'RECON',    fill: '#60a5fa', label: 'RECON'    },
  { key: 'HUMAN',    fill: '#4ade80', label: 'HUMANO'   },
]

function HeimdallTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const items = payload.filter(p => (p.value ?? 0) > 0)
  if (!items.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {items.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5" style={{ color: p.fill }}>
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: p.fill }} />
            {p.name}
          </span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function OverviewCharts({ events, stats }) {

  const hourly = useMemo(() => {
    const now = Date.now()
    const buckets = {}
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now - i * 3600000)
      buckets[h.getHours()] = { hour: h.getHours().toString().padStart(2, '0') + ':00', events: 0 }
    }
    events.forEach(ev => {
      const d = new Date(ev.ts)
      if (now - d.getTime() < 86400000) {
        const h = d.getHours()
        if (buckets[h]) buckets[h].events++
      }
    })
    return Object.values(buckets)
  }, [events])

  // Build ONE data point with all type counts as keys — same pattern as Gjallarhorn
  const chartData = useMemo(() => {
    const raw = stats?.by_type
    if (!raw) return null
    const counts = Array.isArray(raw)
      ? Object.fromEntries(raw.map(r => [r.type, Number(r.c ?? r.count ?? 0)]))
      : raw
    const point = {}
    TYPE_ORDER.forEach(t => { point[t] = Number(counts[t] ?? 0) })
    return [point]
  }, [stats])

  const hasData = chartData && TYPE_ORDER.some(t => (chartData[0]?.[t] ?? 0) > 0)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

      {/* Area chart — activity 24h */}
      <div className="xl:col-span-3 bg-card border border-border rounded-xl p-3 flex flex-col">
        <div className="mb-2">
          <p className="text-sm font-semibold text-foreground">Actividad últimas 24h</p>
          <p className="text-xs text-muted-foreground">Eventos por hora</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={hourly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<HeimdallTooltip />} />
              <Area type="monotone" dataKey="events" name="Eventos"
                stroke="#dc2626" strokeWidth={2}
                fill="url(#gradRed)" dot={false} activeDot={{ r: 4, fill: '#dc2626' }}
              />
            </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart — type distribution — Gjallarhorn pattern */}
      <div className="xl:col-span-2 bg-card border border-border rounded-xl p-3 flex flex-col">
        <div className="mb-2">
          <p className="text-sm font-semibold text-foreground">Distribución por tipo</p>
          <p className="text-xs text-muted-foreground">Total acumulado</p>
        </div>
        {hasData ? (
          <>
            <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<HeimdallTooltip />} cursor={{ fill: '#ffffff08' }} />
                  {TYPE_BARS.map(b => (
                    <Bar key={b.key} dataKey={b.key} fill={b.fill} radius={[4,4,0,0]} isAnimationActive name={b.label} />
                  ))}
                </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex-none flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              {TYPE_BARS.filter(b => (chartData[0]?.[b.key] ?? 0) > 0).map(b => (
                <div key={b.key} className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ background: b.fill }} />
                  <span className="font-terminal text-[10px] text-muted-foreground">{b.label}</span>
                  <span className="font-terminal text-[10px] font-bold" style={{ color: b.fill }}>
                    {(chartData[0]?.[b.key] ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm" style={{ height: 180 }}>
            Sin datos aún
          </div>
        )}
      </div>

    </div>
  )
}
