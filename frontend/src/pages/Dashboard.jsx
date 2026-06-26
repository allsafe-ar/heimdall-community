import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getSocket } from '../lib/socket'
import { AppSidebar } from '../components/layout/app-sidebar'
import { Header } from '../components/layout/header'
import { SidebarInset, SidebarProvider } from '../components/ui/sidebar'
import { LayoutProvider } from '../context/layout-provider'
import StatsBar from '../components/StatsBar'
import OverviewCharts from '../components/OverviewCharts'
import TerminalCard from '../components/TerminalCard'
import EventTable from '../components/EventTable'
import IpListView from '../components/IpListView'
import Mapa from './Mapa'
import MiCuenta from './MiCuenta'
import Usuarios from './Usuarios'
import { Trash2 } from 'lucide-react'
import { getCookie } from '../lib/cookies'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''
const MAX_LIVE = 2000


function decodeToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return {} }
}

function normalizeEvent(raw) {
  return { ...raw, score: raw.threat_score ?? raw.score ?? 0, id: raw.id ?? `${raw.ts}-${Math.random()}` }
}

function normalizeStats(d) {
  if (!d) return null
  if (Array.isArray(d.by_type)) d.by_type = Object.fromEntries(d.by_type.map(r => [r.type, Number(r.c)]))
  if (d.top_ip && typeof d.top_ip === 'object') { d.top_ip_count = d.top_ip.hits; d.top_ip = d.top_ip.ip }
  return d
}

export default function Dashboard({ token, onLogout }) {
  const { t } = useTranslation()
  const userInfo = decodeToken(token)
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState(null)
  const [paused, setPaused] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState('generic')
  const [tab, setTab] = useState('overview')
  const [refreshTick, setRefreshTick] = useState(0)
  const [connected, setConnected] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const pausedRef = useRef(false)
  const bufferRef = useRef([])
  const seenIpsRef = useRef(new Set())

  pausedRef.current = paused
  const authHeaders = { Authorization: `Bearer ${token}` }

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/stats`, { headers: authHeaders })
      if (!r.ok) return
      setStats(normalizeStats(await r.json()))
    } catch { /* ignore */ }
  }, [token])

  const fetchHistory = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/events?limit=300&offset=0`, { headers: authHeaders })
      if (!r.ok) return
      const d = await r.json()
      const evs = (d.events || []).map(normalizeEvent).reverse()
      seenIpsRef.current = new Set(evs.map(e => e.ip))
      setEvents(evs)
    } catch { /* ignore */ }
    finally { setLoadingHistory(false) }
  }, [token])

  const fetchTemplate = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/template`, { headers: authHeaders })
      if (!r.ok) return
      const d = await r.json()
      if (d.template) setActiveTemplate(d.template)
    } catch { /* ignore */ }
  }, [token])

  useEffect(() => {
    fetchStats(); fetchTemplate(); fetchHistory()
    const iv = setInterval(fetchStats, 30000)
    return () => clearInterval(iv)
  }, [fetchStats, fetchTemplate, fetchHistory])

  useEffect(() => {
    const socket = getSocket(token)
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))
    socket.on('event', (raw) => {
      const ev = normalizeEvent(raw)
      setStats(prev => {
        if (!prev) return prev
        const byType = { ...(prev.by_type || {}) }
        byType[ev.type] = (byType[ev.type] || 0) + 1
        const isNewIp = !seenIpsRef.current.has(ev.ip)
        if (isNewIp) seenIpsRef.current.add(ev.ip)
        return { ...prev, total: (prev.total || 0) + 1, today: (prev.today || 0) + 1, unique_ips: isNewIp ? (prev.unique_ips || 0) + 1 : prev.unique_ips, by_type: byType }
      })
      if (pausedRef.current) { bufferRef.current.push(ev); return }
      setEvents(prev => { const next = [...prev, ev]; return next.length > MAX_LIVE ? next.slice(-MAX_LIVE) : next })
    })
    socket.on('events_cleared', () => { setEvents([]); seenIpsRef.current = new Set() })
    return () => { socket.off('event'); socket.off('connect'); socket.off('disconnect'); socket.off('connect_error'); socket.off('events_cleared') }
  }, [token])

  function togglePause() {
    if (paused) {
      const buf = bufferRef.current.splice(0)
      if (buf.length > 0) setEvents(prev => { const next = [...prev, ...buf]; return next.length > MAX_LIVE ? next.slice(-MAX_LIVE) : next })
    }
    setPaused(p => !p)
  }

  async function switchTemplate(tpl) {
    try {
      await fetch(`${BACKEND}/heimdall/api/template`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: tpl })
      })
      setActiveTemplate(tpl)
    } catch { /* ignore */ }
  }

  async function clearEvents() {
    try {
      await fetch(`${BACKEND}/heimdall/api/events`, { method: 'DELETE', headers: authHeaders })
      setEvents([]); seenIpsRef.current = new Set()
      setClearConfirm(false); fetchStats(); setRefreshTick(t => t + 1)
    } catch { /* ignore */ }
  }

  function handleTabChange(id) {
    setTab(id)
    if (id === 'table') setRefreshTick(r => r + 1)
  }

  const defaultOpen = getCookie('sidebar_state') !== 'false'

  const clearButton = userInfo?.role === 'admin' && ['overview', 'live', 'table'].includes(tab) && (
    clearConfirm ? (
      <div className='flex items-center gap-2 text-xs mr-1'>
        <span className='text-red-500'>{t('header.clear_confirm')}</span>
        <button onClick={clearEvents} className='text-red-500 hover:text-red-400 font-medium'>{t('header.clear_yes')}</button>
        <button onClick={() => setClearConfirm(false)} className='text-muted-foreground hover:text-foreground'>{t('header.clear_no')}</button>
      </div>
    ) : (
      <button
        onClick={() => setClearConfirm(true)}
        className='hidden sm:flex w-8 h-8 items-center justify-center rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors'
        title={t('header.clear')}
      >
        <Trash2 size={15} />
      </button>
    )
  )

  return (
    <LayoutProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar
          token={token}
          tab={tab}
          onTabChange={handleTabChange}
          activeTemplate={activeTemplate}
          onTemplateChange={switchTemplate}
          role={userInfo?.role}
        />
        <SidebarInset>
          <Header
            tab={tab}
            username={userInfo?.username}
            nombre={userInfo?.nombre}
            role={userInfo?.role}
            onMiCuenta={() => handleTabChange('mi_cuenta')}
            onLogout={onLogout}
            connected={connected}
            activeTemplate={activeTemplate}
            extraRight={clearButton}
          />

          <main className='flex-1 overflow-y-auto p-5'>

            {tab === 'overview' && (
              <div className='space-y-4'>
                <StatsBar stats={stats} />
                <OverviewCharts events={events} stats={stats} />
                <div className='bg-card border border-border rounded-xl overflow-hidden' style={{ height: 360 }}>
                  <TerminalCard events={events} paused={paused} onTogglePause={togglePause} />
                </div>
              </div>
            )}

            {tab === 'live' && (
              <div className='space-y-4' style={{ height: 'calc(100vh - 100px)' }}>
                <StatsBar stats={stats} />
                <div className='bg-card border border-border rounded-xl overflow-hidden' style={{ height: 'calc(100% - 140px)' }}>
                  <TerminalCard events={events} paused={paused} onTogglePause={togglePause} />
                </div>
              </div>
            )}

            {tab === 'table' && (
              <div className='bg-card border border-border rounded-xl overflow-hidden'>
                <EventTable token={token} refreshTick={refreshTick} />
              </div>
            )}

            {tab === 'ips' && (
              <div className='bg-card border border-border rounded-xl overflow-hidden'>
                <IpListView token={token} />
              </div>
            )}

            {tab === 'map' && (
              <Mapa token={token} />
            )}

            {tab === 'mi_cuenta' && (
              <MiCuenta token={token} userInfo={userInfo} />
            )}

            {tab === 'usuarios' && (
              <Usuarios token={token} role={userInfo?.role} />
            )}

          </main>
        </SidebarInset>
      </SidebarProvider>
    </LayoutProvider>
  )
}
