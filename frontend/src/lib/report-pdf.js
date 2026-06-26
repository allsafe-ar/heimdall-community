import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { behaviorMeta } from './utils'
import allsafeLogo from '../assets/allsafe-logo.png'

const NAVY   = [15, 30, 80]    // mismo navy que los PDFs de Skuld
const ACCENT = [0, 100, 210]
const VERDICT_COLOR = { calm: [22, 120, 50], attention: [180, 100, 0], alert: [200, 40, 40] }

// Carga el logo del login como data URL (para addImage)
async function logoDataURL() {
  try {
    const res = await fetch(allsafeLogo)
    const blob = await res.blob()
    return await new Promise(resolve => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result)
      fr.onerror = () => resolve(null)
      fr.readAsDataURL(blob)
    })
  } catch { return null }
}

const HEAD = (fill = NAVY) => ({ fillColor: fill, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' })
const BODY = { fontSize: 8, textColor: [40, 45, 55] }
const MARGIN = { left: 14, right: 14 }

// Genera y descarga el PDF del reporte (estilo Skuld). t = función i18n.
export async function generateReportPDF(data, t) {
  const a = data.assessment
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const dateStr = new Date(data.generated_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // ── Cabecera navy + logo AllSafe ──
  doc.setFillColor(...NAVY);   doc.rect(0, 0, W, 22, 'F')
  doc.setFillColor(...ACCENT); doc.rect(0, 22, W, 1.5, 'F')
  const logo = await logoDataURL()
  if (logo) { try { doc.addImage(logo, 'PNG', 12, 5, 22, 11) } catch { /* skip */ } }
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('Heimdall · ' + t('report.title'), 38, 11)
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 185, 225)
  doc.text('AllSafe Security Solutions · ' + t('report.generated') + ': ' + dateStr + ' · ' + t('report.range.' + data.period), 38, 18)

  let y = 30

  // Helpers de paginación y secciones de texto
  const ensureSpace = needed => { if (y + needed > H - 14) { doc.addPage(); y = 16 } }
  const textSection = (title, body) => {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(body, W - 28)
    ensureSpace(8 + lines.length * 4.2)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
    doc.text(title, 14, y); y += 5.5
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 66, 78)
    doc.text(lines, 14, y); y += lines.length * 4.2 + 6
  }

  // ── Introducción ──
  textSection(t('report.intro_title'), t('report.intro_body'))

  // ── Veredicto ──
  const vc = VERDICT_COLOR[a.level] || VERDICT_COLOR.calm
  const summary = t('report.summary_' + a.level, {
    events: a.total, ips: a.unique_ips, pct: a.automated_pct,
    exploits: a.exploits, critical: a.critical_ips, campaigns: a.campaigns, stuffing: a.cred_stuffing,
  })
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
  const sumLines = doc.splitTextToSize(summary, W - 36)
  const boxH = 12 + sumLines.length * 4
  ensureSpace(boxH + 4)
  doc.setFillColor(248, 249, 252); doc.setDrawColor(...vc); doc.setLineWidth(0.4)
  doc.roundedRect(14, y, W - 28, boxH, 2, 2, 'FD')
  doc.setFillColor(...vc); doc.rect(14, y, 1.6, boxH, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...vc)
  doc.text(t('report.verdict_' + a.level), 20, y + 7)
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 45, 55)
  doc.text(sumLines, 20, y + 12)
  y += boxH + 6

  // ── KPIs ──
  const kpis = [
    { l: t('report.events'),     v: String(a.total) },
    { l: t('report.unique_ips'), v: String(a.unique_ips) },
    { l: t('report.automated'),  v: a.automated_pct + '%' },
    a.exploits != null
      ? { l: t('report.exploits'), v: String(a.exploits) }
      : { l: t('report.cred_stuffing'), v: String(a.cred_stuffing ?? 0) },
  ]
  const bw = (W - 28) / 4
  ensureSpace(21)
  kpis.forEach((k, i) => {
    const x = 14 + i * bw
    doc.setFillColor(240, 245, 255); doc.roundedRect(x, y, bw - 3, 15, 2, 2, 'F')
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 30, 80)
    doc.text(k.v, x + (bw - 3) / 2, y + 7, { align: 'center' })
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 100, 120)
    doc.text(k.l, x + (bw - 3) / 2, y + 12, { align: 'center' })
  })
  y += 21

  // ── Tablas ──
  const table = (head, body) => {
    autoTable(doc, { startY: y, head: [head], body, theme: 'grid', headStyles: HEAD(), bodyStyles: BODY, margin: MARGIN, styles: { cellPadding: 1.5 } })
    y = doc.lastAutoTable.finalY + 5
  }

  table([t('report.by_type'), t('report.events'), 'IPs'], data.by_type.map(r => [r.type, r.count, r.ips]))
  table(['IP', t('report.country'), 'Hits', t('report.behavior')],
    data.top_ips.slice(0, 10).map(ip => [ip.ip + (ip.campaign ? '  [CAMPAÑA]' : ''), ip.country, ip.hits, ip.behavior_score != null ? `${ip.behavior_score} ${behaviorMeta(ip.behavior_level).label}` : '—']))
  table([t('report.top_paths'), 'Hits', 'IPs'], data.top_paths.slice(0, 8).map(p => [p.path, p.count, p.ips]))
  table([t('report.top_countries'), t('report.events'), 'IPs'], data.by_country.slice(0, 8).map(c => [c.country, c.count, c.ips]))
  if (data.credentials.length) {
    table([t('report.credentials'), 'Intentos', 'IPs'], data.credentials.slice(0, 10).map(c => [c.credential, c.count, c.ips]))
  }

  // ── Conclusión ──
  y += 2
  textSection(t('report.closing_title'), t('report.closing_body'))

  // ── Pie en cada página ──
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7); doc.setTextColor(150, 155, 165)
    doc.text('Heimdall · AllSafe Security Solutions', 14, H - 6)
    doc.text(`${i}/${pages}`, W - 14, H - 6, { align: 'right' })
  }

  doc.save(`heimdall-reporte-${data.period}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
