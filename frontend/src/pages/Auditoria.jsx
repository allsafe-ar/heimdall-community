import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''
const PAGE_SIZE = 50

function fmtDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

export default function Auditoria({ token }) {
  const { t } = useTranslation()

  const ACTION_META = {
    login:           { label: t('audit.action.login'),            cls: 'text-green-500'  },
    password_changed:{ label: t('audit.action.password_changed'), cls: 'text-yellow-500' },
    user_created:    { label: t('audit.action.user_created'),     cls: 'text-blue-400'   },
    user_updated:    { label: t('audit.action.user_updated'),     cls: 'text-blue-400'   },
    user_deleted:    { label: t('audit.action.user_deleted'),     cls: 'text-red-500'    },
    user_toggle:     { label: t('audit.action.user_toggle'),      cls: 'text-yellow-400' },
    events_cleared:  { label: t('audit.action.events_cleared'),   cls: 'text-red-400'    },
    template_created:{ label: t('audit.action.template_created'), cls: 'text-blue-400'   },
    template_deleted:{ label: t('audit.action.template_deleted'), cls: 'text-red-400'    },
  }

  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(0)

  const authH = { Authorization: `Bearer ${token}` }

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(
        `${BACKEND}/heimdall/api/audit?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
        { headers: authH }
      )
      if (!r.ok) return
      const d = await r.json()
      setLogs(d.logs || [])
      setTotal(d.total || 0)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [token, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <ClipboardList size={20} className="text-primary" />
          {t('auditoria.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('auditoria.desc', { total })}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Loader2 size={18} className="animate-spin mr-2" />
            {t('auditoria.loading')}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {t('auditoria.no_data')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('auditoria.col_date')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">{t('auditoria.col_user')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('auditoria.col_action')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">{t('auditoria.col_detail')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map(log => {
                const meta = ACTION_META[log.action] || { label: log.action, cls: 'text-muted-foreground' }
                return (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs font-mono whitespace-nowrap">
                      {fmtDateTime(log.ts)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground hidden sm:table-cell">
                      {log.username || <span className="text-muted-foreground/50">{t('auditoria.system')}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell max-w-xs truncate">
                      {log.detail || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {t('auditoria.page', { page: page + 1, total: totalPages })}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
