import React, { useEffect, useRef, useState } from 'react'
import { getMeta, fmtTime } from '../lib/utils'

const MAX_LINES = 500

function TerminalLine({ ev }) {
  const meta = getMeta(ev.type)
  const flag = ev.flag || ''
  const country = ev.country || '??'
  const city = ev.city ? ` ${ev.city}` : ''
  const portInfo = ev.port ? ` :${ev.port}` : ''
  const pathPart = ev.path ? ` ${ev.method || 'GET'} ${ev.path}` : portInfo
  const credPart = (ev.type === 'BRUTE' || ev.type === 'HUMAN') && ev.detail ? ` → ${ev.detail}` : ''
  const detail = pathPart + credPart

  return (
    <div className="flex items-start gap-2 px-3 py-0.5 hover:bg-muted/30 group animate-fade-up">
      <span className="text-muted-foreground/50 shrink-0 select-none w-[72px] text-right font-terminal">
        {fmtTime(ev.ts)}
      </span>
      <span className={`${meta.color} font-semibold shrink-0 w-[76px] font-terminal`}>
        {meta.icon} {ev.type}
      </span>
      <span className="text-foreground font-medium shrink-0 font-terminal">
        {ev.ip}
      </span>
      <span className="text-muted-foreground/50 shrink-0 font-terminal">
        {flag} {country}{city}
      </span>
      <span className="text-muted-foreground/70 truncate font-terminal">{detail}</span>
      {ev.ua && (
        <span className="text-muted-foreground/30 truncate hidden group-hover:inline ml-auto pl-4 text-xs max-w-[200px] font-terminal" title={ev.ua}>
          {ev.ua}
        </span>
      )}
    </div>
  )
}

export default function TerminalCard({ events, paused, onTogglePause }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filter, setFilter] = useState('TODOS')

  const types = [
    { value: 'TODOS', label: 'TODOS'  },
    { value: 'BRUTE', label: 'BRUTE'  },
    { value: 'SCAN',  label: 'SCAN'   },
    { value: 'BOT',   label: 'BOT'    },
    { value: 'RECON', label: 'RECON'  },
    { value: 'HUMAN', label: 'HUMANO' },
  ]

  const filtered = filter === 'TODOS' ? events : events.filter(e => e.type === filter)
  const visible = filtered.slice(-MAX_LINES)

  useEffect(() => {
    if (autoScroll && !paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [visible.length, autoScroll, paused])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }

  return (
    <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40 shrink-0">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="font-terminal text-xs text-muted-foreground/60 tracking-widest uppercase">
            heimdall — live feed
          </span>
          {paused && (
            <span className="text-xs text-yellow-500 font-terminal animate-pulse">⏸ EN PAUSA</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Type filter chips */}
          <div className="flex gap-1">
            {types.map(t => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={`font-terminal text-[10px] px-2 py-0.5 rounded border transition-all ${
                  filter === t.value
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-border text-muted-foreground/50 hover:border-border/80 hover:text-muted-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Pause / resume */}
          <button
            onClick={onTogglePause}
            className="font-terminal text-[10px] px-3 py-1 rounded border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
          >
            {paused ? '▶ REANUDAR' : '⏸ PAUSAR'}
          </button>

          {/* Auto-scroll indicator */}
          <div
            className={`w-2 h-2 rounded-full transition-colors ${autoScroll ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
            title={autoScroll ? 'Auto-scroll activo' : 'Auto-scroll inactivo'}
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/20 shrink-0">
        <span className="font-terminal text-[10px] text-muted-foreground/40 w-[72px] text-right">HORA</span>
        <span className="font-terminal text-[10px] text-muted-foreground/40 w-[76px]">TIPO</span>
        <span className="font-terminal text-[10px] text-muted-foreground/40 w-[120px]">IP ORIGEN</span>
        <span className="font-terminal text-[10px] text-muted-foreground/40">GEO / DETALLE</span>
      </div>

      {/* Log body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto terminal-scroll font-terminal text-[13px] leading-6 py-1"
      >
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 gap-2">
            <div className="text-3xl">👁</div>
            <div className="font-terminal text-xs tracking-widest">ESPERANDO ACTIVIDAD...</div>
            <div className="font-terminal text-[10px] text-muted-foreground/20">heimdall está escuchando</div>
          </div>
        ) : (
          <>
            {visible.map((ev, i) => (
              <TerminalLine key={ev.id ?? `${ev.ts}-${i}`} ev={ev} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between">
        <span className="font-terminal text-[10px] text-muted-foreground/40">
          {visible.length} eventos{filter !== 'TODOS' ? ` (${types.find(t => t.value === filter)?.label ?? filter})` : ''} · {events.length} total
        </span>
        <span className="font-terminal text-[10px] text-muted-foreground/30 animate-blink">█</span>
      </div>
    </div>
  )
}
