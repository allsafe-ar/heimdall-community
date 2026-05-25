import React from 'react'
import { Activity, Globe, Wifi, ShieldAlert, AlertTriangle, KeyRound, ScanSearch, Bot, Eye, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getMeta } from '../lib/utils'

const TYPE_ICONS = {
  BRUTE:    KeyRound,
  PORTSCAN: ScanSearch,
  SCAN:     Globe,
  BOT:      Bot,
  RECON:    Eye,
  HUMAN:    User,
}

const TYPE_COLORS = {
  BRUTE:    '#f87171',
  PORTSCAN: '#c084fc',
  SCAN:     '#fb923c',
  BOT:      '#facc15',
  RECON:    '#60a5fa',
  HUMAN:    '#4ade80',
}

function KpiCard({ label, value, sub, color, Icon }) {
  return (
    <div className="bg-card border border-border rounded-xl relative overflow-hidden">
      <div className="pt-4 pb-4 px-5">
        {/* Background icon — large, semi-transparent, top-right */}
        {Icon && (
          <Icon
            className="absolute right-4 top-4 pointer-events-none"
            style={{ width: 52, height: 52, color, opacity: 0.13 }}
            strokeWidth={1.2}
          />
        )}
        {/* Label */}
        <p className="relative z-10 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 pr-14 leading-tight">
          {label}
        </p>
        {/* Value — font scales down as content length grows */}
        <p
          className={`relative z-10 font-black leading-none tabular-nums pr-14 ${
            String(value ?? '').length > 9 ? 'text-lg'
            : String(value ?? '').length > 5 ? 'text-xl'
            : String(value ?? '').length > 3 ? 'text-2xl'
            : 'text-4xl'
          }`}
          style={{ color }}
        >
          {value ?? '—'}
        </p>
        {/* Sub description */}
        {sub && (
          <p className="relative z-10 text-[11px] mt-2 text-muted-foreground pr-14 truncate">
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

export default function StatsBar({ stats }) {
  const { t } = useTranslation()
  const byType = stats?.by_type || {}

  const topTypeEntry = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]
  const topMeta      = topTypeEntry ? getMeta(topTypeEntry[0]) : null
  const TopIcon      = topTypeEntry ? (TYPE_ICONS[topTypeEntry[0]] || AlertTriangle) : AlertTriangle
  const topColor     = topTypeEntry ? (TYPE_COLORS[topTypeEntry[0]] || '#9ca3af') : '#9ca3af'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <KpiCard
        label={t('stats.total')}
        value={stats?.total?.toLocaleString() ?? '—'}
        sub={t('stats.total_sub')}
        color="#f87171"
        Icon={Activity}
      />
      <KpiCard
        label={t('stats.unique_ips')}
        value={stats?.unique_ips?.toLocaleString() ?? '—'}
        sub={t('stats.unique_ips_sub')}
        color="#60a5fa"
        Icon={Globe}
      />
      <KpiCard
        label={t('stats.today')}
        value={stats?.today?.toLocaleString() ?? '—'}
        sub={t('stats.today_sub')}
        color="#fb923c"
        Icon={Wifi}
      />
      <KpiCard
        label={t('stats.top_ip')}
        value={stats?.top_ip || '—'}
        sub={stats?.top_ip_count ? t('stats.events_count', { count: stats.top_ip_count.toLocaleString() }) : undefined}
        color="#c084fc"
        Icon={ShieldAlert}
      />
      <KpiCard
        label={t('stats.top_type')}
        value={topMeta ? topMeta.label : '—'}
        sub={topTypeEntry ? t('stats.events_count', { count: topTypeEntry[1].toLocaleString() }) : undefined}
        color={topColor}
        Icon={TopIcon}
      />
    </div>
  )
}
