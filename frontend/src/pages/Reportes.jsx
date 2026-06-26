import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Printer, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react'
import { getMeta, behaviorMeta, fmtDateTime } from '../lib/utils'
import { generateReportPDF } from '../lib/report-pdf'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''

const VERDICT = {
  calm:      { Icon: ShieldCheck,  color: 'text-green-400',  border: 'border-green-500/40',  bg: 'bg-green-500/10' },
  attention: { Icon: AlertTriangle,color: 'text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-500/10' },
  alert:     { Icon: ShieldAlert,  color: 'text-red-400',    border: 'border-red-500/40',    bg: 'bg-red-500/10' },
}

export default function Reportes({ token }) {
  const { t } = useTranslation()
  const [since, setSince] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function exportPdf() {
    if (!data) return
    setExporting(true)
    try { await generateReportPDF(data, t) } catch { /* ignore */ }
    setExporting(false)
  }

  const fetchReport = useCallback(async (range) => {
    setLoading(true)
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/report?since=${range}`, { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) setData(await r.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [token])

  useEffect(() => { fetchReport(since) }, [since, fetchReport])

  if (!data) return <div className='text-sm text-muted-foreground py-8 text-center animate-pulse'>{t('report.loading')}</div>

  const a = data.assessment
  const v = VERDICT[a.level] || VERDICT.calm
  const summary = t(`report.summary_${a.level}`, {
    events: a.total, ips: a.unique_ips, pct: a.automated_pct,
    exploits: a.exploits, critical: a.critical_ips, campaigns: a.campaigns, stuffing: a.cred_stuffing,
  })

  return (
    <div className='space-y-4 max-w-4xl'>
      {/* Controles */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-semibold text-foreground flex items-center gap-2'>
            <FileText className='size-5 text-muted-foreground' />
            {t('report.title')}
          </h2>
          <p className='text-sm text-muted-foreground'>{t('report.subtitle')}</p>
        </div>
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-1 rounded-lg border border-border bg-card p-1'>
            {['24h', '7d', '30d', 'all'].map(r => (
              <button key={r} onClick={() => setSince(r)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${since === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t(`report.range.${r}`)}
              </button>
            ))}
          </div>
          <button onClick={exportPdf} disabled={exporting}
            className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition-opacity'>
            <Printer className='size-3.5' /> {exporting ? t('report.exporting') : t('report.export')}
          </button>
        </div>
      </div>

      {/* Contenido del reporte en pantalla (el PDF se genera aparte con jsPDF) */}
      <div className='space-y-4'>
        {/* Veredicto */}
        <div className={`rounded-xl border ${v.border} ${v.bg} p-5`}>
          <div className='flex items-start gap-3'>
            <v.Icon className={`size-6 ${v.color} shrink-0 mt-0.5`} />
            <div>
              <div className={`text-base font-bold ${v.color}`}>{t(`report.verdict_${a.level}`)}</div>
              <p className='text-sm text-foreground/90 mt-1 leading-relaxed'>{summary}</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          {[
            { l: t('report.events'), v: a.total },
            { l: t('report.unique_ips'), v: a.unique_ips },
            { l: t('report.automated'), v: `${a.automated_pct}%` },
            a.exploits != null
              ? { l: t('report.exploits'), v: a.exploits, danger: a.exploits > 0 }
              : { l: t('report.cred_stuffing'), v: a.cred_stuffing ?? 0, danger: (a.cred_stuffing ?? 0) > 0 },
          ].map((k, i) => (
            <div key={i} className='bg-card border border-border rounded-xl p-3'>
              <div className={`text-2xl font-bold ${k.danger ? 'text-red-400' : 'text-foreground'}`}>{k.v}</div>
              <div className='text-[11px] text-muted-foreground mt-0.5'>{k.l}</div>
            </div>
          ))}
        </div>

        {/* Por tipo */}
        <div className='bg-card border border-border rounded-xl p-4'>
          <h3 className='text-sm font-semibold text-foreground mb-3'>{t('report.by_type')}</h3>
          <div className='flex flex-wrap gap-2'>
            {data.by_type.map(r => {
              const m = getMeta(r.type)
              return (
                <span key={r.type} className={`text-xs px-2.5 py-1 rounded-full border border-current ${m.color}`}>
                  {r.type} · {r.count} ({r.ips} IPs)
                </span>
              )
            })}
          </div>
        </div>

        {/* Top IPs */}
        <div className='bg-card border border-border rounded-xl p-4'>
          <h3 className='text-sm font-semibold text-foreground mb-3'>{t('report.top_ips')}</h3>
          <table className='w-full text-xs'>
            <thead><tr className='text-muted-foreground text-left'>
              <th className='py-1 font-medium'>IP</th><th className='py-1 font-medium'>{t('report.country')}</th>
              <th className='py-1 font-medium text-right'>Hits</th><th className='py-1 font-medium text-right'>{t('report.behavior')}</th>
            </tr></thead>
            <tbody>
              {data.top_ips.slice(0, 10).map(ip => {
                const bm = behaviorMeta(ip.behavior_level)
                return (
                  <tr key={ip.ip} className='border-t border-border'>
                    <td className='py-1.5 font-terminal text-foreground'>{ip.ip} {ip.campaign && <span className='text-[9px] text-pink-400'>CAMPAÑA</span>}</td>
                    <td className='py-1.5 text-muted-foreground'>{ip.flag} {ip.country}</td>
                    <td className='py-1.5 text-right text-muted-foreground tabular-nums'>{ip.hits}</td>
                    <td className={`py-1.5 text-right font-medium ${ip.behavior_score != null ? bm.color : 'text-muted-foreground'}`}>{ip.behavior_score != null ? `${ip.behavior_score} ${bm.label}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Top paths + países */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div className='bg-card border border-border rounded-xl p-4'>
            <h3 className='text-sm font-semibold text-foreground mb-2'>{t('report.top_paths')}</h3>
            {data.top_paths.slice(0, 8).map((p, i) => (
              <div key={i} className='flex justify-between text-xs py-1 border-t border-border first:border-0'>
                <span className='font-terminal text-muted-foreground truncate'>{p.path}</span>
                <span className='text-muted-foreground tabular-nums shrink-0 ml-2'>{p.count} ({p.ips} IPs)</span>
              </div>
            ))}
          </div>
          <div className='bg-card border border-border rounded-xl p-4'>
            <h3 className='text-sm font-semibold text-foreground mb-2'>{t('report.top_countries')}</h3>
            {data.by_country.slice(0, 8).map((c, i) => (
              <div key={i} className='flex justify-between text-xs py-1 border-t border-border first:border-0'>
                <span className='text-foreground'>{c.flag} {c.country}</span>
                <span className='text-muted-foreground tabular-nums'>{c.count} ({c.ips} IPs)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credenciales */}
        {data.credentials.length > 0 && (
          <div className='bg-card border border-border rounded-xl p-4'>
            <h3 className='text-sm font-semibold text-foreground mb-2'>{t('report.credentials')}</h3>
            <div className='flex flex-wrap gap-2'>
              {data.credentials.slice(0, 12).map((c, i) => (
                <span key={i} className='text-xs font-terminal px-2 py-1 rounded border border-border text-muted-foreground'>
                  {c.credential} <span className='text-zinc-600'>· {c.count}× ({c.ips} IPs)</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
