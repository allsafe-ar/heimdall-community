export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export const TYPE_META = {
  BRUTE:    { color: 'text-red-400',    dot: 'bg-red-500',    hex: '#f87171', label: 'BRUTE',    lucide: 'KeyRound'   },
  PORTSCAN: { color: 'text-purple-400', dot: 'bg-purple-500', hex: '#c084fc', label: 'PORTSCAN', lucide: 'ScanSearch' },
  SCAN:     { color: 'text-orange-400', dot: 'bg-orange-500', hex: '#fb923c', label: 'SCAN',     lucide: 'Globe'      },
  BOT:      { color: 'text-yellow-400', dot: 'bg-yellow-500', hex: '#facc15', label: 'BOT',      lucide: 'Bot'        },
  RECON:    { color: 'text-blue-400',   dot: 'bg-blue-500',   hex: '#60a5fa', label: 'RECON',    lucide: 'Eye'        },
  HUMAN:    { color: 'text-green-400',  dot: 'bg-green-500',  hex: '#4ade80', label: 'HUMANO',   lucide: 'User'       },
}

export function getMeta(type) {
  return TYPE_META[type] || TYPE_META.RECON
}

export function fmtTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('es-AR', { hour12: false })
}

export function fmtDateTime(ts) {
  const d = new Date(ts)
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  })
}

export function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return `${Math.floor(diff / 1000)}s atrás`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
  return `${Math.floor(diff / 86400000)}d atrás`
}

export function threatLevel(score) {
  if (score >= 70) return { label: 'CRÍTICO', color: 'text-red-400' }
  if (score >= 50) return { label: 'ALTO', color: 'text-orange-400' }
  if (score >= 30) return { label: 'MEDIO', color: 'text-yellow-400' }
  return { label: 'BAJO', color: 'text-green-400' }
}

// Nivel conductual por IP (lo usa el reporte compartido; en Community no se calcula
// score conductual, pero el helper debe existir para que el import resuelva)
export const BEHAVIOR_META = {
  critical: { label: 'CRÍTICO', short: 'CRÍT', color: 'text-red-400',    dot: 'bg-red-500',    hex: '#f87171' },
  high:     { label: 'ALTO',    short: 'ALTO', color: 'text-orange-400', dot: 'bg-orange-500', hex: '#fb923c' },
  medium:   { label: 'MEDIO',   short: 'MED',  color: 'text-yellow-400', dot: 'bg-yellow-500', hex: '#facc15' },
  low:      { label: 'BAJO',    short: 'BAJO', color: 'text-green-400',  dot: 'bg-green-500',  hex: '#4ade80' },
}

export function behaviorMeta(level) {
  return BEHAVIOR_META[level] || BEHAVIOR_META.low
}
