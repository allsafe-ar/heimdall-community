import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Lock, Shield, ShieldCheck, Globe, Image, Upload, RotateCcw, Check, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import allsafeLogo from '../assets/allsafe-logo.png'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''

function generateTOTPSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let s = ''
  const arr = new Uint8Array(20)
  crypto.getRandomValues(arr)
  arr.forEach(b => { s += chars[b % 32] })
  return s
}

function getOtpAuthUri(secret, username) {
  return `otpauth://totp/Heimdall:${encodeURIComponent(username)}?secret=${secret}&issuer=Heimdall&algorithm=SHA1&digits=6&period=30`
}

export default function MiCuenta({ token, userInfo }) {
  const { t, i18n } = useTranslation()
  const isAdmin = userInfo?.role === 'admin'
  const [lang, setLang] = useState(i18n.language)

  function handleLangChange(v) {
    i18n.changeLanguage(v)
    localStorage.setItem('lang', v)
    setLang(v)
  }

  // ── Change password ──────────────────────────────────────────────────────────
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' })
  const [passMsg, setPassMsg]   = useState(null)
  const [passSaving, setPassSaving] = useState(false)

  async function handleChangePass(e) {
    e.preventDefault()
    if (passForm.next !== passForm.confirm) { setPassMsg({ ok: false, text: t('account.passwords_mismatch') }); return }
    if (passForm.next.length < 6) { setPassMsg({ ok: false, text: t('account.min_chars') }); return }
    setPassSaving(true); setPassMsg(null)
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passForm.current, newPassword: passForm.next }),
      })
      const d = await r.json()
      if (r.ok) {
        setPassMsg({ ok: true, text: t('account.password_updated') })
        setPassForm({ current: '', next: '', confirm: '' })
      } else {
        setPassMsg({ ok: false, text: d.error || t('account.change_password') })
      }
    } catch {
      setPassMsg({ ok: false, text: t('account.connection_error') })
    }
    setPassSaving(false)
  }

  // ── 2FA ──────────────────────────────────────────────────────────────────────
  const [has2FA, setHas2FA]         = useState(false)
  const [totpStep, setTotpStep]     = useState(null) // null | 'setup' | 'confirm' | 'remove'
  const [totpSecret, setTotpSecret] = useState('')
  const [totpCode, setTotpCode]     = useState('')
  const [totpMsg, setTotpMsg]       = useState(null)
  const [totpSaving, setTotpSaving] = useState(false)
  const [removePass, setRemovePass] = useState('')

  useEffect(() => {
    fetch(`${BACKEND}/heimdall/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setHas2FA(!!d.has_totp) })
      .catch(() => {})
  }, [token])

  function startSetup() {
    const secret = generateTOTPSecret()
    setTotpSecret(secret)
    setTotpCode('')
    setTotpMsg(null)
    setTotpStep('setup')
  }

  async function handleConfirmTOTP(e) {
    e.preventDefault()
    setTotpSaving(true); setTotpMsg(null)
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/auth/setup-totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ totpSecret, totpToken: totpCode }),
      })
      const d = await r.json()
      if (r.ok) {
        setHas2FA(true)
        setTotpStep(null)
        setTotpMsg({ ok: true, text: t('account.2fa_enabled') })
      } else {
        setTotpMsg({ ok: false, text: d.error || t('account.2fa_error') })
      }
    } catch {
      setTotpMsg({ ok: false, text: t('account.connection_error') })
    }
    setTotpSaving(false)
  }

  async function handleRemoveTOTP(e) {
    e.preventDefault()
    setTotpSaving(true); setTotpMsg(null)
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/auth/remove-totp`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: removePass }),
      })
      const d = await r.json()
      if (r.ok) {
        setHas2FA(false)
        setTotpStep(null)
        setRemovePass('')
        setTotpMsg({ ok: true, text: t('account.2fa_disabled') })
      } else {
        setTotpMsg({ ok: false, text: d.error || t('account.2fa_error') })
      }
    } catch {
      setTotpMsg({ ok: false, text: t('account.connection_error') })
    }
    setTotpSaving(false)
  }

  // ── Branding ─────────────────────────────────────────────────────────────────
  const [branding, setBranding]         = useState(null)
  const [brandingSaving, setBrandingSaving] = useState(false)
  const [pendingLogo, setPendingLogo]   = useState(null)
  const fileInputRef                    = useRef(null)
  const authH = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!isAdmin) return
    fetch(`${BACKEND}/heimdall/api/settings/logo`, { headers: authH })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setBranding(d) })
      .catch(() => {})
  }, [isAdmin, token])

  async function handleBrandingToggle(show) {
    setBrandingSaving(true)
    try {
      await fetch(`${BACKEND}/heimdall/api/settings/logo`, {
        method: 'PUT',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ show }),
      })
      window.location.reload()
    } catch { setBrandingSaving(false) }
  }

  function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 400 * 1024) { alert(t('account.logo_size_error')); return }
    const reader = new FileReader()
    reader.onload = () => setPendingLogo(reader.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleLogoApply() {
    if (!pendingLogo) return
    setBrandingSaving(true)
    try {
      await fetch(`${BACKEND}/heimdall/api/settings/logo`, {
        method: 'PUT',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoData: pendingLogo }),
      })
      window.location.reload()
    } catch { setBrandingSaving(false) }
  }

  async function handleLogoReset() {
    setBrandingSaving(true)
    try {
      await fetch(`${BACKEND}/heimdall/api/settings/logo`, {
        method: 'PUT',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })
      window.location.reload()
    } catch { setBrandingSaving(false) }
  }

  const ROLE_LABELS = { admin: t('account.role_admin'), viewer: t('account.role_viewer') }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        {t('account.title')}
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">

        {/* Left column */}
        <div className="space-y-4">

          {/* Cambiar contraseña */}
          <div className="rounded-lg border bg-card px-5 py-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              {t('account.change_password')}
            </h2>
            {passMsg && (
              <div className={`mb-4 rounded-lg px-3 py-2.5 text-sm border ${
                passMsg.ok
                  ? 'bg-green-500/10 border-green-500/20 text-green-500'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {passMsg.text}
              </div>
            )}
            <form onSubmit={handleChangePass} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>{t('account.current_password')}</Label>
                <Input type="password" value={passForm.current} onChange={e => setPassForm(f => ({ ...f, current: e.target.value }))} autoComplete="current-password" required placeholder="••••••••" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('account.new_password')}</Label>
                <Input type="password" value={passForm.next} onChange={e => setPassForm(f => ({ ...f, next: e.target.value }))} autoComplete="new-password" required placeholder="••••••••" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('account.confirm_password')}</Label>
                <Input type="password" value={passForm.confirm} onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))} autoComplete="new-password" required placeholder="••••••••" />
              </div>
              <Button type="submit" disabled={passSaving} className="w-fit">
                {passSaving ? t('account.saving') : t('account.save_password')}
              </Button>
            </form>
          </div>

          {/* 2FA */}
          <div className="rounded-lg border bg-card px-5 py-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                {has2FA
                  ? <ShieldCheck className="h-4 w-4 text-green-500" />
                  : <Shield className="h-4 w-4 text-muted-foreground" />
                }
                {t('account.2fa_title')}
              </h2>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${has2FA ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-muted border-border text-muted-foreground'}`}>
                {has2FA ? t('account.2fa_active') : t('account.2fa_inactive')}
              </span>
            </div>

            {totpMsg && (
              <div className={`mb-4 rounded-lg px-3 py-2.5 text-sm border ${totpMsg.ok ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {totpMsg.text}
              </div>
            )}

            {!totpStep && !has2FA && (
              <div>
                <p className="text-sm text-muted-foreground mb-4">{t('account.2fa_desc_off')}</p>
                <Button variant="outline" size="sm" onClick={startSetup}>{t('account.2fa_enable')}</Button>
              </div>
            )}

            {!totpStep && has2FA && (
              <div>
                <p className="text-sm text-muted-foreground mb-4">{t('account.2fa_desc_on')}</p>
                <Button variant="outline" size="sm" onClick={() => { setTotpStep('remove'); setRemovePass(''); setTotpMsg(null) }}>
                  {t('account.2fa_disable')}
                </Button>
              </div>
            )}

            {totpStep === 'setup' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('account.2fa_scan')}</p>
                <div className="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
                  <QRCodeSVG value={getOtpAuthUri(totpSecret, userInfo?.username || 'user')} size={180} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('account.2fa_manual')}</p>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all block">{totpSecret}</code>
                </div>
                <form onSubmit={handleConfirmTOTP} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('account.2fa_enter_code')}</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={totpCode}
                      onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="font-mono tracking-widest text-center text-base"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={totpSaving || totpCode.length !== 6} size="sm">
                      {totpSaving ? t('account.saving') : t('account.2fa_confirm')}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setTotpStep(null); setTotpMsg(null) }}>
                      {t('account.branding_cancel')}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {totpStep === 'remove' && (
              <form onSubmit={handleRemoveTOTP} className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">{t('account.2fa_confirm_disable')}</p>
                <div className="flex flex-col gap-1.5">
                  <Label>{t('account.current_password')}</Label>
                  <Input type="password" value={removePass} onChange={e => setRemovePass(e.target.value)} placeholder="••••••••" required />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="destructive" disabled={totpSaving || !removePass} size="sm">
                    {totpSaving ? t('account.saving') : t('account.2fa_disable_confirm')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setTotpStep(null); setTotpMsg(null) }}>
                    {t('account.branding_cancel')}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Idioma */}
          <div className="rounded-lg border bg-card px-5 py-5">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {t('account.lang_title')}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{t('account.lang_label')}</span>
              <select
                value={lang}
                onChange={e => handleLangChange(e.target.value)}
                className="w-40 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition cursor-pointer"
              >
                <option value="es">{t('lang.es')}</option>
                <option value="en">{t('lang.en')}</option>
              </select>
            </div>
          </div>

        </div>

        {/* Right column */}
        <div className="self-start space-y-4">

          {/* Mi cuenta info */}
          <div className="rounded-lg border bg-card px-5 py-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {t('account.info_title')}
            </h2>
            <div className="space-y-3 text-sm">
              {[
                { label: t('account.username'), value: userInfo?.username || '—' },
                { label: t('account.name'),     value: userInfo?.nombre   || '—' },
                { label: t('account.role'),     value: ROLE_LABELS[userInfo?.role] || userInfo?.role || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Branding AllSafe — admin only */}
          {isAdmin && branding !== null && (
            <div className="rounded-lg border bg-card px-5 py-5">
              <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                {t('account.branding_title')}
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                {t('account.branding_desc')}
              </p>

              {/* Preview */}
              <div className="relative flex justify-center mb-4 p-4 rounded-lg bg-muted">
                {branding.show ? (
                  <img
                    src={pendingLogo || branding.logoData || allsafeLogo}
                    alt="Logo"
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground italic">{t('account.branding_no_logo')}</span>
                )}
                {pendingLogo && (
                  <span className="absolute top-1 right-2 text-[10px] font-medium text-amber-500">{t('account.branding_pending')}</span>
                )}
              </div>

              {/* Show toggle */}
              <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={branding.show}
                  onChange={e => handleBrandingToggle(e.target.checked)}
                  disabled={brandingSaving}
                  className="h-4 w-4 accent-primary"
                />
                {t('account.branding_show')}
              </label>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={brandingSaving}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {t('account.branding_upload')}
                </Button>
                {pendingLogo && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={brandingSaving}
                      onClick={handleLogoApply}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t('account.branding_apply')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={brandingSaving}
                      onClick={() => setPendingLogo(null)}
                      className="text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t('account.branding_cancel')}
                    </Button>
                  </>
                )}
                {!pendingLogo && branding.logoData && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={brandingSaving}
                    onClick={handleLogoReset}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t('account.branding_reset')}
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <p className="text-[11px] text-muted-foreground mt-3">{t('account.branding_limit')}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
