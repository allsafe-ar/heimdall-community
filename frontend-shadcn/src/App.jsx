import React, { useState, useEffect, Component } from 'react'
import Dashboard from './pages/Dashboard'
import { disconnectSocket } from './lib/socket'
import allsafeLogo from './assets/allsafe-logo.png'

const BACKEND = import.meta.env.DEV ? 'http://localhost:3005' : ''
const TOKEN_KEY = 'heimdall_token'

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#0d0d0d', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 32, fontFamily: 'monospace' }}>
          <div style={{ color: '#dc2626', fontSize: 20, fontWeight: 700 }}>⚠ ERROR DE RENDERIZADO</div>
          <div style={{ color: '#888', fontSize: 12, maxWidth: 480, textAlign: 'center' }}>{this.state.error.message}</div>
          <button
            onClick={() => { localStorage.removeItem(TOKEN_KEY); window.location.reload() }}
            style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontSize: 13, marginTop: 8 }}
          >
            Limpiar sesión y recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Corner bracket decoration ─────────────────────────────────────────────────
function Corners({ children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-600/50 rounded-tl" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-600/50 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-600/50 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-600/50 rounded-br" />
      {children}
    </div>
  )
}

// ── TOTP verification step ────────────────────────────────────────────────────
function TotpPage({ userId, onLogin, onBack }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/auth/verify-totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: code })
      })
      const d = await r.json()
      if (r.ok && d.token) {
        onLogin(d.token)
      } else {
        setError(d.error || 'Código incorrecto.')
        setCode('')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-4" style={{ background: 'oklch(0.097 0.022 264)', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className="w-full flex flex-col items-center gap-6" style={{ maxWidth: '28rem', padding: '0 1rem' }}>
        <div className="flex flex-col items-center gap-3">
          <img src={allsafeLogo} alt="AllSafe" style={{ height: '4rem', width: 'auto' }} />
          <div className="text-center">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'oklch(0.96 0.005 250)' }}>Heimdall</h1>
            <p style={{ fontSize: '0.875rem', color: 'oklch(0.58 0.035 260)' }}>Verificación en dos pasos</p>
          </div>
        </div>
        <div style={{ width: '100%', background: 'oklch(0.112 0.022 264)', border: '1px solid oklch(1 0 0 / 9%)', borderRadius: '0.625rem', padding: '1.5rem' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'oklch(0.19 0.028 264)', border: '1px solid oklch(1 0 0 / 9%)', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'oklch(0.96 0.005 250)', marginBottom: '0.75rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(0.535 0.233 22.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}
          <p style={{ fontSize: '0.875rem', color: 'oklch(0.58 0.035 260)', marginBottom: '1rem', textAlign: 'center' }}>
            Ingresá el código de 6 dígitos de tu app autenticadora.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'oklch(0.96 0.005 250)', lineHeight: '1.25rem' }}>Código 2FA</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                autoFocus
                style={{ width: '100%', background: 'oklch(1 0 0 / 12%)', border: '1px solid oklch(1 0 0 / 12%)', borderRadius: 'calc(0.625rem - 2px)', padding: '0.5rem 0.75rem', color: 'oklch(0.96 0.005 250)', fontSize: '1.25rem', fontFamily: 'monospace', letterSpacing: '0.4em', textAlign: 'center', outline: 'none', lineHeight: '1.25rem' }}
                onFocus={e => { e.target.style.borderColor = 'oklch(0.535 0.233 22.3)'; e.target.style.boxShadow = '0 0 0 2px oklch(0.535 0.233 22.3 / 20%)' }}
                onBlur={e => { e.target.style.borderColor = 'oklch(1 0 0 / 12%)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              style={{ width: '100%', background: 'oklch(0.535 0.233 22.3)', color: 'oklch(0.98 0.003 0)', border: 'none', borderRadius: 'calc(0.625rem - 2px)', padding: '0.5rem 1rem', height: '2.25rem', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'inherit', cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem', opacity: (loading || code.length !== 6) ? 0.5 : 1 }}
            >
              {loading ? <span style={{ width: '0.875rem', height: '0.875rem', border: '2px solid oklch(0.98 0.003 0 / 30%)', borderTopColor: 'oklch(0.98 0.003 0)', borderRadius: '50%', animation: 'spin .6s linear infinite', flexShrink: 0, display: 'inline-block' }} /> : null}
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>
          <button
            onClick={onBack}
            style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'oklch(0.58 0.035 260)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Volver al login
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'oklch(0.30 0.02 264)', textAlign: 'center' }}>
          AllSafe Security Solutions · Datos cifrados localmente
        </p>
      </div>
    </div>
  )
}

// ── Login page ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [totpPending, setTotpPending] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch(`${BACKEND}/heimdall/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const d = await r.json()
      if (r.ok && d.token) {
        onLogin(d.token)
      } else if (r.ok && d.needs2fa) {
        setTotpPending(d.userId)
      } else {
        setError(d.error || 'Usuario o contraseña incorrectos.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    }
    setLoading(false)
  }

  if (totpPending) {
    return <TotpPage userId={totpPending} onLogin={onLogin} onBack={() => setTotpPending(null)} />
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-4" style={{ background: 'oklch(0.097 0.022 264)', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className="w-full flex flex-col items-center gap-6" style={{ maxWidth: '28rem', padding: '0 1rem' }}>

        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3">
          <img src={allsafeLogo} alt="AllSafe" style={{ height: '4rem', width: 'auto' }} />
          <div className="text-center">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'oklch(0.96 0.005 250)' }}>
              Heimdall
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'oklch(0.58 0.035 260)' }}>
              Honeypot
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{ width: '100%', background: 'oklch(0.112 0.022 264)', border: '1px solid oklch(1 0 0 / 9%)', borderRadius: '0.625rem', padding: '1.5rem' }}>

          {/* Toast error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'oklch(0.19 0.028 264)', border: '1px solid oklch(1 0 0 / 9%)', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'oklch(0.96 0.005 250)', marginBottom: '0.75rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(0.535 0.233 22.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
            {/* Usuario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'oklch(0.96 0.005 250)', lineHeight: '1.25rem' }}>
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="usuario"
                autoComplete="username"
                required
                style={{ width: '100%', background: 'oklch(1 0 0 / 12%)', border: '1px solid oklch(1 0 0 / 12%)', borderRadius: 'calc(0.625rem - 2px)', padding: '0.5rem 0.75rem', color: 'oklch(0.96 0.005 250)', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', lineHeight: '1.25rem' }}
                onFocus={e => { e.target.style.borderColor = 'oklch(0.535 0.233 22.3)'; e.target.style.boxShadow = '0 0 0 2px oklch(0.535 0.233 22.3 / 20%)' }}
                onBlur={e => { e.target.style.borderColor = 'oklch(1 0 0 / 12%)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Contraseña */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'oklch(0.96 0.005 250)', lineHeight: '1.25rem' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ width: '100%', background: 'oklch(1 0 0 / 12%)', border: '1px solid oklch(1 0 0 / 12%)', borderRadius: 'calc(0.625rem - 2px)', padding: '0.5rem 2.5rem 0.5rem 0.75rem', color: 'oklch(0.96 0.005 250)', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', lineHeight: '1.25rem' }}
                  onFocus={e => { e.target.style.borderColor = 'oklch(0.535 0.233 22.3)'; e.target.style.boxShadow = '0 0 0 2px oklch(0.535 0.233 22.3 / 20%)' }}
                  onBlur={e => { e.target.style.borderColor = 'oklch(1 0 0 / 12%)'; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'oklch(0.58 0.035 260)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                >
                  {showPwd
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: 'oklch(0.535 0.233 22.3)', color: 'oklch(0.98 0.003 0)', border: 'none', borderRadius: 'calc(0.625rem - 2px)', padding: '0.5rem 1rem', height: '2.25rem', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? (
                <span style={{ width: '0.875rem', height: '0.875rem', border: '2px solid oklch(0.98 0.003 0 / 30%)', borderTopColor: 'oklch(0.98 0.003 0)', borderRadius: '50%', animation: 'spin .6s linear infinite', flexShrink: 0, display: 'inline-block' }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              )}
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'oklch(0.30 0.02 264)', textAlign: 'center' }}>
          AllSafe Security Solutions · Datos cifrados localmente
        </p>
      </div>
    </div>
  )
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  })

  useEffect(() => {
    if (!token) return
    fetch(`${BACKEND}/heimdall/api/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      if (r.status === 401) {
        try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
        setToken(null)
      }
    }).catch(() => { /* ignore network errors */ })
  }, [])

  function handleLogin(tok) {
    try { localStorage.setItem(TOKEN_KEY, tok) } catch { /* ignore */ }
    setToken(tok)
  }

  function handleLogout() {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
    disconnectSocket()
    setToken(null)
  }

  return (
    <ErrorBoundary>
      {!token
        ? <LoginPage onLogin={handleLogin} />
        : <Dashboard token={token} onLogout={handleLogout} />
      }
    </ErrorBoundary>
  )
}
