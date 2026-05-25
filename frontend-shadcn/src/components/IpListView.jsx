import React, { useState, useEffect, useCallback } from 'react'
import { getMeta, fmtDateTime } from '../lib/utils'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''
const PAGE_SIZE = 50

const TYPE_FILTERS = [
  { value: '',      label: 'Todos los tipos' },
  { value: 'BRUTE', label: 'BRUTE'   },
  { value: 'SCAN',  label: 'SCAN'    },
  { value: 'BOT',   label: 'BOT'     },
  { value: 'RECON', label: 'RECON'   },
  { value: 'HUMAN', label: 'HUMANO'  },
]

const SORT_OPTIONS = [
  { value: 'hits',       label: 'Más activa'   },
  { value: 'last_seen',  label: 'Más reciente' },
  { value: 'first_seen', label: 'Más antigua'  },
]

export default function IpListView({ token }) {
  const [ips, setIps]             = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(0)
  const [sort, setSort]           = useState('hits')
  const [typeFilter, setTypeFilter]       = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [loading, setLoading]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      sort,
      ...(typeFilter && { type: typeFilter }),
      ...(countryFilter.trim() && { country: countryFilter.trim().toUpperCase() }),
    })
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/ips?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      setIps(d.ips || [])
      setTotal(d.total || 0)
    } catch { /* ignore */ }
    setLoading(false)
  }, [token, page, sort, typeFilter, countryFilter])

  useEffect(() => { load() }, [load])

  function resetAndSet(setter) {
    return v => { setter(v); setPage(0) }
  }

  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
        <span className="text-zinc-400 text-sm font-medium">
          {total.toLocaleString()} IPs registradas
        </span>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <input
            type="text"
            placeholder="País (AR, US...)"
            value={countryFilter}
            onChange={e => resetAndSet(setCountryFilter)(e.target.value)}
            maxLength={2}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-red-600/50 w-28 font-terminal uppercase"
          />
          <select
            value={typeFilter}
            onChange={e => resetAndSet(setTypeFilter)(e.target.value)}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-red-600/50 font-terminal"
          >
            {TYPE_FILTERS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(0) }}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-red-600/50 font-terminal"
          >
            {SORT_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
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
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">IP Origen</th>
              <th className="text-left px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">País</th>
              <th className="text-right px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">Eventos</th>
              <th className="text-left px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">Tipos de ataque</th>
              <th className="text-left px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">Primera vez</th>
              <th className="text-left px-4 py-2.5 text-zinc-600 font-medium text-xs uppercase tracking-wider">Última actividad</th>
            </tr>
          </thead>
          <tbody>
            {ips.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-zinc-700 font-terminal text-sm">
                  {loading ? 'Cargando...' : 'Sin IPs registradas'}
                </td>
              </tr>
            ) : ips.map((row, i) => (
              <tr
                key={`${row.ip}-${i}`}
                className="border-b border-border hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <span className="font-terminal text-sm text-zinc-200">
                    {row.ip}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-zinc-400 text-xs whitespace-nowrap">
                  <span className="mr-1">{row.flag}</span>
                  {row.country}
                  {row.city ? <span className="text-zinc-600"> · {row.city}</span> : null}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="font-terminal text-base font-bold text-white">{row.hits.toLocaleString()}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1 flex-wrap">
                    {(row.types || []).map(t => {
                      const m = getMeta(t)
                      return (
                        <span
                          key={t}
                          className={`font-terminal text-[10px] px-1.5 py-0.5 rounded border ${m.color} border-current/20`}
                        >
                          {m.label}
                        </span>
                      )
                    })}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-terminal text-xs text-zinc-600 whitespace-nowrap">
                  {fmtDateTime(row.first_seen)}
                </td>
                <td className="px-4 py-2.5 font-terminal text-xs text-zinc-500 whitespace-nowrap">
                  {fmtDateTime(row.last_seen)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-zinc-600 text-xs font-terminal">
            {total.toLocaleString()} IPs · pág {page + 1}/{pages}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(0)} disabled={page === 0}
              className="px-2 py-1 text-xs font-terminal text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-2 py-1 text-xs font-terminal text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="px-2 py-1 text-xs font-terminal text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
            <button onClick={() => setPage(pages - 1)} disabled={page >= pages - 1}
              className="px-2 py-1 text-xs font-terminal text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
          </div>
        </div>
      )}
    </div>
  )
}
