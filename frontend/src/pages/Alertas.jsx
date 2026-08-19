import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, RefreshCw, Save, Send } from 'lucide-react'
import HelpTip from '@/components/HelpTip'
import { fmtDateTime } from '../lib/utils'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''

export default function Alertas({ token }) {
  const { t } = useTranslation()
  const [cfg, setCfg] = useState(null)
  const [allowlist, setAllowlist] = useState(null)
  const [log, setLog] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [probando, setProbando] = useState(false)
  const [aviso, setAviso] = useState(null)

  const authH = { Authorization: `Bearer ${token}` }
  const jsonH = { ...authH, 'Content-Type': 'application/json' }

  const cargar = useCallback(async () => {
    try {
      const [c, a, l] = await Promise.all([
        fetch(`${BACKEND}/heimdall/api/alerts/config`, { headers: authH }).then(r => r.json()),
        fetch(`${BACKEND}/heimdall/api/settings/ip-allowlist`, { headers: authH }).then(r => r.json()),
        fetch(`${BACKEND}/heimdall/api/alerts/log?limit=15`, { headers: authH }).then(r => r.json()),
      ])
      setCfg({ ...c, pass: '' })
      setAllowlist(a)
      setLog(l.alerts || [])
    } catch { /* ignore */ }
  }, [token])

  useEffect(() => { cargar() }, [cargar])

  async function guardar() {
    setGuardando(true); setAviso(null)
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/alerts/config`, {
        method: 'PUT', headers: jsonH, body: JSON.stringify(cfg),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error al guardar')
      setCfg({ ...d, pass: '' })
      setAviso({ ok: true, texto: t('alerts.saved') })
    } catch (e) {
      setAviso({ ok: false, texto: e.message })
    }
    setGuardando(false)
  }

  async function probar() {
    setProbando(true); setAviso(null)
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/alerts/test`, { method: 'POST', headers: authH })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error al enviar')
      setAviso({ ok: true, texto: t('alerts.test_sent') })
    } catch (e) {
      setAviso({ ok: false, texto: e.message })
    }
    setProbando(false)
    cargar()
  }

  async function guardarAllowlist(value) {
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/settings/ip-allowlist`, {
        method: 'PUT', headers: jsonH, body: JSON.stringify({ value }),
      })
      if (r.ok) setAllowlist(await r.json())
    } catch { /* ignore */ }
  }

  if (!cfg) return <div className='text-sm text-muted-foreground'>{t('common.loading')}</div>

  const campo = 'w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary'
  const etiqueta = 'block text-xs text-muted-foreground mb-1'

  return (
    <div className='space-y-4 max-w-3xl'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-semibold text-foreground flex items-center gap-2'>
            <Bell className='size-5 text-muted-foreground' />
            {t('alerts.title')}
            <HelpTip side='right' title={t('help.alerts.t')} description={t('help.alerts.d')}
              tips={[t('help.alerts.k1'), t('help.alerts.k2'), t('help.alerts.k3')]} />
          </h2>
          <p className='text-sm text-muted-foreground'>{t('alerts.subtitle')}</p>
        </div>
        <button onClick={cargar} className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-accent transition-colors'>
          <RefreshCw className='size-3.5' /> {t('common.refresh')}
        </button>
      </div>

      {aviso && (
        <div className={`text-sm rounded-md px-3 py-2 border ${aviso.ok
          ? 'border-green-500/40 text-green-400 bg-green-500/10'
          : 'border-red-500/40 text-red-400 bg-red-500/10'}`}>
          {aviso.texto}
        </div>
      )}

      <div className='bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4'>
        <div>
          <div className='text-sm font-medium text-foreground'>{t('alerts.enable')}</div>
          <div className='text-xs text-muted-foreground'>{t('alerts.enable_hint')}</div>
        </div>
        <label className='inline-flex items-center cursor-pointer shrink-0'>
          <input type='checkbox' className='sr-only peer' checked={!!cfg.enabled}
            onChange={e => setCfg({ ...cfg, enabled: e.target.checked })} />
          <div className="relative w-10 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-background after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
        </label>
      </div>

      {/* Qué avisa esta edición. Fijo a propósito: elegir por tipo es de Pro. */}
      <div className='bg-card border border-border rounded-xl p-4'>
        <div className='text-xs uppercase tracking-widest text-muted-foreground mb-3'>{t('alerts.when')}</div>
        <ul className='space-y-2.5'>
          <li className='flex items-start gap-3'>
            <span className='mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0' />
            <span>
              <span className='text-sm text-foreground'>{t('alerts.trigger.critical')}</span>
              <span className='block text-xs text-muted-foreground leading-snug'>{t('alerts.trigger.critical_hint')}</span>
            </span>
          </li>
          <li className='flex items-start gap-3'>
            <span className='mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0' />
            <span>
              <span className='text-sm text-foreground'>{t('alerts.trigger.watchdog')}</span>
              <span className='block text-xs text-muted-foreground leading-snug'>{t('alerts.trigger.watchdog_hint')}</span>
            </span>
          </li>
        </ul>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-border'>
          <div>
            <label className={etiqueta}>{t('alerts.min_interval')}</label>
            <input type='number' min='1' className={campo} value={cfg.min_interval_min}
              onChange={e => setCfg({ ...cfg, min_interval_min: e.target.value })} />
          </div>
          <div>
            <label className={etiqueta}>{t('alerts.watchdog_hours')}</label>
            <input type='number' min='1' className={campo} value={cfg.watchdog_hours}
              onChange={e => setCfg({ ...cfg, watchdog_hours: e.target.value })} />
          </div>
        </div>

        <p className='text-[11px] text-muted-foreground mt-3 border-t border-border pt-3'>
          {t('alerts.pro_note')}
        </p>
      </div>

      <div className='bg-card border border-border rounded-xl p-4'>
        <div className='text-xs uppercase tracking-widest text-muted-foreground mb-1'>{t('alerts.smtp')}</div>
        <p className='text-xs text-muted-foreground mb-3'>{t('alerts.smtp_hint')}</p>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div className='sm:col-span-2'>
            <label className={etiqueta}>{t('alerts.recipients')}</label>
            <input className={campo} value={cfg.recipients} placeholder='seguridad@empresa.com'
              onChange={e => setCfg({ ...cfg, recipients: e.target.value })} />
          </div>
          <div>
            <label className={etiqueta}>{t('alerts.host')}</label>
            <input className={campo} value={cfg.host} placeholder='smtp.empresa.com'
              onChange={e => setCfg({ ...cfg, host: e.target.value })} />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className={etiqueta}>{t('alerts.port')}</label>
              <input type='number' className={campo} value={cfg.port}
                onChange={e => setCfg({ ...cfg, port: e.target.value })} />
            </div>
            <div>
              <label className={etiqueta}>SSL/TLS</label>
              <select className={campo} value={cfg.secure ? '1' : '0'}
                onChange={e => setCfg({ ...cfg, secure: e.target.value === '1' })}>
                <option value='1'>{t('alerts.secure_on')}</option>
                <option value='0'>{t('alerts.secure_off')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className={etiqueta}>{t('alerts.user')}</label>
            <input className={campo} value={cfg.user} autoComplete='off'
              onChange={e => setCfg({ ...cfg, user: e.target.value })} />
          </div>
          <div>
            <label className={etiqueta}>
              {t('alerts.pass')} {cfg.pass_set && <span className='text-green-400'>· {t('alerts.pass_set')}</span>}
            </label>
            <input type='password' className={campo} value={cfg.pass} autoComplete='new-password'
              placeholder={cfg.pass_set ? '••••••••' : ''}
              onChange={e => setCfg({ ...cfg, pass: e.target.value })} />
            <p className='text-[11px] text-muted-foreground mt-1'>{t('alerts.pass_hint')}</p>
          </div>
          <div>
            <label className={etiqueta}>{t('alerts.from')}</label>
            <input className={campo} value={cfg.from} placeholder='heimdall@empresa.com'
              onChange={e => setCfg({ ...cfg, from: e.target.value })} />
          </div>
          <div>
            <label className={etiqueta}>{t('alerts.panel_url')}</label>
            <input className={campo} value={cfg.panel_url} placeholder='https://honeypot.empresa.com/heimdall/'
              onChange={e => setCfg({ ...cfg, panel_url: e.target.value })} />
          </div>
        </div>
      </div>

      {/* IPs propias */}
      <div className='bg-card border border-border rounded-xl p-4'>
        <div className='text-xs uppercase tracking-widest text-muted-foreground mb-1'>{t('allowlist.title')}</div>
        <p className='text-xs text-muted-foreground mb-3'>{t('allowlist.hint')}</p>
        <textarea
          rows={2}
          defaultValue={allowlist?.value || ''}
          placeholder={t('allowlist.placeholder')}
          onBlur={e => guardarAllowlist(e.target.value)}
          className='w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground font-terminal focus:outline-none focus:ring-1 focus:ring-primary'
        />
        {allowlist && (
          <p className='text-[11px] text-muted-foreground mt-1.5'>{t('allowlist.count', { count: allowlist.count })}</p>
        )}
      </div>

      <div className='flex flex-wrap gap-2'>
        <button onClick={guardar} disabled={guardando}
          className='flex items-center gap-1.5 text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity'>
          <Save className='size-4' /> {guardando ? t('common.saving') : t('common.save')}
        </button>
        <button onClick={probar} disabled={probando}
          className='flex items-center gap-1.5 text-sm px-4 py-2 rounded-md border border-border text-foreground hover:bg-accent disabled:opacity-50 transition-colors'>
          <Send className='size-4' /> {probando ? t('alerts.testing') : t('alerts.test')}
        </button>
      </div>

      <div className='bg-card border border-border rounded-xl overflow-hidden'>
        <div className='px-4 py-3 border-b border-border text-xs uppercase tracking-widest text-muted-foreground'>
          {t('alerts.history')}
        </div>
        {log.length === 0 ? (
          <div className='px-4 py-6 text-sm text-muted-foreground text-center'>{t('alerts.history_empty')}</div>
        ) : (
          <div className='divide-y divide-border'>
            {log.map(a => (
              <div key={a.id} className='px-4 py-2.5 flex items-start gap-3'>
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${a.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className='min-w-0 flex-1'>
                  <div className='text-sm text-foreground truncate'>{a.subject}</div>
                  <div className='text-[11px] text-muted-foreground font-terminal'>
                    {fmtDateTime(a.ts)} · {a.trigger_type}
                    {!a.ok && a.error ? ` · ${a.error}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
