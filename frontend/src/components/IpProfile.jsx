import React, { useEffect, useState, useCallback } from 'react'
import { getMeta, fmtDateTime, threatLevel } from '../lib/utils'
import HelpTip from '@/components/HelpTip'
import { useTranslation } from 'react-i18next'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''

const REPUTACION = {
  malicious:  { label: 'Maliciosa',  cls: 'border-red-400/40 text-red-700 dark:text-red-300 bg-red-400/10' },
  tor:        { label: 'Tor',        cls: 'border-purple-400/40 text-purple-700 dark:text-purple-300 bg-purple-400/10' },
  suspicious: { label: 'Sospechosa', cls: 'border-yellow-400/40 text-yellow-700 dark:text-yellow-300 bg-yellow-400/10' },
  clean:      { label: 'Limpia',     cls: 'border-green-400/40 text-green-700 dark:text-green-300 bg-green-400/10' },
}

export default function IpProfile({ ip, token, onClose, isAdmin = false }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(false)

  useEffect(() => {
    if (!ip) return
    setLoading(true)
    fetch(`${BACKEND}/heimdall/api/ip/${encodeURIComponent(ip)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        // normalize by_type array → object
        if (Array.isArray(d.by_type)) {
          d.by_type = Object.fromEntries(d.by_type.map(r => [r.type, r.c]))
        }
        // max_score from events
        if (d.events?.length > 0) {
          d.max_score = Math.max(...d.events.map(e => e.threat_score || 0))
        }
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [ip, token])

  // Enriquecimiento manual, de a una IP. En Community solo las fuentes sin clave.
  const enrich = useCallback(async () => {
    setEnriching(true)
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/ip/${encodeURIComponent(ip)}/enrich`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        const intel = await r.json()
        setData(d => ({ ...d, intel }))
      }
    } catch { /* ignore */ }
    setEnriching(false)
  }, [ip, token])

  if (!ip) return null

  const threat = data ? threatLevel(data.max_score || 0) : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] z-50 bg-background border-l border-border flex flex-col animate-slide-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <div className="font-terminal text-lg text-white font-bold tracking-wider">{ip}</div>
            {data && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg">{data.flag || '🌐'}</span>
                <span className="text-muted-foreground text-sm">{data.country || 'Unknown'}{data.city ? ` · ${data.city}` : ''}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="font-terminal text-muted-foreground text-sm animate-pulse tracking-widest">CARGANDO...</div>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {/* Threat summary */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-muted-foreground text-xs uppercase tracking-widest mb-3">Resumen de amenaza</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${threat?.color}`}>{threat?.label}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Nivel</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{data.total_events || 0}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Eventos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{data.max_score || 0}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Score máx.</div>
                </div>
              </div>
            </div>

            {/* Type breakdown for this IP */}
            {data.by_type && Object.keys(data.by_type).length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-muted-foreground text-xs uppercase tracking-widest mb-3">Actividad por tipo</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.by_type).map(([type, count]) => {
                    const meta = getMeta(type)
                    return (
                      <span
                        key={type}
                        className={`font-terminal text-xs px-2.5 py-1 rounded-full border ${meta.color} border-current bg-current/5`}
                      >
                        {meta.icon} {type} · {count}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Timeline */}
            {data.events?.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-muted-foreground text-xs uppercase tracking-widest mb-3">
                  Últimos {data.events.length} eventos
                </div>
                <div className="flex flex-col gap-0">
                  {data.events.map((ev, i) => {
                    const meta = getMeta(ev.type)
                    return (
                      <div key={i} className="flex items-start gap-3 py-1.5 border-b border-border last:border-0">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${meta.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-terminal text-[11px] ${meta.color}`}>{ev.type}</span>
                            {ev.path && (
                              <span className="text-muted-foreground text-xs truncate">{ev.path}</span>
                            )}
                            {ev.ports && (
                              <span className="text-muted-foreground text-xs">[{ev.ports.join(',')}]</span>
                            )}
                            {ev.port && !ev.path && (
                              <span className="text-muted-foreground text-xs">:{ev.port}</span>
                            )}
                          </div>
                          {(ev.type === 'BRUTE' || ev.type === 'HUMAN') && ev.detail && (
                            <div className="font-terminal text-[10px] text-yellow-600/80 mt-0.5 truncate" title={ev.detail}>
                              → {ev.detail}
                            </div>
                          )}
                          <div className="text-muted-foreground text-[10px] font-terminal mt-0.5">
                            {fmtDateTime(ev.ts)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Threat Intel */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-muted-foreground text-xs uppercase tracking-widest flex items-center gap-2">
                  Threat Intel
                  <HelpTip side='left' title={t('help.threatintel.t')} description={t('help.threatintel.d')}
                    tips={[t('help.threatintel.k1'), t('help.threatintel.k2'), t('help.threatintel.k3')]} />
                </div>
                {isAdmin && (
                  <button
                    onClick={enrich}
                    disabled={enriching}
                    className="text-xs px-2.5 py-1 rounded-md border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    {enriching ? 'Analizando…' : data.intel ? 'Actualizar' : 'Enriquecer'}
                  </button>
                )}
              </div>

              {data.intel ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const rep = REPUTACION[data.intel.reputation] || REPUTACION.clean
                      return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${rep.cls}`}>{rep.label}</span>
                    })()}
                    {data.intel.is_tor && (
                      <span className="text-xs px-2 py-1 rounded-full border border-purple-400/40 text-purple-700 dark:text-purple-300 bg-purple-400/10">Nodo de salida Tor</span>
                    )}
                    {data.intel.feodo_malware && (
                      <span className="text-xs px-2 py-1 rounded-full border border-red-400/40 text-red-700 dark:text-red-300 bg-red-400/10">{data.intel.feodo_malware}</span>
                    )}
                    <span className="text-muted-foreground text-xs ml-auto">
                      Intel score: <span className="text-foreground font-medium">{data.intel.intel_score}</span>
                    </span>
                  </div>

                  {(data.intel.asn || data.intel.as_org) && (
                    <div className="text-xs flex gap-2">
                      <span className="text-muted-foreground shrink-0">ASN</span>
                      <span className="text-foreground">
                        {data.intel.asn ? `AS${data.intel.asn}` : ''}{data.intel.as_org ? ` · ${data.intel.as_org}` : ''}
                      </span>
                    </div>
                  )}

                  {data.intel.enriched_at && (
                    <div className="text-muted-foreground text-[10px] font-terminal">Enriquecido: {fmtDateTime(data.intel.enriched_at)}</div>
                  )}

                  <div className="text-muted-foreground text-[10px] border-t border-border pt-2">
                    Fuentes sin clave: ASN (Team Cymru), nodos de salida de Tor, FeodoTracker y C2-Tracker.
                    AbuseIPDB, Shodan y GreyNoise, el análisis en lote y el automático están en la edición Pro.
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-xs">
                  {isAdmin
                    ? 'IP sin enriquecer. Consultá el ASN, si es un nodo de salida de Tor y si figura en los feeds de C2 y botnets.'
                    : 'IP sin enriquecer.'}
                </div>
              )}
            </div>

            {/* First / last seen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="text-muted-foreground text-xs mb-1">Primera vez</div>
                <div className="font-terminal text-xs text-foreground">{fmtDateTime(data.first_seen)}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="text-muted-foreground text-xs mb-1">Última vez</div>
                <div className="font-terminal text-xs text-foreground">{fmtDateTime(data.last_seen)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="font-terminal text-muted-foreground text-sm">Sin datos para esta IP</div>
          </div>
        )}
      </div>
    </>
  )
}
