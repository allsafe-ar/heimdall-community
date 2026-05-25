import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, CheckCircle2, Zap, Trash2, Wand2, X, Upload, Image as ImageIcon } from 'lucide-react'
import { ALL_TEMPLATES } from '../lib/templates'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''

const DEFAULT_FORM = {
  name: '', subtitle: '', userLabel: 'Usuario',
  btnText: 'Iniciar sesión',
  footerText: 'AllSafe Security Solutions · Datos cifrados localmente',
  color: '#e53e3e', logoData: null,
}

function WizardPreview({ form, logoPreview }) {
  const color = /^#[0-9a-fA-F]{3,8}$/.test(form.color) ? form.color : '#e53e3e'
  return (
    <div style={{
      background: 'oklch(0.097 0.022 264)',
      borderRadius: '0.5rem',
      padding: '1.25rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.875rem',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
        {logoPreview ? (
          <img src={logoPreview} alt='' style={{ height: '2.25rem', width: 'auto', objectFit: 'contain' }} />
        ) : (
          <div style={{ height: '2.25rem', width: '2.25rem', borderRadius: '0.375rem', background: 'oklch(1 0 0 / 8%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={14} style={{ color: 'oklch(0.58 0.035 260)' }} />
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'oklch(0.96 0.005 250)' }}>
            {form.name || 'Nombre del sistema'}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'oklch(0.58 0.035 260)', marginTop: '0.125rem' }}>
            {form.subtitle || 'Subtítulo del sistema'}
          </div>
        </div>
      </div>

      <div style={{
        width: '100%',
        background: 'oklch(0.112 0.022 264)',
        border: '1px solid oklch(1 0 0 / 9%)',
        borderRadius: '0.5rem',
        padding: '0.75rem',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'oklch(0.96 0.005 250)', marginBottom: '0.2rem', fontWeight: 500 }}>
              {form.userLabel || 'Usuario'}
            </div>
            <div style={{ height: '1.5rem', background: 'oklch(1 0 0 / 12%)', border: '1px solid oklch(1 0 0 / 12%)', borderRadius: '0.25rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'oklch(0.96 0.005 250)', marginBottom: '0.2rem', fontWeight: 500 }}>
              Contraseña
            </div>
            <div style={{ height: '1.5rem', background: 'oklch(1 0 0 / 12%)', border: '1px solid oklch(1 0 0 / 12%)', borderRadius: '0.25rem' }} />
          </div>
        </div>
        <div style={{
          height: '1.75rem',
          background: color,
          borderRadius: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.65rem',
          color: '#fff',
          fontWeight: 500,
          marginTop: '0.625rem',
        }}>
          {form.btnText || 'Iniciar sesión'}
        </div>
      </div>

      <div style={{ fontSize: '0.55rem', color: 'oklch(0.30 0.02 264)', textAlign: 'center' }}>
        {form.footerText || 'AllSafe Security Solutions'}
      </div>
    </div>
  )
}

function CustomTemplateCard({ tpl, isActive, isPinned, onActivate, onTogglePin, onDelete, onDeleteCancel, isConfirming }) {
  const { t } = useTranslation()
  return (
    <div className={`relative flex items-center gap-4 rounded-xl border p-4 transition-colors ${
      isActive
        ? 'border-green-500/40 bg-green-500/5'
        : 'border-border bg-card hover:border-border/80 hover:bg-accent/30'
    }`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
        isActive ? 'bg-green-500/15' : 'bg-muted'
      }`}>
        <Wand2 className={`size-5 ${isActive ? 'text-green-400' : 'text-muted-foreground'}`} />
      </div>

      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-foreground truncate'>{tpl.name}</span>
          {isActive && (
            <span className='flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 shrink-0'>
              <span className='w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse' />
              {t('senualos.active')}
            </span>
          )}
        </div>
        <p className='text-xs text-muted-foreground mt-0.5 truncate'>{tpl.subtitle}</p>
      </div>

      <div className='flex items-center gap-1.5 shrink-0'>
        {isConfirming ? (
          <div className='flex items-center gap-1.5 text-xs'>
            <span className='text-red-400 font-medium'>{t('senualos.delete_confirm')}</span>
            <button
              onClick={() => onDelete(tpl.id, true)}
              className='px-2 py-1 rounded text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors font-medium'
            >{t('senualos.delete_yes')}</button>
            <button
              onClick={onDeleteCancel}
              className='px-2 py-1 rounded text-muted-foreground border border-border hover:bg-accent transition-colors'
            >{t('senualos.delete_no')}</button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onDelete(tpl.id, false)}
              className='p-1.5 rounded-md text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors'
              title={t('senualos.delete_title')}
            >
              <Trash2 className='size-3.5' />
            </button>
            <button
              onClick={() => onTogglePin(tpl.id)}
              className={`p-1.5 rounded-md transition-colors ${
                isPinned ? 'text-yellow-400 hover:text-yellow-300' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={isPinned ? t('senualos.pin_remove') : t('senualos.pin_add')}
            >
              <Star className='size-4' fill={isPinned ? 'currentColor' : 'none'} />
            </button>
            {isActive ? (
              <div className='flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-green-400 border border-green-500/30 bg-green-500/10'>
                <CheckCircle2 className='size-3.5' />
                {t('senualos.activated')}
              </div>
            ) : (
              <button
                onClick={() => onActivate(tpl.id)}
                className='flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-foreground border border-border bg-background hover:bg-accent transition-colors'
              >
                <Zap className='size-3.5' />
                {t('senualos.activate')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TemplateCard({ tpl, isActive, isPinned, onActivate, onTogglePin }) {
  const { t } = useTranslation()
  const Icon = tpl.icon
  return (
    <div className={`relative flex items-center gap-4 rounded-xl border p-4 transition-colors ${
      isActive
        ? 'border-green-500/40 bg-green-500/5'
        : 'border-border bg-card hover:border-border/80 hover:bg-accent/30'
    }`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
        isActive ? 'bg-green-500/15' : 'bg-muted'
      }`}>
        <Icon className={`size-5 ${isActive ? 'text-green-400' : 'text-muted-foreground'}`} />
      </div>

      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-foreground truncate'>{tpl.name}</span>
          {isActive && (
            <span className='flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 shrink-0'>
              <span className='w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse' />
              {t('senualos.active')}
            </span>
          )}
        </div>
        <p className='text-xs text-muted-foreground mt-0.5 truncate'>{tpl.description}</p>
      </div>

      <div className='flex items-center gap-2 shrink-0'>
        <button
          onClick={() => onTogglePin(tpl.id)}
          className={`p-1.5 rounded-md transition-colors ${
            isPinned
              ? 'text-yellow-400 hover:text-yellow-300'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={isPinned ? t('senualos.pin_remove') : t('senualos.pin_add')}
        >
          <Star className='size-4' fill={isPinned ? 'currentColor' : 'none'} />
        </button>

        {isActive ? (
          <div className='flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-green-400 border border-green-500/30 bg-green-500/10'>
            <CheckCircle2 className='size-3.5' />
            {t('senualos.activated')}
          </div>
        ) : (
          <button
            onClick={() => onActivate(tpl.id)}
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-foreground border border-border bg-background hover:bg-accent transition-colors'
          >
            <Zap className='size-3.5' />
            {t('senualos.activate')}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Senualos({ token, activeTemplate, pinnedTemplates, onActivate, onTogglePin, customTemplates, onCustomTemplatesChange }) {
  const { t } = useTranslation()
  const groups = ['allsafe', 'templates']
  const GROUP_META = {
    allsafe:   { label: t('senualos.allsafe_label'),   description: t('senualos.allsafe_desc') },
    templates: { label: t('senualos.templates_label'), description: t('senualos.templates_desc') },
  }
  const [wizardOpen, setWizardOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [logoPreview, setLogoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileRef = useRef(null)
  const authHeaders = { Authorization: `Bearer ${token}` }

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setSaveError(t('senualos.wizard.logo_error')); return }
    if (file.size > 1.5 * 1024 * 1024) { setSaveError(t('senualos.wizard.logo_size_error')); return }
    setSaveError('')
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target.result
      setLogoPreview(result)
      setForm(f => ({ ...f, logoData: result }))
    }
    reader.readAsDataURL(file)
  }

  function clearLogo(ev) {
    ev.stopPropagation()
    setLogoPreview(null)
    setForm(f => ({ ...f, logoData: null }))
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave() {
    if (!form.name.trim() || !form.subtitle.trim()) {
      setSaveError(t('senualos.wizard.required_error'))
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/templates/custom`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setSaveError(d.error || 'Error al crear el señuelo.')
        setSaving(false)
        return
      }
      const { id, name } = await r.json()
      const newTpl = { id, name, subtitle: form.subtitle, userLabel: form.userLabel, btnText: form.btnText, footerText: form.footerText, color: form.color }
      onCustomTemplatesChange(prev => {
        const idx = prev.findIndex(t => t.id === id)
        if (idx >= 0) { const next = [...prev]; next[idx] = newTpl; return next }
        return [...prev, newTpl]
      })
      setForm(DEFAULT_FORM)
      setLogoPreview(null)
      setWizardOpen(false)
    } catch {
      setSaveError(t('senualos.wizard.conn_error'))
    }
    setSaving(false)
  }

  async function handleDelete(id, confirmed) {
    if (!confirmed) { setDeleteConfirm(id); return }
    setDeleteConfirm(null)
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/templates/custom/${id}`, {
        method: 'DELETE', headers: authHeaders,
      })
      if (r.ok) onCustomTemplatesChange(prev => prev.filter(t => t.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <div className='space-y-8 max-w-3xl'>
      <div>
        <h2 className='text-lg font-semibold text-foreground'>{t('senualos.title')}</h2>
        <p className='text-sm text-muted-foreground mt-1'>
          {t('senualos.desc')}
        </p>
      </div>

      {/* Personalizados section */}
      <section>
        <div className='flex items-center justify-between mb-3'>
          <div>
            <h3 className='text-sm font-semibold text-foreground'>{t('senualos.custom_title')}</h3>
            <p className='text-xs text-muted-foreground mt-0.5'>{t('senualos.custom_desc')}</p>
          </div>
          <button
            onClick={() => { setWizardOpen(o => !o); setSaveError('') }}
            className='flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-foreground transition-colors'
          >
            <Wand2 className='size-3.5' />
            {wizardOpen ? t('senualos.cancel') : t('senualos.create')}
          </button>
        </div>

        {wizardOpen && (
          <div className='rounded-xl border border-border bg-card p-5 mb-4 space-y-4'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-muted-foreground'>{t('senualos.wizard.name')}</label>
                <input
                  type='text'
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder='Mi Sistema'
                  className='h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring'
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-muted-foreground'>{t('senualos.wizard.subtitle')}</label>
                <input
                  type='text'
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder='Portal Interno'
                  className='h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring'
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-muted-foreground'>{t('senualos.wizard.user_label')}</label>
                <input
                  type='text'
                  value={form.userLabel}
                  onChange={e => setForm(f => ({ ...f, userLabel: e.target.value }))}
                  placeholder='Usuario'
                  className='h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring'
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-muted-foreground'>{t('senualos.wizard.btn_text')}</label>
                <input
                  type='text'
                  value={form.btnText}
                  onChange={e => setForm(f => ({ ...f, btnText: e.target.value }))}
                  placeholder='Iniciar sesión'
                  className='h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring'
                />
              </div>
            </div>

            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-medium text-muted-foreground'>{t('senualos.wizard.footer')}</label>
              <input
                type='text'
                value={form.footerText}
                onChange={e => setForm(f => ({ ...f, footerText: e.target.value }))}
                placeholder='AllSafe Security Solutions · Datos cifrados localmente'
                className='h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring'
              />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-muted-foreground'>{t('senualos.wizard.color')}</label>
                <div className='flex items-center gap-2'>
                  <input
                    type='color'
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className='h-8 w-10 shrink-0 rounded-md border border-border bg-background cursor-pointer p-0.5'
                  />
                  <input
                    type='text'
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    placeholder='#e53e3e'
                    className='h-8 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring'
                  />
                </div>
              </div>

              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-muted-foreground'>{t('senualos.wizard.logo')}</label>
                <input ref={fileRef} type='file' accept='image/*' onChange={handleLogoChange} className='hidden' />
                <button
                  type='button'
                  onClick={() => fileRef.current?.click()}
                  className={`h-8 flex items-center gap-2 rounded-md border px-3 text-xs transition-colors ${
                    logoPreview
                      ? 'border-green-500/40 bg-green-500/10 text-green-400'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Upload className='size-3.5 shrink-0' />
                  <span className='truncate'>{logoPreview ? t('senualos.wizard.logo_loaded') : t('senualos.wizard.logo_upload')}</span>
                  {logoPreview && (
                    <span onClick={clearLogo} className='ml-auto text-muted-foreground hover:text-foreground'>
                      <X className='size-3' />
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div>
              <div className='text-xs font-medium text-muted-foreground mb-2'>{t('senualos.wizard.preview')}</div>
              <WizardPreview form={form} logoPreview={logoPreview} />
            </div>

            {saveError && (
              <p className='text-xs text-red-400'>{saveError}</p>
            )}

            <div className='flex justify-end'>
              <button
                onClick={handleSave}
                disabled={saving}
                className='flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <Wand2 className='size-3.5' />
                {saving ? t('senualos.wizard.creating') : t('senualos.wizard.create_btn')}
              </button>
            </div>
          </div>
        )}

        <div className='space-y-2'>
          {customTemplates.map(tpl => (
            <CustomTemplateCard
              key={tpl.id}
              tpl={tpl}
              isActive={activeTemplate === tpl.id}
              isPinned={pinnedTemplates.includes(tpl.id)}
              isConfirming={deleteConfirm === tpl.id}
              onActivate={onActivate}
              onTogglePin={onTogglePin}
              onDelete={handleDelete}
              onDeleteCancel={() => setDeleteConfirm(null)}
            />
          ))}
          {customTemplates.length === 0 && !wizardOpen && (
            <p className='text-xs text-muted-foreground/60 italic py-1'>
              {t('senualos.no_custom')}
            </p>
          )}
        </div>
      </section>

      {groups.map(group => {
        const items = ALL_TEMPLATES.filter(t => t.group === group)
        const meta = GROUP_META[group]
        return (
          <section key={group}>
            <div className='mb-3'>
              <h3 className='text-sm font-semibold text-foreground'>{meta.label}</h3>
              <p className='text-xs text-muted-foreground mt-0.5'>{meta.description}</p>
            </div>
            <div className='space-y-2'>
              {items.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  tpl={tpl}
                  isActive={activeTemplate === tpl.id}
                  isPinned={pinnedTemplates.includes(tpl.id)}
                  onActivate={onActivate}
                  onTogglePin={onTogglePin}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
