import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getMeta, fmtDateTime } from '../lib/utils'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''
const PAGE_SIZE = 50

export default function EventTable({ token, refreshTick }) {
  const { t } = useTranslation()

  const TYPES = [
    { value: '',       label: t('events.filter_all') },
    { value: 'BRUTE',  label: 'BRUTE'   },
    { value: 'SCAN',   label: 'SCAN'    },
    { value: 'BOT',    label: 'BOT'     },
    { value: 'RECON',  label: 'RECON'   },
    { value: 'HUMAN',  label: t('events.human') },
  ]
  const [events, setEvents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState('')
  const [ipFilter, setIpFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      ...(typeFilter && { type: typeFilter }),
      ...(ipFilter.trim() && { ip: ipFilter.trim() }),
    })
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const d = await r.json()
      setEvents(d.events || [])
      setTotal(d.total || 0)
    } catch { /* ignore */ }
    setLoading(false)
  }, [token, page, typeFilter, ipFilter])

  useEffect(() => { load() }, [load, refreshTick])

  function onFilterChange(setter) {
    return (v) => { setter(v); setPage(0) }
  }

  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
        <span className="text-zinc-400 text-sm font-medium">{t('nav.table')}</span>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <input
            type="text"
            placeholder={t('events.filter_ip')}
            value={ipFilter}
            onChange={e => onFilterChange(setIpFilter)(e.target.value)}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-red-600/50 w-36 font-terminal"
          />
          <select
            value={typeFilter}
            onChange={e => onFilterChange(setTypeFilter)(e.target.value)}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-red-600/50 font-terminal"
          >
            {TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-sm transition-colors disabled:opacity-50"
          >
            {loading ? '...' : '↺'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">{t('events.col_timestamp')}</th>
              <th className="text-left px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">{t('events.col_type')}</th>
              <th className="text-left px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">{t('events.col_ip')}</th>
              <th className="text-left px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">{t('events.col_geo')}</th>
              <th className="text-left px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">{t('events.col_detail')}</th>
              <th className="text-right px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">{t('events.col_score')}</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-zinc-700 font-terminal text-sm">
                  {loading ? t('usuarios.loading') : t('auditoria.no_data')}
                </td>
              </tr>
            ) : events.map((ev, i) => {
              const meta = getMeta(ev.type)
              const detail = ev.path
                ? `${ev.method || 'GET'} ${ev.path}`
                : ev.ports
                  ? `Ports: ${ev.ports.join(', ')}`
                  : ev.port
                    ? `:${ev.port}`
                    : '—'
              return (
                <tr
                  key={ev.id ?? i}
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-2.5 font-terminal text-xs text-zinc-500 whitespace-nowrap">
                    {fmtDateTime(ev.ts)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-terminal text-xs ${meta.color} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} inline-block`} />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-terminal text-xs text-zinc-300">
                      {ev.ip}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                    {ev.flag && <span className="mr-1">{ev.flag}</span>}
                    {ev.country || '—'}{ev.city ? ` · ${ev.city}` : ''}
                  </td>
                  <td className="px-4 py-2.5 font-terminal text-xs text-zinc-500 max-w-[240px] truncate">
                    {detail}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-terminal text-xs ${
                      ev.score >= 70 ? 'text-red-400' :
                      ev.score >= 50 ? 'text-orange-400' :
                      ev.score >= 30 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {ev.score ?? '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-zinc-600 text-xs font-terminal">
            {t('stats.events_count', { count: total.toLocaleString() })} · {t('auditoria.page', { page: page + 1, total: pages })}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="px-2 py-1 text-xs font-terminal text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-xs font-terminal text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(7, pages) }, (_, i) => {
              const p = Math.max(0, Math.min(page - 3, pages - 7)) + i
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-2.5 py-1 text-xs font-terminal rounded transition-colors ${
                    p === page
                      ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                      : 'text-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  {p + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
              className="px-2 py-1 text-xs font-terminal text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
            <button
              onClick={() => setPage(pages - 1)}
              disabled={page >= pages - 1}
              className="px-2 py-1 text-xs font-terminal text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
