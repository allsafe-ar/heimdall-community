import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import worldData from 'world-atlas/countries-110m.json'
import { getSocket } from '../lib/socket'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''

const TYPE_COLORS = {
  BRUTE:    '#f87171',
  PORTSCAN: '#c084fc',
  SCAN:     '#fb923c',
  BOT:      '#facc15',
  RECON:    '#60a5fa',
  HUMAN:    '#4ade80',
}

// Objetivo de los ataques (activo defendido por el honeypot). [lon, lat] — Buenos Aires.
// TODO v1.2+: hacerlo configurable (geo del propio servidor).
const TARGET = [-58.3816, -34.6037]

// Geometría del mapa: se calcula una sola vez (constante de módulo)
const W = 980, H = 500
const land = feature(worldData, worldData.objects.countries)
const projection = geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' })
const pathGen = geoPath(projection)
const COUNTRY_PATHS = land.features.map((f, i) => ({ d: pathGen(f), key: f.id || i }))
const SPHERE_PATH = pathGen({ type: 'Sphere' })
const TARGET_XY = projection(TARGET)

// Velocidad de los arcos de ataque (más bajo = más rápido/agresivo, estilo Kaspersky)
const ARC_MS = 1100

function radius(hits) {
  return Math.max(3, Math.min(20, Math.sqrt(hits) * 1.3))
}

// Curva (bezier cuadrática) entre dos puntos en pantalla, elevada hacia afuera = arco
function arcPath(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const dist = Math.hypot(dx, dy) || 1
  const nx = -dy / dist, ny = dx / dist
  const lift = Math.min(dist * 0.3, 140)
  return `M${x1},${y1} Q${mx + nx * lift},${my + ny * lift} ${x2},${y2}`
}

export default function Mapa({ token }) {
  const { t } = useTranslation()
  const [since, setSince] = useState('7d')
  const [points, setPoints] = useState([])
  const [byCountry, setByCountry] = useState([])
  const [hovered, setHovered] = useState(null)
  const [tip, setTip] = useState({ x: 0, y: 0 })
  const [arcs, setArcs] = useState([])
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
  const arcId = useRef(0)
  const pointsRef = useRef([])

  const authHeaders = { Authorization: `Bearer ${token}` }

  const fetchGeo = useCallback(async (range) => {
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/geo?since=${range}`, { headers: authHeaders })
      if (!r.ok) return
      const d = await r.json()
      setPoints(d.points || [])
      pointsRef.current = d.points || []
      setByCountry(d.by_country || [])
    } catch { /* ignore */ }
  }, [token])

  useEffect(() => { fetchGeo(since) }, [since, fetchGeo])

  useEffect(() => {
    const iv = setInterval(() => fetchGeo(since), 30000)
    return () => clearInterval(iv)
  }, [since, fetchGeo])

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Dispara un arco animado origen -> objetivo
  const fireArc = useCallback((lon, lat, color) => {
    const xy = projection([lon, lat])
    if (!xy || !TARGET_XY) return
    const id = ++arcId.current
    const d = arcPath(xy[0], xy[1], TARGET_XY[0], TARGET_XY[1])
    setArcs(prev => [...prev.slice(-60), { id, d, color: color || '#94a3b8' }])
    setTimeout(() => setArcs(prev => prev.filter(a => a.id !== id)), ARC_MS + 250)
  }, [])

  // Feed en vivo: cada evento con coordenadas dibuja una línea de ataque
  useEffect(() => {
    const socket = getSocket(token)
    function onEvent(raw) {
      const lat = Number(raw.lat), lon = Number(raw.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return
      fireArc(lon, lat, TYPE_COLORS[raw.type])
    }
    socket.on('event', onEvent)
    return () => socket.off('event', onEvent)
  }, [token, fireArc])

  // Replay ambiente: anima arcos desde orígenes reales ya capturados, para que el
  // mapa "respire" aunque no haya tráfico en vivo. Ráfagas aleatorias (1-4 ataques
  // por tanda, con micro-desfase) e intervalo variable, para que se sienta dinámico.
  useEffect(() => {
    let alive = true
    let timer
    const jitters = []
    function tick() {
      if (!alive) return
      const ps = pointsRef.current
      if (ps.length) {
        // Tamaño de ráfaga ponderado: 50% 1, 30% 2, 14% 3, 6% 4 ataques a la vez
        const r = Math.random()
        const burst = r < 0.5 ? 1 : r < 0.8 ? 2 : r < 0.94 ? 3 : 4
        for (let i = 0; i < burst; i++) {
          const p = ps[Math.floor(Math.random() * ps.length)]
          const jt = setTimeout(() => {
            if (alive) fireArc(p.lon, p.lat, TYPE_COLORS[p.top_type])
          }, Math.random() * 180)
          jitters.push(jt)
        }
      }
      // Próxima tanda en 450-1300ms (aleatorio)
      timer = setTimeout(tick, 450 + Math.random() * 850)
    }
    timer = setTimeout(tick, 500)
    return () => { alive = false; clearTimeout(timer); jitters.forEach(clearTimeout) }
  }, [fireArc])

  const landFill   = isDark ? '#16202f' : '#e5eaf1'
  const landStroke = isDark ? '#0b121c' : '#cbd5e1'
  const oceanFill  = isDark ? '#070b12' : '#f1f5f9'

  const maxCountryHits = byCountry.reduce((m, c) => Math.max(m, c.hits), 0) || 1

  function handleEnter(e, p) {
    setHovered(p)
    setTip({ x: e.clientX, y: e.clientY })
  }

  return (
    <div className='space-y-4'>
      <style>{`
        @keyframes hm-arc-draw {
          0%   { stroke-dashoffset: 1; opacity: 0.95; }
          75%  { opacity: 0.95; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        .hm-arc { stroke-dasharray: 1; animation: hm-arc-draw ${ARC_MS}ms ease-out forwards; }
        @keyframes hm-target-pulse {
          0%   { r: 4;  opacity: 0.8; }
          100% { r: 18; opacity: 0; }
        }
        .hm-target-pulse { animation: hm-target-pulse 2s ease-out infinite; }
      `}</style>

      {/* Cabecera: rango temporal */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-semibold text-foreground'>{t('map.title')}</h2>
          <p className='text-sm text-muted-foreground'>{t('map.subtitle')}</p>
        </div>
        <div className='flex items-center gap-1 rounded-lg border border-border bg-card p-1'>
          {['24h', '7d', '30d', 'all'].map(r => (
            <button
              key={r}
              onClick={() => setSince(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                since === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(`map.range.${r}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Mapa a ancho completo */}
      <div className='bg-card border border-border rounded-xl overflow-hidden'>
        <svg viewBox={`0 0 ${W} ${H}`} width='100%' style={{ display: 'block' }}>
          <path d={SPHERE_PATH} fill={oceanFill} />
          <g>
            {COUNTRY_PATHS.map(c => (
              <path key={c.key} d={c.d} fill={landFill} stroke={landStroke} strokeWidth={0.4} />
            ))}
          </g>

          {/* Arcos de ataque (origen -> objetivo) */}
          <g style={{ pointerEvents: 'none' }}>
            {arcs.map(a => (
              <g key={a.id}>
                <path className='hm-arc' d={a.d} pathLength={1} fill='none'
                  stroke={a.color} strokeWidth={1.4} strokeLinecap='round' />
                <circle r={2.6} fill={a.color}>
                  <animateMotion dur={`${ARC_MS}ms`} repeatCount='1' path={a.d} fill='freeze' keyPoints='0;1' keyTimes='0;1' calcMode='linear' />
                </circle>
              </g>
            ))}
          </g>

          {/* Marcador del objetivo defendido */}
          {TARGET_XY && (
            <g style={{ pointerEvents: 'none' }}>
              <circle className='hm-target-pulse' cx={TARGET_XY[0]} cy={TARGET_XY[1]} r={4} fill='none' stroke='#22d3ee' strokeWidth={1.5} />
              <circle cx={TARGET_XY[0]} cy={TARGET_XY[1]} r={3} fill='#22d3ee' />
            </g>
          )}

          {/* Orígenes de ataque (acumulado) */}
          {points.map((p, i) => {
            const xy = projection([p.lon, p.lat])
            if (!xy) return null
            const color = TYPE_COLORS[p.top_type] || '#94a3b8'
            return (
              <circle
                key={`${p.lat},${p.lon},${i}`}
                cx={xy[0]} cy={xy[1]} r={radius(p.hits)}
                fill={color} fillOpacity={0.32} stroke={color} strokeWidth={1}
                style={{ cursor: 'pointer', transition: 'fill-opacity .15s' }}
                onMouseEnter={e => handleEnter(e, p)}
                onMouseMove={e => setTip({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}
        </svg>

        {points.length === 0 && (
          <div className='py-8 text-center text-sm text-muted-foreground'>{t('map.no_data')}</div>
        )}

        {/* Leyenda */}
        <div className='flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 border-t border-border'>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <span key={type} className='flex items-center gap-1.5 text-xs text-muted-foreground'>
              <span className='inline-block w-2.5 h-2.5 rounded-full' style={{ background: color }} />
              {type === 'HUMAN' ? t('events.human') : type}
            </span>
          ))}
          <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span className='inline-block w-2.5 h-2.5 rounded-full' style={{ background: '#22d3ee' }} />
            {t('map.target')}
          </span>
        </div>
      </div>

      {/* Top países (abajo, a ancho completo) */}
      <div className='bg-card border border-border rounded-xl p-4'>
        <h3 className='text-sm font-semibold text-foreground mb-3'>{t('map.top_countries')}</h3>
        {byCountry.length === 0 ? (
          <p className='text-xs text-muted-foreground'>{t('map.no_data')}</p>
        ) : (
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-5 gap-y-3'>
            {byCountry.slice(0, 18).map(c => (
              <div key={c.country} className='text-xs'>
                <div className='flex items-center justify-between mb-0.5'>
                  <span className='flex items-center gap-1.5 text-foreground min-w-0'>
                    <span>{c.flag}</span>
                    <span className='font-medium'>{c.country}</span>
                    <span className='text-muted-foreground truncate'>· {c.ips} {t('map.ips')}</span>
                  </span>
                  <span className='text-muted-foreground tabular-nums shrink-0'>{c.hits}</span>
                </div>
                <div className='h-1.5 rounded-full bg-muted overflow-hidden'>
                  <div className='h-full rounded-full bg-primary'
                    style={{ width: `${Math.max(4, (c.hits / maxCountryHits) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className='fixed z-50 pointer-events-none rounded-lg border border-border bg-popover text-popover-foreground shadow-lg px-3 py-2 text-xs'
          style={{ left: tip.x + 14, top: tip.y + 14, maxWidth: 240 }}
        >
          <div className='flex items-center gap-1.5 font-medium'>
            <span>{hovered.flag}</span>
            <span>{hovered.city ? `${hovered.city}, ` : ''}{hovered.country}</span>
          </div>
          <div className='mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground'>
            <span>{t('map.attacks')}</span><span className='text-right text-foreground tabular-nums'>{hovered.hits}</span>
            <span>{t('map.unique_ips')}</span><span className='text-right text-foreground tabular-nums'>{hovered.ips}</span>
            <span>{t('map.avg_score')}</span><span className='text-right text-foreground tabular-nums'>{hovered.avg_score}</span>
            <span>{t('map.top_threat')}</span>
            <span className='text-right font-medium' style={{ color: TYPE_COLORS[hovered.top_type] || '#94a3b8' }}>
              {hovered.top_type}
            </span>
          </div>
          {hovered.sample_ip && (
            <div className='mt-1 pt-1 border-t border-border text-muted-foreground font-mono'>{hovered.sample_ip}</div>
          )}
        </div>
      )}
    </div>
  )
}
