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

// El color de una cifra tiene que decir algo. Las cifras van neutras; el tipo de ataque más frecuente
// lleva en el ícono el color de su tipo, el mismo del feed en vivo. El texto no se pinta: el amarillo
// de BOT sobre blanco daba 1,5:1 (19/11/2026).
function KpiCard({ label, value, sub, color, Icon }) {
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="pt-4 pb-4 px-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
            {label}
          </p>
          {Icon && (
            <Icon
              className={`size-5 shrink-0 ${color ? '' : 'text-muted-foreground'}`}
              style={color ? { color } : undefined}
              strokeWidth={1.6}
              aria-hidden
            />
          )}
        </div>
        {/* Value - font scales down as content length grows */}
        <p
          className={`font-black leading-none tabular-nums text-foreground ${
            String(value ?? '').length > 9 ? 'text-lg'
            : String(value ?? '').length > 5 ? 'text-xl'
            : String(value ?? '').length > 3 ? 'text-2xl'
            : 'text-4xl'
          }`}
        >
          {value ?? '-'}
        </p>
        {sub && (
          <p className="text-xs mt-2 text-muted-foreground truncate">
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
        value={stats?.total?.toLocaleString() ?? '-'}
        sub={t('stats.total_sub')}
        Icon={Activity}
      />
      <KpiCard
        label={t('stats.unique_ips')}
        value={stats?.unique_ips?.toLocaleString() ?? '-'}
        sub={t('stats.unique_ips_sub')}
        Icon={Globe}
      />
      <KpiCard
        label={t('stats.today')}
        value={stats?.today?.toLocaleString() ?? '-'}
        sub={t('stats.today_sub')}
        Icon={Wifi}
      />
      <KpiCard
        label={t('stats.top_ip')}
        value={stats?.top_ip || '-'}
        sub={stats?.top_ip_count ? t('stats.events_count', { count: stats.top_ip_count.toLocaleString() }) : undefined}
        Icon={ShieldAlert}
      />
      <KpiCard
        label={t('stats.top_type')}
        value={topMeta ? topMeta.label : '-'}
        sub={topTypeEntry ? t('stats.events_count', { count: topTypeEntry[1].toLocaleString() }) : undefined}
        color={topColor}
        Icon={TopIcon}
      />
    </div>
  )
}
